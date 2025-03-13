/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/polyfills
 *
 * (c) 2009-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("highcharts/polyfills", [], factory);
	else if(typeof exports === 'object')
		exports["highcharts/polyfills"] = factory();
	else
		root["Highcharts"] = factory();
})(this, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};


if (!Array.prototype.includes) {
    // eslint-disable-next-line no-extend-native
    Array.prototype.includes = function (searchElement, fromIndex) {
        return this.indexOf(searchElement, fromIndex) > -1;
    };
}
if (!Array.prototype.find) {
    // eslint-disable-next-line no-extend-native
    Array.prototype.find = function (predicate, thisArg) {
        for (var i = 0; i < this.length; i++) {
            if (predicate.call(thisArg, this[i], i, this)) {
                return this[i];
            }
        }
    };
}
if (!Object.entries) {
    Object.entries = function (obj) {
        var keys = Object.keys(obj), iEnd = keys.length, entries = [];
        for (var i = 0; i < iEnd; ++i) {
            entries.push([keys[i], obj[keys[i]]]);
        }
        return entries;
    };
}
if (!Object.values) {
    Object.values = function (obj) {
        var keys = Object.keys(obj), iEnd = keys.length, values = [];
        for (var i = 0; i < iEnd; ++i) {
            values.push(obj[keys[i]]);
        }
        return values;
    };
}
(function () {
    if (typeof window.CustomEvent === "function")
        return false;
    function CustomEvent(type, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
        return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
})();

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});