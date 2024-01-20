var buttonThisSite = document.getElementById("enableThisSite");
var buttonGlobal = document.getElementById("enableGlobal");

var refreshToggles = async () => {
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

refreshToggles();
