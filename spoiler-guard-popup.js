/* WeBWorKer study mode controls. Detection adapted from Abhinav Nair's
 * WeBWorK Spoiler Guard; see LICENSES/WeBWorK Spoiler Guard LICENSE.txt. */
function buildSpoilerGuardSettings(masterToggle) {
    const container = document.createElement('div');
    container.className = 'spoiler-guard-options';
    const description = document.createElement('p');
    description.textContent = 'Practice old problems without seeing previous answers or grades. Your saved grades stay unchanged.';
    container.appendChild(description);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Study mode settings';
    details.appendChild(summary);
    const fields = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Hide while practicing';
    fields.appendChild(legend);
    const inputs = new Map();
    for (const [key, text] of [
        ['answers', 'Revealed correct answers'],
        ['results', 'Correct / incorrect feedback'],
        ['scores', 'Scores, status and attempts'],
        ['solutions', 'Solutions and hints'],
        ['clearAnswers', 'Clear previous answers locally'],
        ['forceParams', 'Keep answer and solution requests off'],
        ['showPanel', 'Show Peek controls on the page']
    ]) {
        const label = document.createElement('label');
        label.className = 'spoiler-guard-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        inputs.set(key, input);
        input.addEventListener('change', () => SpoilerGuardConfig.save({ [key]: input.checked }));
        label.append(input, document.createTextNode(text));
        fields.appendChild(label);
    }

    const modeLabel = document.createElement('label');
    modeLabel.className = 'spoiler-guard-mode';
    modeLabel.textContent = 'Display spoilers';
    const mode = document.createElement('select');
    for (const [value, text] of [['hide', 'Hide'], ['blur', 'Blur (hover to reveal)']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        mode.appendChild(option);
    }
    mode.addEventListener('change', () => SpoilerGuardConfig.save({ mode: mode.value }));
    modeLabel.appendChild(mode);
    fields.appendChild(modeLabel);

    const advanced = document.createElement('details');
    const advancedSummary = document.createElement('summary');
    advancedSummary.textContent = 'Custom spoiler selectors';
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Additional elements to hide (one CSS selector per line)';
    const selectors = document.createElement('textarea');
    selectors.rows = 3;
    selectors.placeholder = '.custom-answer\n#custom-score';
    const validation = document.createElement('span');
    validation.className = 'spoiler-guard-validation';
    validation.setAttribute('role', 'status');
    selectors.addEventListener('change', () => {
        try {
            for (const selector of selectors.value.split('\n').map(s => s.trim()).filter(Boolean)) {
                document.querySelector(selector);
            }
            validation.textContent = '';
            SpoilerGuardConfig.save({ extraSelectors: selectors.value });
        } catch {
            validation.textContent = 'Check your CSS selectors. Changes have not been saved.';
        }
    });
    selectorLabel.appendChild(selectors);
    advanced.append(advancedSummary, selectorLabel, validation);
    fields.appendChild(advanced);
    details.appendChild(fields);
    container.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'spoiler-guard-actions';
    const peek = document.createElement('button');
    peek.type = 'button';
    peek.textContent = 'Peek';
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.textContent = 'Turn off study mode';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    let host = '';
    let tab;
    let paused = false;
    const updateEnabled = () => {
        fields.disabled = !masterToggle.checked;
        peek.disabled = !masterToggle.checked || paused || !tab;
        pause.disabled = !masterToggle.checked || !tab;
    };
    masterToggle.addEventListener('change', updateEnabled);
    const send = async type => {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type }, { frameId: 0 });
            if (!response?.ok) throw new Error('Study mode is not running on this page.');
            peek.textContent = response.peeking ? 'Hide again' : 'Peek';
            status.textContent = '';
        } catch {
            status.textContent = 'Refresh this WeBWorK page to use study mode.';
        }
    };
    peek.addEventListener('click', () => send('wwh-peek'));
    pause.addEventListener('click', async () => {
        const settings = await SpoilerGuardConfig.read();
        const hosts = new Set(settings.disabledHosts);
        if (hosts.has(host)) hosts.delete(host); else hosts.add(host);
        await SpoilerGuardConfig.save({ disabledHosts: [...hosts] });
        paused = hosts.has(host);
        pause.textContent = paused ? 'Turn on study mode' : 'Turn off study mode';
        updateEnabled();
    });
    actions.append(peek, pause);
    container.append(actions, status);
    fields.disabled = true;
    peek.disabled = pause.disabled = true;
    (async () => {
        try {
            const settings = await SpoilerGuardConfig.read();
            masterToggle.checked = settings.enabled;
            for (const [key, input] of inputs) input.checked = settings[key];
            mode.value = settings.mode;
            selectors.value = settings.extraSelectors;
            const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (current?.url && /^https?:/.test(current.url)) {
                host = new URL(current.url).hostname;
                try {
                    const reply = await chrome.tabs.sendMessage(current.id, { type: 'wwh-rescan' }, { frameId: 0 });
                    if (reply?.ok) {
                        tab = current;
                        peek.textContent = reply.peeking ? 'Hide again' : 'Peek';
                    }
                } catch { /* Other sites do not have study mode. */ }
            }
            paused = settings.disabledHosts.includes(host);
            pause.textContent = paused ? 'Turn on study mode' : 'Turn off study mode';
            if (!tab) status.textContent = 'Open or refresh a WeBWorK page to use Peek.';
            updateEnabled();
        } catch {
            status.textContent = 'Could not load study mode settings. Reopen the popup to try again.';
        }
    })();
    return container;
}
