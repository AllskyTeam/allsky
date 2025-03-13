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
import MapLineSeriesDefaults from './MapLineSeriesDefaults.js';
import MapSeries from '../Map/MapSeries.js';
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
 * @name Highcharts.seriesTypes.mapline
 *
 * @augments Highcharts.Series
 */
var MapLineSeries = /** @class */ (function (_super) {
    __extends(MapLineSeries, _super);
    function MapLineSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Get presentational attributes
     * @private
     * @function Highcharts.seriesTypes.mapline#pointAttribs
     */
    MapLineSeries.prototype.pointAttribs = function (point, state) {
        var attr = _super.prototype.pointAttribs.call(this, point, state);
        // The difference from a map series is that the stroke takes the
        // point color
        attr.fill = this.options.fillColor;
        return attr;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    MapLineSeries.defaultOptions = merge(MapSeries.defaultOptions, MapLineSeriesDefaults);
    return MapLineSeries;
}(MapSeries));
extend(MapLineSeries.prototype, {
    type: 'mapline',
    colorProp: 'stroke',
    pointAttrToOptions: {
        'stroke': 'color',
        'stroke-width': 'lineWidth'
    }
});
SeriesRegistry.registerSeriesType('mapline', MapLineSeries);
/* *
 *
 *  Default Export
 *
 * */
export default MapLineSeries;
