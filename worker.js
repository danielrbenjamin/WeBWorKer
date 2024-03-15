console.log("[WeBWorKer] worker.js");

try {
    importScripts("ext-config.js");
} catch(e) {
    console.error(e);
}

chrome.runtime.onInstalled.addListener(async () => {
    ExtConfig.configureAction();
    await ExtConfig.tryEnableGlobal();
});
