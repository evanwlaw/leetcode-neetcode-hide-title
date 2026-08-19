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

  function tagHidden(el, category) {
    if (!el || el.nodeType !== 1) return;
    el.classList.add(HIDDEN_CLASS);
    el.setAttribute('data-lnht', category);
    if (!el.dataset.lnhtBound) {
      el.dataset.lnhtBound = '1';
      el.addEventListener('click', onRevealClick, true);
    }
  }

  function untag(el) {
    el.classList.remove(HIDDEN_CLASS, 'lnht-revealed');
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
  // text-based heuristics below).
  function isInCodeArea(el) {
    return !!el.closest('pre, code, textarea, [contenteditable="true"], [class*="editor" i], [class*="cm-" i], [class*="monaco" i]');
  }

  // Walk up while the element is the sole child of its parent, to find a
  // "tight" wrapper around a lone icon without grabbing unrelated siblings.
  function tightWrapper(el, maxDepth = 2) {
    let node = el;
    for (let i = 0; i < maxDepth; i++) {
      const parent = node.parentElement;
      if (!parent || parent.children.length !== 1) break;
      node = parent;
    }
    return node;
  }

  // ---------- Finders ----------

  function findTitle() {
    if (isLeetCode) {
      const byAttr = document.querySelector('[data-cy="question-title"]');
      if (byAttr) return [byAttr];
      const candidate = Array.from(document.querySelectorAll('div, span, a, h1')).find(
        (e) =>
          isLeaf(e) &&
          !isInCodeArea(e) &&
          /^\d+\.\s*\S/.test(e.textContent.trim()) &&
          e.textContent.trim().length < 120
      );
      return candidate ? [candidate] : [];
    }
    if (isNeetCode) {
      // Only treat this as a problem page if a difficulty badge is present nearby,
      // so we don't accidentally blur the site logo/heading on other pages.
      if (findDifficulty().length === 0) return [];
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent.trim()) return [h1];
      const h2 = Array.from(document.querySelectorAll('h2')).find((e) => e.textContent.trim());
      return h2 ? [h2] : [];
    }
    return [];
  }

  // "Solved" indicator: LeetCode shows a "Solved" text label plus a green
  // checkmark icon next to the title; NeetCode shows just the checkmark icon.
  function findSolvedMarker() {
    const results = [];

    const solvedLabel = Array.from(document.querySelectorAll('div, span, a, p')).find(
      (e) => isLeaf(e) && !isInCodeArea(e) && /^solved$/i.test(e.textContent.trim())
    );
    if (solvedLabel) {
      results.push(solvedLabel);
      const parent = solvedLabel.parentElement;
      if (parent) {
        parent.querySelectorAll('svg').forEach((svg) => results.push(svg.closest('button, a') || tightWrapper(svg)));
      }
    }

    const titleEls = findTitle();
    if (titleEls.length) {
      const row = titleEls[0].parentElement;
      if (row) {
        row.querySelectorAll('svg').forEach((svg) => {
          if (isInCodeArea(svg)) return;
          results.push(svg.closest('button, a') || tightWrapper(svg));
        });
      }
    }

    return Array.from(new Set(results));
  }

  function findDifficulty() {
    const classHits = Array.from(
      document.querySelectorAll(
        '[class*="difficulty-easy" i], [class*="difficulty-medium" i], [class*="difficulty-hard" i]'
      )
    );
    if (classHits.length) return classHits;
    return Array.from(document.querySelectorAll('div, span, a, button')).filter(
      (e) => !isInCodeArea(e) && textIsExact(e, ['Easy', 'Medium', 'Hard'])
    );
  }

  function findTopics() {
    if (isLeetCode) {
      return Array.from(document.querySelectorAll('a[href^="/tag/"]'));
    }
    // NeetCode: locate a "Topics" heading and blur the pills/links after it.
    const heading = Array.from(document.querySelectorAll('h2, h3, h4, span, div')).find(
      (e) => isLeaf(e) && !isInCodeArea(e) && /^(related\s+)?topics?$/i.test(e.textContent.trim())
    );
    if (!heading) return [];
    const container =
      (heading.parentElement && heading.parentElement.nextElementSibling) || heading.nextElementSibling;
    if (!container) return [];
    const leaves = Array.from(container.querySelectorAll('a, span, div')).filter(
      (e) => isLeaf(e) && !isInCodeArea(e) && e.textContent.trim() && e.textContent.trim().length <= 40
    );
    // Safety valve: a real topic-pill list is short. If this "container" turned
    // out to be something much bigger (e.g. the whole instructions panel), bail
    // rather than blurring a wall of unrelated content.
    return leaves.length <= 15 ? leaves : [];
  }

  function findAcceptance() {
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
    applyCategory('title', settings.hideTitle, () => [...findTitle(), ...findSolvedMarker()]);
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
