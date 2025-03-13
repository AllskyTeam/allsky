/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
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
import BellcurveSeriesDefaults from './BellcurveSeriesDefaults.js';
import DerivedComposition from '../DerivedComposition.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var AreaSplineSeries = SeriesRegistry.seriesTypes.areaspline;
import U from '../../Core/Utilities.js';
var correctFloat = U.correctFloat, isNumber = U.isNumber, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Bell curve class
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.bellcurve
 *
 * @augments Highcharts.Series
 */
var BellcurveSeries = /** @class */ (function (_super) {
    __extends(BellcurveSeries, _super);
    function BellcurveSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /** @private */
    BellcurveSeries.mean = function (data) {
        var length = data.length, sum = data.reduce(function (sum, value) {
            return (sum += value);
        }, 0);
        return length > 0 && sum / length;
    };
    /** @private */
    BellcurveSeries.standardDeviation = function (data, average) {
        var len = data.length;
        average = isNumber(average) ?
            average : BellcurveSeries.mean(data);
        var sum = data.reduce(function (sum, value) {
            var diff = value - average;
            return (sum += diff * diff);
        }, 0);
        return len > 1 && Math.sqrt(sum / (len - 1));
    };
    /** @private */
    BellcurveSeries.normalDensity = function (x, mean, standardDeviation) {
        var translation = x - mean;
        return Math.exp(-(translation * translation) /
            (2 * standardDeviation * standardDeviation)) / (standardDeviation * Math.sqrt(2 * Math.PI));
    };
    /* *
     *
     *  Functions
     *
     * */
    BellcurveSeries.prototype.derivedData = function (mean, standardDeviation) {
        var options = this.options, intervals = options.intervals, pointsInInterval = options.pointsInInterval, stop = intervals * pointsInInterval * 2 + 1, increment = standardDeviation / pointsInInterval, data = [];
        var x = mean - intervals * standardDeviation;
        for (var i = 0; i < stop; i++) {
            data.push([x, BellcurveSeries.normalDensity(x, mean, standardDeviation)]);
            x += increment;
        }
        return data;
    };
    BellcurveSeries.prototype.setDerivedData = function () {
        var _a;
        var series = this;
        if (((_a = series.baseSeries) === null || _a === void 0 ? void 0 : _a.getColumn('y').length) || 0 > 1) {
            series.setMean();
            series.setStandardDeviation();
            series.setData(series.derivedData(series.mean || 0, series.standardDeviation || 0), false, void 0, false);
        }
        return (void 0);
    };
    BellcurveSeries.prototype.setMean = function () {
        var _a;
        var series = this;
        series.mean = correctFloat(BellcurveSeries.mean(((_a = series.baseSeries) === null || _a === void 0 ? void 0 : _a.getColumn('y')) || []));
    };
    BellcurveSeries.prototype.setStandardDeviation = function () {
        var _a;
        var series = this;
        series.standardDeviation = correctFloat(BellcurveSeries.standardDeviation(((_a = series.baseSeries) === null || _a === void 0 ? void 0 : _a.getColumn('y')) || [], series.mean));
    };
    /* *
     *
     *  Static Properties
     *
     * */
    BellcurveSeries.defaultOptions = merge(AreaSplineSeries.defaultOptions, BellcurveSeriesDefaults);
    return BellcurveSeries;
}(AreaSplineSeries));
DerivedComposition.compose(BellcurveSeries);
SeriesRegistry.registerSeriesType('bellcurve', BellcurveSeries);
/* *
 *
 *  Default Export
 *
 * */
export default BellcurveSeries;
