/* *
 *
 *  This module implements sunburst charts in Highcharts.
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Authors: Jon Arild Nygard
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
var Point = SeriesRegistry.series.prototype.pointClass, TreemapPoint = SeriesRegistry.seriesTypes.treemap.prototype.pointClass;
import U from '../../Core/Utilities.js';
var correctFloat = U.correctFloat, extend = U.extend, pInt = U.pInt;
/* *
 *
 *  Class
 *
 * */
var SunburstPoint = /** @class */ (function (_super) {
    __extends(SunburstPoint, _super);
    function SunburstPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    SunburstPoint.prototype.getDataLabelPath = function (label) {
        var _a;
        var renderer = this.series.chart.renderer, shapeArgs = this.shapeExisting, r = shapeArgs.r + pInt(((_a = label.options) === null || _a === void 0 ? void 0 : _a.distance) || 0);
        var start = shapeArgs.start, end = shapeArgs.end;
        var angle = start + (end - start) / 2; // Arc middle value
        var upperHalf = angle < 0 &&
            angle > -Math.PI ||
            angle > Math.PI, moreThanHalf;
        // Check if point is a full circle
        if (start === -Math.PI / 2 &&
            correctFloat(end) === correctFloat(Math.PI * 1.5)) {
            start = -Math.PI + Math.PI / 360;
            end = -Math.PI / 360;
            upperHalf = true;
        }
        // Check if dataLabels should be render in the upper half of the circle
        if (end - start > Math.PI) {
            upperHalf = false;
            moreThanHalf = true;
            // Close to the full circle, add some padding so that the SVG
            // renderer treats it as separate points (#18884).
            if ((end - start) > 2 * Math.PI - 0.01) {
                start += 0.01;
                end -= 0.01;
            }
        }
        if (this.dataLabelPath) {
            this.dataLabelPath = this.dataLabelPath.destroy();
        }
        // All times
        this.dataLabelPath = renderer
            .arc({
            open: true,
            longArc: moreThanHalf ? 1 : 0
        })
            .attr({
            start: (upperHalf ? start : end),
            end: (upperHalf ? end : start),
            clockwise: +upperHalf,
            x: shapeArgs.x,
            y: shapeArgs.y,
            r: (r + shapeArgs.innerR) / 2
        })
            .add(renderer.defs);
        return this.dataLabelPath;
    };
    SunburstPoint.prototype.isValid = function () {
        return true;
    };
    return SunburstPoint;
}(TreemapPoint));
extend(SunburstPoint.prototype, {
    getClassName: Point.prototype.getClassName,
    haloPath: Point.prototype.haloPath,
    setState: Point.prototype.setState
});
/* *
 *
 *  Default Export
 *
 * */
export default SunburstPoint;
