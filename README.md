[link-cws]: https://chromewebstore.google.com/detail/webworker/cokogomdladilchdakkknehhnnoipbke

![Thumbnail](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/c53907d4-d325-47b3-a90f-0d562bc58ffe)
![Frame 1](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/1499cbce-1159-4756-b054-3d3243ef099c)

# WeBWorKer

A Chrome extension to provide a real-time preview of math entered into WeBWorK text fields, and show whether parentheses are correctly completed, with minimal distraction in the form of extra input boxes or misaligned overlays.

Available at https://chromewebstore.google.com/detail/webworker/cokogomdladilchdakkknehhnnoipbke

<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle"> [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/cokogomdladilchdakkknehhnnoipbke.svg">][link-cws] [<img valign="middle" src="https://img.shields.io/chrome-web-store/users/cokogomdladilchdakkknehhnnoipbke.svg">][link-cws]

Should work with most implementations of WeBWorK, please create an issue on GitHub if you notice any errors.

# Libraries

This extension makes use of the following open source libraries:

- jQuery 
- KaTeX
- MathJax
	- The WeBWorK platform already uses MathJax to render its own equations, so this extension uses WeBWorK's instance of MathJax
- AsciiMath
	- This extension uses a modified version of the ASCIIMathTeXImg.js file that returns a LaTeX string for a given AsciiMath input. The set of accepted AsciiMath inputs is heavily modified to reflect the functions actually supported by WeBWorK as listed here: https://webwork.maa.org/wiki/Available_Functions

# Manual Installation

1. Go to the dropdown on the green code button, and download ZIP
   
	![DownloadZip](https://github.com/user-attachments/assets/5bd07a09-0d03-4bf1-8bca-6340b37f291d)

3. Extract the ZIP file to the desired location on your computer
4. Go to the Extensions Page in Chrome (`chrome://extensions/`) in the URL bar
5. Enable developer mode in the top right hand corner, and then "Load unpacked" in the top-left corner

	![Screenshot 2024-01-20 221204](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/9c81413a-2950-4614-b633-e377a8442b3b)

7. Select the inner `WeBWorKer-main` folder
8. Done!

# Acknowledgements
Built on the shoulders of giants:
- [WeBWorKMathView by Noah Tajwar](https://github.com/noaht11/WeBWorKMathView)
- [WeBWorK Parentheses Checker by James Yuzawa](https://github.com/yuzawa-san/webwork-parentheses-checker)
- [WeBWorK AlphaLinK by Munro Anderson](https://github.com/munr0/WeBWorK-AlphaLinK)
- [WeBWorK Spoiler Guard by Abhinav Nair (Palingenos)](https://github.com/Palingenos/Webwork-Spoiler-Guard): study-mode spoiler detection and hiding, adapted for WeBWorKer's controls and settings. The original [MIT license](LICENSES/WeBWorK%20Spoiler%20Guard%20LICENSE.txt) is included.

# Study Mode

Enable **Study Mode (Hide Spoilers)** in the WeBWorKer popup when you want to practice old problems. It is off by default and updates open WeBWorK pages when you change its settings.

- Independently hide revealed answers, correctness feedback, scores and attempts, or solutions and hints.
- Clear previously filled answers locally while preserving answers you type yourself. Peek temporarily restores previous answers in untouched boxes.
- Use **Peek** on the page or in the popup, or press **Alt+Shift+P**, to reveal and hide spoilers.
- Turn study mode on or off for one site using the on-page controls, the popup, or **Alt+Shift+H**.
- Choose **Hide** or **Blur (hover to reveal)** in Study mode settings. Advanced settings accept additional CSS selectors, one per line.
- Keep answer and solution requests off in navigation and submitted forms while the corresponding hiding category is enabled.

Study mode runs on `/webwork2/` and `/webwork/` pages. It changes the local display and answer fields; recorded grades and previous submissions stay on the server. Peek can only reveal content already loaded on the page. To request a solution the page has not loaded, turn off study mode and use WeBWorK's own solution controls.

After updating an unpacked extension, reload WeBWorKer from your browser's extensions page and refresh open WeBWorK pages. Other WeBWorKer features keep their existing site controls.

# Development checks

Run the focused screenshot and study-mode checks with `node --test tests/*.test.cjs`.

For browser-rendered checks, run `node tests/serve-browser-checks.cjs` and open the printed local test URL. This fixture runs the production study-mode scripts against sample WeBWorK markup with simulated Chrome APIs. The server also provides a popup preview. These checks do not replace loading the unpacked extension and checking it against a real WeBWorK page.
