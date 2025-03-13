/* *
 *
 *  Imports
 *
 * */
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, correctFloat = U.correctFloat, defined = U.defined, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function chartGetHoverPane(eventArgs) {
    var chart = this;
    var hoverPane;
    if (eventArgs) {
        chart.pane.forEach(function (pane) {
            var x = eventArgs.chartX - chart.plotLeft, y = eventArgs.chartY - chart.plotTop;
            if (isInsidePane(x, y, pane.center)) {
                hoverPane = pane;
            }
        });
    }
    return hoverPane;
}
/** @private */
function compose(ChartClass, PointerClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.getHoverPane) {
        chartProto.collectionsWithUpdate.push('pane');
        chartProto.getHoverPane = chartGetHoverPane;
        addEvent(ChartClass, 'afterIsInsidePlot', onChartAfterIsInsiderPlot);
        addEvent(PointerClass, 'afterGetHoverData', onPointerAfterGetHoverData);
        addEvent(PointerClass, 'beforeGetHoverData', onPointerBeforeGetHoverData);
    }
}
/**
 * Check whether element is inside or outside pane.
 * @private
 * @param  {number} x
 * Element's x coordinate
 * @param  {number} y
 * Element's y coordinate
 * @param  {Array<number>} center
 * Pane's center (x, y) and diameter
 * @param  {number} startAngle
 * Pane's normalized start angle in radians (<-PI, PI>)
 * @param  {number} endAngle
 * Pane's normalized end angle in radians (<-PI, PI>)
 */
function isInsidePane(x, y, center, startAngle, endAngle) {
    var insideSlice = true;
    var cx = center[0], cy = center[1];
    var distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
    if (defined(startAngle) && defined(endAngle)) {
        // Round angle to N-decimals to avoid numeric errors
        var angle = Math.atan2(correctFloat(y - cy, 8), correctFloat(x - cx, 8));
        // Ignore full circle panes:
        if (endAngle !== startAngle) {
            // If normalized start angle is bigger than normalized end,
            // it means angles have different signs. In such situation we
            // check the <-PI, startAngle> and <endAngle, PI> ranges.
            if (startAngle > endAngle) {
                insideSlice = (angle >= startAngle &&
                    angle <= Math.PI) || (angle <= endAngle &&
                    angle >= -Math.PI);
            }
            else {
                // In this case, we simple check if angle is within the
                // <startAngle, endAngle> range
                insideSlice = angle >= startAngle &&
                    angle <= correctFloat(endAngle, 8);
            }
        }
    }
    // Round up radius because x and y values are rounded
    return distance <= Math.ceil(center[2] / 2) && insideSlice;
}
/**
 * Check if (x, y) position is within pane for polar.
 * @private
 */
function onChartAfterIsInsiderPlot(e) {
    var _a;
    var chart = this;
    if (chart.polar) {
        if (e.options.inverted) {
            _a = [e.y, e.x], e.x = _a[0], e.y = _a[1];
        }
        e.isInsidePlot = chart.pane.some(function (pane) { return isInsidePane(e.x, e.y, pane.center, pane.axis && pane.axis.normalizedStartAngleRad, pane.axis && pane.axis.normalizedEndAngleRad); });
    }
}
/**
 *
 */
function onPointerAfterGetHoverData(eventArgs) {
    var chart = this.chart;
    if (eventArgs.hoverPoint &&
        eventArgs.hoverPoint.plotX &&
        eventArgs.hoverPoint.plotY &&
        chart.hoverPane &&
        !isInsidePane(eventArgs.hoverPoint.plotX, eventArgs.hoverPoint.plotY, chart.hoverPane.center)) {
        eventArgs.hoverPoint = void 0;
    }
}
/** @private */
function onPointerBeforeGetHoverData(eventArgs) {
    var chart = this.chart;
    if (chart.polar) {
        // Find pane we are currently hovering over.
        chart.hoverPane = chart.getHoverPane(eventArgs);
        // Edit filter method to handle polar
        eventArgs.filter = function (s) {
            return (s.visible &&
                !(!eventArgs.shared && s.directTouch) && // #3821
                pick(s.options.enableMouseTracking, true) &&
                (!chart.hoverPane || s.xAxis.pane === chart.hoverPane));
        };
    }
    else {
        chart.hoverPane = void 0;
    }
}
/* *
 *
 *  Default Export
 *
 * */
var PaneComposition = {
    compose: compose
};
export default PaneComposition;
