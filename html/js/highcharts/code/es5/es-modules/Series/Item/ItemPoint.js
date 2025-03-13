/* *
 *
 *  (c) 2019-2024 Torstein Honsi
 *
 *  Item series type for Highcharts
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
var Point = SeriesRegistry.series.prototype.pointClass, PiePoint = SeriesRegistry.seriesTypes.pie.prototype.pointClass;
import U from '../../Core/Utilities.js';
var extend = U.extend;
/* *
 *
 *  Class
 *
 * */
var ItemPoint = /** @class */ (function (_super) {
    __extends(ItemPoint, _super);
    function ItemPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ItemPoint;
}(PiePoint));
extend(ItemPoint.prototype, {
    haloPath: Point.prototype.haloPath
});
/* *
 *
 *  Default Export
 *
 * */
export default ItemPoint;
