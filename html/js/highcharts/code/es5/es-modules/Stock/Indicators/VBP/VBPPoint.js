/* *
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
/* *
 *
 *  Imports
 *
 * */
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
var SMAPoint = SeriesRegistry.seriesTypes.sma.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
var VBPPoint = /** @class */ (function (_super) {
    __extends(VBPPoint, _super);
    function VBPPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // Required for destroying negative part of volume
    VBPPoint.prototype.destroy = function () {
        // @todo: this.negativeGraphic doesn't seem to be used anywhere
        if (this.negativeGraphic) {
            this.negativeGraphic = this.negativeGraphic.destroy();
        }
        _super.prototype.destroy.apply(this, arguments);
    };
    return VBPPoint;
}(SMAPoint));
/* *
 *
 *  Default Export
 *
 * */
export default VBPPoint;
