/*!
 * jQuery Viewer v1.0.1
 * https://fengyuanchen.github.io/jquery-viewer
 *
 * Copyright 2018-present Chen Fengyuan
 * Released under the MIT license
 *
 * Date: 2019-12-14T09:00:02.315Z
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(require("jquery"),require("viewerjs")):"function"==typeof define&&define.amd?define(["jquery","viewerjs"],t):t((e=e||self).jQuery,e.Viewer)}(this,function(d,v){"use strict";if(d=d&&d.hasOwnProperty("default")?d.default:d,v=v&&v.hasOwnProperty("default")?v.default:v,d&&d.fn&&v){var e=d.fn.viewer,w="viewer";d.fn.viewer=function(o){for(var e=arguments.length,u=new Array(1<e?e-1:0),t=1;t<e;t++)u[t-1]=arguments[t];var s;return this.each(function(e,t){var r=d(t),n="destroy"===o,i=r.data(w);if(!i){if(n)return;var f=d.extend({},r.data(),d.isPlainObject(o)&&o);i=new v(t,f),r.data(w,i)}if("string"==typeof o){var a=i[o];d.isFunction(a)&&((s=a.apply(i,u))===i&&(s=void 0),n&&r.removeData(w))}}),void 0!==s?s:this},d.fn.viewer.Constructor=v,d.fn.viewer.setDefaults=v.setDefaults,d.fn.viewer.noConflict=function(){return d.fn.viewer=e,this}}});