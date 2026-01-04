console.log("[WeBWorKer] worker.js");

try {
    importScripts("ext-config.js");
} catch(e) {
    console.error(e);
}

chrome.runtime.onInstalled.addListener(async (details) => {
    ExtConfig.configureAction();
    await ExtConfig.tryEnableGlobal();
    
    // Open onboarding page on install or update
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'onboarding.html' });
    } else if (details.reason === 'update') {
        // Check if user wants to see onboarding on updates
        chrome.storage.local.get(['showOnboardingOnUpdate'], (result) => {
            if (result.showOnboardingOnUpdate !== false) { // default true
                chrome.tabs.create({ url: 'onboarding.html' });
            }
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) {
        return;
    }

    // Handle side panel open request
    if (message.type === 'weworker.openSidePanel') {
        // Get tab ID from sender if not provided
        const tabId = message.tabId || (sender && sender.tab && sender.tab.id);
        
        if (tabId) {
            chrome.sidePanel.open({ tabId: tabId })
                .then(() => {
                    sendResponse({ ok: true });
                })
                .catch((error) => {
                    sendResponse({ ok: false, error: error.message });
                });
        } else {
            sendResponse({ ok: false, error: 'No tab ID available' });
        }
        return true;
    }

    if (message.type === 'weworker.ensureCapturePermission') {
        const origins = ['<all_urls>'];
        chrome.permissions.contains({ origins }, (has) => {
            if (chrome.runtime.lastError) {
                sendResponse({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            if (has) {
                sendResponse({ ok: true, granted: true });
                return;
            }
            chrome.permissions.request({ origins }, (granted) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ ok: false, error: chrome.runtime.lastError.message });
                    return;
                }
                if (!granted) {
                    sendResponse({ ok: false, granted: false, error: 'Screenshot permission was not granted.' });
                    return;
                }
                sendResponse({ ok: true, granted: true });
            });
        });
        return true;
    }

    if (!message || message.type !== 'weworker.captureVisibleTab') {
        return;
    }

    if (!sender || !sender.tab) {
        sendResponse({ ok: false, error: 'Missing sender tab context' });
        return;
    }

    const format = message.format === 'jpeg' ? 'jpeg' : 'png';
    const options = { format };
    if (format === 'jpeg' && typeof message.quality === 'number') {
        options.quality = Math.max(0, Math.min(100, message.quality));
    }

    chrome.tabs.captureVisibleTab(sender.tab.windowId, options, (dataUrl) => {
        if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            return;
        }

        if (!dataUrl) {
            sendResponse({ ok: false, error: 'captureVisibleTab returned empty data' });
            return;
        }

        sendResponse({ ok: true, image: dataUrl });
    });

    return true;
});
