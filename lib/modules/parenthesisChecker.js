/**
 * @fileoverview Provides a function to check for matching brackets in a string
 * and generate a formatted string indicating matches and mismatches.
 */

/**
 * Checks if all opening brackets (parentheses, square brackets, curly braces)
 * in a given string have corresponding closing brackets. It also generates
 * an HTML string with spans highlighting matching pairs and errors.
 *
 * @param {string} expr The string expression to check.
 * @returns {[boolean, number, string]} An array containing:
 *          - boolean: True if all brackets are matched, false otherwise.
 *          - number: The index of the first mismatched closing bracket or the
 *                    index of the last unclosed opening bracket if applicable.
 *                    -1 if all matched or if the string is empty/null.
 *          - string: An HTML string with brackets wrapped in spans for styling.
 *                    Matching pairs get 'ww_pairN' classes, mismatches 'ww_pairbad'.
 */
export function checkMatchingBrackets(expr) {
  if (expr == null || expr === '') {
    return [true, -1, '']; // Matched, no specific index, empty display string
  }

  const tokenStack = [];
  let sexyText = ""; // This will be the HTML string with styled brackets
  let ct = 0; // Counter for 'ww_pairN' class rotation
  let lastUnclosedIndex = -1; // Tracks index for error reporting

  const openingBrackets = ['(', '[', '{'];
  const closingBracketsMap = {
    ')': '(',
    ']': '[',
    '}': '{'
  };

  for (let i = 0; i < expr.length; i++) {
    const ch = expr.charAt(i);

    if (openingBrackets.includes(ch)) {
      // Opening bracket
      tokenStack.push({ char: ch, index: i }); // Store char and its original index
      sexyText += `<span class="ww_pair${ct % 5}">${ch}</span>`;
      ct++;
    } else if (closingBracketsMap[ch]) {
      // Closing bracket
      if (tokenStack.length === 0) {
        // No opening bracket to match with (e.g., "())")
        // Highlight the problematic closing bracket and the rest of the string
        sexyText += `<span class="ww_pairbad">${ch}</span>`;
        // Optionally highlight the rest of the string as problematic too
        // sexyText += `<span class="ww_pairbad">${expr.substring(i + 1)}</span>`;
        return [false, i, sexyText];
      }

      const lastOpen = tokenStack[tokenStack.length - 1];
      if (lastOpen.char === closingBracketsMap[ch]) {
        // Match found
        tokenStack.pop();
        ct--; // Decrease counter to match the opening bracket's class level
        sexyText += `<span class="ww_pair${ct % 5}">${ch}</span>`;
      } else {
        // Mismatched closing bracket (e.g., "(]")
        // Highlight the problematic closing bracket
        sexyText += `<span class="ww_pairbad">${ch}</span>`;
        // Optionally highlight the rest of the string
        // sexyText += `<span class="ww_pairbad">${expr.substring(i + 1)}</span>`;
        return [false, i, sexyText];
      }
    } else {
      // Other characters, escape HTML special characters
      if (ch === "<") {
        sexyText += "&lt;";
      } else if (ch === ">") {
        sexyText += "&gt;";
      } else if (ch === "&") {
        sexyText += "&amp;";
      } else {
        sexyText += ch;
      }
    }
  }

  if (tokenStack.length > 0) {
    // Unclosed opening brackets at the end (e.g., "(()")
    // The error index could be the index of the last unclosed opening bracket
    lastUnclosedIndex = tokenStack[tokenStack.length - 1].index;
    // The sexyText already contains the styled unclosed brackets.
    // To specifically mark them as bad, one might need to reconstruct sexyText
    // or append a specific error indicator. For now, the visual styling
    // of unclosed brackets (from their ww_pairN class) might be enough.
    // However, the original function implies the remaining unclosed are bad.
    // Let's try to find the first unclosed bracket in the stack and mark from there.
    // This part is tricky because `sexyText` is already built.
    // The original code didn't explicitly re-style already added spans for this case.
    // It seems the `ww_fail` caret was added based on the `lastUnclosedIndex`.

    // For simplicity, we return the index of the first unclosed bracket.
    // The visual representation in the floater will handle indicating the error.
    return [false, tokenStack[0].index, sexyText];
  }

  return [true, -1, sexyText]; // All matched
}
