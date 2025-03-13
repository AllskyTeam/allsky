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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import DerivedComposition from '../DerivedComposition.js';
import ParetoSeriesDefaults from './ParetoSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var LineSeries = SeriesRegistry.seriesTypes.line;
import U from '../../Core/Utilities.js';
var correctFloat = U.correctFloat, merge = U.merge, extend = U.extend;
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
var ParetoSeries = /** @class */ (function (_super) {
    __extends(ParetoSeries, _super);
    function ParetoSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
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
    ParetoSeries.prototype.sumPointsPercents = function (yValues, xValues, sum, isSum) {
        var percentPoints = [];
        var i = 0, sumY = 0, sumPercent = 0, percentPoint;
        for (var _i = 0, yValues_1 = yValues; _i < yValues_1.length; _i++) {
            var point = yValues_1[_i];
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
    };
    /**
     * Calculate sum and return percent points.
     *
     * @private
     * @function Highcharts.Series#setDerivedData
     * @requires modules/pareto
     */
    ParetoSeries.prototype.setDerivedData = function () {
        var _a, _b;
        var xValues = ((_a = this.baseSeries) === null || _a === void 0 ? void 0 : _a.getColumn('x')) || [], yValues = ((_b = this.baseSeries) === null || _b === void 0 ? void 0 : _b.getColumn('y')) || [], sum = this.sumPointsPercents(yValues, xValues, null, true);
        this.setData(this.sumPointsPercents(yValues, xValues, sum, false), false);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    ParetoSeries.defaultOptions = merge(LineSeries.defaultOptions, ParetoSeriesDefaults);
    return ParetoSeries;
}(LineSeries));
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
