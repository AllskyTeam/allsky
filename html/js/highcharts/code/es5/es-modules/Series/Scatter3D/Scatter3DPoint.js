/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Scatter 3D series.
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
import ScatterSeries from '../Scatter/ScatterSeries.js';
var ScatterPoint = ScatterSeries.prototype.pointClass;
import U from '../../Core/Utilities.js';
var defined = U.defined;
/* *
 *
 *  Class
 *
 * */
var Scatter3DPoint = /** @class */ (function (_super) {
    __extends(Scatter3DPoint, _super);
    function Scatter3DPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    Scatter3DPoint.prototype.applyOptions = function () {
        _super.prototype.applyOptions.apply(this, arguments);
        if (!defined(this.z)) {
            this.z = 0;
        }
        return this;
    };
    return Scatter3DPoint;
}(ScatterPoint));
/* *
 *
 *  Default Export
 *
 * */
export default Scatter3DPoint;
