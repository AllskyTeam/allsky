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
import AD from '../AD/ADIndicator.js'; // For historic reasons, AD is built into Chaikin
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
var EMAIndicator = SeriesRegistry.seriesTypes.ema;
import U from '../../../Core/Utilities.js';
var correctFloat = U.correctFloat, extend = U.extend, merge = U.merge, error = U.error;
/* *
 *
 *  Class
 *
 * */
/**
 * The Chaikin series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.chaikin
 *
 * @augments Highcharts.Series
 */
var ChaikinIndicator = /** @class */ (function (_super) {
    __extends(ChaikinIndicator, _super);
    function ChaikinIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    ChaikinIndicator.prototype.getValues = function (series, params) {
        var periods = params.periods, period = params.period, 
        // 0- date, 1- Chaikin Oscillator
        CHA = [], xData = [], yData = [];
        var oscillator, i;
        // Check if periods are correct
        if (periods.length !== 2 || periods[1] <= periods[0]) {
            error('Error: "Chaikin requires two periods. Notice, first ' +
                'period should be lower than the second one."');
            return;
        }
        // Accumulation Distribution Line data
        var ADL = AD.prototype.getValues.call(this, series, {
            volumeSeriesID: params.volumeSeriesID,
            period: period
        });
        // Check if adl is calculated properly, if not skip
        if (!ADL) {
            return;
        }
        // Shorter Period EMA
        var SPE = _super.prototype.getValues.call(this, ADL, {
            period: periods[0]
        });
        // Longer Period EMA
        var LPE = _super.prototype.getValues.call(this, ADL, {
            period: periods[1]
        });
        // Check if ema is calculated properly, if not skip
        if (!SPE || !LPE) {
            return;
        }
        var periodsOffset = periods[1] - periods[0];
        for (i = 0; i < LPE.yData.length; i++) {
            oscillator = correctFloat(SPE.yData[i + periodsOffset] -
                LPE.yData[i]);
            CHA.push([LPE.xData[i], oscillator]);
            xData.push(LPE.xData[i]);
            yData.push(oscillator);
        }
        return {
            values: CHA,
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
     * Chaikin Oscillator. This series requires the `linkedTo` option to
     * be set and should be loaded after the `stock/indicators/indicators.js`.
     *
     * @sample {highstock} stock/indicators/chaikin
     *         Chaikin Oscillator
     *
     * @extends      plotOptions.ema
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, joinBy, keys, navigatorOptions,
     *               pointInterval, pointIntervalUnit, pointPlacement,
     *               pointRange, pointStart, showInNavigator, stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/chaikin
     * @optionparent plotOptions.chaikin
     */
    ChaikinIndicator.defaultOptions = merge(EMAIndicator.defaultOptions, {
        /**
         * Parameters used in calculation of Chaikin Oscillator
         * series points.
         *
         * @excluding index
         */
        params: {
            index: void 0, // Unused index, do not inherit (#15362)
            /**
             * The id of volume series which is mandatory.
             * For example using OHLC data, volumeSeriesID='volume' means
             * the indicator will be calculated using OHLC and volume values.
             */
            volumeSeriesID: 'volume',
            /**
             * Parameter used indirectly for calculating the `AD` indicator.
             * Decides about the number of data points that are taken
             * into account for the indicator calculations.
             */
            period: 9,
            /**
             * Periods for Chaikin Oscillator calculations.
             *
             * @type    {Array<number>}
             * @default [3, 10]
             */
            periods: [3, 10]
        }
    });
    return ChaikinIndicator;
}(EMAIndicator));
extend(ChaikinIndicator.prototype, {
    nameBase: 'Chaikin Osc',
    nameComponents: ['periods']
});
SeriesRegistry.registerSeriesType('chaikin', ChaikinIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default ChaikinIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `Chaikin Oscillator` series. If the [type](#series.chaikin.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.chaikin
 * @since     7.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis, dataParser, dataURL, joinBy, keys,
 *            navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, stacking, showInNavigator
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/chaikin
 * @apioption series.chaikin
 */
''; // To include the above in the js output
