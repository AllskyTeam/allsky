/* *
 *
 *  Vector plot series module
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
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import H from '../../Core/Globals.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var Series = SeriesRegistry.series, ScatterSeries = SeriesRegistry.seriesTypes.scatter;
import U from '../../Core/Utilities.js';
var arrayMax = U.arrayMax, extend = U.extend, merge = U.merge, pick = U.pick;
import VectorSeriesDefaults from './VectorSeriesDefaults.js';
/* *
 *
 *  Class
 *
 * */
/**
 * The vector series class.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.vector
 *
 * @augments Highcharts.seriesTypes.scatter
 */
var VectorSeries = /** @class */ (function (_super) {
    __extends(VectorSeries, _super);
    function VectorSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Fade in the arrows on initializing series.
     * @private
     */
    VectorSeries.prototype.animate = function (init) {
        if (init) {
            this.markerGroup.attr({
                opacity: 0.01
            });
        }
        else {
            this.markerGroup.animate({
                opacity: 1
            }, animObject(this.options.animation));
        }
    };
    /**
     * Create a single arrow. It is later rotated around the zero
     * centerpoint.
     * @private
     */
    VectorSeries.prototype.arrow = function (point) {
        var fraction = point.length / this.lengthMax, u = fraction * this.options.vectorLength / 20, o = {
            start: 10 * u,
            center: 0,
            end: -10 * u
        }[this.options.rotationOrigin] || 0, 
        // The stem and the arrow head. Draw the arrow first with rotation
        // 0, which is the arrow pointing down (vector from north to south).
        path = [
            ['M', 0, 7 * u + o], // Base of arrow
            ['L', -1.5 * u, 7 * u + o],
            ['L', 0, 10 * u + o],
            ['L', 1.5 * u, 7 * u + o],
            ['L', 0, 7 * u + o],
            ['L', 0, -10 * u + o] // Top
        ];
        return path;
    };
    /*
    DrawLegendSymbol: function (legend, item) {
        let options = legend.options,
            symbolHeight = legend.symbolHeight,
            square = options.squareSymbol,
            symbolWidth = square ? symbolHeight : legend.symbolWidth,
            path = this.arrow.call({
                lengthMax: 1,
                options: {
                    vectorLength: symbolWidth
                }
            }, {
                length: 1
            });
        legendItem.line = this.chart.renderer.path(path)
        .addClass('highcharts-point')
        .attr({
            zIndex: 3,
            translateY: symbolWidth / 2,
            rotation: 270,
            'stroke-width': 1,
            'stroke': 'black'
        }).add(item.legendItem.group);
    },
    */
    /**
     * @private
     */
    VectorSeries.prototype.drawPoints = function () {
        var chart = this.chart;
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var plotX = point.plotX, plotY = point.plotY;
            if (this.options.clip === false ||
                chart.isInsidePlot(plotX, plotY, { inverted: chart.inverted })) {
                if (!point.graphic) {
                    point.graphic = this.chart.renderer
                        .path()
                        .add(this.markerGroup)
                        .addClass('highcharts-point ' +
                        'highcharts-color-' +
                        pick(point.colorIndex, point.series.colorIndex));
                }
                point.graphic
                    .attr({
                    d: this.arrow(point),
                    translateX: plotX,
                    translateY: plotY,
                    rotation: point.direction
                });
                if (!this.chart.styledMode) {
                    point.graphic
                        .attr(this.pointAttribs(point));
                }
            }
            else if (point.graphic) {
                point.graphic = point.graphic.destroy();
            }
        }
    };
    /**
     * Get presentational attributes.
     * @private
     */
    VectorSeries.prototype.pointAttribs = function (point, state) {
        var options = this.options;
        var stroke = (point === null || point === void 0 ? void 0 : point.color) || this.color, strokeWidth = this.options.lineWidth;
        if (state) {
            stroke = options.states[state].color || stroke;
            strokeWidth =
                (options.states[state].lineWidth || strokeWidth) +
                    (options.states[state].lineWidthPlus || 0);
        }
        return {
            'stroke': stroke,
            'stroke-width': strokeWidth
        };
    };
    /**
     * @private
     */
    VectorSeries.prototype.translate = function () {
        Series.prototype.translate.call(this);
        this.lengthMax = arrayMax(this.getColumn('length'));
    };
    /* *
     *
     *  Static Properties
     *
     * */
    VectorSeries.defaultOptions = merge(ScatterSeries.defaultOptions, VectorSeriesDefaults);
    return VectorSeries;
}(ScatterSeries));
extend(VectorSeries.prototype, {
    /**
     * @ignore
     * @deprecated
     */
    drawGraph: H.noop,
    /**
     * @ignore
     * @deprecated
     */
    getSymbol: H.noop,
    /**
     * @ignore
     * @deprecated
     */
    markerAttribs: H.noop,
    parallelArrays: ['x', 'y', 'length', 'direction'],
    pointArrayMap: ['y', 'length', 'direction']
});
SeriesRegistry.registerSeriesType('vector', VectorSeries);
/* *
 *
 *  Default Export
 *
 * */
export default VectorSeries;
