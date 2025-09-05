import { initWithSearchParams } from "./liff.js";

const loadingDiv = document.getElementById("loading");
const detailsDiv = document.getElementById("task-details");
const formTitle = document.getElementById("form-title");

// ---------- helpers ----------
function el(tag, cls = "", html = "") {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  return n;
}

function setBusy(btn, busy, busyText = "送出中…") {
  if (!btn) return;
  if (busy) {
    btn.disabled = true;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${busyText}
      `;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

function showAlert(kind, msg) {
  const box = el("div", `alert alert-${kind}`, msg);
  detailsDiv.append(box);
  setTimeout(
    () => {
      box.remove();
      if (kind === "success") {
        window.history.back();
      }
    },
    kind === "success" ? 1500 : 4000
  );
}

function isoForFilename(d = new Date()) {
  // 2025-09-04T15-45-12-123Z.json (no ":" or ".")
  return d.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

// ---------- renderers ----------
function renderProfileSurvey(json, userId) {
  formTitle.innerText = json.title || "壹、基本資料";
  const form = el("form", "vstack gap-3", "");
  form.id = "survey-form";

  json.questions.forEach((q) => {
    const fs = el("fieldset", "card");
    const body = el("div", "card-body");
    const legend = el(
      "div",
      "card-title fw-semibold mb-2",
      `${q.id}. ${q.text}`
    );
    body.appendChild(legend);

    const group = el("div", "d-flex flex-wrap gap-3");
    const name = `q_${q.id}`;

    q.options.forEach((opt) => {
      const optId = `${name}_${opt.id}`;
      const wrapper = el("div", "form-check form-check-inline");

      const input = el("input", "form-check-input");
      input.type = "radio";
      input.name = name;
      input.id = optId;
      input.value = opt.id;

      const label = el("label", "form-check-label", opt.label);
      label.htmlFor = optId;

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      group.appendChild(wrapper);
    });

    // 其他
    const hasOther =
      "otherText" in q ||
      (q.options || []).some((o) => String(o.label).includes("其他"));
    if (hasOther) {
      const otherBox = el("input", "form-control mt-2 d-none");
      otherBox.type = "text";
      otherBox.placeholder = "請填寫「其他」的說明";
      otherBox.id = `${name}_other`;
      body.appendChild(otherBox);

      body.addEventListener("change", (e) => {
        if (e.target.name !== name) return;
        const otherOpt = q.options.find((o) =>
          String(o.label).includes("其他")
        );
        const isOther = otherOpt && e.target.id.endsWith(`_${otherOpt.id}`);
        otherBox.classList.toggle("d-none", !isOther);
        if (!isOther) otherBox.value = "";
      });
    }

    const error = el("div", "text-danger small d-none", "此題尚未作答");
    error.id = `${name}_err`;
    body.appendChild(group);
    body.appendChild(error);
    fs.appendChild(body);
    form.appendChild(fs);
  });

  const submitBar = el("div", "d-flex gap-2 mt-3");
  const submitBtn = el("button", "btn btn-primary", "送出");
  submitBtn.type = "button";
  submitBtn.addEventListener("click", async () => {
    const { ok, filledJson, firstErrorEl } = collectProfileAnswers(json);
    if (!ok) {
      showAlert("danger", "請完成所有題目（包含「其他」填寫）");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(submitBtn, true);
    try {
      await postSurvey("profile", userId, filledJson);
    } finally {
      setBusy(submitBtn, false);
    }
  });
  submitBar.appendChild(submitBtn);
  form.appendChild(submitBar);

  detailsDiv.appendChild(form);
}
function collectProfileAnswers(json) {
  let ok = true;
  let firstErrorEl = null;

  const filled = structuredClone(json);
  filled.questions.forEach((q) => {
    const name = `q_${q.id}`;
    const picked = document.querySelector(`input[name="${name}"]:checked`);
    const errEl = document.getElementById(`${name}_err`);
    const otherBox = document.getElementById(`${name}_other`);
    errEl?.classList.add("d-none");

    if (!picked) {
      ok = false;
      errEl?.classList.remove("d-none");
      if (!firstErrorEl) firstErrorEl = errEl;
      return;
    }
    const chosenOpt = q.options.find((o) => String(o.id) === picked.value);
    filled.questions.find((qq) => qq.id === q.id).answer = Number(picked.value);

    // handle "其他"
    if (chosenOpt && String(chosenOpt.label).includes("其他")) {
      if (!otherBox || !otherBox.value.trim()) {
        ok = false;
        if (errEl) {
          errEl.textContent = "此題選擇「其他」，請填寫說明";
          errEl.classList.remove("d-none");
        }
        if (!firstErrorEl) firstErrorEl = errEl;
      } else {
        filled.questions.find((qq) => qq.id === q.id).otherText =
          otherBox.value.trim();
      }
    } else {
      // ensure otherText not carried over
      if ("otherText" in filled.questions.find((qq) => qq.id === q.id))
        filled.questions.find((qq) => qq.id === q.id).otherText = null;
    }
  });

  return { ok, filledJson: filled, firstErrorEl };
}

function renderFormalScale(json, userId) {
  formTitle.innerText = json.title || "貳、正式量表內容";
  const hint = el(
    "div",
    "mb-3 small text-secondary",
    `量表：${json.scale || "Likert-5"}`
  );
  detailsDiv.appendChild(hint);

  json.sections.forEach((sec, si) => {
    const card = el("div", "card mb-4");
    const header = el(
      "div",
      "card-header bg-white",
      `<div class="fw-bold">${sec.section}. ${sec.name}</div>
       <div class="text-secondary small">${sec.description || ""}</div>`
    );
    const body = el("div", "card-body p-0");

    const table = el("table", "table table-sm align-middle mb-0");
    const thead = el("thead", "table-light");
    const trh = el("tr");
    trh.appendChild(el("th", "w-50", "題目"));
    (json.rating_options || []).forEach((opt) => {
      trh.appendChild(el("th", "text-center", opt.label));
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = el("tbody");
    sec.questions.forEach((q) => {
      const tr = el("tr");
      tr.appendChild(
        el(
          "td",
          "",
          `<div class="fw-semibold">${q.code}</div><div>${
            q.text
          }</div><div class="text-secondary small">${q.facet || ""}</div>`
        )
      );

      const name = `sec${si}_${q.code}`;
      (json.rating_options || []).forEach((opt) => {
        const td = el("td", "text-center");
        const id = `${name}_${opt.value}`;
        td.innerHTML = `
          <input class="form-check-input" type="radio"
                 name="${name}" id="${id}" value="${opt.value}">
        `;
        tr.appendChild(td);
      });

      const err = el("div", "text-danger small d-none", "此題尚未作答");
      err.id = `${name}_err`;
      const errTd = el("td", "", "");
      errTd.colSpan = 0; // keep table compact; error will overlay below on scroll
      tr.appendChild(err);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    body.appendChild(table);
    card.appendChild(header);
    card.appendChild(body);
    detailsDiv.appendChild(card);
  });

  const submitWrap = el("div", "d-flex gap-2 my-3");
  const btn = el("button", "btn btn-primary", "送出");
  btn.type = "button";
  btn.addEventListener("click", async () => {
    const { ok, filledJson, firstErrorEl } = collectFormalAnswers(json);
    if (!ok) {
      showAlert("danger", "請完成所有題目");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // await postSurvey("formal_scale_sections", userId, filledJson);
    setBusy(btn, true);
    try {
      await postSurvey("formal_scale_sections", userId, filledJson);
    } finally {
      setBusy(btn, false);
    }
  });
  submitWrap.appendChild(btn);
  detailsDiv.appendChild(submitWrap);
}
function collectFormalAnswers(json) {
  let ok = true;
  let firstErrorEl = null;

  const filled = structuredClone(json);
  filled.sections.forEach((sec, si) => {
    sec.questions.forEach((q) => {
      const name = `sec${si}_${q.code}`;
      const picked = document.querySelector(`input[name="${name}"]:checked`);
      const errEl = document.getElementById(`${name}_err`);
      errEl?.classList.add("d-none");

      if (!picked) {
        ok = false;
        errEl?.classList.remove("d-none");
        if (!firstErrorEl) firstErrorEl = errEl;
      } else {
        const section = filled.sections.find((s) => s.section === sec.section);
        const fq = section.questions.find((qq) => qq.code === q.code);
        fq.answer = Number(picked.value);
      }
    });
  });
  return { ok, filledJson: filled, firstErrorEl };
}

// ---------- submit ----------
// let surveyName, userId;

async function postSurvey(name, userId, answeredJson) {
  // attach metadata before persisting
  const payload = {
    surveyName: name,
    userId,
    submittedAt: new Date().toISOString(),
    data: answeredJson,
  };

  // showAlert("success", `已送出！檔案路徑：OK`);

  try {
    const res = await fetch(`/api/survey/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = await res.json();
    showAlert("success", `已送出！檔案路徑：${out.path || "OK"}`);
  } catch (err) {
    console.error("submit failed", err);
    showAlert("danger", `送出失敗：${err?.message || err}`);
  }
}

async function loadSurveyJson(surveyName) {
  const res = await fetch(`/api/survey/${surveyName}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/* ---------------- main ---------------- */
(async function () {
  let surveyName, userId;

  const initError = await initWithSearchParams((params) => {
    surveyName = params.get("name"); // "profile" | "formal_scale_sections"
    userId = params.get("userId");
  });
  if (initError) {
    loadingDiv.innerHTML = `<div class='text-danger'>LIFF 初始化失敗 - ${initError}</div>`;
    return;
  }

  // optional: const currentUser = await getUserDetail(userId);

  loadingDiv.classList.add("d-none");
  detailsDiv.classList.remove("d-none");

  if (!surveyName || !userId) {
    formTitle.textContent = "問卷內容";
    detailsDiv.innerHTML = `<div class="alert alert-warning">URL中缺少 name 或 userId 參數。</div>`;
    return;
  }

  try {
    const json = await loadSurveyJson(surveyName);
    if (surveyName === "profile") renderProfileSurvey(json, userId);
    else if (surveyName === "formal_scale_sections")
      renderFormalScale(json, userId);
    else throw new Error("Survey not found");
  } catch (err) {
    console.error("[Survey] load failed:", err);
    detailsDiv.innerHTML = `<div class="alert alert-danger">載入問卷失敗：${
      err?.message || err
    }</div>`;
  }
})();
