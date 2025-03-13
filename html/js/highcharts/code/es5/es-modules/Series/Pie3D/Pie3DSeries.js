/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  3D pie series
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
var composed = H.composed, deg2rad = H.deg2rad;
import Pie3DPoint from './Pie3DPoint.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var PieSeries = SeriesRegistry.seriesTypes.pie;
import U from '../../Core/Utilities.js';
var extend = U.extend, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Class
 *
 * */
var Pie3DSeries = /** @class */ (function (_super) {
    __extends(Pie3DSeries, _super);
    function Pie3DSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    Pie3DSeries.compose = function (SeriesClass) {
        if (pushUnique(composed, 'Pie3D')) {
            SeriesClass.types.pie = Pie3DSeries;
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    Pie3DSeries.prototype.addPoint = function () {
        _super.prototype.addPoint.apply(this, arguments);
        if (this.chart.is3d()) {
            // Destroy (and rebuild) everything!!!
            this.update(this.userOptions, true); // #3845 pass the old options
        }
    };
    /**
     * @private
     */
    Pie3DSeries.prototype.animate = function (init) {
        if (!this.chart.is3d()) {
            _super.prototype.animate.apply(this, arguments);
        }
        else {
            var center = this.center, group = this.group, markerGroup = this.markerGroup;
            var animation = this.options.animation, attribs = void 0;
            if (animation === true) {
                animation = {};
            }
            // Initialize the animation
            if (init) {
                // Scale down the group and place it in the center
                group.oldtranslateX = pick(group.oldtranslateX, group.translateX);
                group.oldtranslateY = pick(group.oldtranslateY, group.translateY);
                attribs = {
                    translateX: center[0],
                    translateY: center[1],
                    scaleX: 0.001, // #1499
                    scaleY: 0.001
                };
                group.attr(attribs);
                if (markerGroup) {
                    markerGroup.attrSetters = group.attrSetters;
                    markerGroup.attr(attribs);
                }
                // Run the animation
            }
            else {
                attribs = {
                    translateX: group.oldtranslateX,
                    translateY: group.oldtranslateY,
                    scaleX: 1,
                    scaleY: 1
                };
                group.animate(attribs, animation);
                if (markerGroup) {
                    markerGroup.animate(attribs, animation);
                }
            }
        }
    };
    /**
     * @private
     */
    Pie3DSeries.prototype.getDataLabelPosition = function (point, distance) {
        var labelPosition = _super.prototype.getDataLabelPosition.call(this, point, distance);
        if (this.chart.is3d()) {
            var options3d = this.chart.options.chart.options3d, shapeArgs = point.shapeArgs, r = shapeArgs.r, 
            // #3240 issue with datalabels for 0 and null values
            a1 = ((shapeArgs.alpha || (options3d === null || options3d === void 0 ? void 0 : options3d.alpha)) *
                deg2rad), b1 = ((shapeArgs.beta || (options3d === null || options3d === void 0 ? void 0 : options3d.beta)) *
                deg2rad), a2 = (shapeArgs.start + shapeArgs.end) / 2, connectorPosition = labelPosition.connectorPosition, yOffset = (-r * (1 - Math.cos(a1)) * Math.sin(a2)), xOffset = r * (Math.cos(b1) - 1) * Math.cos(a2);
            // Apply perspective on label positions
            for (var _a = 0, _b = [
                labelPosition === null || labelPosition === void 0 ? void 0 : labelPosition.natural,
                connectorPosition.breakAt,
                connectorPosition.touchingSliceAt
            ]; _a < _b.length; _a++) {
                var coordinates = _b[_a];
                coordinates.x += xOffset;
                coordinates.y += yOffset;
            }
        }
        return labelPosition;
    };
    /**
     * @private
     */
    Pie3DSeries.prototype.pointAttribs = function (point) {
        var attr = _super.prototype.pointAttribs.apply(this, arguments), options = this.options;
        if (this.chart.is3d() && !this.chart.styledMode) {
            attr.stroke = options.edgeColor || point.color || this.color;
            attr['stroke-width'] = pick(options.edgeWidth, 1);
        }
        return attr;
    };
    /**
     * @private
     */
    Pie3DSeries.prototype.translate = function () {
        _super.prototype.translate.apply(this, arguments);
        // Do not do this if the chart is not 3D
        if (!this.chart.is3d()) {
            return;
        }
        var series = this, seriesOptions = series.options, depth = seriesOptions.depth || 0, options3d = series.chart.options.chart.options3d, alpha = options3d.alpha, beta = options3d.beta;
        var z = seriesOptions.stacking ?
            (seriesOptions.stack || 0) * depth :
            series._i * depth;
        z += depth / 2;
        if (seriesOptions.grouping !== false) {
            z = 0;
        }
        for (var _a = 0, _b = series.points; _a < _b.length; _a++) {
            var point = _b[_a];
            var shapeArgs = point.shapeArgs;
            point.shapeType = 'arc3d';
            shapeArgs.z = z;
            shapeArgs.depth = depth * 0.75;
            shapeArgs.alpha = alpha;
            shapeArgs.beta = beta;
            shapeArgs.center = series.center;
            var angle = (shapeArgs.end + shapeArgs.start) / 2;
            point.slicedTranslation = {
                translateX: Math.round(Math.cos(angle) *
                    seriesOptions.slicedOffset *
                    Math.cos(alpha * deg2rad)),
                translateY: Math.round(Math.sin(angle) *
                    seriesOptions.slicedOffset *
                    Math.cos(alpha * deg2rad))
            };
        }
    };
    /**
     * @private
     */
    Pie3DSeries.prototype.drawTracker = function () {
        _super.prototype.drawTracker.apply(this, arguments);
        // Do not do this if the chart is not 3D
        if (!this.chart.is3d()) {
            return;
        }
        for (var _a = 0, _b = this.points; _a < _b.length; _a++) {
            var point = _b[_a];
            if (point.graphic) {
                for (var _c = 0, _d = ['out', 'inn', 'side1', 'side2']; _c < _d.length; _c++) {
                    var face = _d[_c];
                    if (point.graphic) {
                        point.graphic[face].element.point = point;
                    }
                }
            }
        }
    };
    return Pie3DSeries;
}(PieSeries));
extend(Pie3DSeries.prototype, {
    pointClass: Pie3DPoint
});
/* *
 *
 *  Default Export
 *
 * */
export default Pie3DSeries;
/* *
 *
 *  API Options
 *
 * */
/**
 * The thickness of a 3D pie.
 *
 * @type      {number}
 * @default   0
 * @since     4.0
 * @product   highcharts
 * @requires  highcharts-3d
 * @apioption plotOptions.pie.depth
 */
''; // Keeps doclets above after transpiledion
