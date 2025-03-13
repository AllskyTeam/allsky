/* *
 *
 *  This module implements sunburst charts in Highcharts.
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Authors: Jon Arild Nygard
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
import CU from '../CenteredUtilities.js';
var getCenter = CU.getCenter, getStartAndEndRadians = CU.getStartAndEndRadians;
import H from '../../Core/Globals.js';
var noop = H.noop;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, TreemapSeries = _a.treemap;
import SunburstPoint from './SunburstPoint.js';
import SunburstUtilities from './SunburstUtilities.js';
import TU from '../TreeUtilities.js';
var getColor = TU.getColor, getLevelOptions = TU.getLevelOptions, setTreeValues = TU.setTreeValues, updateRootId = TU.updateRootId;
import U from '../../Core/Utilities.js';
import SunburstNode from './SunburstNode.js';
import SunburstSeriesDefaults from './SunburstSeriesDefaults.js';
var defined = U.defined, error = U.error, extend = U.extend, fireEvent = U.fireEvent, isNumber = U.isNumber, isObject = U.isObject, isString = U.isString, merge = U.merge, splat = U.splat;
import SVGElement from '../../Core/Renderer/SVG/SVGElement.js';
import TextPath from '../../Extensions/TextPath.js';
TextPath.compose(SVGElement);
/* *
 *
 *  Constants
 *
 * */
var rad2deg = 180 / Math.PI;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function isBoolean(x) {
    return typeof x === 'boolean';
}
/**
 * Find a set of coordinates given a start coordinates, an angle, and a
 * distance.
 *
 * @private
 * @function getEndPoint
 *
 * @param {number} x
 *        Start coordinate x
 *
 * @param {number} y
 *        Start coordinate y
 *
 * @param {number} angle
 *        Angle in radians
 *
 * @param {number} distance
 *        Distance from start to end coordinates
 *
 * @return {Highcharts.SVGAttributes}
 *         Returns the end coordinates, x and y.
 */
var getEndPoint = function getEndPoint(x, y, angle, distance) {
    return {
        x: x + (Math.cos(angle) * distance),
        y: y + (Math.sin(angle) * distance)
    };
};
/** @private */
function getDlOptions(params) {
    var _a;
    // Set options to new object to avoid problems with scope
    var point = params.point, shape = isObject(params.shapeArgs) ? params.shapeArgs : {}, optionsPoint = (isObject(params.optionsPoint) ?
        params.optionsPoint.dataLabels :
        {}), 
    // The splat was used because levels dataLabels
    // options doesn't work as an array
    optionsLevel = splat(isObject(params.level) ?
        params.level.dataLabels :
        {})[0], options = merge({
        style: {}
    }, optionsLevel, optionsPoint), _b = point.innerArcLength, innerArcLength = _b === void 0 ? 0 : _b, _c = point.outerArcLength, outerArcLength = _c === void 0 ? 0 : _c;
    var rotationRad, rotation, rotationMode = options.rotationMode;
    if (!isNumber(options.rotation)) {
        if (rotationMode === 'auto' || rotationMode === 'circular') {
            if (options.useHTML &&
                rotationMode === 'circular') {
                // Change rotationMode to 'auto' to avoid using text paths
                // for HTML labels, see #18953
                rotationMode = 'auto';
            }
            if (innerArcLength < 1 &&
                outerArcLength > shape.radius) {
                rotationRad = 0;
                // Trigger setTextPath function to get textOutline etc.
                if (point.dataLabelPath && rotationMode === 'circular') {
                    options.textPath = {
                        enabled: true
                    };
                }
            }
            else if (innerArcLength > 1 &&
                outerArcLength > 1.5 * shape.radius) {
                if (rotationMode === 'circular') {
                    options.textPath = {
                        enabled: true,
                        attributes: {
                            dy: 5
                        }
                    };
                }
                else {
                    rotationMode = 'parallel';
                }
            }
            else {
                // Trigger the destroyTextPath function
                if (((_a = point.dataLabel) === null || _a === void 0 ? void 0 : _a.textPath) &&
                    rotationMode === 'circular') {
                    options.textPath = {
                        enabled: false
                    };
                }
                rotationMode = 'perpendicular';
            }
        }
        if (rotationMode !== 'auto' && rotationMode !== 'circular') {
            if (point.dataLabel && point.dataLabel.textPath) {
                options.textPath = {
                    enabled: false
                };
            }
            rotationRad = (shape.end -
                (shape.end - shape.start) / 2);
        }
        if (rotationMode === 'parallel') {
            options.style.width = Math.min(shape.radius * 2.5, (outerArcLength + innerArcLength) / 2);
        }
        else {
            if (!defined(options.style.width) &&
                shape.radius) {
                options.style.width = point.node.level === 1 ?
                    2 * shape.radius :
                    shape.radius;
            }
        }
        if (rotationMode === 'perpendicular') {
            // 16 is the inferred line height. We don't know the real line
            // yet because the label is not rendered. A better approach for this
            // would be to hide the label from the `alignDataLabel` function
            // when the actual line height is known.
            if (outerArcLength < 16) {
                options.style.width = 1;
            }
            else {
                options.style.lineClamp = Math.floor(innerArcLength / 16) || 1;
            }
        }
        // Apply padding (#8515)
        options.style.width = Math.max(options.style.width - 2 * (options.padding || 0), 1);
        rotation = (rotationRad * rad2deg) % 180;
        if (rotationMode === 'parallel') {
            rotation -= 90;
        }
        // Prevent text from rotating upside down
        if (rotation > 90) {
            rotation -= 180;
        }
        else if (rotation < -90) {
            rotation += 180;
        }
        options.rotation = rotation;
    }
    if (options.textPath) {
        if (point.shapeExisting.innerR === 0 &&
            options.textPath.enabled) {
            // Enable rotation to render text
            options.rotation = 0;
            // Center dataLabel - disable textPath
            options.textPath.enabled = false;
            // Setting width and padding
            options.style.width = Math.max((point.shapeExisting.r * 2) -
                2 * (options.padding || 0), 1);
        }
        else if (point.dlOptions &&
            point.dlOptions.textPath &&
            !point.dlOptions.textPath.enabled &&
            (rotationMode === 'circular')) {
            // Bring dataLabel back if was a center dataLabel
            options.textPath.enabled = true;
        }
        if (options.textPath.enabled) {
            // Enable rotation to render text
            options.rotation = 0;
            // Setting width and padding
            options.style.width = Math.max((point.outerArcLength +
                point.innerArcLength) / 2 -
                2 * (options.padding || 0), 1);
            options.style.whiteSpace = 'nowrap';
        }
    }
    return options;
}
/** @private */
function getAnimation(shape, params) {
    var point = params.point, radians = params.radians, innerR = params.innerR, idRoot = params.idRoot, idPreviousRoot = params.idPreviousRoot, shapeExisting = params.shapeExisting, shapeRoot = params.shapeRoot, shapePreviousRoot = params.shapePreviousRoot, visible = params.visible;
    var from = {}, to = {
        end: shape.end,
        start: shape.start,
        innerR: shape.innerR,
        r: shape.r,
        x: shape.x,
        y: shape.y
    };
    if (visible) {
        // Animate points in
        if (!point.graphic && shapePreviousRoot) {
            if (idRoot === point.id) {
                from = {
                    start: radians.start,
                    end: radians.end
                };
            }
            else {
                from = (shapePreviousRoot.end <= shape.start) ? {
                    start: radians.end,
                    end: radians.end
                } : {
                    start: radians.start,
                    end: radians.start
                };
            }
            // Animate from center and outwards.
            from.innerR = from.r = innerR;
        }
    }
    else {
        // Animate points out
        if (point.graphic) {
            if (idPreviousRoot === point.id) {
                to = {
                    innerR: innerR,
                    r: innerR
                };
            }
            else if (shapeRoot) {
                to = (shapeRoot.end <= shapeExisting.start) ?
                    {
                        innerR: innerR,
                        r: innerR,
                        start: radians.end,
                        end: radians.end
                    } : {
                    innerR: innerR,
                    r: innerR,
                    start: radians.start,
                    end: radians.start
                };
            }
        }
    }
    return {
        from: from,
        to: to
    };
}
/** @private */
function getDrillId(point, idRoot, mapIdToNode) {
    var node = point.node;
    var drillId, nodeRoot;
    if (!node.isLeaf) {
        // When it is the root node, the drillId should be set to parent.
        if (idRoot === point.id) {
            nodeRoot = mapIdToNode[idRoot];
            drillId = nodeRoot.parent;
        }
        else {
            drillId = point.id;
        }
    }
    return drillId;
}
/** @private */
function cbSetTreeValuesBefore(node, options) {
    var mapIdToNode = options.mapIdToNode, parent = node.parent, nodeParent = parent ? mapIdToNode[parent] : void 0, series = options.series, chart = series.chart, points = series.points, point = points[node.i], colors = series.options.colors || chart && chart.options.colors, colorInfo = getColor(node, {
        colors: colors,
        colorIndex: series.colorIndex,
        index: options.index,
        mapOptionsToLevel: options.mapOptionsToLevel,
        parentColor: nodeParent && nodeParent.color,
        parentColorIndex: nodeParent && nodeParent.colorIndex,
        series: options.series,
        siblings: options.siblings
    });
    node.color = colorInfo.color;
    node.colorIndex = colorInfo.colorIndex;
    if (point) {
        point.color = node.color;
        point.colorIndex = node.colorIndex;
        // Set slicing on node, but avoid slicing the top node.
        node.sliced = (node.id !== options.idRoot) ? point.sliced : false;
    }
    return node;
}
/* *
 *
 *  Class
 *
 * */
var SunburstSeries = /** @class */ (function (_super) {
    __extends(SunburstSeries, _super);
    function SunburstSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    SunburstSeries.prototype.alignDataLabel = function (point, dataLabel, labelOptions) {
        if (labelOptions.textPath && labelOptions.textPath.enabled) {
            return;
        }
        return _super.prototype.alignDataLabel.apply(this, arguments);
    };
    /**
     * Animate the slices in. Similar to the animation of polar charts.
     * @private
     */
    SunburstSeries.prototype.animate = function (init) {
        var chart = this.chart, center = [
            chart.plotWidth / 2,
            chart.plotHeight / 2
        ], plotLeft = chart.plotLeft, plotTop = chart.plotTop, group = this.group;
        var attribs;
        // Initialize the animation
        if (init) {
            // Scale down the group and place it in the center
            attribs = {
                translateX: center[0] + plotLeft,
                translateY: center[1] + plotTop,
                scaleX: 0.001, // #1499
                scaleY: 0.001,
                rotation: 10,
                opacity: 0.01
            };
            group.attr(attribs);
            // Run the animation
        }
        else {
            attribs = {
                translateX: plotLeft,
                translateY: plotTop,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                opacity: 1
            };
            group.animate(attribs, this.options.animation);
        }
    };
    SunburstSeries.prototype.drawPoints = function () {
        var series = this, mapOptionsToLevel = series.mapOptionsToLevel, shapeRoot = series.shapeRoot, group = series.group, hasRendered = series.hasRendered, idRoot = series.rootNode, idPreviousRoot = series.idPreviousRoot, nodeMap = series.nodeMap, nodePreviousRoot = nodeMap[idPreviousRoot], shapePreviousRoot = nodePreviousRoot && nodePreviousRoot.shapeArgs, points = series.points, radians = series.startAndEndRadians, chart = series.chart, optionsChart = chart && chart.options && chart.options.chart || {}, animation = (isBoolean(optionsChart.animation) ?
            optionsChart.animation :
            true), positions = series.center, center = {
            x: positions[0],
            y: positions[1]
        }, innerR = positions[3] / 2, renderer = series.chart.renderer, hackDataLabelAnimation = !!(animation &&
            hasRendered &&
            idRoot !== idPreviousRoot &&
            series.dataLabelsGroup);
        var animateLabels, animateLabelsCalled = false, addedHack = false;
        if (hackDataLabelAnimation) {
            series.dataLabelsGroup.attr({ opacity: 0 });
            animateLabels = function () {
                var s = series;
                animateLabelsCalled = true;
                if (s.dataLabelsGroup) {
                    s.dataLabelsGroup.animate({
                        opacity: 1,
                        visibility: 'inherit'
                    });
                }
            };
        }
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            var node = point.node, level = mapOptionsToLevel[node.level], shapeExisting = (point.shapeExisting || {}), shape = node.shapeArgs || {}, visible = !!(node.visible && node.shapeArgs);
            var animationInfo = void 0, onComplete = void 0;
            // Border radius requires the border-radius.js module. Adding it
            // here because the SunburstSeries is a mess and I can't find the
            // regular shapeArgs. Usually shapeArgs are created in the series'
            // `translate` function and then passed directly on to the renderer
            // in the `drawPoints` function.
            shape.borderRadius = series.options.borderRadius;
            if (hasRendered && animation) {
                animationInfo = getAnimation(shape, {
                    center: center,
                    point: point,
                    radians: radians,
                    innerR: innerR,
                    idRoot: idRoot,
                    idPreviousRoot: idPreviousRoot,
                    shapeExisting: shapeExisting,
                    shapeRoot: shapeRoot,
                    shapePreviousRoot: shapePreviousRoot,
                    visible: visible
                });
            }
            else {
                // When animation is disabled, attr is called from animation.
                animationInfo = {
                    to: shape,
                    from: {}
                };
            }
            extend(point, {
                shapeExisting: shape, // Store for use in animation
                tooltipPos: [shape.plotX, shape.plotY],
                drillId: getDrillId(point, idRoot, nodeMap),
                name: '' + (point.name || point.id || point.index),
                plotX: shape.plotX, // Used for data label position
                plotY: shape.plotY, // Used for data label position
                value: node.val,
                isInside: visible,
                isNull: !visible // Used for dataLabels & point.draw
            });
            point.dlOptions = getDlOptions({
                point: point,
                level: level,
                optionsPoint: point.options,
                shapeArgs: shape
            });
            if (!addedHack && visible) {
                addedHack = true;
                onComplete = animateLabels;
            }
            point.draw({
                animatableAttribs: animationInfo.to,
                attribs: extend(animationInfo.from, (!chart.styledMode && series.pointAttribs(point, (point.selected && 'select')))),
                onComplete: onComplete,
                group: group,
                renderer: renderer,
                shapeType: 'arc',
                shapeArgs: shape
            });
        }
        // Draw data labels after points
        // TODO draw labels one by one to avoid additional looping
        if (hackDataLabelAnimation && addedHack) {
            series.hasRendered = false;
            series.options.dataLabels.defer = true;
            ColumnSeries.prototype.drawDataLabels.call(series);
            series.hasRendered = true;
            // If animateLabels is called before labels were hidden, then call
            // it again.
            if (animateLabelsCalled) {
                animateLabels();
            }
        }
        else {
            ColumnSeries.prototype.drawDataLabels.call(series);
        }
        series.idPreviousRoot = idRoot;
    };
    /**
     * The layout algorithm for the levels.
     * @private
     */
    SunburstSeries.prototype.layoutAlgorithm = function (parent, children, options) {
        var startAngle = parent.start;
        var range = parent.end - startAngle, total = parent.val, x = parent.x, y = parent.y, radius = ((options &&
            isObject(options.levelSize) &&
            isNumber(options.levelSize.value)) ?
            options.levelSize.value :
            0), innerRadius = parent.r, outerRadius = innerRadius + radius, slicedOffset = options && isNumber(options.slicedOffset) ?
            options.slicedOffset :
            0;
        return (children || []).reduce(function (arr, child) {
            var percentage = (1 / total) * child.val, radians = percentage * range, radiansCenter = startAngle + (radians / 2), offsetPosition = getEndPoint(x, y, radiansCenter, slicedOffset), values = {
                x: child.sliced ? offsetPosition.x : x,
                y: child.sliced ? offsetPosition.y : y,
                innerR: innerRadius,
                r: outerRadius,
                radius: radius,
                start: startAngle,
                end: startAngle + radians
            };
            arr.push(values);
            startAngle = values.end;
            return arr;
        }, []);
    };
    SunburstSeries.prototype.setRootNode = function (id, redraw, eventArguments) {
        var series = this;
        if ( // If the target node is the only one at level 1, skip it. (#18658)
        series.nodeMap[id].level === 1 &&
            series.nodeList
                .filter(function (node) { return node.level === 1; })
                .length === 1) {
            if (series.idPreviousRoot === '') {
                return;
            }
            id = '';
        }
        _super.prototype.setRootNode.call(this, id, redraw, eventArguments);
    };
    /**
     * Set the shape arguments on the nodes. Recursive from root down.
     * @private
     */
    SunburstSeries.prototype.setShapeArgs = function (parent, parentValues, mapOptionsToLevel) {
        var level = parent.level + 1, options = mapOptionsToLevel[level], 
        // Collect all children which should be included
        children = parent.children.filter(function (n) {
            return n.visible;
        }), twoPi = 6.28; // Two times Pi.
        var childrenValues = [];
        childrenValues = this.layoutAlgorithm(parentValues, children, options);
        var i = -1;
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            var values = childrenValues[++i], angle = values.start + ((values.end - values.start) / 2), radius = values.innerR + ((values.r - values.innerR) / 2), radians = (values.end - values.start), isCircle = (values.innerR === 0 && radians > twoPi), center = (isCircle ?
                { x: values.x, y: values.y } :
                getEndPoint(values.x, values.y, angle, radius)), val = (child.val ?
                (child.childrenTotal > child.val ?
                    child.childrenTotal :
                    child.val) :
                child.childrenTotal);
            // The inner arc length is a convenience for data label filters.
            if (this.points[child.i]) {
                this.points[child.i].innerArcLength = radians * values.innerR;
                this.points[child.i].outerArcLength = radians * values.r;
            }
            child.shapeArgs = merge(values, {
                plotX: center.x,
                plotY: center.y
            });
            child.values = merge(values, {
                val: val
            });
            // If node has children, then call method recursively
            if (child.children.length) {
                this.setShapeArgs(child, child.values, mapOptionsToLevel);
            }
        }
    };
    SunburstSeries.prototype.translate = function () {
        var series = this, options = series.options, positions = series.center = series.getCenter(), radians = series.startAndEndRadians = getStartAndEndRadians(options.startAngle, options.endAngle), innerRadius = positions[3] / 2, outerRadius = positions[2] / 2, diffRadius = outerRadius - innerRadius, 
        // NOTE: updateRootId modifies series.
        rootId = updateRootId(series);
        var mapIdToNode = series.nodeMap, mapOptionsToLevel, nodeRoot = mapIdToNode && mapIdToNode[rootId], nodeIds = {};
        series.shapeRoot = nodeRoot && nodeRoot.shapeArgs;
        series.generatePoints();
        fireEvent(series, 'afterTranslate');
        // @todo Only if series.isDirtyData is true
        var tree = series.tree = series.getTree();
        // Render traverseUpButton, after series.nodeMap i calculated.
        mapIdToNode = series.nodeMap;
        nodeRoot = mapIdToNode[rootId];
        var idTop = isString(nodeRoot.parent) ? nodeRoot.parent : '', nodeTop = mapIdToNode[idTop], _a = SunburstUtilities.getLevelFromAndTo(nodeRoot), from = _a.from, to = _a.to;
        mapOptionsToLevel = getLevelOptions({
            from: from,
            levels: series.options.levels,
            to: to,
            defaults: {
                colorByPoint: options.colorByPoint,
                dataLabels: options.dataLabels,
                levelIsConstant: options.levelIsConstant,
                levelSize: options.levelSize,
                slicedOffset: options.slicedOffset
            }
        });
        // NOTE consider doing calculateLevelSizes in a callback to
        // getLevelOptions
        mapOptionsToLevel = SunburstUtilities.calculateLevelSizes(mapOptionsToLevel, {
            diffRadius: diffRadius,
            from: from,
            to: to
        });
        // TODO Try to combine setTreeValues & setColorRecursive to avoid
        //  unnecessary looping.
        setTreeValues(tree, {
            before: cbSetTreeValuesBefore,
            idRoot: rootId,
            levelIsConstant: options.levelIsConstant,
            mapOptionsToLevel: mapOptionsToLevel,
            mapIdToNode: mapIdToNode,
            points: series.points,
            series: series
        });
        var values = mapIdToNode[''].shapeArgs = {
            end: radians.end,
            r: innerRadius,
            start: radians.start,
            val: nodeRoot.val,
            x: positions[0],
            y: positions[1]
        };
        this.setShapeArgs(nodeTop, values, mapOptionsToLevel);
        // Set mapOptionsToLevel on series for use in drawPoints.
        series.mapOptionsToLevel = mapOptionsToLevel;
        // #10669 - verify if all nodes have unique ids
        for (var _i = 0, _b = series.points; _i < _b.length; _i++) {
            var point = _b[_i];
            if (nodeIds[point.id]) {
                error(31, false, series.chart);
            }
            // Map
            nodeIds[point.id] = true;
        }
        // Reset object
        nodeIds = {};
    };
    /* *
     *
     *  Static Properties
     *
     * */
    SunburstSeries.defaultOptions = merge(TreemapSeries.defaultOptions, SunburstSeriesDefaults);
    return SunburstSeries;
}(TreemapSeries));
extend(SunburstSeries.prototype, {
    axisTypes: [],
    drawDataLabels: noop, // `drawDataLabels` is called in `drawPoints`
    getCenter: getCenter,
    isCartesian: false,
    // Mark that the sunburst is supported by the series on point feature.
    onPointSupported: true,
    pointAttribs: ColumnSeries.prototype.pointAttribs,
    pointClass: SunburstPoint,
    NodeClass: SunburstNode,
    utils: SunburstUtilities
});
SeriesRegistry.registerSeriesType('sunburst', SunburstSeries);
/* *
 *
 *  Default Export
 *
 * */
export default SunburstSeries;
