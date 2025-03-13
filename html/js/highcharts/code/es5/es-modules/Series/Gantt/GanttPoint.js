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
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var XRangePoint = SeriesRegistry.seriesTypes.xrange.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
var GanttPoint = /** @class */ (function (_super) {
    __extends(GanttPoint, _super);
    function GanttPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * @private
     */
    GanttPoint.setGanttPointAliases = function (options, chart) {
        var _a, _b, _c;
        options.x = options.start = chart.time.parse((_a = options.start) !== null && _a !== void 0 ? _a : options.x);
        options.x2 = options.end = chart.time.parse((_b = options.end) !== null && _b !== void 0 ? _b : options.x2);
        options.partialFill = options.completed =
            (_c = options.completed) !== null && _c !== void 0 ? _c : options.partialFill;
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Applies the options containing the x and y data and possible some
     * extra properties. This is called on point init or from point.update.
     *
     * @private
     * @function Highcharts.Point#applyOptions
     *
     * @param {Object} options
     *        The point options
     *
     * @param {number} x
     *        The x value
     *
     * @return {Highcharts.Point}
     *         The Point instance
     */
    GanttPoint.prototype.applyOptions = function (options, x) {
        var _a;
        var ganttPoint = _super.prototype.applyOptions.call(this, options, x);
        GanttPoint.setGanttPointAliases(ganttPoint, ganttPoint.series.chart);
        this.isNull = !((_a = this.isValid) === null || _a === void 0 ? void 0 : _a.call(this));
        return ganttPoint;
    };
    GanttPoint.prototype.isValid = function () {
        return ((typeof this.start === 'number' ||
            typeof this.x === 'number') &&
            (typeof this.end === 'number' ||
                typeof this.x2 === 'number' ||
                this.milestone));
    };
    return GanttPoint;
}(XRangePoint));
/* *
 *
 *  Default Export
 *
 * */
export default GanttPoint;
