const LS_VOCAB = "vocabit_dictionary_v1";
const LS_STATS = "vocabit_stats_v1";
const WORD_INTERVAL_MS = 12000;

const DEFAULT_VOCAB = {
  "Sprache": "language",
  "Ehrgeiz": "ambition",
  "Wissen": "knowledge",
  "Übung": "practice",
  "Das Tor": "the gate",
  "Kommunikation": "communication"
};

const DEFAULT_STATS = {
  xp: 0,
  combo: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  lastCorrectDate: null,
  nextWordAt: 0
};

let currentGermanWord = null;
let answerLocked = false;
let nextWordTimer;

function $(id) {
  return document.getElementById(id);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return typeof structuredClone === "function" ? structuredClone(fallback) : JSON.parse(JSON.stringify(fallback));
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return typeof structuredClone === "function" ? structuredClone(fallback) : JSON.parse(JSON.stringify(fallback));
  }
}

function loadVocab() {
  const data = loadJson(LS_VOCAB, DEFAULT_VOCAB);
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    localStorage.setItem(LS_VOCAB, JSON.stringify(DEFAULT_VOCAB));
    return { ...DEFAULT_VOCAB };
  }
  return data;
}

function saveVocab(dict) {
  localStorage.setItem(LS_VOCAB, JSON.stringify(dict));
}

function loadStats() {
  const data = loadJson(LS_STATS, DEFAULT_STATS);
  return { ...DEFAULT_STATS, ...(data || {}) };
}

function saveStats(stats) {
  localStorage.setItem(LS_STATS, JSON.stringify(stats));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function norm(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pickRandomKey(dict) {
  const keys = Object.keys(dict);
  if (!keys.length) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

function ensureNextWord(stats) {
  const now = Date.now();
  if (!stats.nextWordAt || now >= stats.nextWordAt) {
    stats.nextWordAt = now + WORD_INTERVAL_MS;
    saveStats(stats);
  }
}

function updateProgressUI(stats) {
  const total = WORD_INTERVAL_MS;
  const now = Date.now();
  const remaining = Math.max(0, stats.nextWordAt - now);
  const passed = Math.min(total, total - remaining);
  const pct = Math.max(0, Math.min(100, Math.round((passed / total) * 100)));

  const nextWordIn = $("nextWordIn");
  const fill = $("progressFill");

  if (nextWordIn) {
    nextWordIn.textContent = remaining > 0
      ? `Nächstes Wort in ${Math.ceil(remaining / 1000)}s`
      : "Nächstes Wort bereit";
  }

  if (fill) {
    fill.style.width = `${pct}%`;
  }
}

function setResult(text, state = null) {
  const el = $("text");
  if (!el) return;
  el.classList.remove("result-ok", "result-bad");
  if (state === "ok") el.classList.add("result-ok");
  if (state === "bad") el.classList.add("result-bad");
  el.textContent = text;
}

function updateStatsUI(stats) {
  if ($("xpValue")) $("xpValue").textContent = String(stats.xp);
  if ($("comboValue")) $("comboValue").textContent = String(stats.combo);
  if ($("correctValue")) $("correctValue").textContent = String(stats.correct);
  if ($("wrongValue")) $("wrongValue").textContent = String(stats.wrong);
  if ($("streakChip")) $("streakChip").textContent = `🔥 ${stats.streak}`;
}

function newWord() {
  clearTimeout(nextWordTimer);
  answerLocked = false;
  const dict = loadVocab();
  const stats = loadStats();
  stats.nextWordAt = Date.now() + WORD_INTERVAL_MS;
  saveStats(stats);

  currentGermanWord = pickRandomKey(dict);
  const wordEl = $("word");

  if (wordEl) {
    wordEl.textContent = currentGermanWord ? dict[currentGermanWord] : "Keine Wörter";
  }

  const input = $("germanText");
  if (input) {
    input.value = "";
    input.focus();
  }

  setResult("Bereit");
  updateStatsUI(stats);
  updateProgressUI(stats);
}

function updateStreak(stats) {
  const t = todayStr();
  const last = stats.lastCorrectDate;

  if (last === null) {
    stats.streak = 1;
  } else {
    const diffDays = Math.round(
      (new Date(`${t}T00:00:00`) - new Date(`${last}T00:00:00`)) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) stats.streak += 1;
    else if (diffDays > 1) stats.streak = 1;
  }

  stats.lastCorrectDate = t;
}

function handleCorrect(stats) {
  stats.combo = Math.min(50, stats.combo + 1);
  const gain = 10 + Math.min(25, Math.floor(stats.combo / 3) * 5);
  stats.xp += gain;
  stats.correct += 1;
  updateStreak(stats);
  saveStats(stats);
  setResult(`Richtig! +${gain} XP`, "ok");
  updateStatsUI(stats);
}

function handleWrong(stats) {
  stats.wrong += 1;
  stats.combo = 0;
  saveStats(stats);
  setResult(`Falsch. Richtig wäre: ${currentGermanWord}`, "bad");
  updateStatsUI(stats);
}

function compareAnswer() {
  const dict = loadVocab();
  const stats = loadStats();

  if (!currentGermanWord || !dict[currentGermanWord]) {
    setResult("Keine Vokabeln vorhanden.", "bad");
    return;
  }

  const userAnswer = norm($("germanText")?.value);
  const correctAnswer = norm(currentGermanWord);

  if (answerLocked) return;
  if (userAnswer === correctAnswer) {
    answerLocked = true;
    handleCorrect(stats);
    stats.nextWordAt = Date.now() + WORD_INTERVAL_MS;
    saveStats(stats);
    nextWordTimer = window.setTimeout(newWord, 500);
  } else {
    handleWrong(stats);
  }
}

function showHint() {
  const dict = loadVocab();
  if (!currentGermanWord || !dict[currentGermanWord]) {
    setResult("Kein Tipp verfügbar.");
    return;
  }

  const firstLetter = currentGermanWord.charAt(0).toUpperCase();
  const length = currentGermanWord.length;
  setResult(`Tipp: beginnt mit "${firstLetter}" und hat ${length} Zeichen.`);
}

function renderList() {
  const list = $("vocabularyList");
  if (!list) return;

  const dict = loadVocab();
  const keys = Object.keys(dict).sort((a, b) => a.localeCompare(b, "de"));
  list.innerHTML = "";

  if (keys.length === 0) {
    list.innerHTML = `<li><span class="vocab-key">—</span><span class="vocab-val">Keine Wörter vorhanden</span></li>`;
    return;
  }

  for (const key of keys) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="vocab-key">${escapeHtml(key)}</span>
      <span class="vocab-val">${escapeHtml(dict[key])}</span>
    `;
    list.appendChild(li);
  }
}

function addVocabulary() {
  const deEl = $("germanText");
  const enEl = $("englishText");

  if (!deEl || !enEl) return;

  const de = deEl.value.trim();
  const en = enEl.value.trim();

  if (!de || !en) return;

  const dict = loadVocab();
  Object.defineProperty(dict, de, {value: en, enumerable: true, configurable: true, writable: true});
  saveVocab(dict);

  deEl.value = "";
  enEl.value = "";
  deEl.focus();

  renderList();
}

function openModal() {
  if ($("modalBackdrop")) $("modalBackdrop").hidden = false;
  if ($("settingsModal")) $("settingsModal").hidden = false;
}

function closeModal() {
  if ($("modalBackdrop")) $("modalBackdrop").hidden = true;
  if ($("settingsModal")) $("settingsModal").hidden = true;
}

function resetStats() {
  localStorage.setItem(LS_STATS, JSON.stringify(DEFAULT_STATS));
  closeModal();
  updateStatsUI(loadStats());
  updateProgressUI(loadStats());
  setResult("Stats zurückgesetzt.");
}

function resetVocab() {
  localStorage.setItem(LS_VOCAB, JSON.stringify(DEFAULT_VOCAB));
  closeModal();
  if ($("vocabularyList")) renderList();
  if ($("word")) newWord();
  setResult("Wörter zurückgesetzt.");
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("quizForm")) {
    loadVocab();
    ensureNextWord(loadStats());

    $("quizForm").addEventListener("submit", (e) => {
      e.preventDefault();
      compareAnswer();
    });

    if ($("skipBtn")) $("skipBtn").addEventListener("click", () => newWord());
    if ($("hintBtn")) $("hintBtn").addEventListener("click", showHint);
    if ($("bonusBtn")) $("bonusBtn").addEventListener("click", () => { window.location.href = "add.html"; });

    if ($("openSettings")) $("openSettings").addEventListener("click", openModal);
    if ($("closeSettings")) $("closeSettings").addEventListener("click", closeModal);
    if ($("closeSettings2")) $("closeSettings2").addEventListener("click", closeModal);
    if ($("modalBackdrop")) $("modalBackdrop").addEventListener("click", closeModal);
    if ($("resetStatsBtn")) $("resetStatsBtn").addEventListener("click", resetStats);
    if ($("resetVocabBtn")) $("resetVocabBtn").addEventListener("click", resetVocab);

    newWord();
    window.setInterval(() => {
      const current = loadStats();
      if (current.nextWordAt && current.nextWordAt <= Date.now() && !answerLocked) newWord();
      else updateProgressUI(current);
    }, 250);
  }

  if ($("addForm")) {
    loadVocab();
    renderList();
    $("addForm").addEventListener("submit", (e) => {
      e.preventDefault();
      addVocabulary();
    });
    if ($("refreshBtn")) $("refreshBtn").addEventListener("click", renderList);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service Worker konnte nicht registriert werden:", error);
    });
  });
}
