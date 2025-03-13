/* *
 *
 *  Timeline Series.
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Daniel Studencki
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
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, LineSeries = _a.line;
import TimelinePoint from './TimelinePoint.js';
import TimelineSeriesDefaults from './TimelineSeriesDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, arrayMax = U.arrayMax, arrayMin = U.arrayMin, defined = U.defined, extend = U.extend, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * The timeline series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.timeline
 *
 * @augments Highcharts.Series
 */
var TimelineSeries = /** @class */ (function (_super) {
    __extends(TimelineSeries, _super);
    function TimelineSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    TimelineSeries.prototype.alignDataLabel = function (point, dataLabel, _options, _alignTo) {
        var _a;
        var series = this, isInverted = series.chart.inverted, visiblePoints = series.visibilityMap.filter(function (point) { return !!point; }), visiblePointsCount = series.visiblePointsCount || 0, pointIndex = visiblePoints.indexOf(point), isFirstOrLast = (!pointIndex || pointIndex === visiblePointsCount - 1), dataLabelsOptions = series.options.dataLabels, userDLOptions = point.userDLOptions || {}, 
        // Define multiplier which is used to calculate data label
        // width. If data labels are alternate, they have two times more
        // space to adapt (excepting first and last ones, which has only
        // one and half), than in case of placing all data labels side
        // by side.
        multiplier = dataLabelsOptions.alternate ?
            (isFirstOrLast ? 1.5 : 2) :
            1, availableSpace = Math.floor(series.xAxis.len / visiblePointsCount), pad = dataLabel.padding;
        var distance, targetDLWidth, styles;
        // Adjust data label width to the currently available space.
        if (point.visible) {
            distance = Math.abs(userDLOptions.x || point.options.dataLabels.x);
            if (isInverted) {
                targetDLWidth = ((distance - pad) * 2 - ((point.itemHeight || 0) / 2));
                styles = {
                    width: pick((_a = dataLabelsOptions.style) === null || _a === void 0 ? void 0 : _a.width, "".concat(series.yAxis.len * 0.4, "px")),
                    // Apply ellipsis when data label height is exceeded.
                    textOverflow: (dataLabel.width || 0) / targetDLWidth *
                        (dataLabel.height || 0) / 2 > availableSpace *
                        multiplier ?
                        'ellipsis' : 'none'
                };
            }
            else {
                styles = {
                    width: (userDLOptions.width ||
                        dataLabelsOptions.width ||
                        availableSpace * multiplier - (pad * 2)) + 'px'
                };
            }
            dataLabel.css(styles);
            if (!series.chart.styledMode) {
                dataLabel.shadow(dataLabelsOptions.shadow);
            }
        }
        _super.prototype.alignDataLabel.apply(series, arguments);
    };
    TimelineSeries.prototype.bindAxes = function () {
        var series = this;
        _super.prototype.bindAxes.call(this);
        // Initially set the linked xAxis type to category.
        if (!series.xAxis.userOptions.type) {
            series.xAxis.categories = series.xAxis.hasNames = true;
        }
    };
    TimelineSeries.prototype.distributeDL = function () {
        var _a;
        var series = this, dataLabelsOptions = series.options.dataLabels, inverted = series.chart.inverted;
        var visibilityIndex = 1;
        if (dataLabelsOptions) {
            var distance = pick(dataLabelsOptions.distance, inverted ? 20 : 100);
            for (var _i = 0, _b = series.points; _i < _b.length; _i++) {
                var point = _b[_i];
                var defaults = (_a = {},
                    _a[inverted ? 'x' : 'y'] = dataLabelsOptions.alternate && visibilityIndex % 2 ?
                        -distance : distance,
                    _a);
                if (inverted) {
                    defaults.align = (dataLabelsOptions.alternate && visibilityIndex % 2) ? 'right' : 'left';
                }
                point.options.dataLabels = merge(defaults, point.userDLOptions);
                visibilityIndex++;
            }
        }
    };
    TimelineSeries.prototype.generatePoints = function () {
        _super.prototype.generatePoints.call(this);
        var series = this, points = series.points, xData = series.getColumn('x');
        for (var i = 0, iEnd = points.length; i < iEnd; ++i) {
            points[i].applyOptions({
                x: xData[i]
            }, xData[i]);
        }
    };
    TimelineSeries.prototype.getVisibilityMap = function () {
        var series = this, map = ((series.data.length ? series.data : series.options.data) || []).map(function (point) { return (point && point.visible !== false && !point.isNull ?
            point :
            false); });
        return map;
    };
    TimelineSeries.prototype.getXExtremes = function (xData) {
        var series = this, filteredData = xData.filter(function (_x, i) { return (series.points[i].isValid() &&
            series.points[i].visible); });
        return {
            min: arrayMin(filteredData),
            max: arrayMax(filteredData)
        };
    };
    TimelineSeries.prototype.init = function () {
        var series = this;
        _super.prototype.init.apply(series, arguments);
        series.eventsToUnbind.push(addEvent(series, 'afterTranslate', function () {
            var lastPlotX, closestPointRangePx = Number.MAX_VALUE;
            for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
                var point = _a[_i];
                // Set the isInside parameter basing also on the real point
                // visibility, in order to avoid showing hidden points
                // in drawPoints method.
                point.isInside = point.isInside && point.visible;
                // New way of calculating closestPointRangePx value, which
                // respects the real point visibility is needed.
                if (point.visible && !point.isNull) {
                    if (defined(lastPlotX)) {
                        closestPointRangePx = Math.min(closestPointRangePx, Math.abs(point.plotX - lastPlotX));
                    }
                    lastPlotX = point.plotX;
                }
            }
            series.closestPointRangePx = closestPointRangePx;
        }));
        // Distribute data labels before rendering them. Distribution is
        // based on the 'dataLabels.distance' and 'dataLabels.alternate'
        // property.
        series.eventsToUnbind.push(addEvent(series, 'drawDataLabels', function () {
            // Distribute data labels basing on defined algorithm.
            series.distributeDL(); // @todo use this scope for series
        }));
        series.eventsToUnbind.push(addEvent(series, 'afterDrawDataLabels', function () {
            var dataLabel; // @todo use this scope for series
            // Draw or align connector for each point.
            for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
                var point = _a[_i];
                dataLabel = point.dataLabel;
                if (dataLabel) {
                    // Within this wrap method is necessary to save the
                    // current animation params, because the data label
                    // target position (after animation) is needed to align
                    // connectors.
                    dataLabel.animate = function (params) {
                        if (this.targetPosition) {
                            this.targetPosition = params;
                        }
                        return this.renderer.Element.prototype
                            .animate.apply(this, arguments);
                    };
                    // Initialize the targetPosition field within data label
                    // object. It's necessary because there is need to know
                    // expected position of specific data label, when
                    // aligning connectors. This field is overridden inside
                    // of SVGElement.animate() wrapped method.
                    if (!dataLabel.targetPosition) {
                        dataLabel.targetPosition = {};
                    }
                    point.drawConnector();
                }
            }
        }));
        series.eventsToUnbind.push(addEvent(series.chart, 'afterHideOverlappingLabel', function () {
            for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
                var p = _a[_i];
                if (p.dataLabel &&
                    p.dataLabel.connector &&
                    p.dataLabel.oldOpacity !== p.dataLabel.newOpacity) {
                    p.alignConnector();
                }
            }
        }));
    };
    TimelineSeries.prototype.markerAttribs = function (point, state) {
        var series = this, seriesMarkerOptions = series.options.marker, pointMarkerOptions = point.marker || {}, symbol = (pointMarkerOptions.symbol || seriesMarkerOptions.symbol), width = pick(pointMarkerOptions.width, seriesMarkerOptions.width, series.closestPointRangePx), height = pick(pointMarkerOptions.height, seriesMarkerOptions.height);
        var seriesStateOptions, pointStateOptions, radius = 0;
        // Call default markerAttribs method, when the xAxis type
        // is set to datetime.
        if (series.xAxis.dateTime) {
            return _super.prototype.markerAttribs.call(this, point, state);
        }
        // Handle hover and select states
        if (state) {
            seriesStateOptions =
                seriesMarkerOptions.states[state] || {};
            pointStateOptions = pointMarkerOptions.states &&
                pointMarkerOptions.states[state] || {};
            radius = pick(pointStateOptions.radius, seriesStateOptions.radius, radius + (seriesStateOptions.radiusPlus || 0));
        }
        point.hasImage = (symbol && symbol.indexOf('url') === 0);
        var attribs = {
            x: Math.floor(point.plotX) - (width / 2) - (radius / 2),
            y: point.plotY - (height / 2) - (radius / 2),
            width: width + radius,
            height: height + radius
        };
        return (series.chart.inverted) ? {
            y: (attribs.x && attribs.width) &&
                series.xAxis.len - attribs.x - attribs.width,
            x: attribs.y && attribs.y,
            width: attribs.height,
            height: attribs.width
        } : attribs;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    TimelineSeries.defaultOptions = merge(LineSeries.defaultOptions, TimelineSeriesDefaults);
    return TimelineSeries;
}(LineSeries));
// Add series-specific properties after data is already processed, #17890
addEvent(TimelineSeries, 'afterProcessData', function () {
    var series = this, xData = series.getColumn('x');
    var visiblePoints = 0;
    series.visibilityMap = series.getVisibilityMap();
    // Calculate currently visible points.
    for (var _i = 0, _a = series.visibilityMap; _i < _a.length; _i++) {
        var point = _a[_i];
        if (point) {
            visiblePoints++;
        }
    }
    series.visiblePointsCount = visiblePoints;
    this.dataTable.setColumn('y', new Array(xData.length).fill(1));
});
extend(TimelineSeries.prototype, {
    // Use a group of trackers from TrackerMixin
    drawTracker: ColumnSeries.prototype.drawTracker,
    pointClass: TimelinePoint,
    trackerGroups: ['markerGroup', 'dataLabelsGroup']
});
SeriesRegistry.registerSeriesType('timeline', TimelineSeries);
/* *
 *
 *  Default Export
 *
 * */
export default TimelineSeries;
