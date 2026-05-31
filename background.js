/* ── background.js (Service Worker) ────────────────────────── */
"use strict";

const ALARM_NAME      = "focusTick";
const TICK_PERIOD_MIN = 1 / 60; // fire every ~1 second (minimum Chrome allows ≈ 1 s in MV3)

// ── Storage helpers ───────────────────────────────────────────
function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setStorage(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

// ── declarativeNetRequest rule management ─────────────────────

/**
 * Build DNR redirect rules for an array of domain strings.
 * Each domain gets its own rule: id = index + 1.
 * Redirects both http and https, with and without www.
 */
function buildRules(domains) {
  const rules = [];
  let id = 1;

  domains.forEach((domain) => {
    // Patterns: exact domain and www subdomain, http + https
    const urlPatterns = [
      `*://${domain}/*`,
      `*://www.${domain}/*`,
    ];

    urlPatterns.forEach((urlFilter) => {
      rules.push({
        id,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            extensionPath: "/blocked.html",
          },
        },
        condition: {
          urlFilter,
          resourceTypes: [
            "main_frame",
            "sub_frame",
          ],
        },
      });
      id++;
    });
  });

  return rules;
}

/**
 * Apply DNR rules for given domains (remove all existing dynamic rules first).
 */
async function applyBlockRules(domains) {
  // Get existing dynamic rule IDs
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);

  const newRules = buildRules(domains);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules,
  });
}

/**
 * Remove all dynamic DNR rules.
 */
async function clearBlockRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id);
  if (existingIds.length === 0) return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: [],
  });
}

// ── Session management ────────────────────────────────────────

async function startSession(minutes) {
  const totalSeconds = minutes * 60;

  await setStorage({
    sessionActive:    true,
    remainingSeconds: totalSeconds,
    sessionEndTime:   Date.now() + totalSeconds * 1000,
    selectedMinutes:  minutes,
  });

  // Retrieve domains and apply block rules
  const { domains = [] } = await getStorage(["domains"]);
  await applyBlockRules(domains);

  // Clear any existing alarm, then create a new repeating one
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes:  TICK_PERIOD_MIN,
    periodInMinutes: TICK_PERIOD_MIN,
  });
}

async function stopSession() {
  await chrome.alarms.clear(ALARM_NAME);
  await clearBlockRules();

  await setStorage({
    sessionActive:    false,
    remainingSeconds: 0,
    sessionEndTime:   0,
  });

  // Notify popup (if open)
  broadcastMessage({ type: "SESSION_ENDED" });
}

// ── Alarm handler ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const { sessionActive, sessionEndTime } = await getStorage([
    "sessionActive",
    "sessionEndTime",
  ]);

  if (!sessionActive) {
    await chrome.alarms.clear(ALARM_NAME);
    return;
  }

  const remaining = Math.max(
    0,
    Math.round((sessionEndTime - Date.now()) / 1000)
  );

  await setStorage({ remainingSeconds: remaining });

  if (remaining <= 0) {
    await stopSession();
    return;
  }

  broadcastMessage({ type: "TICK", remainingSeconds: remaining });
});

// ── Message handler ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "START_SESSION") {
      await startSession(message.minutes);
      sendResponse({ ok: true });
    } else if (message.type === "STOP_SESSION") {
      await stopSession();
      sendResponse({ ok: true });
    } else if (message.type === "GET_STATE") {
      const data = await getStorage([
        "sessionActive",
        "remainingSeconds",
        "domains",
        "selectedMinutes",
      ]);
      sendResponse(data);
    }
  })();

  // Return true to indicate async response
  return true;
});

// ── Broadcast helper ──────────────────────────────────────────
function broadcastMessage(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Popup is not open — ignore the error
  });
}

// ── On install / startup: reconcile state ─────────────────────
async function reconcileOnStartup() {
  const { sessionActive, sessionEndTime, domains = [] } =
    await getStorage(["sessionActive", "sessionEndTime", "domains"]);

  if (!sessionActive) {
    await clearBlockRules();
    return;
  }

  const remaining = Math.round((sessionEndTime - Date.now()) / 1000);

  if (remaining <= 0) {
    await stopSession();
    return;
  }

  // Session still valid — re-apply block rules and re-arm alarm
  await applyBlockRules(domains);
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes:  TICK_PERIOD_MIN,
    periodInMinutes: TICK_PERIOD_MIN,
  });
}

chrome.runtime.onInstalled.addListener(reconcileOnStartup);
chrome.runtime.onStartup.addListener(reconcileOnStartup);
