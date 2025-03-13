/* *
 *
 *  (c) 2019-2024 Highsoft AS
 *
 *  Boost module: stripped-down renderer for higher performance
 *
 *  License: highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import BoostableMap from './BoostableMap.js';
import H from '../../Core/Globals.js';
var composed = H.composed;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function compose(ChartClass, wglMode) {
    if (wglMode && pushUnique(composed, 'Boost.Chart')) {
        ChartClass.prototype.callbacks.push(onChartCallback);
    }
    return ChartClass;
}
/**
 * Get the clip rectangle for a target, either a series or the chart.
 * For the chart, we need to consider the maximum extent of its Y axes,
 * in case of Highcharts Stock panes and navigator.
 *
 * @private
 * @function Highcharts.Chart#getBoostClipRect
 */
function getBoostClipRect(chart, target) {
    var navigator = chart.navigator;
    var clipBox = {
        x: chart.plotLeft,
        y: chart.plotTop,
        width: chart.plotWidth,
        height: chart.plotHeight
    };
    if (navigator && chart.inverted) { // #17820, #20936
        clipBox.width += navigator.top + navigator.height;
        if (!navigator.opposite) {
            clipBox.x = navigator.left;
        }
    }
    else if (navigator && !chart.inverted) {
        clipBox.height = navigator.top + navigator.height - chart.plotTop;
    }
    // Clipping of individual series (#11906, #19039).
    if (target.getClipBox) {
        var _a = target, xAxis = _a.xAxis, yAxis = _a.yAxis;
        clipBox = target.getClipBox();
        if (chart.inverted) {
            var lateral = clipBox.width;
            clipBox.width = clipBox.height;
            clipBox.height = lateral;
            clipBox.x = yAxis.pos;
            clipBox.y = xAxis.pos;
        }
        else {
            clipBox.x = xAxis.pos;
            clipBox.y = yAxis.pos;
        }
    }
    if (target === chart) {
        var verticalAxes = chart.inverted ? chart.xAxis : chart.yAxis; // #14444
        if (verticalAxes.length <= 1) {
            clipBox.y = Math.min(verticalAxes[0].pos, clipBox.y);
            clipBox.height = (verticalAxes[0].pos -
                chart.plotTop +
                verticalAxes[0].len);
        }
    }
    return clipBox;
}
/**
 * Returns true if the chart is in series boost mode.
 * @private
 * @param {Highcharts.Chart} chart
 * Chart to check.
 * @return {boolean}
 * `true` if the chart is in series boost mode.
 */
function isChartSeriesBoosting(chart) {
    var allSeries = chart.series, boost = chart.boost = chart.boost || {}, boostOptions = chart.options.boost || {}, threshold = pick(boostOptions.seriesThreshold, 50);
    if (allSeries.length >= threshold) {
        return true;
    }
    if (allSeries.length === 1) {
        return false;
    }
    var allowBoostForce = boostOptions.allowForce;
    if (typeof allowBoostForce === 'undefined') {
        allowBoostForce = true;
        for (var _i = 0, _a = chart.xAxis; _i < _a.length; _i++) {
            var axis = _a[_i];
            if (pick(axis.min, -Infinity) > pick(axis.dataMin, -Infinity) ||
                pick(axis.max, Infinity) < pick(axis.dataMax, Infinity)) {
                allowBoostForce = false;
                break;
            }
        }
    }
    if (typeof boost.forceChartBoost !== 'undefined') {
        if (allowBoostForce) {
            return boost.forceChartBoost;
        }
        boost.forceChartBoost = void 0;
    }
    // If there are more than five series currently boosting,
    // we should boost the whole chart to avoid running out of webgl contexts.
    var canBoostCount = 0, needBoostCount = 0, seriesOptions;
    for (var _b = 0, allSeries_1 = allSeries; _b < allSeries_1.length; _b++) {
        var series = allSeries_1[_b];
        seriesOptions = series.options;
        // Don't count series with boostThreshold set to 0
        // See #8950
        // Also don't count if the series is hidden.
        // See #9046
        if (seriesOptions.boostThreshold === 0 ||
            series.visible === false) {
            continue;
        }
        // Don't count heatmap series as they are handled differently.
        // In the future we should make the heatmap/treemap path compatible
        // with forcing. See #9636.
        if (series.type === 'heatmap') {
            continue;
        }
        if (BoostableMap[series.type]) {
            ++canBoostCount;
        }
        if (patientMax(series.getColumn('x', true), seriesOptions.data, 
        /// series.xData,
        series.points) >= (seriesOptions.boostThreshold || Number.MAX_VALUE)) {
            ++needBoostCount;
        }
    }
    boost.forceChartBoost = allowBoostForce && ((
    // Even when the series that need a boost are less than or equal
    // to 5, force a chart boost when all series are to be boosted.
    // See #18815
    canBoostCount === allSeries.length &&
        needBoostCount === canBoostCount) ||
        needBoostCount > 5);
    return boost.forceChartBoost;
}
/**
 * Take care of the canvas blitting
 * @private
 */
function onChartCallback(chart) {
    /**
     * Convert chart-level canvas to image.
     * @private
     */
    function canvasToSVG() {
        if (chart.boost &&
            chart.boost.wgl &&
            isChartSeriesBoosting(chart)) {
            chart.boost.wgl.render(chart);
        }
    }
    /**
     * Clear chart-level canvas.
     * @private
     */
    function preRender() {
        var _a, _b;
        // Reset force state
        chart.boost = chart.boost || {};
        chart.boost.forceChartBoost = void 0;
        chart.boosted = false;
        // Clear the canvas
        if (!chart.axes.some(function (axis) { return axis.isPanning; })) {
            (_b = (_a = chart.boost).clear) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        if (chart.boost.canvas &&
            chart.boost.wgl &&
            isChartSeriesBoosting(chart)) {
            // Allocate
            chart.boost.wgl.allocateBuffer(chart);
        }
        // See #6518 + #6739
        if (chart.boost.markerGroup &&
            chart.xAxis &&
            chart.xAxis.length > 0 &&
            chart.yAxis &&
            chart.yAxis.length > 0) {
            chart.boost.markerGroup.translate(chart.xAxis[0].pos, chart.yAxis[0].pos);
        }
    }
    addEvent(chart, 'predraw', preRender);
    // Use the load event rather than redraw, otherwise user load events will
    // fire too early (#18755)
    addEvent(chart, 'load', canvasToSVG, { order: -1 });
    addEvent(chart, 'redraw', canvasToSVG);
    var prevX = -1;
    var prevY = -1;
    addEvent(chart.pointer, 'afterGetHoverData', function (e) {
        var _a;
        var series = (_a = e.hoverPoint) === null || _a === void 0 ? void 0 : _a.series;
        chart.boost = chart.boost || {};
        if (chart.boost.markerGroup && series) {
            var xAxis = chart.inverted ? series.yAxis : series.xAxis;
            var yAxis = chart.inverted ? series.xAxis : series.yAxis;
            if ((xAxis && xAxis.pos !== prevX) ||
                (yAxis && yAxis.pos !== prevY)) {
                // #21176: If the axis is changed, hide teh halo without
                // animation  to prevent flickering of halos sharing the
                // same marker group
                chart.series.forEach(function (s) {
                    var _a;
                    (_a = s.halo) === null || _a === void 0 ? void 0 : _a.hide();
                });
                // #10464: Keep the marker group position in sync with the
                // position of the hovered series axes since there is only
                // one shared marker group when boosting.
                chart.boost.markerGroup.translate(xAxis.pos, yAxis.pos);
                prevX = xAxis.pos;
                prevY = yAxis.pos;
            }
        }
    });
}
/**
 * Tolerant max() function.
 *
 * @private
 * @param {...Array<Array<unknown>>} args
 * Max arguments
 * @return {number}
 * Max value
 */
function patientMax() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var r = -Number.MAX_VALUE;
    args.forEach(function (t) {
        if (typeof t !== 'undefined' &&
            t !== null &&
            typeof t.length !== 'undefined') {
            if (t.length > 0) {
                r = t.length;
                return true;
            }
        }
    });
    return r;
}
/* *
 *
 *  Default Export
 *
 * */
var BoostChart = {
    compose: compose,
    getBoostClipRect: getBoostClipRect,
    isChartSeriesBoosting: isChartSeriesBoosting
};
export default BoostChart;
