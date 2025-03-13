/* *
 *
 *  (c) 2010-2024 Kacper Madej
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
import BulletPoint from './BulletPoint.js';
import BulletSeriesDefaults from './BulletSeriesDefaults.js';
import ColumnSeries from '../Column/ColumnSeries.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import U from '../../Core/Utilities.js';
var extend = U.extend, isNumber = U.isNumber, merge = U.merge, pick = U.pick, relativeLength = U.relativeLength;
/* *
 *
 *  Class
 *
 * */
/**
 * The bullet series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.bullet
 *
 * @augments Highcharts.Series
 */
var BulletSeries = /** @class */ (function (_super) {
    __extends(BulletSeries, _super);
    function BulletSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Draws the targets. For inverted chart, the `series.group` is rotated,
     * so the same coordinates apply. This method is based on column series
     * drawPoints function.
     *
     * @ignore
     * @function Highcharts.Series#drawPoints
     */
    BulletSeries.prototype.drawPoints = function () {
        var series = this, chart = series.chart, options = series.options, animationLimit = options.animationLimit || 250;
        _super.prototype.drawPoints.apply(this, arguments);
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var pointOptions = point.options, targetVal = point.target, pointVal = point.y;
            var targetShapeArgs = void 0, targetGraphic = point.targetGraphic, width = void 0, height = void 0, targetOptions = void 0, y = void 0;
            if (isNumber(targetVal) && targetVal !== null) {
                targetOptions = merge(options.targetOptions, pointOptions.targetOptions);
                height = targetOptions.height;
                var shapeArgs = point.shapeArgs;
                // #15547
                if (point.dlBox && shapeArgs && !isNumber(shapeArgs.width)) {
                    shapeArgs = point.dlBox;
                }
                width = relativeLength(targetOptions.width, shapeArgs.width);
                y = series.yAxis.translate(targetVal, false, true, false, true) - targetOptions.height / 2 - 0.5;
                targetShapeArgs = series.crispCol.apply({
                    // Use fake series object to set borderWidth of target
                    chart: chart,
                    borderWidth: targetOptions.borderWidth,
                    options: {
                        crisp: options.crisp
                    }
                }, [
                    (shapeArgs.x +
                        shapeArgs.width / 2 - width / 2),
                    y,
                    width,
                    height
                ]);
                if (targetGraphic) {
                    // Update
                    targetGraphic[chart.pointCount < animationLimit ?
                        'animate' :
                        'attr'](targetShapeArgs);
                    // Add or remove tooltip reference
                    if (isNumber(pointVal) && pointVal !== null) {
                        targetGraphic.element.point = point;
                    }
                    else {
                        targetGraphic.element.point = void 0;
                    }
                }
                else {
                    point.targetGraphic = targetGraphic = chart.renderer
                        .rect()
                        .attr(targetShapeArgs)
                        .add(series.group);
                }
                // Presentational
                if (!chart.styledMode) {
                    targetGraphic.attr({
                        fill: pick(targetOptions.color, pointOptions.color, (series.zones.length && (point.getZone.call({
                            series: series,
                            x: point.x,
                            y: targetVal,
                            options: {}
                        }).color || series.color)) || void 0, point.color, series.color),
                        stroke: pick(targetOptions.borderColor, point.borderColor, series.options.borderColor),
                        'stroke-width': targetOptions.borderWidth,
                        r: targetOptions.borderRadius
                    });
                }
                // Add tooltip reference
                if (isNumber(pointVal) && pointVal !== null) {
                    targetGraphic.element.point = point;
                }
                targetGraphic.addClass(point.getClassName() +
                    ' highcharts-bullet-target', true);
            }
            else if (targetGraphic) {
                // #1269:
                point.targetGraphic = targetGraphic.destroy();
            }
        }
    };
    /**
     * Includes target values to extend extremes from y values.
     *
     * @ignore
     * @function Highcharts.Series#getExtremes
     */
    BulletSeries.prototype.getExtremes = function (yData) {
        var dataExtremes = _super.prototype.getExtremes.call(this, yData), targetData = this.targetData;
        if (targetData && targetData.length) {
            var targetExtremes = _super.prototype.getExtremes.call(this, targetData);
            if (isNumber(targetExtremes.dataMin)) {
                dataExtremes.dataMin = Math.min(pick(dataExtremes.dataMin, Infinity), targetExtremes.dataMin);
            }
            if (isNumber(targetExtremes.dataMax)) {
                dataExtremes.dataMax = Math.max(pick(dataExtremes.dataMax, -Infinity), targetExtremes.dataMax);
            }
        }
        return dataExtremes;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    BulletSeries.defaultOptions = merge(ColumnSeries.defaultOptions, BulletSeriesDefaults);
    return BulletSeries;
}(ColumnSeries));
extend(BulletSeries.prototype, {
    parallelArrays: ['x', 'y', 'target'],
    pointArrayMap: ['y', 'target']
});
BulletSeries.prototype.pointClass = BulletPoint;
SeriesRegistry.registerSeriesType('bullet', BulletSeries);
/* *
 *
 *  Default Export
 *
 * */
export default BulletSeries;
