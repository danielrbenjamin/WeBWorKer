// This module is responsible for creating a duplicate "Submit Answers" button
// at the top of the problem set for convenience.

/**
 * Initializes the duplicate "Submit Answers" button.
 * It finds the original submit button, clones it, and places the clone
 * at the top of the problem form.
 */
export function initDuplicateSubmitButton() {
  console.log('[WeBWorKer] Initializing Duplicate Submit Button');

  const originalSubmitButton = document.querySelector('input[name="submitAnswers_id"]');
  const problemForm = document.getElementById('problem_form'); // Common ID for the form containing problems

  if (originalSubmitButton && problemForm) {
    const duplicateButton = originalSubmitButton.cloneNode(true);
    duplicateButton.id = 'submitAnswers_id_duplicate'; // Ensure unique ID
    duplicateButton.style.marginLeft = '10px'; // Add some spacing if needed

    // Create a container for the button at the top
    const buttonContainer = document.createElement('div');
    buttonContainer.style.textAlign = 'right'; // Align to the right, similar to bottom buttons
    buttonContainer.style.marginBottom = '20px'; // Add some space below the button
    buttonContainer.appendChild(document.createTextNode('Also, you can submit your answers here: '));
    buttonContainer.appendChild(duplicateButton);


    // Insert the container at the beginning of the problem form
    problemForm.insertBefore(buttonContainer, problemForm.firstChild);

    console.log('[WeBWorKer] Duplicate "Submit Answers" button added to the top of the page.');

    // If submit confirmation is active, it might need to be attached to this button too.
    // This is handled in the submitConfirmation.js module by checking for 'submitAnswers_id_duplicate'.
  } else {
    if (!originalSubmitButton) {
      console.warn('[WeBWorKer] Original "Submit Answers" button not found. Cannot create duplicate.');
    }
    if (!problemForm) {
      console.warn('[WeBWorKer] Problem form (problem_form) not found. Cannot add duplicate submit button.');
    }
  }
}
