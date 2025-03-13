/* *
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
var extend = U.extend, merge = U.merge, isArray = U.isArray;
/* *
 *
 *  Class
 *
 * */
/**
 * The Trend line series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.trendline
 *
 * @augments Highcharts.Series
 */
var TrendLineIndicator = /** @class */ (function (_super) {
    __extends(TrendLineIndicator, _super);
    function TrendLineIndicator() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.updateAllPoints = true;
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    TrendLineIndicator.prototype.getValues = function (series, params) {
        var orgXVal = series.xData, yVal = series.yData, xVal = [], LR = [], xData = [], yData = [], index = params.index;
        var numerator = 0, denominator = 0, xValSum = 0, yValSum = 0, counter = 0;
        // Create an array of consecutive xValues, (don't remove duplicates)
        for (var i = 0; i < orgXVal.length; i++) {
            if (i === 0 || orgXVal[i] !== orgXVal[i - 1]) {
                counter++;
            }
            xVal.push(counter);
        }
        for (var i = 0; i < xVal.length; i++) {
            xValSum += xVal[i];
            yValSum += isArray(yVal[i]) ? yVal[i][index] : yVal[i];
        }
        var meanX = xValSum / xVal.length, meanY = yValSum / yVal.length;
        for (var i = 0; i < xVal.length; i++) {
            var y = isArray(yVal[i]) ? yVal[i][index] : yVal[i];
            numerator += (xVal[i] - meanX) * (y - meanY);
            denominator += Math.pow(xVal[i] - meanX, 2);
        }
        // Calculate linear regression:
        for (var i = 0; i < xVal.length; i++) {
            // Check if the xVal is already used
            if (orgXVal[i] === xData[xData.length - 1]) {
                continue;
            }
            var x = orgXVal[i], y = meanY + (numerator / denominator) * (xVal[i] - meanX);
            LR.push([x, y]);
            xData.push(x);
            yData.push(y);
        }
        return {
            xData: xData,
            yData: yData,
            values: LR
        };
    };
    /**
     * Trendline (linear regression) fits a straight line to the selected data
     * using a method called the Sum Of Least Squares. This series requires the
     * `linkedTo` option to be set.
     *
     * @sample stock/indicators/trendline
     *         Trendline indicator
     *
     * @extends      plotOptions.sma
     * @since        7.1.3
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/trendline
     * @optionparent plotOptions.trendline
     */
    TrendLineIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding period
         */
        params: {
            period: void 0, // Unchangeable period, do not inherit (#15362)
            /**
             * The point index which indicator calculations will base. For
             * example using OHLC data, index=2 means the indicator will be
             * calculated using Low values.
             *
             * @default 3
             */
            index: 3
        }
    });
    return TrendLineIndicator;
}(SMAIndicator));
extend(TrendLineIndicator.prototype, {
    nameBase: 'Trendline',
    nameComponents: void 0
});
SeriesRegistry.registerSeriesType('trendline', TrendLineIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default TrendLineIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `TrendLine` series. If the [type](#series.trendline.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.trendline
 * @since     7.1.3
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/trendline
 * @apioption series.trendline
 */
''; // To include the above in the js output
