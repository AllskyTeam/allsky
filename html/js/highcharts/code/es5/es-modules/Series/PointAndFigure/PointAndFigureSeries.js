/* *
 *
 *  (c) 2010-2024 Kamil Musialowski
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
/* *
 *  Imports
 *
 * */
import PointAndFigurePoint from './PointAndFigurePoint.js';
import PointAndFigureSeriesDefaults from './PointAndFigureSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import PointAndFigureSymbols from './PointAndFigureSymbols.js';
import H from '../../Core/Globals.js';
import U from '../../Core/Utilities.js';
var composed = H.composed;
var _a = SeriesRegistry.seriesTypes, ScatterSeries = _a.scatter, columnProto = _a.column.prototype;
var extend = U.extend, merge = U.merge, pushUnique = U.pushUnique, isNumber = U.isNumber, relativeLength = U.relativeLength;
/* *
 *
 *  Declarations
 *
 * */
/* *
 *
 *  Functions
 *
 * */
/* *
 *
 *  Class
 *
 * */
/**
 * The series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pointandfigure
 *
 * @augments Highcharts.Series
 */
var PointAndFigureSeries = /** @class */ (function (_super) {
    __extends(PointAndFigureSeries, _super);
    function PointAndFigureSeries() {
        /* *
         *
         *  Static Properties
         *
        * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.allowDG = false;
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    PointAndFigureSeries.compose = function (SVGRendererClass) {
        if (pushUnique(composed, 'pointandfigure')) {
            PointAndFigureSymbols.compose(SVGRendererClass);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    PointAndFigureSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        this.pnfDataGroups = [];
    };
    PointAndFigureSeries.prototype.getProcessedData = function () {
        if (!this.pnfDataGroups) {
            return {
                modified: this.dataTable.modified,
                cropped: false,
                cropStart: 0,
                closestPointRange: 1
            };
        }
        var series = this, modified = this.dataTable.modified, options = series.options, xData = series.getColumn('x', true), yData = series.getColumn('y', true), boxSize = options.boxSize, calculatedBoxSize = isNumber(boxSize) ?
            boxSize : relativeLength(boxSize, yData[0]), pnfDataGroups = series.pnfDataGroups, reversal = calculatedBoxSize * options.reversalAmount;
        series.calculatedBoxSize = calculatedBoxSize;
        var upTrend;
        /**
         * Get the Y value of last data point, from the last PNF group.
         * @private
         * @function Highcharts.seriesTypes.pointandfigure#getLastPoint
         */
        function getLastPoint(pnfDataGroups) {
            var y = pnfDataGroups[pnfDataGroups.length - 1].y;
            return y[y.length - 1];
        }
        /**
         * Push new data point to the last PNF group.
         * @private
         * @function Highcharts.seriesTypes.pointandfigure#pushNewPoint
         */
        function pushNewPoint(y, upTrend, lastPoint) {
            var currPointGroup = pnfDataGroups[pnfDataGroups.length - 1], flipFactor = upTrend ? 1 : -1, times = Math.floor(flipFactor * (y - lastPoint) / calculatedBoxSize);
            for (var i = 1; i <= times; i++) {
                var newPoint = lastPoint + flipFactor * (calculatedBoxSize * i);
                currPointGroup.y.push(newPoint);
            }
        }
        if (this.isDirtyData || pnfDataGroups.length === 0) {
            this.pnfDataGroups.length = 0;
            // Get first point and determine its symbol and trend
            for (var i = 0; i < yData.length; i++) {
                var x = xData[i], close_1 = yData[i], firstPoint = yData[0];
                if (close_1 - firstPoint >= calculatedBoxSize) {
                    upTrend = true;
                    pnfDataGroups.push({ x: x, y: [close_1], upTrend: upTrend });
                    break;
                }
                if (firstPoint - close_1 >= calculatedBoxSize) {
                    upTrend = false;
                    pnfDataGroups.push({ x: x, y: [close_1], upTrend: upTrend });
                    break;
                }
            }
            yData.forEach(function (close, i) {
                var x = xData[i], lastPoint = getLastPoint(pnfDataGroups);
                if (upTrend) {
                    // Add point going UP
                    if (close - lastPoint >= calculatedBoxSize) {
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                    if (lastPoint - close >= reversal) { // Handle reversal
                        upTrend = false;
                        pnfDataGroups.push({ x: x, y: [], upTrend: upTrend });
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                }
                if (!upTrend) {
                    // Add point going DOWN
                    if (lastPoint - close >= calculatedBoxSize) {
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                    if (close - lastPoint >= reversal) { // Handle reversal
                        upTrend = true;
                        pnfDataGroups.push({ x: x, y: [], upTrend: upTrend });
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                }
            });
        }
        // Process the pnfDataGroups to HC series format
        var finalData = [];
        var processedXData = [];
        var processedYData = [];
        pnfDataGroups.forEach(function (point) {
            var x = point.x, upTrend = point.upTrend;
            point.y.forEach(function (y) {
                processedXData.push(x);
                processedYData.push(y);
                finalData.push({
                    x: x,
                    y: y,
                    upTrend: upTrend
                });
            });
        });
        modified.setColumn('x', processedXData);
        modified.setColumn('y', processedYData);
        series.pnfDataGroups = pnfDataGroups;
        series.processedData = finalData;
        return {
            modified: modified,
            cropped: false,
            cropStart: 0,
            closestPointRange: 1
        };
    };
    PointAndFigureSeries.prototype.markerAttribs = function (point) {
        var series = this, options = series.options, attribs = {}, pos = point.pos();
        attribs.width = series.markerWidth;
        attribs.height = series.markerHeight;
        if (pos && attribs.width && attribs.height) {
            attribs.x = pos[0] - Math.round(attribs.width) / 2;
            attribs.y = pos[1] - Math.round(attribs.height) / 2;
        }
        if (options.crisp && attribs.x) {
            // Math.floor for #1843:
            attribs.x = Math.floor(attribs.x);
        }
        return attribs;
    };
    PointAndFigureSeries.prototype.translate = function () {
        var metrics = this.getColumnMetrics(), calculatedBoxSize = this.calculatedBoxSize;
        this.markerWidth = metrics.width + metrics.paddedWidth + metrics.offset;
        this.markerHeight =
            this.yAxis.toPixels(0) - this.yAxis.toPixels(calculatedBoxSize);
        _super.prototype.translate.call(this);
    };
    PointAndFigureSeries.defaultOptions = merge(ScatterSeries.defaultOptions, PointAndFigureSeriesDefaults);
    return PointAndFigureSeries;
}(ScatterSeries));
extend(PointAndFigureSeries.prototype, {
    takeOrdinalPosition: true,
    pnfDataGroups: [],
    getColumnMetrics: columnProto.getColumnMetrics,
    pointClass: PointAndFigurePoint,
    sorted: true
});
SeriesRegistry.registerSeriesType('pointandfigure', PointAndFigureSeries);
/* *
 *
 *  Default Export
 *
 * */
export default PointAndFigureSeries;
