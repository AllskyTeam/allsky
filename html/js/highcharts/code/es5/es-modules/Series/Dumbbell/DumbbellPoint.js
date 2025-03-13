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
import AreaRangePoint from '../AreaRange/AreaRangePoint.js';
import U from '../../Core/Utilities.js';
var extend = U.extend, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
var DumbbellPoint = /** @class */ (function (_super) {
    __extends(DumbbellPoint, _super);
    function DumbbellPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Set the point's state extended by have influence on the connector
     * (between low and high value).
     *
     * @private
     */
    DumbbellPoint.prototype.setState = function () {
        var _a;
        var point = this, series = point.series, chart = series.chart, seriesLowColor = series.options.lowColor, seriesMarker = series.options.marker, seriesLowMarker = series.options.lowMarker, pointOptions = point.options, pointLowColor = pointOptions.lowColor, zoneColor = point.zone && point.zone.color, lowerGraphicColor = pick(pointLowColor, seriesLowMarker === null || seriesLowMarker === void 0 ? void 0 : seriesLowMarker.fillColor, seriesLowColor, pointOptions.color, zoneColor, point.color, series.color);
        var verb = 'attr', upperGraphicColor, origProps;
        this.pointSetState.apply(point, arguments);
        if (!point.state) {
            verb = 'animate';
            var _b = point.graphics || [], lowerGraphic = _b[0], upperGraphic = _b[1];
            if (lowerGraphic && !chart.styledMode) {
                lowerGraphic.attr({
                    fill: lowerGraphicColor
                });
                if (upperGraphic) {
                    origProps = {
                        y: point.y,
                        zone: point.zone
                    };
                    point.y = point.high;
                    point.zone = point.zone ? point.getZone() : void 0;
                    upperGraphicColor = pick(point.marker ? point.marker.fillColor : void 0, seriesMarker ? seriesMarker.fillColor : void 0, pointOptions.color, point.zone ? point.zone.color : void 0, point.color);
                    upperGraphic.attr({
                        fill: upperGraphicColor
                    });
                    extend(point, origProps);
                }
            }
        }
        (_a = point.connector) === null || _a === void 0 ? void 0 : _a[verb](series.getConnectorAttribs(point));
    };
    DumbbellPoint.prototype.destroy = function () {
        var point = this;
        // #15560
        if (!point.graphic) {
            point.graphic = point.connector;
            point.connector = void 0;
        }
        return _super.prototype.destroy.call(this);
    };
    return DumbbellPoint;
}(AreaRangePoint));
extend(DumbbellPoint.prototype, {
    pointSetState: AreaRangePoint.prototype.setState
});
/* *
 *
 *  Default export
 *
 * */
export default DumbbellPoint;
