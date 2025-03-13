/**
 * @license Highcharts Gantt JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/pathfinder
 * @requires highcharts
 *
 * Pathfinder
 *
 * (c) 2016-2024 Øystein Moseng
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(root["_Highcharts"], root["_Highcharts"]["Point"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/pathfinder", ["highcharts/highcharts"], function (amd1) {return factory(amd1,amd1["Point"]);});
	else if(typeof exports === 'object')
		exports["highcharts/modules/pathfinder"] = factory(root["_Highcharts"], root["_Highcharts"]["Point"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["Point"]);
})(typeof window === 'undefined' ? this : window, (__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__260__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 260:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__260__;

/***/ }),

/***/ 944:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__944__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ pathfinder_src)
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es-modules/Gantt/Connection.js
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



const { defined, error, merge, objectEach } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 *  Constants
 *
 * */
const deg2rad = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad, max = Math.max, min = Math.min;
/* *
 *
 *  Class
 *
 * */
/**
 * The Connection class. Used internally to represent a connection between two
 * points.
 *
 * @private
 * @class
 * @name Highcharts.Connection
 *
 * @param {Highcharts.Point} from
 *        Connection runs from this Point.
 *
 * @param {Highcharts.Point} to
 *        Connection runs to this Point.
 *
 * @param {Highcharts.ConnectorsOptions} [options]
 *        Connection options.
 */
class Connection {
    constructor(from, to, options) {
        this.init(from, to, options);
    }
    /**
     * Initialize the Connection object. Used as constructor only.
     *
     * @function Highcharts.Connection#init
     *
     * @param {Highcharts.Point} from
     *        Connection runs from this Point.
     *
     * @param {Highcharts.Point} to
     *        Connection runs to this Point.
     *
     * @param {Highcharts.ConnectorsOptions} [options]
     *        Connection options.
     */
    init(from, to, options) {
        this.fromPoint = from;
        this.toPoint = to;
        this.options = options;
        this.chart = from.series.chart;
        this.pathfinder = this.chart.pathfinder;
    }
    /**
     * Add (or update) this connection's path on chart. Stores reference to the
     * created element on this.graphics.path.
     *
     * @function Highcharts.Connection#renderPath
     *
     * @param {Highcharts.SVGPathArray} path
     *        Path to render, in array format. E.g. ['M', 0, 0, 'L', 10, 10]
     *
     * @param {Highcharts.SVGAttributes} [attribs]
     *        SVG attributes for the path.
     *
     * @param {Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Animation options for the rendering.
     */
    renderPath(path, attribs) {
        const connection = this, chart = this.chart, styledMode = chart.styledMode, pathfinder = this.pathfinder, anim = {};
        let pathGraphic = connection.graphics && connection.graphics.path;
        // Add the SVG element of the pathfinder group if it doesn't exist
        if (!pathfinder.group) {
            pathfinder.group = chart.renderer.g()
                .addClass('highcharts-pathfinder-group')
                .attr({ zIndex: -1 })
                .add(chart.seriesGroup);
        }
        // Shift the group to compensate for plot area.
        // Note: Do this always (even when redrawing a path) to avoid issues
        // when updating chart in a way that changes plot metrics.
        pathfinder.group.translate(chart.plotLeft, chart.plotTop);
        // Create path if does not exist
        if (!(pathGraphic && pathGraphic.renderer)) {
            pathGraphic = chart.renderer.path()
                .add(pathfinder.group);
            if (!styledMode) {
                pathGraphic.attr({
                    opacity: 0
                });
            }
        }
        // Set path attribs and animate to the new path
        pathGraphic.attr(attribs);
        anim.d = path;
        if (!styledMode) {
            anim.opacity = 1;
        }
        pathGraphic.animate(anim);
        // Store reference on connection
        this.graphics = this.graphics || {};
        this.graphics.path = pathGraphic;
    }
    /**
     * Calculate and add marker graphics for connection to the chart. The
     * created/updated elements are stored on this.graphics.start and
     * this.graphics.end.
     *
     * @function Highcharts.Connection#addMarker
     *
     * @param {string} type
     *        Marker type, either 'start' or 'end'.
     *
     * @param {Highcharts.ConnectorsMarkerOptions} options
     *        All options for this marker. Not calculated or merged with other
     *        options.
     *
     * @param {Highcharts.SVGPathArray} path
     *        Connection path in array format. This is used to calculate the
     *        rotation angle of the markers.
     */
    addMarker(type, options, path) {
        const connection = this, chart = connection.fromPoint.series.chart, pathfinder = chart.pathfinder, renderer = chart.renderer, point = (type === 'start' ?
            connection.fromPoint :
            connection.toPoint), anchor = point.getPathfinderAnchorPoint(options);
        let markerVector, radians, rotation, box, width, height, pathVector, segment;
        if (!options.enabled) {
            return;
        }
        // Last vector before start/end of path, used to get angle
        if (type === 'start') {
            segment = path[1];
        }
        else { // 'end'
            segment = path[path.length - 2];
        }
        if (segment && segment[0] === 'M' || segment[0] === 'L') {
            pathVector = {
                x: segment[1],
                y: segment[2]
            };
            // Get angle between pathVector and anchor point and use it to
            // create marker position.
            radians = point.getRadiansToVector(pathVector, anchor);
            markerVector = point.getMarkerVector(radians, options.radius, anchor);
            // Rotation of marker is calculated from angle between pathVector
            // and markerVector.
            // (Note:
            //  Used to recalculate radians between markerVector and pathVector,
            //  but this should be the same as between pathVector and anchor.)
            rotation = -radians / deg2rad;
            if (options.width && options.height) {
                width = options.width;
                height = options.height;
            }
            else {
                width = height = options.radius * 2;
            }
            // Add graphics object if it does not exist
            connection.graphics = connection.graphics || {};
            box = {
                x: markerVector.x - (width / 2),
                y: markerVector.y - (height / 2),
                width: width,
                height: height,
                rotation: rotation,
                rotationOriginX: markerVector.x,
                rotationOriginY: markerVector.y
            };
            if (!connection.graphics[type]) {
                // Create new marker element
                connection.graphics[type] = renderer
                    .symbol(options.symbol)
                    .addClass('highcharts-point-connecting-path-' + type + '-marker' +
                    ' highcharts-color-' + this.fromPoint.colorIndex)
                    .attr(box)
                    .add(pathfinder.group);
                if (!renderer.styledMode) {
                    connection.graphics[type].attr({
                        fill: options.color || connection.fromPoint.color,
                        stroke: options.lineColor,
                        'stroke-width': options.lineWidth,
                        opacity: 0
                    })
                        .animate({
                        opacity: 1
                    }, point.series.options.animation);
                }
            }
            else {
                connection.graphics[type].animate(box);
            }
        }
    }
    /**
     * Calculate and return connection path.
     * Note: Recalculates chart obstacles on demand if they aren't calculated.
     *
     * @function Highcharts.Connection#getPath
     *
     * @param {Highcharts.ConnectorsOptions} options
     *        Connector options. Not calculated or merged with other options.
     *
     * @return {object|undefined}
     *         Calculated SVG path data in array format.
     */
    getPath(options) {
        const pathfinder = this.pathfinder, chart = this.chart, algorithm = pathfinder.algorithms[options.type];
        let chartObstacles = pathfinder.chartObstacles;
        if (typeof algorithm !== 'function') {
            error('"' + options.type + '" is not a Pathfinder algorithm.');
            return {
                path: [],
                obstacles: []
            };
        }
        // This function calculates obstacles on demand if they don't exist
        if (algorithm.requiresObstacles && !chartObstacles) {
            chartObstacles =
                pathfinder.chartObstacles =
                    pathfinder.getChartObstacles(options);
            // If the algorithmMargin was computed, store the result in default
            // options.
            chart.options.connectors.algorithmMargin =
                options.algorithmMargin;
            // Cache some metrics too
            pathfinder.chartObstacleMetrics =
                pathfinder.getObstacleMetrics(chartObstacles);
        }
        // Get the SVG path
        return algorithm(
        // From
        this.fromPoint.getPathfinderAnchorPoint(options.startMarker), 
        // To
        this.toPoint.getPathfinderAnchorPoint(options.endMarker), merge({
            chartObstacles: chartObstacles,
            lineObstacles: pathfinder.lineObstacles || [],
            obstacleMetrics: pathfinder.chartObstacleMetrics,
            hardBounds: {
                xMin: 0,
                xMax: chart.plotWidth,
                yMin: 0,
                yMax: chart.plotHeight
            },
            obstacleOptions: {
                margin: options.algorithmMargin
            },
            startDirectionX: pathfinder.getAlgorithmStartDirection(options.startMarker)
        }, options));
    }
    /**
     * (re)Calculate and (re)draw the connection.
     *
     * @function Highcharts.Connection#render
     */
    render() {
        const connection = this, fromPoint = connection.fromPoint, series = fromPoint.series, chart = series.chart, pathfinder = chart.pathfinder, attribs = {};
        let options = merge(chart.options.connectors, series.options.connectors, fromPoint.options.connectors, connection.options);
        // Set path attribs
        if (!chart.styledMode) {
            attribs.stroke = options.lineColor || fromPoint.color;
            attribs['stroke-width'] = options.lineWidth;
            if (options.dashStyle) {
                attribs.dashstyle = options.dashStyle;
            }
        }
        attribs['class'] = // eslint-disable-line dot-notation
            'highcharts-point-connecting-path ' +
                'highcharts-color-' + fromPoint.colorIndex;
        options = merge(attribs, options);
        // Set common marker options
        if (!defined(options.marker.radius)) {
            options.marker.radius = min(max(Math.ceil((options.algorithmMargin || 8) / 2) - 1, 1), 5);
        }
        // Get the path
        const pathResult = connection.getPath(options), path = pathResult.path;
        // Always update obstacle storage with obstacles from this path.
        // We don't know if future calls will need this for their algorithm.
        if (pathResult.obstacles) {
            pathfinder.lineObstacles =
                pathfinder.lineObstacles || [];
            pathfinder.lineObstacles =
                pathfinder.lineObstacles.concat(pathResult.obstacles);
        }
        // Add the calculated path to the pathfinder group
        connection.renderPath(path, attribs);
        // Render the markers
        connection.addMarker('start', merge(options.marker, options.startMarker), path);
        connection.addMarker('end', merge(options.marker, options.endMarker), path);
    }
    /**
     * Destroy connection by destroying the added graphics elements.
     *
     * @function Highcharts.Connection#destroy
     */
    destroy() {
        if (this.graphics) {
            objectEach(this.graphics, function (val) {
                val.destroy();
            });
            delete this.graphics;
        }
    }
}
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Gantt_Connection = (Connection);
/* *
 *
 *  API Declarations
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

;// ./code/es-modules/Series/PathUtilities.js
/* *
 *
 *  (c) 2010-2024 Pawel Lysy
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

const getLinkPath = {
    'default': getDefaultPath,
    straight: getStraightPath,
    curved: getCurvedPath
};
/**
 *
 */
function getDefaultPath(pathParams) {
    const { x1, y1, x2, y2, width = 0, inverted = false, radius, parentVisible } = pathParams;
    const path = [
        ['M', x1, y1],
        ['L', x1, y1],
        ['C', x1, y1, x1, y2, x1, y2],
        ['L', x1, y2],
        ['C', x1, y1, x1, y2, x1, y2],
        ['L', x1, y2]
    ];
    return parentVisible ?
        applyRadius([
            ['M', x1, y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y2],
            ['L', x2, y2]
        ], radius) :
        path;
}
/**
 *
 */
function getStraightPath(pathParams) {
    const { x1, y1, x2, y2, width = 0, inverted = false, parentVisible } = pathParams;
    return parentVisible ? [
        ['M', x1, y1],
        ['L', x1 + width * (inverted ? -1 : 1), y2],
        ['L', x2, y2]
    ] : [
        ['M', x1, y1],
        ['L', x1, y2],
        ['L', x1, y2]
    ];
}
/**
 *
 */
function getCurvedPath(pathParams) {
    const { x1, y1, x2, y2, offset = 0, width = 0, inverted = false, parentVisible } = pathParams;
    return parentVisible ?
        [
            ['M', x1, y1],
            [
                'C',
                x1 + offset,
                y1,
                x1 - offset + width * (inverted ? -1 : 1),
                y2,
                x1 + width * (inverted ? -1 : 1),
                y2
            ],
            ['L', x2, y2]
        ] :
        [
            ['M', x1, y1],
            ['C', x1, y1, x1, y2, x1, y2],
            ['L', x2, y2]
        ];
}
/**
 * General function to apply corner radius to a path
 * @private
 */
function applyRadius(path, r) {
    const d = [];
    for (let i = 0; i < path.length; i++) {
        const x = path[i][1];
        const y = path[i][2];
        if (typeof x === 'number' && typeof y === 'number') {
            // MoveTo
            if (i === 0) {
                d.push(['M', x, y]);
            }
            else if (i === path.length - 1) {
                d.push(['L', x, y]);
                // CurveTo
            }
            else if (r) {
                const prevSeg = path[i - 1];
                const nextSeg = path[i + 1];
                if (prevSeg && nextSeg) {
                    const x1 = prevSeg[1], y1 = prevSeg[2], x2 = nextSeg[1], y2 = nextSeg[2];
                    // Only apply to breaks
                    if (typeof x1 === 'number' &&
                        typeof x2 === 'number' &&
                        typeof y1 === 'number' &&
                        typeof y2 === 'number' &&
                        x1 !== x2 &&
                        y1 !== y2) {
                        const directionX = x1 < x2 ? 1 : -1, directionY = y1 < y2 ? 1 : -1;
                        d.push([
                            'L',
                            x - directionX * Math.min(Math.abs(x - x1), r),
                            y - directionY * Math.min(Math.abs(y - y1), r)
                        ], [
                            'C',
                            x,
                            y,
                            x,
                            y,
                            x + directionX * Math.min(Math.abs(x - x2), r),
                            y + directionY * Math.min(Math.abs(y - y2), r)
                        ]);
                    }
                }
                // LineTo
            }
            else {
                d.push(['L', x, y]);
            }
        }
    }
    return d;
}
const PathUtilities = {
    applyRadius,
    getLinkPath
};
/* harmony default export */ const Series_PathUtilities = (PathUtilities);

;// ./code/es-modules/Gantt/PathfinderAlgorithms.js
/* *
 *
 *  (c) 2016 Highsoft AS
 *  Author: Øystein Moseng
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */



const { pick } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 *  Constants
 *
 * */
const { min: PathfinderAlgorithms_min, max: PathfinderAlgorithms_max, abs } = Math;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get index of last obstacle before xMin. Employs a type of binary search, and
 * thus requires that obstacles are sorted by xMin value.
 *
 * @private
 * @function findLastObstacleBefore
 *
 * @param {Array<object>} obstacles
 *        Array of obstacles to search in.
 *
 * @param {number} xMin
 *        The xMin threshold.
 *
 * @param {number} [startIx]
 *        Starting index to search from. Must be within array range.
 *
 * @return {number}
 *         The index of the last obstacle element before xMin.
 */
function findLastObstacleBefore(obstacles, xMin, startIx) {
    const min = xMin - 0.0000001; // Make sure we include all obstacles at xMin
    let left = startIx || 0, // Left limit
    right = obstacles.length - 1, // Right limit
    cursor, cmp;
    while (left <= right) {
        cursor = (right + left) >> 1;
        cmp = min - obstacles[cursor].xMin;
        if (cmp > 0) {
            left = cursor + 1;
        }
        else if (cmp < 0) {
            right = cursor - 1;
        }
        else {
            return cursor;
        }
    }
    return left > 0 ? left - 1 : 0;
}
/**
 * Test if a point lays within an obstacle.
 *
 * @private
 * @function pointWithinObstacle
 *
 * @param {Object} obstacle
 *        Obstacle to test.
 *
 * @param {Highcharts.Point} point
 *        Point with x/y props.
 *
 * @return {boolean}
 *         Whether point is within the obstacle or not.
 */
function pointWithinObstacle(obstacle, point) {
    return (point.x <= obstacle.xMax &&
        point.x >= obstacle.xMin &&
        point.y <= obstacle.yMax &&
        point.y >= obstacle.yMin);
}
/**
 * Find the index of an obstacle that wraps around a point.
 * Returns -1 if not found.
 *
 * @private
 * @function findObstacleFromPoint
 *
 * @param {Array<object>} obstacles
 *        Obstacles to test.
 *
 * @param {Highcharts.Point} point
 *        Point with x/y props.
 *
 * @return {number}
 *         Ix of the obstacle in the array, or -1 if not found.
 */
function findObstacleFromPoint(obstacles, point) {
    let i = findLastObstacleBefore(obstacles, point.x + 1) + 1;
    while (i--) {
        if (obstacles[i].xMax >= point.x &&
            // Optimization using lazy evaluation
            pointWithinObstacle(obstacles[i], point)) {
            return i;
        }
    }
    return -1;
}
/**
 * Get SVG path array from array of line segments.
 *
 * @private
 * @function pathFromSegments
 *
 * @param {Array<object>} segments
 *        The segments to build the path from.
 *
 * @return {Highcharts.SVGPathArray}
 *         SVG path array as accepted by the SVG Renderer.
 */
function pathFromSegments(segments) {
    const path = [];
    if (segments.length) {
        path.push(['M', segments[0].start.x, segments[0].start.y]);
        for (let i = 0; i < segments.length; ++i) {
            path.push(['L', segments[i].end.x, segments[i].end.y]);
        }
    }
    return path;
}
/**
 * Limits obstacle max/mins in all directions to bounds. Modifies input
 * obstacle.
 *
 * @private
 * @function limitObstacleToBounds
 *
 * @param {Object} obstacle
 *        Obstacle to limit.
 *
 * @param {Object} bounds
 *        Bounds to use as limit.
 *
 * @return {void}
 */
function limitObstacleToBounds(obstacle, bounds) {
    obstacle.yMin = PathfinderAlgorithms_max(obstacle.yMin, bounds.yMin);
    obstacle.yMax = PathfinderAlgorithms_min(obstacle.yMax, bounds.yMax);
    obstacle.xMin = PathfinderAlgorithms_max(obstacle.xMin, bounds.xMin);
    obstacle.xMax = PathfinderAlgorithms_min(obstacle.xMax, bounds.xMax);
}
/**
 * Get an SVG path from a starting coordinate to an ending coordinate.
 * Draws a straight line.
 *
 * @function Highcharts.Pathfinder.algorithms.straight
 *
 * @param {Highcharts.PositionObject} start
 *        Starting coordinate, object with x/y props.
 *
 * @param {Highcharts.PositionObject} end
 *        Ending coordinate, object with x/y props.
 *
 * @return {Object}
 *         An object with the SVG path in Array form as accepted by the SVG
 *         renderer, as well as an array of new obstacles making up this
 *         path.
 */
function straight(start, end) {
    return {
        path: [
            ['M', start.x, start.y],
            ['L', end.x, end.y]
        ],
        obstacles: [{ start: start, end: end }]
    };
}
/**
 * Find a path from a starting coordinate to an ending coordinate, using
 * right angles only, and taking only starting/ending obstacle into
 * consideration.
 *
 * @function Highcharts.Pathfinder.algorithms.simpleConnect
 *
 * @param {Highcharts.PositionObject} start
 *        Starting coordinate, object with x/y props.
 *
 * @param {Highcharts.PositionObject} end
 *        Ending coordinate, object with x/y props.
 *
 * @param {Object} options
 *        Options for the algorithm:
 *        - chartObstacles: Array of chart obstacles to avoid
 *        - startDirectionX: Optional. True if starting in the X direction.
 *          If not provided, the algorithm starts in the direction that is
 *          the furthest between start/end.
 *
 * @return {Object}
 *         An object with the SVG path in Array form as accepted by the SVG
 *         renderer, as well as an array of new obstacles making up this
 *         path.
 */
const simpleConnect = function (start, end, options) {
    const segments = [], chartObstacles = options.chartObstacles, startObstacleIx = findObstacleFromPoint(chartObstacles, start), endObstacleIx = findObstacleFromPoint(chartObstacles, end);
    let endSegment, dir = pick(options.startDirectionX, abs(end.x - start.x) > abs(end.y - start.y)) ? 'x' : 'y', startObstacle, endObstacle, waypoint, useMax, endPoint;
    // eslint-disable-next-line valid-jsdoc
    /**
     * Return a clone of a point with a property set from a target object,
     * optionally with an offset
     * @private
     */
    function copyFromPoint(from, fromKey, to, toKey, offset) {
        const point = {
            x: from.x,
            y: from.y
        };
        point[fromKey] = to[toKey || fromKey] + (offset || 0);
        return point;
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * Return waypoint outside obstacle.
     * @private
     */
    function getMeOut(obstacle, point, direction) {
        const useMax = abs(point[direction] - obstacle[direction + 'Min']) >
            abs(point[direction] - obstacle[direction + 'Max']);
        return copyFromPoint(point, direction, obstacle, direction + (useMax ? 'Max' : 'Min'), useMax ? 1 : -1);
    }
    // Pull out end point
    if (endObstacleIx > -1) {
        endObstacle = chartObstacles[endObstacleIx];
        waypoint = getMeOut(endObstacle, end, dir);
        endSegment = {
            start: waypoint,
            end: end
        };
        endPoint = waypoint;
    }
    else {
        endPoint = end;
    }
    // If an obstacle envelops the start point, add a segment to get out,
    // and around it.
    if (startObstacleIx > -1) {
        startObstacle = chartObstacles[startObstacleIx];
        waypoint = getMeOut(startObstacle, start, dir);
        segments.push({
            start: start,
            end: waypoint
        });
        // If we are going back again, switch direction to get around start
        // obstacle.
        if (
        // Going towards max from start:
        waypoint[dir] >= start[dir] ===
            // Going towards min to end:
            waypoint[dir] >= endPoint[dir]) {
            dir = dir === 'y' ? 'x' : 'y';
            useMax = start[dir] < end[dir];
            segments.push({
                start: waypoint,
                end: copyFromPoint(waypoint, dir, startObstacle, dir + (useMax ? 'Max' : 'Min'), useMax ? 1 : -1)
            });
            // Switch direction again
            dir = dir === 'y' ? 'x' : 'y';
        }
    }
    // We are around the start obstacle. Go towards the end in one
    // direction.
    const prevWaypoint = segments.length ?
        segments[segments.length - 1].end :
        start;
    waypoint = copyFromPoint(prevWaypoint, dir, endPoint);
    segments.push({
        start: prevWaypoint,
        end: waypoint
    });
    // Final run to end point in the other direction
    dir = dir === 'y' ? 'x' : 'y';
    const waypoint2 = copyFromPoint(waypoint, dir, endPoint);
    segments.push({
        start: waypoint,
        end: waypoint2
    });
    // Finally add the endSegment
    segments.push(endSegment);
    const path = Series_PathUtilities.applyRadius(pathFromSegments(segments), options.radius);
    return {
        path,
        obstacles: segments
    };
};
simpleConnect.requiresObstacles = true;
/**
 * Find a path from a starting coordinate to an ending coordinate, taking
 * obstacles into consideration. Might not always find the optimal path,
 * but is fast, and usually good enough.
 *
 * @function Highcharts.Pathfinder.algorithms.fastAvoid
 *
 * @param {Highcharts.PositionObject} start
 *        Starting coordinate, object with x/y props.
 *
 * @param {Highcharts.PositionObject} end
 *        Ending coordinate, object with x/y props.
 *
 * @param {Object} options
 *        Options for the algorithm.
 *        - chartObstacles:  Array of chart obstacles to avoid
 *        - lineObstacles:   Array of line obstacles to jump over
 *        - obstacleMetrics: Object with metrics of chartObstacles cached
 *        - hardBounds:      Hard boundaries to not cross
 *        - obstacleOptions: Options for the obstacles, including margin
 *        - startDirectionX: Optional. True if starting in the X direction.
 *                           If not provided, the algorithm starts in the
 *                           direction that is the furthest between
 *                           start/end.
 *
 * @return {Object}
 *         An object with the SVG path in Array form as accepted by the SVG
 *         renderer, as well as an array of new obstacles making up this
 *         path.
 */
function fastAvoid(start, end, options) {
    /*
        Algorithm rules/description
        - Find initial direction
        - Determine soft/hard max for each direction.
        - Move along initial direction until obstacle.
        - Change direction.
        - If hitting obstacle, first try to change length of previous line
            before changing direction again.

        Soft min/max x = start/destination x +/- widest obstacle + margin
        Soft min/max y = start/destination y +/- tallest obstacle + margin

        @todo:
            - Make retrospective, try changing prev segment to reduce
                corners
            - Fix logic for breaking out of end-points - not always picking
                the best direction currently
            - When going around the end obstacle we should not always go the
                shortest route, rather pick the one closer to the end point
    */
    const dirIsX = pick(options.startDirectionX, abs(end.x - start.x) > abs(end.y - start.y)), dir = dirIsX ? 'x' : 'y', endSegments = [], 
    // Boundaries to stay within. If beyond soft boundary, prefer to
    // change direction ASAP. If at hard max, always change immediately.
    metrics = options.obstacleMetrics, softMinX = PathfinderAlgorithms_min(start.x, end.x) - metrics.maxWidth - 10, softMaxX = PathfinderAlgorithms_max(start.x, end.x) + metrics.maxWidth + 10, softMinY = PathfinderAlgorithms_min(start.y, end.y) - metrics.maxHeight - 10, softMaxY = PathfinderAlgorithms_max(start.y, end.y) + metrics.maxHeight + 10;
    let segments, useMax, extractedEndPoint, forceObstacleBreak = false, // Used in clearPathTo to keep track of
    // when to force break through an obstacle.
    // Obstacles
    chartObstacles = options.chartObstacles, endObstacleIx = findLastObstacleBefore(chartObstacles, softMaxX);
    const startObstacleIx = findLastObstacleBefore(chartObstacles, softMinX);
    // eslint-disable-next-line valid-jsdoc
    /**
     * How far can you go between two points before hitting an obstacle?
     * Does not work for diagonal lines (because it doesn't have to).
     * @private
     */
    function pivotPoint(fromPoint, toPoint, directionIsX) {
        const searchDirection = fromPoint.x < toPoint.x ? 1 : -1;
        let firstPoint, lastPoint, highestPoint, lowestPoint;
        if (fromPoint.x < toPoint.x) {
            firstPoint = fromPoint;
            lastPoint = toPoint;
        }
        else {
            firstPoint = toPoint;
            lastPoint = fromPoint;
        }
        if (fromPoint.y < toPoint.y) {
            lowestPoint = fromPoint;
            highestPoint = toPoint;
        }
        else {
            lowestPoint = toPoint;
            highestPoint = fromPoint;
        }
        // Go through obstacle range in reverse if toPoint is before
        // fromPoint in the X-dimension.
        let i = searchDirection < 0 ?
            // Searching backwards, start at last obstacle before last point
            PathfinderAlgorithms_min(findLastObstacleBefore(chartObstacles, lastPoint.x), chartObstacles.length - 1) :
            // Forwards. Since we're not sorted by xMax, we have to look
            // at all obstacles.
            0;
        // Go through obstacles in this X range
        while (chartObstacles[i] && (searchDirection > 0 && chartObstacles[i].xMin <= lastPoint.x ||
            searchDirection < 0 && chartObstacles[i].xMax >= firstPoint.x)) {
            // If this obstacle is between from and to points in a straight
            // line, pivot at the intersection.
            if (chartObstacles[i].xMin <= lastPoint.x &&
                chartObstacles[i].xMax >= firstPoint.x &&
                chartObstacles[i].yMin <= highestPoint.y &&
                chartObstacles[i].yMax >= lowestPoint.y) {
                if (directionIsX) {
                    return {
                        y: fromPoint.y,
                        x: fromPoint.x < toPoint.x ?
                            chartObstacles[i].xMin - 1 :
                            chartObstacles[i].xMax + 1,
                        obstacle: chartObstacles[i]
                    };
                }
                // Else ...
                return {
                    x: fromPoint.x,
                    y: fromPoint.y < toPoint.y ?
                        chartObstacles[i].yMin - 1 :
                        chartObstacles[i].yMax + 1,
                    obstacle: chartObstacles[i]
                };
            }
            i += searchDirection;
        }
        return toPoint;
    }
    /**
     * Decide in which direction to dodge or get out of an obstacle.
     * Considers desired direction, which way is shortest, soft and hard
     * bounds.
     *
     * (? Returns a string, either xMin, xMax, yMin or yMax.)
     *
     * @private
     * @function
     *
     * @param {Object} obstacle
     *        Obstacle to dodge/escape.
     *
     * @param {Object} fromPoint
     *        Point with x/y props that's dodging/escaping.
     *
     * @param {Object} toPoint
     *        Goal point.
     *
     * @param {boolean} dirIsX
     *        Dodge in X dimension.
     *
     * @param {Object} bounds
     *        Hard and soft boundaries.
     *
     * @return {boolean}
     *         Use max or not.
     */
    function getDodgeDirection(obstacle, fromPoint, toPoint, dirIsX, bounds) {
        const softBounds = bounds.soft, hardBounds = bounds.hard, dir = dirIsX ? 'x' : 'y', toPointMax = { x: fromPoint.x, y: fromPoint.y }, toPointMin = { x: fromPoint.x, y: fromPoint.y }, maxOutOfSoftBounds = obstacle[dir + 'Max'] >=
            softBounds[dir + 'Max'], minOutOfSoftBounds = obstacle[dir + 'Min'] <=
            softBounds[dir + 'Min'], maxOutOfHardBounds = obstacle[dir + 'Max'] >=
            hardBounds[dir + 'Max'], minOutOfHardBounds = obstacle[dir + 'Min'] <=
            hardBounds[dir + 'Min'], 
        // Find out if we should prefer one direction over the other if
        // we can choose freely
        minDistance = abs(obstacle[dir + 'Min'] - fromPoint[dir]), maxDistance = abs(obstacle[dir + 'Max'] - fromPoint[dir]);
        let // If it's a small difference, pick the one leading towards dest
        // point. Otherwise pick the shortest distance
        useMax = abs(minDistance - maxDistance) < 10 ?
            fromPoint[dir] < toPoint[dir] :
            maxDistance < minDistance;
        // Check if we hit any obstacles trying to go around in either
        // direction.
        toPointMin[dir] = obstacle[dir + 'Min'];
        toPointMax[dir] = obstacle[dir + 'Max'];
        const minPivot = pivotPoint(fromPoint, toPointMin, dirIsX)[dir] !==
            toPointMin[dir], maxPivot = pivotPoint(fromPoint, toPointMax, dirIsX)[dir] !==
            toPointMax[dir];
        useMax = minPivot ?
            (maxPivot ? useMax : true) :
            (maxPivot ? false : useMax);
        // `useMax` now contains our preferred choice, bounds not taken into
        // account. If both or neither direction is out of bounds we want to
        // use this.
        // Deal with soft bounds
        useMax = minOutOfSoftBounds ?
            (maxOutOfSoftBounds ? useMax : true) : // Out on min
            (maxOutOfSoftBounds ? false : useMax); // Not out on min
        // Deal with hard bounds
        useMax = minOutOfHardBounds ?
            (maxOutOfHardBounds ? useMax : true) : // Out on min
            (maxOutOfHardBounds ? false : useMax); // Not out on min
        return useMax;
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * Find a clear path between point.
     * @private
     */
    function clearPathTo(fromPoint, toPoint, dirIsX) {
        // Don't waste time if we've hit goal
        if (fromPoint.x === toPoint.x && fromPoint.y === toPoint.y) {
            return [];
        }
        const dir = dirIsX ? 'x' : 'y', obstacleMargin = options.obstacleOptions.margin, bounds = {
            soft: {
                xMin: softMinX,
                xMax: softMaxX,
                yMin: softMinY,
                yMax: softMaxY
            },
            hard: options.hardBounds
        };
        let pivot, segments, waypoint, waypointUseMax, envelopingObstacle, secondEnvelopingObstacle, envelopWaypoint;
        // If fromPoint is inside an obstacle we have a problem. Break out
        // by just going to the outside of this obstacle. We prefer to go to
        // the nearest edge in the chosen direction.
        envelopingObstacle =
            findObstacleFromPoint(chartObstacles, fromPoint);
        if (envelopingObstacle > -1) {
            envelopingObstacle = chartObstacles[envelopingObstacle];
            waypointUseMax = getDodgeDirection(envelopingObstacle, fromPoint, toPoint, dirIsX, bounds);
            // Cut obstacle to hard bounds to make sure we stay within
            limitObstacleToBounds(envelopingObstacle, options.hardBounds);
            envelopWaypoint = dirIsX ? {
                y: fromPoint.y,
                x: envelopingObstacle[waypointUseMax ? 'xMax' : 'xMin'] +
                    (waypointUseMax ? 1 : -1)
            } : {
                x: fromPoint.x,
                y: envelopingObstacle[waypointUseMax ? 'yMax' : 'yMin'] +
                    (waypointUseMax ? 1 : -1)
            };
            // If we crashed into another obstacle doing this, we put the
            // waypoint between them instead
            secondEnvelopingObstacle = findObstacleFromPoint(chartObstacles, envelopWaypoint);
            if (secondEnvelopingObstacle > -1) {
                secondEnvelopingObstacle = chartObstacles[secondEnvelopingObstacle];
                // Cut obstacle to hard bounds
                limitObstacleToBounds(secondEnvelopingObstacle, options.hardBounds);
                // Modify waypoint to lay between obstacles
                envelopWaypoint[dir] = waypointUseMax ? PathfinderAlgorithms_max(envelopingObstacle[dir + 'Max'] - obstacleMargin + 1, (secondEnvelopingObstacle[dir + 'Min'] +
                    envelopingObstacle[dir + 'Max']) / 2) :
                    PathfinderAlgorithms_min((envelopingObstacle[dir + 'Min'] + obstacleMargin - 1), ((secondEnvelopingObstacle[dir + 'Max'] +
                        envelopingObstacle[dir + 'Min']) / 2));
                // We are not going anywhere. If this happens for the first
                // time, do nothing. Otherwise, try to go to the extreme of
                // the obstacle pair in the current direction.
                if (fromPoint.x === envelopWaypoint.x &&
                    fromPoint.y === envelopWaypoint.y) {
                    if (forceObstacleBreak) {
                        envelopWaypoint[dir] = waypointUseMax ?
                            PathfinderAlgorithms_max(envelopingObstacle[dir + 'Max'], secondEnvelopingObstacle[dir + 'Max']) + 1 :
                            PathfinderAlgorithms_min(envelopingObstacle[dir + 'Min'], secondEnvelopingObstacle[dir + 'Min']) - 1;
                    }
                    // Toggle on if off, and the opposite
                    forceObstacleBreak = !forceObstacleBreak;
                }
                else {
                    // This point is not identical to previous.
                    // Clear break trigger.
                    forceObstacleBreak = false;
                }
            }
            segments = [{
                    start: fromPoint,
                    end: envelopWaypoint
                }];
        }
        else { // If not enveloping, use standard pivot calculation
            pivot = pivotPoint(fromPoint, {
                x: dirIsX ? toPoint.x : fromPoint.x,
                y: dirIsX ? fromPoint.y : toPoint.y
            }, dirIsX);
            segments = [{
                    start: fromPoint,
                    end: {
                        x: pivot.x,
                        y: pivot.y
                    }
                }];
            // Pivot before goal, use a waypoint to dodge obstacle
            if (pivot[dirIsX ? 'x' : 'y'] !== toPoint[dirIsX ? 'x' : 'y']) {
                // Find direction of waypoint
                waypointUseMax = getDodgeDirection(pivot.obstacle, pivot, toPoint, !dirIsX, bounds);
                // Cut waypoint to hard bounds
                limitObstacleToBounds(pivot.obstacle, options.hardBounds);
                waypoint = {
                    x: dirIsX ?
                        pivot.x :
                        pivot.obstacle[waypointUseMax ? 'xMax' : 'xMin'] +
                            (waypointUseMax ? 1 : -1),
                    y: dirIsX ?
                        pivot.obstacle[waypointUseMax ? 'yMax' : 'yMin'] +
                            (waypointUseMax ? 1 : -1) :
                        pivot.y
                };
                // We're changing direction here, store that to make sure we
                // also change direction when adding the last segment array
                // after handling waypoint.
                dirIsX = !dirIsX;
                segments = segments.concat(clearPathTo({
                    x: pivot.x,
                    y: pivot.y
                }, waypoint, dirIsX));
            }
        }
        // Get segments for the other direction too
        // Recursion is our friend
        segments = segments.concat(clearPathTo(segments[segments.length - 1].end, toPoint, !dirIsX));
        return segments;
    }
    // eslint-disable-next-line valid-jsdoc
    /**
     * Extract point to outside of obstacle in whichever direction is
     * closest. Returns new point outside obstacle.
     * @private
     */
    function extractFromObstacle(obstacle, point, goalPoint) {
        const dirIsX = PathfinderAlgorithms_min(obstacle.xMax - point.x, point.x - obstacle.xMin) <
            PathfinderAlgorithms_min(obstacle.yMax - point.y, point.y - obstacle.yMin), bounds = {
            soft: options.hardBounds,
            hard: options.hardBounds
        }, useMax = getDodgeDirection(obstacle, point, goalPoint, dirIsX, bounds);
        return dirIsX ? {
            y: point.y,
            x: obstacle[useMax ? 'xMax' : 'xMin'] + (useMax ? 1 : -1)
        } : {
            x: point.x,
            y: obstacle[useMax ? 'yMax' : 'yMin'] + (useMax ? 1 : -1)
        };
    }
    // Cut the obstacle array to soft bounds for optimization in large
    // datasets.
    chartObstacles =
        chartObstacles.slice(startObstacleIx, endObstacleIx + 1);
    // If an obstacle envelops the end point, move it out of there and add
    // a little segment to where it was.
    if ((endObstacleIx = findObstacleFromPoint(chartObstacles, end)) > -1) {
        extractedEndPoint = extractFromObstacle(chartObstacles[endObstacleIx], end, start);
        endSegments.push({
            end: end,
            start: extractedEndPoint
        });
        end = extractedEndPoint;
    }
    // If it's still inside one or more obstacles, get out of there by
    // force-moving towards the start point.
    while ((endObstacleIx = findObstacleFromPoint(chartObstacles, end)) > -1) {
        useMax = end[dir] - start[dir] < 0;
        extractedEndPoint = {
            x: end.x,
            y: end.y
        };
        extractedEndPoint[dir] = chartObstacles[endObstacleIx][useMax ? dir + 'Max' : dir + 'Min'] + (useMax ? 1 : -1);
        endSegments.push({
            end: end,
            start: extractedEndPoint
        });
        end = extractedEndPoint;
    }
    // Find the path
    segments = clearPathTo(start, end, dirIsX);
    // Add the end-point segments
    segments = segments.concat(endSegments.reverse());
    return {
        path: pathFromSegments(segments),
        obstacles: segments
    };
}
fastAvoid.requiresObstacles = true;
/* *
 *
 *  Default Export
 *
 * */
// Define the available pathfinding algorithms.
// Algorithms take up to 3 arguments: starting point, ending point, and an
// options object.
const algorithms = {
    fastAvoid,
    straight,
    simpleConnect
};
/* harmony default export */ const PathfinderAlgorithms = (algorithms);

;// ./code/es-modules/Gantt/ConnectorsDefaults.js
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

/* *
 *
 *  API Defaults
 *
 * */
/*
 @todo:
     - Document how to write your own algorithms
     - Consider adding a Point.pathTo method that wraps creating a connection
       and rendering it
*/
const connectorsDefaults = {
    /**
     * The Pathfinder module allows you to define connections between any two
     * points, represented as lines - optionally with markers for the start
     * and/or end points. Multiple algorithms are available for calculating how
     * the connecting lines are drawn.
     *
     * Connector functionality requires Highcharts Gantt to be loaded. In Gantt
     * charts, the connectors are used to draw dependencies between tasks.
     *
     * @see [dependency](series.gantt.data.dependency)
     *
     * @sample gantt/pathfinder/demo
     *         Pathfinder connections
     *
     * @declare      Highcharts.ConnectorsOptions
     * @product      gantt
     * @optionparent connectors
     */
    connectors: {
        /**
         * Enable connectors for this chart. Requires Highcharts Gantt.
         *
         * @type      {boolean}
         * @default   true
         * @since     6.2.0
         * @apioption connectors.enabled
         */
        /**
         * Set the default dash style for this chart's connecting lines.
         *
         * @type      {string}
         * @default   solid
         * @since     6.2.0
         * @apioption connectors.dashStyle
         */
        /**
         * Set the default color for this chart's Pathfinder connecting lines.
         * Defaults to the color of the point being connected.
         *
         * @type      {Highcharts.ColorString}
         * @since     6.2.0
         * @apioption connectors.lineColor
         */
        /**
         * Set the default pathfinder margin to use, in pixels. Some Pathfinder
         * algorithms attempt to avoid obstacles, such as other points in the
         * chart. These algorithms use this margin to determine how close lines
         * can be to an obstacle. The default is to compute this automatically
         * from the size of the obstacles in the chart.
         *
         * To draw connecting lines close to existing points, set this to a low
         * number. For more space around existing points, set this number
         * higher.
         *
         * @sample gantt/pathfinder/algorithm-margin
         *         Small algorithmMargin
         *
         * @type      {number}
         * @since     6.2.0
         * @apioption connectors.algorithmMargin
         */
        /**
         * Set the default pathfinder algorithm to use for this chart. It is
         * possible to define your own algorithms by adding them to the
         * Highcharts.Pathfinder.prototype.algorithms object before the chart
         * has been created.
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
         * Default value: `straight` is used as default for most series types,
         * while `simpleConnect` is used as default for Gantt series, to show
         * dependencies between points.
         *
         * @sample gantt/pathfinder/demo
         *         Different types used
         *
         * @type    {Highcharts.PathfinderTypeValue}
         * @default undefined
         * @since   6.2.0
         */
        type: 'straight',
        /**
         * The corner radius for the connector line.
         *
         * @since 11.2.0
         */
        radius: 0,
        /**
         * Set the default pixel width for this chart's Pathfinder connecting
         * lines.
         *
         * @since 6.2.0
         */
        lineWidth: 1,
        /**
         * Marker options for this chart's Pathfinder connectors. Note that
         * this option is overridden by the `startMarker` and `endMarker`
         * options.
         *
         * @declare Highcharts.ConnectorsMarkerOptions
         * @since   6.2.0
         */
        marker: {
            /**
             * Set the radius of the connector markers. The default is
             * automatically computed based on the algorithmMargin setting.
             *
             * Setting marker.width and marker.height will override this
             * setting.
             *
             * @type      {number}
             * @since     6.2.0
             * @apioption connectors.marker.radius
             */
            /**
             * Set the width of the connector markers. If not supplied, this
             * is inferred from the marker radius.
             *
             * @type      {number}
             * @since     6.2.0
             * @apioption connectors.marker.width
             */
            /**
             * Set the height of the connector markers. If not supplied, this
             * is inferred from the marker radius.
             *
             * @type      {number}
             * @since     6.2.0
             * @apioption connectors.marker.height
             */
            /**
             * Set the color of the connector markers. By default this is the
             * same as the connector color.
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @since     6.2.0
             * @apioption connectors.marker.color
             */
            /**
             * Set the line/border color of the connector markers. By default
             * this is the same as the marker color.
             *
             * @type      {Highcharts.ColorString}
             * @since     6.2.0
             * @apioption connectors.marker.lineColor
             */
            /**
             * Enable markers for the connectors.
             */
            enabled: false,
            /**
             * Horizontal alignment of the markers relative to the points.
             *
             * @type {Highcharts.AlignValue}
             */
            align: 'center',
            /**
             * Vertical alignment of the markers relative to the points.
             *
             * @type {Highcharts.VerticalAlignValue}
             */
            verticalAlign: 'middle',
            /**
             * Whether or not to draw the markers inside the points.
             */
            inside: false,
            /**
             * Set the line/border width of the pathfinder markers.
             */
            lineWidth: 1
        },
        /**
         * Marker options specific to the start markers for this chart's
         * Pathfinder connectors. Overrides the generic marker options.
         *
         * @declare Highcharts.ConnectorsStartMarkerOptions
         * @extends connectors.marker
         * @since   6.2.0
         */
        startMarker: {
            /**
             * Set the symbol of the connector start markers.
             */
            symbol: 'diamond'
        },
        /**
         * Marker options specific to the end markers for this chart's
         * Pathfinder connectors. Overrides the generic marker options.
         *
         * @declare Highcharts.ConnectorsEndMarkerOptions
         * @extends connectors.marker
         * @since   6.2.0
         */
        endMarker: {
            /**
             * Set the symbol of the connector end markers.
             */
            symbol: 'arrow-filled'
        }
    }
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const ConnectorsDefaults = (connectorsDefaults);
/* *
 *
 *  API Options
 *
 * */
/**
 * Override Pathfinder connector options for a series. Requires Highcharts Gantt
 * to be loaded.
 *
 * @declare   Highcharts.SeriesConnectorsOptionsObject
 * @extends   connectors
 * @since     6.2.0
 * @excluding enabled, algorithmMargin
 * @product   gantt
 * @apioption plotOptions.series.connectors
 */
/**
 * Connect to a point. This option can be either a string, referring to the ID
 * of another point, or an object, or an array of either. If the option is an
 * array, each element defines a connection.
 *
 * @sample gantt/pathfinder/demo
 *         Different connection types
 *
 * @declare   Highcharts.XrangePointConnectorsOptionsObject
 * @type      {string|Array<string|*>|*}
 * @extends   plotOptions.series.connectors
 * @since     6.2.0
 * @excluding enabled
 * @product   gantt
 * @requires  highcharts-gantt
 * @apioption series.xrange.data.connect
 */
/**
 * The ID of the point to connect to.
 *
 * @type      {string}
 * @since     6.2.0
 * @product   gantt
 * @apioption series.xrange.data.connect.to
 */
''; // Keeps doclets above in JS file

;// ./code/es-modules/Gantt/PathfinderComposition.js
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



const { setOptions } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());

const { defined: PathfinderComposition_defined, error: PathfinderComposition_error, merge: PathfinderComposition_merge } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
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
    const shapeArgs = point.shapeArgs;
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
    const bb = point.graphic && point.graphic.getBBox();
    return bb ? {
        xMin: point.plotX - bb.width / 2,
        xMax: point.plotX + bb.width / 2,
        yMin: point.plotY - bb.height / 2,
        yMax: point.plotY + bb.height / 2
    } : null;
}
/**
 * Warn if using legacy options. Copy the options over. Note that this will
 * still break if using the legacy options in chart.update, addSeries etc.
 * @private
 */
function warnLegacy(chart) {
    if (chart.options.pathfinder ||
        chart.series.reduce(function (acc, series) {
            if (series.options) {
                PathfinderComposition_merge(true, (series.options.connectors = series.options.connectors ||
                    {}), series.options.pathfinder);
            }
            return acc || series.options && series.options.pathfinder;
        }, false)) {
        PathfinderComposition_merge(true, (chart.options.connectors = chart.options.connectors || {}), chart.options.pathfinder);
        PathfinderComposition_error('WARNING: Pathfinder options have been renamed. ' +
            'Use "chart.connectors" or "series.connectors" instead.');
    }
}
/* *
 *
 *  Composition
 *
 * */
var ConnectionComposition;
(function (ConnectionComposition) {
    /* *
     *
     *  Functions
     *
     * */
    /** @private */
    function compose(ChartClass, PathfinderClass, PointClass) {
        const pointProto = PointClass.prototype;
        if (!pointProto.getPathfinderAnchorPoint) {
            // Initialize Pathfinder for charts
            ChartClass.prototype.callbacks.push(function (chart) {
                const options = chart.options;
                if (options.connectors.enabled !== false) {
                    warnLegacy(chart);
                    this.pathfinder = new PathfinderClass(this);
                    this.pathfinder.update(true); // First draw, defer render
                }
            });
            pointProto.getMarkerVector = pointGetMarkerVector;
            pointProto.getPathfinderAnchorPoint = pointGetPathfinderAnchorPoint;
            pointProto.getRadiansToVector = pointGetRadiansToVector;
            // Set default Pathfinder options
            setOptions(ConnectorsDefaults);
        }
    }
    ConnectionComposition.compose = compose;
    /**
     * Get coordinates of anchor point for pathfinder connection.
     *
     * @private
     * @function Highcharts.Point#getPathfinderAnchorPoint
     *
     * @param {Highcharts.ConnectorsMarkerOptions} markerOptions
     *        Connection options for position on point.
     *
     * @return {Highcharts.PositionObject}
     *         An object with x/y properties for the position. Coordinates are
     *         in plot values, not relative to point.
     */
    function pointGetPathfinderAnchorPoint(markerOptions) {
        const bb = getPointBB(this);
        let x, y;
        switch (markerOptions.align) { // eslint-disable-line default-case
            case 'right':
                x = 'xMax';
                break;
            case 'left':
                x = 'xMin';
        }
        switch (markerOptions.verticalAlign) { // eslint-disable-line default-case
            case 'top':
                y = 'yMin';
                break;
            case 'bottom':
                y = 'yMax';
        }
        return {
            x: x ? bb[x] : (bb.xMin + bb.xMax) / 2,
            y: y ? bb[y] : (bb.yMin + bb.yMax) / 2
        };
    }
    /**
     * Utility to get the angle from one point to another.
     *
     * @private
     * @function Highcharts.Point#getRadiansToVector
     *
     * @param {Highcharts.PositionObject} v1
     *        The first vector, as an object with x/y properties.
     *
     * @param {Highcharts.PositionObject} v2
     *        The second vector, as an object with x/y properties.
     *
     * @return {number}
     *         The angle in degrees
     */
    function pointGetRadiansToVector(v1, v2) {
        let box;
        if (!PathfinderComposition_defined(v2)) {
            box = getPointBB(this);
            if (box) {
                v2 = {
                    x: (box.xMin + box.xMax) / 2,
                    y: (box.yMin + box.yMax) / 2
                };
            }
        }
        return Math.atan2(v2.y - v1.y, v1.x - v2.x);
    }
    /**
     * Utility to get the position of the marker, based on the path angle and
     * the marker's radius.
     *
     * @private
     * @function Highcharts.Point#getMarkerVector
     *
     * @param {number} radians
     *        The angle in radians from the point center to another vector.
     *
     * @param {number} markerRadius
     *        The radius of the marker, to calculate the additional distance to
     *        the center of the marker.
     *
     * @param {Object} anchor
     *        The anchor point of the path and marker as an object with x/y
     *        properties.
     *
     * @return {Object}
     *         The marker vector as an object with x/y properties.
     */
    function pointGetMarkerVector(radians, markerRadius, anchor) {
        const twoPI = Math.PI * 2.0, bb = getPointBB(this), rectWidth = bb.xMax - bb.xMin, rectHeight = bb.yMax - bb.yMin, rAtan = Math.atan2(rectHeight, rectWidth), rectHalfWidth = rectWidth / 2.0, rectHalfHeight = rectHeight / 2.0, rectHorizontalCenter = bb.xMin + rectHalfWidth, rectVerticalCenter = bb.yMin + rectHalfHeight, edgePoint = {
            x: rectHorizontalCenter,
            y: rectVerticalCenter
        };
        let theta = radians, tanTheta = 1, leftOrRightRegion = false, xFactor = 1, yFactor = 1;
        while (theta < -Math.PI) {
            theta += twoPI;
        }
        while (theta > Math.PI) {
            theta -= twoPI;
        }
        tanTheta = Math.tan(theta);
        if ((theta > -rAtan) && (theta <= rAtan)) {
            // Right side
            yFactor = -1;
            leftOrRightRegion = true;
        }
        else if (theta > rAtan && theta <= (Math.PI - rAtan)) {
            // Top side
            yFactor = -1;
        }
        else if (theta > (Math.PI - rAtan) || theta <= -(Math.PI - rAtan)) {
            // Left side
            xFactor = -1;
            leftOrRightRegion = true;
        }
        else {
            // Bottom side
            xFactor = -1;
        }
        // Correct the edgePoint according to the placement of the marker
        if (leftOrRightRegion) {
            edgePoint.x += xFactor * (rectHalfWidth);
            edgePoint.y += yFactor * (rectHalfWidth) * tanTheta;
        }
        else {
            edgePoint.x += xFactor * (rectHeight / (2.0 * tanTheta));
            edgePoint.y += yFactor * (rectHalfHeight);
        }
        if (anchor.x !== rectHorizontalCenter) {
            edgePoint.x = anchor.x;
        }
        if (anchor.y !== rectVerticalCenter) {
            edgePoint.y = anchor.y;
        }
        return {
            x: edgePoint.x + (markerRadius * Math.cos(theta)),
            y: edgePoint.y - (markerRadius * Math.sin(theta))
        };
    }
})(ConnectionComposition || (ConnectionComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const PathfinderComposition = (ConnectionComposition);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Point"],"commonjs":["highcharts","Point"],"commonjs2":["highcharts","Point"],"root":["Highcharts","Point"]}
var highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_ = __webpack_require__(260);
var highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_default = /*#__PURE__*/__webpack_require__.n(highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_);
;// ./code/es-modules/Gantt/Pathfinder.js
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






const { addEvent, defined: Pathfinder_defined, pick: Pathfinder_pick, splat } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 *  Constants
 *
 * */
const Pathfinder_max = Math.max, Pathfinder_min = Math.min;
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
function Pathfinder_getPointBB(point) {
    const shapeArgs = point.shapeArgs;
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
    const bb = point.graphic && point.graphic.getBBox();
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
    const margin = Pathfinder_pick(bbMargin, 10), yOverlap = a.yMax + margin > b.yMin - margin &&
        a.yMin - margin < b.yMax + margin, xOverlap = a.xMax + margin > b.xMin - margin &&
        a.xMin - margin < b.xMax + margin, xDistance = yOverlap ? (a.xMin > b.xMax ? a.xMin - b.xMax : b.xMin - a.xMax) : Infinity, yDistance = xOverlap ? (a.yMin > b.yMax ? a.yMin - b.yMax : b.yMin - a.yMax) : Infinity;
    // If the rectangles collide, try recomputing with smaller margin.
    // If they collide anyway, discard the obstacle.
    if (xOverlap && yOverlap) {
        return (margin ?
            calculateObstacleDistance(a, b, Math.floor(margin / 2)) :
            Infinity);
    }
    return Pathfinder_min(xDistance, yDistance);
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
    const len = obstacles.length, distances = [];
    let onstacleDistance;
    // Go over all obstacles and compare them to the others.
    for (let i = 0; i < len; ++i) {
        // Compare to all obstacles ahead. We will already have compared this
        // obstacle to the ones before.
        for (let j = i + 1; j < len; ++j) {
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
    return Pathfinder_max(Math.floor(distances.sort(function (a, b) {
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
class Pathfinder {
    /* *
     *
     *  Static Functions
     *
     * */
    static compose(ChartClass, PointClass) {
        PathfinderComposition.compose(ChartClass, Pathfinder, PointClass);
    }
    /* *
     *
     *  Constructor
     *
     * */
    constructor(chart) {
        this.init(chart);
    }
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
    init(chart) {
        // Initialize pathfinder with chart context
        this.chart = chart;
        // Init connection reference list
        this.connections = [];
        // Recalculate paths/obstacles on chart redraw
        addEvent(chart, 'redraw', function () {
            this.pathfinder.update();
        });
    }
    /**
     * Update Pathfinder connections from scratch.
     *
     * @function Highcharts.Pathfinder#update
     *
     * @param {boolean} [deferRender]
     *        Whether or not to defer rendering of connections until
     *        series.afterAnimate event has fired. Used on first render.
     */
    update(deferRender) {
        const chart = this.chart, pathfinder = this, oldConnections = pathfinder.connections;
        // Rebuild pathfinder connections from options
        pathfinder.connections = [];
        chart.series.forEach(function (series) {
            if (series.visible && !series.options.isInternal) {
                series.points.forEach(function (point) {
                    const ganttPointOptions = point.options;
                    // For Gantt series the connect could be
                    // defined as a dependency
                    if (ganttPointOptions && ganttPointOptions.dependency) {
                        ganttPointOptions.connect = ganttPointOptions
                            .dependency;
                    }
                    const connects = point.options?.connect ?
                        splat(point.options.connect) :
                        [];
                    let to;
                    if (point.visible && point.isInside !== false) {
                        connects.forEach((connect) => {
                            const toId = typeof connect === 'string' ?
                                connect :
                                connect.to;
                            if (toId) {
                                to = chart.get(toId);
                            }
                            if (to instanceof (highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_default()) &&
                                to.series.visible &&
                                to.visible &&
                                to.isInside !== false) {
                                // Add new connection
                                pathfinder.connections.push(new Gantt_Connection(point, // From
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
        for (let j = 0, k, found, lenOld = oldConnections.length, lenNew = pathfinder.connections.length; j < lenOld; ++j) {
            found = false;
            const oldCon = oldConnections[j];
            for (k = 0; k < lenNew; ++k) {
                const newCon = pathfinder.connections[k];
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
    }
    /**
     * Draw the chart's connecting paths.
     *
     * @function Highcharts.Pathfinder#renderConnections
     *
     * @param {boolean} [deferRender]
     *        Whether or not to defer render until series animation is finished.
     *        Used on first render.
     */
    renderConnections(deferRender) {
        if (deferRender) {
            // Render after series are done animating
            this.chart.series.forEach(function (series) {
                const render = function () {
                    // Find pathfinder connections belonging to this series
                    // that haven't rendered, and render them now.
                    const pathfinder = series.chart.pathfinder, conns = pathfinder && pathfinder.connections || [];
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
    }
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
    getChartObstacles(options) {
        const series = this.chart.series, margin = Pathfinder_pick(options.algorithmMargin, 0);
        let obstacles = [], calculatedMargin;
        for (let i = 0, sLen = series.length; i < sLen; ++i) {
            if (series[i].visible && !series[i].options.isInternal) {
                for (let j = 0, pLen = series[i].points.length, bb, point; j < pLen; ++j) {
                    point = series[i].points[j];
                    if (point.visible) {
                        bb = Pathfinder_getPointBB(point);
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
        if (!Pathfinder_defined(options.algorithmMargin)) {
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
    }
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
    getObstacleMetrics(obstacles) {
        let maxWidth = 0, maxHeight = 0, width, height, i = obstacles.length;
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
    }
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
    getAlgorithmStartDirection(markerOptions) {
        const xCenter = markerOptions.align !== 'left' &&
            markerOptions.align !== 'right', yCenter = markerOptions.verticalAlign !== 'top' &&
            markerOptions.verticalAlign !== 'bottom';
        return xCenter ?
            (yCenter ? void 0 : false) : // When x is centered
            (yCenter ? true : void 0); // When x is off-center
    }
}
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
/* harmony default export */ const Gantt_Pathfinder = (Pathfinder);
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

;// ./code/es-modules/Extensions/ArrowSymbols.js
/* *
 *
 *  (c) 2017 Highsoft AS
 *  Authors: Lars A. V. Cabrera
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Functions
 *
 * */
/**
 * Creates an arrow symbol. Like a triangle, except not filled.
 * ```
 *                   o
 *             o
 *       o
 * o
 *       o
 *             o
 *                   o
 * ```
 *
 * @private
 * @function
 *
 * @param {number} x
 *        x position of the arrow
 *
 * @param {number} y
 *        y position of the arrow
 *
 * @param {number} w
 *        width of the arrow
 *
 * @param {number} h
 *        height of the arrow
 *
 * @return {Highcharts.SVGPathArray}
 *         Path array
 */
function arrow(x, y, w, h) {
    return [
        ['M', x, y + h / 2],
        ['L', x + w, y],
        ['L', x, y + h / 2],
        ['L', x + w, y + h]
    ];
}
/**
 * Creates a half-width arrow symbol. Like a triangle, except not filled.
 * ```
 *       o
 *    o
 * o
 *    o
 *       o
 * ```
 *
 * @private
 * @function
 *
 * @param {number} x
 *        x position of the arrow
 *
 * @param {number} y
 *        y position of the arrow
 *
 * @param {number} w
 *        width of the arrow
 *
 * @param {number} h
 *        height of the arrow
 *
 * @return {Highcharts.SVGPathArray}
 *         Path array
 */
function arrowHalf(x, y, w, h) {
    return arrow(x, y, w / 2, h);
}
/**
 * @private
 */
function compose(SVGRendererClass) {
    const symbols = SVGRendererClass.prototype.symbols;
    symbols.arrow = arrow;
    symbols['arrow-filled'] = triangleLeft;
    symbols['arrow-filled-half'] = triangleLeftHalf;
    symbols['arrow-half'] = arrowHalf;
    symbols['triangle-left'] = triangleLeft;
    symbols['triangle-left-half'] = triangleLeftHalf;
}
/**
 * Creates a left-oriented triangle.
 * ```
 *             o
 *       ooooooo
 * ooooooooooooo
 *       ooooooo
 *             o
 * ```
 *
 * @private
 * @function
 *
 * @param {number} x
 *        x position of the triangle
 *
 * @param {number} y
 *        y position of the triangle
 *
 * @param {number} w
 *        width of the triangle
 *
 * @param {number} h
 *        height of the triangle
 *
 * @return {Highcharts.SVGPathArray}
 *         Path array
 */
function triangleLeft(x, y, w, h) {
    return [
        ['M', x + w, y],
        ['L', x, y + h / 2],
        ['L', x + w, y + h],
        ['Z']
    ];
}
/**
 * Creates a half-width, left-oriented triangle.
 * ```
 *       o
 *    oooo
 * ooooooo
 *    oooo
 *       o
 * ```
 *
 * @private
 * @function
 *
 * @param {number} x
 *        x position of the triangle
 *
 * @param {number} y
 *        y position of the triangle
 *
 * @param {number} w
 *        width of the triangle
 *
 * @param {number} h
 *        height of the triangle
 *
 * @return {Highcharts.SVGPathArray}
 *         Path array
 */
function triangleLeftHalf(x, y, w, h) {
    return triangleLeft(x, y, w / 2, h);
}
/* *
 *
 *  Default Export
 *
 * */
const ArrowSymbols = {
    compose
};
/* harmony default export */ const Extensions_ArrowSymbols = (ArrowSymbols);

;// ./code/es-modules/masters/modules/pathfinder.src.js





const G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
G.Pathfinder = G.Pathfinder || Gantt_Pathfinder;
Extensions_ArrowSymbols.compose(G.SVGRenderer);
G.Pathfinder.compose(G.Chart, G.Point);
/* harmony default export */ const pathfinder_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});