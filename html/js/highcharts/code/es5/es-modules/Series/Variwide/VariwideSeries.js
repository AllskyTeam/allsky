/* *
 *
 *  Highcharts variwide module
 *
 *  (c) 2010-2024 Torstein Honsi
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
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnSeries = SeriesRegistry.seriesTypes.column;
import VariwideComposition from './VariwideComposition.js';
import VariwidePoint from './VariwidePoint.js';
import VariwideSeriesDefaults from './VariwideSeriesDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, crisp = U.crisp, extend = U.extend, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.variwide
 *
 * @augments Highcharts.Series
 */
var VariwideSeries = /** @class */ (function (_super) {
    __extends(VariwideSeries, _super);
    function VariwideSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     * Functions
     *
     * */
    VariwideSeries.prototype.processData = function (force) {
        this.totalZ = 0;
        this.relZ = [];
        SeriesRegistry.seriesTypes.column.prototype.processData.call(this, force);
        var zData = this.getColumn('z');
        (this.xAxis.reversed ?
            zData.slice().reverse() :
            zData).forEach(function (z, i) {
            this.relZ[i] = this.totalZ;
            this.totalZ += z;
        }, this);
        if (this.xAxis.categories) {
            this.xAxis.variwide = true;
            this.xAxis.zData = zData; // Used for label rank
        }
        return;
    };
    /**
     * Translate an x value inside a given category index into the distorted
     * axis translation.
     *
     * @private
     * @function Highcharts.Series#postTranslate
     *
     * @param {number} index
     *        The category index
     *
     * @param {number} x
     *        The X pixel position in undistorted axis pixels
     *
     * @param {Highcharts.Point} point
     *        For crosshairWidth for every point
     *
     * @return {number}
     *         Distorted X position
     */
    VariwideSeries.prototype.postTranslate = function (index, x, point) {
        var axis = this.xAxis, relZ = this.relZ, i = axis.reversed ? relZ.length - index : index, goRight = axis.reversed ? -1 : 1, minPx = axis.toPixels(axis.reversed ?
            (axis.dataMax || 0) + axis.pointRange :
            (axis.dataMin || 0)), maxPx = axis.toPixels(axis.reversed ?
            (axis.dataMin || 0) :
            (axis.dataMax || 0) + axis.pointRange), len = Math.abs(maxPx - minPx), totalZ = this.totalZ, left = this.chart.inverted ?
            maxPx - (this.chart.plotTop - goRight * axis.minPixelPadding) :
            minPx - this.chart.plotLeft - goRight * axis.minPixelPadding, linearSlotLeft = i / relZ.length * len, linearSlotRight = (i + goRight) / relZ.length * len, slotLeft = (pick(relZ[i], totalZ) / totalZ) * len, slotRight = (pick(relZ[i + goRight], totalZ) / totalZ) * len, xInsideLinearSlot = (x - (left + linearSlotLeft));
        // Set crosshairWidth for every point (#8173)
        if (point) {
            point.crosshairWidth = slotRight - slotLeft;
        }
        return left + slotLeft +
            xInsideLinearSlot * (slotRight - slotLeft) /
                (linearSlotRight - linearSlotLeft);
    };
    /* eslint-enable valid-jsdoc */
    VariwideSeries.prototype.translate = function () {
        // Temporarily disable crisping when computing original shapeArgs
        this.crispOption = this.options.crisp;
        this.options.crisp = false;
        _super.prototype.translate.call(this);
        // Reset option
        this.options.crisp = this.crispOption;
    };
    /**
     * Function that corrects stack labels positions
     * @private
     */
    VariwideSeries.prototype.correctStackLabels = function () {
        var series = this, options = series.options, yAxis = series.yAxis;
        var pointStack, pointWidth, stack, xValue;
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            xValue = point.x;
            pointWidth = point.shapeArgs.width;
            stack = yAxis.stacking.stacks[(series.negStacks &&
                point.y < (options.startFromThreshold ?
                    0 :
                    options.threshold) ?
                '-' :
                '') + series.stackKey];
            if (stack) {
                pointStack = stack[xValue];
                if (pointStack && !point.isNull) {
                    pointStack.setOffset(-(pointWidth / 2) || 0, pointWidth || 0, void 0, void 0, point.plotX, series.xAxis);
                }
            }
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    VariwideSeries.compose = VariwideComposition.compose;
    VariwideSeries.defaultOptions = merge(ColumnSeries.defaultOptions, VariwideSeriesDefaults);
    return VariwideSeries;
}(ColumnSeries));
// Extend translation by distorting X position based on Z.
addEvent(VariwideSeries, 'afterColumnTranslate', function () {
    // Temporarily disable crisping when computing original shapeArgs
    var xAxis = this.xAxis, inverted = this.chart.inverted;
    var i = -1;
    // Distort the points to reflect z dimension
    for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
        var point = _a[_i];
        ++i;
        var shapeArgs = point.shapeArgs || {}, _b = shapeArgs.x, x = _b === void 0 ? 0 : _b, _c = shapeArgs.width, width = _c === void 0 ? 0 : _c, _d = point.plotX, plotX = _d === void 0 ? 0 : _d, tooltipPos = point.tooltipPos, _e = point.z, z = _e === void 0 ? 0 : _e;
        var left = void 0, right = void 0;
        if (xAxis.variwide) {
            left = this.postTranslate(i, x, point);
            right = this.postTranslate(i, x + width);
            // For linear or datetime axes, the variwide column should start with X
            // and extend Z units, without modifying the axis.
        }
        else {
            left = plotX;
            right = xAxis.translate(point.x + z, false, false, false, true);
        }
        if (this.crispOption) {
            left = crisp(left, this.borderWidth);
            right = crisp(right, this.borderWidth);
        }
        shapeArgs.x = left;
        shapeArgs.width = Math.max(right - left, 1);
        // Crosshair position (#8083)
        point.plotX = (left + right) / 2;
        // Adjust the tooltip position
        if (tooltipPos) {
            if (!inverted) {
                tooltipPos[0] = shapeArgs.x + shapeArgs.width / 2;
            }
            else {
                tooltipPos[1] = xAxis.len - shapeArgs.x - shapeArgs.width / 2;
            }
        }
    }
    if (this.options.stacking) {
        this.correctStackLabels();
    }
}, { order: 2 });
extend(VariwideSeries.prototype, {
    irregularWidths: true,
    keysAffectYAxis: ['y'],
    pointArrayMap: ['y', 'z'],
    parallelArrays: ['x', 'y', 'z'],
    pointClass: VariwidePoint
});
SeriesRegistry.registerSeriesType('variwide', VariwideSeries);
/* *
 *
 *  Default Export
 *
 * */
export default VariwideSeries;
