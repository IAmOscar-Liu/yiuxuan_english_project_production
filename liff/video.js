// video.js
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { initWithSearchParams } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const detailsDiv = document.getElementById("task-details");
const formTitle = document.getElementById("form-title");

async function getUserDoc(userId) {
  if (!userId) return null;
  const userDocRef = doc(db, "user", userId);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() ? userDocSnap.data() : null;
}

/* ---------------- utilities ---------------- */
function el(tag, cls = "", html = "") {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  return n;
}
function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function showAlert(kind, msg) {
  const box = el("div", `alert alert-${kind} mt-2`, msg);
  detailsDiv.prepend(box);
  setTimeout(
    () => {
      box.remove();
      if (kind === "success") window.history.back();
    },
    kind === "success" ? 1500 : 4000
  );
}
function setBusy(btn, busy, busyText = "送出中…") {
  if (!btn) return;
  if (busy) {
    btn.disabled = true;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${busyText}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

/* ---------------- API ---------------- */
async function loadVideoJson(chapterName) {
  const res = await fetch(`/api/video/${chapterName}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
async function postVideoEvent(name, body) {
  const res = await fetch(`/api/video/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/* ---------------- render ---------------- */
function renderVideoLesson(
  json,
  userId,
  isVideoWatched = false,
  chapterName = ""
) {
  formTitle.textContent = json.title || "影片課程";

  /* Header */
  const headerCard = el("div", "card mb-3");
  const headerBody = el("div", "card-body");
  headerBody.appendChild(
    // el("h5", "card-title mb-2", escapeHtml(json.title || ""))
    el("h5", "card-title mb-2", escapeHtml("課程介紹"))
  );
  headerBody.appendChild(
    el("p", "card-text text-secondary mb-0", escapeHtml(json.description || ""))
  );
  headerCard.appendChild(headerBody);
  detailsDiv.appendChild(headerCard);

  /* Video */
  const videoCard = el("div", "card mb-3");
  const videoBody = el("div", "card-body p-2");
  const ratio = el("div", "ratio ratio-16x9");
  const videoEl = Object.assign(document.createElement("video"), {
    src: json.videoUrl,
    controls: true,
    playsInline: true,
    preload: "metadata",
    style: "border-radius: 0.5rem;",
  });
  ratio.appendChild(videoEl);
  videoBody.appendChild(ratio);

  // Gate UI
  const gateBox = el("div", "mt-2 small");
  const gateMsg = el("div", "text-secondary", "");
  const gateBadge = el("div", "mt-1");
  gateBox.append(gateMsg, gateBadge);
  videoBody.appendChild(gateBox);

  videoCard.appendChild(videoBody);
  detailsDiv.appendChild(videoCard);

  /* Questions */
  const qCard = el("div", "card mb-4");
  const qBody = el("div", "card-body");
  qBody.appendChild(el("h6", "mb-3", "練習題"));

  const form = el("form", "vstack gap-3");
  form.id = "quiz-form";

  (json.questions || []).forEach((q, idx) => {
    const fs = el("fieldset", "border rounded p-3");
    fs.dataset.idx = String(idx);
    fs.appendChild(
      el("div", "fw-semibold mb-2", `${idx + 1}. ${escapeHtml(q.question)}`)
    );

    const name = `q_${idx}`;
    const opts = q.options || {};
    Object.keys(opts).forEach((k) => {
      const id = `${name}_${k}`;
      const wrap = el(
        "label",
        "d-flex align-items-center gap-2 mb-2 p-2 border rounded"
      );
      const input = el("input", "form-check-input");
      input.type = "radio";
      input.name = name;
      input.id = id;
      input.value = k;

      const text = el(
        "span",
        "flex-grow-1",
        `<span class="badge text-bg-secondary me-2">${k}</span>${escapeHtml(
          opts[k]
        )}`
      );

      wrap.htmlFor = id;
      wrap.prepend(input);
      wrap.appendChild(text);
      fs.appendChild(wrap);
    });

    const err = el("div", "text-danger small d-none", "此題尚未作答");
    err.id = `${name}_err`;
    fs.appendChild(err);
    form.appendChild(fs);
  });

  // Submit button
  const submitWrap = el("div", "d-flex gap-2 mt-2");
  const submitBtn = el("button", "btn btn-primary", "送出");
  submitBtn.type = "button";
  submitWrap.appendChild(submitBtn);
  qBody.appendChild(form);
  qBody.appendChild(submitWrap);
  qCard.appendChild(qBody);
  detailsDiv.appendChild(qCard);

  /* Enable/disable quiz */
  const quizFieldsets = () => [...form.querySelectorAll("fieldset")];
  function setQuizEnabled(enabled) {
    quizFieldsets().forEach((fs) => {
      fs.querySelectorAll("input[type=radio]").forEach(
        (inp) => (inp.disabled = !enabled)
      );
      fs.style.opacity = enabled ? "1" : ".6";
    });
    submitBtn.disabled = !enabled;
  }

  if (isVideoWatched) {
    gateMsg.textContent = "此影片已完成觀看，可直接作答。";
    setQuizEnabled(true);
  } else {
    gateMsg.textContent = "請先觀看至少 80% 的影片，達成後可開始作答。";
    setQuizEnabled(false);
  }

  /* ----- watch time tracking (unique seconds, seek-aware, ≥80%) ----- */
  let duration = 0;
  let floorDuration = 0; // integer seconds
  const THRESHOLD_RATIO = 0.8;
  const watchedSeconds = new Set(); // unique second indices [0..floorDuration-1]

  let playing = false;
  let seeking = false;
  let lastT = 0;
  let notifiedComplete = false;

  function markRange(prev, now) {
    // add each whole second boundary crossed between prev -> now (forward only)
    if (now <= prev) return; // ignore backward or zero advance
    const start = Math.ceil(prev); // first whole second after prev
    const end = Math.floor(now); // last whole second at/before now
    for (let s = start; s <= end; s++) {
      if (s >= 0 && s < floorDuration) watchedSeconds.add(s);
    }
  }

  function updateGate() {
    if (!floorDuration) return;
    const covered = Math.min(watchedSeconds.size, floorDuration);
    const pct = Math.min(100, Math.floor((covered / floorDuration) * 100));
    gateBadge.innerHTML = `<span class="badge text-bg-info">已觀看 ${pct}%（門檻 80%）</span>`;

    if (
      !isVideoWatched &&
      !notifiedComplete &&
      covered >= Math.ceil(floorDuration * THRESHOLD_RATIO)
    ) {
      notifiedComplete = true;
      gateMsg.textContent = "已達觀看門檻，現在可以開始作答。";
      setQuizEnabled(true);
      // Notify server ONCE when threshold reached
      postVideoEvent(chapterName || json.name || "", { userId }).catch((e) =>
        console.warn("notify watched failed:", e)
      );
    }
  }

  videoEl.addEventListener("loadedmetadata", () => {
    duration = Number(videoEl.duration || 0);
    floorDuration = Math.max(1, Math.floor(duration));
    updateGate();
  });

  videoEl.addEventListener("seeking", () => {
    seeking = true;
  });

  videoEl.addEventListener("seeked", () => {
    // reset baseline after seek; do NOT count the jump
    lastT = videoEl.currentTime || 0;
    seeking = false;
  });

  videoEl.addEventListener("play", () => {
    playing = true;
    lastT = videoEl.currentTime || 0;
  });

  videoEl.addEventListener("timeupdate", () => {
    if (!playing || seeking || !floorDuration) return;
    const now = videoEl.currentTime || 0;
    markRange(lastT, now);
    lastT = now;
    updateGate();
  });

  videoEl.addEventListener("pause", () => {
    if (playing && !seeking && floorDuration) {
      const now = videoEl.currentTime || 0;
      markRange(lastT, now);
      lastT = now;
      updateGate();
    }
    playing = false;
  });

  videoEl.addEventListener("ended", () => {
    if (floorDuration) {
      markRange(lastT, duration || lastT);
      // ensure final second is covered (e.g., duration 89.9s -> second 89)
      watchedSeconds.add(floorDuration - 1);
      updateGate();
    }
    playing = false;
  });

  /* ----- submit & validate ----- */
  function collectAnswers() {
    let ok = true;
    let firstErr = null;
    const answers = [];

    (json.questions || []).forEach((q, idx) => {
      const name = `q_${idx}`;
      const picked = form.querySelector(`input[name="${name}"]:checked`);
      const errEl = form.querySelector(`#${name}_err`);
      errEl?.classList.add("d-none");

      if (!picked) {
        ok = false;
        errEl?.classList.remove("d-none");
        if (!firstErr) firstErr = errEl;
      } else {
        answers.push({ idx, choice: picked.value, correct: q.answer });
      }
    });

    return { ok, firstErr, answers };
  }

  submitBtn.addEventListener("click", async () => {
    const { ok, firstErr, answers } = collectAnswers();
    if (!ok) {
      showAlert("danger", "請完成所有題目");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const allCorrect = answers.every((a) => a.choice === a.correct);
    if (!allCorrect) {
      answers.forEach(({ idx, choice, correct }) => {
        const fs = form.querySelector(`fieldset[data-idx="${idx}"]`);
        fs.style.boxShadow =
          choice !== correct ? "0 0 0 .15rem rgba(220,53,69,.25)" : "";
      });
      showAlert("danger", "答題尚有錯誤，請再試一次。");
      return;
    }

    setBusy(submitBtn, true);
    try {
      await postVideoEvent(chapterName || json.name || "", {
        userId,
        submittedAt: new Date().toISOString(),
      });
      showAlert("success", "恭喜全部答對！已記錄完成。");
    } catch (e) {
      console.error("submit answers failed:", e);
      showAlert("danger", `送出失敗：${e?.message || e}`);
    } finally {
      setBusy(submitBtn, false);
    }
  });
}

/* ---------------- main ---------------- */
(async function () {
  let name, userId;

  const initError = await initWithSearchParams((params) => {
    name = params.get("name"); // chapter key, e.g., "chapter_1"
    userId = params.get("userId");
  });
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  loadingDiv.classList.add("d-none");
  detailsDiv.classList.remove("d-none");

  if (!name || !userId) {
    formTitle.textContent = "影片課程";
    detailsDiv.innerHTML = `<div class="alert alert-warning">URL中缺少 name 或 userId 參數。</div>`;
    return;
  }

  try {
    const [json, currentUser] = await Promise.all([
      loadVideoJson(name),
      getUserDoc(userId),
    ]);
    if (!currentUser) throw new Error("Failed to load current user");

    const isVideoWatched = !!(currentUser.completedVideos ?? []).find(
      (v) => v.name == name
    );
    renderVideoLesson(json, userId, isVideoWatched, name);
  } catch (err) {
    console.error("[Video] load failed:", err);
    detailsDiv.innerHTML = `<div class="alert alert-danger">載入課程失敗：${
      err?.message || err
    }</div>`;
  }
})();
