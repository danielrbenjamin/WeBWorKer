const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../content-webwork.js'), 'utf8');
const code = source.slice(source.indexOf('    var createCustomQueryButton ='), source.indexOf('    // ===== PARENTHESES CHECKER ====='));

async function fixture(saved = {}) {
    let button;
    const opened = [];
    const context = vm.createContext({
        console: { log() {} },
        chrome: { storage: { sync: { async get(defaults) { return { ...defaults, ...saved }; } } } },
        window: { open(url) { opened.push(url); } },
        document: {
            getElementById(id) {
                if (id === 'previewAnswers_id') return { parentNode: { insertBefore(node) { button = node; } } };
                if (id === 'problem_body') return { textContent: 'Find x + y & z' };
            },
            createElement() { return { style: {}, addEventListener(type, listener) { this[type] = listener; } }; }
        }
    });
    vm.runInContext(code, context);
    await context.createCustomQueryButton();
    return { button, opened };
}

test('a new installation uses Google for the custom-query button', async () => {
    const f = await fixture();
    f.button.click();
    const url = new URL(f.opened[0]);
    assert.equal(url.origin, 'https://www.google.com');
    assert.equal(url.searchParams.get('q'), 'Find x + y & z');
});

test('a saved search provider and label are preserved', async () => {
    const f = await fixture({ customQueryUrl: 'https://www.wolframalpha.com/input?i=', customQueryButtonText: 'Wolfram Alpha' });
    assert.equal(f.button.value, 'Wolfram Alpha');
    f.button.click();
    const url = new URL(f.opened[0]);
    assert.equal(url.origin, 'https://www.wolframalpha.com');
    assert.equal(url.searchParams.get('i'), 'Find x + y & z');
});

test('a disabled custom-query button is not injected', async () => {
    const f = await fixture({ customQueryEnabled: false });
    assert.equal(f.button, undefined);
});
