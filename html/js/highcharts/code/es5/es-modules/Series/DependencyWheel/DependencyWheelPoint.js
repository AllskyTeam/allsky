/* *
 *
 *  Dependency wheel module
 *
 *  (c) 2018-2024 Torstein Honsi
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
var SankeyPoint = SeriesRegistry.seriesTypes.sankey.prototype.pointClass;
import U from '../../Core/Utilities.js';
var pInt = U.pInt, wrap = U.wrap;
/* *
 *
 *  Class
 *
 * */
var DependencyWheelPoint = /** @class */ (function (_super) {
    __extends(DependencyWheelPoint, _super);
    function DependencyWheelPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Return a text path that the data label uses.
     * @private
     */
    DependencyWheelPoint.prototype.getDataLabelPath = function (label) {
        var _a;
        var point = this, renderer = point.series.chart.renderer, shapeArgs = point.shapeArgs, upperHalf = point.angle < 0 || point.angle > Math.PI, start = shapeArgs.start || 0, end = shapeArgs.end || 0;
        // First time
        if (!point.dataLabelPath) {
            // Destroy the path with the label
            wrap(label, 'destroy', function (proceed) {
                if (point.dataLabelPath) {
                    point.dataLabelPath = point.dataLabelPath.destroy();
                }
                return proceed.call(this);
            });
            // Subsequent times
        }
        else {
            point.dataLabelPath = point.dataLabelPath.destroy();
            delete point.dataLabelPath;
        }
        // All times
        point.dataLabelPath = renderer
            .arc({
            open: true,
            longArc: Math.abs(Math.abs(start) - Math.abs(end)) < Math.PI ? 0 : 1
        })
            .attr({
            x: shapeArgs.x,
            y: shapeArgs.y,
            r: ((shapeArgs.r || 0) + pInt(((_a = label.options) === null || _a === void 0 ? void 0 : _a.distance) || 0)),
            start: (upperHalf ? start : end),
            end: (upperHalf ? end : start),
            clockwise: +upperHalf
        })
            .add(renderer.defs);
        return point.dataLabelPath;
    };
    DependencyWheelPoint.prototype.isValid = function () {
        // No null points here
        return true;
    };
    return DependencyWheelPoint;
}(SankeyPoint));
/* *
 *
 *  Default Export
 *
 * */
export default DependencyWheelPoint;
