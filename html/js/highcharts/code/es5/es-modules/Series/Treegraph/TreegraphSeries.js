/* *
 *
 *  (c) 2010-2024 Pawel Lysy Grzegorz Blachlinski
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
import PU from '../PathUtilities.js';
var getLinkPath = PU.getLinkPath;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var seriesProto = SeriesRegistry.series.prototype, _a = SeriesRegistry.seriesTypes, TreemapSeries = _a.treemap, ColumnSeries = _a.column;
import SVGRenderer from '../../Core/Renderer/SVG/SVGRenderer.js';
var symbols = SVGRenderer.prototype.symbols;
import TreegraphNode from './TreegraphNode.js';
import TreegraphPoint from './TreegraphPoint.js';
import TU from '../TreeUtilities.js';
var getLevelOptions = TU.getLevelOptions, getNodeWidth = TU.getNodeWidth;
import U from '../../Core/Utilities.js';
var arrayMax = U.arrayMax, crisp = U.crisp, extend = U.extend, merge = U.merge, pick = U.pick, relativeLength = U.relativeLength, splat = U.splat;
import TreegraphLink from './TreegraphLink.js';
import TreegraphLayout from './TreegraphLayout.js';
import TreegraphSeriesDefaults from './TreegraphSeriesDefaults.js';
import SVGElement from '../../Core/Renderer/SVG/SVGElement.js';
import TextPath from '../../Extensions/TextPath.js';
TextPath.compose(SVGElement);
/* *
 *
 *  Class
 *
 * */
/**
 * The Treegraph series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.treegraph
 *
 * @augments Highcharts.Series
 */
var TreegraphSeries = /** @class */ (function (_super) {
    __extends(TreegraphSeries, _super);
    function TreegraphSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.nodeList = [];
        _this.links = [];
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    TreegraphSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        this.layoutAlgorythm = new TreegraphLayout();
        // Register the link data labels in the label collector for overlap
        // detection.
        var series = this, collectors = this.chart.labelCollectors, collectorFunc = function () {
            var linkLabels = [];
            // Check links for overlap
            if (series.options.dataLabels &&
                !splat(series.options.dataLabels)[0].allowOverlap) {
                for (var _i = 0, _a = (series.links || []); _i < _a.length; _i++) {
                    var link = _a[_i];
                    if (link.dataLabel) {
                        linkLabels.push(link.dataLabel);
                    }
                }
            }
            return linkLabels;
        };
        // Only add the collector function if it is not present
        if (!collectors.some(function (f) { return f.name === 'collectorFunc'; })) {
            collectors.push(collectorFunc);
        }
    };
    /**
     * Calculate `a` and `b` parameters of linear transformation, where
     * `finalPosition = a * calculatedPosition + b`.
     *
     * @return {LayoutModifiers} `a` and `b` parameter for x and y direction.
     */
    TreegraphSeries.prototype.getLayoutModifiers = function () {
        var _this = this;
        var chart = this.chart, series = this, plotSizeX = chart.plotSizeX, plotSizeY = chart.plotSizeY, columnCount = arrayMax(this.points.map(function (p) { return p.node.xPosition; }));
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxXSize = 0, minXSize = 0, maxYSize = 0, minYSize = 0;
        this.points.forEach(function (point) {
            var _a;
            // When fillSpace is on, stop the layout calculation when the hidden
            // points are reached. (#19038)
            if (_this.options.fillSpace && !point.visible) {
                return;
            }
            var node = point.node, level = series.mapOptionsToLevel[point.node.level] || {}, markerOptions = merge(_this.options.marker, level.marker, point.options.marker), nodeWidth = (_a = markerOptions.width) !== null && _a !== void 0 ? _a : getNodeWidth(_this, columnCount), radius = relativeLength(markerOptions.radius || 0, Math.min(plotSizeX, plotSizeY)), symbol = markerOptions.symbol, nodeSizeY = (symbol === 'circle' || !markerOptions.height) ?
                radius * 2 :
                relativeLength(markerOptions.height, plotSizeY), nodeSizeX = symbol === 'circle' || !nodeWidth ?
                radius * 2 :
                relativeLength(nodeWidth, plotSizeX);
            node.nodeSizeX = nodeSizeX;
            node.nodeSizeY = nodeSizeY;
            var lineWidth;
            if (node.xPosition <= minX) {
                minX = node.xPosition;
                lineWidth = markerOptions.lineWidth || 0;
                minXSize = Math.max(nodeSizeX + lineWidth, minXSize);
            }
            if (node.xPosition >= maxX) {
                maxX = node.xPosition;
                lineWidth = markerOptions.lineWidth || 0;
                maxXSize = Math.max(nodeSizeX + lineWidth, maxXSize);
            }
            if (node.yPosition <= minY) {
                minY = node.yPosition;
                lineWidth = markerOptions.lineWidth || 0;
                minYSize = Math.max(nodeSizeY + lineWidth, minYSize);
            }
            if (node.yPosition >= maxY) {
                maxY = node.yPosition;
                lineWidth = markerOptions.lineWidth || 0;
                maxYSize = Math.max(nodeSizeY + lineWidth, maxYSize);
            }
        });
        // Calculate the values of linear transformation, which will later be
        // applied as `nodePosition = a * x + b` for each direction.
        var ay = maxY === minY ?
            1 :
            (plotSizeY - (minYSize + maxYSize) / 2) / (maxY - minY), by = maxY === minY ? plotSizeY / 2 : -ay * minY + minYSize / 2, ax = maxX === minX ?
            1 :
            (plotSizeX - (maxXSize + maxXSize) / 2) / (maxX - minX), bx = maxX === minX ? plotSizeX / 2 : -ax * minX + minXSize / 2;
        return { ax: ax, bx: bx, ay: ay, by: by };
    };
    TreegraphSeries.prototype.getLinks = function () {
        var _this = this;
        var series = this;
        var links = [];
        this.data.forEach(function (point) {
            var levelOptions = series.mapOptionsToLevel[point.node.level || 0] || {};
            if (point.node.parent) {
                var pointOptions = merge(levelOptions, point.options);
                if (!point.linkToParent || point.linkToParent.destroyed) {
                    var link = new series.LinkClass(series, pointOptions, void 0, point);
                    point.linkToParent = link;
                }
                else {
                    // #19552
                    point.collapsed = pick(point.collapsed, (_this.mapOptionsToLevel[point.node.level] || {}).collapsed);
                    point.linkToParent.visible =
                        point.linkToParent.toNode.visible;
                }
                point.linkToParent.index = links.push(point.linkToParent) - 1;
            }
            else {
                if (point.linkToParent) {
                    series.links.splice(point.linkToParent.index);
                    point.linkToParent.destroy();
                    delete point.linkToParent;
                }
            }
        });
        return links;
    };
    TreegraphSeries.prototype.buildTree = function (id, index, level, list, parent) {
        var point = this.points[index];
        level = (point && point.level) || level;
        return _super.prototype.buildTree.call(this, id, index, level, list, parent);
    };
    TreegraphSeries.prototype.markerAttribs = function () {
        // The super Series.markerAttribs returns { width: NaN, height: NaN },
        // so just disable this for now.
        return {};
    };
    TreegraphSeries.prototype.setCollapsedStatus = function (node, visibility) {
        var _this = this;
        var point = node.point;
        if (point) {
            // Take the level options into account.
            point.collapsed = pick(point.collapsed, (this.mapOptionsToLevel[node.level] || {}).collapsed);
            point.visible = visibility;
            visibility = visibility === false ? false : !point.collapsed;
        }
        node.children.forEach(function (childNode) {
            _this.setCollapsedStatus(childNode, visibility);
        });
    };
    TreegraphSeries.prototype.drawTracker = function () {
        ColumnSeries.prototype.drawTracker.apply(this, arguments);
        ColumnSeries.prototype.drawTracker.call(this, this.links);
    };
    /**
     * Run pre-translation by generating the nodeColumns.
     * @private
     */
    TreegraphSeries.prototype.translate = function () {
        var _this = this;
        var series = this, options = series.options;
        // NOTE: updateRootId modifies series.
        var rootId = TU.updateRootId(series), rootNode;
        // Call prototype function
        seriesProto.translate.call(series);
        var tree = series.tree = series.getTree();
        rootNode = series.nodeMap[rootId];
        if (rootId !== '' && (!rootNode || !rootNode.children.length)) {
            series.setRootNode('', false);
            rootId = series.rootNode;
            rootNode = series.nodeMap[rootId];
        }
        series.mapOptionsToLevel = getLevelOptions({
            from: rootNode.level + 1,
            levels: options.levels,
            to: tree.height,
            defaults: {
                levelIsConstant: series.options.levelIsConstant,
                colorByPoint: options.colorByPoint
            }
        });
        this.setCollapsedStatus(tree, true);
        series.links = series.getLinks();
        series.setTreeValues(tree);
        this.layoutAlgorythm.calculatePositions(series);
        series.layoutModifier = this.getLayoutModifiers();
        this.points.forEach(function (point) {
            _this.translateNode(point);
        });
        this.points.forEach(function (point) {
            if (point.linkToParent) {
                _this.translateLink(point.linkToParent);
            }
        });
        if (!options.colorByPoint) {
            series.setColorRecursive(series.tree);
        }
    };
    TreegraphSeries.prototype.translateLink = function (link) {
        var _a, _b, _c, _d, _e;
        var fromNode = link.fromNode, toNode = link.toNode, linkWidth = ((_a = this.options.link) === null || _a === void 0 ? void 0 : _a.lineWidth) || 0, factor = pick((_b = this.options.link) === null || _b === void 0 ? void 0 : _b.curveFactor, 0.5), type = pick((_c = link.options.link) === null || _c === void 0 ? void 0 : _c.type, (_d = this.options.link) === null || _d === void 0 ? void 0 : _d.type, 'default');
        if (fromNode.shapeArgs && toNode.shapeArgs) {
            var fromNodeWidth = (fromNode.shapeArgs.width || 0), inverted = this.chart.inverted, y1 = crisp((fromNode.shapeArgs.y || 0) +
                (fromNode.shapeArgs.height || 0) / 2, linkWidth), y2 = crisp((toNode.shapeArgs.y || 0) +
                (toNode.shapeArgs.height || 0) / 2, linkWidth);
            var x1 = crisp((fromNode.shapeArgs.x || 0) + fromNodeWidth, linkWidth), x2 = crisp(toNode.shapeArgs.x || 0, linkWidth);
            if (inverted) {
                x1 -= fromNodeWidth;
                x2 += (toNode.shapeArgs.width || 0);
            }
            var diff = toNode.node.xPosition - fromNode.node.xPosition;
            link.shapeType = 'path';
            var fullWidth = Math.abs(x2 - x1) + fromNodeWidth, width = (fullWidth / diff) - fromNodeWidth, offset = width * factor * (inverted ? -1 : 1);
            var xMiddle = crisp((x2 + x1) / 2, linkWidth);
            link.plotX = xMiddle;
            link.plotY = y2;
            link.shapeArgs = {
                d: getLinkPath[type]({
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    width: width,
                    offset: offset,
                    inverted: inverted,
                    parentVisible: toNode.visible,
                    radius: (_e = this.options.link) === null || _e === void 0 ? void 0 : _e.radius
                })
            };
            link.dlBox = {
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2,
                height: linkWidth,
                width: 0
            };
            link.tooltipPos = inverted ? [
                (this.chart.plotSizeY || 0) - link.dlBox.y,
                (this.chart.plotSizeX || 0) - link.dlBox.x
            ] : [
                link.dlBox.x,
                link.dlBox.y
            ];
        }
    };
    /**
     * Private method responsible for adjusting the dataLabel options for each
     * node-point individually.
     */
    TreegraphSeries.prototype.drawNodeLabels = function (points) {
        var _a;
        var _b, _c, _d;
        var series = this, mapOptionsToLevel = series.mapOptionsToLevel;
        var options, level;
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            level = mapOptionsToLevel[point.node.level];
            // Set options to new object to avoid problems with scope
            options = { style: {} };
            // If options for level exists, include them as well
            if (level && level.dataLabels) {
                options = merge(options, level.dataLabels);
                series.hasDataLabels = function () { return true; };
            }
            // Set dataLabel width to the width of the point shape.
            if (point.shapeArgs &&
                series.options.dataLabels) {
                var css = {};
                var _e = point.shapeArgs, _f = _e.width, width = _f === void 0 ? 0 : _f, _g = _e.height, height = _g === void 0 ? 0 : _g;
                if (series.chart.inverted) {
                    _a = [height, width], width = _a[0], height = _a[1];
                }
                if (!((_b = splat(series.options.dataLabels)[0].style) === null || _b === void 0 ? void 0 : _b.width)) {
                    css.width = "".concat(width, "px");
                }
                if (!((_c = splat(series.options.dataLabels)[0].style) === null || _c === void 0 ? void 0 : _c.lineClamp)) {
                    css.lineClamp = Math.floor(height / 16);
                }
                extend(options.style, css);
                (_d = point.dataLabel) === null || _d === void 0 ? void 0 : _d.css(css);
            }
            // Merge custom options with point options
            point.dlOptions = merge(options, point.options.dataLabels);
        }
        seriesProto.drawDataLabels.call(this, points);
    };
    /**
     * Override alignDataLabel so that position is always calculated and the
     * label is faded in and out instead of hidden/shown when collapsing and
     * expanding nodes.
     */
    TreegraphSeries.prototype.alignDataLabel = function (point, dataLabel) {
        var visible = point.visible;
        // Force position calculation and visibility
        point.visible = true;
        _super.prototype.alignDataLabel.apply(this, arguments);
        // Fade in or out
        dataLabel.animate({
            opacity: visible === false ? 0 : 1
        }, void 0, function () {
            // Hide data labels that belong to hidden points (#18891)
            visible || dataLabel.hide();
        });
        // Reset
        point.visible = visible;
    };
    /**
     * Treegraph has two separate collecions of nodes and lines,
     * render dataLabels for both sets.
     */
    TreegraphSeries.prototype.drawDataLabels = function () {
        if (this.options.dataLabels) {
            this.options.dataLabels = splat(this.options.dataLabels);
            // Render node labels.
            this.drawNodeLabels(this.points);
            // Render link labels.
            seriesProto.drawDataLabels.call(this, this.links);
        }
    };
    TreegraphSeries.prototype.destroy = function () {
        // Links must also be destroyed.
        if (this.links) {
            for (var _i = 0, _a = this.links; _i < _a.length; _i++) {
                var link = _a[_i];
                link.destroy();
            }
            this.links.length = 0;
        }
        return seriesProto.destroy.apply(this, arguments);
    };
    /**
     * Return the presentational attributes.
     * @private
     */
    TreegraphSeries.prototype.pointAttribs = function (point, state) {
        var series = this, levelOptions = point &&
            series.mapOptionsToLevel[point.node.level || 0] || {}, options = point && point.options, stateOptions = (levelOptions.states &&
            levelOptions.states[state]) ||
            {};
        if (point) {
            point.options.marker = merge(series.options.marker, levelOptions.marker, point.options.marker);
        }
        var linkColor = pick(stateOptions && stateOptions.link && stateOptions.link.color, options && options.link && options.link.color, levelOptions && levelOptions.link && levelOptions.link.color, series.options.link && series.options.link.color), linkLineWidth = pick(stateOptions && stateOptions.link &&
            stateOptions.link.lineWidth, options && options.link && options.link.lineWidth, levelOptions && levelOptions.link &&
            levelOptions.link.lineWidth, series.options.link && series.options.link.lineWidth), attribs = seriesProto.pointAttribs.call(series, point, state);
        if (point) {
            if (point.isLink) {
                attribs.stroke = linkColor;
                attribs['stroke-width'] = linkLineWidth;
                delete attribs.fill;
            }
            if (!point.visible) {
                attribs.opacity = 0;
            }
        }
        return attribs;
    };
    TreegraphSeries.prototype.drawPoints = function () {
        TreemapSeries.prototype.drawPoints.apply(this, arguments);
        ColumnSeries.prototype.drawPoints.call(this, this.links);
    };
    /**
     * Run translation operations for one node.
     * @private
     */
    TreegraphSeries.prototype.translateNode = function (point) {
        var chart = this.chart, node = point.node, plotSizeY = chart.plotSizeY, plotSizeX = chart.plotSizeX, 
        // Get the layout modifiers which are common for all nodes.
        _a = this.layoutModifier, ax = _a.ax, bx = _a.bx, ay = _a.ay, by = _a.by, x = ax * node.xPosition + bx, y = ay * node.yPosition + by, level = this.mapOptionsToLevel[node.level] || {}, markerOptions = merge(this.options.marker, level.marker, point.options.marker), symbol = markerOptions.symbol, height = node.nodeSizeY, width = node.nodeSizeX, reversed = this.options.reversed, nodeX = node.x = (chart.inverted ?
            plotSizeX - width / 2 - x :
            x - width / 2), nodeY = node.y = (!reversed ?
            plotSizeY - y - height / 2 :
            y - height / 2), borderRadius = pick(point.options.borderRadius, level.borderRadius, this.options.borderRadius), symbolFn = symbols[symbol || 'circle'];
        if (symbolFn === void 0) {
            point.hasImage = true;
            point.shapeType = 'image';
            point.imageUrl = symbol.match(/^url\((.*?)\)$/)[1];
        }
        else {
            point.shapeType = 'path';
        }
        if (!point.visible && point.linkToParent) {
            var parentNode = point.linkToParent.fromNode;
            if (parentNode) {
                var parentShapeArgs = parentNode.shapeArgs || {}, _b = parentShapeArgs.x, x_1 = _b === void 0 ? 0 : _b, _c = parentShapeArgs.y, y_1 = _c === void 0 ? 0 : _c, _d = parentShapeArgs.width, width_1 = _d === void 0 ? 0 : _d, _e = parentShapeArgs.height, height_1 = _e === void 0 ? 0 : _e;
                if (!point.shapeArgs) {
                    point.shapeArgs = {};
                }
                if (!point.hasImage) {
                    extend(point.shapeArgs, {
                        d: symbolFn(x_1, y_1, width_1, height_1, borderRadius ? { r: borderRadius } : void 0)
                    });
                }
                extend(point.shapeArgs, { x: x_1, y: y_1 });
                point.plotX = parentNode.plotX;
                point.plotY = parentNode.plotY;
            }
        }
        else {
            point.plotX = nodeX;
            point.plotY = nodeY;
            point.shapeArgs = {
                x: nodeX,
                y: nodeY,
                width: width,
                height: height,
                cursor: !point.node.isLeaf ? 'pointer' : 'default'
            };
            if (!point.hasImage) {
                point.shapeArgs.d = symbolFn(nodeX, nodeY, width, height, borderRadius ? { r: borderRadius } : void 0);
            }
        }
        // Set the anchor position for tooltip.
        point.tooltipPos = chart.inverted ?
            [plotSizeY - nodeY - height / 2, plotSizeX - nodeX - width / 2] :
            [nodeX + width / 2, nodeY];
    };
    TreegraphSeries.defaultOptions = merge(TreemapSeries.defaultOptions, TreegraphSeriesDefaults);
    return TreegraphSeries;
}(TreemapSeries));
extend(TreegraphSeries.prototype, {
    pointClass: TreegraphPoint,
    NodeClass: TreegraphNode,
    LinkClass: TreegraphLink
});
SeriesRegistry.registerSeriesType('treegraph', TreegraphSeries);
/* *
 *
 *  Default Export
 *
 * */
export default TreegraphSeries;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `treegraph` series. If the [type](#series.treegraph.type)
 * option is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.treegraph
 * @exclude   allowDrillToNode, boostBlending, boostThreshold, curveFactor,
 * centerInCategory, connectEnds, connectNulls, colorAxis, colorKey,
 * dataSorting, dragDrop, findNearestPointBy, getExtremesFromAll, layout,
 * nodePadding,  pointInterval, pointIntervalUnit, pointPlacement, pointStart,
 * relativeXValue, softThreshold, stack, stacking, step,
 * traverseUpButton, xAxis, yAxis, zoneAxis, zones
 * @product   highcharts
 * @requires  modules/treemap
 * @requires  modules/treegraph
 * @apioption series.treegraph
 */
/**
 * @extends   plotOptions.series.marker
 * @excluding enabled, enabledThreshold
 * @apioption series.treegraph.marker
 */
/**
 * @type      {Highcharts.SeriesTreegraphDataLabelsOptionsObject|Array<Highcharts.SeriesTreegraphDataLabelsOptionsObject>}
 * @product   highcharts
 * @apioption series.treegraph.data.dataLabels
 */
/**
 * @sample highcharts/series-treegraph/level-options
 *          Treegraph chart with level options applied
 *
 * @type      {Array<*>}
 * @excluding layoutStartingDirection, layoutAlgorithm
 * @apioption series.treegraph.levels
 */
/**
 * Set collapsed status for nodes level-wise.
 * @type {boolean}
 * @apioption series.treegraph.levels.collapsed
 */
/**
 * Set marker options for nodes at the level.
 * @extends   series.treegraph.marker
 * @apioption series.treegraph.levels.marker
 */
/**
 * An array of data points for the series. For the `treegraph` series type,
 * points can be given in the following ways:
 *
 * 1. The array of arrays, with `keys` property, which defines how the fields in
 *     array should be interpreted
 *    ```js
 *       keys: ['id', 'parent'],
 *       data: [
 *           ['Category1'],
 *           ['Category1', 'Category2']
 *       ]
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the
 *    series' [turboThreshold](#series.area.turboThreshold),
 *    this option is not available.
 *    The data of the treegraph series needs to be formatted in such a way, that
 *    there are no circular dependencies on the nodes
 *
 *  ```js
 *     data: [{
 *         id: 'Category1'
 *     }, {
 *         id: 'Category1',
 *         parent: 'Category2',
 *     }]
 *  ```
 *
 * @type      {Array<*>}
 * @extends   series.treemap.data
 * @product   highcharts
 * @excluding outgoing, weight, value
 * @apioption series.treegraph.data
 */
/**
 * Options used for button, which toggles the collapse status of the node.
 *
 *
 * @apioption series.treegraph.data.collapseButton
 */
/**
 * If point's children should be initially hidden
 *
 * @sample highcharts/series-treegraph/level-options
 *          Treegraph chart with initially hidden children
 *
 * @type {boolean}
 * @apioption series.treegraph.data.collapsed
 */
''; // Gets doclets above into transpiled version
