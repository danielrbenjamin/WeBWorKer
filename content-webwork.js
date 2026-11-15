console.log("[WeBWorKer] content-webwork.js");

// Text-only expansion: never evaluate student expressions as JavaScript.
var WeBWorKerVariables = (function () {
    var functions = new Set([
        'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'asec', 'acsc', 'acot',
        'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth',
        'asinh', 'acosh', 'atanh', 'asech', 'acsch', 'acoth',
        'log', 'ln', 'exp', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'pow'
    ]);
    var numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
    var maxLength = 20000;
    var maxDepth = 32;
    var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };
    var token = function (type, text) { return { type: type, text: text }; };

    function tokenize(expression, variables) {
        if (expression.length > maxLength) throw new Error('Expression is too long to expand.');
        var names = Object.keys(variables).sort(function (a, b) { return b.length - a.length; });
        var functionNames = Array.from(functions).sort(function (a, b) { return b.length - a.length; });
        var result = [];
        for (var index = 0; index < expression.length;) {
            var rest = expression.slice(index);
            if (/^\s/.test(rest)) { index++; continue; }
            var number = rest.match(numeric);
            if (number) {
                if (!Number.isFinite(Number(number[0]))) throw new Error('Numbers must be finite.');
                result.push(token('number', number[0]));
                index += number[0].length;
                continue;
            }
            var identifier = rest.match(/^[A-Za-z]\w*/);
            if (identifier) {
                var numericFunction = !own(variables, identifier[0]) && functionNames.find(function (fn) {
                    return rest.toLowerCase().startsWith(fn) && numeric.test(rest.slice(fn.length));
                });
                if (numericFunction) {
                    var argumentNumber = rest.slice(numericFunction.length).match(numeric)[0];
                    if (!Number.isFinite(Number(argumentNumber))) throw new Error('Numbers must be finite.');
                    result.push(token('function', rest.slice(0, numericFunction.length)), token('number', argumentNumber));
                    index += numericFunction.length + argumentNumber.length;
                    continue;
                }
                var text = identifier[0];
                index += text.length;
                if (functions.has(text.toLowerCase())) {
                    result.push(token('function', text));
                    continue;
                }
                if (!own(variables, text)) {
                    // Preserve unknown identifiers as a whole. Only split a run
                    // when all of it consists of defined variable names.
                    var parts = [], offset = 0;
                    while (offset < text.length) {
                        var name = names.find(function (candidate) { return text.startsWith(candidate, offset); });
                        if (!name) break;
                        parts.push(token('identifier', name));
                        offset += name.length;
                    }
                    if (offset === text.length && parts.length > 1) {
                        result.push.apply(result, parts);
                        continue;
                    }
                    // Keep existing shorthand such as sin6, sinx and ln x,
                    // without treating arbitrary words like 'sinewave' as calls.
                    var shorthand = functionNames.find(function (fn) {
                        if (!text.toLowerCase().startsWith(fn)) return false;
                        var argument = text.slice(fn.length);
                        return /^[A-Za-z]$/.test(argument) || own(variables, argument) || /^\d+$/.test(argument);
                    });
                    if (shorthand) {
                        var argument = text.slice(shorthand.length);
                        result.push(token('function', text.slice(0, shorthand.length)));
                        result.push(token(/^\d+$/.test(argument) ? 'number' : 'identifier', argument));
                        continue;
                    }
                }
                result.push(token('identifier', text));
                continue;
            }
            var character = rest[0];
            if (!/[+\-*/^%(),]/.test(character)) throw new Error('Expression contains invalid characters.');
            result.push(token('symbol', character));
            index++;
        }
        return result;
    }

    function normalize(tokens) {
        var calls = [];
        for (var index = 0; index < tokens.length; index++) {
            var current = tokens[index];
            calls.push(current);
            if (current.type !== 'function' || tokens[index + 1]?.text === '(') continue;
            calls.push(token('symbol', '('));
            while (tokens[index + 1] && /^[+-]$/.test(tokens[index + 1].text)) calls.push(tokens[++index]);
            var argument = tokens[++index];
            if (!argument || !['number', 'identifier'].includes(argument.type)) {
                throw new Error('Use parentheses around function arguments.');
            }
            calls.push(argument, token('symbol', ')'));
        }
        var result = [];
        for (var item of calls) {
            var previous = result[result.length - 1];
            var endsOperand = previous && (['number', 'identifier'].includes(previous.type) || previous.text === ')');
            var startsOperand = ['number', 'identifier', 'function'].includes(item.type) || item.text === '(';
            if (endsOperand && startsOperand) {
                if (previous.type === 'number' && item.type === 'number') throw new Error('Separate numbers with an operator.');
                result.push(token('symbol', '*'));
            }
            result.push(item);
        }
        return result;
    }

    function validate(tokens) {
        var stack = [], needsOperand = true;
        for (var index = 0; index < tokens.length; index++) {
            var item = tokens[index];
            if (item.type === 'function') {
                if (!needsOperand || tokens[index + 1]?.text !== '(') throw new Error('Invalid function expression.');
            } else if (['number', 'identifier'].includes(item.type)) {
                if (!needsOperand) throw new Error('Missing operator in expression.');
                needsOperand = false;
            } else if (item.text === '(') {
                stack.push(tokens[index - 1]?.type === 'function');
                needsOperand = true;
            } else if (item.text === ')') {
                if (!stack.length || needsOperand) throw new Error('Check the parentheses in your expression.');
                stack.pop();
                needsOperand = false;
            } else if (item.text === ',') {
                if (needsOperand || !stack[stack.length - 1]) throw new Error('Commas must separate function arguments.');
                needsOperand = true;
            } else {
                if (needsOperand && !/^[+-]$/.test(item.text)) throw new Error('Missing value next to an operator.');
                needsOperand = true;
            }
        }
        if (stack.length || needsOperand) throw new Error('Expression is incomplete. Check its operators and parentheses.');
    }

    function expand(expression, variables) {
        variables = variables || {};
        if (!String(expression).trim()) return '';
        var resolved = new Map();
        function visit(text, path) {
            var output = [];
            for (var item of normalize(tokenize(String(text), variables))) {
                if (item.type !== 'identifier' || !own(variables, item.text)) {
                    output.push(item);
                } else {
                    var name = item.text;
                    if (path.includes(name)) throw new Error('Circular variable definition: ' + path.concat(name).join(' → '));
                    if (path.length >= maxDepth) throw new Error('Variable definitions are nested too deeply (maximum ' + maxDepth + ').');
                    if (!resolved.has(name)) {
                        var value = variables[name];
                        if ((typeof value !== 'string' && typeof value !== 'number') ||
                            (typeof value === 'number' && !Number.isFinite(value)) || !String(value).trim()) {
                            throw new Error('Variable ' + name + ' must contain a number or expression.');
                        }
                        resolved.set(name, visit(String(value), path.concat(name)));
                    }
                    output.push(token('symbol', '('));
                    output.push.apply(output, resolved.get(name));
                    output.push(token('symbol', ')'));
                }
                if (output.length > maxLength) throw new Error('Expanded expression is too long. Simplify your variable definitions.');
            }
            output = normalize(output);
            validate(output);
            if (output.map(function (item) { return item.text; }).join('').length > maxLength) {
                throw new Error('Expanded expression is too long. Simplify your variable definitions.');
            }
            return output;
        }
        return visit(expression, []).map(function (item) { return item.text; }).join('');
    }

    function prepareValue(name, text, variables) {
        if (!/^[A-Za-z]\w*$/.test(name)) throw new Error('Variable names must start with a letter and contain only letters, numbers, and underscores.');
        if (functions.has(name.toLowerCase())) throw new Error('Choose a variable name that is not a math function.');
        text = text.trim();
        if (!text) throw new Error('Please enter a value or expression.');
        var candidate = Object.assign({}, variables);
        candidate[name] = text;
        expand(name, candidate);
        return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) ? Number(text) : text;
    }
    return { expand: expand, prepareValue: prepareValue };
})();

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
    // Storage for parsed variables the user has chosen to disable
    var disabledParsedVariables = [];

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

    // Load disabled parsed variables from storage
    var loadDisabledParsedVariables = function() {
        try {
            var key = getStorageKey('disabledVars');
            var stored = localStorage.getItem(key);
            if (stored) {
                disabledParsedVariables = JSON.parse(stored) || [];
                console.log('[WeBWorKer] Loaded disabled parsed variables:', disabledParsedVariables);
            }
        } catch (e) {
            console.error('[WeBWorKer] Error loading disabled parsed variables', e);
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

    // Save disabled parsed variables to storage
    var saveDisabledParsedVariables = function() {
        try {
            var key = getStorageKey('disabledVars');
            localStorage.setItem(key, JSON.stringify(disabledParsedVariables));
            console.log('[WeBWorKer] Saved disabled parsed variables:', disabledParsedVariables);
        } catch (e) {
            console.error('[WeBWorKer] Error saving disabled parsed variables', e);
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
        // Remove disabled parsed variables
        try {
            if (Array.isArray(disabledParsedVariables) && disabledParsedVariables.length > 0) {
                disabledParsedVariables.forEach(function(name){ delete parsed[name]; });
            }
        } catch (e) {
            console.error('[WeBWorKer] Error filtering disabled parsed variables', e);
        }
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
                var isCustom = Object.prototype.hasOwnProperty.call(customVariables, k);
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
                } else {
                    // If this variable was parsed from the problem text, allow the user to disable it
                    try {
                        if (parsedVars && parsedVars.hasOwnProperty(k)) {
                            var disableBtn = document.createElement('button');
                            disableBtn.type = 'button';
                            disableBtn.textContent = 'Disable';
                            disableBtn.style.marginLeft = '4px';
                            disableBtn.style.border = '1px solid rgba(0,0,0,0.06)';
                            disableBtn.style.background = '#f3f4f6';
                            disableBtn.style.color = '#333';
                            disableBtn.style.padding = '2px 6px';
                            disableBtn.style.borderRadius = '3px';
                            disableBtn.style.cursor = 'pointer';
                            disableBtn.style.fontSize = '12px';
                            disableBtn.title = 'Disable this detected variable';
                            disableBtn.addEventListener('click', function(e){
                                e.stopPropagation();
                                try {
                                    if (disabledParsedVariables.indexOf(k) === -1) {
                                        disabledParsedVariables.push(k);
                                        saveDisabledParsedVariables();
                                    }
                                } catch (err) {
                                    console.error('[WeBWorKer] Error disabling parsed variable', err);
                                }
                                renderVariablePanel(getAllVariables());
                            });
                            row.appendChild(disableBtn);
                        }
                    } catch (err) {
                        // ignore panel errors
                    }
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

            // Add disabled variables section if there are any
            if (Array.isArray(disabledParsedVariables) && disabledParsedVariables.length > 0) {
                var disabledSection = document.createElement('div');
                disabledSection.style.marginTop = '10px';
                disabledSection.style.paddingTop = '10px';
                disabledSection.style.borderTop = '1px solid rgba(0,0,0,0.08)';

                var disabledHeader = document.createElement('div');
                disabledHeader.style.display = 'flex';
                disabledHeader.style.alignItems = 'center';
                disabledHeader.style.justifyContent = 'space-between';
                disabledHeader.style.cursor = 'pointer';
                disabledHeader.style.marginBottom = '6px';

                var disabledTitle = document.createElement('div');
                disabledTitle.textContent = 'Disabled variables (' + disabledParsedVariables.length + ')';
                disabledTitle.style.fontWeight = '600';
                disabledTitle.style.fontSize = '12px';
                disabledTitle.style.color = '#666';

                var toggleBtn = document.createElement('span');
                toggleBtn.textContent = '▼';
                toggleBtn.style.fontSize = '10px';
                toggleBtn.style.color = '#666';
                toggleBtn.style.transition = 'transform 0.2s';

                disabledHeader.appendChild(disabledTitle);
                disabledHeader.appendChild(toggleBtn);

                var disabledList = document.createElement('div');
                disabledList.style.display = 'none';
                disabledList.style.marginTop = '6px';

                disabledParsedVariables.forEach(function(disabledName) {
                    var disabledRow = document.createElement('div');
                    disabledRow.style.display = 'inline-block';
                    disabledRow.style.marginRight = '8px';
                    disabledRow.style.marginBottom = '6px';

                    var disabledVarName = document.createElement('span');
                    disabledVarName.textContent = disabledName;
                    disabledVarName.style.padding = '4px 6px';
                    disabledVarName.style.background = '#f9fafb';
                    disabledVarName.style.border = '1px solid rgba(0,0,0,0.08)';
                    disabledVarName.style.borderRadius = '4px';
                    disabledVarName.style.fontSize = '13px';
                    disabledVarName.style.color = '#999';

                    var enableBtn = document.createElement('button');
                    enableBtn.type = 'button';
                    enableBtn.textContent = 'Enable';
                    enableBtn.style.marginLeft = '4px';
                    enableBtn.style.border = '1px solid rgba(0,0,0,0.08)';
                    enableBtn.style.background = '#243580';
                    enableBtn.style.color = '#fff';
                    enableBtn.style.padding = '2px 6px';
                    enableBtn.style.borderRadius = '3px';
                    enableBtn.style.cursor = 'pointer';
                    enableBtn.style.fontSize = '12px';
                    enableBtn.title = 'Enable this variable';
                    enableBtn.addEventListener('click', function(e){
                        e.stopPropagation();
                        try {
                            var idx = disabledParsedVariables.indexOf(disabledName);
                            if (idx !== -1) {
                                disabledParsedVariables.splice(idx, 1);
                                saveDisabledParsedVariables();
                            }
                        } catch (err) {
                            console.error('[WeBWorKer] Error enabling variable', err);
                        }
                        renderVariablePanel(getAllVariables());
                    });

                    disabledRow.appendChild(disabledVarName);
                    disabledRow.appendChild(enableBtn);
                    disabledList.appendChild(disabledRow);
                });

                // Toggle collapse/expand
                disabledHeader.addEventListener('click', function() {
                    if (disabledList.style.display === 'none') {
                        disabledList.style.display = 'block';
                        toggleBtn.style.transform = 'rotate(180deg)';
                    } else {
                        disabledList.style.display = 'none';
                        toggleBtn.style.transform = 'rotate(0deg)';
                    }
                });

                disabledSection.appendChild(disabledHeader);
                disabledSection.appendChild(disabledList);
                panel.appendChild(disabledSection);
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
            valueInput.placeholder = 'value or expression';
            valueInput.style.width = '100px';
            valueInput.style.padding = '4px 6px';
            valueInput.style.border = '1px solid rgba(0,0,0,0.2)';
            valueInput.style.borderRadius = '4px';

            var addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = 'Add Variable';
            addBtn.style.padding = '4px 12px';
            addBtn.style.border = 'none';
            addBtn.style.background = '#243580';
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
                
                try {
                    customVariables[name] = WeBWorKerVariables.prepareValue(name, valueStr, getAllVariables());
                } catch (error) {
                    alert(error.message);
                    return;
                }
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
        var pending = [];
        for (var prepare of inputSubstitutionFunctions) {
            var commit = prepare(true);
            if (commit === false) return false;
            if (typeof commit === 'function') pending.push(commit);
        }
        pending.forEach(function (commit) { commit(); });
        return true;
    };

    var applyToInputs = function () {
        console.log("[WeBWorKer] Inserting MathView elements");
        
            // Load custom variables and disabled parsed list at the start
            loadCustomVariables();
            loadDisabledParsedVariables();
        
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
                
                // --- Combined variable processing with keyboard shortcut ---
                try {
                    // Check if variable substitution is enabled before attaching handlers
                    chrome.storage.sync.get({ variableSubstitutionEnabled: true }, function(storageResult) {
                        var variableSubstitutionEnabled = !!storageResult.variableSubstitutionEnabled;
                        
                        // Update placeholder to indicate variable feature only if enabled
                        if (variableSubstitutionEnabled) {
                            theInput.setAttribute("placeholder", "Enter answer or use variables (e.g., k*x*2) - Press Ctrl+Enter to apply");
                        }
                        
                        // If variable substitution is disabled, do not attach substitution handlers
                        if (!variableSubstitutionEnabled) {
                            return;
                        }

                        // Use IIFE to capture the current input in closure
                        (function(currentInput) {
                        // Function to evaluate expression by substituting parsed variables
                        var applyVariableSubstitution = function (prepareOnly) {
                            var expr = currentInput.value || '';
                            var vars = getAllVariables();
                            if (!expr) {
                                return;
                            }

                            try {
                                expr = WeBWorKerVariables.expand(expr, vars);
                            } catch (error) {
                                alert(error.message);
                                return false;
                            }

                            var commit = function () {
                                currentInput.value = expr;
                                try {
                                    if (MathView && MathView.updateMath && currentInput.hasAttribute(MathView.MV_ATTR_ATTACHED)) {
                                        MathView.updateMath(currentInput.getAttribute(MathView.MV_ATTR_ATTACHED), currentInput.value);
                                    }
                                } catch (error) {
                                    // A preview failure must not change substitution results.
                                }
                            };
                            if (prepareOnly) return commit;
                            commit();
                            return true;
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
                    }); // end storage.get
                } catch (e) {
                    console.error('[WeBWorKer] Failed to attach variable processing', e);
                }
            }
        }
        console.log("[WeBWorKer] Rendered");
        
        // After rendering inputs, show variable panel (only if enabled)
        chrome.storage.sync.get({ variableSubstitutionEnabled: true }, function(storageResult) {
            if (storageResult.variableSubstitutionEnabled) {
                try {
                    var vars = getAllVariables();  // Use getAllVariables instead of parseVariables
                    renderVariablePanel(vars);
                } catch (e) {
                    console.error('[WeBWorKer] error rendering variables panel', e);
                }
            }
        });
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
            clearAnswers.className = "btn btn-primary mb-1 webworker-action-button";
            clearAnswers.type = "submit";
            clearAnswers.value = "Clear Answers";

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
            piazzaButton.className = "btn btn-secondary mb-1 webworker-action-button"; // Adjust the class as needed
            piazzaButton.type = "button";
            piazzaButton.value = "Open Piazza";

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
            googleSearchButton.className = "btn btn-secondary mb-1 webworker-action-button"; // Adjust the class as needed
            googleSearchButton.type = "button";
            googleSearchButton.value = "Online Resources";

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

    var waitForCaptureLayout = async function (element) {
        var previous = '';
        var stableFrames = 0;
        for (var frame = 0; frame < 120; frame++) {
            await new Promise(function (resolve) { requestAnimationFrame(resolve); });
            var rect = element.getBoundingClientRect();
            var current = [rect.left, rect.top, rect.width, rect.height].join(',');
            stableFrames = current === previous ? stableFrames + 1 : 0;
            if (stableFrames >= 3) return;
            previous = current;
        }
        throw new Error('The question is still moving. Please try again.');
    };

    var loadCaptureImage = function (dataUrl) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () { resolve(image); };
            image.onerror = function () { reject(new Error('Failed to load captured image')); };
            image.src = dataUrl;
        });
    };

    var captureElementScreenshot = async function (element, format) {
        format = format || 'png';
        var scrollX = window.scrollX;
        var scrollY = window.scrollY;
        var ancestors = [];
        var savedStyles = [];
        var saveStyle = function (node, property, value) {
            savedStyles.push([node, property, node.style.getPropertyValue(property),
                node.style.getPropertyPriority(property)]);
            node.style.setProperty(property, value, 'important');
        };
        for (var node = element.parentElement; node; node = node.parentElement) {
            ancestors.push({ node: node, left: node.scrollLeft, top: node.scrollTop });
        }
        try {
            // `auto` inherits WeBWorK's CSS smooth scrolling. Disable it explicitly
            // through capture AND restoration, including nested scroll containers.
            ancestors.forEach(function (item) {
                saveStyle(item.node, 'scroll-behavior', 'auto');
                saveStyle(item.node, 'scroll-snap-type', 'none');
            });
            document.querySelectorAll('.masthead, .sticky-nav, #wwh-panel, .webworker-panel-button').forEach(function (overlay) {
                if (!overlay.contains(element)) saveStyle(overlay, 'visibility', 'hidden');
            });
            if (document.fonts) await document.fonts.ready;
            element.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'start' });
            await waitForCaptureLayout(element);
            var bounds = element.getBoundingClientRect();
            if (!bounds.width || !bounds.height) throw new Error('Question content is empty');
            var width = bounds.width;
            var height = bounds.height;
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            var scaleX, scaleY;
            var lastCapture = 0;
            for (var y = 0; y < height - 0.01;) {
                var rowHeight = height - y;
                for (var x = 0; x < width - 0.01;) {
                    // Move each scroll container only as far as it can go. Any
                    // remaining distance is handled by its parent/window.
                    ancestors.forEach(function (item) {
                        if (item.node === document.scrollingElement) return;
                        var r = element.getBoundingClientRect();
                        var parent = item.node.getBoundingClientRect();
                        item.node.scrollLeft += r.left + x - parent.left - item.node.clientLeft;
                        item.node.scrollTop += r.top + y - parent.top - item.node.clientTop;
                    });
                    var rect = element.getBoundingClientRect();
                    window.scrollBy({ left: rect.left + x, top: rect.top + y, behavior: 'instant' });
                    await waitForCaptureLayout(element);
                    rect = element.getBoundingClientRect();
                    var area = clampCaptureArea(rect);
                    ancestors.forEach(function (item) {
                        if (item.node === document.scrollingElement) return;
                        var style = getComputedStyle(item.node);
                        var parent = item.node.getBoundingClientRect();
                        var right = area.x + area.w;
                        var bottom = area.y + area.h;
                        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
                            area.x = Math.max(area.x, parent.left + item.node.clientLeft);
                            right = Math.min(right, parent.left + item.node.clientLeft + item.node.clientWidth);
                        }
                        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
                            area.y = Math.max(area.y, parent.top + item.node.clientTop);
                            bottom = Math.min(bottom, parent.top + item.node.clientTop + item.node.clientHeight);
                        }
                        area.w = right - area.x;
                        area.h = bottom - area.y;
                    });
                    var sourceX = rect.left + x;
                    var sourceY = rect.top + y;
                    var tileWidth = Math.min(width - x, area.x + area.w - sourceX);
                    var tileHeight = Math.min(height - y, area.y + area.h - sourceY);
                    if (sourceX < area.x - 0.5 || sourceY < area.y - 0.5 || tileWidth <= 0 || tileHeight <= 0) {
                        throw new Error('Unable to bring the entire question into view');
                    }
                    // Chrome allows at most two visible-tab captures per second.
                    await new Promise(function (resolve) {
                        setTimeout(resolve, Math.max(0, 550 - (Date.now() - lastCapture)));
                    });
                    await waitForCaptureLayout(element);
                    var before = element.getBoundingClientRect();
                    if (before.left !== rect.left || before.top !== rect.top ||
                        before.width !== width || before.height !== height) {
                        throw new Error('The question moved during capture. Please try again.');
                    }
                    lastCapture = Date.now();
                    var image = await loadCaptureImage(await requestVisibleTabCapture(format));
                    var after = element.getBoundingClientRect();
                    if (after.left !== before.left || after.top !== before.top ||
                        after.width !== width || after.height !== height) {
                        throw new Error('The question moved during capture. Please try again.');
                    }
                    if (scaleX === undefined) {
                        // Derive scale from actual pixels, including browser zoom.
                        scaleX = image.naturalWidth / window.innerWidth;
                        scaleY = image.naturalHeight / window.innerHeight;
                        canvas.width = Math.max(1, Math.round(width * scaleX));
                        canvas.height = Math.max(1, Math.round(height * scaleY));
                    }
                    var left = Math.round(x * scaleX);
                    var top = Math.round(y * scaleY);
                    var tilePixelsX = Math.round((x + tileWidth) * scaleX) - left;
                    var tilePixelsY = Math.round((y + tileHeight) * scaleY) - top;
                    context.drawImage(image, sourceX * scaleX, sourceY * scaleY,
                        tileWidth * scaleX, tileHeight * scaleY,
                        left, top, tilePixelsX, tilePixelsY);
                    rowHeight = Math.min(rowHeight, tileHeight);
                    x += tileWidth;
                }
                y += rowHeight;
            }
            return canvas.toDataURL('image/' + format);
        } finally {
            ancestors.forEach(function (item) {
                item.node.scrollLeft = item.left;
                item.node.scrollTop = item.top;
            });
            window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
            savedStyles.reverse().forEach(function (item) {
                if (item[2]) item[0].style.setProperty(item[1], item[2], item[3]);
                else item[0].style.removeProperty(item[1]);
            });
        }
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
        screenshotButton.className = "btn btn-secondary mb-1 webworker-action-button";
        screenshotButton.type = "button";
        screenshotButton.value = "Screenshot Question";
    
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

            if (screenshotButton.disabled) return;
            screenshotButton.disabled = true;

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
                screenshotButton.disabled = false;
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
            customQueryButton.className = "btn btn-secondary mb-1 webworker-action-button";
            customQueryButton.type = "button";
            customQueryButton.value = customQueryButtonText;

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
        console.log('[WeBWorKer] Setting up submit/check button interception');

        // Check if variable substitution is enabled
        chrome.storage.sync.get({ variableSubstitutionEnabled: true }, function(storageResult) {
            var variableSubstitutionEnabled = !!storageResult.variableSubstitutionEnabled;

            // Find all forms on the page
            var forms = document.querySelectorAll('form');
            forms.forEach(function(form) {
                // Look for submit and check buttons in this form
                var buttons = form.querySelectorAll('[name="submitAnswers"], [name="checkAnswers"]');
                buttons.forEach(function(btn) {
                    if (!btn) return;
                    // Store original click handler flag
                    if (!btn.hasAttribute('data-weworker-intercepted')) {
                        btn.setAttribute('data-weworker-intercepted', 'true');

                        // Intercept form submission to apply variables synchronously
                        form.addEventListener('submit', function(event) {
                            if (variableSubstitutionEnabled) {
                                try {
                                    console.log('[WeBWorKer] Form submitting, applying variables to all inputs');
                                    if (!applyVariablesToAllInputs()) event.preventDefault();
                                } catch (e) {
                                    event.preventDefault();
                                    console.error('[WeBWorKer] Error while applying variables on submit', e);
                                }
                            }
                        }, true); // Use capture phase to run before form submission
                    }
                });
            });

            console.log('[WeBWorKer] Submit/Check button interception setup complete');
        });
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
  // Study mode can hide parts of the summary. Read the underlying text so
  // presentation changes do not affect attempt-limit detection.
  const hasUnlimited = scoreSummary && scoreSummary.textContent.toLowerCase().includes('unlimited');

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
        copyrightDiv.textContent = "WeBWorKer Made By Daniel Benjamin © 2026";
        
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

    // This extra button is only used by themes with a separate button area.
    // Other themes and non-problem pages do not need it.
    if (!submitButtonsContainer || !existingSubmitButton ||
        document.getElementById('weworker-extra-submit')) return;

    // Create a new submit button element
    var duplicateSubmitButton = document.createElement("input");
    duplicateSubmitButton.id = 'weworker-extra-submit';
    duplicateSubmitButton.className = "btn btn-primary webworker-action-button";
    duplicateSubmitButton.type = "button";
    duplicateSubmitButton.value = "Submit Answers"; // You can change the button text as needed

    // Add event listener to simulate click on the existing submit button
    duplicateSubmitButton.addEventListener("click", function() {
        existingSubmitButton.click(); // Simulate click on existing submit button
    });

    // Append the button to the container element
    submitButtonsContainer.appendChild(duplicateSubmitButton);
    console.log("[WeBWorKer] Duplicate submit button added.");
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
    openButton.style.backgroundColor = "#243580";
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
        settingsButton.className = "btn btn-light btn-sm ms-2 webworker-action-button"; // Adjust the class as needed
        settingsButton.type = "button";
        settingsButton.value = "WeBWorKer Settings";

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
