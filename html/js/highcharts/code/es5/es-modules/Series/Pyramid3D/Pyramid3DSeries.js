/* *
 *
 *  Highcharts pyramid3d series module
 *
 *  (c) 2010-2024 Highsoft AS
 *  Author: Kacper Madej
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
import Pyramid3DSeriesDefaults from './Pyramid3DSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var Funnel3DSeries = SeriesRegistry.seriesTypes.funnel3d;
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The pyramid3d series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pyramid3d
 * @augments seriesTypes.funnel3d
 * @requires highcharts-3d
 * @requires modules/cylinder
 * @requires modules/funnel3d
 * @requires modules/pyramid3d
 */
var Pyramid3DSeries = /** @class */ (function (_super) {
    __extends(Pyramid3DSeries, _super);
    function Pyramid3DSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Properties
     *
     * */
    Pyramid3DSeries.defaultOptions = merge(Funnel3DSeries.defaultOptions, Pyramid3DSeriesDefaults);
    return Pyramid3DSeries;
}(Funnel3DSeries));
SeriesRegistry.registerSeriesType('pyramid3d', Pyramid3DSeries);
/* *
 *
 *  Default Export
 *
 * */
export default Pyramid3DSeries;
