import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { initWithSearchParams } from "./liff.js";

let lineIdToken = null;

const loadingDiv = document.getElementById("loading");
const detailsDiv = document.getElementById("task-details");
const formTitle = document.getElementById("form-title");

/**
 * Renders the task details on the page.
 * @param {string} threadId The ID of the chat thread.
 * @param {object} chatDetail The chat detail document from Firestore.
 */
async function renderChatDetail(threadId, chatDetail) {
  // Check if chatDetail exists
  if (!chatDetail) {
    detailsDiv.innerHTML = `<div class="alert alert-warning" role="alert">找不到任務 ${threadId} 的詳細資訊。</div>`;
    formTitle.innerText = "任務詳細";
    return;
  }

  const userDetail = await getUserDetail(chatDetail.userId);
  const userName = userDetail?.name;

  // Get the summary data
  const summaryJson = chatDetail.summaryJson;
  const summaryText = chatDetail.summary;

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

  // Build the HTML for the summary box, which now comes first
  let summaryJsonHtml = "";
  if (summaryJson) {
    const formattedUpdatedAt = chatDetail.updatedAt
      ? new Date(chatDetail.updatedAt.seconds * 1000).toLocaleString()
      : "無";
    const starRatingHtml =
      summaryJson.score !== undefined && summaryJson.score !== null
        ? getStarRating(summaryJson.score)
        : "無";

    summaryJsonHtml = `
          <div class="card shadow-sm mb-4">
            <div class="card-body">
              <h5 class="card-title text-primary mb-3">學習成果</h5>
              <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <strong>用戶名:</strong>
                  <span>${userName}</span>
                </li>    
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <strong>完成時間:</strong>
                  <span>${formattedUpdatedAt}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <strong>學習主題:</strong>
                  <span>${summaryJson.topic || "無"}</span>
                </li>
                <li class="list-group-item">
                  <strong>涉及知識點:</strong>
                  <div>${summaryJson.involvedKnowledge || "無"}</div>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <strong>評分:</strong>
                  <span>${starRatingHtml}</span>
                </li>
                <li class="list-group-item">
                  <strong>評語:</strong>
                  <div>${summaryJson.comment || "無"}</div>
                </li>
              </ul>
            </div>
          </div>
        `;
  }

  // Build HTML for the collapsible summary
  let summaryTextHtml = "";
  if (summaryText) {
    summaryTextHtml = `
        <div class="card shadow-sm mb-4">
          <div class="card-header" id="headingSummary">
            <h5 class="mb-0">
              <button class="btn btn-link w-100 text-start text-decoration-none d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapseSummary" aria-expanded="false" aria-controls="collapseSummary">
                成果總覽
                <span class="ms-auto" id="summary-arrow">&#9660;</span>
              </button>
            </h5>
          </div>
          <div id="collapseSummary" class="collapse" aria-labelledby="headingSummary">
            <div class="card-body">
              ${summaryText.replace(/\n/g, "<br>")}
            </div>
          </div>
        </div>
      `;
  }

  // Build the HTML for the collapsible chat messages
  let chatMessagesHtml = "";
  if (chatDetail.data && Array.isArray(chatDetail.data)) {
    let messagesContent = "";
    chatDetail.data.forEach((message) => {
      const isUser = message.role === "user";
      const messageClass = isUser ? "user-message" : "assistant-message";
      messagesContent += `
            <div class="d-flex mb-3 ${
              isUser ? "justify-content-end" : "justify-content-start"
            }">
              <div class="message-box p-3 shadow-sm ${messageClass}">
                ${message.text.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
    });
    chatMessagesHtml = `
        <div class="card shadow-sm mb-4">
          <div class="card-header" id="headingChat">
            <h5 class="mb-0">
              <button class="btn btn-link w-100 text-start text-decoration-none d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapseChat" aria-expanded="false" aria-controls="collapseChat">
                任務紀錄
                <span class="ms-auto" id="chat-arrow">&#9660;</span>
              </button>
            </h5>
          </div>
          <div id="collapseChat" class="collapse" aria-labelledby="headingChat">
            <div class="card-body">
              ${messagesContent}
            </div>
          </div>
        </div>
      `;
  }

  // Combine all the HTML and add event listeners for the arrows
  detailsDiv.innerHTML = `
        ${summaryJsonHtml}
        ${summaryTextHtml}
        ${chatMessagesHtml}
      `;

  formTitle.innerText = `${userName} 的任務詳細`;

  // Add event listeners for the collapse arrows
  const collapseSummary = document.getElementById("collapseSummary");
  const summaryArrow = document.getElementById("summary-arrow");
  if (collapseSummary && summaryArrow) {
    collapseSummary.addEventListener("show.bs.collapse", () => {
      summaryArrow.innerHTML = "&#9650;"; // Up arrow
    });
    collapseSummary.addEventListener("hide.bs.collapse", () => {
      summaryArrow.innerHTML = "&#9660;"; // Down arrow
    });
  }

  const collapseChat = document.getElementById("collapseChat");
  const chatArrow = document.getElementById("chat-arrow");
  if (collapseChat && chatArrow) {
    collapseChat.addEventListener("show.bs.collapse", () => {
      chatArrow.innerHTML = "&#9650;"; // Up arrow
    });
    collapseChat.addEventListener("hide.bs.collapse", () => {
      chatArrow.innerHTML = "&#9660;"; // Down arrow
    });
  }
}

async function getChatDetail(threadId) {
  if (!threadId) {
    return null;
  }
  const chatDocRef = doc(db, "chat", threadId);
  const chatDocSnap = await getDoc(chatDocRef);

  let currentChat;
  if (chatDocSnap.exists()) {
    currentChat = { id: chatDocSnap.id, ...chatDocSnap.data() };
  }
  return currentChat;
}

async function getUserDetail(userId) {
  if (!userId) {
    return null;
  }
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);

  let currentUser;
  if (userDocSnap.exists()) {
    currentUser = { id: userDocSnap.id, ...userDocSnap.data() };
  }
  return currentUser;
}

// async function getUserProfile() {
//   try {
//     const profile = await liff.getProfile();
//     return profile.displayName;
//   } catch (err) {
//     console.error("Failed to get LIFF profile:", err);
//     return "用戶";
//   }
// }

// LIFF init and prefill
(async function () {
  let threadId;
  const initError = await initWithSearchParams((urlParams) => {
    threadId = urlParams.get("threadId");
  });
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }
  // lineIdToken = liff.getDecodedIDToken();
  // const userId = lineIdToken?.sub || "";
  // const userName = await getUserProfile();

  // The LIFF login is done, now we can hide the loading spinner
  loadingDiv.classList.add("d-none");
  detailsDiv.classList.remove("d-none");

  if (!threadId) {
    detailsDiv.innerHTML = `<div class="alert alert-warning" role="alert">URL中缺少 threadId 參數。</div>`;
    formTitle.innerText = "任務詳細";
    return;
  }

  // Get the chat detail and render it
  const chatDetail = await getChatDetail(threadId);
  renderChatDetail(threadId, chatDetail);
})();
