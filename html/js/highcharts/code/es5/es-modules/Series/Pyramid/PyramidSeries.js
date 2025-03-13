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
import FunnelSeries from '../Funnel/FunnelSeries.js';
import PyramidSeriesDefaults from './PyramidSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Pyramid series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pyramid
 *
 * @augments Highcharts.Series
 */
var PyramidSeries = /** @class */ (function (_super) {
    __extends(PyramidSeries, _super);
    function PyramidSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * A pyramid series is a special type of funnel, without neck and reversed
     * by default.
     *
     * @sample highcharts/demo/pyramid/
     *         Pyramid chart
     *
     * @extends      plotOptions.funnel
     * @product      highcharts
     * @requires     modules/funnel
     * @optionparent plotOptions.pyramid
     */
    PyramidSeries.defaultOptions = merge(FunnelSeries.defaultOptions, PyramidSeriesDefaults);
    return PyramidSeries;
}(FunnelSeries));
SeriesRegistry.registerSeriesType('pyramid', PyramidSeries);
/* *
 *
 *  Default Export
 *
 * */
export default PyramidSeries;
