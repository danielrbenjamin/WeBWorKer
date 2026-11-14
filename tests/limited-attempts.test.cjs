const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../content-webwork.js'), 'utf8');
const check = source.slice(source.indexOf('let confirmationEnabled ='), source.indexOf('function addConfirmationListener()'));

function fixture(summary, accepted = true) {
    let warnings = 0;
    const context = vm.createContext({
        document: { getElementById: () => summary },
        confirm() { warnings++; return accepted; }
    });
    vm.runInContext(check, context);
    return { submit: () => context.confirmSubmit(), warnings: () => warnings };
}

test('hidden unlimited-attempt text does not trigger a limited-attempt warning', () => {
    const f = fixture({
        innerText: 'You have attempted this problem 2 times.',
        textContent: 'You have attempted this problem 2 times. You have unlimited attempts remaining.'
    });
    assert.equal(f.submit(), true);
    assert.equal(f.warnings(), 0);
});

test('a limited-attempt problem still warns and respects cancellation', () => {
    const f = fixture({ textContent: 'You have 2 attempts remaining.' }, false);
    assert.equal(f.submit(), false);
    assert.equal(f.warnings(), 1);
});

test('a missing summary still warns rather than assuming unlimited attempts', () => {
    const f = fixture(null, false);
    assert.equal(f.submit(), false);
    assert.equal(f.warnings(), 1);
});
