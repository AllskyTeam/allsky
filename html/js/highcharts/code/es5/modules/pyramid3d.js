!/**
 * Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/pyramid3d
 * @requires highcharts
 * @requires highcharts/highcharts-3d
 * @requires highcharts/modules/cylinder
 * @requires highcharts/modules/funnel3d
 *
 * Highcharts 3D funnel module
 *
 * (c) 2010-2024 Kacper Madej
 *
 * License: www.highcharts.com/license
 */function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("highcharts"),require("highcharts").SeriesRegistry):"function"==typeof define&&define.amd?define("highcharts/modules/pyramid3d",[["highcharts/highcharts"],["highcharts/highcharts","SeriesRegistry"]],e):"object"==typeof exports?exports["highcharts/modules/pyramid3d"]=e(require("highcharts"),require("highcharts").SeriesRegistry):t.Highcharts=e(t.Highcharts,t.Highcharts.SeriesRegistry)}(this,function(t,e){return function(){"use strict";var r,n={512:function(t){t.exports=e},944:function(e){e.exports=t}},i={};function o(t){var e=i[t];if(void 0!==e)return e.exports;var r=i[t]={exports:{}};return n[t](r,r.exports,o),r.exports}o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,{a:e}),e},o.d=function(t,e){for(var r in e)o.o(e,r)&&!o.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:e[r]})},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)};var s={};o.d(s,{default:function(){return l}});var u=o(944),c=o.n(u),a={reversed:!0,neckHeight:0,neckWidth:0,dataLabels:{verticalAlign:"top"}},h=o(512),f=o.n(h),p=(r=function(t,e){return(r=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(t,e)},function(t,e){function n(){this.constructor=t}r(t,e),t.prototype=null===e?Object.create(e):(n.prototype=e.prototype,new n)}),d=f().seriesTypes.funnel3d,y=c().merge,g=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return p(e,t),e.defaultOptions=y(d.defaultOptions,a),e}(d);f().registerSeriesType("pyramid3d",g);var l=c();return s.default}()});