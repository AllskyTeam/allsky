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
import AreaRangePoint from '../AreaRange/AreaRangePoint.js';
import U from '../../Core/Utilities.js';
const { extend, pick } = U;
/* *
 *
 *  Class
 *
 * */
class DumbbellPoint extends AreaRangePoint {
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
    setState() {
        const point = this, series = point.series, chart = series.chart, seriesLowColor = series.options.lowColor, seriesMarker = series.options.marker, seriesLowMarker = series.options.lowMarker, pointOptions = point.options, pointLowColor = pointOptions.lowColor, zoneColor = point.zone && point.zone.color, lowerGraphicColor = pick(pointLowColor, seriesLowMarker?.fillColor, seriesLowColor, pointOptions.color, zoneColor, point.color, series.color);
        let verb = 'attr', upperGraphicColor, origProps;
        this.pointSetState.apply(point, arguments);
        if (!point.state) {
            verb = 'animate';
            const [lowerGraphic, upperGraphic] = point.graphics || [];
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
        point.connector?.[verb](series.getConnectorAttribs(point));
    }
    destroy() {
        const point = this;
        // #15560
        if (!point.graphic) {
            point.graphic = point.connector;
            point.connector = void 0;
        }
        return super.destroy();
    }
}
extend(DumbbellPoint.prototype, {
    pointSetState: AreaRangePoint.prototype.setState
});
/* *
 *
 *  Default export
 *
 * */
export default DumbbellPoint;
