/* ── blocked.js ─────────────────────────────────────────────── */
"use strict";

const RTL_LOCALES = ["ar", "he", "fa", "ur"];

const QUOTES = [
  { text: "quote1", author: "quoteAuthor1" },
  { text: "quote2", author: "quoteAuthor2" },
  { text: "quote3", author: "quoteAuthor3" },
  { text: "quote4", author: "quoteAuthor4" },
  { text: "quote5", author: "quoteAuthor5" },
];

// ── i18n helper ───────────────────────────────────────────────
function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

// ── RTL ───────────────────────────────────────────────────────
function applyRTL() {
  const lang = chrome.i18n.getUILanguage().split("-")[0].toLowerCase();
  if (RTL_LOCALES.includes(lang)) {
    document.documentElement.setAttribute("dir", "rtl");
    document.body.setAttribute("dir", "rtl");
  }
}

// ── DOM refs ──────────────────────────────────────────────────
const extNameEl    = document.getElementById("extName");
const headingEl    = document.getElementById("heading");
const subheadingEl = document.getElementById("subheading");
const timerBlock   = document.getElementById("timerBlock");
const timerLabelEl = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");
const sessionOver  = document.getElementById("sessionOver");
const quoteTextEl  = document.getElementById("quoteText");
const quoteAuthEl  = document.getElementById("quoteAuthor");
const footerEl     = document.getElementById("footerTagline");

// ── Utilities ─────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Apply static i18n strings ─────────────────────────────────
function applyStaticText() {
  document.title        = t("blockedPageTitle");
  extNameEl.textContent    = t("extensionName");
  headingEl.textContent    = t("blockedHeading");
  subheadingEl.textContent = t("blockedSubheading");
  timerLabelEl.textContent = t("blockedTimeRemaining");
  sessionOver.textContent  = t("blockedSessionOver");
  footerEl.textContent     = t("footerTagline");
}

// ── Quote rotation ────────────────────────────────────────────
function loadQuote() {
  chrome.storage.local.get(["quoteIndex"], (result) => {
    const rawIndex   = Number(result.quoteIndex) || 0;
    const nextIndex  = rawIndex % QUOTES.length;
    const quote      = QUOTES[nextIndex];

    quoteTextEl.textContent = `"${t(quote.text)}"`;
    quoteAuthEl.textContent = t(quote.author);

    // Advance for next time blocked.html is opened
    chrome.storage.local.set({ quoteIndex: (nextIndex + 1) % QUOTES.length });
  });
}

// ── Timer display update ──────────────────────────────────────
function updateTimer(remainingSeconds, sessionActive) {
  if (!sessionActive || remainingSeconds <= 0) {
    // Session ended
    timerBlock.hidden   = true;
    sessionOver.hidden  = false;
    return;
  }

  timerBlock.hidden  = false;
  sessionOver.hidden = true;

  timerDisplay.textContent = formatTime(remainingSeconds);

  // Visual warning when under 2 minutes
  if (remainingSeconds <= 120) {
    timerDisplay.classList.add("ending");
  } else {
    timerDisplay.classList.remove("ending");
  }
}

// ── Poll storage for remaining time ──────────────────────────
// We poll every second since alarms fire from background;
// blocked.html is just a regular page — no service worker context.
function startPolling() {
  chrome.storage.local.get(
    ["sessionActive", "remainingSeconds"],
    (result) => {
      updateTimer(
        Number(result.remainingSeconds) || 0,
        !!result.sessionActive
      );
    }
  );
}

// Listen for TICK messages from the background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TICK") {
    updateTimer(message.remainingSeconds, true);
  }
  if (message.type === "SESSION_ENDED") {
    updateTimer(0, false);
  }
});

// Also poll on a 1-second interval as a fallback
// (messages may not arrive if the extension context is temporarily suspended)
setInterval(startPolling, 1000);

// ── Init ──────────────────────────────────────────────────────
(function init() {
  applyRTL();
  applyStaticText();
  loadQuote();
  startPolling(); // immediate first read
})();
