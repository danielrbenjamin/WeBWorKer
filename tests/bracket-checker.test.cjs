const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../content-webwork.js'), 'utf8');
const start = source.indexOf('        function checkMatchingBrackets(expr)');
const end = source.indexOf('        function isValid(', start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const check = expression => context.checkMatchingBrackets(expression);

test('the live checker still highlights matching bracket pairs', () => {
    const [valid, position, html] = check('(x + [y])');
    assert.equal(valid, true);
    assert.equal(position, -1);
    assert.match(html, /<span class=ww_pair0>\(<\/span>/);
    assert.match(html, /<span class=ww_pair1>\[<\/span>/);
    assert.match(html, /<span class=ww_pair0>\)<\/span>/);
});

test('HTML after an unexpected closing bracket is escaped, not inserted', () => {
    for (const closing of [')', ']', '}']) {
        const [valid, position, html] = check(closing + '<img src=x onerror="example">');
        assert.equal(valid, false);
        assert.equal(position, 0);
        assert.equal(html.includes('<img'), false);
        assert.match(html, /&lt;img src=x onerror=&quot;example&quot;&gt;/);
        assert.match(html, /^<span class=ww_pairbad>/);
    }
});

test('HTML and entity-like text are escaped on the normal rendering path', () => {
    const [valid, , html] = check('(<b>&lt;test&gt; & "value" \'other\'</b>)');
    assert.equal(valid, true);
    assert.equal(html.includes('<b>'), false);
    assert.match(html, /&lt;b&gt;&amp;lt;test&amp;gt; &amp; &quot;value&quot; &#39;other&#39;&lt;\/b&gt;/);
});

test('a later invalid closing bracket cannot introduce markup after valid pairs', () => {
    const [valid, position, html] = check('(x))<b>example</b>');
    assert.equal(valid, false);
    assert.equal(position, 3);
    assert.equal(html.includes('<b>'), false);
    assert.match(html, /&lt;b&gt;example&lt;\/b&gt;/);
});

test('missing and mismatched brackets retain their invalid result', () => {
    assert.equal(check('(x')[0], false);
    assert.equal(check('(x]')[0], false);
});
