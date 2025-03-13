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
import ParallelCoordinatesDefaults from './ParallelCoordinatesDefaults.js';
import U from '../../Core/Utilities.js';
const { addEvent, arrayMax, arrayMin, isNumber, merge, pick } = U;
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
class ParallelAxisAdditions {
    /* *
     *
     *  Constructors
     *
     * */
    constructor(axis) {
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
    setPosition(axisPosition, options) {
        const parallel = this, axis = parallel.axis, chart = axis.chart, fraction = ((parallel.position || 0) + 0.5) /
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
    }
}
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
            const axisCompo = AxisClass;
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
        const axis = this, chart = axis.chart, parallelCoordinates = axis.parallelCoordinates;
        let axisPosition = [
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
                const axisIndex = chart.yAxis.indexOf(axis); // #13608
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
        const axis = this;
        const chart = axis.chart;
        const parallelCoordinates = axis.parallelCoordinates;
        if (!parallelCoordinates) {
            return;
        }
        if (chart && chart.hasParallelCoordinates && !axis.isXAxis) {
            const index = parallelCoordinates.position;
            let currentPoints = [];
            axis.series.forEach(function (series) {
                if (series.visible && isNumber(index)) {
                    currentPoints = (series.pointArrayMap || ['y'])
                        .reduce((currentPoints, key) => [
                        ...currentPoints,
                        series.getColumn(key)?.[index] ?? null
                    ], currentPoints);
                }
            });
            currentPoints = currentPoints.filter(isNumber);
            axis.dataMin = arrayMin(currentPoints);
            axis.dataMax = arrayMax(currentPoints);
            e.preventDefault();
        }
    }
    /**
     * Add parallel addition
     * @private
     */
    function onInit() {
        const axis = this;
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
