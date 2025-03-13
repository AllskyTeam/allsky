/* *
 *
 *  Dependency wheel module
 *
 *  (c) 2018-2024 Torstein Honsi
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
import DependencyWheelPoint from './DependencyWheelPoint.js';
import DependencyWheelSeriesDefaults from './DependencyWheelSeriesDefaults.js';
import H from '../../Core/Globals.js';
var deg2rad = H.deg2rad;
import SankeyColumnComposition from '../Sankey/SankeyColumnComposition.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, PieSeries = _a.pie, SankeySeries = _a.sankey;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge, relativeLength = U.relativeLength;
import SVGElement from '../../Core/Renderer/SVG/SVGElement.js';
import TextPath from '../../Extensions/TextPath.js';
TextPath.compose(SVGElement);
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.dependencywheel
 *
 * @augments Highcharts.seriesTypes.sankey
 */
var DependencyWheelSeries = /** @class */ (function (_super) {
    __extends(DependencyWheelSeries, _super);
    function DependencyWheelSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    DependencyWheelSeries.prototype.animate = function (init) {
        var series = this;
        if (!init) {
            var duration = animObject(series.options.animation).duration, step_1 = (duration / 2) / series.nodes.length;
            var i = 0;
            var _loop_1 = function (point) {
                var graphic = point.graphic;
                if (graphic) {
                    graphic.attr({ opacity: 0 });
                    setTimeout(function () {
                        if (point.graphic) {
                            point.graphic.animate({ opacity: 1 }, { duration: step_1 });
                        }
                    }, step_1 * i++);
                }
            };
            for (var _i = 0, _a = series.nodes; _i < _a.length; _i++) {
                var point = _a[_i];
                _loop_1(point);
            }
            for (var _b = 0, _c = series.points; _b < _c.length; _b++) {
                var point = _c[_b];
                var graphic = point.graphic;
                if (!point.isNode && graphic) {
                    graphic.attr({ opacity: 0 })
                        .animate({
                        opacity: 1
                    }, series.options.animation);
                }
            }
        }
    };
    DependencyWheelSeries.prototype.createNode = function (id) {
        var node = _super.prototype.createNode.call(this, id);
        /**
         * Return the sum of incoming and outgoing links.
         * @private
         */
        node.getSum = function () { return (node.linksFrom
            .concat(node.linksTo)
            .reduce(function (acc, link) { return (acc + link.weight); }, 0)); };
        /**
         * Get the offset in weight values of a point/link.
         * @private
         */
        node.offset = function (point) {
            var otherNode = function (link) { return (link.fromNode === node ?
                link.toNode :
                link.fromNode); };
            var offset = 0, links = node.linksFrom.concat(node.linksTo), sliced;
            // Sort and slice the links to avoid links going out of each
            // node crossing each other.
            links.sort(function (a, b) { return (otherNode(a).index - otherNode(b).index); });
            for (var i = 0; i < links.length; i++) {
                if (otherNode(links[i]).index > node.index) {
                    links = links.slice(0, i).reverse().concat(links.slice(i).reverse());
                    sliced = true;
                    break;
                }
            }
            if (!sliced) {
                links.reverse();
            }
            for (var i = 0; i < links.length; i++) {
                if (links[i] === point) {
                    return offset;
                }
                offset += links[i].weight;
            }
        };
        return node;
    };
    /**
     * Dependency wheel has only one column, it runs along the perimeter.
     * @private
     */
    DependencyWheelSeries.prototype.createNodeColumns = function () {
        var series = this, columns = [SankeyColumnComposition.compose([], series)];
        for (var _i = 0, _a = series.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            node.column = 0;
            columns[0].push(node);
        }
        return columns;
    };
    /**
     * Translate from vertical pixels to perimeter.
     * @private
     */
    DependencyWheelSeries.prototype.getNodePadding = function () {
        return this.options.nodePadding / Math.PI;
    };
    /**
     * @ignore
     * @todo Override the refactored sankey translateLink and translateNode
     * functions instead of the whole translate function.
     */
    DependencyWheelSeries.prototype.translate = function () {
        var series = this, options = series.options, factor = 2 * Math.PI /
            (series.chart.plotHeight + series.getNodePadding()), center = series.getCenter(), startAngle = (options.startAngle - 90) * deg2rad, brOption = options.borderRadius, borderRadius = typeof brOption === 'object' ?
            brOption.radius : brOption;
        _super.prototype.translate.call(this);
        var _loop_2 = function (node) {
            // Don't render the nodes if sum is 0 #12453
            if (node.sum) {
                var shapeArgs = node.shapeArgs, centerX_1 = center[0], centerY_1 = center[1], r = center[2] / 2, nodeWidth = options.nodeWidth === 'auto' ?
                    20 : options.nodeWidth, innerR_1 = r - relativeLength(nodeWidth || 0, r), start = startAngle + factor * (shapeArgs.y || 0), end = startAngle +
                    factor * ((shapeArgs.y || 0) + (shapeArgs.height || 0));
                // Middle angle
                node.angle = start + (end - start) / 2;
                node.shapeType = 'arc';
                node.shapeArgs = {
                    x: centerX_1,
                    y: centerY_1,
                    r: r,
                    innerR: innerR_1,
                    start: start,
                    end: end,
                    borderRadius: borderRadius
                };
                node.dlBox = {
                    x: centerX_1 + Math.cos((start + end) / 2) * (r + innerR_1) / 2,
                    y: centerY_1 + Math.sin((start + end) / 2) * (r + innerR_1) / 2,
                    width: 1,
                    height: 1
                };
                var _loop_3 = function (point) {
                    if (point.linkBase) {
                        var curveFactor_1, distance_1;
                        var corners = point.linkBase.map(function (top, i) {
                            var angle = factor * top, x = Math.cos(startAngle + angle) * (innerR_1 + 1), y = Math.sin(startAngle + angle) * (innerR_1 + 1);
                            curveFactor_1 = options.curveFactor || 0;
                            // The distance between the from and to node
                            // along the perimeter. This affect how curved
                            // the link is, so that links between neighbours
                            // don't extend too far towards the center.
                            distance_1 = Math.abs(point.linkBase[3 - i] * factor - angle);
                            if (distance_1 > Math.PI) {
                                distance_1 = 2 * Math.PI - distance_1;
                            }
                            distance_1 = distance_1 * innerR_1;
                            if (distance_1 < innerR_1) {
                                curveFactor_1 *= (distance_1 / innerR_1);
                            }
                            return {
                                x: centerX_1 + x,
                                y: centerY_1 + y,
                                cpX: centerX_1 + (1 - curveFactor_1) * x,
                                cpY: centerY_1 + (1 - curveFactor_1) * y
                            };
                        });
                        point.shapeArgs = {
                            d: [[
                                    'M',
                                    corners[0].x, corners[0].y
                                ], [
                                    'A',
                                    innerR_1, innerR_1,
                                    0,
                                    0, // Long arc
                                    1, // Clockwise
                                    corners[1].x, corners[1].y
                                ], [
                                    'C',
                                    corners[1].cpX, corners[1].cpY,
                                    corners[2].cpX, corners[2].cpY,
                                    corners[2].x, corners[2].y
                                ], [
                                    'A',
                                    innerR_1, innerR_1,
                                    0,
                                    0,
                                    1,
                                    corners[3].x, corners[3].y
                                ], [
                                    'C',
                                    corners[3].cpX, corners[3].cpY,
                                    corners[0].cpX, corners[0].cpY,
                                    corners[0].x, corners[0].y
                                ]]
                        };
                    }
                };
                // Draw the links from this node
                for (var _b = 0, _c = node.linksFrom; _b < _c.length; _b++) {
                    var point = _c[_b];
                    _loop_3(point);
                }
            }
        };
        for (var _i = 0, _a = this.nodeColumns[0]; _i < _a.length; _i++) {
            var node = _a[_i];
            _loop_2(node);
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    DependencyWheelSeries.defaultOptions = merge(SankeySeries.defaultOptions, DependencyWheelSeriesDefaults);
    return DependencyWheelSeries;
}(SankeySeries));
extend(DependencyWheelSeries.prototype, {
    orderNodes: false,
    getCenter: PieSeries.prototype.getCenter
});
DependencyWheelSeries.prototype.pointClass = DependencyWheelPoint;
SeriesRegistry.registerSeriesType('dependencywheel', DependencyWheelSeries);
/* *
 *
 *  Default Export
 *
 * */
export default DependencyWheelSeries;
