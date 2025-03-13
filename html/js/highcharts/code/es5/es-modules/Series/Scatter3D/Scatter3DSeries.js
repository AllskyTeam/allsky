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
import Math3D from '../../Core/Math3D.js';
var pointCameraDistance = Math3D.pointCameraDistance;
import Scatter3DPoint from './Scatter3DPoint.js';
import Scatter3DSeriesDefaults from './Scatter3DSeriesDefaults.js';
import ScatterSeries from '../Scatter/ScatterSeries.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.scatter3d
 *
 * @augments Highcharts.Series
 */
var Scatter3DSeries = /** @class */ (function (_super) {
    __extends(Scatter3DSeries, _super);
    function Scatter3DSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    Scatter3DSeries.prototype.pointAttribs = function (point) {
        var attribs = _super.prototype.pointAttribs.apply(this, arguments);
        if (this.chart.is3d() && point) {
            attribs.zIndex =
                pointCameraDistance(point, this.chart);
        }
        return attribs;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    Scatter3DSeries.defaultOptions = merge(ScatterSeries.defaultOptions, Scatter3DSeriesDefaults);
    return Scatter3DSeries;
}(ScatterSeries));
extend(Scatter3DSeries.prototype, {
    axisTypes: ['xAxis', 'yAxis', 'zAxis'],
    // Require direct touch rather than using the k-d-tree, because the
    // k-d-tree currently doesn't take the xyz coordinate system into
    // account (#4552)
    directTouch: true,
    parallelArrays: ['x', 'y', 'z'],
    pointArrayMap: ['x', 'y', 'z'],
    pointClass: Scatter3DPoint
});
SeriesRegistry.registerSeriesType('scatter3d', Scatter3DSeries);
/* *
 *
 *  Default Export
 *
 * */
export default Scatter3DSeries;
