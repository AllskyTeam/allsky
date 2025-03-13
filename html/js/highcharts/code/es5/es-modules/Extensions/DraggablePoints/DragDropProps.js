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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import DraggableChart from './DraggableChart.js';
var flipResizeSide = DraggableChart.flipResizeSide;
import U from '../../Core/Utilities.js';
var isNumber = U.isNumber, merge = U.merge, pick = U.pick;
/* *
 *
 *  Constants
 *
 * */
// Line series - only draggableX/Y, no drag handles
var line = {
    x: {
        axis: 'x',
        move: true
    },
    y: {
        axis: 'y',
        move: true
    }
};
// Flag series - same as line/scatter
var flags = line;
// Column series - x can be moved, y can only be resized. Note extra
// functionality for handling upside down columns (below threshold).
var column = {
    x: {
        axis: 'x',
        move: true
    },
    y: {
        axis: 'y',
        move: false,
        resize: true,
        // Force guideBox start coordinates
        beforeResize: function (guideBox, pointVals, point) {
            // We need to ensure that guideBox always starts at threshold.
            // We flip whether or not we update the top or bottom of the guide
            // box at threshold, but if we drag the mouse fast, the top has not
            // reached threshold before we cross over and update the bottom.
            var plotThreshold = pick(point.yBottom, // Added support for stacked series. (#18741)
            point.series.translatedThreshold), plotY = guideBox.attr('y'), threshold = isNumber(point.stackY) ? (point.stackY - (point.y || 0)) : point.series.options.threshold || 0, y = threshold + pointVals.y;
            var height, diff;
            if (point.series.yAxis.reversed ? y < threshold : y >= threshold) {
                // Above threshold - always set height to hit the threshold
                height = guideBox.attr('height');
                diff = plotThreshold ? plotThreshold - plotY - height : 0;
                guideBox.attr({
                    height: Math.max(0, Math.round(height + diff))
                });
            }
            else {
                // Below - always set y to start at threshold
                guideBox.attr({
                    y: Math.round(plotY + (plotThreshold ? plotThreshold - plotY : 0))
                });
            }
        },
        // Flip the side of the resize handle if column is below threshold.
        // Make sure we remove the handle on the other side.
        resizeSide: function (pointVals, point) {
            var chart = point.series.chart, dragHandles = chart.dragHandles, side = pointVals.y >= (point.series.options.threshold || 0) ?
                'top' : 'bottom', flipSide = flipResizeSide(side);
            // Force remove handle on other side
            if (dragHandles && dragHandles[flipSide]) {
                dragHandles[flipSide].destroy();
                delete dragHandles[flipSide];
            }
            return side;
        },
        // Position handle at bottom if column is below threshold
        handlePositioner: function (point) {
            var bBox = (point.shapeArgs ||
                (point.graphic && point.graphic.getBBox()) ||
                {}), reversed = point.series.yAxis.reversed, threshold = point.series.options.threshold || 0, y = point.y || 0, bottom = (!reversed && y >= threshold) ||
                (reversed && y < threshold);
            return {
                x: bBox.x || 0,
                y: bottom ? (bBox.y || 0) : (bBox.y || 0) + (bBox.height || 0)
            };
        },
        // Horizontal handle
        handleFormatter: function (point) {
            var shapeArgs = point.shapeArgs || {}, radius = shapeArgs.r || 0, // Rounding of bar corners
            width = shapeArgs.width || 0, centerX = width / 2;
            return [
                // Left wick
                ['M', radius, 0],
                ['L', centerX - 5, 0],
                // Circle
                ['A', 1, 1, 0, 0, 0, centerX + 5, 0],
                ['A', 1, 1, 0, 0, 0, centerX - 5, 0],
                // Right wick
                ['M', centerX + 5, 0],
                ['L', width - radius, 0]
            ];
        }
    }
};
// Boxplot series - move x, resize or move low/q1/q3/high
var boxplot = {
    x: column.x,
    /**
     * Allow low value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.boxplot.dragDrop.draggableLow
     */
    low: {
        optionName: 'draggableLow',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'bottom',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x || 0,
            y: point.lowPlot
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.q1); }
    },
    /**
     * Allow Q1 value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.boxplot.dragDrop.draggableQ1
     */
    q1: {
        optionName: 'draggableQ1',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'bottom',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x || 0,
            y: point.q1Plot
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.median && val >= point.low); }
    },
    median: {
        // Median cannot be dragged individually, just move the whole
        // point for this.
        axis: 'y',
        move: true
    },
    /**
     * Allow Q3 value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.boxplot.dragDrop.draggableQ3
     */
    q3: {
        optionName: 'draggableQ3',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x || 0,
            y: point.q3Plot
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.high && val >= point.median); }
    },
    /**
     * Allow high value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.boxplot.dragDrop.draggableHigh
     */
    high: {
        optionName: 'draggableHigh',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x || 0,
            y: point.highPlot
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val >= point.q3); }
    }
};
// Errorbar series - move x, resize or move low/high
var errorbar = {
    x: column.x,
    low: __assign(__assign({}, boxplot.low), { propValidate: function (val, point) { return (val <= point.high); } }),
    high: __assign(__assign({}, boxplot.high), { propValidate: function (val, point) { return (val >= point.low); } })
};
/**
 * @exclude      draggableQ1, draggableQ3
 * @optionparent plotOptions.errorbar.dragDrop
 */
// Bullet graph, x/y same as column, but also allow target to be dragged.
var bullet = {
    x: column.x,
    y: column.y,
    /**
     * Allow target value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.bullet.dragDrop.draggableTarget
     */
    target: {
        optionName: 'draggableTarget',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) {
            var bBox = point.targetGraphic.getBBox();
            return {
                x: point.barX,
                y: bBox.y + bBox.height / 2
            };
        },
        handleFormatter: column.y.handleFormatter
    }
};
// OHLC series - move x, resize or move open/high/low/close
var ohlc = {
    x: column.x,
    /**
     * Allow low value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.ohlc.dragDrop.draggableLow
     */
    low: {
        optionName: 'draggableLow',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'bottom',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x,
            y: point.plotLow
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.open && val <= point.close); }
    },
    /**
     * Allow high value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.ohlc.dragDrop.draggableHigh
     */
    high: {
        optionName: 'draggableHigh',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x,
            y: point.plotHigh
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val >= point.open && val >= point.close); }
    },
    /**
     * Allow open value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.ohlc.dragDrop.draggableOpen
     */
    open: {
        optionName: 'draggableOpen',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: function (point) { return (point.open >= point.close ? 'top' : 'bottom'); },
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x,
            y: point.plotOpen
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.high && val >= point.low); }
    },
    /**
     * Allow close value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.ohlc.dragDrop.draggableClose
     */
    close: {
        optionName: 'draggableClose',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: function (point) { return (point.open >= point.close ? 'bottom' : 'top'); },
        handlePositioner: function (point) { return ({
            x: point.shapeArgs.x,
            y: point.plotClose
        }); },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.high && val >= point.low); }
    }
};
// Waterfall - mostly as column, but don't show drag handles for sum points
var waterfall = {
    x: column.x,
    y: merge(column.y, {
        handleFormatter: function (point) {
            var _a, _b;
            return (point.isSum || point.isIntermediateSum ?
                null :
                ((_b = (_a = column === null || column === void 0 ? void 0 : column.y) === null || _a === void 0 ? void 0 : _a.handleFormatter) === null || _b === void 0 ? void 0 : _b.call(_a, point)) || null);
        }
    })
};
// Columnrange series - move x, resize or move low/high
var columnrange = {
    x: {
        axis: 'x',
        move: true
    },
    /**
     * Allow low value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.columnrange.dragDrop.draggableLow
     */
    low: {
        optionName: 'draggableLow',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'bottom',
        handlePositioner: function (point) {
            var bBox = (point.shapeArgs || point.graphic.getBBox());
            return {
                x: bBox.x || 0,
                y: (bBox.y || 0) + (bBox.height || 0)
            };
        },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val <= point.high); }
    },
    /**
     * Allow high value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.columnrange.dragDrop.draggableHigh
     */
    high: {
        optionName: 'draggableHigh',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) {
            var bBox = (point.shapeArgs || point.graphic.getBBox());
            return {
                x: bBox.x || 0,
                y: bBox.y || 0
            };
        },
        handleFormatter: column.y.handleFormatter,
        propValidate: function (val, point) { return (val >= point.low); }
    }
};
// Arearange series - move x, resize or move low/high
var arearange = {
    x: columnrange.x,
    /**
     * Allow low value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.arearange.dragDrop.draggableLow
     */
    low: {
        optionName: 'draggableLow',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'bottom',
        handlePositioner: function (point) {
            var bBox = (point.graphics &&
                point.graphics[0] &&
                point.graphics[0].getBBox());
            return bBox ? {
                x: bBox.x + bBox.width / 2,
                y: bBox.y + bBox.height / 2
            } : { x: -999, y: -999 };
        },
        handleFormatter: arearangeHandleFormatter,
        propValidate: columnrange.low.propValidate
    },
    /**
     * Allow high value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.arearange.dragDrop.draggableHigh
     */
    high: {
        optionName: 'draggableHigh',
        axis: 'y',
        move: true,
        resize: true,
        resizeSide: 'top',
        handlePositioner: function (point) {
            var bBox = (point.graphics &&
                point.graphics[1] &&
                point.graphics[1].getBBox());
            return bBox ? {
                x: bBox.x + bBox.width / 2,
                y: bBox.y + bBox.height / 2
            } : { x: -999, y: -999 };
        },
        handleFormatter: arearangeHandleFormatter,
        propValidate: columnrange.high.propValidate
    }
};
// Xrange - resize/move x/x2, and move y
var xrange = {
    y: {
        axis: 'y',
        move: true
    },
    /**
     * Allow x value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.xrange.dragDrop.draggableX1
     */
    x: {
        optionName: 'draggableX1',
        axis: 'x',
        move: true,
        resize: true,
        resizeSide: 'left',
        handlePositioner: function (point) { return (xrangeHandlePositioner(point, 'x')); },
        handleFormatter: horizHandleFormatter,
        propValidate: function (val, point) { return (val <= point.x2); }
    },
    /**
     * Allow x2 value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.xrange.dragDrop.draggableX2
     */
    x2: {
        optionName: 'draggableX2',
        axis: 'x',
        move: true,
        resize: true,
        resizeSide: 'right',
        handlePositioner: function (point) { return (xrangeHandlePositioner(point, 'x2')); },
        handleFormatter: horizHandleFormatter,
        propValidate: function (val, point) { return (val >= point.x); }
    }
};
// Gantt - same as xrange, but with aliases
var gantt = {
    y: xrange.y,
    /**
     * Allow start value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.gantt.dragDrop.draggableStart
     */
    start: merge(xrange.x, {
        optionName: 'draggableStart',
        // Do not allow individual drag handles for milestones
        validateIndividualDrag: function (point) { return (!point.milestone); }
    }),
    /**
     * Allow end value to be dragged individually.
     *
     * @type      {boolean}
     * @default   true
     * @requires  modules/draggable-points
     * @apioption plotOptions.gantt.dragDrop.draggableEnd
     */
    end: merge(xrange.x2, {
        optionName: 'draggableEnd',
        // Do not allow individual drag handles for milestones
        validateIndividualDrag: function (point) { return (!point.milestone); }
    })
};
/* *
 *
 *  Functions
 *
 * */
/**
 * Use a circle covering the marker as drag handle.
 * @private
 */
function arearangeHandleFormatter(point) {
    var radius = point.graphic ?
        point.graphic.getBBox().width / 2 + 1 :
        4;
    return [
        ['M', 0 - radius, 0],
        ['a', radius, radius, 0, 1, 0, radius * 2, 0],
        ['a', radius, radius, 0, 1, 0, radius * -2, 0]
    ];
}
/**
 * 90deg rotated column handle path, used in multiple series types.
 * @private
 */
function horizHandleFormatter(point) {
    var shapeArgs = point.shapeArgs || point.graphic.getBBox(), top = shapeArgs.r || 0, // Rounding of bar corners
    bottom = shapeArgs.height - top, centerY = shapeArgs.height / 2;
    return [
        // Top wick
        ['M', 0, top],
        ['L', 0, centerY - 5],
        // Circle
        ['A', 1, 1, 0, 0, 0, 0, centerY + 5],
        ['A', 1, 1, 0, 0, 0, 0, centerY - 5],
        // Bottom wick
        ['M', 0, centerY + 5],
        ['L', 0, bottom]
    ];
}
/**
 * Handle positioner logic is the same for x and x2 apart from the x value.
 * shapeArgs does not take yAxis reversed etc into account, so we use
 * axis.toPixels to handle positioning.
 * @private
 */
function xrangeHandlePositioner(point, xProp) {
    var series = point.series, xAxis = series.xAxis, yAxis = series.yAxis, inverted = series.chart.inverted, offsetY = series.columnMetrics ? series.columnMetrics.offset :
        -point.shapeArgs.height / 2;
    // Using toPixels handles axis.reversed, but doesn't take
    // chart.inverted into account.
    var newX = xAxis.toPixels(point[xProp], true), newY = yAxis.toPixels(point.y, true);
    // Handle chart inverted
    if (inverted) {
        newX = xAxis.len - newX;
        newY = yAxis.len - newY;
    }
    newY += offsetY; // (#12872)
    return {
        x: Math.round(newX),
        y: Math.round(newY)
    };
}
/* *
 *
 *  Default Export
 *
 * */
var DragDropProps = {
    arearange: arearange,
    boxplot: boxplot,
    bullet: bullet,
    column: column,
    columnrange: columnrange,
    errorbar: errorbar,
    flags: flags,
    gantt: gantt,
    line: line,
    ohlc: ohlc,
    waterfall: waterfall,
    xrange: xrange
};
export default DragDropProps;
