/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/networkgraph
 * @requires highcharts
 *
 * Force directed graph module
 *
 * (c) 2010-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SVGElement"], require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/networkgraph", [["highcharts/highcharts"], ["highcharts/highcharts","SVGElement"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/networkgraph"] = factory(require("highcharts"), require("highcharts")["SVGElement"], require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SVGElement"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__28__, __WEBPACK_EXTERNAL_MODULE__512__) {
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
  "default": function() { return /* binding */ networkgraph_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGElement"],"commonjs":["highcharts","SVGElement"],"commonjs2":["highcharts","SVGElement"],"root":["Highcharts","SVGElement"]}
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_ = __webpack_require__(28);
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_);
;// ./code/es5/es-modules/Series/DragNodesComposition.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function compose(ChartClass) {
    if (pushUnique(composed, 'DragNodes')) {
        addEvent(ChartClass, 'load', onChartLoad);
    }
}
/**
 * Draggable mode:
 * @private
 */
function onChartLoad() {
    var chart = this;
    var mousedownUnbinder,
        mousemoveUnbinder,
        mouseupUnbinder;
    if (chart.container) {
        mousedownUnbinder = addEvent(chart.container, 'mousedown', function (event) {
            var point = chart.hoverPoint;
            if (point &&
                point.series &&
                point.series.hasDraggableNodes &&
                point.series.options.draggable) {
                point.series.onMouseDown(point, event);
                mousemoveUnbinder = addEvent(chart.container, 'mousemove', function (e) { return (point &&
                    point.series &&
                    point.series.onMouseMove(point, e)); });
                mouseupUnbinder = addEvent(chart.container.ownerDocument, 'mouseup', function (e) {
                    mousemoveUnbinder();
                    mouseupUnbinder();
                    return point &&
                        point.series &&
                        point.series.onMouseUp(point, e);
                });
            }
        });
    }
    addEvent(chart, 'destroy', function () {
        mousedownUnbinder();
    });
}
/**
 * Mouse down action, initializing drag&drop mode.
 *
 * @private
 * @param {Highcharts.Point} point
 *        The point that event occurred.
 * @param {Highcharts.PointerEventObject} event
 *        Browser event, before normalization.
 */
function onMouseDown(point, event) {
    var _a;
    var normalizedEvent = ((_a = this.chart.pointer) === null || _a === void 0 ? void 0 : _a.normalize(event)) || event;
    point.fixedPosition = {
        chartX: normalizedEvent.chartX,
        chartY: normalizedEvent.chartY,
        plotX: point.plotX,
        plotY: point.plotY
    };
    point.inDragMode = true;
}
/**
 * Mouse move action during drag&drop.
 *
 * @private
 *
 * @param {Highcharts.Point} point
 *        The point that event occurred.
 * @param {global.Event} event
 *        Browser event, before normalization.
 */
function onMouseMove(point, event) {
    var _a;
    if (point.fixedPosition && point.inDragMode) {
        var series = this,
            chart = series.chart,
            normalizedEvent = ((_a = chart.pointer) === null || _a === void 0 ? void 0 : _a.normalize(event)) || event,
            diffX = point.fixedPosition.chartX - normalizedEvent.chartX,
            diffY = point.fixedPosition.chartY - normalizedEvent.chartY,
            graphLayoutsLookup = chart.graphLayoutsLookup;
        var newPlotX = void 0,
            newPlotY = void 0;
        // At least 5px to apply change (avoids simple click):
        if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
            newPlotX = point.fixedPosition.plotX - diffX;
            newPlotY = point.fixedPosition.plotY - diffY;
            if (chart.isInsidePlot(newPlotX, newPlotY)) {
                point.plotX = newPlotX;
                point.plotY = newPlotY;
                point.hasDragged = true;
                this.redrawHalo(point);
                graphLayoutsLookup.forEach(function (layout) {
                    layout.restartSimulation();
                });
            }
        }
    }
}
/**
 * Mouse up action, finalizing drag&drop.
 *
 * @private
 * @param {Highcharts.Point} point
 *        The point that event occurred.
 */
function onMouseUp(point) {
    if (point.fixedPosition) {
        if (point.hasDragged) {
            if (this.layout.enableSimulation) {
                this.layout.start();
            }
            else {
                this.chart.redraw();
            }
        }
        point.inDragMode = point.hasDragged = false;
        if (!this.options.fixedDraggable) {
            delete point.fixedPosition;
        }
    }
}
/**
 * Redraw halo on mousemove during the drag&drop action.
 *
 * @private
 * @param {Highcharts.Point} point
 *        The point that should show halo.
 */
function redrawHalo(point) {
    if (point && this.halo) {
        this.halo.attr({
            d: point.haloPath(this.options.states.hover.halo.size)
        });
    }
}
/* *
 *
 *  Default Export
 *
 * */
var DragNodesComposition = {
    compose: compose,
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp: onMouseUp,
    redrawHalo: redrawHalo
};
/* harmony default export */ var Series_DragNodesComposition = (DragNodesComposition);

;// ./code/es5/es-modules/Series/GraphLayoutComposition.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var setAnimation = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).setAnimation;

var GraphLayoutComposition_composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;

var GraphLayoutComposition_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, GraphLayoutComposition_pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Constants
 *
 * */
var integrations = {};
var layouts = {};
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function GraphLayoutComposition_compose(ChartClass) {
    if (GraphLayoutComposition_pushUnique(GraphLayoutComposition_composed, 'GraphLayout')) {
        GraphLayoutComposition_addEvent(ChartClass, 'afterPrint', onChartAfterPrint);
        GraphLayoutComposition_addEvent(ChartClass, 'beforePrint', onChartBeforePrint);
        GraphLayoutComposition_addEvent(ChartClass, 'predraw', onChartPredraw);
        GraphLayoutComposition_addEvent(ChartClass, 'render', onChartRender);
    }
}
/**
 * Re-enable simulation after print.
 * @private
 */
function onChartAfterPrint() {
    if (this.graphLayoutsLookup) {
        this.graphLayoutsLookup.forEach(function (layout) {
            // Return to default simulation
            layout.updateSimulation();
        });
        this.redraw();
    }
}
/**
 * Disable simulation before print if enabled.
 * @private
 */
function onChartBeforePrint() {
    if (this.graphLayoutsLookup) {
        this.graphLayoutsLookup.forEach(function (layout) {
            layout.updateSimulation(false);
        });
        this.redraw();
    }
}
/**
 * Clear previous layouts.
 * @private
 */
function onChartPredraw() {
    if (this.graphLayoutsLookup) {
        this.graphLayoutsLookup.forEach(function (layout) {
            layout.stop();
        });
    }
}
/**
 * @private
 */
function onChartRender() {
    var systemsStable,
        afterRender = false;
    var layoutStep = function (layout) {
            if (layout.maxIterations-- &&
                isFinite(layout.temperature) &&
                !layout.isStable() &&
                !layout.enableSimulation) {
                // Hook similar to build-in addEvent, but instead of
                // creating whole events logic, use just a function.
                // It's faster which is important for rAF code.
                // Used e.g. in packed-bubble series for bubble radius
                // calculations
                if (layout.beforeStep) {
                    layout.beforeStep();
            }
            layout.step();
            systemsStable = false;
            afterRender = true;
        }
    };
    if (this.graphLayoutsLookup) {
        setAnimation(false, this);
        // Start simulation
        this.graphLayoutsLookup.forEach(function (layout) { return layout.start(); });
        // Just one sync step, to run different layouts similar to
        // async mode.
        while (!systemsStable) {
            systemsStable = true;
            this.graphLayoutsLookup.forEach(layoutStep);
        }
        if (afterRender) {
            this.series.forEach(function (series) {
                if (series && series.layout) {
                    series.render();
                }
            });
        }
    }
}
/* *
 *
 *  Default Export
 *
 * */
var GraphLayoutComposition = {
    compose: GraphLayoutComposition_compose,
    integrations: integrations,
    layouts: layouts
};
/* harmony default export */ var Series_GraphLayoutComposition = (GraphLayoutComposition);

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

;// ./code/es5/es-modules/Series/Networkgraph/NetworkgraphPoint.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
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


var NetworkgraphPoint_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, NetworkgraphPoint_seriesProto = NetworkgraphPoint_a.prototype, Point = NetworkgraphPoint_a.prototype.pointClass;

var NetworkgraphPoint_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, css = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).css, NetworkgraphPoint_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, NetworkgraphPoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, NetworkgraphPoint_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Class
 *
 * */
var NetworkgraphPoint = /** @class */ (function (_super) {
    __extends(NetworkgraphPoint, _super);
    /**
     * Basic `point.init()` and additional styles applied when
     * `series.draggable` is enabled.
     * @private
     */
    function NetworkgraphPoint(series, options, x) {
        var _this = _super.call(this,
            series,
            options,
            x) || this;
        if (_this.series.options.draggable &&
            !_this.series.chart.styledMode) {
            NetworkgraphPoint_addEvent(_this, 'mouseOver', function () {
                css(this.series.chart.container, { cursor: 'move' });
            });
            NetworkgraphPoint_addEvent(_this, 'mouseOut', function () {
                css(this.series.chart.container, { cursor: 'default' });
            });
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Destroy point. If it's a node, remove all links coming out of this
     * node. Then remove point from the layout.
     * @private
     */
    NetworkgraphPoint.prototype.destroy = function () {
        if (this.isNode) {
            this.linksFrom.concat(this.linksTo).forEach(function (link) {
                // Removing multiple nodes at the same time
                // will try to remove link between nodes twice
                if (link.destroyElements) {
                    link.destroyElements();
                }
            });
        }
        this.series.layout.removeElementFromCollection(this, this.series.layout[this.isNode ? 'nodes' : 'links']);
        return Point.prototype.destroy.apply(this, arguments);
    };
    /**
     * Return degree of a node. If node has no connections, it still has
     * deg=1.
     * @private
     */
    NetworkgraphPoint.prototype.getDegree = function () {
        var deg = this.isNode ?
                this.linksFrom.length + this.linksTo.length :
                0;
        return deg === 0 ? 1 : deg;
    };
    /**
     * Get presentational attributes of link connecting two nodes.
     * @private
     */
    NetworkgraphPoint.prototype.getLinkAttributes = function () {
        var linkOptions = this.series.options.link,
            pointOptions = this.options;
        return {
            'stroke-width': NetworkgraphPoint_pick(pointOptions.width, linkOptions.width),
            stroke: (pointOptions.color || linkOptions.color),
            dashstyle: (pointOptions.dashStyle || linkOptions.dashStyle),
            opacity: NetworkgraphPoint_pick(pointOptions.opacity, linkOptions.opacity, 1)
        };
    };
    /**
     * Get link path connecting two nodes.
     * @private
     * @return {Array<Highcharts.SVGPathArray>}
     *         Path: `['M', x, y, 'L', x, y]`
     */
    NetworkgraphPoint.prototype.getLinkPath = function () {
        var left = this.fromNode,
            right = this.toNode;
        // Start always from left to the right node, to prevent rendering
        // labels upside down
        if (left.plotX > right.plotX) {
            left = this.toNode;
            right = this.fromNode;
        }
        return [
            ['M', left.plotX || 0, left.plotY || 0],
            ['L', right.plotX || 0, right.plotY || 0]
        ];
        /*
        IDEA: different link shapes?
        return [
            'M',
            from.plotX,
            from.plotY,
            'Q',
            (to.plotX + from.plotX) / 2,
            (to.plotY + from.plotY) / 2 + 15,
            to.plotX,
            to.plotY
        ];*/
    };
    /**
     * Get mass fraction applied on two nodes connected to each other. By
     * default, when mass is equal to `1`, mass fraction for both nodes
     * equal to 0.5.
     * @private
     * @return {Highcharts.Dictionary<number>}
     *         For example `{ fromNode: 0.5, toNode: 0.5 }`
     */
    NetworkgraphPoint.prototype.getMass = function () {
        var m1 = this.fromNode.mass,
            m2 = this.toNode.mass,
            sum = m1 + m2;
        return {
            fromNode: 1 - m1 / sum,
            toNode: 1 - m2 / sum
        };
    };
    /**
     * @private
     */
    NetworkgraphPoint.prototype.isValid = function () {
        return !this.isNode || NetworkgraphPoint_defined(this.id);
    };
    /**
     * Redraw link's path.
     * @private
     */
    NetworkgraphPoint.prototype.redrawLink = function () {
        var path = this.getLinkPath();
        var attribs;
        if (this.graphic) {
            this.shapeArgs = {
                d: path
            };
            if (!this.series.chart.styledMode) {
                attribs = this.series.pointAttribs(this);
                this.graphic.attr(attribs);
                (this.dataLabels || []).forEach(function (label) {
                    if (label) {
                        label.attr({
                            opacity: attribs.opacity
                        });
                    }
                });
            }
            this.graphic.animate(this.shapeArgs);
            // Required for dataLabels
            var start = path[0];
            var end = path[1];
            if (start[0] === 'M' && end[0] === 'L') {
                this.plotX = (start[1] + end[1]) / 2;
                this.plotY = (start[2] + end[2]) / 2;
            }
        }
    };
    /**
     * Common method for removing points and nodes in networkgraph. To
     * remove `link`, use `series.data[index].remove()`. To remove `node`
     * with all connections, use `series.nodes[index].remove()`.
     * @private
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart or wait for an explicit call. When
     *        doing more operations on the chart, for example running
     *        `point.remove()` in a loop, it is best practice to set
     *        `redraw` to false and call `chart.redraw()` after.
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation=false]
     *        Whether to apply animation, and optionally animation
     *        configuration.
     */
    NetworkgraphPoint.prototype.remove = function (redraw, animation) {
        var point = this,
            series = point.series,
            nodesOptions = series.options.nodes || [];
        var index,
            i = nodesOptions.length;
        // For nodes, remove all connected links:
        if (point.isNode) {
            // Temporary disable series.points array, because
            // Series.removePoint() modifies it
            series.points = [];
            // Remove link from all nodes collections:
            []
                .concat(point.linksFrom)
                .concat(point.linksTo)
                .forEach(function (linkFromTo) {
                // Incoming links
                index = linkFromTo.fromNode.linksFrom.indexOf(linkFromTo);
                if (index > -1) {
                    linkFromTo.fromNode.linksFrom.splice(index, 1);
                }
                // Outcoming links
                index = linkFromTo.toNode.linksTo.indexOf(linkFromTo);
                if (index > -1) {
                    linkFromTo.toNode.linksTo.splice(index, 1);
                }
                // Remove link from data/points collections
                NetworkgraphPoint_seriesProto.removePoint.call(series, series.data.indexOf(linkFromTo), false, false);
            });
            // Restore points array, after links are removed
            series.points = series.data.slice();
            // Proceed with removing node. It's similar to
            // Series.removePoint() method, but doesn't modify other arrays
            series.nodes.splice(series.nodes.indexOf(point), 1);
            // Remove node options from config
            while (i--) {
                if (nodesOptions[i].id === point.options.id) {
                    series.options.nodes.splice(i, 1);
                    break;
                }
            }
            if (point) {
                point.destroy();
            }
            // Run redraw if requested
            series.isDirty = true;
            series.isDirtyData = true;
            if (redraw) {
                series.chart.redraw(redraw);
            }
        }
        else {
            series.removePoint(series.data.indexOf(point), redraw, animation);
        }
    };
    /**
     * Render link and add it to the DOM.
     * @private
     */
    NetworkgraphPoint.prototype.renderLink = function () {
        var attribs;
        if (!this.graphic) {
            this.graphic = this.series.chart.renderer
                .path(this.getLinkPath())
                .addClass(this.getClassName(), true)
                .add(this.series.group);
            if (!this.series.chart.styledMode) {
                attribs = this.series.pointAttribs(this);
                this.graphic.attr(attribs);
                (this.dataLabels || []).forEach(function (label) {
                    if (label) {
                        label.attr({
                            opacity: attribs.opacity
                        });
                    }
                });
            }
        }
    };
    return NetworkgraphPoint;
}(Point));
NetworkgraphPoint_extend(NetworkgraphPoint.prototype, {
    setState: Series_NodesComposition.setNodeState
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_NetworkgraphPoint = (NetworkgraphPoint);

;// ./code/es5/es-modules/Series/Networkgraph/NetworkgraphSeriesDefaults.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Constants
 *
 * */
/**
 * A networkgraph is a type of relationship chart, where connnections
 * (links) attracts nodes (points) and other nodes repulse each other.
 *
 * @extends      plotOptions.line
 * @product      highcharts
 * @sample       highcharts/demo/network-graph/
 *               Networkgraph
 * @since        7.0.0
 * @excluding    boostThreshold, animation, animationLimit, connectEnds,
 *               colorAxis, colorKey, connectNulls, cropThreshold, dragDrop,
 *               getExtremesFromAll, label, linecap, negativeColor,
 *               pointInterval, pointIntervalUnit, pointPlacement,
 *               pointStart, softThreshold, stack, stacking, step,
 *               threshold, xAxis, yAxis, zoneAxis, dataSorting,
 *               boostBlending
 * @requires     modules/networkgraph
 * @optionparent plotOptions.networkgraph
 *
 * @private
 */
var NetworkgraphSeriesDefaults = {
    stickyTracking: false,
    /**
     * @default   true
     * @extends   plotOptions.series.inactiveOtherPoints
     * @private
     */
    inactiveOtherPoints: true,
    marker: {
        enabled: true,
        states: {
            /**
             * The opposite state of a hover for a single point node.
             * Applied to all not connected nodes to the hovered one.
             *
             * @declare Highcharts.PointStatesInactiveOptionsObject
             */
            inactive: {
                /**
                 * Opacity of inactive markers.
                 */
                opacity: 0.3,
                /**
                 * Animation when not hovering over the node.
                 *
                 * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
                 */
                animation: {
                    /** @internal */
                    duration: 50
                }
            }
        }
    },
    states: {
        /**
         * The opposite state of a hover for a single point link. Applied
         * to all links that are not coming from the hovered node.
         *
         * @declare Highcharts.SeriesStatesInactiveOptionsObject
         */
        inactive: {
            /**
             * Opacity of inactive links.
             */
            linkOpacity: 0.3,
            /**
             * Animation when not hovering over the node.
             *
             * @type {boolean|Partial<Highcharts.AnimationOptionsObject>}
             */
            animation: {
                /** @internal */
                duration: 50
            }
        }
    },
    /**
     * @sample highcharts/series-networkgraph/link-datalabels
     *         Networkgraph with labels on links
     * @sample highcharts/series-networkgraph/textpath-datalabels
     *         Networkgraph with labels around nodes
     * @sample highcharts/series-networkgraph/link-datalabels
     *         Data labels moved into the nodes
     * @sample highcharts/series-networkgraph/link-datalabels
     *         Data labels moved under the links
     *
     * @declare Highcharts.SeriesNetworkgraphDataLabelsOptionsObject
     *
     * @private
     */
    dataLabels: {
        /**
         * The
         * [format string](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting)
         * specifying what to show for _node_ in the networkgraph. In v7.0
         * defaults to `{key}`, since v7.1 defaults to `undefined` and
         * `formatter` is used instead.
         *
         * @type      {string}
         * @since     7.0.0
         * @apioption plotOptions.networkgraph.dataLabels.format
         */
        // eslint-disable-next-line valid-jsdoc
        /**
         * Callback JavaScript function to format the data label for a node.
         * Note that if a `format` is defined, the format takes precedence
         * and the formatter is ignored.
         *
         * @since 7.0.0
         */
        formatter: function () {
            var _a;
            return String((_a = this.key) !== null && _a !== void 0 ? _a : '');
        },
        /**
         * The
         * [format string](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting)
         * specifying what to show for _links_ in the networkgraph.
         * (Default: `undefined`)
         *
         * @type      {string}
         * @since     7.1.0
         * @apioption plotOptions.networkgraph.dataLabels.linkFormat
         */
        // eslint-disable-next-line valid-jsdoc
        /**
         * Callback to format data labels for _links_ in the sankey diagram.
         * The `linkFormat` option takes precedence over the
         * `linkFormatter`.
         *
         * @since 7.1.0
         */
        linkFormatter: function () {
            return (this.fromNode.name +
                '<br>' +
                this.toNode.name);
        },
        /**
         * Options for a _link_ label text which should follow link
         * connection. Border and background are disabled for a label that
         * follows a path.
         *
         * **Note:** Only SVG-based renderer supports this option. Setting
         * `useHTML` to true will disable this option.
         *
         * @extends plotOptions.networkgraph.dataLabels.textPath
         * @since   7.1.0
         */
        linkTextPath: {
            enabled: true
        },
        textPath: {
            enabled: false
        },
        style: {
            transition: 'opacity 2000ms'
        },
        defer: true,
        animation: {
            defer: 1000
        }
    },
    /**
     * Link style options
     * @private
     */
    link: {
        /**
         * A name for the dash style to use for links.
         *
         * @type      {string}
         * @apioption plotOptions.networkgraph.link.dashStyle
         */
        /**
         * Opacity of the link between two nodes.
         *
         * @type      {number}
         * @default   1
         * @apioption plotOptions.networkgraph.link.opacity
         */
        /**
         * Color of the link between two nodes.
         */
        color: 'rgba(100, 100, 100, 0.5)',
        /**
         * Width (px) of the link between two nodes.
         */
        width: 1
    },
    /**
     * Flag to determine if nodes are draggable or not.
     * @private
     */
    draggable: true,
    layoutAlgorithm: {
        /**
         * Repulsive force applied on a node. Passed are two arguments:
         * - `d` - which is current distance between two nodes
         * - `k` - which is desired distance between two nodes
         *
         * In `verlet` integration, defaults to:
         * `function (d, k) { return (k - d) / d * (k > d ? 1 : 0) }`
         *
         * @see [layoutAlgorithm.integration](#series.networkgraph.layoutAlgorithm.integration)
         *
         * @sample highcharts/series-networkgraph/forces/
         *         Custom forces with Euler integration
         * @sample highcharts/series-networkgraph/cuboids/
         *         Custom forces with Verlet integration
         *
         * @type      {Function}
         * @default   function (d, k) { return k * k / d; }
         * @apioption plotOptions.networkgraph.layoutAlgorithm.repulsiveForce
         */
        /**
         * Attraction force applied on a node which is conected to another
         * node by a link. Passed are two arguments:
         * - `d` - which is current distance between two nodes
         * - `k` - which is desired distance between two nodes
         *
         * In `verlet` integration, defaults to:
         * `function (d, k) { return (k - d) / d; }`
         *
         * @see [layoutAlgorithm.integration](#series.networkgraph.layoutAlgorithm.integration)
         *
         * @sample highcharts/series-networkgraph/forces/
         *         Custom forces with Euler integration
         * @sample highcharts/series-networkgraph/cuboids/
         *         Custom forces with Verlet integration
         *
         * @type      {Function}
         * @default   function (d, k) { return k * k / d; }
         * @apioption plotOptions.networkgraph.layoutAlgorithm.attractiveForce
         */
        /**
         * Ideal length (px) of the link between two nodes. When not
         * defined, length is calculated as:
         * `Math.pow(availableWidth * availableHeight / nodesLength, 0.4);`
         *
         * Note: Because of the algorithm specification, length of each link
         * might be not exactly as specified.
         *
         * @sample highcharts/series-networkgraph/styled-links/
         *         Numerical values
         *
         * @type      {number}
         * @apioption plotOptions.networkgraph.layoutAlgorithm.linkLength
         */
        /**
         * Initial layout algorithm for positioning nodes. Can be one of
         * built-in options ("circle", "random") or a function where
         * positions should be set on each node (`this.nodes`) as
         * `node.plotX` and `node.plotY`
         *
         * @sample highcharts/series-networkgraph/initial-positions/
         *         Initial positions with callback
         *
         * @type {"circle"|"random"|Function}
         */
        initialPositions: 'circle',
        /**
         * When `initialPositions` are set to 'circle',
         * `initialPositionRadius` is a distance from the center of circle,
         * in which nodes are created.
         *
         * @type    {number}
         * @default 1
         * @since   7.1.0
         */
        initialPositionRadius: 1,
        /**
         * Experimental. Enables live simulation of the algorithm
         * implementation. All nodes are animated as the forces applies on
         * them.
         *
         * @sample highcharts/demo/network-graph/
         *         Live simulation enabled
         */
        enableSimulation: false,
        /**
         * Barnes-Hut approximation only.
         * Deteremines when distance between cell and node is small enough
         * to calculate forces. Value of `theta` is compared directly with
         * quotient `s / d`, where `s` is the size of the cell, and `d` is
         * distance between center of cell's mass and currently compared
         * node.
         *
         * @see [layoutAlgorithm.approximation](#series.networkgraph.layoutAlgorithm.approximation)
         *
         * @since 7.1.0
         */
        theta: 0.5,
        /**
         * Verlet integration only.
         * Max speed that node can get in one iteration. In terms of
         * simulation, it's a maximum translation (in pixels) that node can
         * move (in both, x and y, dimensions). While `friction` is applied
         * on all nodes, max speed is applied only for nodes that move very
         * fast, for example small or disconnected ones.
         *
         * @see [layoutAlgorithm.integration](#series.networkgraph.layoutAlgorithm.integration)
         * @see [layoutAlgorithm.friction](#series.networkgraph.layoutAlgorithm.friction)
         *
         * @since 7.1.0
         */
        maxSpeed: 10,
        /**
         * Approximation used to calculate repulsive forces affecting nodes.
         * By default, when calculating net force, nodes are compared
         * against each other, which gives O(N^2) complexity. Using
         * Barnes-Hut approximation, we decrease this to O(N log N), but the
         * resulting graph will have different layout. Barnes-Hut
         * approximation divides space into rectangles via quad tree, where
         * forces exerted on nodes are calculated directly for nearby cells,
         * and for all others, cells are treated as a separate node with
         * center of mass.
         *
         * @see [layoutAlgorithm.theta](#series.networkgraph.layoutAlgorithm.theta)
         *
         * @sample highcharts/series-networkgraph/barnes-hut-approximation/
         *         A graph with Barnes-Hut approximation
         *
         * @type       {string}
         * @validvalue ["barnes-hut", "none"]
         * @since      7.1.0
         */
        approximation: 'none',
        /**
         * Type of the algorithm used when positioning nodes.
         *
         * @type       {string}
         * @validvalue ["reingold-fruchterman"]
         */
        type: 'reingold-fruchterman',
        /**
         * Integration type. Available options are `'euler'` and `'verlet'`.
         * Integration determines how forces are applied on particles. In
         * Euler integration, force is applied direct as
         * `newPosition += velocity;`.
         * In Verlet integration, new position is based on a previous
         * position without velocity:
         * `newPosition += previousPosition - newPosition`.
         *
         * Note that different integrations give different results as forces
         * are different.
         *
         * In Highcharts v7.0.x only `'euler'` integration was supported.
         *
         * @sample highcharts/series-networkgraph/integration-comparison/
         *         Comparison of Verlet and Euler integrations
         *
         * @type       {string}
         * @validvalue ["euler", "verlet"]
         * @since      7.1.0
         */
        integration: 'euler',
        /**
         * Max number of iterations before algorithm will stop. In general,
         * algorithm should find positions sooner, but when rendering huge
         * number of nodes, it is recommended to increase this value as
         * finding perfect graph positions can require more time.
         */
        maxIterations: 1000,
        /**
         * Gravitational const used in the barycenter force of the
         * algorithm.
         *
         * @sample highcharts/series-networkgraph/forces/
         *         Custom forces with Euler integration
         */
        gravitationalConstant: 0.0625,
        /**
         * Friction applied on forces to prevent nodes rushing to fast to
         * the desired positions.
         */
        friction: -0.981
    },
    showInLegend: false
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_NetworkgraphSeriesDefaults = (NetworkgraphSeriesDefaults);
/* *
 *
 *  API Options
 *
 * */
/**
 * Fires after the simulation is ended and the layout is stable.
 *
 * @type      {Highcharts.NetworkgraphAfterSimulationCallbackFunction}
 * @product   highcharts
 * @apioption series.networkgraph.events.afterSimulation
 */
/**
 * A `networkgraph` series. If the [type](#series.networkgraph.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.networkgraph
 * @excluding boostThreshold, animation, animationLimit, connectEnds,
 *            connectNulls, cropThreshold, dragDrop, getExtremesFromAll, label,
 *            linecap, negativeColor, pointInterval, pointIntervalUnit,
 *            pointPlacement, pointStart, softThreshold, stack, stacking,
 *            step, threshold, xAxis, yAxis, zoneAxis, dataSorting,
 *            boostBlending
 * @product   highcharts
 * @requires  modules/networkgraph
 * @apioption series.networkgraph
 */
/**
 * An array of data points for the series. For the `networkgraph` series type,
 * points can be given in the following way:
 *
 * An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of
 * data points exceeds the series'
 * [turboThreshold](#series.area.turboThreshold), this option is not available.
 *
 *  ```js
 *     data: [{
 *         from: 'Category1',
 *         to: 'Category2'
 *     }, {
 *         from: 'Category1',
 *         to: 'Category3'
 *     }]
 *  ```
 *
 * @type      {Array<Object|Array|number>}
 * @extends   series.line.data
 * @excluding drilldown,marker,x,y,dragDrop
 * @sample    {highcharts} highcharts/chart/reflow-true/
 *            Numerical values
 * @sample    {highcharts} highcharts/series/data-array-of-arrays/
 *            Arrays of numeric x and y
 * @sample    {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *            Arrays of datetime x and y
 * @sample    {highcharts} highcharts/series/data-array-of-name-value/
 *            Arrays of point.name and y
 * @sample    {highcharts} highcharts/series/data-array-of-objects/
 *            Config objects
 * @product   highcharts
 * @apioption series.networkgraph.data
 */
/**
 * @type      {Highcharts.SeriesNetworkgraphDataLabelsOptionsObject|Array<Highcharts.SeriesNetworkgraphDataLabelsOptionsObject>}
 * @product   highcharts
 * @apioption series.networkgraph.data.dataLabels
 */
/**
 * The node that the link runs from.
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.networkgraph.data.from
 */
/**
 * The node that the link runs to.
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.networkgraph.data.to
 */
/**
 * A collection of options for the individual nodes. The nodes in a
 * networkgraph diagram are auto-generated instances of `Highcharts.Point`,
 * but options can be applied here and linked by the `id`.
 *
 * @sample highcharts/series-networkgraph/data-options/
 *         Networkgraph diagram with node options
 *
 * @type      {Array<*>}
 * @product   highcharts
 * @apioption series.networkgraph.nodes
 */
/**
 * The id of the auto-generated node, referring to the `from` or `to` setting of
 * the link.
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.networkgraph.nodes.id
 */
/**
 * The color of the auto generated node.
 *
 * @type      {Highcharts.ColorString}
 * @product   highcharts
 * @apioption series.networkgraph.nodes.color
 */
/**
 * The color index of the auto generated node, especially for use in styled
 * mode.
 *
 * @type      {number}
 * @product   highcharts
 * @apioption series.networkgraph.nodes.colorIndex
 */
/**
 * The name to display for the node in data labels and tooltips. Use this when
 * the name is different from the `id`. Where the id must be unique for each
 * node, this is not necessary for the name.
 *
 * @sample highcharts/series-networkgraph/data-options/
 *         Networkgraph diagram with node options
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.networkgraph.nodes.name
 */
/**
 * Mass of the node. By default, each node has mass equal to it's marker radius
 * . Mass is used to determine how two connected nodes should affect
 * each other:
 *
 * Attractive force is multiplied by the ratio of two connected
 * nodes; if a big node has weights twice as the small one, then the small one
 * will move towards the big one twice faster than the big one to the small one
 * .
 *
 * @sample highcharts/series-networkgraph/ragdoll/
 *         Mass determined by marker.radius
 *
 * @type      {number}
 * @product   highcharts
 * @apioption series.networkgraph.nodes.mass
 */
/**
 * Options for the node markers.
 *
 * @extends   plotOptions.networkgraph.marker
 * @apioption series.networkgraph.nodes.marker
 */
/**
 * Individual data label for each node. The options are the same as
 * the ones for [series.networkgraph.dataLabels](#series.networkgraph.dataLabels).
 *
 * @type      {Highcharts.SeriesNetworkgraphDataLabelsOptionsObject|Array<Highcharts.SeriesNetworkgraphDataLabelsOptionsObject>}
 *
 * @apioption series.networkgraph.nodes.dataLabels
 */
''; // Adds doclets above to transpiled file

;// ./code/es5/es-modules/Series/Networkgraph/EulerIntegration.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
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
 * Attractive force.
 *
 * In Euler integration, force is stored in a node, not changing it's
 * position. Later, in `integrate()` forces are applied on nodes.
 *
 * @private
 * @param {Highcharts.Point} link
 *        Link that connects two nodes
 * @param {number} force
 *        Force calculated in `repulsiveForceFunction`
 * @param {Highcharts.PositionObject} distanceXY
 *        Distance between two nodes e.g. `{x, y}`
 * @param {number} distanceR
     */
function attractive(link, force, distanceXY, distanceR) {
    var massFactor = link.getMass(), translatedX = (distanceXY.x / distanceR) * force, translatedY = (distanceXY.y / distanceR) * force;
    if (!link.fromNode.fixedPosition) {
        link.fromNode.dispX -=
            translatedX * massFactor.fromNode / link.fromNode.degree;
        link.fromNode.dispY -=
            translatedY * massFactor.fromNode / link.fromNode.degree;
    }
    if (!link.toNode.fixedPosition) {
        link.toNode.dispX +=
            translatedX * massFactor.toNode / link.toNode.degree;
        link.toNode.dispY +=
            translatedY * massFactor.toNode / link.toNode.degree;
    }
}
/**
 * Attractive force function. Can be replaced by API's
 * `layoutAlgorithm.attractiveForce`
 *
 * Other forces that can be used:
 *
 * basic, not recommended:
 *    `function (d, k) { return d / k }`
 *
 * @private
 * @param {number} d current distance between two nodes
 * @param {number} k expected distance between two nodes
 * @return {number} force
 */
function attractiveForceFunction(d, k) {
    return d * d / k;
}
/**
 * Barycenter force. Calculate and applys barycenter forces on the
 * nodes. Making them closer to the center of their barycenter point.
 *
 * In Euler integration, force is stored in a node, not changing it's
 * position. Later, in `integrate()` forces are applied on nodes.
 *
 * @private
 */
function barycenter() {
    var gravitationalConstant = this.options.gravitationalConstant,
        xFactor = this.barycenter.xFactor,
        yFactor = this.barycenter.yFactor;
    this.nodes.forEach(function (node) {
        if (!node.fixedPosition) {
            var degree = node.getDegree(),
                phi = degree * (1 + degree / 2);
            node.dispX += ((xFactor - node.plotX) *
                gravitationalConstant *
                phi / node.degree);
            node.dispY += ((yFactor - node.plotY) *
                gravitationalConstant *
                phi / node.degree);
        }
    });
}
/**
 * Estimate the best possible distance between two nodes, making graph
 * readable.
 * @private
 */
function getK(layout) {
    return Math.pow(layout.box.width * layout.box.height / layout.nodes.length, 0.3);
}
/**
 * Integration method.
 *
 * In Euler integration, force were stored in a node, not changing it's
 * position. Now, in the integrator method, we apply changes.
 *
 * Euler:
 *
 * Basic form: `x(n+1) = x(n) + v(n)`
 *
 * With Rengoild-Fruchterman we get:
 * `x(n+1) = x(n) + v(n) / length(v(n)) * min(v(n), temperature(n))`
 * where:
 * - `x(n+1)`: next position
 * - `x(n)`: current position
 * - `v(n)`: velocity (comes from net force)
 * - `temperature(n)`: current temperature
 *
 * Known issues:
 * Oscillations when force vector has the same magnitude but opposite
 * direction in the next step. Potentially solved by decreasing force by
 * `v * (1 / node.degree)`
 *
 * Note:
 * Actually `min(v(n), temperature(n))` replaces simulated annealing.
 *
 * @private
 * @param {Highcharts.NetworkgraphLayout} layout
 *        Layout object
 * @param {Highcharts.Point} node
 *        Node that should be translated
 */
function integrate(layout, node) {
    node.dispX +=
        node.dispX * layout.options.friction;
    node.dispY +=
        node.dispY * layout.options.friction;
    var distanceR = node.temperature = layout.vectorLength({
            x: node.dispX,
            y: node.dispY
        });
    if (distanceR !== 0) {
        node.plotX += (node.dispX / distanceR *
            Math.min(Math.abs(node.dispX), layout.temperature));
        node.plotY += (node.dispY / distanceR *
            Math.min(Math.abs(node.dispY), layout.temperature));
    }
}
/**
 * Repulsive force.
 *
 * @private
 * @param {Highcharts.Point} node
 *        Node that should be translated by force.
 * @param {number} force
 *        Force calculated in `repulsiveForceFunction`
 * @param {Highcharts.PositionObject} distanceXY
 *        Distance between two nodes e.g. `{x, y}`
 */
function repulsive(node, force, distanceXY, distanceR) {
    node.dispX +=
        (distanceXY.x / distanceR) * force / node.degree;
    node.dispY +=
        (distanceXY.y / distanceR) * force / node.degree;
}
/**
 * Repulsive force function. Can be replaced by API's
 * `layoutAlgorithm.repulsiveForce`.
 *
 * Other forces that can be used:
 *
 * basic, not recommended:
 *    `function (d, k) { return k / d }`
 *
 * standard:
 *    `function (d, k) { return k * k / d }`
 *
 * grid-variant:
 *    `function (d, k) { return k * k / d * (2 * k - d > 0 ? 1 : 0) }`
 *
 * @private
 * @param {number} d current distance between two nodes
 * @param {number} k expected distance between two nodes
 * @return {number} force
 */
function repulsiveForceFunction(d, k) {
    return k * k / d;
}
/* *
 *
 *  Default Export
 *
 * */
var EulerIntegration = {
    attractive: attractive,
    attractiveForceFunction: attractiveForceFunction,
    barycenter: barycenter,
    getK: getK,
    integrate: integrate,
    repulsive: repulsive,
    repulsiveForceFunction: repulsiveForceFunction
};
/* harmony default export */ var Networkgraph_EulerIntegration = (EulerIntegration);

;// ./code/es5/es-modules/Series/Networkgraph/QuadTreeNode.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Class
 *
 * */
/**
 * The QuadTree node class. Used in Networkgraph chart as a base for Barnes-Hut
 * approximation.
 *
 * @private
 * @class
 * @name Highcharts.QuadTreeNode
 *
 * @param {Highcharts.Dictionary<number>} box
 *        Available space for the node
 */
var QuadTreeNode = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function QuadTreeNode(box) {
        /* *
         *
         *  Properties
         *
         * */
        /**
         * Read only. If QuadTreeNode is an external node, Point is stored in
         * `this.body`.
         *
         * @name Highcharts.QuadTreeNode#body
         * @type {boolean|Highcharts.Point}
         */
        this.body = false;
        /**
         * Read only. Internal nodes when created are empty to reserve the
         * space. If Point is added to this QuadTreeNode, QuadTreeNode is no
         * longer empty.
         *
         * @name Highcharts.QuadTreeNode#isEmpty
         * @type {boolean}
         */
        this.isEmpty = false;
        /**
         * Read only. Flag to determine if QuadTreeNode is internal (and has
         * subnodes with mass and central position) or external (bound to
         * Point).
         *
         * @name Highcharts.QuadTreeNode#isInternal
         * @type {boolean}
         */
        this.isInternal = false;
        /**
         * Read only. Array of subnodes. Empty if QuadTreeNode has just one
         * Point. When added another Point to this QuadTreeNode, array is
         * filled with four subnodes.
         *
         * @name Highcharts.QuadTreeNode#nodes
         * @type {Array<Highcharts.QuadTreeNode>}
         */
        this.nodes = [];
        /**
         * Read only. The available space for node.
         *
         * @name Highcharts.QuadTreeNode#box
         * @type {Highcharts.Dictionary<number>}
         */
        this.box = box;
        /**
         * Read only. The minium of width and height values.
         *
         * @name Highcharts.QuadTreeNode#boxSize
         * @type {number}
         */
        this.boxSize = Math.min(box.width, box.height);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * When inserting another node into the box, that already hove one node,
     * divide the available space into another four quadrants.
     *
     * Indexes of quadrants are:
     * ```
     * -------------               -------------
     * |           |               |     |     |
     * |           |               |  0  |  1  |
     * |           |   divide()    |     |     |
     * |     1     | ----------->  -------------
     * |           |               |     |     |
     * |           |               |  3  |  2  |
     * |           |               |     |     |
     * -------------               -------------
     * ```
     */
    QuadTreeNode.prototype.divideBox = function () {
        var halfWidth = this.box.width / 2, halfHeight = this.box.height / 2;
        // Top left
        this.nodes[0] = new QuadTreeNode({
            left: this.box.left,
            top: this.box.top,
            width: halfWidth,
            height: halfHeight
        });
        // Top right
        this.nodes[1] = new QuadTreeNode({
            left: this.box.left + halfWidth,
            top: this.box.top,
            width: halfWidth,
            height: halfHeight
        });
        // Bottom right
        this.nodes[2] = new QuadTreeNode({
            left: this.box.left + halfWidth,
            top: this.box.top + halfHeight,
            width: halfWidth,
            height: halfHeight
        });
        // Bottom left
        this.nodes[3] = new QuadTreeNode({
            left: this.box.left,
            top: this.box.top + halfHeight,
            width: halfWidth,
            height: halfHeight
        });
    };
    /**
     * Determine which of the quadrants should be used when placing node in
     * the QuadTree. Returned index is always in range `< 0 , 3 >`.
     * @private
     */
    QuadTreeNode.prototype.getBoxPosition = function (point) {
        var left = point.plotX < this.box.left + this.box.width / 2, top = point.plotY < this.box.top + this.box.height / 2;
        var index;
        if (left) {
            if (top) {
                // Top left
                index = 0;
            }
            else {
                // Bottom left
                index = 3;
            }
        }
        else {
            if (top) {
                // Top right
                index = 1;
            }
            else {
                // Bottom right
                index = 2;
            }
        }
        return index;
    };
    /**
     * Insert recursively point(node) into the QuadTree. If the given
     * quadrant is already occupied, divide it into smaller quadrants.
     *
     * @param {Highcharts.Point} point
     *        Point/node to be inserted
     * @param {number} depth
     *        Max depth of the QuadTree
     */
    QuadTreeNode.prototype.insert = function (point, depth) {
        var newQuadTreeNode;
        if (this.isInternal) {
            // Internal node:
            this.nodes[this.getBoxPosition(point)].insert(point, depth - 1);
        }
        else {
            this.isEmpty = false;
            if (!this.body) {
                // First body in a quadrant:
                this.isInternal = false;
                this.body = point;
            }
            else {
                if (depth) {
                    // Every other body in a quadrant:
                    this.isInternal = true;
                    this.divideBox();
                    // Reinsert main body only once:
                    if (this.body !== true) {
                        this.nodes[this.getBoxPosition(this.body)]
                            .insert(this.body, depth - 1);
                        this.body = true;
                    }
                    // Add second body:
                    this.nodes[this.getBoxPosition(point)]
                        .insert(point, depth - 1);
                }
                else {
                    // We are below max allowed depth. That means either:
                    // - really huge number of points
                    // - falling two points into exactly the same position
                    // In this case, create another node in the QuadTree.
                    //
                    // Alternatively we could add some noise to the
                    // position, but that could result in different
                    // rendered chart in exporting.
                    newQuadTreeNode = new QuadTreeNode({
                        top: point.plotX || NaN,
                        left: point.plotY || NaN,
                        // Width/height below 1px
                        width: 0.1,
                        height: 0.1
                    });
                    newQuadTreeNode.body = point;
                    newQuadTreeNode.isInternal = false;
                    this.nodes.push(newQuadTreeNode);
                }
            }
        }
    };
    /**
     * Each quad node requires it's mass and center position. That mass and
     * position is used to imitate real node in the layout by approximation.
     */
    QuadTreeNode.prototype.updateMassAndCenter = function () {
        var mass = 0,
            plotX = 0,
            plotY = 0;
        if (this.isInternal) {
            // Calculate weightened mass of the quad node:
            for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
                var pointMass = _a[_i];
                if (!pointMass.isEmpty) {
                    mass += pointMass.mass;
                    plotX += pointMass.plotX * pointMass.mass;
                    plotY += pointMass.plotY * pointMass.mass;
                }
            }
            plotX /= mass;
            plotY /= mass;
        }
        else if (this.body) {
            // Just one node, use coordinates directly:
            mass = this.body.mass;
            plotX = this.body.plotX;
            plotY = this.body.plotY;
        }
        // Store details:
        this.mass = mass;
        this.plotX = plotX;
        this.plotY = plotY;
    };
    return QuadTreeNode;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_QuadTreeNode = (QuadTreeNode);

;// ./code/es5/es-modules/Series/Networkgraph/QuadTree.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


/* *
 *
 *  Class
 *
 * */
/**
 * The QuadTree class. Used in Networkgraph chart as a base for Barnes-Hut
 * approximation.
 *
 * @private
 * @class
 * @name Highcharts.QuadTree
 *
 * @param {number} x
 *        Left position of the plotting area
 * @param {number} y
 *        Top position of the plotting area
 * @param {number} width
 *        Width of the plotting area
 * @param {number} height
 *        Height of the plotting area
 */
var QuadTree = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function QuadTree(x, y, width, height) {
        // Boundary rectangle:
        this.box = {
            left: x,
            top: y,
            width: width,
            height: height
        };
        this.maxDepth = 25;
        this.root = new Networkgraph_QuadTreeNode(this.box);
        this.root.isInternal = true;
        this.root.isRoot = true;
        this.root.divideBox();
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Calculate mass of the each QuadNode in the tree.
     */
    QuadTree.prototype.calculateMassAndCenter = function () {
        this.visitNodeRecursive(null, null, function (node) {
            node.updateMassAndCenter();
        });
    };
    /**
     * Insert nodes into the QuadTree
     *
     * @param {Array<Highcharts.Point>} points
     *        Points as nodes
     */
    QuadTree.prototype.insertNodes = function (points) {
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            this.root.insert(point, this.maxDepth);
        }
    };
    /**
     * Depth first treversal (DFS). Using `before` and `after` callbacks,
     * we can get two results: preorder and postorder traversals, reminder:
     *
     * ```
     *     (a)
     *     / \
     *   (b) (c)
     *   / \
     * (d) (e)
     * ```
     *
     * DFS (preorder): `a -> b -> d -> e -> c`
     *
     * DFS (postorder): `d -> e -> b -> c -> a`
     *
     * @param {Highcharts.QuadTreeNode|null} node
     *        QuadTree node
     * @param {Function} [beforeCallback]
     *        Function to be called before visiting children nodes.
     * @param {Function} [afterCallback]
     *        Function to be called after visiting children nodes.
     */
    QuadTree.prototype.visitNodeRecursive = function (node, beforeCallback, afterCallback) {
        var goFurther;
        if (!node) {
            node = this.root;
        }
        if (node === this.root && beforeCallback) {
            goFurther = beforeCallback(node);
        }
        if (goFurther === false) {
            return;
        }
        for (var _i = 0, _a = node.nodes; _i < _a.length; _i++) {
            var qtNode = _a[_i];
            if (qtNode.isInternal) {
                if (beforeCallback) {
                    goFurther = beforeCallback(qtNode);
                }
                if (goFurther === false) {
                    continue;
                }
                this.visitNodeRecursive(qtNode, beforeCallback, afterCallback);
            }
            else if (qtNode.body) {
                if (beforeCallback) {
                    beforeCallback(qtNode.body);
                }
            }
            if (afterCallback) {
                afterCallback(qtNode);
            }
        }
        if (node === this.root && afterCallback) {
            afterCallback(node);
        }
    };
    return QuadTree;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_QuadTree = (QuadTree);

;// ./code/es5/es-modules/Series/Networkgraph/VerletIntegration.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
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
 * Attractive force.
 *
 * In Verlet integration, force is applied on a node immediately to it's
 * `plotX` and `plotY` position.
 *
 * @private
 * @param {Highcharts.Point} link
 *        Link that connects two nodes
 * @param {number} force
 *        Force calculated in `repulsiveForceFunction`
 * @param {Highcharts.PositionObject} distanceXY
 *        Distance between two nodes e.g. `{x, y}`
 */
function VerletIntegration_attractive(link, force, distanceXY) {
    var massFactor = link.getMass(),
        translatedX = -distanceXY.x * force * this.diffTemperature,
        translatedY = -distanceXY.y * force * this.diffTemperature;
    if (!link.fromNode.fixedPosition) {
        link.fromNode.plotX -=
            translatedX * massFactor.fromNode / link.fromNode.degree;
        link.fromNode.plotY -=
            translatedY * massFactor.fromNode / link.fromNode.degree;
    }
    if (!link.toNode.fixedPosition) {
        link.toNode.plotX +=
            translatedX * massFactor.toNode / link.toNode.degree;
        link.toNode.plotY +=
            translatedY * massFactor.toNode / link.toNode.degree;
    }
}
/**
 * Attractive force function. Can be replaced by API's
 * `layoutAlgorithm.attractiveForce`
 *
 * @private
 * @param {number} d current distance between two nodes
 * @param {number} k expected distance between two nodes
 * @return {number} force
 */
function VerletIntegration_attractiveForceFunction(d, k) {
    // Used in API:
    return (k - d) / d;
}
/**
 * Barycenter force. Calculate and applys barycenter forces on the
 * nodes. Making them closer to the center of their barycenter point.
 *
 * In Verlet integration, force is applied on a node immediately to it's
 * `plotX` and `plotY` position.
 *
 * @private
 */
function VerletIntegration_barycenter() {
    var gravitationalConstant = this.options.gravitationalConstant || 0,
        xFactor = (this.barycenter.xFactor -
            (this.box.left + this.box.width) / 2) * gravitationalConstant,
        yFactor = (this.barycenter.yFactor -
            (this.box.top + this.box.height) / 2) * gravitationalConstant;
    this.nodes.forEach(function (node) {
        if (!node.fixedPosition) {
            node.plotX -=
                xFactor / node.mass / node.degree;
            node.plotY -=
                yFactor / node.mass / node.degree;
        }
    });
}
/**
 * Estiamte the best possible distance between two nodes, making graph
 * readable.
 * @private
 */
function VerletIntegration_getK(layout) {
    return Math.pow(layout.box.width * layout.box.height / layout.nodes.length, 0.5);
}
/**
 * Integration method.
 *
 * In Verlet integration, forces are applied on node immediately to it's
 * `plotX` and `plotY` position.
 *
 * Verlet without velocity:
 *
 *    x(n+1) = 2 * x(n) - x(n-1) + A(T) * deltaT ^ 2
 *
 * where:
 *     - x(n+1) - new position
 *     - x(n) - current position
 *     - x(n-1) - previous position
 *
 * Assuming A(t) = 0 (no acceleration) and (deltaT = 1) we get:
 *
 *     x(n+1) = x(n) + (x(n) - x(n-1))
 *
 * where:
 *     - (x(n) - x(n-1)) - position change
 *
 * TO DO:
 * Consider Verlet with velocity to support additional
 * forces. Or even Time-Corrected Verlet by Jonathan
 * "lonesock" Dummer
 *
 * @private
 * @param {Highcharts.NetworkgraphLayout} layout layout object
 * @param {Highcharts.Point} node node that should be translated
 */
function VerletIntegration_integrate(layout, node) {
    var friction = -layout.options.friction, maxSpeed = layout.options.maxSpeed, prevX = node.prevX, prevY = node.prevY, 
        // Apply friction:
        frictionX = ((node.plotX + node.dispX -
            prevX) * friction), frictionY = ((node.plotY + node.dispY -
            prevY) * friction), abs = Math.abs, signX = abs(frictionX) / (frictionX || 1), // Need to deal with 0
        signY = abs(frictionY) / (frictionY || 1), 
        // Apply max speed:
        diffX = signX * Math.min(maxSpeed, Math.abs(frictionX)), diffY = signY * Math.min(maxSpeed, Math.abs(frictionY));
    // Store for the next iteration:
    node.prevX = node.plotX + node.dispX;
    node.prevY = node.plotY + node.dispY;
    // Update positions:
    node.plotX += diffX;
    node.plotY += diffY;
    node.temperature = layout.vectorLength({
        x: diffX,
        y: diffY
    });
}
/**
 * Repulsive force.
 *
 * In Verlet integration, force is applied on a node immediately to it's
 * `plotX` and `plotY` position.
 *
 * @private
 * @param {Highcharts.Point} node
 *        Node that should be translated by force.
 * @param {number} force
 *        Force calculated in `repulsiveForceFunction`
 * @param {Highcharts.PositionObject} distanceXY
 *        Distance between two nodes e.g. `{x, y}`
 */
function VerletIntegration_repulsive(node, force, distanceXY) {
    var factor = force * this.diffTemperature / node.mass / node.degree;
    if (!node.fixedPosition) {
        node.plotX += distanceXY.x * factor;
        node.plotY += distanceXY.y * factor;
    }
}
/**
 * Repulsive force function. Can be replaced by API's
 * `layoutAlgorithm.repulsiveForce`
 *
 * @private
 * @param {number} d current distance between two nodes
 * @param {number} k expected distance between two nodes
 * @return {number} force
 */
function VerletIntegration_repulsiveForceFunction(d, k) {
    // Used in API:
    return (k - d) / d * (k > d ? 1 : 0); // Force only for close nodes
}
/* *
 *
 *  Default Export
 *
 * */
var VerletIntegration = {
    attractive: VerletIntegration_attractive,
    attractiveForceFunction: VerletIntegration_attractiveForceFunction,
    barycenter: VerletIntegration_barycenter,
    getK: VerletIntegration_getK,
    integrate: VerletIntegration_integrate,
    repulsive: VerletIntegration_repulsive,
    repulsiveForceFunction: VerletIntegration_repulsiveForceFunction
};
/* harmony default export */ var Networkgraph_VerletIntegration = (VerletIntegration);

;// ./code/es5/es-modules/Series/Networkgraph/ReingoldFruchtermanLayout.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */



var win = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).win;



var clamp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).clamp, ReingoldFruchtermanLayout_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, isFunction = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isFunction, fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, ReingoldFruchtermanLayout_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;

/* *
 *
 *  Class
 *
 * */
/**
 * Reingold-Fruchterman algorithm from
 * "Graph Drawing by Force-directed Placement" paper.
 * @private
 */
var ReingoldFruchtermanLayout = /** @class */ (function () {
    function ReingoldFruchtermanLayout() {
        /* *
         *
         *  Static Functions
         *
         * */
        this.box = {};
        this.currentStep = 0;
        this.initialRendering = true;
        this.links = [];
        this.nodes = [];
        this.series = [];
        this.simulation = false;
    }
    ReingoldFruchtermanLayout.compose = function (ChartClass) {
        Series_GraphLayoutComposition.compose(ChartClass);
        Series_GraphLayoutComposition.integrations.euler = Networkgraph_EulerIntegration;
        Series_GraphLayoutComposition.integrations.verlet = Networkgraph_VerletIntegration;
        Series_GraphLayoutComposition.layouts['reingold-fruchterman'] =
            ReingoldFruchtermanLayout;
    };
    ReingoldFruchtermanLayout.prototype.init = function (options) {
        this.options = options;
        this.nodes = [];
        this.links = [];
        this.series = [];
        this.box = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.setInitialRendering(true);
        this.integration =
            Series_GraphLayoutComposition.integrations[options.integration];
        this.enableSimulation = options.enableSimulation;
        this.attractiveForce = ReingoldFruchtermanLayout_pick(options.attractiveForce, this.integration.attractiveForceFunction);
        this.repulsiveForce = ReingoldFruchtermanLayout_pick(options.repulsiveForce, this.integration.repulsiveForceFunction);
        this.approximation = options.approximation;
    };
    ReingoldFruchtermanLayout.prototype.updateSimulation = function (enable) {
        this.enableSimulation = ReingoldFruchtermanLayout_pick(enable, this.options.enableSimulation);
    };
    ReingoldFruchtermanLayout.prototype.start = function () {
        var layout = this,
            series = this.series,
            options = this.options;
        layout.currentStep = 0;
        layout.forces = series[0] && series[0].forces || [];
        layout.chart = series[0] && series[0].chart;
        if (layout.initialRendering) {
            layout.initPositions();
            // Render elements in initial positions:
            series.forEach(function (s) {
                s.finishedAnimating = true; // #13169
                s.render();
            });
        }
        layout.setK();
        layout.resetSimulation(options);
        if (layout.enableSimulation) {
            layout.step();
        }
    };
    ReingoldFruchtermanLayout.prototype.step = function () {
        var _this = this;
        var anyLayout = this,
            allSeries = this.series;
        // Algorithm:
        this.currentStep++;
        if (this.approximation === 'barnes-hut') {
            this.createQuadTree();
            this.quadTree.calculateMassAndCenter();
        }
        for (var _i = 0, _a = this.forces || []; _i < _a.length; _i++) {
            var forceName = _a[_i];
            anyLayout[forceName + 'Forces'](this.temperature);
        }
        // Limit to the plotting area and cool down:
        this.applyLimits();
        // Cool down the system:
        this.temperature = this.coolDown(this.startTemperature, this.diffTemperature, this.currentStep);
        this.prevSystemTemperature = this.systemTemperature;
        this.systemTemperature = this.getSystemTemperature();
        if (this.enableSimulation) {
            for (var _b = 0, allSeries_1 = allSeries; _b < allSeries_1.length; _b++) {
                var series = allSeries_1[_b];
                // Chart could be destroyed during the simulation
                if (series.chart) {
                    series.render();
                }
            }
            if (this.maxIterations-- &&
                isFinite(this.temperature) &&
                !this.isStable()) {
                if (this.simulation) {
                    win.cancelAnimationFrame(this.simulation);
                }
                this.simulation = win.requestAnimationFrame(function () { return _this.step(); });
            }
            else {
                this.simulation = false;
                this.series.forEach(function (s) {
                    fireEvent(s, 'afterSimulation');
                });
            }
        }
    };
    ReingoldFruchtermanLayout.prototype.stop = function () {
        if (this.simulation) {
            win.cancelAnimationFrame(this.simulation);
        }
    };
    ReingoldFruchtermanLayout.prototype.setArea = function (x, y, w, h) {
        this.box = {
            left: x,
            top: y,
            width: w,
            height: h
        };
    };
    ReingoldFruchtermanLayout.prototype.setK = function () {
        // Optimal distance between nodes,
        // available space around the node:
        this.k = this.options.linkLength || this.integration.getK(this);
    };
    ReingoldFruchtermanLayout.prototype.addElementsToCollection = function (elements, collection) {
        for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
            var element = elements_1[_i];
            if (collection.indexOf(element) === -1) {
                collection.push(element);
            }
        }
    };
    ReingoldFruchtermanLayout.prototype.removeElementFromCollection = function (element, collection) {
        var index = collection.indexOf(element);
        if (index !== -1) {
            collection.splice(index, 1);
        }
    };
    ReingoldFruchtermanLayout.prototype.clear = function () {
        this.nodes.length = 0;
        this.links.length = 0;
        this.series.length = 0;
        this.resetSimulation();
    };
    ReingoldFruchtermanLayout.prototype.resetSimulation = function () {
        this.forcedStop = false;
        this.systemTemperature = 0;
        this.setMaxIterations();
        this.setTemperature();
        this.setDiffTemperature();
    };
    ReingoldFruchtermanLayout.prototype.restartSimulation = function () {
        if (!this.simulation) {
            // When dragging nodes, we don't need to calculate
            // initial positions and rendering nodes:
            this.setInitialRendering(false);
            // Start new simulation:
            if (!this.enableSimulation) {
                // Run only one iteration to speed things up:
                this.setMaxIterations(1);
            }
            else {
                this.start();
            }
            if (this.chart) {
                this.chart.redraw();
            }
            // Restore defaults:
            this.setInitialRendering(true);
        }
        else {
            // Extend current simulation:
            this.resetSimulation();
        }
    };
    ReingoldFruchtermanLayout.prototype.setMaxIterations = function (maxIterations) {
        this.maxIterations = ReingoldFruchtermanLayout_pick(maxIterations, this.options.maxIterations);
    };
    ReingoldFruchtermanLayout.prototype.setTemperature = function () {
        this.temperature = this.startTemperature =
            Math.sqrt(this.nodes.length);
    };
    ReingoldFruchtermanLayout.prototype.setDiffTemperature = function () {
        this.diffTemperature = this.startTemperature /
            (this.options.maxIterations + 1);
    };
    ReingoldFruchtermanLayout.prototype.setInitialRendering = function (enable) {
        this.initialRendering = enable;
    };
    ReingoldFruchtermanLayout.prototype.createQuadTree = function () {
        this.quadTree = new Networkgraph_QuadTree(this.box.left, this.box.top, this.box.width, this.box.height);
        this.quadTree.insertNodes(this.nodes);
    };
    ReingoldFruchtermanLayout.prototype.initPositions = function () {
        var initialPositions = this.options.initialPositions;
        if (isFunction(initialPositions)) {
            initialPositions.call(this);
            for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
                var node = _a[_i];
                if (!ReingoldFruchtermanLayout_defined(node.prevX)) {
                    node.prevX = node.plotX;
                }
                if (!ReingoldFruchtermanLayout_defined(node.prevY)) {
                    node.prevY = node.plotY;
                }
                node.dispX = 0;
                node.dispY = 0;
            }
        }
        else if (initialPositions === 'circle') {
            this.setCircularPositions();
        }
        else {
            this.setRandomPositions();
        }
    };
    ReingoldFruchtermanLayout.prototype.setCircularPositions = function () {
        var box = this.box,
            nodes = this.nodes,
            nodesLength = nodes.length + 1,
            angle = 2 * Math.PI / nodesLength,
            rootNodes = nodes.filter(function (node) {
                return node.linksTo.length === 0;
        }), visitedNodes = {}, radius = this.options.initialPositionRadius, addToNodes = function (node) {
            for (var _i = 0, _a = node.linksFrom || []; _i < _a.length; _i++) {
                var link = _a[_i];
                if (!visitedNodes[link.toNode.id]) {
                    visitedNodes[link.toNode.id] = true;
                    sortedNodes.push(link.toNode);
                    addToNodes(link.toNode);
                }
            }
        };
        var sortedNodes = [];
        // Start with identified root nodes an sort the nodes by their
        // hierarchy. In trees, this ensures that branches don't cross
        // eachother.
        for (var _i = 0, rootNodes_1 = rootNodes; _i < rootNodes_1.length; _i++) {
            var rootNode = rootNodes_1[_i];
            sortedNodes.push(rootNode);
            addToNodes(rootNode);
        }
        // Cyclic tree, no root node found
        if (!sortedNodes.length) {
            sortedNodes = nodes;
            // Dangling, cyclic trees
        }
        else {
            for (var _a = 0, nodes_1 = nodes; _a < nodes_1.length; _a++) {
                var node_1 = nodes_1[_a];
                if (sortedNodes.indexOf(node_1) === -1) {
                    sortedNodes.push(node_1);
                }
            }
        }
        var node;
        // Initial positions are laid out along a small circle, appearing
        // as a cluster in the middle
        for (var i = 0, iEnd = sortedNodes.length; i < iEnd; ++i) {
            node = sortedNodes[i];
            node.plotX = node.prevX = ReingoldFruchtermanLayout_pick(node.plotX, box.width / 2 + radius * Math.cos(i * angle));
            node.plotY = node.prevY = ReingoldFruchtermanLayout_pick(node.plotY, box.height / 2 + radius * Math.sin(i * angle));
            node.dispX = 0;
            node.dispY = 0;
        }
    };
    ReingoldFruchtermanLayout.prototype.setRandomPositions = function () {
        var box = this.box,
            nodes = this.nodes,
            nodesLength = nodes.length + 1, 
            /**
             * Return a repeatable,
            quasi-random number based on an integer
             * input. For the initial positions
             * @private
             */
            unrandom = function (n) {
                var rand = n * n / Math.PI;
            rand = rand - Math.floor(rand);
            return rand;
        };
        var node;
        // Initial positions:
        for (var i = 0, iEnd = nodes.length; i < iEnd; ++i) {
            node = nodes[i];
            node.plotX = node.prevX = ReingoldFruchtermanLayout_pick(node.plotX, box.width * unrandom(i));
            node.plotY = node.prevY = ReingoldFruchtermanLayout_pick(node.plotY, box.height * unrandom(nodesLength + i));
            node.dispX = 0;
            node.dispY = 0;
        }
    };
    ReingoldFruchtermanLayout.prototype.force = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.integration[name].apply(this, args);
    };
    ReingoldFruchtermanLayout.prototype.barycenterForces = function () {
        this.getBarycenter();
        this.force('barycenter');
    };
    ReingoldFruchtermanLayout.prototype.getBarycenter = function () {
        var systemMass = 0,
            cx = 0,
            cy = 0;
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            cx += node.plotX * node.mass;
            cy += node.plotY * node.mass;
            systemMass += node.mass;
        }
        this.barycenter = {
            x: cx,
            y: cy,
            xFactor: cx / systemMass,
            yFactor: cy / systemMass
        };
        return this.barycenter;
    };
    ReingoldFruchtermanLayout.prototype.barnesHutApproximation = function (node, quadNode) {
        var distanceXY = this.getDistXY(node,
            quadNode),
            distanceR = this.vectorLength(distanceXY);
        var goDeeper,
            force;
        if (node !== quadNode && distanceR !== 0) {
            if (quadNode.isInternal) {
                // Internal node:
                if (quadNode.boxSize / distanceR <
                    this.options.theta &&
                    distanceR !== 0) {
                    // Treat as an external node:
                    force = this.repulsiveForce(distanceR, this.k);
                    this.force('repulsive', node, force * quadNode.mass, distanceXY, distanceR);
                    goDeeper = false;
                }
                else {
                    // Go deeper:
                    goDeeper = true;
                }
            }
            else {
                // External node, direct force:
                force = this.repulsiveForce(distanceR, this.k);
                this.force('repulsive', node, force * quadNode.mass, distanceXY, distanceR);
            }
        }
        return goDeeper;
    };
    ReingoldFruchtermanLayout.prototype.repulsiveForces = function () {
        var _this = this;
        if (this.approximation === 'barnes-hut') {
            var _loop_1 = function (node) {
                    this_1.quadTree.visitNodeRecursive(null,
                function (quadNode) { return (_this.barnesHutApproximation(node,
                quadNode)); });
            };
            var this_1 = this;
            for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
                var node = _a[_i];
                _loop_1(node);
            }
        }
        else {
            var force = void 0,
                distanceR = void 0,
                distanceXY = void 0;
            for (var _b = 0, _c = this.nodes; _b < _c.length; _b++) {
                var node = _c[_b];
                for (var _d = 0, _e = this.nodes; _d < _e.length; _d++) {
                    var repNode = _e[_d];
                    if (
                    // Node cannot repulse itself:
                    node !== repNode &&
                        // Only close nodes affect each other:
                        // layout.getDistR(node, repNode) < 2 * k &&
                        // Not dragged:
                        !node.fixedPosition) {
                        distanceXY = this.getDistXY(node, repNode);
                        distanceR = this.vectorLength(distanceXY);
                        if (distanceR !== 0) {
                            force = this.repulsiveForce(distanceR, this.k);
                            this.force('repulsive', node, force * repNode.mass, distanceXY, distanceR);
                        }
                    }
                }
            }
        }
    };
    ReingoldFruchtermanLayout.prototype.attractiveForces = function () {
        var distanceXY,
            distanceR,
            force;
        for (var _i = 0, _a = this.links; _i < _a.length; _i++) {
            var link = _a[_i];
            if (link.fromNode && link.toNode) {
                distanceXY = this.getDistXY(link.fromNode, link.toNode);
                distanceR = this.vectorLength(distanceXY);
                if (distanceR !== 0) {
                    force = this.attractiveForce(distanceR, this.k);
                    this.force('attractive', link, force, distanceXY, distanceR);
                }
            }
        }
    };
    ReingoldFruchtermanLayout.prototype.applyLimits = function () {
        var nodes = this.nodes;
        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
            var node = nodes_2[_i];
            if (node.fixedPosition) {
                continue;
            }
            this.integration.integrate(this, node);
            this.applyLimitBox(node, this.box);
            // Reset displacement:
            node.dispX = 0;
            node.dispY = 0;
        }
    };
    /**
     * External box that nodes should fall. When hitting an edge, node
     * should stop or bounce.
     * @private
     */
    ReingoldFruchtermanLayout.prototype.applyLimitBox = function (node, box) {
        var radius = node.radius;
        /*
        TO DO: Consider elastic collision instead of stopping.
        o' means end position when hitting plotting area edge:

        - "inelastic":
        o
            \
        ______
        |  o'
        |   \
        |    \

        - "elastic"/"bounced":
        o
            \
        ______
        |  ^
        | / \
        |o'  \

        Euler sample:
        if (plotX < 0) {
            plotX = 0;
            dispX *= -1;
        }

        if (plotX > box.width) {
            plotX = box.width;
            dispX *= -1;
        }

        */
        // Limit X-coordinates:
        node.plotX = clamp(node.plotX, box.left + radius, box.width - radius);
        // Limit Y-coordinates:
        node.plotY = clamp(node.plotY, box.top + radius, box.height - radius);
    };
    /**
     * From "A comparison of simulated annealing cooling strategies" by
     * Nourani and Andresen work.
     * @private
     */
    ReingoldFruchtermanLayout.prototype.coolDown = function (temperature, temperatureStep, currentStep) {
        // Logarithmic:
        /*
        return Math.sqrt(this.nodes.length) -
            Math.log(
                currentStep * layout.diffTemperature
            );
        */
        // Exponential:
        /*
        let alpha = 0.1;
        layout.temperature = Math.sqrt(layout.nodes.length) *
            Math.pow(alpha, layout.diffTemperature);
        */
        // Linear:
        return temperature - temperatureStep * currentStep;
    };
    ReingoldFruchtermanLayout.prototype.isStable = function () {
        return Math.abs(this.systemTemperature -
            this.prevSystemTemperature) < 0.00001 || this.temperature <= 0;
    };
    ReingoldFruchtermanLayout.prototype.getSystemTemperature = function () {
        var value = 0;
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            value += node.temperature;
        }
        return value;
    };
    ReingoldFruchtermanLayout.prototype.vectorLength = function (vector) {
        return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    };
    ReingoldFruchtermanLayout.prototype.getDistR = function (nodeA, nodeB) {
        var distance = this.getDistXY(nodeA,
            nodeB);
        return this.vectorLength(distance);
    };
    ReingoldFruchtermanLayout.prototype.getDistXY = function (nodeA, nodeB) {
        var xDist = nodeA.plotX - nodeB.plotX,
            yDist = nodeA.plotY - nodeB.plotY;
        return {
            x: xDist,
            y: yDist,
            absX: Math.abs(xDist),
            absY: Math.abs(yDist)
        };
    };
    return ReingoldFruchtermanLayout;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_ReingoldFruchtermanLayout = (ReingoldFruchtermanLayout);

;// ./code/es5/es-modules/Series/SimulationSeriesUtilities.js
/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var SimulationSeriesUtilities_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, syncTimeout = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).syncTimeout;

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject;
/**
 * Create a setTimeout for the first drawDataLabels()
 * based on the dataLabels.animation.defer value
 * for series which have enabled simulation.
 * @private
 */
function initDataLabelsDefer() {
    var _this = this;
    var _a;
    var dlOptions = this.options.dataLabels;
    // Method drawDataLabels() fires for the first time after
    // dataLabels.animation.defer time unless
    // the dataLabels.animation = false or dataLabels.defer = false
    // or if the simulation is disabled
    if (!(dlOptions === null || dlOptions === void 0 ? void 0 : dlOptions.defer) ||
        !((_a = this.options.layoutAlgorithm) === null || _a === void 0 ? void 0 : _a.enableSimulation)) {
        this.deferDataLabels = false;
    }
    else {
        syncTimeout(function () {
            _this.deferDataLabels = false;
        }, dlOptions ? animObject(dlOptions.animation).defer : 0);
    }
}
/**
 * Initialize the SVG group for the DataLabels with correct opacities
 * and correct styles so that the animation for the series that have
 * simulation enabled works fine.
 * @private
 */
function initDataLabels() {
    var series = this,
        dlOptions = series.options.dataLabels;
    if (!series.dataLabelsGroup) {
        var dataLabelsGroup = this.initDataLabelsGroup();
        // Apply the dataLabels.style not only to the
        // individual dataLabels but also to the entire group
        if (!series.chart.styledMode && (dlOptions === null || dlOptions === void 0 ? void 0 : dlOptions.style)) {
            dataLabelsGroup.css(dlOptions.style);
        }
        // Initialize the opacity of the group to 0 (start of animation)
        dataLabelsGroup.attr({ opacity: 0 });
        if (series.visible) { // #2597, #3023, #3024
            dataLabelsGroup.show();
        }
        return dataLabelsGroup;
    }
    // Place it on first and subsequent (redraw) calls
    series.dataLabelsGroup.attr(SimulationSeriesUtilities_merge({ opacity: 1 }, this.getPlotBox('data-labels')));
    return series.dataLabelsGroup;
}
var DataLabelsDeferUtils = {
    initDataLabels: initDataLabels,
    initDataLabelsDefer: initDataLabelsDefer
};
/* harmony default export */ var SimulationSeriesUtilities = (DataLabelsDeferUtils);

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
var TextPath_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, TextPath_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, uniqueKey = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).uniqueKey, TextPath_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, TextPath_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
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
        var undo = TextPath_addEvent(textWrapper, 'afterModifyTree',
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
function TextPath_compose(SVGElementClass) {
    TextPath_addEvent(SVGElementClass, 'afterGetBBox', setPolygon);
    TextPath_addEvent(SVGElementClass, 'beforeAddingDataLabel', drawTextPath);
    var svgElementProto = SVGElementClass.prototype;
    if (!svgElementProto.setTextPath) {
        svgElementProto.setTextPath = setTextPath;
    }
}
var TextPath = {
    compose: TextPath_compose
};
/* harmony default export */ var Extensions_TextPath = (TextPath);

;// ./code/es5/es-modules/Series/Networkgraph/NetworkgraphSeries.js
/* *
 *
 *  Networkgraph series
 *
 *  (c) 2010-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var NetworkgraphSeries_extends = (undefined && undefined.__extends) || (function () {
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




var noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;





var Series = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, NetworkgraphSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, columnProto = NetworkgraphSeries_a.column.prototype, lineProto = NetworkgraphSeries_a.line.prototype;

var NetworkgraphSeries_initDataLabels = SimulationSeriesUtilities.initDataLabels, NetworkgraphSeries_initDataLabelsDefer = SimulationSeriesUtilities.initDataLabelsDefer;

var NetworkgraphSeries_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, NetworkgraphSeries_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, NetworkgraphSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, NetworkgraphSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, NetworkgraphSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;

Extensions_TextPath.compose((highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default()));
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.networkgraph
 *
 * @extends Highcharts.Series
 */
var NetworkgraphSeries = /** @class */ (function (_super) {
    NetworkgraphSeries_extends(NetworkgraphSeries, _super);
    function NetworkgraphSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.deferDataLabels = true;
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    NetworkgraphSeries.compose = function (ChartClass) {
        Series_DragNodesComposition.compose(ChartClass);
        Networkgraph_ReingoldFruchtermanLayout.compose(ChartClass);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Defer the layout.
     * Each series first registers all nodes and links, then layout
     * calculates all nodes positions and calls `series.render()` in every
     * simulation step.
     *
     * Note:
     * Animation is done through `requestAnimationFrame` directly, without
     * `Highcharts.animate()` use.
     * @private
     */
    NetworkgraphSeries.prototype.deferLayout = function () {
        var layoutOptions = this.options.layoutAlgorithm,
            chartOptions = this.chart.options.chart;
        var layout,
            graphLayoutsStorage = this.chart.graphLayoutsStorage,
            graphLayoutsLookup = this.chart.graphLayoutsLookup;
        if (!this.visible) {
            return;
        }
        if (!graphLayoutsStorage) {
            this.chart.graphLayoutsStorage = graphLayoutsStorage = {};
            this.chart.graphLayoutsLookup = graphLayoutsLookup = [];
        }
        layout = graphLayoutsStorage[layoutOptions.type];
        if (!layout) {
            layoutOptions.enableSimulation =
                !NetworkgraphSeries_defined(chartOptions.forExport) ?
                    layoutOptions.enableSimulation :
                    !chartOptions.forExport;
            graphLayoutsStorage[layoutOptions.type] = layout =
                new Series_GraphLayoutComposition.layouts[layoutOptions.type]();
            layout.init(layoutOptions);
            graphLayoutsLookup.splice(layout.index, 0, layout);
        }
        this.layout = layout;
        layout.setArea(0, 0, this.chart.plotWidth, this.chart.plotHeight);
        layout.addElementsToCollection([this], layout.series);
        layout.addElementsToCollection(this.nodes, layout.nodes);
        layout.addElementsToCollection(this.points, layout.links);
    };
    /**
     * @private
     */
    NetworkgraphSeries.prototype.destroy = function () {
        if (this.layout) {
            this.layout.removeElementFromCollection(this, this.layout.series);
        }
        Series_NodesComposition.destroy.call(this);
    };
    /**
     * Networkgraph has two separate collections of nodes and lines, render
     * dataLabels for both sets:
     * @private
     */
    NetworkgraphSeries.prototype.drawDataLabels = function () {
        // We defer drawing the dataLabels
        // until dataLabels.animation.defer time passes
        if (this.deferDataLabels) {
            return;
        }
        var dlOptions = this.options.dataLabels;
        var textPath;
        if (dlOptions === null || dlOptions === void 0 ? void 0 : dlOptions.textPath) {
            textPath = dlOptions.textPath;
        }
        // Render node labels:
        Series.prototype.drawDataLabels.call(this, this.nodes);
        // Render link labels:
        if (dlOptions === null || dlOptions === void 0 ? void 0 : dlOptions.linkTextPath) {
            // If linkTextPath is set, render link labels with linkTextPath
            dlOptions.textPath = dlOptions.linkTextPath;
        }
        Series.prototype.drawDataLabels.call(this, this.data);
        // Go back to textPath for nodes
        if (dlOptions === null || dlOptions === void 0 ? void 0 : dlOptions.textPath) {
            dlOptions.textPath = textPath;
        }
    };
    /**
     * Extend generatePoints by adding the nodes, which are Point objects
     * but pushed to the this.nodes array.
     * @private
     */
    NetworkgraphSeries.prototype.generatePoints = function () {
        var node,
            i;
        Series_NodesComposition.generatePoints.apply(this, arguments);
        // In networkgraph, it's fine to define standalone nodes, create
        // them:
        if (this.options.nodes) {
            this.options.nodes.forEach(function (nodeOptions) {
                if (!this.nodeLookup[nodeOptions.id]) {
                    this.nodeLookup[nodeOptions.id] =
                        this.createNode(nodeOptions.id);
                }
            }, this);
        }
        for (i = this.nodes.length - 1; i >= 0; i--) {
            node = this.nodes[i];
            node.degree = node.getDegree();
            node.radius = NetworkgraphSeries_pick(node.marker && node.marker.radius, this.options.marker && this.options.marker.radius, 0);
            node.key = node.name;
            // If node exists, but it's not available in nodeLookup,
            // then it's leftover from previous runs (e.g. setData)
            if (!this.nodeLookup[node.id]) {
                node.remove();
            }
        }
        this.data.forEach(function (link) {
            link.formatPrefix = 'link';
        });
        this.indexateNodes();
    };
    /**
     * In networkgraph, series.points refers to links,
     * but series.nodes refers to actual points.
     * @private
     */
    NetworkgraphSeries.prototype.getPointsCollection = function () {
        return this.nodes || [];
    };
    /**
     * Set index for each node. Required for proper `node.update()`.
     * Note that links are indexated out of the box in `generatePoints()`.
     *
     * @private
     */
    NetworkgraphSeries.prototype.indexateNodes = function () {
        this.nodes.forEach(function (node, index) {
            node.index = index;
        });
    };
    /**
     * Extend init with base event, which should stop simulation during
     * update. After data is updated, `chart.render` resumes the simulation.
     * @private
     */
    NetworkgraphSeries.prototype.init = function (chart, options) {
        var _this = this;
        _super.prototype.init.call(this, chart, options);
        NetworkgraphSeries_initDataLabelsDefer.call(this);
        NetworkgraphSeries_addEvent(this, 'updatedData', function () {
            if (_this.layout) {
                _this.layout.stop();
            }
        });
        NetworkgraphSeries_addEvent(this, 'afterUpdate', function () {
            _this.nodes.forEach(function (node) {
                if (node && node.series) {
                    node.resolveColor();
                }
            });
        });
        // If the dataLabels.animation.defer time is longer than
        // the time it takes for the layout to become stable then
        // drawDataLabels would never be called (that's why we force it here)
        NetworkgraphSeries_addEvent(this, 'afterSimulation', function () {
            this.deferDataLabels = false;
            this.drawDataLabels();
        });
        return this;
    };
    /**
     * Extend the default marker attribs by using a non-rounded X position,
     * otherwise the nodes will jump from pixel to pixel which looks a bit
     * jaggy when approaching equilibrium.
     * @private
     */
    NetworkgraphSeries.prototype.markerAttribs = function (point, state) {
        var attribs = Series.prototype.markerAttribs.call(this,
            point,
            state);
        // Series.render() is called before initial positions are set:
        if (!NetworkgraphSeries_defined(point.plotY)) {
            attribs.y = 0;
        }
        attribs.x = (point.plotX || 0) - (attribs.width || 0) / 2;
        return attribs;
    };
    /**
     * Return the presentational attributes.
     * @private
     */
    NetworkgraphSeries.prototype.pointAttribs = function (point, state) {
        // By default, only `selected` state is passed on
        var pointState = state || point && point.state || 'normal',
            stateOptions = this.options.states[pointState];
        var attribs = Series.prototype.pointAttribs.call(this,
            point,
            pointState);
        if (point && !point.isNode) {
            attribs = point.getLinkAttributes();
            // For link, get prefixed names:
            if (stateOptions) {
                attribs = {
                    // TO DO: API?
                    stroke: stateOptions.linkColor || attribs.stroke,
                    dashstyle: (stateOptions.linkDashStyle || attribs.dashstyle),
                    opacity: NetworkgraphSeries_pick(stateOptions.linkOpacity, attribs.opacity),
                    'stroke-width': stateOptions.linkColor ||
                        attribs['stroke-width']
                };
            }
        }
        return attribs;
    };
    /**
     * Extend the render function to also render this.nodes together with
     * the points.
     * @private
     */
    NetworkgraphSeries.prototype.render = function () {
        var series = this,
            points = series.points,
            hoverPoint = series.chart.hoverPoint,
            dataLabels = [];
        // Render markers:
        series.points = series.nodes;
        lineProto.render.call(this);
        series.points = points;
        points.forEach(function (point) {
            if (point.fromNode && point.toNode) {
                point.renderLink();
                point.redrawLink();
            }
        });
        if (hoverPoint && hoverPoint.series === series) {
            series.redrawHalo(hoverPoint);
        }
        if (series.chart.hasRendered &&
            !series.options.dataLabels.allowOverlap) {
            series.nodes.concat(series.points).forEach(function (node) {
                if (node.dataLabel) {
                    dataLabels.push(node.dataLabel);
                }
            });
            series.chart.hideOverlappingLabels(dataLabels);
        }
    };
    /**
     * When state should be passed down to all points, concat nodes and
     * links and apply this state to all of them.
     * @private
     */
    NetworkgraphSeries.prototype.setState = function (state, inherit) {
        if (inherit) {
            this.points = this.nodes.concat(this.data);
            Series.prototype.setState.apply(this, arguments);
            this.points = this.data;
        }
        else {
            Series.prototype.setState.apply(this, arguments);
        }
        // If simulation is done, re-render points with new states:
        if (!this.layout.simulation && !state) {
            this.render();
        }
    };
    /**
     * Run pre-translation and register nodes&links to the deffered layout.
     * @private
     */
    NetworkgraphSeries.prototype.translate = function () {
        this.generatePoints();
        this.deferLayout();
        this.nodes.forEach(function (node) {
            // Draw the links from this node
            node.isInside = true;
            node.linksFrom.forEach(function (point) {
                point.shapeType = 'path';
                // Pass test in drawPoints
                point.y = 1;
            });
        });
    };
    NetworkgraphSeries.defaultOptions = NetworkgraphSeries_merge(Series.defaultOptions, Networkgraph_NetworkgraphSeriesDefaults);
    return NetworkgraphSeries;
}(Series));
NetworkgraphSeries_extend(NetworkgraphSeries.prototype, {
    pointClass: Networkgraph_NetworkgraphPoint,
    animate: void 0, // Animation is run in `series.simulation`
    directTouch: true,
    drawGraph: void 0,
    forces: ['barycenter', 'repulsive', 'attractive'],
    hasDraggableNodes: true,
    isCartesian: false,
    noSharedTooltip: true,
    pointArrayMap: ['from', 'to'],
    requireSorting: false,
    trackerGroups: ['group', 'markerGroup', 'dataLabelsGroup'],
    initDataLabels: NetworkgraphSeries_initDataLabels,
    buildKDTree: noop,
    createNode: Series_NodesComposition.createNode,
    drawTracker: columnProto.drawTracker,
    onMouseDown: Series_DragNodesComposition.onMouseDown,
    onMouseMove: Series_DragNodesComposition.onMouseMove,
    onMouseUp: Series_DragNodesComposition.onMouseUp,
    redrawHalo: Series_DragNodesComposition.redrawHalo
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('networkgraph', NetworkgraphSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Networkgraph_NetworkgraphSeries = (NetworkgraphSeries);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Callback that fires after the end of Networkgraph series simulation
 * when the layout is stable.
 *
 * @callback Highcharts.NetworkgraphAfterSimulationCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occurred.
 *
 * @param {global.Event} event
 *        The event that occurred.
 */
''; // Detach doclets above

;// ./code/es5/es-modules/masters/modules/networkgraph.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
Networkgraph_NetworkgraphSeries.compose(G.Chart);
/* harmony default export */ var networkgraph_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});