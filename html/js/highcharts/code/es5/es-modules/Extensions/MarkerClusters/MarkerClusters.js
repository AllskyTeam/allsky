/* *
 *
 *  Marker clusters module.
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Author: Wojciech Chmiel
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import D from '../../Core/Defaults.js';
var defaultOptions = D.defaultOptions;
import H from '../../Core/Globals.js';
var composed = H.composed;
import MarkerClusterDefaults from './MarkerClusterDefaults.js';
import MarkerClusterScatter from './MarkerClusterScatter.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, error = U.error, isFunction = U.isFunction, merge = U.merge, pushUnique = U.pushUnique, syncTimeout = U.syncTimeout;
/* *
 *
 *  Constants
 *
 * */
(defaultOptions.plotOptions || {}).series = merge((defaultOptions.plotOptions || {}).series, MarkerClusterDefaults);
/* *
 *
 *  Functions
 *
 * */
/** @private */
function compose(AxisClass, ChartClass, highchartsDefaultOptions, SeriesClass) {
    if (pushUnique(composed, 'MarkerClusters')) {
        var PointClass = SeriesClass.prototype.pointClass, ScatterSeries = SeriesClass.types.scatter;
        addEvent(AxisClass, 'setExtremes', onAxisSetExtremes);
        addEvent(ChartClass, 'render', onChartRender);
        addEvent(PointClass, 'drillToCluster', onPointDrillToCluster);
        addEvent(PointClass, 'update', onPointUpdate);
        addEvent(SeriesClass, 'afterRender', onSeriesAfterRender);
        if (ScatterSeries) {
            MarkerClusterScatter
                .compose(highchartsDefaultOptions, ScatterSeries);
        }
    }
}
/**
 * Destroy the old tooltip after zoom.
 * @private
 */
function onAxisSetExtremes() {
    var chart = this.chart;
    var animationDuration = 0;
    for (var _i = 0, _a = chart.series; _i < _a.length; _i++) {
        var series = _a[_i];
        if (series.markerClusterInfo) {
            animationDuration = (animObject((series.options.cluster || {}).animation).duration ||
                0);
        }
    }
    syncTimeout(function () {
        if (chart.tooltip) {
            chart.tooltip.destroy();
        }
    }, animationDuration);
}
/**
 * Handle animation.
 * @private
 */
function onChartRender() {
    var _a;
    var chart = this;
    for (var _i = 0, _b = (chart.series || []); _i < _b.length; _i++) {
        var series = _b[_i];
        if (series.markerClusterInfo) {
            var options = series.options.cluster, pointsState = (series.markerClusterInfo || {}).pointsState, oldState = (pointsState || {}).oldState;
            if ((options || {}).animation &&
                series.markerClusterInfo &&
                (((_a = series.chart.pointer) === null || _a === void 0 ? void 0 : _a.pinchDown) || []).length === 0 &&
                ((series.xAxis || {}).eventArgs || {}).trigger !== 'pan' &&
                oldState &&
                Object.keys(oldState).length) {
                for (var _c = 0, _d = series.markerClusterInfo.clusters; _c < _d.length; _c++) {
                    var cluster = _d[_c];
                    series.animateClusterPoint(cluster);
                }
                for (var _e = 0, _f = series.markerClusterInfo.noise; _e < _f.length; _e++) {
                    var noise = _f[_e];
                    series.animateClusterPoint(noise);
                }
            }
        }
    }
}
/** @private */
function onPointDrillToCluster(event) {
    var point = event.point || event.target, series = point.series, clusterOptions = series.options.cluster, onDrillToCluster = ((clusterOptions || {}).events || {}).drillToCluster;
    if (isFunction(onDrillToCluster)) {
        onDrillToCluster.call(this, event);
    }
}
/**
 * Override point prototype to throw a warning when trying to update
 * clustered point.
 * @private
 */
function onPointUpdate() {
    var point = this;
    if (point.dataGroup) {
        error('Highcharts marker-clusters module: ' +
            'Running `Point.update` when point belongs to clustered series' +
            ' is not supported.', false, point.series.chart);
        return false;
    }
}
/**
 * Add classes, change mouse cursor.
 * @private
 */
function onSeriesAfterRender() {
    var series = this, clusterZoomEnabled = (series.options.cluster || {}).drillToCluster;
    if (series.markerClusterInfo && series.markerClusterInfo.clusters) {
        for (var _i = 0, _a = series.markerClusterInfo.clusters; _i < _a.length; _i++) {
            var cluster = _a[_i];
            if (cluster.point && cluster.point.graphic) {
                cluster.point.graphic.addClass('highcharts-cluster-point');
                // Change cursor to pointer when drillToCluster is enabled.
                if (clusterZoomEnabled && cluster.point) {
                    cluster.point.graphic.css({
                        cursor: 'pointer'
                    });
                    if (cluster.point.dataLabel) {
                        cluster.point.dataLabel.css({
                            cursor: 'pointer'
                        });
                    }
                }
                if (defined(cluster.clusterZone)) {
                    cluster.point.graphic.addClass(cluster.clusterZoneClassName ||
                        'highcharts-cluster-zone-' +
                            cluster.clusterZone.zoneIndex);
                }
            }
        }
    }
}
/* *
 *
 *  Default Export
 *
 * */
var MarkerClusters = {
    compose: compose
};
export default MarkerClusters;
/* *
 *
 *  API Options
 *
 * */
/**
 * Function callback when a cluster is clicked.
 *
 * @callback Highcharts.MarkerClusterDrillCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        The point where the event occurred.
 *
 * @param {Highcharts.PointClickEventObject} event
 *        Event arguments.
 */
''; // Keeps doclets above in JS file
