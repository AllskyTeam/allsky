/* *
 *
 *  Tilemaps module
 *
 *  (c) 2010-2024 Highsoft AS
 *  Author: Øystein Moseng
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
var composed = H.composed, noop = H.noop;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, HeatmapSeries = _a.heatmap, ScatterSeries = _a.scatter;
import TilemapPoint from './TilemapPoint.js';
import TilemapSeriesDefaults from './TilemapSeriesDefaults.js';
import TilemapShapes from './TilemapShapes.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, merge = U.merge, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * Extension to add pixel padding for series. Uses getSeriesPixelPadding on each
 * series and adds the largest padding required. If no series has this function
 * defined, we add nothing.
 * @private
 */
function onAxisAfterSetAxisTranslation() {
    if (this.recomputingForTilemap || this.coll === 'colorAxis') {
        return;
    }
    var axis = this, 
    // Find which series' padding to use
    seriesPadding = axis.series
        .map(function (series) {
        return series.getSeriesPixelPadding &&
            series.getSeriesPixelPadding(axis);
    })
        .reduce(function (a, b) {
        return (a && a.padding) > (b && b.padding) ?
            a :
            b;
    }, void 0) ||
        {
            padding: 0,
            axisLengthFactor: 1
        }, lengthPadding = Math.round(seriesPadding.padding * seriesPadding.axisLengthFactor);
    // Don't waste time on this if we're not adding extra padding
    if (seriesPadding.padding) {
        // Recompute translation with new axis length now (minus padding)
        axis.len -= lengthPadding;
        axis.recomputingForTilemap = true;
        axis.setAxisTranslation();
        delete axis.recomputingForTilemap;
        axis.minPixelPadding += seriesPadding.padding;
        axis.len += lengthPadding;
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.tilemap
 *
 * @augments Highcharts.Series
 */
var TilemapSeries = /** @class */ (function (_super) {
    __extends(TilemapSeries, _super);
    function TilemapSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    TilemapSeries.compose = function (AxisClass) {
        if (pushUnique(composed, 'TilemapSeries')) {
            addEvent(AxisClass, 'afterSetAxisTranslation', onAxisAfterSetAxisTranslation);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Use the shape's defined data label alignment function.
     * @private
     */
    TilemapSeries.prototype.alignDataLabel = function () {
        return this.tileShape.alignDataLabel.apply(this, arguments);
    };
    TilemapSeries.prototype.drawPoints = function () {
        // In styled mode, use CSS, otherwise the fill used in the style
        // sheet will take precedence over the fill attribute.
        ColumnSeries.prototype.drawPoints.call(this);
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            if (point.graphic) {
                point.graphic[this.chart.styledMode ? 'css' : 'animate'](this.colorAttribs(point));
            }
        }
    };
    /**
     * Get metrics for padding of axis for this series.
     * @private
     */
    TilemapSeries.prototype.getSeriesPixelPadding = function (axis) {
        var isX = axis.isXAxis, padding = this.tileShape.getSeriesPadding(this);
        // If the shape type does not require padding, return no-op padding
        if (!padding) {
            return {
                padding: 0,
                axisLengthFactor: 1
            };
        }
        // Use translate to compute how far outside the points we
        // draw, and use this difference as padding.
        var coord1 = Math.round(axis.translate(isX ?
            padding.xPad * 2 :
            padding.yPad, 0, 1, 0, 1));
        var coord2 = Math.round(axis.translate(isX ? padding.xPad : 0, 0, 1, 0, 1));
        return {
            padding: (axis.single ? // If there is only one tick adjust padding #18647
                Math.abs(coord1 - coord2) / 2 :
                Math.abs(coord1 - coord2)) || 0,
            // Offset the yAxis length to compensate for shift. Setting the
            // length factor to 2 would add the same margin to max as min.
            // Now we only add a slight bit of the min margin to max, as we
            // don't actually draw outside the max bounds. For the xAxis we
            // draw outside on both sides so we add the same margin to min
            // and max.
            axisLengthFactor: isX ? 2 : 1.1
        };
    };
    /**
     * Set tile shape object on series.
     * @private
     */
    TilemapSeries.prototype.setOptions = function () {
        // Call original function
        var ret = _super.prototype.setOptions.apply(this, arguments);
        this.tileShape = TilemapShapes[ret.tileShape];
        return ret;
    };
    /**
     * Use translate from tileShape.
     * @private
     */
    TilemapSeries.prototype.translate = function () {
        return this.tileShape.translate.apply(this, arguments);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    TilemapSeries.defaultOptions = merge(HeatmapSeries.defaultOptions, TilemapSeriesDefaults);
    return TilemapSeries;
}(HeatmapSeries));
extend(TilemapSeries.prototype, {
    // Revert the noop on getSymbol.
    getSymbol: noop,
    // Use drawPoints, markerAttribs, pointAttribs methods from the old
    // heatmap implementation.
    // TODO: Consider standardizing heatmap and tilemap into more
    // consistent form.
    markerAttribs: ScatterSeries.prototype.markerAttribs,
    pointAttribs: ColumnSeries.prototype.pointAttribs,
    pointClass: TilemapPoint
});
SeriesRegistry.registerSeriesType('tilemap', TilemapSeries);
/* *
 *
 *  Default Export
 *
 * */
export default TilemapSeries;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * @typedef {"circle"|"diamond"|"hexagon"|"square"} Highcharts.TilemapShapeValue
 */
''; // Keeps doclets above in JS file
