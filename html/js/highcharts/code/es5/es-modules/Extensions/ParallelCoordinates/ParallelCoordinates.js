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
import ParallelAxis from './ParallelAxis.js';
import ParallelCoordinatesDefaults from './ParallelCoordinatesDefaults.js';
import ParallelSeries from './ParallelSeries.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, merge = U.merge, splat = U.splat;
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
            this), seriesOptions = options.series;
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
        ParallelAxis.compose(AxisClass);
        ParallelSeries.compose(SeriesClass);
        var ChartCompo = ChartClass, addsProto = ChartAdditions.prototype, chartProto = ChartCompo.prototype;
        if (!chartProto.setParallelInfo) {
            chartProto.setParallelInfo = addsProto.setParallelInfo;
            addEvent(ChartCompo, 'init', onChartInit);
            addEvent(ChartCompo, 'update', onChartUpdate);
            merge(true, highchartsDefaultOptions.chart, ParallelCoordinatesDefaults.chart);
        }
    }
    ParallelCoordinates.compose = compose;
    /**
     * Initialize parallelCoordinates
     * @private
     */
    function onChartInit(e) {
        var chart = this, options = e.args[0], defaultYAxis = splat(options.yAxis || {}), newYAxes = [];
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
            merge(true, options, 
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
            options.xAxis = merge(ParallelCoordinatesDefaults.xAxis, // Docs
            splat(options.xAxis || {})[0]);
        }
    }
    /**
     * Initialize parallelCoordinates
     * @private
     */
    function onChartUpdate(e) {
        var chart = this, options = e.options;
        if (options.chart) {
            if (defined(options.chart.parallelCoordinates)) {
                chart.hasParallelCoordinates =
                    options.chart.parallelCoordinates;
            }
            chart.options.chart.parallelAxes = merge(chart.options.chart.parallelAxes, options.chart.parallelAxes);
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
export default ParallelCoordinates;
