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
'use strict';
import H from '../../Core/Globals.js';
var composed = H.composed;
import T from '../../Core/Templating.js';
var format = T.format;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, erase = U.erase, extend = U.extend, insertItem = U.insertItem, isArray = U.isArray, isNumber = U.isNumber, pushUnique = U.pushUnique;
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
            addEvent(CompoClass, 'afterTranslate', onSeriesAfterTranslate, { order: 1 });
            addEvent(CompoClass, 'bindAxes', onSeriesBindAxes);
            addEvent(CompoClass, 'destroy', onSeriesDestroy);
            addEvent(SeriesClass, 'afterGeneratePoints', onSeriesAfterGeneratePoints);
        }
    }
    ParallelSeries.compose = compose;
    /**
     * Translate each point using corresponding yAxis.
     * @private
     */
    function onSeriesAfterTranslate() {
        var series = this, chart = this.chart, points = series.points, dataLength = points && points.length;
        var closestPointRangePx = Number.MAX_VALUE, lastPlotX, point;
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
                    if (isNumber(point.high)) {
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
        var series = this, chart = series.chart;
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
        var series = this, chart = series.chart;
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
        var _a, _b, _c, _d, _e, _f;
        var chart = this.chart;
        if (chart === null || chart === void 0 ? void 0 : chart.hasParallelCoordinates) {
            for (var _i = 0, _g = this.points; _i < _g.length; _i++) {
                var point = _g[_i];
                var yAxis = chart.yAxis[point.x || 0], yAxisOptions = yAxis.options, labelFormat = (_a = yAxisOptions.tooltipValueFormat) !== null && _a !== void 0 ? _a : yAxisOptions.labels.format;
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
export default ParallelSeries;
