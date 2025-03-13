!/**
 * Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/arrow-symbols
 * @requires highcharts
 *
 * Arrow Symbols
 *
 * (c) 2017-2024 Lars A. V. Cabrera
 *
 * License: www.highcharts.com/license
 */function(r,t){"object"==typeof exports&&"object"==typeof module?module.exports=t(require("highcharts")):"function"==typeof define&&define.amd?define("highcharts/modules/arrow-symbols",[["highcharts/highcharts"]],t):"object"==typeof exports?exports["highcharts/modules/arrow-symbols"]=t(require("highcharts")):r.Highcharts=t(r.Highcharts)}(this,function(r){return function(){"use strict";var t={944:function(t){t.exports=r}},e={};function o(r){var n=e[r];if(void 0!==n)return n.exports;var u=e[r]={exports:{}};return t[r](u,u.exports,o),u.exports}o.n=function(r){var t=r&&r.__esModule?function(){return r.default}:function(){return r};return o.d(t,{a:t}),t},o.d=function(r,t){for(var e in t)o.o(t,e)&&!o.o(r,e)&&Object.defineProperty(r,e,{enumerable:!0,get:t[e]})},o.o=function(r,t){return Object.prototype.hasOwnProperty.call(r,t)};var n={};o.d(n,{default:function(){return h}});var u=o(944),i=o.n(u);function f(r,t,e,o){return[["M",r,t+o/2],["L",r+e,t],["L",r,t+o/2],["L",r+e,t+o]]}function a(r,t,e,o){return f(r,t,e/2,o)}function c(r,t,e,o){return[["M",r+e,t],["L",r,t+o/2],["L",r+e,t+o],["Z"]]}function s(r,t,e,o){return c(r,t,e/2,o)}({compose:function(r){var t=r.prototype.symbols;t.arrow=f,t["arrow-filled"]=c,t["arrow-filled-half"]=s,t["arrow-half"]=a,t["triangle-left"]=c,t["triangle-left-half"]=s}}).compose(i().SVGRenderer);var h=i();return n.default}()});