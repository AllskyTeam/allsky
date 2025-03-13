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
'use strict';
import H from '../Core/Globals.js';
var composed = H.composed;
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, pushUnique = U.pushUnique;
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
    var mousedownUnbinder, mousemoveUnbinder, mouseupUnbinder;
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
        var series = this, chart = series.chart, normalizedEvent = ((_a = chart.pointer) === null || _a === void 0 ? void 0 : _a.normalize(event)) || event, diffX = point.fixedPosition.chartX - normalizedEvent.chartX, diffY = point.fixedPosition.chartY - normalizedEvent.chartY, graphLayoutsLookup = chart.graphLayoutsLookup;
        var newPlotX = void 0, newPlotY = void 0;
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
export default DragNodesComposition;
