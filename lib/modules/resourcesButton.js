// This module is responsible for the "Online Resources" button functionality.
// It creates a button that links to a page with online resources.

/**
 * Initializes the Online Resources button.
 * It creates a button that links to a predefined URL for online resources.
 */
export function initResourcesButton() {
  console.log('[WeBWorKer] Initializing Online Resources button');
  const resourcesButton = createResourcesButtonElement();
  // Attempt to insert it next to a known element, e.g., the 'Piazza' button if it exists,
  // or fall back to another location.
  // For this example, let's assume it's placed near where the Piazza button would be,
  // or appended to the problem_body as a fallback.

  const piazzaButton = document.querySelector('a.btn-info[href*="piazza.com"]'); // Selector for Piazza button

  if (piazzaButton && piazzaButton.parentNode) {
    piazzaButton.parentNode.insertBefore(resourcesButton, piazzaButton.nextSibling);
    // Add some space if needed
    piazzaButton.parentNode.insertBefore(document.createTextNode('\u00A0'), piazzaButton.nextSibling);
     console.log('[WeBWorKer] Online Resources button added next to Piazza button.');
  } else {
    const problemBody = document.getElementById('problem_body');
    if (problemBody) {
      const firstChild = problemBody.firstChild;
      if (firstChild) {
        problemBody.insertBefore(resourcesButton, firstChild);
      } else {
        problemBody.appendChild(resourcesButton);
      }
      console.log('[WeBWorKer] Online Resources button added to problem_body (fallback).');
    } else {
      console.warn('[WeBWorKer] Could not find a suitable place to add the Online Resources button.');
    }
  }
}

/**
 * Creates the "Online Resources" button element.
 * @returns {HTMLAnchorElement} The created anchor element styled as a button.
 */
function createResourcesButtonElement() {
  const button = document.createElement('a');
  // TODO: Replace with the actual URL for online resources
  button.href = 'https://example.com/online-resources'; // Placeholder URL
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.className = 'btn btn-success'; // Using Bootstrap button styling
  button.textContent = 'Online Resources';
  button.id = 'resources_button'; // Added an ID for easier selection by other modules
  button.title = 'Access online resources';
  console.log('[WeBWorKer] Online Resources button element created.');
  return button;
}
