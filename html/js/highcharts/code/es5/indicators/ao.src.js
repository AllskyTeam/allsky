/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/ao
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Wojciech Chmiel
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/ao", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/ao"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

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
  "default": function() { return /* binding */ ao_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/AO/AOIndicator.js
/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;

var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, columnProto = _a.column.prototype, SMAIndicator = _a.sma;

var extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, correctFloat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).correctFloat, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray;
/* *
 *
 *  Class
 *
 * */
/**
 * The AO series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.ao
 *
 * @augments Highcharts.Series
 */
var AOIndicator = /** @class */ (function (_super) {
    __extends(AOIndicator, _super);
    function AOIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    AOIndicator.prototype.drawGraph = function () {
        var indicator = this,
            options = indicator.options,
            points = indicator.points,
            userColor = indicator.userOptions.color,
            positiveColor = options.greaterBarColor,
            negativeColor = options.lowerBarColor,
            firstPoint = points[0];
        var i;
        if (!userColor && firstPoint) {
            firstPoint.color = positiveColor;
            for (i = 1; i < points.length; i++) {
                if (points[i].y > points[i - 1].y) {
                    points[i].color = positiveColor;
                }
                else if (points[i].y < points[i - 1].y) {
                    points[i].color = negativeColor;
                }
                else {
                    points[i].color = points[i - 1].color;
                }
            }
        }
    };
    AOIndicator.prototype.getValues = function (series) {
        var shortPeriod = 5,
            longPeriod = 34,
            xVal = series.xData || [],
            yVal = series.yData || [],
            yValLen = yVal.length,
            AO = [], // 0- date, 1- Awesome Oscillator
            xData = [],
            yData = [],
            high = 1,
            low = 2;
        var shortSMA, // Shorter Period SMA
            longSMA, // Longer Period SMA
            awesome,
            shortLastIndex,
            longLastIndex,
            price,
            i,
            j,
            longSum = 0,
            shortSum = 0;
        if (xVal.length <= longPeriod ||
            !isArray(yVal[0]) ||
            yVal[0].length !== 4) {
            return;
        }
        for (i = 0; i < longPeriod - 1; i++) {
            price = (yVal[i][high] + yVal[i][low]) / 2;
            if (i >= longPeriod - shortPeriod) {
                shortSum = correctFloat(shortSum + price);
            }
            longSum = correctFloat(longSum + price);
        }
        for (j = longPeriod - 1; j < yValLen; j++) {
            price = (yVal[j][high] + yVal[j][low]) / 2;
            shortSum = correctFloat(shortSum + price);
            longSum = correctFloat(longSum + price);
            shortSMA = shortSum / shortPeriod;
            longSMA = longSum / longPeriod;
            awesome = correctFloat(shortSMA - longSMA);
            AO.push([xVal[j], awesome]);
            xData.push(xVal[j]);
            yData.push(awesome);
            shortLastIndex = j + 1 - shortPeriod;
            longLastIndex = j + 1 - longPeriod;
            shortSum = correctFloat(shortSum -
                (yVal[shortLastIndex][high] +
                    yVal[shortLastIndex][low]) / 2);
            longSum = correctFloat(longSum -
                (yVal[longLastIndex][high] +
                    yVal[longLastIndex][low]) / 2);
        }
        return {
            values: AO,
            xData: xData,
            yData: yData
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Awesome Oscillator. This series requires the `linkedTo` option to
     * be set and should be loaded after the `stock/indicators/indicators.js`
     *
     * @sample {highstock} stock/indicators/ao
     *         Awesome
     *
     * @extends      plotOptions.sma
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, joinBy, keys, navigatorOptions,
     *               params, pointInterval, pointIntervalUnit, pointPlacement,
     *               pointRange, pointStart, showInNavigator, stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/ao
     * @optionparent plotOptions.ao
     */
    AOIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        params: {
            // Index and period are unchangeable, do not inherit (#15362)
            index: void 0,
            period: void 0
        },
        /**
         * Color of the Awesome oscillator series bar that is greater than the
         * previous one. Note that if a `color` is defined, the `color`
         * takes precedence and the `greaterBarColor` is ignored.
         *
         * @sample {highstock} stock/indicators/ao/
         *         greaterBarColor
         *
         * @type  {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since 7.0.0
         */
        greaterBarColor: "#06b535" /* Palette.positiveColor */,
        /**
         * Color of the Awesome oscillator series bar that is lower than the
         * previous one. Note that if a `color` is defined, the `color`
         * takes precedence and the `lowerBarColor` is ignored.
         *
         * @sample {highstock} stock/indicators/ao/
         *         lowerBarColor
         *
         * @type  {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since 7.0.0
         */
        lowerBarColor: "#f21313" /* Palette.negativeColor */,
        threshold: 0,
        groupPadding: 0.2,
        pointPadding: 0.2,
        crisp: false,
        states: {
            hover: {
                halo: {
                    size: 0
                }
            }
        }
    });
    return AOIndicator;
}(SMAIndicator));
extend(AOIndicator.prototype, {
    nameBase: 'AO',
    nameComponents: void 0,
    // Columns support:
    markerAttribs: noop,
    getColumnMetrics: columnProto.getColumnMetrics,
    crispCol: columnProto.crispCol,
    translate: columnProto.translate,
    drawPoints: columnProto.drawPoints
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('ao', AOIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var AO_AOIndicator = ((/* unused pure expression or super */ null && (AOIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * An `AO` series. If the [type](#series.ao.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.ao
 * @since     7.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis, dataParser, dataURL, joinBy, keys,
 *            navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/ao
 * @apioption series.ao
 */
''; // For including the above in the doclets

;// ./code/es5/es-modules/masters/indicators/ao.src.js




/* harmony default export */ var ao_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});