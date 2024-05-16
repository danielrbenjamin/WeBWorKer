var buttonThisSite = document.getElementById("enableThisSite");
var buttonGlobal = document.getElementById("enableGlobal");
var buttonClearAnswers = document.getElementById("toggleClearAnswers");
var buttonPiazza = document.getElementById("togglePiazzaButton");
var buttonResources = document.getElementById("toggleResourcesButton");
var buttonCheckParentheses = document.getElementById("toggleCheckParentheses");
var refreshPageLink = document.getElementById("refreshPage");

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

        chrome.storage.sync.get({
            clearAnswersEnabled: true, // Default to true
            piazzaEnabled: true, // Default to true
            resourcesEnabled: true, // Default to true
            checkParenthesesEnabled: true // Default to true
        }, (result) => {
            buttonClearAnswers.checked = result.clearAnswersEnabled;
            buttonPiazza.checked = result.piazzaEnabled;
            buttonResources.checked = result.resourcesEnabled;
            buttonCheckParentheses.checked = result.checkParenthesesEnabled;
        });
    } catch (error) {
        console.error('Error refreshing toggles:', error);
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

// Add event listeners for new toggles
buttonClearAnswers.addEventListener("click", async () => {
    var enabled = buttonClearAnswers.checked;
    await chrome.storage.sync.set({ 'clearAnswersEnabled': enabled });
});

buttonPiazza.addEventListener("click", async () => {
    var enabled = buttonPiazza.checked;
    await chrome.storage.sync.set({ 'piazzaEnabled': enabled });
});

buttonResources.addEventListener("click", async () => {
    var enabled = buttonResources.checked;
    await chrome.storage.sync.set({ 'resourcesEnabled': enabled });
});

buttonCheckParentheses.addEventListener("click", async () => {
    var enabled = buttonCheckParentheses.checked;
    await chrome.storage.sync.set({ 'checkParenthesesEnabled': enabled });
});

// Add event listener for the refresh link
refreshPageLink.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
    });
});

refreshToggles();
