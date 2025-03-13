/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/keltner-channels
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Daniel Studencki
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/keltner-channels", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/keltner-channels"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ keltner_channels_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
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

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
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
            indicator.options = merge(mainLinePoints, gappedExtend);
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
                    indicator.options = merge(mainLineOptions[lineName].styles, gappedExtend);
                }
                else {
                    error('Error: "There is no ' + lineName +
                        ' in DOCS options declared. Check if linesApiNames' +
                        ' are consistent with your DOCS line names."');
                }
                indicator.graph = indicator['graph' + lineName];
                smaProto.drawGraph.call(indicator);
                // Now save lines:
                indicator['graph' + lineName] = indicator.graph;
            }
            else {
                error('Error: "' + lineName + ' doesn\'t have equivalent ' +
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

;// ./code/es5/es-modules/Stock/Indicators/KeltnerChannels/KeltnerChannelsIndicator.js
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


var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var correctFloat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).correctFloat, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, KeltnerChannelsIndicator_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Keltner Channels series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.keltnerchannels
 *
 * @augments Highcharts.Series
 */
var KeltnerChannelsIndicator = /** @class */ (function (_super) {
    __extends(KeltnerChannelsIndicator, _super);
    function KeltnerChannelsIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    KeltnerChannelsIndicator.prototype.init = function () {
        highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.init.apply(this, arguments);
        // Set default color for lines:
        this.options = KeltnerChannelsIndicator_merge({
            topLine: {
                styles: {
                    lineColor: this.color
                }
            },
            bottomLine: {
                styles: {
                    lineColor: this.color
                }
            }
        }, this.options);
    };
    KeltnerChannelsIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            periodATR = params.periodATR,
            multiplierATR = params.multiplierATR,
            index = params.index,
            yVal = series.yData,
            yValLen = yVal ? yVal.length : 0, 
            // Keltner Channels array structure:
            // 0-date, 1-top line, 2-middle line, 3-bottom line
            KC = [],
            seriesEMA = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.ema.prototype.getValues(series, {
                period: period,
                index: index
            }),
            seriesATR = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.atr.prototype.getValues(series, {
                period: periodATR
            }),
            xData = [],
            yData = [];
        // Middle line, top line and bottom lineI
        var ML,
            TL,
            BL,
            date,
            pointEMA,
            pointATR,
            i;
        if (yValLen < period) {
            return;
        }
        for (i = period; i <= yValLen; i++) {
            pointEMA = seriesEMA.values[i - period];
            pointATR = seriesATR.values[i - periodATR];
            date = pointEMA[0];
            TL = correctFloat(pointEMA[1] + (multiplierATR * pointATR[1]));
            BL = correctFloat(pointEMA[1] - (multiplierATR * pointATR[1]));
            ML = pointEMA[1];
            KC.push([date, TL, ML, BL]);
            xData.push(date);
            yData.push([TL, ML, BL]);
        }
        return {
            values: KC,
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
     * Keltner Channels. This series requires the `linkedTo` option to be set
     * and should be loaded after the `stock/indicators/indicators.js`,
     * `stock/indicators/atr.js`, and `stock/ema/.js`.
     *
     * @sample {highstock} stock/indicators/keltner-channels
     *         Keltner Channels
     *
     * @extends      plotOptions.sma
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, compare, compareBase, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart,showInNavigator,
     *               stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/keltner-channels
     * @optionparent plotOptions.keltnerchannels
     */
    KeltnerChannelsIndicator.defaultOptions = KeltnerChannelsIndicator_merge(SMAIndicator.defaultOptions, {
        /**
         * Option for fill color between lines in Keltner Channels Indicator.
         *
         * @sample {highstock} stock/indicators/indicator-area-fill
         *      Background fill between lines.
         *
         * @type {Highcharts.Color}
         * @since 9.3.2
         * @apioption plotOptions.keltnerchannels.fillColor
         *
         */
        params: {
            /**
             * The point index which indicator calculations will base. For
             * example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             */
            index: 0,
            period: 20,
            /**
             * The ATR period.
             */
            periodATR: 10,
            /**
             * The ATR multiplier.
             */
            multiplierATR: 2
        },
        /**
         * Bottom line options.
         *
         */
        bottomLine: {
            /**
             * Styles for a bottom line.
             *
             */
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line. If not set, it's inherited from
                 * `plotOptions.keltnerchannels.color`
                 */
                lineColor: void 0
            }
        },
        /**
         * Top line options.
         *
         * @extends plotOptions.keltnerchannels.bottomLine
         */
        topLine: {
            styles: {
                lineWidth: 1,
                lineColor: void 0
            }
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span><b> {series.name}</b><br/>Upper Channel: {point.top}<br/>EMA({series.options.params.period}): {point.middle}<br/>Lower Channel: {point.bottom}<br/>'
        },
        marker: {
            enabled: false
        },
        dataGrouping: {
            approximation: 'averages'
        },
        lineWidth: 1
    });
    return KeltnerChannelsIndicator;
}(SMAIndicator));
extend(KeltnerChannelsIndicator.prototype, {
    nameBase: 'Keltner Channels',
    areaLinesNames: ['top', 'bottom'],
    nameComponents: ['period', 'periodATR', 'multiplierATR'],
    linesApiNames: ['topLine', 'bottomLine'],
    pointArrayMap: ['top', 'middle', 'bottom'],
    pointValKey: 'middle'
});
Indicators_MultipleLinesComposition.compose(KeltnerChannelsIndicator);
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('keltnerchannels', KeltnerChannelsIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var KeltnerChannels_KeltnerChannelsIndicator = ((/* unused pure expression or super */ null && (KeltnerChannelsIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A Keltner Channels indicator. If the [type](#series.keltnerchannels.type)
 * option is not specified, it is inherited from[chart.type](#chart.type).
 *
 * @extends      series,plotOptions.keltnerchannels
 * @since        7.0.0
 * @product      highstock
 * @excluding    allAreas, colorAxis, compare, compareBase, dataParser, dataURL,
 *               joinBy, keys, navigatorOptions, pointInterval,
 *               pointIntervalUnit, pointPlacement, pointRange, pointStart,
 *               stacking, showInNavigator
 * @requires     stock/indicators/indicators
 * @requires     stock/indicators/keltner-channels
 * @apioption    series.keltnerchannels
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/masters/indicators/keltner-channels.src.js




/* harmony default export */ var keltner_channels_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});