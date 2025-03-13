/**
 *
 *  (c) 2010-2024 Kamil Kulig
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
const { linearRegression: LinearRegressionIndicator } = SeriesRegistry.seriesTypes;
import U from '../../../Core/Utilities.js';
const { extend, merge } = U;
/* *
 *
 *  Class
 *
 * */
/**
 * The Linear Regression Angle series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.linearRegressionAngle
 *
 * @augments Highcharts.Series
 */
class LinearRegressionAngleIndicator extends LinearRegressionIndicator {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Convert a slope of a line to angle (in degrees) between
     * the line and x axis
     * @private
     * @param {number} slope of the straight line function
     * @return {number} angle in degrees
     */
    slopeToAngle(slope) {
        return Math.atan(slope) * (180 / Math.PI); // Rad to deg
    }
    getEndPointY(lineParameters) {
        return this.slopeToAngle(lineParameters.slope);
    }
}
/* *
 *
 *  Static Properties
 *
 * */
/**
 * Linear regression angle indicator. This series requires `linkedTo`
 * option to be set.
 *
 * @sample {highstock} stock/indicators/linear-regression-angle
 *         Linear intercept angle indicator
 *
 * @extends      plotOptions.linearregression
 * @since        7.0.0
 * @product      highstock
 * @requires     stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @optionparent plotOptions.linearregressionangle
 */
LinearRegressionAngleIndicator.defaultOptions = merge(LinearRegressionIndicator.defaultOptions, {
    tooltip: {
        pointFormat: '<span style="color:{point.color}">\u25CF</span>' +
            '{series.name}: <b>{point.y}°</b><br/>'
    }
});
extend(LinearRegressionAngleIndicator.prototype, {
    nameBase: 'Linear Regression Angle Indicator'
});
SeriesRegistry.registerSeriesType('linearRegressionAngle', LinearRegressionAngleIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default LinearRegressionAngleIndicator;
/**
 * A linear regression intercept series. If the
 * [type](#series.linearregressionangle.type) option is not specified, it is
 * inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.linearregressionangle
 * @since     7.0.0
 * @product   highstock
 * @excluding dataParser,dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @apioption series.linearregressionangle
 */
''; // To include the above in the js output
