import { initWithSearchParams } from "./liff.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";

const loadingDiv = document.getElementById("loading");
// Updated element IDs to match the new HTML structure
const surveyContainer = document.getElementById("survey-list-container");
const surveyList = document.getElementById("survey-list");

let lineIdToken = null;

async function renderSurveys(userId) {
  // Query the specific user document by userId
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);

  let currentUser;
  if (userDocSnap.exists()) {
    currentUser = { id: userDocSnap.id, ...userDocSnap.data() };
  }

  if (currentUser) {
    // Define the list of tasks for the user
    // const tasks = [
    //   {
    //     title: "填寫個人基本資料",
    //     surveyName: "profile",
    //   },
    //   {
    //     title: "填寫量表內容",
    //     surveyName: "formal_scale_sections",
    //   },
    // ];
    const surveys = await fetch("/api/survey/list").then((res) => res.json());

    // Safely get the names of completed surveys, even if the array is null
    const completedSurveys =
      currentUser.completedSurveys?.map((survey) => survey.name) || [];

    // Clear any previous list items
    surveyList.innerHTML = "";

    // Generate and append task items to the list
    surveys.forEach((task) => {
      const isCompleted = completedSurveys.includes(task.surveyName);
      const listItem = document.createElement("li");

      // Style the list item based on completion status
      listItem.className = `list-group-item d-flex justify-content-between align-items-center ${
        isCompleted ? "list-group-item-light text-muted" : ""
      }`;

      // Create the task link
      const link = document.createElement("a");
      link.href = `/survey.html?userId=${userId}&name=${task.surveyName}`;
      link.textContent = task.title;
      link.className = "text-decoration-none";

      // If completed, add strikethrough and disable the link
      if (isCompleted) {
        link.style.textDecoration = "line-through";
        link.style.pointerEvents = "none";
        link.classList.add("text-muted");
      } else {
        link.classList.add("text-dark");
      }

      // Create a status icon (checkmark or arrow)
      const statusIcon = document.createElement("i");
      if (isCompleted) {
        statusIcon.className = "bi bi-check-circle-fill text-success fs-4";
      } else {
        statusIcon.className = "bi bi-arrow-right-circle fs-4 text-primary";
      }

      // Add the link and icon to the list item
      listItem.appendChild(link);
      listItem.appendChild(statusIcon);
      surveyList.appendChild(listItem);
    });
  } else {
    // Show an error if the user isn't found
    surveyContainer.innerHTML = `<div class="card-body"><div class="alert alert-warning mb-0" role="alert">找不到使用者 ${userId} 的帳號資訊。</div></div>`;
  }
}

// LIFF init and prefill
(async function () {
  let userId;
  const initError = await initWithSearchParams((urlParams) => {
    userId = urlParams.get("userId");
  });
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }
  if (!userId) {
    lineIdToken = liff.getDecodedIDToken();
    userId = lineIdToken?.sub || "";
  }

  if (!userId) {
    loadingDiv.innerHTML = `<div class='text-danger'>無法取得使用者 ID。</div>`;
    return;
  }

  // Hide loading spinner and show the main task container
  loadingDiv.classList.add("d-none");
  surveyContainer.classList.remove("d-none");
  renderSurveys(userId);
})();
