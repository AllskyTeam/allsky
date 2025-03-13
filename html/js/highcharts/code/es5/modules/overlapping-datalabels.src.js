/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/overlapping-datalabels
 * @requires highcharts
 *
 * (c) 2009-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"));
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/overlapping-datalabels", [["highcharts/highcharts"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/overlapping-datalabels"] = factory(require("highcharts"));
	else
		root["Highcharts"] = factory(root["Highcharts"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 944:
/***/ (function(module) {

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
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ overlapping_datalabels_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es5/es-modules/Core/Geometry/GeometryUtilities.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Namespace
 *
 * */
var GeometryUtilities;
(function (GeometryUtilities) {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Calculates the center between a list of points.
     *
     * @private
     *
     * @param {Array<Highcharts.PositionObject>} points
     * A list of points to calculate the center of.
     *
     * @return {Highcharts.PositionObject}
     * Calculated center
     */
    function getCenterOfPoints(points) {
        var sum = points.reduce(function (sum,
            point) {
                sum.x += point.x;
            sum.y += point.y;
            return sum;
        }, { x: 0, y: 0 });
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }
    GeometryUtilities.getCenterOfPoints = getCenterOfPoints;
    /**
     * Calculates the distance between two points based on their x and y
     * coordinates.
     *
     * @private
     *
     * @param {Highcharts.PositionObject} p1
     * The x and y coordinates of the first point.
     *
     * @param {Highcharts.PositionObject} p2
     * The x and y coordinates of the second point.
     *
     * @return {number}
     * Returns the distance between the points.
     */
    function getDistanceBetweenPoints(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    GeometryUtilities.getDistanceBetweenPoints = getDistanceBetweenPoints;
    /**
     * Calculates the angle between two points.
     * @todo add unit tests.
     * @private
     * @param {Highcharts.PositionObject} p1 The first point.
     * @param {Highcharts.PositionObject} p2 The second point.
     * @return {number} Returns the angle in radians.
     */
    function getAngleBetweenPoints(p1, p2) {
        return Math.atan2(p2.x - p1.x, p2.y - p1.y);
    }
    GeometryUtilities.getAngleBetweenPoints = getAngleBetweenPoints;
    /**
     * Test for point in polygon. Polygon defined as array of [x,y] points.
     * @private
     * @param {PositionObject} point The point potentially within a polygon.
     * @param {Array<Array<number>>} polygon The polygon potentially containing the point.
     */
    function pointInPolygon(_a, polygon) {
        var x = _a.x,
            y = _a.y;
        var len = polygon.length;
        var i,
            j,
            inside = false;
        for (i = 0, j = len - 1; i < len; j = i++) {
            var _b = polygon[i],
                x1 = _b[0],
                y1 = _b[1],
                _c = polygon[j],
                x2 = _c[0],
                y2 = _c[1];
            if (y1 > y !== y2 > y &&
                (x < (x2 - x1) *
                    (y - y1) /
                    (y2 - y1) +
                    x1)) {
                inside = !inside;
            }
        }
        return inside;
    }
    GeometryUtilities.pointInPolygon = pointInPolygon;
})(GeometryUtilities || (GeometryUtilities = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Geometry_GeometryUtilities = (GeometryUtilities);

;// ./code/es5/es-modules/Extensions/OverlappingDataLabels.js
/* *
 *
 *  Highcharts module to hide overlapping data labels.
 *  This module is included in Highcharts.
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var pointInPolygon = Geometry_GeometryUtilities.pointInPolygon;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, objectEach = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).objectEach, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Hide overlapping labels. Labels are moved and faded in and out on zoom to
 * provide a smooth visual impression.
 *
 * @requires modules/overlapping-datalabels
 *
 * @private
 * @function Highcharts.Chart#hideOverlappingLabels
 * @param {Array<Highcharts.SVGElement>} labels
 *        Rendered data labels
 */
function chartHideOverlappingLabels(labels) {
    var chart = this,
        len = labels.length,
        isIntersectRect = function (box1,
        box2) { return !(box2.x >= box1.x + box1.width ||
            box2.x + box2.width <= box1.x ||
            box2.y >= box1.y + box1.height ||
            box2.y + box2.height <= box1.y); },
        isPolygonOverlap = function (box1Poly,
        box2Poly) {
            for (var _i = 0,
        box1Poly_1 = box1Poly; _i < box1Poly_1.length; _i++) {
                var p = box1Poly_1[_i];
            if (pointInPolygon({ x: p[0], y: p[1] }, box2Poly)) {
                return true;
            }
        }
        return false;
    };
    /**
     * Get the box with its position inside the chart, as opposed to getBBox
     * that only reports the position relative to the parent.
     */
    function getAbsoluteBox(label) {
        var _a,
            _b;
        if (label && (!label.alignAttr || label.placed)) {
            var padding = label.box ? 0 : (label.padding || 0),
                pos = label.alignAttr || {
                    x: label.attr('x'),
                    y: label.attr('y')
                },
                bBox = label.getBBox();
            label.width = bBox.width;
            label.height = bBox.height;
            return {
                x: pos.x + (((_a = label.parentGroup) === null || _a === void 0 ? void 0 : _a.translateX) || 0) + padding,
                y: pos.y + (((_b = label.parentGroup) === null || _b === void 0 ? void 0 : _b.translateY) || 0) + padding,
                width: (label.width || 0) - 2 * padding,
                height: (label.height || 0) - 2 * padding,
                polygon: bBox === null || bBox === void 0 ? void 0 : bBox.polygon
            };
        }
    }
    var label,
        label1,
        label2,
        box1,
        box2,
        isLabelAffected = false;
    for (var i = 0; i < len; i++) {
        label = labels[i];
        if (label) {
            // Mark with initial opacity
            label.oldOpacity = label.opacity;
            label.newOpacity = 1;
            label.absoluteBox = getAbsoluteBox(label);
        }
    }
    // Prevent a situation in a gradually rising slope, that each label will
    // hide the previous one because the previous one always has lower rank.
    labels.sort(function (a, b) { return (b.labelrank || 0) - (a.labelrank || 0); });
    // Detect overlapping labels
    for (var i = 0; i < len; ++i) {
        label1 = labels[i];
        box1 = label1 && label1.absoluteBox;
        var box1Poly = box1 === null || box1 === void 0 ? void 0 : box1.polygon;
        for (var j = i + 1; j < len; ++j) {
            label2 = labels[j];
            box2 = label2 && label2.absoluteBox;
            var toHide = false;
            if (box1 &&
                box2 &&
                label1 !== label2 && // #6465, polar chart with connectEnds
                label1.newOpacity !== 0 &&
                label2.newOpacity !== 0 &&
                // #15863 dataLabels are no longer hidden by translation
                label1.visibility !== 'hidden' &&
                label2.visibility !== 'hidden') {
                var box2Poly = box2.polygon;
                // If labels have polygons, only evaluate
                // based on polygons
                if (box1Poly &&
                    box2Poly &&
                    box1Poly !== box2Poly) {
                    if (isPolygonOverlap(box1Poly, box2Poly)) {
                        toHide = true;
                    }
                    // If there are no polygons, evaluate rectangles coliding
                }
                else if (isIntersectRect(box1, box2)) {
                    toHide = true;
                }
                if (toHide) {
                    var overlappingLabel = (label1.labelrank < label2.labelrank ?
                            label1 :
                            label2),
                        labelText = overlappingLabel.text;
                    overlappingLabel.newOpacity = 0;
                    if (labelText === null || labelText === void 0 ? void 0 : labelText.element.querySelector('textPath')) {
                        labelText.hide();
                    }
                }
            }
        }
    }
    // Hide or show
    for (var _i = 0, labels_1 = labels; _i < labels_1.length; _i++) {
        var label_1 = labels_1[_i];
        if (hideOrShow(label_1, chart)) {
            isLabelAffected = true;
        }
    }
    if (isLabelAffected) {
        fireEvent(chart, 'afterHideAllOverlappingLabels');
    }
}
/** @private */
function compose(ChartClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.hideOverlappingLabels) {
        chartProto.hideOverlappingLabels = chartHideOverlappingLabels;
        addEvent(ChartClass, 'render', onChartRender);
    }
}
/**
 * Hide or show labels based on opacity.
 *
 * @private
 * @function hideOrShow
 * @param {Highcharts.SVGElement} label
 * The label.
 * @param {Highcharts.Chart} chart
 * The chart that contains the label.
 * @return {boolean}
 * Whether label is affected
 */
function hideOrShow(label, chart) {
    var complete,
        newOpacity,
        isLabelAffected = false;
    if (label) {
        newOpacity = label.newOpacity;
        if (label.oldOpacity !== newOpacity) {
            // Toggle data labels
            if (label.hasClass('highcharts-data-label')) {
                // Make sure the label is completely hidden to avoid catching
                // clicks (#4362)
                label[newOpacity ? 'removeClass' : 'addClass']('highcharts-data-label-hidden');
                complete = function () {
                    if (!chart.styledMode) {
                        label.css({
                            pointerEvents: newOpacity ? 'auto' : 'none'
                        });
                    }
                };
                isLabelAffected = true;
                // Animate or set the opacity
                label[label.isOld ? 'animate' : 'attr']({ opacity: newOpacity }, void 0, complete);
                fireEvent(chart, 'afterHideOverlappingLabel');
                // Toggle other labels, tick labels
            }
            else {
                label.attr({
                    opacity: newOpacity
                });
            }
        }
        label.isOld = true;
    }
    return isLabelAffected;
}
/**
 * Collect potential overlapping data labels. Stack labels probably don't need
 * to be considered because they are usually accompanied by data labels that lie
 * inside the columns.
 * @private
 */
function onChartRender() {
    var _a;
    var chart = this;
    var labels = [];
    // Consider external label collectors
    for (var _i = 0, _b = (chart.labelCollectors || []); _i < _b.length; _i++) {
        var collector = _b[_i];
        labels = labels.concat(collector());
    }
    for (var _c = 0, _d = (chart.yAxis || []); _c < _d.length; _c++) {
        var yAxis = _d[_c];
        if (yAxis.stacking &&
            yAxis.options.stackLabels &&
            !yAxis.options.stackLabels.allowOverlap) {
            objectEach(yAxis.stacking.stacks, function (stack) {
                objectEach(stack, function (stackItem) {
                    if (stackItem.label) {
                        labels.push(stackItem.label);
                    }
                });
            });
        }
    }
    for (var _e = 0, _f = (chart.series || []); _e < _f.length; _e++) {
        var series = _f[_e];
        if (series.visible && ((_a = series.hasDataLabels) === null || _a === void 0 ? void 0 : _a.call(series))) { // #3866
            var push = function (points) {
                    var _loop_1 = function (point) {
                        if (point.visible) {
                            (point.dataLabels || []).forEach(function (label) {
                                var _a,
                _b;
                            var options = label.options || {};
                            label.labelrank = pick(options.labelrank, point.labelrank, (_a = point.shapeArgs) === null || _a === void 0 ? void 0 : _a.height); // #4118
                            // Allow overlap if the option is explicitly true
                            if (
                            // #13449
                            (_b = options.allowOverlap) !== null && _b !== void 0 ? _b : 
                            // Pie labels outside have a separate placement
                            // logic, skip the overlap logic
                            Number(options.distance) > 0) {
                                label.oldOpacity = label.opacity;
                                label.newOpacity = 1;
                                hideOrShow(label, chart);
                                // Do not allow overlap
                            }
                            else {
                                labels.push(label);
                            }
                        });
                    }
                };
                for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
                    var point = points_1[_i];
                    _loop_1(point);
                }
            };
            push(series.nodes || []);
            push(series.points);
        }
    }
    this.hideOverlappingLabels(labels);
}
/* *
 *
 *  Default Export
 *
 * */
var OverlappingDataLabels = {
    compose: compose
};
/* harmony default export */ var Extensions_OverlappingDataLabels = (OverlappingDataLabels);

;// ./code/es5/es-modules/masters/modules/overlapping-datalabels.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
G.OverlappingDataLabels = G.OverlappingDataLabels || Extensions_OverlappingDataLabels;
G.OverlappingDataLabels.compose(G.Chart);
/* harmony default export */ var overlapping_datalabels_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});