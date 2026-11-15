// Browser fixture only: the production scripts use the real Chrome APIs.
(() => {
    const changed = [];
    const messages = [];
    const values = {};
    window.chrome = {
        storage: {
            onChanged: { addListener: listener => changed.push(listener) },
            local: {
                async get(defaults) { return { ...defaults }; },
                async set() {}
            },
            sync: {
                async get(defaults, callback) {
                    const result = { ...defaults, ...values };
                    callback?.(result);
                    return result;
                },
                async set(patch) {
                    const changes = Object.fromEntries(Object.entries(patch).map(([key, newValue]) => [key, { oldValue: values[key], newValue }]));
                    Object.assign(values, patch);
                    for (const listener of changed) listener(changes, 'sync');
                }
            }
        },
        runtime: {
            onMessage: { addListener: listener => messages.push(listener) },
            sendMessage(message, callback) { callback?.({ ok: true }); },
            getManifest: () => ({ version: '3.0.0' })
        },
        tabs: {
            async query() { return [{ id: 1, url: location.origin + '/webwork2/test' }]; },
            async sendMessage(id, message) {
                let reply = { ok: true, peeking: false };
                for (const listener of messages) listener(message, {}, result => { reply = result; });
                return reply;
            },
            reload() {}, create() {}
        },
        permissions: { async contains() { return true; } },
        scripting: { async getRegisteredContentScripts() { return [{ id: 'test' }]; } }
    };
})();
