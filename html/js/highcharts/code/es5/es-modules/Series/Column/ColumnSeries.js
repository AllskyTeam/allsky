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
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import Color from '../../Core/Color/Color.js';
var color = Color.parse;
import ColumnSeriesDefaults from './ColumnSeriesDefaults.js';
import H from '../../Core/Globals.js';
var noop = H.noop;
import Series from '../../Core/Series/Series.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import U from '../../Core/Utilities.js';
var clamp = U.clamp, crisp = U.crisp, defined = U.defined, extend = U.extend, fireEvent = U.fireEvent, isArray = U.isArray, isNumber = U.isNumber, merge = U.merge, pick = U.pick, objectEach = U.objectEach;
/* *
 *
 *  Class
 *
 * */
/**
 * The column series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.column
 *
 * @augments Highcharts.Series
 */
var ColumnSeries = /** @class */ (function (_super) {
    __extends(ColumnSeries, _super);
    function ColumnSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Animate the column heights one by one from zero.
     *
     * @private
     * @function Highcharts.seriesTypes.column#animate
     *
     * @param {boolean} init
     *        Whether to initialize the animation or run it
     */
    ColumnSeries.prototype.animate = function (init) {
        var series = this, yAxis = this.yAxis, yAxisPos = yAxis.pos, reversed = yAxis.reversed, options = series.options, _a = this.chart, clipOffset = _a.clipOffset, inverted = _a.inverted, attr = {}, translateProp = inverted ?
            'translateX' :
            'translateY';
        var translateStart, translatedThreshold;
        if (init && clipOffset) {
            attr.scaleY = 0.001;
            translatedThreshold = clamp(yAxis.toPixels(options.threshold || 0), yAxisPos, yAxisPos + yAxis.len);
            if (inverted) {
                // Make sure the columns don't cover the axis line during
                // entrance animation
                translatedThreshold += reversed ?
                    -Math.floor(clipOffset[0]) :
                    Math.ceil(clipOffset[2]);
                attr.translateX = translatedThreshold - yAxis.len;
            }
            else {
                // Make sure the columns don't cover the axis line during
                // entrance animation
                translatedThreshold += reversed ?
                    Math.ceil(clipOffset[0]) :
                    -Math.floor(clipOffset[2]);
                attr.translateY = translatedThreshold;
            }
            // Apply final clipping (used in Highcharts Stock) (#7083)
            // animation is done by scaleY, so clipping is for panes
            if (series.clipBox) {
                series.setClip();
            }
            series.group.attr(attr);
        }
        else { // Run the animation
            translateStart = Number(series.group.attr(translateProp));
            series.group.animate({ scaleY: 1 }, extend(animObject(series.options.animation), {
                // Do the scale synchronously to ensure smooth
                // updating (#5030, #7228)
                step: function (val, fx) {
                    if (series.group) {
                        attr[translateProp] = translateStart +
                            fx.pos * (yAxisPos - translateStart);
                        series.group.attr(attr);
                    }
                }
            }));
        }
    };
    /**
     * Initialize the series. Extends the basic Series.init method by
     * marking other series of the same type as dirty.
     *
     * @private
     * @function Highcharts.seriesTypes.column#init
     */
    ColumnSeries.prototype.init = function (chart, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options) {
        _super.prototype.init.apply(this, arguments);
        var series = this;
        chart = series.chart;
        // If the series is added dynamically, force redraw of other
        // series affected by a new column
        if (chart.hasRendered) {
            chart.series.forEach(function (otherSeries) {
                if (otherSeries.type === series.type) {
                    otherSeries.isDirty = true;
                }
            });
        }
    };
    /**
     * Return the width and x offset of the columns adjusted for grouping,
     * groupPadding, pointPadding, pointWidth etc.
     *
     * @private
     * @function Highcharts.seriesTypes.column#getColumnMetrics
     */
    ColumnSeries.prototype.getColumnMetrics = function () {
        var _a, _b;
        var series = this, options = series.options, xAxis = series.xAxis, yAxis = series.yAxis, reversedStacks = xAxis.options.reversedStacks, 
        // Keep backward compatibility: reversed xAxis had reversed
        // stacks
        reverseStacks = (xAxis.reversed && !reversedStacks) ||
            (!xAxis.reversed && reversedStacks), stackGroups = {};
        var stackKey, columnCount = 0;
        // Get the total number of column type series. This is called on
        // every series. Consider moving this logic to a chart.orderStacks()
        // function and call it on init, addSeries and removeSeries
        if (options.grouping === false) {
            columnCount = 1;
        }
        else {
            series.chart.series.forEach(function (otherSeries) {
                var otherYAxis = otherSeries.yAxis, otherOptions = otherSeries.options;
                var columnIndex;
                if (otherSeries.type === series.type &&
                    otherSeries.reserveSpace() &&
                    yAxis.len === otherYAxis.len &&
                    yAxis.pos === otherYAxis.pos) { // #642, #2086
                    if (otherOptions.stacking &&
                        otherOptions.stacking !== 'group') {
                        stackKey = otherSeries.stackKey;
                        if (typeof stackGroups[stackKey] ===
                            'undefined') {
                            stackGroups[stackKey] = columnCount++;
                        }
                        columnIndex = stackGroups[stackKey];
                    }
                    else if (otherOptions.grouping !== false) { // #1162
                        columnIndex = columnCount++;
                    }
                    otherSeries.columnIndex = columnIndex;
                }
            });
        }
        var categoryWidth = Math.min(Math.abs(xAxis.transA) * ((!((_a = xAxis.brokenAxis) === null || _a === void 0 ? void 0 : _a.hasBreaks) && ((_b = xAxis.ordinal) === null || _b === void 0 ? void 0 : _b.slope)) ||
            options.pointRange ||
            xAxis.closestPointRange ||
            xAxis.tickInterval ||
            1), // #2610
        xAxis.len // #1535
        ), groupPadding = categoryWidth * options.groupPadding, groupWidth = categoryWidth - 2 * groupPadding, pointOffsetWidth = groupWidth / (columnCount || 1), pointWidth = Math.min(options.maxPointWidth || xAxis.len, pick(options.pointWidth, pointOffsetWidth * (1 - 2 * options.pointPadding))), pointPadding = (pointOffsetWidth - pointWidth) / 2, 
        // #1251, #3737
        colIndex = (series.columnIndex || 0) + (reverseStacks ? 1 : 0), pointXOffset = pointPadding +
            (groupPadding +
                colIndex * pointOffsetWidth -
                (categoryWidth / 2)) * (reverseStacks ? -1 : 1);
        // Save it for reading in linked series (Error bars particularly)
        series.columnMetrics = {
            width: pointWidth,
            offset: pointXOffset,
            paddedWidth: pointOffsetWidth,
            columnCount: columnCount
        };
        return series.columnMetrics;
    };
    /**
     * Make the columns crisp. The edges are rounded to the nearest full
     * pixel.
     *
     * @private
     * @function Highcharts.seriesTypes.column#crispCol
     */
    ColumnSeries.prototype.crispCol = function (x, y, width, height) {
        var borderWidth = this.borderWidth, inverted = this.chart.inverted, bottom = crisp(y + height, borderWidth, inverted);
        // Vertical
        y = crisp(y, borderWidth, inverted);
        height = bottom - y;
        // Horizontal. We need to first compute the exact right edge, then
        // round it and compute the width from there.
        if (this.options.crisp) {
            var right = crisp(x + width, borderWidth);
            x = crisp(x, borderWidth);
            width = right - x;
        }
        return { x: x, y: y, width: width, height: height };
    };
    /**
     * Adjust for missing columns, according to the `centerInCategory`
     * option. Missing columns are either single points or stacks where the
     * point or points are either missing or null.
     *
     * @private
     * @function Highcharts.seriesTypes.column#adjustForMissingColumns
     * @param {number} x
     * The x coordinate of the column, left side
     *
     * @param {number} pointWidth
     * The pointWidth, already computed upstream
     *
     * @param {Highcharts.ColumnPoint} point
     * The point instance
     *
     * @param {Highcharts.ColumnMetricsObject} metrics
     * The series-wide column metrics
     *
     * @return {number}
     * The adjusted x position, or the original if not adjusted
     */
    ColumnSeries.prototype.adjustForMissingColumns = function (x, pointWidth, point, metrics) {
        var _this = this;
        var _a;
        if (!point.isNull && metrics.columnCount > 1) {
            var visibleSeries_1 = this.xAxis.series
                .filter(function (s) { return s.visible; })
                .map(function (s) { return s.index; });
            var indexInCategory_1 = 0, totalInCategory_1 = 0;
            // Loop over all the stacks on the Y axis. When stacking is enabled,
            // these are real point stacks. When stacking is not enabled, but
            // `centerInCategory` is true, there is one stack handling the
            // grouping of points in each category. This is done in the
            // `setGroupedPoints` function.
            objectEach((_a = this.xAxis.stacking) === null || _a === void 0 ? void 0 : _a.stacks, function (stack) {
                var _a;
                var points = typeof point.x === 'number' ?
                    (_a = stack[point.x.toString()]) === null || _a === void 0 ? void 0 : _a.points :
                    void 0, pointValues = points === null || points === void 0 ? void 0 : points[_this.index], yStackMap = {};
                // Look for the index
                if (points && isArray(pointValues)) {
                    var baseIndex_1 = _this.index;
                    // If there are multiple points with the same X then
                    // gather all series in category, and assign index
                    var seriesIndexes = Object
                        .keys(points)
                        .filter(function (pointKey) {
                        // Filter out duplicate X's
                        return !pointKey.match(',') &&
                            // Filter out null points
                            points[pointKey] &&
                            points[pointKey].length > 1;
                    })
                        .map(parseFloat)
                        .filter(function (index) {
                        return visibleSeries_1.indexOf(index) !== -1;
                    })
                        // When the series `stack` option is defined, assign
                        // all subsequent column of the same stack to the
                        // same index as the base column of the stack, then
                        // filter out the original series index so that
                        // `seriesIndexes` is shortened to the amount of
                        // stacks, not the amount of series (#20550).
                        .filter(function (index) {
                        var otherOptions = _this.chart.series[index]
                            .options, yStack = otherOptions.stacking &&
                            otherOptions.stack;
                        if (defined(yStack)) {
                            if (isNumber(yStackMap[yStack])) {
                                if (baseIndex_1 === index) {
                                    baseIndex_1 = yStackMap[yStack];
                                }
                                return false;
                            }
                            yStackMap[yStack] = index;
                        }
                        return true;
                    })
                        .sort(function (a, b) { return b - a; });
                    indexInCategory_1 = seriesIndexes.indexOf(baseIndex_1);
                    totalInCategory_1 = seriesIndexes.length;
                }
            });
            indexInCategory_1 = this.xAxis.reversed ?
                totalInCategory_1 - 1 - indexInCategory_1 : indexInCategory_1;
            // Compute the adjusted x position
            var boxWidth = (totalInCategory_1 - 1) * metrics.paddedWidth +
                pointWidth;
            x = (point.plotX || 0) + boxWidth / 2 - pointWidth -
                indexInCategory_1 * metrics.paddedWidth;
        }
        return x;
    };
    /**
     * Translate each point to the plot area coordinate system and find
     * shape positions
     *
     * @private
     * @function Highcharts.seriesTypes.column#translate
     */
    ColumnSeries.prototype.translate = function () {
        var series = this, chart = series.chart, options = series.options, dense = series.dense =
            series.closestPointRange * series.xAxis.transA < 2, borderWidth = series.borderWidth = pick(options.borderWidth, dense ? 0 : 1 // #3635
        ), xAxis = series.xAxis, yAxis = series.yAxis, threshold = options.threshold, minPointLength = pick(options.minPointLength, 5), metrics = series.getColumnMetrics(), seriesPointWidth = metrics.width, seriesXOffset = series.pointXOffset = metrics.offset, dataMin = series.dataMin, dataMax = series.dataMax, translatedThreshold = series.translatedThreshold =
            yAxis.getThreshold(threshold);
        // Postprocessed for border width
        var seriesBarW = series.barW =
            Math.max(seriesPointWidth, 1 + 2 * borderWidth);
        // When the pointPadding is 0, we want the columns to be packed
        // tightly, so we allow individual columns to have individual sizes.
        // When pointPadding is greater, we strive for equal-width columns
        // (#2694).
        if (options.pointPadding && options.crisp) {
            seriesBarW = Math.ceil(seriesBarW);
        }
        Series.prototype.translate.apply(series);
        // Record the new values
        series.points.forEach(function (point) {
            var yBottom = pick(point.yBottom, translatedThreshold), safeDistance = 999 + Math.abs(yBottom), plotX = point.plotX || 0, 
            // Don't draw too far outside plot area (#1303, #2241,
            // #4264)
            plotY = clamp(point.plotY, -safeDistance, yAxis.len + safeDistance);
            var up, barY = Math.min(plotY, yBottom), barH = Math.max(plotY, yBottom) - barY, pointWidth = seriesPointWidth, barX = plotX + seriesXOffset, barW = seriesBarW;
            // Handle options.minPointLength
            if (minPointLength && Math.abs(barH) < minPointLength) {
                barH = minPointLength;
                up = (!yAxis.reversed && !point.negative) ||
                    (yAxis.reversed && point.negative);
                // Reverse zeros if there's no positive value in the series
                // in visible range (#7046)
                if (isNumber(threshold) &&
                    isNumber(dataMax) &&
                    point.y === threshold &&
                    dataMax <= threshold &&
                    // And if there's room for it (#7311)
                    (yAxis.min || 0) < threshold &&
                    // If all points are the same value (i.e zero) not draw
                    // as negative points (#10646), but only if there's room
                    // for it (#14876)
                    (dataMin !== dataMax || (yAxis.max || 0) <= threshold)) {
                    up = !up;
                    point.negative = !point.negative;
                }
                // If stacked...
                barY = (Math.abs(barY - translatedThreshold) > minPointLength ?
                    // ...keep position
                    yBottom - minPointLength :
                    // #1485, #4051
                    translatedThreshold -
                        (up ? minPointLength : 0));
            }
            // Handle point.options.pointWidth
            // @todo Handle grouping/stacking too. Calculate offset properly
            if (defined(point.options.pointWidth)) {
                pointWidth = barW =
                    Math.ceil(point.options.pointWidth);
                barX -= Math.round((pointWidth - seriesPointWidth) / 2);
            }
            // Adjust for null or missing points
            if (options.centerInCategory) {
                barX = series.adjustForMissingColumns(barX, pointWidth, point, metrics);
            }
            // Cache for access in polar
            point.barX = barX;
            point.pointWidth = pointWidth;
            // Fix the tooltip on center of grouped columns (#1216, #424,
            // #3648)
            point.tooltipPos = chart.inverted ?
                [
                    clamp(yAxis.len + yAxis.pos - chart.plotLeft - plotY, yAxis.pos - chart.plotLeft, yAxis.len + yAxis.pos - chart.plotLeft),
                    xAxis.len + xAxis.pos - chart.plotTop - barX - barW / 2,
                    barH
                ] :
                [
                    xAxis.left - chart.plotLeft + barX + barW / 2,
                    clamp(plotY + yAxis.pos -
                        chart.plotTop, yAxis.pos - chart.plotTop, yAxis.len + yAxis.pos - chart.plotTop),
                    barH
                ];
            // Register shape type and arguments to be used in drawPoints. Allow
            // `shapeType` defined on `pointClass` level.
            point.shapeType = series.pointClass.prototype.shapeType ||
                'roundedRect';
            point.shapeArgs = series.crispCol(barX, 
            // #3169, drilldown from null must have a position to work from.
            // #6585, dataLabel should be placed on xAxis, not floating in
            // the middle of the chart.
            point.isNull ? translatedThreshold : barY, barW, point.isNull ? 0 : barH);
        });
        // Fire a specific event after column translate. We could instead apply
        // all the column logic in an `afterTranslate` event handler, but there
        // are so many other series types that use the column translation, that
        // it is more convenient to have a specific event for it.
        fireEvent(this, 'afterColumnTranslate');
    };
    /**
     * Columns have no graph
     *
     * @private
     * @function Highcharts.seriesTypes.column#drawGraph
     */
    ColumnSeries.prototype.drawGraph = function () {
        this.group[this.dense ? 'addClass' : 'removeClass']('highcharts-dense-data');
    };
    /**
     * Get presentational attributes
     *
     * @private
     * @function Highcharts.seriesTypes.column#pointAttribs
     */
    ColumnSeries.prototype.pointAttribs = function (point, state) {
        var options = this.options, p2o = this.pointAttrToOptions || {}, strokeOption = p2o.stroke || 'borderColor', strokeWidthOption = p2o['stroke-width'] || 'borderWidth';
        var stateOptions, zone, brightness, fill = (point && point.color) || this.color, 
        // Set to fill when borderColor null:
        stroke = ((point && point[strokeOption]) ||
            options[strokeOption] ||
            fill), dashstyle = (point && point.options.dashStyle) || options.dashStyle, strokeWidth = (point && point[strokeWidthOption]) ||
            options[strokeWidthOption] ||
            this[strokeWidthOption] || 0, opacity = pick(point && point.opacity, options.opacity, 1);
        // Handle zone colors
        if (point && this.zones.length) {
            zone = point.getZone();
            // When zones are present, don't use point.color (#4267).
            // Changed order (#6527), added support for colorAxis (#10670)
            fill = (point.options.color ||
                (zone && (zone.color || point.nonZonedColor)) ||
                this.color);
            if (zone) {
                stroke = zone.borderColor || stroke;
                dashstyle = zone.dashStyle || dashstyle;
                strokeWidth = zone.borderWidth || strokeWidth;
            }
        }
        // Select or hover states
        if (state && point) {
            stateOptions = merge(options.states[state], 
            // #6401
            point.options.states &&
                point.options.states[state] ||
                {});
            brightness = stateOptions.brightness;
            fill =
                stateOptions.color || (typeof brightness !== 'undefined' &&
                    color(fill)
                        .brighten(stateOptions.brightness)
                        .get()) || fill;
            stroke = stateOptions[strokeOption] || stroke;
            strokeWidth =
                stateOptions[strokeWidthOption] || strokeWidth;
            dashstyle = stateOptions.dashStyle || dashstyle;
            opacity = pick(stateOptions.opacity, opacity);
        }
        var ret = {
            fill: fill,
            stroke: stroke,
            'stroke-width': strokeWidth,
            opacity: opacity
        };
        if (dashstyle) {
            ret.dashstyle = dashstyle;
        }
        return ret;
    };
    /**
     * Draw the columns. For bars, the series.group is rotated, so the same
     * coordinates apply for columns and bars. This method is inherited by
     * scatter series.
     *
     * @private
     * @function Highcharts.seriesTypes.column#drawPoints
     */
    ColumnSeries.prototype.drawPoints = function (points) {
        if (points === void 0) { points = this.points; }
        var series = this, chart = this.chart, options = series.options, renderer = chart.renderer, animationLimit = options.animationLimit || 250;
        var shapeArgs;
        // Draw the columns
        points.forEach(function (point) {
            var plotY = point.plotY;
            var graphic = point.graphic, hasGraphic = !!graphic, verb = graphic && chart.pointCount < animationLimit ?
                'animate' : 'attr';
            if (isNumber(plotY) && point.y !== null) {
                shapeArgs = point.shapeArgs;
                // When updating a series between 2d and 3d or cartesian and
                // polar, the shape type changes.
                if (graphic && point.hasNewShapeType()) {
                    graphic = graphic.destroy();
                }
                // Set starting position for point sliding animation.
                if (series.enabledDataSorting) {
                    point.startXPos = series.xAxis.reversed ?
                        -(shapeArgs ? (shapeArgs.width || 0) : 0) :
                        series.xAxis.width;
                }
                if (!graphic) {
                    point.graphic = graphic =
                        renderer[point.shapeType](shapeArgs)
                            .add(point.group || series.group);
                    if (graphic &&
                        series.enabledDataSorting &&
                        chart.hasRendered &&
                        chart.pointCount < animationLimit) {
                        graphic.attr({
                            x: point.startXPos
                        });
                        hasGraphic = true;
                        verb = 'animate';
                    }
                }
                if (graphic && hasGraphic) { // Update
                    graphic[verb](merge(shapeArgs));
                }
                // Presentational
                if (!chart.styledMode) {
                    graphic[verb](series.pointAttribs(point, (point.selected && 'select')))
                        .shadow(point.allowShadow !== false && options.shadow);
                }
                if (graphic) {
                    graphic.addClass(point.getClassName(), true);
                    graphic.attr({
                        visibility: point.visible ? 'inherit' : 'hidden'
                    });
                }
            }
            else if (graphic) {
                point.graphic = graphic.destroy(); // #1269
            }
        });
    };
    /**
     * Draw the tracker for a point.
     * @private
     */
    ColumnSeries.prototype.drawTracker = function (points) {
        if (points === void 0) { points = this.points; }
        var series = this, chart = series.chart, pointer = chart.pointer, onMouseOver = function (e) {
            pointer === null || pointer === void 0 ? void 0 : pointer.normalize(e);
            var point = pointer === null || pointer === void 0 ? void 0 : pointer.getPointFromEvent(e), 
            // Run point events only for points inside plot area, #21136
            isInsidePlot = chart.scrollablePlotArea ?
                chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop, {
                    visiblePlotOnly: true
                }) : true;
            // Undefined on graph in scatterchart
            if (pointer &&
                point &&
                series.options.enableMouseTracking &&
                isInsidePlot) {
                pointer.isDirectTouch = true;
                point.onMouseOver(e);
            }
        };
        var dataLabels;
        // Add reference to the point
        points.forEach(function (point) {
            dataLabels = (isArray(point.dataLabels) ?
                point.dataLabels :
                (point.dataLabel ? [point.dataLabel] : []));
            if (point.graphic) {
                point.graphic.element.point = point;
            }
            dataLabels.forEach(function (dataLabel) {
                (dataLabel.div || dataLabel.element).point = point;
            });
        });
        // Add the event listeners, we need to do this only once
        if (!series._hasTracking) {
            series.trackerGroups.forEach(function (key) {
                if (series[key]) {
                    // We don't always have dataLabelsGroup
                    series[key]
                        .addClass('highcharts-tracker')
                        .on('mouseover', onMouseOver)
                        .on('mouseout', function (e) {
                        pointer === null || pointer === void 0 ? void 0 : pointer.onTrackerMouseOut(e);
                    })
                        .on('touchstart', onMouseOver);
                    if (!chart.styledMode && series.options.cursor) {
                        series[key]
                            .css({ cursor: series.options.cursor });
                    }
                }
            });
            series._hasTracking = true;
        }
        fireEvent(this, 'afterDrawTracker');
    };
    /**
     * Remove this series from the chart
     *
     * @private
     * @function Highcharts.seriesTypes.column#remove
     */
    ColumnSeries.prototype.remove = function () {
        var series = this, chart = series.chart;
        // Column and bar series affects other series of the same type
        // as they are either stacked or grouped
        if (chart.hasRendered) {
            chart.series.forEach(function (otherSeries) {
                if (otherSeries.type === series.type) {
                    otherSeries.isDirty = true;
                }
            });
        }
        Series.prototype.remove.apply(series, arguments);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    ColumnSeries.defaultOptions = merge(Series.defaultOptions, ColumnSeriesDefaults);
    return ColumnSeries;
}(Series));
extend(ColumnSeries.prototype, {
    // When tooltip is not shared, this series (and derivatives) requires
    // direct touch/hover. KD-tree does not apply.
    directTouch: true,
    getSymbol: noop,
    // Use separate negative stacks, unlike area stacks where a negative
    // point is subtracted from previous (#1910)
    negStacks: true,
    trackerGroups: ['group', 'dataLabelsGroup']
});
SeriesRegistry.registerSeriesType('column', ColumnSeries);
/* *
 *
 *  Default Export
 *
 * */
export default ColumnSeries;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Adjusted width and x offset of the columns for grouping.
 *
 * @private
 * @interface Highcharts.ColumnMetricsObject
 */ /**
* Width of the columns.
* @name Highcharts.ColumnMetricsObject#width
* @type {number}
*/ /**
* Offset of the columns.
* @name Highcharts.ColumnMetricsObject#offset
* @type {number}
*/
''; // Detach doclets above
