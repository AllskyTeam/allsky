/* *
 *
 *  Highcharts funnel module
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
import FunnelSeriesDefaults from './FunnelSeriesDefaults.js';
import H from '../../Core/Globals.js';
var composed = H.composed, noop = H.noop;
import BorderRadius from '../../Extensions/BorderRadius.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, ColumnSeries = _a.column, PieSeries = _a.pie;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, correctFloat = U.correctFloat, extend = U.extend, fireEvent = U.fireEvent, isArray = U.isArray, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique, relativeLength = U.relativeLength, splat = U.splat;
/* *
 *
 *  Constants
 *
 * */
var baseAlignDataLabel = SeriesRegistry.series.prototype.alignDataLabel;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get positions - either an integer or a percentage string must be
 * given.
 * @private
 * @param {number|string|undefined} length
 *        Length
 * @param {number} relativeTo
 *        Relative factor
 * @return {number}
 *         Relative position
 */
function getLength(length, relativeTo) {
    return (/%$/).test(length) ?
        relativeTo * parseInt(length, 10) / 100 :
        parseInt(length, 10);
}
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.funnel
 *
 * @augments Highcharts.Series
 */
var FunnelSeries = /** @class */ (function (_super) {
    __extends(FunnelSeries, _super);
    function FunnelSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * @private
     */
    FunnelSeries.prototype.alignDataLabel = function (point, dataLabel, options, alignTo, isNew) {
        var _a;
        var series = point.series, reversed = series.options.reversed, dlBox = point.dlBox || point.shapeArgs, align = options.align, _b = options.padding, padding = _b === void 0 ? 0 : _b, verticalAlign = options.verticalAlign, inside = ((series.options || {}).dataLabels || {}).inside, centerY = series.center[1], plotY = point.plotY || 0, pointPlotY = (reversed ?
            2 * centerY - plotY :
            plotY), 
        // #16176: Only SVGLabel has height set
        dataLabelHeight = (_a = dataLabel.height) !== null && _a !== void 0 ? _a : dataLabel.getBBox().height, widthAtLabel = series.getWidthAt(pointPlotY - dlBox.height / 2 +
            dataLabelHeight), offset = verticalAlign === 'middle' ?
            (dlBox.topWidth - dlBox.bottomWidth) / 4 :
            (widthAtLabel - dlBox.bottomWidth) / 2;
        var y = dlBox.y, x = dlBox.x;
        if (verticalAlign === 'middle') {
            y = dlBox.y - dlBox.height / 2 + dataLabelHeight / 2;
        }
        else if (verticalAlign === 'top') {
            y = dlBox.y - dlBox.height + dataLabelHeight + padding;
        }
        if (verticalAlign === 'top' && !reversed ||
            verticalAlign === 'bottom' && reversed ||
            verticalAlign === 'middle') {
            if (align === 'right') {
                x = dlBox.x - padding + offset;
            }
            else if (align === 'left') {
                x = dlBox.x + padding - offset;
            }
        }
        alignTo = {
            x: x,
            y: reversed ? y - dlBox.height : y,
            width: dlBox.bottomWidth,
            height: dlBox.height
        };
        options.verticalAlign = 'bottom';
        if (inside) {
            // If the distance were positive (as default), the overlapping
            // labels logic would skip these labels and they would be allowed
            // to overlap.
            options.distance = void 0;
        }
        // Call the parent method
        if (inside && point.visible) {
            baseAlignDataLabel.call(series, point, dataLabel, options, alignTo, isNew);
        }
        if (inside) {
            if (!point.visible && point.dataLabel) {
                // Avoid animation from top
                point.dataLabel.placed = false;
            }
            // If label is inside and we have contrast, set it:
            if (point.contrastColor) {
                dataLabel.css({
                    color: point.contrastColor
                });
            }
        }
    };
    /**
     * Extend the data label method.
     * @private
     */
    FunnelSeries.prototype.drawDataLabels = function () {
        (splat(this.options.dataLabels || {})[0].inside ?
            ColumnSeries :
            PieSeries).prototype.drawDataLabels.call(this);
    };
    /** @private */
    FunnelSeries.prototype.getDataLabelPosition = function (point, distance) {
        var y = point.plotY || 0, sign = point.half ? 1 : -1, x = this.getX(y, !!point.half, point);
        return {
            distance: distance,
            // Initial position of the data label - it's utilized for finding
            // the final position for the label
            natural: {
                x: 0,
                y: y
            },
            computed: {
            // Used for generating connector path - initialized later in
            // drawDataLabels function x: undefined, y: undefined
            },
            // Left - funnel on the left side of the data label
            // Right - funnel on the right side of the data label
            alignment: point.half ? 'right' : 'left',
            connectorPosition: {
                breakAt: {
                    x: x + (distance - 5) * sign,
                    y: y
                },
                touchingSliceAt: {
                    x: x + distance * sign,
                    y: y
                }
            }
        };
    };
    /**
     * Overrides the pie translate method.
     * @private
     */
    FunnelSeries.prototype.translate = function () {
        var series = this, chart = series.chart, options = series.options, reversed = options.reversed, ignoreHiddenPoint = options.ignoreHiddenPoint, borderRadiusObject = BorderRadius.optionsToObject(options.borderRadius), plotWidth = chart.plotWidth, plotHeight = chart.plotHeight, center = options.center, centerX = getLength(center[0], plotWidth), centerY = getLength(center[1], plotHeight), width = getLength(options.width, plotWidth), height = getLength(options.height, plotHeight), neckWidth = getLength(options.neckWidth, plotWidth), neckHeight = getLength(options.neckHeight, plotHeight), neckY = (centerY - height / 2) + height - neckHeight, points = series.points, borderRadius = relativeLength(borderRadiusObject.radius, width), radiusScope = borderRadiusObject.scope, half = (options.dataLabels.position === 'left' ?
            1 :
            0), roundingFactors = function (angle) {
            var tan = Math.tan(angle / 2), cosA = Math.cos(alpha), sinA = Math.sin(alpha);
            var r = borderRadius, t = r / tan, k = Math.tan((Math.PI - angle) / 3.2104);
            if (t > maxT) {
                t = maxT;
                r = t * tan;
            }
            k *= r;
            return {
                dx: [t * cosA, (t - k) * cosA, t - k, t],
                dy: [t * sinA, (t - k) * sinA, t - k, t]
                    .map(function (i) { return (reversed ? -i : i); })
            };
        };
        var sum = 0, cumulative = 0, // Start at top
        tempWidth, path, fraction, alpha, // The angle between top and left point's edges
        maxT, x1, y1, x2, x3, y3, x4, y5;
        series.getWidthAt = function (y) {
            var top = (centerY - height / 2);
            return (y > neckY || height === neckHeight) ?
                neckWidth :
                neckWidth + (width - neckWidth) *
                    (1 - (y - top) / (height - neckHeight));
        };
        series.getX = function (y, half, point) {
            var _a, _b, _c, _d;
            return centerX + (half ? -1 : 1) *
                ((series.getWidthAt(reversed ? 2 * centerY - y : y) / 2) +
                    ((_c = (_b = (_a = point.dataLabel) === null || _a === void 0 ? void 0 : _a.dataLabelPosition) === null || _b === void 0 ? void 0 : _b.distance) !== null && _c !== void 0 ? _c : relativeLength(((_d = this.options.dataLabels) === null || _d === void 0 ? void 0 : _d.distance) || 0, width)));
        };
        // Expose
        series.center = [centerX, centerY, height];
        series.centerX = centerX;
        /*
        Individual point coordinate naming:

        x1,y1 _________________ x2,y1
        \                         /
         \                       /
          \                     /
           \                   /
            \                 /
           x3,y3 _________ x4,y3

        Additional for the base of the neck:

             |               |
             |               |
             |               |
           x3,y5 _________ x4,y5

        */
        // get the total sum
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            if (point.y && point.isValid() &&
                (!ignoreHiddenPoint || point.visible !== false)) {
                sum += point.y;
            }
        }
        for (var _a = 0, points_2 = points; _a < points_2.length; _a++) {
            var point = points_2[_a];
            // Set start and end positions
            y5 = null;
            fraction = sum ? point.y / sum : 0;
            y1 = centerY - height / 2 + cumulative * height;
            y3 = y1 + fraction * height;
            tempWidth = series.getWidthAt(y1);
            x1 = centerX - tempWidth / 2;
            x2 = x1 + tempWidth;
            tempWidth = series.getWidthAt(y3);
            x3 = centerX - tempWidth / 2;
            x4 = x3 + tempWidth;
            // The entire point is within the neck
            if (correctFloat(y1) >= neckY) {
                x1 = x3 = centerX - neckWidth / 2;
                x2 = x4 = centerX + neckWidth / 2;
                // The base of the neck
            }
            else if (y3 > neckY) {
                y5 = y3;
                tempWidth = series.getWidthAt(neckY);
                x3 = centerX - tempWidth / 2;
                x4 = x3 + tempWidth;
                y3 = neckY;
            }
            if (reversed) {
                y1 = 2 * centerY - y1;
                y3 = 2 * centerY - y3;
                if (y5 !== null) {
                    y5 = 2 * centerY - y5;
                }
            }
            if (borderRadius && (radiusScope === 'point' ||
                point.index === 0 ||
                point.index === points.length - 1 ||
                y5 !== null)) {
                // Creating the path of funnel points with rounded corners
                // (#18839)
                var h = Math.abs(y3 - y1), xSide = x2 - x4, lBase = x4 - x3, lSide = Math.sqrt(xSide * xSide + h * h);
                // If xSide equals zero, return Infinity to avoid dividing
                // by zero (#20319)
                alpha = Math.atan(xSide !== 0 ? h / xSide : Infinity);
                maxT = lSide / 2;
                if (y5 !== null) {
                    maxT = Math.min(maxT, Math.abs(y5 - y3) / 2);
                }
                if (lBase >= 1) {
                    maxT = Math.min(maxT, lBase / 2);
                }
                // Creating a point base
                var f = roundingFactors(alpha);
                if (radiusScope === 'stack' && point.index !== 0) {
                    path = [
                        ['M', x1, y1],
                        ['L', x2, y1]
                    ];
                }
                else {
                    path = [
                        ['M', x1 + f.dx[0], y1 + f.dy[0]],
                        [
                            'C',
                            x1 + f.dx[1], y1 + f.dy[1],
                            x1 + f.dx[2], y1,
                            x1 + f.dx[3], y1
                        ],
                        ['L', x2 - f.dx[3], y1],
                        [
                            'C',
                            x2 - f.dx[2], y1,
                            x2 - f.dx[1], y1 + f.dy[1],
                            x2 - f.dx[0], y1 + f.dy[0]
                        ]
                    ];
                }
                if (y5 !== null) {
                    // Closure of point with extension
                    var fr = roundingFactors(Math.PI / 2);
                    f = roundingFactors(Math.PI / 2 + alpha);
                    path.push(['L', x4 + f.dx[0], y3 - f.dy[0]], [
                        'C',
                        x4 + f.dx[1], y3 - f.dy[1],
                        x4, y3 + f.dy[2],
                        x4, y3 + f.dy[3]
                    ]);
                    if (radiusScope === 'stack' &&
                        point.index !== points.length - 1) {
                        path.push(['L', x4, y5], ['L', x3, y5]);
                    }
                    else {
                        path.push(['L', x4, y5 - fr.dy[3]], [
                            'C',
                            x4, y5 - fr.dy[2],
                            x4 - fr.dx[2], y5,
                            x4 - fr.dx[3], y5
                        ], ['L', x3 + fr.dx[3], y5], [
                            'C',
                            x3 + fr.dx[2], y5,
                            x3, y5 - fr.dy[2],
                            x3, y5 - fr.dy[3]
                        ]);
                    }
                    path.push(['L', x3, y3 + f.dy[3]], [
                        'C',
                        x3, y3 + f.dy[2],
                        x3 - f.dx[1], y3 - f.dy[1],
                        x3 - f.dx[0], y3 - f.dy[0]
                    ]);
                }
                else if (lBase >= 1) {
                    // Closure of point without extension
                    f = roundingFactors(Math.PI - alpha);
                    if (radiusScope === 'stack' && point.index === 0) {
                        path.push(['L', x4, y3], ['L', x3, y3]);
                    }
                    else {
                        path.push(['L', x4 + f.dx[0], y3 - f.dy[0]], [
                            'C',
                            x4 + f.dx[1], y3 - f.dy[1],
                            x4 - f.dx[2], y3,
                            x4 - f.dx[3], y3
                        ], ['L', x3 + f.dx[3], y3], [
                            'C',
                            x3 + f.dx[2], y3,
                            x3 - f.dx[1], y3 - f.dy[1],
                            x3 - f.dx[0], y3 - f.dy[0]
                        ]);
                    }
                }
                else {
                    // Creating a rounded tip of the "pyramid"
                    f = roundingFactors(Math.PI - alpha * 2);
                    path.push(['L', x3 + f.dx[0], y3 - f.dy[0]], [
                        'C',
                        x3 + f.dx[1], y3 - f.dy[1],
                        x3 - f.dx[1], y3 - f.dy[1],
                        x3 - f.dx[0], y3 - f.dy[0]
                    ]);
                }
            }
            else {
                // Creating the path of funnel points without rounded corners
                path = [
                    ['M', x1, y1],
                    ['L', x2, y1],
                    ['L', x4, y3]
                ];
                if (y5 !== null) {
                    path.push(['L', x4, y5], ['L', x3, y5]);
                }
                path.push(['L', x3, y3]);
            }
            path.push(['Z']);
            // Prepare for using shared dr
            point.shapeType = 'path';
            point.shapeArgs = { d: path };
            // For tooltips and data labels
            point.percentage = fraction * 100;
            point.plotX = centerX;
            point.plotY = (y1 + (y5 || y3)) / 2;
            // Placement of tooltips and data labels
            point.tooltipPos = [
                centerX,
                point.plotY
            ];
            point.dlBox = {
                x: x3,
                y: y1,
                topWidth: x2 - x1,
                bottomWidth: x4 - x3,
                height: Math.abs(pick(y5, y3) - y1),
                width: NaN
            };
            // Slice is a noop on funnel points
            point.slice = noop;
            // Mimicking pie data label placement logic
            point.half = half;
            if (point.isValid() &&
                (!ignoreHiddenPoint || point.visible !== false)) {
                cumulative += fraction;
            }
        }
        fireEvent(series, 'afterTranslate');
    };
    /**
     * Funnel items don't have angles (#2289).
     * @private
     */
    FunnelSeries.prototype.sortByAngle = function (points) {
        points.sort(function (a, b) { return (a.plotY - b.plotY); });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    FunnelSeries.defaultOptions = merge(PieSeries.defaultOptions, FunnelSeriesDefaults);
    return FunnelSeries;
}(PieSeries));
extend(FunnelSeries.prototype, {
    animate: noop
});
/* *
 *
 *  Class Namespace
 *
 * */
(function (FunnelSeries) {
    /* *
     *
     *  Functions
     *
     * */
    /** @private */
    function compose(ChartClass) {
        if (pushUnique(composed, 'FunnelSeries')) {
            addEvent(ChartClass, 'afterHideAllOverlappingLabels', onChartAfterHideAllOverlappingLabels);
        }
    }
    FunnelSeries.compose = compose;
    /** @private */
    function onChartAfterHideAllOverlappingLabels() {
        for (var _i = 0, _a = this.series; _i < _a.length; _i++) {
            var series = _a[_i];
            var dataLabelsOptions = series.options && series.options.dataLabels;
            if (isArray(dataLabelsOptions)) {
                dataLabelsOptions = dataLabelsOptions[0];
            }
            if (series.is('pie') &&
                series.placeDataLabels &&
                dataLabelsOptions &&
                !dataLabelsOptions.inside) {
                series.placeDataLabels();
            }
        }
    }
})(FunnelSeries || (FunnelSeries = {}));
SeriesRegistry.registerSeriesType('funnel', FunnelSeries);
/* *
 *
 *  Default Export
 *
 * */
export default FunnelSeries;
