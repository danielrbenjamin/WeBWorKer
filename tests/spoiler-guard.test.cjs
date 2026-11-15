const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rootDir = path.resolve(__dirname, '..');

function input(value, options = {}) {
    return { value, type: 'text', tagName: 'INPUT', id: '', name: 'AnSwEr1',
        isConnected: true, dispatchEvent() {}, matches: () => true, closest: () => null, ...options };
}

function fixture(inputs = []) {
    const listeners = {};
    const messageListeners = [];
    const storageListeners = [];
    const attrs = new Map();
    const links = [];
    const boxes = [];
    const extra = [];
    const stored = {};
    const activation = { enabled: true };
    const document = {
        documentElement: { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k) },
        body: {},
        addEventListener: (name, listener) => { (listeners[name] ||= []).push(listener); },
        getElementById: () => null,
        querySelectorAll(selector) {
            if (selector.includes('AnSwEr')) return inputs;
            if (selector.includes('checkbox')) return boxes;
            if (selector.startsWith('a[')) return links;
            return [];
        }
    };
    const context = vm.createContext({
        document, window: {}, location: { hostname: 'school.example', href: 'https://school.example/webwork2/test' },
        URL, Event: class {}, requestAnimationFrame() {},
        chrome: {
            storage: {
                sync: { async get(defaults) { return { ...defaults, ...stored }; }, async set(patch) { Object.assign(stored, patch); } },
                onChanged: { addListener: listener => storageListeners.push(listener) }
            },
            runtime: {
                onMessage: { addListener: listener => messageListeners.push(listener) },
                sendMessage(message, callback) { callback({ ok: true, enabled: activation.enabled }); }
            }
        }
    });
    vm.runInContext(fs.readFileSync(path.join(rootDir, 'spoiler-guard-config.js'), 'utf8'), context);
    const source = fs.readFileSync(path.join(rootDir, 'spoiler-guard.js'), 'utf8');
    // Expose functions only in the test environment; skip booting a real page.
    const instrumented = source.replace(/  init\(\);\s*\}\)\(\);\s*$/, `
      window.testAPI = {
        apply, clearAnswerInputs, restoreAnswerInputs, guardForms, markTableColumns,
        markExtraSelectors, suppressRevealRequests, togglePeek, refreshSiteEnabled,
        setSettings(patch) { settings = { ...DEFAULTS, showPanel: false, ...patch }; siteEnabled = true; }
      };
    })();`);
    assert.notEqual(instrumented, source);
    vm.runInContext(instrumented, context);
    const api = context.window.testAPI;
    api.setSettings({ enabled: true });
    return { api, context, inputs, attrs, listeners, links, boxes, extra, stored, activation, messageListeners, storageListeners };
}

test('settings are opt-in and isolated from existing WeBWorKer preferences', async () => {
    const f = fixture();
    const config = f.context.SpoilerGuardConfig;
    assert.equal((await config.read()).enabled, false);
    f.stored.clearAnswersEnabled = false;
    await config.save({ clearAnswers: false, enabled: true });
    assert.equal(f.stored.spoilerGuardClearAnswers, false);
    assert.equal(f.stored.clearAnswersEnabled, false);
    assert.equal((await config.read()).enabled, true);
});

test('Peek restores old text answers and clears them again on re-hide', () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.api.apply();
    assert.equal(answer.value, '');
    assert.equal(f.attrs.get('data-wwh-answers'), 'on');
    f.api.togglePeek();
    assert.equal(answer.value, '42');
    assert.equal(f.attrs.get('data-wwh-answers'), 'off');
    f.api.togglePeek();
    assert.equal(answer.value, '');
});

test('real edits, including deliberately empty answers, survive Peek and rescans', () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.api.guardForms();
    f.api.apply();
    answer.value = 'my work';
    f.listeners.input[0]({ target: answer, isTrusted: true });
    f.api.togglePeek();
    assert.equal(answer.value, 'my work');
    f.api.togglePeek();
    assert.equal(answer.value, 'my work');
    answer.value = '';
    f.listeners.input[0]({ target: answer, isTrusted: true });
    f.api.togglePeek();
    assert.equal(answer.value, '');
});

test('an edit before the initial scan is never cleared', () => {
    const answer = input('already typing');
    const f = fixture([answer]);
    f.api.guardForms();
    f.listeners.input[0]({ target: answer, isTrusted: true });
    f.api.apply();
    assert.equal(answer.value, 'already typing');
});

test('radio choices keep their values and preserve a new selection across the group', () => {
    const a = input('a', { type: 'radio', checked: true });
    const b = input('b', { type: 'radio', checked: false });
    const f = fixture([a, b]);
    f.api.guardForms();
    f.api.apply();
    assert.equal(a.checked, false);
    assert.equal(a.value, 'a');
    b.checked = true;
    f.listeners.change[0]({ target: b, isTrusted: true });
    f.api.togglePeek();
    assert.equal(a.checked, false);
    assert.equal(b.checked, true);
});

test('disabling study mode restores untouched fields and all categories', () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.api.apply();
    f.api.setSettings({ enabled: false });
    f.api.apply();
    assert.equal(answer.value, '42');
    for (const cat of ['answers', 'results', 'scores', 'solutions']) assert.equal(f.attrs.get('data-wwh-' + cat), 'off');
});

test('reveal suppression respects categories and restores navigation on Peek', () => {
    const f = fixture();
    const original = 'https://school.example/webwork2/next?showCorrectAnswers=1&showSolutions=1&other=keep';
    const link = { href: original, isConnected: true };
    const box = { type: 'checkbox', name: 'showCorrectAnswers', checked: true, isConnected: true };
    f.links.push(link); f.boxes.push(box);
    f.api.apply();
    assert.equal(new URL(link.href).searchParams.has('showCorrectAnswers'), false);
    assert.equal(new URL(link.href).searchParams.get('other'), 'keep');
    assert.equal(box.checked, false);
    f.api.togglePeek();
    assert.equal(link.href, original);
    assert.equal(box.checked, true);
    f.api.togglePeek();
    f.api.setSettings({ enabled: true, answers: false });
    f.api.apply();
    assert.equal(new URL(link.href).searchParams.get('showCorrectAnswers'), '1');
    assert.equal(new URL(link.href).searchParams.has('showSolutions'), false);
});

test('submitted form data strips only the selected reveal categories', () => {
    const f = fixture();
    f.api.setSettings({ enabled: true, answers: false });
    f.api.guardForms();
    const formData = new Map([['showCorrectAnswers', '1'], ['showHints', '1'], ['AnSwEr1', 'mine']]);
    f.listeners.formdata[0]({ formData });
    assert.equal(formData.has('showCorrectAnswers'), true);
    assert.equal(formData.has('showHints'), false);
    assert.equal(formData.get('AnSwEr1'), 'mine');
});

test('dynamically appended table rows get marked on the next scan', () => {
    const f = fixture();
    const cell = text => {
        const classes = new Set();
        return { textContent: text, classList: { contains: c => classes.has(c), add: (...items) => items.forEach(c => classes.add(c)) }, classes };
    };
    const header = { cells: [cell('Problem'), cell('Correct Answer'), cell('Score')] };
    const table = { closest: () => null, rows: [header], querySelector: () => header };
    const scope = { querySelectorAll: () => [table] };
    f.api.markTableColumns(scope);
    const row = { cells: [cell('2'), cell('42'), cell('100%')] };
    table.rows.push(row);
    f.api.markTableColumns(scope);
    assert.equal(row.cells[0].classes.size, 0);
    assert.equal(row.cells[1].classes.has('wwh-mark-answers'), true);
    assert.equal(row.cells[2].classes.has('wwh-mark-scores'), true);
});

test('Spoiler Guard does not respond to screenshot and side panel messages', () => {
    const f = fixture();
    for (const type of ['weworker.captureVisibleTab', 'weworker.openSidePanel']) {
        let replied = false;
        f.messageListeners[0]({ type }, {}, () => { replied = true; });
        assert.equal(replied, false);
    }
});

test('disabling WeBWorKer restores hidden content and previous answers without clearing the study preference', async () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.api.apply();
    assert.equal(answer.value, '');
    f.activation.enabled = false;
    await f.api.refreshSiteEnabled();
    assert.equal(answer.value, '42');
    assert.equal(f.attrs.get('data-wwh-answers'), 'off');
    f.activation.enabled = true;
    await f.api.refreshSiteEnabled();
    assert.equal(answer.value, '');
    assert.equal(f.attrs.get('data-wwh-answers'), 'on');
});

test('Study Mode cannot become active while the extension is disabled', async () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.activation.enabled = false;
    await f.api.refreshSiteEnabled();
    f.storageListeners[0]({ spoilerGuardEnabled: { newValue: true } }, 'sync');
    assert.equal(answer.value, '42');
    assert.equal(f.attrs.get('data-wwh-answers'), 'off');
});

test('a main-toggle notification refreshes the active state', () => {
    const answer = input('42');
    const f = fixture([answer]);
    f.api.apply();
    f.activation.enabled = false;
    f.storageListeners[0]({ weworkerSiteConfigChanged: { newValue: 'changed' } }, 'local');
    assert.equal(answer.value, '42');
    assert.equal(f.attrs.get('data-wwh-answers'), 'off');
});
