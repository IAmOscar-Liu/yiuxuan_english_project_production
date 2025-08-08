import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { init } from "./liff.js";
import { CALLBACK_URL } from "./constants.js";

const loadingDiv = document.getElementById("loading");
const form = document.getElementById("register-form");
const nicknameInput = document.getElementById("nickname");
const emailInput = document.getElementById("email");
const roleStudent = document.getElementById("role-student");
const roleParent = document.getElementById("role-parent");
const parentExtra = document.getElementById("parent-extra");
const invitationCodesList = document.getElementById("invitation-codes-list");
const addInvitationCodeBtn = document.getElementById("add-invitation-code");
const formMessage = document.getElementById("form-message");

let lineProfile = null;
let lineIdToken = null;
let generatedStudentCode = null;

async function getUserById(userId) {
  const q = await getDocs(collection(db, "user"));
  let currentUser;
  q.forEach((doc) => {
    if (doc.id === userId) {
      currentUser = { id: doc.id, ...doc.data() };
    }
  });
  return currentUser;
}

// Helper: generate 5-7 char code (A-Z, 0-9)
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = Math.floor(Math.random() * 3) + 5; // 5~7
  let code = "";
  for (let i = 0; i < len; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Helper: show message
function showMessage(msg, type = "danger") {
  formMessage.innerHTML = `<div class="alert alert-${type} py-2 mb-0">${msg}</div>`;
}

// Helper: clear message
function clearMessage() {
  formMessage.innerHTML = "";
}

// Add invitation code input
function addInvitationCodeInput(value = "") {
  const div = document.createElement("div");
  div.className = "input-group mb-2 invitation-code-group";
  div.innerHTML = `
        <input type="text" class="form-control invitation-code" placeholder="請輸入學生邀請碼" value="${value}">
        <button class="btn btn-outline-danger remove-invitation-code" type="button">移除</button>
      `;
  div.querySelector(".remove-invitation-code").onclick = () => div.remove();
  invitationCodesList.appendChild(div);
}

// Show/hide parent extra fields
function updateRoleFields() {
  if (roleParent.checked) {
    parentExtra.classList.remove("d-none");
  } else {
    parentExtra.classList.add("d-none");
    invitationCodesList.innerHTML = "";
  }
  if (roleStudent.checked) {
    // Generate code but do NOT show in UI
    generatedStudentCode = generateCode();
    const codeRow = document.getElementById("student-code-row");
    if (codeRow) codeRow.remove();
  } else {
    const codeRow = document.getElementById("student-code-row");
    if (codeRow) codeRow.remove();
    generatedStudentCode = null;
  }
}

// Event listeners
roleStudent.addEventListener("change", updateRoleFields);
roleParent.addEventListener("change", updateRoleFields);
addInvitationCodeBtn.addEventListener("click", () => addInvitationCodeInput());

// LIFF init and prefill
(async function () {
  const initError = await init();
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 -${initError}</div>`;
    return;
  }
  lineIdToken = liff.getDecodedIDToken();
  // Try to get profile name if available
  let userId = lineIdToken?.sub || "";
  let name = lineIdToken?.name || "";
  let email = lineIdToken?.email || "";
  nicknameInput.value = name;
  emailInput.value = email;
  if ((await getUserById(userId)) != null) {
    loadingDiv.innerHTML = `<div class="alert alert-warning" role="alert">帳戶已存在，請點擊主選單『我的身份』再次登入！</div>`;
    if (liff.isInClient()) {
      setTimeout(() => liff.closeWindow(), 1500);
    } else {
      setTimeout(() => window.close(), 1500);
    }
    return;
  }
  loadingDiv.classList.add("d-none");
  form.classList.remove("d-none");
})();

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  const role = roleStudent.checked
    ? "student"
    : roleParent.checked
    ? "parent"
    : "";
  const nickName = nicknameInput.value.trim();
  const email = emailInput.value.trim();
  let studentInvitationCodes = [];
  if (role === "parent") {
    studentInvitationCodes = Array.from(
      invitationCodesList.querySelectorAll(".invitation-code")
    )
      .map((input) => input.value.trim())
      .filter((v) => v);
    // Validate all codes exist in user collection
    if (studentInvitationCodes.length > 0) {
      let invalidCodes = [];
      for (let code of studentInvitationCodes) {
        const q = await getDocs(collection(db, "user"));
        let found = false;
        q.forEach((doc) => {
          const data = doc.data();
          // if (
          //   Array.isArray(data.student_invitation_code) &&
          //   data.student_invitation_code.includes(code)
          // )
          //   found = true;
          if (
            data.role === "student" &&
            typeof data.student_invitation_code === "string" &&
            data.student_invitation_code === code
          )
            found = true;
        });
        if (!found) invalidCodes.push(code);
      }
      if (invalidCodes.length > 0) {
        showMessage(`以下邀請碼無效：${invalidCodes.join(", ")}`);
        return;
      }
    }
  }
  // Prepare user doc
  const userDoc = {
    id: lineIdToken?.sub || "",
    name: lineIdToken?.name || "",
    originalEmail: lineIdToken?.email || "",
    nickName,
    email,
    role,
    student_invitation_code:
      role === "student" ? generatedStudentCode : studentInvitationCodes,
    createdAt: new Date().toISOString(),
  };
  try {
    // Use setDoc with line sub as doc id
    await setDoc(doc(db, "user", userDoc.id), userDoc);
    showMessage("恭喜您，帳號已建立，請點擊『我的身份』再次登入！", "success");

    fetch(CALLBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userDoc.id,
        message: "恭喜您，帳號已建立，請點擊主選單『我的身份』再次登入！",
      }),
    }).catch((e) => console.error(e));
    console.log("Callback URL notified successfully.");

    // 發送訊息並關閉
    if (liff.isInClient()) {
      // await liff.sendMessages([
      //   {
      //     type: "text",
      //     text: "恭喜您，帳號已建立，請點擊『我的身份』再次登入！",
      //   },
      // ]);
      setTimeout(() => liff.closeWindow(), 1000);
    } else {
      setTimeout(() => window.close(), 1500);
    }
  } catch (err) {
    showMessage(
      "註冊失敗，請稍後再試。" + (err?.message ? "<br>" + err.message : "")
    );
  }
});
