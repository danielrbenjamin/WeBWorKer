console.log("[WeBWorK MathView] bracketeer.js");

/**
 * Based on: https://stackoverflow.com/questions/14015202/highlight-parentheses-inside-input-box
 */

var Bracketeer = new function () {

    var HIGHLIGHT_ID_PREFIX = "brcktr_highlight";
    var WRAPPER_ID_PREFIX = "brcktr_wrapper";

    var WRAPPER_CSS_CLASS = "brcktr-wrapper"

    var BRACKET_CSS_CLASS_PREFIX    = "brcktr-paren";     // see bracketeer.css
    var BRACKET_CSS_CLASS_UNMATCHED = "brcktr-unmatched"; // see bracketeer.css
    var BRACKET_CSS_CLASS_SELECTED  = "brcktr-selected";  // see bracketeer.css
    var NUM_BRACKET_COLORS          = 5;                  // see bracketeer.css

    this.BRCKTR_ATTR_ATTACHED = "brcktr_attached";

    var generateHighlightId = function (idx) {
        return `${HIGHLIGHT_ID_PREFIX}-${idx}`;
    };

    var generateWrapperId = function (idx) {
        return `${WRAPPER_ID_PREFIX}-${idx}`;
    };

    var createHighlight = function (idx, width, height, font) {
        var highlight = document.createElement("pre");
        highlight.id = generateHighlightId(idx);
        highlight.style.width = `${width}px`;
        highlight.style.height = `${height}px`;
        highlight.style.lineHeight = `${height}px`;
        highlight.style.fontSize = font.size;
        highlight.style.fontFamily = font.family;
        return highlight;
    };

    var createWrapper = function (idx, width, height) {
        var wrapper = document.createElement("div");
        wrapper.id = generateWrapperId(idx);
        wrapper.className = WRAPPER_CSS_CLASS;
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        return wrapper;
    };

    var createBracketHighlight = function (matched, selected, depth, str) {
        var span = document.createElement("span");
        if (selected) {
            // Selected overrides matches
            span.className = BRACKET_CSS_CLASS_SELECTED;
        } else if (matched) {
            // Skip for now
            // span.className = `${BRACKET_CSS_CLASS_PREFIX}-${depth % NUM_BRACKET_COLORS}`;
        } else {
            span.className = BRACKET_CSS_CLASS_UNMATCHED;
        }
        span.textContent = str;
        return span;
    }

    this.hasBracketeer = function (inputSource) {
        return inputSource.hasAttribute(this.BRCKTR_ATTR_ATTACHED);
    };

    this.attachBracketeer = function (idx, inputSource, font) {
        // Flag the input as having a Bracketeer attached
        inputSource.setAttribute(this.BRCKTR_ATTR_ATTACHED, idx);

        // Measure input
        var width = inputSource.offsetWidth;
        var height = inputSource.offsetHeight;

        // Create elements
        var wrapper = createWrapper(idx, width, height);
        var highlight = createHighlight(idx, width, height, font);

        // Insert elements into DOM
        inputSource.parentNode.insertBefore(wrapper, inputSource);
        inputSource.parentNode.removeChild(inputSource);
        wrapper.appendChild(highlight);
        wrapper.appendChild(inputSource);

        // Style the input
        inputSource.style.width = `${width}px`;
        inputSource.style.height = `${height}px`;

        // Attach the onkeyup event
        var callback = function () {
            Bracketeer.highlightBrackets(this, idx);
        };
        inputSource.addEventListener("input", callback);    // Update highlight when text changes
        inputSource.addEventListener("mouseup", callback);  // Highlight brackets based on cursor position
        inputSource.addEventListener("keyup", callback);    // Highlight brackets based on cursor position
        inputSource.addEventListener("scroll", callback);   // Update highlight scroll when input scrolls
        inputSource.addEventListener("focusout", callback); // Un-highlight brackets when input loses focus
    };

    this.highlightBrackets = function (input, idx) {
        var TYPE_OPEN = 0;
        var TYPE_CLOSE = 1;

        var OPENERS = ["(", "[", "{", "<", "|"];
        var CLOSERS = [")", "]", "}", ">", "|"];

        function TextToken(text) {
            this.text = text;
        }

        TextToken.prototype.serialize = function () {
            return this.text;
        }

        function BracketToken(matched, depth, type, bracketIdx, selected, charIdx) {
            this.matched = matched;
            this.depth = depth;
            this.type = type;
            this.bracketIdx = bracketIdx;
            this.selected = selected;
            this.charIdx = charIdx;
        }

        BracketToken.prototype.serialize = function () {
            if (this.type == TYPE_OPEN) {
                return createBracketHighlight(this.matched, this.selected, this.depth, OPENERS[this.bracketIdx]).outerHTML;
            } else if (this.type == TYPE_CLOSE) {
                return createBracketHighlight(this.matched, this.selected, this.depth, CLOSERS[this.bracketIdx]).outerHTML;
            }
            return "";
        }

        var inputStr = input.value;
        var position = input.selectionStart;
        var scrollPos = input.scrollLeft;

        if (document.activeElement != input) {
            // Don't highlight any brackets if the input isn't focused
            position = 0;
        }

        var bracket_stack = [];
        var token_list = [];
        var selectionChosen = false;

        // Iterate over the string to process brackets
        for (var i = 0; i < inputStr.length; i++) {
            var char = inputStr.charAt(i);

            var bracketIdx;

            if ((bracketIdx = OPENERS.indexOf(char)) !== -1) {
                // Opener
                var token = new BracketToken(false, bracket_stack.length, TYPE_OPEN, bracketIdx, false/*(position === i)*/, i);
                bracket_stack.push(token);
                token_list.push(token);
            } else if ((bracketIdx = CLOSERS.indexOf(char)) !== -1) {
                // Closer
                var token = new BracketToken(false, (bracket_stack.length - 1), TYPE_CLOSE, bracketIdx, false, i);
                if (bracket_stack.length > 0) {
                    var last_bracket = bracket_stack[bracket_stack.length - 1];
                    if (last_bracket.bracketIdx === token.bracketIdx) {
                        // Brackets match
                        last_bracket.matched = true;
                        token.matched = true;

                        // Check for selected
                        if (!selectionChosen && (position <= i) && (position > last_bracket.charIdx)) {
                            selectionChosen = true;
                            last_bracket.selected = true;
                            token.selected = true;
                        }

                        // if (position === i) {
                        //     // "select" the matching bracket if the current closer is selected
                        //     last_bracket.selected = true;
                        //     token.selected = true;
                        // } else if (last_bracket.selected) {
                        //     // "select" this bracket if the matching bracket is selected
                        //     token.selected = true;
                        // }

                        bracket_stack.pop();
                    }
                }
                token_list.push(token);
            } else {
                // Text
                var token = new TextToken(char);
                token_list.push(token);
            }
        }

        // Iterate over the tokens to generate the final HTML string
        var htmlString = ""; // HTML to insert into the highlight element
        for (var i = 0; i < token_list.length; i++) {
            var token = token_list[i];
            htmlString = htmlString.concat(token.serialize());
        }

        var highlightEle = document.getElementById(generateHighlightId(idx));
        highlightEle.innerHTML = htmlString;
        highlightEle.scrollLeft = scrollPos;
    }

};
