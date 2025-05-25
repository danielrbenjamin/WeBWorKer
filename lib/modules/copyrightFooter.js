// This module is responsible for adding a copyright footer to the page.

/**
 * Initializes the copyright footer.
 * It creates a footer element with copyright information and appends it to the document body.
 */
export function initCopyrightFooter() {
  console.log('[WeBWorKer] Initializing Copyright Footer');

  try {
    const footer = document.createElement('footer');
    footer.style.textAlign = 'center';
    footer.style.padding = '10px';
    footer.style.marginTop = '30px';
    footer.style.borderTop = '1px solid #ccc';
    footer.style.fontSize = '0.9em';
    footer.style.color = '#555';

    const currentYear = new Date().getFullYear();
    const copyrightText = `© ${currentYear} WeBWorKer Extension. All Rights Reserved.`;
    // It's good practice to also link to your extension's page or a license if applicable.
    // For example:
    // const extensionLink = document.createElement('a');
    // extensionLink.href = 'https://your-extension-store-page.com';
    // extensionLink.textContent = 'WeBWorKer Extension';
    // extensionLink.target = '_blank';
    // footer.innerHTML = `© ${currentYear} `;
    // footer.appendChild(extensionLink);
    // footer.append(`. All Rights Reserved. `);
    // footer.append(` Licensed under MIT.`); // Example license

    footer.textContent = copyrightText;

    // Append to a common element, e.g., 'problem_body' or document.body if that's not found
    const problemBody = document.getElementById('problem_body');
    if (problemBody && problemBody.parentNode) {
        // Insert after the main content of problem_body, or as its last child
        // If problem_body is a form or a main content wrapper, appending to its parent might be better
        // to ensure it's at the very bottom.
        // For now, let's append it to the body to ensure it's at the bottom of the page.
        document.body.appendChild(footer);
    } else {
        document.body.appendChild(footer); // Fallback to appending to body
    }

    console.log('[WeBWorKer] Copyright footer added.');
  } catch (error) {
    console.error('[WeBWorKer] Error adding copyright footer:', error);
  }
}
