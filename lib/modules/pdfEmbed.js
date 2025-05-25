// This module is responsible for embedding PDF viewers for PDF links.
// It detects links to PDF files and replaces them with embedded viewers.

// State variable to prevent re-rendering if already done.
let pdfsAlreadyRendered = false;

/**
 * Initializes PDF embedding functionality.
 * It detects and renders PDF placeholders and sets up a MutationObserver
 * to handle dynamically added PDF links.
 */
export function initPdfEmbedding() {
  console.log('[WeBWorKer] Initializing PDF Embedding');
  if (pdfsAlreadyRendered) {
    console.log('[WeBWorKer] PDFs already rendered, skipping initial scan.');
    // return; // Commented out to allow MutationObserver to always run
  }

  detectAndRenderPDFPlaceholders();
  setupMutationObserver();
  // pdfsAlreadyRendered = true; // Set after first scan and observer setup
}

/**
 * Checks if PDF placeholders have already been rendered.
 * @returns {boolean} True if PDFs have been rendered, false otherwise.
 */
function arePDFsAlreadyRendered() {
  // This function can be used by the observer to avoid redundant processing
  // if multiple mutations are caught for the same rendering pass.
  return pdfsAlreadyRendered;
}

/**
 * Embeds a PDF viewer for a given image element that is a placeholder for a PDF.
 * @param {HTMLImageElement} imgElement - The image element to replace with a PDF viewer.
 */
function embedPDFViewerFromImage(imgElement) {
  const pdfURL = imgElement.src.replace(/\.png$/, '.pdf').replace(/\/wwtmp\/.*/, '/PDF_PLACEHOLDER_20130502_190715.pdf'); // TODO: Make this more robust
  // This URL transformation is specific to a known setup and might need generalization.
  // Example: "https://webwork.example.edu/wwtmp/ProblemSet1_Prob1_Fig1.png"
  // Becomes: "https://webwork.example.edu/webwork2_files/some_course/pdf/ProblemSet1_Prob1_Fig1.pdf" (hypothetically)
  // The current replacement logic is a placeholder and needs to be accurate for the target WeBWorK setup.

  // For the purpose of this refactor, we'll assume the src of the image
  // can be transformed into the PDF URL by replacing .png with .pdf
  // and potentially adjusting the path if a more specific pattern is known.
  // The provided snippet had a complex regex; for now, a simpler one:
  let guessedPdfURL = imgElement.src;
  if (guessedPdfURL.includes('/wwtmp/') && guessedPdfURL.endsWith('.png')) {
     guessedPdfURL = guessedPdfURL.replace(/\.png$/, '.pdf');
     // This is a guess. The actual transformation from image src to PDF URL
     // depends heavily on how the WeBWorK server is configured to store these files.
     // The original script had a very specific replacement:
     // .replace(/\/wwtmp\/([^\/]*_WWPLOT_[^\/_]*_)[^\/]*\.png$/, '/$1.pdf')
     // which implies a certain naming convention for WWPLOT images.
     // For a general solution, this needs to be configurable or more intelligently derived.
     console.log(`[WeBWorKer] Guessed PDF URL (from wwtmp png): ${guessedPdfURL}`);
  } else if (imgElement.alt && imgElement.alt.toLowerCase().includes('.pdf')) {
    // Sometimes the 'alt' text might contain the PDF filename
    // This is highly speculative.
    guessedPdfURL = imgElement.alt;
     console.log(`[WeBWorKer] Guessed PDF URL (from img alt): ${guessedPdfURL}`);
  } else {
    console.warn('[WeBWorKer] Cannot determine PDF URL from image:', imgElement);
    return;
  }


  const viewerWidth = imgElement.width > 0 ? imgElement.width : '800'; // Default width
  const viewerHeight = imgElement.height > 0 ? imgElement.height : '600'; // Default height

  const iframe = document.createElement('iframe');
  iframe.src = guessedPdfURL; // Use the guessed URL
  iframe.width = viewerWidth.toString();
  iframe.height = viewerHeight.toString();
  iframe.style.border = '1px solid #ccc';
  iframe.title = `Embedded PDF: ${guessedPdfURL}`;

  console.log(`[WeBWorKer] Embedding PDF: ${guessedPdfURL} with size ${viewerWidth}x${viewerHeight}`);

  if (imgElement.parentNode) {
    imgElement.parentNode.replaceChild(iframe, imgElement);
    console.log('[WeBWorKer] Replaced image with PDF iframe.');
  } else {
    console.warn('[WeBWorKer] Image element has no parent. Cannot replace with PDF iframe.');
  }
}


/**
 * Detects and renders PDF placeholders on the page.
 * It looks for image elements that are placeholders for PDF files and replaces them
 * with embedded PDF viewers.
 */
function detectAndRenderPDFPlaceholders() {
  console.log('[WeBWorKer] Detecting PDF placeholders...');
  const images = document.querySelectorAll('img');
  let pdfsFound = 0;
  images.forEach((img) => {
    // Heuristic to identify PDF placeholder images:
    // 1. Check if 'alt' attribute suggests it's a PDF.
    // 2. Check if 'src' attribute path looks like a temporary image for a PDF.
    //    (e.g., contains '/wwtmp/' and ends with '.png', and there's a corresponding '.pdf')
    //    The original script had a complex regex for this.
    const altText = img.alt || '';
    const imgSrc = img.src || '';

    // Condition from original script:
    // WWPLOT is a common prefix for images generated by WeBWorK that might have PDF versions
    // The original regex was: /WWPLOT.*\.png$/i.test(imgSrc)
    // And also checked for `img.closest('a[href$=".pdf"]')` which is for direct PDF links.

    // Simple check for images that might be placeholders (based on original logic for wwtmp)
    if (imgSrc.includes('/wwtmp/') && imgSrc.endsWith('.png')) {
        // More specific check could involve trying to fetch a .pdf version to confirm.
        console.log(`[WeBWorKer] Found potential PDF placeholder image (wwtmp): ${imgSrc}`);
        embedPDFViewerFromImage(img);
        pdfsFound++;
    }
    // Check for direct links to PDFs that contain an image (e.g. a PDF icon)
    else if (img.parentNode && img.parentNode.tagName === 'A' && img.parentNode.href.toLowerCase().endsWith('.pdf')) {
        const anchor = img.parentNode;
        const pdfURL = anchor.href;
        console.log(`[WeBWorKer] Found image inside a direct PDF link: ${pdfURL}`);

        const viewerWidth = img.width > 0 ? img.width : '800';
        const viewerHeight = img.height > 0 ? img.height : '600'; // Prefer image height if available

        const iframe = document.createElement('iframe');
        iframe.src = pdfURL;
        iframe.width = viewerWidth.toString();
        iframe.height = viewerHeight.toString();
        iframe.style.border = '1px solid #ccc';
        iframe.title = `Embedded PDF: ${pdfURL}`;

        if (anchor.parentNode) {
            anchor.parentNode.replaceChild(iframe, anchor);
            console.log('[WeBWorKer] Replaced link+image with PDF iframe.');
            pdfsFound++;
        }
    }
  });

  if (pdfsFound > 0) {
    console.log(`[WeBWorKer] Processed ${pdfsFound} PDF placeholders.`);
    pdfsAlreadyRendered = true; // Mark as rendered after this pass
  } else {
    console.log('[WeBWorKer] No PDF placeholders initially found matching common patterns.');
  }
}

/**
 * Sets up a MutationObserver to detect dynamically added PDF links or placeholders.
 */
function setupMutationObserver() {
  console.log('[WeBWorKer] Setting up MutationObserver for dynamic PDF content.');
  const observer = new MutationObserver((mutationsList, obs) => {
    let foundNewPlaceholders = false;
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node itself is a placeholder or contains them
            if (node.matches && node.matches('img')) {
                 // Similar logic as in detectAndRenderPDFPlaceholders
                const imgSrc = node.src || '';
                if (imgSrc.includes('/wwtmp/') && imgSrc.endsWith('.png')) {
                    console.log(`[WeBWorKer] Observer detected potential PDF placeholder image (wwtmp): ${imgSrc}`);
                    embedPDFViewerFromImage(node);
                    foundNewPlaceholders = true;
                } else if (node.parentNode && node.parentNode.tagName === 'A' && node.parentNode.href.toLowerCase().endsWith('.pdf')) {
                    const anchor = node.parentNode;
                    const pdfURL = anchor.href;
                    console.log(`[WeBWorKer] Observer detected image inside a direct PDF link: ${pdfURL}`);
                     const viewerWidth = node.width > 0 ? node.width : '800';
                     const viewerHeight = node.height > 0 ? node.height : '600';
                     const iframe = document.createElement('iframe');
                     iframe.src = pdfURL;
                     iframe.width = viewerWidth.toString();
                     iframe.height = viewerHeight.toString();
                     iframe.style.border = '1px solid #ccc';
                     if (anchor.parentNode) {
                         anchor.parentNode.replaceChild(iframe, anchor);
                         foundNewPlaceholders = true;
                     }
                }
            }
            // Check if children of the added node are placeholders
            const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
            images.forEach(img => {
              const imgSrc = img.src || '';
              if (imgSrc.includes('/wwtmp/') && imgSrc.endsWith('.png')) {
                console.log(`[WeBWorKer] Observer detected potential PDF placeholder image (wwtmp in subtree): ${imgSrc}`);
                embedPDFViewerFromImage(img);
                foundNewPlaceholders = true;
              } else if (img.parentNode && img.parentNode.tagName === 'A' && img.parentNode.href.toLowerCase().endsWith('.pdf')) {
                 const anchor = img.parentNode;
                 const pdfURL = anchor.href;
                 console.log(`[WeBWorKer] Observer detected image inside a direct PDF link (in subtree): ${pdfURL}`);
                 const viewerWidth = img.width > 0 ? img.width : '800';
                 const viewerHeight = img.height > 0 ? img.height : '600';
                 const iframe = document.createElement('iframe');
                 iframe.src = pdfURL;
                 iframe.width = viewerWidth.toString();
                 iframe.height = viewerHeight.toString();
                 iframe.style.border = '1px solid #ccc';
                 if (anchor.parentNode) {
                     anchor.parentNode.replaceChild(iframe, anchor);
                     foundNewPlaceholders = true;
                 }
              }
            });
          }
        });
      }
    }
    if (foundNewPlaceholders) {
        console.log('[WeBWorKer] MutationObserver processed new PDF placeholders.');
        // pdfsAlreadyRendered = true; // Update state if needed, though continuous observation is fine
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[WeBWorKer] MutationObserver is now watching the document body.');
}
