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
import AU from '../ArrayUtilities.js';
import MultipleLinesComposition from '../MultipleLinesComposition.js';
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
var SMAIndicator = SeriesRegistry.seriesTypes.sma;
import U from '../../../Core/Utilities.js';
var extend = U.extend, isArray = U.isArray, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Stochastic series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.stochastic
 *
 * @augments Highcharts.Series
 */
var StochasticIndicator = /** @class */ (function (_super) {
    __extends(StochasticIndicator, _super);
    function StochasticIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    StochasticIndicator.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        // Set default color for lines:
        this.options = merge({
            smoothedLine: {
                styles: {
                    lineColor: this.color
                }
            }
        }, this.options);
    };
    StochasticIndicator.prototype.getValues = function (series, params) {
        var periodK = params.periods[0], periodD = params.periods[1], xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, 
        // 0- date, 1-%K, 2-%D
        SO = [], xData = [], yData = [], close = 3, low = 2, high = 1;
        var slicedY, CL, HL, LL, K, D = null, points, extremes, i;
        // Stochastic requires close value
        if (yValLen < periodK ||
            !isArray(yVal[0]) ||
            yVal[0].length !== 4) {
            return;
        }
        // If the value of initial points is constant, wait until it changes
        // to calculate correct Stochastic values
        var constantValues = true, j = 0;
        // For a N-period, we start from N-1 point, to calculate Nth point
        // That is why we later need to comprehend slice() elements list
        // with (+1)
        for (i = periodK - 1; i < yValLen; i++) {
            slicedY = yVal.slice(i - periodK + 1, i + 1);
            // Calculate %K
            extremes = AU.getArrayExtremes(slicedY, low, high);
            LL = extremes[0]; // Lowest low in %K periods
            CL = yVal[i][close] - LL;
            HL = extremes[1] - LL;
            K = CL / HL * 100;
            if (isNaN(K) && constantValues) {
                j++;
                continue;
            }
            else if (constantValues && !isNaN(K)) {
                constantValues = false;
            }
            var length_1 = xData.push(xVal[i]);
            // If N-period previous values are constant which results in NaN %K,
            // we need to use previous %K value if it is a number,
            // otherwise we should use null
            if (isNaN(K)) {
                yData.push([
                    yData[length_1 - 2] &&
                        typeof yData[length_1 - 2][0] === 'number' ?
                        yData[length_1 - 2][0] : null,
                    null
                ]);
            }
            else {
                yData.push([K, null]);
            }
            // Calculate smoothed %D, which is SMA of %K
            if (i >= j + (periodK - 1) + (periodD - 1)) {
                points = _super.prototype.getValues.call(this, {
                    xData: xData.slice(-periodD),
                    yData: yData.slice(-periodD)
                }, {
                    period: periodD
                });
                D = points.yData[0];
            }
            SO.push([xVal[i], K, D]);
            yData[length_1 - 1][1] = D;
        }
        return {
            values: SO,
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
     * Stochastic oscillator. This series requires the `linkedTo` option to be
     * set and should be loaded after the `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/stochastic
     *         Stochastic oscillator
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, joinBy, keys, navigatorOptions,
     *               pointInterval, pointIntervalUnit, pointPlacement,
     *               pointRange, pointStart, showInNavigator, stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/stochastic
     * @optionparent plotOptions.stochastic
     */
    StochasticIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index, period
         */
        params: {
            // Index and period are unchangeable, do not inherit (#15362)
            index: void 0,
            period: void 0,
            /**
             * Periods for Stochastic oscillator: [%K, %D].
             *
             * @type    {Array<number,number>}
             * @default [14, 3]
             */
            periods: [14, 3]
        },
        marker: {
            enabled: false
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span><b> {series.name}</b><br/>%K: {point.y}<br/>%D: {point.smoothed}<br/>'
        },
        /**
         * Smoothed line options.
         */
        smoothedLine: {
            /**
             * Styles for a smoothed line.
             */
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line. If not set, it's inherited from
                 * [plotOptions.stochastic.color
                 * ](#plotOptions.stochastic.color).
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        dataGrouping: {
            approximation: 'averages'
        }
    });
    return StochasticIndicator;
}(SMAIndicator));
extend(StochasticIndicator.prototype, {
    areaLinesNames: [],
    nameComponents: ['periods'],
    nameBase: 'Stochastic',
    pointArrayMap: ['y', 'smoothed'],
    parallelArrays: ['x', 'y', 'smoothed'],
    pointValKey: 'y',
    linesApiNames: ['smoothedLine']
});
MultipleLinesComposition.compose(StochasticIndicator);
SeriesRegistry.registerSeriesType('stochastic', StochasticIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default StochasticIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A Stochastic indicator. If the [type](#series.stochastic.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.stochastic
 * @since     6.0.0
 * @product   highstock
 * @excluding allAreas, colorAxis,  dataParser, dataURL, joinBy, keys,
 *            navigatorOptions, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointRange, pointStart, showInNavigator, stacking
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/stochastic
 * @apioption series.stochastic
 */
''; // To include the above in the js output
