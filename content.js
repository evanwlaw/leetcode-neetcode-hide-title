(() => {
  const HOST = location.hostname.replace(/^www\./, '');
  const isLeetCode = HOST.endsWith('leetcode.com');
  const isNeetCode = HOST.endsWith('neetcode.io');
  if (!isLeetCode && !isNeetCode) return;

  const DEFAULTS = {
    hideTitle: true,
    hideDifficulty: true,
    hideTopics: true,
    hideAcceptance: true,
  };

  let settings = { ...DEFAULTS };

  const HIDDEN_CLASS = 'lnht-blur';
  const REMOVED_CLASS = 'lnht-hide';

  // The "solved" marker is fully removed rather than blurred: a blurred item
  // still implies "you've done this before," which is itself a spoiler.
  const HARD_HIDE_CATEGORIES = new Set(['solved']);

  function tagHidden(el, category) {
    if (!el || el.nodeType !== 1) return;
    if (HARD_HIDE_CATEGORIES.has(category)) {
      el.classList.add(REMOVED_CLASS);
      el.classList.remove(HIDDEN_CLASS, 'lnht-revealed');
      el.setAttribute('data-lnht', category);
      return;
    }
    el.classList.add(HIDDEN_CLASS);
    el.classList.remove(REMOVED_CLASS);
    el.setAttribute('data-lnht', category);
    if (!el.dataset.lnhtBound) {
      el.dataset.lnhtBound = '1';
      el.addEventListener('click', onRevealClick, true);
    }
  }

  function untag(el) {
    el.classList.remove(HIDDEN_CLASS, REMOVED_CLASS, 'lnht-revealed');
    el.removeAttribute('data-lnht');
  }

  function onRevealClick(e) {
    const el = e.currentTarget;
    if (el.classList.contains(HIDDEN_CLASS) && !el.classList.contains('lnht-revealed')) {
      // First click just reveals instead of following a link / triggering a nav.
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('lnht-revealed');
    }
  }

  function isLeaf(el) {
    return el.children.length === 0;
  }

  function textIsExact(el, values) {
    return isLeaf(el) && values.includes(el.textContent.trim());
  }

  // Never touch code/editor regions (syntax-highlighted example code is often
  // rendered as many small leaf spans, which can otherwise false-match the
  // text-based heuristics below). Deliberately specific known editor-widget
  // selectors rather than a generic `[class*="editor"]` substring match -
  // that was too broad and matched the whole split-pane layout wrapper
  // (which incidentally has "editor" in its class name), silently excluding
  // the Solved badge and Accepted/Acceptance Rate stats from every match.
  function isInCodeArea(el) {
    return !!el.closest(
      'pre, code, textarea, [contenteditable="true"], .monaco-editor, .view-lines, .CodeMirror, .cm-editor, .cm-content, [data-mode-id]'
    );
  }

  // ---------- Finders ----------
  // Selectors below are keyed off real markup pulled from live pages, per site.

  function findTitle() {
    if (isLeetCode) {
      const link = document.querySelector('[class*="text-title-large" i] a[href^="/problems/"]');
      if (link) return [link];
    }
    if (isNeetCode) {
      const h1 = document.querySelector('h1.problem-title');
      if (h1) return [h1];
    }
    return [];
  }

  // "Solved" indicator: LeetCode shows a "Solved" text label plus a green
  // checkmark icon in one element (its own text is "Solved"; the icon is a
  // child <svg> that contributes no text). NeetCode shows just the icon.
  function findSolvedMarker() {
    if (isLeetCode) {
      return Array.from(document.querySelectorAll('div, span')).filter(
        (e) => !isInCodeArea(e) && e.textContent.trim() === 'Solved'
      );
    }
    if (isNeetCode) {
      const icon = document.querySelector('fa-icon.solved-badge-icon');
      return icon ? [icon] : [];
    }
    return [];
  }

  function findDifficulty() {
    if (isLeetCode) {
      const els = Array.from(
        document.querySelectorAll(
          '[class*="text-difficulty-easy" i], [class*="text-difficulty-medium" i], [class*="text-difficulty-hard" i]'
        )
      );
      if (els.length) return els;
    }
    if (isNeetCode) {
      const els = Array.from(document.querySelectorAll('span.difficulty-pill'));
      if (els.length) return els;
    }
    // Fallback for either site if the class names above ever change.
    return Array.from(document.querySelectorAll('div, span, a, button')).filter(
      (e) => !isInCodeArea(e) && textIsExact(e, ['Easy', 'Medium', 'Hard'])
    );
  }

  // LeetCode's "Topics" and "Companies" pills are just toggles - their own
  // text includes an icon child (so a plain leaf-text match misses them),
  // and they're siblings of the difficulty pill in one row. Scoping to that
  // row's direct children avoids matching an unrelated "Topics" link
  // elsewhere on the page (e.g. site nav).
  function findLcMetaPills() {
    const difficultyEl = document.querySelector(
      '[class*="text-difficulty-easy" i], [class*="text-difficulty-medium" i], [class*="text-difficulty-hard" i]'
    );
    const row = difficultyEl && difficultyEl.parentElement;
    if (!row) return [];
    return Array.from(row.children).filter((child) => {
      const text = child.textContent.trim();
      return text === 'Topics' || text === 'Companies';
    });
  }

  function findTopics() {
    if (isLeetCode) {
      const results = new Set(document.querySelectorAll('a[href^="/tag/"]'));
      findLcMetaPills().forEach((el) => results.add(el));
      return Array.from(results);
    }
    if (isNeetCode) {
      // The topic names themselves are only rendered after this toggle is
      // clicked; blur the toggle itself so it doesn't advertise the answer.
      const toggle = Array.from(document.querySelectorAll('span.secondary-tag')).find(
        (e) => e.textContent.trim().toLowerCase() === 'topics'
      );
      return toggle ? [toggle] : [];
    }
    return [];
  }

  function findAcceptance() {
    if (isNeetCode) {
      const container = document.querySelector('.acceptance-rate');
      if (container) return [container];
    }

    // "Accepted" and "Acceptance Rate" together, since the raw accepted count
    // combined with the (visible) submissions count would let you back into
    // the rate anyway. Submissions itself is intentionally left alone.
    const LABEL_RE = /^(accepted|acceptance(\s*rate)?)$/i;
    const results = new Set();

    Array.from(document.querySelectorAll('div, span, p, td, th, li'))
      .filter((e) => isLeaf(e) && !isInCodeArea(e) && LABEL_RE.test(e.textContent.trim()))
      .forEach((label) => {
        results.add(label);
        const valueContainers = [
          label.nextElementSibling,
          label.previousElementSibling,
          label.parentElement && label.parentElement.nextElementSibling,
        ].filter(Boolean);
        valueContainers.forEach((container) => {
          if (isLeaf(container)) {
            results.add(container);
          } else {
            Array.from(container.querySelectorAll('*'))
              .filter((e) => isLeaf(e) && !isInCodeArea(e))
              .forEach((leaf) => results.add(leaf));
          }
        });
      });

    // Single element combining label + value, e.g. "Acceptance Rate 56.3%"
    Array.from(document.querySelectorAll('div, span, p'))
      .filter(
        (e) =>
          isLeaf(e) &&
          !isInCodeArea(e) &&
          /(accepted|acceptance\s*rate)[^a-z0-9]{0,20}[\d,.]+\s*%?/i.test(e.textContent)
      )
      .forEach((e) => results.add(e));

    return Array.from(results);
  }

  // ---------- Apply ----------

  function currentlyTagged(category) {
    return Array.from(document.querySelectorAll(`[data-lnht="${category}"]`));
  }

  function applyCategory(category, enabled, finder) {
    currentlyTagged(category).forEach(untag);
    if (!enabled) return;
    try {
      finder().forEach((el) => tagHidden(el, category));
    } catch (err) {
      console.error('[Hide LC/NC Spoilers]', category, err);
    }
  }

  function apply() {
    applyCategory('title', settings.hideTitle, findTitle);
    applyCategory('solved', settings.hideTitle, findSolvedMarker);
    applyCategory('difficulty', settings.hideDifficulty, findDifficulty);
    applyCategory('topics', settings.hideTopics, findTopics);
    applyCategory('acceptance', settings.hideAcceptance, findAcceptance);
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = { ...DEFAULTS, ...stored };
    scheduleApply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    let changed = false;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) {
        settings[key] = changes[key].newValue;
        changed = true;
      }
    }
    if (changed) scheduleApply();
  });

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  // These are client-side-routed SPAs; watch for URL changes (e.g. "next problem") too.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleApply();
    }
  }, 500);
})();
