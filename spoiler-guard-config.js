/* Shared WeBWorKer settings for the MIT-licensed Spoiler Guard integration.
 * Original feature: Abhinav Nair, https://github.com/Palingenos/Webwork-Spoiler-Guard
 * See LICENSES/WeBWorK Spoiler Guard LICENSE.txt.
 */
var SpoilerGuardConfig = (() => {
    const defaults = {
        enabled: false,
        answers: true,
        results: true,
        scores: true,
        solutions: true,
        clearAnswers: true,
        forceParams: true,
        showPanel: true,
        mode: 'hide',
        extraSelectors: '',
        disabledHosts: []
    };
    const storageKey = key => 'spoilerGuard' + key[0].toUpperCase() + key.slice(1);
    const storageDefaults = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [storageKey(key), value]));
    const decode = stored => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, stored[storageKey(key)] ?? value]));
    return {
        defaults, storageKey, storageDefaults, decode,
        async read() { return decode(await chrome.storage.sync.get(storageDefaults)); },
        async save(patch) {
            await chrome.storage.sync.set(Object.fromEntries(Object.entries(patch).map(([key, value]) => [storageKey(key), value])));
        }
    };
})();
