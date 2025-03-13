/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
/* *
 *
 *  Imports
 *
 * */
import HollowCandlestickPoint from './HollowCandlestickPoint.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import U from '../../Core/Utilities.js';
import Axis from '../../Core/Axis/Axis.js';
const { seriesTypes: { candlestick: CandlestickSeries } } = SeriesRegistry;
const { addEvent, merge } = U;
/* *
 *
 *  Code
 *
 * */
/**
 * The hollowcandlestick series.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.hollowcandlestick
 *
 * @augments Highcharts.seriesTypes.candlestick
 */
class HollowCandlestickSeries extends CandlestickSeries {
    constructor() {
        /* *
         *
         * Static properties
         *
         * */
        super(...arguments);
        this.hollowCandlestickData = [];
        /* eslint-disable valid-jsdoc */
    }
    /* *
     *
     * Functions
     *
     * */
    /**
     * Iterate through all points and get their type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getPriceMovement
     *
     *
     */
    getPriceMovement() {
        const series = this, table = series.allGroupedTable || series.dataTable, dataLength = table.rowCount, hollowCandlestickData = this.hollowCandlestickData;
        hollowCandlestickData.length = 0;
        let previousDataArr;
        for (let i = 0; i < dataLength; i++) {
            const dataArr = table.getRow(i, this.pointArrayMap);
            hollowCandlestickData.push(series.isBullish(dataArr, 
            // Determine the first point is bullish based on
            // its open and close values.(#21683)
            i ? previousDataArr : dataArr));
            previousDataArr = dataArr;
        }
    }
    /**
     * Return line color based on candle type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getLineColor
     *
     * @param {string} trendDirection
     * Type of candle direction (bearish/bullish)(down/up).
     *
     * @return {ColorType}
     * Line color
     */
    getLineColor(trendDirection) {
        const series = this;
        // Return line color based on trend direction
        return trendDirection === 'up' ?
            series.options.upColor || "#06b535" /* Palette.positiveColor */ :
            series.options.color || "#f21313" /* Palette.negativeColor */;
    }
    /**
     * Return fill color based on candle type.
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#getPointFill
     *
     * @param {HollowcandleInfo} hollowcandleInfo
     *        Information about the current candle.
     *
     * @return {ColorType}
     * Point fill color
     */
    getPointFill(hollowcandleInfo) {
        const series = this;
        // Return fill color only for bearish candles.
        if (hollowcandleInfo.isBullish) {
            return 'transparent';
        }
        return hollowcandleInfo.trendDirection === 'up' ?
            series.options.upColor || "#06b535" /* Palette.positiveColor */ :
            series.options.color || "#f21313" /* Palette.negativeColor */;
    }
    /**
     * @private
     * @function Highcharts.seriesTypes.hollowcandlestick#init
     */
    init() {
        super.init.apply(this, arguments);
        this.hollowCandlestickData = [];
    }
    /**
     * Check if the candle is bearish or bullish. For bullish one, return true.
     * For bearish, return string depending on the previous point.
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#isBullish
     *
     * @param {Array<(number)>} dataPoint
     * Current point which we calculate.
     *
     * @param {Array<(number)>} previousDataPoint
     * Previous point.
     */
    isBullish(dataPoint, previousDataPoint) {
        return {
            // Compare points' open and close value.
            isBullish: (dataPoint[0] || 0) <= (dataPoint[3] || 0),
            // For bearish candles.
            trendDirection: (dataPoint[3] || 0) < (previousDataPoint?.[3] || 0) ?
                'down' : 'up'
        };
    }
    /**
     * Add color and fill attribute for each point.
     *
     * @private
     *
     * @function Highcharts.seriesTypes.hollowcandlestick#pointAttribs
     *
     * @param {HollowCandlestickPoint} point
     * Point to which we are adding attributes.
     *
     * @param {StatesOptionsKey} state
     * Current point state.
     */
    pointAttribs(point, state) {
        const attribs = super.pointAttribs.call(this, point, state);
        let stateOptions;
        const index = point.index, hollowcandleInfo = this.hollowCandlestickData[index];
        attribs.fill = this.getPointFill(hollowcandleInfo) || attribs.fill;
        attribs.stroke = this.getLineColor(hollowcandleInfo.trendDirection) ||
            attribs.stroke;
        // Select or hover states
        if (state) {
            stateOptions = this.options.states[state];
            attribs.fill = stateOptions.color || attribs.fill;
            attribs.stroke = stateOptions.lineColor || attribs.stroke;
            attribs['stroke-width'] =
                stateOptions.lineWidth || attribs['stroke-width'];
        }
        return attribs;
    }
}
/**
 * A hollow candlestick chart is a style of financial chart used to
 * describe price movements over time.
 *
 * @sample stock/demo/hollow-candlestick/
 *         Hollow Candlestick chart
 *
 * @extends      plotOptions.candlestick
 * @product      highstock
 * @requires     modules/hollowcandlestick
 * @optionparent plotOptions.hollowcandlestick
 */
HollowCandlestickSeries.defaultOptions = merge(CandlestickSeries.defaultOptions, {
    /**
     * The fill color of the candlestick when the current
     * close is lower than the previous one.
     *
     * @sample stock/plotoptions/hollow-candlestick-color/
     *     Custom colors
     * @sample {highstock} highcharts/css/hollow-candlestick/
     *         Colors in styled mode
     *
     * @type    {ColorType}
     * @product highstock
     */
    color: "#f21313" /* Palette.negativeColor */,
    dataGrouping: {
        groupAll: true,
        groupPixelWidth: 10
    },
    /**
     * The color of the line/border of the hollow candlestick when
     * the current close is lower than the previous one.
     *
     * @sample stock/plotoptions/hollow-candlestick-color/
     *     Custom colors
     * @sample {highstock} highcharts/css/hollow-candlestick/
     *         Colors in styled mode
     *
     * @type    {ColorType}
     * @product highstock
     */
    lineColor: "#f21313" /* Palette.negativeColor */,
    /**
     * The fill color of the candlestick when the current
     * close is higher than the previous one.
     *
     * @sample stock/plotoptions/hollow-candlestick-color/
     *     Custom colors
     * @sample {highstock} highcharts/css/hollow-candlestick/
     *         Colors in styled mode
     *
     * @type    {ColorType}
     * @product highstock
     */
    upColor: "#06b535" /* Palette.positiveColor */,
    /**
     * The color of the line/border of the hollow candlestick when
     * the current close is higher than the previous one.
     *
     * @sample stock/plotoptions/hollow-candlestick-color/
     *     Custom colors
     * @sample {highstock} highcharts/css/hollow-candlestick/
     *         Colors in styled mode
     *
     * @type    {ColorType}
     * @product highstock
     */
    upLineColor: "#06b535" /* Palette.positiveColor */
});
// Force to recalculate the hollowcandlestick data set after updating data.
addEvent(HollowCandlestickSeries, 'updatedData', function () {
    if (this.hollowCandlestickData.length) {
        this.hollowCandlestickData.length = 0;
    }
});
// After processing and grouping the data,
// check if the candle is bearish or bullish.
// Required for further calculation.
addEvent(Axis, 'postProcessData', function () {
    const axis = this, series = axis.series;
    series.forEach(function (series) {
        if (series.is('hollowcandlestick')) {
            const hollowcandlestickSeries = series;
            hollowcandlestickSeries.getPriceMovement();
        }
    });
});
/* *
 *
 *  Class Prototype
 *
 * */
HollowCandlestickSeries.prototype.pointClass = HollowCandlestickPoint;
SeriesRegistry.registerSeriesType('hollowcandlestick', HollowCandlestickSeries);
/* *
 *
 * Default Export
 *
 * */
export default HollowCandlestickSeries;
/* *
 *
 * API Options
 *
 * */
/**
 * A `hollowcandlestick` series. If the [type](#series.candlestick.type)
 * option is not specified, it is inherited from [chart.type](
 * #chart.type).
 *
 * @type      {*}
 * @extends   series,plotOptions.hollowcandlestick
 * @excluding dataParser, dataURL, marker
 * @product   highstock
 * @apioption series.hollowcandlestick
 */
/**
 * An array of data points for the series. For the `hollowcandlestick` series
 * type, points can be given in the following ways:
 *
 * 1. An array of arrays with 5 or 4 values. In this case, the values correspond
 *    to `x,open,high,low,close`. If the first value is a string, it is applied
 *    as the name of the point, and the `x` value is inferred. The `x` value can
 *    also be omitted, in which case the inner arrays should be of length 4.
 *    Then the `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *    data: [
 *        [0, 7, 2, 0, 4],
 *        [1, 1, 4, 2, 8],
 *        [2, 3, 3, 9, 3]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.hollowcandlestick.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 1,
 *        open: 9,
 *        high: 2,
 *        low: 4,
 *        close: 6,
 *        name: "Point2",
 *        color: "#00FF00"
 *    }, {
 *        x: 1,
 *        open: 1,
 *        high: 4,
 *        low: 7,
 *        close: 7,
 *        name: "Point1",
 *        color: "#FF00FF"
 *    }]
 *    ```
 *
 * @type      {Array<Array<(number|string),number,number,number>|Array<(number|string),number,number,number,number>|*>}
 * @extends   series.candlestick.data
 * @excluding y
 * @product   highstock
 * @apioption series.hollowcandlestick.data
 */
''; // Adds doclets above to transpiled
