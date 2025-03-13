/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module modules/arc-diagram
 * @requires highcharts/modules/sankey
 *
 * Arc diagram module
 *
 * (c) 2021 Piotr Madej
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Series"], require("highcharts")["SVGRenderer"], require("highcharts")["SVGElement"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/arc-diagram", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","Series"], ["highcharts/highcharts","SVGRenderer"], ["highcharts/highcharts","SVGElement"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/arc-diagram"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["Series"], require("highcharts")["SVGRenderer"], require("highcharts")["SVGElement"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["Series"], root["Highcharts"]["SVGRenderer"], root["Highcharts"]["SVGElement"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__820__, __WEBPACK_EXTERNAL_MODULE__540__, __WEBPACK_EXTERNAL_MODULE__28__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 28:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__28__;

/***/ }),

/***/ 540:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__540__;

/***/ }),

/***/ 820:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__820__;

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
  "default": function() { return /* binding */ arc_diagram_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/NodesComposition.js
/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, seriesProto = _a.prototype, pointProto = _a.prototype.pointClass.prototype;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, find = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).find, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Composition
 *
 * */
var NodesComposition;
(function (NodesComposition) {
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
     * @private
     */
    function compose(PointClass, SeriesClass) {
        var pointProto = PointClass.prototype,
            seriesProto = SeriesClass.prototype;
        pointProto.setNodeState = setNodeState;
        pointProto.setState = setNodeState;
        pointProto.update = updateNode;
        seriesProto.destroy = destroy;
        seriesProto.setData = setData;
        return SeriesClass;
    }
    NodesComposition.compose = compose;
    /**
     * Create a single node that holds information on incoming and outgoing
     * links.
     * @private
     */
    function createNode(id) {
        var PointClass = this.pointClass,
            findById = function (nodes,
            id) { return find(nodes,
            function (node) { return node.id === id; }); };
        var node = findById(this.nodes,
            id),
            options;
        if (!node) {
            options = this.options.nodes && findById(this.options.nodes, id);
            var newNode_1 = new PointClass(this,
                extend({
                    className: 'highcharts-node',
                    isNode: true,
                    id: id,
                    y: 1 // Pass isNull test
                },
                options));
            newNode_1.linksTo = [];
            newNode_1.linksFrom = [];
            /**
             * Return the largest sum of either the incoming or outgoing links.
             * @private
             */
            newNode_1.getSum = function () {
                var sumTo = 0,
                    sumFrom = 0;
                newNode_1.linksTo.forEach(function (link) {
                    sumTo += link.weight || 0;
                });
                newNode_1.linksFrom.forEach(function (link) {
                    sumFrom += link.weight || 0;
                });
                return Math.max(sumTo, sumFrom);
            };
            /**
             * Get the offset in weight values of a point/link.
             * @private
             */
            newNode_1.offset = function (point, coll) {
                var offset = 0;
                for (var i = 0; i < newNode_1[coll].length; i++) {
                    if (newNode_1[coll][i] === point) {
                        return offset;
                    }
                    offset += newNode_1[coll][i].weight;
                }
            };
            // Return true if the node has a shape, otherwise all links are
            // outgoing.
            newNode_1.hasShape = function () {
                var outgoing = 0;
                newNode_1.linksTo.forEach(function (link) {
                    if (link.outgoing) {
                        outgoing++;
                    }
                });
                return (!newNode_1.linksTo.length ||
                    outgoing !== newNode_1.linksTo.length);
            };
            newNode_1.index = this.nodes.push(newNode_1) - 1;
            node = newNode_1;
        }
        node.formatPrefix = 'node';
        // For use in formats
        node.name = node.name || node.options.id || '';
        // Mass is used in networkgraph:
        node.mass = pick(
        // Node:
        node.options.mass, node.options.marker && node.options.marker.radius, 
        // Series:
        this.options.marker && this.options.marker.radius, 
        // Default:
        4);
        return node;
    }
    NodesComposition.createNode = createNode;
    /**
     * Destroy all nodes and links.
     * @private
     */
    function destroy() {
        // Nodes must also be destroyed (#8682, #9300)
        this.data = []
            .concat(this.points || [], this.nodes);
        return seriesProto.destroy.apply(this, arguments);
    }
    NodesComposition.destroy = destroy;
    /**
     * Extend generatePoints by adding the nodes, which are Point objects but
     * pushed to the this.nodes array.
     * @private
     */
    function generatePoints() {
        var _this = this;
        var chart = this.chart,
            nodeLookup = {};
        seriesProto.generatePoints.call(this);
        if (!this.nodes) {
            this.nodes = []; // List of Point-like node items
        }
        this.colorCounter = 0;
        // Reset links from previous run
        this.nodes.forEach(function (node) {
            node.linksFrom.length = 0;
            node.linksTo.length = 0;
            node.level = node.options.level;
        });
        // Create the node list and set up links
        this.points.forEach(function (point) {
            if (defined(point.from)) {
                if (!nodeLookup[point.from]) {
                    nodeLookup[point.from] = _this.createNode(point.from);
                }
                nodeLookup[point.from].linksFrom.push(point);
                point.fromNode = nodeLookup[point.from];
                // Point color defaults to the fromNode's color
                if (chart.styledMode) {
                    point.colorIndex = pick(point.options.colorIndex, nodeLookup[point.from].colorIndex);
                }
                else {
                    point.color =
                        point.options.color || nodeLookup[point.from].color;
                }
            }
            if (defined(point.to)) {
                if (!nodeLookup[point.to]) {
                    nodeLookup[point.to] = _this.createNode(point.to);
                }
                nodeLookup[point.to].linksTo.push(point);
                point.toNode = nodeLookup[point.to];
            }
            point.name = point.name || point.id; // For use in formats
        }, this);
        // Store lookup table for later use
        this.nodeLookup = nodeLookup;
    }
    NodesComposition.generatePoints = generatePoints;
    /**
     * Destroy all nodes on setting new data
     * @private
     */
    function setData() {
        if (this.nodes) {
            this.nodes.forEach(function (node) {
                node.destroy();
            });
            this.nodes.length = 0;
        }
        seriesProto.setData.apply(this, arguments);
    }
    /**
     * When hovering node, highlight all connected links. When hovering a link,
     * highlight all connected nodes.
     * @private
     */
    function setNodeState(state) {
        var args = arguments,
            others = this.isNode ? this.linksTo.concat(this.linksFrom) :
                [this.fromNode,
            this.toNode];
        if (state !== 'select') {
            others.forEach(function (linkOrNode) {
                if (linkOrNode && linkOrNode.series) {
                    pointProto.setState.apply(linkOrNode, args);
                    if (!linkOrNode.isNode) {
                        if (linkOrNode.fromNode.graphic) {
                            pointProto.setState.apply(linkOrNode.fromNode, args);
                        }
                        if (linkOrNode.toNode && linkOrNode.toNode.graphic) {
                            pointProto.setState.apply(linkOrNode.toNode, args);
                        }
                    }
                }
            });
        }
        pointProto.setState.apply(this, args);
    }
    NodesComposition.setNodeState = setNodeState;
    /**
     * When updating a node, don't update `series.options.data`, but
     * `series.options.nodes`
     * @private
     */
    function updateNode(options, redraw, animation, runEvent) {
        var _this = this;
        var nodes = this.series.options.nodes,
            data = this.series.options.data,
            dataLength = (data === null || data === void 0 ? void 0 : data.length) || 0,
            linkConfig = data === null || data === void 0 ? void 0 : data[this.index];
        pointProto.update.call(this, options, this.isNode ? false : redraw, // Hold the redraw for nodes
        animation, runEvent);
        if (this.isNode) {
            // `this.index` refers to `series.nodes`, not `options.nodes` array
            var nodeIndex = (nodes || [])
                    .reduce(// Array.findIndex needs a polyfill
                function (prevIndex,
                n,
                index) {
                    return (_this.id === n.id ? index : prevIndex);
            }, -1), 
            // Merge old config with new config. New config is stored in
            // options.data, because of default logic in point.update()
            nodeConfig = merge(nodes && nodes[nodeIndex] || {}, (data === null || data === void 0 ? void 0 : data[this.index]) || {});
            // Restore link config
            if (data) {
                if (linkConfig) {
                    data[this.index] = linkConfig;
                }
                else {
                    // Remove node from config if there's more nodes than links
                    data.length = dataLength;
                }
            }
            // Set node config
            if (nodes) {
                if (nodeIndex >= 0) {
                    nodes[nodeIndex] = nodeConfig;
                }
                else {
                    nodes.push(nodeConfig);
                }
            }
            else {
                this.series.options.nodes = [nodeConfig];
            }
            if (pick(redraw, true)) {
                this.series.chart.redraw(animation);
            }
        }
    }
    NodesComposition.updateNode = updateNode;
})(NodesComposition || (NodesComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Series_NodesComposition = (NodesComposition);

;// ./code/es5/es-modules/Series/ArcDiagram/ArcDiagramPoint.js
/* *
 *
 *  Arc diagram module
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

var ArcDiagramPoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/* *
 *
 *  Class
 *
 * */
var ArcDiagramPoint = /** @class */ (function (_super) {
    __extends(ArcDiagramPoint, _super);
    function ArcDiagramPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    ArcDiagramPoint.prototype.isValid = function () {
        // No null points here
        return true;
    };
    return ArcDiagramPoint;
}(SankeyPoint));
ArcDiagramPoint_extend(ArcDiagramPoint.prototype, {
    setState: Series_NodesComposition.setNodeState
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ArcDiagram_ArcDiagramPoint = (ArcDiagramPoint);

;// ./code/es5/es-modules/Series/ArcDiagram/ArcDiagramSeriesDefaults.js
/* *
 *
 *  Arc diagram module
 *
 *  (c) 2021 Piotr Madej, Grzegorz Blachliński
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
 *  Arc diagram series is a chart drawing style in which
 *  the vertices of the chart are positioned along a line
 *  on the Euclidean plane and the edges are drawn as a semicircle
 *  in one of the two half-planes delimited by the line,
 *  or as smooth curves formed by sequences of semicircles.
 *
 * @sample highcharts/demo/arc-diagram/
 *         Arc Diagram
 *
 * @extends      plotOptions.sankey
 * @since 10.0.0
 * @product      highcharts
 * @requires     modules/arc-diagram
 * @exclude      curveFactor, connectEnds, connectNulls, colorAxis, colorKey,
 *               dataSorting, dragDrop, getExtremesFromAll, legendSymbolColor,
 *               nodeAlignment, nodePadding, centerInCategory, pointInterval,
 *               pointIntervalUnit, pointPlacement, pointStart, relativeXValue,
 *               softThreshold, stack, stacking, step, xAxis, yAxis
 * @optionparent plotOptions.arcdiagram
 */
var ArcDiagramSeriesDefaults = {
    /**
     * The option to center links rather than position them one after
     * another
     *
     * @type    {boolean}
     * @since 10.0.0
     * @default false
     * @product highcharts
     */
    centeredLinks: false,
    /**
     * Whether nodes with different values should have the same size. If set
     * to true, all nodes are calculated based on the `nodePadding` and
     * current `plotArea`. It is possible to override it using the
     * `marker.radius` option.
     *
     * @type    {boolean}
     * @since 10.0.0
     * @default false
     * @product highcharts
     */
    equalNodes: false,
    /**
     * Options for the data labels appearing on top of the nodes and links.
     * For arc diagram charts, data labels are visible for the nodes by
     * default, but hidden for links. This is controlled by modifying the
     * `nodeFormat`, and the `format` that applies to links and is an empty
     * string by default.
     *
     * @declare Highcharts.SeriesArcDiagramDataLabelsOptionsObject
     *
     * @private
     */
    dataLabels: {
        /**
         * Options for a _link_ label text which should follow link
         * connection. Border and background are disabled for a label that
         * follows a path.
         *
         * **Note:** Only SVG-based renderer supports this option. Setting
         * `useHTML` to true will disable this option.
         *
         * @extends plotOptions.networkgraph.dataLabels.linkTextPath
         * @since 10.0.0
         */
        linkTextPath: {
            /**
             * @type    {Highcharts.SVGAttributes}
             * @default {"startOffset":"25%"}
             */
            attributes: {
                /**
                 * @ignore-option
                 */
                startOffset: '25%'
            }
        }
    },
    /**
     * The radius of the link arc. If not set, series renders a semi-circle
     * between the nodes, except when overflowing the edge of the plot area,
     * in which case an arc touching the edge is rendered. If `linkRadius`
     * is set, an arc extending to the given value is rendered.
     *
     * @type    {number}
     * @since 10.0.0
     * @default undefined
     * @product highcharts
     * @apioption series.arcdiagram.linkRadius
     */
    /**
     * The global link weight, in pixels. If not set, width is calculated
     * per link, depending on the weight value.
     *
     * @sample highcharts/series-arcdiagram/link-weight
     *         Link weight
     *
     * @type    {number}
     * @since 10.0.0
     * @default undefined
     * @product highcharts
     * @apioption series.arcdiagram.linkWeight
     */
    /**
     * @extends   plotOptions.series.marker
     * @excluding enabled, enabledThreshold, height, width
     */
    marker: {
        fillOpacity: 1,
        lineWidth: 0,
        states: {},
        symbol: 'circle'
    },
    /**
     * The offset of an arc diagram nodes column in relation to the
     * `plotArea`. The offset equal to 50% places nodes in the center of a
     * chart. By default the series is placed so that the biggest node is
     * touching the bottom border of the `plotArea`.
     *
     * @type    {string}
     * @since 10.0.0
     * @default '100%'
     * @product highcharts
     * @apioption series.arcdiagram.offset
     */
    offset: '100%',
    /**
     * Whether the series should be placed on the other side of the
     * `plotArea`.
     *
     * @type    {boolean}
     * @since 10.0.0
     * @default false
     * @product highcharts
     */
    reversed: false
};
/**
 * An `arcdiagram` series. If the [type](#series.arcdiagram.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.arcdiagram
 * @exclude   dataSorting, boostThreshold, boostBlending, curveFactor,
 *            connectEnds, connectNulls, colorAxis, colorKey, dataSorting,
 *            dragDrop, getExtremesFromAll, nodePadding, centerInCategory,
 *            pointInterval, pointIntervalUnit, pointPlacement,
 *            pointStart, relativeXValue, softThreshold, stack,
 *            stacking, step, xAxis, yAxis
 * @product   highcharts
 * @requires  modules/sankey
 * @requires  modules/arc-diagram
 * @apioption series.arcdiagram
 */
/**
 * @extends   plotOptions.series.marker
 * @excluding enabled, enabledThreshold, height, radius, width
 * @apioption series.arcdiagram.marker
 */
/**
 * @type      {Highcharts.SeriesArcDiagramDataLabelsOptionsObject|Array<Highcharts.SeriesArcDiagramDataLabelsOptionsObject>}
 * @product   highcharts
 * @apioption series.arcdiagram.data.dataLabels
 */
/**
 * A collection of options for the individual nodes. The nodes in an arc diagram
 * are auto-generated instances of `Highcharts.Point`, but options can be
 * applied here and linked by the `id`.
 *
 * @extends   series.sankey.nodes
 * @type      {Array<*>}
 * @product   highcharts
 * @excluding column, level
 * @apioption series.arcdiagram.nodes
 */
/**
 * Individual data label for each node. The options are the same as the ones for
 * [series.arcdiagram.dataLabels](#series.arcdiagram.dataLabels).
 *
 * @type
 * {Highcharts.SeriesArcDiagramDataLabelsOptionsObject|Array<Highcharts.SeriesArcDiagramDataLabelsOptionsObject>}
 *
 * @apioption series.arcdiagram.nodes.dataLabels
 */
/**
 * Individual data label for each node. The options are the same as the ones for
 * [series.arcdiagram.dataLabels](#series.arcdiagram.dataLabels).
 *
 * @type
 * {Highcharts.SeriesArcDiagramDataLabelsOptionsObject|Array<Highcharts.SeriesArcDiagramDataLabelsOptionsObject>}
 *
 */
/**
 * An array of data points for the series. For the `arcdiagram` series type,
 * points can be given in the following way:
 *
 * An array of objects with named values. The following snippet shows only a few
 * settings, see the complete options set below. If the total number of data
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
 * @type      {Array<*>}
 * @extends   series.sankey.data
 * @product   highcharts
 * @excluding outgoing, dataLabels
 * @apioption series.arcdiagram.data
 */
''; // Adds doclets above to the transpiled file
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ArcDiagram_ArcDiagramSeriesDefaults = (ArcDiagramSeriesDefaults);

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


var SankeyColumnComposition_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, getAlignFactor = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).getAlignFactor, relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
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
                        relativeTop: offset + (SankeyColumnComposition_defined(directionOffset) ?
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

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series"],"commonjs":["highcharts","Series"],"commonjs2":["highcharts","Series"],"root":["Highcharts","Series"]}
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_ = __webpack_require__(820);
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGRenderer"],"commonjs":["highcharts","SVGRenderer"],"commonjs2":["highcharts","SVGRenderer"],"root":["Highcharts","SVGRenderer"]}
var highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_ = __webpack_require__(540);
var highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_);
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
var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, TextPath_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, uniqueKey = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).uniqueKey, TextPath_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, TextPath_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
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
    textPathOptions = TextPath_merge(true, {
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
                    attributes: TextPath_extend(attributes, {
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

;// ./code/es5/es-modules/Series/ArcDiagram/ArcDiagramSeries.js
/* *
 *
 *  Arc diagram module
 *
 *  (c) 2021 Piotr Madej, Grzegorz Blachliński
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var ArcDiagramSeries_extends = (undefined && undefined.__extends) || (function () {
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
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};









Extensions_TextPath.compose((highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default()));
var symbols = (highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default()).prototype.symbols;
var ArcDiagramSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, ColumnSeries = ArcDiagramSeries_a.column, SankeySeries = ArcDiagramSeries_a.sankey;
var crisp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).crisp, ArcDiagramSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, ArcDiagramSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, ArcDiagramSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, ArcDiagramSeries_relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.arcdiagram
 *
 * @augments Highcharts.seriesTypes.sankey
 */
var ArcDiagramSeries = /** @class */ (function (_super) {
    ArcDiagramSeries_extends(ArcDiagramSeries, _super);
    function ArcDiagramSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Create node columns by analyzing the nodes and the relations between
     * incoming and outgoing links.
     * @private
     */
    ArcDiagramSeries.prototype.createNodeColumns = function () {
        var _this = this;
        var series = this,
            chart = series.chart, 
            // Column needs casting, to much methods required at the same time
            column = Sankey_SankeyColumnComposition.compose([],
            series);
        column.sankeyColumn.maxLength = chart.inverted ?
            chart.plotHeight : chart.plotWidth;
        // Get the translation factor needed for each column to fill up the plot
        // height
        column.sankeyColumn.getTranslationFactor = function (series) {
            var nodes = column.slice(),
                minLinkWidth = _this.options.minLinkWidth || 0;
            var skipPoint,
                factor = 0,
                i,
                radius,
                maxRadius = 0,
                scale = 1,
                additionalSpace = 0,
                remainingWidth = (chart.plotSizeX || 0) -
                    (series.options.marker &&
                        series.options.marker.lineWidth || 0) -
                    (column.length - 1) *
                        series.nodePadding;
            // Because the minLinkWidth option doesn't obey the direct
            // translation, we need to run translation iteratively, check node
            // heights, remove those nodes affected by minLinkWidth, check
            // again, etc.
            while (column.length) {
                factor = remainingWidth / column.sankeyColumn.sum();
                skipPoint = false;
                i = column.length;
                while (i--) {
                    radius = (column[i].getSum()) * factor * scale;
                    var plotArea = Math.min(chart.plotHeight,
                        chart.plotWidth);
                    if (radius > plotArea) {
                        scale = Math.min(plotArea / radius, scale);
                    }
                    else if (radius < minLinkWidth) {
                        column.splice(i, 1);
                        remainingWidth -= minLinkWidth;
                        radius = minLinkWidth;
                        skipPoint = true;
                    }
                    additionalSpace += radius * (1 - scale) / 2;
                    maxRadius = Math.max(maxRadius, radius);
                }
                if (!skipPoint) {
                    break;
                }
            }
            // Re-insert original nodes
            column.length = 0;
            nodes.forEach(function (node) {
                node.scale = scale;
                column.push(node);
            });
            column.sankeyColumn.maxRadius = maxRadius;
            column.sankeyColumn.scale = scale;
            column.sankeyColumn.additionalSpace = additionalSpace;
            return factor;
        };
        column.sankeyColumn.offset = function (node, factor) {
            var equalNodes = node.series.options.equalNodes,
                nodePadding = series.nodePadding,
                maxRadius = Math.min(chart.plotWidth,
                chart.plotHeight, (column.sankeyColumn.maxLength || 0) /
                    series.nodes.length - nodePadding);
            var offset = column.sankeyColumn.additionalSpace || 0,
                totalNodeOffset;
            for (var i = 0; i < column.length; i++) {
                var sum = column[i].getSum() *
                        (column.sankeyColumn.scale || 0);
                var width = equalNodes ?
                        maxRadius :
                        Math.max(sum * factor,
                    series.options.minLinkWidth || 0);
                if (sum) {
                    totalNodeOffset = width + nodePadding;
                }
                else {
                    // If node sum equals 0 nodePadding is missed #12453
                    totalNodeOffset = 0;
                }
                if (column[i] === node) {
                    return {
                        relativeLeft: offset + ArcDiagramSeries_relativeLength(node.options.offset || 0, totalNodeOffset)
                    };
                }
                offset += totalNodeOffset;
            }
        };
        // Add nodes directly to the column right after it's creation
        series.nodes.forEach(function (node) {
            node.column = 0;
            column.push(node);
        });
        return [column];
    };
    /**
     * Run translation operations for one link.
     * @private
     */
    ArcDiagramSeries.prototype.translateLink = function (point) {
        var _a,
            _b;
        var series = this,
            fromNode = point.fromNode,
            toNode = point.toNode,
            chart = this.chart,
            translationFactor = series.translationFactor,
            pointOptions = point.options,
            seriesOptions = series.options,
            linkWeight = ArcDiagramSeries_pick(pointOptions.linkWeight,
            seriesOptions.linkWeight,
            Math.max((point.weight || 0) *
                translationFactor *
                fromNode.scale, (series.options.minLinkWidth || 0))),
            centeredLinks = point.series.options.centeredLinks,
            nodeTop = fromNode.nodeY;
        var getX = function (node,
            fromOrTo) {
                var linkLeft = ((node.offset(point,
            fromOrTo) || 0) *
                    translationFactor);
            var x = Math.min(node.nodeX + linkLeft, 
                // Prevent links from spilling below the node (#12014)
                node.nodeX + (node.shapeArgs && node.shapeArgs.height || 0) - linkWeight);
            return x;
        };
        var fromX = centeredLinks ?
                fromNode.nodeX +
                    ((fromNode.shapeArgs.height || 0) - linkWeight) / 2 :
                getX(fromNode, 'linksFrom'),
            toX = centeredLinks ? toNode.nodeX +
                ((toNode.shapeArgs.height || 0) - linkWeight) / 2 :
                getX(toNode, 'linksTo'),
            bottom = nodeTop;
        if (fromX > toX) {
            _a = [toX, fromX], fromX = _a[0], toX = _a[1];
        }
        if (seriesOptions.reversed) {
            _b = [toX, fromX], fromX = _b[0], toX = _b[1];
            bottom = (chart.plotSizeY || 0) - bottom;
        }
        point.shapeType = 'path';
        point.linkBase = [
            fromX,
            fromX + linkWeight,
            toX,
            toX + linkWeight
        ];
        var linkRadius = ((toX + linkWeight - fromX) / Math.abs(toX + linkWeight - fromX)) * ArcDiagramSeries_pick(seriesOptions.linkRadius, Math.min(Math.abs(toX + linkWeight - fromX) / 2, fromNode.nodeY - Math.abs(linkWeight)));
        point.shapeArgs = {
            d: [
                ['M', fromX, bottom],
                [
                    'A',
                    (toX + linkWeight - fromX) / 2,
                    linkRadius,
                    0,
                    0,
                    1,
                    toX + linkWeight,
                    bottom
                ],
                ['L', toX, bottom],
                [
                    'A',
                    (toX - fromX - linkWeight) / 2,
                    linkRadius - linkWeight,
                    0,
                    0,
                    0,
                    fromX + linkWeight,
                    bottom
                ],
                ['Z']
            ]
        };
        point.dlBox = {
            x: fromX + (toX - fromX) / 2,
            y: bottom - linkRadius,
            height: linkWeight,
            width: 0
        };
        // And set the tooltip anchor in the middle
        point.tooltipPos = chart.inverted ? [
            (chart.plotSizeY || 0) - point.dlBox.y - linkWeight / 2,
            (chart.plotSizeX || 0) - point.dlBox.x
        ] : [
            point.dlBox.x,
            point.dlBox.y + linkWeight / 2
        ];
        // Pass test in drawPoints
        point.y = point.plotY = 1;
        point.x = point.plotX = 1;
        if (!point.color) {
            point.color = fromNode.color;
        }
    };
    /**
     * Run translation operations for one node.
     * @private
     */
    ArcDiagramSeries.prototype.translateNode = function (node, column) {
        var _a;
        var series = this, translationFactor = series.translationFactor, chart = series.chart, maxNodesLength = chart.inverted ?
                chart.plotWidth : chart.plotHeight, options = series.options, maxRadius = Math.min(chart.plotWidth, chart.plotHeight, maxNodesLength / node.series.nodes.length - this.nodePadding), sum = node.getSum() * (column.sankeyColumn.scale || 0), equalNodes = options.equalNodes, nodeHeight = equalNodes ?
                maxRadius :
                Math.max(sum * translationFactor, this.options.minLinkWidth || 0), lineWidth = ((_a = options.marker) === null || _a === void 0 ? void 0 : _a.lineWidth) || 0, nodeOffset = column.sankeyColumn.offset(node, translationFactor), fromNodeLeft = crisp(ArcDiagramSeries_pick(nodeOffset && nodeOffset.absoluteLeft, ((column.sankeyColumn.left(translationFactor) || 0) +
                (nodeOffset && nodeOffset.relativeLeft || 0))), lineWidth), markerOptions = ArcDiagramSeries_merge(options.marker, node.options.marker), symbol = markerOptions.symbol, markerRadius = markerOptions.radius, top = parseInt(options.offset, 10) *
                ((chart.inverted ?
                    chart.plotWidth : chart.plotHeight) - (crisp(this.colDistance * (node.column || 0) +
                    (markerOptions.lineWidth || 0) / 2, lineWidth) +
                    (column.sankeyColumn.scale || 0) *
                        (column.sankeyColumn.maxRadius || 0) / 2)) / 100;
        node.sum = sum;
        // If node sum is 0, don’t render the rect #12453
        if (sum) {
            // Draw the node
            node.nodeX = fromNodeLeft;
            node.nodeY = top;
            var x = fromNodeLeft,
                width = node.options.width || options.width || nodeHeight,
                height = node.options.height || options.height || nodeHeight;
            var y = top;
            if (options.reversed) {
                y = (chart.plotSizeY || 0) - top;
                if (chart.inverted) {
                    y = (chart.plotSizeY || 0) - top;
                }
            }
            if (this.mapOptionsToLevel) {
                // Calculate data label options for the point
                node.dlOptions = SankeySeries.getDLOptions({
                    level: this.mapOptionsToLevel[node.level],
                    optionsPoint: node.options
                });
            }
            // Pass test in drawPoints
            node.plotX = 1;
            node.plotY = 1;
            // Set the anchor position for tooltips
            node.tooltipPos = chart.inverted ? [
                (chart.plotSizeY || 0) - y - height / 2,
                (chart.plotSizeX || 0) - x - width / 2
            ] : [
                x + width / 2,
                y + height / 2
            ];
            node.shapeType = 'path';
            node.shapeArgs = {
                d: symbols[symbol || 'circle'](x, y - (markerRadius || height) / 2, markerRadius || width, markerRadius || height),
                width: markerRadius || width,
                height: markerRadius || height
            };
            node.dlBox = {
                x: x + width / 2,
                y: y,
                height: 0,
                width: 0
            };
        }
        else {
            node.dlOptions = {
                enabled: false
            };
        }
    };
    // Networkgraph has two separate collecions of nodes and lines, render
    // dataLabels for both sets:
    ArcDiagramSeries.prototype.drawDataLabels = function () {
        if (this.options.dataLabels) {
            var textPath = this.options.dataLabels.textPath;
            // Render node labels:
            ColumnSeries.prototype.drawDataLabels.call(this, this.nodes);
            // Render link labels:
            this.options.dataLabels.textPath =
                this.options.dataLabels.linkTextPath;
            ColumnSeries.prototype.drawDataLabels.call(this, this.data);
            // Restore nodes
            this.options.dataLabels.textPath = textPath;
        }
    };
    ArcDiagramSeries.prototype.pointAttribs = function (point, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    state) {
        if (point && point.isNode) {
            var attrs = __rest(highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default().prototype.pointAttribs
                    .apply(this,
                arguments),
                []);
            return attrs;
        }
        return _super.prototype.pointAttribs.apply(this, arguments);
    };
    ArcDiagramSeries.prototype.markerAttribs = function (point) {
        if (point.isNode) {
            return _super.prototype.markerAttribs.apply(this, arguments);
        }
        return {};
    };
    /* *
     *
     *  Static Properties
     *
     * */
    ArcDiagramSeries.defaultOptions = ArcDiagramSeries_merge(SankeySeries.defaultOptions, ArcDiagram_ArcDiagramSeriesDefaults);
    return ArcDiagramSeries;
}(SankeySeries));
ArcDiagramSeries_extend(ArcDiagramSeries.prototype, {
    orderNodes: false
});
ArcDiagramSeries.prototype.pointClass = ArcDiagram_ArcDiagramPoint;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('arcdiagram', ArcDiagramSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ArcDiagram_ArcDiagramSeries = ((/* unused pure expression or super */ null && (ArcDiagramSeries)));

;// ./code/es5/es-modules/masters/modules/arc-diagram.src.js




/* harmony default export */ var arc_diagram_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});