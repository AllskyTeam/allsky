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
import Palettes from '../../../Core/Color/Palettes.js';
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
var SMAIndicator = SeriesRegistry.seriesTypes.sma;
import U from '../../../Core/Utilities.js';
var merge = U.merge, extend = U.extend;
/* *
 *
 *  Class
 *
 * */
/**
 * The Price Channel series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pc
 *
 * @augments Highcharts.Series
 */
var PCIndicator = /** @class */ (function (_super) {
    __extends(PCIndicator, _super);
    function PCIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PCIndicator.prototype.getValues = function (series, params) {
        var period = params.period, xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, 
        // 0- date, 1-top line, 2-middle line, 3-bottom line
        PC = [], 
        // Middle line, top line and bottom line
        low = 2, high = 1, xData = [], yData = [];
        var ML, TL, BL, date, slicedY, extremes, i;
        if (yValLen < period) {
            return;
        }
        for (i = period; i <= yValLen; i++) {
            date = xVal[i - 1];
            slicedY = yVal.slice(i - period, i);
            extremes = AU.getArrayExtremes(slicedY, low, high);
            TL = extremes[1];
            BL = extremes[0];
            ML = (TL + BL) / 2;
            PC.push([date, TL, ML, BL]);
            xData.push(date);
            yData.push([TL, ML, BL]);
        }
        return {
            values: PC,
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
     * Price channel (PC). This series requires the `linkedTo` option to be
     * set and should be loaded after the `stock/indicators/indicators.js`.
     *
     * @sample {highstock} stock/indicators/price-channel
     *         Price Channel
     *
     * @extends      plotOptions.sma
     * @since        7.0.0
     * @product      highstock
     * @excluding    allAreas, colorAxis, compare, compareBase, joinBy, keys,
     *               navigatorOptions, pointInterval, pointIntervalUnit,
     *               pointPlacement, pointRange, pointStart, showInNavigator,
     *               stacking
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/price-channel
     * @optionparent plotOptions.pc
     */
    PCIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * Option for fill color between lines in Price channel Indicator.
         *
         * @sample {highstock} stock/indicators/indicator-area-fill
         *      background fill between lines
         *
         * @type {Highcharts.Color}
         * @apioption plotOptions.pc.fillColor
         *
         */
        /**
         * @excluding index
         */
        params: {
            index: void 0, // Unchangeable index, do not inherit (#15362)
            period: 20
        },
        lineWidth: 1,
        topLine: {
            styles: {
                /**
                 * Color of the top line. If not set, it's inherited from
                 * [plotOptions.pc.color](#plotOptions.pc.color).
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: Palettes.colors[2],
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1
            }
        },
        bottomLine: {
            styles: {
                /**
                 * Color of the bottom line. If not set, it's inherited from
                 * [plotOptions.pc.color](#plotOptions.pc.color).
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: Palettes.colors[8],
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1
            }
        },
        dataGrouping: {
            approximation: 'averages'
        }
    });
    return PCIndicator;
}(SMAIndicator));
extend(PCIndicator.prototype, {
    areaLinesNames: ['top', 'bottom'],
    nameBase: 'Price Channel',
    nameComponents: ['period'],
    linesApiNames: ['topLine', 'bottomLine'],
    pointArrayMap: ['top', 'middle', 'bottom'],
    pointValKey: 'middle'
});
MultipleLinesComposition.compose(PCIndicator);
SeriesRegistry.registerSeriesType('pc', PCIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default PCIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A Price channel indicator. If the [type](#series.pc.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends      series,plotOptions.pc
 * @since        7.0.0
 * @product      highstock
 * @excluding    allAreas, colorAxis, compare, compareBase, dataParser, dataURL,
 *               joinBy, keys, navigatorOptions, pointInterval,
 *               pointIntervalUnit, pointPlacement, pointRange, pointStart,
 *               showInNavigator, stacking
 * @requires     stock/indicators/indicators
 * @requires     stock/indicators/price-channel
 * @apioption    series.pc
 */
''; // To include the above in the js output
