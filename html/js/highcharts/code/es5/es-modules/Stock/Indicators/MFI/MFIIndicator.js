/* *
 *
 *  Money Flow Index indicator for Highcharts Stock
 *
 *  (c) 2010-2024 Grzegorz Blachliński
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
var extend = U.extend, merge = U.merge, error = U.error, isArray = U.isArray;
/* *
 *
 *  Functions
 *
 * */
// Utils:
/**
 *
 */
function sumArray(array) {
    return array.reduce(function (prev, cur) {
        return prev + cur;
    });
}
/**
 *
 */
function toFixed(a, n) {
    return parseFloat(a.toFixed(n));
}
/**
 *
 */
function calculateTypicalPrice(point) {
    return (point[1] + point[2] + point[3]) / 3;
}
/**
 *
 */
function calculateRawMoneyFlow(typicalPrice, volume) {
    return typicalPrice * volume;
}
/* *
 *
 *  Class
 *
 * */
/**
 * The MFI series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.mfi
 *
 * @augments Highcharts.Series
 */
var MFIIndicator = /** @class */ (function (_super) {
    __extends(MFIIndicator, _super);
    function MFIIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    MFIIndicator.prototype.getValues = function (series, params) {
        var period = params.period, xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, decimals = params.decimals, volumeSeries = series.chart.get(params.volumeSeriesID), yValVolume = (volumeSeries === null || volumeSeries === void 0 ? void 0 : volumeSeries.getColumn('y')) || [], MFI = [], xData = [], yData = [], positiveMoneyFlow = [], negativeMoneyFlow = [];
        var newTypicalPrice, oldTypicalPrice, rawMoneyFlow, negativeMoneyFlowSum, positiveMoneyFlowSum, moneyFlowRatio, MFIPoint, i, isUp = false, 
        // MFI starts calculations from the second point
        // Cause we need to calculate change between two points
        range = 1;
        if (!volumeSeries) {
            error('Series ' +
                params.volumeSeriesID +
                ' not found! Check `volumeSeriesID`.', true, series.chart);
            return;
        }
        // MFI requires high low and close values
        if ((xVal.length <= period) || !isArray(yVal[0]) ||
            yVal[0].length !== 4 ||
            !yValVolume) {
            return;
        }
        // Calculate first typical price
        newTypicalPrice = calculateTypicalPrice(yVal[range]);
        // Accumulate first N-points
        while (range < period + 1) {
            // Calculate if up or down
            oldTypicalPrice = newTypicalPrice;
            newTypicalPrice = calculateTypicalPrice(yVal[range]);
            isUp = newTypicalPrice >= oldTypicalPrice;
            // Calculate raw money flow
            rawMoneyFlow = calculateRawMoneyFlow(newTypicalPrice, yValVolume[range]);
            // Add to array
            positiveMoneyFlow.push(isUp ? rawMoneyFlow : 0);
            negativeMoneyFlow.push(isUp ? 0 : rawMoneyFlow);
            range++;
        }
        for (i = range - 1; i < yValLen; i++) {
            if (i > range - 1) {
                // Remove first point from array
                positiveMoneyFlow.shift();
                negativeMoneyFlow.shift();
                // Calculate if up or down
                oldTypicalPrice = newTypicalPrice;
                newTypicalPrice = calculateTypicalPrice(yVal[i]);
                isUp = newTypicalPrice > oldTypicalPrice;
                // Calculate raw money flow
                rawMoneyFlow = calculateRawMoneyFlow(newTypicalPrice, yValVolume[i]);
                // Add to array
                positiveMoneyFlow.push(isUp ? rawMoneyFlow : 0);
                negativeMoneyFlow.push(isUp ? 0 : rawMoneyFlow);
            }
            // Calculate sum of negative and positive money flow:
            negativeMoneyFlowSum = sumArray(negativeMoneyFlow);
            positiveMoneyFlowSum = sumArray(positiveMoneyFlow);
            moneyFlowRatio = positiveMoneyFlowSum / negativeMoneyFlowSum;
            MFIPoint = toFixed(100 - (100 / (1 + moneyFlowRatio)), decimals);
            MFI.push([xVal[i], MFIPoint]);
            xData.push(xVal[i]);
            yData.push(MFIPoint);
        }
        return {
            values: MFI,
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
     * Money Flow Index. This series requires `linkedTo` option to be set and
     * should be loaded after the `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/mfi
     *         Money Flow Index Indicator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/mfi
     * @optionparent plotOptions.mfi
     */
    MFIIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index
         */
        params: {
            index: void 0, // Unchangeable index, do not inherit (#15362)
            /**
             * The id of volume series which is mandatory.
             * For example using OHLC data, volumeSeriesID='volume' means
             * the indicator will be calculated using OHLC and volume values.
             */
            volumeSeriesID: 'volume',
            /**
             * Number of maximum decimals that are used in MFI calculations.
             */
            decimals: 4
        }
    });
    return MFIIndicator;
}(SMAIndicator));
extend(MFIIndicator.prototype, {
    nameBase: 'Money Flow Index'
});
SeriesRegistry.registerSeriesType('mfi', MFIIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default MFIIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `MFI` series. If the [type](#series.mfi.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.mfi
 * @since     6.0.0
 * @excluding dataParser, dataURL
 * @product   highstock
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/mfi
 * @apioption series.mfi
 */
''; // To include the above in the js output
