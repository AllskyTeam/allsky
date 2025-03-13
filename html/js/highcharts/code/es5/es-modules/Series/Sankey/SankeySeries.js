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
import NodesComposition from '../NodesComposition.js';
import SankeyPoint from './SankeyPoint.js';
import SankeySeriesDefaults from './SankeySeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import SankeyColumnComposition from './SankeyColumnComposition.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, LineSeries = _a.line;
import Color from '../../Core/Color/Color.js';
var color = Color.parse;
import TU from '../TreeUtilities.js';
var getLevelOptions = TU.getLevelOptions, getNodeWidth = TU.getNodeWidth;
import U from '../../Core/Utilities.js';
var clamp = U.clamp, crisp = U.crisp, extend = U.extend, isObject = U.isObject, merge = U.merge, pick = U.pick, relativeLength = U.relativeLength, stableSort = U.stableSort;
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
 * @name Highcharts.seriesTypes.sankey
 *
 * @augments Highcharts.Series
 */
var SankeySeries = /** @class */ (function (_super) {
    __extends(SankeySeries, _super);
    function SankeySeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * @private
     */
    SankeySeries.getDLOptions = function (params) {
        var optionsPoint = (isObject(params.optionsPoint) ?
            params.optionsPoint.dataLabels :
            {}), optionsLevel = (isObject(params.level) ?
            params.level.dataLabels :
            {}), options = merge({
            style: {}
        }, optionsLevel, optionsPoint);
        return options;
    };
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
    SankeySeries.prototype.createNodeColumns = function () {
        var columns = [];
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            node.setNodeColumn();
            if (!columns[node.column]) {
                columns[node.column] =
                    SankeyColumnComposition.compose([], this);
            }
            columns[node.column].push(node);
        }
        // Fill in empty columns (#8865)
        for (var i = 0; i < columns.length; i++) {
            if (typeof columns[i] === 'undefined') {
                columns[i] =
                    SankeyColumnComposition.compose([], this);
            }
        }
        return columns;
    };
    /**
     * Order the nodes, starting with the root node(s). (#9818)
     * @private
     */
    SankeySeries.prototype.order = function (node, level) {
        var series = this;
        // Prevents circular recursion:
        if (typeof node.level === 'undefined') {
            node.level = level;
            for (var _i = 0, _a = node.linksFrom; _i < _a.length; _i++) {
                var link = _a[_i];
                if (link.toNode) {
                    series.order(link.toNode, level + 1);
                }
            }
        }
    };
    /**
     * Extend generatePoints by adding the nodes, which are Point objects
     * but pushed to the this.nodes array.
     * @private
     */
    SankeySeries.prototype.generatePoints = function () {
        NodesComposition.generatePoints.apply(this, arguments);
        if (this.orderNodes) {
            for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
                var node = _a[_i];
                // Identify the root node(s)
                if (node.linksTo.length === 0) {
                    // Start by the root node(s) and recursively set the level
                    // on all following nodes.
                    this.order(node, 0);
                }
            }
            stableSort(this.nodes, function (a, b) { return (a.level - b.level); });
        }
    };
    /**
     * Overridable function to get node padding, overridden in dependency
     * wheel series type.
     * @private
     */
    SankeySeries.prototype.getNodePadding = function () {
        var nodePadding = this.options.nodePadding || 0;
        // If the number of columns is so great that they will overflow with
        // the given nodePadding, we sacrifice the padding in order to
        // render all nodes within the plot area (#11917).
        if (this.nodeColumns) {
            var maxLength = this.nodeColumns.reduce(function (acc, col) { return Math.max(acc, col.length); }, 0);
            if (maxLength * nodePadding > this.chart.plotSizeY) {
                nodePadding = this.chart.plotSizeY / maxLength;
            }
        }
        return nodePadding;
    };
    /**
     * Define hasData function for non-cartesian series.
     * @private
     * @return {boolean}
     *         Returns true if the series has points at all.
     */
    SankeySeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * Return the presentational attributes.
     * @private
     */
    SankeySeries.prototype.pointAttribs = function (point, state) {
        if (!point) {
            return {};
        }
        var series = this, level = point.isNode ? point.level : point.fromNode.level, levelOptions = series.mapOptionsToLevel[level || 0] || {}, options = point.options, stateOptions = (levelOptions.states && levelOptions.states[state || '']) || {}, values = [
            'colorByPoint',
            'borderColor',
            'borderWidth',
            'linkOpacity',
            'opacity'
        ].reduce(function (obj, key) {
            obj[key] = pick(stateOptions[key], options[key], levelOptions[key], series.options[key]);
            return obj;
        }, {}), color = pick(stateOptions.color, options.color, values.colorByPoint ? point.color : levelOptions.color);
        // Node attributes
        if (point.isNode) {
            return {
                fill: color,
                stroke: values.borderColor,
                'stroke-width': values.borderWidth,
                opacity: values.opacity
            };
        }
        // Link attributes
        return {
            fill: Color.parse(color).setOpacity(values.linkOpacity).get()
        };
    };
    SankeySeries.prototype.drawTracker = function () {
        ColumnSeries.prototype.drawTracker.call(this, this.points);
        ColumnSeries.prototype.drawTracker.call(this, this.nodes);
    };
    SankeySeries.prototype.drawPoints = function () {
        ColumnSeries.prototype.drawPoints.call(this, this.points);
        ColumnSeries.prototype.drawPoints.call(this, this.nodes);
    };
    SankeySeries.prototype.drawDataLabels = function () {
        ColumnSeries.prototype.drawDataLabels.call(this, this.points);
        ColumnSeries.prototype.drawDataLabels.call(this, this.nodes);
    };
    /**
     * Run pre-translation by generating the nodeColumns.
     * @private
     */
    SankeySeries.prototype.translate = function () {
        this.generatePoints();
        this.nodeColumns = this.createNodeColumns();
        var series = this, chart = this.chart, options = this.options, nodeColumns = this.nodeColumns, columnCount = nodeColumns.length;
        this.nodeWidth = getNodeWidth(this, columnCount);
        this.nodePadding = this.getNodePadding();
        // Find out how much space is needed. Base it on the translation
        // factor of the most spacious column.
        this.translationFactor = nodeColumns.reduce(function (translationFactor, column) { return Math.min(translationFactor, column.sankeyColumn.getTranslationFactor(series)); }, Infinity);
        this.colDistance =
            (chart.plotSizeX - this.nodeWidth -
                options.borderWidth) / Math.max(1, nodeColumns.length - 1);
        // Calculate level options used in sankey and organization
        series.mapOptionsToLevel = getLevelOptions({
            // NOTE: if support for allowTraversingTree is added, then from
            // should be the level of the root node.
            from: 1,
            levels: options.levels,
            to: nodeColumns.length - 1, // Height of the tree
            defaults: {
                borderColor: options.borderColor,
                borderRadius: options.borderRadius, // Organization series
                borderWidth: options.borderWidth,
                color: series.color,
                colorByPoint: options.colorByPoint,
                // NOTE: if support for allowTraversingTree is added, then
                // levelIsConstant should be optional.
                levelIsConstant: true,
                linkColor: options.linkColor, // Organization series
                linkLineWidth: options.linkLineWidth, // Organization series
                linkOpacity: options.linkOpacity,
                states: options.states
            }
        });
        // First translate all nodes so we can use them when drawing links
        for (var _i = 0, nodeColumns_1 = nodeColumns; _i < nodeColumns_1.length; _i++) {
            var column = nodeColumns_1[_i];
            for (var _a = 0, column_1 = column; _a < column_1.length; _a++) {
                var node = column_1[_a];
                series.translateNode(node, column);
            }
        }
        // Then translate links
        for (var _b = 0, _c = this.nodes; _b < _c.length; _b++) {
            var node = _c[_b];
            // Translate the links from this node
            for (var _d = 0, _e = node.linksFrom; _d < _e.length; _d++) {
                var linkPoint = _e[_d];
                // If weight is 0 - don't render the link path #12453,
                // render null points (for organization chart)
                if ((linkPoint.weight || linkPoint.isNull) && linkPoint.to) {
                    series.translateLink(linkPoint);
                    linkPoint.allowShadow = false;
                }
            }
        }
    };
    /**
     * Run translation operations for one link.
     * @private
     */
    SankeySeries.prototype.translateLink = function (point) {
        var getY = function (node, fromOrTo) {
            var linkTop = (node.offset(point, fromOrTo) *
                translationFactor);
            var y = Math.min(node.nodeY + linkTop, 
            // Prevent links from spilling below the node (#12014)
            node.nodeY + (node.shapeArgs && node.shapeArgs.height || 0) - linkHeight);
            return y;
        };
        var fromNode = point.fromNode, toNode = point.toNode, chart = this.chart, inverted = chart.inverted, translationFactor = this.translationFactor, options = this.options, linkColorMode = pick(point.linkColorMode, options.linkColorMode), curvy = ((chart.inverted ? -this.colDistance : this.colDistance) *
            options.curveFactor), nodeLeft = fromNode.nodeX, right = toNode.nodeX, outgoing = point.outgoing;
        var linkHeight = Math.max(point.weight * translationFactor, this.options.minLinkWidth), fromY = getY(fromNode, 'linksFrom'), toY = getY(toNode, 'linksTo'), nodeW = this.nodeWidth, straight = right > nodeLeft + nodeW;
        if (chart.inverted) {
            fromY = chart.plotSizeY - fromY;
            toY = (chart.plotSizeY || 0) - toY;
            nodeW = -nodeW;
            linkHeight = -linkHeight;
            straight = nodeLeft > right;
        }
        point.shapeType = 'path';
        point.linkBase = [
            fromY,
            fromY + linkHeight,
            toY,
            toY + linkHeight
        ];
        // Links going from left to right
        if (straight && typeof toY === 'number') {
            point.shapeArgs = {
                d: [
                    ['M', nodeLeft + nodeW, fromY],
                    [
                        'C',
                        nodeLeft + nodeW + curvy,
                        fromY,
                        right - curvy,
                        toY,
                        right,
                        toY
                    ],
                    ['L', right + (outgoing ? nodeW : 0), toY + linkHeight / 2],
                    ['L', right, toY + linkHeight],
                    [
                        'C',
                        right - curvy,
                        toY + linkHeight,
                        nodeLeft + nodeW + curvy,
                        fromY + linkHeight,
                        nodeLeft + nodeW, fromY + linkHeight
                    ],
                    ['Z']
                ]
            };
            // Experimental: Circular links pointing backwards. In
            // v6.1.0 this breaks the rendering completely, so even
            // this experimental rendering is an improvement. #8218.
            // @todo
            // - Make room for the link in the layout
            // - Automatically determine if the link should go up or
            //   down.
        }
        else if (typeof toY === 'number') {
            var bend = 20, vDist = chart.plotHeight - fromY - linkHeight, x1 = right - bend - linkHeight, x2 = right - bend, x3 = right, x4 = nodeLeft + nodeW, x5 = x4 + bend, x6 = x5 + linkHeight, fy1 = fromY, fy2 = fromY + linkHeight, fy3 = fy2 + bend, y4 = fy3 + vDist, y5 = y4 + bend, y6 = y5 + linkHeight, ty1 = toY, ty2 = ty1 + linkHeight, ty3 = ty2 + bend, cfy1 = fy2 - linkHeight * 0.7, cy2 = y5 + linkHeight * 0.7, cty1 = ty2 - linkHeight * 0.7, cx1 = x3 - linkHeight * 0.7, cx2 = x4 + linkHeight * 0.7;
            point.shapeArgs = {
                d: [
                    ['M', x4, fy1],
                    ['C', cx2, fy1, x6, cfy1, x6, fy3],
                    ['L', x6, y4],
                    ['C', x6, cy2, cx2, y6, x4, y6],
                    ['L', x3, y6],
                    ['C', cx1, y6, x1, cy2, x1, y4],
                    ['L', x1, ty3],
                    ['C', x1, cty1, cx1, ty1, x3, ty1],
                    ['L', x3, ty2],
                    ['C', x2, ty2, x2, ty2, x2, ty3],
                    ['L', x2, y4],
                    ['C', x2, y5, x2, y5, x3, y5],
                    ['L', x4, y5],
                    ['C', x5, y5, x5, y5, x5, y4],
                    ['L', x5, fy3],
                    ['C', x5, fy2, x5, fy2, x4, fy2],
                    ['Z']
                ]
            };
        }
        // Place data labels in the middle
        point.dlBox = {
            x: nodeLeft + (right - nodeLeft + nodeW) / 2,
            y: fromY + (toY - fromY) / 2,
            height: linkHeight,
            width: 0
        };
        // And set the tooltip anchor in the middle
        point.tooltipPos = chart.inverted ? [
            chart.plotSizeY - point.dlBox.y - linkHeight / 2,
            chart.plotSizeX - point.dlBox.x
        ] : [
            point.dlBox.x,
            point.dlBox.y + linkHeight / 2
        ];
        // Pass test in drawPoints. plotX/Y needs to be defined for dataLabels.
        // #15863
        point.y = point.plotY = 1;
        point.x = point.plotX = 1;
        if (!point.options.color) {
            if (linkColorMode === 'from') {
                point.color = fromNode.color;
            }
            else if (linkColorMode === 'to') {
                point.color = toNode.color;
            }
            else if (linkColorMode === 'gradient') {
                var fromColor = color(fromNode.color).get(), toColor = color(toNode.color).get();
                point.color = {
                    linearGradient: {
                        x1: 1,
                        x2: 0,
                        y1: 0,
                        y2: 0
                    },
                    stops: [
                        [0, inverted ? fromColor : toColor],
                        [1, inverted ? toColor : fromColor]
                    ]
                };
            }
        }
    };
    /**
     * Run translation operations for one node.
     * @private
     */
    SankeySeries.prototype.translateNode = function (node, column) {
        var translationFactor = this.translationFactor, chart = this.chart, options = this.options, borderRadius = options.borderRadius, _a = options.borderWidth, borderWidth = _a === void 0 ? 0 : _a, sum = node.getSum(), nodeHeight = Math.max(Math.round(sum * translationFactor), this.options.minLinkWidth), nodeWidth = Math.round(this.nodeWidth), nodeOffset = column.sankeyColumn.offset(node, translationFactor), fromNodeTop = crisp(pick(nodeOffset.absoluteTop, (column.sankeyColumn.top(translationFactor) +
            nodeOffset.relativeTop)), borderWidth), left = crisp(this.colDistance * node.column +
            borderWidth / 2, borderWidth) + relativeLength(node.options[chart.inverted ?
            'offsetVertical' :
            'offsetHorizontal'] || 0, nodeWidth), nodeLeft = chart.inverted ?
            chart.plotSizeX - left :
            left;
        node.sum = sum;
        // If node sum is 0, don't render the rect #12453
        if (sum) {
            // Draw the node
            node.shapeType = 'roundedRect';
            node.nodeX = nodeLeft;
            node.nodeY = fromNodeTop;
            var x = nodeLeft, y = fromNodeTop, width = node.options.width || options.width || nodeWidth, height = node.options.height || options.height || nodeHeight;
            // Border radius should not greater than half the height of the node
            // #18956
            var r = clamp(relativeLength((typeof borderRadius === 'object' ?
                borderRadius.radius :
                borderRadius || 0), width), 0, nodeHeight / 2);
            if (chart.inverted) {
                x = nodeLeft - nodeWidth;
                y = chart.plotSizeY - fromNodeTop - nodeHeight;
                width = node.options.height || options.height || nodeWidth;
                height = node.options.width || options.width || nodeHeight;
            }
            // Calculate data label options for the point
            node.dlOptions = SankeySeries.getDLOptions({
                level: this.mapOptionsToLevel[node.level],
                optionsPoint: node.options
            });
            // Pass test in drawPoints
            node.plotX = 1;
            node.plotY = 1;
            // Set the anchor position for tooltips
            node.tooltipPos = chart.inverted ? [
                chart.plotSizeY - y - height / 2,
                chart.plotSizeX - x - width / 2
            ] : [
                x + width / 2,
                y + height / 2
            ];
            node.shapeArgs = {
                x: x,
                y: y,
                width: width,
                height: height,
                r: r,
                display: node.hasShape() ? '' : 'none'
            };
        }
        else {
            node.dlOptions = {
                enabled: false
            };
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    SankeySeries.defaultOptions = merge(ColumnSeries.defaultOptions, SankeySeriesDefaults);
    return SankeySeries;
}(ColumnSeries));
NodesComposition.compose(SankeyPoint, SankeySeries);
extend(SankeySeries.prototype, {
    animate: LineSeries.prototype.animate,
    // Create a single node that holds information on incoming and outgoing
    // links.
    createNode: NodesComposition.createNode,
    forceDL: true,
    invertible: true,
    isCartesian: false,
    orderNodes: true,
    noSharedTooltip: true,
    pointArrayMap: ['from', 'to', 'weight'],
    pointClass: SankeyPoint,
    searchPoint: H.noop
});
SeriesRegistry.registerSeriesType('sankey', SankeySeries);
/* *
 *
 *  Default Export
 *
 * */
export default SankeySeries;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * A node in a sankey diagram.
 *
 * @interface Highcharts.SankeyNodeObject
 * @extends Highcharts.Point
 * @product highcharts
 */ /**
* The color of the auto generated node.
*
* @name Highcharts.SankeyNodeObject#color
* @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
*/ /**
* The color index of the auto generated node, especially for use in styled
* mode.
*
* @name Highcharts.SankeyNodeObject#colorIndex
* @type {number}
*/ /**
* An optional column index of where to place the node. The default behaviour is
* to place it next to the preceding node.
*
* @see {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/sankey-node-column/|Highcharts-Demo:}
*      Specified node column
*
* @name Highcharts.SankeyNodeObject#column
* @type {number}
* @since 6.0.5
*/ /**
* The id of the auto-generated node, refering to the `from` or `to` setting of
* the link.
*
* @name Highcharts.SankeyNodeObject#id
* @type {string}
*/ /**
* The name to display for the node in data labels and tooltips. Use this when
* the name is different from the `id`. Where the id must be unique for each
* node, this is not necessary for the name.
*
* @see {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/sankey/|Highcharts-Demo:}
*         Sankey diagram with node options
*
* @name Highcharts.SankeyNodeObject#name
* @type {string}
* @product highcharts
*/ /**
* This option is deprecated, use
* {@link Highcharts.SankeyNodeObject#offsetHorizontal} and
* {@link Highcharts.SankeyNodeObject#offsetVertical} instead.
*
* The vertical offset of a node in terms of weight. Positive values shift the
* node downwards, negative shift it upwards.
*
* If a percentage string is given, the node is offset by the percentage of the
* node size plus `nodePadding`.
*
* @see {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/sankey-node-column/|Highcharts-Demo:}
*         Specified node offset
*
* @deprecated
* @name Highcharts.SankeyNodeObject#offset
* @type {number|string}
* @default 0
* @since 6.0.5
*/ /**
* The horizontal offset of a node. Positive values shift the node right,
* negative shift it left.
*
* If a percentage string is given, the node is offset by the percentage of the
* node size.
*
* @see {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/sankey-node-column/|Highcharts-Demo:}
*         Specified node offset
*
* @name Highcharts.SankeyNodeObject#offsetHorizontal
* @type {number|string}
* @since 9.3.0
*/ /**
* The vertical offset of a node. Positive values shift the node down,
* negative shift it up.
*
* If a percentage string is given, the node is offset by the percentage of the
* node size.
*
* @see {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/sankey-node-column/|Highcharts-Demo:}
*         Specified node offset
*
* @name Highcharts.SankeyNodeObject#offsetVertical
* @type {number|string}
* @since 9.3.0
*/
/**
 * Formatter callback function.
 *
 * @callback Highcharts.SeriesSankeyDataLabelsFormatterCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Data label context to format
 *
 * @return {string|undefined}
 *         Formatted data label text
 */
''; // Detach doclets above
