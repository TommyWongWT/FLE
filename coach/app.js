"use strict";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "fle-coach-v1";
const FIELDS = [
  { id: "procurement", title: "Procurement, Contracts & Project Management", detail: "Project scope, procurement, contracts and delivery." },
  { id: "finance", title: "Project Appraisal & Financial Management", detail: "Funding, appraisal, financial control and value." },
  { id: "leadership", title: "Management & Leadership", detail: "Leading teams, diversity and stakeholders." },
  { id: "sustainability", title: "Sustainable Development", detail: "Environmental impact, resilience and whole-life thinking." },
  { id: "risk", title: "Health, Safety, Welfare & Risk Assessment", detail: "Identifying, assessing and managing risk and safety." },
];
const freshLearning = () => ({ fields: [], lesson: "", lessonFields: [], crosscheck: "", sitting: "" });
const freshState = () => ({
  version: 1, attempts: [], topics: [], submission: { evidence: "", criteria: "", draft: "", feedback: "", crosscheck: "" },
  mock: { sitting: "", records: {} }, learning: freshLearning(),
});
function questionCount(sittingId) {
  const sitting = catalog.find((s) => s.id === sittingId);
  const count = Number(sitting?.question_count);
  return Number.isInteger(count) && count >= 1 && count <= 10 ? count : 5;
}
function freshMock(sittingId) {
  return { elapsed: 0, checks: Array(questionCount(sittingId)).fill(false), notes: "", goal: 30 };
}
function alignMockChecks(record, sittingId) {
  const count = questionCount(sittingId);
  if (!Array.isArray(record.checks)) record.checks = [];
  if (record.checks.length === count) return record;
  record.checks = record.checks.slice(0, count);
  while (record.checks.length < count) record.checks.push(false);
  return record;
}
let state;
let catalog = [];
let currentAttempt = null;
let currentTopic = null;
const clocks = {
  practice: { running: false, last: 0 },
  mock: { running: false, last: 0, session: 0, reminded: false },
};

function notice(message) { $("notice").textContent = message; }
function validState(data) {
  const text = (value) => typeof value === "string";
  const object = (value) => value && typeof value === "object" && !Array.isArray(value);
  const fieldList = (value) => Array.isArray(value) && value.every((id) => FIELDS.some((field) => field.id === id));
  return object(data) && data.version === 1 && Array.isArray(data.attempts) &&
    data.attempts.every((a) => object(a) && ["id", "sitting", "question", "context", "answer", "evidence", "feedback", "next", "date"].every((key) => text(a[key])) && (a.crosscheck === undefined || text(a.crosscheck)) && (a.fields === undefined || fieldList(a.fields)) && Number.isFinite(a.elapsed) && a.elapsed >= 0) &&
    Array.isArray(data.topics) && data.topics.every((t) => object(t) && ["id", "title", "confidence", "sitting", "question", "notes", "next"].every((key) => text(t[key]))) &&
    object(data.submission) && ["evidence", "criteria", "draft", "feedback"].every((key) => text(data.submission[key])) && (data.submission.crosscheck === undefined || text(data.submission.crosscheck)) &&
    (data.learning === undefined || (object(data.learning) && fieldList(data.learning.fields) && fieldList(data.learning.lessonFields) && ["lesson", "crosscheck", "sitting"].every((key) => text(data.learning[key])))) &&
    object(data.mock) && text(data.mock.sitting) && object(data.mock.records) &&
    Object.values(data.mock.records).every((m) => object(m) && Number.isFinite(m.elapsed) && m.elapsed >= 0 && Array.isArray(m.checks) && m.checks.length >= 1 && m.checks.length <= 10 && m.checks.every((c) => typeof c === "boolean") && text(m.notes) && Number.isFinite(m.goal) && m.goal >= 1 && m.goal <= 360);
}
let persistTimer = 0;
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleDiskSave();
    return true;
  } catch (error) {
    notice(`Could not save to browser storage: ${error.message}. Export a backup now.`);
    return false;
  }
}
function scheduleDiskSave() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { persistCurrentAttempt(); }, 400);
}
persistCurrentAttempt.noticed = persistCurrentAttempt.noticed || new Set();
async function persistCurrentAttempt() {
  const a = attempt();
  if (!a || !a.sitting) return;
  try {
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, status: a.answer.trim() || a.context.trim() ? "in_progress" : "not_started" }),
    });
    const result = await response.json();
    if (!response.ok) {
      notice(result.error || "Could not save this attempt to the sitting folder.");
      return;
    }
    if (result.path && !persistCurrentAttempt.noticed.has(result.path)) {
      persistCurrentAttempt.noticed.add(result.path);
      notice(`Also saved to ${result.path}. Keep confidential data out of this public repo.`);
    }
  } catch (error) {
    notice(`Could not save this attempt to the sitting folder: ${error.message}`);
  }
}
async function deletePersistedAttempt(item) {
  if (!item?.sitting || !item?.id) return;
  try {
    const response = await fetch(`/api/attempts?sitting=${encodeURIComponent(item.sitting)}&id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      notice(result.error || "Could not delete the file copy of this attempt.");
    }
  } catch (error) {
    notice(`Could not delete the file copy of this attempt: ${error.message}`);
  }
}
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, "0")).join(":");
}
function attempt() { return state.attempts.find((a) => a.id === currentAttempt); }
function topic() { return state.topics.find((t) => t.id === currentTopic); }
function learning() {
  if (!state.learning) state.learning = freshLearning();
  return state.learning;
}
function fieldNames(ids) {
  return ids.map((id) => FIELDS.find((field) => field.id === id).title).join(", ");
}
function mock() {
  const key = state.mock.sitting;
  if (!state.mock.records[key]) state.mock.records[key] = freshMock(key);
  return alignMockChecks(state.mock.records[key], key);
}
function titleFor(id) { return catalog.find((s) => s.id === id)?.title || id || "No sitting"; }
function fillSelect(id, value) {
  const select = $(id);
  select.replaceChildren(new Option("Select a sitting", ""));
  for (const sitting of catalog) select.add(new Option(`${sitting.year} ${sitting.season || ""} - ${sitting.title}`, sitting.id));
  if (value && !catalog.some((s) => s.id === value)) select.add(new Option(`${value} (not in catalog)`, value));
  select.value = value || "";
}
function showLinks(target, id, includeReport = true) {
  const container = $(target);
  container.replaceChildren();
  const sitting = catalog.find((s) => s.id === id);
  if (!sitting) return;
  for (const [label, doc] of [["Open scenario", sitting.scenario], ["Examiner's report", sitting.examiners_report]]) {
    if (!includeReport && label === "Examiner's report") continue;
    const url = new URL(doc.drive_url);
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") continue;
    const link = element("a", label);
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    container.append(link);
  }
}
function renderLearningStatus() {
  const l = learning();
  $("learn-selection").textContent = l.fields.length ? `Selected: ${fieldNames(l.fields)}` : "Choose at least one field.";
  if (!l.lessonFields.length) {
    $("lesson-fields").textContent = "";
  } else {
    const changed = l.fields.length !== l.lessonFields.length || l.fields.some((id) => !l.lessonFields.includes(id));
    $("lesson-fields").textContent = `Last generated for: ${fieldNames(l.lessonFields)}${changed ? ". Your selection has changed; create a new lesson if needed." : ""}`;
  }
}
function renderLearning() {
  const l = learning();
  const fields = $("learn-fields");
  fields.replaceChildren();
  for (const field of FIELDS) {
    const label = element("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = l.fields.includes(field.id);
    box.addEventListener("change", () => {
      l.fields = FIELDS.filter((item) => item.id === field.id ? box.checked : l.fields.includes(item.id)).map((item) => item.id);
      save();
      renderLearningStatus();
    });
    const description = element("span", field.title);
    description.append(element("small", field.detail));
    label.append(box, description);
    fields.append(label);
  }
  $("learn-lesson").value = l.lesson;
  $("learn-crosscheck").value = l.crosscheck;
  fillSelect("learn-sitting", l.sitting);
  showLinks("learn-links", l.sitting, false);
  renderLearningStatus();
}
function createAttempt(sitting = "", fields = []) {
  pause("practice");
  const item = { id: crypto.randomUUID(), sitting, fields: [...fields], question: "", context: "", answer: "", evidence: "", feedback: "", crosscheck: "", next: "", elapsed: 0, date: new Date().toISOString() };
  state.attempts.push(item);
  currentAttempt = item.id;
  save();
  renderAttempts();
  renderAttempt();
}
function practiceMaterial(a) {
  return `Sitting: ${titleFor(a.sitting)}\nStudy focus: ${fieldNames(a.fields || []) || "Not specified"}\nQuestion: ${a.question}\nQuestion and scenario context:\n${a.context}\n\nAnswer:\n${a.answer}\n\nEvidence and references:\n${a.evidence}`;
}
function renderAttempts() {
  const list = $("attempt-list");
  list.replaceChildren();
  if (!state.attempts.length) list.append(element("p", "No attempts yet.", "muted"));
  for (const item of [...state.attempts].reverse()) {
    const button = element("button", `${item.question || "Untitled question"} · ${titleFor(item.sitting)}`, item.id === currentAttempt ? "selected" : "");
    button.addEventListener("click", () => { pause("practice"); currentAttempt = item.id; renderAttempts(); renderAttempt(); });
    list.append(button);
  }
}
function renderAttempt() {
  const a = attempt();
  $("attempt-empty").hidden = !!a;
  $("attempt-editor").hidden = !a;
  if (!a) return;
  fillSelect("attempt-sitting", a.sitting);
  $("attempt-fields").textContent = a.fields?.length ? `Study focus: ${fieldNames(a.fields)}` : "";
  for (const key of ["question", "context", "answer", "evidence", "feedback", "crosscheck", "next"]) $(`attempt-${key}`).value = a[key] ?? "";
  showLinks("document-links", a.sitting);
  renderClocks();
}
function renderTopics() {
  const list = $("topic-list");
  list.replaceChildren();
  if (!state.topics.length) list.append(element("p", "No topics yet.", "muted"));
  for (const item of [...state.topics].reverse()) {
    const button = element("button", `${item.title || "Untitled topic"} · ${item.confidence}`, item.id === currentTopic ? "selected" : "");
    button.addEventListener("click", () => { currentTopic = item.id; renderTopics(); renderTopic(); });
    list.append(button);
  }
}
function renderTopic() {
  const t = topic();
  $("topic-empty").hidden = !!t;
  $("topic-editor").hidden = !t;
  if (!t) return;
  fillSelect("topic-sitting", t.sitting);
  for (const key of ["title", "confidence", "question", "notes", "next"]) $(`topic-${key}`).value = t[key];
}
function renderProgress() {
  const summary = $("progress-summary");
  summary.replaceChildren();
  for (const [number, label] of [[state.attempts.length, "Attempts"], [formatTime(state.attempts.reduce((sum, a) => sum + a.elapsed, 0)), "Practice time"], [state.topics.filter((t) => t.confidence === "Needs work").length, "Topics needing work"]]) {
    const stat = element("div", undefined, "stat");
    stat.append(element("strong", String(number)), element("span", label));
    summary.append(stat);
  }
  const attempts = $("progress-attempts");
  attempts.replaceChildren();
  if (!state.attempts.length) attempts.append(element("p", "No practice recorded yet.", "muted"));
  for (const a of [...state.attempts].reverse()) attempts.append(element("div", `${a.date.slice(0, 10)} · ${titleFor(a.sitting)} · ${a.question || "Untitled"} · ${formatTime(a.elapsed)}${a.fields?.length ? ` · Focus: ${fieldNames(a.fields)}` : ""}${a.next ? ` · Next: ${a.next}` : ""}`, "progress-item"));
  const topics = $("progress-topics");
  topics.replaceChildren();
  const needingWork = state.topics.filter((t) => t.confidence !== "Confident");
  if (!needingWork.length) topics.append(element("p", "No weaknesses recorded yet.", "muted"));
  for (const t of needingWork) topics.append(element("div", `${t.title || "Untitled"} · ${t.confidence}${t.next ? ` · Next: ${t.next}` : ""}`, "progress-item"));
}
function renderMock() {
  fillSelect("mock-sitting", state.mock.sitting);
  const m = mock();
  $("mock-goal").value = m.goal;
  $("mock-notes").value = m.notes;
  showLinks("mock-links", state.mock.sitting);
  const list = $("mock-checklist");
  list.replaceChildren();
  m.checks.forEach((checked, index) => {
    const label = element("label", undefined, "check-item");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = checked;
    box.addEventListener("change", () => { mock().checks[index] = box.checked; save(); });
    label.append(box, document.createTextNode(`Question ${index + 1} completed`));
    list.append(label);
  });
  renderClocks();
}
function renderSubmission() {
  for (const key of ["evidence", "criteria", "draft", "feedback", "crosscheck"]) $(`submission-${key}`).value = state.submission[key] ?? "";
}
function renderClocks() {
  $("practice-time").textContent = formatTime(attempt()?.elapsed || 0);
  $("practice-toggle").textContent = clocks.practice.running ? "Pause timer" : "Start timer";
  $("mock-time").textContent = formatTime(Math.max(0, 21600000 - mock().elapsed));
  $("mock-session").textContent = `Session: ${formatTime(clocks.mock.session)}`;
  $("mock-toggle").textContent = clocks.mock.running ? "Pause mock" : "Start / resume mock";
}
function tick(name) {
  const clock = clocks[name];
  if (!clock.running) return;
  const now = Date.now();
  const delta = Math.max(0, now - clock.last);
  clock.last = now;
  if (name === "practice" && attempt()) attempt().elapsed += delta;
  if (name === "mock") {
    const remaining = Math.max(0, 21600000 - mock().elapsed);
    const counted = Math.min(delta, remaining);
    mock().elapsed += counted;
    clock.session += counted;
    if (!clock.reminded && clock.session >= mock().goal * 60000) {
      clock.reminded = true;
      notice("Session goal reached. You can pause now or keep going.");
    }
    if (mock().elapsed >= 21600000) {
      clock.running = false;
      notice("Six hours of mock working time completed. Review your answers and timing.");
    }
  }
  save();
}
function pause(name) { tick(name); clocks[name].running = false; if (state) renderClocks(); }
function pauseAll() { pause("practice"); pause("mock"); }
function bindFields(prefix, keys, getItem, onChange = () => {}) {
  for (const key of keys) {
    $(`${prefix}-${key}`).addEventListener("input", (event) => {
      const item = getItem();
      if (!item) return;
      item[key] = event.target.value;
      save();
      onChange(key);
    });
  }
}
async function requestFeedback(mode, text, target, buttons, provider = "xai") {
  if (!text.trim()) { notice("Add material before requesting feedback."); return; }
  const service = provider === "gemini" ? "Google Gemini" : "xAI";
  if (!confirm(`Send the displayed study material${provider === "gemini" ? " and Grok output" : ""} to ${service}? API charges may apply.`)) return;
  buttons.forEach((button) => { button.disabled = true; });
  notice(`Requesting feedback from ${service}...`);
  try {
    const response = await fetch(provider === "gemini" ? "/api/crosscheck" : "/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, text }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    if (target(result.feedback) === false) return;
    if (save()) notice("AI feedback received. It is not an official assessment.");
  } catch (error) {
    notice(`Feedback failed: ${error.message}`);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function checkProvider(provider) {
  const gemini = provider === "gemini";
  const status = $(gemini ? "gemini-api-status" : "api-status");
  const name = gemini ? "Gemini" : "Grok";
  status.textContent = `${name}: checking...`;
  status.dataset.state = "checking";
  try {
    const response = await fetch(gemini ? "/api/gemini-status" : "/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    status.textContent = `${name}: model info accessible (${result.model})`;
    status.dataset.state = "available";
  } catch (error) {
    status.textContent = `${name}: unavailable - ${error.message}`;
    status.dataset.state = "unavailable";
  }
}

async function checkApi() {
  const button = $("api-check");
  button.disabled = true;
  try {
    await Promise.all([checkProvider("xai"), checkProvider("gemini")]);
  } finally {
    button.disabled = false;
  }
}

async function start() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state = stored ? JSON.parse(stored) : freshState();
    if (!validState(state)) throw new Error("Saved data has an invalid format.");
  } catch (error) {
    notice(`Unable to load saved work: ${error.message}. Your saved data has not been overwritten. Import a valid backup to recover.`);
    $("import").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!validState(imported)) throw new Error("Invalid or unsupported backup format.");
        if (!confirm("Replace the unreadable saved data with this backup?")) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
        location.reload();
      } catch (importError) {
        notice(`Import failed: ${importError.message}`);
      } finally {
        event.target.value = "";
      }
    });
    return;
  }
  try {
    const response = await fetch("/api/sittings");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.sittings)) throw new Error("Invalid sitting catalog.");
    catalog = data.sittings;
    const syllabus = data.reference_documents?.find((doc) => doc.id === "syllabus");
    const syllabusUrl = new URL(syllabus.drive_url);
    if (syllabusUrl.protocol !== "https:" || syllabusUrl.hostname !== "drive.google.com") throw new Error("Invalid syllabus link.");
    $("syllabus-link").href = syllabusUrl.href;
  } catch (error) {
    notice(`Could not load the sitting catalog: ${error.message}. Restart the server and reload.`);
    return;
  }
  document.querySelectorAll("nav button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b === button));
    document.querySelectorAll(".tab").forEach((tab) => { tab.hidden = tab.id !== button.dataset.tab; });
    if (button.dataset.tab === "progress") renderProgress();
  }));
  $("api-check").addEventListener("click", checkApi);
  $("learn-lesson").addEventListener("input", (event) => { learning().lesson = event.target.value; save(); });
  $("learn-crosscheck").addEventListener("input", (event) => { learning().crosscheck = event.target.value; save(); });
  $("learn-sitting").addEventListener("change", (event) => {
    learning().sitting = event.target.value;
    save();
    showLinks("learn-links", learning().sitting, false);
  });
  $("learn-generate").addEventListener("click", () => {
    const l = learning();
    if (!l.fields.length) { notice("Choose at least one field before creating a lesson."); return; }
    const selected = [...l.fields];
    const previous = l.lesson;
    requestFeedback("learn", `Selected learning fields:\n${fieldNames(selected)}`, (feedback) => {
      if (state.learning !== l) { notice("The learning session was replaced before the lesson arrived; it was not saved."); return false; }
      l.lesson = l.lesson === previous ? feedback : `${l.lesson}\n\n--- New lesson ---\n${feedback}`;
      l.lessonFields = selected;
      $("learn-lesson").value = l.lesson;
      renderLearningStatus();
    }, [$("learn-generate")]);
  });
  $("learn-crosscheck-button").addEventListener("click", () => {
    const l = learning();
    if (!l.lesson.trim()) { notice("Add a lesson before requesting a cross-check."); return; }
    const previous = l.crosscheck;
    const fields = l.lessonFields.length ? l.lessonFields : l.fields;
    const text = `Learning fields: ${fieldNames(fields) || "Not specified"}\n\nGrok lesson or learner-edited notes:\n${l.lesson}`;
    requestFeedback("crosscheck", text, (feedback) => {
      if (state.learning !== l) { notice("The learning session was replaced before feedback arrived; it was not saved."); return false; }
      l.crosscheck = l.crosscheck === previous ? feedback : `${l.crosscheck}\n\n--- New Gemini cross-check ---\n${feedback}`;
      $("learn-crosscheck").value = l.crosscheck;
    }, [$("learn-crosscheck-button")], "gemini");
  });
  $("learn-practice").addEventListener("click", () => {
    const l = learning();
    if (!l.fields.length) { notice("Choose at least one field before starting a past-paper attempt."); return; }
    if (!l.sitting) { notice("Choose a past-paper sitting before starting an attempt."); return; }
    createAttempt(l.sitting, l.fields);
    document.querySelector('nav button[data-tab="practice"]').click();
    notice("Open the scenario and choose a relevant question. Your selected fields are saved with this attempt.");
  });
  $("new-attempt").addEventListener("click", () => createAttempt());
  bindFields("attempt", ["sitting", "question", "context", "answer", "evidence", "feedback", "crosscheck", "next"], attempt, (key) => {
    if (key === "sitting") showLinks("document-links", attempt().sitting);
    if (key === "sitting" || key === "question") renderAttempts();
  });
  $("delete-attempt").addEventListener("click", () => {
    if (!confirm("Delete this attempt? This cannot be undone.")) return;
    pause("practice");
    const item = attempt();
    state.attempts = state.attempts.filter((a) => a.id !== currentAttempt);
    currentAttempt = null;
    save();
    deletePersistedAttempt(item);
    renderAttempts();
    renderAttempt();
  });
  $("practice-toggle").addEventListener("click", () => {
    if (clocks.practice.running) pause("practice");
    else { clocks.practice.running = true; clocks.practice.last = Date.now(); renderClocks(); }
  });
  for (const [id, mode] of [["review", "review"], ["challenge", "challenge"]]) {
    $(id).addEventListener("click", () => {
      const a = attempt();
      if (!a || !a.answer.trim()) { notice("Write an answer before requesting feedback."); return; }
      const previousFeedback = a.feedback;
      const text = practiceMaterial(a);
      requestFeedback(mode, text, (feedback) => {
        if (!state.attempts.includes(a)) { notice("The attempt was removed before feedback arrived; feedback was not saved."); return false; }
        a.feedback = a.feedback === previousFeedback ? feedback : `${a.feedback}\n\n--- New AI feedback ---\n${feedback}`;
        if (attempt() === a) $("attempt-feedback").value = a.feedback;
      }, [$("review"), $("challenge")]);
    });
  }
  $("attempt-crosscheck-button").addEventListener("click", () => {
    const a = attempt();
    if (!a || !a.answer.trim() || !a.feedback.trim()) { notice("Add your answer and Grok feedback before requesting a cross-check."); return; }
    const previous = a.crosscheck || "";
    const text = `${practiceMaterial(a)}\n\nGrok feedback:\n${a.feedback}`;
    requestFeedback("crosscheck", text, (feedback) => {
      if (!state.attempts.includes(a)) { notice("The attempt was removed before feedback arrived; feedback was not saved."); return false; }
      a.crosscheck = (a.crosscheck || "") === previous ? feedback : `${a.crosscheck}\n\n--- New Gemini cross-check ---\n${feedback}`;
      if (attempt() === a) $("attempt-crosscheck").value = a.crosscheck;
    }, [$("attempt-crosscheck-button")], "gemini");
  });
  $("new-topic").addEventListener("click", () => {
    const item = { id: crypto.randomUUID(), title: "", confidence: "Needs work", sitting: "", question: "", notes: "", next: "" };
    state.topics.push(item); currentTopic = item.id; save(); renderTopics(); renderTopic();
  });
  bindFields("topic", ["title", "confidence", "sitting", "question", "notes", "next"], topic, (key) => {
    if (key === "title" || key === "confidence") renderTopics();
  });
  $("delete-topic").addEventListener("click", () => {
    if (!confirm("Delete this topic and its notes?")) return;
    state.topics = state.topics.filter((t) => t.id !== currentTopic); currentTopic = null; save(); renderTopics(); renderTopic();
  });
  $("mock-sitting").addEventListener("change", (event) => { pause("mock"); state.mock.sitting = event.target.value; clocks.mock.session = 0; clocks.mock.reminded = false; save(); renderMock(); });
  $("mock-goal").addEventListener("change", (event) => {
    const goal = Number(event.target.value);
    if (!Number.isInteger(goal) || goal < 1 || goal > 360) { notice("Session goal must be between 1 and 360 minutes."); event.target.value = mock().goal; return; }
    mock().goal = goal; clocks.mock.reminded = false; save();
  });
  $("mock-notes").addEventListener("input", (event) => { mock().notes = event.target.value; save(); });
  $("mock-toggle").addEventListener("click", () => {
    if (clocks.mock.running) pause("mock");
    else if (!state.mock.sitting) notice("Select a sitting before starting the mock.");
    else if (mock().elapsed >= 21600000) notice("The mock is complete. Reset the timer to start again.");
    else { clocks.mock.running = true; clocks.mock.last = Date.now(); clocks.mock.session = 0; clocks.mock.reminded = false; renderClocks(); }
  });
  $("mock-reset").addEventListener("click", () => {
    if (!confirm("Reset this sitting's mock timer and question checklist? Your attempts and mock review notes are kept.")) return;
    pause("mock"); mock().elapsed = 0; mock().checks = Array(questionCount(state.mock.sitting)).fill(false); clocks.mock.session = 0; save(); renderMock();
  });
  bindFields("submission", ["evidence", "criteria", "draft", "feedback", "crosscheck"], () => state.submission);
  $("submission-review").addEventListener("click", () => {
    const s = state.submission;
    if (!s.evidence.trim() && !s.draft.trim()) { notice("Add project evidence or a draft before requesting feedback."); return; }
    const previousFeedback = s.feedback;
    const text = `Project evidence:\n${s.evidence}\n\nRequirements and sources:\n${s.criteria}\n\nDraft:\n${s.draft}`;
    requestFeedback("submission", text, (feedback) => {
      if (state.submission !== s) { notice("The submission was replaced before feedback arrived; feedback was not saved."); return false; }
      s.feedback = s.feedback === previousFeedback ? feedback : `${s.feedback}\n\n--- New AI feedback ---\n${feedback}`;
      $("submission-feedback").value = s.feedback;
    }, [$("submission-review")]);
  });
  $("submission-crosscheck-button").addEventListener("click", () => {
    const s = state.submission;
    if ((!s.evidence.trim() && !s.draft.trim()) || !s.feedback.trim()) { notice("Add project evidence or a draft and Grok feedback before requesting a cross-check."); return; }
    const previous = s.crosscheck || "";
    const text = `Project evidence:\n${s.evidence}\n\nRequirements and sources:\n${s.criteria}\n\nDraft:\n${s.draft}\n\nGrok feedback:\n${s.feedback}`;
    requestFeedback("crosscheck", text, (feedback) => {
      if (state.submission !== s) { notice("The submission was replaced before feedback arrived; feedback was not saved."); return false; }
      s.crosscheck = (s.crosscheck || "") === previous ? feedback : `${s.crosscheck}\n\n--- New Gemini cross-check ---\n${feedback}`;
      $("submission-crosscheck").value = s.crosscheck;
    }, [$("submission-crosscheck-button")], "gemini");
  });
  $("export").addEventListener("click", () => {
    tick("practice"); tick("mock");
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `fle-coach-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("import").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!validState(imported)) throw new Error("Invalid or unsupported backup format.");
      if (!confirm("Replace all current browser data with this backup? Export first if needed.")) return;
      pauseAll();
      const previous = state;
      state = imported;
      if (!save()) { state = previous; return; }
      currentAttempt = null; currentTopic = null; clocks.mock.session = 0;
      renderLearning(); renderAttempts(); renderAttempt(); renderTopics(); renderTopic(); renderMock(); renderSubmission(); renderProgress();
      notice("Backup imported.");
    } catch (error) { notice(`Import failed: ${error.message}`); }
    finally { event.target.value = ""; }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseAll(); });
  window.addEventListener("pagehide", pauseAll);
  setInterval(() => { tick("practice"); tick("mock"); renderClocks(); }, 1000);
  renderLearning(); renderAttempts(); renderAttempt(); renderTopics(); renderTopic(); renderMock(); renderSubmission(); renderProgress();
}
start();
