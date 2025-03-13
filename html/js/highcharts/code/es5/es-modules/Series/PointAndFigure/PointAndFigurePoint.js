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
*
*  Imports
*
* */
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ScatterPoint = SeriesRegistry.seriesTypes.scatter.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 */
var PointAndFigurePoint = /** @class */ (function (_super) {
    __extends(PointAndFigurePoint, _super);
    function PointAndFigurePoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PointAndFigurePoint.prototype.resolveMarker = function () {
        var seriesOptions = this.series.options;
        this.marker = this.options.marker =
            this.upTrend ? seriesOptions.markerUp : seriesOptions.marker;
        this.color = this.options.marker.lineColor;
    };
    PointAndFigurePoint.prototype.resolveColor = function () {
        _super.prototype.resolveColor.call(this);
        this.resolveMarker();
    };
    /**
     * Extend the parent method by adding up or down to the class name.
     * @private
     * @function Highcharts.seriesTypes.pointandfigure#getClassName
     */
    PointAndFigurePoint.prototype.getClassName = function () {
        return _super.prototype.getClassName.call(this) +
            (this.upTrend ?
                ' highcharts-point-up' :
                ' highcharts-point-down');
    };
    return PointAndFigurePoint;
}(ScatterPoint));
/* *
 *
 *  Export Default
 *
 * */
export default PointAndFigurePoint;
