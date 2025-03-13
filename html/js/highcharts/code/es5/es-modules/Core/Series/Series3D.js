/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Extension to the Series object in 3D charts.
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
import H from '../Globals.js';
var composed = H.composed;
import Math3D from '../Math3D.js';
var perspective = Math3D.perspective;
import Series from '../Series/Series.js';
import U from '../Utilities.js';
var addEvent = U.addEvent, extend = U.extend, isNumber = U.isNumber, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Class
 *
 * */
var Series3D = /** @class */ (function (_super) {
    __extends(Series3D, _super);
    function Series3D() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    Series3D.compose = function (SeriesClass) {
        if (pushUnique(composed, 'Core.Series3D')) {
            addEvent(SeriesClass, 'afterTranslate', function () {
                if (this.chart.is3d()) {
                    this.translate3dPoints();
                }
            });
            extend(SeriesClass.prototype, {
                translate3dPoints: Series3D.prototype.translate3dPoints
            });
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Translate the plotX, plotY properties and add plotZ.
     * @private
     */
    Series3D.prototype.translate3dPoints = function () {
        var series = this, seriesOptions = series.options, chart = series.chart, zAxis = pick(series.zAxis, chart.options.zAxis[0]), rawPoints = [], rawPointsX = [], stack = seriesOptions.stacking ?
            (isNumber(seriesOptions.stack) ? seriesOptions.stack : 0) :
            series.index || 0;
        var projectedPoint, zValue;
        series.zPadding = stack *
            (seriesOptions.depth || 0 + (seriesOptions.groupZPadding || 1));
        series.data.forEach(function (rawPoint) {
            if (zAxis && zAxis.translate) {
                zValue = zAxis.logarithmic && zAxis.val2lin ?
                    zAxis.val2lin(rawPoint.z) :
                    rawPoint.z; // #4562
                rawPoint.plotZ = zAxis.translate(zValue);
                rawPoint.isInside = rawPoint.isInside ?
                    (zValue >= zAxis.min &&
                        zValue <= zAxis.max) :
                    false;
            }
            else {
                rawPoint.plotZ = series.zPadding;
            }
            rawPoint.axisXpos = rawPoint.plotX;
            rawPoint.axisYpos = rawPoint.plotY;
            rawPoint.axisZpos = rawPoint.plotZ;
            rawPoints.push({
                x: rawPoint.plotX,
                y: rawPoint.plotY,
                z: rawPoint.plotZ
            });
            rawPointsX.push(rawPoint.plotX || 0);
        });
        series.rawPointsX = rawPointsX;
        var projectedPoints = perspective(rawPoints, chart, true);
        series.data.forEach(function (rawPoint, i) {
            projectedPoint = projectedPoints[i];
            rawPoint.plotX = projectedPoint.x;
            rawPoint.plotY = projectedPoint.y;
            rawPoint.plotZ = projectedPoint.z;
        });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    Series3D.defaultOptions = merge(Series.defaultOptions);
    return Series3D;
}(Series));
/* *
 *
 *  Default Export
 *
 * */
export default Series3D;
