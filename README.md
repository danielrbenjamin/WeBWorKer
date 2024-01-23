![Thumbnail](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/d64ee3f4-aa98-43c0-995e-bbc55a2fe8f9)
![Screenshot 1](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/08788443-9da4-43b4-ac62-391ca703abd6)
![Screenshot 3](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/b2b10918-adcc-45b2-a0bd-bbe9dcb3db6a)
![Screenshot 2](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/77519eb8-f8cc-49e6-be11-4b89fd0c144d)
![Screenshot 5](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/b2886269-2fba-429a-8159-5d868ff77de5)
![Frame 1](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/1499cbce-1159-4756-b054-3d3243ef099c)

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

1. Go to the dropdown on the green code button, and download ZIP

	![Screenshot 2024-01-20 221034](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/9264d633-9c17-466d-a12f-0636d1b745fb)

3. Extract the ZIP file to the desired location on your computer
4. Go to the Extensions Page in Chrome (`chrome://extensions/`) in the URL bar
5. Enable developer mode in the top right hand corner, and then "Load unpacked" in the top-left corner

	![Screenshot 2024-01-20 221204](https://github.com/crimson-dynamo/WeBWorKer/assets/156981781/9c81413a-2950-4614-b633-e377a8442b3b)

7. Select the inner `WeBWorKer-main` folder
8. Done!
