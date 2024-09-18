console.log("[WeBWorKer] ext-config.js");

var ExtConfig = new function () {

    var WEBWORK_SLUG = "webwork2";

    var CSS_DEPENDENCIES = [
        "lib/katex/katex.css",
        "math-view.css"
    ];

    var JS_DEPENDENCIES = [
        "lib/katex/katex.min.js",
        "lib/asciimath/ASCIIMathTeXImg.js",
        "lib/html2canvas/html2canvas.min.js",
        "math-view.js",
        "content-webwork.js"
    ];

    /**
     * Extracts the hostname from a piece of text that either contains just a hostname or a full URL
     * @param {string} text the text from which to extract the hostname
     */
    var extractHostname = function (url) {
        return new URL(url).hostname;
    }

    var createURLPattern = function (origin) {
        return `*://${origin}/${WEBWORK_SLUG}/*`
    }

    var createContentScriptID = function (origin) {
        return `webwork-${origin}`;
    }

    var createContentScriptSpec = function (origin) {
        return {
            "id": createContentScriptID(origin),
            "allFrames": true,
            "css": CSS_DEPENDENCIES,
            "js": JS_DEPENDENCIES,
            "matches": [createURLPattern(origin)]
        };
    };

    var createPermissionSpec = function (origin) {
        return {
            "origins": [createURLPattern(origin)]
        };
    }

    var registerContentScript = async function (origin) {
        var contentScriptSpec = createContentScriptSpec(origin);
        var contentScripts = await chrome.scripting.getRegisteredContentScripts({
            "ids": [contentScriptSpec.id]
        });
        if (contentScripts && contentScripts.length > 0) {
            // Update the content script if it already is registered
            await chrome.scripting.updateContentScripts([contentScriptSpec]);
        } else {
            await chrome.scripting.registerContentScripts([contentScriptSpec]);
        }
    }

    var unregisterContentScript = async function (origin) {
        if (await hasContentScript(origin)) {
            await chrome.scripting.unregisterContentScripts({
                "ids": [createContentScriptID(origin)]
            });
        }
    }

    var hasPermission = async function (origin) {
        var permissionSpec = createPermissionSpec(origin);
        return await chrome.permissions.contains(permissionSpec);
    }

    var hasContentScript = async function (origin) {
        var contentScriptSpec = createContentScriptSpec(origin);
        var contentScripts = await chrome.scripting.getRegisteredContentScripts({
            "ids": [contentScriptSpec.id]
        });
        if (!contentScripts || contentScripts.length <= 0) {
            return false;
        }

        return true;
    }

    this.configureAction = function () {
        // Page actions are disabled by default and enabled on select tabs
        chrome.action.disable();

        // Clear all rules to ensure only our expected rules are set
        chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
            // Declare a rule to enable the action on webwork pages
            var rule = {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {pathPrefix: `/${WEBWORK_SLUG}`},
                    })
                ],
                actions: [new chrome.declarativeContent.ShowAction()],
            };
            // Apply the rule
            chrome.declarativeContent.onPageChanged.addRules([rule]);
        });
    }

    this.tryEnableGlobal = async function () {
        // Check if we have global permissions
        if (await hasPermission("*")) {
            // Register the content script globally since we have permissions anyway
            await registerContentScript("*");
            return true;
        }
        return false;
    }

    this.addWebworkSite = async function (url) {
        var origin = extractHostname(url);

        // Check if we have the necessary permissions
        if (!hasPermission(origin)) {
            // Request permission if we don't already have it
            var granted = await chrome.permissions.request(permissionSpec);
            if (!granted) {
                return false;
            }
        }

        // Handle content script registration
        await registerContentScript(origin);

        return true;
    };

    this.hasGlobalWebworkSite = async function () {
        // Check for global configuration
        if (await hasPermission("*") && await hasContentScript("*")) {
            return true;
        }
        return false;
    }

    this.hasWebworkSite = async function (url) {
        // Check for the specific origin
        var origin = extractHostname(url);
        if (await hasPermission(origin) && await hasContentScript(origin)) {
            return true;
        }

        return false;
    }

    this.removeWebworkSite = async function (url) {
        var origin = extractHostname(url);

        // Remove the content script
        await unregisterContentScript(origin);

        // Remove the permission
        // TODO: Right now this is skipped because host permissions are horribly broken
        // in manifest v3. Once they eventually get fixed, this can be added back in.

        // var permissionSpec = createPermissionSpec(origin);
        // console.log(permissionSpec);
        // await chrome.permissions.remove(permissionSpec);
    }

    this.disableGlobal = async function () {
        await unregisterContentScript("*");

        // TODO remove permission
    }

    this.directInject = async function (tabID) {
        var target = {
            "allFrames": true,
            "tabId": tabID
        };

        await chrome.scripting.insertCSS({
            "files": CSS_DEPENDENCIES,
            "target": target
        });
        await chrome.scripting.executeScript({
            "files": JS_DEPENDENCIES,
            "target": target
        })
    }
};
