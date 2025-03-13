/**
 * @license Highcharts Gantt JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/static-scale
 * @requires highcharts
 *
 * StaticScale
 *
 * (c) 2016-2024 Torstein Honsi, Lars A. V. Cabrera
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"));
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/static-scale", [["highcharts/highcharts"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/static-scale"] = factory(require("highcharts"));
	else
		root["Highcharts"] = factory(root["Highcharts"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 944:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__944__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ static_scale_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es5/es-modules/Extensions/StaticScale.js
/* *
 *
 *  (c) 2016-2024 Torstein Honsi, Lars Cabrera
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Composition
 *
 * */
/** @private */
function compose(AxisClass, ChartClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.adjustHeight) {
        addEvent(AxisClass, 'afterSetOptions', onAxisAfterSetOptions);
        chartProto.adjustHeight = chartAdjustHeight;
        addEvent(ChartClass, 'render', chartProto.adjustHeight);
    }
}
/** @private */
function onAxisAfterSetOptions() {
    var chartOptions = this.chart.options.chart;
    if (!this.horiz &&
        isNumber(this.options.staticScale) &&
        (!chartOptions.height ||
            (chartOptions.scrollablePlotArea &&
                chartOptions.scrollablePlotArea.minHeight))) {
        this.staticScale = this.options.staticScale;
    }
}
/** @private */
function chartAdjustHeight() {
    var chart = this;
    if (chart.redrawTrigger !== 'adjustHeight') {
        var _loop_1 = function (axis) {
                var chart_1 = axis.chart,
            animate = !!chart_1.initiatedScale &&
                    chart_1.options.animation,
            staticScale = axis.options.staticScale;
            if (axis.staticScale && defined(axis.min)) {
                var height = pick(axis.brokenAxis && axis.brokenAxis.unitLength,
                    axis.max + axis.tickInterval - axis.min) * staticScale;
                // Minimum height is 1 x staticScale.
                height = Math.max(height, staticScale);
                var diff = height - chart_1.plotHeight;
                if (!chart_1.scrollablePixelsY && Math.abs(diff) >= 1) {
                    chart_1.plotHeight = height;
                    chart_1.redrawTrigger = 'adjustHeight';
                    chart_1.setSize(void 0, chart_1.chartHeight + diff, animate);
                }
                // Make sure clip rects have the right height before initial
                // animation.
                axis.series.forEach(function (series) {
                    var clipRect = series.sharedClipKey &&
                            chart_1.sharedClips[series.sharedClipKey];
                    if (clipRect) {
                        clipRect.attr(chart_1.inverted ? {
                            width: chart_1.plotHeight
                        } : {
                            height: chart_1.plotHeight
                        });
                    }
                });
            }
        };
        for (var _i = 0, _a = (chart.axes || []); _i < _a.length; _i++) {
            var axis = _a[_i];
            _loop_1(axis);
        }
        this.initiatedScale = true;
    }
    this.redrawTrigger = null;
}
/* *
 *
 *  Default Export
 *
 * */
var StaticScale = {
    compose: compose
};
/* harmony default export */ var Extensions_StaticScale = (StaticScale);
/* *
 *
 *  API Options
 *
 * */
/**
 * For vertical axes only. Setting the static scale ensures that each tick unit
 * is translated into a fixed pixel height. For example, setting the static
 * scale to 24 results in each Y axis category taking up 24 pixels, and the
 * height of the chart adjusts. Adding or removing items will make the chart
 * resize.
 *
 * @sample gantt/xrange-series/demo/
 *         X-range series with static scale
 *
 * @type      {number}
 * @default   50
 * @since     6.2.0
 * @product   gantt
 * @apioption yAxis.staticScale
 */
''; // Keeps doclets above in JS file

;// ./code/es5/es-modules/masters/modules/static-scale.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
Extensions_StaticScale.compose(G.Axis, G.Chart);
/* harmony default export */ var static_scale_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});