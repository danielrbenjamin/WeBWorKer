// wwscript.js
/**
 * @fileoverview Main script for WeBWorKer parenthesis checker feature.
 * This script initializes the parenthesis checker and its associated UI floater.
 * It retrieves user settings for enabling the feature and then delegates
 * the UI management and checking logic to imported modules.
 * Adapted by Daniel Benjamin from wwchecker by james yuzawa.
 */

import { checkMatchingBrackets } from './lib/modules/parenthesisChecker.js';
import { initParenthesisFloater } from './lib/modules/parenthesisFloater.js';

console.log("[WeBWorKer] wwscript.js - Parenthesis Checker initializing...");

/**
 * Tracks whether the parenthesis checking feature is active.
 * This is determined by user settings retrieved from chrome.storage.sync.
 * @type {boolean}
 */
let checkerFeatureActive = false; // Default value, will be updated from storage

/**
 * Returns the current state of the `checkerFeatureActive` flag.
 * This function is passed to the parenthesisFloater module to allow it
 * to dynamically check if the feature is enabled.
 * @returns {boolean} True if the checker is active, false otherwise.
 */
function isCheckerFeatureActive() {
    return checkerFeatureActive;
}

// Initialize checker state from storage and then initialize the floater UI.
// The `checkParenthesesEnabled` key in storage determines if the feature is on.
// This needs to happen after the DOM is ready for UI manipulations.
$(document).ready(function() {
    chrome.storage.sync.get({ checkParenthesesEnabled: true }, function(result) {
        checkerFeatureActive = result.checkParenthesesEnabled;
        console.log(`[WeBWorKer] Parenthesis checker feature is ${checkerFeatureActive ? 'enabled' : 'disabled'} based on user settings.`);

        // Initialize the floater UI.
        // initParenthesisFloater handles creating the floater element,
        // binding events to relevant input fields, and window resize/scroll.
        // It will internally use isCheckerFeatureActive to decide whether to show/hide itself.
        initParenthesisFloater(isCheckerFeatureActive, checkMatchingBrackets);
        
        // If the feature is initially disabled, we might not even call init,
        // or initParenthesisFloater itself checks this and does minimal setup.
        // The current structure of initParenthesisFloater suggests it should be called regardless,
        // and it will respect the checkerFeatureActive status.
    });
});


// Listener for messages from other parts of the extension (e.g., popup)
// This allows the checkerFeatureActive state to be updated dynamically if the user
// changes settings while the page is open.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleParenthesisChecker') { // Ensure this action matches popup.js
        checkerFeatureActive = request.enabled;
        console.log(`[WeBWorKer] Parenthesis checker status updated via message to: ${checkerFeatureActive ? 'enabled' : 'disabled'}`);
        
        // If the floater UI was already initialized, it will start/stop showing
        // based on the new state of isCheckerFeatureActive().
        // If it wasn't (e.g., if init was conditional), this would be the place to call initParenthesisFloater.
        // Assuming initParenthesisFloater has been called by $(document).ready(),
        // we don't need to call it again. The floater's internal logic should handle visibility.
        // The floater's event handlers for 'input', 'focus' use the passed isCheckerFeatureActive function.

        // It might be useful to explicitly tell the floater to update its state if it's already initialized.
        // For example, if the user disables the feature while a floater is visible.
        // This depends on how initParenthesisFloater handles such dynamic changes.
        // For now, we assume the continuous check via isCheckerFeatureActive in its event handlers is sufficient.

        sendResponse({ success: true, checkerEnabled: checkerFeatureActive });
    }
    return true; // Required for asynchronous sendResponse
});

console.log("[WeBWorKer] wwscript.js - Parenthesis Checker initialization sequence complete.");
