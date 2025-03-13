/* *
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Author: Lars A. V. Cabrera
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
import GanttPoint from './GanttPoint.js';
import GanttSeriesDefaults from './GanttSeriesDefaults.js';
import Pathfinder from '../../Gantt/Pathfinder.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var Series = SeriesRegistry.series, XRangeSeries = SeriesRegistry.seriesTypes.xrange;
import StaticScale from '../../Extensions/StaticScale.js';
import TreeGridAxis from '../../Core/Axis/TreeGrid/TreeGridAxis.js';
import U from '../../Core/Utilities.js';
var extend = U.extend, isNumber = U.isNumber, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.gantt
 *
 * @augments Highcharts.Series
 */
var GanttSeries = /** @class */ (function (_super) {
    __extends(GanttSeries, _super);
    function GanttSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    GanttSeries.compose = function (AxisClass, ChartClass, SeriesClass, TickClass) {
        XRangeSeries.compose(AxisClass);
        if (!ChartClass) {
            return;
        }
        StaticScale.compose(AxisClass, ChartClass);
        if (!SeriesClass) {
            return;
        }
        Pathfinder.compose(ChartClass, SeriesClass.prototype.pointClass);
        if (!TickClass) {
            return;
        }
        TreeGridAxis.compose(AxisClass, ChartClass, SeriesClass, TickClass);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Draws a single point in the series.
     *
     * This override draws the point as a diamond if point.options.milestone
     * is true, and uses the original drawPoint() if it is false or not set.
     *
     * @requires highcharts-gantt
     *
     * @private
     * @function Highcharts.seriesTypes.gantt#drawPoint
     *
     * @param {Highcharts.Point} point
     *        An instance of Point in the series
     *
     * @param {"animate"|"attr"} verb
     *        'animate' (animates changes) or 'attr' (sets options)
     */
    GanttSeries.prototype.drawPoint = function (point, verb) {
        var series = this, seriesOpts = series.options, renderer = series.chart.renderer, shapeArgs = point.shapeArgs, plotY = point.plotY, state = point.selected && 'select', cutOff = seriesOpts.stacking && !seriesOpts.borderRadius;
        var graphic = point.graphic, diamondShape;
        if (point.options.milestone) {
            if (isNumber(plotY) &&
                point.y !== null &&
                point.visible !== false) {
                diamondShape = renderer.symbols.diamond(shapeArgs.x || 0, shapeArgs.y || 0, shapeArgs.width || 0, shapeArgs.height || 0);
                if (graphic) {
                    graphic[verb]({
                        d: diamondShape
                    });
                }
                else {
                    point.graphic = graphic = renderer.path(diamondShape)
                        .addClass(point.getClassName(), true)
                        .add(point.group || series.group);
                }
                // Presentational
                if (!series.chart.styledMode) {
                    point.graphic
                        .attr(series.pointAttribs(point, state))
                        .shadow(seriesOpts.shadow, null, cutOff);
                }
            }
            else if (graphic) {
                point.graphic = graphic.destroy(); // #1269
            }
        }
        else {
            _super.prototype.drawPoint.call(this, point, verb);
        }
    };
    /**
     * Handle milestones, as they have no x2.
     * @private
     */
    GanttSeries.prototype.translatePoint = function (point) {
        var shapeArgs, size;
        _super.prototype.translatePoint.call(this, point);
        if (point.options.milestone) {
            shapeArgs = point.shapeArgs;
            size = shapeArgs.height || 0;
            point.shapeArgs = {
                x: (shapeArgs.x || 0) - (size / 2),
                y: shapeArgs.y,
                width: size,
                height: size
            };
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    GanttSeries.defaultOptions = merge(XRangeSeries.defaultOptions, GanttSeriesDefaults);
    return GanttSeries;
}(XRangeSeries));
extend(GanttSeries.prototype, {
    pointArrayMap: ['start', 'end', 'y'],
    pointClass: GanttPoint,
    setData: Series.prototype.setData
});
SeriesRegistry.registerSeriesType('gantt', GanttSeries);
/* *
 *
 *  Default Export
 *
 * */
export default GanttSeries;
