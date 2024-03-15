console.log("[WeBWorKer] content-webwork.js");

// Prepare function to set up MathView on a webwork page
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
        console.log("[WeBWorKer] Inserting MathView elements");
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
        console.log("[WeBWorKer] Rendered");
    }

    var createClearAnswers = function () {
        console.log("[WeBWorKer] Creating Clear Answers button");

        // Check if the button already exists
        if (document.getElementById("clearAnswersButton")) {
            console.log("[WeBWorKer] Clear Answers button already attached");
            return;
        }

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            // Create "Clear Answers" button
            var clearAnswers = document.createElement("input");
            clearAnswers.id = "clearAnswersButton";
            clearAnswers.className = "btn btn-primary mb-1";
            clearAnswers.type = "submit";
            clearAnswers.value = "Clear Answers";
            clearAnswers.style.backgroundColor = "#dd5555";
            clearAnswers.style.backgroundImage = "none";

            clearAnswers.addEventListener("click", function (e) {
                e.preventDefault();
                if (!confirm("Are you sure you want to clear all answer boxes on this page? This cannot be undone.")) {
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

            // Create "Piazza Button" button
            var piazzaButton = document.createElement("input");
            piazzaButton.id = "piazzaButton";
            piazzaButton.className = "btn btn-secondary mb-1"; // Adjust the class as needed
            piazzaButton.type = "button";
            piazzaButton.value = "Open Piazza";
            piazzaButton.style.backgroundColor = "#4e739d";
            piazzaButton.style.backgroundImage = "none";

            

            // Add event listener to copy text from the div with id "problem_body" when clicked
            piazzaButton.addEventListener("click", function () {
                // Get the element with id "problem_body"
                var breadcrumbElement = document.querySelector(".breadcrumb-item.active");

                // Check if the element exists
                if (breadcrumbElement) {
                    // Copy the content to clipboard
                    var textarea = document.createElement("textarea");
                    textarea.value = "q" + breadcrumbElement.textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);


                    // Open Piazza with the copied text
                    window.open("https://piazza.com/", "_blank");
                }
            });


            // Create "Google Search Button" button
            var googleSearchButton = document.createElement("input");
            googleSearchButton.id = "googleSearchButton";
            googleSearchButton.className = "btn btn-secondary mb-1"; // Adjust the class as needed
            googleSearchButton.type = "button";
            googleSearchButton.value = "Online Resources";
            googleSearchButton.style.backgroundColor = "#731DD8";
            googleSearchButton.style.backgroundImage = "none";


            // Add event listener to copy text from the div with id "problem_body" when clicked
            googleSearchButton.addEventListener("click", function () {
                // Get the element with id "problem_body"
                var problemBody = document.getElementById("problem_body");

                // Check if the element exists
                if (problemBody) {
                    // Copy the content to clipboard
                    var textarea = document.createElement("textarea");
                    textarea.value = problemBody.textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);

                    // Open Google search with the copied text
                    window.open("https://www.google.com/search?q=" + encodeURIComponent(problemBody.textContent), "_blank");
                }
            });
/*
            // Create "Buy Me a Coffee Button" button
            var buyMeACoffeeButton = document.createElement("input");
            buyMeACoffeeButton.id = "buyMeACoffeeButton";
            buyMeACoffeeButton.className = "btn btn-secondary mb-1"; // Adjust the class as needed
            buyMeACoffeeButton.type = "button";
            buyMeACoffeeButton.value = "🍕";
            buyMeACoffeeButton.style.backgroundColor = "#182d6f";
            buyMeACoffeeButton.style.backgroundImage = "none";

            // Add event listener to open the Buy Me a Coffee link when clicked
            buyMeACoffeeButton.addEventListener("click", function () {
                window.open("https://www.buymeacoffee.com/danielrbenjamin", "_blank");
            });

*/

            // Insert buttons
            previewAnswers.parentNode.insertBefore(clearAnswers, null);
            previewAnswers.parentNode.insertBefore(piazzaButton, null);
            piazzaButton.parentNode.insertBefore(googleSearchButton, piazzaButton.nextSibling);
            // googleSearchButton.parentNode.insertBefore(buyMeACoffeeButton, googleSearchButton.nextSibling);
        }
    }

    var main = function () {
        applyToInputs();
        createClearAnswers();
    }

    var textInputs = retrieveTextInputs();
    var selectInputs = retrieveSelectInputs();

    if (textInputs.length == 0 && selectInputs.length == 0) {
        console.log("[WeBWorKer] DOM not available. Waiting to insert MathView elements...");
        document.addEventListener("DOMContentLoaded", function () {
            console.log("[WeBWorKer] DOM available");
            main();
        })
    }
    else {
        main();
    }
};

webworkSetup();

let confirmationEnabled = true;

function confirmSubmit() {
  const scoreSummary = document.getElementById('score_summary');
  const hasUnlimited = scoreSummary && scoreSummary.innerText.toLowerCase().includes('unlimited');

  return confirmationEnabled && !hasUnlimited ? confirm("LIMITED ATTEMPTS!! Are you sure you want to submit?") : true;
}

function addConfirmationListener() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      const submitButton = form.querySelector('[name="submitAnswers"]');
      if (submitButton && !confirmSubmit()) {
        event.preventDefault();
      }
    });
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.toggleConfirmation) {
      confirmationEnabled = !confirmationEnabled;
      sendResponse({ confirmationEnabled });
    }
  }
);

addConfirmationListener();

(function() {
    'use strict';

    // Select all elements with the specified class
    var targetElements = document.querySelectorAll('.btn.btn-sm.btn-secondary.codeshard-btn');

    // Iterate through each element and change its class
    targetElements.forEach(function(element) {
        element.className = 'input-group d-inline-flex flex-nowrap w-auto mv-container';
    });
})();