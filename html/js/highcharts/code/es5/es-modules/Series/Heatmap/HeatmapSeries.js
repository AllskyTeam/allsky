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
import Color from '../../Core/Color/Color.js';
import ColorMapComposition from '../ColorMapComposition.js';
import HeatmapPoint from './HeatmapPoint.js';
import HeatmapSeriesDefaults from './HeatmapSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var Series = SeriesRegistry.series, _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, ScatterSeries = _a.scatter;
import SVGRenderer from '../../Core/Renderer/SVG/SVGRenderer.js';
var symbols = SVGRenderer.prototype.symbols;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, fireEvent = U.fireEvent, isNumber = U.isNumber, merge = U.merge, pick = U.pick;
import IU from '../InterpolationUtilities.js';
var colorFromPoint = IU.colorFromPoint, getContext = IU.getContext;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.heatmap
 *
 * @augments Highcharts.Series
 */
var HeatmapSeries = /** @class */ (function (_super) {
    __extends(HeatmapSeries, _super);
    function HeatmapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.valueMax = NaN;
        _this.valueMin = NaN;
        _this.isDirtyCanvas = true;
        return _this;
        /* eslint-enable valid-jsdoc */
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    HeatmapSeries.prototype.drawPoints = function () {
        var series = this, seriesOptions = series.options, interpolation = seriesOptions.interpolation, seriesMarkerOptions = seriesOptions.marker || {};
        if (interpolation) {
            var image = series.image, chart = series.chart, xAxis = series.xAxis, yAxis = series.yAxis, _a = xAxis.reversed, xRev = _a === void 0 ? false : _a, width = xAxis.len, _b = yAxis.reversed, yRev = _b === void 0 ? false : _b, height = yAxis.len, dimensions = { width: width, height: height };
            if (!image || series.isDirtyData || series.isDirtyCanvas) {
                var ctx = getContext(series), canvas = series.canvas, _c = series.options, _d = _c.colsize, colsize = _d === void 0 ? 1 : _d, _e = _c.rowsize, rowsize = _e === void 0 ? 1 : _e, points = series.points, length_1 = series.points.length, pointsLen = length_1 - 1, colorAxis = (chart.colorAxis && chart.colorAxis[0]);
                if (canvas && ctx && colorAxis) {
                    var _f = xAxis.getExtremes(), xMin_1 = _f.min, xMax = _f.max, _g = yAxis.getExtremes(), yMin_1 = _g.min, yMax = _g.max, xDelta = xMax - xMin_1, yDelta = yMax - yMin_1, imgMultiple = 8.0, lastX = Math.round(imgMultiple * ((xDelta / colsize) / imgMultiple)), lastY = Math.round(imgMultiple * ((yDelta / rowsize) / imgMultiple)), _h = [
                        [lastX, lastX / xDelta, xRev, 'ceil'],
                        [lastY, lastY / yDelta, !yRev, 'floor']
                    ].map(function (_a) {
                        var last = _a[0], scale = _a[1], rev = _a[2], rounding = _a[3];
                        return (rev ?
                            function (v) { return (Math[rounding](last -
                                (scale * (v)))); } :
                            function (v) { return (Math[rounding](scale * v)); });
                    }), transformX_1 = _h[0], transformY_1 = _h[1], canvasWidth_1 = canvas.width = lastX + 1, canvasHeight = canvas.height = lastY + 1, canvasArea = canvasWidth_1 * canvasHeight, pixelToPointScale = pointsLen / canvasArea, pixelData = new Uint8ClampedArray(canvasArea * 4), pointInPixels = function (x, y) { return (Math.ceil((canvasWidth_1 * transformY_1(y - yMin_1)) +
                        transformX_1(x - xMin_1)) * 4); };
                    series.buildKDTree();
                    for (var i = 0; i < canvasArea; i++) {
                        var point = points[Math.ceil(pixelToPointScale * i)], x = point.x, y = point.y;
                        pixelData.set(colorFromPoint(point.value, point), pointInPixels(x, y));
                    }
                    ctx.putImageData(new ImageData(pixelData, canvasWidth_1), 0, 0);
                    if (image) {
                        image.attr(__assign(__assign({}, dimensions), { href: canvas.toDataURL('image/png', 1) }));
                    }
                    else {
                        series.directTouch = false;
                        series.image = chart.renderer.image(canvas.toDataURL('image/png', 1))
                            .attr(dimensions)
                            .add(series.group);
                    }
                }
                series.isDirtyCanvas = false;
            }
            else if (image.width !== width || image.height !== height) {
                image.attr(dimensions);
            }
        }
        else if (seriesMarkerOptions.enabled || series._hasPointMarkers) {
            Series.prototype.drawPoints.call(series);
            series.points.forEach(function (point) {
                if (point.graphic) {
                    // In styled mode, use CSS, otherwise the fill used in
                    // the style sheet will take precedence over
                    // the fill attribute.
                    point.graphic[series.chart.styledMode ? 'css' : 'animate'](series.colorAttribs(point));
                    if (point.value === null) { // #15708
                        point.graphic.addClass('highcharts-null-point');
                    }
                }
            });
        }
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.getExtremes = function () {
        // Get the extremes from the value data
        var _a = Series.prototype.getExtremes
            .call(this, this.getColumn('value')), dataMin = _a.dataMin, dataMax = _a.dataMax;
        if (isNumber(dataMin)) {
            this.valueMin = dataMin;
        }
        if (isNumber(dataMax)) {
            this.valueMax = dataMax;
        }
        // Get the extremes from the y data
        return Series.prototype.getExtremes.call(this);
    };
    /**
     * Override to also allow null points, used when building the k-d-tree for
     * tooltips in boost mode.
     * @private
     */
    HeatmapSeries.prototype.getValidPoints = function (points, insideOnly) {
        return Series.prototype.getValidPoints.call(this, points, insideOnly, true);
    };
    /**
     * Define hasData function for non-cartesian series. Returns true if the
     * series has points at all.
     * @private
     */
    HeatmapSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * Override the init method to add point ranges on both axes.
     * @private
     */
    HeatmapSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        var options = this.options;
        // #3758, prevent resetting in setData
        options.pointRange = pick(options.pointRange, options.colsize || 1);
        // General point range
        this.yAxis.axisPointRange = options.rowsize || 1;
        // Bind new symbol names
        symbols.ellipse = symbols.circle;
        // @todo
        //
        // Setting the border radius here is a workaround. It should be set in
        // the shapeArgs or returned from `markerAttribs`. However,
        // Series.drawPoints does not pick up markerAttribs to be passed over to
        // `renderer.symbol`. Also, image symbols are not positioned by their
        // top left corner like other symbols are. This should be refactored,
        // then we could save ourselves some tests for .hasImage etc. And the
        // evaluation of borderRadius would be moved to `markerAttribs`.
        if (options.marker && isNumber(options.borderRadius)) {
            options.marker.r = options.borderRadius;
        }
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.markerAttribs = function (point, state) {
        var shapeArgs = point.shapeArgs || {};
        if (point.hasImage) {
            return {
                x: point.plotX,
                y: point.plotY
            };
        }
        // Setting width and height attributes on image does not affect on its
        // dimensions.
        if (state && state !== 'normal') {
            var pointMarkerOptions = point.options.marker || {}, seriesMarkerOptions = this.options.marker || {}, seriesStateOptions = (seriesMarkerOptions.states &&
                seriesMarkerOptions.states[state]) || {}, pointStateOptions = (pointMarkerOptions.states &&
                pointMarkerOptions.states[state]) || {};
            // Set new width and height basing on state options.
            var width = (pointStateOptions.width ||
                seriesStateOptions.width ||
                shapeArgs.width ||
                0) + (pointStateOptions.widthPlus ||
                seriesStateOptions.widthPlus ||
                0);
            var height = (pointStateOptions.height ||
                seriesStateOptions.height ||
                shapeArgs.height ||
                0) + (pointStateOptions.heightPlus ||
                seriesStateOptions.heightPlus ||
                0);
            // Align marker by the new size.
            var x = (shapeArgs.x || 0) + ((shapeArgs.width || 0) - width) / 2, y = (shapeArgs.y || 0) + ((shapeArgs.height || 0) - height) / 2;
            return { x: x, y: y, width: width, height: height };
        }
        return shapeArgs;
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.pointAttribs = function (point, state) {
        var series = this, attr = Series.prototype.pointAttribs.call(series, point, state), seriesOptions = series.options || {}, plotOptions = series.chart.options.plotOptions || {}, seriesPlotOptions = plotOptions.series || {}, heatmapPlotOptions = plotOptions.heatmap || {}, 
        // Get old properties in order to keep backward compatibility
        borderColor = (point && point.options.borderColor) ||
            seriesOptions.borderColor ||
            heatmapPlotOptions.borderColor ||
            seriesPlotOptions.borderColor, borderWidth = (point && point.options.borderWidth) ||
            seriesOptions.borderWidth ||
            heatmapPlotOptions.borderWidth ||
            seriesPlotOptions.borderWidth ||
            attr['stroke-width'];
        // Apply lineColor, or set it to default series color.
        attr.stroke = ((point && point.marker && point.marker.lineColor) ||
            (seriesOptions.marker && seriesOptions.marker.lineColor) ||
            borderColor ||
            this.color);
        // Apply old borderWidth property if exists.
        attr['stroke-width'] = borderWidth;
        if (state && state !== 'normal') {
            var stateOptions = merge((seriesOptions.states &&
                seriesOptions.states[state]), (seriesOptions.marker &&
                seriesOptions.marker.states &&
                seriesOptions.marker.states[state]), (point &&
                point.options.states &&
                point.options.states[state] || {}));
            attr.fill =
                stateOptions.color ||
                    Color.parse(attr.fill).brighten(stateOptions.brightness || 0).get();
            attr.stroke = (stateOptions.lineColor || attr.stroke); // #17896
        }
        return attr;
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.translate = function () {
        var series = this, options = series.options, borderRadius = options.borderRadius, marker = options.marker, symbol = marker && marker.symbol || 'rect', shape = symbols[symbol] ? symbol : 'rect', hasRegularShape = ['circle', 'square'].indexOf(shape) !== -1;
        series.generatePoints();
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var cellAttr = point.getCellAttributes();
            var x = Math.min(cellAttr.x1, cellAttr.x2), y = Math.min(cellAttr.y1, cellAttr.y2), width = Math.max(Math.abs(cellAttr.x2 - cellAttr.x1), 0), height = Math.max(Math.abs(cellAttr.y2 - cellAttr.y1), 0);
            point.hasImage = (point.marker && point.marker.symbol || symbol || '').indexOf('url') === 0;
            // If marker shape is regular (square), find the shorter cell's
            // side.
            if (hasRegularShape) {
                var sizeDiff = Math.abs(width - height);
                x = Math.min(cellAttr.x1, cellAttr.x2) +
                    (width < height ? 0 : sizeDiff / 2);
                y = Math.min(cellAttr.y1, cellAttr.y2) +
                    (width < height ? sizeDiff / 2 : 0);
                width = height = Math.min(width, height);
            }
            if (point.hasImage) {
                point.marker = { width: width, height: height };
            }
            point.plotX = point.clientX = (cellAttr.x1 + cellAttr.x2) / 2;
            point.plotY = (cellAttr.y1 + cellAttr.y2) / 2;
            point.shapeType = 'path';
            point.shapeArgs = merge(true, { x: x, y: y, width: width, height: height }, {
                d: symbols[shape](x, y, width, height, { r: isNumber(borderRadius) ? borderRadius : 0 })
            });
        }
        fireEvent(series, 'afterTranslate');
    };
    HeatmapSeries.defaultOptions = merge(ScatterSeries.defaultOptions, HeatmapSeriesDefaults);
    return HeatmapSeries;
}(ScatterSeries));
addEvent(HeatmapSeries, 'afterDataClassLegendClick', function () {
    this.isDirtyCanvas = true;
    this.drawPoints();
});
extend(HeatmapSeries.prototype, {
    axisTypes: ColorMapComposition.seriesMembers.axisTypes,
    colorKey: ColorMapComposition.seriesMembers.colorKey,
    directTouch: true,
    getExtremesFromAll: true,
    keysAffectYAxis: ['y'],
    parallelArrays: ColorMapComposition.seriesMembers.parallelArrays,
    pointArrayMap: ['y', 'value'],
    pointClass: HeatmapPoint,
    specialGroup: 'group',
    trackerGroups: ColorMapComposition.seriesMembers.trackerGroups,
    /**
     * @private
     */
    alignDataLabel: ColumnSeries.prototype.alignDataLabel,
    colorAttribs: ColorMapComposition.seriesMembers.colorAttribs,
    getSymbol: Series.prototype.getSymbol
});
ColorMapComposition.compose(HeatmapSeries);
SeriesRegistry.registerSeriesType('heatmap', HeatmapSeries);
/* *
 *
 *  Default Export
 *
 * */
export default HeatmapSeries;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Heatmap series only. Padding between the points in the heatmap.
 * @name Highcharts.Point#pointPadding
 * @type {number|undefined}
 */
/**
 * Heatmap series only. The value of the point, resulting in a color
 * controlled by options as set in the colorAxis configuration.
 * @name Highcharts.Point#value
 * @type {number|null|undefined}
 */
/* *
 * @interface Highcharts.PointOptionsObject in parts/Point.ts
 */ /**
* Heatmap series only. Point padding for a single point.
* @name Highcharts.PointOptionsObject#pointPadding
* @type {number|undefined}
*/ /**
* Heatmap series only. The value of the point, resulting in a color controlled
* by options as set in the colorAxis configuration.
* @name Highcharts.PointOptionsObject#value
* @type {number|null|undefined}
*/
''; // Detach doclets above
