/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/macd
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
		define("highcharts/indicators/macd", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/macd"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ macd_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/MACD/MACDIndicator.js
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

var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, ColumnSeries = _a.column, SMAIndicator = _a.sma;

var extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, correctFloat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).correctFloat, defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The MACD series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.macd
 *
 * @augments Highcharts.Series
 */
var MACDIndicator = /** @class */ (function (_super) {
    __extends(MACDIndicator, _super);
    function MACDIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    MACDIndicator.prototype.init = function () {
        highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.init.apply(this, arguments);
        var originalColor = this.color;
        // Check whether series is initialized. It may be not initialized,
        // when any of required indicators is missing.
        if (this.options) {
            // If the default colour doesn't set, get the next available from
            // the array and apply it #15608.
            if (defined(this.colorIndex)) {
                if (this.options.signalLine &&
                    this.options.signalLine.styles &&
                    !this.options.signalLine.styles.lineColor) {
                    this.options.colorIndex = this.colorIndex + 1;
                    this.getCyclic('color', void 0, this.chart.options.colors);
                    this.options.signalLine.styles.lineColor =
                        this.color;
                }
                if (this.options.macdLine &&
                    this.options.macdLine.styles &&
                    !this.options.macdLine.styles.lineColor) {
                    this.options.colorIndex = this.colorIndex + 1;
                    this.getCyclic('color', void 0, this.chart.options.colors);
                    this.options.macdLine.styles.lineColor =
                        this.color;
                }
            }
            // Zones have indexes automatically calculated, we need to
            // translate them to support multiple lines within one indicator
            this.macdZones = {
                zones: this.options.macdLine.zones,
                startIndex: 0
            };
            this.signalZones = {
                zones: this.macdZones.zones.concat(this.options.signalLine.zones),
                startIndex: this.macdZones.zones.length
            };
        }
        // Reset color and index #15608.
        this.color = originalColor;
    };
    MACDIndicator.prototype.toYData = function (point) {
        return [point.y, point.signal, point.MACD];
    };
    MACDIndicator.prototype.translate = function () {
        var indicator = this, plotNames = ['plotSignal', 'plotMACD'];
        highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default().seriesTypes.column.prototype.translate.apply(indicator);
        indicator.points.forEach(function (point) {
            [point.signal, point.MACD].forEach(function (value, i) {
                if (value !== null) {
                    point[plotNames[i]] =
                        indicator.yAxis.toPixels(value, true);
                }
            });
        });
    };
    MACDIndicator.prototype.destroy = function () {
        // This.graph is null due to removing two times the same SVG element
        this.graph = null;
        this.graphmacd = this.graphmacd && this.graphmacd.destroy();
        this.graphsignal = this.graphsignal && this.graphsignal.destroy();
        highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.destroy.apply(this, arguments);
    };
    MACDIndicator.prototype.drawGraph = function () {
        var indicator = this,
            mainLinePoints = indicator.points,
            mainLineOptions = indicator.options,
            histogramZones = indicator.zones,
            gappedExtend = {
                options: {
                    gapSize: mainLineOptions.gapSize
                }
            },
            otherSignals = [[],
            []];
        var point,
            pointsLength = mainLinePoints.length;
        // Generate points for top and bottom lines:
        while (pointsLength--) {
            point = mainLinePoints[pointsLength];
            if (defined(point.plotMACD)) {
                otherSignals[0].push({
                    plotX: point.plotX,
                    plotY: point.plotMACD,
                    isNull: !defined(point.plotMACD)
                });
            }
            if (defined(point.plotSignal)) {
                otherSignals[1].push({
                    plotX: point.plotX,
                    plotY: point.plotSignal,
                    isNull: !defined(point.plotMACD)
                });
            }
        }
        // Modify options and generate smoothing line:
        ['macd', 'signal'].forEach(function (lineName, i) {
            var _a;
            indicator.points = otherSignals[i];
            indicator.options = merge(((_a = mainLineOptions["" + lineName + "Line"]) === null || _a === void 0 ? void 0 : _a.styles) || {}, gappedExtend);
            indicator.graph = indicator["graph".concat(lineName)];
            // Zones extension:
            indicator.zones = (indicator["" + lineName + "Zones"].zones || []).slice(indicator["" + lineName + "Zones"].startIndex || 0);
            highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.drawGraph.call(indicator);
            indicator["graph".concat(lineName)] = indicator.graph;
        });
        // Restore options:
        indicator.points = mainLinePoints;
        indicator.options = mainLineOptions;
        indicator.zones = histogramZones;
    };
    MACDIndicator.prototype.applyZones = function () {
        // Histogram zones are handled by drawPoints method
        // Here we need to apply zones for all lines
        var histogramZones = this.zones;
        // `signalZones.zones` contains all zones:
        this.zones = this.signalZones.zones;
        highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.applyZones.call(this);
        // `applyZones` hides only main series.graph, hide macd line manually
        if (this.graphmacd && this.options.macdLine.zones.length) {
            this.graphmacd.hide();
        }
        this.zones = histogramZones;
    };
    MACDIndicator.prototype.getValues = function (series, params) {
        var indexToShift = (params.longPeriod - params.shortPeriod), // #14197
            MACD = [],
            xMACD = [],
            yMACD = [];
        var shortEMA,
            longEMA,
            i,
            j = 0,
            signalLine = [];
        if (series.xData.length <
            params.longPeriod + params.signalPeriod) {
            return;
        }
        // Calculating the short and long EMA used when calculating the MACD
        shortEMA = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.ema.prototype.getValues(series, {
            period: params.shortPeriod,
            index: params.index
        });
        longEMA = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.ema.prototype.getValues(series, {
            period: params.longPeriod,
            index: params.index
        });
        shortEMA = shortEMA.values;
        longEMA = longEMA.values;
        // Subtract each Y value from the EMA's and create the new dataset
        // (MACD)
        for (i = 0; i <= shortEMA.length; i++) {
            if (defined(longEMA[i]) &&
                defined(longEMA[i][1]) &&
                defined(shortEMA[i + indexToShift]) &&
                defined(shortEMA[i + indexToShift][0])) {
                MACD.push([
                    shortEMA[i + indexToShift][0],
                    0,
                    null,
                    shortEMA[i + indexToShift][1] -
                        longEMA[i][1]
                ]);
            }
        }
        // Set the Y and X data of the MACD. This is used in calculating the
        // signal line.
        for (i = 0; i < MACD.length; i++) {
            xMACD.push(MACD[i][0]);
            yMACD.push([0, null, MACD[i][3]]);
        }
        // Setting the signalline (Signal Line: X-day EMA of MACD line).
        signalLine = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.ema.prototype.getValues({
            xData: xMACD,
            yData: yMACD
        }, {
            period: params.signalPeriod,
            index: 2
        });
        signalLine = signalLine.values;
        // Setting the MACD Histogram. In comparison to the loop with pure
        // MACD this loop uses MACD x value not xData.
        for (i = 0; i < MACD.length; i++) {
            // Detect the first point
            if (MACD[i][0] >= signalLine[0][0]) {
                MACD[i][2] = signalLine[j][1];
                yMACD[i] = [0, signalLine[j][1], MACD[i][3]];
                if (MACD[i][3] === null) {
                    MACD[i][1] = 0;
                    yMACD[i][0] = 0;
                }
                else {
                    MACD[i][1] = correctFloat(MACD[i][3] -
                        signalLine[j][1]);
                    yMACD[i][0] = correctFloat(MACD[i][3] -
                        signalLine[j][1]);
                }
                j++;
            }
        }
        return {
            values: MACD,
            xData: xMACD,
            yData: yMACD
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Moving Average Convergence Divergence (MACD). This series requires
     * `linkedTo` option to be set and should be loaded after the
     * `stock/indicators/indicators.js`.
     *
     * @sample stock/indicators/macd
     *         MACD indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/macd
     * @optionparent plotOptions.macd
     */
    MACDIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        params: {
            /**
             * The short period for indicator calculations.
             */
            shortPeriod: 12,
            /**
             * The long period for indicator calculations.
             */
            longPeriod: 26,
            /**
             * The base period for signal calculations.
             */
            signalPeriod: 9,
            period: 26
        },
        /**
         * The styles for signal line
         */
        signalLine: {
            /**
             * @sample stock/indicators/macd-zones
             *         Zones in MACD
             *
             * @extends plotOptions.macd.zones
             */
            zones: [],
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type  {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for macd line
         */
        macdLine: {
            /**
             * @sample stock/indicators/macd-zones
             *         Zones in MACD
             *
             * @extends plotOptions.macd.zones
             */
            zones: [],
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type  {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * @type {number|null}
         */
        threshold: 0,
        groupPadding: 0.1,
        pointPadding: 0.1,
        crisp: false,
        states: {
            hover: {
                halo: {
                    size: 0
                }
            }
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span> <b> {series.name}</b><br/>' +
                'Value: {point.MACD}<br/>' +
                'Signal: {point.signal}<br/>' +
                'Histogram: {point.y}<br/>'
        },
        dataGrouping: {
            approximation: 'averages'
        },
        minPointLength: 0
    });
    return MACDIndicator;
}(SMAIndicator));
extend(MACDIndicator.prototype, {
    nameComponents: ['longPeriod', 'shortPeriod', 'signalPeriod'],
    // "y" value is treated as Histogram data
    pointArrayMap: ['y', 'signal', 'MACD'],
    parallelArrays: ['x', 'y', 'signal', 'MACD'],
    pointValKey: 'y',
    // Columns support:
    markerAttribs: noop,
    getColumnMetrics: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).seriesTypes.column.prototype.getColumnMetrics,
    crispCol: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).seriesTypes.column.prototype.crispCol,
    drawPoints: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).seriesTypes.column.prototype.drawPoints
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('macd', MACDIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MACD_MACDIndicator = ((/* unused pure expression or super */ null && (MACDIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `MACD` series. If the [type](#series.macd.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.macd
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/macd
 * @apioption series.macd
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/masters/indicators/macd.src.js




/* harmony default export */ var macd_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});