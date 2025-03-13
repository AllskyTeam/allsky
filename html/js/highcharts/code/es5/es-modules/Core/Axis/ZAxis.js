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
import Axis from './Axis.js';
import D from '../Defaults.js';
var defaultOptions = D.defaultOptions;
import U from '../Utilities.js';
var addEvent = U.addEvent, merge = U.merge, pick = U.pick, splat = U.splat;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function chartAddZAxis(options) {
    return new ZAxis(this, options);
}
/**
 * Get the Z axis in addition to the default X and Y.
 * @private
 */
function onChartAfterCreateAxes() {
    var _this = this;
    var zAxisOptions = this.options.zAxis = splat(this.options.zAxis || {});
    if (!this.is3d()) {
        return;
    }
    this.zAxis = [];
    zAxisOptions.forEach(function (axisOptions) {
        _this.addZAxis(axisOptions).setScale();
    });
}
/* *
 *
 *  Class
 *
 * */
/**
 * 3D axis for z coordinates.
 * @private
 */
var ZAxis = /** @class */ (function (_super) {
    __extends(ZAxis, _super);
    function ZAxis() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.isZAxis = true;
        return _this;
    }
    ZAxis.compose = function (ChartClass) {
        var chartProto = ChartClass.prototype;
        if (!chartProto.addZAxis) {
            defaultOptions.zAxis = merge(defaultOptions.xAxis, {
                offset: 0,
                lineWidth: 0
            });
            chartProto.addZAxis = chartAddZAxis;
            chartProto.collectionsWithInit.zAxis = [chartProto.addZAxis];
            chartProto.collectionsWithUpdate.push('zAxis');
            addEvent(ChartClass, 'afterCreateAxes', onChartAfterCreateAxes);
        }
    };
    /* *
     *
     *  Constructor
     *
     * */
    ZAxis.prototype.init = function (chart, userOptions) {
        // #14793, this used to be set on the prototype
        this.isZAxis = true;
        _super.prototype.init.call(this, chart, userOptions, 'zAxis');
    };
    /* *
     *
     *  Functions
     *
     * */
    ZAxis.prototype.getSeriesExtremes = function () {
        var _this = this;
        this.hasVisibleSeries = false;
        // Reset properties in case we're redrawing (#3353)
        this.dataMin = this.dataMax = this.ignoreMinPadding = (this.ignoreMaxPadding = void 0);
        if (this.stacking) {
            this.stacking.buildStacks();
        }
        // Loop through this axis' series
        this.series.forEach(function (series) {
            if (series.reserveSpace()) {
                var threshold = series.options.threshold;
                _this.hasVisibleSeries = true;
                // Validate threshold in logarithmic axes
                if (_this.positiveValuesOnly && threshold <= 0) {
                    threshold = void 0;
                }
                var zData = series.getColumn('z');
                if (zData.length) {
                    _this.dataMin = Math.min(pick(_this.dataMin, zData[0]), Math.min.apply(null, zData));
                    _this.dataMax = Math.max(pick(_this.dataMax, zData[0]), Math.max.apply(null, zData));
                }
            }
        });
    };
    /**
     * @private
     */
    ZAxis.prototype.setAxisSize = function () {
        var chart = this.chart;
        _super.prototype.setAxisSize.call(this);
        this.width = this.len = (chart.options.chart.options3d &&
            chart.options.chart.options3d.depth) || 0;
        this.right = chart.chartWidth - this.width - this.left;
    };
    return ZAxis;
}(Axis));
/* *
 *
 *  Default Export
 *
 * */
export default ZAxis;
