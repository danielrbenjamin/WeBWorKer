const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '../content-webwork.js'), 'utf8');
const captureCode = source.slice(source.indexOf('    var clampCaptureArea ='), source.indexOf('    var downloadDataUrl ='));

function fixture({ width = 400, height = 250, scale = 1.5, fail = false, move = false, maxScrollY = height + 200 } = {}) {
    const styles = () => {
        const values = new Map([['scroll-behavior', ['smooth', 'important']]]);
        return {
            getPropertyValue: key => values.get(key)?.[0] || '',
            getPropertyPriority: key => values.get(key)?.[1] || '',
            setProperty: (key, value, priority) => values.set(key, [value, priority]),
            removeProperty: key => values.delete(key)
        };
    };
    const root = { style: styles(), scrollLeft: 0, scrollTop: 0, parentElement: null };
    const header = { style: styles(), contains: () => false };
    const draws = [];
    let captures = 0;
    let changed = 0;
    const window = {
        innerWidth: 500, innerHeight: 300, scrollX: 0, scrollY: 80,
        scrollBy({ left, top, behavior }) {
            assert.equal(behavior, 'instant');
            assert.equal(root.style.getPropertyValue('scroll-behavior'), 'auto');
            this.scrollX = Math.max(0, Math.min(width, this.scrollX + left));
            this.scrollY = Math.max(0, Math.min(maxScrollY, this.scrollY + top));
        },
        scrollTo({ left, top }) { this.scrollX = left; this.scrollY = top; }
    };
    const element = {
        parentElement: root,
        scrollIntoView(options) {
            assert.equal(options.behavior, 'instant');
            window.scrollX = 10; window.scrollY = 200;
        },
        getBoundingClientRect() {
            const left = 10 - window.scrollX;
            const top = 200 - window.scrollY + changed;
            return { left, top, right: left + width, bottom: top + height, width, height };
        }
    };
    const canvas = { getContext: () => ({ drawImage: (...args) => draws.push(args) }), toDataURL: () => 'data:image/png;result' };
    const context = vm.createContext({
        window, document: { scrollingElement: root, fonts: { ready: Promise.resolve() },
            querySelectorAll: () => [header], createElement: () => canvas },
        requestAnimationFrame: callback => callback(), setTimeout: callback => callback(), Date,
        Image: class {
            naturalWidth = 500 * scale; naturalHeight = 300 * scale;
            set src(value) { this.onload(); }
        },
        chrome: { runtime: { sendMessage(message, callback) {
            captures++;
            if (move) changed = 10;
            callback(fail ? { ok: false, error: 'capture failed' } : { ok: true, image: 'data:image/png;tile' });
        } } }
    });
    vm.runInContext(captureCode, context);
    return { run: () => context.captureElementScreenshot(element, 'png'), canvas, draws, window, root, header, captures: () => captures };
}

test('captures the question after instant scrolling and restores styles and position', async () => {
    const f = fixture();
    assert.equal(await f.run(), 'data:image/png;result');
    assert.equal(f.captures(), 1);
    assert.equal(f.canvas.width, 600);
    assert.equal(f.canvas.height, 375);
    assert.deepEqual(f.draws[0].slice(1), [0, 0, 600, 375, 0, 0, 600, 375]);
    assert.equal(f.window.scrollY, 80);
    assert.equal(f.root.style.getPropertyValue('scroll-behavior'), 'smooth');
    assert.equal(f.root.style.getPropertyPriority('scroll-behavior'), 'important');
    assert.equal(f.header.style.getPropertyValue('visibility'), '');
});

test('stitches a question taller and wider than the viewport without discarding its end', async () => {
    const f = fixture({ width: 750, height: 850, scale: 2 });
    await f.run();
    assert.equal(f.captures(), 6);
    assert.equal(f.canvas.width, 1500);
    assert.equal(f.canvas.height, 1700);
    const last = f.draws.at(-1);
    assert.equal(last[5] + last[7], 1500);
    assert.equal(last[6] + last[8], 1700);
    assert.equal(f.window.scrollY, 80);
});

test('restores the page when capture fails', async () => {
    const f = fixture({ fail: true });
    await assert.rejects(f.run(), /capture failed/);
    assert.equal(f.window.scrollY, 80);
    assert.equal(f.root.style.getPropertyValue('scroll-behavior'), 'smooth');
    assert.equal(f.header.style.getPropertyValue('visibility'), '');
});

test('crops correctly when the page bottom prevents aligning the question to the viewport top', async () => {
    const f = fixture({ height: 250, maxScrollY: 150 });
    await f.run();
    assert.equal(f.captures(), 1);
    assert.equal(f.draws[0][2], 75);
    assert.equal(f.draws[0][4], 375);
    assert.equal(f.window.scrollY, 80);
});

test('rejects a stale crop if the question moves during capture', async () => {
    const f = fixture({ move: true });
    await assert.rejects(f.run(), /question moved/);
    assert.equal(f.draws.length, 0);
    assert.equal(f.window.scrollY, 80);
});

