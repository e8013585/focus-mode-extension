/* ── popup.js ──────────────────────────────────────────────── */
"use strict";

// ── Constants ─────────────────────────────────────────────────
const DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
const RTL_LOCALES = ["ar", "he", "fa", "ur"];

// ── i18n helper ───────────────────────────────────────────────
function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

// ── RTL detection ─────────────────────────────────────────────
function applyRTL() {
  const lang = chrome.i18n.getUILanguage().split("-")[0].toLowerCase();
  if (RTL_LOCALES.includes(lang)) {
    document.documentElement.setAttribute("dir", "rtl");
    document.body.setAttribute("dir", "rtl");
  }
}

// ── DOM refs ──────────────────────────────────────────────────
const appNameEl        = document.getElementById("appName");
const statusBadge      = document.getElementById("statusBadge");
const countdownSection = document.getElementById("countdownSection");
const countdownLabel   = document.getElementById("countdownLabel");
const countdownDisplay = document.getElementById("countdownDisplay");
const domainInput      = document.getElementById("domainInput");
const addBtn           = document.getElementById("addBtn");
const errorMsg         = document.getElementById("errorMsg");
const domainList       = document.getElementById("domainList");
const emptyState       = document.getElementById("emptyState");
const blockedHeading   = document.getElementById("blockedSitesHeading");
const durationLabel    = document.getElementById("durationLabel");
const durationSelect   = document.getElementById("durationSelect");
const customMinutesRow = document.getElementById("customMinutesRow");
const customMinutesInput = document.getElementById("customMinutesInput");
const toggleBtn        = document.getElementById("toggleBtn");

// ── State ─────────────────────────────────────────────────────
let state = {
  domains:          [],
  sessionActive:    false,
  remainingSeconds: 0,
  selectedMinutes:  25,
  customMinutes:    null,
};

// ── Utilities ─────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Sanitize and validate a domain string.
 * Strips protocol, www prefix, trailing slashes and paths.
 * Returns lowercase domain string or null if invalid.
 */
function sanitizeDomain(raw) {
  let val = raw.trim().toLowerCase();

  // Strip protocol
  val = val.replace(/^https?:\/\//i, "");
  // Strip www.
  val = val.replace(/^www\./i, "");
  // Strip path/query/hash
  val = val.split("/")[0].split("?")[0].split("#")[0];
  // Strip port
  val = val.split(":")[0];

  // Validate: must contain at least one dot, no spaces,
  // only valid hostname characters
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(val)) return null;
  return val;
}

function showError(msgKey) {
  errorMsg.textContent = t(msgKey);
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.textContent = "";
  errorMsg.hidden = true;
}

// ── Static text (i18n) ────────────────────────────────────────
function applyStaticText() {
  document.title             = t("extensionName");
  appNameEl.textContent      = t("extensionName");
  addBtn.textContent         = t("addButton");
  blockedHeading.textContent = t("blockedSitesHeading");
  durationLabel.textContent  = t("durationLabel");
  countdownLabel.textContent = t("countdownLabel");
  emptyState.textContent     = t("noSitesAdded");
  domainInput.setAttribute("placeholder", t("addDomainPlaceholder"));
}

// ── Duration dropdown ─────────────────────────────────────────
function buildDurationOptions() {
  DURATIONS.forEach((min) => {
    const opt = document.createElement("option");
    opt.value = String(min);
    opt.textContent = chrome.i18n.getMessage("durationMinutes", [String(min)]);
    durationSelect.appendChild(opt);
  });
  // Custom option
  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = chrome.i18n.getMessage("customMinutes") || "Custom";
  durationSelect.appendChild(customOpt);
}

// ── Render domain list ────────────────────────────────────────
function renderDomainList() {
  // Clear existing items safely
  while (domainList.firstChild) {
    domainList.removeChild(domainList.firstChild);
  }

  if (state.domains.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  state.domains.forEach((domain) => {
    const li = document.createElement("li");
    li.className = "domain-item";

    const span = document.createElement("span");
    span.className = "domain-item-text";
    span.textContent = domain;

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.setAttribute("aria-label", `${t("removeButton")} ${domain}`);
    btn.textContent = "✕";
    btn.disabled = state.sessionActive;
    btn.addEventListener("click", () => handleRemoveDomain(domain));

    li.appendChild(span);
    li.appendChild(btn);
    domainList.appendChild(li);
  });
}

// ── Update UI state ───────────────────────────────────────────
function updateUI() {
  const active = state.sessionActive;

  // Status badge
  statusBadge.textContent = active ? t("statusActive") : t("statusInactive");
  statusBadge.className   = active
    ? "status-badge active"
    : "status-badge";

  // Countdown section
  countdownSection.hidden = !active;
  if (active) {
    countdownDisplay.textContent = formatTime(state.remainingSeconds);
  }

  // Toggle button
  toggleBtn.textContent = active ? t("stopButton") : t("startButton");
  toggleBtn.className   = active
    ? "btn btn-primary danger"
    : "btn btn-primary";

  // Disable inputs during session
  domainInput.disabled    = active;
  addBtn.disabled         = active;
  durationSelect.disabled = active;
  customMinutesInput.disabled = active;

  renderDomainList();
}

// ── Load state from storage ───────────────────────────────────
function loadState(callback) {
  chrome.storage.local.get(
    ["domains", "sessionActive", "remainingSeconds", "selectedMinutes", "customMinutes"],
    (result) => {
      state.domains          = Array.isArray(result.domains)
        ? result.domains : [];
      state.sessionActive    = !!result.sessionActive;
      state.remainingSeconds = Number(result.remainingSeconds) || 0;
      state.selectedMinutes  = Number(result.selectedMinutes)  || 25;
      state.customMinutes    = result.customMinutes != null ? Number(result.customMinutes) : null;
      if (callback) callback();
    }
  );
}

// ── Save domains + selectedMinutes to storage ─────────────────
function persistPreferences() {
  chrome.storage.local.set({
    domains:         state.domains,
    selectedMinutes: state.selectedMinutes,
    customMinutes:   state.customMinutes,
  });
}

// ── Handle Add domain ─────────────────────────────────────────
function handleAddDomain() {
  clearError();
  const cleaned = sanitizeDomain(domainInput.value);

  if (!cleaned) {
    showError("errorInvalidDomain");
    return;
  }

  if (state.domains.includes(cleaned)) {
    showError("errorDuplicate");
    return;
  }

  state.domains.push(cleaned);
  domainInput.value = "";
  persistPreferences();
  renderDomainList();
}

// ── Handle Remove domain ──────────────────────────────────────
function handleRemoveDomain(domain) {
  state.domains = state.domains.filter((d) => d !== domain);
  persistPreferences();
  renderDomainList();
}

// ── Handle Start/Stop toggle ──────────────────────────────────
function handleToggle() {
  if (state.sessionActive) {
    // Stop session
    chrome.runtime.sendMessage({ type: "STOP_SESSION" }, () => {
      loadState(updateUI);
    });
  } else {
    // Validate
    if (state.domains.length === 0) {
      showError("errorNoDomains");
      return;
    }
    clearError();

    let minutes;
    if (durationSelect.value === "custom") {
      minutes = parseInt(customMinutesInput.value, 10);
      if (!minutes || minutes < 1) {
        showError("errorInvalidMinutes");
        return;
      }
      state.customMinutes = minutes;
    } else {
      minutes = parseInt(durationSelect.value, 10);
      state.selectedMinutes = minutes;
    }

    chrome.runtime.sendMessage(
      { type: "START_SESSION", minutes },
      () => {
        loadState(updateUI);
      }
    );
  }
}

// ── Listen for timer ticks from background ────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TICK") {
    state.remainingSeconds = message.remainingSeconds;
    if (state.remainingSeconds <= 0) {
      state.sessionActive = false;
    }
    updateUI();
  }
  if (message.type === "SESSION_ENDED") {
    loadState(updateUI);
  }
});

// ── Event listeners ───────────────────────────────────────────
addBtn.addEventListener("click", handleAddDomain);

domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAddDomain();
});

function onDurationChange() {
  clearError();
  const isCustom = durationSelect.value === "custom";
  customMinutesRow.hidden = !isCustom;
  if (isCustom) {
    if (state.customMinutes) customMinutesInput.value = state.customMinutes;
  } else {
    state.selectedMinutes = parseInt(durationSelect.value, 10);
    persistPreferences();
  }
}

durationSelect.addEventListener("change", onDurationChange);

customMinutesInput.addEventListener("input", () => {
  const val = parseInt(customMinutesInput.value, 10);
  if (val && val > 0) {
    state.customMinutes = val;
    persistPreferences();
  }
});

toggleBtn.addEventListener("click", handleToggle);

// ── Init ──────────────────────────────────────────────────────
(function init() {
  applyRTL();
  applyStaticText();
  buildDurationOptions();
  loadState(() => {
    const isCustom = state.customMinutes != null && !DURATIONS.includes(state.selectedMinutes);
    if (isCustom) {
      durationSelect.value = "custom";
      customMinutesInput.value = state.customMinutes;
      customMinutesRow.hidden = false;
    } else {
      durationSelect.value = String(state.selectedMinutes);
    }
    updateUI();
  });
})();
