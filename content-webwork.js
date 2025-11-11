console.log("[WeBWorKer] content-webwork.js");

var webworkSetup = async function () {
    var MATH_FONT = {
        "size": "1.21em",
        "family": "KaTeX_Main, Times New Roman, serif"
    };

    var retrieveTextInputs = function () {
        return document.getElementsByClassName("codeshard");
    };

    // Storage for custom user-defined variables
    var customVariables = {};

    // Generate a unique key for the current problem/page
    var getStorageKey = function(suffix) {
        try {
            // Try to get a unique identifier for the current problem
            var breadcrumb = document.querySelector('.breadcrumb-item.active');
            var problemId = breadcrumb ? breadcrumb.textContent.trim() : '';
            
            // Also include the course/set info if available
            var courseInfo = document.querySelector('.breadcrumb-item:not(.active)');
            var courseId = courseInfo ? courseInfo.textContent.trim() : '';
            
            // Combine to create unique key
            var baseKey = 'weworker_' + courseId + '_' + problemId;
            return suffix ? baseKey + '_' + suffix : baseKey;
        } catch (e) {
            console.error('[WeBWorKer] getStorageKey error', e);
            return 'weworker_default_' + (suffix || '');
        }
    };

    // Load custom variables from storage
    var loadCustomVariables = function() {
        try {
            var key = getStorageKey('customVars');
            var stored = localStorage.getItem(key);
            if (stored) {
                customVariables = JSON.parse(stored);
                console.log('[WeBWorKer] Loaded custom variables:', customVariables);
            }
        } catch (e) {
            console.error('[WeBWorKer] Error loading custom variables', e);
        }
    };

    // Save custom variables to storage
    var saveCustomVariables = function() {
        try {
            var key = getStorageKey('customVars');
            localStorage.setItem(key, JSON.stringify(customVariables));
            console.log('[WeBWorKer] Saved custom variables:', customVariables);
        } catch (e) {
            console.error('[WeBWorKer] Error saving custom variables', e);
        }
    };

    // Parse variable assignments from the problem text. Looks for patterns like "k = 5 kg" or "k=5"
    var parseVariables = function () {
        var vars = {};
        try {
            var pb = document.getElementById('problem_body') || document.querySelector('.problem-content');
            if (!pb) return vars;
            var text = pb.textContent || pb.innerText || '';

            // Regex to find occurrences like: name = number (with optional units)
            // captures: 1=name, 2=number
            var re = /\b([A-Za-z]\w*)\s*=\s*([+-]?(?:\d+\.?\d*|\.?\d+)(?:[eE][+-]?\d+)?)/g;
            var m;
            while ((m = re.exec(text)) !== null) {
                try {
                    var name = m[1];
                    var val = Number(m[2]);
                    if (!isNaN(val)) {
                        vars[name] = val;
                    }
                } catch (e) {
                    // ignore parse errors for individual matches
                }
            }
        } catch (err) {
            console.error('[WeBWorKer] parseVariables error', err);
        }
        return vars;
    };

    // Get all variables (both parsed and custom)
    var getAllVariables = function () {
        var parsed = parseVariables();
        // Merge custom variables (custom variables override parsed ones)
        return Object.assign({}, parsed, customVariables);
    };

    // Render a small variables panel near the problem body showing parsed variables.
    var renderVariablePanel = function(vars) {
        try {
            var existing = document.getElementById('weworker-vars-panel');
            if (existing) existing.remove();

            var pb = document.getElementById('problem_body') || document.querySelector('.problem-content');
            if (!pb) return;

            var panel = document.createElement('div');
            panel.id = 'weworker-vars-panel';
            panel.style.border = '1px solid rgba(0,0,0,0.12)';
            panel.style.background = '#fff';
            panel.style.padding = '6px 8px';
            panel.style.margin = '8px 0';
            panel.style.borderRadius = '6px';
            panel.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            panel.style.fontSize = '13px';
            panel.style.maxWidth = '640px';

            var title = document.createElement('div');
            title.textContent = 'Available variables:';
            title.style.fontWeight = '600';
            title.style.marginBottom = '6px';
            panel.appendChild(title);

            var list = document.createElement('div');
            var parsedVars = parseVariables();
            
            Object.keys(vars).forEach(function(k){
                var row = document.createElement('div');
                row.style.display = 'inline-block';
                row.style.marginRight = '8px';
                row.style.marginBottom = '6px';

                var name = document.createElement('button');
                name.type = 'button';
                name.textContent = k;
                name.style.border = '1px solid rgba(0,0,0,0.08)';
                // Distinguish custom variables with a different background color
                var isCustom = customVariables.hasOwnProperty(k);
                name.style.background = isCustom ? '#e0f2fe' : '#f3f4f6';
                name.style.padding = '4px 6px';
                name.style.borderRadius = '4px';
                name.style.cursor = 'pointer';
                name.dataset.varName = k;

                var val = document.createElement('span');
                val.textContent = ' = ' + String(vars[k]);
                val.style.marginLeft = '6px';
                val.style.color = '#333';

                row.appendChild(name);
                row.appendChild(val);
                
                // Add delete button for custom variables
                if (isCustom) {
                    var deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.textContent = '×';
                    deleteBtn.style.marginLeft = '4px';
                    deleteBtn.style.border = 'none';
                    deleteBtn.style.background = '#ef4444';
                    deleteBtn.style.color = '#fff';
                    deleteBtn.style.padding = '2px 6px';
                    deleteBtn.style.borderRadius = '3px';
                    deleteBtn.style.cursor = 'pointer';
                    deleteBtn.style.fontSize = '14px';
                    deleteBtn.style.fontWeight = 'bold';
                    deleteBtn.title = 'Delete custom variable';
                    deleteBtn.addEventListener('click', function(e){
                        e.stopPropagation();
                        delete customVariables[k];
                        saveCustomVariables();  // Save after deletion
                        renderVariablePanel(getAllVariables());
                    });
                    row.appendChild(deleteBtn);
                }
                
                list.appendChild(row);

                // Click behavior: insert variable name into focused input (answer box or custom var input), or copy to clipboard
                name.addEventListener('click', function(e){
                    var vname = e.currentTarget.dataset.varName;
                    // try to find focused input
                    var focused = document.activeElement;
                    if (focused && focused.tagName === 'INPUT' && (focused.classList.contains('codeshard') || focused.type === 'text')) {
                        // insert at caret
                        var start = focused.selectionStart || 0;
                        var end = focused.selectionEnd || 0;
                        var before = focused.value.substring(0, start);
                        var after = focused.value.substring(end);
                        focused.value = before + vname + after;
                        // move caret after inserted text
                        var pos = start + vname.length;
                        try { focused.setSelectionRange(pos, pos); } catch(e) {}
                        focused.focus();
                    } else {
                        // copy to clipboard as fallback
                        try {
                            navigator.clipboard.writeText(vname);
                            // tiny feedback
                            e.currentTarget.textContent = vname + ' ✓';
                            setTimeout(function(){ e.currentTarget.textContent = vname; }, 900);
                        } catch (err) {
                            // fallback prompt
                            window.prompt('Copy variable name', vname);
                        }
                    }
                });
            });

            if (Object.keys(vars).length === 0) {
                var none = document.createElement('div');
                none.textContent = 'No variables detected in problem text.';
                none.style.color = '#666';
                panel.appendChild(none);
            } else {
                panel.appendChild(list);
            }

            // Add custom variable input section
            var customSection = document.createElement('div');
            customSection.style.marginTop = '10px';
            customSection.style.paddingTop = '10px';
            customSection.style.borderTop = '1px solid rgba(0,0,0,0.08)';

            var customTitle = document.createElement('div');
            customTitle.textContent = 'Define custom variable:';
            customTitle.style.fontWeight = '600';
            customTitle.style.marginBottom = '6px';
            customSection.appendChild(customTitle);

            var inputRow = document.createElement('div');
            inputRow.style.display = 'flex';
            inputRow.style.gap = '6px';
            inputRow.style.alignItems = 'center';

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'name (e.g., a)';
            nameInput.style.width = '100px';
            nameInput.style.padding = '4px 6px';
            nameInput.style.border = '1px solid rgba(0,0,0,0.2)';
            nameInput.style.borderRadius = '4px';

            var equalsSign = document.createElement('span');
            equalsSign.textContent = '=';
            equalsSign.style.fontWeight = 'bold';

            var valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.placeholder = 'value (e.g., 5)';
            valueInput.style.width = '100px';
            valueInput.style.padding = '4px 6px';
            valueInput.style.border = '1px solid rgba(0,0,0,0.2)';
            valueInput.style.borderRadius = '4px';

            var addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = 'Add Variable';
            addBtn.style.padding = '4px 12px';
            addBtn.style.border = 'none';
            addBtn.style.background = '#10b981';
            addBtn.style.color = '#fff';
            addBtn.style.borderRadius = '4px';
            addBtn.style.cursor = 'pointer';
            addBtn.style.fontWeight = '500';

            var addVariable = function() {
                var name = nameInput.value.trim();
                var valueStr = valueInput.value.trim();
                
                if (!name) {
                    alert('Please enter a variable name');
                    return;
                }
                
                if (!/^[A-Za-z]\w*$/.test(name)) {
                    alert('Variable name must start with a letter and contain only letters, numbers, and underscores');
                    return;
                }
                
                if (!valueStr) {
                    alert('Please enter a value');
                    return;
                }
                
                var value = Number(valueStr);
                if (isNaN(value)) {
                    alert('Value must be a valid number');
                    return;
                }
                
                customVariables[name] = value;
                saveCustomVariables();  // Save after adding
                nameInput.value = '';
                valueInput.value = '';
                renderVariablePanel(getAllVariables());
            };

            addBtn.addEventListener('click', addVariable);
            
            // Allow Enter key to add variable
            nameInput.addEventListener('keydown', function(e){
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                }
            });
            valueInput.addEventListener('keydown', function(e){
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addVariable();
                }
            });

            inputRow.appendChild(nameInput);
            inputRow.appendChild(equalsSign);
            inputRow.appendChild(valueInput);
            inputRow.appendChild(addBtn);
            customSection.appendChild(inputRow);
            panel.appendChild(customSection);

            // Insert the panel just above the problem body
            pb.parentNode.insertBefore(panel, pb);
        } catch (err) {
            console.error('[WeBWorKer] renderVariablePanel error', err);
        }
    };

    // Note: expression evaluation removed — we perform textual variable substitution only

    var retrieveSelectInputs = function () {
        return document.getElementsByClassName("pg-select");
    };

    // Store substitution functions for all inputs
    var inputSubstitutionFunctions = [];

    // Function to apply variable substitution to all inputs
    var applyVariablesToAllInputs = function() {
        console.log('[WeBWorKer] Applying variables to all inputs before submit');
        inputSubstitutionFunctions.forEach(function(fn) {
            try {
                fn();
            } catch (e) {
                console.error('[WeBWorKer] Error applying variables to input', e);
            }
        });
    };

    var applyToInputs = function () {
        console.log("[WeBWorKer] Inserting MathView elements");
        
        // Load custom variables at the start
        loadCustomVariables();
        
        // Clear the array for fresh page load
        inputSubstitutionFunctions = [];
        
        var inputs = retrieveTextInputs();
        for (let i = 0; i < inputs.length; i++) {
            let theInput = inputs[i];
    
            // If MathView is not yet applied, create MathView
            if (!MathView.hasMathView(theInput)) {
                var aMath = theInput.value;
    
                var mathView = MathView.createMathView(i, theInput);
    
                theInput.nextSibling.insertAdjacentElement('afterend', mathView);
                MathView.updateMath(i, aMath);
    
                // Set input attributes
                theInput.setAttribute("autocomplete", "off");
                theInput.setAttribute("autocorrect", "off");
                theInput.setAttribute("autocapitalize", "off");
                theInput.setAttribute("spellcheck", "false");
    
                // Create a resizable container around the input box
                var wrapperDiv = document.createElement("div");
                wrapperDiv.className = "resizable-input-container";
                wrapperDiv.style.position = "relative";
                wrapperDiv.style.display = "inline-block";
                wrapperDiv.style.resize = "horizontal";
                wrapperDiv.style.overflow = "auto";
                wrapperDiv.style.padding = "2px";
                wrapperDiv.style.minWidth = "100px";  // Set minimum width
                wrapperDiv.style.minHeight = "30px"; // Set minimum height
    
                // Insert the input into the wrapper
                theInput.parentNode.insertBefore(wrapperDiv, theInput);
                wrapperDiv.appendChild(theInput);
    
                // Style the input so it fits within the resizable container
                theInput.style.width = "100%";
                theInput.style.height = "30px"; // Fixed height to prevent vertical resizing
                theInput.style.boxSizing = "border-box"; // Ensures padding and borders are included in the width and height
                theInput.style.lineHeight = "30px"; // Ensure text stays vertically centered
                theInput.style.whiteSpace = "nowrap"; // Ensure no text wrapping (single-line input behavior)
                
                // Update placeholder to indicate variable feature
                theInput.setAttribute("placeholder", "Enter answer or use variables (e.g., k*x*2) - Press Ctrl+Enter to apply");
                
                // --- Combined variable processing with keyboard shortcut ---
                try {
                    // Use IIFE to capture the current input in closure
                    (function(currentInput) {
                        // Function to evaluate expression by substituting parsed variables
                        var applyVariableSubstitution = function () {
                            var expr = currentInput.value || '';
                            var vars = getAllVariables();
                            if (!expr) {
                                return;
                            }

                            // Built-in function names to ignore in variable segmentation and unknown-identifier checks
                            var allowedFunctions = [
                                // Trig
                                'sin','cos','tan','sec','csc','cot',
                                'asin','acos','atan','asec','acsc','acot',
                                'arcsin','arccos','arctan',
                                // Hyperbolic
                                'sinh','cosh','tanh','sech','csch','coth',
                                'asinh','acosh','atanh','asech','acsch','acoth',
                                // Misc math
                                'log','ln','exp','sqrt','abs','floor','ceil','round','min','max','pow'
                            ];
                            var fnSet = new Set(allowedFunctions);

                            // Pre-process expression to insert explicit multiplication where users type concatenated variables
                            // Support multi-letter variables by greedily segmenting letter runs into known variable names.
                            try {
                                var names = Object.keys(vars).sort(function(a,b){return b.length - a.length;});

                                // Replace contiguous identifier runs with segmentation based on known variable names.
                                expr = expr.replace(/([A-Za-z]\w*)/g, function(match) {
                                    var i = 0;
                                    var parts = [];
                                    // If the whole token is a known function, leave it untouched
                                    if (fnSet.has(match.toLowerCase())) return match;
                                    while (i < match.length) {
                                        var found = false;
                                        for (var vi = 0; vi < names.length; vi++) {
                                            var nm = names[vi];
                                            if (match.substr(i, nm.length) === nm) {
                                                parts.push(nm);
                                                i += nm.length;
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (!found) {
                                        // cannot segment this run using known vars -> leave original run
                                        return match;
                                    }
                                }
                                return parts.join('*');
                            });

                            // insert * between number and identifier: 2A -> 2*A
                            expr = expr.replace(/(\d(?:\.\d+)?)(?=\s*[A-Za-z]\w*)/g, '$1*');
                            // insert * between identifier and open paren: A( -> A*(, but NOT for known functions like sin(
                            expr = expr.replace(/([A-Za-z]\w*)(\s*\()/g, function(_, name, paren){
                                return fnSet.has(name.toLowerCase()) ? (name + paren) : (name + '*' + paren);
                            });

                            // Support function application without parentheses, e.g., sin6 -> sin(6), ln x -> ln(x)
                            var fnAlt = Array.from(fnSet).sort(function(a,b){return b.length - a.length;}).join('|');
                            // Function followed by a number literal (no parens already)
                            expr = expr.replace(new RegExp('\\b(' + fnAlt + ')(?!\\s*\\()\\s*([+-]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][+-]?\\d+)?)\\b','gi'), function(_m, fn, num){
                                return fn + '(' + num + ')';
                            });
                            // Function followed by an identifier (variable) without parens: sinx -> sin(x), also allow space: sin x
                            expr = expr.replace(new RegExp('\\b(' + fnAlt + ')(?!\\s*\\()\\s*([A-Za-z]\\w*)\\b','gi'), function(_m, fn, id){
                                // Don't wrap if the id itself is a known function (rare but safe check)
                                if (fnSet.has(id.toLowerCase())) return _m;
                                return fn + '(' + id + ')';
                            });
                        } catch (e) {
                            console.error('[WeBWorKer] error normalizing multiplication in expression', e);
                        }

                        // Sort var names by length desc to avoid partial replacements
                        var names = Object.keys(vars).sort(function(a,b){return b.length - a.length;});
                        for (var vi = 0; vi < names.length; vi++) {
                            var nm = names[vi];
                            // Replace identifiers with parenthesized numeric value
                            // Use word boundaries to avoid replacing inside other names
                            var esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            var reVar = new RegExp('\\b' + esc + '\\b', 'g');
                            expr = expr.replace(reVar, '(' + String(vars[nm]) + ')');
                        }

                        // Allow unknown identifiers to pass through; we only sanitize characters below

                        // Allow only a safe set of characters (operators, digits, parentheses, commas, letters for known funcs, whitespace, decimal and exponent notation, and caret ^)
                        if (!/^[0-9A-Za-z+\-*/^()., _%eE]+$/.test(expr)) {
                            alert('Expression contains invalid characters.');
                            return;
                        }

                        // Trim and set the substituted expression directly into the answer input
                        expr = expr.trim();
                        currentInput.value = expr;
                        try {
                            if (MathView && MathView.updateMath && currentInput.hasAttribute(MathView.MV_ATTR_ATTACHED)) {
                                MathView.updateMath(currentInput.getAttribute(MathView.MV_ATTR_ATTACHED), currentInput.value);
                            }
                        } catch (e) {
                            // ignore math view update failures
                        }
                    };

                    // Store this function for later use on submit
                    inputSubstitutionFunctions.push(applyVariableSubstitution);

                    // Allow Ctrl+Enter in main input to trigger variable substitution
                    currentInput.addEventListener('keydown', function (evt) {
                        if (evt.ctrlKey && evt.key === 'Enter') {
                            evt.preventDefault();
                            applyVariableSubstitution();
                        }
                    });
                    })(theInput); // Close IIFE and pass theInput
                } catch (e) {
                    console.error('[WeBWorKer] Failed to attach variable processing', e);
                }
            }
        }
        console.log("[WeBWorKer] Rendered");
        // After rendering inputs, show variable panel
        try {
            var vars = getAllVariables();  // Use getAllVariables instead of parseVariables
            renderVariablePanel(vars);
        } catch (e) {
            console.error('[WeBWorKer] error rendering variables panel', e);
        }
    };

    var createClearAnswers = async function () {
        console.log("[WeBWorKer] Creating Clear Answers button");

        // Check if the button already exists
        if (document.getElementById("clearAnswersButton")) {
            console.log("[WeBWorKer] Clear Answers button already attached");
            return;
        }

        // Check if the feature is enabled
        var { clearAnswersEnabled } = await chrome.storage.sync.get({ clearAnswersEnabled: true });
        if (!clearAnswersEnabled) return;

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            // Create "Clear Answers" button
            var clearAnswers = document.createElement("input");
            clearAnswers.id = "clearAnswersButton";
            clearAnswers.className = "btn btn-primary mb-1";
            clearAnswers.type = "submit";
            clearAnswers.value = "Clear Answers";
            clearAnswers.style.backgroundColor = "#dd5555";
            clearAnswers.style.backgroundImage = "none";

            clearAnswers.addEventListener("click", function (e) {
                e.preventDefault();
                if (!confirm("Are you sure you want to clear all answer boxes on this page? This cannot be undone.")) {
                    return;
                }

                var textInputs = retrieveTextInputs();
                for (var i = 0; i < textInputs.length; i++) {
                    var theInput = textInputs[i];
                    theInput.value = "";

                    if (MathView.hasMathView(theInput)) {
                        MathView.updateMath(theInput.getAttribute(MathView.MV_ATTR_ATTACHED), "");
                    }
                }

                var selectInputs = retrieveSelectInputs();
                for (var i = 0; i < selectInputs.length; i++) {
                    selectInputs[i].value = 0;
                }
            });

            // Insert the button
            previewAnswers.parentNode.insertBefore(clearAnswers, null);
        }
    };

    var createPiazzaButton = async function () {
        console.log("[WeBWorKer] Creating Piazza button");

        // Check if the feature is enabled
        var { piazzaEnabled } = await chrome.storage.sync.get({ piazzaEnabled: true });
        if (!piazzaEnabled) return;

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            // Create "Piazza Button" button
            var piazzaButton = document.createElement("input");
            piazzaButton.id = "piazzaButton";
            piazzaButton.className = "btn btn-secondary mb-1"; // Adjust the class as needed
            piazzaButton.type = "button";
            piazzaButton.value = "Open Piazza";
            piazzaButton.style.backgroundColor = "#4e739d";
            piazzaButton.style.backgroundImage = "none";

            // Add event listener to copy text from the div with id "problem_body" when clicked
            piazzaButton.addEventListener("click", function () {
                // Get the element with id "problem_body"
                var breadcrumbElement = document.querySelector(".breadcrumb-item.active");

                // Check if the element exists
                if (breadcrumbElement) {
                    // Copy the content to clipboard
                    var textarea = document.createElement("textarea");
                    textarea.value = "q" + breadcrumbElement.textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);

                    // Open Piazza with the copied text
                    window.open("https://piazza.com/", "_blank");
                }
            });

            // Insert the button
            previewAnswers.parentNode.insertBefore(piazzaButton, null);
        }
    };

    var createResourcesButton = async function () {
        console.log("[WeBWorKer] Creating Online Resources button");

        // Check if the feature is enabled
        var { resourcesEnabled } = await chrome.storage.sync.get({ resourcesEnabled: true });
        if (!resourcesEnabled) return;

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            // Create "Google Search Button" button
            var googleSearchButton = document.createElement("input");
            googleSearchButton.id = "googleSearchButton";
            googleSearchButton.className = "btn btn-secondary mb-1"; // Adjust the class as needed
            googleSearchButton.type = "button";
            googleSearchButton.value = "Online Resources";
            googleSearchButton.style.backgroundColor = "#731DD8";
            googleSearchButton.style.backgroundImage = "none";

            // Add event listener to copy text from the div with id "problem_body" when clicked
            googleSearchButton.addEventListener("click", function () {
                // Get the element with id "problem_body"
                var problemBody = document.getElementById("problem_body");

                // Check if the element exists
                if (problemBody) {
                    // Copy the content to clipboard
                    var textarea = document.createElement("textarea");
                    textarea.value = problemBody.textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);

                    // Open Google search with the copied text
                    window.open("https://www.google.com/search?q=" + encodeURIComponent(problemBody.textContent), "_blank");
                }
            });

            // Insert the button
            previewAnswers.parentNode.insertBefore(googleSearchButton, null);
        }
    };

    // Add this function to create the Screenshot button

    var cropScreenshot = (function () {
        var canvas = null;
        var template = null;

        return function (image, area, dpr, preserve, format) {
            return new Promise(function (resolve, reject) {
                var top = Math.round(area.y * dpr);
                var left = Math.round(area.x * dpr);
                var width = Math.max(1, Math.round(area.w * dpr));
                var height = Math.max(1, Math.round(area.h * dpr));
                var targetWidth = (dpr !== 1 && preserve) ? width : area.w;
                var targetHeight = (dpr !== 1 && preserve) ? height : area.h;

                if (!canvas) {
                    template = document.createElement('template');
                    canvas = document.createElement('canvas');
                    document.body.appendChild(template);
                    template.appendChild(canvas);
                }

                var destWidth = Math.max(1, Math.round(targetWidth));
                var destHeight = Math.max(1, Math.round(targetHeight));
                canvas.width = destWidth;
                canvas.height = destHeight;

                var finalize = function () {
                    try {
                        resolve(canvas.toDataURL(`image/${format}`));
                    } catch (err) {
                        reject(err);
                    }
                };

                var handleImageError = function () {
                    reject(new Error('Failed to load captured image'));
                };

                if (Array.isArray(image)) {
                    (function loop(index) {
                        if (index === image.length) {
                            finalize();
                            return;
                        }
                        var segment = image[index];
                        var img = new Image();
                        img.onload = function () {
                            var context = canvas.getContext('2d');
                            context.drawImage(
                                img,
                                left,
                                top,
                                width,
                                height,
                                0,
                                segment.offset || 0,
                                destWidth,
                                destHeight
                            );
                            loop(index + 1);
                        };
                        img.onerror = handleImageError;
                        img.src = segment.image;
                    })(0);
                } else {
                    var single = new Image();
                    single.onload = function () {
                        var context = canvas.getContext('2d');
                        context.drawImage(
                            single,
                            left,
                            top,
                            width,
                            height,
                            0,
                            0,
                            destWidth,
                            destHeight
                        );
                        finalize();
                    };
                    single.onerror = handleImageError;
                    single.src = image;
                }
            });
        };
    })();

    var clampCaptureArea = function (rect) {
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        var x = Math.min(viewportWidth, Math.max(0, rect.left));
        var y = Math.min(viewportHeight, Math.max(0, rect.top));
        var right = Math.max(x, Math.min(viewportWidth, rect.right));
        var bottom = Math.max(y, Math.min(viewportHeight, rect.bottom));

        return {
            x: x,
            y: y,
            w: Math.max(0, right - x),
            h: Math.max(0, bottom - y)
        };
    };

    var ensureCapturePermission = function () {
        return new Promise(function (resolve, reject) {
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                resolve();
                return;
            }
            chrome.runtime.sendMessage({ type: 'weworker.ensureCapturePermission' }, function (response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!response || !response.ok) {
                    var msg = response && response.error ? response.error : 'Screenshot permission denied.';
                    reject(new Error(msg));
                    return;
                }
                resolve();
            });
        });
    };

    var requestVisibleTabCapture = function (format, quality) {
        return new Promise(function (resolve, reject) {
            chrome.runtime.sendMessage({
                type: 'weworker.captureVisibleTab',
                format: format,
                quality: quality
            }, function (response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!response || !response.ok || !response.image) {
                    var msg = response && response.error ? response.error : 'Unable to capture tab';
                    reject(new Error(msg));
                    return;
                }

                resolve(response.image);
            });
        });
    };

    var captureElementScreenshot = async function (element, format) {
        format = format || 'png';
        var rect = element.getBoundingClientRect();
        var area = clampCaptureArea(rect);
        if (area.w === 0 || area.h === 0) {
            throw new Error('Target is outside the viewport');
        }

        var dataUrl = await requestVisibleTabCapture(format);
        var dpr = window.devicePixelRatio || 1;
        return await cropScreenshot(dataUrl, area, dpr, true, format);
    };

    var downloadDataUrl = function (dataUrl, fileName) {
        var link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
    };

    var copyImageToClipboard = async function (dataUrl) {
        try {
            // Convert data URL to blob
            var response = await fetch(dataUrl);
            var blob = await response.blob();
            
            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            throw error;
        }
    };
    
    var createScreenshotButton = async function () {
        console.log("[WeBWorKer] Creating Screenshot button");
    
        // Check if the feature is enabled
        var { screenshotButtonEnabled } = await chrome.storage.sync.get({ screenshotButtonEnabled: true });
        console.log("Screenshot Button Enabled:", screenshotButtonEnabled);
        if (!screenshotButtonEnabled) return;
    
        var previewAnswers = document.getElementById("previewAnswers_id");
        if (!previewAnswers) {
            console.log("[WeBWorKer] 'previewAnswers_id' not found.");
            return;
        }
    
        // Create the "Screenshot" button
        var screenshotButton = document.createElement("input");
        screenshotButton.id = "screenshotButton";
        screenshotButton.className = "btn btn-secondary mb-1";
        screenshotButton.type = "button";
        screenshotButton.value = "Screenshot Question";
        screenshotButton.style.backgroundColor = "#5a9";
        screenshotButton.style.backgroundImage = "none";
    
        // Add event listener to take a screenshot of the question
        screenshotButton.addEventListener("click", async function () {
            var questionElement = document.querySelector(".problem-content") || document.getElementById("problem_body");
            var breadcrumbElement = document.getElementById("breadcrumb-row");

            var fileName = "question-screenshot.png";
            if (breadcrumbElement && breadcrumbElement.textContent.trim() !== "") {
                fileName = breadcrumbElement.textContent.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".png";
            }

            if (!questionElement) {
                alert("Question content not found!");
                return;
            }

            var initialRect = questionElement.getBoundingClientRect();
            if (initialRect.top < 0 || initialRect.bottom > window.innerHeight) {
                questionElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                await new Promise(function (resolve) {
                    if (typeof requestAnimationFrame !== 'function') {
                        setTimeout(resolve, 50);
                        return;
                    }
                    requestAnimationFrame(function () {
                        requestAnimationFrame(resolve);
                    });
                });
            }

            // Temporarily hide elements that might block the screenshot
            var elementsToHide = [];
            var selectors = [
                '.masthead', '.row.sticky-nav'
            ];
            
            selectors.forEach(function(selector) {
                var elements = document.querySelectorAll(selector);
                elements.forEach(function(el) {
                    var rect = el.getBoundingClientRect();
                    var qRect = questionElement.getBoundingClientRect();
                    // Only hide if element overlaps with question element
                    if (rect.bottom > qRect.top && rect.top < qRect.bottom) {
                        elementsToHide.push({
                            element: el,
                            originalDisplay: el.style.display,
                            originalVisibility: el.style.visibility
                        });
                        el.style.display = 'none';
                    }
                });
            });

            // After hiding elements, scroll to fit the problem element properly
            await new Promise(function (resolve) {
                if (typeof requestAnimationFrame !== 'function') {
                    setTimeout(resolve, 50);
                    return;
                }
                requestAnimationFrame(function () {
                    requestAnimationFrame(resolve);
                });
            });

            // Ensure the element is properly positioned after hiding overlays
            questionElement.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
            
            // Wait for scroll and layout to complete
            await new Promise(function (resolve) {
                if (typeof requestAnimationFrame !== 'function') {
                    setTimeout(resolve, 100);
                    return;
                }
                requestAnimationFrame(function () {
                    requestAnimationFrame(function() {
                        setTimeout(resolve, 50);
                    });
                });
            });

            try {
                await ensureCapturePermission();
                var imageData = await captureElementScreenshot(questionElement, 'png');
                
                // Get screenshot mode from settings
                var settings = await chrome.storage.sync.get({ screenshotMode: 'copy' });
                var mode = settings.screenshotMode;
                
                if (mode === 'copy') {
                    // Copy to clipboard
                    try {
                        await copyImageToClipboard(imageData);
                        alert('Screenshot copied to clipboard!');
                    } catch (copyError) {
                        console.error('Failed to copy screenshot:', copyError);
                        alert('Failed to copy to clipboard. Try download mode instead.');
                    }
                } else {
                    // Download
                    downloadDataUrl(imageData, fileName);
                }
            } catch (error) {
                console.error("Screenshot failed:", error);
                alert("Screenshot failed: " + error.message);
            } finally {
                // Restore hidden elements
                elementsToHide.forEach(function(item) {
                    item.element.style.display = item.originalDisplay;
                    item.element.style.visibility = item.originalVisibility;
                });
            }
        });
    
        // Insert the button
        console.log("[WeBWorKer] Inserting Screenshot button.");
        previewAnswers.parentNode.insertBefore(screenshotButton, null);
    };

    var createCustomQueryButton = async function () {
        console.log("[WeBWorKer] Creating Custom Query button");

        // Check if the feature is enabled
        var { customQueryEnabled, customQueryUrl, customQueryButtonText } = await chrome.storage.sync.get({ 
            customQueryEnabled: true, 
            customQueryUrl: "https://chat.openai.com/?q=",
            customQueryButtonText: "Custom Query"
        });
        if (!customQueryEnabled) return;

        var previewAnswers = document.getElementById("previewAnswers_id");
        if (previewAnswers != null) {
            // Create "Custom Query" button
            var customQueryButton = document.createElement("input");
            customQueryButton.id = "customQueryButton";
            customQueryButton.className = "btn btn-secondary mb-1";
            customQueryButton.type = "button";
            customQueryButton.value = customQueryButtonText;
            customQueryButton.style.backgroundColor = "#10a37f";
            customQueryButton.style.backgroundImage = "none";

            // Add event listener to open the custom URL with the question pre-filled
            customQueryButton.addEventListener("click", function () {
                // Get the element with id "problem_body"
                var problemBody = document.getElementById("problem_body");

                // Check if the element exists
                if (problemBody) {
                    // Open custom URL with the question as a query parameter
                    var questionText = problemBody.textContent;
                    var fullUrl = customQueryUrl + encodeURIComponent(questionText);
                    window.open(fullUrl, "_blank");
                }
            });

            // Insert the button
            previewAnswers.parentNode.insertBefore(customQueryButton, null);
        }
    };

    // ===== PARENTHESES CHECKER =====
    // Adapted from wwchecker by James Yuzawa (jyuzawa.com / github.com/yuzawa-san)
    var ParenthesesChecker = (function() {
        var checkerActive = false;
        var floater;

        function spaces(n) {
            var str = "";
            for (var i = 0; i < n; i++) {
                str += "&nbsp;";
            }
            return str;
        }

        function checkMatchingBrackets(expr) {
            var tokenStack = [];
            var sexyText = "";
            var ct = 0;
            var lastUnclosedIndex = -1;

            for (var i = 0; i < expr.length; i++) {
                var ch = expr.charAt(i);

                if (ch == "(" || ch == "[" || ch == "{") {
                    tokenStack.push(ch);
                    sexyText += "<span class=ww_pair" + (ct % 5) + ">" + ch + "</span>";
                    ct++;
                } else if (ch == ")" || ch == "]" || ch == "}") {
                    var head = tokenStack[tokenStack.length - 1];
                    if (!head) {
                        return [false, i, sexyText + "<span class=ww_pairbad>" + expr.substring(i) + "</span>"];
                    }
                    if ((head == "(" && ch == ")") || (head == "[" && ch == "]") || (head == "{" && ch == "}")) {
                        tokenStack.pop();
                        ct--;
                        sexyText += "<span class=ww_pair" + (ct % 5) + ">" + ch + "</span>";
                    } else {
                        lastUnclosedIndex = i;
                        return [false, lastUnclosedIndex, sexyText];
                    }
                } else {
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
                lastUnclosedIndex = expr.length - 1;
            }

            return [tokenStack.length === 0, lastUnclosedIndex, sexyText];
        }

        function isValid(inputElement) {
            var expr = inputElement.value;

            if (checkerActive && (expr !== '' || inputElement === document.activeElement)) {
                if (expr.match(/[\(\[\{\)\]\}]/)) {
                    floater.style.display = 'block';
                    var validationOutput = checkMatchingBrackets(expr);
                    if (validationOutput[0]) {
                        showValidFloater(validationOutput[2]);
                    } else {
                        showInvalidFloater(validationOutput[2], validationOutput[1]);
                    }
                } else {
                    floater.style.display = 'none';
                }
            } else {
                floater.style.display = 'none';
            }
        }

        function showValidFloater(content) {
            floater.classList.remove('ww_invalid_floater');
            floater.innerHTML = content;
        }

        function showInvalidFloater(content, errorLocation) {
            floater.classList.add('ww_invalid_floater');
            floater.innerHTML = content + "<br>" + spaces(errorLocation) + "<span class=ww_fail>^</span>";
        }

        function updateFloaterPosition(inputElement) {
            if (inputElement) {
                var rect = inputElement.getBoundingClientRect();
                floater.style.left = (rect.left + window.scrollX) + 'px';
                floater.style.top = (rect.top + window.scrollY + inputElement.offsetHeight + 10) + 'px';
            }
        }

        function init() {
            // Create floater element
            floater = document.createElement('div');
            floater.id = 'wwchecker-floater';
            document.body.prepend(floater);

            // Load checker state
            chrome.storage.sync.get({ checkParenthesesEnabled: true }, function(result) {
                checkerActive = result.checkParenthesesEnabled;

                // Bind events to answer input boxes
                var inputs = document.querySelectorAll('input[id*=AnSwEr], input[id*=MuLtIaNsWeR]');
                inputs.forEach(function(inputElement) {
                    inputElement.addEventListener('input', function() {
                        isValid(inputElement);
                    });

                    inputElement.addEventListener('focus', function() {
                        updateFloaterPosition(inputElement);
                        isValid(inputElement);
                    });

                    inputElement.addEventListener('blur', function() {
                        floater.style.display = 'none';
                    });
                });
            });

            // Reposition on scroll/resize
            window.addEventListener('resize', function() {
                var focusedInput = document.querySelector('input:focus');
                if (focusedInput) {
                    updateFloaterPosition(focusedInput);
                }
            });

            window.addEventListener('scroll', function() {
                var focusedInput = document.querySelector('input:focus');
                if (focusedInput) {
                    updateFloaterPosition(focusedInput);
                }
            });
        }

        return { init: init };
    })();
       

    var main = async function () {
        applyToInputs();
        await createClearAnswers();
        await createPiazzaButton();
        await createResourcesButton();
        await createScreenshotButton();
        await createCustomQueryButton();
        ParenthesesChecker.init();
        // Enhance Homework Sets table on appropriate pages
        try {
            enhanceHomeworkTable();
        } catch (e) {
            console.error('[WeBWorKer] enhanceHomeworkTable failed', e);
        }
        // Intercept submit button to apply variables before submitting
        interceptSubmitButton();
    };

    // Intercept submit button clicks to apply variable substitution before submitting
    var interceptSubmitButton = function() {
        console.log('[WeBWorKer] Setting up submit button interception');
        
        // Find all forms on the page
        var forms = document.querySelectorAll('form');
        forms.forEach(function(form) {
            // Look for submit button in this form
            var submitButton = form.querySelector('[name="submitAnswers"]');
            if (submitButton) {
                // Store original click handler flag
                if (!submitButton.hasAttribute('data-weworker-intercepted')) {
                    submitButton.setAttribute('data-weworker-intercepted', 'true');
                    
                    // Add click event listener with capture phase to intercept before other handlers
                    submitButton.addEventListener('click', function(event) {
                        console.log('[WeBWorKer] Submit button clicked, applying variables to all inputs');
                        // Apply variable substitution to all inputs
                        applyVariablesToAllInputs();
                        // Let the original submit process continue
                    }, true); // Use capture phase
                }
            }
        });
        
        console.log('[WeBWorKer] Submit button interception setup complete');
    };

    // Enhance Homework Sets table by fetching Grades page and inserting Problems and Score columns
    var enhanceHomeworkTable = async function() {
        try {
            var table = document.querySelector('table');
            if (!table) return;
            var caption = table.querySelector('caption')?.textContent || '';
            if (!caption.includes('Homework Sets')) return;

            console.log('[WeBWorKer] Enhancing Homework Sets table...');

            // Find Grades link on the page
            var gradesLink = null;
            var anchors = document.querySelectorAll('a');
            anchors.forEach(function(a){ if (!gradesLink && a.textContent && a.textContent.indexOf('Grades') !== -1) gradesLink = a.href; });
            if (!gradesLink) {
                console.warn('[WeBWorKer] Grades link not found');
                return;
            }

            // Fetch Grades page
            var resp = await fetch(gradesLink, {credentials: 'include'});
            if (!resp.ok) {
                console.warn('[WeBWorKer] Failed to fetch Grades page:', resp.status);
                return;
            }
            var html = await resp.text();
            var GradesDOM = new DOMParser().parseFromString(html, 'text/html');
            var gradeRows = GradesDOM.querySelector('tbody')?.querySelectorAll('tr') || [];

            function findMatch(rows, nameToMatch, col) {
                for (var ri = 0; ri < rows.length; ri++) {
                    var row = rows[ri];
                    var found = row.querySelector('th a')?.textContent;
                    if (found === nameToMatch) {
                        var cells = row.querySelectorAll('td');
                        var cell = cells[col - 1];
                        return cell ? cell.textContent.trim() : '';
                    }
                }
                return 'not found';
            }

            function newCell(row, type, pos, str, style) {
                var el = document.createElement(type);
                el.textContent = str;
                if (style) el.classList.add(style);
                row.insertBefore(el, row.children[pos]);
            }

            var header = table.querySelector('thead tr');
            var setRows = table.querySelector('tbody').querySelectorAll('tr');

            setRows.forEach(function(row){
                var assignment = (row.querySelector('a')?.textContent || row.querySelector('td')?.textContent || '').trim();
                var outOf = findMatch(gradeRows, assignment, 3);
                var percent = findMatch(gradeRows, assignment, 1);

                var style = null;
                if (percent && percent.indexOf('%') !== -1) {
                    if (percent === '100%') style = 'weworker-score-green';
                    else if (percent !== '0%') style = 'weworker-score-blue';
                }

                newCell(row, 'td', 1, outOf);
                newCell(row, 'td', 2, percent, style);
            });

            // Add headers
            newCell(header, 'th', 1, 'Problems');
            newCell(header, 'th', 2, 'Score');

            // Minimal styles for the classes
            var styleEl = document.getElementById('weworker-homework-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'weworker-homework-styles';
                styleEl.textContent = `
                    .weworker-score-green { background: #d1fae5; }
                    .weworker-score-blue { background: #e0f2fe; }
                `;
                document.head.appendChild(styleEl);
            }

            console.log('[WeBWorKer] Homework table enhancement complete.');
        } catch (err) {
            console.error('[WeBWorKer] Failed to enhance table:', err);
        }
    };

    // Check if the "problem-content" div is available instead of codeshard or pg-select classes
    var problemContent = document.querySelector(".problem-content");

    if (!problemContent) {
        console.log("[WeBWorKer] 'problem-content' not available. Waiting to insert MathView elements...");
        document.addEventListener("DOMContentLoaded", function () {
            console.log("[WeBWorKer] DOM available");
            main();
        });
    } else {
        main();
    }
};

webworkSetup();

let confirmationEnabled = true;

function confirmSubmit() {
  const scoreSummary = document.getElementById('score_summary');
  const hasUnlimited = scoreSummary && scoreSummary.innerText.toLowerCase().includes('unlimited');

  return confirmationEnabled && !hasUnlimited ? confirm("LIMITED ATTEMPTS!! Are you sure you want to submit?") : true;
}

function addConfirmationListener() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      const submitButton = form.querySelector('[name="submitAnswers"]');
      if (submitButton && !confirmSubmit()) {
        event.preventDefault();
      }
    });
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.toggleConfirmation) {
      confirmationEnabled = !confirmationEnabled;
      sendResponse({ confirmationEnabled });
    }
  }
);

addConfirmationListener();

(function() {
    'use strict';

    // Select all elements with the specified class
    var targetElements1 = document.querySelectorAll('.codeshard');

    // Iterate through each element and change its class
    targetElements1.forEach(function(element) {
        element.className = 'codeshard-btn';
    });
})();


(function() {
    'use strict';

    // Select all elements with the specified class
    var targetElements = document.querySelectorAll('.btn.btn-sm.btn-secondary.codeshard-btn');

    // Iterate through each element and change its class
    targetElements.forEach(function(element) {
        element.className = 'input-group d-inline-flex flex-nowrap w-auto mv-container';
        element.style.borderWidth = '0px'; // Set border width to 0px
        element.style.backgroundColor = 'transparent'; // Set background color to transparent
        element.style.transform = 'translateX(2px)'; // Move element to the right by 2 pixels
    });
})();


// Function to add the copyright footer
(function addCopyrightFooter() {
    var footer = document.getElementById("last-modified");
    if (footer) {
        var copyrightDiv = document.createElement("div");
        copyrightDiv.id = "WeBWorKer-copyright";
        copyrightDiv.textContent = "WeBWorKer Made By Daniel Benjamin © 2025";
        
        // Insert the new div before the last-modified element
        footer.parentNode.insertBefore(copyrightDiv, footer);
    };
})();


(function() {
    'use strict';

    // Select the container element where you want to add the duplicate submit button
    var submitButtonsContainer = document.querySelector('.d-flex.submit-buttons-container');

    // Find the existing submit button
    var existingSubmitButton = document.querySelector('[name="submitAnswers"]');

    // Check if both the container and the existing submit button are found
    if (submitButtonsContainer && existingSubmitButton) {
        // Create a new submit button element
        var duplicateSubmitButton = document.createElement("input");
        duplicateSubmitButton.className = "btn btn-primary";
        duplicateSubmitButton.type = "submit";
        duplicateSubmitButton.value = "Submit Answers"; // You can change the button text as needed

        // Add event listener to simulate click on the existing submit button
        duplicateSubmitButton.addEventListener("click", function() {
            existingSubmitButton.click(); // Simulate click on existing submit button
        });

        // Append the button to the container element
        submitButtonsContainer.appendChild(duplicateSubmitButton);
        console.log("[WeBWorKer] Duplicate submit button added.");
    } else {
        console.error("Existing submit button not found or submit buttons container not found!");
    }
})();

// Function to check if any PDFs are already rendered
function arePDFsAlreadyRendered() {
    const renderedPDFs = document.querySelectorAll("iframe[src$='.pdf']");
    return renderedPDFs.length > 0;
}

// Function to embed a PDF viewer when a placeholder image with a PDF source is found
function embedPDFViewerFromImage(imageElement) {
    const pdfUrl = imageElement.src;
    console.log("[WeBWorKer] Found PDF link in image src:", pdfUrl);

    // Create a container for the iframe and the open link
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.marginBottom = "10px"; // Add space below the container if needed

    // Create an iframe to display the PDF
    const iframe = document.createElement("iframe");
    iframe.src = pdfUrl;
    iframe.style.width = "100%";
    iframe.style.height = "600px"; // Adjust height as needed
    iframe.style.border = "none";

    // Create an "Open in New Tab" button below the iframe
    const openButton = document.createElement("a");
    openButton.href = pdfUrl;
    openButton.target = "_blank"; // Opens in a new tab
    openButton.textContent = "Open PDF in New Tab";
    openButton.style.display = "inline-block";
    openButton.style.marginTop = "8px";
    openButton.style.padding = "6px 12px";
    openButton.style.backgroundColor = "#007bff";
    openButton.style.color = "#fff";
    openButton.style.textDecoration = "none";
    openButton.style.borderRadius = "4px";
    openButton.style.fontSize = "14px";
    openButton.style.textAlign = "center";

    // Append the iframe and the button to the container
    container.appendChild(iframe);
    container.appendChild(openButton);

    // Replace the placeholder image with the container (iframe + button)
    imageElement.parentNode.replaceChild(container, imageElement);
    console.log("[WeBWorKer] PDF iframe with 'Open in New Tab' button embedded for:", pdfUrl);
}

// Function to detect and replace PDF placeholders
function detectAndRenderPDFPlaceholders() {
    console.log("[WeBWorKer] Detecting placeholder images with PDF links in src...");
    const placeholderImages = document.querySelectorAll("img.image-view-elt");

    placeholderImages.forEach(imageElement => {
        console.log("[WeBWorKer] Checking image src:", imageElement.src);

        if (imageElement.src.endsWith(".pdf") && imageElement.src.includes("/webwork2_files/tmp/")) {
            console.log("[WeBWorKer] Placeholder with PDF link detected in src:", imageElement.src);
            embedPDFViewerFromImage(imageElement);
        } else {
            console.log("[WeBWorKer] No matching PDF link for this image src.");
        }
    });
}

// Check if any PDFs are already rendered before proceeding
if (!arePDFsAlreadyRendered()) {
    console.log("[WeBWorKer] No rendered PDFs found. Proceeding with placeholder replacement.");

    // Initialize a MutationObserver to watch for new image placeholders
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.tagName === "IMG" && node.classList.contains("image-view-elt")) {
                    console.log("[WeBWorKer] New placeholder image detected:", node);

                    if (node.src.endsWith(".pdf") && node.src.includes("/webwork2_files/tmp/")) {
                        console.log("[WeBWorKer] New placeholder with PDF link detected in src:", node.src);
                        embedPDFViewerFromImage(node);
                    } else {
                        console.log("[WeBWorKer] New placeholder image does not match PDF link pattern.");
                    }
                }
            });
        });
    });

    // Observe the document body for changes (new image placeholders)
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    console.log("[WeBWorKer] MutationObserver initialized to watch for PDF placeholders.");

    // Initial call to render any PDFs that are already in the DOM
    detectAndRenderPDFPlaceholders();
} else {
    console.log("[WeBWorKer] Rendered PDFs already found on the page. Skipping placeholder replacement.");
}

// ==UserScript==
// @name         WebWorK Homework Table Enhancer
// @description  Adds score and problem count columns to the Homework Sets table using data from the Grades page.
// ==/UserScript==

window.addEventListener('load', async () => {
    const table = document.querySelector('table')
    if (!table) return

    // Only run if the page caption contains "Homework Sets"
    const caption = table.querySelector('caption')?.textContent || ''
    if (!caption.includes('Homework Sets')) return

    console.log('[WW—AL] Enhancing Homework Sets table...')

    try {
        // Find the "Grades" page link
        let gradesLink = null
        const anchors = document.querySelectorAll('a')
        for (const a of anchors) {
            if (a.textContent.includes('Grades')) {
                gradesLink = a.href
                break
            }
        }
        if (!gradesLink) throw new Error('Grades link not found')

        // Fetch and parse the Grades page HTML
        const response = await fetch(gradesLink)
        const html = await response.text()
        const GradesDOM = new DOMParser().parseFromString(html, 'text/html')
        const gradeRows = GradesDOM.querySelector('tbody')?.querySelectorAll('tr') || []
        console.log('[WW—AL] Grades page data parsed successfully')

        // Helper: find a grade row by assignment name and column number
        function findMatch(rows, nameToMatch, col) {
            for (const row of rows) {
                const found = row.querySelector('th a')?.textContent
                if (found === nameToMatch) {
                    const cells = row.querySelectorAll('td')
                    const cell = cells[col - 1]
                    return cell ? cell.textContent.trim() : ''
                }
            }
            return 'not found'
        }

        // Helper: create and insert a new table cell
        function newCell(row, type, pos, str, style) {
            const el = document.createElement(type)
            el.textContent = str
            if (style) el.classList.add(style)
            row.insertBefore(el, row.children[pos])
        }

        // Modify the main Homework Sets table
        const header = table.querySelector('thead tr')
        const setRows = table.querySelector('tbody').querySelectorAll('tr')

        setRows.forEach(row => {
            const assignment = row.querySelector('a')?.textContent || row.querySelector('td')?.textContent
            const outOf = findMatch(gradeRows, assignment, 3)
            const percent = findMatch(gradeRows, assignment, 1)

            // Apply color class
            let style = null
            if (percent.includes('%')) {
                if (percent === '100%') style = 'GREEN'
                else if (percent !== '0%') style = 'BLUE'
            }

            newCell(row, 'td', 1, outOf)
            newCell(row, 'td', 2, percent, style)
        })

        // Add new header cells
        newCell(header, 'th', 1, 'Problems')
        newCell(header, 'th', 2, 'Score')

        console.log('[WW—AL] Homework table enhancement complete.')
    } catch (err) {
        console.error(`[WW—AL] Failed to enhance table: ${err}`)
    }
})


/*
var createSettingsButton = function () {
    console.log("[WeBWorKer] Creating Settings button");

    // Check if the button already exists
    if (document.getElementById("settingsButton")) {
        console.log("[WeBWorKer] Settings button already attached");
        return;
    }

    var targetElement = document.querySelector(".btn.btn-light.btn-sm.ms-2");
    if (targetElement != null) {
        // Create "Settings" button
        var settingsButton = document.createElement("input");
        settingsButton.id = "settingsButton";
        settingsButton.className = "btn btn-light btn-sm ms-2"; // Adjust the class as needed
        settingsButton.type = "button";
        settingsButton.value = "WeBWorKer Settings";
        settingsButton.style.backgroundColor = "#007bff";
        settingsButton.style.backgroundImage = "none";

        // Add event listener to open extension options page
        settingsButton.addEventListener("click", function () {
            // Manually construct the options page URL and open it
            var optionsUrl = chrome.runtime.getURL('popup.html');
            window.open(optionsUrl);
        });

        // Insert the button before the target element
        targetElement.parentNode.insertBefore(settingsButton, targetElement);
    }
};

createSettingsButton();

*/
