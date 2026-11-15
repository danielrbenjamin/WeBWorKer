const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../panel.js'), 'utf8');
const scientific = 'https://www.desmos.com/scientific';
const graphing = 'https://www.desmos.com/calculator';
const wolfram = 'https://www.wolframalpha.com/';
const settle = () => new Promise(resolve => setImmediate(resolve));

async function fixture({ selectedTool = scientific, draft = '', failOpen = false, failDraft = false } = {}) {
    const ids = Object.fromEntries(['toolSelector', 'wolframQuery', 'wolframForm', 'toolStatus', 'scientificFrame', 'graphingFrame', 'wolframTool'].map(id => [id, {
        value: '', hidden: true, events: {}, loads: [],
        addEventListener(type, callback) { this.events[type] = callback; },
        getAttribute(name) { return name === 'src' ? this.url : null; },
        set src(value) { this.url = value; this.loads.push(value); }
    }]));
    const opened = [], preferences = [], drafts = [];
    let ready;
    vm.runInNewContext(source, {
        URL, setTimeout: () => 1, clearTimeout() {},
        document: { addEventListener(type, callback) { ready = callback; }, getElementById: id => ids[id] },
        chrome: {
            storage: {
                sync: { async get() { return { selectedTool }; }, async set(value) { preferences.push(value); } },
                local: { async get() { return { wolframAlphaQuery: draft }; }, async set(value) {
                    if (failDraft) throw new Error('Storage failure');
                    drafts.push(value);
                } }
            },
            tabs: { async create(value) {
                if (failOpen) throw new Error('Cannot open tab');
                opened.push(value.url);
            } }
        }
    });
    ready();
    await settle();
    return {
        ids, opened, preferences, drafts,
        async choose(value) { ids.toolSelector.value = value; await ids.toolSelector.events.change(); },
        async submit(value) {
            ids.wolframQuery.value = value;
            ids.wolframForm.events.submit({ preventDefault() {} });
            await settle();
        }
    };
}

test('saved Desmos selections still load the correct calculator', async () => {
    const f = await fixture({ selectedTool: graphing });
    assert.deepEqual(f.ids.graphingFrame.loads, [graphing]);
    assert.equal(f.ids.scientificFrame.loads.length, 0);
    assert.equal(f.ids.toolSelector.disabled, false);
});

test('switching tools preserves each loaded calculator frame', async () => {
    const f = await fixture();
    await f.choose(graphing);
    await f.choose(wolfram);
    assert.equal(f.ids.wolframTool.hidden, false);
    assert.equal(f.ids.scientificFrame.hidden, true);
    await f.choose(scientific);
    assert.deepEqual(f.ids.scientificFrame.loads, [scientific]);
    assert.deepEqual(f.ids.graphingFrame.loads, [graphing]);
    assert.equal(f.ids.wolframTool.hidden, true);
    assert.equal(f.preferences.at(-1).selectedTool, scientific);
});

test('Wolfram Alpha restores its local draft and encodes submitted queries', async () => {
    const f = await fixture({ selectedTool: wolfram, draft: 'integrate x^2' });
    assert.equal(f.ids.wolframQuery.value, 'integrate x^2');
    assert.equal(f.ids.wolframTool.hidden, false);
    assert.equal(f.ids.scientificFrame.loads.length, 0);
    await f.submit('a+b & sqrt(x)');
    const url = new URL(f.opened[0]);
    assert.equal(url.origin, 'https://www.wolframalpha.com');
    assert.equal(url.pathname, '/input');
    assert.equal(url.searchParams.get('i'), 'a+b & sqrt(x)');
    assert.equal(f.drafts.at(-1).wolframAlphaQuery, 'a+b & sqrt(x)');
});

test('blank queries do not open tabs', async () => {
    const f = await fixture({ selectedTool: wolfram });
    await f.submit('  ');
    assert.equal(f.opened.length, 0);
});

test('unsupported saved URLs fall back to Desmos Scientific', async () => {
    const f = await fixture({ selectedTool: 'https://untrusted.example/' });
    assert.deepEqual(f.ids.scientificFrame.loads, [scientific]);
    assert.equal(f.ids.toolSelector.value, scientific);
});

test('failure to save a draft does not prevent opening the requested query', async () => {
    const f = await fixture({ selectedTool: wolfram, failDraft: true });
    await f.submit('solve x^2=4');
    assert.equal(new URL(f.opened[0]).searchParams.get('i'), 'solve x^2=4');
});

test('tab-opening errors are shown in the panel', async () => {
    const f = await fixture({ selectedTool: wolfram, failOpen: true });
    await f.submit('x^2');
    assert.equal(f.ids.toolStatus.hidden, false);
    assert.match(f.ids.toolStatus.textContent, /Could not open a new tab/);
});
