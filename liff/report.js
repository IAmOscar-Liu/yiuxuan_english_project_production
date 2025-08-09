import { init } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const form = document.getElementById("register-form");

const formMessage = document.getElementById("form-message");
let lineIdToken = null;

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

  loadingDiv.classList.add("d-none");
  form.classList.remove("d-none");
  fetch("/api/test")
    .then((res) => {
      if (res.status !== 200) throw new Error("Request failed");
      return res.json();
    })
    .then((json) => (formMessage.innerHTML = JSON.stringify(json)))
    .catch((e) => (formMessage.innerHTML = JSON.stringify(e)));
})();
