/**
 * @fileoverview Provides the MathView object, responsible for rendering
 * mathematical expressions (ASCIIMath) into a visually readable format
 * (KaTeX or MathJax) within designated HTML elements, typically associated
 * with input fields.
 */
console.log("[WeBWorKer] math-view.js loading...");

/**
 * @namespace MathView
 * @description Manages the creation, updating, and display of mathematical expressions.
 * It attaches to input fields and renders their ASCIIMath content in a separate
 * view element using KaTeX, with an optional fallback to MathJax.
 * This is instantiated as a singleton object.
 */
var MathView = new function () {

    /**
     * @const {string} MV_ATTR_ATTACHED
     * @description HTML attribute name used to mark an input element as having a MathView instance attached.
     * The value of this attribute is typically the ID assigned to the MathView instance.
     * @public
     */
    this.MV_ATTR_ATTACHED = "mv_attached";

    /**
     * @const {boolean} USE_MATHJAX_BACKUP
     * @description Flag to determine whether to use MathJax as a backup rendering engine
     * if KaTeX fails. Defaults to false. It also checks if MathJax is defined globally.
     * @private
     */
    var USE_MATHJAX_BACKUP = false && (window.MathJax !== undefined); // Ensure MathJax global object exists if true

    /**
     * @const {string} MV_CSS_CLASS_MATH_OUT
     * @description CSS class name applied to the <div> elements that display the rendered math.
     * @private
     */
    var MV_CSS_CLASS_MATH_OUT = "mv_mathout";

    /**
     * @const {string} MV_MATH_OUT_ID_PRE
     * @description Prefix used for generating unique IDs for the math output <div> elements.
     * @private
     */
    var MV_MATH_OUT_ID_PRE = "mv_out_"; // Added underscore for better readability

    /**
     * Checks if an input element has a MathView instance currently attached to it.
     * @param {HTMLInputElement|HTMLTextAreaElement} inputElement The input element to check.
     * @returns {boolean} True if MathView is attached, false otherwise.
     * @public
     */
    this.hasMathView = function (inputElement) {
        if (!inputElement || typeof inputElement.hasAttribute !== 'function') {
            console.warn("[MathView] hasMathView: Invalid inputElement provided.");
            return false;
        }
        return inputElement.hasAttribute(this.MV_ATTR_ATTACHED);
    };

    /**
     * Generates a unique ID for a MathView output element.
     * @param {number|string} viewId The base ID of the MathView instance (typically from the input).
     * @param {string} subIdentifier A suffix to differentiate multiple output elements for the same MathView (e.g., "a" or "b" for double buffering).
     * @returns {string} The generated unique ID.
     * @private
     */
    var generateMathViewId = function (viewId, subIdentifier) {
        return MV_MATH_OUT_ID_PRE + viewId + "_" + subIdentifier;
    };

    /**
     * Creates a sub <div> element for holding rendered mathematical output.
     * This element will display the math rendered by KaTeX or MathJax.
     * @param {number|string} viewId The ID of the corresponding MathView instance.
     * @param {string} subIdentifier Another identifier (e.g., "a", "b") to make the element ID unique.
     * @param {string} defaultAsciiMathValue The initial ASCIIMath string to display.
     * @returns {HTMLDivElement} The created <div> element for math output.
     * @private
     */
    var createMathOutputElement = function (viewId, subIdentifier, defaultAsciiMathValue) {
        var mathOutputDiv = document.createElement("div");
        mathOutputDiv.id = generateMathViewId(viewId, subIdentifier);
        mathOutputDiv.className = MV_CSS_CLASS_MATH_OUT;
        // Initialize with the ASCIIMath string; rendering will happen later.
        // For KaTeX, this textContent isn't directly used for rendering but can be a fallback.
        mathOutputDiv.textContent = defaultAsciiMathValue;
        return mathOutputDiv;
    };

    /**
     * Creates and configures a <div> container for MathView, which will hold the
     * rendered mathematical expressions associated with an input field.
     * It sets up double buffering for smoother updates when using MathJax.
     * @param {number|string} viewId The unique ID for this MathView instance, typically derived from the input field.
     * @param {HTMLInputElement|HTMLTextAreaElement} inputElement The input element to which this MathView is attached.
     * @returns {HTMLDivElement} The main container <div> for the MathView display elements.
     * @public
     */
    this.createMathView = function (viewId, inputElement) {
        // Flag the input element as having a MathView attached, storing the viewId.
        inputElement.setAttribute(this.MV_ATTR_ATTACHED, viewId);

        // Add an event listener to the input field to update the MathView on input.
        inputElement.addEventListener("input", function () {
            var currentInputValue = this.value;
            MathView.updateMath(viewId, currentInputValue);

            // Toggle MathView visibility based on whether the input field has content.
            // The 'mathViewContainer' is the parent div created below.
            if (currentInputValue.trim() !== "") {
                mathViewContainer.style.display = "inline-block"; // Or "block" depending on desired layout
            } else {
                mathViewContainer.style.display = "none";
            }
        });

        // Create two math output elements for double buffering.
        // This helps prevent flickering during updates, especially with MathJax.
        var mathOutputPrimary = createMathOutputElement(viewId, "a", inputElement.value);
        var mathOutputSecondary = createMathOutputElement(viewId, "b", inputElement.value);
        mathOutputSecondary.style.display = "none"; // The secondary buffer is initially hidden.

        // Create the main parent <div> that will contain the two output elements.
        var mathViewContainer = document.createElement("div");
        // MathView is initially hidden if the input is empty, this is handled by the input event listener.
        // Set initial display state based on current input value.
        mathViewContainer.style.display = inputElement.value.trim() !== "" ? "inline-block" : "none";

        mathViewContainer.appendChild(mathOutputPrimary);
        mathViewContainer.appendChild(mathOutputSecondary);

        return mathViewContainer;
    };

    /**
     * Retrieves a specific MathView output element (primary or secondary buffer) by its ID.
     * @param {number|string} viewId The base ID of the MathView instance.
     * @param {string} subIdentifier The suffix ("a" or "b") of the output element.
     * @returns {HTMLElement|null} The math output element, or null if not found.
     * @private
     */
    var getMathOutputElementById = function (viewId, subIdentifier) {
        return document.getElementById(generateMathViewId(viewId, subIdentifier));
    };

    /**
     * Hides an HTML element by setting its display style to "none".
     * @param {HTMLElement} element The element to hide.
     * @private
     */
    var hideElement = function (element) {
        if (element && element.style) {
            element.style.display = "none";
        }
    };

    /**
     * Shows an HTML element by setting its display style to "inline-block".
     * @param {HTMLElement} element The element to show.
     * @private
     */
    var showElementAsInlineBlock = function (element) {
        if (element && element.style) {
            element.style.display = "inline-block"; // Or "block" based on layout needs
        }
    };

    /**
     * Updates the text content of an element for MathJax processing.
     * MathJax processes text content enclosed in backticks (`) as ASCIIMath.
     * @param {HTMLElement} element The element whose text content to update.
     * @param {string} asciiMathString The ASCIIMath string.
     * @private
     */
    var setTextContentForMathJax = function (element, asciiMathString) {
        if (element) {
            element.textContent = "`" + asciiMathString + "`";
        }
    };

    /**
     * Renders the provided ASCIIMath string into the specified MathView instance.
     * It uses KaTeX for rendering and can fall back to MathJax if enabled and KaTeX fails.
     * Implements a double buffering strategy to minimize visual disruption during updates.
     * @param {number|string} viewId The ID of the MathView instance to update.
     * @param {string} asciiMathString The ASCIIMath string to render.
     * @public
     */
    this.updateMath = function (viewId, asciiMathString) {
        var outputPrimary = getMathOutputElementById(viewId, "a");    // e.g., mv_out_1_a
        var outputSecondary = getMathOutputElementById(viewId, "b");  // e.g., mv_out_1_b

        if (!outputPrimary || !outputSecondary) {
            console.error("[MathView] updateMath: Output elements not found for viewId:", viewId);
            return;
        }

        try {
            // Attempt to parse ASCIIMath to TeX using a globally available AMTparseMath function.
            // AMTparseMath is not defined in this script; it's expected to be from ASCIIMathTeXImg.js.
            if (typeof AMTparseMath === 'undefined') {
                throw new Error("AMTparseMath function is not defined. ASCIIMathTeXImg.js might be missing.");
            }
            var texString = AMTparseMath(asciiMathString);

            // Double buffering: Render to the hidden buffer first, then swap visibility.
            // This reduces flickering.
            hideElement(outputSecondary);
            katex.render(texString, outputSecondary); // Render TeX to the secondary output element.
            showElementAsInlineBlock(outputSecondary);  // Show the newly rendered content.

            hideElement(outputPrimary);               // Hide the primary (previously visible) output.
            katex.render(texString, outputPrimary);   // Update primary output as well (optional, but good for consistency).
            showElementAsInlineBlock(outputPrimary);  // Re-show primary (now it's the active one again).
            
            hideElement(outputSecondary);             // Hide secondary again, making primary the sole visible buffer.

        } catch (error) {
            console.warn("[MathView] KaTeX rendering failed for viewId:", viewId, error.message);
            // Fallback to MathJax if enabled and KaTeX fails.
            if (USE_MATHJAX_BACKUP && typeof MathJax !== 'undefined' && MathJax.Hub) {
                console.log("[MathView] Attempting MathJax fallback for viewId:", viewId);
                // MathJax processing queue for double buffering
                MathJax.Hub.Queue(
                    [hideElement, outputSecondary],
                    [setTextContentForMathJax, outputSecondary, asciiMathString],
                    ["Typeset", MathJax.Hub, outputSecondary],
                    [showElementAsInlineBlock, outputSecondary],
                    [hideElement, outputPrimary],
                    [setTextContentForMathJax, outputPrimary, asciiMathString],
                    ["Typeset", MathJax.Hub, outputPrimary],
                    [showElementAsInlineBlock, outputPrimary],
                    [hideElement, outputSecondary]
                );
            } else {
                // If no MathJax fallback, display the raw ASCIIMath string or a placeholder.
                // This ensures the user sees something even if rendering fails.
                if (asciiMathString.length > 0) {
                    outputPrimary.textContent = asciiMathString; // Show the raw ASCIIMath.
                } else {
                    // If the input is empty, display a non-breaking space
                    // to maintain the element's height and prevent layout collapse.
                    outputPrimary.innerHTML = "&nbsp;";
                }
                showElementAsInlineBlock(outputPrimary); // Ensure the primary output is visible.
                hideElement(outputSecondary); // Keep secondary hidden.
                if (error.message.includes("AMTparseMath")) { // Specific error for missing parser
                     console.error("[MathView] Critical: AMTparseMath function is missing. Cannot convert ASCIIMath to TeX.");
                }
            }
        }
    };

};

console.log("[WeBWorKer] math-view.js execution finished.");
