/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/dema
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Rafał Sebestjański
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/dema", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/dema"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ dema_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/DEMA/DEMAIndicator.js
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

var EMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.ema;

var correctFloat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).correctFloat, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The DEMA series Type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.dema
 *
 * @augments Highcharts.Series
 */
var DEMAIndicator = /** @class */ (function (_super) {
    __extends(DEMAIndicator, _super);
    function DEMAIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    DEMAIndicator.prototype.getEMA = function (yVal, prevEMA, SMA, index, i, xVal) {
        return _super.prototype.calculateEma.call(this, xVal || [], yVal, typeof i === 'undefined' ? 1 : i, this.EMApercent, prevEMA, typeof index === 'undefined' ? -1 : index, SMA);
    };
    DEMAIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            EMAvalues = [],
            doubledPeriod = 2 * period,
            xVal = series.xData,
            yVal = series.yData,
            yValLen = yVal ? yVal.length : 0,
            DEMA = [],
            xDataDema = [],
            yDataDema = [];
        var accumulatePeriodPoints = 0,
            EMA = 0, 
            // EMA(EMA)
            EMAlevel2, 
            // EMA of previous point
            prevEMA,
            prevEMAlevel2, 
            // EMA values array
            i,
            index = -1,
            DEMAPoint,
            SMA = 0;
        this.EMApercent = (2 / (period + 1));
        // Check period, if bigger than EMA points length, skip
        if (yValLen < 2 * period - 1) {
            return;
        }
        // Switch index for OHLC / Candlestick / Arearange
        if (isArray(yVal[0])) {
            index = params.index ? params.index : 0;
        }
        // Accumulate first N-points
        accumulatePeriodPoints =
            _super.prototype.accumulatePeriodPoints.call(this, period, index, yVal);
        // First point
        SMA = accumulatePeriodPoints / period;
        accumulatePeriodPoints = 0;
        // Calculate value one-by-one for each period in visible data
        for (i = period; i < yValLen + 2; i++) {
            if (i < yValLen + 1) {
                EMA = this.getEMA(yVal, prevEMA, SMA, index, i)[1];
                EMAvalues.push(EMA);
            }
            prevEMA = EMA;
            // Summing first period points for EMA(EMA)
            if (i < doubledPeriod) {
                accumulatePeriodPoints += EMA;
            }
            else {
                // Calculate DEMA
                // First DEMA point
                if (i === doubledPeriod) {
                    SMA = accumulatePeriodPoints / period;
                }
                EMA = EMAvalues[i - period - 1];
                EMAlevel2 = this.getEMA([EMA], prevEMAlevel2, SMA)[1];
                DEMAPoint = [
                    xVal[i - 2],
                    correctFloat(2 * EMA - EMAlevel2)
                ];
                DEMA.push(DEMAPoint);
                xDataDema.push(DEMAPoint[0]);
                yDataDema.push(DEMAPoint[1]);
                prevEMAlevel2 = EMAlevel2;
            }
        }
        return {
            values: DEMA,
            xData: xDataDema,
            yData: yDataDema
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Double exponential moving average (DEMA) indicator. This series requires
     * `linkedTo` option to be set and should be loaded after the
     * `stock/indicators/indicators.js`.
     *
     * @sample {highstock} stock/indicators/dema
     *         DEMA indicator
     *
     * @extends      plotOptions.ema
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, compare, compareBase, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/dema
     * @optionparent plotOptions.dema
     */
    DEMAIndicator.defaultOptions = merge(EMAIndicator.defaultOptions);
    return DEMAIndicator;
}(EMAIndicator));
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('dema', DEMAIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DEMA_DEMAIndicator = ((/* unused pure expression or super */ null && (DEMAIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `DEMA` series. If the [type](#series.dema.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.dema
 * @since     7.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis, compare, compareBase, dataParser, dataURL,
 *            joinBy, keys, navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/dema
 * @apioption series.dema
 */
''; // Adds doclet above to the transpiled file

;// ./code/es5/es-modules/masters/indicators/dema.src.js




/* harmony default export */ var dema_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});