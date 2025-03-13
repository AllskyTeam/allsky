/* *
 *
 *  (c) 2010-2024 Pawel Lysy
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
/* *
 *
 *  Class
 *
 * */
var RenkoPoint = /** @class */ (function (_super) {
    __extends(RenkoPoint, _super);
    function RenkoPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenkoPoint.prototype.getClassName = function () {
        return (_super.prototype.getClassName.call(this) +
            (this.upTrend ? ' highcharts-point-up' : ' highcharts-point-down'));
    };
    return RenkoPoint;
}(ColumnPoint));
/* *
 *
 *  Default Export
 *
 * */
export default RenkoPoint;
