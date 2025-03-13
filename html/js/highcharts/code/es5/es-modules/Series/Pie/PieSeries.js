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
import CU from '../CenteredUtilities.js';
var getStartAndEndRadians = CU.getStartAndEndRadians;
import ColumnSeries from '../Column/ColumnSeries.js';
import H from '../../Core/Globals.js';
var noop = H.noop;
import PiePoint from './PiePoint.js';
import PieSeriesDefaults from './PieSeriesDefaults.js';
import Series from '../../Core/Series/Series.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import Symbols from '../../Core/Renderer/SVG/Symbols.js';
import U from '../../Core/Utilities.js';
var clamp = U.clamp, extend = U.extend, fireEvent = U.fireEvent, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * Pie series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pie
 *
 * @augments Highcharts.Series
 */
var PieSeries = /** @class */ (function (_super) {
    __extends(PieSeries, _super);
    function PieSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Animates the pies in.
     * @private
     */
    PieSeries.prototype.animate = function (init) {
        var series = this, points = series.points, startAngleRad = series.startAngleRad;
        if (!init) {
            points.forEach(function (point) {
                var graphic = point.graphic, args = point.shapeArgs;
                if (graphic && args) {
                    // Start values
                    graphic.attr({
                        // Animate from inner radius (#779)
                        r: pick(point.startR, (series.center && series.center[3] / 2)),
                        start: startAngleRad,
                        end: startAngleRad
                    });
                    // Animate
                    graphic.animate({
                        r: args.r,
                        start: args.start,
                        end: args.end
                    }, series.options.animation);
                }
            });
        }
    };
    /**
     * Called internally to draw auxiliary graph in pie-like series in
     * situtation when the default graph is not sufficient enough to present
     * the data well. Auxiliary graph is saved in the same object as
     * regular graph.
     * @private
     */
    PieSeries.prototype.drawEmpty = function () {
        var start = this.startAngleRad, end = this.endAngleRad, options = this.options;
        var centerX, centerY;
        // Draw auxiliary graph if there're no visible points.
        if (this.total === 0 && this.center) {
            centerX = this.center[0];
            centerY = this.center[1];
            if (!this.graph) {
                this.graph = this.chart.renderer
                    .arc(centerX, centerY, this.center[1] / 2, 0, start, end)
                    .addClass('highcharts-empty-series')
                    .add(this.group);
            }
            this.graph.attr({
                d: Symbols.arc(centerX, centerY, this.center[2] / 2, 0, {
                    start: start,
                    end: end,
                    innerR: this.center[3] / 2
                })
            });
            if (!this.chart.styledMode) {
                this.graph.attr({
                    'stroke-width': options.borderWidth,
                    fill: options.fillColor || 'none',
                    stroke: options.color || "#cccccc" /* Palette.neutralColor20 */
                });
            }
        }
        else if (this.graph) { // Destroy the graph object.
            this.graph = this.graph.destroy();
        }
    };
    /**
     * Slices in pie chart are initialized in DOM, but it's shapes and
     * animations are normally run in `drawPoints()`.
     * @private
     */
    PieSeries.prototype.drawPoints = function () {
        var renderer = this.chart.renderer;
        this.points.forEach(function (point) {
            // When updating a series between 2d and 3d or cartesian and
            // polar, the shape type changes.
            if (point.graphic && point.hasNewShapeType()) {
                point.graphic = point.graphic.destroy();
            }
            if (!point.graphic) {
                point.graphic = renderer[point.shapeType](point.shapeArgs)
                    .add(point.series.group);
                point.delayedRendering = true;
            }
        });
    };
    /**
     * Extend the generatePoints method by adding total and percentage
     * properties to each point
     * @private
     */
    PieSeries.prototype.generatePoints = function () {
        _super.prototype.generatePoints.call(this);
        this.updateTotals();
    };
    /**
     * Utility for getting the x value from a given y, used for anticollision
     * logic in data labels.
     * @private
     */
    PieSeries.prototype.getX = function (y, left, point, dataLabel) {
        var center = this.center, 
        // Variable pie has individual radius
        radius = this.radii ?
            this.radii[point.index] || 0 :
            center[2] / 2, labelPosition = dataLabel.dataLabelPosition, distance = (labelPosition === null || labelPosition === void 0 ? void 0 : labelPosition.distance) || 0;
        var angle = Math.asin(clamp((y - center[1]) / (radius + distance), -1, 1));
        var x = center[0] +
            (left ? -1 : 1) *
                (Math.cos(angle) * (radius + distance)) +
            (distance > 0 ?
                (left ? -1 : 1) * (dataLabel.padding || 0) :
                0);
        return x;
    };
    /**
     * Define hasData function for non-cartesian series. Returns true if the
     * series has points at all.
     * @private
     */
    PieSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * Draw the data points
     * @private
     */
    PieSeries.prototype.redrawPoints = function () {
        var series = this, chart = series.chart;
        var groupTranslation, graphic, pointAttr, shapeArgs;
        this.drawEmpty();
        // Apply the drop-shadow to the group because otherwise each element
        // would cast a shadow on others
        if (series.group && !chart.styledMode) {
            series.group.shadow(series.options.shadow);
        }
        // Draw the slices
        series.points.forEach(function (point) {
            var animateTo = {};
            graphic = point.graphic;
            if (!point.isNull && graphic) {
                shapeArgs = point.shapeArgs;
                // If the point is sliced, use special translation, else use
                // plot area translation
                groupTranslation = point.getTranslate();
                if (!chart.styledMode) {
                    pointAttr = series.pointAttribs(point, (point.selected && 'select'));
                }
                // Draw the slice
                if (!point.delayedRendering) {
                    graphic
                        .setRadialReference(series.center);
                    if (!chart.styledMode) {
                        merge(true, animateTo, pointAttr);
                    }
                    merge(true, animateTo, shapeArgs, groupTranslation);
                    graphic.animate(animateTo);
                }
                else {
                    graphic
                        .setRadialReference(series.center)
                        .attr(shapeArgs)
                        .attr(groupTranslation);
                    if (!chart.styledMode) {
                        graphic
                            .attr(pointAttr)
                            .attr({ 'stroke-linejoin': 'round' });
                    }
                    point.delayedRendering = false;
                }
                graphic
                    .attr({
                    visibility: point.visible ? 'inherit' : 'hidden'
                });
                graphic.addClass(point.getClassName(), true);
            }
            else if (graphic) {
                point.graphic = graphic.destroy();
            }
        });
    };
    /**
     * Utility for sorting data labels.
     * @private
     */
    PieSeries.prototype.sortByAngle = function (points, sign) {
        points.sort(function (a, b) {
            return ((typeof a.angle !== 'undefined') &&
                (b.angle - a.angle) * sign);
        });
    };
    /**
     * Do translation for pie slices
     * @private
     */
    PieSeries.prototype.translate = function (positions) {
        fireEvent(this, 'translate');
        this.generatePoints();
        var series = this, precision = 1000, // Issue #172
        options = series.options, slicedOffset = options.slicedOffset, radians = getStartAndEndRadians(options.startAngle, options.endAngle), startAngleRad = series.startAngleRad = radians.start, endAngleRad = series.endAngleRad = radians.end, circ = endAngleRad - startAngleRad, // 2 * Math.PI,
        points = series.points, ignoreHiddenPoint = options.ignoreHiddenPoint, len = points.length;
        var start, end, angle, 
        // The x component of the radius vector for a given point
        radiusX, radiusY, i, point, cumulative = 0;
        // Get positions - either an integer or a percentage string must be
        // given. If positions are passed as a parameter, we're in a
        // recursive loop for adjusting space for data labels.
        if (!positions) {
            /**
             * The series center position, read only. This applies only to
             * circular chart types like pie and sunburst. It is an array of
             * `[centerX, centerY, diameter, innerDiameter]`.
             *
             * @name Highcharts.Series#center
             * @type {Array<number>}
             */
            series.center = positions = series.getCenter();
        }
        // Calculate the geometry for each point
        for (i = 0; i < len; i++) {
            point = points[i];
            // Set start and end angle
            start = startAngleRad + (cumulative * circ);
            if (point.isValid() &&
                (!ignoreHiddenPoint || point.visible)) {
                cumulative += point.percentage / 100;
            }
            end = startAngleRad + (cumulative * circ);
            // Set the shape
            var shapeArgs = {
                x: positions[0],
                y: positions[1],
                r: positions[2] / 2,
                innerR: positions[3] / 2,
                start: Math.round(start * precision) / precision,
                end: Math.round(end * precision) / precision
            };
            point.shapeType = 'arc';
            point.shapeArgs = shapeArgs;
            // The angle must stay within -90 and 270 (#2645)
            angle = (end + start) / 2;
            if (angle > 1.5 * Math.PI) {
                angle -= 2 * Math.PI;
            }
            else if (angle < -Math.PI / 2) {
                angle += 2 * Math.PI;
            }
            // Center for the sliced out slice
            point.slicedTranslation = {
                translateX: Math.round(Math.cos(angle) * slicedOffset),
                translateY: Math.round(Math.sin(angle) * slicedOffset)
            };
            // Set the anchor point for tooltips
            radiusX = Math.cos(angle) * positions[2] / 2;
            radiusY = Math.sin(angle) * positions[2] / 2;
            point.tooltipPos = [
                positions[0] + radiusX * 0.7,
                positions[1] + radiusY * 0.7
            ];
            point.half = angle < -Math.PI / 2 || angle > Math.PI / 2 ?
                1 :
                0;
            point.angle = angle;
        }
        fireEvent(series, 'afterTranslate');
    };
    /**
     * Recompute total chart sum and update percentages of points.
     * @private
     */
    PieSeries.prototype.updateTotals = function () {
        var points = this.points, len = points.length, ignoreHiddenPoint = this.options.ignoreHiddenPoint;
        var i, point, total = 0;
        // Get the total sum
        for (i = 0; i < len; i++) {
            point = points[i];
            if (point.isValid() &&
                (!ignoreHiddenPoint || point.visible)) {
                total += point.y;
            }
        }
        this.total = total;
        // Set each point's properties
        for (i = 0; i < len; i++) {
            point = points[i];
            point.percentage =
                (total > 0 && (point.visible || !ignoreHiddenPoint)) ?
                    point.y / total * 100 :
                    0;
            point.total = total;
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    PieSeries.defaultOptions = merge(Series.defaultOptions, PieSeriesDefaults);
    return PieSeries;
}(Series));
extend(PieSeries.prototype, {
    axisTypes: [],
    directTouch: true,
    drawGraph: void 0,
    drawTracker: ColumnSeries.prototype.drawTracker,
    getCenter: CU.getCenter,
    getSymbol: noop,
    invertible: false,
    isCartesian: false,
    noSharedTooltip: true,
    pointAttribs: ColumnSeries.prototype.pointAttribs,
    pointClass: PiePoint,
    requireSorting: false,
    searchPoint: noop,
    trackerGroups: ['group', 'dataLabelsGroup']
});
SeriesRegistry.registerSeriesType('pie', PieSeries);
/* *
 *
 *  Default Export
 *
 * */
export default PieSeries;
