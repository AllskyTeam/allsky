/* *
 *
 *  (c) 2010-2024 Sebastian Bochan, Rafal Sebestjanski
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
import LollipopPoint from './LollipopPoint.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import Series from '../../Core/Series/Series.js';
var _a = SeriesRegistry.seriesTypes, colProto = _a.column.prototype, dumbbellProto = _a.dumbbell.prototype, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
ScatterSeries = _a.scatter;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Lollipop series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.lollipop
 *
 * @augments Highcharts.Series
 *
 */
var LollipopSeries = /** @class */ (function (_super) {
    __extends(LollipopSeries, _super);
    function LollipopSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Extend the series' drawPoints method by applying a connector
     * and coloring markers.
     * @private
     *
     * @function Highcharts.Series#drawPoints
     */
    LollipopSeries.prototype.drawPoints = function () {
        var series = this, pointLength = series.points.length;
        var i = 0, point;
        _super.prototype.drawPoints.apply(series, arguments);
        // Draw connectors
        while (i < pointLength) {
            point = series.points[i];
            series.drawConnector(point);
            i++;
        }
    };
    /**
     * Extend the series' translate method to use grouping option.
     * @private
     *
     * @function Highcharts.Series#translate
     *
     */
    LollipopSeries.prototype.translate = function () {
        var series = this;
        colProto.translate.apply(series, arguments);
        // Correct x position
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var pointWidth = point.pointWidth, shapeArgs = point.shapeArgs;
            if (shapeArgs === null || shapeArgs === void 0 ? void 0 : shapeArgs.x) {
                shapeArgs.x += pointWidth / 2;
                point.plotX = shapeArgs.x || 0;
            }
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * The lollipop series is a carteseian series with a line anchored from
     * the x axis and a dot at the end to mark the value.
     * Requires `highcharts-more.js`, `modules/dumbbell.js` and
     * `modules/lollipop.js`.
     *
     * @sample {highcharts} highcharts/demo/lollipop/
     *         Lollipop chart
     * @sample {highcharts} highcharts/series-dumbbell/styled-mode-dumbbell/
     *         Styled mode
     *
     * @extends      plotOptions.dumbbell
     * @product      highcharts highstock
     * @excluding    fillColor, fillOpacity, lineWidth, stack, stacking,
     *               lowColor, stickyTracking, trackByArea
     * @since        8.0.0
     * @optionparent plotOptions.lollipop
     */
    LollipopSeries.defaultOptions = merge(Series.defaultOptions, {
        /** @ignore-option */
        threshold: 0,
        /** @ignore-option */
        connectorWidth: 1,
        /** @ignore-option */
        groupPadding: 0.2,
        /**
         * Whether to group non-stacked lollipop points or to let them
         * render independent of each other. Non-grouped lollipop points
         * will be laid out individually and overlap each other.
         *
         * @sample highcharts/series-lollipop/enabled-grouping/
         *         Multiple lollipop series with grouping
         * @sample highcharts/series-lollipop/disabled-grouping/
         *         Multiple lollipop series with disabled grouping
         *
         * @type      {boolean}
         * @default   true
         * @since     8.0.0
         * @product   highcharts highstock
         * @apioption plotOptions.lollipop.grouping
         */
        /** @ignore-option */
        pointPadding: 0.1,
        /** @ignore-option */
        states: {
            hover: {
                /** @ignore-option */
                lineWidthPlus: 0,
                /** @ignore-option */
                connectorWidthPlus: 1,
                /** @ignore-option */
                halo: false
            }
        },
        /** @ignore-option */
        lineWidth: 0,
        dataLabels: {
            align: void 0,
            verticalAlign: void 0
        },
        pointRange: 1
    });
    return LollipopSeries;
}(Series));
extend(LollipopSeries.prototype, {
    alignDataLabel: colProto.alignDataLabel,
    crispCol: colProto.crispCol,
    drawConnector: dumbbellProto.drawConnector,
    drawDataLabels: colProto.drawDataLabels,
    getColumnMetrics: colProto.getColumnMetrics,
    getConnectorAttribs: dumbbellProto.getConnectorAttribs,
    pointClass: LollipopPoint
});
SeriesRegistry.registerSeriesType('lollipop', LollipopSeries);
/* *
 *
 *  Default export
 *
 * */
export default LollipopSeries;
/**
 * The `lollipop` series. If the [type](#series.lollipop.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.lollipop
 * @excluding boostThreshold, boostBlending
 * @product   highcharts highstock
 * @requires  highcharts-more
 * @requires  modules/dumbbell
 * @requires  modules/lollipop
 * @apioption series.lollipop
 */
/**
 * An array of data points for the series. For the `lollipop` series type,
 * points can be given in the following ways:
 *
 * 1. An array of numerical values. In this case, the numerical values will be
 *    interpreted as `y` options. The `x` values will be automatically
 *    calculated, either starting at 0 and incremented by 1, or from
 *    `pointStart` and `pointInterval` given in the series options. If the axis
 *    has categories, these will be used. Example:
 *    ```js
 *    data: [0, 5, 3, 5]
 *    ```
 *
 * 2. An array of arrays with 2 values. In this case, the values correspond to
 *    `x,y`. If the first value is a string, it is applied as the name of the
 *    point, and the `x` value is inferred.
 *    ```js
 *    data: [
 *        [0, 6],
 *        [1, 2],
 *        [2, 6]
 *    ]
 *    ```
 *
 * 3. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.lollipop.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 1,
 *        y: 9,
 *        name: "Point2",
 *        color: "#00FF00",
 *        connectorWidth: 3,
 *        connectorColor: "#FF00FF"
 *    }, {
 *        x: 1,
 *        y: 6,
 *        name: "Point1",
 *        color: "#FF00FF"
 *    }]
 *    ```
 *
 * @sample {highcharts} highcharts/chart/reflow-true/
 *         Numerical values
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<number|Array<(number|string),(number|null)>|null|*>}
 * @extends   series.dumbbell.data
 * @excluding high, low, lowColor
 * @product   highcharts highstock
 * @apioption series.lollipop.data
 */
/**
 * The y value of the point.
 *
 * @type      {number|null}
 * @product   highcharts highstock
 * @apioption series.line.data.y
 */
(''); // Adds doclets above to transpiled file
