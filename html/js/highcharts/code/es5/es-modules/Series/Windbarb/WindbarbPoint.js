/* *
 *
 *  Wind barb series module
 *
 *  (c) 2010-2024 Torstein Honsi
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
import ColumnSeries from '../Column/ColumnSeries.js';
import U from '../../Core/Utilities.js';
var isNumber = U.isNumber;
/* *
 *
 *  Class
 *
 * */
var WindbarbPoint = /** @class */ (function (_super) {
    __extends(WindbarbPoint, _super);
    function WindbarbPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    WindbarbPoint.prototype.isValid = function () {
        return isNumber(this.value) && this.value >= 0;
    };
    return WindbarbPoint;
}(ColumnSeries.prototype.pointClass));
/* *
 *
 *  Default Export
 *
 * */
export default WindbarbPoint;
