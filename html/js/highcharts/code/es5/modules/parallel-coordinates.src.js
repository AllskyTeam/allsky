/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/parallel-coordinates
 * @requires highcharts
 *
 * Support for parallel coordinates in Highcharts
 *
 * (c) 2010-2024 Pawel Fus
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["Templating"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/parallel-coordinates", [["highcharts/highcharts"], ["highcharts/highcharts","Templating"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/parallel-coordinates"] = factory(require("highcharts"), require("highcharts")["Templating"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["Templating"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__984__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 984:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__984__;

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
  "default": function() { return /* binding */ parallel_coordinates_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es5/es-modules/Extensions/ParallelCoordinates/ParallelCoordinatesDefaults.js
/* *
 *
 *  Parallel coordinates module
 *
 *  (c) 2010-2024 Pawel Fus
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
 * @optionparent chart
 */
var chartDefaults = {
    /**
     * Flag to render charts as a parallel coordinates plot. In a parallel
     * coordinates plot (||-coords) by default all required yAxes are generated
     * and the legend is disabled. This feature requires
     * `modules/parallel-coordinates.js`.
     *
     * @sample {highcharts} /highcharts/demo/parallel-coordinates/
     *         Parallel coordinates demo
     * @sample {highcharts} highcharts/parallel-coordinates/polar/
     *         Star plot, multivariate data in a polar chart
     *
     * @since    6.0.0
     * @product  highcharts
     * @requires modules/parallel-coordinates
     */
    parallelCoordinates: false,
    /**
     * Common options for all yAxes rendered in a parallel coordinates plot.
     * This feature requires `modules/parallel-coordinates.js`.
     *
     * The default options are:
     * ```js
     * parallelAxes: {
     *    lineWidth: 1,       // classic mode only
     *    gridlinesWidth: 0,  // classic mode only
     *    title: {
     *        text: '',
     *        reserveSpace: false
     *    },
     *    labels: {
     *        x: 0,
     *        y: 0,
     *        align: 'center',
     *        reserveSpace: false
     *    },
     *    offset: 0
     * }
     * ```
     *
     * @sample {highcharts} highcharts/parallel-coordinates/parallelaxes/
     *         Set the same tickAmount for all yAxes
     *
     * @extends   yAxis
     * @since     6.0.0
     * @product   highcharts
     * @excluding alternateGridColor, breaks, id, gridLineColor,
     *            gridLineDashStyle, gridLineWidth, minorGridLineColor,
     *            minorGridLineDashStyle, minorGridLineWidth, plotBands,
     *            plotLines, angle, gridLineInterpolation, maxColor, maxZoom,
     *            minColor, scrollbar, stackLabels, stops,
     * @requires  modules/parallel-coordinates
     */
    parallelAxes: {
        lineWidth: 1,
        /**
         * Titles for yAxes are taken from
         * [xAxis.categories](#xAxis.categories). All options for `xAxis.labels`
         * applies to parallel coordinates titles. For example, to style
         * categories, use [xAxis.labels.style](#xAxis.labels.style).
         *
         * @excluding align, enabled, margin, offset, position3d, reserveSpace,
         *            rotation, skew3d, style, text, useHTML, x, y
         */
        title: {
            text: '',
            reserveSpace: false
        },
        labels: {
            x: 0,
            y: 4,
            align: 'center',
            reserveSpace: false
        },
        offset: 0
    }
};
var xAxisDefaults = {
    lineWidth: 0,
    tickLength: 0,
    opposite: true,
    type: 'category'
};
/**
 * Parallel coordinates only. Format that will be used for point.y
 * and available in [tooltip.pointFormat](#tooltip.pointFormat) as
 * `{point.formattedValue}`. If not set, `{point.formattedValue}`
 * will use other options, in this order:
 *
 * 1. [yAxis.labels.format](#yAxis.labels.format) will be used if
 *    set
 *
 * 2. If yAxis is a category, then category name will be displayed
 *
 * 3. If yAxis is a datetime, then value will use the same format as
 *    yAxis labels
 *
 * 4. If yAxis is linear/logarithmic type, then simple value will be
 *    used
 *
 * @sample {highcharts}
 *         /highcharts/parallel-coordinates/tooltipvalueformat/
 *         Different tooltipValueFormats's
 *
 * @type      {string}
 * @default   undefined
 * @since     6.0.0
 * @product   highcharts
 * @requires  modules/parallel-coordinates
 * @apioption yAxis.tooltipValueFormat
 */
''; // Keeps doclets above separate in JS file
/* *
 *
 *  Default Options
 *
 * */
var ParallelCoordinatesDefaults = {
    chart: chartDefaults,
    xAxis: xAxisDefaults
};
/* harmony default export */ var ParallelCoordinates_ParallelCoordinatesDefaults = (ParallelCoordinatesDefaults);

;// ./code/es5/es-modules/Extensions/ParallelCoordinates/ParallelAxis.js
/* *
 *
 *  Parallel coordinates module
 *
 *  (c) 2010-2024 Pawel Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};


var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, arrayMax = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMax, arrayMin = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMin, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Class
 *
 * */
/**
 * Support for parallel axes.
 * @private
 * @class
 */
var ParallelAxisAdditions = /** @class */ (function () {
    /* *
     *
     *  Constructors
     *
     * */
    function ParallelAxisAdditions(axis) {
        this.axis = axis;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Set predefined left+width and top+height (inverted) for yAxes.
     * This method modifies options param.
     *
     * @private
     *
     * @param  {Array<string>} axisPosition
     * ['left', 'width', 'height', 'top'] or ['top', 'height', 'width', 'left']
     * for an inverted chart.
     *
     * @param  {Highcharts.AxisOptions} options
     * Axis options.
     */
    ParallelAxisAdditions.prototype.setPosition = function (axisPosition, options) {
        var parallel = this,
            axis = parallel.axis,
            chart = axis.chart,
            fraction = ((parallel.position || 0) + 0.5) /
                (chart.parallelInfo.counter + 1);
        if (chart.polar) {
            options.angle = 360 * fraction;
        }
        else {
            options[axisPosition[0]] = 100 * fraction + '%';
            axis[axisPosition[1]] = options[axisPosition[1]] = 0;
            // In case of chart.update(inverted), remove old options:
            axis[axisPosition[2]] = options[axisPosition[2]] = null;
            axis[axisPosition[3]] = options[axisPosition[3]] = null;
        }
    };
    return ParallelAxisAdditions;
}());
/* *
 *
 *  Composition
 *
 * */
var ParallelAxis;
(function (ParallelAxis) {
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
     * Adds support for parallel axes.
     * @private
     */
    function compose(AxisClass) {
        if (!AxisClass.keepProps.includes('parallel')) {
            var axisCompo = AxisClass;
            // On update, keep parallel additions.
            AxisClass.keepProps.push('parallel');
            addEvent(axisCompo, 'init', onInit);
            addEvent(axisCompo, 'afterSetOptions', onAfterSetOptions);
            addEvent(axisCompo, 'getSeriesExtremes', onGetSeriesExtremes);
        }
    }
    ParallelAxis.compose = compose;
    /**
     * Update default options with predefined for a parallel coords.
     * @private
     */
    function onAfterSetOptions(e) {
        var axis = this,
            chart = axis.chart,
            parallelCoordinates = axis.parallelCoordinates;
        var axisPosition = [
                'left', 'width', 'height', 'top'
            ];
        if (chart.hasParallelCoordinates) {
            if (chart.inverted) {
                axisPosition = axisPosition.reverse();
            }
            if (axis.isXAxis) {
                axis.options = merge(axis.options, ParallelCoordinates_ParallelCoordinatesDefaults.xAxis, e.userOptions);
            }
            else {
                var axisIndex = chart.yAxis.indexOf(axis); // #13608
                    axis.options = merge(axis.options,
                    axis.chart.options.chart.parallelAxes,
                    e.userOptions);
                parallelCoordinates.position = pick(parallelCoordinates.position, axisIndex >= 0 ? axisIndex : chart.yAxis.length);
                parallelCoordinates.setPosition(axisPosition, axis.options);
            }
        }
    }
    /**
     * Each axis should gather extremes from points on a particular position in
     * series.data. Not like the default one, which gathers extremes from all
     * series bind to this axis. Consider using series.points instead of
     * series.yData.
     * @private
     */
    function onGetSeriesExtremes(e) {
        var axis = this;
        var chart = axis.chart;
        var parallelCoordinates = axis.parallelCoordinates;
        if (!parallelCoordinates) {
            return;
        }
        if (chart && chart.hasParallelCoordinates && !axis.isXAxis) {
            var index_1 = parallelCoordinates.position;
            var currentPoints_1 = [];
            axis.series.forEach(function (series) {
                if (series.visible && isNumber(index_1)) {
                    currentPoints_1 = (series.pointArrayMap || ['y'])
                        .reduce(function (currentPoints, key) {
                        var _a,
                            _b;
                        return __spreadArray(__spreadArray([], currentPoints, true), [
                            (_b = (_a = series.getColumn(key)) === null || _a === void 0 ? void 0 : _a[index_1]) !== null && _b !== void 0 ? _b : null
                        ], false);
                    }, currentPoints_1);
                }
            });
            currentPoints_1 = currentPoints_1.filter(isNumber);
            axis.dataMin = arrayMin(currentPoints_1);
            axis.dataMax = arrayMax(currentPoints_1);
            e.preventDefault();
        }
    }
    /**
     * Add parallel addition
     * @private
     */
    function onInit() {
        var axis = this;
        if (!axis.parallelCoordinates) {
            axis.parallelCoordinates = new ParallelAxisAdditions(axis);
        }
    }
})(ParallelAxis || (ParallelAxis = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ParallelCoordinates_ParallelAxis = (ParallelAxis);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Templating"],"commonjs":["highcharts","Templating"],"commonjs2":["highcharts","Templating"],"root":["Highcharts","Templating"]}
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_ = __webpack_require__(984);
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default = /*#__PURE__*/__webpack_require__.n(highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_);
;// ./code/es5/es-modules/Extensions/ParallelCoordinates/ParallelSeries.js
/* *
 *
 *  Parallel coordinates module
 *
 *  (c) 2010-2024 Pawel Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;

var format = (highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default()).format;

var ParallelSeries_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, erase = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).erase, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, insertItem = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).insertItem, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, ParallelSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Composition
 *
 * */
var ParallelSeries;
(function (ParallelSeries) {
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
    /** @private */
    function compose(SeriesClass) {
        if (pushUnique(composed, 'ParallelSeries')) {
            var CompoClass = SeriesClass;
            ParallelSeries_addEvent(CompoClass, 'afterTranslate', onSeriesAfterTranslate, { order: 1 });
            ParallelSeries_addEvent(CompoClass, 'bindAxes', onSeriesBindAxes);
            ParallelSeries_addEvent(CompoClass, 'destroy', onSeriesDestroy);
            ParallelSeries_addEvent(SeriesClass, 'afterGeneratePoints', onSeriesAfterGeneratePoints);
        }
    }
    ParallelSeries.compose = compose;
    /**
     * Translate each point using corresponding yAxis.
     * @private
     */
    function onSeriesAfterTranslate() {
        var series = this,
            chart = this.chart,
            points = series.points,
            dataLength = points && points.length;
        var closestPointRangePx = Number.MAX_VALUE,
            lastPlotX,
            point;
        if (this.chart.hasParallelCoordinates) {
            for (var i = 0; i < dataLength; i++) {
                point = points[i];
                if (defined(point.y)) {
                    if (chart.polar) {
                        point.plotX = chart.yAxis[i].angleRad || 0;
                    }
                    else if (chart.inverted) {
                        point.plotX = (chart.plotHeight -
                            chart.yAxis[i].top +
                            chart.plotTop);
                    }
                    else {
                        point.plotX = chart.yAxis[i].left - chart.plotLeft;
                    }
                    point.clientX = point.plotX;
                    point.plotY = chart.yAxis[i]
                        .translate(point.y, false, true, void 0, true);
                    // Range series (#15752)
                    if (ParallelSeries_isNumber(point.high)) {
                        point.plotHigh = chart.yAxis[i].translate(point.high, false, true, void 0, true);
                    }
                    if (typeof lastPlotX !== 'undefined') {
                        closestPointRangePx = Math.min(closestPointRangePx, Math.abs(point.plotX - lastPlotX));
                    }
                    lastPlotX = point.plotX;
                    point.isInside = chart.isInsidePlot(point.plotX, point.plotY, { inverted: chart.inverted });
                }
                else {
                    point.isNull = true;
                }
            }
            this.closestPointRangePx = closestPointRangePx;
        }
    }
    /**
     * Bind each series to each yAxis. yAxis needs a reference to all series to
     * calculate extremes.
     * @private
     */
    function onSeriesBindAxes(e) {
        var series = this,
            chart = series.chart;
        if (chart.hasParallelCoordinates) {
            var series_1 = this;
            for (var _i = 0, _a = chart.axes; _i < _a.length; _i++) {
                var axis = _a[_i];
                insertItem(series_1, axis.series);
                axis.isDirty = true;
            }
            series_1.xAxis = chart.xAxis[0];
            series_1.yAxis = chart.yAxis[0];
            e.preventDefault();
        }
    }
    /**
     * On destroy, we need to remove series from each `axis.series`.
     * @private
     */
    function onSeriesDestroy() {
        var series = this,
            chart = series.chart;
        if (chart.hasParallelCoordinates) {
            for (var _i = 0, _a = (chart.axes || []); _i < _a.length; _i++) {
                var axis = _a[_i];
                if (axis && axis.series) {
                    erase(axis.series, series);
                    axis.isDirty = axis.forceRedraw = true;
                }
            }
        }
    }
    /**
     * @private
     */
    function onSeriesAfterGeneratePoints() {
        var _a,
            _b,
            _c,
            _d,
            _e,
            _f;
        var chart = this.chart;
        if (chart === null || chart === void 0 ? void 0 : chart.hasParallelCoordinates) {
            for (var _i = 0, _g = this.points; _i < _g.length; _i++) {
                var point = _g[_i];
                var yAxis = chart.yAxis[point.x || 0],
                    yAxisOptions = yAxis.options,
                    labelFormat = (_a = yAxisOptions.tooltipValueFormat) !== null && _a !== void 0 ? _a : yAxisOptions.labels.format;
                var formattedValue = void 0;
                if (labelFormat) {
                    formattedValue = format(labelFormat, extend(point, { value: point.y }), chart);
                }
                else if (yAxis.dateTime) {
                    formattedValue = chart.time.dateFormat(chart.time.resolveDTLFormat(((_b = yAxisOptions.dateTimeLabelFormats) === null || _b === void 0 ? void 0 : _b[((_c = yAxis.tickPositions.info) === null || _c === void 0 ? void 0 : _c.unitName) || 'year']) || '').main, (_d = point.y) !== null && _d !== void 0 ? _d : void 0);
                }
                else if (isArray(yAxisOptions.categories)) {
                    formattedValue = yAxisOptions.categories[(_e = point.y) !== null && _e !== void 0 ? _e : -1];
                }
                else {
                    formattedValue = String((_f = point.y) !== null && _f !== void 0 ? _f : '');
                }
                point.formattedValue = formattedValue;
            }
        }
    }
})(ParallelSeries || (ParallelSeries = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ParallelCoordinates_ParallelSeries = (ParallelSeries);

;// ./code/es5/es-modules/Extensions/ParallelCoordinates/ParallelCoordinates.js
/* *
 *
 *  Parallel coordinates module
 *
 *  (c) 2010-2024 Pawel Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */





var ParallelCoordinates_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, ParallelCoordinates_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, ParallelCoordinates_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, splat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).splat;
/* *
 *
 *  Class
 *
 * */
var ChartAdditions = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function ChartAdditions(chart) {
        this.chart = chart;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Define how many parellel axes we have according to the longest dataset.
     * This is quite heavy - loop over all series and check series.data.length
     * Consider:
     *
     * - make this an option, so user needs to set this to get better
     *   performance
     *
     * - check only first series for number of points and assume the rest is the
     *   same
     *
     * @private
     * @function Highcharts.Chart#setParallelInfo
     * @param {Highcharts.Options} options
     * User options
     * @requires modules/parallel-coordinates
     */
    ChartAdditions.prototype.setParallelInfo = function (options) {
        var chart = (this.chart ||
                this),
            seriesOptions = options.series;
        chart.parallelInfo = {
            counter: 0
        };
        for (var _i = 0, seriesOptions_1 = seriesOptions; _i < seriesOptions_1.length; _i++) {
            var series = seriesOptions_1[_i];
            if (series.data) {
                chart.parallelInfo.counter = Math.max(chart.parallelInfo.counter, series.data.length - 1);
            }
        }
    };
    return ChartAdditions;
}());
/* *
 *
 *  Composition
 *
 * */
var ParallelCoordinates;
(function (ParallelCoordinates) {
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
    /** @private */
    function compose(AxisClass, ChartClass, highchartsDefaultOptions, SeriesClass) {
        ParallelCoordinates_ParallelAxis.compose(AxisClass);
        ParallelCoordinates_ParallelSeries.compose(SeriesClass);
        var ChartCompo = ChartClass,
            addsProto = ChartAdditions.prototype,
            chartProto = ChartCompo.prototype;
        if (!chartProto.setParallelInfo) {
            chartProto.setParallelInfo = addsProto.setParallelInfo;
            ParallelCoordinates_addEvent(ChartCompo, 'init', onChartInit);
            ParallelCoordinates_addEvent(ChartCompo, 'update', onChartUpdate);
            ParallelCoordinates_merge(true, highchartsDefaultOptions.chart, ParallelCoordinates_ParallelCoordinatesDefaults.chart);
        }
    }
    ParallelCoordinates.compose = compose;
    /**
     * Initialize parallelCoordinates
     * @private
     */
    function onChartInit(e) {
        var chart = this,
            options = e.args[0],
            defaultYAxis = splat(options.yAxis || {}),
            newYAxes = [];
        var yAxisLength = defaultYAxis.length;
        /**
         * Flag used in parallel coordinates plot to check if chart has
         * ||-coords (parallel coords).
         *
         * @requires modules/parallel-coordinates
         *
         * @name Highcharts.Chart#hasParallelCoordinates
         * @type {boolean}
         */
        chart.hasParallelCoordinates = options.chart &&
            options.chart.parallelCoordinates;
        if (chart.hasParallelCoordinates) {
            chart.setParallelInfo(options);
            // Push empty yAxes in case user did not define them:
            for (; yAxisLength <= chart.parallelInfo.counter; yAxisLength++) {
                newYAxes.push({});
            }
            if (!options.legend) {
                options.legend = {};
            }
            if (options.legend &&
                typeof options.legend.enabled === 'undefined') {
                options.legend.enabled = false;
            }
            ParallelCoordinates_merge(true, options, 
            // Disable boost
            {
                boost: {
                    seriesThreshold: Number.MAX_VALUE
                },
                plotOptions: {
                    series: {
                        boostThreshold: Number.MAX_VALUE
                    }
                }
            });
            options.yAxis = defaultYAxis.concat(newYAxes);
            options.xAxis = ParallelCoordinates_merge(ParallelCoordinates_ParallelCoordinatesDefaults.xAxis, // Docs
            splat(options.xAxis || {})[0]);
        }
    }
    /**
     * Initialize parallelCoordinates
     * @private
     */
    function onChartUpdate(e) {
        var chart = this,
            options = e.options;
        if (options.chart) {
            if (ParallelCoordinates_defined(options.chart.parallelCoordinates)) {
                chart.hasParallelCoordinates =
                    options.chart.parallelCoordinates;
            }
            chart.options.chart.parallelAxes = ParallelCoordinates_merge(chart.options.chart.parallelAxes, options.chart.parallelAxes);
        }
        if (chart.hasParallelCoordinates) {
            // (#10081)
            if (options.series) {
                chart.setParallelInfo(options);
            }
            for (var _i = 0, _a = chart.yAxis; _i < _a.length; _i++) {
                var axis = _a[_i];
                axis.update({}, false);
            }
        }
    }
})(ParallelCoordinates || (ParallelCoordinates = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ParallelCoordinates_ParallelCoordinates = (ParallelCoordinates);

;// ./code/es5/es-modules/masters/modules/parallel-coordinates.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
ParallelCoordinates_ParallelCoordinates.compose(G.Axis, G.Chart, G.defaultOptions, G.Series);
/* harmony default export */ var parallel_coordinates_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});