const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'onboarding.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function analyzePreviewBrackets('), source.indexOf('function updateBracketPreview(')), context);
const analyze = expression => context.analyzePreviewBrackets(expression);

test('nested bracket pairs get matching colors', () => {
    const result = analyze('(x + [2*y])');
    assert.equal(result.state, 'valid');
    const brackets = result.tokens.filter(token => token.bracket);
    assert.equal(brackets[0].depth, brackets[3].depth);
    assert.equal(brackets[1].depth, brackets[2].depth);
    assert.notEqual(brackets[0].depth, brackets[1].depth);
});

test('missing brackets identify the unmatched opening and expected closing', () => {
    const result = analyze('(x + 2');
    assert.equal(result.state, 'invalid');
    assert.match(result.message, /Missing \) for \( at character 1/);
    assert.equal(result.tokens[0].invalid, true);
});

test('wrong and unexpected closing brackets get specific messages', () => {
    assert.match(analyze('(x + 2]').message, /Expected \), found \]/);
    assert.match(analyze('x + 2)').message, /Unexpected \) at character 6/);
    assert.equal(analyze('([)]').state, 'invalid');
});

test('empty expressions and expressions without brackets are neutral', () => {
    assert.equal(analyze('').state, 'neutral');
    assert.equal(analyze('x + 2').state, 'neutral');
});

test('preview preserves literal expression characters', () => {
    const expression = '<img src=x> & (x)';
    const result = analyze(expression);
    assert.equal(result.tokens.map(token => token.character).join(''), expression);
});

async function updateWithPreference(preference) {
    let installed;
    const opened = [];
    const chrome = {
        runtime: { onInstalled: { addListener: fn => { installed = fn; } }, onMessage: { addListener() {} } },
        commands: { onCommand: { addListener() {} } },
        storage: { local: { get(keys, callback) { callback(preference); } } },
        tabs: { create: options => opened.push(options) }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'worker.js'), 'utf8'), {
        chrome, importScripts() {}, console: { log() {}, error() {} },
        ExtConfig: { configureAction() {}, async tryEnableGlobal() {} }
    });
    await installed({ reason: 'update' });
    return opened;
}

test('updates do not open onboarding when the preference has never been set', async () => {
    assert.equal((await updateWithPreference({})).length, 0);
});

test('updates honor an explicit onboarding preference', async () => {
    assert.equal((await updateWithPreference({ showOnboardingOnUpdate: false })).length, 0);
    const opened = await updateWithPreference({ showOnboardingOnUpdate: true });
    assert.equal(opened.length, 1);
    assert.equal(opened[0].url, 'onboarding.html');
});
