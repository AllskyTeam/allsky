/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/dependency-wheel
 * @requires highcharts
 * @requires highcharts/modules/sankey
 *
 * Dependency wheel module
 *
 * (c) 2010-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/dependency-wheel", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","SVGElement"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/dependency-wheel"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["SVGElement"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__28__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 28:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__28__;

/***/ }),

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

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
  "default": function() { return /* binding */ dependency_wheel_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/DependencyWheel/DependencyWheelPoint.js
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

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var SankeyPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sankey.prototype.pointClass;

var pInt = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pInt, wrap = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).wrap;
/* *
 *
 *  Class
 *
 * */
var DependencyWheelPoint = /** @class */ (function (_super) {
    __extends(DependencyWheelPoint, _super);
    function DependencyWheelPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Return a text path that the data label uses.
     * @private
     */
    DependencyWheelPoint.prototype.getDataLabelPath = function (label) {
        var _a;
        var point = this,
            renderer = point.series.chart.renderer,
            shapeArgs = point.shapeArgs,
            upperHalf = point.angle < 0 || point.angle > Math.PI,
            start = shapeArgs.start || 0,
            end = shapeArgs.end || 0;
        // First time
        if (!point.dataLabelPath) {
            // Destroy the path with the label
            wrap(label, 'destroy', function (proceed) {
                if (point.dataLabelPath) {
                    point.dataLabelPath = point.dataLabelPath.destroy();
                }
                return proceed.call(this);
            });
            // Subsequent times
        }
        else {
            point.dataLabelPath = point.dataLabelPath.destroy();
            delete point.dataLabelPath;
        }
        // All times
        point.dataLabelPath = renderer
            .arc({
            open: true,
            longArc: Math.abs(Math.abs(start) - Math.abs(end)) < Math.PI ? 0 : 1
        })
            .attr({
            x: shapeArgs.x,
            y: shapeArgs.y,
            r: ((shapeArgs.r || 0) + pInt(((_a = label.options) === null || _a === void 0 ? void 0 : _a.distance) || 0)),
            start: (upperHalf ? start : end),
            end: (upperHalf ? end : start),
            clockwise: +upperHalf
        })
            .add(renderer.defs);
        return point.dataLabelPath;
    };
    DependencyWheelPoint.prototype.isValid = function () {
        // No null points here
        return true;
    };
    return DependencyWheelPoint;
}(SankeyPoint));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DependencyWheel_DependencyWheelPoint = (DependencyWheelPoint);

;// ./code/es5/es-modules/Series/DependencyWheel/DependencyWheelSeriesDefaults.js
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

/* *
 *
 *  API Options
 *
 * */
/**
 * A dependency wheel chart is a type of flow diagram, where all nodes are laid
 * out in a circle, and the flow between the are drawn as link bands.
 *
 * @sample highcharts/demo/dependency-wheel/
 *         Dependency wheel
 *
 * @extends      plotOptions.sankey
 * @exclude      dataSorting, nodeAlignment, nodeDistance
 * @since        7.1.0
 * @product      highcharts
 * @requires     modules/dependency-wheel
 * @optionparent plotOptions.dependencywheel
 */
var DependencyWheelSeriesDefaults = {
    /**
     * The corner radius of the border surrounding each node. A number
     * signifies pixels. A percentage string, like for example `50%`, signifies
     * a relative size. For nodes this is relative to the node width.
     *
     * @type    {number|string|Highcharts.BorderRadiusOptionsObject}
     * @default 3
     * @product highcharts
     * @since   11.0.0
     * @apioption plotOptions.dependencywheel.borderRadius
    */
    /**
     * Distance between the data label and the center of the node.
     *
     * @type      {number}
     * @default   0
     * @apioption plotOptions.dependencywheel.dataLabels.distance
     */
    /**
     * A format string for data labels of the links between nodes. Available
     * variables are the same as for `formatter`.
     *
     * @see [nodeFormat](#nodeFormat) for formatting node labels
     *
     * @apioption plotOptions.dependencywheel.dataLabels.format
     */
    /**
     * Callback to format data labels of the links between nodes. The `format`
     * option takes precedence over the `formatter` option.
     *
     * @see [nodeFormatter](#nodeFormatter) for formatting node labels
     *
     * @apioption plotOptions.dependencywheel.dataLabels.formatter
     */
    /**
     * The format string specifying what to show for nodes in the sankey
     * diagram. By default the nodeFormatter returns `{point.name}`. Available
     * variables are the same as for `nodeFormatter`.
     *
     * @apioption plotOptions.dependencywheel.dataLabels.nodeFormat
     */
    /**
     * Callback to format data labels of nodes in the dependency wheel. The
     * `nodeFormat` option takes precedence over the `nodeFormatter` option.
     *
     * @apioption plotOptions.dependencywheel.dataLabels.nodeFormatter
     */
    /**
     * Size of the wheel in pixel or percent relative to the canvas space.
     *
     * @type      {number|string}
     * @default   100%
     * @apioption plotOptions.dependencywheel.size
     */
    /**
     * The center of the wheel relative to the plot area. Can be
     * percentages or pixel values. The default behaviour is to
     * center the wheel inside the plot area.
     *
     * @type    {Array<number|string|null>}
     * @default [null, null]
     * @product highcharts
     */
    center: [null, null],
    curveFactor: 0.6,
    /**
     * The start angle of the dependency wheel, in degrees where 0 is up.
     */
    startAngle: 0,
    dataLabels: {
        textPath: {
            /**
             * Enable or disable `textPath` option for link's or marker's data
             * labels.
             *
             * @type      {boolean}
             * @default   false
             * @since     7.1.0
             * @apioption plotOptions.series.dataLabels.textPath.enabled
             */
            enabled: false,
            attributes: {
                /**
                * Text path shift along its y-axis.
                *
                * @type      {Highcharts.SVGAttributes}
                * @default   5
                * @since     7.1.0
                * @apioption plotOptions.dependencywheel.dataLabels.textPath.attributes.dy
                */
                dy: 5
            }
        }
    }
};
/**
 * A `dependencywheel` series. If the [type](#series.dependencywheel.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.dependencywheel
 * @exclude   dataSorting
 * @product   highcharts
 * @requires  modules/sankey
 * @requires  modules/dependency-wheel
 * @apioption series.dependencywheel
 */
/**
 * A collection of options for the individual nodes. The nodes in a dependency
 * diagram are auto-generated instances of `Highcharts.Point`, but options can
 * be applied here and linked by the `id`.
 *
 * @extends   series.sankey.nodes
 * @type      {Array<*>}
 * @product   highcharts
 * @excluding offset
 * @apioption series.dependencywheel.nodes
 */
/**
 * An array of data points for the series. For the `dependencywheel` series
 * type, points can be given in the following way:
 *
 * An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of data
 * points exceeds the series' [turboThreshold](#series.area.turboThreshold),
 * this option is not available.
 *
 *  ```js
 *     data: [{
 *         from: 'Category1',
 *         to: 'Category2',
 *         weight: 2
 *     }, {
 *         from: 'Category1',
 *         to: 'Category3',
 *         weight: 5
 *     }]
 *  ```
 *
 * @type      {Array<Array<string,string,number>|*>}
 * @extends   series.sankey.data
 * @product   highcharts
 * @excluding outgoing, dataLabels
 * @apioption series.dependencywheel.data
 */
/**
 * Individual data label for each node. The options are the same as
 * the ones for [series.dependencywheel.dataLabels](#series.dependencywheel.dataLabels).
 *
 * @apioption series.dependencywheel.nodes.dataLabels
 */
''; // Keeps doclets above separate
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DependencyWheel_DependencyWheelSeriesDefaults = (DependencyWheelSeriesDefaults);

;// ./code/es5/es-modules/Series/Sankey/SankeyColumnComposition.js
/* *
 *
 *  Sankey diagram module
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, getAlignFactor = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).getAlignFactor, relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
/* *
 *
 *  Composition
 *
 * */
var SankeyColumnComposition;
(function (SankeyColumnComposition) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * SankeyColumn Composition
     * @private
     * @function Highcharts.SankeyColumn#compose
     *
     * @param {Array<SankeyPoint>} points
     * The array of nodes
     * @param {SankeySeries} series
     * Series connected to column
     * @return {ArrayComposition} SankeyColumnArray
     */
    function compose(points, series) {
        var sankeyColumnArray = points;
        sankeyColumnArray.sankeyColumn =
            new SankeyColumnAdditions(sankeyColumnArray, series);
        return sankeyColumnArray;
    }
    SankeyColumnComposition.compose = compose;
    /* *
     *
     *  Classes
     *
     * */
    var SankeyColumnAdditions = /** @class */ (function () {
            /* *
             *
             *  Constructor
             *
             * */
            function SankeyColumnAdditions(points, series) {
                this.points = points;
            this.series = series;
        }
        /* *
         *
         *  Functions
         *
         * */
        /**
         * Calculate translation factor used in column and nodes distribution
         * @private
         * @function Highcharts.SankeyColumn#getTranslationFactor
         *
         * @param {SankeySeries} series
         * The Series
         * @return {number} TranslationFactor
         * Translation Factor
         */
        SankeyColumnAdditions.prototype.getTranslationFactor = function (series) {
            var column = this.points,
                nodes = column.slice(),
                chart = series.chart,
                minLinkWidth = series.options.minLinkWidth || 0;
            var skipPoint,
                factor = 0,
                i,
                remainingHeight = ((chart.plotSizeY || 0) -
                    (series.options.borderWidth || 0) -
                    (column.length - 1) * series.nodePadding);
            // Because the minLinkWidth option doesn't obey the direct
            // translation, we need to run translation iteratively, check
            // node heights, remove those nodes affected by minLinkWidth,
            // check again, etc.
            while (column.length) {
                factor = remainingHeight / column.sankeyColumn.sum();
                skipPoint = false;
                i = column.length;
                while (i--) {
                    if (column[i].getSum() * factor < minLinkWidth) {
                        column.splice(i, 1);
                        remainingHeight =
                            Math.max(0, remainingHeight - minLinkWidth);
                        skipPoint = true;
                    }
                }
                if (!skipPoint) {
                    break;
                }
            }
            // Re-insert original nodes
            column.length = 0;
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                column.push(node);
            }
            return factor;
        };
        /**
         * Get the top position of the column in pixels
         * @private
         * @function Highcharts.SankeyColumn#top
         *
         * @param {number} factor
         * The Translation Factor
         * @return {number} top
         * The top position of the column
         */
        SankeyColumnAdditions.prototype.top = function (factor) {
            var series = this.series,
                nodePadding = series.nodePadding,
                height = this.points.reduce(function (height,
                node) {
                    if (height > 0) {
                        height += nodePadding;
                }
                var nodeHeight = Math.max(node.getSum() * factor,
                    series.options.minLinkWidth || 0);
                height += nodeHeight;
                return height;
            }, 0);
            // Node alignment option handling #19096
            return getAlignFactor(series.options.nodeAlignment || 'center') * ((series.chart.plotSizeY || 0) - height);
        };
        /**
         * Get the left position of the column in pixels
         * @private
         * @function Highcharts.SankeyColumn#top
         *
         * @param {number} factor
         * The Translation Factor
         * @return {number} left
         * The left position of the column
         */
        SankeyColumnAdditions.prototype.left = function (factor) {
            var series = this.series,
                chart = series.chart,
                equalNodes = series.options.equalNodes,
                maxNodesLength = (chart.inverted ? chart.plotHeight : chart.plotWidth),
                nodePadding = series.nodePadding,
                width = this.points.reduce(function (width,
                node) {
                    if (width > 0) {
                        width += nodePadding;
                }
                var nodeWidth = equalNodes ?
                        maxNodesLength / node.series.nodes.length -
                            nodePadding :
                        Math.max(node.getSum() * factor,
                    series.options.minLinkWidth || 0);
                width += nodeWidth;
                return width;
            }, 0);
            return ((chart.plotSizeX || 0) - Math.round(width)) / 2;
        };
        /**
         * Calculate sum of all nodes inside specific column
         * @private
         * @function Highcharts.SankeyColumn#sum
         *
         * @param {ArrayComposition} this
         * Sankey Column Array
         *
         * @return {number} sum
         * Sum of all nodes inside column
         */
        SankeyColumnAdditions.prototype.sum = function () {
            return this.points.reduce(function (sum, node) { return (sum + node.getSum()); }, 0);
        };
        /**
         * Get the offset in pixels of a node inside the column
         * @private
         * @function Highcharts.SankeyColumn#offset
         *
         * @param {SankeyPoint} node
         * Sankey node
         * @param {number} factor
         * Translation Factor
         * @return {number} offset
         * Offset of a node inside column
         */
        SankeyColumnAdditions.prototype.offset = function (node, factor) {
            var column = this.points,
                series = this.series,
                nodePadding = series.nodePadding;
            var offset = 0,
                totalNodeOffset;
            if (series.is('organization') && node.hangsFrom) {
                return {
                    absoluteTop: node.hangsFrom.nodeY
                };
            }
            for (var i = 0; i < column.length; i++) {
                var sum = column[i].getSum();
                var height = Math.max(sum * factor,
                    series.options.minLinkWidth || 0);
                var directionOffset = node.options[series.chart.inverted ?
                        'offsetHorizontal' :
                        'offsetVertical'],
                    optionOffset = node.options.offset || 0;
                if (sum) {
                    totalNodeOffset = height + nodePadding;
                }
                else {
                    // If node sum equals 0 nodePadding is missed #12453
                    totalNodeOffset = 0;
                }
                if (column[i] === node) {
                    return {
                        relativeTop: offset + (defined(directionOffset) ?
                            // `directionOffset` is a percent of the node
                            // height
                            relativeLength(directionOffset, height) :
                            relativeLength(optionOffset, totalNodeOffset))
                    };
                }
                offset += totalNodeOffset;
            }
        };
        return SankeyColumnAdditions;
    }());
    SankeyColumnComposition.SankeyColumnAdditions = SankeyColumnAdditions;
})(SankeyColumnComposition || (SankeyColumnComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Sankey_SankeyColumnComposition = (SankeyColumnComposition);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGElement"],"commonjs":["highcharts","SVGElement"],"commonjs2":["highcharts","SVGElement"],"root":["Highcharts","SVGElement"]}
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_ = __webpack_require__(28);
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_);
;// ./code/es5/es-modules/Extensions/TextPath.js
/* *
 *
 *  Highcharts module with textPath functionality.
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */



var deg2rad = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad;
var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, uniqueKey = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).uniqueKey, TextPath_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/**
 * Set a text path for a `text` or `label` element, allowing the text to
 * flow along a path.
 *
 * In order to unset the path for an existing element, call `setTextPath`
 * with `{ enabled: false }` as the second argument.
 *
 * Text path support is not bundled into `highcharts.js`, and requires the
 * `modules/textpath.js` file. However, it is included in the script files of
 * those series types that use it by default
 *
 * @sample highcharts/members/renderer-textpath/ Text path demonstrated
 *
 * @function Highcharts.SVGElement#setTextPath
 *
 * @param {Highcharts.SVGElement|undefined} path
 *        Path to follow. If undefined, it allows changing options for the
 *        existing path.
 *
 * @param {Highcharts.DataLabelsTextPathOptionsObject} textPathOptions
 *        Options.
 *
 * @return {Highcharts.SVGElement} Returns the SVGElement for chaining.
 */
function setTextPath(path, textPathOptions) {
    var _this = this;
    // Defaults
    textPathOptions = merge(true, {
        enabled: true,
        attributes: {
            dy: -5,
            startOffset: '50%',
            textAnchor: 'middle'
        }
    }, textPathOptions);
    var url = this.renderer.url,
        textWrapper = this.text || this,
        textPath = textWrapper.textPath,
        attributes = textPathOptions.attributes,
        enabled = textPathOptions.enabled;
    path = path || (textPath && textPath.path);
    // Remove previously added event
    if (textPath) {
        textPath.undo();
    }
    if (path && enabled) {
        var undo = addEvent(textWrapper, 'afterModifyTree',
            function (e) {
                if (path && enabled) {
                    // Set ID for the path
                    var textPathId = path.attr('id');
                if (!textPathId) {
                    path.attr('id', textPathId = uniqueKey());
                }
                // Set attributes for the <text>
                var textAttribs = {
                        // `dx`/`dy` options must by set on <text> (parent), the
                        // rest should be set on <textPath>
                        x: 0,
                        y: 0
                    };
                if (TextPath_defined(attributes.dx)) {
                    textAttribs.dx = attributes.dx;
                    delete attributes.dx;
                }
                if (TextPath_defined(attributes.dy)) {
                    textAttribs.dy = attributes.dy;
                    delete attributes.dy;
                }
                textWrapper.attr(textAttribs);
                // Handle label properties
                _this.attr({ transform: '' });
                if (_this.box) {
                    _this.box = _this.box.destroy();
                }
                // Wrap the nodes in a textPath
                var children = e.nodes.slice(0);
                e.nodes.length = 0;
                e.nodes[0] = {
                    tagName: 'textPath',
                    attributes: extend(attributes, {
                        'text-anchor': attributes.textAnchor,
                        href: "" + url + "#".concat(textPathId)
                    }),
                    children: children
                };
            }
        });
        // Set the reference
        textWrapper.textPath = { path: path, undo: undo };
    }
    else {
        textWrapper.attr({ dx: 0, dy: 0 });
        delete textWrapper.textPath;
    }
    if (this.added) {
        // Rebuild text after added
        textWrapper.textCache = '';
        this.renderer.buildText(textWrapper);
    }
    return this;
}
/**
 * Attach a polygon to a bounding box if the element contains a textPath.
 *
 * @function Highcharts.SVGElement#setPolygon
 *
 * @param {any} event
 *        An event containing a bounding box object
 *
 * @return {Highcharts.BBoxObject} Returns the bounding box object.
 */
function setPolygon(event) {
    var _a;
    var bBox = event.bBox,
        tp = (_a = this.element) === null || _a === void 0 ? void 0 : _a.querySelector('textPath');
    if (tp) {
        var polygon = [], _b = this.renderer.fontMetrics(this.element), b_1 = _b.b, h = _b.h, descender_1 = h - b_1, lineCleanerRegex = new RegExp('(<tspan>|' +
                '<tspan(?!\\sclass="highcharts-br")[^>]*>|' +
                '<\\/tspan>)', 'g'), lines = tp
                .innerHTML
                .replace(lineCleanerRegex, '')
                .split(/<tspan class="highcharts-br"[^>]*>/), numOfLines = lines.length;
        // Calculate top and bottom coordinates for
        // either the start or the end of a single
        // character, and append it to the polygon.
        var appendTopAndBottom = function (charIndex,
            positionOfChar) {
                var x = positionOfChar.x,
            y = positionOfChar.y,
            rotation = (tp.getRotationOfChar(charIndex) - 90) * deg2rad,
            cosRot = Math.cos(rotation),
            sinRot = Math.sin(rotation);
            return [
                [
                    x - descender_1 * cosRot,
                    y - descender_1 * sinRot
                ],
                [
                    x + b_1 * cosRot,
                    y + b_1 * sinRot
                ]
            ];
        };
        for (var i = 0, lineIndex = 0; lineIndex < numOfLines; lineIndex++) {
            var line = lines[lineIndex],
                lineLen = line.length;
            for (var lineCharIndex = 0; lineCharIndex < lineLen; lineCharIndex += 5) {
                try {
                    var srcCharIndex = (i +
                            lineCharIndex +
                            lineIndex),
                        _c = appendTopAndBottom(srcCharIndex,
                        tp.getStartPositionOfChar(srcCharIndex)),
                        lower = _c[0],
                        upper = _c[1];
                    if (lineCharIndex === 0) {
                        polygon.push(upper);
                        polygon.push(lower);
                    }
                    else {
                        if (lineIndex === 0) {
                            polygon.unshift(upper);
                        }
                        if (lineIndex === numOfLines - 1) {
                            polygon.push(lower);
                        }
                    }
                }
                catch (e) {
                    // Safari fails on getStartPositionOfChar even if the
                    // character is within the `textContent.length`
                    break;
                }
            }
            i += lineLen - 1;
            try {
                var srcCharIndex = i + lineIndex,
                    charPos = tp.getEndPositionOfChar(srcCharIndex),
                    _d = appendTopAndBottom(srcCharIndex,
                    charPos),
                    lower = _d[0],
                    upper = _d[1];
                polygon.unshift(upper);
                polygon.unshift(lower);
            }
            catch (e) {
                // Safari fails on getStartPositionOfChar even if the character
                // is within the `textContent.length`
                break;
            }
        }
        // Close it
        if (polygon.length) {
            polygon.push(polygon[0].slice());
        }
        bBox.polygon = polygon;
    }
    return bBox;
}
/**
 * Draw text along a textPath for a dataLabel.
 *
 * @function Highcharts.SVGElement#setTextPath
 *
 * @param {any} event
 *        An event containing label options
 *
 * @return {void}
 */
function drawTextPath(event) {
    var _a;
    var labelOptions = event.labelOptions,
        point = event.point,
        textPathOptions = (labelOptions[point.formatPrefix + 'TextPath'] ||
            labelOptions.textPath);
    if (textPathOptions && !labelOptions.useHTML) {
        this.setTextPath(((_a = point.getDataLabelPath) === null || _a === void 0 ? void 0 : _a.call(point, this)) || point.graphic, textPathOptions);
        if (point.dataLabelPath &&
            !textPathOptions.enabled) {
            // Clean the DOM
            point.dataLabelPath = (point.dataLabelPath.destroy());
        }
    }
}
function compose(SVGElementClass) {
    addEvent(SVGElementClass, 'afterGetBBox', setPolygon);
    addEvent(SVGElementClass, 'beforeAddingDataLabel', drawTextPath);
    var svgElementProto = SVGElementClass.prototype;
    if (!svgElementProto.setTextPath) {
        svgElementProto.setTextPath = setTextPath;
    }
}
var TextPath = {
    compose: compose
};
/* harmony default export */ var Extensions_TextPath = (TextPath);

;// ./code/es5/es-modules/Series/DependencyWheel/DependencyWheelSeries.js
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

var DependencyWheelSeries_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b,
        p)) d[p] = b[p]; };
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

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject;



var DependencyWheelSeries_deg2rad = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad;


var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, PieSeries = _a.pie, SankeySeries = _a.sankey;

var DependencyWheelSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, DependencyWheelSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, DependencyWheelSeries_relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;


Extensions_TextPath.compose((highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default()));
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
    DependencyWheelSeries_extends(DependencyWheelSeries, _super);
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
        var node = _super.prototype.createNode.call(this,
            id);
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
            var offset = 0,
                links = node.linksFrom.concat(node.linksTo),
                sliced;
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
        var series = this,
            columns = [Sankey_SankeyColumnComposition.compose([],
            series)];
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
        var series = this,
            options = series.options,
            factor = 2 * Math.PI /
                (series.chart.plotHeight + series.getNodePadding()),
            center = series.getCenter(),
            startAngle = (options.startAngle - 90) * DependencyWheelSeries_deg2rad,
            brOption = options.borderRadius,
            borderRadius = typeof brOption === 'object' ?
                brOption.radius : brOption;
        _super.prototype.translate.call(this);
        var _loop_2 = function (node) {
                // Don't render the nodes if sum is 0 #12453
                if (node.sum) {
                    var shapeArgs = node.shapeArgs,
            centerX_1 = center[0],
            centerY_1 = center[1],
            r = center[2] / 2,
            nodeWidth = options.nodeWidth === 'auto' ?
                        20 : options.nodeWidth,
            innerR_1 = r - DependencyWheelSeries_relativeLength(nodeWidth || 0,
            r),
            start = startAngle + factor * (shapeArgs.y || 0),
            end = startAngle +
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
                            var curveFactor_1,
                    distance_1;
                        var corners = point.linkBase.map(function (top,
                            i) {
                                var angle = factor * top,
                            x = Math.cos(startAngle + angle) * (innerR_1 + 1),
                            y = Math.sin(startAngle + angle) * (innerR_1 + 1);
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
    DependencyWheelSeries.defaultOptions = DependencyWheelSeries_merge(SankeySeries.defaultOptions, DependencyWheel_DependencyWheelSeriesDefaults);
    return DependencyWheelSeries;
}(SankeySeries));
DependencyWheelSeries_extend(DependencyWheelSeries.prototype, {
    orderNodes: false,
    getCenter: PieSeries.prototype.getCenter
});
DependencyWheelSeries.prototype.pointClass = DependencyWheel_DependencyWheelPoint;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('dependencywheel', DependencyWheelSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DependencyWheel_DependencyWheelSeries = ((/* unused pure expression or super */ null && (DependencyWheelSeries)));

;// ./code/es5/es-modules/masters/modules/dependency-wheel.src.js




/* harmony default export */ var dependency_wheel_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});