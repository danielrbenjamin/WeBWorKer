// side-panel-button.js
// Injects a floating button to open the Chrome side panel

(function() {
  try {
    // Only run in top window
    if (window.top !== window) return;

    // Avoid duplicate injection
    if (document.getElementById('webworker-panel-button')) return;

    // Check if the button should be shown
    var checkAndMaybeCreate = function() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get({sidePanelButtonEnabled: true}, function(items) {
            if (items.sidePanelButtonEnabled) {
              createButton();
            }
          });
        } else {
          // If storage API isn't available, default to showing the button
          createButton();
        }
      } catch (e) {
        console.error('[WeBWorKer] side-panel-button check error', e);
        // fallback to showing button
        createButton();
      }
    };

    // Create floating button
    var createButton = function() {
      if (document.getElementById('webworker-panel-button')) return;

      var button = document.createElement('button');
      button.id = 'webworker-panel-button';
      button.className = 'webworker-panel-button';
      button.innerHTML = '🧮';
      button.setAttribute('title', 'Open Desmos Calculator');
      button.setAttribute('aria-label', 'Open Desmos Calculator Panel');

      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Send message to background script to open side panel
        chrome.runtime.sendMessage({
          type: 'weworker.openSidePanel'
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('[WeBWorKer] Runtime error:', chrome.runtime.lastError.message);
            return;
          }
          if (response && response.ok) {
            console.log('[WeBWorKer] Side panel opened');
          } else {
            console.error('[WeBWorKer] Failed to open side panel:', response?.error || 'Unknown error');
          }
        });
      });

      document.body.appendChild(button);
    };

    // Wait for body to be available
    if (document.body) {
      checkAndMaybeCreate();
    } else {
      document.addEventListener('DOMContentLoaded', checkAndMaybeCreate);
    }

  } catch (err) {
    console.error('[WeBWorKer] side-panel-button injection failed', err);
  }
})();
