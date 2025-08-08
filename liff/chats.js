import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { init } from "./liff.js";

let lineIdToken = null;

const loadingDiv = document.getElementById("loading");
const chatListDiv = document.getElementById("chat-list");
const chatCardsContainer = document.getElementById("chat-cards-container");
const pageTitle = document.getElementById("page-title");
const filterSelect = document.getElementById("filter-select");
const dateInputsContainer = document.getElementById("date-inputs-container");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");

const CHAT_FILTER_STORAGE_KEY = "chatFilterState";

/**
 * Renders the list of chats on the page.
 * @param {Array<object>} chats The array of chat documents from Firestore.
 * @param {string} userName The display name of the user.
 */
function renderChatList(chats, userName) {
  // Function to generate star icons based on score
  function getStarRating(score) {
    const roundedScore = Math.round(score);
    let stars = "";
    for (let i = 0; i < 5; i++) {
      if (i < roundedScore) {
        stars += "★"; // Filled star
      } else {
        stars += "☆"; // Empty star
      }
    }
    return `<div>
      <span style="color: #ffc107;">${stars}</span>
      <span style="color:#ababab; margin-left: 12px">${Number(score).toFixed(
        1
      )}</span>
    </div>`;
  }

  if (chats.length === 0) {
    chatCardsContainer.innerHTML = `<div class="alert alert-info" role="alert">找不到任何任務記錄。</div>`;
  } else {
    let chatCardsHtml = "";
    chats.forEach((chat) => {
      const summaryJson = chat.summaryJson;
      const title =
        summaryJson && summaryJson.topic
          ? summaryJson.topic
          : `聊天紀錄 ${chat.id.substring(0, 8)}`;
      const completedTime = chat.updatedAt
        ? new Date(chat.updatedAt.seconds * 1000).toLocaleString()
        : "無";
      const scoreHtml =
        summaryJson &&
        summaryJson.score !== undefined &&
        summaryJson.score !== null
          ? getStarRating(summaryJson.score)
          : "";
      const detailUrl = `chat-details.html?threadId=${chat.id}`;

      chatCardsHtml += `
        <a href="${detailUrl}" class="card-link">
          <div class="card shadow-sm mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title">${title}</h5>
                ${scoreHtml}
              </div>
              <p class="card-text text-muted mb-1">完成時間: ${completedTime}</p>
            </div>
          </div>
        </a>
      `;
    });
    chatCardsContainer.innerHTML = chatCardsHtml;
  }
  pageTitle.innerText = `${userName} 的任務列表`;
}

async function getChatsByUserId(userId, startDate, endDate) {
  if (!userId) {
    return [];
  }

  let q;
  if (startDate && endDate) {
    // Query with date range
    q = query(
      collection(db, "chat"),
      where("userId", "==", userId),
      where("summaryJson", "!=", null),
      where("updatedAt", ">=", Timestamp.fromDate(startDate)),
      where("updatedAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("updatedAt", "desc")
    );
  } else {
    // Query without a date range
    q = query(
      collection(db, "chat"),
      where("userId", "==", userId),
      where("summaryJson", "!=", null),
      orderBy("updatedAt", "desc")
    );
  }

  const querySnapshot = await getDocs(q);
  const chats = [];
  querySnapshot.forEach((doc) => {
    chats.push({ id: doc.id, ...doc.data() });
  });
  return chats;
}

async function getUserProfile() {
  try {
    const profile = await liff.getProfile();
    return profile.displayName;
  } catch (err) {
    console.error("Failed to get LIFF profile:", err);
    return "用戶";
  }
}

async function fetchAndRenderChats(
  userId,
  userName,
  startDate = null,
  endDate = null
) {
  loadingDiv.classList.remove("d-none");
  chatListDiv.classList.add("d-none");
  const chats = await getChatsByUserId(userId, startDate, endDate);
  renderChatList(chats, userName);
  loadingDiv.classList.add("d-none");
  chatListDiv.classList.remove("d-none");
}

function saveFilterState() {
  const state = {
    filter: filterSelect.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
  };
  sessionStorage.setItem(CHAT_FILTER_STORAGE_KEY, JSON.stringify(state));
}

function loadFilterState() {
  const cachedState = sessionStorage.getItem(CHAT_FILTER_STORAGE_KEY);
  if (cachedState) {
    const { filter, startDate, endDate } = JSON.parse(cachedState);
    filterSelect.value = filter;
    startDateInput.value = startDate;
    endDateInput.value = endDate;

    if (filter === "custom") {
      dateInputsContainer.classList.remove("d-none");
    } else {
      dateInputsContainer.classList.add("d-none");
    }

    return { filter, startDate, endDate };
  }
  return null;
}

// LIFF init and prefill
(async function () {
  const initError = await init();
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  lineIdToken = liff.getDecodedIDToken();
  const userId = lineIdToken?.sub || "";
  const userName = await getUserProfile();

  if (!userId) {
    loadingDiv.classList.add("d-none");
    chatListDiv.classList.remove("d-none");
    chatCardsContainer.innerHTML = `<div class="alert alert-warning" role="alert">找不到使用者資訊。</div>`;
    pageTitle.innerText = "我的任務列表";
    return;
  }

  // Load filter state from storage or use defaults
  const filterState = loadFilterState();
  let startDate = null;
  let endDate = null;

  if (filterState) {
    if (filterState.filter === "last-week") {
      const now = new Date();
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7
      );
      endDate = now;
    } else if (filterState.filter === "last-month") {
      const now = new Date();
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
      endDate = now;
    } else if (
      filterState.filter === "custom" &&
      filterState.startDate &&
      filterState.endDate
    ) {
      startDate = new Date(filterState.startDate);
      endDate = new Date(filterState.endDate);
      endDate.setHours(23, 59, 59, 999);
    }
  }

  // Initial fetch with either loaded state or no filters
  await fetchAndRenderChats(userId, userName, startDate, endDate);

  // Add event listeners for filters
  filterSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    const now = new Date();
    let startDate = null;
    let endDate = now;

    if (value === "custom") {
      dateInputsContainer.classList.remove("d-none");
      if (startDateInput.value && endDateInput.value) {
        const customStartDate = new Date(startDateInput.value);
        const customEndDate = new Date(endDateInput.value);
        customEndDate.setHours(23, 59, 59, 999);
        fetchAndRenderChats(userId, userName, customStartDate, customEndDate);
      }
    } else {
      dateInputsContainer.classList.add("d-none");
      if (value === "last-week") {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        fetchAndRenderChats(userId, userName, startDate, endDate);
      } else if (value === "last-month") {
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        endDate = now;
        fetchAndRenderChats(userId, userName, startDate, endDate);
      } else {
        // 'all'
        fetchAndRenderChats(userId, userName);
      }
    }
    saveFilterState();
  });

  // Listen for changes on custom date inputs
  startDateInput.addEventListener("change", () => {
    if (startDateInput.value && endDateInput.value) {
      const startDate = new Date(startDateInput.value);
      const endDate = new Date(endDateInput.value);
      // Ensure the end date is inclusive by setting time to end of day
      endDate.setHours(23, 59, 59, 999);
      fetchAndRenderChats(userId, userName, startDate, endDate);
      saveFilterState();
    }
  });

  endDateInput.addEventListener("change", () => {
    if (startDateInput.value && endDateInput.value) {
      const startDate = new Date(startDateInput.value);
      const endDate = new Date(endDateInput.value);
      // Ensure the end date is inclusive by setting time to end of day
      endDate.setHours(23, 59, 59, 999);
      fetchAndRenderChats(userId, userName, startDate, endDate);
      saveFilterState();
    }
  });
})();
