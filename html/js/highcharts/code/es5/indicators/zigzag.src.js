/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/zigzag
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Kacper Madej
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/zigzag", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/zigzag"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ zigzag_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/Zigzag/ZigzagIndicator.js
/* *
 *
 *  (c) 2010-2024 Kacper Madej
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

var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/* *
 *
 *  Class
 *
 * */
/**
 * The Zig Zag series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.zigzag
 *
 * @augments Highcharts.Series
 */
var ZigzagIndicator = /** @class */ (function (_super) {
    __extends(ZigzagIndicator, _super);
    function ZigzagIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    ZigzagIndicator.prototype.getValues = function (series, params) {
        var lowIndex = params.lowIndex,
            highIndex = params.highIndex,
            deviation = params.deviation / 100,
            deviations = {
                'low': 1 + deviation,
                'high': 1 - deviation
            },
            xVal = series.xData,
            yVal = series.yData,
            yValLen = yVal ? yVal.length : 0,
            zigzag = [],
            xData = [],
            yData = [];
        var i,
            j,
            zigzagPoint,
            directionUp,
            exitLoop = false,
            yIndex = false;
        // Exit if not enough points or no low or high values
        if (!xVal || xVal.length <= 1 ||
            (yValLen &&
                (typeof yVal[0][lowIndex] === 'undefined' ||
                    typeof yVal[0][highIndex] === 'undefined'))) {
            return;
        }
        // Set first zigzag point candidate
        var firstZigzagLow = yVal[0][lowIndex],
            firstZigzagHigh = yVal[0][highIndex];
        // Search for a second zigzag point candidate,
        // this will also set first zigzag point
        for (i = 1; i < yValLen; i++) {
            // Required change to go down
            if (yVal[i][lowIndex] <= firstZigzagHigh * deviations.high) {
                zigzag.push([xVal[0], firstZigzagHigh]);
                // Second zigzag point candidate
                zigzagPoint = [xVal[i], yVal[i][lowIndex]];
                // Next line will be going up
                directionUp = true;
                exitLoop = true;
                // Required change to go up
            }
            else if (yVal[i][highIndex] >= firstZigzagLow * deviations.low) {
                zigzag.push([xVal[0], firstZigzagLow]);
                // Second zigzag point candidate
                zigzagPoint = [xVal[i], yVal[i][highIndex]];
                // Next line will be going down
                directionUp = false;
                exitLoop = true;
            }
            if (exitLoop) {
                xData.push(zigzag[0][0]);
                yData.push(zigzag[0][1]);
                j = i++;
                i = yValLen;
            }
        }
        // Search for next zigzags
        for (i = j; i < yValLen; i++) {
            if (directionUp) { // Next line up
                // lower when going down -> change zigzag candidate
                if (yVal[i][lowIndex] <= zigzagPoint[1]) {
                    zigzagPoint = [xVal[i], yVal[i][lowIndex]];
                }
                // Required change to go down -> new zigzagpoint and
                // direction change
                if (yVal[i][highIndex] >=
                    zigzagPoint[1] * deviations.low) {
                    yIndex = highIndex;
                }
            }
            else { // Next line down
                // higher when going up -> change zigzag candidate
                if (yVal[i][highIndex] >= zigzagPoint[1]) {
                    zigzagPoint = [xVal[i], yVal[i][highIndex]];
                }
                // Required change to go down -> new zigzagpoint and
                // direction change
                if (yVal[i][lowIndex] <=
                    zigzagPoint[1] * deviations.high) {
                    yIndex = lowIndex;
                }
            }
            if (yIndex !== false) { // New zigzag point and direction change
                zigzag.push(zigzagPoint);
                xData.push(zigzagPoint[0]);
                yData.push(zigzagPoint[1]);
                zigzagPoint = [xVal[i], yVal[i][yIndex]];
                directionUp = !directionUp;
                yIndex = false;
            }
        }
        var zigzagLen = zigzag.length;
        // No zigzag for last point
        if (zigzagLen !== 0 &&
            zigzag[zigzagLen - 1][0] < xVal[yValLen - 1]) {
            // Set last point from zigzag candidate
            zigzag.push(zigzagPoint);
            xData.push(zigzagPoint[0]);
            yData.push(zigzagPoint[1]);
        }
        return {
            values: zigzag,
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
     * Zig Zag indicator.
     *
     * This series requires `linkedTo` option to be set.
     *
     * @sample stock/indicators/zigzag
     *         Zig Zag indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/zigzag
     * @optionparent plotOptions.zigzag
     */
    ZigzagIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index, period
         */
        params: {
            // Index and period are unchangeable, do not inherit (#15362)
            index: void 0,
            period: void 0,
            /**
             * The point index which indicator calculations will base - low
             * value.
             *
             * For example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             */
            lowIndex: 2,
            /**
             * The point index which indicator calculations will base - high
             * value.
             *
             * For example using OHLC data, index=1 means the indicator will be
             * calculated using High values.
             */
            highIndex: 1,
            /**
             * The threshold for the value change.
             *
             * For example deviation=1 means the indicator will ignore all price
             * movements less than 1%.
             */
            deviation: 1
        }
    });
    return ZigzagIndicator;
}(SMAIndicator));
extend(ZigzagIndicator.prototype, {
    nameComponents: ['deviation'],
    nameSuffixes: ['%'],
    nameBase: 'Zig Zag'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('zigzag', ZigzagIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Zigzag_ZigzagIndicator = ((/* unused pure expression or super */ null && (ZigzagIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `Zig Zag` series. If the [type](#series.zigzag.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.zigzag
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/zigzag
 * @apioption series.zigzag
 */
''; // Adds doclets above to transpiled file

;// ./code/es5/es-modules/masters/indicators/zigzag.src.js




/* harmony default export */ var zigzag_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});