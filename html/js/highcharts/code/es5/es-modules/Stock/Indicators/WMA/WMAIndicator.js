/* *
 *
 *  (c) 2010-2024 Kacper Madej
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
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
var SMAIndicator = SeriesRegistry.seriesTypes.sma;
import U from '../../../Core/Utilities.js';
var isArray = U.isArray, merge = U.merge;
/* *
 *
 *  Functions
 *
 * */
// Utils:
/**
 * @private
 */
function accumulateAverage(points, xVal, yVal, i, index) {
    var xValue = xVal[i], yValue = index < 0 ? yVal[i] : yVal[i][index];
    points.push([xValue, yValue]);
}
/**
 * @private
 */
function weightedSumArray(array, pLen) {
    // The denominator is the sum of the number of days as a triangular number.
    // If there are 5 days, the triangular numbers are 5, 4, 3, 2, and 1.
    // The sum is 5 + 4 + 3 + 2 + 1 = 15.
    var denominator = (pLen + 1) / 2 * pLen;
    // Reduce VS loop => reduce
    return array.reduce(function (prev, cur, i) {
        return [null, prev[1] + cur[1] * (i + 1)];
    })[1] / denominator;
}
/**
 * @private
 */
function populateAverage(points, xVal, yVal, i) {
    var pLen = points.length, wmaY = weightedSumArray(points, pLen), wmaX = xVal[i - 1];
    points.shift(); // Remove point until range < period
    return [wmaX, wmaY];
}
/* *
 *
 *  Class
 *
 * */
/**
 * The SMA series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.wma
 *
 * @augments Highcharts.Series
 */
var WMAIndicator = /** @class */ (function (_super) {
    __extends(WMAIndicator, _super);
    function WMAIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    WMAIndicator.prototype.getValues = function (series, params) {
        var period = params.period, xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, xValue = xVal[0], wma = [], xData = [], yData = [];
        var range = 1, index = -1, i, wmaPoint, yValue = yVal[0];
        if (xVal.length < period) {
            return;
        }
        // Switch index for OHLC / Candlestick
        if (isArray(yVal[0])) {
            index = params.index;
            yValue = yVal[0][index];
        }
        // Starting point
        var points = [[xValue, yValue]];
        // Accumulate first N-points
        while (range !== period) {
            accumulateAverage(points, xVal, yVal, range, index);
            range++;
        }
        // Calculate value one-by-one for each period in visible data
        for (i = range; i < yValLen; i++) {
            wmaPoint = populateAverage(points, xVal, yVal, i);
            wma.push(wmaPoint);
            xData.push(wmaPoint[0]);
            yData.push(wmaPoint[1]);
            accumulateAverage(points, xVal, yVal, i, index);
        }
        wmaPoint = populateAverage(points, xVal, yVal, i);
        wma.push(wmaPoint);
        xData.push(wmaPoint[0]);
        yData.push(wmaPoint[1]);
        return {
            values: wma,
            xData: xData,
            yData: yData
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Weighted moving average indicator (WMA). This series requires `linkedTo`
     * option to be set.
     *
     * @sample stock/indicators/wma
     *         Weighted moving average indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/wma
     * @optionparent plotOptions.wma
     */
    WMAIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        params: {
            index: 3,
            period: 9
        }
    });
    return WMAIndicator;
}(SMAIndicator));
SeriesRegistry.registerSeriesType('wma', WMAIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default WMAIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `WMA` series. If the [type](#series.wma.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.wma
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/wma
 * @apioption series.wma
 */
''; // Adds doclet above to the transpiled file
