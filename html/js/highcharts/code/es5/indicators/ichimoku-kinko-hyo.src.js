/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/ichimoku-kinko-hyo
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
		module.exports = factory(require("highcharts"), require("highcharts")["dataGrouping"]["approximations"], require("highcharts")["Color"], require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/ichimoku-kinko-hyo", [["highcharts/highcharts"], ["highcharts/highcharts","dataGrouping","approximations"], ["highcharts/highcharts","Color"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/ichimoku-kinko-hyo"] = factory(require("highcharts"), require("highcharts")["dataGrouping"]["approximations"], require("highcharts")["Color"], require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["dataGrouping"]["approximations"], root["Highcharts"]["Color"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__956__, __WEBPACK_EXTERNAL_MODULE__620__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 620:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__620__;

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
  "default": function() { return /* binding */ ichimoku_kinko_hyo_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","dataGrouping","approximations"],"commonjs":["highcharts","dataGrouping","approximations"],"commonjs2":["highcharts","dataGrouping","approximations"],"root":["Highcharts","dataGrouping","approximations"]}
var highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_ = __webpack_require__(956);
var highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default = /*#__PURE__*/__webpack_require__.n(highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Color"],"commonjs":["highcharts","Color"],"commonjs2":["highcharts","Color"],"root":["Highcharts","Color"]}
var highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_ = __webpack_require__(620);
var highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default = /*#__PURE__*/__webpack_require__.n(highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/IKH/IKHIndicator.js
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


var color = (highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default()).parse;

var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, getClosestDistance = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).getClosestDistance, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, objectEach = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).objectEach;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function maxHigh(arr) {
    return arr.reduce(function (max, res) {
        return Math.max(max, res[1]);
    }, -Infinity);
}
/**
 * @private
 */
function minLow(arr) {
    return arr.reduce(function (min, res) {
        return Math.min(min, res[2]);
    }, Infinity);
}
/**
 * @private
 */
function highlowLevel(arr) {
    return {
        high: maxHigh(arr),
        low: minLow(arr)
    };
}
/**
 * Check two lines intersection (line a1-a2 and b1-b2)
 * Source: https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
 * @private
 */
function checkLineIntersection(a1, a2, b1, b2) {
    if (a1 && a2 && b1 && b2) {
        var saX = a2.plotX - a1.plotX, // Auxiliary section a2-a1 X
            saY = a2.plotY - a1.plotY, // Auxiliary section a2-a1 Y
            sbX = b2.plotX - b1.plotX, // Auxiliary section b2-b1 X
            sbY = b2.plotY - b1.plotY, // Auxiliary section b2-b1 Y
            sabX = a1.plotX - b1.plotX, // Auxiliary section a1-b1 X
            sabY = a1.plotY - b1.plotY, // Auxiliary section a1-b1 Y
            // First degree Bézier parameters
            u = (-saY * sabX + saX * sabY) / (-sbX * saY + saX * sbY), t = (sbX * sabY - sbY * sabX) / (-sbX * saY + saX * sbY);
        if (u >= 0 && u <= 1 && t >= 0 && t <= 1) {
            return {
                plotX: a1.plotX + t * saX,
                plotY: a1.plotY + t * saY
            };
        }
    }
}
/**
 * Parameter opt (indicator options object) include indicator, points,
 * nextPoints, color, options, gappedExtend and graph properties
 * @private
 */
function drawSenkouSpan(opt) {
    var indicator = opt.indicator;
    indicator.points = opt.points;
    indicator.nextPoints = opt.nextPoints;
    indicator.color = opt.color;
    indicator.options = merge(opt.options.senkouSpan.styles, opt.gap);
    indicator.graph = opt.graph;
    indicator.fillGraph = true;
    highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.drawGraph.call(indicator);
}
/**
 * Data integrity in Ichimoku is different than default 'averages':
 * Point: [undefined, value, value, ...] is correct
 * Point: [undefined, undefined, undefined, ...] is incorrect
 * @private
 */
function ichimokuAverages() {
    var ret = [];
    var isEmptyRange;
    [].forEach.call(arguments, function (arr, i) {
        ret.push(highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default().average(arr));
        isEmptyRange = !isEmptyRange && typeof ret[i] === 'undefined';
    });
    // Return undefined when first elem. is undefined and let
    // sum method handle null (#7377)
    return isEmptyRange ? void 0 : ret;
}
/* *
 *
 *  Class
 *
 * */
/**
 * The IKH series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.ikh
 *
 * @augments Highcharts.Series
 */
var IKHIndicator = /** @class */ (function (_super) {
    __extends(IKHIndicator, _super);
    function IKHIndicator() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        /* *
         *
         *  Properties
         *
         * */
        _this.data = [];
        _this.options = {};
        _this.points = [];
        _this.graphCollection = [];
        return _this;
    }
    /* *
     *
     * Functions
     *
     * */
    IKHIndicator.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        // Set default color for lines:
        this.options = merge({
            tenkanLine: {
                styles: {
                    lineColor: this.color
                }
            },
            kijunLine: {
                styles: {
                    lineColor: this.color
                }
            },
            chikouLine: {
                styles: {
                    lineColor: this.color
                }
            },
            senkouSpanA: {
                styles: {
                    lineColor: this.color,
                    fill: color(this.color).setOpacity(0.5).get()
                }
            },
            senkouSpanB: {
                styles: {
                    lineColor: this.color,
                    fill: color(this.color).setOpacity(0.5).get()
                }
            },
            senkouSpan: {
                styles: {
                    fill: color(this.color).setOpacity(0.2).get()
                }
            }
        }, this.options);
    };
    IKHIndicator.prototype.toYData = function (point) {
        return [
            point.tenkanSen,
            point.kijunSen,
            point.chikouSpan,
            point.senkouSpanA,
            point.senkouSpanB
        ];
    };
    IKHIndicator.prototype.translate = function () {
        var indicator = this;
        highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.translate.apply(indicator);
        for (var _i = 0, _a = indicator.points; _i < _a.length; _i++) {
            var point = _a[_i];
            for (var _b = 0, _c = indicator.pointArrayMap; _b < _c.length; _b++) {
                var key = _c[_b];
                var pointValue = point[key];
                if (isNumber(pointValue)) {
                    point['plot' + key] = indicator.yAxis.toPixels(pointValue, true);
                    // Add extra parameters for support tooltip in moved
                    // lines
                    point.plotY = point['plot' + key];
                    point.tooltipPos = [
                        point.plotX,
                        point['plot' + key]
                    ];
                    point.isNull = false;
                }
            }
        }
    };
    IKHIndicator.prototype.drawGraph = function () {
        var indicator = this,
            mainLinePoints = indicator.points,
            mainLineOptions = indicator.options,
            mainLinePath = indicator.graph,
            mainColor = indicator.color,
            gappedExtend = {
                options: {
                    gapSize: mainLineOptions.gapSize
                }
            },
            pointArrayMapLength = indicator.pointArrayMap.length,
            allIchimokuPoints = [
                [],
                [],
                [],
                [],
                [],
                []
            ],
            ikhMap = {
                tenkanLine: allIchimokuPoints[0],
                kijunLine: allIchimokuPoints[1],
                chikouLine: allIchimokuPoints[2],
                senkouSpanA: allIchimokuPoints[3],
                senkouSpanB: allIchimokuPoints[4],
                senkouSpan: allIchimokuPoints[5]
            },
            intersectIndexColl = [],
            senkouSpanOptions = indicator
                .options.senkouSpan,
            color = senkouSpanOptions.color ||
                senkouSpanOptions.styles.fill,
            negativeColor = senkouSpanOptions.negativeColor, 
            // Points to create color and negativeColor senkouSpan
            points = [
                [], // Points color
                [] // Points negative color
            ], 
            // For span, we need an access to the next points, used in
            // getGraphPath()
            nextPoints = [
                [], // Next points color
                [] // Next points negative color
            ];
        var pointsLength = mainLinePoints.length,
            lineIndex = 0,
            position,
            point,
            i,
            startIntersect,
            endIntersect,
            sectionPoints,
            sectionNextPoints,
            pointsPlotYSum,
            nextPointsPlotYSum,
            senkouSpanTempColor,
            concatArrIndex,
            j,
            k;
        indicator.ikhMap = ikhMap;
        // Generate points for all lines and spans lines:
        while (pointsLength--) {
            point = mainLinePoints[pointsLength];
            for (i = 0; i < pointArrayMapLength; i++) {
                position = indicator.pointArrayMap[i];
                if (defined(point[position])) {
                    allIchimokuPoints[i].push({
                        plotX: point.plotX,
                        plotY: point['plot' + position],
                        isNull: false
                    });
                }
            }
            if (negativeColor && pointsLength !== mainLinePoints.length - 1) {
                // Check if lines intersect
                var index = ikhMap.senkouSpanB.length - 1,
                    intersect = checkLineIntersection(ikhMap.senkouSpanA[index - 1],
                    ikhMap.senkouSpanA[index],
                    ikhMap.senkouSpanB[index - 1],
                    ikhMap.senkouSpanB[index]);
                if (intersect) {
                    var intersectPointObj = {
                            plotX: intersect.plotX,
                            plotY: intersect.plotY,
                            isNull: false,
                            intersectPoint: true
                        };
                    // Add intersect point to ichimoku points collection
                    // Create senkouSpan sections
                    ikhMap.senkouSpanA.splice(index, 0, intersectPointObj);
                    ikhMap.senkouSpanB.splice(index, 0, intersectPointObj);
                    intersectIndexColl.push(index);
                }
            }
        }
        // Modify options and generate lines:
        objectEach(ikhMap, function (values, lineName) {
            if (mainLineOptions[lineName] &&
                lineName !== 'senkouSpan') {
                // First line is rendered by default option
                indicator.points = allIchimokuPoints[lineIndex];
                indicator.options = merge(mainLineOptions[lineName].styles, gappedExtend);
                indicator.graph = indicator['graph' + lineName];
                indicator.fillGraph = false;
                indicator.color = mainColor;
                highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.drawGraph.call(indicator);
                // Now save line
                indicator['graph' + lineName] = indicator.graph;
            }
            lineIndex++;
        });
        // Generate senkouSpan area:
        // If graphCollection exist then remove svg
        // element and indicator property
        if (indicator.graphCollection) {
            for (var _i = 0, _a = indicator.graphCollection; _i < _a.length; _i++) {
                var graphName = _a[_i];
                indicator[graphName].destroy();
                delete indicator[graphName];
            }
        }
        // Clean graphCollection or initialize it
        indicator.graphCollection = [];
        // When user set negativeColor property
        if (negativeColor && ikhMap.senkouSpanA[0] && ikhMap.senkouSpanB[0]) {
            // Add first and last point to senkouSpan area sections
            intersectIndexColl.unshift(0);
            intersectIndexColl.push(ikhMap.senkouSpanA.length - 1);
            // Populate points and nextPoints arrays
            for (j = 0; j < intersectIndexColl.length - 1; j++) {
                startIntersect = intersectIndexColl[j];
                endIntersect = intersectIndexColl[j + 1];
                sectionPoints = ikhMap.senkouSpanB.slice(startIntersect, endIntersect + 1);
                sectionNextPoints = ikhMap.senkouSpanA.slice(startIntersect, endIntersect + 1);
                // Add points to color or negativeColor arrays
                // Check the middle point (if exist)
                if (Math.floor(sectionPoints.length / 2) >= 1) {
                    var x = Math.floor(sectionPoints.length / 2);
                    // When middle points has equal values
                    // Compare all points plotY value sum
                    if (sectionPoints[x].plotY === sectionNextPoints[x].plotY) {
                        pointsPlotYSum = 0;
                        nextPointsPlotYSum = 0;
                        for (k = 0; k < sectionPoints.length; k++) {
                            pointsPlotYSum += sectionPoints[k].plotY;
                            nextPointsPlotYSum += sectionNextPoints[k].plotY;
                        }
                        concatArrIndex =
                            pointsPlotYSum > nextPointsPlotYSum ? 0 : 1;
                        points[concatArrIndex] = points[concatArrIndex].concat(sectionPoints);
                        nextPoints[concatArrIndex] = nextPoints[concatArrIndex].concat(sectionNextPoints);
                    }
                    else {
                        // Compare middle point of the section
                        concatArrIndex = (sectionPoints[x].plotY > sectionNextPoints[x].plotY) ? 0 : 1;
                        points[concatArrIndex] = points[concatArrIndex].concat(sectionPoints);
                        nextPoints[concatArrIndex] = nextPoints[concatArrIndex].concat(sectionNextPoints);
                    }
                }
                else {
                    // Compare first point of the section
                    concatArrIndex = (sectionPoints[0].plotY > sectionNextPoints[0].plotY) ? 0 : 1;
                    points[concatArrIndex] = points[concatArrIndex].concat(sectionPoints);
                    nextPoints[concatArrIndex] = nextPoints[concatArrIndex].concat(sectionNextPoints);
                }
            }
            // Render color and negativeColor paths
            ['graphsenkouSpanColor', 'graphsenkouSpanNegativeColor'].forEach(function (areaName, i) {
                if (points[i].length && nextPoints[i].length) {
                    senkouSpanTempColor = i === 0 ? color : negativeColor;
                    drawSenkouSpan({
                        indicator: indicator,
                        points: points[i],
                        nextPoints: nextPoints[i],
                        color: senkouSpanTempColor,
                        options: mainLineOptions,
                        gap: gappedExtend,
                        graph: indicator[areaName]
                    });
                    // Now save line
                    indicator[areaName] = indicator.graph;
                    indicator.graphCollection.push(areaName);
                }
            });
        }
        else {
            // When user set only senkouSpan style.fill property
            drawSenkouSpan({
                indicator: indicator,
                points: ikhMap.senkouSpanB,
                nextPoints: ikhMap.senkouSpanA,
                color: color,
                options: mainLineOptions,
                gap: gappedExtend,
                graph: indicator.graphsenkouSpan
            });
            // Now save line
            indicator.graphsenkouSpan = indicator.graph;
        }
        // Clean temporary properties:
        delete indicator.nextPoints;
        delete indicator.fillGraph;
        // Restore options and draw the Tenkan line:
        indicator.points = mainLinePoints;
        indicator.options = mainLineOptions;
        indicator.graph = mainLinePath;
        indicator.color = mainColor;
    };
    IKHIndicator.prototype.getGraphPath = function (points) {
        var indicator = this;
        var path = [],
            spanA,
            spanAarr = [];
        points = points || this.points;
        // Render Senkou Span
        if (indicator.fillGraph && indicator.nextPoints) {
            spanA = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.getGraphPath.call(indicator, 
            // Reverse points, so Senkou Span A will start from the end:
            indicator.nextPoints);
            if (spanA && spanA.length) {
                spanA[0][0] = 'L';
                path = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.getGraphPath
                    .call(indicator, points);
                spanAarr = spanA.slice(0, path.length);
                for (var i = spanAarr.length - 1; i >= 0; i--) {
                    path.push(spanAarr[i]);
                }
            }
        }
        else {
            path = highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().seriesTypes.sma.prototype.getGraphPath
                .apply(indicator, arguments);
        }
        return path;
    };
    IKHIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            periodTenkan = params.periodTenkan,
            periodSenkouSpanB = params.periodSenkouSpanB,
            xVal = series.xData,
            yVal = series.yData,
            xAxis = series.xAxis,
            yValLen = (yVal && yVal.length) || 0,
            closestPointRange = getClosestDistance(xAxis.series.map(function (s) { return s.getColumn('x'); })),
            IKH = [],
            xData = [];
        var date,
            slicedTSY,
            slicedKSY,
            slicedSSBY,
            pointTS,
            pointKS,
            pointSSB,
            i,
            TS,
            KS,
            CS,
            SSA,
            SSB;
        // Ikh requires close value
        if (xVal.length <= period ||
            !isArray(yVal[0]) ||
            yVal[0].length !== 4) {
            return;
        }
        // Add timestamps at the beginning
        var dateStart = xVal[0] - period * closestPointRange;
        for (i = 0; i < period; i++) {
            xData.push(dateStart + i * closestPointRange);
        }
        for (i = 0; i < yValLen; i++) {
            // Tenkan Sen
            if (i >= periodTenkan) {
                slicedTSY = yVal.slice(i - periodTenkan, i);
                pointTS = highlowLevel(slicedTSY);
                TS = (pointTS.high + pointTS.low) / 2;
            }
            if (i >= period) {
                slicedKSY = yVal.slice(i - period, i);
                pointKS = highlowLevel(slicedKSY);
                KS = (pointKS.high + pointKS.low) / 2;
                SSA = (TS + KS) / 2;
            }
            if (i >= periodSenkouSpanB) {
                slicedSSBY = yVal.slice(i - periodSenkouSpanB, i);
                pointSSB = highlowLevel(slicedSSBY);
                SSB = (pointSSB.high + pointSSB.low) / 2;
            }
            CS = yVal[i][3];
            date = xVal[i];
            if (typeof IKH[i] === 'undefined') {
                IKH[i] = [];
            }
            if (typeof IKH[i + period - 1] === 'undefined') {
                IKH[i + period - 1] = [];
            }
            IKH[i + period - 1][0] = TS;
            IKH[i + period - 1][1] = KS;
            IKH[i + period - 1][2] = void 0;
            if (typeof IKH[i + 1] === 'undefined') {
                IKH[i + 1] = [];
            }
            IKH[i + 1][2] = CS;
            if (i <= period) {
                IKH[i + period - 1][3] = void 0;
                IKH[i + period - 1][4] = void 0;
            }
            if (typeof IKH[i + 2 * period - 2] === 'undefined') {
                IKH[i + 2 * period - 2] = [];
            }
            IKH[i + 2 * period - 2][3] = SSA;
            IKH[i + 2 * period - 2][4] = SSB;
            xData.push(date);
        }
        // Add timestamps for further points
        for (i = 1; i <= period; i++) {
            xData.push(date + i * closestPointRange);
        }
        return {
            values: IKH,
            xData: xData,
            yData: IKH
        };
    };
    /**
     * Ichimoku Kinko Hyo (IKH). This series requires `linkedTo` option to be
     * set.
     *
     * @sample stock/indicators/ichimoku-kinko-hyo
     *         Ichimoku Kinko Hyo indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @excluding    allAreas, colorAxis, compare, compareBase, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/ichimoku-kinko-hyo
     * @optionparent plotOptions.ikh
     */
    IKHIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index
         */
        params: {
            index: void 0, // Unused index, do not inherit (#15362)
            period: 26,
            /**
             * The base period for Tenkan calculations.
             */
            periodTenkan: 9,
            /**
             * The base period for Senkou Span B calculations
             */
            periodSenkouSpanB: 52
        },
        marker: {
            enabled: false
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span> <b> {series.name}</b><br/>' +
                'TENKAN SEN: {point.tenkanSen:.3f}<br/>' +
                'KIJUN SEN: {point.kijunSen:.3f}<br/>' +
                'CHIKOU SPAN: {point.chikouSpan:.3f}<br/>' +
                'SENKOU SPAN A: {point.senkouSpanA:.3f}<br/>' +
                'SENKOU SPAN B: {point.senkouSpanB:.3f}<br/>'
        },
        /**
         * The styles for Tenkan line
         */
        tenkanLine: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for Kijun line
         */
        kijunLine: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for Chikou line
         */
        chikouLine: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for Senkou Span A line
         */
        senkouSpanA: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for Senkou Span B line
         */
        senkouSpanB: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line.
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * The styles for area between Senkou Span A and B.
         */
        senkouSpan: {
            /**
             * Color of the area between Senkou Span A and B,
             * when Senkou Span A is above Senkou Span B. Note that if
             * a `style.fill` is defined, the `color` takes precedence and
             * the `style.fill` is ignored.
             *
             * @see [senkouSpan.styles.fill](#series.ikh.senkouSpan.styles.fill)
             *
             * @sample stock/indicators/ichimoku-kinko-hyo
             *         Ichimoku Kinko Hyo color
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @since     7.0.0
             * @apioption plotOptions.ikh.senkouSpan.color
             */
            /**
             * Color of the area between Senkou Span A and B,
             * when Senkou Span A is under Senkou Span B.
             *
             * @sample stock/indicators/ikh-negative-color
             *         Ichimoku Kinko Hyo negativeColor
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @since     7.0.0
             * @apioption plotOptions.ikh.senkouSpan.negativeColor
             */
            styles: {
                /**
                 * Color of the area between Senkou Span A and B.
                 *
                 * @deprecated
                 * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
                 */
                fill: 'rgba(255, 0, 0, 0.5)'
            }
        },
        dataGrouping: {
            approximation: 'ichimoku-averages'
        }
    });
    return IKHIndicator;
}(SMAIndicator));
extend(IKHIndicator.prototype, {
    pointArrayMap: [
        'tenkanSen',
        'kijunSen',
        'chikouSpan',
        'senkouSpanA',
        'senkouSpanB'
    ],
    pointValKey: 'tenkanSen',
    nameComponents: ['periodSenkouSpanB', 'period', 'periodTenkan']
});
/* *
 *
 *  Registry
 *
 * */
(highcharts_dataGrouping_approximations_commonjs_highcharts_dataGrouping_approximations_commonjs2_highcharts_dataGrouping_approximations_root_Highcharts_dataGrouping_approximations_default())["ichimoku-averages"] = ichimokuAverages;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('ikh', IKHIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var IKH_IKHIndicator = ((/* unused pure expression or super */ null && (IKHIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `IKH` series. If the [type](#series.ikh.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.ikh
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/ichimoku-kinko-hyo
 * @apioption series.ikh
 */
(''); // Add doclet above to transpiled file

;// ./code/es5/es-modules/masters/indicators/ichimoku-kinko-hyo.src.js




/* harmony default export */ var ichimoku_kinko_hyo_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});