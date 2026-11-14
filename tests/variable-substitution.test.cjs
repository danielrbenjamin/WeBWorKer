const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../content-webwork.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('var WeBWorKerVariables ='), source.indexOf('var webworkSetup =')), context);
const { expand, prepareValue } = context.WeBWorKerVariables;

for (const [name, expression, vars, expected] of [
    ['nested negative values', 'a', { a: '2b', b: -1 }, '(2*(-1))'],
    ['unknown symbolic variables', 'a', { a: '2x' }, '(2*x)'],
    ['three nested definitions', 'c', { c: '3a', a: '2b', b: 1 }, '(3*(2*(1)))'],
    ['nested adjacent groups', 'a', { a: '(x+1)(x-1)' }, '((x+1)*(x-1))'],
    ['closing group and symbol', 'a', { a: '(x+1)y' }, '((x+1)*y)'],
    ['closing group and number', '(x+1)2', {}, '(x+1)*2'],
    ['number and group', '2(x+1)', {}, '2*(x+1)'],
    ['scientific notation in definitions', 'a', { a: '1e-3*x+2E+4' }, '(1e-3*x+2E+4)'],
    ['scientific notation with a variable named e', '1e-3+e', { e: 2 }, '1e-3+(2)'],
    ['function calls with expanded arguments', 'sin(a)+sqrt(a)', { a: '2x' }, 'sin((2*x))+sqrt((2*x))'],
    ['function names are not split into variables', 'sin(x)+sinh(x)+asin(x)', { s: 2, i: 3, n: 4 }, 'sin(x)+sinh(x)+asin(x)'],
    ['exact names take precedence over segmentation', 'ab+a', { ab: 5, a: 2, b: 3 }, '(5)+(2)'],
    ['fully known concatenated variables', 'ab', { a: 2, b: 3 }, '(2)*(3)'],
    ['unknown identifiers stay intact', 'alpha+a', { a: 2 }, 'alpha+(2)'],
    ['function shorthand', 'sinx+sin6+ln x', {}, 'sin(x)+sin(6)+ln(x)'],
    ['decimal and scientific function shorthand', 'sin6.2+cos1e-3', {}, 'sin(6.2)+cos(1e-3)'],
    ['signed function shorthand', 'sin -2', {}, 'sin(-2)'],
    ['symbolic function-like names are preserved', 'sinewave', {}, 'sinewave'],
    ['multi-argument functions', 'min(a,2)+pow(x,2)', { a: -1 }, 'min((-1),2)+pow(x,2)'],
    ['repeated dependencies', 'a+a', { a: 'b+1', b: 2 }, '((2)+1)+((2)+1)'],
    ['multi-letter and numbered variables', 'mass_1*x2', { mass_1: '2m', x2: 3 }, '(2*m)*(3)'],
    ['precedence remains parenthesized', 'a^2', { a: 'x+1' }, '(x+1)^2'],
    ['blank answers', ' ', {}, '']
]) {
    test(name, () => assert.equal(expand(expression, vars), expected));
}

test('direct and indirect cycles produce clear errors', () => {
    assert.throws(() => expand('x', { x: 'x+1' }), /Circular.*x → x/);
    assert.throws(() => expand('a', { a: 'b', b: 'a' }), /Circular.*a → b → a/);
});

test('saving a variable rejects new cycles and reserved function names', () => {
    assert.throws(() => prepareValue('x', 'x+1', {}), /Circular/);
    assert.throws(() => prepareValue('b', 'a', { a: 'b' }), /Circular/);
    assert.throws(() => prepareValue('sin', '2', {}), /math function/);
});

test('saving expressions allows forward references without altering their text', () => {
    assert.equal(prepareValue('a', '2b', {}), '2b');
    assert.equal(prepareValue('b', '-1', { a: '2b' }), -1);
    assert.equal(prepareValue('small', '1e-3', {}), 0.001);
});

test('invalid syntax is rejected rather than partially expanded', () => {
    for (const expression of ['x;', '<img>', '2**3', 'x+', '(x+1', 'x+)', '1.2.3', '2 3', 'sqrt()', 'x,y']) {
        assert.throws(() => expand(expression, {}), undefined, expression);
    }
});

test('invalid stored values and non-finite numbers are rejected', () => {
    for (const value of [Infinity, NaN, {}, '', null, '1e999']) assert.throws(() => expand('a', { a: value }));
});

test('nesting and output limits fail explicitly', () => {
    const deep = {};
    for (let i = 0; i < 40; i++) deep['a' + i] = i === 39 ? 'x' : 'a' + (i + 1);
    assert.throws(() => expand('a0', deep), /nested too deeply/);
    const large = { a0: 'x' };
    for (let i = 1; i < 20; i++) large['a' + i] = 'a' + (i - 1) + '+a' + (i - 1);
    assert.throws(() => expand('a19', large), /too long/);
});

test('submitting multiple answers is transactional when one expansion fails', () => {
    const values = ['original first', 'original second'];
    const testContext = vm.createContext({ inputSubstitutionFunctions: [
        () => () => { values[0] = 'expanded'; },
        () => false
    ] });
    const block = source.slice(source.indexOf('    var applyVariablesToAllInputs ='), source.indexOf('    var applyToInputs ='));
    vm.runInContext(block, testContext);
    assert.equal(testContext.applyVariablesToAllInputs(), false);
    assert.deepEqual(values, ['original first', 'original second']);
});
