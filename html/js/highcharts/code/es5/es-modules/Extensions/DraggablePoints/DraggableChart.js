/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  Authors: Øystein Moseng, Torstein Hønsi, Jon A. Nygård
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import DDU from './DragDropUtilities.js';
var addEvents = DDU.addEvents, countProps = DDU.countProps, getFirstProp = DDU.getFirstProp, getNormalizedEvent = DDU.getNormalizedEvent;
import DragDropDefaults from './DragDropDefaults.js';
import H from '../../Core/Globals.js';
var doc = H.doc;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, isArray = U.isArray, merge = U.merge, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Add events to document and chart if the chart is draggable.
 *
 * @private
 * @function addDragDropEvents
 * @param {Highcharts.Chart} chart
 *        The chart to add events to.
 */
function addDragDropEvents(chart) {
    var container = chart.container;
    // Only enable if we have a draggable chart
    if (isChartDraggable(chart)) {
        addEvents(container, ['mousedown', 'touchstart'], function (e) {
            mouseDown(getNormalizedEvent(e, chart), chart);
        });
        addEvents(container, ['mousemove', 'touchmove'], function (e) {
            mouseMove(getNormalizedEvent(e, chart), chart);
        }, {
            passive: false
        });
        addEvent(container, 'mouseleave', function (e) {
            mouseUp(getNormalizedEvent(e, chart), chart);
        });
        chart.unbindDragDropMouseUp = addEvents(doc, ['mouseup', 'touchend'], function (e) {
            mouseUp(getNormalizedEvent(e, chart), chart);
        }, {
            passive: false
        });
        // Add flag to avoid doing this again
        chart.hasAddedDragDropEvents = true;
        // Add cleanup to make sure we don't pollute document
        addEvent(chart, 'destroy', function () {
            if (chart.unbindDragDropMouseUp) {
                chart.unbindDragDropMouseUp();
            }
        });
    }
}
/**
 * Remove the chart's drag handles if they exist.
 *
 * @private
 * @function Highcharts.Chart#hideDragHandles
 */
function chartHideDragHandles() {
    var chart = this, dragHandles = (chart.dragHandles || {});
    if (dragHandles) {
        for (var _i = 0, _a = Object.keys(dragHandles); _i < _a.length; _i++) {
            var key = _a[_i];
            if (dragHandles[key].destroy) {
                dragHandles[key].destroy();
            }
        }
        delete chart.dragHandles;
    }
}
/**
 * Set the state of the guide box.
 *
 * @private
 * @function Highcharts.Chart#setGuideBoxState
 * @param {string} state
 *        The state to set the guide box to.
 * @param {Highcharts.Dictionary<Highcharts.DragDropGuideBoxOptionsObject>} [options]
 *        Additional overall guideBox options to consider.
 * @return {Highcharts.SVGElement}
 *         The modified guide box.
 */
function chartSetGuideBoxState(state, options) {
    var guideBox = this.dragGuideBox, guideBoxOptions = merge(DragDropDefaults.guideBox, options), stateOptions = merge(guideBoxOptions['default'], // eslint-disable-line dot-notation
    guideBoxOptions[state]);
    return guideBox
        .attr({
        'class': stateOptions.className,
        stroke: stateOptions.lineColor,
        strokeWidth: stateOptions.lineWidth,
        fill: stateOptions.color,
        cursor: stateOptions.cursor,
        zIndex: stateOptions.zIndex
    })
        // Use pointerEvents 'none' to avoid capturing the click event
        .css({ pointerEvents: 'none' });
}
/**
 * Check whether the zoomKey or panKey is pressed.
 *
 * @private
 * @function zoomOrPanKeyPressed
 * @param {global.Event} e
 *        A mouse event.
 * @return {boolean}
 *         True if the zoom or pan keys are pressed. False otherwise.
 */
function chartZoomOrPanKeyPressed(e) {
    // Check whether the panKey and zoomKey are set in chart.userOptions
    var chart = this, chartOptions = chart.options.chart || {}, panKey = chartOptions.panKey && chartOptions.panKey + 'Key', zoomKey = chart.zooming.key && chart.zooming.key + 'Key';
    return (e[zoomKey] || e[panKey]);
}
/**
 * Composes the chart class with essential functions to support draggable
 * points.
 *
 * @private
 * @function compose
 *
 * @param {Highcharts.Chart} ChartClass
 *        Class constructor of chart.
 */
function compose(ChartClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.hideDragHandles) {
        chartProto.hideDragHandles = chartHideDragHandles;
        chartProto.setGuideBoxState = chartSetGuideBoxState;
        chartProto.zoomOrPanKeyPressed = chartZoomOrPanKeyPressed;
        addEvent(ChartClass, 'render', onChartRender);
    }
}
/**
 * Default mouse move handler while dragging. Handles updating points or guide
 * box.
 *
 * @private
 * @function dragMove
 * @param {Highcharts.PointerEventObject} e
 *        The mouse move event.
 * @param {Highcharts.Point} point
 *        The point that is dragged.
 */
function dragMove(e, point) {
    var series = point.series, chart = series.chart, data = chart.dragDropData, options = merge(series.options.dragDrop, point.options.dragDrop), draggableX = options.draggableX, draggableY = options.draggableY, origin = data.origin, updateProp = data.updateProp;
    var dX = e.chartX - origin.chartX, dY = e.chartY - origin.chartY;
    var oldDx = dX;
    // Handle inverted
    if (chart.inverted) {
        dX = -dY;
        dY = -oldDx;
    }
    // If we have liveRedraw enabled, update the points immediately. Otherwise
    // update the guideBox.
    if (pick(options.liveRedraw, true)) {
        updatePoints(chart, false);
        // Update drag handles
        point.showDragHandles();
    }
    else {
        // No live redraw, update guide box
        if (updateProp) {
            // We are resizing, so resize the guide box
            resizeGuideBox(point, dX, dY);
        }
        else {
            // We are moving, so move the guide box
            chart.dragGuideBox.translate(draggableX ? dX : 0, draggableY ? dY : 0);
        }
    }
    // Update stored previous dX/Y
    origin.prevdX = dX;
    origin.prevdY = dY;
}
/**
 * Flip a side property, used with resizeRect. If input side is "left", return
 * "right" etc.
 *
 * @private
 * @function flipResizeSide
 *
 * @param {string} side
 *        Side prop to flip. Can be `left`, `right`, `top` or `bottom`.
 *
 * @return {"bottom"|"left"|"right"|"top"|undefined}
 *         The flipped side.
 */
function flipResizeSide(side) {
    return {
        left: 'right',
        right: 'left',
        top: 'bottom',
        bottom: 'top'
    }[side];
}
/**
 * Get a list of points that are grouped with this point. If only one point is
 * in the group, that point is returned by itself in an array.
 *
 * @private
 * @function getGroupedPoints
 * @param {Highcharts.Point} point
 *        Point to find group from.
 * @return {Array<Highcharts.Point>}
 *         Array of points in this group.
 */
function getGroupedPoints(point) {
    var series = point.series, data = series.options.data || [], groupKey = series.options.dragDrop.groupBy;
    var points = [];
    if (series.boosted && isArray(data)) { // #11156
        for (var i = 0, iEnd = data.length; i < iEnd; ++i) {
            points.push(new series.pointClass(// eslint-disable-line new-cap
            series, data[i]));
            points[points.length - 1].index = i;
        }
    }
    else {
        points = series.points;
    }
    return point.options[groupKey] ?
        // If we have a grouping option, filter the points by that
        points.filter(function (comparePoint) { return (comparePoint.options[groupKey] ===
            point.options[groupKey]); }) :
        // Otherwise return the point by itself only
        [point];
}
/**
 * Calculate new point options from points being dragged.
 *
 * @private
 * @function getNewPoints
 *
 * @param {Object} dragDropData
 *        A chart's dragDropData with drag/drop origin information, and info on
 *        which points are being dragged.
 *
 * @param {Highcharts.PointerEventObject} newPos
 *        Event with the new position of the mouse (chartX/Y properties).
 *
 * @return {Highchats.Dictionary<object>}
 *         Hashmap with point.id mapped to an object with the original point
 *         reference, as well as the new data values.
 */
function getNewPoints(dragDropData, newPos) {
    var point = dragDropData.point, series = point.series, chart = series.chart, options = merge(series.options.dragDrop, point.options.dragDrop), updateProps = {}, resizeProp = dragDropData.updateProp, hashmap = {}, dragDropProps = point.series.dragDropProps;
    // Go through the data props that can be updated on this series and find out
    // which ones we want to update.
    // eslint-disable-next-line guard-for-in
    for (var key in dragDropProps) {
        var val = dragDropProps[key];
        // If we are resizing, skip if this key is not the correct one or it
        // is not resizable.
        if (resizeProp && (resizeProp !== key ||
            !val.resize ||
            val.optionName && options[val.optionName] === false)) {
            continue;
        }
        // If we are resizing, we now know it is good. If we are moving, check
        // that moving along this axis is enabled, and the prop is movable.
        // If this prop is enabled, add it to be updated.
        if (resizeProp || (val.move &&
            (val.axis === 'x' && options.draggableX ||
                val.axis === 'y' && options.draggableY))) {
            if (chart.mapView) {
                updateProps[key === 'x' ? 'lon' : 'lat'] = val;
            }
            else {
                updateProps[key] = val;
            }
        }
    }
    // Go through the points to be updated and get new options for each of them
    for (
    // If resizing).forEach(only update the point we are resizing
    var _i = 0, _a = resizeProp ?
        [point] :
        dragDropData.groupedPoints; 
    // If resizing).forEach(only update the point we are resizing
    _i < _a.length; 
    // If resizing).forEach(only update the point we are resizing
    _i++) {
        var p = _a[_i];
        hashmap[p.id] = {
            point: p,
            newValues: p.getDropValues(dragDropData.origin, newPos, updateProps)
        };
    }
    return hashmap;
}
/**
 * Get a snapshot of points, mouse position, and guide box dimensions
 *
 * @private
 * @function getPositionSnapshot
 *
 * @param {Highcharts.PointerEventObject} e
 *        Mouse event with mouse position to snapshot.
 *
 * @param {Array<Highcharts.Point>} points
 *        Points to take snapshot of. We store the value of the data properties
 *        defined in each series' dragDropProps.
 *
 * @param {Highcharts.SVGElement} [guideBox]
 *        The guide box to take snapshot of.
 *
 * @return {Object}
 *         Snapshot object. Point properties are placed in a hashmap with IDs as
 *         keys.
 */
function getPositionSnapshot(e, points, guideBox) {
    var res = {
        chartX: e.chartX,
        chartY: e.chartY,
        guideBox: guideBox && {
            x: guideBox.attr('x'),
            y: guideBox.attr('y'),
            width: guideBox.attr('width'),
            height: guideBox.attr('height')
        },
        points: {}
    };
    // Loop over the points and add their props
    for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
        var point = points_1[_i];
        var dragDropProps = point.series.dragDropProps || {}, pointProps = {};
        // Add all of the props defined in the series' dragDropProps to the
        // snapshot
        for (var _a = 0, _b = Object.keys(dragDropProps); _a < _b.length; _a++) {
            var key = _b[_a];
            var val = dragDropProps[key], axis = point.series[val.axis + 'Axis'];
            pointProps[key] = point[key];
            // Record how far cursor was from the point when drag started.
            // This later will be used to calculate new value according to the
            // current position of the cursor.
            // e.g. `high` value is translated to `highOffset`
            if (point.series.chart.mapView && point.plotX && point.plotY) {
                pointProps[key + 'Offset'] = key === 'x' ?
                    point.plotX : point.plotY;
            }
            else {
                pointProps[key + 'Offset'] =
                    // E.g. yAxis.toPixels(point.high), xAxis.toPixels
                    // (point.end)
                    axis.toPixels(point[key]) -
                        (axis.horiz ? e.chartX : e.chartY);
            }
        }
        pointProps.point = point; // Store reference to point
        res.points[point.id] = pointProps;
    }
    return res;
}
/**
 * In mousemove events, check that we have dragged mouse further than the
 * dragSensitivity before we call mouseMove handler.
 *
 * @private
 * @function hasDraggedPastSensitivity
 *
 * @param {Highcharts.PointerEventObject} e
 *        Mouse move event to test.
 *
 * @param {Highcharts.Chart} chart
 *        Chart that has started dragging.
 *
 * @param {number} sensitivity
 *        Pixel sensitivity to test against.
 *
 * @return {boolean}
 *         True if the event is moved past sensitivity relative to the chart's
 *         drag origin.
 */
function hasDraggedPastSensitivity(e, chart, sensitivity) {
    var orig = chart.dragDropData.origin, oldX = orig.chartX, oldY = orig.chartY, newX = e.chartX, newY = e.chartY, distance = Math.sqrt((newX - oldX) * (newX - oldX) +
        (newY - oldY) * (newY - oldY));
    return distance > sensitivity;
}
/**
 * Prepare chart.dragDropData with origin info, and show the guide box.
 *
 * @private
 * @function initDragDrop
 * @param {Highcharts.PointerEventObject} e
 *        Mouse event with original mouse position.
 * @param {Highcharts.Point} point
 *        The point the dragging started on.
 * @return {void}
 */
function initDragDrop(e, point) {
    var groupedPoints = getGroupedPoints(point), series = point.series, chart = series.chart;
    var guideBox;
    // If liveRedraw is disabled, show the guide box with the default state
    if (!pick(series.options.dragDrop && series.options.dragDrop.liveRedraw, true)) {
        chart.dragGuideBox = guideBox = series.getGuideBox(groupedPoints);
        chart
            .setGuideBoxState('default', series.options.dragDrop.guideBox)
            .add(series.group);
    }
    // Store some data on the chart to pick up later
    chart.dragDropData = {
        origin: getPositionSnapshot(e, groupedPoints, guideBox),
        point: point,
        groupedPoints: groupedPoints,
        isDragging: true
    };
}
/**
 * Utility function to test if a chart should have drag/drop enabled, looking at
 * its options.
 *
 * @private
 * @function isChartDraggable
 * @param {Highcharts.Chart} chart
 *        The chart to test.
 * @return {boolean}
 *         True if the chart is drag/droppable.
 */
function isChartDraggable(chart) {
    var i = chart.series ? chart.series.length : 0;
    if ((chart.hasCartesianSeries && !chart.polar) ||
        chart.mapView) {
        while (i--) {
            if (chart.series[i].options.dragDrop &&
                isSeriesDraggable(chart.series[i])) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Utility function to test if a point is movable (any of its props can be
 * dragged by a move, not just individually).
 *
 * @private
 * @function isPointMovable
 * @param {Highcharts.Point} point
 *        The point to test.
 * @return {boolean}
 *         True if the point is movable.
 */
function isPointMovable(point) {
    var series = point.series, chart = series.chart, seriesDragDropOptions = series.options.dragDrop || {}, pointDragDropOptions = point.options && point.options.dragDrop, updateProps = series.dragDropProps;
    var p, hasMovableX, hasMovableY;
    // eslint-disable-next-line guard-for-in
    for (var key in updateProps) {
        p = updateProps[key];
        if (p.axis === 'x' && p.move) {
            hasMovableX = true;
        }
        else if (p.axis === 'y' && p.move) {
            hasMovableY = true;
        }
    }
    // We can only move the point if draggableX/Y is set, even if all the
    // individual prop options are set.
    return ((seriesDragDropOptions.draggableX && hasMovableX ||
        seriesDragDropOptions.draggableY && hasMovableY) &&
        !(pointDragDropOptions &&
            pointDragDropOptions.draggableX === false &&
            pointDragDropOptions.draggableY === false) &&
        (!!(series.yAxis && series.xAxis) ||
            chart.mapView));
}
/**
 * Utility function to test if a series is using drag/drop, looking at its
 * options.
 *
 * @private
 * @function isSeriesDraggable
 * @param {Highcharts.Series} series
 *        The series to test.
 * @return {boolean}
 *         True if the series is using drag/drop.
 */
function isSeriesDraggable(series) {
    var props = ['draggableX', 'draggableY'], dragDropProps = series.dragDropProps || {};
    var val;
    // Add optionNames from dragDropProps to the array of props to check for
    for (var _i = 0, _a = Object.keys(dragDropProps); _i < _a.length; _i++) {
        var key = _a[_i];
        val = dragDropProps[key];
        if (val.optionName) {
            props.push(val.optionName);
        }
    }
    // Loop over all options we have that could enable dragDrop for this
    // series. If any of them are truthy, this series is draggable.
    var i = props.length;
    while (i--) {
        if (series.options.dragDrop[props[i]]) {
            return true;
        }
    }
}
/**
 * On container mouse down. Init dragdrop if conditions are right.
 *
 * @private
 * @function mouseDown
 * @param {Highcharts.PointerEventObject} e
 *        The mouse down event.
 * @param {Highcharts.Chart} chart
 *        The chart we are clicking.
 */
function mouseDown(e, chart) {
    var dragPoint = chart.hoverPoint, dragDropOptions = merge(dragPoint && dragPoint.series.options.dragDrop, dragPoint && dragPoint.options.dragDrop), draggableX = dragDropOptions.draggableX || false, draggableY = dragDropOptions.draggableY || false;
    // Reset cancel click
    chart.cancelClick = false;
    // Ignore if:
    if (
    // Option is disabled for the point
    !(draggableX || draggableY) ||
        // Zoom/pan key is pressed
        chart.zoomOrPanKeyPressed(e) ||
        // Dragging an annotation
        chart.hasDraggedAnnotation) {
        return;
    }
    // If we somehow get a mousedown event while we are dragging, cancel
    if (chart.dragDropData && chart.dragDropData.isDragging) {
        mouseUp(e, chart);
        return;
    }
    // If this point is movable, start dragging it
    if (dragPoint && isPointMovable(dragPoint)) {
        chart.mouseIsDown = false; // Prevent zooming
        initDragDrop(e, dragPoint);
        dragPoint.firePointEvent('dragStart', e);
    }
}
/**
 * On container mouse move. Handle drag sensitivity and fire drag event.
 *
 * @private
 * @function mouseMove
 * @param {Highcharts.PointerEventObject} e
 *        The mouse move event.
 * @param {Highcharts.Chart} chart
 *        The chart we are moving across.
 */
function mouseMove(e, chart) {
    // Ignore if zoom/pan key is pressed
    if (chart.zoomOrPanKeyPressed(e)) {
        return;
    }
    var dragDropData = chart.dragDropData;
    var point, seriesDragDropOpts, newPoints, numNewPoints = 0, newPoint;
    if (dragDropData && dragDropData.isDragging && dragDropData.point.series) {
        point = dragDropData.point;
        seriesDragDropOpts = point.series.options.dragDrop;
        // No tooltip for dragging
        e.preventDefault();
        // Update sensitivity test if not passed yet
        if (!dragDropData.draggedPastSensitivity) {
            dragDropData.draggedPastSensitivity = hasDraggedPastSensitivity(e, chart, pick(point.options.dragDrop &&
                point.options.dragDrop.dragSensitivity, seriesDragDropOpts &&
                seriesDragDropOpts.dragSensitivity, DragDropDefaults.dragSensitivity));
        }
        // If we have dragged past dragSensitivity, run the mousemove handler
        // for dragging
        if (dragDropData.draggedPastSensitivity) {
            // Find the new point values from the moving
            dragDropData.newPoints = getNewPoints(dragDropData, e);
            // If we are only dragging one point, add it to the event
            newPoints = dragDropData.newPoints;
            numNewPoints = countProps(newPoints);
            newPoint = numNewPoints === 1 ?
                getFirstProp(newPoints) :
                null;
            // Run the handler
            point.firePointEvent('drag', {
                origin: dragDropData.origin,
                newPoints: dragDropData.newPoints,
                newPoint: newPoint && newPoint.newValues,
                newPointId: newPoint && newPoint.point.id,
                numNewPoints: numNewPoints,
                chartX: e.chartX,
                chartY: e.chartY
            }, function () {
                dragMove(e, point);
            });
        }
    }
}
/**
 * On container mouse up. Fire drop event and reset state.
 *
 * @private
 * @function mouseUp
 * @param {Highcharts.PointerEventObject} e
 *        The mouse up event.
 * @param {Highcharts.Chart} chart
 *        The chart we were dragging in.
 */
function mouseUp(e, chart) {
    var dragDropData = chart.dragDropData;
    if (dragDropData &&
        dragDropData.isDragging &&
        dragDropData.draggedPastSensitivity &&
        dragDropData.point.series) {
        var point = dragDropData.point, newPoints = dragDropData.newPoints, numNewPoints = countProps(newPoints), newPoint = numNewPoints === 1 ?
            getFirstProp(newPoints) :
            null;
        // Hide the drag handles
        if (chart.dragHandles) {
            chart.hideDragHandles();
        }
        // Prevent default action
        e.preventDefault();
        chart.cancelClick = true;
        // Fire the event, with a default handler that updates the points
        point.firePointEvent('drop', {
            origin: dragDropData.origin,
            chartX: e.chartX,
            chartY: e.chartY,
            newPoints: newPoints,
            numNewPoints: numNewPoints,
            newPoint: newPoint && newPoint.newValues,
            newPointId: newPoint && newPoint.point.id
        }, function () {
            updatePoints(chart);
        });
    }
    // Reset
    delete chart.dragDropData;
    // Clean up the drag guide box if it exists. This is always added on
    // drag start, even if user is overriding events.
    if (chart.dragGuideBox) {
        chart.dragGuideBox.destroy();
        delete chart.dragGuideBox;
    }
}
/**
 * Add event listener to Chart.render that checks whether or not we should add
 * dragdrop.
 * @private
 */
function onChartRender() {
    // If we don't have dragDrop events, see if we should add them
    if (!this.hasAddedDragDropEvents) {
        addDragDropEvents(this);
    }
}
/**
 * Resize the guide box according to point options and a difference in mouse
 * positions. Handles reversed axes.
 *
 * @private
 * @function resizeGuideBox
 * @param {Highcharts.Point} point
 *        The point that is being resized.
 * @param {number} dX
 *        Difference in X position.
 * @param {number} dY
 *        Difference in Y position.
 */
function resizeGuideBox(point, dX, dY) {
    var series = point.series, chart = series.chart, dragDropData = chart.dragDropData, resizeProp = series.dragDropProps[dragDropData.updateProp], 
    // `dragDropProp.resizeSide` holds info on which side to resize.
    newPoint = dragDropData.newPoints[point.id].newValues, resizeSide = typeof resizeProp.resizeSide === 'function' ?
        resizeProp.resizeSide(newPoint, point) : resizeProp.resizeSide;
    // Call resize hook if it is defined
    if (resizeProp.beforeResize) {
        resizeProp.beforeResize(chart.dragGuideBox, newPoint, point);
    }
    // Do the resize
    resizeRect(chart.dragGuideBox, resizeProp.axis === 'x' && series.xAxis.reversed ||
        resizeProp.axis === 'y' && series.yAxis.reversed ?
        flipResizeSide(resizeSide) : resizeSide, {
        x: resizeProp.axis === 'x' ?
            dX - (dragDropData.origin.prevdX || 0) : 0,
        y: resizeProp.axis === 'y' ?
            dY - (dragDropData.origin.prevdY || 0) : 0
    });
}
/**
 * Resize a rect element on one side. The element is modified.
 *
 * @private
 * @function resizeRect
 * @param {Highcharts.SVGElement} rect
 *        Rect element to resize.
 * @param {string} updateSide
 *        Which side of the rect to update. Can be `left`, `right`, `top` or
 *        `bottom`.
 * @param {Highcharts.PositionObject} update
 *        Object with x and y properties, detailing how much to resize each
 *        dimension.
 * @return {void}
 */
function resizeRect(rect, updateSide, update) {
    var resizeAttrs;
    switch (updateSide) {
        case 'left':
            resizeAttrs = {
                x: rect.attr('x') + update.x,
                width: Math.max(1, rect.attr('width') - update.x)
            };
            break;
        case 'right':
            resizeAttrs = {
                width: Math.max(1, rect.attr('width') + update.x)
            };
            break;
        case 'top':
            resizeAttrs = {
                y: rect.attr('y') + update.y,
                height: Math.max(1, rect.attr('height') - update.y)
            };
            break;
        case 'bottom':
            resizeAttrs = {
                height: Math.max(1, rect.attr('height') + update.y)
            };
            break;
        default:
    }
    rect.attr(resizeAttrs);
}
/**
 * Update the points in a chart from dragDropData.newPoints.
 *
 * @private
 * @function updatePoints
 * @param {Highcharts.Chart} chart
 *        A chart with dragDropData.newPoints.
 * @param {boolean} [animation=true]
 *        Animate updating points?
 */
function updatePoints(chart, animation) {
    var newPoints = chart.dragDropData.newPoints, animOptions = animObject(animation);
    chart.isDragDropAnimating = true;
    var newPoint;
    // Update the points
    for (var _i = 0, _a = Object.keys(newPoints); _i < _a.length; _i++) {
        var key = _a[_i];
        newPoint = newPoints[key];
        newPoint.point.update(newPoint.newValues, false);
    }
    chart.redraw(animOptions);
    // Clear the isAnimating flag after animation duration is complete.
    // The complete handler for animation seems to have bugs at this time, so
    // we have to use a timeout instead.
    setTimeout(function () {
        delete chart.isDragDropAnimating;
        if (chart.hoverPoint && !chart.dragHandles) {
            chart.hoverPoint.showDragHandles();
        }
    }, animOptions.duration);
}
/* *
 *
 *  Default Export
 *
 * */
var DraggableChart = {
    compose: compose,
    flipResizeSide: flipResizeSide,
    initDragDrop: initDragDrop
};
export default DraggableChart;
