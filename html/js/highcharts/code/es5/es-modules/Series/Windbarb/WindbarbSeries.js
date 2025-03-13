/* *
 *
 *  Wind barb series module
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
import ApproximationRegistry from '../../Extensions/DataGrouping/ApproximationRegistry.js';
import H from '../../Core/Globals.js';
import OnSeriesComposition from '../OnSeriesComposition.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnSeries = SeriesRegistry.seriesTypes.column;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge, pick = U.pick;
import WindbarbPoint from './WindbarbPoint.js';
import WindbarbSeriesDefaults from './WindbarbSeriesDefaults.js';
/* *
 *
 *  Functions
 *
 * */
/**
 * Once off, register the windbarb approximation for data grouping. This can
 * be called anywhere (not necessarily in the translate function), but must
 * happen after the data grouping module is loaded and before the
 * wind barb series uses it.
 * @private
 */
function registerApproximation() {
    if (!ApproximationRegistry.windbarb) {
        ApproximationRegistry.windbarb = function (values, directions) {
            var vectorX = 0, vectorY = 0;
            for (var i = 0, iEnd = values.length; i < iEnd; i++) {
                vectorX += values[i] * Math.cos(directions[i] * H.deg2rad);
                vectorY += values[i] * Math.sin(directions[i] * H.deg2rad);
            }
            return [
                // Wind speed
                values.reduce(function (sum, value) { return (sum + value); }, 0) / values.length,
                // Wind direction
                Math.atan2(vectorY, vectorX) / H.deg2rad
            ];
        };
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
 * @name Highcharts.seriesTypes.windbarb
 *
 * @augments Highcharts.Series
 */
var WindbarbSeries = /** @class */ (function (_super) {
    __extends(WindbarbSeries, _super);
    function WindbarbSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    WindbarbSeries.prototype.init = function (chart, options) {
        _super.prototype.init.call(this, chart, options);
    };
    // Get presentational attributes.
    WindbarbSeries.prototype.pointAttribs = function (point, state) {
        var options = this.options;
        var stroke = point.color || this.color, strokeWidth = this.options.lineWidth;
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
    // Create a single wind arrow. It is later rotated around the zero
    // centerpoint.
    WindbarbSeries.prototype.windArrow = function (point) {
        var level = point.beaufortLevel, u = this.options.vectorLength / 20;
        var knots = point.value * 1.943844, barbs, pos = -10;
        if (point.isNull) {
            return [];
        }
        if (level === 0) {
            return this.chart.renderer.symbols.circle(-10 * u, -10 * u, 20 * u, 20 * u);
        }
        // The stem and the arrow head
        var path = [
            ['M', 0, 7 * u], // Base of arrow
            ['L', -1.5 * u, 7 * u],
            ['L', 0, 10 * u],
            ['L', 1.5 * u, 7 * u],
            ['L', 0, 7 * u],
            ['L', 0, -10 * u] // Top
        ];
        // For each full 50 knots, add a pennant
        barbs = (knots - knots % 50) / 50; // Pennants
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 5 * u, pos * u + 2], ['L', 0, pos * u + 4]);
                // Substract from the rest and move position for next
                knots -= 50;
                pos += 7;
            }
        }
        // For each full 10 knots, add a full barb
        barbs = (knots - knots % 10) / 10;
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 7 * u, pos * u]);
                knots -= 10;
                pos += 3;
            }
        }
        // For each full 5 knots, add a half barb
        barbs = (knots - knots % 5) / 5; // Half barbs
        if (barbs > 0) {
            while (barbs--) {
                path.push(pos === -10 ? ['L', 0, pos * u] : ['M', 0, pos * u], ['L', 4 * u, pos * u]);
                knots -= 5;
                pos += 3;
            }
        }
        return path;
    };
    WindbarbSeries.prototype.drawPoints = function () {
        var chart = this.chart, yAxis = this.yAxis, inverted = chart.inverted, shapeOffset = this.options.vectorLength / 2;
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var plotX = point.plotX, plotY = point.plotY;
            // Check if it's inside the plot area, but only for the X
            // dimension.
            if (this.options.clip === false ||
                chart.isInsidePlot(plotX, 0)) {
                // Create the graphic the first time
                if (!point.graphic) {
                    point.graphic = this.chart.renderer
                        .path()
                        .add(this.markerGroup)
                        .addClass('highcharts-point ' +
                        'highcharts-color-' +
                        pick(point.colorIndex, point.series.colorIndex));
                }
                // Position the graphic
                point.graphic
                    .attr({
                    d: this.windArrow(point),
                    translateX: plotX + this.options.xOffset,
                    translateY: plotY + this.options.yOffset,
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
            // Set the tooltip anchor position
            point.tooltipPos = [
                plotX + this.options.xOffset +
                    (inverted && !this.onSeries ? shapeOffset : 0),
                plotY + this.options.yOffset -
                    (inverted ?
                        0 :
                        shapeOffset + yAxis.pos - chart.plotTop)
            ]; // #6327
        }
    };
    // Fade in the arrows on initializing series.
    WindbarbSeries.prototype.animate = function (init) {
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
    WindbarbSeries.prototype.markerAttribs = function () {
        return {};
    };
    WindbarbSeries.prototype.getExtremes = function () {
        return {};
    };
    WindbarbSeries.prototype.shouldShowTooltip = function (plotX, plotY, options) {
        if (options === void 0) { options = {}; }
        options.ignoreX = this.chart.inverted;
        options.ignoreY = !options.ignoreX;
        return _super.prototype.shouldShowTooltip.call(this, plotX, plotY, options);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    WindbarbSeries.defaultOptions = merge(ColumnSeries.defaultOptions, WindbarbSeriesDefaults);
    return WindbarbSeries;
}(ColumnSeries));
OnSeriesComposition.compose(WindbarbSeries);
extend(WindbarbSeries.prototype, {
    beaufortFloor: [
        0, 0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8,
        24.5, 28.5, 32.7
    ], // @todo dictionary with names?
    beaufortName: [
        'Calm', 'Light air', 'Light breeze',
        'Gentle breeze', 'Moderate breeze', 'Fresh breeze',
        'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm',
        'Violent storm', 'Hurricane'
    ],
    invertible: false,
    parallelArrays: ['x', 'value', 'direction'],
    pointArrayMap: ['value', 'direction'],
    pointClass: WindbarbPoint,
    trackerGroups: ['markerGroup'],
    translate: function () {
        var beaufortFloor = this.beaufortFloor, beaufortName = this.beaufortName;
        OnSeriesComposition.translate.call(this);
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var level = 0;
            // Find the beaufort level (zero based)
            for (; level < beaufortFloor.length; level++) {
                if (beaufortFloor[level] > point.value) {
                    break;
                }
            }
            point.beaufortLevel = level - 1;
            point.beaufort = beaufortName[level - 1];
        }
    }
});
SeriesRegistry.registerSeriesType('windbarb', WindbarbSeries);
registerApproximation();
/* *
 *
 *  Default Export
 *
 * */
export default WindbarbSeries;
