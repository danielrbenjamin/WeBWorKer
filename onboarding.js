console.log("[WeBWorKer] onboarding.js loaded");

// Get the extension version
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = manifest.version;

// Build the settings toggles
function buildSettingsToggles() {
    const container = document.getElementById('settingsToggles');
    if (!container || !ExtConfig || !ExtConfig.toggleDefinitions) return;

    // Build defaults object
    const defaults = {};
    ExtConfig.toggleDefinitions.forEach(def => {
        defaults[def.storageKey] = def.default;
    });

    // Get current settings
    chrome.storage.sync.get(defaults, (result) => {
        ExtConfig.toggleDefinitions.forEach(def => {
            const wrapper = document.createElement('div');
            wrapper.className = 'toggle-item';

            const label = document.createElement('span');
            label.className = 'toggle-label';
            label.textContent = def.label;

            const switchLabel = document.createElement('label');
            switchLabel.className = 'switch';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!result[def.storageKey];
            input.id = 'onboarding_' + def.id;

            const slider = document.createElement('span');
            slider.className = 'slider round';

            switchLabel.appendChild(input);
            switchLabel.appendChild(slider);

            // If this toggle has options, use column layout
            if (def.storageKey === 'screenshotButtonEnabled' || def.storageKey === 'customQueryEnabled') {
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'stretch';

                // Create a row for the toggle (label and switch)
                const toggleRow = document.createElement('div');
                toggleRow.style.display = 'flex';
                toggleRow.style.alignItems = 'center';
                toggleRow.style.justifyContent = 'space-between';
                toggleRow.style.width = '100%';

                toggleRow.appendChild(label);
                toggleRow.appendChild(switchLabel);
                wrapper.appendChild(toggleRow);
            } else {
                wrapper.appendChild(label);
                wrapper.appendChild(switchLabel);
            }

            // Save on change
            input.addEventListener('change', function() {
                const setting = {};
                setting[def.storageKey] = input.checked;
                chrome.storage.sync.set(setting);
            });

            // Add screenshot settings if this is the screenshot button toggle
            if (def.storageKey === 'screenshotButtonEnabled') {
                const screenshotSettings = document.createElement('div');
                screenshotSettings.style.marginTop = '12px';
                screenshotSettings.style.marginLeft = '0';
                screenshotSettings.style.width = '100%';

                const modeLabel = document.createElement('div');
                modeLabel.textContent = 'Screenshot Mode:';
                modeLabel.style.fontSize = '13px';
                modeLabel.style.marginBottom = '8px';
                modeLabel.style.color = '#666';
                modeLabel.style.fontWeight = '500';

                const radioContainer = document.createElement('div');
                radioContainer.style.display = 'flex';
                radioContainer.style.flexDirection = 'column';
                radioContainer.style.gap = '8px';
                radioContainer.style.marginLeft = '8px';

                // Download option
                const downloadOption = document.createElement('label');
                downloadOption.style.display = 'flex';
                downloadOption.style.alignItems = 'center';
                downloadOption.style.cursor = 'pointer';

                const downloadRadio = document.createElement('input');
                downloadRadio.type = 'radio';
                downloadRadio.name = 'screenshotMode';
                downloadRadio.value = 'download';
                downloadRadio.id = 'screenshotModeDownload';

                const downloadText = document.createElement('span');
                downloadText.textContent = 'Download screenshot';
                downloadText.style.marginLeft = '8px';
                downloadText.style.fontSize = '13px';

                downloadOption.appendChild(downloadRadio);
                downloadOption.appendChild(downloadText);

                // Copy option
                const copyOption = document.createElement('label');
                copyOption.style.display = 'flex';
                copyOption.style.alignItems = 'center';
                copyOption.style.cursor = 'pointer';

                const copyRadio = document.createElement('input');
                copyRadio.type = 'radio';
                copyRadio.name = 'screenshotMode';
                copyRadio.value = 'copy';
                copyRadio.id = 'screenshotModeCopy';

                const copyText = document.createElement('span');
                copyText.textContent = 'Copy to clipboard';
                copyText.style.marginLeft = '8px';
                copyText.style.fontSize = '13px';

                copyOption.appendChild(copyRadio);
                copyOption.appendChild(copyText);

                radioContainer.appendChild(downloadOption);
                radioContainer.appendChild(copyOption);

                // Load saved mode
                chrome.storage.sync.get({
                    screenshotMode: 'copy'
                }, (result) => {
                    if (result.screenshotMode === 'copy') {
                        copyRadio.checked = true;
                    } else {
                        downloadRadio.checked = true;
                    }
                });

                // Save on change
                const saveScreenshotMode = function() {
                    const mode = downloadRadio.checked ? 'download' : 'copy';
                    chrome.storage.sync.set({ screenshotMode: mode });
                };

                downloadRadio.addEventListener('change', saveScreenshotMode);
                copyRadio.addEventListener('change', saveScreenshotMode);

                screenshotSettings.appendChild(modeLabel);
                screenshotSettings.appendChild(radioContainer);

                wrapper.appendChild(screenshotSettings);
            }

            // Add custom query settings if this is the custom query toggle
            if (def.storageKey === 'customQueryEnabled') {
                const customQuerySettings = document.createElement('div');
                customQuerySettings.style.marginTop = '12px';
                customQuerySettings.style.marginLeft = '0';
                customQuerySettings.style.width = '100%';

                // URL input
                const urlLabel = document.createElement('div');
                urlLabel.textContent = 'Custom Query URL:';
                urlLabel.style.fontSize = '13px';
                urlLabel.style.marginBottom = '4px';
                urlLabel.style.color = '#666';
                urlLabel.style.fontWeight = '500';

                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.id = 'customQueryUrl';
                urlInput.placeholder = 'https://www.google.com/search?q=';
                urlInput.style.width = '100%';
                urlInput.style.padding = '8px';
                urlInput.style.border = '1px solid rgba(0,0,0,0.2)';
                urlInput.style.borderRadius = '4px';
                urlInput.style.fontSize = '13px';
                urlInput.style.marginBottom = '12px';
                urlInput.style.boxSizing = 'border-box';

                // Button text input
                const buttonTextLabel = document.createElement('div');
                buttonTextLabel.textContent = 'Button Text:';
                buttonTextLabel.style.fontSize = '13px';
                buttonTextLabel.style.marginBottom = '4px';
                buttonTextLabel.style.color = '#666';
                buttonTextLabel.style.fontWeight = '500';

                const buttonTextInput = document.createElement('input');
                buttonTextInput.type = 'text';
                buttonTextInput.id = 'customQueryButtonText';
                buttonTextInput.placeholder = 'Custom Query';
                buttonTextInput.style.width = '100%';
                buttonTextInput.style.padding = '8px';
                buttonTextInput.style.border = '1px solid rgba(0,0,0,0.2)';
                buttonTextInput.style.borderRadius = '4px';
                buttonTextInput.style.fontSize = '13px';
                buttonTextInput.style.boxSizing = 'border-box';

                // Load saved values
                chrome.storage.sync.get({
                    customQueryUrl: 'https://www.google.com/search?q=',
                    customQueryButtonText: 'Custom Query'
                }, (result) => {
                    urlInput.value = result.customQueryUrl;
                    buttonTextInput.value = result.customQueryButtonText;
                });

                // Save on change with debounce
                let saveTimeout;
                const saveCustomQuerySettings = function() {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        chrome.storage.sync.set({
                            customQueryUrl: urlInput.value,
                            customQueryButtonText: buttonTextInput.value
                        });
                    }, 500);
                };

                urlInput.addEventListener('input', saveCustomQuerySettings);
                buttonTextInput.addEventListener('input', saveCustomQuerySettings);

                customQuerySettings.appendChild(urlLabel);
                customQuerySettings.appendChild(urlInput);
                customQuerySettings.appendChild(buttonTextLabel);
                customQuerySettings.appendChild(buttonTextInput);

                wrapper.appendChild(customQuerySettings);
            }

            container.appendChild(wrapper);
        });
    });
}

// Check if this is an update or fresh install
chrome.storage.local.get(['lastVersion', 'showOnboardingOnUpdate'], async (result) => {
    const lastVersion = result.lastVersion;
    const showOnUpdate = result.showOnboardingOnUpdate !== false; // default true
    const currentVersion = manifest.version;

    if (lastVersion && lastVersion !== currentVersion && showOnUpdate) {
        // This is an update
        showUpdateNotice(lastVersion, currentVersion);
    }

    // Store the current version
    chrome.storage.local.set({ lastVersion: currentVersion });
});

// Show update notice with version-specific changes
function showUpdateNotice(oldVersion, newVersion) {
    const updateNotice = document.getElementById('updateNotice');
    const updateList = document.getElementById('updateList');
    
    updateNotice.style.display = 'block';
    
    // Version-specific updates (you can customize this for each release)
    const updates = getUpdatesForVersion(newVersion);
    
    updates.forEach(update => {
        const li = document.createElement('li');
        li.textContent = update;
        updateList.appendChild(li);
    });
}

// Get update notes for specific versions
function getUpdatesForVersion(version) {
    const updateNotes = {
        '2.1.1': [
            'Users can now disable automatically detected variables',
            'Added collapsible "Disabled variables" section to re-enable disabled variables'
        ],
        '2.1': [
            'Added toggle to enable/disable variable substitution feature',
            'Variable substitution can now be turned off in extension settings',
            'Fixed placeholder text to only show variable instructions when feature is enabled',
            'Improved form submission handling for variable substitution'
        ],
        '2.0': [
            'Added comprehensive onboarding page with instructions',
            'Screenshot mode settings (copy to clipboard or download)',
            'Added variable substitution and management',
            'Desmos scientific calculator integration',
            'Advanced variable management with custom variables'
        ]
        // Add future version updates here
        // '1.1.0': ['New feature 1', 'New feature 2', ...],
    };
    
    return updateNotes[version] || [
        'Bug fixes and performance improvements'
    ];
}

// Open settings button - removed since we now have inline toggles
// document.getElementById('openSettings').addEventListener('click', () => {
//     alert('Click the WeBWorKer extension icon in your browser toolbar to access all settings and toggles!');
// });

// Don't show again checkbox
document.getElementById('dontShowAgain').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you don\'t want to see this page on future updates? You can always access it from the extension popup.')) {
        chrome.storage.local.set({ showOnboardingOnUpdate: false });
        alert('Onboarding page disabled for updates. You can still access help from the extension menu.');
        window.close();
    }
});

// Add smooth scrolling for any anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize the settings toggles
buildSettingsToggles();
