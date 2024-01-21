![Picture2](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/f8b67baf-17e1-429b-8fe6-debc4d8ccba6)


# WeBWorKer

A Chrome extension to provide a real-time preview of math entered into WeBWorK text fields, and show whether parentheses are correctly completed, with minimal distraction in the form of extra input boxes or misaligned overlays.

*CURRENTLY ONLY 100% CONFIRMED TO WORK WITH THE UNIVERSITY OF BRITISH COLUMBIA*

Based off of [WeBWorKMathView by Noah Tajwar](https://github.com/noaht11/WeBWorKMathView) and [WeBWorK Parentheses Checker by James Yuzawa](yuzawa-san/webwork-parentheses-checker).

# Libraries

This extension makes use of the following open source libraries:

- jQuery 
- KaTeX
- MathJax
	- The WeBWorK platform already uses MathJax to render its own equations, so this extension uses WeBWorK's instance of MathJax
- AsciiMath
	- This extension uses a modified version of the ASCIIMathTeXImg.js file that returns a LaTeX string for a given AsciiMath input. The set of accepted AsciiMath inputs is heavily modified to reflect the functions actually supported by WeBWorK as listed here: https://webwork.maa.org/wiki/Available_Functions

# Installation

https://dev.to/ben/how-to-install-chrome-extensions-manually-from-github-1612
