!/**
 * Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/trix
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Rafal Sebestjanski
 *
 * License: www.highcharts.com/license
 */function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("highcharts"),require("highcharts").SeriesRegistry):"function"==typeof define&&define.amd?define("highcharts/indicators/trix",[["highcharts/highcharts"],["highcharts/highcharts","SeriesRegistry"]],e):"object"==typeof exports?exports["highcharts/indicators/trix"]=e(require("highcharts"),require("highcharts").SeriesRegistry):t.Highcharts=e(t.Highcharts,t.Highcharts.SeriesRegistry)}(this,function(t,e){return function(){"use strict";var r,n={512:function(t){t.exports=e},944:function(e){e.exports=t}},o={};function i(t){var e=o[t];if(void 0!==e)return e.exports;var r=o[t]={exports:{}};return n[t](r,r.exports,i),r.exports}i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,{a:e}),e},i.d=function(t,e){for(var r in e)i.o(e,r)&&!i.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)};var s={};i.d(s,{default:function(){return d}});var u=i(944),c=i.n(u),a=i(512),h=i.n(a),f=(r=function(t,e){return(r=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,e)},function(t,e){function n(){this.constructor=t}r(t,e),t.prototype=null===e?Object.create(e):(n.prototype=e.prototype,new n)}),p=h().seriesTypes.tema,l=c().correctFloat,g=c().merge,y=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return f(e,t),e.prototype.getTemaPoint=function(t,e,r,n){if(n>e)return[t[n-3],0!==r.prevLevel3?l(r.level3-r.prevLevel3)/r.prevLevel3*100:null]},e.defaultOptions=g(p.defaultOptions),e}(p);h().registerSeriesType("trix",y);var d=c();return s.default}()});