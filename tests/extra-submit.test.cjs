const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../content-webwork.js'), 'utf8');
const start = source.lastIndexOf('(function()', source.indexOf('var submitButtonsContainer ='));
const end = source.indexOf('})();', start) + 5;
const script = source.slice(start, end);

function fixture({ containerExists = true, submitExists = true } = {}) {
    const buttons = [];
    let clicks = 0;
    const original = { click() { clicks++; } };
    const container = { appendChild(button) { buttons.push(button); } };
    const context = vm.createContext({
        console: { log() {}, error(message) { throw Error(message); } },
        document: {
            querySelector(selector) {
                if (selector.includes('submit-buttons-container')) return containerExists ? container : null;
                if (selector === '[name="submitAnswers"]') return submitExists ? original : null;
            },
            getElementById(id) { return buttons.find(button => button.id === id); },
            createElement() { return { addEventListener(type, listener) { this[type] = listener; } }; }
        }
    });
    return { run: () => vm.runInContext(script, context), buttons, clicks: () => clicks };
}

test('the extra submit button is still added when its targets exist', () => {
    const f = fixture();
    f.run();
    assert.equal(f.buttons.length, 1);
    assert.equal(f.buttons[0].value, 'Submit Answers');
    assert.equal(f.buttons[0].type, 'button');
    f.buttons[0].click();
    assert.equal(f.clicks(), 1);
});

test('repeated injection does not add another extra submit button', () => {
    const f = fixture();
    f.run();
    f.run();
    assert.equal(f.buttons.length, 1);
});

test('a different frame or page without the button container quietly skips the extra button', () => {
    const f = fixture({ containerExists: false });
    f.run();
    assert.equal(f.buttons.length, 0);
});

test('a page without the original submit button quietly skips the extra button', () => {
    const f = fixture({ submitExists: false });
    f.run();
    assert.equal(f.buttons.length, 0);
});
