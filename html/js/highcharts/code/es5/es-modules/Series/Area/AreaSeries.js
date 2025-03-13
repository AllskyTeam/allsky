/* *
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import AreaSeriesDefaults from './AreaSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var LineSeries = SeriesRegistry.seriesTypes.line;
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge, objectEach = U.objectEach, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * Area series type.
 *
 * @private
 * @class
 * @name AreaSeries
 *
 * @augments LineSeries
 */
var AreaSeries = /** @class */ (function (_super) {
    __extends(AreaSeries, _super);
    function AreaSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Draw the graph and the underlying area. This method calls the Series
     * base function and adds the area. The areaPath is calculated in the
     * getSegmentPath method called from Series.prototype.drawGraph.
     * @private
     */
    AreaSeries.prototype.drawGraph = function () {
        var _this = this;
        // Define or reset areaPath
        this.areaPath = [];
        // Call the base method
        _super.prototype.drawGraph.apply(this);
        // Define local variables
        var _a = this, areaPath = _a.areaPath, options = _a.options;
        __spreadArray([this], this.zones, true).forEach(function (owner, i) {
            var _a;
            var attribs = {}, fillColor = owner.fillColor || options.fillColor;
            var area = owner.area;
            var verb = area ? 'animate' : 'attr';
            // Create or update the area
            if (area) { // Update
                area.endX = _this.preventGraphAnimation ?
                    null :
                    areaPath.xMap;
                area.animate({ d: areaPath });
            }
            else { // Create
                attribs.zIndex = 0; // #1069
                /**
                 * SVG element of area-based charts. Can be used for styling
                 * purposes. If zones are configured, this element will be
                 * hidden and replaced by multiple zone areas, accessible
                 * via `series.zones[i].area`.
                 *
                 * @name Highcharts.Series#area
                 * @type {Highcharts.SVGElement|undefined}
                 */
                area = owner.area = _this.chart.renderer
                    .path(areaPath)
                    .addClass('highcharts-area' +
                    (i ? " highcharts-zone-area-".concat(i - 1, " ") : ' ') +
                    ((i && owner.className) || ''))
                    .add(_this.group);
                area.isArea = true;
            }
            if (!_this.chart.styledMode) {
                // If there is fillColor defined for the area, set it.
                // Otherwise, we set it to the zone/series color and add
                // fill-opacity (#18939).
                attribs.fill = fillColor || owner.color || _this.color;
                attribs['fill-opacity'] = fillColor ?
                    1 : ((_a = options.fillOpacity) !== null && _a !== void 0 ? _a : 0.75);
                // Allow clicking through the area if sticky tracking is true
                // (#18744)
                area.css({
                    pointerEvents: _this.stickyTracking ? 'none' : 'auto'
                });
            }
            area[verb](attribs);
            area.startX = areaPath.xMap;
            area.shiftUnit = options.step ? 2 : 1;
        });
    };
    /**
     * @private
     */
    AreaSeries.prototype.getGraphPath = function (points) {
        var getGraphPath = LineSeries.prototype.getGraphPath, options = this.options, stacking = options.stacking, yAxis = this.yAxis, bottomPoints = [], graphPoints = [], seriesIndex = this.index, stacks = yAxis.stacking.stacks[this.stackKey], threshold = options.threshold, translatedThreshold = Math.round(// #10909
        yAxis.getThreshold(options.threshold)), connectNulls = pick(// #10574
        options.connectNulls, stacking === 'percent'), 
        // To display null points in underlying stacked series, this
        // series graph must be broken, and the area also fall down to
        // fill the gap left by the null point. #2069
        addDummyPoints = function (i, otherI, side) {
            var point = points[i], stackedValues = stacking &&
                stacks[point.x].points[seriesIndex], nullVal = point[side + 'Null'] || 0, cliffVal = point[side + 'Cliff'] || 0;
            var top, bottom, isNull = true;
            if (cliffVal || nullVal) {
                top = (nullVal ?
                    stackedValues[0] :
                    stackedValues[1]) + cliffVal;
                bottom = stackedValues[0] + cliffVal;
                isNull = !!nullVal;
            }
            else if (!stacking &&
                points[otherI] &&
                points[otherI].isNull) {
                top = bottom = threshold;
            }
            // Add to the top and bottom line of the area
            if (typeof top !== 'undefined') {
                graphPoints.push({
                    plotX: plotX,
                    plotY: top === null ?
                        translatedThreshold :
                        yAxis.getThreshold(top),
                    isNull: isNull,
                    isCliff: true
                });
                bottomPoints.push({
                    plotX: plotX,
                    plotY: bottom === null ?
                        translatedThreshold :
                        yAxis.getThreshold(bottom),
                    doCurve: false // #1041, gaps in areaspline areas
                });
            }
        };
        var plotX, isNull, yBottom;
        // Find what points to use
        points = points || this.points;
        // Fill in missing points
        if (stacking) {
            points = this.getStackPoints(points);
        }
        for (var i = 0, iEnd = points.length; i < iEnd; ++i) {
            // Reset after series.update of stacking property (#12033)
            if (!stacking) {
                points[i].leftCliff = points[i].rightCliff =
                    points[i].leftNull = points[i].rightNull = void 0;
            }
            isNull = points[i].isNull;
            plotX = pick(points[i].rectPlotX, points[i].plotX);
            yBottom = stacking ?
                pick(points[i].yBottom, translatedThreshold) :
                translatedThreshold;
            if (!isNull || connectNulls) {
                if (!connectNulls) {
                    addDummyPoints(i, i - 1, 'left');
                }
                // Skip null point when stacking is false and connectNulls
                // true
                if (!(isNull && !stacking && connectNulls)) {
                    graphPoints.push(points[i]);
                    bottomPoints.push({
                        x: i,
                        plotX: plotX,
                        plotY: yBottom
                    });
                }
                if (!connectNulls) {
                    addDummyPoints(i, i + 1, 'right');
                }
            }
        }
        var topPath = getGraphPath.call(this, graphPoints, true, true);
        bottomPoints.reversed = true;
        var bottomPath = getGraphPath.call(this, bottomPoints, true, true);
        var firstBottomPoint = bottomPath[0];
        if (firstBottomPoint && firstBottomPoint[0] === 'M') {
            bottomPath[0] = ['L', firstBottomPoint[1], firstBottomPoint[2]];
        }
        var areaPath = topPath.concat(bottomPath);
        if (areaPath.length) {
            areaPath.push(['Z']);
        }
        // TODO: don't set leftCliff and rightCliff when connectNulls?
        var graphPath = getGraphPath
            .call(this, graphPoints, false, connectNulls);
        if (this.chart.series.length > 1 &&
            stacking &&
            graphPoints.some(function (point) { return point.isCliff; })) {
            areaPath.hasStackedCliffs = graphPath.hasStackedCliffs = true;
        }
        areaPath.xMap = topPath.xMap;
        this.areaPath = areaPath;
        return graphPath;
    };
    /**
     * Return an array of stacked points, where null and missing points are
     * replaced by dummy points in order for gaps to be drawn correctly in
     * stacks.
     * @private
     */
    AreaSeries.prototype.getStackPoints = function (points) {
        var series = this, segment = [], keys = [], xAxis = this.xAxis, yAxis = this.yAxis, stack = yAxis.stacking.stacks[this.stackKey], pointMap = {}, yAxisSeries = yAxis.series, seriesLength = yAxisSeries.length, upOrDown = yAxis.options.reversedStacks ? 1 : -1, seriesIndex = yAxisSeries.indexOf(series);
        points = points || this.points;
        if (this.options.stacking) {
            for (var i = 0; i < points.length; i++) {
                // Reset after point update (#7326)
                points[i].leftNull = points[i].rightNull = void 0;
                // Create a map where we can quickly look up the points by
                // their X values.
                pointMap[points[i].x] = points[i];
            }
            // Sort the keys (#1651)
            objectEach(stack, function (stackX, x) {
                // Nulled after switching between
                // grouping and not (#1651, #2336)
                if (stackX.total !== null) {
                    keys.push(x);
                }
            });
            keys.sort(function (a, b) {
                return a - b;
            });
            var visibleSeries_1 = yAxisSeries.map(function (s) { return s.visible; });
            keys.forEach(function (x, idx) {
                var y = 0, stackPoint, stackedValues;
                if (pointMap[x] && !pointMap[x].isNull) {
                    segment.push(pointMap[x]);
                    // Find left and right cliff. -1 goes left, 1 goes
                    // right.
                    [-1, 1].forEach(function (direction) {
                        var nullName = direction === 1 ?
                            'rightNull' :
                            'leftNull', cliffName = direction === 1 ?
                            'rightCliff' :
                            'leftCliff', otherStack = stack[keys[idx + direction]];
                        var cliff = 0;
                        // If there is a stack next to this one,
                        // to the left or to the right...
                        if (otherStack) {
                            var i = seriesIndex;
                            // Can go either up or down,
                            // depending on reversedStacks
                            while (i >= 0 && i < seriesLength) {
                                var si = yAxisSeries[i].index;
                                stackPoint = otherStack.points[si];
                                if (!stackPoint) {
                                    // If the next point in this series is
                                    // missing, mark the point with
                                    // point.leftNull or point.rightNull = true.
                                    if (si === series.index) {
                                        pointMap[x][nullName] = true;
                                        // If there are missing points in the next
                                        // stack in any of the series below this
                                        // one, we need to subtract the missing
                                        // values and add a hiatus to the left or
                                        // right.
                                    }
                                    else if (visibleSeries_1[i]) {
                                        stackedValues = stack[x].points[si];
                                        if (stackedValues) {
                                            cliff -= (stackedValues[1] -
                                                stackedValues[0]);
                                        }
                                    }
                                }
                                // When reversedStacks is true, loop up,
                                // else loop down
                                i += upOrDown;
                            }
                        }
                        pointMap[x][cliffName] = cliff;
                    });
                    // There is no point for this X value in this series, so we
                    // insert a dummy point in order for the areas to be drawn
                    // correctly.
                }
                else {
                    // Loop down the stack to find the series below this
                    // one that has a value (#1991)
                    var i = seriesIndex;
                    while (i >= 0 && i < seriesLength) {
                        var si = yAxisSeries[i].index;
                        stackPoint = stack[x].points[si];
                        if (stackPoint) {
                            y = stackPoint[1];
                            break;
                        }
                        // When reversedStacks is true, loop up, else loop
                        // down
                        i += upOrDown;
                    }
                    y = pick(y, 0);
                    y = yAxis.translate(// #6272
                    y, 0, 1, 0, 1);
                    segment.push({
                        isNull: true,
                        plotX: xAxis.translate(// #6272
                        x, 0, 0, 0, 1),
                        x: x,
                        plotY: y,
                        yBottom: y
                    });
                }
            });
        }
        return segment;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    AreaSeries.defaultOptions = merge(LineSeries.defaultOptions, AreaSeriesDefaults);
    return AreaSeries;
}(LineSeries));
extend(AreaSeries.prototype, {
    singleStacks: false
});
SeriesRegistry.registerSeriesType('area', AreaSeries);
/* *
 *
 *  Default Export
 *
 * */
export default AreaSeries;
