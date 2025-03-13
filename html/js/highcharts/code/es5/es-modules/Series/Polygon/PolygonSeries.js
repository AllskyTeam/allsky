/* *
 *
 *  (c) 2010-2024 Torstein Honsi
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
import H from '../../Core/Globals.js';
var noop = H.noop;
import PolygonSeriesDefaults from './PolygonSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, AreaSeries = _a.area, LineSeries = _a.line, ScatterSeries = _a.scatter;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
var PolygonSeries = /** @class */ (function (_super) {
    __extends(PolygonSeries, _super);
    function PolygonSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PolygonSeries.prototype.getGraphPath = function () {
        var graphPath = LineSeries.prototype.getGraphPath.call(this);
        var i = graphPath.length + 1;
        // Close all segments
        while (i--) {
            if ((i === graphPath.length || graphPath[i][0] === 'M') && i > 0) {
                graphPath.splice(i, 0, ['Z']);
            }
        }
        this.areaPath = graphPath;
        return graphPath;
    };
    PolygonSeries.prototype.drawGraph = function () {
        // Hack into the fill logic in area.drawGraph
        this.options.fillColor = this.color;
        AreaSeries.prototype.drawGraph.call(this);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    PolygonSeries.defaultOptions = merge(ScatterSeries.defaultOptions, PolygonSeriesDefaults);
    return PolygonSeries;
}(ScatterSeries));
extend(PolygonSeries.prototype, {
    type: 'polygon',
    drawTracker: LineSeries.prototype.drawTracker,
    setStackedPoints: noop // No stacking points on polygons (#5310)
});
SeriesRegistry.registerSeriesType('polygon', PolygonSeries);
/* *
 *
 *  Default Export
 *
 * */
export default PolygonSeries;
