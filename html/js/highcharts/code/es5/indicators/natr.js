!/**
 * Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/natr
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Paweł Dalek
 *
 * License: www.highcharts.com/license
 */function(t,r){"object"==typeof exports&&"object"==typeof module?module.exports=r(require("highcharts"),require("highcharts").SeriesRegistry):"function"==typeof define&&define.amd?define("highcharts/indicators/natr",[["highcharts/highcharts"],["highcharts/highcharts","SeriesRegistry"]],r):"object"==typeof exports?exports["highcharts/indicators/natr"]=r(require("highcharts"),require("highcharts").SeriesRegistry):t.Highcharts=r(t.Highcharts,t.Highcharts.SeriesRegistry)}(this,function(t,r){return function(){"use strict";var e,n={512:function(t){t.exports=r},944:function(r){r.exports=t}},o={};function i(t){var r=o[t];if(void 0!==r)return r.exports;var e=o[t]={exports:{}};return n[t](e,e.exports,i),e.exports}i.n=function(t){var r=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(r,{a:r}),r},i.d=function(t,r){for(var e in r)i.o(r,e)&&!i.o(t,e)&&Object.defineProperty(t,e,{enumerable:!0,get:r[e]})},i.o=function(t,r){return Object.prototype.hasOwnProperty.call(t,r)};var s={};i.d(s,{default:function(){return g}});var u=i(944),a=i.n(u),c=i(512),h=i.n(c),f=(e=function(t,r){return(e=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(t,r){t.__proto__=r}||function(t,r){for(var e in r)r.hasOwnProperty(e)&&(t[e]=r[e])})(t,r)},function(t,r){function n(){this.constructor=t}e(t,r),t.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}),p=h().seriesTypes.atr,y=a().merge,l=function(t){function r(){return null!==t&&t.apply(this,arguments)||this}return f(r,t),r.prototype.getValues=function(r,e){var n=t.prototype.getValues.apply(this,arguments),o=n.values.length,i=r.yData,s=0,u=e.period-1;if(n){for(;s<o;s++)n.yData[s]=n.values[s][1]/i[u][3]*100,n.values[s][1]=n.yData[s],u++;return n}},r.defaultOptions=y(p.defaultOptions,{tooltip:{valueSuffix:"%"}}),r}(p);h().registerSeriesType("natr",l);var g=a();return s.default}()});