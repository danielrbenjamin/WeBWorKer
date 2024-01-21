console.log("[WeBWorK MathView] content-webwork.js");

// Prepare function to setup MathView on a webwork page
var webworkSetup = function () {
    var MATH_FONT = {
        "size": "1.21em",
        "family": "KaTeX_Main, Times New Roman, serif"
    }

    var retrieveTextInputs = function () {
        return document.getElementsByClassName("codeshard");
    }

    var retrieveSelectInputs = function () {
        return document.getElementsByClassName("pg-select");
    }

    var applyToInputs = function () {
        console.log("[WeBWorK MathView] Inserting MathView elements");
        var inputs = retrieveTextInputs();
        for (var i = 0; i < inputs.length; i++) {
            var theInput = inputs[i];

            if (!MathView.hasMathView(theInput)) {
                var aMath = theInput.value;

                var mathView = MathView.createMathView(i, theInput);

                theInput.nextSibling.insertAdjacentElement('afterend', mathView);
                MathView.updateMath(i, aMath);

                theInput.setAttribute("autocomplete", "off");
                theInput.setAttribute("autocorrect", "off");
                theInput.setAttribute("autocapitalize", "off");
                theInput.setAttribute("spellcheck", "false");

                theInput.style.fontSize = MATH_FONT.size;
                theInput.style.fontFamily = MATH_FONT.family;
            }
        }
        console.log("[WeBWorK MathView] Rendered");
    }

    var createClearAnswers = function () {
        console.log("[WeBWorK MathView] Creating Clear Answers button");

        // Check if the button already exists
        if (document.getElementById("clearAnswersButton")) {
            console.log("[WeBWorK MathView] Clear Answers button already attached");
            return;
        }

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            var clearAnswers = document.createElement("input");
            clearAnswers.id = "clearAnswersButton";
            clearAnswers.className = "btn btn-primary mb-1";
            clearAnswers.type = "submit";
            clearAnswers.value = "Clear Answers";
            clearAnswers.style.backgroundColor = "#dd5555";
            clearAnswers.style.backgroundImage = "none";

            clearAnswers.addEventListener("click", function (e) {
                e.preventDefault();
                if (!confirm("Are you sure you want to clear all answer boxes on this page. This cannot be undone.")) {
                    return;
                }

                var textInputs = retrieveTextInputs();
                for (var i = 0; i < textInputs.length; i++) {
                    var theInput = textInputs[i];
                    theInput.value = "";

                    if (MathView.hasMathView(theInput)) {
                        MathView.updateMath(theInput.getAttribute(MathView.MV_ATTR_ATTACHED), "");
                    }
                }

                var selectInputs = retrieveSelectInputs();
                for (var i = 0; i < selectInputs.length; i++) {
                    selectInputs[i].value = 0;
                }
            });

            previewAnswers.parentNode.insertBefore(clearAnswers, null);
        }
    }

    var main = function () {
        applyToInputs();
        createClearAnswers();
    }

    var textInputs = retrieveTextInputs();
    var selectInputs = retrieveSelectInputs();

    if (textInputs.length == 0 && selectInputs.length == 0) {
        console.log("[WeBWorK MathView] DOM not available. Waiting to insert MathView elements...");
        document.addEventListener("DOMContentLoaded", function () {
            console.log("[WeBWorK MathView] DOM available");
            main();
        })
    }
    else {
        main();
    }
};

webworkSetup();
