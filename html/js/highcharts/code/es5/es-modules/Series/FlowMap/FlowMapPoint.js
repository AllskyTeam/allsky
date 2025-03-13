/* *
 *
 *  (c) 2010-2024 Askel Eirik Johansson, Piotr Madej
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
var MapLinePoint = SeriesRegistry.seriesTypes.mapline.prototype.pointClass;
import U from '../../Core/Utilities.js';
var pick = U.pick, isString = U.isString, isNumber = U.isNumber;
/* *
 *
 *  Class
 *
 * */
var FlowMapPoint = /** @class */ (function (_super) {
    __extends(FlowMapPoint, _super);
    function FlowMapPoint() {
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
    FlowMapPoint.prototype.isValid = function () {
        var valid = !!(this.options.to && this.options.from);
        [this.options.to, this.options.from]
            .forEach(function (toOrFrom) {
            valid = !!(valid && (toOrFrom && (isString(toOrFrom) || ( // Point id or has lat/lon coords
            isNumber(pick(toOrFrom[0], toOrFrom.lat)) &&
                isNumber(pick(toOrFrom[1], toOrFrom.lon))))));
        });
        return valid;
    };
    return FlowMapPoint;
}(MapLinePoint));
/* *
 *
 *  Default Export
 *
 * */
export default FlowMapPoint;
