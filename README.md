[link-cws]: https://chromewebstore.google.com/detail/webworker/cokogomdladilchdakkknehhnnoipbke

![Thumbnail](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/c53907d4-d325-47b3-a90f-0d562bc58ffe)
![Frame 1](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/1499cbce-1159-4756-b054-3d3243ef099c)

# WeBWorKer

A Chrome extension that adds math previews and other tools to WeBWorK.

[Chrome Web Store](https://chromewebstore.google.com/detail/webworker/cokogomdladilchdakkknehhnnoipbke) · [Daniel Benjamin](https://www.danielrbenjamin.com/)

<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle"> [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/cokogomdladilchdakkknehhnnoipbke.svg" alt="Chrome Web Store version">][link-cws] [<img valign="middle" src="https://img.shields.io/chrome-web-store/users/cokogomdladilchdakkknehhnnoipbke.svg" alt="Chrome Web Store users">][link-cws]

## Features

- **Math previews:** See expressions rendered as you type, check matching parentheses and brackets, and resize answer fields.
- **Variables:** Use values detected in the problem or define your own numbers and expressions. Press **Ctrl+Enter** to substitute them. Nested definitions are supported; circular definitions are rejected.
- **Calculator sidebar:** Switch between Desmos Scientific, Desmos Graphing, and a Wolfram Alpha query form. Desmos work stays loaded while you switch tools in the open sidebar. Wolfram Alpha results open in a new tab.
- **Question screenshots:** Copy or download an image of the question, including questions longer than the viewport.
- **Study mode:** Optionally hide previous answers, feedback, grades, solutions, and hints when revisiting old problems. Choose hiding or blur, and use Peek to reveal loaded content. New answers you type are preserved; recorded grades and submission history are unchanged. Off by default.
- **Question actions:** Clear answer fields, open Piazza, search for resources, or configure a custom search link.
- **Limited-attempt warnings:** Confirm before submitting a problem with limited attempts.

Change features in the extension popup or onboarding page. Most changes require refreshing WeBWorK; Study Mode updates immediately.

The main site controls apply to every feature, including Study Mode. After disabling WeBWorKer, refresh the page to remove previously injected controls. Study Mode restores hidden content immediately.

## Installation

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/webworker/cokogomdladilchdakkknehhnnoipbke), or load the source locally:

1. Clone this repository or download and extract its ZIP.

   ![Download ZIP from GitHub](https://github.com/user-attachments/assets/5bd07a09-0d03-4bf1-8bca-6340b37f291d)

2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.

   ![Load an unpacked extension in Chrome](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/9c81413a-2950-4614-b633-e377a8442b3b)

4. Open your WeBWorK course and click the extension icon.
5. Enable **On this site** or **On all WeBWorK sites**, then refresh the page.

After changing the source, reload the extension from `chrome://extensions` and refresh open WeBWorK pages. Report problems in [GitHub issues](https://github.com/danielrbenjamin/WeBWorKer/issues).

## Development

No build step is required. Run the automated checks with:

```sh
node --test tests/*.test.cjs
```

For browser fixtures and popup previews, run `node tests/serve-browser-checks.cjs` and open the printed local URL. The fixtures simulate Chrome APIs; also test the unpacked extension on a real WeBWorK page.

Maintain release notes in `changelog.js`. Move **Unreleased** notes into a numbered entry when shipping and update `manifest.json`. Onboarding opens for fresh installs and major version increases, such as `2.x` to `3.0.0`. Minor and patch updates stay quiet. Users can disable major-update opening.

## Credits

WeBWorKer builds on:

- [WeBWorKMathView by Noah Tajwar](https://github.com/noaht11/WeBWorKMathView)
- [WeBWorK Parentheses Checker by James Yuzawa](https://github.com/yuzawa-san/webwork-parentheses-checker)
- [WeBWorK AlphaLinK by Munro Anderson](https://github.com/munr0/WeBWorK-AlphaLinK)
- [WeBWorK Spoiler Guard by Abhinav Nair (Palingenos)](https://github.com/Palingenos/Webwork-Spoiler-Guard)

Nested variable expressions were contributed by [Carson Jan](https://github.com/carsonjan) in [PR #4](https://github.com/danielrbenjamin/WeBWorKer/pull/4).

The extension includes KaTeX, jQuery, and a modified AsciiMath parser. Third-party license notices are in [LICENSES](LICENSES).

## License

[MIT](LICENSE).

WeBWorKer is an independent extension and is not affiliated with or endorsed by the WeBWorK Project, MAA, or UBC. Use it in accordance with your course policies.
