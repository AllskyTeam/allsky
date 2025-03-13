/* *
 *
 *  (c) 2010-2024 Sebastian Bochan
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import DerivedComposition from '../DerivedComposition.js';
import ParetoSeriesDefaults from './ParetoSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
const { line: LineSeries } = SeriesRegistry.seriesTypes;
import U from '../../Core/Utilities.js';
const { correctFloat, merge, extend } = U;
/* *
 *
 *  Class
 *
 * */
/**
 * The pareto series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pareto
 *
 * @augments Highcharts.Series
 */
class ParetoSeries extends LineSeries {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Calculate y sum and each percent point.
     *
     * @private
     * @function Highcharts.Series#sumPointsPercents
     *
     * @param {Array<number>} yValues
     * Y values
     *
     * @param {Array<number>} xValues
     * X values
     *
     * @param {number} sum
     * Sum of all y values
     *
     * @param {boolean} [isSum]
     * Declares if calculate sum of all points
     *
     * @return {number|Array<number,number>}
     * Returns sum of points or array of points [x,sum]
     *
     * @requires modules/pareto
     */
    sumPointsPercents(yValues, xValues, sum, isSum) {
        const percentPoints = [];
        let i = 0, sumY = 0, sumPercent = 0, percentPoint;
        for (const point of yValues) {
            if (point !== null) {
                if (isSum) {
                    sumY += point;
                }
                else {
                    percentPoint = (point / sum) * 100;
                    percentPoints.push([
                        xValues[i],
                        correctFloat(sumPercent + percentPoint)
                    ]);
                    sumPercent += percentPoint;
                }
            }
            ++i;
        }
        return (isSum ? sumY : percentPoints);
    }
    /**
     * Calculate sum and return percent points.
     *
     * @private
     * @function Highcharts.Series#setDerivedData
     * @requires modules/pareto
     */
    setDerivedData() {
        const xValues = this.baseSeries?.getColumn('x') || [], yValues = this.baseSeries?.getColumn('y') || [], sum = this.sumPointsPercents(yValues, xValues, null, true);
        this.setData(this.sumPointsPercents(yValues, xValues, sum, false), false);
    }
}
/* *
 *
 *  Static Properties
 *
 * */
ParetoSeries.defaultOptions = merge(LineSeries.defaultOptions, ParetoSeriesDefaults);
extend(ParetoSeries.prototype, {
    hasDerivedData: DerivedComposition.hasDerivedData
});
DerivedComposition.compose(ParetoSeries);
SeriesRegistry.registerSeriesType('pareto', ParetoSeries);
/* *
 *
 *  Default export
 *
 * */
export default ParetoSeries;
