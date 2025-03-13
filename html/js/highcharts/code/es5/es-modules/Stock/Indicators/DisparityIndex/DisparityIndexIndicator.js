/* *
 *  (c) 2010-2024 Rafal Sebestjanski
 *
 *  Disparity Index technical indicator for Highcharts Stock
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
var correctFloat = U.correctFloat, defined = U.defined, extend = U.extend, isArray = U.isArray, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Disparity Index series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.disparityindex
 *
 * @augments Highcharts.Series
 */
var DisparityIndexIndicator = /** @class */ (function (_super) {
    __extends(DisparityIndexIndicator, _super);
    function DisparityIndexIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    DisparityIndexIndicator.prototype.init = function () {
        var args = arguments, ctx = this, // Disparity Index indicator
        params = args[1].params, // Options.params
        averageType = params && params.average ? params.average : void 0;
        ctx.averageIndicator = SeriesRegistry
            .seriesTypes[averageType] || SMAIndicator;
        ctx.averageIndicator.prototype.init.apply(ctx, args);
    };
    DisparityIndexIndicator.prototype.calculateDisparityIndex = function (curPrice, periodAverage) {
        return correctFloat(curPrice - periodAverage) / periodAverage * 100;
    };
    DisparityIndexIndicator.prototype.getValues = function (series, params) {
        var index = params.index, xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, disparityIndexPoint = [], xData = [], yData = [], 
        // "as any" because getValues doesn't exist on typeof Series
        averageIndicator = this.averageIndicator, isOHLC = isArray(yVal[0]), 
        // Get the average indicator's values
        values = averageIndicator.prototype.getValues(series, params), yValues = values.yData, start = xVal.indexOf(values.xData[0]);
        // Check period, if bigger than points length, skip
        if (!yValues || yValues.length === 0 ||
            !defined(index) ||
            yVal.length <= start) {
            return;
        }
        // Get the Disparity Index indicator's values
        for (var i = start; i < yValLen; i++) {
            var disparityIndexValue = this.calculateDisparityIndex(isOHLC ? yVal[i][index] : yVal[i], yValues[i - start]);
            disparityIndexPoint.push([
                xVal[i],
                disparityIndexValue
            ]);
            xData.push(xVal[i]);
            yData.push(disparityIndexValue);
        }
        return {
            values: disparityIndexPoint,
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
     * Disparity Index.
     * This series requires the `linkedTo` option to be set and should
     * be loaded after the `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/disparity-index
     *         Disparity Index indicator
     *
     * @extends      plotOptions.sma
     * @since 9.1.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, joinBy, keys, navigatorOptions,
     *               pointInterval, pointIntervalUnit, pointPlacement,
     *               pointRange, pointStart, showInNavigator, stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/disparity-index
     * @optionparent plotOptions.disparityindex
     */
    DisparityIndexIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        params: {
            /**
             * The average used to calculate the Disparity Index indicator.
             * By default it uses SMA, with EMA as an option. To use other
             * averages, e.g. TEMA, the `stock/indicators/tema.js` file needs to
             * be loaded.
             *
             * If value is different than `ema`, `dema`, `tema` or `wma`,
             * then sma is used.
             */
            average: 'sma',
            index: 3
        },
        marker: {
            enabled: false
        },
        dataGrouping: {
            approximation: 'averages'
        }
    });
    return DisparityIndexIndicator;
}(SMAIndicator));
extend(DisparityIndexIndicator.prototype, {
    nameBase: 'Disparity Index',
    nameComponents: ['period', 'average']
});
SeriesRegistry.registerSeriesType('disparityindex', DisparityIndexIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default DisparityIndexIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * The Disparity Index indicator series.
 * If the [type](#series.disparityindex.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.disparityindex
 * @since 9.1.0
 * @product   highstock
 * @excluding allAreas, colorAxis,  dataParser, dataURL, joinBy, keys,
 *            navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/disparity-index
 * @apioption series.disparityindex
 */
''; // To include the above in the js output
