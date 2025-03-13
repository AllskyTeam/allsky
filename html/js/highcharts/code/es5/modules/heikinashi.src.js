/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/heikinashi
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * HeikinAshi series type for Highcharts Stock
 *
 * (c) 2010-2024 Karol Kolodziej
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/heikinashi", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/heikinashi"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ heikinashi_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/HeikinAshi/HeikinAshiPoint.js
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

var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, CandlestickPoint = _a.candlestick.prototype.pointClass, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
HLCPoint = _a.hlc.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
var HeikinAshiPoint = /** @class */ (function (_super) {
    __extends(HeikinAshiPoint, _super);
    function HeikinAshiPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HeikinAshiPoint;
}(CandlestickPoint));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var HeikinAshi_HeikinAshiPoint = (HeikinAshiPoint);

;// ./code/es5/es-modules/Series/HeikinAshi/HeikinAshiSeriesDefaults.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  API Options
 *
 * */
/**
 * An HeikinAshi series is a style of financial chart used to describe price
 * movements over time. It displays open, high, low and close values per
 * data point.
 *
 * @sample stock/demo/heikinashi/
 *         Heikin Ashi series
 *
 * @extends      plotOptions.candlestick
 * @product      highstock
 * @requires     modules/heikinashi
 * @optionparent plotOptions.heikinashi
 */
var HeikinAshiDefaults = {
    dataGrouping: {
        groupAll: true
    }
};
/**
 * A `heikinashi` series. If the [type](#series.heikinashi.type)
 * option is not specified, it is inherited from [chart.type](
 * #chart.type).
 *
 * @type      {*}
 * @extends   series,plotOptions.heikinashi
 * @excluding dataParser, dataURL, marker
 * @product   highstock
 * @requires  modules/heikinashi
 * @apioption series.heikinashi
 */
/**
 * An array of data points for the series. For the `heikinashi` series
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
 *    [turboThreshold](#series.heikinashi.turboThreshold), this option is not
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
 * @apioption series.heikinashi.data
 */
''; // Adds doclets above to transpiled
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var HeikinAshiSeriesDefaults = (HeikinAshiDefaults);

;// ./code/es5/es-modules/Series/HeikinAshi/HeikinAshiSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var HeikinAshiSeries_extends = (undefined && undefined.__extends) || (function () {
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

var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;



var CandlestickSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.candlestick;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * After processing and grouping the data, calculate how the heikeinashi data
 * set should look like.
 * @private
 */
function onAxisPostProcessData() {
    var series = this.series;
    series.forEach(function (series) {
        if (series.is('heikinashi')) {
            var heikinashiSeries = series;
            heikinashiSeries.heikiashiData.length = 0;
            heikinashiSeries.getHeikinashiData();
        }
    });
}
/**
 * Assign heikinashi data into the points.
 * @private
 * @todo move to HeikinAshiPoint class
 */
function onHeikinAshiSeriesAfterTranslate() {
    var series = this,
        points = series.points,
        heikiashiData = series.heikiashiData,
        cropStart = series.cropStart || 0;
    // Modify points.
    for (var i = 0; i < points.length; i++) {
        var point = points[i],
            heikiashiDataPoint = heikiashiData[i + cropStart];
        point.open = heikiashiDataPoint[0];
        point.high = heikiashiDataPoint[1];
        point.low = heikiashiDataPoint[2];
        point.close = heikiashiDataPoint[3];
    }
}
/**
 * Force to recalculate the heikinashi data set after updating data.
 * @private
 */
function onHeikinAshiSeriesUpdatedData() {
    if (this.heikiashiData.length) {
        this.heikiashiData.length = 0;
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * The Heikin Ashi series.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.heikinashi
 *
 * @augments Highcharts.Series
 */
var HeikinAshiSeries = /** @class */ (function (_super) {
    HeikinAshiSeries_extends(HeikinAshiSeries, _super);
    function HeikinAshiSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.heikiashiData = [];
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    HeikinAshiSeries.compose = function (SeriesClass, AxisClass) {
        CandlestickSeries.compose(SeriesClass);
        if (pushUnique(composed, 'HeikinAshi')) {
            addEvent(AxisClass, 'postProcessData', onAxisPostProcessData);
            addEvent(HeikinAshiSeries, 'afterTranslate', onHeikinAshiSeriesAfterTranslate);
            addEvent(HeikinAshiSeries, 'updatedData', onHeikinAshiSeriesUpdatedData);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Calculate data set for the heikinashi series before creating the points.
     * @private
     */
    HeikinAshiSeries.prototype.getHeikinashiData = function () {
        var series = this,
            table = series.allGroupedTable || series.dataTable,
            dataLength = table.rowCount,
            heikiashiData = series.heikiashiData;
        if (!heikiashiData.length && dataLength) {
            // Modify the first point.
            this.modifyFirstPointValue(table.getRow(0, this.pointArrayMap));
            // Modify other points.
            for (var i = 1; i < dataLength; i++) {
                this.modifyDataPoint(table.getRow(i, this.pointArrayMap), heikiashiData[i - 1]);
            }
        }
        series.heikiashiData = heikiashiData;
    };
    /**
     * @private
     */
    HeikinAshiSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        this.heikiashiData = [];
    };
    /**
     * Calculate and modify the first data point value.
     * @private
     * @param {Array<(number)>} dataPoint
     *        Current data point.
     */
    HeikinAshiSeries.prototype.modifyFirstPointValue = function (dataPoint) {
        var open = (dataPoint[0] +
                dataPoint[1] +
                dataPoint[2] +
                dataPoint[3]) / 4, close = (dataPoint[0] + dataPoint[3]) / 2;
        this.heikiashiData.push([open, dataPoint[1], dataPoint[2], close]);
    };
    /**
     * Calculate and modify the data point's value.
     * @private
     * @param {Array<(number)>} dataPoint
     *        Current data point.
     * @param {Array<(number)>} previousDataPoint
     *        Previous data point.
     */
    HeikinAshiSeries.prototype.modifyDataPoint = function (dataPoint, previousDataPoint) {
        var newOpen = (previousDataPoint[0] + previousDataPoint[3]) / 2,
            newClose = (dataPoint[0] +
                dataPoint[1] +
                dataPoint[2] +
                dataPoint[3]) / 4,
            newHigh = Math.max(dataPoint[1],
            newClose,
            newOpen),
            newLow = Math.min(dataPoint[2],
            newClose,
            newOpen);
        // Add new points to the array in order to properly calculate extremes.
        this.heikiashiData.push([newOpen, newHigh, newLow, newClose]);
    };
    HeikinAshiSeries.defaultOptions = merge(CandlestickSeries.defaultOptions, HeikinAshiSeriesDefaults);
    return HeikinAshiSeries;
}(CandlestickSeries));
/* *
 *
 *  Class Prototype
 *
 * */
HeikinAshiSeries.prototype.pointClass = HeikinAshi_HeikinAshiPoint;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('heikinashi', HeikinAshiSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var HeikinAshi_HeikinAshiSeries = (HeikinAshiSeries);

;// ./code/es5/es-modules/masters/modules/heikinashi.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
HeikinAshi_HeikinAshiSeries.compose(G.Series, G.Axis);
/* harmony default export */ var heikinashi_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});