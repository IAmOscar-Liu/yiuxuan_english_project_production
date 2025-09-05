import { initWithSearchParams } from "./liff.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";

const loadingDiv = document.getElementById("loading");
// Updated element IDs to match the new HTML structure
const videoContainer = document.getElementById("video-list-container");
const videoList = document.getElementById("video-list");

let lineIdToken = null;

async function renderVideos(userId) {
  // Query the specific user document by userId
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);

  let currentUser;
  if (userDocSnap.exists()) {
    currentUser = { id: userDocSnap.id, ...userDocSnap.data() };
  }

  if (currentUser) {
    // Define the list of videos for the user
    // const videos = [
    //   {
    //     title: "填寫個人基本資料",
    //     surveyName: "profile",
    //   },
    //   {
    //     title: "填寫量表內容",
    //     surveyName: "formal_scale_sections",
    //   },
    // ];
    const videos = await fetch("/api/video/list").then((res) => res.json());

    // Safely get the names of completed video, even if the array is null
    const completedVideos = (currentUser.completedVideos ?? [])
      .filter((video) => video.submittedAt)
      .map((video) => video.name);

    // Clear any previous list items
    videoList.innerHTML = "";

    // Generate and append video items to the list
    videos.forEach((video) => {
      const isCompleted = completedVideos.includes(video.name);
      const listItem = document.createElement("li");

      // Style the list item based on completion status
      listItem.className = `list-group-item d-flex justify-content-between align-items-center ${
        isCompleted ? "list-group-item-light text-muted" : ""
      }`;

      // Create the video link
      const link = document.createElement("a");
      link.href = `/video.html?userId=${userId}&name=${video.name}`;
      link.textContent = video.title;
      link.className = "text-decoration-none";

      // If completed, add strikethrough and disable the link
      if (isCompleted) {
        link.style.textDecoration = "line-through";
        // link.style.pointerEvents = "none";
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
      videoList.appendChild(listItem);
    });
  } else {
    // Show an error if the user isn't found
    videoContainer.innerHTML = `<div class="card-body"><div class="alert alert-warning mb-0" role="alert">找不到使用者 ${userId} 的帳號資訊。</div></div>`;
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

  // Hide loading spinner and show the main video container
  loadingDiv.classList.add("d-none");
  videoContainer.classList.remove("d-none");
  renderVideos(userId);
})();
