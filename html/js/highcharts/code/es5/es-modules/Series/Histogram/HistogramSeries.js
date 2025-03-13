/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *  Author: Sebastian Domas
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
import HistogramSeriesDefaults from './HistogramSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnSeries = SeriesRegistry.seriesTypes.column;
import U from '../../Core/Utilities.js';
var arrayMax = U.arrayMax, arrayMin = U.arrayMin, correctFloat = U.correctFloat, extend = U.extend, isNumber = U.isNumber, merge = U.merge;
/* ************************************************************************** *
 *  HISTOGRAM
 * ************************************************************************** */
/**
 * A dictionary with formulas for calculating number of bins based on the
 * base series
 **/
var binsNumberFormulas = {
    'square-root': function (baseSeries) {
        return Math.ceil(Math.sqrt(baseSeries.options.data.length));
    },
    'sturges': function (baseSeries) {
        return Math.ceil(Math.log(baseSeries.options.data.length) * Math.LOG2E);
    },
    'rice': function (baseSeries) {
        return Math.ceil(2 * Math.pow(baseSeries.options.data.length, 1 / 3));
    }
};
/**
 * Returns a function for mapping number to the closed (right opened) bins
 * @private
 * @param {Array<number>} bins
 * Width of the bins
 */
function fitToBinLeftClosed(bins) {
    return function (y) {
        var i = 1;
        while (bins[i] <= y) {
            i++;
        }
        return bins[--i];
    };
}
/* *
 *
 *  Class
 *
 * */
/**
 * Histogram class
 * @private
 * @class
 * @name Highcharts.seriesTypes.histogram
 * @augments Highcharts.Series
 */
var HistogramSeries = /** @class */ (function (_super) {
    __extends(HistogramSeries, _super);
    function HistogramSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    HistogramSeries.prototype.binsNumber = function () {
        var binsNumberOption = this.options.binsNumber;
        var binsNumber = binsNumberFormulas[binsNumberOption] ||
            // #7457
            (typeof binsNumberOption === 'function' && binsNumberOption);
        return Math.ceil((binsNumber && binsNumber(this.baseSeries)) ||
            (isNumber(binsNumberOption) ?
                binsNumberOption :
                binsNumberFormulas['square-root'](this.baseSeries)));
    };
    HistogramSeries.prototype.derivedData = function (baseData, binsNumber, binWidth) {
        var series = this, max = correctFloat(arrayMax(baseData)), 
        // Float correction needed, because first frequency value is not
        // corrected when generating frequencies (within for loop).
        min = correctFloat(arrayMin(baseData)), frequencies = [], bins = {}, data = [];
        var x;
        binWidth = series.binWidth = (correctFloat(isNumber(binWidth) ?
            (binWidth || 1) :
            (max - min) / binsNumber));
        // #12077 negative pointRange causes wrong calculations,
        // browser hanging.
        series.options.pointRange = Math.max(binWidth, 0);
        // If binWidth is 0 then max and min are equaled,
        // increment the x with some positive value to quit the loop
        for (x = min; 
        // This condition is needed because of the margin of error while
        // operating on decimal numbers. Without that, additional bin
        // was sometimes noticeable on the graph, because of too small
        // precision of float correction.
        x < max &&
            (series.userOptions.binWidth ||
                correctFloat(max - x) >= binWidth ||
                // #13069 - Every add and subtract operation should
                // be corrected, due to general problems with
                // operations on float numbers in JS.
                correctFloat(correctFloat(min + (frequencies.length * binWidth)) -
                    x) <= 0); x = correctFloat(x + binWidth)) {
            frequencies.push(x);
            bins[x] = 0;
        }
        if (bins[min] !== 0) {
            frequencies.push(min);
            bins[min] = 0;
        }
        var fitToBin = fitToBinLeftClosed(frequencies.map(function (elem) { return parseFloat(elem); }));
        for (var _i = 0, baseData_1 = baseData; _i < baseData_1.length; _i++) {
            var y = baseData_1[_i];
            bins[correctFloat(fitToBin(y))]++;
        }
        for (var _a = 0, _b = Object.keys(bins); _a < _b.length; _a++) {
            var key = _b[_a];
            data.push({
                x: Number(key),
                y: bins[key],
                x2: correctFloat(Number(key) + binWidth)
            });
        }
        data.sort(function (a, b) { return (a.x - b.x); });
        data[data.length - 1].x2 = max;
        return data;
    };
    HistogramSeries.prototype.setDerivedData = function () {
        var _a;
        var yData = (_a = this.baseSeries) === null || _a === void 0 ? void 0 : _a.getColumn('y');
        if (!(yData === null || yData === void 0 ? void 0 : yData.length)) {
            this.setData([]);
            return;
        }
        var data = this.derivedData(yData, this.binsNumber(), this.options.binWidth);
        this.setData(data, false);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    HistogramSeries.defaultOptions = merge(ColumnSeries.defaultOptions, HistogramSeriesDefaults);
    return HistogramSeries;
}(ColumnSeries));
extend(HistogramSeries.prototype, {
    hasDerivedData: DerivedComposition.hasDerivedData
});
DerivedComposition.compose(HistogramSeries);
SeriesRegistry.registerSeriesType('histogram', HistogramSeries);
/* *
 *
 *  Default Export
 *
 * */
export default HistogramSeries;
