const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
    const scripts = new Map();
    const stored = {};
    const notifications = [];
    let messageHandler;
    let permitted = true;
    let permissionRequests = 0;
    const context = vm.createContext({
        URL, Date, Math, Promise, console: { log() {}, error() {} }, importScripts() {},
        chrome: {
            runtime: { onInstalled: { addListener() {} }, onMessage: { addListener(fn) { messageHandler = fn; } } },
            permissions: {
                async contains() { return permitted; },
                async request() { permissionRequests++; permitted = true; return true; }
            },
            storage: { local: {
                async get(defaults) { return { ...defaults, ...stored }; },
                async set(patch) { Object.assign(stored, patch); if (patch.weworkerSiteConfigChanged) notifications.push(patch); }
            } },
            scripting: {
                async getRegisteredContentScripts({ ids }) { return ids.filter(id => scripts.has(id)).map(id => scripts.get(id)); },
                async registerContentScripts(specs) { specs.forEach(spec => scripts.set(spec.id, spec)); },
                async updateContentScripts(specs) { specs.forEach(spec => scripts.set(spec.id, spec)); },
                async unregisterContentScripts({ ids }) { ids.forEach(id => scripts.delete(id)); }
            }
        }
    });
    for (const file of ['ext-config.js', 'worker.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    }
    return {
        config: context.ExtConfig, stored, notifications,
        revokePermission() { permitted = false; },
        permissionRequests: () => permissionRequests,
        query(url) {
            return new Promise(resolve => messageHandler({ type: 'weworker.getSiteEnabled' }, { url, tab: { url } }, resolve));
        }
    };
}

test('global enable and disable govern the Study Mode activation query', async () => {
    const f = fixture();
    await f.config.tryEnableGlobal();
    assert.equal((await f.query('https://school.example/webwork2/course')).enabled, true);
    await f.config.disableGlobal();
    assert.equal((await f.query('https://school.example/webwork2/course')).enabled, false);
    assert.equal(f.notifications.length, 2);
});

test('site-specific enablement only applies to that school', async () => {
    const f = fixture();
    await f.config.addWebworkSite('https://first.example/webwork2/course');
    assert.equal((await f.query('https://first.example/webwork2/course')).enabled, true);
    assert.equal((await f.query('https://second.example/webwork2/course')).enabled, false);
    await f.config.removeWebworkSite('https://first.example/webwork2/course');
    assert.equal((await f.query('https://first.example/webwork2/course')).enabled, false);
});

test('turning off global activation preserves explicitly enabled sites', async () => {
    const f = fixture();
    await f.config.addWebworkSite('https://first.example/webwork2/course');
    await f.config.tryEnableGlobal();
    await f.config.disableGlobal();
    assert.equal((await f.query('https://first.example/webwork2/course')).enabled, true);
    assert.equal((await f.query('https://second.example/webwork2/course')).enabled, false);
});

test('an extension update does not silently restore a disabled global toggle', async () => {
    const f = fixture();
    await f.config.tryEnableGlobal();
    await f.config.disableGlobal();
    assert.equal(await f.config.tryEnableGlobal(true), false);
    assert.equal((await f.query('https://school.example/webwork2/course')).enabled, false);
    assert.equal(await f.config.tryEnableGlobal(), true);
    assert.equal((await f.query('https://school.example/webwork2/course')).enabled, true);
});

test('site activation requests missing permission before registration', async () => {
    const f = fixture();
    f.revokePermission();
    await f.config.addWebworkSite('https://school.example/webwork2/course');
    assert.equal(f.permissionRequests(), 1);
    assert.equal((await f.query('https://school.example/webwork2/course')).enabled, true);
});

test('invalid sender contexts are inactive', async () => {
    const f = fixture();
    await f.config.tryEnableGlobal();
    assert.equal((await f.query('chrome://extensions')).enabled, false);
});
