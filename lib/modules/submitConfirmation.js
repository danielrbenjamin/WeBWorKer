// This module is responsible for the submit confirmation functionality.
// It prevents accidental submission of answers.

let confirmationEnabled = true; // Default to enabled

/**
 * Initializes the submit confirmation functionality.
 * It sets up a listener for messages from the extension's popup to toggle confirmation
 * and adds a click listener to the submit button to confirm submission.
 */
export function initSubmitConfirmation() {
  console.log('[WeBWorKer] Initializing Submit Confirmation');

  // Listener for messages from the popup (e.g., to toggle confirmation)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleConfirmation') {
      confirmationEnabled = request.enabled;
      console.log(`[WeBWorKer] Submit confirmation ${confirmationEnabled ? 'enabled' : 'disabled'}`);
      sendResponse({ success: true, confirmationEnabled });
    }
    return true; // Keep the message channel open for sendResponse
  });

  // Add confirmation listener to the main submit button
  const submitButton = document.querySelector('input[name="submitAnswers_id"]');
  if (submitButton) {
    addConfirmationListener(submitButton);
  } else {
    console.warn('[WeBWorKer] Main submit button not found for confirmation.');
  }

  // Also add to the duplicate submit button if it exists
  const duplicateSubmitButton = document.getElementById('submitAnswers_id_duplicate');
  if (duplicateSubmitButton) {
    addConfirmationListener(duplicateSubmitButton);
  }
}

/**
 * Confirms with the user before submitting answers.
 * @param {Event} event - The click event.
 */
function confirmSubmit(event) {
  if (confirmationEnabled) {
    if (!confirm('Are you sure you want to submit your answers?')) {
      event.preventDefault(); // Prevent form submission
      console.log('[WeBWorKer] Submission cancelled by user.');
    } else {
      console.log('[WeBWorKer] Submission confirmed by user.');
    }
  } else {
    console.log('[WeBWorKer] Submit confirmation is disabled. Submitting directly.');
  }
}

/**
 * Adds a click listener to the given submit button to confirm submission.
 * @param {HTMLInputElement} button - The submit button element.
 */
function addConfirmationListener(button) {
  if (button) {
    button.addEventListener('click', confirmSubmit);
    console.log(`[WeBWorKer] Added confirmation listener to button: ${button.id || button.name}`);
  }
}
