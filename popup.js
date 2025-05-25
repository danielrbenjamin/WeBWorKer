/**
 * @file popup.js
 * @description Script for the WeBWorKer extension's popup UI.
 * This script handles user interactions within the popup, such as enabling/disabling the extension
 * for the current site or globally, and toggling specific features.
 * It communicates with the `ExtConfig` module for configuration changes and
 * uses `chrome.storage.sync` to save feature toggle states.
 */

// DOM element references for UI controls in the popup.

/**
 * @type {HTMLInputElement} Checkbox to enable/disable the extension for the current WeBWorK site.
 */
var enableThisSiteButton = document.getElementById("enableThisSite");

/**
 * @type {HTMLInputElement} Checkbox to enable/disable the extension globally for all WeBWorK sites.
 */
var enableGlobalButton = document.getElementById("enableGlobal");

/**
 * @type {HTMLInputElement} Checkbox to toggle the "Clear Answers" button feature.
 */
var toggleClearAnswersButton = document.getElementById("toggleClearAnswers");

/**
 * @type {HTMLInputElement} Checkbox to toggle the "Piazza Button" feature.
 */
var togglePiazzaButton = document.getElementById("togglePiazzaButton");

/**
 * @type {HTMLInputElement} Checkbox to toggle the "Online Resources Button" feature.
 */
var toggleResourcesButton = document.getElementById("toggleResourcesButton");

/**
 * @type {HTMLInputElement} Checkbox to toggle the parenthesis checking feature.
 */
var toggleCheckParenthesesButton = document.getElementById("toggleCheckParentheses");

/**
 * @type {HTMLInputElement} Checkbox to toggle the "Screenshot Button" feature.
 */
var toggleScreenshotButton = document.getElementById("toggleScreenshotButton");

/**
 * @type {HTMLAnchorElement} Link to refresh the current active page.
 */
var refreshPageLink = document.getElementById("refreshPage");

/**
 * @async
 * @function refreshTogglesUI
 * @description Updates the state of UI toggles (checkboxes) in the popup.
 * It checks the current tab's URL against stored WeBWorK site configurations (local and global)
 * and retrieves feature toggle states from `chrome.storage.sync` to reflect them in the UI.
 * Disables the "Enable for this site" toggle if global mode is active.
 */
var refreshTogglesUI = async () => {
    try {
        // Get the currently active tab in the current window.
        var [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if the current site is registered either locally or globally.
        var isSiteEnabled = await ExtConfig.hasWebworkSite(activeTab.url);
        var isGlobalModeEnabled = await ExtConfig.hasGlobalWebworkSite();

        // Set the "Enable for this site" toggle based on local or global registration.
        enableThisSiteButton.checked = isSiteEnabled || isGlobalModeEnabled;

        if (isGlobalModeEnabled) {
            // If global mode is on, disable the site-specific toggle and check the global toggle.
            enableThisSiteButton.setAttribute("disabled", "true"); // Use "true" as string for setAttribute
            enableGlobalButton.checked = true;
        } else {
            // If global mode is off, enable the site-specific toggle and uncheck the global toggle.
            enableThisSiteButton.removeAttribute("disabled");
            enableGlobalButton.checked = false;
        }

        // Retrieve current feature toggle states from storage.
        // Default values are provided in case they haven't been set yet.
        chrome.storage.sync.get({
            clearAnswersEnabled: true,     // Default: "Clear Answers" button is enabled.
            piazzaEnabled: true,           // Default: "Piazza Button" is enabled.
            resourcesEnabled: true,        // Default: "Online Resources Button" is enabled.
            checkParenthesesEnabled: true, // Default: Parenthesis checker is enabled.
            screenshotButtonEnabled: true  // Default: "Screenshot Button" is enabled.
        }, (settings) => {
            // Update UI toggles with the retrieved or default settings.
            toggleClearAnswersButton.checked = settings.clearAnswersEnabled;
            togglePiazzaButton.checked = settings.piazzaEnabled;
            toggleResourcesButton.checked = settings.resourcesEnabled;
            toggleCheckParenthesesButton.checked = settings.checkParenthesesEnabled;
            toggleScreenshotButton.checked = settings.screenshotButtonEnabled;
        });
    } catch (error) {
        // Log any errors encountered during UI refresh.
        console.error('[WeBWorKer Popup] Error refreshing toggles UI:', error);
    }
};

/**
 * Event listener for the "Enable for this site" toggle.
 * Adds or removes the current site's URL from the WeBWorK configuration
 * and attempts to inject scripts if the site is being enabled.
 */
enableThisSiteButton.addEventListener("click", async () => {
    try {
        var [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (enableThisSiteButton.checked) {
            // If checked, add the current site and inject scripts.
            if (await ExtConfig.addWebworkSite(activeTab.url)) {
                console.log("[WeBWorKer Popup] Site registration successful:", activeTab.url);
                await ExtConfig.directInject(activeTab.id); // Inject scripts into the active tab.
            } else {
                console.warn("[WeBWorKer Popup] Site registration failed:", activeTab.url);
            }
        } else {
            // If unchecked, remove the current site from configuration.
            await ExtConfig.removeWebworkSite(activeTab.url);
            console.log("[WeBWorKer Popup] Site removed:", activeTab.url);
        }
    } catch (error) {
        console.error('[WeBWorKer Popup] Error handling "Enable for this site" toggle:', error);
    }
});

/**
 * Event listener for the "Enable Globally" toggle.
 * Enables or disables global mode for WeBWorK sites.
 * Refreshes UI toggles and attempts to inject scripts if global mode is being enabled.
 */
enableGlobalButton.addEventListener("click", async () => {
    try {
        var [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (enableGlobalButton.checked) {
            // If checked, attempt to enable global mode.
            if (await ExtConfig.tryEnableGlobal()) {
                console.log("[WeBWorKer Popup] Global mode enabled successfully.");
                await ExtConfig.directInject(activeTab.id); // Inject scripts into the active tab.
            } else {
                console.warn("[WeBWorKer Popup] Failed to enable global mode.");
            }
        } else {
            // If unchecked, disable global mode.
            await ExtConfig.disableGlobal();
            console.log("[WeBWorKer Popup] Global mode disabled.");
        }
        // Refresh all UI toggles to reflect the change in global state.
        await refreshTogglesUI();
    } catch (error) {
        console.error('[WeBWorKer Popup] Error handling "Enable Globally" toggle:', error);
    }
});

/**
 * Event listener for the "Clear Answers" feature toggle.
 * Saves the toggle state to `chrome.storage.sync`.
 */
toggleClearAnswersButton.addEventListener("click", async () => {
    var isEnabled = toggleClearAnswersButton.checked;
    await chrome.storage.sync.set({ 'clearAnswersEnabled': isEnabled });
    console.log(`[WeBWorKer Popup] "Clear Answers" feature ${isEnabled ? 'enabled' : 'disabled'}.`);
});

/**
 * Event listener for the "Piazza Button" feature toggle.
 * Saves the toggle state to `chrome.storage.sync`.
 */
togglePiazzaButton.addEventListener("click", async () => {
    var isEnabled = togglePiazzaButton.checked;
    await chrome.storage.sync.set({ 'piazzaEnabled': isEnabled });
    console.log(`[WeBWorKer Popup] "Piazza Button" feature ${isEnabled ? 'enabled' : 'disabled'}.`);
});

/**
 * Event listener for the "Online Resources Button" feature toggle.
 * Saves the toggle state to `chrome.storage.sync`.
 */
toggleResourcesButton.addEventListener("click", async () => {
    var isEnabled = toggleResourcesButton.checked;
    await chrome.storage.sync.set({ 'resourcesEnabled': isEnabled });
    console.log(`[WeBWorKer Popup] "Resources Button" feature ${isEnabled ? 'enabled' : 'disabled'}.`);
});

/**
 * Event listener for the parenthesis checking feature toggle.
 * Saves the toggle state to `chrome.storage.sync`.
 */
toggleCheckParenthesesButton.addEventListener("click", async () => {
    var isEnabled = toggleCheckParenthesesButton.checked;
    await chrome.storage.sync.set({ 'checkParenthesesEnabled': isEnabled });
    console.log(`[WeBWorKer Popup] Parenthesis checker ${isEnabled ? 'enabled' : 'disabled'}.`);
    // Optionally, send a message to content scripts if they need to react immediately.
    // chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    //     if (tabs[0] && tabs[0].id) {
    //         chrome.tabs.sendMessage(tabs[0].id, { action: "toggleParenthesisChecker", enabled: isEnabled });
    //     }
    // });
});

/**
 * Event listener for the "Screenshot Button" feature toggle.
 * Saves the toggle state to `chrome.storage.sync`.
 */
toggleScreenshotButton.addEventListener("click", async () => {
    var isEnabled = toggleScreenshotButton.checked;
    await chrome.storage.sync.set({ 'screenshotButtonEnabled': isEnabled });
    console.log(`[WeBWorKer Popup] "Screenshot Button" feature ${isEnabled ? 'enabled' : 'disabled'}.`);
});

/**
 * Event listener for the "Refresh Page" link.
 * Reloads the currently active tab.
 * @param {Event} event - The click event object.
 */
refreshPageLink.addEventListener("click", (event) => {
    event.preventDefault(); // Prevent default link behavior.
    try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.reload(tabs[0].id);
            } else {
                console.warn("[WeBWorKer Popup] Could not find active tab to refresh.");
            }
        });
    } catch (error) {
        console.error('[WeBWorKer Popup] Error refreshing page:', error);
    }
});

// Initialize the UI toggle states when the popup is opened.
refreshTogglesUI();
console.log("[WeBWorKer Popup] Script loaded and initialized.");
