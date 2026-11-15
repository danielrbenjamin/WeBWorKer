/*
 * WeBWorKer Spoiler Guard, adapted from WeBWorK Spoiler Guard.
 * Copyright (c) 2026 Abhinav Nair, MIT License.
 * https://github.com/Palingenos/Webwork-Spoiler-Guard
 * See LICENSES/WeBWorK Spoiler Guard LICENSE.txt.
 *
 * Runs at document_start and enables spoiler-guard.css only for categories
 * selected in study mode. This script does the version-independent work
 * that CSS can't:
 *
 *   - marks elements whose *text* gives an answer away ("The correct answer
 *     is ...", "Your overall recorded score is 100%")
 *   - finds "Correct Answer" / "Result" / "Score" table columns by their
 *     header text and hides the whole column
 *   - empties answer boxes WeBWorK pre-fills with your old submission
 *   - keeps the "show correct answers" checkbox and URL parameters off
 */
(() => {
  'use strict';

  if (window.__webworkerSpoilerGuard) return;
  window.__webworkerSpoilerGuard = true;
  const DEFAULTS = SpoilerGuardConfig.defaults;

  const CATEGORIES = ['answers', 'results', 'scores', 'solutions'];

  // Phrases WeBWorK uses when it gives something away. Matched against text
  // nodes, so they survive markup changes between WeBWorK versions.
  const TEXT_PATTERNS = {
    answers: [
      /\bthe\s+correct\s+answers?\s+(is|are|was|were)\b/i,
      /\bcorrect\s+answers?\s*:/i,
      /\banswers?\s+to\s+this\s+(question|problem)\s+(is|are)\b/i
    ],
    results: [
      /\byour\s+answers?\s+(above\s+)?(is|are)\s+(not\s+)?correct\b/i,
      /\ball\s+of\s+your\s+answers\s+are\s+correct\b/i,
      /\bat\s+least\s+one\s+of\s+the\s+answers\s+above\s+is\s+not\s+correct\b/i,
      /\byou\s+have\s+attempted\s+this\s+problem\b/i,
      /\byour\s+(answer|score)\s+(was|is)\s+recorded\b/i,
      /\b(answer|answers)\s+(is|are)\s+(correct|incorrect)\b/i
    ],
    scores: [
      /\byour\s+overall\s+recorded\s+score\s+is\b/i,
      /\bgrade\s+for\s+this\s+(set|problem)\b/i
    ],
    solutions: [
      /\bsolution\s*:/i,
      /\bshow\s+(the\s+)?solution\b/i
    ]
  };

  // Table headers whose entire column is a spoiler.
  const COLUMN_PATTERNS = {
    answers: [/correct\s*answer/i, /answer\s*preview/i],
    results: [/^\s*results?\s*$/i, /^\s*messages?\s*$/i, /^\s*correct\??\s*$/i],
    scores: [/^\s*(score|status|percent|%|grade)\b/i, /\battempts?\b/i, /\bremaining\b/i]
  };

  const ANSWER_INPUTS = [
    'input[name^="AnSwEr"]',
    'textarea[name^="AnSwEr"]',
    'select[name^="AnSwEr"]',
    'input[id^="AnSwEr"]',
    'input[name^="MaTrIx"]',
    'input.codeshard',
    'input[name^="previous_AnSwEr"]'
  ].join(',');

  const root = document.documentElement;
  const originalValues = new WeakMap();
  const editedInputs = new WeakSet();
  const clearedInputs = new Set();
  const originalMirrors = new WeakMap();

  let settings = { ...DEFAULTS };
  let peeking = false;
  let panel = null;

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */

  const siteDisabled = () => settings.disabledHosts.includes(location.hostname);
  const hidingActive = () => settings.enabled && !siteDisabled() && !peeking;

  function apply() {
    const active = hidingActive();

    for (const cat of CATEGORIES) {
      root.setAttribute(`data-wwh-${cat}`, active && settings[cat] ? 'on' : 'off');
    }

    if (active && settings.mode === 'blur') root.setAttribute('data-wwh-mode', 'blur');
    else root.removeAttribute('data-wwh-mode');

    if (document.body) {
      if (active && settings.clearAnswers) clearAnswerInputs();
      else restoreAnswerInputs();
      suppressRevealRequests();
      updatePanel();
    }
  }

  /* ---------------------------------------------------------------- *
   * Marking passes
   * ---------------------------------------------------------------- */

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);

  function markTextSpoilers(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('#wwh-panel, .wwh-marked')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || node.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const hits = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue;
      for (const cat of CATEGORIES) {
        if (!TEXT_PATTERNS[cat].some((re) => re.test(text))) continue;
        hits.push([node, cat]);
        break;
      }
    }
    // Collected first, then mutated, so the walker isn't invalidated mid-walk.
    for (const [node, cat] of hits) markNode(node, cat);
  }

  function markNode(textNode, category) {
    const cls = `wwh-mark-${category}`;
    const parent = textNode.parentElement;
    if (!parent || parent.classList.contains('wwh-marked')) return;

    // Prefer tagging the element that holds the phrase. If that element is a
    // big container (hiding it would blank out half the page), wrap just the
    // offending text node instead.
    const contained = parent.textContent.trim().length;
    const isBigContainer =
      contained > 400 ||
      parent === document.body ||
      ['BODY', 'HTML', 'MAIN', 'FORM', 'SECTION', 'ARTICLE'].includes(parent.tagName);

    if (!isBigContainer) {
      parent.classList.add(cls, 'wwh-marked');
      return;
    }

    const span = document.createElement('span');
    span.className = `${cls} wwh-marked`;
    textNode.after(span);
    span.appendChild(textNode);
  }

  function markTableColumns(scope) {
    for (const table of scope.querySelectorAll('table')) {
      if (table.closest('#wwh-panel')) continue;

      const headerRow =
        table.querySelector('thead tr') ||
        [...table.rows].find(row => row.querySelector('th')) ||
        table.querySelector('tr');
      if (!headerRow) continue;

      const headers = [...headerRow.cells];
      const columns = new Map(); // index -> category
      headers.forEach((cell, index) => {
        const label = cell.textContent.trim();
        if (!label) return;
        for (const cat of Object.keys(COLUMN_PATTERNS)) {
          if (COLUMN_PATTERNS[cat].some((re) => re.test(label))) {
            columns.set(index, cat);
            return;
          }
        }
      });
      if (!columns.size) continue;

      for (const row of table.rows) {
        for (const [index, cat] of columns) {
          const cell = row.cells[index];
          if (cell && !cell.classList.contains('wwh-marked')) {
            cell.classList.add(`wwh-mark-${cat}`, 'wwh-marked');
          }
        }
      }
    }
  }

  function markExtraSelectors(scope) {
    const selectors = settings.extraSelectors
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const el of scope.querySelectorAll('[data-wwh-extra]')) el.removeAttribute('data-wwh-extra');
    if (!selectors.length) return;

    for (const selector of selectors) {
      let matches;
      try {
        matches = scope.querySelectorAll(selector);
      } catch {
        continue; // user typo in the advanced box - ignore it
      }
      for (const el of matches) {
        if (el.closest('#wwh-panel')) continue;
        if (el === root || el === document.body || el.contains(panel)) continue;
        el.setAttribute('data-wwh-extra', '');
      }
    }
  }

  // The sidebar problem links are built server-side as plain text, with the
  // status symbol glued straight onto the end:
  //
  //     <a class="nav-link">Problem 1 &#x2713;</a>
  //
  // There's no element and no class around the symbol, so hide.css has
  // nothing to aim at. Wrap it in one here and the normal rules apply:
  // it hides with the other correct/incorrect marks, blurs in blur mode,
  // and comes back on peek, with no extra bookkeeping.
  const STATUS_SYMBOL = /\s*[\u2713\u2717\u2026]+\s*$/; // check, cross, ellipsis

  function markProblemListStatus(scope) {
    for (const link of scope.querySelectorAll('.problem-list a.nav-link')) {
      if (link.dataset.wwhNav === 'done') continue;
      link.dataset.wwhNav = 'done';

      for (const node of [...link.childNodes]) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        const match = node.nodeValue.match(STATUS_SYMBOL);
        if (!match) continue;

        node.nodeValue = node.nodeValue.slice(0, match.index);
        const span = document.createElement('span');
        span.className = 'wwh-mark-results wwh-marked';
        span.textContent = match[0];
        link.appendChild(span);
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * Answer boxes
   * ---------------------------------------------------------------- */

  function clearAnswerInputs() {
    for (const el of document.querySelectorAll(ANSWER_INPUTS)) {
      if (editedInputs.has(el) || ['button', 'submit', 'reset', 'file'].includes(el.type)) continue;
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (!originalValues.has(el)) originalValues.set(el, el.checked);
        if (clearedInputs.has(el)) continue;
        clearedInputs.add(el);
        el.checked = false;
        continue;
      }
      if (!originalValues.has(el)) originalValues.set(el, el.value);
      if (clearedInputs.has(el)) continue;

      // Only wipe what WeBWorK pre-filled from the last submission. Anything
      // the student has typed since (e.g. after a peek) is left alone.
      if (el.value && el.value !== originalValues.get(el)) continue;

      clearedInputs.add(el);
      if (!el.value) continue;

      if (el.tagName === 'SELECT') el.selectedIndex = -1;
      else el.value = '';
      clearMathQuill(el);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function restoreAnswerInputs() {
    for (const el of clearedInputs) {
      clearedInputs.delete(el);
      if (!el.isConnected || editedInputs.has(el)) continue;
      const original = originalValues.get(el);
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.checked = original;
        continue;
      }
      if (original === undefined || el.value) continue;
      el.value = original;
      const mirror = originalMirrors.get(el);
      if (mirror) mirror.block.replaceChildren(...mirror.nodes.map(node => node.cloneNode(true)));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // WeBWorK's math editor mirrors the input into a MathQuill span; the hidden
  // input alone isn't what you see on screen.
  function clearMathQuill(input) {
    if (!input.id) return;
    const quill = document.getElementById(`MaThQuIlL_${input.id}`);
    const block = quill && quill.querySelector('.mq-root-block');
    if (block) {
      if (!originalMirrors.has(input)) originalMirrors.set(input, {
        block, nodes: [...block.childNodes].map(node => node.cloneNode(true))
      });
      block.textContent = '';
    }
  }

  /* ---------------------------------------------------------------- *
   * Stop WeBWorK from being asked for answers in the first place
   * ---------------------------------------------------------------- */

  const REVEAL_PARAMS = ['showCorrectAnswers', 'showSolutions', 'showHints'];
  const originalLinks = new Map();
  const originalRevealBoxes = new Map();
  const revealSuppressed = param => settings.forceParams && hidingActive() &&
    (param === 'showCorrectAnswers' ? settings.answers : settings.solutions);

  function restoreRevealRequests() {
    for (const [link, saved] of originalLinks) {
      if (!link.isConnected) { originalLinks.delete(link); continue; }
      if (link.href === saved.filtered) link.href = saved.original;
      originalLinks.delete(link);
    }
    for (const [box, checked] of originalRevealBoxes) {
      if (!box.isConnected || !revealSuppressed(box.name)) {
        if (box.isConnected && !box.checked) box.checked = checked;
        originalRevealBoxes.delete(box);
      }
    }
  }

  function suppressRevealRequests() {
    restoreRevealRequests();
    if (!settings.forceParams || !hidingActive()) return;

    const boxes = document.querySelectorAll(
      'input[type="checkbox"][name="showCorrectAnswers"], input[type="checkbox"][name="showSolutions"], input[type="checkbox"][name="showHints"], #showCorrectAnswers_id, #showSolutions_id, #showHints_id'
    );
    for (const box of boxes) {
      if (box.type === 'checkbox' && box.checked && revealSuppressed(box.name)) {
        if (!originalRevealBoxes.has(box)) originalRevealBoxes.set(box, box.checked);
        box.checked = false;
      }
    }

    for (const link of document.querySelectorAll('a[href*="show"]')) {
      let url;
      try {
        url = new URL(link.href, location.href);
      } catch {
        continue;
      }
      let touched = false;
      for (const param of REVEAL_PARAMS) {
        if (revealSuppressed(param) && url.searchParams.has(param)) {
          url.searchParams.delete(param);
          touched = true;
        }
      }
      if (touched) {
        const original = originalLinks.get(link)?.original || link.href;
        link.href = url.toString();
        originalLinks.set(link, { original, filtered: link.href });
      }
    }
  }

  function guardForms() {
    // Observe real edits before any delayed scan, including an intentionally
    // blank answer. Synthetic updates from our clearing pass are ignored.
    const rememberEdit = event => {
      if (!event.isTrusted) return;
      const input = event.target;
      if (input.matches?.(ANSWER_INPUTS)) {
        editedInputs.add(input);
        if (input.type === 'radio') {
          for (const sibling of document.querySelectorAll(ANSWER_INPUTS)) {
            if (sibling.type === 'radio' && sibling.name === input.name && sibling.form === input.form) editedInputs.add(sibling);
          }
        }
      }
      const mirror = input.closest?.('[id^="MaThQuIlL_"]');
      if (mirror) {
        const original = document.getElementById(mirror.id.slice('MaThQuIlL_'.length));
        if (original) editedInputs.add(original);
      }
    };
    document.addEventListener('input', rememberEdit, true);
    document.addEventListener('change', rememberEdit, true);
    document.addEventListener('formdata', event => {
      for (const param of REVEAL_PARAMS) {
        if (revealSuppressed(param)) event.formData.delete(param);
      }
    }, true);
    document.addEventListener(
      'submit',
      () => {
        if (!settings.forceParams || !hidingActive()) return;
        suppressRevealRequests();
      },
      true
    );
  }

  /* ---------------------------------------------------------------- *
   * On-page panel
   * ---------------------------------------------------------------- */

  function buildPanel() {
    if (panel || !document.body) return;
    panel = document.createElement('div');
    panel.id = 'wwh-panel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'WeBWorKer study mode');
    panel.innerHTML =
      '<button type="button" data-action="peek"></button>' +
      '<button type="button" data-action="site">Turn off study mode</button>';

    panel.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'peek') togglePeek();
      if (action === 'site') toggleSite();
    });

    document.body.appendChild(panel);
    updatePanel();
  }

  function updatePanel() {
    if (!settings.enabled || !settings.showPanel || window.top !== window) {
      panel?.remove();
      panel = null;
      return;
    }
    if (!panel) {
      buildPanel();
      return;
    }

    const peekButton = panel.querySelector('[data-action="peek"]');
    const siteButton = panel.querySelector('[data-action="site"]');

    if (siteDisabled() || !settings.enabled) {
      panel.dataset.state = 'off';
      peekButton.textContent = 'Spoilers shown';
      peekButton.dataset.active = 'false';
    } else if (peeking) {
      panel.dataset.state = 'revealed';
      peekButton.textContent = 'Hide again';
      peekButton.dataset.active = 'true';
    } else {
      panel.dataset.state = 'hidden';
      peekButton.textContent = 'Peek';
      peekButton.dataset.active = 'false';
    }

    peekButton.disabled = siteDisabled();
    peekButton.setAttribute('aria-pressed', String(peeking));
    peekButton.title = 'Temporarily reveal answers and feedback';
    siteButton.textContent = siteDisabled() ? 'Turn on study mode' : 'Turn off study mode';
    siteButton.title = 'Turn study mode on or off for this site';
  }

  function togglePeek() {
    peeking = !peeking;
    apply();
  }

  async function toggleSite() {
    peeking = false;
    const hosts = new Set(settings.disabledHosts);
    if (hosts.has(location.hostname)) hosts.delete(location.hostname);
    else hosts.add(location.hostname);
    settings.disabledHosts = [...hosts];
    await SpoilerGuardConfig.save({ disabledHosts: settings.disabledHosts });
    apply();
  }

  /* ---------------------------------------------------------------- *
   * Scanning loop
   * ---------------------------------------------------------------- */

  let scanQueued = false;

  function scan() {
    if (!document.body) return;
    if (!settings.enabled) return;
    markTextSpoilers(document.body);
    markTableColumns(document.body);
    markProblemListStatus(document.body);
    markExtraSelectors(document.body);
    suppressRevealRequests();
    if (hidingActive() && settings.clearAnswers) clearAnswerInputs();
    updatePanel();
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scan();
    });
  }

  function observe() {
    new MutationObserver((records) => {
      // Ignore the mutations we cause ourselves.
      const external = records.some((record) => {
        const target = record.target;
        const el = target.nodeType === 1 ? target : target.parentElement;
        return !el || !el.closest('#wwh-panel');
      });
      if (external) queueScan();
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /* ---------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------- */

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    let changed = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
      for (const name of Object.keys(DEFAULTS)) {
        if (key === SpoilerGuardConfig.storageKey(name)) {
          settings[name] = newValue ?? DEFAULTS[name];
          changed = true;
        }
      }
    }
    if (!changed) return;
    if (!settings.enabled || siteDisabled()) peeking = false;
    apply();
    queueScan();
  });

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'wwh-peek' && settings.enabled) togglePeek();
    if (message?.type === 'wwh-toggle-site' && settings.enabled) toggleSite();
    if (message?.type === 'wwh-rescan') queueScan();
    if (!['wwh-peek', 'wwh-toggle-site', 'wwh-rescan'].includes(message?.type)) return;
    respond?.({ ok: true, peeking, host: location.hostname, enabled: settings.enabled });
    return false;
  });

  async function init() {
    guardForms();
    try {
      settings = await SpoilerGuardConfig.read();
    } catch {
      // Keep the safe defaults if storage is unavailable.
    }
    apply();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        buildPanel();
        scan();
      });
    } else {
      buildPanel();
      scan();
    }
    observe();
  }

  init();
})();
