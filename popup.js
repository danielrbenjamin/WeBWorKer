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
        section.style.borderTop = '1px solid rgba(0,0,0,0.08)';
        section.style.paddingTop = '12px';

        ExtConfig.toggleDefinitions.forEach(def => {
            var wrapper = document.createElement('div');
            wrapper.className = 'setting-item';

            var info = document.createElement('div');
            info.className = 'setting-info';

            var textSpan = document.createElement('span');
            textSpan.className = 'setting-label';
            textSpan.textContent = def.label;

            info.appendChild(textSpan);

            var label = document.createElement('label');
            label.className = 'switch';

            var input = document.createElement('input');
            input.type = 'checkbox';
            input.id = def.id;

            var spanSlider = document.createElement('span');
            spanSlider.className = 'slider round';

            label.appendChild(input);
            label.appendChild(spanSlider);

            wrapper.appendChild(info);
            wrapper.appendChild(label);

            // Add screenshot settings if this is the screenshot button toggle
            if (def.storageKey === 'screenshotButtonEnabled') {
                // Modify wrapper to be a column layout
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'stretch';

                // Create a row for the toggle (label and switch)
                var toggleRow = document.createElement('div');
                toggleRow.style.display = 'flex';
                toggleRow.style.alignItems = 'center';
                toggleRow.style.justifyContent = 'space-between';
                toggleRow.style.width = '100%';

                // Move info and label into toggleRow
                wrapper.removeChild(info);
                wrapper.removeChild(label);
                toggleRow.appendChild(info);
                toggleRow.appendChild(label);
                wrapper.appendChild(toggleRow);

                var screenshotSettings = document.createElement('div');
                screenshotSettings.style.marginTop = '12px';
                screenshotSettings.style.width = '100%';

                // Mode label
                var modeLabel = document.createElement('div');
                modeLabel.textContent = 'Screenshot Mode:';
                modeLabel.style.fontSize = '12px';
                modeLabel.style.marginBottom = '6px';
                modeLabel.style.color = '#666';
                modeLabel.style.fontWeight = '600';

                // Radio buttons container
                var radioContainer = document.createElement('div');
                radioContainer.style.display = 'flex';
                radioContainer.style.flexDirection = 'column';
                radioContainer.style.gap = '8px';

                // Download option
                var downloadOption = document.createElement('label');
                downloadOption.style.display = 'flex';
                downloadOption.style.alignItems = 'center';
                downloadOption.style.cursor = 'pointer';
                downloadOption.style.fontSize = '13px';

                var downloadRadio = document.createElement('input');
                downloadRadio.type = 'radio';
                downloadRadio.name = 'screenshotMode';
                downloadRadio.value = 'download';
                downloadRadio.id = 'screenshotModeDownload';
                downloadRadio.style.marginRight = '8px';

                var downloadText = document.createElement('span');
                downloadText.textContent = 'Download screenshot';

                downloadOption.appendChild(downloadRadio);
                downloadOption.appendChild(downloadText);

                // Copy option
                var copyOption = document.createElement('label');
                copyOption.style.display = 'flex';
                copyOption.style.alignItems = 'center';
                copyOption.style.cursor = 'pointer';
                copyOption.style.fontSize = '13px';

                var copyRadio = document.createElement('input');
                copyRadio.type = 'radio';
                copyRadio.name = 'screenshotMode';
                copyRadio.value = 'copy';
                copyRadio.id = 'screenshotModeCopy';
                copyRadio.style.marginRight = '8px';

                var copyText = document.createElement('span');
                copyText.textContent = 'Copy to clipboard';

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
                // Modify wrapper to be a column layout
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'stretch';

                // Create a row for the toggle (label and switch)
                var toggleRow = document.createElement('div');
                toggleRow.style.display = 'flex';
                toggleRow.style.alignItems = 'center';
                toggleRow.style.justifyContent = 'space-between';
                toggleRow.style.width = '100%';

                // Move info and label into toggleRow
                wrapper.removeChild(info);
                wrapper.removeChild(label);
                toggleRow.appendChild(info);
                toggleRow.appendChild(label);
                wrapper.appendChild(toggleRow);

                var customQuerySettings = document.createElement('div');
                customQuerySettings.style.marginTop = '12px';
                customQuerySettings.style.width = '100%';

                // URL input
                var urlLabel = document.createElement('div');
                urlLabel.textContent = 'Custom Query URL:';
                urlLabel.style.fontSize = '12px';
                urlLabel.style.marginBottom = '4px';
                urlLabel.style.color = '#666';

                var urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.id = 'customQueryUrl';
                urlInput.placeholder = 'https://www.google.com/search?q=';
                urlInput.style.width = '100%';
                urlInput.style.padding = '6px';
                urlInput.style.border = '1px solid rgba(0,0,0,0.2)';
                urlInput.style.borderRadius = '4px';
                urlInput.style.fontSize = '12px';
                urlInput.style.marginBottom = '8px';
                urlInput.style.boxSizing = 'border-box';

                // Button text input
                var buttonTextLabel = document.createElement('div');
                buttonTextLabel.textContent = 'Button Text:';
                buttonTextLabel.style.fontSize = '12px';
                buttonTextLabel.style.marginBottom = '4px';
                buttonTextLabel.style.color = '#666';

                var buttonTextInput = document.createElement('input');
                buttonTextInput.type = 'text';
                buttonTextInput.id = 'customQueryButtonText';
                buttonTextInput.placeholder = 'Custom Query';
                buttonTextInput.style.width = '100%';
                buttonTextInput.style.padding = '6px';
                buttonTextInput.style.border = '1px solid rgba(0,0,0,0.2)';
                buttonTextInput.style.borderRadius = '4px';
                buttonTextInput.style.fontSize = '12px';
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

// Initialize UI
buildFeatureToggles();
refreshToggles();
