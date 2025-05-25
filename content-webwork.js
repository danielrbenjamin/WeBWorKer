// WeBWorKer
// Version 2.0.0
// Copyright © 2023 WeBWorKer. All rights reserved.
//
// Provides various enhancements for WeBWorK.
// For more information, visit: https://github.com/WeBWorKer/WeBWorKer
// License: MIT

// Main console log to indicate the script is running
console.log("[WeBWorKer] content-webwork.js loading...");

import { initClearAnswersButton } from './lib/modules/clearAnswers.js';
import { initPiazzaButton } from './lib/modules/piazzaButton.js';
import { initResourcesButton } from './lib/modules/resourcesButton.js';
import { initScreenshotButton } from './lib/modules/screenshotButton.js';
import { initSubmitConfirmation } from './lib/modules/submitConfirmation.js';
import { initDuplicateSubmitButton } from './lib/modules/duplicateSubmitButton.js';
import { initPdfEmbedding } from './lib/modules/pdfEmbed.js';
import { initInputEnhancements } from './lib/modules/inputEnhancements.js';
import { initCopyrightFooter } from './lib/modules/copyrightFooter.js';

/**
 * @constant {object} MATH_FONT
 * Configuration for the font used by MathView.
 * Includes size and font family.
 */
const MATH_FONT = {
    "size": "1.21em",
    "family": "KaTeX_Main, Times New Roman, serif"
};

/**
 * Retrieves all elements with the class "codeshard".
 * These are typically the text input elements for answers.
 * @returns {HTMLCollectionOf<Element>} A collection of elements.
 */
function retrieveTextInputs() {
    return document.getElementsByClassName("codeshard");
}

/**
 * Retrieves all elements with the class "pg-select".
 * These are typically the select (dropdown) input elements.
 * @returns {HTMLCollectionOf<Element>} A collection of elements.
 */
function retrieveSelectInputs() {
    return document.getElementsByClassName("pg-select");
}

/**
 * Applies MathView enhancements to input elements.
 * It targets elements returned by `retrieveTextInputs` and, if MathView
 * hasn't been applied yet, initializes MathView for them.
 * It also makes the input containers resizable.
 * Assumes `MathView` object is globally available.
 */
function applyToInputs() {
    console.log("[WeBWorKer] Inserting MathView elements");
    var inputs = retrieveTextInputs();
    for (var i = 0; i < inputs.length; i++) {
        var theInput = inputs[i];

        // If MathView is not yet applied, create MathView
        // Assumes MathView.hasMathView and MathView.createMathView are available
        if (typeof MathView !== 'undefined' && !MathView.hasMathView(theInput)) {
            var aMath = theInput.value;
            var mathView = MathView.createMathView(i, theInput); // `i` is used as an ID here

            // Insert the MathView element after the input's next sibling (if any)
            if (theInput.nextSibling) {
                theInput.nextSibling.insertAdjacentElement('afterend', mathView);
            } else {
                theInput.parentNode.appendChild(mathView);
            }
            MathView.updateMath(i, aMath); // Update with current value

            // Set input attributes for better usability
            theInput.setAttribute("autocomplete", "off");
            theInput.setAttribute("autocorrect", "off");
            theInput.setAttribute("autocapitalize", "off");
            theInput.setAttribute("spellcheck", "false");

            // Create a resizable container around the input box
            var wrapperDiv = document.createElement("div");
            wrapperDiv.className = "resizable-input-container";
            wrapperDiv.style.position = "relative";
            wrapperDiv.style.display = "inline-block"; // Or 'block' depending on layout
            wrapperDiv.style.resize = "horizontal";
            wrapperDiv.style.overflow = "auto";
            wrapperDiv.style.padding = "2px";
            wrapperDiv.style.minWidth = "100px";  // Set minimum width
            wrapperDiv.style.minHeight = "30px"; // Set minimum height (adjust as needed)
            // Ensure the wrapper is not wider than its parent initially
            // wrapperDiv.style.maxWidth = "100%";


            // Insert the wrapper and move the input into it
            if (theInput.parentNode) {
                theInput.parentNode.insertBefore(wrapperDiv, theInput);
                wrapperDiv.appendChild(theInput);
            }


            // Style the input so it fits within the resizable container
            theInput.style.width = "100%";
            theInput.style.height = "100%"; // Make height 100% of wrapper
            theInput.style.boxSizing = "border-box";
            theInput.style.lineHeight = "normal"; // Reset line height for better fitting
            theInput.style.whiteSpace = "nowrap";
            // Remove fixed height from input to allow wrapper to control it
            // theInput.style.height = "30px"; // Fixed height to prevent vertical resizing
        }
    }
    console.log("[WeBWorKer] MathView rendering process completed (if applicable).");
}


/**
 * Main asynchronous function to initialize all WeBWorKer features.
 * This function is called by `webworkSetup` after the DOM is ready.
 * It calls `applyToInputs` and then initializes all imported modules.
 * @async
 */
async function main() {
    console.log("[WeBWorKer] Starting main initialization...");
    applyToInputs(); // Apply MathView transformations first.

    // Initialize all imported modules.
    // Pass `retrieveTextInputs`, `retrieveSelectInputs`, and `MathView` to `initClearAnswersButton`.
    // `MathView` and `html2canvas` are assumed to be globally available for relevant modules.
    try {
        await initClearAnswersButton(retrieveTextInputs, retrieveSelectInputs, typeof MathView !== 'undefined' ? MathView : null);
        await initPiazzaButton();
        await initResourcesButton();
        await initScreenshotButton(); // Assumes html2canvas is global
        initSubmitConfirmation();
        initDuplicateSubmitButton();
        initPdfEmbedding();
        initInputEnhancements();
        initCopyrightFooter();
        console.log("[WeBWorKer] All modules initialized successfully.");
    } catch (error) {
        console.error("[WeBWorKer] Error initializing modules:", error);
    }
}

/**
 * Sets up and runs the WeBWorKer extension's main functionality.
 * It waits for the DOM to be fully loaded before executing `main`.
 */
var webworkSetup = async function () {
    // Check if the "problem-content" div is available, which is a good indicator that the page is mostly loaded.
    // This is a more specific check than just `document.readyState`.
    var problemContent = document.querySelector(".problem-content");

    if (!problemContent && document.readyState === "loading") {
        console.log("[WeBWorKer] 'problem-content' not yet available, DOM is loading. Waiting for DOMContentLoaded.");
        document.addEventListener("DOMContentLoaded", function () {
            console.log("[WeBWorKer] DOMContentLoaded event fired. Running main function.");
            main();
        });
    } else if (!problemContent) {
        console.log("[WeBWorKer] 'problem-content' not yet available, but DOM is interactive or complete. Running main function with a delay.");
        // Fallback if DOMContentLoaded already fired but problem-content is still missing (e.g. dynamic content)
        // Consider a small delay or a more robust check if this case is common.
        setTimeout(main, 500); // Wait a bit for dynamic content
    }
    else {
        console.log("[WeBWorKer] 'problem-content' is available. Running main function.");
        main();
    }
};

// Execute the setup function to start the extension.
webworkSetup();

console.log("[WeBWorKer] content-webwork.js execution finished.");
