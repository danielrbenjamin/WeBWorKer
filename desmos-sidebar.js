// desmos-sidebar.js
// Injects a collapsible sidebar containing the Desmos Scientific Calculator iframe.

(function() {
  try {
    // Only run in top window
    if (window.top !== window) return;

    // Avoid duplicate injection
    if (document.getElementById('webworker-desmos-root')) return;

    // Check storage for toggle enabling; show only the floating handle by default.
    // Do NOT open the sidebar automatically.
    var checkAndMaybeCreate = function() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get({desmosSidebarEnabled: false}, function(items) {
            if (items.desmosSidebarEnabled) {
              // Feature enabled: create only the handle; sidebar opens on click
              createHandle();
            }
          });
        } else {
          // If storage API isn't available, default to showing the handle only
          createHandle();
        }
      } catch (e) {
        console.error('[WeBWorKer] desmos-sidebar check error', e);
        // fallback to handle only
        createHandle();
      }
    }

    var createSidebar = function() {
      if (document.getElementById('webworker-desmos-root')) return;

      var root = document.createElement('div');
      root.id = 'webworker-desmos-root';
      root.className = 'webworker-desmos-sidebar';

      var header = document.createElement('div');
      header.className = 'dw-header';

      var title = document.createElement('div');
      title.className = 'dw-title';
      title.textContent = 'Desmos Scientific';

      // Add close button to header
      var closeBtn = document.createElement('button');
      closeBtn.className = 'dw-close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('title', 'Close sidebar');
      closeBtn.addEventListener('click', function() {
        var root = document.getElementById('webworker-desmos-root');
        var handle = document.getElementById('webworker-desmos-handle');
        if (root) {
          root.classList.add('collapsed');
        }
        if (handle) {
          handle.style.display = 'flex';
        }
      });

      header.appendChild(title);
      header.appendChild(closeBtn);

      var iframe = document.createElement('iframe');
      iframe.className = 'dw-iframe';
      // Desmos scientific calculator URL
      iframe.src = 'https://www.desmos.com/scientific';
      iframe.setAttribute('aria-label', 'Desmos Scientific Calculator');

      root.appendChild(header);
      root.appendChild(iframe);

      // Insert into document
      document.documentElement.appendChild(root);

      // create floating handle which provides collapse/show/hide controls
      createHandle();

      // Allow escape key to hide the sidebar
      window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          var el = document.getElementById('webworker-desmos-root');
          if (el) el.classList.add('hidden');
        }
      });
    }

    // If CSS hasn't been inserted via scripting.insertCSS (directInject), try to load minimal inline fallback styles
    var ensureStyles = function() {
      var linkAlready = false;
      var links = document.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(function(l) { if (l.href && l.href.indexOf('desmos-sidebar.css') !== -1) linkAlready = true; });
      if (!linkAlready) {
        // Try to insert a link to the extension CSS via runtime.getURL if available
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('desmos-sidebar.css');
            document.head.appendChild(link);
            // also add handle styles fallback if CSS didn't load for some reason
          
          }
        } catch (e) {
          // ignore
        }
      }
    }

      // Create or ensure floating handle exists. This will allow page-level collapse/expand
      var createHandle = function() {
        // handle exists? don't duplicate
        if (document.getElementById('webworker-desmos-handle')) return;

        var handle = document.createElement('div');
        handle.id = 'webworker-desmos-handle';
        handle.className = 'webworker-desmos-handle';
  handle.setAttribute('title', 'Toggle Calculator Sidebar');
  // Use a calculator-like glyph instead of the tools glyph.
  // Using the number-input emoji (🧮) which is widely supported; change if you prefer 🧮 (abacus) or an SVG.
  handle.innerText = '➗';

        handle.addEventListener('click', function() {
          var root = document.getElementById('webworker-desmos-root');
          if (!root) {
            // sidebar not present yet — create it
            createSidebar();
            // After creating, remove collapsed state to show it
            setTimeout(function() {
              var newRoot = document.getElementById('webworker-desmos-root');
              if (newRoot) {
                newRoot.classList.remove('collapsed');
                // Hide handle when sidebar is open
                handle.style.display = 'none';
              }
            }, 50);
            return;
          }

          if (root.classList.contains('hidden')) {
            // reveal it
            root.classList.remove('hidden');
            root.classList.remove('collapsed');
            handle.style.display = 'none';
            return;
          }

          // toggle collapsed state
          if (root.classList.contains('collapsed')) {
            root.classList.remove('collapsed');
            handle.style.display = 'none';
          } else {
            root.classList.add('collapsed');
            handle.style.display = 'flex';
          }
        });

        document.documentElement.appendChild(handle);
      }

    // After defining createHandle, load styles and initialize (handle only by default)
    ensureStyles();
    checkAndMaybeCreate();

  } catch (err) {
    console.error('[WeBWorKer] desmos-sidebar injection failed', err);
  }
})();
