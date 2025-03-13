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
import U from '../Core/Utilities.js';
var defined = U.defined, extend = U.extend, pick = U.pick, wrap = U.wrap;
/* *
 *
 *  Composition
 *
 * */
var MapPointer;
(function (MapPointer) {
    /* *
     *
     *  Variables
     *
     * */
    var totalWheelDelta = 0;
    var totalWheelDeltaTimer;
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Extend the Pointer.
     * @private
     */
    function compose(PointerClass) {
        var pointerProto = PointerClass.prototype;
        if (!pointerProto.onContainerDblClick) {
            extend(pointerProto, {
                onContainerDblClick: onContainerDblClick,
                onContainerMouseWheel: onContainerMouseWheel
            });
            wrap(pointerProto, 'normalize', wrapNormalize);
            wrap(pointerProto, 'zoomOption', wrapZoomOption);
        }
    }
    MapPointer.compose = compose;
    /**
     * The event handler for the doubleclick event.
     * @private
     */
    function onContainerDblClick(e) {
        var chart = this.chart;
        e = this.normalize(e);
        if (chart.options.mapNavigation.enableDoubleClickZoomTo) {
            if (chart.pointer.inClass(e.target, 'highcharts-tracker') &&
                chart.hoverPoint) {
                chart.hoverPoint.zoomTo();
            }
        }
        else if (chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {
            chart.mapZoom(0.5, void 0, void 0, e.chartX, e.chartY);
        }
    }
    /**
     * The event handler for the mouse scroll event.
     * @private
     */
    function onContainerMouseWheel(e) {
        var chart = this.chart;
        e = this.normalize(e);
        // Firefox uses e.deltaY or e.detail, WebKit and IE uses wheelDelta
        // try wheelDelta first #15656
        var delta = (defined(e.wheelDelta) && -e.wheelDelta / 120) ||
            e.deltaY || e.detail;
        // Wheel zooming on trackpads have different behaviours in Firefox vs
        // WebKit. In Firefox the delta increments in steps by 1, so it is not
        // distinguishable from true mouse wheel. Therefore we use this timer
        // to avoid trackpad zooming going too fast and out of control. In
        // WebKit however, the delta is < 1, so we simply disable animation in
        // the `chart.mapZoom` call below.
        if (Math.abs(delta) >= 1) {
            totalWheelDelta += Math.abs(delta);
            if (totalWheelDeltaTimer) {
                clearTimeout(totalWheelDeltaTimer);
            }
            totalWheelDeltaTimer = setTimeout(function () {
                totalWheelDelta = 0;
            }, 50);
        }
        if (totalWheelDelta < 10 && chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop) && chart.mapView) {
            chart.mapView.zoomBy((chart.options.mapNavigation.mouseWheelSensitivity -
                1) * -delta, void 0, [e.chartX, e.chartY], 
            // Delta less than 1 indicates stepless/trackpad zooming, avoid
            // animation delaying the zoom
            Math.abs(delta) < 1 ? false : void 0);
        }
    }
    /**
     * Add lon and lat information to pointer events
     * @private
     */
    function wrapNormalize(proceed, e, chartPosition) {
        var chart = this.chart;
        e = proceed.call(this, e, chartPosition);
        if (chart && chart.mapView) {
            var lonLat = chart.mapView.pixelsToLonLat({
                x: e.chartX - chart.plotLeft,
                y: e.chartY - chart.plotTop
            });
            if (lonLat) {
                extend(e, lonLat);
            }
        }
        return e;
    }
    /**
     * The pinchType is inferred from mapNavigation options.
     * @private
     */
    function wrapZoomOption(proceed) {
        var mapNavigation = this.chart.options.mapNavigation;
        // Pinch status
        if (mapNavigation &&
            pick(mapNavigation.enableTouchZoom, mapNavigation.enabled)) {
            this.chart.zooming.pinchType = 'xy';
        }
        proceed.apply(this, [].slice.call(arguments, 1));
    }
})(MapPointer || (MapPointer = {}));
/* *
 *
 *  Default Export
 *
 * */
export default MapPointer;
