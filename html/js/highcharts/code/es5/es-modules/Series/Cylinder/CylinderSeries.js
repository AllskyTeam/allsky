/* *
 *
 *  Highcharts cylinder - a 3D series
 *
 *  (c) 2010-2024 Highsoft AS
 *
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
import CylinderComposition from './CylinderComposition.js';
import CylinderPoint from './CylinderPoint.js';
import CylinderSeriesDefaults from './CylinderSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnSeries = SeriesRegistry.seriesTypes.column;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The cylinder series type.
 *
 * @requires highcharts-3d
 * @requires modules/cylinder
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.cylinder
 *
 * @augments Highcharts.Series
 */
var CylinderSeries = /** @class */ (function (_super) {
    __extends(CylinderSeries, _super);
    function CylinderSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Properties
     *
     * */
    CylinderSeries.compose = CylinderComposition.compose;
    CylinderSeries.defaultOptions = merge(ColumnSeries.defaultOptions, CylinderSeriesDefaults);
    return CylinderSeries;
}(ColumnSeries));
extend(CylinderSeries.prototype, {
    pointClass: CylinderPoint
});
SeriesRegistry.registerSeriesType('cylinder', CylinderSeries);
/* *
 *
 *  Default Export
 *
 * */
export default CylinderSeries;
