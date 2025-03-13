/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/indicators
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Pawel Fus, Sebastian Bochan
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["Chart"], require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/indicators", [["highcharts/highcharts"], ["highcharts/highcharts","Chart"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/indicators"] = factory(require("highcharts"), require("highcharts")["Chart"], require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["Chart"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__960__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 960:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__960__;

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
  "default": function() { return /* binding */ indicators_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Chart"],"commonjs":["highcharts","Chart"],"commonjs2":["highcharts","Chart"],"root":["Highcharts","Chart"]}
var highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_ = __webpack_require__(960);
var highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_default = /*#__PURE__*/__webpack_require__.n(highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/SMA/SMAIndicator.js
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
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};


var LineSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.line;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/**
 *
 * Return the parent series values in the legacy two-dimensional yData
 * format
 * @private
 */
var tableToMultiYData = function (series, processed) {
    var yData = [],
        pointArrayMap = series.pointArrayMap,
        table = processed && series.dataTable.modified || series.dataTable;
    if (!pointArrayMap) {
        return series.getColumn('y', processed);
    }
    var columns = pointArrayMap.map(function (key) {
            return series.getColumn(key,
        processed);
    });
    var _loop_1 = function (i) {
            var values = pointArrayMap.map(function (key,
        colIndex) { var _a; return ((_a = columns[colIndex]) === null || _a === void 0 ? void 0 : _a[i]) || 0; });
        yData.push(values);
    };
    for (var i = 0; i < table.rowCount; i++) {
        _loop_1(i);
    }
    return yData;
};
/* *
 *
 *  Class
 *
 * */
/**
 * The SMA series type.
 *
 * @private
 */
var SMAIndicator = /** @class */ (function (_super) {
    __extends(SMAIndicator, _super);
    function SMAIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    SMAIndicator.prototype.destroy = function () {
        this.dataEventsToUnbind.forEach(function (unbinder) {
            unbinder();
        });
        _super.prototype.destroy.apply(this, arguments);
    };
    /**
     * @private
     */
    SMAIndicator.prototype.getName = function () {
        var params = [];
        var name = this.name;
        if (!name) {
            (this.nameComponents || []).forEach(function (component, index) {
                params.push(this.options.params[component] +
                    pick(this.nameSuffixes[index], ''));
            }, this);
            name = (this.nameBase || this.type.toUpperCase()) +
                (this.nameComponents ? ' (' + params.join(', ') + ')' : '');
        }
        return name;
    };
    /**
     * @private
     */
    SMAIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            xVal = series.xData || [],
            yVal = series.yData,
            yValLen = yVal.length,
            SMA = [],
            xData = [],
            yData = [];
        var i,
            index = -1,
            range = 0,
            SMAPoint,
            sum = 0;
        if (xVal.length < period) {
            return;
        }
        // Switch index for OHLC / Candlestick / Arearange
        if (isArray(yVal[0])) {
            index = params.index ? params.index : 0;
        }
        // Accumulate first N-points
        while (range < period - 1) {
            sum += index < 0 ? yVal[range] : yVal[range][index];
            range++;
        }
        // Calculate value one-by-one for each period in visible data
        for (i = range; i < yValLen; i++) {
            sum += index < 0 ? yVal[i] : yVal[i][index];
            SMAPoint = [xVal[i], sum / period];
            SMA.push(SMAPoint);
            xData.push(SMAPoint[0]);
            yData.push(SMAPoint[1]);
            sum -= (index < 0 ?
                yVal[i - range] :
                yVal[i - range][index]);
        }
        return {
            values: SMA,
            xData: xData,
            yData: yData
        };
    };
    /**
     * @private
     */
    SMAIndicator.prototype.init = function (chart, options) {
        var indicator = this;
        _super.prototype.init.call(indicator, chart, options);
        // Only after series are linked indicator can be processed.
        var linkedSeriesUnbiner = addEvent((highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_default()), 'afterLinkSeries',
            function (_a) {
                var isUpdating = _a.isUpdating;
            // #18643 indicator shouldn't recalculate
            // values while series updating.
            if (isUpdating) {
                return;
            }
            var hasEvents = !!indicator.dataEventsToUnbind.length;
            if (indicator.linkedParent) {
                if (!hasEvents) {
                    // No matter which indicator, always recalculate after
                    // updating the data.
                    indicator.dataEventsToUnbind.push(addEvent(indicator.linkedParent, 'updatedData', function () {
                        indicator.recalculateValues();
                    }));
                    // Some indicators (like VBP) requires an additional
                    // event (afterSetExtremes) to properly show the data.
                    if (indicator.calculateOn.xAxis) {
                        indicator.dataEventsToUnbind.push(addEvent(indicator.linkedParent.xAxis, indicator.calculateOn.xAxis, function () {
                            indicator.recalculateValues();
                        }));
                    }
                }
                // Most indicators are being calculated on chart's init.
                if (indicator.calculateOn.chart === 'init') {
                    // When closestPointRange is set, it is an indication
                    // that `Series.processData` has run. If it hasn't we
                    // need to `recalculateValues`.
                    if (!indicator.closestPointRange) {
                        indicator.recalculateValues();
                    }
                }
                else if (!hasEvents) {
                    // Some indicators (like VBP) has to recalculate their
                    // values after other chart's events (render).
                    var unbinder_1 = addEvent(indicator.chart,
                        indicator.calculateOn.chart,
                        function () {
                            indicator.recalculateValues();
                        // Call this just once.
                        unbinder_1();
                    });
                }
            }
            else {
                return error('Series ' +
                    indicator.options.linkedTo +
                    ' not found! Check `linkedTo`.', false, chart);
            }
        }, {
            order: 0
        });
        // Make sure we find series which is a base for an indicator
        // chart.linkSeries();
        indicator.dataEventsToUnbind = [];
        indicator.eventsToUnbind.push(linkedSeriesUnbiner);
    };
    /**
     * @private
     */
    SMAIndicator.prototype.recalculateValues = function () {
        var _this = this;
        var _a;
        var croppedDataValues = [],
            indicator = this,
            table = this.dataTable,
            oldData = indicator.points || [],
            oldDataLength = indicator.dataTable.rowCount,
            emptySet = {
                values: [],
                xData: [],
                yData: []
            };
        var overwriteData = true,
            oldFirstPointIndex,
            oldLastPointIndex,
            min,
            max;
        // For the newer data table, temporarily set the parent series `yData`
        // to the legacy format that is documented for custom indicators, and
        // get the xData from the data table
        var yData = indicator.linkedParent.yData,
            processedYData = indicator.linkedParent.processedYData;
        indicator.linkedParent.xData = indicator.linkedParent
            .getColumn('x');
        indicator.linkedParent.yData = tableToMultiYData(indicator.linkedParent);
        indicator.linkedParent.processedYData = tableToMultiYData(indicator.linkedParent, true);
        // Updating an indicator with redraw=false may destroy data.
        // If there will be a following update for the parent series,
        // we will try to access Series object without any properties
        // (except for prototyped ones). This is what happens
        // for example when using Axis.setDataGrouping(). See #16670
        var processedData = indicator.linkedParent.options &&
                // #18176, #18177 indicators should work with empty dataset
                indicator.linkedParent.dataTable.rowCount ?
                (indicator.getValues(indicator.linkedParent,
            indicator.options.params) || emptySet) : emptySet;
        // Reset
        delete indicator.linkedParent.xData;
        indicator.linkedParent.yData = yData;
        indicator.linkedParent.processedYData = processedYData;
        var pointArrayMap = indicator.pointArrayMap || ['y'],
            valueColumns = {};
        // Split legacy twodimensional values into value columns
        processedData.yData
            .forEach(function (values) {
            pointArrayMap.forEach(function (key, index) {
                var column = valueColumns[key] || [];
                column.push(isArray(values) ? values[index] : values);
                if (!valueColumns[key]) {
                    valueColumns[key] = column;
                }
            });
        });
        // We need to update points to reflect changes in all,
        // x and y's, values. However, do it only for non-grouped
        // data - grouping does it for us (#8572)
        if (oldDataLength &&
            !indicator.hasGroupedData &&
            indicator.visible &&
            indicator.points) {
            // When data is cropped update only avaliable points (#9493)
            if (indicator.cropped) {
                if (indicator.xAxis) {
                    min = indicator.xAxis.min;
                    max = indicator.xAxis.max;
                }
                var croppedData = indicator.cropData(table,
                    min,
                    max);
                var keys = __spreadArray(['x'], (indicator.pointArrayMap || ['y']), true);
                var _loop_2 = function (i) {
                        var values = keys.map(function (key) {
                            return _this.getColumn(key)[i] || 0;
                    });
                    croppedDataValues.push(values);
                };
                for (var i = 0; i < (((_a = croppedData.modified) === null || _a === void 0 ? void 0 : _a.rowCount) || 0); i++) {
                    _loop_2(i);
                }
                var indicatorXData = indicator.getColumn('x');
                oldFirstPointIndex = processedData.xData.indexOf(indicatorXData[0]);
                oldLastPointIndex = processedData.xData.indexOf(indicatorXData[indicatorXData.length - 1]);
                // Check if indicator points should be shifted (#8572)
                if (oldFirstPointIndex === -1 &&
                    oldLastPointIndex === processedData.xData.length - 2) {
                    if (croppedDataValues[0][0] === oldData[0].x) {
                        croppedDataValues.shift();
                    }
                }
                indicator.updateData(croppedDataValues);
            }
            else if (indicator.updateAllPoints || // #18710
                // Omit addPoint() and removePoint() cases
                processedData.xData.length !== oldDataLength - 1 &&
                    processedData.xData.length !== oldDataLength + 1) {
                overwriteData = false;
                indicator.updateData(processedData.values);
            }
        }
        if (overwriteData) {
            table.setColumns(__assign(__assign({}, valueColumns), { x: processedData.xData }));
            indicator.options.data = processedData.values;
        }
        if (indicator.calculateOn.xAxis &&
            indicator.getColumn('x', true).length) {
            indicator.isDirty = true;
            indicator.redraw();
        }
        indicator.isDirtyData = !!indicator.linkedSeries.length;
        fireEvent(indicator, 'updatedData'); // #18689
    };
    /**
     * @private
     */
    SMAIndicator.prototype.processData = function () {
        var series = this,
            compareToMain = series.options.compareToMain,
            linkedParent = series.linkedParent;
        _super.prototype.processData.apply(series, arguments);
        if (series.dataModify &&
            linkedParent &&
            linkedParent.dataModify &&
            linkedParent.dataModify.compareValue &&
            compareToMain) {
            series.dataModify.compareValue =
                linkedParent.dataModify.compareValue;
        }
        return;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * The parameter allows setting line series type and use OHLC indicators.
     * Data in OHLC format is required.
     *
     * @sample {highstock} stock/indicators/use-ohlc-data
     *         Use OHLC data format to plot line chart
     *
     * @type      {boolean}
     * @product   highstock
     * @apioption plotOptions.line.useOhlcData
     */
    /**
     * Simple moving average indicator (SMA). This series requires `linkedTo`
     * option to be set.
     *
     * @sample stock/indicators/sma
     *         Simple moving average indicator
     *
     * @extends      plotOptions.line
     * @since        6.0.0
     * @excluding    allAreas, colorAxis, dragDrop, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking, useOhlcData
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @optionparent plotOptions.sma
     */
    SMAIndicator.defaultOptions = merge(LineSeries.defaultOptions, {
        /**
         * The name of the series as shown in the legend, tooltip etc. If not
         * set, it will be based on a technical indicator type and default
         * params.
         *
         * @type {string}
         */
        name: void 0,
        tooltip: {
            /**
             * Number of decimals in indicator series.
             */
            valueDecimals: 4
        },
        /**
         * The main series ID that indicator will be based on. Required for this
         * indicator.
         *
         * @type {string}
         */
        linkedTo: void 0,
        /**
         * Whether to compare indicator to the main series values
         * or indicator values.
         *
         * @sample {highstock} stock/plotoptions/series-comparetomain/
         *         Difference between comparing SMA values to the main series
         *         and its own values.
         *
         * @type {boolean}
         */
        compareToMain: false,
        /**
         * Parameters used in calculation of regression series' points.
         */
        params: {
            /**
             * The point index which indicator calculations will base. For
             * example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             */
            index: 3,
            /**
             * The base period for indicator calculations. This is the number of
             * data points which are taken into account for the indicator
             * calculations.
             */
            period: 14
        }
    });
    return SMAIndicator;
}(LineSeries));
extend(SMAIndicator.prototype, {
    calculateOn: {
        chart: 'init'
    },
    hasDerivedData: true,
    nameComponents: ['period'],
    nameSuffixes: [], // E.g. Zig Zag uses extra '%'' in the legend name
    useCommonDataGrouping: true
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('sma', SMAIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var SMA_SMAIndicator = ((/* unused pure expression or super */ null && (SMAIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `SMA` series. If the [type](#series.sma.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.sma
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL, useOhlcData
 * @requires  stock/indicators/indicators
 * @apioption series.sma
 */
(''); // Adds doclet above to the transpiled file

;// ./code/es5/es-modules/Stock/Indicators/EMA/EMAIndicator.js
/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var EMAIndicator_extends = (undefined && undefined.__extends) || (function () {
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

var EMAIndicator_SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var correctFloat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).correctFloat, EMAIndicator_isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, EMAIndicator_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The EMA series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.ema
 *
 * @augments Highcharts.Series
 */
var EMAIndicator = /** @class */ (function (_super) {
    EMAIndicator_extends(EMAIndicator, _super);
    function EMAIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    EMAIndicator.prototype.accumulatePeriodPoints = function (period, index, yVal) {
        var sum = 0,
            i = 0,
            y = 0;
        while (i < period) {
            y = index < 0 ? yVal[i] : yVal[i][index];
            sum = sum + y;
            i++;
        }
        return sum;
    };
    EMAIndicator.prototype.calculateEma = function (xVal, yVal, i, EMApercent, calEMA, index, SMA) {
        var x = xVal[i - 1],
            yValue = index < 0 ?
                yVal[i - 1] :
                yVal[i - 1][index],
            y = typeof calEMA === 'undefined' ?
                SMA : correctFloat((yValue * EMApercent) +
                (calEMA * (1 - EMApercent)));
        return [x, y];
    };
    EMAIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            xVal = series.xData,
            yVal = series.yData,
            yValLen = yVal ? yVal.length : 0,
            EMApercent = 2 / (period + 1),
            EMA = [],
            xData = [],
            yData = [];
        var calEMA,
            EMAPoint,
            i,
            index = -1,
            sum = 0,
            SMA = 0;
        // Check period, if bigger than points length, skip
        if (yValLen < period) {
            return;
        }
        // Switch index for OHLC / Candlestick / Arearange
        if (EMAIndicator_isArray(yVal[0])) {
            index = params.index ? params.index : 0;
        }
        // Accumulate first N-points
        sum = this.accumulatePeriodPoints(period, index, yVal);
        // First point
        SMA = sum / period;
        // Calculate value one-by-one for each period in visible data
        for (i = period; i < yValLen + 1; i++) {
            EMAPoint = this.calculateEma(xVal, yVal, i, EMApercent, calEMA, index, SMA);
            EMA.push(EMAPoint);
            xData.push(EMAPoint[0]);
            yData.push(EMAPoint[1]);
            calEMA = EMAPoint[1];
        }
        return {
            values: EMA,
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
     * Exponential moving average indicator (EMA). This series requires the
     * `linkedTo` option to be set.
     *
     * @sample stock/indicators/ema
     * Exponential moving average indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @optionparent plotOptions.ema
     */
    EMAIndicator.defaultOptions = EMAIndicator_merge(EMAIndicator_SMAIndicator.defaultOptions, {
        params: {
            /**
             * The point index which indicator calculations will base. For
             * example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             *
             * By default index value used to be set to 0. Since
             * Highcharts Stock 7 by default index is set to 3
             * which means that the ema indicator will be
             * calculated using Close values.
             */
            index: 3,
            period: 9 // @merge 14 in v6.2
        }
    });
    return EMAIndicator;
}(EMAIndicator_SMAIndicator));
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('ema', EMAIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var EMA_EMAIndicator = ((/* unused pure expression or super */ null && (EMAIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `EMA` series. If the [type](#series.ema.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.ema
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @apioption series.ema
 */
''; // Adds doclet above to the transpiled file

;// ./code/es5/es-modules/Stock/Indicators/MultipleLinesComposition.js
/**
 *
 *  (c) 2010-2024 Wojciech Chmiel
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var smaProto = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma.prototype;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, MultipleLinesComposition_error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, MultipleLinesComposition_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Composition
 *
 * */
var MultipleLinesComposition;
(function (MultipleLinesComposition) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Constants
     *
     * */
    /**
     * Additional lines DOCS names. Elements of linesApiNames array should
     * be consistent with DOCS line names defined in your implementation.
     * Notice that linesApiNames should have decreased amount of elements
     * relative to pointArrayMap (without pointValKey).
     *
     * @private
     * @type {Array<string>}
     */
    var linesApiNames = ['bottomLine'];
    /**
     * Lines ids. Required to plot appropriate amount of lines.
     * Notice that pointArrayMap should have more elements than
     * linesApiNames, because it contains main line and additional lines ids.
     * Also it should be consistent with amount of lines calculated in
     * getValues method from your implementation.
     *
     * @private
     * @type {Array<string>}
     */
    var pointArrayMap = ['top', 'bottom'];
    /**
     * Names of the lines, between which the area should be plotted.
     * If the drawing of the area should
     * be disabled for some indicators, leave this option as an empty array.
     * Names should be the same as the names in the pointArrayMap.
     *
     * @private
     * @type {Array<string>}
     */
    var areaLinesNames = ['top'];
    /**
     * Main line id.
     *
     * @private
     * @type {string}
     */
    var pointValKey = 'top';
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Composition useful for all indicators that have more than one line.
     * Compose it with your implementation where you will provide the
     * `getValues` method appropriate to your indicator and `pointArrayMap`,
     * `pointValKey`, `linesApiNames` properties. Notice that `pointArrayMap`
     * should be consistent with the amount of lines calculated in the
     * `getValues` method.
     *
     * @private
     */
    function compose(IndicatorClass) {
        var proto = IndicatorClass.prototype;
        proto.linesApiNames = (proto.linesApiNames ||
            linesApiNames.slice());
        proto.pointArrayMap = (proto.pointArrayMap ||
            pointArrayMap.slice());
        proto.pointValKey = (proto.pointValKey ||
            pointValKey);
        proto.areaLinesNames = (proto.areaLinesNames ||
            areaLinesNames.slice());
        proto.drawGraph = indicatorDrawGraph;
        proto.getGraphPath = indicatorGetGraphPath;
        proto.toYData = indicatorToYData;
        proto.translate = indicatorTranslate;
        return IndicatorClass;
    }
    MultipleLinesComposition.compose = compose;
    /**
     * Generate the API name of the line
     *
     * @private
     * @param propertyName name of the line
     */
    function getLineName(propertyName) {
        return ('plot' +
            propertyName.charAt(0).toUpperCase() +
            propertyName.slice(1));
    }
    /**
     * Create translatedLines Collection based on pointArrayMap.
     *
     * @private
     * @param {string} [excludedValue]
     *        Main line id
     * @return {Array<string>}
     *         Returns translated lines names without excluded value.
     */
    function getTranslatedLinesNames(indicator, excludedValue) {
        var translatedLines = [];
        (indicator.pointArrayMap || []).forEach(function (propertyName) {
            if (propertyName !== excludedValue) {
                translatedLines.push(getLineName(propertyName));
            }
        });
        return translatedLines;
    }
    /**
     * Draw main and additional lines.
     *
     * @private
     */
    function indicatorDrawGraph() {
        var indicator = this,
            pointValKey = indicator.pointValKey,
            linesApiNames = indicator.linesApiNames,
            areaLinesNames = indicator.areaLinesNames,
            mainLinePoints = indicator.points,
            mainLineOptions = indicator.options,
            mainLinePath = indicator.graph,
            gappedExtend = {
                options: {
                    gapSize: mainLineOptions.gapSize
                }
            }, 
            // Additional lines point place holders:
            secondaryLines = [],
            secondaryLinesNames = getTranslatedLinesNames(indicator,
            pointValKey);
        var pointsLength = mainLinePoints.length,
            point;
        // Generate points for additional lines:
        secondaryLinesNames.forEach(function (plotLine, index) {
            // Create additional lines point place holders
            secondaryLines[index] = [];
            while (pointsLength--) {
                point = mainLinePoints[pointsLength];
                secondaryLines[index].push({
                    x: point.x,
                    plotX: point.plotX,
                    plotY: point[plotLine],
                    isNull: !defined(point[plotLine])
                });
            }
            pointsLength = mainLinePoints.length;
        });
        // Modify options and generate area fill:
        if (indicator.userOptions.fillColor && areaLinesNames.length) {
            var index = secondaryLinesNames.indexOf(getLineName(areaLinesNames[0])),
                secondLinePoints = secondaryLines[index],
                firstLinePoints = areaLinesNames.length === 1 ?
                    mainLinePoints :
                    secondaryLines[secondaryLinesNames.indexOf(getLineName(areaLinesNames[1]))],
                originalColor = indicator.color;
            indicator.points = firstLinePoints;
            indicator.nextPoints = secondLinePoints;
            indicator.color = indicator.userOptions.fillColor;
            indicator.options = MultipleLinesComposition_merge(mainLinePoints, gappedExtend);
            indicator.graph = indicator.area;
            indicator.fillGraph = true;
            smaProto.drawGraph.call(indicator);
            indicator.area = indicator.graph;
            // Clean temporary properties:
            delete indicator.nextPoints;
            delete indicator.fillGraph;
            indicator.color = originalColor;
        }
        // Modify options and generate additional lines:
        linesApiNames.forEach(function (lineName, i) {
            if (secondaryLines[i]) {
                indicator.points = secondaryLines[i];
                if (mainLineOptions[lineName]) {
                    indicator.options = MultipleLinesComposition_merge(mainLineOptions[lineName].styles, gappedExtend);
                }
                else {
                    MultipleLinesComposition_error('Error: "There is no ' + lineName +
                        ' in DOCS options declared. Check if linesApiNames' +
                        ' are consistent with your DOCS line names."');
                }
                indicator.graph = indicator['graph' + lineName];
                smaProto.drawGraph.call(indicator);
                // Now save lines:
                indicator['graph' + lineName] = indicator.graph;
            }
            else {
                MultipleLinesComposition_error('Error: "' + lineName + ' doesn\'t have equivalent ' +
                    'in pointArrayMap. To many elements in linesApiNames ' +
                    'relative to pointArrayMap."');
            }
        });
        // Restore options and draw a main line:
        indicator.points = mainLinePoints;
        indicator.options = mainLineOptions;
        indicator.graph = mainLinePath;
        smaProto.drawGraph.call(indicator);
    }
    /**
     * Create the path based on points provided as argument.
     * If indicator.nextPoints option is defined, create the areaFill.
     *
     * @private
     * @param points Points on which the path should be created
     */
    function indicatorGetGraphPath(points) {
        var areaPath,
            path = [],
            higherAreaPath = [];
        points = points || this.points;
        // Render Span
        if (this.fillGraph && this.nextPoints) {
            areaPath = smaProto.getGraphPath.call(this, this.nextPoints);
            if (areaPath && areaPath.length) {
                areaPath[0][0] = 'L';
                path = smaProto.getGraphPath.call(this, points);
                higherAreaPath = areaPath.slice(0, path.length);
                // Reverse points, so that the areaFill will start from the end:
                for (var i = higherAreaPath.length - 1; i >= 0; i--) {
                    path.push(higherAreaPath[i]);
                }
            }
        }
        else {
            path = smaProto.getGraphPath.apply(this, arguments);
        }
        return path;
    }
    /**
     * @private
     * @param {Highcharts.Point} point
     *        Indicator point
     * @return {Array<number>}
     *         Returns point Y value for all lines
     */
    function indicatorToYData(point) {
        var pointColl = [];
        (this.pointArrayMap || []).forEach(function (propertyName) {
            pointColl.push(point[propertyName]);
        });
        return pointColl;
    }
    /**
     * Add lines plot pixel values.
     *
     * @private
     */
    function indicatorTranslate() {
        var _this = this;
        var pointArrayMap = this.pointArrayMap;
        var LinesNames = [],
            value;
        LinesNames = getTranslatedLinesNames(this);
        smaProto.translate.apply(this, arguments);
        this.points.forEach(function (point) {
            pointArrayMap.forEach(function (propertyName, i) {
                value = point[propertyName];
                // If the modifier, like for example compare exists,
                // modified the original value by that method, #15867.
                if (_this.dataModify) {
                    value = _this.dataModify.modifyValue(value);
                }
                if (value !== null) {
                    point[LinesNames[i]] = _this.yAxis.toPixels(value, true);
                }
            });
        });
    }
})(MultipleLinesComposition || (MultipleLinesComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Indicators_MultipleLinesComposition = (MultipleLinesComposition);

;// ./code/es5/es-modules/masters/indicators/indicators.src.js






var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
G.MultipleLinesComposition =
    G.MultipleLinesComposition || Indicators_MultipleLinesComposition;
/* harmony default export */ var indicators_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});