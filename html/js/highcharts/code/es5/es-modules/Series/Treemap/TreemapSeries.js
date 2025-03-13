/* *
 *
 *  (c) 2014-2024 Highsoft AS
 *
 *  Authors: Jon Arild Nygard / Oystein Moseng
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
import Breadcrumbs from '../../Extensions/Breadcrumbs/Breadcrumbs.js';
import Color from '../../Core/Color/Color.js';
var color = Color.parse;
import ColorMapComposition from '../ColorMapComposition.js';
import H from '../../Core/Globals.js';
var composed = H.composed, noop = H.noop;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, ScatterSeries = _a.scatter;
import TreemapAlgorithmGroup from './TreemapAlgorithmGroup.js';
import TreemapNode from './TreemapNode.js';
import TreemapPoint from './TreemapPoint.js';
import TreemapSeriesDefaults from './TreemapSeriesDefaults.js';
import TreemapUtilities from './TreemapUtilities.js';
import TU from '../TreeUtilities.js';
var getColor = TU.getColor, getLevelOptions = TU.getLevelOptions, updateRootId = TU.updateRootId;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, correctFloat = U.correctFloat, crisp = U.crisp, defined = U.defined, error = U.error, extend = U.extend, fireEvent = U.fireEvent, isArray = U.isArray, isObject = U.isObject, isString = U.isString, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique, splat = U.splat, stableSort = U.stableSort;
/* *
 *
 *  Constants
 *
 * */
var axisMax = 100;
/* *
 *
 *  Variables
 *
 * */
var treemapAxisDefaultValues = false;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function onSeriesAfterBindAxes() {
    var series = this, xAxis = series.xAxis, yAxis = series.yAxis;
    var treeAxis;
    if (xAxis && yAxis) {
        if (series.is('treemap')) {
            treeAxis = {
                endOnTick: false,
                gridLineWidth: 0,
                lineWidth: 0,
                min: 0,
                minPadding: 0,
                max: axisMax,
                maxPadding: 0,
                startOnTick: false,
                title: void 0,
                tickPositions: []
            };
            extend(yAxis.options, treeAxis);
            extend(xAxis.options, treeAxis);
            treemapAxisDefaultValues = true;
        }
        else if (treemapAxisDefaultValues) {
            yAxis.setOptions(yAxis.userOptions);
            xAxis.setOptions(xAxis.userOptions);
            treemapAxisDefaultValues = false;
        }
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.treemap
 *
 * @augments Highcharts.Series
 */
var TreemapSeries = /** @class */ (function (_super) {
    __extends(TreemapSeries, _super);
    function TreemapSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    TreemapSeries.compose = function (SeriesClass) {
        if (pushUnique(composed, 'TreemapSeries')) {
            addEvent(SeriesClass, 'afterBindAxes', onSeriesAfterBindAxes);
        }
    };
    /* *
     *
     *  Function
     *
     * */
    /* eslint-disable valid-jsdoc */
    TreemapSeries.prototype.algorithmCalcPoints = function (directionChange, last, group, childrenArea) {
        var plot = group.plot, end = group.elArr.length - 1;
        var pX, pY, pW, pH, gW = group.lW, gH = group.lH, keep, i = 0;
        if (last) {
            gW = group.nW;
            gH = group.nH;
        }
        else {
            keep = group.elArr[end];
        }
        for (var _i = 0, _a = group.elArr; _i < _a.length; _i++) {
            var p = _a[_i];
            if (last || (i < end)) {
                if (group.direction === 0) {
                    pX = plot.x;
                    pY = plot.y;
                    pW = gW;
                    pH = p / pW;
                }
                else {
                    pX = plot.x;
                    pY = plot.y;
                    pH = gH;
                    pW = p / pH;
                }
                childrenArea.push({
                    x: pX,
                    y: pY,
                    width: pW,
                    height: correctFloat(pH)
                });
                if (group.direction === 0) {
                    plot.y = plot.y + pH;
                }
                else {
                    plot.x = plot.x + pW;
                }
            }
            i = i + 1;
        }
        // Reset variables
        group.reset();
        if (group.direction === 0) {
            group.width = group.width - gW;
        }
        else {
            group.height = group.height - gH;
        }
        plot.y = plot.parent.y + (plot.parent.height - group.height);
        plot.x = plot.parent.x + (plot.parent.width - group.width);
        if (directionChange) {
            group.direction = 1 - group.direction;
        }
        // If not last, then add uncalculated element
        if (!last) {
            group.addElement(keep);
        }
    };
    TreemapSeries.prototype.algorithmFill = function (directionChange, parent, children) {
        var childrenArea = [];
        var pTot, direction = parent.direction, x = parent.x, y = parent.y, width = parent.width, height = parent.height, pX, pY, pW, pH;
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            pTot =
                (parent.width * parent.height) * (child.val / parent.val);
            pX = x;
            pY = y;
            if (direction === 0) {
                pH = height;
                pW = pTot / pH;
                width = width - pW;
                x = x + pW;
            }
            else {
                pW = width;
                pH = pTot / pW;
                height = height - pH;
                y = y + pH;
            }
            childrenArea.push({
                x: pX,
                y: pY,
                width: pW,
                height: pH,
                direction: 0,
                val: 0
            });
            if (directionChange) {
                direction = 1 - direction;
            }
        }
        return childrenArea;
    };
    TreemapSeries.prototype.algorithmLowAspectRatio = function (directionChange, parent, children) {
        var series = this, childrenArea = [], plot = {
            x: parent.x,
            y: parent.y,
            parent: parent
        }, direction = parent.direction, end = children.length - 1, group = new TreemapAlgorithmGroup(parent.height, parent.width, direction, plot);
        var pTot, i = 0;
        // Loop through and calculate all areas
        for (var _i = 0, children_2 = children; _i < children_2.length; _i++) {
            var child = children_2[_i];
            pTot =
                (parent.width * parent.height) * (child.val / parent.val);
            group.addElement(pTot);
            if (group.lP.nR > group.lP.lR) {
                series.algorithmCalcPoints(directionChange, false, group, childrenArea, plot // @todo no supported
                );
            }
            // If last child, then calculate all remaining areas
            if (i === end) {
                series.algorithmCalcPoints(directionChange, true, group, childrenArea, plot // @todo not supported
                );
            }
            ++i;
        }
        return childrenArea;
    };
    /**
     * Over the alignment method by setting z index.
     * @private
     */
    TreemapSeries.prototype.alignDataLabel = function (point, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataLabel, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    labelOptions) {
        ColumnSeries.prototype.alignDataLabel.apply(this, arguments);
        if (point.dataLabel) {
            // `point.node.zIndex` could be undefined (#6956)
            point.dataLabel.attr({ zIndex: (point.node.zIndex || 0) + 1 });
        }
    };
    TreemapSeries.prototype.applyTreeGrouping = function () {
        var series = this, parentList = series.parentList || {}, cluster = series.options.cluster, minimumClusterSize = (cluster === null || cluster === void 0 ? void 0 : cluster.minimumClusterSize) || 5;
        if (cluster === null || cluster === void 0 ? void 0 : cluster.enabled) {
            var parentGroups_1 = {};
            var checkIfHide_1 = function (node) {
                var _a;
                if ((_a = node === null || node === void 0 ? void 0 : node.point) === null || _a === void 0 ? void 0 : _a.shapeArgs) {
                    var _b = node.point.shapeArgs, _c = _b.width, width = _c === void 0 ? 0 : _c, _d = _b.height, height = _d === void 0 ? 0 : _d, area = width * height;
                    var _e = cluster.pixelWidth, pixelWidth = _e === void 0 ? 0 : _e, _f = cluster.pixelHeight, pixelHeight = _f === void 0 ? 0 : _f, compareHeight = defined(pixelHeight), thresholdArea = pixelHeight ?
                        pixelWidth * pixelHeight :
                        pixelWidth * pixelWidth;
                    if (width < pixelWidth ||
                        height < (compareHeight ? pixelHeight : pixelWidth) ||
                        area < thresholdArea) {
                        if (!node.isGroup && defined(node.parent)) {
                            if (!parentGroups_1[node.parent]) {
                                parentGroups_1[node.parent] = [];
                            }
                            parentGroups_1[node.parent].push(node);
                        }
                    }
                }
                node === null || node === void 0 ? void 0 : node.children.forEach(function (child) {
                    checkIfHide_1(child);
                });
            };
            checkIfHide_1(series.tree);
            var _loop_1 = function (parent_1) {
                if (parentGroups_1[parent_1]) {
                    if (parentGroups_1[parent_1].length > minimumClusterSize) {
                        parentGroups_1[parent_1].forEach(function (node) {
                            var index = parentList[parent_1].indexOf(node.i);
                            if (index !== -1) {
                                parentList[parent_1].splice(index, 1);
                                var id_1 = "highcharts-grouped-treemap-points-".concat(node.parent || 'root');
                                var groupPoint = series.points
                                    .find(function (p) { return p.id === id_1; });
                                if (!groupPoint) {
                                    var PointClass = series.pointClass, pointIndex = series.points.length;
                                    groupPoint = new PointClass(series, {
                                        className: cluster.className,
                                        color: cluster.color,
                                        id: id_1,
                                        index: pointIndex,
                                        isGroup: true,
                                        value: 0
                                    });
                                    extend(groupPoint, {
                                        formatPrefix: 'cluster'
                                    });
                                    series.points.push(groupPoint);
                                    parentList[parent_1].push(pointIndex);
                                    parentList[id_1] = [];
                                }
                                var amount = groupPoint.groupedPointsAmount + 1, val = series.points[groupPoint.index]
                                    .options.value || 0, name_1 = cluster.name ||
                                    "+ ".concat(amount);
                                // Update the point directly in points array to
                                // prevent wrong instance update
                                series.points[groupPoint.index]
                                    .groupedPointsAmount = amount;
                                series.points[groupPoint.index].options.value =
                                    val + (node.point.value || 0);
                                series.points[groupPoint.index].name = name_1;
                                parentList[id_1].push(node.point.index);
                            }
                        });
                    }
                }
            };
            for (var parent_1 in parentGroups_1) {
                _loop_1(parent_1);
            }
            series.nodeMap = {};
            series.nodeList = [];
            series.parentList = parentList;
            var tree = series.buildTree('', -1, 0, series.parentList);
            series.translate(tree);
        }
    };
    /**
     * Recursive function which calculates the area for all children of a
     * node.
     *
     * @private
     * @function Highcharts.Series#calculateChildrenAreas
     *
     * @param {Object} parent
     * The node which is parent to the children.
     *
     * @param {Object} area
     * The rectangular area of the parent.
     */
    TreemapSeries.prototype.calculateChildrenAreas = function (parent, area) {
        var series = this, options = series.options, mapOptionsToLevel = series.mapOptionsToLevel, level = mapOptionsToLevel[parent.level + 1], algorithm = pick(((level === null || level === void 0 ? void 0 : level.layoutAlgorithm) &&
            series[level === null || level === void 0 ? void 0 : level.layoutAlgorithm] &&
            level.layoutAlgorithm), series.options.layoutAlgorithm), alternate = options.alternateStartingDirection, 
        // Collect all children which should be included
        children = parent.children.filter(function (n) {
            return parent.isGroup || !n.ignore;
        });
        if (!algorithm) {
            return;
        }
        var childrenValues = [];
        if (level && level.layoutStartingDirection) {
            area.direction = level.layoutStartingDirection === 'vertical' ?
                0 :
                1;
        }
        childrenValues = series[algorithm](area, children);
        var i = -1;
        for (var _i = 0, children_3 = children; _i < children_3.length; _i++) {
            var child = children_3[_i];
            var values = childrenValues[++i];
            child.values = merge(values, {
                val: child.childrenTotal,
                direction: (alternate ? 1 - area.direction : area.direction)
            });
            child.pointValues = merge(values, {
                x: (values.x / series.axisRatio),
                // Flip y-values to avoid visual regression with csvCoord in
                // Axis.translate at setPointValues. #12488
                y: axisMax - values.y - values.height,
                width: (values.width / series.axisRatio)
            });
            // If node has children, then call method recursively
            if (child.children.length) {
                series.calculateChildrenAreas(child, child.values);
            }
        }
    };
    /**
     * Create level list.
     * @private
     */
    TreemapSeries.prototype.createList = function (e) {
        var chart = this.chart, breadcrumbs = chart.breadcrumbs, list = [];
        if (breadcrumbs) {
            var currentLevelNumber = 0;
            list.push({
                level: currentLevelNumber,
                levelOptions: chart.series[0]
            });
            var node = e.target.nodeMap[e.newRootId];
            var extraNodes = [];
            // When the root node is set and has parent,
            // recreate the path from the node tree.
            while (node.parent || node.parent === '') {
                extraNodes.push(node);
                node = e.target.nodeMap[node.parent];
            }
            for (var _i = 0, _a = extraNodes.reverse(); _i < _a.length; _i++) {
                var node_1 = _a[_i];
                list.push({
                    level: ++currentLevelNumber,
                    levelOptions: node_1
                });
            }
            // If the list has only first element, we should clear it
            if (list.length <= 1) {
                list.length = 0;
            }
        }
        return list;
    };
    /**
     * Extend drawDataLabels with logic to handle custom options related to
     * the treemap series:
     *
     * - Points which is not a leaf node, has dataLabels disabled by
     *   default.
     *
     * - Options set on series.levels is merged in.
     *
     * - Width of the dataLabel is set to match the width of the point
     *   shape.
     *
     * @private
     */
    TreemapSeries.prototype.drawDataLabels = function () {
        var _a, _b;
        var series = this, mapOptionsToLevel = series.mapOptionsToLevel, points = series.points.filter(function (n) {
            return n.node.visible || defined(n.dataLabel);
        }), padding = (_a = splat(series.options.dataLabels || {})[0]) === null || _a === void 0 ? void 0 : _a.padding;
        var options, level;
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            level = mapOptionsToLevel[point.node.level];
            // Set options to new object to avoid problems with scope
            options = { style: {} };
            // If not a leaf, then label should be disabled as default
            if (!point.node.isLeaf &&
                !point.node.isGroup ||
                (point.node.isGroup &&
                    point.node.level <= series.nodeMap[series.rootNode].level)) {
                options.enabled = false;
            }
            // If options for level exists, include them as well
            if (level && level.dataLabels) {
                options = merge(options, level.dataLabels);
                series.hasDataLabels = function () { return true; };
            }
            // Set dataLabel width to the width of the point shape minus the
            // padding
            if (point.shapeArgs) {
                var css = {
                    width: ((point.shapeArgs.width || 0) -
                        2 * (options.padding || padding || 0)) + 'px',
                    lineClamp: Math.floor((point.shapeArgs.height || 0) / 16)
                };
                extend(options.style, css);
                (_b = point.dataLabel) === null || _b === void 0 ? void 0 : _b.css(css);
            }
            // Merge custom options with point options
            point.dlOptions = merge(options, point.options.dataLabels);
        }
        _super.prototype.drawDataLabels.call(this, points);
    };
    /**
     * Override drawPoints
     * @private
     */
    TreemapSeries.prototype.drawPoints = function (points) {
        if (points === void 0) { points = this.points; }
        var series = this, chart = series.chart, renderer = chart.renderer, styledMode = chart.styledMode, options = series.options, shadow = styledMode ? {} : options.shadow, borderRadius = options.borderRadius, withinAnimationLimit = chart.pointCount < options.animationLimit, allowTraversingTree = options.allowTraversingTree;
        for (var _i = 0, points_2 = points; _i < points_2.length; _i++) {
            var point = points_2[_i];
            var levelDynamic = point.node.levelDynamic, animatableAttribs = {}, attribs = {}, css = {}, groupKey = 'level-group-' + point.node.level, hasGraphic = !!point.graphic, shouldAnimate = withinAnimationLimit && hasGraphic, shapeArgs = point.shapeArgs;
            // Don't bother with calculate styling if the point is not drawn
            if (point.shouldDraw()) {
                point.isInside = true;
                if (borderRadius) {
                    attribs.r = borderRadius;
                }
                merge(true, // Extend object
                // Which object to extend
                shouldAnimate ? animatableAttribs : attribs, 
                // Add shapeArgs to animate/attr if graphic exists
                hasGraphic ? shapeArgs : {}, 
                // Add style attribs if !styleMode
                styledMode ?
                    {} :
                    series.pointAttribs(point, point.selected ? 'select' : void 0));
                // In styled mode apply point.color. Use CSS, otherwise the
                // fill used in the style sheet will take precedence over
                // the fill attribute.
                if (series.colorAttribs && styledMode) {
                    // Heatmap is loaded
                    extend(css, series.colorAttribs(point));
                }
                if (!series[groupKey]) {
                    series[groupKey] = renderer.g(groupKey)
                        .attr({
                        // @todo Set the zIndex based upon the number of
                        // levels, instead of using 1000
                        zIndex: 1000 - (levelDynamic || 0)
                    })
                        .add(series.group);
                    series[groupKey].survive = true;
                }
            }
            // Draw the point
            point.draw({
                animatableAttribs: animatableAttribs,
                attribs: attribs,
                css: css,
                group: series[groupKey],
                imageUrl: point.imageUrl,
                renderer: renderer,
                shadow: shadow,
                shapeArgs: shapeArgs,
                shapeType: point.shapeType
            });
            // If setRootNode is allowed, set a point cursor on clickables &
            // add drillId to point
            if (allowTraversingTree && point.graphic) {
                point.drillId = options.interactByLeaf ?
                    series.drillToByLeaf(point) :
                    series.drillToByGroup(point);
            }
        }
    };
    /**
     * Finds the drill id for a parent node. Returns false if point should
     * not have a click event.
     * @private
     */
    TreemapSeries.prototype.drillToByGroup = function (point) {
        var drillId = false;
        if ((!point.node.isLeaf ||
            point.node.isGroup) &&
            (point.node.level - this.nodeMap[this.rootNode].level) === 1) {
            drillId = point.id;
        }
        return drillId;
    };
    /**
     * Finds the drill id for a leaf node. Returns false if point should not
     * have a click event
     * @private
     */
    TreemapSeries.prototype.drillToByLeaf = function (point) {
        var traverseToLeaf = point.series.options.traverseToLeaf;
        var drillId = false, nodeParent;
        if ((point.node.parent !== this.rootNode) &&
            point.node.isLeaf) {
            if (traverseToLeaf) {
                drillId = point.id;
            }
            else {
                nodeParent = point.node;
                while (!drillId) {
                    if (typeof nodeParent.parent !== 'undefined') {
                        nodeParent = this.nodeMap[nodeParent.parent];
                    }
                    if (nodeParent.parent === this.rootNode) {
                        drillId = nodeParent.id;
                    }
                }
            }
        }
        return drillId;
    };
    /**
     * @todo remove this function at a suitable version.
     * @private
     */
    TreemapSeries.prototype.drillToNode = function (id, redraw) {
        error(32, false, void 0, { 'treemap.drillToNode': 'use treemap.setRootNode' });
        this.setRootNode(id, redraw);
    };
    TreemapSeries.prototype.drillUp = function () {
        var series = this, node = series.nodeMap[series.rootNode];
        if (node && isString(node.parent)) {
            series.setRootNode(node.parent, true, { trigger: 'traverseUpButton' });
        }
    };
    TreemapSeries.prototype.getExtremes = function () {
        // Get the extremes from the value data
        var _a = _super.prototype.getExtremes.call(this, this.colorValueData), dataMin = _a.dataMin, dataMax = _a.dataMax;
        this.valueMin = dataMin;
        this.valueMax = dataMax;
        // Get the extremes from the y data
        return _super.prototype.getExtremes.call(this);
    };
    /**
     * Creates an object map from parent id to childrens index.
     *
     * @private
     * @function Highcharts.Series#getListOfParents
     *
     * @param {Highcharts.SeriesTreemapDataOptions} [data]
     *        List of points set in options.
     *
     * @param {Array<string>} [existingIds]
     *        List of all point ids.
     *
     * @return {Object}
     *         Map from parent id to children index in data.
     */
    TreemapSeries.prototype.getListOfParents = function (data, existingIds) {
        var arr = isArray(data) ? data : [], ids = isArray(existingIds) ? existingIds : [], listOfParents = arr.reduce(function (prev, curr, i) {
            var parent = pick(curr.parent, '');
            if (typeof prev[parent] === 'undefined') {
                prev[parent] = [];
            }
            prev[parent].push(i);
            return prev;
        }, {
            '': [] // Root of tree
        });
        // If parent does not exist, hoist parent to root of tree.
        for (var _i = 0, _a = Object.keys(listOfParents); _i < _a.length; _i++) {
            var parent_2 = _a[_i];
            var children = listOfParents[parent_2];
            if ((parent_2 !== '') && (ids.indexOf(parent_2) === -1)) {
                for (var _b = 0, children_4 = children; _b < children_4.length; _b++) {
                    var child = children_4[_b];
                    listOfParents[''].push(child);
                }
                delete listOfParents[parent_2];
            }
        }
        return listOfParents;
    };
    /**
     * Creates a tree structured object from the series points.
     * @private
     */
    TreemapSeries.prototype.getTree = function () {
        var series = this, allIds = this.data.map(function (d) {
            return d.id;
        });
        series.parentList = series.getListOfParents(this.data, allIds);
        series.nodeMap = {};
        series.nodeList = [];
        return series.buildTree('', -1, 0, series.parentList || {});
    };
    TreemapSeries.prototype.buildTree = function (id, index, level, list, parent) {
        var series = this, children = [], point = series.points[index];
        var height = 0, child;
        // Actions
        for (var _i = 0, _a = (list[id] || []); _i < _a.length; _i++) {
            var i = _a[_i];
            child = series.buildTree(series.points[i].id, i, level + 1, list, id);
            height = Math.max(child.height + 1, height);
            children.push(child);
        }
        var node = new series.NodeClass().init(id, index, children, height, level, series, parent);
        for (var _b = 0, children_5 = children; _b < children_5.length; _b++) {
            var child_1 = children_5[_b];
            child_1.parentNode = node;
        }
        series.nodeMap[node.id] = node;
        series.nodeList.push(node);
        if (point) {
            point.node = node;
            node.point = point;
        }
        return node;
    };
    /**
     * Define hasData function for non-cartesian series. Returns true if the
     * series has points at all.
     * @private
     */
    TreemapSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    TreemapSeries.prototype.init = function (chart, options) {
        var series = this, breadcrumbsOptions = merge(options.drillUpButton, options.breadcrumbs), setOptionsEvent = addEvent(series, 'setOptions', function (event) {
            var options = event.userOptions;
            if (defined(options.allowDrillToNode) &&
                !defined(options.allowTraversingTree)) {
                options.allowTraversingTree = options.allowDrillToNode;
                delete options.allowDrillToNode;
            }
            if (defined(options.drillUpButton) &&
                !defined(options.traverseUpButton)) {
                options.traverseUpButton = options.drillUpButton;
                delete options.drillUpButton;
            }
        });
        _super.prototype.init.call(this, chart, options);
        // Treemap's opacity is a different option from other series
        delete series.opacity;
        // Handle deprecated options.
        series.eventsToUnbind.push(setOptionsEvent);
        if (series.options.allowTraversingTree) {
            series.eventsToUnbind.push(addEvent(series, 'click', series.onClickDrillToNode));
            series.eventsToUnbind.push(addEvent(series, 'setRootNode', function (e) {
                var chart = series.chart;
                if (chart.breadcrumbs) {
                    // Create a list using the event after drilldown.
                    chart.breadcrumbs.updateProperties(series.createList(e));
                }
            }));
            series.eventsToUnbind.push(addEvent(series, 'update', 
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function (e, redraw) {
                var breadcrumbs = this.chart.breadcrumbs;
                if (breadcrumbs && e.options.breadcrumbs) {
                    breadcrumbs.update(e.options.breadcrumbs);
                }
            }));
            series.eventsToUnbind.push(addEvent(series, 'destroy', function destroyEvents(e) {
                var chart = this.chart;
                if (chart.breadcrumbs && !e.keepEventsForUpdate) {
                    chart.breadcrumbs.destroy();
                    chart.breadcrumbs = void 0;
                }
            }));
        }
        if (!chart.breadcrumbs) {
            chart.breadcrumbs = new Breadcrumbs(chart, breadcrumbsOptions);
        }
        series.eventsToUnbind.push(addEvent(chart.breadcrumbs, 'up', function (e) {
            var drillUpsNumber = this.level - e.newLevel;
            for (var i = 0; i < drillUpsNumber; i++) {
                series.drillUp();
            }
        }));
    };
    /**
     * Add drilling on the suitable points.
     * @private
     */
    TreemapSeries.prototype.onClickDrillToNode = function (event) {
        var series = this, point = event.point, drillId = point && point.drillId;
        // If a drill id is returned, add click event and cursor.
        if (isString(drillId)) {
            point.setState(''); // Remove hover
            series.setRootNode(drillId, true, { trigger: 'click' });
        }
    };
    /**
     * Get presentational attributes
     * @private
     */
    TreemapSeries.prototype.pointAttribs = function (point, state) {
        var series = this, mapOptionsToLevel = (isObject(series.mapOptionsToLevel) ?
            series.mapOptionsToLevel :
            {}), level = point && mapOptionsToLevel[point.node.level] || {}, options = this.options, stateOptions = state && options.states && options.states[state] || {}, className = (point && point.getClassName()) || '', 
        // Set attributes by precedence. Point trumps level trumps series.
        // Stroke width uses pick because it can be 0.
        attr = {
            'stroke': (point && point.borderColor) ||
                level.borderColor ||
                stateOptions.borderColor ||
                options.borderColor,
            'stroke-width': pick(point && point.borderWidth, level.borderWidth, stateOptions.borderWidth, options.borderWidth),
            'dashstyle': (point && point.borderDashStyle) ||
                level.borderDashStyle ||
                stateOptions.borderDashStyle ||
                options.borderDashStyle,
            'fill': (point && point.color) || this.color
        };
        var opacity;
        // Hide levels above the current view
        if (className.indexOf('highcharts-above-level') !== -1) {
            attr.fill = 'none';
            attr['stroke-width'] = 0;
            // Nodes with children that accept interaction
        }
        else if (className.indexOf('highcharts-internal-node-interactive') !== -1) {
            opacity = pick(stateOptions.opacity, options.opacity);
            attr.fill = color(attr.fill).setOpacity(opacity).get();
            attr.cursor = 'pointer';
            // Hide nodes that have children
        }
        else if (className.indexOf('highcharts-internal-node') !== -1) {
            attr.fill = 'none';
        }
        else if (state) {
            // Brighten and hoist the hover nodes
            attr.fill = color(attr.fill)
                .brighten(stateOptions.brightness)
                .get();
        }
        return attr;
    };
    /**
     * Set the node's color recursively, from the parent down.
     * @private
     */
    TreemapSeries.prototype.setColorRecursive = function (node, parentColor, colorIndex, index, siblings) {
        var series = this, chart = series && series.chart, colors = chart && chart.options && chart.options.colors;
        if (node) {
            var colorInfo = getColor(node, {
                colors: colors,
                index: index,
                mapOptionsToLevel: series.mapOptionsToLevel,
                parentColor: parentColor,
                parentColorIndex: colorIndex,
                series: series,
                siblings: siblings
            }), point = series.points[node.i];
            if (point) {
                point.color = colorInfo.color;
                point.colorIndex = colorInfo.colorIndex;
            }
            var i = -1;
            // Do it all again with the children
            for (var _i = 0, _a = (node.children || []); _i < _a.length; _i++) {
                var child = _a[_i];
                series.setColorRecursive(child, colorInfo.color, colorInfo.colorIndex, ++i, node.children.length);
            }
        }
    };
    TreemapSeries.prototype.setPointValues = function () {
        var series = this;
        var points = series.points, xAxis = series.xAxis, yAxis = series.yAxis;
        var styledMode = series.chart.styledMode;
        // Get the crisp correction in classic mode. For this to work in
        // styled mode, we would need to first add the shape (without x,
        // y, width and height), then read the rendered stroke width
        // using point.graphic.strokeWidth(), then modify and apply the
        // shapeArgs. This applies also to column series, but the
        // downside is performance and code complexity.
        var getStrokeWidth = function (point) { return (styledMode ?
            0 :
            (series.pointAttribs(point)['stroke-width'] || 0)); };
        for (var _i = 0, points_3 = points; _i < points_3.length; _i++) {
            var point = points_3[_i];
            var _a = point.node, values = _a.pointValues, visible = _a.visible;
            // Points which is ignored, have no values.
            if (values && visible) {
                var height = values.height, width = values.width, x = values.x, y = values.y;
                var strokeWidth = getStrokeWidth(point);
                var x1 = crisp(xAxis.toPixels(x, true), strokeWidth, true);
                var x2 = crisp(xAxis.toPixels(x + width, true), strokeWidth, true);
                var y1 = crisp(yAxis.toPixels(y, true), strokeWidth, true);
                var y2 = crisp(yAxis.toPixels(y + height, true), strokeWidth, true);
                // Set point values
                var shapeArgs = {
                    x: Math.min(x1, x2),
                    y: Math.min(y1, y2),
                    width: Math.abs(x2 - x1),
                    height: Math.abs(y2 - y1)
                };
                point.plotX = shapeArgs.x + (shapeArgs.width / 2);
                point.plotY = shapeArgs.y + (shapeArgs.height / 2);
                point.shapeArgs = shapeArgs;
            }
            else {
                // Reset visibility
                delete point.plotX;
                delete point.plotY;
            }
        }
    };
    /**
     * Sets a new root node for the series.
     *
     * @private
     * @function Highcharts.Series#setRootNode
     *
     * @param {string} id
     * The id of the new root node.
     *
     * @param {boolean} [redraw=true]
     * Whether to redraw the chart or not.
     *
     * @param {Object} [eventArguments]
     * Arguments to be accessed in event handler.
     *
     * @param {string} [eventArguments.newRootId]
     * Id of the new root.
     *
     * @param {string} [eventArguments.previousRootId]
     * Id of the previous root.
     *
     * @param {boolean} [eventArguments.redraw]
     * Whether to redraw the chart after.
     *
     * @param {Object} [eventArguments.series]
     * The series to update the root of.
     *
     * @param {string} [eventArguments.trigger]
     * The action which triggered the event. Undefined if the setRootNode is
     * called directly.
     *
     * @emits Highcharts.Series#event:setRootNode
     */
    TreemapSeries.prototype.setRootNode = function (id, redraw, eventArguments) {
        var series = this, eventArgs = extend({
            newRootId: id,
            previousRootId: series.rootNode,
            redraw: pick(redraw, true),
            series: series
        }, eventArguments);
        /**
         * The default functionality of the setRootNode event.
         *
         * @private
         * @param {Object} args The event arguments.
         * @param {string} args.newRootId Id of the new root.
         * @param {string} args.previousRootId Id of the previous root.
         * @param {boolean} args.redraw Whether to redraw the chart after.
         * @param {Object} args.series The series to update the root of.
         * @param {string} [args.trigger=undefined] The action which
         * triggered the event. Undefined if the setRootNode is called
         * directly.
             */
        var defaultFn = function (args) {
            var series = args.series;
            // Store previous and new root ids on the series.
            series.idPreviousRoot = args.previousRootId;
            series.rootNode = args.newRootId;
            // Redraw the chart
            series.isDirty = true; // Force redraw
            if (args.redraw) {
                series.chart.redraw();
            }
        };
        // Fire setRootNode event.
        fireEvent(series, 'setRootNode', eventArgs, defaultFn);
    };
    /**
     * Workaround for `inactive` state. Since `series.opacity` option is
     * already reserved, don't use that state at all by disabling
     * `inactiveOtherPoints` and not inheriting states by points.
     * @private
     */
    TreemapSeries.prototype.setState = function (state) {
        this.options.inactiveOtherPoints = true;
        _super.prototype.setState.call(this, state, false);
        this.options.inactiveOtherPoints = false;
    };
    TreemapSeries.prototype.setTreeValues = function (tree) {
        var _a, _b, _c;
        var series = this, options = series.options, idRoot = series.rootNode, mapIdToNode = series.nodeMap, nodeRoot = mapIdToNode[idRoot], levelIsConstant = (typeof options.levelIsConstant === 'boolean' ?
            options.levelIsConstant :
            true), children = [], point = series.points[tree.i];
        // First give the children some values
        var childrenTotal = 0;
        for (var _i = 0, _d = tree.children; _i < _d.length; _i++) {
            var child = _d[_i];
            child = series.setTreeValues(child);
            children.push(child);
            if (!child.ignore) {
                childrenTotal += child.val;
            }
        }
        // Sort the children
        stableSort(children, function (a, b) { return ((a.sortIndex || 0) - (b.sortIndex || 0)); });
        // Set the values
        var val = pick(point && point.options.value, childrenTotal);
        if (point) {
            point.value = val;
        }
        if ((point === null || point === void 0 ? void 0 : point.isGroup) && ((_a = options.cluster) === null || _a === void 0 ? void 0 : _a.reductionFactor)) {
            val /= options.cluster.reductionFactor;
        }
        if (((_c = (_b = tree.parentNode) === null || _b === void 0 ? void 0 : _b.point) === null || _c === void 0 ? void 0 : _c.isGroup) && series.rootNode !== tree.parent) {
            tree.visible = false;
        }
        extend(tree, {
            children: children,
            childrenTotal: childrenTotal,
            // Ignore this node if point is not visible
            ignore: !(pick(point && point.visible, true) && (val > 0)),
            isLeaf: tree.visible && !childrenTotal,
            isGroup: point === null || point === void 0 ? void 0 : point.isGroup,
            levelDynamic: (tree.level - (levelIsConstant ? 0 : nodeRoot.level)),
            name: pick(point && point.name, ''),
            sortIndex: pick(point && point.sortIndex, -val),
            val: val
        });
        return tree;
    };
    TreemapSeries.prototype.sliceAndDice = function (parent, children) {
        return this.algorithmFill(true, parent, children);
    };
    TreemapSeries.prototype.squarified = function (parent, children) {
        return this.algorithmLowAspectRatio(true, parent, children);
    };
    TreemapSeries.prototype.strip = function (parent, children) {
        return this.algorithmLowAspectRatio(false, parent, children);
    };
    TreemapSeries.prototype.stripes = function (parent, children) {
        return this.algorithmFill(false, parent, children);
    };
    TreemapSeries.prototype.translate = function (tree) {
        var _a;
        var series = this, options = series.options, applyGrouping = !tree;
        var // NOTE: updateRootId modifies series.
        rootId = updateRootId(series), rootNode, pointValues, seriesArea, val;
        if (!tree && !rootId.startsWith('highcharts-grouped-treemap-points-')) {
            // Group points are removed, but not destroyed during generatePoints
            (this.points || []).forEach(function (point) {
                if (point.isGroup) {
                    point.destroy();
                }
            });
            // Call prototype function
            _super.prototype.translate.call(this);
            // @todo Only if series.isDirtyData is true
            tree = series.getTree();
        }
        // Ensure `tree` and `series.tree` are synchronized
        series.tree = tree = tree || series.tree;
        rootNode = series.nodeMap[rootId];
        if (rootId !== '' && !rootNode) {
            series.setRootNode('', false);
            rootId = series.rootNode;
            rootNode = series.nodeMap[rootId];
        }
        if (!((_a = rootNode.point) === null || _a === void 0 ? void 0 : _a.isGroup)) {
            series.mapOptionsToLevel = getLevelOptions({
                from: rootNode.level + 1,
                levels: options.levels,
                to: tree.height,
                defaults: {
                    levelIsConstant: series.options.levelIsConstant,
                    colorByPoint: options.colorByPoint
                }
            });
        }
        // Parents of the root node is by default visible
        TreemapUtilities.recursive(series.nodeMap[series.rootNode], function (node) {
            var p = node.parent;
            var next = false;
            node.visible = true;
            if (p || p === '') {
                next = series.nodeMap[p];
            }
            return next;
        });
        // Children of the root node is by default visible
        TreemapUtilities.recursive(series.nodeMap[series.rootNode].children, function (children) {
            var next = false;
            for (var _i = 0, children_6 = children; _i < children_6.length; _i++) {
                var child = children_6[_i];
                child.visible = true;
                if (child.children.length) {
                    next = (next || []).concat(child.children);
                }
            }
            return next;
        });
        series.setTreeValues(tree);
        // Calculate plotting values.
        series.axisRatio = (series.xAxis.len / series.yAxis.len);
        series.nodeMap[''].pointValues = pointValues = {
            x: 0,
            y: 0,
            width: axisMax,
            height: axisMax
        };
        series.nodeMap[''].values = seriesArea = merge(pointValues, {
            width: (pointValues.width * series.axisRatio),
            direction: (options.layoutStartingDirection === 'vertical' ? 0 : 1),
            val: tree.val
        });
        series.calculateChildrenAreas(tree, seriesArea);
        // Logic for point colors
        if (!series.colorAxis &&
            !options.colorByPoint) {
            series.setColorRecursive(series.tree);
        }
        // Update axis extremes according to the root node.
        if (options.allowTraversingTree) {
            if (rootNode.pointValues) {
                val = rootNode.pointValues;
                series.xAxis.setExtremes(val.x, val.x + val.width, false);
                series.yAxis.setExtremes(val.y, val.y + val.height, false);
                series.xAxis.setScale();
                series.yAxis.setScale();
            }
        }
        // Assign values to points.
        series.setPointValues();
        if (applyGrouping) {
            series.applyTreeGrouping();
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    TreemapSeries.defaultOptions = merge(ScatterSeries.defaultOptions, TreemapSeriesDefaults);
    return TreemapSeries;
}(ScatterSeries));
extend(TreemapSeries.prototype, {
    buildKDTree: noop,
    colorAttribs: ColorMapComposition.seriesMembers.colorAttribs,
    colorKey: 'colorValue', // Point color option key
    directTouch: true,
    getExtremesFromAll: true,
    getSymbol: noop,
    optionalAxis: 'colorAxis',
    parallelArrays: ['x', 'y', 'value', 'colorValue'],
    pointArrayMap: ['value', 'colorValue'],
    pointClass: TreemapPoint,
    NodeClass: TreemapNode,
    trackerGroups: ['group', 'dataLabelsGroup'],
    utils: TreemapUtilities
});
ColorMapComposition.compose(TreemapSeries);
SeriesRegistry.registerSeriesType('treemap', TreemapSeries);
/* *
 *
 *  Default Export
 *
 * */
export default TreemapSeries;
