/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import ColumnSeries from './Column/ColumnSeries.js';
import H from '../Core/Globals.js';
var composed = H.composed;
var columnProto = ColumnSeries.prototype;
import Series from '../Core/Series/Series.js';
var seriesProto = Series.prototype;
import U from '../Core/Utilities.js';
var defined = U.defined, pushUnique = U.pushUnique, stableSort = U.stableSort;
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
        var _a, _b;
        columnProto.translate.apply(this);
        var series = this, options = series.options, chart = series.chart, points = series.points, optionsOnSeries = options.onSeries, onSeries = (optionsOnSeries &&
            chart.get(optionsOnSeries)), step = onSeries && onSeries.options.step, onData = (onSeries && onSeries.points), inverted = chart.inverted, xAxis = series.xAxis, yAxis = series.yAxis;
        var cursor = points.length - 1, point, lastPoint, onKey = options.onKey || 'y', i = onData && onData.length, xOffset = 0, leftPoint, lastX, rightPoint, currentDataGrouping, distanceRatio;
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
                                    ], p3_1 = [
                                        rightPoint.plotX || 0,
                                        rightPoint.plotY || 0
                                    ], p1_1 = (((_a = leftPoint.controlPoints) === null || _a === void 0 ? void 0 : _a.high) ||
                                        p0_1), p2_1 = (((_b = rightPoint.controlPoints) === null || _b === void 0 ? void 0 : _b.low) ||
                                        p3_1), pixelThreshold = 0.25, maxIterations = 100, calculateCoord = function (t, key) { return (
                                    // The parametric formula for the
                                    // cubic Bezier curve.
                                    Math.pow(1 - t, 3) * p0_1[key] +
                                        3 * (1 - t) * (1 - t) * t *
                                            p1_1[key] + 3 * (1 - t) * t * t *
                                        p2_1[key] + t * t * t * p3_1[key]); };
                                    var tMin = 0, tMax = 1, t = void 0;
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
export default OnSeriesComposition;
