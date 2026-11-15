var buttonThisSite = document.getElementById("enableThisSite");
var buttonGlobal = document.getElementById("enableGlobal");
var refreshPageLink = document.getElementById("refreshPage");
var featureTogglesContainer = document.getElementById("featureToggles");
var refreshToggles = async () => {
    try {
        var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        var hasSite = await ExtConfig.hasWebworkSite(tab.url);
        var hasGlobalSite = await ExtConfig.hasGlobalWebworkSite();

        if (hasSite || hasGlobalSite) {
            buttonThisSite.checked = true;
        } else {
            buttonThisSite.checked = false;
        }

        if (hasGlobalSite) {
            buttonThisSite.setAttribute("disabled", true);
            buttonGlobal.checked = true;
        } else {
            buttonThisSite.removeAttribute("disabled");
            buttonGlobal.checked = false;
        }

        // Build defaults object from ExtConfig.toggleDefinitions
        var defaults = {};
        if (ExtConfig && ExtConfig.toggleDefinitions) {
            ExtConfig.toggleDefinitions.forEach(def => {
                defaults[def.storageKey] = def.default;
            });
        }

        chrome.storage.sync.get(defaults, (result) => {
            if (ExtConfig && ExtConfig.toggleDefinitions) {
                ExtConfig.toggleDefinitions.forEach(def => {
                    var el = document.getElementById(def.id);
                    if (el) {
                        el.checked = !!result[def.storageKey];
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error refreshing toggles:', error);
    }
};

// Build the feature toggles UI based on ExtConfig.toggleDefinitions
var buildFeatureToggles = function () {
    if (!featureTogglesContainer) return;
    // Clear existing
    featureTogglesContainer.innerHTML = '';

    if (!ExtConfig || !ExtConfig.toggleDefinitions) return;

    // Create a settings section for feature toggles if there are any
    if (ExtConfig.toggleDefinitions.length > 0) {
        var section = document.createElement('div');
        section.className = 'settings-section';
        var heading = document.createElement('h2');
        heading.className = 'section-label';
        heading.textContent = 'Tools';
        section.appendChild(heading);

        ExtConfig.toggleDefinitions.forEach(def => {
            var wrapper = document.createElement('div');
            wrapper.className = 'setting-item';

            var info = document.createElement('div');
            info.className = 'setting-info';

            var textSpan = document.createElement('label');
            textSpan.htmlFor = def.id;
            textSpan.className = 'setting-label';
            var labels = {
                spoilerGuardEnabled: 'Study mode button', clearAnswersEnabled: 'Clear answers button',
                piazzaEnabled: 'Piazza shortcut', resourcesEnabled: 'Online resources',
                checkParenthesesEnabled: 'Parentheses checker', variableSubstitutionEnabled: 'Variable substitution',
                screenshotButtonEnabled: 'Question screenshots', customQueryEnabled: 'Custom search shortcut',
                sidePanelButtonEnabled: 'Calculator button'
            };
            textSpan.textContent = labels[def.storageKey] || def.label;

            info.appendChild(textSpan);

            var label = document.createElement('label');
            label.className = 'switch';

            var input = document.createElement('input');
            input.type = 'checkbox';
            input.id = def.id;
            input.setAttribute('aria-label', textSpan.textContent);

            var spanSlider = document.createElement('span');
            spanSlider.className = 'slider round';
            spanSlider.setAttribute('aria-hidden', 'true');

            label.appendChild(input);
            label.appendChild(spanSlider);

            wrapper.appendChild(info);
            wrapper.appendChild(label);

            if (def.storageKey === 'spoilerGuardEnabled') {
                wrapper.classList.add('spoiler-guard-setting');
                var toggleRow = document.createElement('div');
                toggleRow.className = 'setting-toggle-row';
                toggleRow.className = 'spoiler-guard-toggle-row';
                toggleRow.append(info, label);
                wrapper.append(toggleRow, buildSpoilerGuardSettings(input));
                input.setAttribute('aria-label', def.label);
            }

            // Add screenshot settings if this is the screenshot button toggle
            if (def.storageKey === 'screenshotButtonEnabled') {
                wrapper.classList.add('setting-item-with-options');
                // Modify wrapper to be a column layout

                // Create a row for the toggle (label and switch)
                var toggleRow = document.createElement('div');
                toggleRow.className = 'setting-toggle-row';

                // Move info and label into toggleRow
                wrapper.removeChild(info);
                wrapper.removeChild(label);
                toggleRow.appendChild(info);
                toggleRow.appendChild(label);
                wrapper.appendChild(toggleRow);

                var screenshotSettings = document.createElement('div');
                screenshotSettings.className = 'inline-options';

                // Mode label
                var modeLabel = document.createElement('div');
                modeLabel.textContent = 'Screenshot destination';
                modeLabel.className = 'option-label';

                // Radio buttons container
                var radioContainer = document.createElement('div');
                radioContainer.className = 'screenshot-choices';

                // Download option
                var downloadOption = document.createElement('label');

                var downloadRadio = document.createElement('input');
                downloadRadio.type = 'radio';
                downloadRadio.name = 'screenshotMode';
                downloadRadio.value = 'download';
                downloadRadio.id = 'screenshotModeDownload';

                var downloadText = document.createElement('span');
                downloadText.textContent = 'Download';

                downloadOption.appendChild(downloadRadio);
                downloadOption.appendChild(downloadText);

                // Copy option
                var copyOption = document.createElement('label');

                var copyRadio = document.createElement('input');
                copyRadio.type = 'radio';
                copyRadio.name = 'screenshotMode';
                copyRadio.value = 'copy';
                copyRadio.id = 'screenshotModeCopy';

                var copyText = document.createElement('span');
                copyText.textContent = 'Clipboard';

                copyOption.appendChild(copyRadio);
                copyOption.appendChild(copyText);

                radioContainer.appendChild(downloadOption);
                radioContainer.appendChild(copyOption);

                // Load saved value
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
                var saveScreenshotMode = function() {
                    var mode = downloadRadio.checked ? 'download' : 'copy';
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
                wrapper.classList.add('setting-item-with-options');
                // Modify wrapper to be a column layout

                // Create a row for the toggle (label and switch)
                var toggleRow = document.createElement('div');
                toggleRow.className = 'setting-toggle-row';

                // Move info and label into toggleRow
                wrapper.removeChild(info);
                wrapper.removeChild(label);
                toggleRow.appendChild(info);
                toggleRow.appendChild(label);
                wrapper.appendChild(toggleRow);

                var customQuerySettings = document.createElement('div');
                customQuerySettings.className = 'inline-options';

                // URL input
                var urlLabel = document.createElement('label');
                urlLabel.htmlFor = 'customQueryUrl';
                urlLabel.textContent = 'Search URL';

                var urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.id = 'customQueryUrl';
                urlInput.placeholder = 'https://www.google.com/search?q=';

                // Button text input
                var buttonTextLabel = document.createElement('label');
                buttonTextLabel.htmlFor = 'customQueryButtonText';
                buttonTextLabel.textContent = 'Button text';

                var buttonTextInput = document.createElement('input');
                buttonTextInput.type = 'text';
                buttonTextInput.id = 'customQueryButtonText';
                buttonTextInput.placeholder = 'Custom Query';

                // Load saved values
                chrome.storage.sync.get({
                    customQueryUrl: 'https://www.google.com/search?q=',
                    customQueryButtonText: 'Custom Query'
                }, (result) => {
                    urlInput.value = result.customQueryUrl;
                    buttonTextInput.value = result.customQueryButtonText;
                });

                // Save on change with debounce
                var saveTimeout;
                var saveCustomQuerySettings = function() {
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

            // When toggled, save to chrome.storage
            input.addEventListener('change', function () {
                var st = {};
                st[def.storageKey] = input.checked;
                chrome.storage.sync.set(st);
            });

            section.appendChild(wrapper);
        });

        featureTogglesContainer.appendChild(section);
    }
};

buttonThisSite.addEventListener("click", async () => {
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (buttonThisSite.checked) {
        if (await ExtConfig.addWebworkSite(tab.url)) {
            console.log("[WeBWorK MathView] WeBWorK site registration: SUCCESS");
            await ExtConfig.directInject(tab.id);
        } else {
            console.log("[WeBWorK MathView] WeBWorK site registration: FAILURE");
        }
    } else {
        await ExtConfig.removeWebworkSite(tab.url);
    }
});

buttonGlobal.addEventListener("click", async () => {
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (buttonGlobal.checked) {
        if (await ExtConfig.tryEnableGlobal()) {
            console.log("[WeBWorK MathView] WeBWorK global registration: SUCCESS");
            await refreshToggles();
            await ExtConfig.directInject(tab.id);
        } else {
            console.log("[WeBWorK MathView] WeBWorK global registration: FAILURE");
        }
    } else {
        await ExtConfig.disableGlobal();
        await refreshToggles();
    }
});
// Note: feature toggles' change listeners are attached when building UI in buildFeatureToggles()

// Add event listener for the refresh link
refreshPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
    });
});

// Add event listener for the onboarding link
document.getElementById("openOnboarding").addEventListener("click", (event) => {
    event.preventDefault();
    chrome.tabs.create({ url: 'onboarding.html' });
});

// Add event listener for the side panel button
document.getElementById("openSidePanel").addEventListener("click", async (event) => {
    event.preventDefault();
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to background script to open side panel
        chrome.runtime.sendMessage({
            type: 'weworker.openSidePanel',
            tabId: tab.id
        }, (response) => {
            if (response && !response.ok) {
                console.error('Failed to open side panel:', response.error);
            }
        });
        
        // Close the popup
        window.close();
    } catch (error) {
        console.error('Error opening side panel:', error);
    }
});

// Initialize UI
buildFeatureToggles();
refreshToggles();
