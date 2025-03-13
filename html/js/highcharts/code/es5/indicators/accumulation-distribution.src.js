/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/accumulation-distribution
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Sebastian Bochan
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/accumulation-distribution", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/accumulation-distribution"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ accumulation_distribution_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/AD/ADIndicator.js
/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
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

var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The AD series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.ad
 *
 * @augments Highcharts.Series
 */
var ADIndicator = /** @class */ (function (_super) {
    __extends(ADIndicator, _super);
    function ADIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    ADIndicator.populateAverage = function (xVal, yVal, yValVolume, i, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _period) {
        var high = yVal[i][1],
            low = yVal[i][2],
            close = yVal[i][3],
            volume = yValVolume[i],
            adY = close === high && close === low || high === low ?
                0 :
                ((2 * close - low - high) / (high - low)) * volume,
            adX = xVal[i];
        return [adX, adY];
    };
    /* *
     *
     *  Functions
     *
     * */
    ADIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            xVal = series.xData,
            yVal = series.yData,
            volumeSeriesID = params.volumeSeriesID,
            volumeSeries = series.chart.get(volumeSeriesID),
            yValVolume = volumeSeries === null || volumeSeries === void 0 ? void 0 : volumeSeries.getColumn('y'),
            yValLen = yVal ? yVal.length : 0,
            AD = [],
            xData = [],
            yData = [];
        var len,
            i,
            ADPoint;
        if (xVal.length <= period &&
            yValLen &&
            yVal[0].length !== 4) {
            return;
        }
        if (!volumeSeries) {
            error('Series ' +
                volumeSeriesID +
                ' not found! Check `volumeSeriesID`.', true, series.chart);
            return;
        }
        // When i = period <-- skip first N-points
        // Calculate value one-by-one for each period in visible data
        for (i = period; i < yValLen; i++) {
            len = AD.length;
            ADPoint = ADIndicator.populateAverage(xVal, yVal, yValVolume, i, period);
            if (len > 0) {
                ADPoint[1] += AD[len - 1][1];
            }
            AD.push(ADPoint);
            xData.push(ADPoint[0]);
            yData.push(ADPoint[1]);
        }
        return {
            values: AD,
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
     * Accumulation Distribution (AD). This series requires `linkedTo` option to
     * be set.
     *
     * @sample stock/indicators/accumulation-distribution
     *         Accumulation/Distribution indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/accumulation-distribution
     * @optionparent plotOptions.ad
     */
    ADIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index
         */
        params: {
            index: void 0, // Unused index, do not inherit (#15362)
            /**
             * The id of volume series which is mandatory.
             * For example using OHLC data, volumeSeriesID='volume' means
             * the indicator will be calculated using OHLC and volume values.
             *
             * @since 6.0.0
             */
            volumeSeriesID: 'volume'
        }
    });
    return ADIndicator;
}(SMAIndicator));
extend(ADIndicator.prototype, {
    nameComponents: false,
    nameBase: 'Accumulation/Distribution'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('ad', ADIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var AD_ADIndicator = ((/* unused pure expression or super */ null && (ADIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `AD` series. If the [type](#series.ad.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.ad
 * @since     6.0.0
 * @excluding dataParser, dataURL
 * @product   highstock
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/accumulation-distribution
 * @apioption series.ad
 */
''; // Add doclet above to transpiled file

;// ./code/es5/es-modules/masters/indicators/accumulation-distribution.src.js




/* harmony default export */ var accumulation_distribution_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});