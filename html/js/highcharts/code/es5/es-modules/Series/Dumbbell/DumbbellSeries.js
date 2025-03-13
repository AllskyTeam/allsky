/* *
 *
 *  (c) 2010-2024 Sebastian Bochan, Rafal Sebestjanski
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
import DumbbellPoint from './DumbbellPoint.js';
import DumbbellSeriesDefaults from './DumbbellSeriesDefaults.js';
import H from '../../Core/Globals.js';
var noop = H.noop;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, AreaRangeSeries = _a.arearange, ColumnSeries = _a.column, ColumnRangeSeries = _a.columnrange;
import SVGRenderer from '../../Core/Renderer/SVG/SVGRenderer.js';
import U from '../../Core/Utilities.js';
var extend = U.extend, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * The dumbbell series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.dumbbell
 *
 * @augments Highcharts.Series
 */
var DumbbellSeries = /** @class */ (function (_super) {
    __extends(DumbbellSeries, _super);
    function DumbbellSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Get connector line path and styles that connects dumbbell point's low and
     * high values.
     * @private
     *
     * @param {Highcharts.Point} point The point to inspect.
     *
     * @return {Highcharts.SVGAttributes} attribs The path and styles.
     */
    DumbbellSeries.prototype.getConnectorAttribs = function (point) {
        var series = this, chart = series.chart, pointOptions = point.options, seriesOptions = series.options, xAxis = series.xAxis, yAxis = series.yAxis, connectorWidthPlus = pick(seriesOptions.states &&
            seriesOptions.states.hover &&
            seriesOptions.states.hover.connectorWidthPlus, 1), dashStyle = pick(pointOptions.dashStyle, seriesOptions.dashStyle), pxThreshold = yAxis.toPixels(seriesOptions.threshold || 0, true), pointHeight = chart.inverted ?
            yAxis.len - pxThreshold : pxThreshold;
        var connectorWidth = pick(pointOptions.connectorWidth, seriesOptions.connectorWidth), connectorColor = pick(pointOptions.connectorColor, seriesOptions.connectorColor, pointOptions.color, point.zone ? point.zone.color : void 0, point.color), pointTop = pick(point.plotLow, point.plotY), pointBottom = pick(point.plotHigh, pointHeight), origProps;
        if (typeof pointTop !== 'number') {
            return {};
        }
        if (point.state) {
            connectorWidth = connectorWidth + connectorWidthPlus;
        }
        if (pointTop < 0) {
            pointTop = 0;
        }
        else if (pointTop >= yAxis.len) {
            pointTop = yAxis.len;
        }
        if (pointBottom < 0) {
            pointBottom = 0;
        }
        else if (pointBottom >= yAxis.len) {
            pointBottom = yAxis.len;
        }
        if (point.plotX < 0 || point.plotX > xAxis.len) {
            connectorWidth = 0;
        }
        // Connector should reflect upper marker's zone color
        if (point.graphics && point.graphics[1]) {
            origProps = {
                y: point.y,
                zone: point.zone
            };
            point.y = point.high;
            point.zone = point.zone ? point.getZone() : void 0;
            connectorColor = pick(pointOptions.connectorColor, seriesOptions.connectorColor, pointOptions.color, point.zone ? point.zone.color : void 0, point.color);
            extend(point, origProps);
        }
        var attribs = {
            d: SVGRenderer.prototype.crispLine([[
                    'M',
                    point.plotX,
                    pointTop
                ], [
                    'L',
                    point.plotX,
                    pointBottom
                ]], connectorWidth)
        };
        if (!chart.styledMode) {
            attribs.stroke = connectorColor;
            attribs['stroke-width'] = connectorWidth;
            if (dashStyle) {
                attribs.dashstyle = dashStyle;
            }
        }
        return attribs;
    };
    /**
     * Draw connector line that connects dumbbell point's low and high values.
     * @private
     * @param {Highcharts.Point} point
     *        The point to inspect.
     */
    DumbbellSeries.prototype.drawConnector = function (point) {
        var series = this, animationLimit = pick(series.options.animationLimit, 250), verb = point.connector && series.chart.pointCount < animationLimit ?
            'animate' : 'attr';
        if (!point.connector) {
            point.connector = series.chart.renderer.path()
                .addClass('highcharts-lollipop-stem')
                .attr({
                zIndex: -1
            })
                .add(series.group);
        }
        point.connector[verb](this.getConnectorAttribs(point));
    };
    /**
     * Return the width and x offset of the dumbbell adjusted for grouping,
     * groupPadding, pointPadding, pointWidth etc.
     * @private
     */
    DumbbellSeries.prototype.getColumnMetrics = function () {
        var metrics = ColumnSeries.prototype
            .getColumnMetrics.apply(this, arguments);
        metrics.offset += metrics.width / 2;
        return metrics;
    };
    /**
     * Translate each point to the plot area coordinate system and find
     * shape positions
     * @private
     */
    DumbbellSeries.prototype.translate = function () {
        var series = this, inverted = series.chart.inverted;
        // Calculate shapeargs
        this.setShapeArgs.apply(series);
        // Calculate point low / high values
        this.translatePoint.apply(series, arguments);
        // Correct x position
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var pointWidth = point.pointWidth, _b = point.shapeArgs, shapeArgs = _b === void 0 ? {} : _b, tooltipPos = point.tooltipPos;
            point.plotX = shapeArgs.x || 0;
            shapeArgs.x = point.plotX - pointWidth / 2;
            if (tooltipPos) {
                if (inverted) {
                    tooltipPos[1] = series.xAxis.len - point.plotX;
                }
                else {
                    tooltipPos[0] = point.plotX;
                }
            }
        }
        series.columnMetrics.offset -= series.columnMetrics.width / 2;
    };
    /**
     * Extend the arearange series' drawPoints method by applying a connector
     * and coloring markers.
     * @private
     */
    DumbbellSeries.prototype.drawPoints = function () {
        var _a;
        var series = this, chart = series.chart, pointLength = series.points.length, seriesLowColor = series.lowColor = series.options.lowColor, seriesLowMarker = series.options.lowMarker;
        var i = 0, lowerGraphicColor, point, zoneColor;
        this.seriesDrawPoints.apply(series, arguments);
        // Draw connectors and color upper markers
        while (i < pointLength) {
            point = series.points[i];
            var _b = point.graphics || [], lowerGraphic = _b[0], upperGraphic = _b[1];
            series.drawConnector(point);
            if (upperGraphic) {
                upperGraphic.element.point = point;
                upperGraphic.addClass('highcharts-lollipop-high');
            }
            ((_a = point.connector) === null || _a === void 0 ? void 0 : _a.element).point = point;
            if (lowerGraphic) {
                zoneColor = point.zone && point.zone.color;
                lowerGraphicColor = pick(point.options.lowColor, seriesLowMarker === null || seriesLowMarker === void 0 ? void 0 : seriesLowMarker.fillColor, seriesLowColor, point.options.color, zoneColor, point.color, series.color);
                if (!chart.styledMode) {
                    lowerGraphic.attr({
                        fill: lowerGraphicColor
                    });
                }
                lowerGraphic.addClass('highcharts-lollipop-low');
            }
            i++;
        }
    };
    /**
     * Get presentational attributes.
     *
     * @private
     * @function Highcharts.seriesTypes.column#pointAttribs
     *
     * @param {Highcharts.Point} point
     *        The point to inspect.
     *
     * @param {string} state
     *        Current state of point (normal, hover, select).
     *
     * @return {Highcharts.SVGAttributes}
     *         Presentational attributes.
     */
    DumbbellSeries.prototype.pointAttribs = function (point, state) {
        var pointAttribs = _super.prototype.pointAttribs.apply(this, arguments);
        if (state === 'hover') {
            delete pointAttribs.fill;
        }
        return pointAttribs;
    };
    /**
     * Set the shape arguments for dummbells.
     * @private
     */
    DumbbellSeries.prototype.setShapeArgs = function () {
        ColumnSeries.prototype.translate.apply(this);
        ColumnRangeSeries.prototype.afterColumnTranslate.apply(this);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    DumbbellSeries.defaultOptions = merge(AreaRangeSeries.defaultOptions, DumbbellSeriesDefaults);
    return DumbbellSeries;
}(AreaRangeSeries));
extend(DumbbellSeries.prototype, {
    crispCol: ColumnSeries.prototype.crispCol,
    drawGraph: noop,
    drawTracker: ColumnSeries.prototype.drawTracker,
    pointClass: DumbbellPoint,
    seriesDrawPoints: AreaRangeSeries.prototype.drawPoints,
    trackerGroups: ['group', 'markerGroup', 'dataLabelsGroup'],
    translatePoint: AreaRangeSeries.prototype.translate
});
SeriesRegistry.registerSeriesType('dumbbell', DumbbellSeries);
/* *
 *
 *  Default Export
 *
 * */
export default DumbbellSeries;
