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
import Point from '../../Core/Series/Point.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ScatterPoint = SeriesRegistry.seriesTypes.scatter.prototype.pointClass;
import U from '../../Core/Utilities.js';
var extend = U.extend;
/* *
 *
 *  Class
 *
 * */
var BubblePoint = /** @class */ (function (_super) {
    __extends(BubblePoint, _super);
    function BubblePoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * @private
     */
    BubblePoint.prototype.haloPath = function (size) {
        var computedSize = (size && this.marker ?
            this.marker.radius ||
                0 :
            0) + size;
        if (this.series.chart.inverted) {
            var pos = this.pos() || [0, 0], _a = this.series, xAxis = _a.xAxis, yAxis = _a.yAxis, chart = _a.chart;
            return chart.renderer.symbols.circle(xAxis.len - pos[1] - computedSize, yAxis.len - pos[0] - computedSize, computedSize * 2, computedSize * 2);
        }
        return Point.prototype.haloPath.call(this, 
        // #6067
        computedSize);
    };
    return BubblePoint;
}(ScatterPoint));
/* *
 *
 *  Class Prototype
 *
 * */
extend(BubblePoint.prototype, {
    ttBelow: false
});
/* *
 *
 *  Default Export
 *
 * */
export default BubblePoint;
