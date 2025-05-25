/**
 * @fileoverview Manages the UI for the parenthesis checker floater.
 * This module handles the creation, display, positioning, and event handling
 * of a floating element that indicates whether parentheses, brackets, and braces
 * are balanced in a focused input field. It uses jQuery for DOM manipulation.
 */

// jQuery is assumed to be globally available ($).

/**
 * The jQuery object for the floater element.
 * Initialized in initParenthesisFloater.
 * @type {jQuery|null}
 */
let $floater = null;

/**
 * Function to check if the parenthesis checker feature is active.
 * This will be set by initParenthesisFloater.
 * @type {function(): boolean | null}
 */
let isCheckerCurrentlyEnabled = null;

/**
 * Function to check for matching brackets.
 * This will be set by initParenthesisFloater.
 * Expected to return [isValid: boolean, errorIndex: number, styledText: string]
 * @type {function(string): [boolean, number, string] | null}
 */
let checkBracketsFunction = null;

/**
 * Generates a string of non-breaking spaces.
 * @param {number} numSpaces The number of spaces to generate.
 * @returns {string} A string consisting of `numSpaces` non-breaking spaces.
 */
function createSpaces(numSpaces) {
  if (numSpaces <= 0) return "";
  return '&nbsp;'.repeat(numSpaces);
}

/**
 * Displays the floater with a "valid" state message and styled content.
 * @param {string} styledContent The HTML string with styled brackets from checkBracketsFunction.
 */
function showValidStateFloater(styledContent) {
  if (!$floater) return;
  $floater.removeClass('ww_invalid_floater'); // Ensure invalid class is removed
  $floater.html(styledContent); // Display the styled expression
  $floater.show();
}

/**
 * Displays the floater with an "invalid" state message, styled content, and an error caret.
 * @param {string} styledContent The HTML string with styled brackets up to the error.
 * @param {number} errorIndex The index where the mismatch or unclosed bracket occurs.
 */
function showInvalidStateFloater(styledContent, errorIndex) {
  if (!$floater) return;
  $floater.addClass('ww_invalid_floater');
  // The styledContent might already include the error part.
  // The caret indicates the position of the error.
  // Ensure errorIndex is a non-negative number before creating spaces.
  const spacesBeforeCaret = errorIndex >= 0 ? createSpaces(errorIndex) : "";
  $floater.html(`${styledContent}<br>${spacesBeforeCaret}<span class="ww_fail">^</span>`);
  $floater.show();
}

/**
 * Updates the position of the floater element to be near the provided input element.
 * It positions the floater below the input field.
 * @param {jQuery} $inputElement The jQuery object for the input field.
 */
function updateFloaterPosition($inputElement) {
  if (!$floater || !$inputElement || $inputElement.length === 0) {
    if ($floater) $floater.hide();
    return;
  }

  const inputOffset = $inputElement.offset();
  const inputHeight = $inputElement.outerHeight();
  // const inputWidth = $inputElement.outerWidth(); // Not used but available

  if (!inputOffset) return; // Element might not be visible or in DOM

  let topPosition = inputOffset.top + inputHeight + 10; // 10px below the input
  let leftPosition = inputOffset.left;

  // Basic viewport collision detection (optional, enhance as needed)
  const floaterHeight = $floater.outerHeight() || 0;
  const windowHeight = $(window).height() || 0;
  const scrollTop = $(window).scrollTop() || 0;

  if (topPosition + floaterHeight > scrollTop + windowHeight) {
    // If floater goes off screen below, try placing it above the input
    topPosition = inputOffset.top - floaterHeight - 10; // 10px above
    if (topPosition < scrollTop) { // If still off screen (e.g. input is tall)
        topPosition = scrollTop; // Stick to top of viewport
    }
  }

  $floater.css({
    top: topPosition,
    left: leftPosition,
  });
}

/**
 * Validates the brackets in the input field's value and updates the floater display.
 * If the checker feature is not active, or if the input is empty and not focused,
 * the floater is hidden.
 * @param {jQuery} $inputElement The jQuery object for the input field.
 */
function validateAndDisplayForInput($inputElement) {
  if (!isCheckerCurrentlyEnabled || !isCheckerCurrentlyEnabled() || !$inputElement || $inputElement.length === 0) {
    if ($floater) $floater.hide();
    return;
  }

  const inputValue = $inputElement.val();

  // Hide floater if input is empty and not focused (original logic)
  // However, for 'input' event, we always want to validate even if empty to clear the "Unbalanced" state.
  // The original `isValid` showed floater if `expr !== '' || $obj.is(':focus')`
  // Let's refine: always show if focused and contains brackets.
  // Always validate on input event.
  if (!$inputElement.is(':focus') && inputValue === '') {
      if ($floater) $floater.hide();
      return;
  }

  if (!inputValue.match(/[\(\[\{\)\]\}]/) && inputValue !== '') {
      // If no brackets are present and input is not empty, hide the floater.
      // If input is empty, it might be cleared, so we might need to show "Balanced".
      if ($floater) $floater.hide();
      return;
  }


  if (checkBracketsFunction) {
    const [isValid, errorIndex, styledText] = checkBracketsFunction(inputValue);
    if (isValid) {
      // Even if valid, only show if there was some input or it's focused and had brackets
      // Or if it's empty, show "Balanced" to clear a previous "Unbalanced"
      if (inputValue !== '' || $inputElement.is(':focus')) {
          showValidStateFloater(styledText);
      } else {
          if ($floater) $floater.hide(); // Hide if empty and not focused
      }
    } else {
      showInvalidStateFloater(styledText, errorIndex);
    }
    updateFloaterPosition($inputElement);
  } else {
    console.error("[WeBWorKer Floater] checkBracketsFunction is not defined.");
    if ($floater) $floater.hide();
  }
}

/**
 * Initializes the parenthesis floater UI and event handlers.
 *
 * @param {function(): boolean} checkerIsEnabledFn A function that returns true if the checker is active.
 * @param {function(string): [boolean, number, string]} checkBracketsDelegateFn The function for checking bracket balance.
 */
export function initParenthesisFloater(checkerIsEnabledFn, checkBracketsDelegateFn) {
  if (typeof $ === 'undefined') {
    console.error('[WeBWorKer Floater] jQuery is not loaded. Floater cannot be initialized.');
    return;
  }

  isCheckerCurrentlyEnabled = checkerIsEnabledFn;
  checkBracketsFunction = checkBracketsDelegateFn;

  // Create the floater element if it doesn't exist
  if (!$floater || $floater.length === 0) {
    $floater = $('<div/>')
      .attr('id', 'wwchecker-floater')
      .css({ // Basic styling, can be enhanced with CSS classes
        'display': 'none',
        'position': 'absolute',
        'padding': '8px',
        'background-color': '#fff', // White background
        'border': '1px solid #ccc',    // Grey border
        'border-radius': '4px',       // Rounded corners
        'box-shadow': '0 2px 5px rgba(0,0,0,0.15)', // Subtle shadow
        'z-index': '10001',           // Ensure it's on top (adjust as needed)
        'font-family': 'monospace',   // Monospace font for better alignment
        'font-size': '0.9em',
        'line-height': '1.4',
        // 'min-width': '150px', // Minimum width
        'color': '#333', // Darker text color
      })
      .prependTo('body'); // Add to the start of the body
    console.log('[WeBWorKer Floater] Floater element created.');
  }

  // Define input selectors based on original script
  const $inputs = $('input[id*=AnSwEr], input[id*=MuLtIaNsWeR], textarea[id*=AnSwEr], textarea[id*=MuLtIaNsWeR]');

  if ($inputs.length === 0) {
      console.warn("[WeBWorKer Floater] No target input fields found on the page.");
      // return; // No inputs to attach to, but keep observer for dynamically added ones?
  }

  $inputs.each(function() {
    const $currentInput = $(this); // Cache jQuery object for this input

    $currentInput.on('input', function() {
      validateAndDisplayForInput($currentInput);
    });

    $currentInput.on('focus', function() {
      // updateFloaterPosition must be called first, then validate,
      // because validate might show the floater, and its dimensions are needed for correct positioning.
      // However, if floater is hidden, its dimensions might be 0.
      // So, call validate (which might show it), then update position.
      validateAndDisplayForInput($currentInput); // This will also call updateFloaterPosition if it shows
    });

    $currentInput.on('blur', function() {
      if ($floater) {
        $floater.hide();
      }
    });
  });

  // Event handlers for window resize and scroll to reposition the floater
  $(window).on('resize scroll', function() {
    const $focusedInput = $('input:focus, textarea:focus'); // Check both inputs and textareas
    if ($focusedInput.length > 0 && $floater && $floater.is(':visible')) {
        // Check if the focused input is one of our target inputs
        if ($focusedInput.is('input[id*=AnSwEr], input[id*=MuLtIaNsWeR], textarea[id*=AnSwEr], textarea[id*=MuLtIaNsWeR]')) {
            updateFloaterPosition($focusedInput);
        }
    }
  });

  // Initial check for any focused input on page load/script run
  // This is covered by the `$(window).load` in the original script,
  // but it's better to handle it here if possible.
  // However, `initParenthesisFloater` is called after storage.get, so DOM might be fully ready.
  const $focusedInputOnLoad = $('input:focus, textarea:focus');
  if ($focusedInputOnLoad.length > 0 && $focusedInputOnLoad.is('input[id*=AnSwEr], input[id*=MuLtIaNsWeR], textarea[id*=AnSwEr], textarea[id*=MuLtIaNsWeR]')) {
      validateAndDisplayForInput($focusedInputOnLoad);
  }


  console.log(`[WeBWorKer Floater] Event listeners attached to ${$inputs.length} input fields.`);
}
