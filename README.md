# Hide LeetCode & NeetCode Spoilers

A browser extension that blurs the problem title, difficulty, topics, and
acceptance rate on [leetcode.com](https://leetcode.com) and
[neetcode.io](https://neetcode.io) so you can practice without spoiling the
problem for yourself. Each item is individually toggleable from the popup.
A blurred item reveals on hover, or stays revealed if you click it.

Works in Brave (and any Chromium browser) as an unpacked Manifest V3
extension — no Chrome Web Store listing needed.

## Install (Brave or Chrome)

1. Open `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Open a LeetCode or NeetCode problem — the title/difficulty/topics/
   acceptance rate should be blurred. Click the extension icon in the
   toolbar to toggle each one independently.

## How it works

LeetCode and NeetCode are both React single-page apps that rewrite their DOM
frequently and use auto-generated CSS class names that change across
deploys, so this extension avoids relying on those. Instead it finds
elements structurally:

- **Title**: matches the `N. Problem Name` text pattern (LeetCode) or the
  page's main heading next to a difficulty badge (NeetCode).
- **Difficulty**: matches elements whose text is exactly `Easy`, `Medium`,
  or `Hard`.
- **Topics**: matches LeetCode's `/tag/...` links, or the pills under a
  "Topics" heading on NeetCode.
- **Acceptance rate**: matches elements containing "Acceptance Rate" text
  or an adjacent percentage.

A `MutationObserver` plus URL-change polling keeps things blurred as you
navigate between problems without a full page reload.

## Notes / limitations

- If either site ships a redesign that changes this structure, a given
  category may stop being detected. The heuristics in `content.js` are
  intentionally structural (text/href based) rather than tied to exact
  class names, to stay resilient — but no approach is future-proof against
  every redesign.
- Settings sync via `chrome.storage.sync`, so they carry over between
  devices signed into the same browser profile.
