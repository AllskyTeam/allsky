/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/windbarb
 * @requires highcharts
 *
 * Wind barb series module
 *
 * (c) 2010-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["dataGrouping"]["approximations"], require("highcharts")["Series"]["types"]["column"], require("highcharts")["Series"], require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/windbarb", [["highcharts/highcharts"], ["highcharts/highcharts","dataGrouping","approximations"], ["highcharts/highcharts","Series","types","column"], ["highcharts/highcharts","Series"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/windbarb"] = factory(require("highcharts"), require("highcharts")["dataGrouping"]["approximations"], require("highcharts")["Series"]["types"]["column"], require("highcharts")["Series"], require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["dataGrouping"]["approximations"], root["Highcharts"]["Series"]["types"]["column"], root["Highcharts"]["Series"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__956__, __WEBPACK_EXTERNAL_MODULE__448__, __WEBPACK_EXTERNAL_MODULE__820__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 448:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__448__;

/***/ }),

/***/ 820:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__820__;

/***/ }),

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 956:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__956__;

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
  "default": function() { return /* binding */ windbarb_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","dataGrouping","approximations"],"commonjs":["highcharts","dataGrouping","approximations"],"commonjs2":["highcharts","dataGrouping","approximations"],"root":["Highcharts","dataGrouping","approximations"]}
var highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_ = __webpack_require__(956);
var highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default = /*#__PURE__*/__webpack_require__.n(highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series","types","column"],"commonjs":["highcharts","Series","types","column"],"commonjs2":["highcharts","Series","types","column"],"root":["Highcharts","Series","types","column"]}
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_ = __webpack_require__(448);
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series"],"commonjs":["highcharts","Series"],"commonjs2":["highcharts","Series"],"root":["Highcharts","Series"]}
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_ = __webpack_require__(820);
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_);
;// ./code/es5/es-modules/Series/OnSeriesComposition.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */



var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;
var columnProto = (highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()).prototype;

var seriesProto = (highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default()).prototype;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique, stableSort = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).stableSort;
/* *
 *
 *  Composition
 *
 * */
var OnSeriesComposition;
(function (OnSeriesComposition) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(SeriesClass) {
        if (pushUnique(composed, 'OnSeries')) {
            var seriesProto_1 = SeriesClass.prototype;
            seriesProto_1.getPlotBox = getPlotBox;
            seriesProto_1.translate = translate;
        }
        return SeriesClass;
    }
    OnSeriesComposition.compose = compose;
    /**
     * Override getPlotBox. If the onSeries option is valid, return the plot box
     * of the onSeries, otherwise proceed as usual.
     *
     * @private
     */
    function getPlotBox(name) {
        return seriesProto.getPlotBox.call((this.options.onSeries &&
            this.chart.get(this.options.onSeries)) || this, name);
    }
    OnSeriesComposition.getPlotBox = getPlotBox;
    /**
     * Extend the translate method by placing the point on the related series
     *
     * @private
     */
    function translate() {
        var _a,
            _b;
        columnProto.translate.apply(this);
        var series = this,
            options = series.options,
            chart = series.chart,
            points = series.points,
            optionsOnSeries = options.onSeries,
            onSeries = (optionsOnSeries &&
                chart.get(optionsOnSeries)),
            step = onSeries && onSeries.options.step,
            onData = (onSeries && onSeries.points),
            inverted = chart.inverted,
            xAxis = series.xAxis,
            yAxis = series.yAxis;
        var cursor = points.length - 1,
            point,
            lastPoint,
            onKey = options.onKey || 'y',
            i = onData && onData.length,
            xOffset = 0,
            leftPoint,
            lastX,
            rightPoint,
            currentDataGrouping,
            distanceRatio;
        // Relate to a master series
        if (onSeries && onSeries.visible && i) {
            xOffset = (onSeries.pointXOffset || 0) + (onSeries.barW || 0) / 2;
            currentDataGrouping = onSeries.currentDataGrouping;
            lastX = (onData[i - 1].x +
                (currentDataGrouping ? currentDataGrouping.totalRange : 0)); // #2374
            // sort the data points
            stableSort(points, function (a, b) { return (a.x - b.x); });
            onKey = 'plot' + onKey[0].toUpperCase() + onKey.substr(1);
            var _loop_1 = function () {
                    leftPoint = onData[i];
                point = points[cursor];
                point.y = leftPoint.y;
                if (leftPoint.x <= point.x &&
                    typeof leftPoint[onKey] !== 'undefined') {
                    if (point.x <= lastX) { // #803
                        point.plotY = leftPoint[onKey];
                        // Interpolate between points, #666
                        if (leftPoint.x < point.x &&
                            !step) {
                            rightPoint = onData[i + 1];
                            if (rightPoint &&
                                typeof rightPoint[onKey] !== 'undefined') {
                                // If the series is spline, calculate Y of the
                                // point on the bezier line. #19264
                                if (defined(point.plotX) &&
                                    onSeries.is('spline')) {
                                    leftPoint = leftPoint;
                                    rightPoint = rightPoint;
                                    var p0_1 = [
                                            leftPoint.plotX || 0,
                                            leftPoint.plotY || 0
                                        ],
                                        p3_1 = [
                                            rightPoint.plotX || 0,
                                            rightPoint.plotY || 0
                                        ],
                                        p1_1 = (((_a = leftPoint.controlPoints) === null || _a === void 0 ? void 0 : _a.high) ||
                                            p0_1),
                                        p2_1 = (((_b = rightPoint.controlPoints) === null || _b === void 0 ? void 0 : _b.low) ||
                                            p3_1),
                                        pixelThreshold = 0.25,
                                        maxIterations = 100,
                                        calculateCoord = function (t,
                                        key) { return (
                                        // The parametric formula for the
                                        // cubic Bezier curve.
                                        Math.pow(1 - t, 3) * p0_1[key] +
                                            3 * (1 - t) * (1 - t) * t *
                                                p1_1[key] + 3 * (1 - t) * t * t *
                                            p2_1[key] + t * t * t * p3_1[key]); };
                                    var tMin = 0,
                                        tMax = 1,
                                        t = void 0;
                                    // Find `t` of the parametric function of
                                    // the bezier curve for the given `plotX`.
                                    for (var i_1 = 0; i_1 < maxIterations; i_1++) {
                                        var tMid = (tMin + tMax) / 2;
                                        var xMid = calculateCoord(tMid, 0);
                                        if (xMid === null) {
                                            break;
                                        }
                                        if (Math.abs(xMid - point.plotX) < pixelThreshold) {
                                            t = tMid;
                                            break;
                                        }
                                        if (xMid < point.plotX) {
                                            tMin = tMid;
                                        }
                                        else {
                                            tMax = tMid;
                                        }
                                    }
                                    if (defined(t)) {
                                        point.plotY =
                                            calculateCoord(t, 1);
                                        point.y =
                                            yAxis.toValue(point.plotY, true);
                                    }
                                }
                                else {
                                    // The distance ratio, between 0 and 1
                                    distanceRatio =
                                        (point.x - leftPoint.x) /
                                            (rightPoint.x - leftPoint.x);
                                    point.plotY +=
                                        distanceRatio *
                                            // The plotY distance
                                            (rightPoint[onKey] - leftPoint[onKey]);
                                    point.y +=
                                        distanceRatio *
                                            (rightPoint.y - leftPoint.y);
                                }
                            }
                        }
                    }
                    cursor--;
                    i++; // Check again for points in the same x position
                    if (cursor < 0) {
                        return "break";
                    }
                }
            };
            while (i-- && points[cursor]) {
                var state_1 = _loop_1();
                if (state_1 === "break")
                    break;
            }
        }
        // Add plotY position and handle stacking
        points.forEach(function (point, i) {
            var stackIndex;
            point.plotX += xOffset; // #2049
            // Undefined plotY means the point is either on axis, outside series
            // range or hidden series. If the series is outside the range of the
            // x axis it should fall through with an undefined plotY, but then
            // we must remove the shapeArgs (#847). For inverted charts, we need
            // to calculate position anyway, because series.invertGroups is not
            // defined
            if (typeof point.plotY === 'undefined' || inverted) {
                if (point.plotX >= 0 &&
                    point.plotX <= xAxis.len) {
                    // We're inside xAxis range
                    if (inverted) {
                        point.plotY = xAxis.translate(point.x, 0, 1, 0, 1);
                        point.plotX = defined(point.y) ?
                            yAxis.translate(point.y, 0, 0, 0, 1) :
                            0;
                    }
                    else {
                        point.plotY = (xAxis.opposite ? 0 : series.yAxis.len) +
                            xAxis.offset; // For the windbarb demo
                    }
                }
                else {
                    point.shapeArgs = {}; // 847
                }
            }
            // If multiple flags appear at the same x, order them into a stack
            lastPoint = points[i - 1];
            if (lastPoint && lastPoint.plotX === point.plotX) {
                if (typeof lastPoint.stackIndex === 'undefined') {
                    lastPoint.stackIndex = 0;
                }
                stackIndex = lastPoint.stackIndex + 1;
            }
            point.stackIndex = stackIndex; // #3639
        });
        this.onSeries = onSeries;
    }
    OnSeriesComposition.translate = translate;
})(OnSeriesComposition || (OnSeriesComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Series_OnSeriesComposition = (OnSeriesComposition);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/Windbarb/WindbarbPoint.js
/* *
 *
 *  Wind barb series module
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


var isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  Class
 *
 * */
var WindbarbPoint = /** @class */ (function (_super) {
    __extends(WindbarbPoint, _super);
    function WindbarbPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    WindbarbPoint.prototype.isValid = function () {
        return isNumber(this.value) && this.value >= 0;
    };
    return WindbarbPoint;
}((highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()).prototype.pointClass));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Windbarb_WindbarbPoint = (WindbarbPoint);

;// ./code/es5/es-modules/Series/Windbarb/WindbarbSeriesDefaults.js
/* *
 *
 *  Wind barb series module
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
 * Wind barbs are a convenient way to represent wind speed and direction in
 * one graphical form. Wind direction is given by the stem direction, and
 * wind speed by the number and shape of barbs.
 *
 * @sample {highcharts|highstock} highcharts/demo/windbarb-series/
 *         Wind barb series
 *
 * @extends      plotOptions.column
 * @excluding    boostThreshold, marker, connectEnds, connectNulls,
 *               cropThreshold, dashStyle, dragDrop, gapSize, gapUnit,
 *               linecap, shadow, stacking, step, boostBlending
 * @since        6.0.0
 * @product      highcharts highstock
 * @requires     modules/windbarb
 * @optionparent plotOptions.windbarb
 */
var WindbarbSeriesDefaults = {
    /**
     * Data grouping options for the wind barbs. In Highcharts, this
     * requires the `modules/datagrouping.js` module to be loaded. In
     * Highcharts Stock, data grouping is included.
     *
     * @sample  highcharts/plotoptions/windbarb-datagrouping
     *          Wind barb with data grouping
     *
     * @since   7.1.0
     * @product highcharts highstock
     */
    dataGrouping: {
        /**
         * Whether to enable data grouping.
         *
         * @product highcharts highstock
         */
        enabled: true,
        /**
         * Approximation function for the data grouping. The default
         * returns an average of wind speed and a vector average direction
         * weighted by wind speed.
         *
         * @product highcharts highstock
         *
         * @type {string|Function}
         */
        approximation: 'windbarb',
        /**
         * The approximate data group width.
         *
         * @product highcharts highstock
         */
        groupPixelWidth: 30
    },
    /**
     * The line width of the wind barb symbols.
     */
    lineWidth: 2,
    /**
     * The id of another series in the chart that the wind barbs are
     * projected on. When `null`, the wind symbols are drawn on the X axis,
     * but offset up or down by the `yOffset` setting.
     *
     * @sample {highcharts|highstock} highcharts/plotoptions/windbarb-onseries
     *         Projected on area series
     *
     * @type {string|null}
     */
    onSeries: null,
    states: {
        hover: {
            lineWidthPlus: 0
        }
    },
    tooltip: {
        /**
         * The default point format for the wind barb tooltip. Note the
         * `point.beaufort` property that refers to the Beaufort wind scale.
         * The names can be internationalized by modifying
         * `Highcharts.seriesTypes.windbarb.prototype.beaufortNames`.
         */
        pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.value}</b> ({point.beaufort})<br/>'
    },
    /**
     * Pixel length of the stems.
     */
    vectorLength: 20,
    /**
     * @default   value
     */
    colorKey: 'value',
    /**
     * Vertical offset from the cartesian position, in pixels. The default
     * value makes sure the symbols don't overlap the X axis when `onSeries`
     * is `null`, and that they don't overlap the linked series when
     * `onSeries` is given.
     */
    yOffset: -20,
    /**
     * Horizontal offset from the cartesian position, in pixels. When the
     * chart is inverted, this option allows translation like
     * [yOffset](#plotOptions.windbarb.yOffset) in non inverted charts.
     *
     * @since 6.1.0
     */
    xOffset: 0
};
/**
 * A `windbarb` series. If the [type](#series.windbarb.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.windbarb
 * @excluding dataParser, dataURL, boostThreshold, boostBlending
 * @product   highcharts highstock
 * @requires  modules/windbarb
 * @apioption series.windbarb
 */
/**
 * An array of data points for the series. For the `windbarb` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 3 values. In this case, the values correspond to
 *    `x,value,direction`. If the first value is a string, it is applied as the
 *    name of the point, and the `x` value is inferred.
 *    ```js
 *       data: [
 *           [Date.UTC(2017, 0, 1, 0), 3.3, 90],
 *           [Date.UTC(2017, 0, 1, 1), 12.1, 180],
 *           [Date.UTC(2017, 0, 1, 2), 11.1, 270]
 *       ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.area.turboThreshold), this option is not
 *    available.
 *    ```js
 *       data: [{
 *           x: Date.UTC(2017, 0, 1, 0),
 *           value: 12.1,
 *           direction: 90
 *       }, {
 *           x: Date.UTC(2017, 0, 1, 1),
 *           value: 11.1,
 *           direction: 270
 *       }]
 *    ```
 *
 * @sample {highcharts} highcharts/chart/reflow-true/
 *         Numerical values
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<Array<(number|string),number,number>|*>}
 * @extends   series.line.data
 * @product   highcharts highstock
 * @apioption series.windbarb.data
 */
/**
 * The wind speed in meters per second.
 *
 * @type      {number|null}
 * @product   highcharts highstock
 * @apioption series.windbarb.data.value
 */
/**
 * The wind direction in degrees, where 0 is north (pointing towards south).
 *
 * @type      {number}
 * @product   highcharts highstock
 * @apioption series.windbarb.data.direction
 */
''; // Adds doclets above to transpiled file
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Windbarb_WindbarbSeriesDefaults = (WindbarbSeriesDefaults);

;// ./code/es5/es-modules/Series/Windbarb/WindbarbSeries.js
/* *
 *
 *  Wind barb series module
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var WindbarbSeries_extends = (undefined && undefined.__extends) || (function () {
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

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject;




var ColumnSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.column;

var extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;


/* *
 *
 *  Functions
 *
 * */
/**
 * Once off, register the windbarb approximation for data grouping. This can
 * be called anywhere (not necessarily in the translate function), but must
 * happen after the data grouping module is loaded and before the
 * wind barb series uses it.
 * @private
 */
function registerApproximation() {
    if (!(highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default()).windbarb) {
        (highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default()).windbarb = function (values, directions) {
            var vectorX = 0,
                vectorY = 0;
            for (var i = 0, iEnd = values.length; i < iEnd; i++) {
                vectorX += values[i] * Math.cos(directions[i] * (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad);
                vectorY += values[i] * Math.sin(directions[i] * (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad);
            }
            return [
                // Wind speed
                values.reduce(function (sum, value) { return (sum + value); }, 0) / values.length,
                // Wind direction
                Math.atan2(vectorY, vectorX) / (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad
            ];
        };
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.windbarb
 *
 * @augments Highcharts.Series
 */
var WindbarbSeries = /** @class */ (function (_super) {
    WindbarbSeries_extends(WindbarbSeries, _super);
    function WindbarbSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    WindbarbSeries.prototype.init = function (chart, options) {
        _super.prototype.init.call(this, chart, options);
    };
    // Get presentational attributes.
    WindbarbSeries.prototype.pointAttribs = function (point, state) {
        var options = this.options;
        var stroke = point.color || this.color,
            strokeWidth = this.options.lineWidth;
        if (state) {
            stroke = options.states[state].color || stroke;
            strokeWidth =
                (options.states[state].lineWidth || strokeWidth) +
                    (options.states[state].lineWidthPlus || 0);
        }
        return {
            'stroke': stroke,
            'stroke-width': strokeWidth
        };
    };
    // Create a single wind arrow. It is later rotated around the zero
    // centerpoint.
    WindbarbSeries.prototype.windArrow = function (point) {
        var level = point.beaufortLevel,
            u = this.options.vectorLength / 20;
        var knots = point.value * 1.943844,
            barbs,
            pos = -10;
        if (point.isNull) {
            return [];
        }
        if (level === 0) {
            return this.chart.renderer.symbols.circle(-10 * u, -10 * u, 20 * u, 20 * u);
        }
        // The stem and the arrow head
        var path = [
                ['M', 0, 7 * u], // Base of arrow
                ['L', -1.5 * u, 7 * u],
                ['L', 0, 10 * u],
                ['L', 1.5 * u, 7 * u],
                ['L', 0, 7 * u],
                ['L', 0, -10 * u] // Top
            ];
        // For each full 50 knots, add a pennant
        barbs = (knots - knots % 50) / 50; // Pennants
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 5 * u, pos * u + 2], ['L', 0, pos * u + 4]);
                // Substract from the rest and move position for next
                knots -= 50;
                pos += 7;
            }
        }
        // For each full 10 knots, add a full barb
        barbs = (knots - knots % 10) / 10;
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 7 * u, pos * u]);
                knots -= 10;
                pos += 3;
            }
        }
        // For each full 5 knots, add a half barb
        barbs = (knots - knots % 5) / 5; // Half barbs
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 4 * u, pos * u]);
                knots -= 5;
                pos += 3;
            }
        }
        return path;
    };
    WindbarbSeries.prototype.drawPoints = function () {
        var chart = this.chart,
            yAxis = this.yAxis,
            inverted = chart.inverted,
            shapeOffset = this.options.vectorLength / 2;
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var plotX = point.plotX,
                plotY = point.plotY;
            // Check if it's inside the plot area, but only for the X
            // dimension.
            if (this.options.clip === false ||
                chart.isInsidePlot(plotX, 0)) {
                // Create the graphic the first time
                if (!point.graphic) {
                    point.graphic = this.chart.renderer
                        .path()
                        .add(this.markerGroup)
                        .addClass('highcharts-point ' +
                        'highcharts-color-' +
                        pick(point.colorIndex, point.series.colorIndex));
                }
                // Position the graphic
                point.graphic
                    .attr({
                    d: this.windArrow(point),
                    translateX: plotX + this.options.xOffset,
                    translateY: plotY + this.options.yOffset,
                    rotation: point.direction
                });
                if (!this.chart.styledMode) {
                    point.graphic
                        .attr(this.pointAttribs(point));
                }
            }
            else if (point.graphic) {
                point.graphic = point.graphic.destroy();
            }
            // Set the tooltip anchor position
            point.tooltipPos = [
                plotX + this.options.xOffset +
                    (inverted && !this.onSeries ? shapeOffset : 0),
                plotY + this.options.yOffset -
                    (inverted ?
                        0 :
                        shapeOffset + yAxis.pos - chart.plotTop)
            ]; // #6327
        }
    };
    // Fade in the arrows on initializing series.
    WindbarbSeries.prototype.animate = function (init) {
        if (init) {
            this.markerGroup.attr({
                opacity: 0.01
            });
        }
        else {
            this.markerGroup.animate({
                opacity: 1
            }, animObject(this.options.animation));
        }
    };
    WindbarbSeries.prototype.markerAttribs = function () {
        return {};
    };
    WindbarbSeries.prototype.getExtremes = function () {
        return {};
    };
    WindbarbSeries.prototype.shouldShowTooltip = function (plotX, plotY, options) {
        if (options === void 0) { options = {}; }
        options.ignoreX = this.chart.inverted;
        options.ignoreY = !options.ignoreX;
        return _super.prototype.shouldShowTooltip.call(this, plotX, plotY, options);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    WindbarbSeries.defaultOptions = merge(ColumnSeries.defaultOptions, Windbarb_WindbarbSeriesDefaults);
    return WindbarbSeries;
}(ColumnSeries));
Series_OnSeriesComposition.compose(WindbarbSeries);
extend(WindbarbSeries.prototype, {
    beaufortFloor: [
        0, 0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8,
        24.5, 28.5, 32.7
    ], // @todo dictionary with names?
    beaufortName: [
        'Calm', 'Light air', 'Light breeze',
        'Gentle breeze', 'Moderate breeze', 'Fresh breeze',
        'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm',
        'Violent storm', 'Hurricane'
    ],
    invertible: false,
    parallelArrays: ['x', 'value', 'direction'],
    pointArrayMap: ['value', 'direction'],
    pointClass: Windbarb_WindbarbPoint,
    trackerGroups: ['markerGroup'],
    translate: function () {
        var beaufortFloor = this.beaufortFloor,
            beaufortName = this.beaufortName;
        Series_OnSeriesComposition.translate.call(this);
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var level = 0;
            // Find the beaufort level (zero based)
            for (; level < beaufortFloor.length; level++) {
                if (beaufortFloor[level] > point.value) {
                    break;
                }
            }
            point.beaufortLevel = level - 1;
            point.beaufort = beaufortName[level - 1];
        }
    }
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('windbarb', WindbarbSeries);
registerApproximation();
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Windbarb_WindbarbSeries = ((/* unused pure expression or super */ null && (WindbarbSeries)));

;// ./code/es5/es-modules/masters/modules/windbarb.src.js




/* harmony default export */ var windbarb_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});