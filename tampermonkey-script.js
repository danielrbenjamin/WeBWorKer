// ==UserScript==
// @name         Change Element Class on UBC WebWork
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Change the class of all elements on UBC WebWork with a specific class using Tampermonkey
// @author       You
// @match        https://webwork.elearning.ubc.ca/webwork2/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Select all elements with the specified class
    var targetElements = document.querySelectorAll('.btn.btn-sm.btn-secondary.codeshard-btn');

    // Iterate through each element and change its class
    targetElements.forEach(function(element) {
        element.className = 'input-group d-inline-flex flex-nowrap w-auto mv-container';
    });
})();
