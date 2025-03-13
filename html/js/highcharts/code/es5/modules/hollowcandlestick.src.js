/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/hollowcandlestick
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Hollow Candlestick series type for Highcharts Stock
 *
 * (c) 2010-2024 Karol Kolodziej
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Axis"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/hollowcandlestick", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","Axis"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/hollowcandlestick"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Axis"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["Axis"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__532__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 532:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__532__;

/***/ }),

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
  "default": function() { return /* binding */ hollowcandlestick_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/HollowCandlestick/HollowCandlestickPoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
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
/* *
 *
 *  Imports
 *
 * */

var CandlestickSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.candlestick;
/* *
 *
 *  Class
 *
 * */
var HollowCandlestickPoint = /** @class */ (function (_super) {
    __extends(HollowCandlestickPoint, _super);
    function HollowCandlestickPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Update class name if needed.
     * @private
     * @function Highcharts.seriesTypes.hollowcandlestick#getClassName
     */
    HollowCandlestickPoint.prototype.getClassName = function () {
        var className = _super.prototype.getClassName.apply(this);
        var point = this,
            index = point.index,
            currentPoint = point.series.hollowCandlestickData[index];
        if (!currentPoint.isBullish && currentPoint.trendDirection === 'up') {
            className += '-bearish-up';
        }
        return className;
    };
    return HollowCandlestickPoint;
}(CandlestickSeries.prototype.pointClass));
/* *
 *
 *  Class Namespace
 *
 * */
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var HollowCandlestick_HollowCandlestickPoint = (HollowCandlestickPoint);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Axis"],"commonjs":["highcharts","Axis"],"commonjs2":["highcharts","Axis"],"root":["Highcharts","Axis"]}
var highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_ = __webpack_require__(532);
var highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_default = /*#__PURE__*/__webpack_require__.n(highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_);
;// ./code/es5/es-modules/Series/HollowCandlestick/HollowCandlestickSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var HollowCandlestickSeries_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b,
        p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/* *
 *
 *  Imports
 *
 * */




var HollowCandlestickSeries_CandlestickSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.candlestick;
var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Code
 *
 * */
/**
 * The hollowcandlestick series.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.hollowcandlestick
 *
 * @augments Highcharts.seriesTypes.candlestick
 */
var HollowCandlestickSeries = /** @class */ (function (_super) {
    HollowCandlestickSeries_extends(HollowCandlestickSeries, _super);
    function HollowCandlestickSeries() {
        /* *
         *
         * Static properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.hollowCandlestickData = [];
        return _this;
        /* eslint-disable valid-jsdoc */
    }
    /* *
     *
     * Functions
     *
     * */
    /**
     * Iterate through all points and get their type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getPriceMovement
     *
     *
     */
    HollowCandlestickSeries.prototype.getPriceMovement = function () {
        var series = this,
            table = series.allGroupedTable || series.dataTable,
            dataLength = table.rowCount,
            hollowCandlestickData = this.hollowCandlestickData;
        hollowCandlestickData.length = 0;
        var previousDataArr;
        for (var i = 0; i < dataLength; i++) {
            var dataArr = table.getRow(i,
                this.pointArrayMap);
            hollowCandlestickData.push(series.isBullish(dataArr, 
            // Determine the first point is bullish based on
            // its open and close values.(#21683)
            i ? previousDataArr : dataArr));
            previousDataArr = dataArr;
        }
    };
    /**
     * Return line color based on candle type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getLineColor
     *
     * @param {string} trendDirection
     * Type of candle direction (bearish/bullish)(down/up).
     *
     * @return {ColorType}
     * Line color
     */
    HollowCandlestickSeries.prototype.getLineColor = function (trendDirection) {
        var series = this;
        // Return line color based on trend direction
        return trendDirection === 'up' ?
            series.options.upColor || "#06b535" /* Palette.positiveColor */ :
            series.options.color || "#f21313" /* Palette.negativeColor */;
    };
    /**
     * Return fill color based on candle type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getPointFill
     *
     * @param {HollowcandleInfo} hollowcandleInfo
     *        Information about the current candle.
     *
     * @return {ColorType}
     * Point fill color
     */
    HollowCandlestickSeries.prototype.getPointFill = function (hollowcandleInfo) {
        var series = this;
        // Return fill color only for bearish candles.
        if (hollowcandleInfo.isBullish) {
            return 'transparent';
        }
        return hollowcandleInfo.trendDirection === 'up' ?
            series.options.upColor || "#06b535" /* Palette.positiveColor */ :
            series.options.color || "#f21313" /* Palette.negativeColor */;
    };
    /**
     * @private
     * @function Highcharts.seriesTypes.hollowcandlestick#init
     */
    HollowCandlestickSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        this.hollowCandlestickData = [];
    };
    /**
     * Check if the candle is bearish or bullish. For bullish one, return true.
     * For bearish, return string depending on the previous point.
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#isBullish
     *
     * @param {Array<(number)>} dataPoint
     * Current point which we calculate.
     *
     * @param {Array<(number)>} previousDataPoint
     * Previous point.
     */
    HollowCandlestickSeries.prototype.isBullish = function (dataPoint, previousDataPoint) {
        return {
            // Compare points' open and close value.
            isBullish: (dataPoint[0] || 0) <= (dataPoint[3] || 0),
            // For bearish candles.
            trendDirection: (dataPoint[3] || 0) < ((previousDataPoint === null || previousDataPoint === void 0 ? void 0 : previousDataPoint[3]) || 0) ?
                'down' : 'up'
        };
    };
    /**
     * Add color and fill attribute for each point.
     *
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#pointAttribs
     *
     * @param {HollowCandlestickPoint} point
     * Point to which we are adding attributes.
     *
     * @param {StatesOptionsKey} state
     * Current point state.
     */
    HollowCandlestickSeries.prototype.pointAttribs = function (point, state) {
        var attribs = _super.prototype.pointAttribs.call(this,
            point,
            state);
        var stateOptions;
        var index = point.index,
            hollowcandleInfo = this.hollowCandlestickData[index];
        attribs.fill = this.getPointFill(hollowcandleInfo) || attribs.fill;
        attribs.stroke = this.getLineColor(hollowcandleInfo.trendDirection) ||
            attribs.stroke;
        // Select or hover states
        if (state) {
            stateOptions = this.options.states[state];
            attribs.fill = stateOptions.color || attribs.fill;
            attribs.stroke = stateOptions.lineColor || attribs.stroke;
            attribs['stroke-width'] =
                stateOptions.lineWidth || attribs['stroke-width'];
        }
        return attribs;
    };
    /**
     * A hollow candlestick chart is a style of financial chart used to
     * describe price movements over time.
     *
     * @sample stock/demo/hollow-candlestick/
     *         Hollow Candlestick chart
     *
     * @extends      plotOptions.candlestick
     * @product      highstock
     * @requires     modules/hollowcandlestick
     * @optionparent plotOptions.hollowcandlestick
     */
    HollowCandlestickSeries.defaultOptions = merge(HollowCandlestickSeries_CandlestickSeries.defaultOptions, {
        /**
         * The fill color of the candlestick when the current
         * close is lower than the previous one.
         *
         * @sample stock/plotoptions/hollow-candlestick-color/
         *     Custom colors
         * @sample {highstock} highcharts/css/hollow-candlestick/
         *         Colors in styled mode
         *
         * @type    {ColorType}
         * @product highstock
         */
        color: "#f21313" /* Palette.negativeColor */,
        dataGrouping: {
            groupAll: true,
            groupPixelWidth: 10
        },
        /**
         * The color of the line/border of the hollow candlestick when
         * the current close is lower than the previous one.
         *
         * @sample stock/plotoptions/hollow-candlestick-color/
         *     Custom colors
         * @sample {highstock} highcharts/css/hollow-candlestick/
         *         Colors in styled mode
         *
         * @type    {ColorType}
         * @product highstock
         */
        lineColor: "#f21313" /* Palette.negativeColor */,
        /**
         * The fill color of the candlestick when the current
         * close is higher than the previous one.
         *
         * @sample stock/plotoptions/hollow-candlestick-color/
         *     Custom colors
         * @sample {highstock} highcharts/css/hollow-candlestick/
         *         Colors in styled mode
         *
         * @type    {ColorType}
         * @product highstock
         */
        upColor: "#06b535" /* Palette.positiveColor */,
        /**
         * The color of the line/border of the hollow candlestick when
         * the current close is higher than the previous one.
         *
         * @sample stock/plotoptions/hollow-candlestick-color/
         *     Custom colors
         * @sample {highstock} highcharts/css/hollow-candlestick/
         *         Colors in styled mode
         *
         * @type    {ColorType}
         * @product highstock
         */
        upLineColor: "#06b535" /* Palette.positiveColor */
    });
    return HollowCandlestickSeries;
}(HollowCandlestickSeries_CandlestickSeries));
// Force to recalculate the hollowcandlestick data set after updating data.
addEvent(HollowCandlestickSeries, 'updatedData', function () {
    if (this.hollowCandlestickData.length) {
        this.hollowCandlestickData.length = 0;
    }
});
// After processing and grouping the data,
// check if the candle is bearish or bullish.
// Required for further calculation.
addEvent((highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_default()), 'postProcessData', function () {
    var axis = this,
        series = axis.series;
    series.forEach(function (series) {
        if (series.is('hollowcandlestick')) {
            var hollowcandlestickSeries = series;
            hollowcandlestickSeries.getPriceMovement();
        }
    });
});
/* *
 *
 *  Class Prototype
 *
 * */
HollowCandlestickSeries.prototype.pointClass = HollowCandlestick_HollowCandlestickPoint;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('hollowcandlestick', HollowCandlestickSeries);
/* *
 *
 * Default Export
 *
 * */
/* harmony default export */ var HollowCandlestick_HollowCandlestickSeries = ((/* unused pure expression or super */ null && (HollowCandlestickSeries)));
/* *
 *
 * API Options
 *
 * */
/**
 * A `hollowcandlestick` series. If the [type](#series.candlestick.type)
 * option is not specified, it is inherited from [chart.type](
 * #chart.type).
 *
 * @type      {*}
 * @extends   series,plotOptions.hollowcandlestick
 * @excluding dataParser, dataURL, marker
 * @product   highstock
 * @apioption series.hollowcandlestick
 */
/**
 * An array of data points for the series. For the `hollowcandlestick` series
 * type, points can be given in the following ways:
 *
 * 1. An array of arrays with 5 or 4 values. In this case, the values correspond
 *    to `x,open,high,low,close`. If the first value is a string, it is applied
 *    as the name of the point, and the `x` value is inferred. The `x` value can
 *    also be omitted, in which case the inner arrays should be of length 4.
 *    Then the `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *    data: [
 *        [0, 7, 2, 0, 4],
 *        [1, 1, 4, 2, 8],
 *        [2, 3, 3, 9, 3]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.hollowcandlestick.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 1,
 *        open: 9,
 *        high: 2,
 *        low: 4,
 *        close: 6,
 *        name: "Point2",
 *        color: "#00FF00"
 *    }, {
 *        x: 1,
 *        open: 1,
 *        high: 4,
 *        low: 7,
 *        close: 7,
 *        name: "Point1",
 *        color: "#FF00FF"
 *    }]
 *    ```
 *
 * @type      {Array<Array<(number|string),number,number,number>|Array<(number|string),number,number,number,number>|*>}
 * @extends   series.candlestick.data
 * @excluding y
 * @product   highstock
 * @apioption series.hollowcandlestick.data
 */
''; // Adds doclets above to transpiled

;// ./code/es5/es-modules/masters/modules/hollowcandlestick.src.js




/* harmony default export */ var hollowcandlestick_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});