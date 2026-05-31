# Focus Mode

> Block distracting websites and stay focused with a countdown timer.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-brightgreen)

---

## Overview

**Focus Mode** is a Chrome extension built for Manifest V3 that helps you reclaim
your attention. Add the websites that distract you — social media, news, forums —
and start a timed focus session. While the timer is running, those sites are
blocked via Chrome's built-in `declarativeNetRequest` API, so the blocking is
efficient and doesn't require any read access to page content.

When you try to visit a blocked site, you are shown a beautiful, motivational
blocked page with a countdown timer, a rotating inspirational quote, and
encouragement to stay on task.

---

## Features

- **Domain-based blocking** — Add any domain (e.g. `twitter.com`). Protocol,
  `www` prefix, and paths are automatically stripped.
- **Custom or presets timer** — Choose from common focus durations (5–120 min)
  or enter a custom number of minutes.
- **declarativeNetRequest blocking** — Uses Chrome's built-in content-blocking
  engine. No page content is ever read or modified.
- **Fullscreen blocked page** — A dark, premium-looking page with live countdown,
  motivational quotes, and a pulsing lock icon.
- **Quotes rotation** — 5 hand-picked quotes cycle each time you hit a blocked
  site.
- **RTL support** — Arabic, Hebrew, Persian, and Urdu are automatically detected
  and rendered right-to-left.
- **i18n ready** — Translated into 55 locales. The extension displays all UI
  text in the user's browser language.
- **Privacy-first** — Zero data collection, zero network requests, zero
  third-party services. Everything runs locally.

---

## Privacy

Focus Mode **does not collect, transmit, or share any data**.

- All data (blocked domains list, session state, preferences) is stored locally
  in `chrome.storage.local`.
- The extension makes **zero network requests**. There is no analytics, no
  telemetry, no phone-home mechanism.
- No third-party services, CDNs, or external fonts are used.
- Full privacy policy: [`privacy.html`](privacy.html)

---

## Permissions

| Permission | Justification |
|---|---|
| `storage` | Saves your blocked-domains list and preferences locally. |
| `alarms` | Drives the countdown timer in the background service worker. |
| `declarativeNetRequest` | Redirects blocked domains to the blocked page — no page data is read. |
| `declarativeNetRequestWithHostAccess` | Required to apply DNR rules to `<all_urls>`. |
| `<all_urls>` host permission | Allows the extension to redirect any domain you add to your block list. |

---

## Getting Started

### Installation (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `focus-mode-extension` folder

### Usage

1. Open the extension popup by clicking the icon in the toolbar.
2. Type a domain (e.g. `reddit.com`) and click **Add**.
3. Choose a duration from the dropdown, or select **Custom** to type a value.
4. Click **Start Focus**. While the session is active, the sites you added will
   redirect to the blocked page.
5. Click **Stop Session** or wait for the timer to end.

---

## Project Structure

```
focus-mode-extension/
├── _locales/
│   ├── en/
│   │   └── messages.json          # English source strings
│   ├── fr/
│   ├── de/
│   ├── ja/
│   ├── zh_CN/
│   ├── ...                        # 55 locales total
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background.js                  # Service worker: alarms, DNR rules, session lifecycle
├── blocked.css                    # Blocked-page styles (dark theme, animations)
├── blocked.html                   # Blocked-page shell
├── blocked.js                     # Blocked-page logic: timer polling, quotes, RTL
├── manifest.json                  # Chrome MV3 manifest
├── popup.css                      # Popup styles (dark theme, variables, RTL)
├── popup.html                     # Extension popup shell
├── popup.js                       # Popup logic: domain management, countdown, messaging
├── privacy.html                   # Privacy policy
└── README.md                      # This file
```

---

## i18n / Locales

Focus Mode is translated into **55 locales** covering the world's most spoken
languages:

`ar`, `am`, `bg`, `bn`, `ca`, `cs`, `da`, `de`, `el`, `en`, `en_GB`, `en_US`,
`es`, `es_419`, `et`, `fa`, `fi`, `fil`, `fr`, `gu`, `he`, `hi`, `hr`, `hu`,
`id`, `it`, `ja`, `kn`, `ko`, `lt`, `lv`, `ml`, `mr`, `ms`, `nl`, `no`, `pl`,
`pt_BR`, `pt_PT`, `ro`, `ru`, `sk`, `sl`, `sr`, `sv`, `sw`, `ta`, `te`, `th`,
`tl`, `tr`, `uk`, `vi`, `zh_CN`, `zh_TW`

### Adding or improving translations

Edit the corresponding `_locales/{code}/messages.json` file. The `description`
field in each entry provides context for translators.

---

## Chrome Web Store Description

> **Short description** (132 characters):
> Block distracting websites and stay focused with a countdown timer. Privacy-first, zero data collection.
>
> **Detailed description:**
>
> Focus Mode helps you stay productive by temporarily blocking the websites that distract you most. Add the domains you want to avoid, set a timer (preset or custom), and start a focus session. While the timer runs, any attempt to visit a blocked site is redirected to a beautiful, motivational blocked page that shows your remaining time and an inspiring quote.
>
> **Key features:**
> • Block any website by domain — protocol, www, and paths are handled automatically
> • Choose from preset durations (5–120 minutes) or set a custom time
> • Uses Chrome's declarativeNetRequest API for efficient, privacy-safe blocking
> • Full-screen blocked page with live countdown and rotating motivational quotes
> • Right-to-left (RTL) support for Arabic, Hebrew, Persian, and Urdu
> • Translated into 55 languages
> • 100% privacy-first — no data collection, no network requests, no third-party services
> • Open source
>
> **Permissions explained:**
> Focus Mode requests only the permissions it needs: storage (to save your preferences), alarms (to run the timer), and declarativeNetRequest (to block sites). The extension never reads your browsing history, never modifies page content, and never sends data anywhere.

---

## License

MIT
