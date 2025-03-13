/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  3D pie series
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
var PiePoint = SeriesRegistry.seriesTypes.pie.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
var Pie3DPoint = /** @class */ (function (_super) {
    __extends(Pie3DPoint, _super);
    function Pie3DPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    Pie3DPoint.prototype.haloPath = function () {
        var _a;
        return ((_a = this.series) === null || _a === void 0 ? void 0 : _a.chart.is3d()) ?
            [] : _super.prototype.haloPath.apply(this, arguments);
    };
    return Pie3DPoint;
}(PiePoint));
/* *
 *
 *  Default Export
 *
 * */
export default Pie3DPoint;
