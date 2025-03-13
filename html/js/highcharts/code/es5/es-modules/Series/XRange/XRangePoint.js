/* *
 *
 *  X-range series module
 *
 *  (c) 2010-2024 Torstein Honsi, Lars A. V. Cabrera
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
var ColumnPoint = SeriesRegistry.seriesTypes.column.prototype.pointClass;
import U from '../../Core/Utilities.js';
var extend = U.extend;
/* *
 *
 *  Class
 *
 * */
var XRangePoint = /** @class */ (function (_super) {
    __extends(XRangePoint, _super);
    /**
     * Extend init to have y default to 0.
     *
     * @private
     */
    function XRangePoint(series, options) {
        var _this = _super.call(this, series, options) || this;
        if (!_this.y) {
            _this.y = 0;
        }
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * Return color of a point based on its category.
     *
     * @private
     * @function getColorByCategory
     *
     * @param {object} series
     *        The series which the point belongs to.
     *
     * @param {object} point
     *        The point to calculate its color for.
     *
     * @return {object}
     *         Returns an object containing the properties color and colorIndex.
     */
    XRangePoint.getColorByCategory = function (series, point) {
        var colors = series.options.colors || series.chart.options.colors, colorCount = colors ?
            colors.length :
            series.chart.options.chart.colorCount, colorIndex = point.y % colorCount, color = colors && colors[colorIndex];
        return {
            colorIndex: colorIndex,
            color: color
        };
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    XRangePoint.prototype.resolveColor = function () {
        var series = this.series;
        if (series.options.colorByPoint && !this.options.color) {
            var colorByPoint = XRangePoint.getColorByCategory(series, this);
            if (!series.chart.styledMode) {
                this.color = colorByPoint.color;
            }
            if (!this.options.colorIndex) {
                this.colorIndex = colorByPoint.colorIndex;
            }
        }
        else {
            this.color = this.options.color || series.color;
        }
    };
    /**
     * Extend applyOptions to handle time strings for x2
     *
     * @private
     */
    XRangePoint.prototype.applyOptions = function (options, x) {
        var _a;
        _super.prototype.applyOptions.call(this, options, x);
        this.x2 = this.series.chart.time.parse(this.x2);
        this.isNull = !((_a = this.isValid) === null || _a === void 0 ? void 0 : _a.call(this));
        return this;
    };
    /**
     * @private
     */
    XRangePoint.prototype.setState = function () {
        _super.prototype.setState.apply(this, arguments);
        this.series.drawPoint(this, this.series.getAnimationVerb());
    };
    /**
     * @private
     */
    XRangePoint.prototype.isValid = function () {
        return typeof this.x === 'number' &&
            typeof this.x2 === 'number';
    };
    return XRangePoint;
}(ColumnPoint));
extend(XRangePoint.prototype, {
    ttBelow: false,
    tooltipDateKeys: ['x', 'x2']
});
/* *
 *
 *  Class Namespace
 *
 * */
/* *
 *
 *  Default Export
 *
 * */
export default XRangePoint;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * The ending X value of the range point.
 * @name Highcharts.Point#x2
 * @type {number|undefined}
 * @requires modules/xrange
 */
/**
 * @interface Highcharts.PointOptionsObject in parts/Point.ts
 */ /**
* The ending X value of the range point.
* @name Highcharts.PointOptionsObject#x2
* @type {number|undefined}
* @requires modules/xrange
*/
(''); // Keeps doclets above in JS file
