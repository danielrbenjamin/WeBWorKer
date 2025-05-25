// This module is responsible for the "Piazza" button functionality.
// It creates a button that links to a Piazza course page.

/**
 * Initializes the Piazza button.
 * It retrieves the course ID from the current URL and creates a button
 * that links to the corresponding Piazza course page.
 */
export function initPiazzaButton() {
  console.log('[WeBWorKer] Initializing Piazza button');
  const courseId = getCourseIdFromURL();
  if (courseId) {
    const piazzaButton = createPiazzaButtonElement(courseId);
    const resourcesButton = document.getElementById('resources_button'); // Assuming resources_button exists
    if (resourcesButton) {
      resourcesButton.parentNode.insertBefore(piazzaButton, resourcesButton.nextSibling);
      // Add some space between the buttons
      resourcesButton.parentNode.insertBefore(document.createTextNode('\u00A0'), resourcesButton.nextSibling);
    } else {
      // Fallback if resources button is not found, append to another common element
      const problemForm = document.getElementById('problem_body');
      if (problemForm) {
        const firstChild = problemForm.firstChild; // Get the first child
        if (firstChild) {
            problemForm.insertBefore(piazzaButton, firstChild); // Insert button before the first child
        } else {
            problemForm.appendChild(piazzaButton); // Append if no children
        }
        console.log('[WeBWorKer] Piazza button added to problem_body (fallback).');
      } else {
        console.warn('[WeBWorKer] Resources button and problem_body not found. Cannot add Piazza button.');
      }
    }
  } else {
    console.warn('[WeBWorKer] Could not determine Course ID for Piazza button.');
  }
}

/**
 * Creates the "Piazza" button element.
 * @param {string} courseId - The course ID to link to.
 * @returns {HTMLAnchorElement} The created anchor element styled as a button.
 */
function createPiazzaButtonElement(courseId) {
  const button = document.createElement('a');
  button.href = `https://piazza.com/${courseId}/home`;
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.className = 'btn btn-info'; // Using Bootstrap button styling
  button.textContent = 'Piazza';
  button.title = 'Open Piazza course page';
  console.log(`[WeBWorKer] Piazza button created for course ID: ${courseId}`);
  return button;
}

/**
 * Extracts the course ID from the current URL.
 * Assumes a URL structure like "https://host/webwork2/COURSE_ID/..."
 * @returns {string|null} The extracted course ID or null if not found.
 */
function getCourseIdFromURL() {
  const pathParts = window.location.pathname.split('/');
  // Example: /webwork2/MATH101/assignment1/
  // pathParts would be ["", "webwork2", "MATH101", "assignment1", ""]
  if (pathParts.length > 2 && pathParts[1] === 'webwork2') {
    return pathParts[2];
  }
  return null;
}
