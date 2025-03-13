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
 * The Price Envelopes series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.priceenvelopes
 *
 * @augments Highcharts.Series
 */
var PriceEnvelopesIndicator = /** @class */ (function (_super) {
    __extends(PriceEnvelopesIndicator, _super);
    function PriceEnvelopesIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PriceEnvelopesIndicator.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        // Set default color for lines:
        this.options = merge({
            topLine: {
                styles: {
                    lineColor: this.color
                }
            },
            bottomLine: {
                styles: {
                    lineColor: this.color
                }
            }
        }, this.options);
    };
    PriceEnvelopesIndicator.prototype.getValues = function (series, params) {
        var period = params.period, topPercent = params.topBand, botPercent = params.bottomBand, xVal = series.xData, yVal = series.yData, yValLen = yVal ? yVal.length : 0, 
        // 0- date, 1-top line, 2-middle line, 3-bottom line
        PE = [], 
        // Middle line, top line and bottom line
        xData = [], yData = [];
        var ML, TL, BL, date, slicedX, slicedY, point, i;
        // Price envelopes requires close value
        if (xVal.length < period ||
            !isArray(yVal[0]) ||
            yVal[0].length !== 4) {
            return;
        }
        for (i = period; i <= yValLen; i++) {
            slicedX = xVal.slice(i - period, i);
            slicedY = yVal.slice(i - period, i);
            point = _super.prototype.getValues.call(this, {
                xData: slicedX,
                yData: slicedY
            }, params);
            date = point.xData[0];
            ML = point.yData[0];
            TL = ML * (1 + topPercent);
            BL = ML * (1 - botPercent);
            PE.push([date, TL, ML, BL]);
            xData.push(date);
            yData.push([TL, ML, BL]);
        }
        return {
            values: PE,
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
     * Price envelopes indicator based on [SMA](#plotOptions.sma) calculations.
     * This series requires the `linkedTo` option to be set and should be loaded
     * after the `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/price-envelopes
     *         Price envelopes
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/price-envelopes
     * @optionparent plotOptions.priceenvelopes
     */
    PriceEnvelopesIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        marker: {
            enabled: false
        },
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span><b> {series.name}</b><br/>Top: {point.top}<br/>Middle: {point.middle}<br/>Bottom: {point.bottom}<br/>'
        },
        params: {
            period: 20,
            /**
             * Percentage above the moving average that should be displayed.
             * 0.1 means 110%. Relative to the calculated value.
             */
            topBand: 0.1,
            /**
             * Percentage below the moving average that should be displayed.
             * 0.1 means 90%. Relative to the calculated value.
             */
            bottomBand: 0.1
        },
        /**
         * Bottom line options.
         */
        bottomLine: {
            styles: {
                /**
                 * Pixel width of the line.
                 */
                lineWidth: 1,
                /**
                 * Color of the line. If not set, it's inherited from
                 * [plotOptions.priceenvelopes.color](
                 * #plotOptions.priceenvelopes.color).
                 *
                 * @type {Highcharts.ColorString}
                 */
                lineColor: void 0
            }
        },
        /**
         * Top line options.
         *
         * @extends plotOptions.priceenvelopes.bottomLine
         */
        topLine: {
            styles: {
                lineWidth: 1
            }
        },
        dataGrouping: {
            approximation: 'averages'
        }
        /**
         * Option for fill color between lines in Price Envelopes Indicator.
         *
         * @sample {highstock} stock/indicators/indicator-area-fill
         *      Background fill between lines.
         *
         * @type      {Highcharts.Color}
         * @since 11.0.0
         * @apioption plotOptions.priceenvelopes.fillColor
         *
         */
    });
    return PriceEnvelopesIndicator;
}(SMAIndicator));
extend(PriceEnvelopesIndicator.prototype, {
    areaLinesNames: ['top', 'bottom'],
    linesApiNames: ['topLine', 'bottomLine'],
    nameComponents: ['period', 'topBand', 'bottomBand'],
    nameBase: 'Price envelopes',
    pointArrayMap: ['top', 'middle', 'bottom'],
    parallelArrays: ['x', 'y', 'top', 'bottom'],
    pointValKey: 'middle'
});
MultipleLinesComposition.compose(PriceEnvelopesIndicator);
SeriesRegistry.registerSeriesType('priceenvelopes', PriceEnvelopesIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default PriceEnvelopesIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A price envelopes indicator. If the [type](#series.priceenvelopes.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.priceenvelopes
 * @since     6.0.0
 * @excluding dataParser, dataURL
 * @product   highstock
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/price-envelopes
 * @apioption series.priceenvelopes
 */
''; // To include the above in the js output
