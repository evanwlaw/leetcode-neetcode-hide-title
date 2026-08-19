const DEFAULTS = {
  hideTitle: true,
  hideDifficulty: true,
  hideTopics: true,
  hideAcceptance: true,
};
const IDS = Object.keys(DEFAULTS);

chrome.storage.sync.get(DEFAULTS, (stored) => {
  IDS.forEach((id) => {
    document.getElementById(id).checked = !!stored[id];
  });
});

IDS.forEach((id) => {
  document.getElementById(id).addEventListener('change', (e) => {
    chrome.storage.sync.set({ [id]: e.target.checked });
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const statusEl = document.getElementById('siteStatus');
  if (!tab || !tab.url) {
    statusEl.textContent = '';
    return;
  }
  try {
    const host = new URL(tab.url).hostname.replace(/^www\./, '');
    if (host.endsWith('leetcode.com')) statusEl.textContent = 'Active on LeetCode';
    else if (host.endsWith('neetcode.io')) statusEl.textContent = 'Active on NeetCode';
    else statusEl.textContent = 'Not active on this site';
  } catch {
    statusEl.textContent = '';
  }
});
