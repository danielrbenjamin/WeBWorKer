// This module is responsible for the "Clear Answers" button functionality.
// It clears all text inputs and select inputs in the WeBWorK problem.

/**
 * Initializes the "Clear Answers" button.
 *
 * @param {function} retrieveTextInputsFunc - Function to retrieve all text input elements.
 * @param {function} retrieveSelectInputsFunc - Function to retrieve all select input elements.
 * @param {object} MathViewObject - The MathView object for re-rendering math expressions.
 */
export function initClearAnswersButton(retrieveTextInputsFunc, retrieveSelectInputsFunc, MathViewObject) {
  console.log('[WeBWorKer] Initializing Clear Answers button');
  const clearAnswersButton = createClearAnswersButtonElement(retrieveTextInputsFunc, retrieveSelectInputsFunc, MathViewObject);
  const submitButton = document.querySelector('input[name="submitAnswers_id"]');
  if (submitButton) {
    submitButton.parentNode.insertBefore(clearAnswersButton, submitButton.nextSibling);
    // Add some space between the buttons
    submitButton.parentNode.insertBefore(document.createTextNode('\u00A0'), submitButton.nextSibling);
  } else {
    console.warn('[WeBWorKer] Submit button not found. Cannot add Clear Answers button.');
  }
}

/**
 * Creates the "Clear Answers" button element.
 *
 * @param {function} retrieveTextInputsFunc - Function to retrieve all text input elements.
 * @param {function} retrieveSelectInputsFunc - Function to retrieve all select input elements.
 * @param {object} MathViewObject - The MathView object for re-rendering math expressions.
 * @returns {HTMLInputElement} The created button element.
 */
function createClearAnswersButtonElement(retrieveTextInputsFunc, retrieveSelectInputsFunc, MathViewObject) {
  const button = document.createElement('input');
  button.type = 'button';
  button.value = 'Clear Answers';
  button.className = 'btn btn-warning';
  button.title = 'Clear all answer fields';
  button.addEventListener('click', () => {
    console.log('[WeBWorKer] Clear Answers button clicked');
    if (confirm('Are you sure you want to clear all answers?')) {
      const textInputs = retrieveTextInputsFunc();
      textInputs.forEach((input) => {
        input.value = '';
        // If MathView is used, re-render the input field
        if (MathViewObject && input.mathfield) {
          input.mathfield.latex('');
        }
      });

      const selectInputs = retrieveSelectInputsFunc();
      selectInputs.forEach((select) => {
        select.selectedIndex = 0; // Reset to the first option (usually empty or default)
      });
      console.log('[WeBWorKer] All answers cleared.');
    }
  });
  return button;
}
