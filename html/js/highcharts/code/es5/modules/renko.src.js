/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/renko
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Renko series type for Highcharts Stock
 *
 * (c) 2010-2024 Pawel Lysy
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Series"]["types"]["column"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/renko", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","Series","types","column"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/renko"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Series"]["types"]["column"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["Series"]["types"]["column"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__448__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 448:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__448__;

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
  "default": function() { return /* binding */ renko_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/Renko/RenkoPoint.js
/* *
 *
 *  (c) 2010-2024 Pawel Lysy
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

var ColumnPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.column.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
var RenkoPoint = /** @class */ (function (_super) {
    __extends(RenkoPoint, _super);
    function RenkoPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenkoPoint.prototype.getClassName = function () {
        return (_super.prototype.getClassName.call(this) +
            (this.upTrend ? ' highcharts-point-up' : ' highcharts-point-down'));
    };
    return RenkoPoint;
}(ColumnPoint));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Renko_RenkoPoint = (RenkoPoint);

;// ./code/es5/es-modules/Series/Renko/RenkoSeriesDefaults.js
/* *
 *
 *  (c) 2010-2024 Pawel Lysy
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
 * A Renko series is a style of financial chart used to describe price
 * movements over time. It displays open, high, low and close values per
 * data point.
 *
 * @sample stock/demo/renko/
 *         Renko series
 *
 *
 * @sample stock/series-renko/renko-vs-heikinashi-vs-candlestick
 *         Renko series
 *
 * @extends      plotOptions.column
 * @excluding boost, boostBlending, boostThreshold, centerInCategory,
 * cumulative, cumulativeStart, dashStyle, dragDrop, dataSorting, edgeColor,
 * stacking, getExtremesFromAll, clip, colorByPoint, compare, compareBase,
 * compareStart, compareTo, dataGrouping, edgeWidth, lineColor, linkedTo,
 * pointPadding, pointPlacement, pointRange, pointStart, pointWidth
 * @product      highstock
 * @requires     modules/renko
 * @optionparent plotOptions.renko
 */
var RenkoDefaults = {
    /**
     * The size of the individual box, representing a point. Can be set in yAxis
     * value, or percent value of the first point e.g. if first point's value is
     * 200, and box size is set to `20%`, the box will be 40, so the new point
     * will be drawn when the next value changes for more than 40.
     */
    boxSize: 4,
    groupPadding: 0,
    pointPadding: 0,
    downColor: '#ff0000',
    navigatorOptions: {
        type: 'renko'
    },
    fillColor: 'transparent',
    borderWidth: 2,
    lineWidth: 0,
    stickyTracking: true,
    borderRadius: {
        where: 'all'
    },
    tooltip: {
        pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.low:.2f} - {point.y:.2f}</b><br/>'
    }
};
/* *
 *
 *  API Options
 *
 * */
/**
 * A `renko` series. If the [type](#series.renko.type)
 * option is not specified, it is inherited from [chart.type](
 * #chart.type).
 *
 * @type      {*}
 * @extends   series,plotOptions.renko
 * @product   highstock
 * @excluding boost, compare, compareStart, connectNulls, cumulative,
 * cumulativeStart, dataGrouping, dataParser, dataSorting, dataURL,
 * dragDrop, marker, step
 * @requires  modules/renko
 * @apioption series.renko
 */
/**
 * An array of data points for the series. For the `renko` series
 * type, points can be given in the following ways:
 *
 * 1. An array of arrays with 1 or 2 values correspond to `x,close`. If the
 * first value is a string, it is applied as the name of the point, and the
 * `x` value is inferred. The `x` value can also be omitted, in which case
 * the inner arrays should be of length 4. Then the `x` value is
 * automatically calculated, either starting at 0 and incremented by 1, or
 * from `pointStart` and `pointInterval` given in the series options.
 *    ```js
 *    data: [
 *        [0, 7],
 *        [1, 1],
 *        [2, 3]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. With renko series, the data
 * does not directly correspond to the points in the series. the reason
 * is that the points are calculated based on the trends and boxSize.
 * Setting options for individual point is impossible.
 *
 *    ```js
 *    data: [{
 *        x: 1,
 *        y: 6
 *    }, {
 *        x: 1,
 *        y: 7,
 *    }]
 *    ```
 *
 * @type      {Array<Array<number,number>|*>}
 * @extends series.column.data
 * @product highstock
 * @apioption series.renko.data
 */
(''); // Adds doclets above to transpiled
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var RenkoSeriesDefaults = (RenkoDefaults);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series","types","column"],"commonjs":["highcharts","Series","types","column"],"commonjs2":["highcharts","Series","types","column"],"root":["Highcharts","Series","types","column"]}
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_ = __webpack_require__(448);
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_);
;// ./code/es5/es-modules/Series/Renko/RenkoSeries.js
/* *
 *
 *  (c) 2010-2024 Pawel Lysy
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var RenkoSeries_extends = (undefined && undefined.__extends) || (function () {
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





var extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  Class
 *
 * */
/**
 * The renko series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.renko
 *
 * @augments Highcharts.seriesTypes.column
 */
var RenkoSeries = /** @class */ (function (_super) {
    RenkoSeries_extends(RenkoSeries, _super);
    function RenkoSeries() {
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.hasDerivedData = true;
        _this.allowDG = false;
        return _this;
        /* *
         *
         *  Functions
         *
         * */
    }
    RenkoSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        this.renkoData = [];
    };
    RenkoSeries.prototype.setData = function (data, redraw, animation) {
        this.renkoData = [];
        _super.prototype.setData.call(this, data, redraw, animation, false);
    };
    RenkoSeries.prototype.getXExtremes = function (xData) {
        this.processData();
        xData = this.getColumn('x', true);
        return {
            min: xData[0],
            max: xData[xData.length - 1]
        };
    };
    RenkoSeries.prototype.getProcessedData = function () {
        var modified = this.dataTable.modified;
        var processedXData = [];
        var processedYData = [];
        var processedLowData = [];
        var xData = this.getColumn('x',
            true);
        var yData = this.getColumn('y',
            true);
        if (!this.renkoData || this.renkoData.length > 0) {
            return {
                modified: modified,
                closestPointRange: 1,
                cropped: false,
                cropStart: 0
            };
        }
        var boxSize = this.options.boxSize;
        var change = isNumber(boxSize) ? boxSize : relativeLength(boxSize,
            yData[0]);
        var renkoData = [],
            length = xData.length;
        var prevTrend = 0;
        var prevPrice = yData[0];
        for (var i = 1; i < length; i++) {
            var currentChange = yData[i] - yData[i - 1];
            if (currentChange > change) {
                // Uptrend
                if (prevTrend === 2) {
                    prevPrice += change;
                }
                for (var j = 0; j < currentChange / change; j++) {
                    renkoData.push({
                        x: xData[i] + j,
                        low: prevPrice,
                        y: prevPrice + change,
                        color: this.options.color,
                        upTrend: true
                    });
                    prevPrice += change;
                }
                prevTrend = 1;
            }
            else if (Math.abs(currentChange) > change) {
                if (prevTrend === 1) {
                    prevPrice -= change;
                }
                // Downtrend
                for (var j = 0; j < Math.abs(currentChange) / change; j++) {
                    renkoData.push({
                        x: xData[i] + j,
                        low: prevPrice - change,
                        y: prevPrice,
                        color: this.options.downColor,
                        upTrend: false
                    });
                    prevPrice -= change;
                }
                prevTrend = 2;
            }
        }
        this.renkoData = renkoData;
        for (var _i = 0, renkoData_1 = renkoData; _i < renkoData_1.length; _i++) {
            var point = renkoData_1[_i];
            processedXData.push(point.x);
            processedYData.push(point.y);
            processedLowData.push(point.low);
        }
        this.processedData = renkoData;
        modified.setColumn('x', processedXData);
        modified.setColumn('y', processedYData);
        modified.setColumn('low', processedLowData);
        return {
            modified: modified,
            cropped: false,
            cropStart: 0,
            closestPointRange: 1
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    RenkoSeries.defaultOptions = merge((highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()).defaultOptions, RenkoSeriesDefaults);
    return RenkoSeries;
}((highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default())));
extend(RenkoSeries.prototype, {
    pointClass: Renko_RenkoPoint
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('renko', RenkoSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Renko_RenkoSeries = ((/* unused pure expression or super */ null && (RenkoSeries)));

;// ./code/es5/es-modules/masters/modules/renko.src.js




/* harmony default export */ var renko_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});