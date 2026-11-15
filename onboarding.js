/* Onboarding and settings. Uses only the extension's bundled assets. */
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = manifest.version;

const settingCopy = {
    spoilerGuardEnabled: ['Study mode', 'Hide spoilers when revisiting old problems.'],
    clearAnswersEnabled: ['Clear answers button', 'Clear all answer fields with confirmation.'],
    piazzaEnabled: ['Piazza shortcut', 'Open your course discussion board.'],
    resourcesEnabled: ['Online resources', 'Add quick links for problem lookups.'],
    checkParenthesesEnabled: ['Parentheses checker', 'Check that brackets and parentheses match.'],
    variableSubstitutionEnabled: ['Variable substitution', 'Use detected values and your own variables.'],
    screenshotButtonEnabled: ['Question screenshots', 'Copy or download the question as an image.'],
    customQueryEnabled: ['Custom search shortcut', 'Choose the service used for problem lookups.'],
    sidePanelButtonEnabled: ['Calculator button', 'Show the floating button for calculator tools.']
};

let statusTimer;
async function saveSettings(patch, area = 'sync') {
    const status = document.getElementById('settings-status');
    clearTimeout(statusTimer);
    try {
        await chrome.storage[area].set(patch);
        status.textContent = 'Saved';
        status.dataset.state = 'saved';
        statusTimer = setTimeout(() => {
            status.textContent = 'Changes save automatically';
            delete status.dataset.state;
        }, 2500);
    } catch {
        status.textContent = 'Could not save. Please try again.';
        status.dataset.state = 'error';
    }
}

function createOptions(title) {
    const container = document.createElement('div');
    container.className = 'setting-options';
    const fields = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = title;
    fields.appendChild(legend);
    container.appendChild(fields);
    return { container, fields };
}

function screenshotOptions(settings) {
    const options = createOptions('Screenshot destination');
    const choices = document.createElement('div');
    choices.className = 'screenshot-options';
    for (const [value, text] of [['copy', 'Clipboard'], ['download', 'Download']]) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'screenshotMode';
        input.value = value;
        input.checked = settings.screenshotMode === value;
        input.addEventListener('change', () => { if (input.checked) saveSettings({ screenshotMode: value }); });
        label.append(input, document.createTextNode(text));
        choices.appendChild(label);
    }
    options.fields.appendChild(choices);
    return options;
}

function customQueryOptions(settings) {
    const options = createOptions('Search URL and button text');
    options.fields.className = 'query-options';
    for (const [key, text, placeholder] of [
        ['customQueryUrl', 'Search URL', 'https://www.google.com/search?q='],
        ['customQueryButtonText', 'Button text', 'Custom Query']
    ]) {
        const label = document.createElement('label');
        label.textContent = text;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = key;
        input.value = settings[key];
        input.placeholder = placeholder;
        input.spellcheck = false;
        input.addEventListener('change', () => saveSettings({ [key]: input.value }));
        label.appendChild(input);
        options.fields.appendChild(label);
    }
    return options;
}

async function buildSettingsToggles() {
    const container = document.getElementById('settingsToggles');
    const defaults = Object.fromEntries(ExtConfig.toggleDefinitions.map(def => [def.storageKey, def.default]));
    try {
        const settings = await chrome.storage.sync.get({
            ...defaults, screenshotMode: 'copy',
            customQueryUrl: 'https://www.google.com/search?q=', customQueryButtonText: 'Custom Query'
        });
        for (const def of ExtConfig.toggleDefinitions) {
            const [title, description] = settingCopy[def.storageKey] || [def.label, ''];
            const item = document.createElement('div');
            item.className = 'toggle-item';
            const row = document.createElement('div');
            row.className = 'toggle-row';
            const info = document.createElement('div');
            info.className = 'toggle-info';
            const id = 'onboarding_' + def.id;
            const label = document.createElement('label');
            label.className = 'toggle-label';
            label.htmlFor = id;
            label.textContent = title;
            const hint = document.createElement('p');
            hint.className = 'toggle-description';
            hint.id = id + '_description';
            hint.textContent = description;
            info.append(label, hint);
            const control = document.createElement('div');
            control.className = 'switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = !!settings[def.storageKey];
            input.setAttribute('aria-describedby', hint.id);
            const slider = document.createElement('span');
            slider.className = 'slider';
            slider.setAttribute('aria-hidden', 'true');
            control.append(input, slider);
            row.append(info, control);
            item.appendChild(row);
            const options = def.storageKey === 'screenshotButtonEnabled' ? screenshotOptions(settings) :
                def.storageKey === 'customQueryEnabled' ? customQueryOptions(settings) : null;
            if (options) {
                options.fields.disabled = !input.checked;
                item.classList.add('toggle-item-with-options');
                item.appendChild(options.container);
            }
            input.addEventListener('change', () => {
                if (options) options.fields.disabled = !input.checked;
                saveSettings({ [def.storageKey]: input.checked });
            });
            container.appendChild(item);
        }
    } catch {
        const status = document.getElementById('settings-status');
        status.textContent = 'Settings could not load. Reopen this page to try again.';
        status.dataset.state = 'error';
    }
}

// Match the (), [] and {} nesting used by the answer-field checker.
function analyzePreviewBrackets(expression) {
    const closing = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    const tokens = [];
    let error = '';
    let count = 0;
    for (let index = 0; index < expression.length; index++) {
        const character = expression[index];
        const token = { character, depth: 0, bracket: false, invalid: false };
        tokens.push(token);
        if (closing[character]) {
            count++;
            token.bracket = true;
            token.depth = stack.length % 5;
            stack.push({ token, index });
        } else if (Object.values(closing).includes(character)) {
            count++;
            token.bracket = true;
            const opening = stack[stack.length - 1];
            if (opening && closing[opening.token.character] === character) {
                token.depth = opening.token.depth;
                stack.pop();
            } else {
                token.invalid = true;
                if (!error) error = opening ?
                    'Expected ' + closing[opening.token.character] + ', found ' + character + ' at character ' + (index + 1) + '.' :
                    'Unexpected ' + character + ' at character ' + (index + 1) + '.';
            }
        }
    }
    for (const opening of stack) opening.token.invalid = true;
    if (!error && stack.length) {
        const opening = stack[stack.length - 1];
        error = 'Missing ' + closing[opening.token.character] + ' for ' + opening.token.character + ' at character ' + (opening.index + 1) + '.';
    }
    return { tokens, state: error ? 'invalid' : count ? 'valid' : 'neutral', message: error || (count ? 'Brackets match' : 'No brackets to check') };
}

function updateBracketPreview(expression) {
    const result = analyzePreviewBrackets(expression);
    const output = document.getElementById('bracket-expression');
    const status = document.getElementById('bracket-status');
    output.replaceChildren();
    for (const token of result.tokens) {
        if (!token.bracket) {
            output.appendChild(document.createTextNode(token.character));
            continue;
        }
        const span = document.createElement('span');
        span.textContent = token.character;
        span.className = token.invalid ? 'bracket-error' : 'bracket-pair-' + token.depth;
        output.appendChild(span);
    }
    status.textContent = result.message;
    status.dataset.state = result.state;
    document.getElementById('expression').dataset.brackets = result.state;
}

function updateMathPreview() {
    const expression = document.getElementById('expression').value;
    const output = document.getElementById('math-preview');
    const hint = document.getElementById('preview-hint');
    updateBracketPreview(expression);
    for (const preset of document.querySelectorAll('[data-expression]')) {
        preset.setAttribute('aria-pressed', String(preset.dataset.expression === expression));
    }
    if (!expression.trim()) {
        output.replaceChildren();
        hint.textContent = 'Type an expression above to preview it.';
        delete hint.dataset.error;
        return;
    }
    try {
        katex.render(AMTparseMath(expression), output, { throwOnError: true, displayMode: true, maxExpand: 1000, trust: false });
        hint.textContent = 'Edit the expression to see the preview change.';
        delete hint.dataset.error;
    } catch {
        output.replaceChildren();
        hint.textContent = 'This expression can’t be previewed yet. Check the syntax or try an example.';
        hint.dataset.error = 'true';
    }
}

document.getElementById('expression').addEventListener('input', updateMathPreview);
document.querySelectorAll('[data-expression]').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('expression').value = button.dataset.expression;
        updateMathPreview();
    });
});

async function loadPagePreferences() {
    const checkbox = document.getElementById('showOnUpdates');
    checkbox.disabled = true;
    try {
        const stored = await chrome.storage.local.get({ showOnboardingOnUpdate: true });
        checkbox.checked = stored.showOnboardingOnUpdate !== false;
        checkbox.disabled = false;
        checkbox.addEventListener('change', () => saveSettings({ showOnboardingOnUpdate: checkbox.checked }, 'local'));
    } catch {
        checkbox.closest('label').title = 'Could not load this preference. Reopen the page to try again.';
    }
}

function renderChangelog() {
    const container = document.getElementById('changelogEntries');
    for (const release of WeBWorKerChangelog) {
        const entry = document.createElement('article');
        entry.className = 'changelog-entry';
        const version = document.createElement('h3');
        version.textContent = release.version;
        const list = document.createElement('ul');
        for (const change of release.changes) {
            const item = document.createElement('li');
            item.textContent = change;
            list.appendChild(item);
        }
        entry.append(version, list);
        container.appendChild(entry);
    }
}

renderChangelog();
AMTconfig.translateOnLoad = false;
updateMathPreview();
buildSettingsToggles();
loadPagePreferences();
