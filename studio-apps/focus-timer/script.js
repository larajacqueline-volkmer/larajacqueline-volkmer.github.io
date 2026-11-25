const CONFIG = {
  appTitle: "Flow Focus Timer by LJV",
  defaultMinutes: 25,
  minMinutes: 1,
  maxMinutes: 180,
  presetMinutes: [25, 15, 10, 5],
  soundEnabledByDefault: true,
  glowStrongByDefault: true,
  completionAlertText: "Die Zeit ist abgelaufen!",
  storageKey: "flowFocusTimerLJVState"
};

const fallbackState = {
  selectedMinutes: CONFIG.defaultMinutes,
  sessionsCompleted: 0,
  soundEnabled: CONFIG.soundEnabledByDefault,
  glowStrong: CONFIG.glowStrongByDefault
};

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return { ...fallbackState };
    const parsed = JSON.parse(raw);
    return {
      selectedMinutes: clampMinutes(parsed.selectedMinutes),
      sessionsCompleted: Number.isFinite(parsed.sessionsCompleted) ? Math.max(0, parsed.sessionsCompleted) : fallbackState.sessionsCompleted,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : fallbackState.soundEnabled,
      glowStrong: typeof parsed.glowStrong === "boolean" ? parsed.glowStrong : fallbackState.glowStrong
    };
  } catch {
    return { ...fallbackState };
  }
}

function saveState() {
  const state = {
    selectedMinutes: Math.round(totalTime / 60),
    sessionsCompleted,
    soundEnabled,
    glowStrong
  };
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

function clampMinutes(value) {
  const numericValue = Number(value);
  const validValue = Number.isFinite(numericValue) ? Math.round(numericValue) : CONFIG.defaultMinutes;
  return Math.max(CONFIG.minMinutes, Math.min(CONFIG.maxMinutes, validValue));
}

const storedState = loadState();
let totalTime = storedState.selectedMinutes * 60;
let timeLeft = totalTime;
let timerId = null;
let targetTime = null;
let soundEnabled = storedState.soundEnabled;
let glowStrong = storedState.glowStrong;
let sessionsCompleted = storedState.sessionsCompleted;

const timeDisplay = document.getElementById("time");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const soundBtn = document.getElementById("soundBtn");
const glowBtn = document.getElementById("glowBtn");
const applyCustomBtn = document.getElementById("applyCustomBtn");
const customMinutesInput = document.getElementById("customMinutes");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");
const sessionsLabel = document.getElementById("sessionsLabel");
const presetGrid = document.getElementById("presetGrid");
const appNameLabel = document.getElementById("appNameLabel");
const modeLabel = document.getElementById("modeLabel");

if (!timeDisplay || !startBtn || !pauseBtn || !resetBtn || !soundBtn || !glowBtn || !applyCustomBtn || !customMinutesInput || !statusText || !progressBar || !sessionsLabel || !presetGrid || !appNameLabel || !modeLabel) {
  throw new Error("Ein benötigtes DOM-Element fehlt. Bitte index.html prüfen.");
}

document.title = CONFIG.appTitle;
appNameLabel.textContent = CONFIG.appTitle;
customMinutesInput.min = String(CONFIG.minMinutes);
customMinutesInput.max = String(CONFIG.maxMinutes);
customMinutesInput.value = String(storedState.selectedMinutes);
document.body.classList.toggle("low-glow", !glowStrong);

function buildPresetButtons() {
  presetGrid.innerHTML = "";
  CONFIG.presetMinutes.forEach(minutes => {
    const btn = document.createElement("button");
    btn.className = "preset";
    btn.dataset.minutes = String(minutes);
    btn.textContent = `${minutes} Min`;
    btn.type = "button";
    btn.addEventListener("click", () => setMinutes(minutes, btn));
    presetGrid.appendChild(btn);
  });
}

function getPresetButtons() {
  return document.querySelectorAll(".preset");
}

function updateSessionLabel() {
  sessionsLabel.textContent = `Sitzungen: ${sessionsCompleted}`;
}

function updateModeLabel() {
  modeLabel.textContent = glowStrong ? "Stark Glow" : "Soft Glow";
}

function updateToggleTexts() {
  soundBtn.textContent = `Sound: ${soundEnabled ? "An" : "Aus"}`;
  glowBtn.textContent = `Glow: ${glowStrong ? "Stark" : "Soft"}`;
  soundBtn.setAttribute("aria-pressed", String(soundEnabled));
  glowBtn.setAttribute("aria-pressed", String(glowStrong));
}

function updateButtons() {
  const isRunning = timerId !== null;
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
}

function updateDisplay() {
  const safeTimeLeft = Math.max(0, timeLeft);
  const minutes = Math.floor(safeTimeLeft / 60);
  const seconds = safeTimeLeft % 60;
  const displayString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  timeDisplay.textContent = displayString;
  document.title = `${displayString} - ${CONFIG.appTitle}`;

  const progress = totalTime > 0 ? ((totalTime - safeTimeLeft) / totalTime) * 100 : 0;
  progressBar.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
}

function setStatus(text) {
  statusText.textContent = text;
}

function beep() {
  if (!soundEnabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const audioCtx = new AudioCtx();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.05;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioCtx.close();
  }, 220);
}

function stopRunningTimer() {
  clearInterval(timerId);
  timerId = null;
  targetTime = null;
  updateButtons();
}

function finishTimer() {
  stopRunningTimer();
  timeLeft = 0;
  updateDisplay();
  sessionsCompleted += 1;
  updateSessionLabel();
  saveState();
  beep();
  setStatus("Fertig");
  setTimeout(() => {
    alert(CONFIG.completionAlertText);
  }, 100);
}

function tickTimer() {
  if (!targetTime) return;
  const remainingSeconds = Math.ceil((targetTime - Date.now()) / 1000);
  timeLeft = Math.max(0, remainingSeconds);
  updateDisplay();

  if (remainingSeconds <= 0) {
    finishTimer();
  }
}

function startTimer() {
  if (timerId !== null) return;
  if (timeLeft <= 0) {
    timeLeft = totalTime;
  }

  targetTime = Date.now() + timeLeft * 1000;
  setStatus("Läuft");
  timerId = window.setInterval(tickTimer, 250);
  updateButtons();
  updateDisplay();
}

function pauseTimer() {
  if (timerId === null) return;
  tickTimer();
  if (timerId === null) return;
  stopRunningTimer();
  setStatus("Pausiert");
}

function resetTimer() {
  stopRunningTimer();
  timeLeft = totalTime;
  updateDisplay();
  setStatus("Zurückgesetzt");
}

function setMinutes(minutes, activeButton = null) {
  const safeMinutes = clampMinutes(minutes);
  totalTime = safeMinutes * 60;
  timeLeft = totalTime;
  stopRunningTimer();
  customMinutesInput.value = String(safeMinutes);

  getPresetButtons().forEach(btn => {
    btn.classList.toggle("active", btn === activeButton || btn.dataset.minutes === String(safeMinutes));
  });

  updateDisplay();
  setStatus(`${safeMinutes} Minuten eingestellt`);
  saveState();
}

applyCustomBtn.addEventListener("click", () => setMinutes(customMinutesInput.value));
customMinutesInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    setMinutes(customMinutesInput.value);
  }
});
customMinutesInput.addEventListener("blur", () => {
  customMinutesInput.value = String(clampMinutes(customMinutesInput.value));
});

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateToggleTexts();
  saveState();
  setStatus(soundEnabled ? "Sound aktiviert" : "Sound deaktiviert");
});

glowBtn.addEventListener("click", () => {
  glowStrong = !glowStrong;
  document.body.classList.toggle("low-glow", !glowStrong);
  updateToggleTexts();
  updateModeLabel();
  saveState();
  setStatus(glowStrong ? "Glow stark" : "Glow soft");
});

document.addEventListener("keydown", event => {
  const targetTag = event.target instanceof HTMLElement ? event.target.tagName : "";
  const isTyping = targetTag === "INPUT" || targetTag === "TEXTAREA";
  if (event.code === "Space" && !isTyping) {
    event.preventDefault();
    if (timerId === null) startTimer();
    else pauseTimer();
  }
  if (event.key.toLowerCase() === "r" && !isTyping) {
    resetTimer();
  }
});

window.addEventListener("beforeunload", () => {
  saveState();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("Service Worker konnte nicht registriert werden:", error);
    });
  });
}

buildPresetButtons();
updateSessionLabel();
updateToggleTexts();
updateModeLabel();
setMinutes(storedState.selectedMinutes, null);
setStatus("Bereit");
updateButtons();
