import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { init } from "./liff.js";

let lineIdToken = null;
let currentUserDoc = null; // Make user document available to the whole module

const loadingDiv = document.getElementById("loading");
const chatListDiv = document.getElementById("chat-list");
const chatCardsContainer = document.getElementById("chat-cards-container");
const pageTitle = document.getElementById("page-title");
const filterSelect = document.getElementById("filter-select");
const dateInputsContainer = document.getElementById("date-inputs-container");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const targetFilterContainer = document.getElementById(
  "target-filter-container"
);
const targetSelect = document.getElementById("target-select");

const CHAT_FILTER_STORAGE_KEY = "chatFilterState";

function getStarRating(score) {
  const roundedScore = Math.round(score);
  let stars = "";
  for (let i = 0; i < 5; i++) {
    stars += i < roundedScore ? "★" : "☆";
  }
  return `<div><span style="color: #ffc107;">${stars}</span><span style="color:#ababab; margin-left: 12px">${Number(
    score
  ).toFixed(1)}</span></div>`;
}

function renderChatList(chats, userName) {
  if (chats.length === 0) {
    chatCardsContainer.innerHTML = `<div class="alert alert-info" role="alert">找不到任何任務記錄。</div>`;
  } else {
    chatCardsContainer.innerHTML = chats
      .map((chat) => {
        const { summaryJson, id, updatedAt } = chat;
        const title = summaryJson?.topic || `聊天紀錄 ${id.substring(0, 8)}`;
        const completedTime = updatedAt
          ? new Date(updatedAt.seconds * 1000).toLocaleString()
          : "無";
        const scoreHtml =
          summaryJson?.score !== undefined && summaryJson?.score !== null
            ? getStarRating(summaryJson.score)
            : "";
        const detailUrl = `chat-details.html?threadId=${id}`;

        return `
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
      })
      .join("");
  }

  if (userName === "自己") {
    pageTitle.innerText = "我的學習記錄";
  } else {
    pageTitle.innerText = `${userName} 的學習記錄`;
  }
}

async function getChatsByUserId(userId, startDate, endDate) {
  if (!userId) return [];
  const constraints = [
    where("userId", "==", userId),
    where("summaryJson", "!=", null),
  ];
  if (startDate)
    constraints.push(where("updatedAt", ">=", Timestamp.fromDate(startDate)));
  if (endDate)
    constraints.push(where("updatedAt", "<=", Timestamp.fromDate(endDate)));
  constraints.push(orderBy("updatedAt", "desc"));

  const q = query(collection(db, "chat"), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getUserDoc(userId) {
  if (!userId) return null;
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? userDocSnap.data() : null;
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
  targetUserId,
  targetUserName,
  startDate = null,
  endDate = null
) {
  loadingDiv.classList.remove("d-none");
  chatListDiv.classList.add("d-none");
  const chats = await getChatsByUserId(targetUserId, startDate, endDate);
  renderChatList(chats, targetUserName);
  loadingDiv.classList.add("d-none");
  chatListDiv.classList.remove("d-none");
}

function saveFilterState() {
  const state = {
    filter: filterSelect.value,
    startDate: startDateInput.value,
    endDate: endDateInput.value,
    target: targetSelect.value,
  };
  sessionStorage.setItem(CHAT_FILTER_STORAGE_KEY, JSON.stringify(state));
}

function loadFilterState() {
  const cachedState = sessionStorage.getItem(CHAT_FILTER_STORAGE_KEY);
  if (cachedState) {
    const state = JSON.parse(cachedState);
    filterSelect.value = state.filter || "all";
    startDateInput.value = state.startDate || "";
    endDateInput.value = state.endDate || "";
    if (targetSelect.options.length > 0) {
      targetSelect.value = state.target || lineIdToken?.sub;
    }
    dateInputsContainer.classList.toggle("d-none", state.filter !== "custom");
    return state;
  }
  return null;
}

function handleFilterChange() {
  const selectedTimeFilter = filterSelect.value;
  let selectedTargetId;
  let selectedTargetName;

  // **FIX**: Check the user's role to determine where to get the target ID from.
  if (currentUserDoc && currentUserDoc.role === "parent") {
    // For parents, get the target from the dropdown selection.
    selectedTargetId = targetSelect.value;
    selectedTargetName =
      targetSelect.options[targetSelect.selectedIndex]?.text || "用戶";
  } else {
    // For students, the target is always themselves.
    selectedTargetId = lineIdToken?.sub;
    selectedTargetName = "自己"; // Use "自己" to trigger the correct title in renderChatList
  }

  let startDate = null;
  let endDate = new Date();

  dateInputsContainer.classList.add("d-none");

  switch (selectedTimeFilter) {
    case "last-week":
      startDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate() - 7
      );
      break;
    case "last-month":
      startDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - 1,
        endDate.getDate()
      );
      break;
    case "custom":
      dateInputsContainer.classList.remove("d-none");
      if (startDateInput.value && endDateInput.value) {
        startDate = new Date(startDateInput.value);
        endDate = new Date(endDateInput.value);
        endDate.setHours(23, 59, 59, 999);
      } else {
        return;
      }
      break;
    default:
      endDate = null;
      break;
  }

  fetchAndRenderChats(selectedTargetId, selectedTargetName, startDate, endDate);
  saveFilterState();
}

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
    pageTitle.innerText = "我的學習記錄";
    return;
  }

  // **FIX**: Store the user document in the module-scoped variable
  currentUserDoc = await getUserDoc(userId);

  if (currentUserDoc && currentUserDoc.role === "parent") {
    targetFilterContainer.classList.remove("d-none");
    let optionsHtml = `<option value="${userId}">自己</option>`;
    if (
      currentUserDoc.associated_students &&
      currentUserDoc.associated_students.length > 0
    ) {
      currentUserDoc.associated_students.forEach((student) => {
        optionsHtml += `<option value="${student.id}">學生-${student.name}</option>`;
      });
    }
    targetSelect.innerHTML = optionsHtml;
  }

  const filterState = loadFilterState();
  if (filterState && filterState.target) {
    const selectedOption = Array.from(targetSelect.options).find(
      (opt) => opt.value === filterState.target
    );
  }

  if (!currentUserDoc || currentUserDoc.role !== "parent") {
    pageTitle.innerText = "我的學習記錄";
  }

  targetSelect.addEventListener("change", handleFilterChange);
  filterSelect.addEventListener("change", handleFilterChange);
  startDateInput.addEventListener("change", handleFilterChange);
  endDateInput.addEventListener("change", handleFilterChange);

  handleFilterChange();
})();
