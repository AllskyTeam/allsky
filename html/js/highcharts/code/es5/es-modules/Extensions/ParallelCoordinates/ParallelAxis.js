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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import ParallelCoordinatesDefaults from './ParallelCoordinatesDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, arrayMax = U.arrayMax, arrayMin = U.arrayMin, isNumber = U.isNumber, merge = U.merge, pick = U.pick;
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
        var parallel = this, axis = parallel.axis, chart = axis.chart, fraction = ((parallel.position || 0) + 0.5) /
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
        var axis = this, chart = axis.chart, parallelCoordinates = axis.parallelCoordinates;
        var axisPosition = [
            'left', 'width', 'height', 'top'
        ];
        if (chart.hasParallelCoordinates) {
            if (chart.inverted) {
                axisPosition = axisPosition.reverse();
            }
            if (axis.isXAxis) {
                axis.options = merge(axis.options, ParallelCoordinatesDefaults.xAxis, e.userOptions);
            }
            else {
                var axisIndex = chart.yAxis.indexOf(axis); // #13608
                axis.options = merge(axis.options, axis.chart.options.chart.parallelAxes, e.userOptions);
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
                        var _a, _b;
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
export default ParallelAxis;
