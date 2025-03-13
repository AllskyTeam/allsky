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
import Chart from './Chart.js';
import D from '../Defaults.js';
var getOptions = D.getOptions;
import SVGRenderer from '../Renderer/SVG/SVGRenderer.js';
import U from '../Utilities.js';
var isNumber = U.isNumber, merge = U.merge, pick = U.pick;
import '../../Maps/MapSymbols.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Map-optimized chart. Use {@link Highcharts.Chart|Chart} for common charts.
 *
 * @requires modules/map
 *
 * @class
 * @name Highcharts.MapChart
 * @extends Highcharts.Chart
 */
var MapChart = /** @class */ (function (_super) {
    __extends(MapChart, _super);
    function MapChart() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initializes the chart. The constructor's arguments are passed on
     * directly.
     *
     * @function Highcharts.MapChart#init
     *
     * @param {Highcharts.Options} userOptions
     *        Custom options.
     *
     * @param {Function} [callback]
     *        Function to run when the chart has loaded and all external
     *        images are loaded.
     *
     *
     * @emits Highcharts.MapChart#event:init
     * @emits Highcharts.MapChart#event:afterInit
     */
    MapChart.prototype.init = function (userOptions, callback) {
        var defaultCreditsOptions = getOptions().credits;
        var options = merge({
            chart: {
                panning: {
                    enabled: true,
                    type: 'xy'
                },
                type: 'map'
            },
            credits: {
                mapText: pick(defaultCreditsOptions.mapText, ' \u00a9 <a href="{geojson.copyrightUrl}">' +
                    '{geojson.copyrightShort}</a>'),
                mapTextFull: pick(defaultCreditsOptions.mapTextFull, '{geojson.copyright}')
            },
            mapView: {}, // Required to enable Chart.mapView
            tooltip: {
                followTouchMove: false
            }
        }, userOptions // User's options
        );
        _super.prototype.init.call(this, options, callback);
    };
    /**
     * Highcharts Maps only. Zoom in or out of the map. See also
     * {@link Point#zoomTo}. See {@link Chart#fromLatLonToPoint} for how to get
     * the `centerX` and `centerY` parameters for a geographic location.
     *
     * Deprecated as of v9.3 in favor of [MapView.zoomBy](https://api.highcharts.com/class-reference/Highcharts.MapView#zoomBy).
     *
     * @deprecated
     * @function Highcharts.Chart#mapZoom
     *
     * @param {number} [howMuch]
     *        How much to zoom the map. Values less than 1 zooms in. 0.5 zooms
     *        in to half the current view. 2 zooms to twice the current view. If
     *        omitted, the zoom is reset.
     *
     * @param {number} [xProjected]
     *        The projected x position to keep stationary when zooming, if
     *        available space.
     *
     * @param {number} [yProjected]
     *        The projected y position to keep stationary when zooming, if
     *        available space.
     *
     * @param {number} [chartX]
     *        Keep this chart position stationary if possible. This is used for
     *        example in `mousewheel` events, where the area under the mouse
     *        should be fixed as we zoom in.
     *
     * @param {number} [chartY]
     *        Keep this chart position stationary if possible.
     */
    MapChart.prototype.mapZoom = function (howMuch, xProjected, yProjected, chartX, chartY) {
        if (this.mapView) {
            if (isNumber(howMuch)) {
                // Compliance, mapView.zoomBy uses different values
                howMuch = Math.log(howMuch) / Math.log(0.5);
            }
            this.mapView.zoomBy(howMuch, isNumber(xProjected) && isNumber(yProjected) ?
                this.mapView.projection.inverse([xProjected, yProjected]) :
                void 0, isNumber(chartX) && isNumber(chartY) ?
                [chartX, chartY] :
                void 0);
        }
    };
    MapChart.prototype.update = function (options) {
        var _a;
        // Calculate and set the recommended map view if map option is set
        if (options.chart && 'map' in options.chart) {
            (_a = this.mapView) === null || _a === void 0 ? void 0 : _a.recommendMapView(this, __spreadArray([
                options.chart.map
            ], (this.options.series || []).map(function (s) { return s.mapData; }), true), true);
        }
        _super.prototype.update.apply(this, arguments);
    };
    return MapChart;
}(Chart));
/* *
 *
 *  Class Namespace
 *
 * */
(function (MapChart) {
    /* *
     *
     *  Constants
     *
     * */
    /**
     * Contains all loaded map data for Highmaps.
     *
     * @requires modules/map
     *
     * @name Highcharts.maps
     * @type {Record<string,*>}
     */
    MapChart.maps = {};
    /* *
     *
     *  Functions
     *
     * */
    /**
     * The factory function for creating new map charts. Creates a new {@link
     * Highcharts.MapChart|MapChart} object with different default options than
     * the basic Chart.
     *
     * @requires modules/map
     *
     * @function Highcharts.mapChart
     *
     * @param {string|Highcharts.HTMLDOMElement} [renderTo]
     *        The DOM element to render to, or its id.
     *
     * @param {Highcharts.Options} options
     *        The chart options structure as described in the
     *        [options reference](https://api.highcharts.com/highstock).
     *
     * @param {Highcharts.ChartCallbackFunction} [callback]
     *        A function to execute when the chart object is finished
     *        rendering and all external image files (`chart.backgroundImage`,
     *        `chart.plotBackgroundImage` etc) are loaded.  Defining a
     *        [chart.events.load](https://api.highcharts.com/highstock/chart.events.load)
     *        handler is equivalent.
     *
     * @return {Highcharts.MapChart}
     * The chart object.
     */
    function mapChart(a, b, c) {
        return new MapChart(a, b, c);
    }
    MapChart.mapChart = mapChart;
    /**
     * Utility for reading SVG paths directly.
     *
     * @requires modules/map
     *
     * @function Highcharts.splitPath
     *
     * @param {string|Array<(string|number)>} path
     *        Path to split.
     *
     * @return {Highcharts.SVGPathArray}
     * Splitted SVG path
     */
    function splitPath(path) {
        var arr;
        if (typeof path === 'string') {
            path = path
                // Move letters apart
                .replace(/([A-Z])/gi, ' $1 ')
                // Trim
                .replace(/^\s*/, '').replace(/\s*$/, '');
            // Split on spaces and commas. The semicolon is bogus, designed to
            // circumvent string replacement in the pre-v7 assembler that built
            // specific styled mode files.
            var split = path.split(/[ ,;]+/);
            arr = split.map(function (item) {
                if (!/[A-Z]/i.test(item)) {
                    return parseFloat(item);
                }
                return item;
            });
        }
        else {
            arr = path;
        }
        return SVGRenderer.prototype.pathToSegments(arr);
    }
    MapChart.splitPath = splitPath;
})(MapChart || (MapChart = {}));
/* *
 *
 *  Default Export
 *
 * */
export default MapChart;
