/* *
 *
 *  (c) 2016 Highsoft AS
 *  Authors: Øystein Moseng, Lars A. V. Cabrera
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import Connection from './Connection.js';
import PathfinderAlgorithms from './PathfinderAlgorithms.js';
import PathfinderComposition from './PathfinderComposition.js';
import Point from '../Core/Series/Point.js';
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, pick = U.pick, splat = U.splat;
/* *
 *
 *  Constants
 *
 * */
var max = Math.max, min = Math.min;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get point bounding box using plotX/plotY and shapeArgs. If using
 * graphic.getBBox() directly, the bbox will be affected by animation.
 *
 * @private
 * @function
 *
 * @param {Highcharts.Point} point
 *        The point to get BB of.
 *
 * @return {Highcharts.Dictionary<number>|null}
 *         Result xMax, xMin, yMax, yMin.
 */
function getPointBB(point) {
    var shapeArgs = point.shapeArgs;
    // Prefer using shapeArgs (columns)
    if (shapeArgs) {
        return {
            xMin: shapeArgs.x || 0,
            xMax: (shapeArgs.x || 0) + (shapeArgs.width || 0),
            yMin: shapeArgs.y || 0,
            yMax: (shapeArgs.y || 0) + (shapeArgs.height || 0)
        };
    }
    // Otherwise use plotX/plotY and bb
    var bb = point.graphic && point.graphic.getBBox();
    return bb ? {
        xMin: point.plotX - bb.width / 2,
        xMax: point.plotX + bb.width / 2,
        yMin: point.plotY - bb.height / 2,
        yMax: point.plotY + bb.height / 2
    } : null;
}
/**
 * Compute smallest distance between two rectangles.
 * @private
 */
function calculateObstacleDistance(a, b, bbMargin) {
    // Count the distance even if we are slightly off
    var margin = pick(bbMargin, 10), yOverlap = a.yMax + margin > b.yMin - margin &&
        a.yMin - margin < b.yMax + margin, xOverlap = a.xMax + margin > b.xMin - margin &&
        a.xMin - margin < b.xMax + margin, xDistance = yOverlap ? (a.xMin > b.xMax ? a.xMin - b.xMax : b.xMin - a.xMax) : Infinity, yDistance = xOverlap ? (a.yMin > b.yMax ? a.yMin - b.yMax : b.yMin - a.yMax) : Infinity;
    // If the rectangles collide, try recomputing with smaller margin.
    // If they collide anyway, discard the obstacle.
    if (xOverlap && yOverlap) {
        return (margin ?
            calculateObstacleDistance(a, b, Math.floor(margin / 2)) :
            Infinity);
    }
    return min(xDistance, yDistance);
}
/**
 * Calculate margin to place around obstacles for the pathfinder in pixels.
 * Returns a minimum of 1 pixel margin.
 *
 * @private
 * @function
 *
 * @param {Array<object>} obstacles
 *        Obstacles to calculate margin from.
 *
 * @return {number}
 *         The calculated margin in pixels. At least 1.
 */
function calculateObstacleMargin(obstacles) {
    var len = obstacles.length, distances = [];
    var onstacleDistance;
    // Go over all obstacles and compare them to the others.
    for (var i = 0; i < len; ++i) {
        // Compare to all obstacles ahead. We will already have compared this
        // obstacle to the ones before.
        for (var j = i + 1; j < len; ++j) {
            onstacleDistance =
                calculateObstacleDistance(obstacles[i], obstacles[j]);
            // TODO: Magic number 80
            if (onstacleDistance < 80) { // Ignore large distances
                distances.push(onstacleDistance);
            }
        }
    }
    // Ensure we always have at least one value, even in very spacious charts
    distances.push(80);
    return max(Math.floor(distances.sort(function (a, b) {
        return (a - b);
    })[
    // Discard first 10% of the relevant distances, and then grab
    // the smallest one.
    Math.floor(distances.length / 10)] / 2 - 1 // Divide the distance by 2 and subtract 1.
    ), 1 // 1 is the minimum margin
    );
}
/* *
 *
 *  Class
 *
 * */
/**
 * The Pathfinder class.
 *
 * @private
 * @class
 * @name Highcharts.Pathfinder
 *
 * @param {Highcharts.Chart} chart
 *        The chart to operate on.
 */
var Pathfinder = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function Pathfinder(chart) {
        this.init(chart);
    }
    /* *
     *
     *  Static Functions
     *
     * */
    Pathfinder.compose = function (ChartClass, PointClass) {
        PathfinderComposition.compose(ChartClass, Pathfinder, PointClass);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initialize the Pathfinder object.
     *
     * @function Highcharts.Pathfinder#init
     *
     * @param {Highcharts.Chart} chart
     *        The chart context.
     */
    Pathfinder.prototype.init = function (chart) {
        // Initialize pathfinder with chart context
        this.chart = chart;
        // Init connection reference list
        this.connections = [];
        // Recalculate paths/obstacles on chart redraw
        addEvent(chart, 'redraw', function () {
            this.pathfinder.update();
        });
    };
    /**
     * Update Pathfinder connections from scratch.
     *
     * @function Highcharts.Pathfinder#update
     *
     * @param {boolean} [deferRender]
     *        Whether or not to defer rendering of connections until
     *        series.afterAnimate event has fired. Used on first render.
     */
    Pathfinder.prototype.update = function (deferRender) {
        var chart = this.chart, pathfinder = this, oldConnections = pathfinder.connections;
        // Rebuild pathfinder connections from options
        pathfinder.connections = [];
        chart.series.forEach(function (series) {
            if (series.visible && !series.options.isInternal) {
                series.points.forEach(function (point) {
                    var _a;
                    var ganttPointOptions = point.options;
                    // For Gantt series the connect could be
                    // defined as a dependency
                    if (ganttPointOptions && ganttPointOptions.dependency) {
                        ganttPointOptions.connect = ganttPointOptions
                            .dependency;
                    }
                    var connects = ((_a = point.options) === null || _a === void 0 ? void 0 : _a.connect) ?
                        splat(point.options.connect) :
                        [];
                    var to;
                    if (point.visible && point.isInside !== false) {
                        connects.forEach(function (connect) {
                            var toId = typeof connect === 'string' ?
                                connect :
                                connect.to;
                            if (toId) {
                                to = chart.get(toId);
                            }
                            if (to instanceof Point &&
                                to.series.visible &&
                                to.visible &&
                                to.isInside !== false) {
                                // Add new connection
                                pathfinder.connections.push(new Connection(point, // From
                                to, typeof connect === 'string' ?
                                    {} :
                                    connect));
                            }
                        });
                    }
                });
            }
        });
        // Clear connections that should not be updated, and move old info over
        // to new connections.
        for (var j = 0, k = void 0, found = void 0, lenOld = oldConnections.length, lenNew = pathfinder.connections.length; j < lenOld; ++j) {
            found = false;
            var oldCon = oldConnections[j];
            for (k = 0; k < lenNew; ++k) {
                var newCon = pathfinder.connections[k];
                if ((oldCon.options && oldCon.options.type) ===
                    (newCon.options && newCon.options.type) &&
                    oldCon.fromPoint === newCon.fromPoint &&
                    oldCon.toPoint === newCon.toPoint) {
                    newCon.graphics = oldCon.graphics;
                    found = true;
                    break;
                }
            }
            if (!found) {
                oldCon.destroy();
            }
        }
        // Clear obstacles to force recalculation. This must be done on every
        // redraw in case positions have changed. Recalculation is handled in
        // Connection.getPath on demand.
        delete this.chartObstacles;
        delete this.lineObstacles;
        // Draw the pending connections
        pathfinder.renderConnections(deferRender);
    };
    /**
     * Draw the chart's connecting paths.
     *
     * @function Highcharts.Pathfinder#renderConnections
     *
     * @param {boolean} [deferRender]
     *        Whether or not to defer render until series animation is finished.
     *        Used on first render.
     */
    Pathfinder.prototype.renderConnections = function (deferRender) {
        if (deferRender) {
            // Render after series are done animating
            this.chart.series.forEach(function (series) {
                var render = function () {
                    // Find pathfinder connections belonging to this series
                    // that haven't rendered, and render them now.
                    var pathfinder = series.chart.pathfinder, conns = pathfinder && pathfinder.connections || [];
                    conns.forEach(function (connection) {
                        if (connection.fromPoint &&
                            connection.fromPoint.series === series) {
                            connection.render();
                        }
                    });
                    if (series.pathfinderRemoveRenderEvent) {
                        series.pathfinderRemoveRenderEvent();
                        delete series.pathfinderRemoveRenderEvent;
                    }
                };
                if (series.options.animation === false) {
                    render();
                }
                else {
                    series.pathfinderRemoveRenderEvent = addEvent(series, 'afterAnimate', render);
                }
            });
        }
        else {
            // Go through connections and render them
            this.connections.forEach(function (connection) {
                connection.render();
            });
        }
    };
    /**
     * Get obstacles for the points in the chart. Does not include connecting
     * lines from Pathfinder. Applies algorithmMargin to the obstacles.
     *
     * @function Highcharts.Pathfinder#getChartObstacles
     *
     * @param {Object} options
     *        Options for the calculation. Currently only
     *        `options.algorithmMargin`.
     *
     * @param {number} options.algorithmMargin
     *        The algorithm margin to use for the obstacles.

    * @return {Array<object>}
     *         An array of calculated obstacles. Each obstacle is defined as an
     *         object with xMin, xMax, yMin and yMax properties.
     */
    Pathfinder.prototype.getChartObstacles = function (options) {
        var series = this.chart.series, margin = pick(options.algorithmMargin, 0);
        var obstacles = [], calculatedMargin;
        for (var i = 0, sLen = series.length; i < sLen; ++i) {
            if (series[i].visible && !series[i].options.isInternal) {
                for (var j = 0, pLen = series[i].points.length, bb = void 0, point = void 0; j < pLen; ++j) {
                    point = series[i].points[j];
                    if (point.visible) {
                        bb = getPointBB(point);
                        if (bb) {
                            obstacles.push({
                                xMin: bb.xMin - margin,
                                xMax: bb.xMax + margin,
                                yMin: bb.yMin - margin,
                                yMax: bb.yMax + margin
                            });
                        }
                    }
                }
            }
        }
        // Sort obstacles by xMin for optimization
        obstacles = obstacles.sort(function (a, b) {
            return a.xMin - b.xMin;
        });
        // Add auto-calculated margin if the option is not defined
        if (!defined(options.algorithmMargin)) {
            calculatedMargin =
                options.algorithmMargin =
                    calculateObstacleMargin(obstacles);
            obstacles.forEach(function (obstacle) {
                obstacle.xMin -= calculatedMargin;
                obstacle.xMax += calculatedMargin;
                obstacle.yMin -= calculatedMargin;
                obstacle.yMax += calculatedMargin;
            });
        }
        return obstacles;
    };
    /**
     * Utility function to get metrics for obstacles:
     * - Widest obstacle width
     * - Tallest obstacle height
     *
     * @function Highcharts.Pathfinder#getObstacleMetrics
     *
     * @param {Array<object>} obstacles
     *        An array of obstacles to inspect.
     *
     * @return {Object}
     *         The calculated metrics, as an object with maxHeight and maxWidth
     *         properties.
     */
    Pathfinder.prototype.getObstacleMetrics = function (obstacles) {
        var maxWidth = 0, maxHeight = 0, width, height, i = obstacles.length;
        while (i--) {
            width = obstacles[i].xMax - obstacles[i].xMin;
            height = obstacles[i].yMax - obstacles[i].yMin;
            if (maxWidth < width) {
                maxWidth = width;
            }
            if (maxHeight < height) {
                maxHeight = height;
            }
        }
        return {
            maxHeight: maxHeight,
            maxWidth: maxWidth
        };
    };
    /**
     * Utility to get which direction to start the pathfinding algorithm
     * (X vs Y), calculated from a set of marker options.
     *
     * @function Highcharts.Pathfinder#getAlgorithmStartDirection
     *
     * @param {Highcharts.ConnectorsMarkerOptions} markerOptions
     *        Marker options to calculate from.
     *
     * @return {boolean}
     *         Returns true for X, false for Y, and undefined for autocalculate.
     */
    Pathfinder.prototype.getAlgorithmStartDirection = function (markerOptions) {
        var xCenter = markerOptions.align !== 'left' &&
            markerOptions.align !== 'right', yCenter = markerOptions.verticalAlign !== 'top' &&
            markerOptions.verticalAlign !== 'bottom';
        return xCenter ?
            (yCenter ? void 0 : false) : // When x is centered
            (yCenter ? true : void 0); // When x is off-center
    };
    return Pathfinder;
}());
/**
 * @name Highcharts.Pathfinder#algorithms
 * @type {Highcharts.Dictionary<Function>}
 */
Pathfinder.prototype.algorithms = PathfinderAlgorithms;
/* *
 *
 *  Default Export
 *
 * */
export default Pathfinder;
/* *
 *
 *  API Options
 *
 * */
/**
 * The default pathfinder algorithm to use for a chart. It is possible to define
 * your own algorithms by adding them to the
 * `Highcharts.Pathfinder.prototype.algorithms`
 * object before the chart has been created.
 *
 * The default algorithms are as follows:
 *
 * `straight`:      Draws a straight line between the connecting
 *                  points. Does not avoid other points when drawing.
 *
 * `simpleConnect`: Finds a path between the points using right angles
 *                  only. Takes only starting/ending points into
 *                  account, and will not avoid other points.
 *
 * `fastAvoid`:     Finds a path between the points using right angles
 *                  only. Will attempt to avoid other points, but its
 *                  focus is performance over accuracy. Works well with
 *                  less dense datasets.
 *
 * @typedef {"fastAvoid"|"simpleConnect"|"straight"|string} Highcharts.PathfinderTypeValue
 */
''; // Keeps doclets above in JS file
