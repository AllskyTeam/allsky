/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/series-label
 * @requires highcharts
 *
 * (c) 2009-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["Templating"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/series-label", [["highcharts/highcharts"], ["highcharts/highcharts","Templating"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/series-label"] = factory(require("highcharts"), require("highcharts")["Templating"]);
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
  "default": function() { return /* binding */ series_label_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Templating"],"commonjs":["highcharts","Templating"],"commonjs2":["highcharts","Templating"],"root":["Highcharts","Templating"]}
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_ = __webpack_require__(984);
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default = /*#__PURE__*/__webpack_require__.n(highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_);
;// ./code/es5/es-modules/Extensions/SeriesLabel/SeriesLabelDefaults.js
/* *
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Constants
 *
 * */
/**
 * Series labels are placed as close to the series as possible in a
 * natural way, seeking to avoid other series. The goal of this
 * feature is to make the chart more easily readable, like if a
 * human designer placed the labels in the optimal position.
 *
 * The series labels currently work with series types having a
 * `graph` or an `area`.
 *
 * @sample highcharts/series-label/line-chart
 *         Line chart
 * @sample highcharts/demo/streamgraph
 *         Stream graph
 * @sample highcharts/series-label/stock-chart
 *         Stock chart
 *
 * @declare  Highcharts.SeriesLabelOptionsObject
 * @since    6.0.0
 * @product  highcharts highstock gantt
 * @requires modules/series-label
 * @optionparent plotOptions.series.label
 */
var SeriesLabelDefaults = {
    /**
     * Enable the series label per series.
     */
    enabled: true,
    /**
     * Allow labels to be placed distant to the graph if necessary,
     * and draw a connector line to the graph. Setting this option
     * to true may decrease the performance significantly, since the
     * algorithm with systematically search for open spaces in the
     * whole plot area. Visually, it may also result in a more
     * cluttered chart, though more of the series will be labeled.
     */
    connectorAllowed: false,
    /**
     * If the label is closer than this to a neighbour graph, draw a
     * connector.
     */
    connectorNeighbourDistance: 24,
    /**
     * A format string for the label, with support for a subset of
     * HTML. Variables are enclosed by curly brackets. Available
     * variables are `name`, `options.xxx`, `color` and other
     * members from the `series` object. Use this option also to set
     * a static text for the label.
     *
     * @type string
     * @since 8.1.0
     */
    format: void 0,
    /**
     * Callback function to format each of the series' labels. The
     * `this` keyword refers to the series object. By default the
     * `formatter` is undefined and the `series.name` is rendered.
     *
     * @type {Highcharts.FormatterCallbackFunction<Series>}
     * @since 8.1.0
     */
    formatter: void 0,
    /**
     * For area-like series, allow the font size to vary so that
     * small areas get a smaller font size. The default applies this
     * effect to area-like series but not line-like series.
     *
     * @sample highcharts/demo/streamgraph
     *         Min and max font size on a streamgraph
     * @type   {number|null}
     */
    minFontSize: null,
    /**
     * For area-like series, allow the font size to vary so that
     * small areas get a smaller font size. The default applies this
     * effect to area-like series but not line-like series.
     *
     * @sample highcharts/demo/streamgraph
     *         Min and max font size on a streamgraph
     *
     * @type   {number|null}
     */
    maxFontSize: null,
    /**
     * Draw the label on the area of an area series. By default it
     * is drawn on the area. Set it to `false` to draw it next to
     * the graph instead.
     *
     * @type {boolean|null}
     */
    onArea: null,
    /**
     * Styles for the series label. The color defaults to the series
     * color, or a contrast color if `onArea`.
     *
     * @type {Highcharts.CSSObject}
     */
    style: {
        /**
         * @type {number|string}
         */
        fontSize: '0.8em',
        /** @internal */
        fontWeight: 'bold'
    },
    /**
     * Whether to use HTML to render the series label.
     */
    useHTML: false,
    /**
     * An array of boxes to avoid when laying out the labels. Each
     * item has a `left`, `right`, `top` and `bottom` property.
     *
     * @type {Array<Highcharts.LabelIntersectBoxObject>}
     */
    boxesToAvoid: []
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var SeriesLabel_SeriesLabelDefaults = (SeriesLabelDefaults);

;// ./code/es5/es-modules/Extensions/SeriesLabel/SeriesLabelUtilities.js
/* *
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Functions
 *
 * */
/**
 * Counter-clockwise, part of the fast line intersection logic.
 *
 * @private
 * @function ccw
 */
function ccw(x1, y1, x2, y2, x3, y3) {
    var cw = ((y3 - y1) * (x2 - x1)) - ((y2 - y1) * (x3 - x1));
    return cw > 0 ? true : !(cw < 0);
}
/**
 * Detect if two lines intersect.
 *
 * @private
 * @function intersectLine
 */
function intersectLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    return ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
        ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4);
}
/**
 * Detect if a box intersects with a line.
 *
 * @private
 * @function boxIntersectLine
 */
function boxIntersectLine(x, y, w, h, x1, y1, x2, y2) {
    return (intersectLine(x, y, x + w, y, x1, y1, x2, y2) || // Top of label
        intersectLine(x + w, y, x + w, y + h, x1, y1, x2, y2) || // Right
        intersectLine(x, y + h, x + w, y + h, x1, y1, x2, y2) || // Bottom
        intersectLine(x, y, x, y + h, x1, y1, x2, y2) // Left of label
    );
}
/**
 * @private
 */
function intersectRect(r1, r2) {
    return !(r2.left > r1.right ||
        r2.right < r1.left ||
        r2.top > r1.bottom ||
        r2.bottom < r1.top);
}
/* *
 *
 *  Default Export
 *
 * */
var SeriesLabelUtilities = {
    boxIntersectLine: boxIntersectLine,
    intersectRect: intersectRect
};
/* harmony default export */ var SeriesLabel_SeriesLabelUtilities = (SeriesLabelUtilities);

;// ./code/es5/es-modules/Extensions/SeriesLabel/SeriesLabel.js
/* *
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
/*
 * Highcharts module to place labels next to a series in a natural position.
 *
 * TODO:
 * - add column support (box collision detection, boxesToAvoid logic)
 * - add more options (connector, format, formatter)
 *
 * https://jsfiddle.net/highcharts/L2u9rpwr/
 * https://jsfiddle.net/highcharts/y5A37/
 * https://jsfiddle.net/highcharts/264Nm/
 * https://jsfiddle.net/highcharts/y5A37/
 */

var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject;

var format = (highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default()).format;

var setOptions = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).setOptions;

var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;


var SeriesLabel_boxIntersectLine = SeriesLabel_SeriesLabelUtilities.boxIntersectLine, SeriesLabel_intersectRect = SeriesLabel_SeriesLabelUtilities.intersectRect;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique, syncTimeout = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).syncTimeout;
/* *
 *
 *  Constants
 *
 * */
var labelDistance = 3;
/* *
 *
 *  Functions
 *
 * */
/**
 * Check whether a proposed label position is clear of other elements.
 * @private
 */
function checkClearPoint(series, x, y, bBox, checkDistance) {
    var chart = series.chart,
        seriesLabelOptions = series.options.label || {},
        onArea = pick(seriesLabelOptions.onArea, !!series.area),
        findDistanceToOthers = (onArea || seriesLabelOptions.connectorAllowed),
        leastDistance = 16,
        boxesToAvoid = chart.boxesToAvoid;
    var distToOthersSquared = Number.MAX_VALUE, // Distance to other graphs
        distToPointSquared = Number.MAX_VALUE,
        dist,
        connectorPoint,
        withinRange,
        xDist,
        yDist,
        i,
        j;
    /**
     * Get the weight in order to determine the ideal position. Larger distance
     * to other series gives more weight. Smaller distance to the actual point
     * (connector points only) gives more weight.
     * @private
     */
    function getWeight(distToOthersSquared, distToPointSquared) {
        return distToOthersSquared - distToPointSquared;
    }
    // First check for collision with existing labels
    for (i = 0; boxesToAvoid && i < boxesToAvoid.length; i += 1) {
        if (SeriesLabel_intersectRect(boxesToAvoid[i], {
            left: x,
            right: x + bBox.width,
            top: y,
            bottom: y + bBox.height
        })) {
            return false;
        }
    }
    // For each position, check if the lines around the label intersect with any
    // of the graphs.
    for (i = 0; i < chart.series.length; i += 1) {
        var serie = chart.series[i],
            points = serie.interpolatedPoints && __spreadArray([],
            serie.interpolatedPoints,
            true);
        if (serie.visible && points) {
            // Avoid the sides of the plot area
            var stepY = chart.plotHeight / 10;
            for (var chartY = chart.plotTop; chartY <= chart.plotTop + chart.plotHeight; chartY += stepY) {
                points.unshift({
                    chartX: chart.plotLeft,
                    chartY: chartY
                });
                points.push({
                    chartX: chart.plotLeft + chart.plotWidth,
                    chartY: chartY
                });
            }
            for (j = 1; j < points.length; j += 1) {
                if (
                // To avoid processing, only check intersection if the X
                // values are close to the box.
                points[j].chartX >= x - leastDistance &&
                    points[j - 1].chartX <= x + bBox.width +
                        leastDistance
                /* @todo condition above is not the same as below
                (
                    points[j].chartX >=
                    (x - leastDistance)
                ) && (
                    points[j - 1].chartX <=
                    (x + bBox.width + leastDistance)
                ) */
                ) {
                    // If any of the box sides intersect with the line, return.
                    if (SeriesLabel_boxIntersectLine(x, y, bBox.width, bBox.height, points[j - 1].chartX, points[j - 1].chartY, points[j].chartX, points[j].chartY)) {
                        return false;
                    }
                    // But if it is too far away (a padded box doesn't
                    // intersect), also return.
                    if (series === serie && !withinRange && checkDistance) {
                        withinRange = SeriesLabel_boxIntersectLine(x - leastDistance, y - leastDistance, bBox.width + 2 * leastDistance, bBox.height + 2 * leastDistance, points[j - 1].chartX, points[j - 1].chartY, points[j].chartX, points[j].chartY);
                    }
                }
                // Find the squared distance from the center of the label. On
                // area series, avoid its own graph.
                if ((findDistanceToOthers || withinRange) &&
                    (series !== serie || onArea)) {
                    xDist = x + bBox.width / 2 - points[j].chartX;
                    yDist = y + bBox.height / 2 - points[j].chartY;
                    distToOthersSquared = Math.min(distToOthersSquared, xDist * xDist + yDist * yDist);
                }
            }
            // Do we need a connector?
            if (!onArea &&
                findDistanceToOthers &&
                series === serie &&
                ((checkDistance && !withinRange) ||
                    distToOthersSquared < Math.pow(seriesLabelOptions.connectorNeighbourDistance || 1, 2))) {
                for (j = 1; j < points.length; j += 1) {
                    dist = Math.min((Math.pow(x + bBox.width / 2 - points[j].chartX, 2) +
                        Math.pow(y + bBox.height / 2 - points[j].chartY, 2)), (Math.pow(x - points[j].chartX, 2) +
                        Math.pow(y - points[j].chartY, 2)), (Math.pow(x + bBox.width - points[j].chartX, 2) +
                        Math.pow(y - points[j].chartY, 2)), (Math.pow(x + bBox.width - points[j].chartX, 2) +
                        Math.pow(y + bBox.height - points[j].chartY, 2)), (Math.pow(x - points[j].chartX, 2) +
                        Math.pow(y + bBox.height - points[j].chartY, 2)));
                    if (dist < distToPointSquared) {
                        distToPointSquared = dist;
                        connectorPoint = points[j];
                    }
                }
                withinRange = true;
            }
        }
    }
    return !checkDistance || withinRange ? {
        x: x,
        y: y,
        weight: getWeight(distToOthersSquared, connectorPoint ? distToPointSquared : 0),
        connectorPoint: connectorPoint
    } : false;
}
/**
 * @private
 */
function compose(ChartClass, SVGRendererClass) {
    if (pushUnique(composed, 'SeriesLabel')) {
        // Leave both events, we handle animation differently (#9815)
        addEvent(ChartClass, 'load', onChartRedraw);
        addEvent(ChartClass, 'redraw', onChartRedraw);
        SVGRendererClass.prototype.symbols.connector = symbolConnector;
        setOptions({ plotOptions: { series: { label: SeriesLabel_SeriesLabelDefaults } } });
    }
}
/**
 * The main initialize method that runs on chart level after initialization and
 * redraw. It runs in  a timeout to prevent locking, and loops over all series,
 * taking all series and labels into account when placing the labels.
 *
 * @private
 * @function Highcharts.Chart#drawSeriesLabels
 */
function drawSeriesLabels(chart) {
    // Console.time('drawSeriesLabels');
    chart.boxesToAvoid = [];
    var labelSeries = chart.labelSeries || [],
        boxesToAvoid = chart.boxesToAvoid;
    // Avoid data labels
    chart.series.forEach(function (s) {
        return (s.points || []).forEach(function (p) {
            return (p.dataLabels || []).forEach(function (label) {
                var _a = label.getBBox(),
                    width = _a.width,
                    height = _a.height,
                    left = (label.translateX || 0) + (s.xAxis ? s.xAxis.pos : s.chart.plotLeft),
                    top = (label.translateY || 0) + (s.yAxis ? s.yAxis.pos : s.chart.plotTop);
                boxesToAvoid.push({
                    left: left,
                    top: top,
                    right: left + width,
                    bottom: top + height
                });
            });
        });
    });
    // Build the interpolated points
    labelSeries.forEach(function (series) {
        var seriesLabelOptions = series.options.label || {};
        series.interpolatedPoints = getPointsOnGraph(series);
        boxesToAvoid.push.apply(boxesToAvoid, (seriesLabelOptions.boxesToAvoid || []));
    });
    chart.series.forEach(function (series) {
        var _a,
            _b;
        var labelOptions = series.options.label;
        if (!labelOptions || (!series.xAxis && !series.yAxis)) {
            return;
        }
        var colorClass = ('highcharts-color-' + pick(series.colorIndex, 'none')), isNew = !series.labelBySeries, minFontSize = labelOptions.minFontSize, maxFontSize = labelOptions.maxFontSize, inverted = chart.inverted, paneLeft = (inverted ? series.yAxis.pos : series.xAxis.pos), paneTop = (inverted ? series.xAxis.pos : series.yAxis.pos), paneWidth = chart.inverted ? series.yAxis.len : series.xAxis.len, paneHeight = chart.inverted ? series.xAxis.len : series.yAxis.len, points = series.interpolatedPoints, onArea = pick(labelOptions.onArea, !!series.area), results = [], xData = series.getColumn('x');
        var bBox,
            x,
            y,
            clearPoint,
            i,
            best,
            label = series.labelBySeries,
            dataExtremes,
            areaMin,
            areaMax;
        // Stay within the area data bounds (#10038)
        if (onArea && !inverted) {
            dataExtremes = [
                series.xAxis.toPixels(xData[0]),
                series.xAxis.toPixels(xData[xData.length - 1])
            ];
            areaMin = Math.min.apply(Math, dataExtremes);
            areaMax = Math.max.apply(Math, dataExtremes);
        }
        /**
         * @private
         */
        function insidePane(x, y, bBox) {
            var leftBound = Math.max(paneLeft,
                pick(areaMin, -Infinity)),
                rightBound = Math.min(paneLeft + paneWidth,
                pick(areaMax,
                Infinity));
            return (x > leftBound &&
                x <= rightBound - bBox.width &&
                y >= paneTop &&
                y <= paneTop + paneHeight - bBox.height);
        }
        /**
         * @private
         */
        function destroyLabel() {
            if (label) {
                series.labelBySeries = label.destroy();
            }
        }
        if (series.visible && !series.boosted && points) {
            if (!label) {
                var labelText = series.name;
                if (typeof labelOptions.format === 'string') {
                    labelText = format(labelOptions.format, series, chart);
                }
                else if (labelOptions.formatter) {
                    labelText = labelOptions.formatter.call(series);
                }
                series.labelBySeries = label = chart.renderer
                    .label(labelText, 0, 0, 'connector', 0, 0, labelOptions.useHTML)
                    .addClass('highcharts-series-label ' +
                    'highcharts-series-label-' + series.index + ' ' +
                    (series.options.className || '') + ' ' +
                    colorClass);
                if (!chart.renderer.styledMode) {
                    var color = typeof series.color === 'string' ?
                            series.color : "#666666" /* Palette.neutralColor60 */;
                    label.css(extend({
                        color: onArea ?
                            chart.renderer.getContrast(color) :
                            color
                    }, labelOptions.style || {}));
                    label.attr({
                        opacity: chart.renderer.forExport ? 1 : 0,
                        stroke: series.color,
                        'stroke-width': 1
                    });
                }
                // Adapt label sizes to the sum of the data
                if (minFontSize && maxFontSize) {
                    label.css({
                        fontSize: labelFontSize(series, minFontSize, maxFontSize)
                    });
                }
                label
                    .attr({
                    padding: 0,
                    zIndex: 3
                })
                    .add();
            }
            bBox = label.getBBox();
            bBox.width = Math.round(bBox.width);
            // Ideal positions are centered above or below a point on right side
            // of chart
            for (i = points.length - 1; i > 0; i -= 1) {
                if (onArea) {
                    // Centered
                    x = ((_a = points[i].chartCenterX) !== null && _a !== void 0 ? _a : points[i].chartX) -
                        bBox.width / 2;
                    y = ((_b = points[i].chartCenterY) !== null && _b !== void 0 ? _b : points[i].chartY) -
                        bBox.height / 2;
                    if (insidePane(x, y, bBox)) {
                        best = checkClearPoint(series, x, y, bBox);
                    }
                    if (best) {
                        results.push(best);
                    }
                }
                else {
                    // Right - up
                    x = points[i].chartX + labelDistance;
                    y = points[i].chartY - bBox.height - labelDistance;
                    if (insidePane(x, y, bBox)) {
                        best = checkClearPoint(series, x, y, bBox, true);
                    }
                    if (best) {
                        results.push(best);
                    }
                    // Right - down
                    x = points[i].chartX + labelDistance;
                    y = points[i].chartY + labelDistance;
                    if (insidePane(x, y, bBox)) {
                        best = checkClearPoint(series, x, y, bBox, true);
                    }
                    if (best) {
                        results.push(best);
                    }
                    // Left - down
                    x = points[i].chartX - bBox.width - labelDistance;
                    y = points[i].chartY + labelDistance;
                    if (insidePane(x, y, bBox)) {
                        best = checkClearPoint(series, x, y, bBox, true);
                    }
                    if (best) {
                        results.push(best);
                    }
                    // Left - up
                    x = points[i].chartX - bBox.width - labelDistance;
                    y = points[i].chartY - bBox.height - labelDistance;
                    if (insidePane(x, y, bBox)) {
                        best = checkClearPoint(series, x, y, bBox, true);
                    }
                    if (best) {
                        results.push(best);
                    }
                }
            }
            // Brute force, try all positions on the chart in a 16x16 grid
            if (labelOptions.connectorAllowed && !results.length && !onArea) {
                for (x = paneLeft + paneWidth - bBox.width; x >= paneLeft; x -= 16) {
                    for (y = paneTop; y < paneTop + paneHeight - bBox.height; y += 16) {
                        clearPoint = checkClearPoint(series, x, y, bBox, true);
                        if (clearPoint) {
                            results.push(clearPoint);
                        }
                    }
                }
            }
            if (results.length) {
                results.sort(function (a, b) { return b.weight - a.weight; });
                best = results[0];
                (chart.boxesToAvoid || []).push({
                    left: best.x,
                    right: best.x + bBox.width,
                    top: best.y,
                    bottom: best.y + bBox.height
                });
                // Move it if needed
                var dist = Math.sqrt(Math.pow(Math.abs(best.x - (label.x || 0)), 2) +
                        Math.pow(Math.abs(best.y - (label.y || 0)), 2));
                if (dist && series.labelBySeries) {
                    // Move fast and fade in - pure animation movement is
                    // distractive...
                    var attr = {
                            opacity: chart.renderer.forExport ? 1 : 0,
                            x: best.x,
                            y: best.y
                        },
                        anim = {
                            opacity: 1
                        };
                    // ... unless we're just moving a short distance
                    if (dist <= 10) {
                        anim = {
                            x: attr.x,
                            y: attr.y
                        };
                        attr = {};
                    }
                    // Default initial animation to a fraction of the series
                    // animation (#9396)
                    var animationOptions = void 0;
                    if (isNew) {
                        animationOptions = animObject(series.options.animation);
                        animationOptions.duration *= 0.2;
                    }
                    series.labelBySeries
                        .attr(extend(attr, {
                        anchorX: best.connectorPoint &&
                            (best.connectorPoint.plotX || 0) + paneLeft,
                        anchorY: best.connectorPoint &&
                            (best.connectorPoint.plotY || 0) + paneTop
                    }))
                        .animate(anim, animationOptions);
                    // Record closest point to stick to for sync redraw
                    series.options.kdNow = true;
                    series.buildKDTree();
                    var closest = series.searchPoint({
                            chartX: best.x,
                            chartY: best.y
                        },
                        true);
                    if (closest) {
                        label.closest = [
                            closest,
                            best.x - (closest.plotX || 0),
                            best.y - (closest.plotY || 0)
                        ];
                    }
                }
            }
            else {
                destroyLabel();
            }
        }
        else {
            destroyLabel();
        }
    });
    fireEvent(chart, 'afterDrawSeriesLabels');
    // Console.timeEnd('drawSeriesLabels');
}
/**
 * Points to avoid. In addition to actual data points, the label should avoid
 * interpolated positions.
 *
 * @private
 * @function Highcharts.Series#getPointsOnGraph
 */
function getPointsOnGraph(series) {
    var _a;
    if (!series.xAxis && !series.yAxis) {
        return;
    }
    var distance = 16,
        points = series.points,
        interpolated = [],
        graph = series.graph || series.area,
        node = graph && graph.element,
        inverted = series.chart.inverted,
        xAxis = series.xAxis,
        yAxis = series.yAxis,
        paneLeft = inverted ? yAxis.pos : xAxis.pos,
        paneTop = inverted ? xAxis.pos : yAxis.pos,
        paneHeight = inverted ? xAxis.len : yAxis.len,
        paneWidth = inverted ? yAxis.len : xAxis.len,
        seriesLabelOptions = series.options.label || {},
        onArea = pick(seriesLabelOptions.onArea, !!series.area),
        translatedThreshold = yAxis.getThreshold(series.options.threshold),
        grid = {},
        chartCenterKey = inverted ? 'chartCenterX' : 'chartCenterY';
    var i,
        deltaX,
        deltaY,
        delta,
        len,
        n,
        j;
    /**
     * Push the point to the interpolated points, but only if that position in
     * the grid has not been occupied. As a performance optimization, we divide
     * the plot area into a grid and only add one point per series (#9815).
     * @private
     */
    function pushDiscrete(point) {
        var cellSize = 8, key = Math.round((point.plotX || 0) / cellSize) + ',' +
                Math.round((point.plotY || 0) / cellSize);
        if (!grid[key]) {
            grid[key] = 1;
            interpolated.push(point);
        }
    }
    // For splines, get the point at length (possible caveat: peaks are not
    // correctly detected)
    if (series.getPointSpline &&
        node &&
        node.getPointAtLength &&
        !onArea &&
        // Not performing well on complex series, node.getPointAtLength is too
        // heavy (#9815)
        points.length < (series.chart.plotSizeX || 0) / distance) {
        // If it is animating towards a path definition, use that briefly, and
        // reset
        var d = graph.toD && graph.attr('d');
        if (graph.toD) {
            graph.attr({ d: graph.toD });
        }
        len = node.getTotalLength();
        for (i = 0; i < len; i += distance) {
            var domPoint = node.getPointAtLength(i),
                plotX = inverted ? paneWidth - domPoint.y : domPoint.x,
                plotY = inverted ? paneHeight - domPoint.x : domPoint.y;
            pushDiscrete({
                chartX: paneLeft + plotX,
                chartY: paneTop + plotY,
                plotX: plotX,
                plotY: plotY
            });
        }
        if (d) {
            graph.attr({ d: d });
        }
        // Last point
        var point = points[points.length - 1],
            pos = point.pos();
        pushDiscrete({
            chartX: paneLeft + ((pos === null || pos === void 0 ? void 0 : pos[0]) || 0),
            chartY: paneTop + ((pos === null || pos === void 0 ? void 0 : pos[1]) || 0)
        });
        // Interpolate
    }
    else {
        len = points.length;
        var last = void 0;
        for (i = 0; i < len; i += 1) {
            var point = points[i],
                _b = point.pos() || [],
                plotX = _b[0],
                plotY = _b[1],
                plotHigh = point.plotHigh;
            if (isNumber(plotX) && isNumber(plotY)) {
                var ctlPoint = {
                        plotX: plotX,
                        plotY: plotY,
                        // Absolute coordinates so we can compare different panes
                        chartX: paneLeft + plotX,
                        chartY: paneTop + plotY
                    };
                if (onArea) {
                    // Vertically centered inside area
                    if (plotHigh) {
                        ctlPoint.plotY = plotHigh;
                        ctlPoint.chartY = paneTop + plotHigh;
                    }
                    if (inverted) {
                        ctlPoint.chartCenterX = paneLeft + paneWidth - ((plotHigh ? plotHigh : point.plotY || 0) +
                            pick(point.yBottom, translatedThreshold)) / 2;
                    }
                    else {
                        ctlPoint.chartCenterY = paneTop + ((plotHigh ? plotHigh : plotY) +
                            pick(point.yBottom, translatedThreshold)) / 2;
                    }
                }
                // Add interpolated points
                if (last) {
                    deltaX = Math.abs(ctlPoint.chartX - last.chartX);
                    deltaY = Math.abs(ctlPoint.chartY - last.chartY);
                    delta = Math.max(deltaX, deltaY);
                    if (delta > distance && delta < 999) {
                        n = Math.ceil(delta / distance);
                        for (j = 1; j < n; j += 1) {
                            pushDiscrete((_a = {
                                    chartX: last.chartX +
                                        (ctlPoint.chartX - last.chartX) * (j / n),
                                    chartY: last.chartY +
                                        (ctlPoint.chartY - last.chartY) * (j / n)
                                },
                                _a[chartCenterKey] = (last[chartCenterKey] || 0) +
                                    ((ctlPoint[chartCenterKey] || 0) -
                                        (last[chartCenterKey] || 0)) * (j / n),
                                _a.plotX = (last.plotX || 0) +
                                    (plotX - (last.plotX || 0)) * (j / n),
                                _a.plotY = (last.plotY || 0) +
                                    (plotY - (last.plotY || 0)) * (j / n),
                                _a));
                        }
                    }
                }
                // Add the real point in order to find positive and negative
                // peaks
                pushDiscrete(ctlPoint);
                last = ctlPoint;
            }
        }
    }
    // Get the bounding box so we can do a quick check first if the bounding
    // boxes overlap.
    /*
    interpolated.bBox = node.getBBox();
    interpolated.bBox.x += paneLeft;
    interpolated.bBox.y += paneTop;
    */
    return interpolated;
}
/**
 * Overridable function to return series-specific font sizes for the labels. By
 * default it returns bigger font sizes for series with the greater sum of y
 * values.
 * @private
 */
function labelFontSize(series, minFontSize, maxFontSize) {
    return minFontSize + (((series.sum || 0) / (series.chart.labelSeriesMaxSum || 0)) *
        (maxFontSize - minFontSize)) + 'px';
}
/**
 * Prepare drawing series labels.
 * @private
 */
function onChartRedraw(e) {
    if (this.renderer) {
        var chart_1 = this;
        var delay_1 = animObject(chart_1.renderer.globalAnimation).duration;
        chart_1.labelSeries = [];
        chart_1.labelSeriesMaxSum = 0;
        if (chart_1.seriesLabelTimer) {
            highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default().clearTimeout(chart_1.seriesLabelTimer);
        }
        // Which series should have labels
        chart_1.series.forEach(function (series) {
            var seriesLabelOptions = series.options.label || {},
                label = series.labelBySeries,
                closest = label && label.closest,
                yData = series.getColumn('y');
            if (seriesLabelOptions.enabled &&
                series.visible &&
                (series.graph || series.area) &&
                !series.boosted &&
                chart_1.labelSeries) {
                chart_1.labelSeries.push(series);
                if (seriesLabelOptions.minFontSize &&
                    seriesLabelOptions.maxFontSize &&
                    yData.length) {
                    series.sum = yData.reduce(function (pv, cv) { return (pv || 0) + (cv || 0); }, 0);
                    chart_1.labelSeriesMaxSum = Math.max(chart_1.labelSeriesMaxSum || 0, series.sum || 0);
                }
                // The labels are processing heavy, wait until the animation is
                // done
                if (e.type === 'load') {
                    delay_1 = Math.max(delay_1, animObject(series.options.animation).duration);
                }
                // Keep the position updated to the axis while redrawing
                if (closest) {
                    if (typeof closest[0].plotX !== 'undefined') {
                        label.animate({
                            x: closest[0].plotX + closest[1],
                            y: closest[0].plotY + closest[2]
                        });
                    }
                    else {
                        label.attr({ opacity: 0 });
                    }
                }
            }
        });
        chart_1.seriesLabelTimer = syncTimeout(function () {
            if (chart_1.series && chart_1.labelSeries) { // #7931, chart destroyed
                drawSeriesLabels(chart_1);
            }
        }, chart_1.renderer.forExport || !delay_1 ? 0 : delay_1);
    }
}
/**
 * General symbol definition for labels with connector.
 * @private
 */
function symbolConnector(x, y, w, h, options) {
    var anchorX = options && options.anchorX,
        anchorY = options && options.anchorY;
    var path,
        yOffset,
        lateral = w / 2;
    if (isNumber(anchorX) && isNumber(anchorY)) {
        path = [['M', anchorX, anchorY]];
        // Prefer 45 deg connectors
        yOffset = y - anchorY;
        if (yOffset < 0) {
            yOffset = -h - yOffset;
        }
        if (yOffset < w) {
            lateral = anchorX < x + (w / 2) ? yOffset : w - yOffset;
        }
        // Anchor below label
        if (anchorY > y + h) {
            path.push(['L', x + lateral, y + h]);
            // Anchor above label
        }
        else if (anchorY < y) {
            path.push(['L', x + lateral, y]);
            // Anchor left of label
        }
        else if (anchorX < x) {
            path.push(['L', x, y + h / 2]);
            // Anchor right of label
        }
        else if (anchorX > x + w) {
            path.push(['L', x + w, y + h / 2]);
        }
    }
    return path || [];
}
/* *
 *
 *  Default Export
 *
 * */
var SeriesLabel = {
    compose: compose
};
/* harmony default export */ var SeriesLabel_SeriesLabel = (SeriesLabel);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Containing the position of a box that should be avoided by labels.
 *
 * @interface Highcharts.LabelIntersectBoxObject
 */ /**
* @name Highcharts.LabelIntersectBoxObject#bottom
* @type {number}
*/ /**
* @name Highcharts.LabelIntersectBoxObject#left
* @type {number}
*/ /**
* @name Highcharts.LabelIntersectBoxObject#right
* @type {number}
*/ /**
* @name Highcharts.LabelIntersectBoxObject#top
* @type {number}
*/
(''); // Keeps doclets above in JS file

;// ./code/es5/es-modules/masters/modules/series-label.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
SeriesLabel_SeriesLabel.compose(G.Chart, G.SVGRenderer);
/* harmony default export */ var series_label_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});