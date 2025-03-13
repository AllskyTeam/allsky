/* *
 *
 *  (c) 2010-2024 Torstein Honsi, Magdalena Gut
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
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
import PictorialUtilities from './PictorialUtilities.js';
var ColumnPoint = SeriesRegistry.seriesTypes.column.prototype.pointClass;
var rescalePatternFill = PictorialUtilities.rescalePatternFill, getStackMetrics = PictorialUtilities.getStackMetrics;
/* *
 *
 *  Class
 *
 * */
var PictorialPoint = /** @class */ (function (_super) {
    __extends(PictorialPoint, _super);
    function PictorialPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PictorialPoint.prototype.setState = function () {
        var point = this;
        _super.prototype.setState.apply(point, arguments);
        var series = point.series, paths = series.options.paths;
        if (point.graphic && point.shapeArgs && paths) {
            var shape = paths[point.index %
                paths.length];
            rescalePatternFill(point.graphic, getStackMetrics(series.yAxis, shape).height, point.shapeArgs.width || 0, point.shapeArgs.height || Infinity, point.series.options.borderWidth || 0);
        }
    };
    return PictorialPoint;
}(ColumnPoint));
/* *
 *
 *  Export Default
 *
 * */
export default PictorialPoint;
