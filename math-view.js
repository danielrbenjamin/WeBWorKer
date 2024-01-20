console.log("[WeBWorK MathView] math-view.js");

var MathView = new function () {

    this.MV_ATTR_ATTACHED = "mv_attached";

    var USE_MATHJAX_BACKUP = false && (window.MathJax != undefined);

    var MV_CSS_CLASS_MATH_OUT = "mv_mathout";
    var MV_MATH_OUT_ID_PRE = "mv_out";
    

    /**
     * Checks if an input element has a MathView currently attached to it
     * @param {Element} inputSource the input element to check for an attached MathView
     */
    this.hasMathView = function (inputSource) {
        return inputSource.hasAttribute(this.MV_ATTR_ATTACHED);
    }

    var generateMathViewId = function (id, subIndex) {
        return MV_MATH_OUT_ID_PRE + id + "_" + subIndex;
    };

    /**
     * Creates a sub div for holding math output
     * @param {number} id the id of the corresponding input
     * @param {string} subIndex another identifier that should be unique within a single id
     * @param {string} defaultAMathVal the default ASCIIMath text to insert in the <div>
     */
    var createMathOut = function (id, subIndex, defaultAMathVal) {
        var mathOut = document.createElement("div");
        mathOut.id = generateMathViewId(id, subIndex);
        mathOut.className = MV_CSS_CLASS_MATH_OUT;
        mathOut.textContent = defaultAMathVal;

        return mathOut;
    };

    /**
     * Creates and styles a <div> element to serve as a container for math-formatted text
     * @param {number} id the id of the corresponding input
     * @param {Element} inputSource the input element to attach the MathView to
     */
    this.createMathView = function (id, inputSource) {
        // Flag the input as having a MathView attached
        inputSource.setAttribute(this.MV_ATTR_ATTACHED, id);

        // Attach the onkeyup event
        inputSource.addEventListener("input", function () {
            MathView.updateMath(id, this.value);
        });

        // Create two math containers (a redundant one for while the other is updating if we're using MathJax)
        var mathOutA = createMathOut(id, "a", inputSource.value);
        var mathOutB = createMathOut(id, "b", inputSource.value);
        mathOutB.style.display = "none";

        // Parent <div> for the two math containers
        var mathOut = document.createElement("div");
        mathOut.style.display = "inline-block";

        mathOut.appendChild(mathOutA);
        mathOut.appendChild(mathOutB);

        return mathOut;
    };

    var getMathOut = function (id, subIndex) {
        return document.getElementById(generateMathViewId(id, subIndex));
    };

    var hideOutput = function (element) { element.style.display = "none"; };
    var showOutput = function (element) { element.style.display = "inline-block"; };
    var updateTextMathJax = function (element, amath) { element.textContent = "`" + amath + "`"; };

    /**
     * Renders the provided ASCIIMath into the MathView with the provided id
     * @param {number} id the id of the MathView in which to display the rendered math
     * @param {string} amath the ASCIIMATH to render
     */
    this.updateMath = function (id, amath) {
        var outA = getMathOut(id, "a");
        var outB = getMathOut(id, "b");

        try {
            var texstring = AMTparseMath(amath);
            hideOutput(outB);
            katex.render(texstring, outB);
            showOutput(outB);
            hideOutput(outA);
            katex.render(texstring, outA);
            showOutput(outA);
            hideOutput(outB);
        }
        catch (err) {
            if (USE_MATHJAX_BACKUP) {
                MathJax.Hub.Queue([hideOutput, outB], [updateTextMathJax, outB, amath], ["Typeset", MathJax.Hub, outB], [showOutput, outB],
                    [hideOutput, outA], [updateTextMathJax, outA, amath], ["Typeset", MathJax.Hub, outA], [showOutput, outA], [hideOutput, outB]);
            }
            else {
                if (amath.length > 0) {
                    outA.textContent = amath;
                }
                else {
                    outA.innerHTML = "&nbsp;"; // Add a space so the box retains its height
                }
            }
        }
    };

};