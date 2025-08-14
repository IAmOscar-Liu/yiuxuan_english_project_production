import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { init } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const form = document.getElementById("register-form");
const nicknameInput = document.getElementById("nickname");
const emailInput = document.getElementById("email");
const roleStudent = document.getElementById("role-student");
const roleParent = document.getElementById("role-parent");
const studentExtra = document.getElementById("student-extra");
const parentInvitationCodeInput = document.getElementById(
  "parent-invitation-code"
);
const formMessage = document.getElementById("form-message");

let lineIdToken = null;
let generatedParentCode = null;

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

// Show/hide fields based on selected role
function updateRoleFields() {
  if (roleStudent.checked) {
    studentExtra.classList.remove("d-none");
    parentInvitationCodeInput.required = true;
    generatedParentCode = null;
  } else {
    studentExtra.classList.add("d-none");
    parentInvitationCodeInput.required = false;
    parentInvitationCodeInput.value = "";
  }

  if (roleParent.checked) {
    generatedParentCode = generateCode();
  } else {
    generatedParentCode = null;
  }
}

// Event listeners
roleStudent.addEventListener("change", updateRoleFields);
roleParent.addEventListener("change", updateRoleFields);

// LIFF init and prefill
(async function () {
  const initError = await init();
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 -${initError}</div>`;
    return;
  }
  lineIdToken = liff.getDecodedIDToken();
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
  let parentInvitationCode = null;
  let parentId = null;

  // If student, validate the parent invitation code
  if (role === "student") {
    const codeToValidate = parentInvitationCodeInput.value.trim();
    let isCodeValid = false;
    const q = await getDocs(collection(db, "user"));
    q.forEach((doc) => {
      const data = doc.data();
      if (
        data.role === "parent" &&
        data.parent_invitation_code === codeToValidate
      ) {
        isCodeValid = true;
        parentId = doc.id;
      }
    });

    if (!isCodeValid) {
      showMessage(`此家長邀請碼無效：${codeToValidate}`);
      return;
    }
    parentInvitationCode = codeToValidate;
  }

  // Prepare user doc
  const userDoc = {
    id: lineIdToken?.sub || "",
    name: lineIdToken?.name || "",
    originalEmail: lineIdToken?.email || "",
    nickName,
    email,
    role,
    parent_invitation_code:
      role === "parent" ? generatedParentCode : parentInvitationCode,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "user", userDoc.id), userDoc);
    showMessage("恭喜您，帳號已建立，請點擊『我的身份』再次登入！", "success");

    fetch("/api/push-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userDoc.id,
        message: "恭喜您，帳號已建立，請點擊主選單『我的身份』再次登入！",
      }),
    }).catch((e) => console.error(e));

    if (userDoc.role === "student") {
      fetch("/api/link-student-to-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userDoc.id,
          userName: userDoc.name,
          parentId,
        }),
      }).catch((e) => console.error(e));
    }

    if (liff.isInClient()) {
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
