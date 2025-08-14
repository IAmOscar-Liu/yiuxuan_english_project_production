import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { initWithSearchParams } from "./liff.js";

let lineIdToken = null;

const loadingDiv = document.getElementById("loading");
const form = document.getElementById("register-form");
const formTitle = document.getElementById("form-title"); // Get the form title element

async function renderAccount(userId) {
  // Query the specific user document by userId
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);

  let currentUser;
  if (userDocSnap.exists()) {
    currentUser = { id: userDocSnap.id, ...userDocSnap.data() };
  }

  if (currentUser) {
    // Start building the HTML for the user's account details
    let userDetailsHtml = `
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title text-primary mb-3">帳號資訊</h5>
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <strong>暱稱:</strong>
                <span>${currentUser.nickName || "未設定"}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <strong>電子郵件:</strong>
                <span>${currentUser.email || "未設定"}</span>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <strong>身分:</strong>
                <span>${currentUser.role === "student" ? "學生" : "家長"}</span>
              </li>
      `;

    // Conditionally add parent_invitation_code if role is 'parent'
    if (currentUser.role === "parent" && currentUser.parent_invitation_code) {
      userDetailsHtml += `
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <strong>家長邀請碼:</strong>
                <div class="d-flex align-items-center">
                  <span id="student-code-display" class="badge bg-info text-dark me-2">${currentUser.parent_invitation_code}</span>
                  <button id="copy-code-btn" class="btn btn-outline-secondary btn-sm" type="button">複製</button>
                </div>
              </li>
        `;
    }

    // Add createdAt
    userDetailsHtml += `
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <strong>註冊時間:</strong>
                <span>${new Date(currentUser.createdAt).toLocaleString()}</span>
              </li>
            </ul>
          </div>
        </div>
      `;

    // **NEW**: Check for and display associated students for parents
    if (
      currentUser.role === "parent" &&
      Array.isArray(currentUser.associated_students) &&
      currentUser.associated_students.length > 0
    ) {
      let studentsHtml = `
        <div class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title text-primary mb-3">學生資訊</h5>
            <div class="list-group">
      `;

      currentUser.associated_students.forEach((student) => {
        studentsHtml += `
          <a href="./account.html?userId=${
            student.id
          }" class="list-group-item list-group-item-action">
            ${student.name || "未命名學生"}
          </a>
        `;
      });

      studentsHtml += `
            </div>
          </div>
        </div>
      `;
      // Append the student info card to the main details
      userDetailsHtml += studentsHtml;
    }

    // Set the innerHTML of the form to display the user details
    form.innerHTML = userDetailsHtml;
    formTitle.innerText = "我的帳號"; // Ensure the title is set correctly

    // Add copy to clipboard functionality
    if (currentUser.role === "parent" && currentUser.parent_invitation_code) {
      const copyCodeBtn = document.getElementById("copy-code-btn");
      const studentCodeDisplay = document.getElementById(
        "student-code-display"
      );

      if (copyCodeBtn && studentCodeDisplay) {
        copyCodeBtn.addEventListener("click", () => {
          const codeToCopy = studentCodeDisplay.innerText;
          const tempInput = document.createElement("textarea");
          tempInput.value = codeToCopy;
          document.body.appendChild(tempInput);
          tempInput.select();
          try {
            document.execCommand("copy");
            copyCodeBtn.innerText = "已複製!";
            setTimeout(() => {
              copyCodeBtn.innerText = "複製";
            }, 1500);
          } catch (err) {
            console.error("Failed to copy text: ", err);
            copyCodeBtn.innerText = "複製失敗";
          } finally {
            document.body.removeChild(tempInput);
          }
        });
      }
    }
  } else {
    form.innerHTML = `<div class="alert alert-warning" role="alert">找不到使用者 ${userId} 的帳號資訊。</div>`;
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

  loadingDiv.classList.add("d-none");
  form.classList.remove("d-none");
  renderAccount(userId);
})();
