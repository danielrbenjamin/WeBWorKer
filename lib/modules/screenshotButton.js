// This module is responsible for the "Screenshot" button functionality.
// It uses html2canvas to capture a screenshot of the problem area.

/**
 * Initializes the Screenshot button.
 * Assumes html2canvas is globally available.
 */
export function initScreenshotButton() {
  console.log('[WeBWorKer] Initializing Screenshot button');
  // Try to find the "Report a bug" link/button
  const bugReportLink = document.querySelector('a[href*="mailto:webwork@"]');

  if (bugReportLink && bugReportLink.parentNode) {
    const screenshotButton = createScreenshotButtonElement();
    bugReportLink.parentNode.insertBefore(screenshotButton, bugReportLink);
    // Add some space between the new button and the bug report link
    bugReportLink.parentNode.insertBefore(document.createTextNode('\u00A0\u00A0'), bugReportLink);
    console.log('[WeBWorKer] Screenshot button added before bug report link.');
  } else {
    // Fallback: If the bug report link is not found, try to append it to another prominent location.
    // For example, near the submit button.
    const submitButton = document.querySelector('input[name="submitAnswers_id"]');
    if (submitButton && submitButton.parentNode) {
      const screenshotButton = createScreenshotButtonElement();
      // Insert after the submit button, with some spacing
      submitButton.parentNode.insertBefore(document.createTextNode('\u00A0\u00A0'), submitButton.nextSibling);
      submitButton.parentNode.insertBefore(screenshotButton, submitButton.nextSibling.nextSibling);
      console.log('[WeBWorKer] Screenshot button added near submit button (fallback).');
    } else {
      console.warn('[WeBWorKer] Bug report link or submit button not found. Cannot add Screenshot button optimally.');
      // As a last resort, append to problem_body if it exists
      const problemBody = document.getElementById('problem_body');
      if (problemBody) {
          const screenshotButton = createScreenshotButtonElement();
          problemBody.appendChild(screenshotButton); // Append as last child
          console.log('[WeBWorKer] Screenshot button appended to problem_body (last resort).');
      } else {
          console.warn('[WeBWorKer] problem_body not found. Screenshot button not added.');
      }
    }
  }
}

/**
 * Creates the "Screenshot" button element.
 * @returns {HTMLButtonElement} The created button element.
 */
function createScreenshotButtonElement() {
  const button = document.createElement('button');
  button.textContent = '📷 Screenshot';
  button.className = 'btn btn-secondary'; // Using Bootstrap button styling
  button.title = 'Take a screenshot of the problem';
  button.style.marginLeft = '5px'; // Add some margin

  button.addEventListener('click', async () => {
    console.log('[WeBWorKer] Screenshot button clicked');
    if (typeof html2canvas === 'undefined') {
      console.error('[WeBWorKer] html2canvas is not defined. Cannot take screenshot.');
      alert('Screenshot functionality is unavailable. html2canvas library is missing.');
      return;
    }

    const problemDiv = document.getElementById('problem_body') || document.body;
    const problemSet = document.getElementById('problemList');
    const problemSetName = problemSet ? problemSet.options[problemSet.selectedIndex].text.split(' ')[0] : 'Problem';
    const user = document.querySelector('body > div.navbar.navbar-fixed-top > div > ul:nth-child(1) > li > a')?.textContent.split(' ')[1] || 'User';
    const courseNameMatch = window.location.pathname.match(/webwork2\/(.*?)\//);
    const courseName = courseNameMatch ? courseNameMatch[1] : 'Course';


    try {
      const canvas = await html2canvas(problemDiv, {
        logging: true, // Enable logging for debugging
        useCORS: true, // Enable CORS for images
        scale: window.devicePixelRatio, // Adjust for device pixel ratio for better quality
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
      });
      const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
      const filename = `WeBWorK_${courseName}_${problemSetName}_${user}_${timestamp}.png`;

      // Trigger download
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`[WeBWorKer] Screenshot saved as ${filename}`);
    } catch (error) {
      console.error('[WeBWorKer] Error taking screenshot:', error);
      alert('Failed to take screenshot. See console for details.');
    }
  });

  return button;
}
