/* *
 *
 *  (c) 2010-2024 Sebastian Bochan
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
import ColumnPyramidSeriesDefaults from './ColumnPyramidSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnSeries = SeriesRegistry.seriesTypes.column;
import U from '../../Core/Utilities.js';
var clamp = U.clamp, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * The ColumnPyramidSeries class
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.columnpyramid
 *
 * @augments Highcharts.Series
 */
var ColumnPyramidSeries = /** @class */ (function (_super) {
    __extends(ColumnPyramidSeries, _super);
    function ColumnPyramidSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Overrides the column translate method
     * @private
     */
    ColumnPyramidSeries.prototype.translate = function () {
        var series = this, chart = series.chart, options = series.options, dense = series.dense =
            series.closestPointRange * series.xAxis.transA < 2, borderWidth = series.borderWidth = pick(options.borderWidth, dense ? 0 : 1 // #3635
        ), yAxis = series.yAxis, threshold = options.threshold, minPointLength = pick(options.minPointLength, 5), metrics = series.getColumnMetrics(), pointWidth = metrics.width, pointXOffset = series.pointXOffset = metrics.offset;
        var translatedThreshold = series.translatedThreshold =
            yAxis.getThreshold(threshold), 
        // Postprocessed for border width
        seriesBarW = series.barW =
            Math.max(pointWidth, 1 + 2 * borderWidth);
        if (chart.inverted) {
            translatedThreshold -= 0.5; // #3355
        }
        // When the pointPadding is 0,
        // we want the pyramids to be packed tightly,
        // so we allow individual pyramids to have individual sizes.
        // When pointPadding is greater,
        // we strive for equal-width columns (#2694).
        if (options.pointPadding) {
            seriesBarW = Math.ceil(seriesBarW);
        }
        _super.prototype.translate.call(this);
        // Record the new values
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var yBottom = pick(point.yBottom, translatedThreshold), safeDistance = 999 + Math.abs(yBottom), plotY = clamp(point.plotY, -safeDistance, yAxis.len + safeDistance), 
            // Don't draw too far outside plot area
            // (#1303, #2241, #4264)
            barW = seriesBarW / 2, barY = Math.min(plotY, yBottom), barH = Math.max(plotY, yBottom) - barY;
            var barX = point.plotX + pointXOffset, stackTotal = void 0, stackHeight = void 0, topXwidth = void 0, bottomXwidth = void 0, invBarPos = void 0, x1 = void 0, x2 = void 0, x3 = void 0, x4 = void 0, y1 = void 0, y2 = void 0;
            // Adjust for null or missing points
            if (options.centerInCategory) {
                barX = series.adjustForMissingColumns(barX, pointWidth, point, metrics);
            }
            point.barX = barX;
            point.pointWidth = pointWidth;
            // Fix the tooltip on center of grouped pyramids
            // (#1216, #424, #3648)
            point.tooltipPos = chart.inverted ?
                [
                    yAxis.len + yAxis.pos - chart.plotLeft - plotY,
                    series.xAxis.len - barX - barW,
                    barH
                ] :
                [
                    barX + barW,
                    plotY + yAxis.pos - chart.plotTop,
                    barH
                ];
            stackTotal =
                threshold + (point.total || point.y);
            // Overwrite stacktotal (always 100 / -100)
            if (options.stacking === 'percent') {
                stackTotal =
                    threshold + (point.y < 0) ?
                        -100 :
                        100;
            }
            // Get the highest point (if stack, extract from total)
            var topPointY = yAxis.toPixels((stackTotal), true);
            // Calculate height of stack (in pixels)
            stackHeight =
                chart.plotHeight - topPointY -
                    (chart.plotHeight - translatedThreshold);
            // `topXwidth` and `bottomXwidth` = width of lines from the center
            // calculated from tanges proportion. Cannot be a NaN #12514.
            topXwidth = stackHeight ?
                (barW * (barY - topPointY)) / stackHeight : 0;
            // Like topXwidth, but with height of point
            bottomXwidth = stackHeight ?
                (barW * (barY + barH - topPointY)) / stackHeight :
                0;
            /*
                    /\
                   /  \
            x1,y1,------ x2,y1
                /       \
               -----------
            x4,y2        x3,y2
            */
            x1 = barX - topXwidth + barW;
            x2 = barX + topXwidth + barW;
            x3 = barX + bottomXwidth + barW;
            x4 = barX - bottomXwidth + barW;
            y1 = barY - minPointLength;
            y2 = barY + barH;
            if (point.y < 0) {
                y1 = barY;
                y2 = barY + barH + minPointLength;
            }
            // Inverted chart
            if (chart.inverted) {
                invBarPos = yAxis.width - barY;
                stackHeight =
                    topPointY - (yAxis.width - translatedThreshold);
                // Proportion tanges
                topXwidth = (barW *
                    (topPointY - invBarPos)) / stackHeight;
                bottomXwidth = (barW *
                    (topPointY - (invBarPos - barH))) / stackHeight;
                x1 = barX + barW + topXwidth; // Top bottom
                x2 = x1 - 2 * topXwidth; // Top top
                x3 = barX - bottomXwidth + barW; // Bottom top
                x4 = barX + bottomXwidth + barW; // Bottom bottom
                y1 = barY;
                y2 = barY + barH - minPointLength;
                if (point.y < 0) {
                    y2 = barY + barH + minPointLength;
                }
            }
            // Register shape type and arguments to be used in drawPoints
            point.shapeType = 'path';
            point.shapeArgs = {
                x: x1,
                y: y1,
                width: x2 - x1,
                height: barH,
                // Path of pyramid
                d: [
                    ['M', x1, y1],
                    ['L', x2, y1],
                    ['L', x3, y2],
                    ['L', x4, y2],
                    ['Z']
                ]
            };
        }
    };
    /* *
     *
     *  Static properties
     *
     * */
    ColumnPyramidSeries.defaultOptions = merge(ColumnSeries.defaultOptions, ColumnPyramidSeriesDefaults);
    return ColumnPyramidSeries;
}(ColumnSeries));
SeriesRegistry.registerSeriesType('columnpyramid', ColumnPyramidSeries);
/* *
 *
 *  Default Export
 *
 * */
export default ColumnPyramidSeries;
