// This module is responsible for applying CSS class enhancements to input elements.
// Specifically, it targets .codeshard elements and related buttons.

/**
 * Initializes input enhancements by applying necessary CSS classes.
 * This function encapsulates the IIFEs that were previously in content-webwork.js.
 */
export function initInputEnhancements() {
  console.log('[WeBWorKer] Initializing Input Enhancements');

  // Enhance .codeshard input fields
  try {
    const codeShards = document.querySelectorAll('.codeshard');
    if (codeShards.length > 0) {
      codeShards.forEach((textarea) => {
        // Add a class for styling via CSS, similar to 'form-control'
        textarea.classList.add('webworker-enhanced-codeshard');
      });
      console.log(`[WeBWorKer] Enhanced ${codeShards.length} .codeshard elements.`);
    } else {
      // console.log('[WeBWorKer] No .codeshard elements found to enhance.');
    }
  } catch (error) {
    console.error('[WeBWorKer] Error enhancing .codeshard elements:', error);
  }

  // Enhance .codeshard-btn associated with .codeshard textareas
  try {
    // This selector targets buttons that are siblings of .codeshard elements
    // and have the specified classes. It assumes a certain DOM structure.
    const codeShardButtons = document.querySelectorAll('.btn.btn-sm.btn-secondary.codeshard-btn');
    if (codeShardButtons.length > 0) {
      codeShardButtons.forEach((button) => {
        // Add a class for custom styling if needed, or to identify them
        button.classList.add('webworker-enhanced-codeshard-btn');
        // Example: Modify button style or add event listeners if required in the future
      });
      console.log(`[WeBWorKer] Enhanced ${codeShardButtons.length} .codeshard-btn elements.`);
    } else {
      // console.log('[WeBWorKer] No .codeshard-btn elements found to enhance.');
    }
  } catch (error) {
    console.error('[WeBWorKer] Error enhancing .codeshard-btn elements:', error);
  }
}
