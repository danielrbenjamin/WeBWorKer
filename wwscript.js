// Adapted by Daniel Benjamin
// from
// wwchecker
// james yuzawa
// jyuzawa.com
// github.com/yuzawa-san

var checkerActive = false;
var floater;

function spaces(n) {
    var str = "";
    for (var i = 0; i < n; i++) {
        str += "&nbsp;";
    }
    return str;
}

function isValid($obj) {
    var expr = $obj.val();
    var floater = $("#wwchecker-floater");

    if (checkerActive && (expr !== '' || $obj.is(':focus'))) {
        if (expr.match(/[\(\[\{\)\]\}]/)) {
            floater.show();
            // Validation logic for matching parentheses
            var validationOutput = checkMatchingBrackets(expr);
            if (validationOutput[0]) {
                showValidFloater(floater, validationOutput[2]);
            } else {
                showInvalidFloater(floater, validationOutput[2], validationOutput[1]);
            }
        } else {
            floater.hide();
        }
    } else {
        floater.hide();
    }
}

function checkMatchingBrackets(expr) {
    var tokenStack = [];
    var sexyText = "";
    var ct = 0;
    var lastUnclosedIndex = -1;

    for (var i = 0; i < expr.length; i++) {
        var ch = expr.charAt(i);

        if (ch == "(" || ch == "[" || ch == "{") {
            // opening grouping
            tokenStack.push(ch);
            sexyText += "<span class=ww_pair" + (ct % 5) + ">" + ch + "</span>";
            ct++;
        } else if (ch == ")" || ch == "]" || ch == "}") {
            // closing grouping
            var head = tokenStack[tokenStack.length - 1];
            if (!head) {
                // stack is empty
                return [false, i, sexyText + "<span class=ww_pairbad>" + expr.substring(i) + "</span>"];
            }
            if ((head == "(" && ch == ")") || (head == "[" && ch == "]") || (head == "{" && ch == "}")) {
                // match found
                tokenStack.pop();
                ct--;
                sexyText += "<span class=ww_pair" + (ct % 5) + ">" + ch + "</span>";
            } else {
                // grouping mismatch
                lastUnclosedIndex = i;
                return [false, lastUnclosedIndex, sexyText];
            }
        } else {
            // other characters, escaping html
            if (ch == "<") {
                sexyText += "&lt;";
            } else if (ch == ">") {
                sexyText += "&gt;";
            } else {
                sexyText += ch;
            }
        }
    }

    if (tokenStack.length > 0) {
        // Unclosed brackets at the end
        lastUnclosedIndex = expr.length - 1;
    }

    return [tokenStack.length === 0, lastUnclosedIndex, sexyText];
}

function showValidFloater(floater, content) {
    floater.removeClass('ww_invalid_floater');
    floater.html(content);
}

function showInvalidFloater(floater, content, errorLocation) {
    floater.addClass('ww_invalid_floater');
    floater.html(content + "<br>" + spaces(errorLocation) + "<span class=ww_fail>^</span>");
}

function updateFloaterPosition(inputElement) {
    var floater = $("#wwchecker-floater");

    if (inputElement) {
        var offsetStruct = inputElement.offset();
        var itemHeight = inputElement.outerHeight();

        floater.css({
            left: offsetStruct.left,
            top: offsetStruct.top + itemHeight + 10
        });
    }
}

$(document).ready(function () {
    // Make floater box
    floater = $('<div/>').attr('id', 'wwchecker-floater');


    // Attach boxes
    $('body').prepend(floater);

    // Load the state from chrome.storage.sync
    chrome.storage.sync.get({ checkParenthesesEnabled: true }, function(result) {
        checkerActive = result.checkParenthesesEnabled;

        // Bind events to answer boxes
        $('input[id*=AnSwEr], input[id*=MuLtIaNsWeR]').each(function () {
            var inputElement = $(this);

            inputElement.on('input', function () {
                isValid(inputElement);
            });

            inputElement.focus(function () {
                updateFloaterPosition(inputElement);
                isValid(inputElement);
            });

            inputElement.blur(function () {
                floater.hide();
            });
        });
    });

    // Reposition floater on window resize
    $(window).resize(function () {
        var focusedInput = $('input:focus');
        if (focusedInput.length > 0) {
            updateFloaterPosition(focusedInput);
        }
    });

    // Reposition floater on window scroll
    $(window).scroll(function () {
        var focusedInput = $('input:focus');
        if (focusedInput.length > 0) {
            updateFloaterPosition(focusedInput);
        }
    });
});

// Validate input box on page load
$(window).load(function () {
    var focusedInput = $('input:focus');
    if (focusedInput.length > 0) {
        isValid(focusedInput);
        updateFloaterPosition(focusedInput);
    }
});
