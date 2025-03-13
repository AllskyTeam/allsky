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
import H from '../../Core/Globals.js';
var composed = H.composed;
import OHLCPoint from './OHLCPoint.js';
import OHLCSeriesDefaults from './OHLCSeriesDefaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var HLCSeries = SeriesRegistry.seriesTypes.hlc;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, crisp = U.crisp, extend = U.extend, merge = U.merge, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function onSeriesAfterSetOptions(e) {
    var options = e.options, dataGrouping = options.dataGrouping;
    if (dataGrouping &&
        options.useOhlcData &&
        options.id !== 'highcharts-navigator-series') {
        dataGrouping.approximation = 'ohlc';
    }
}
/**
 * Add useOhlcData option
 * @private
 */
function onSeriesInit(eventOptions) {
    // eslint-disable-next-line no-invalid-this
    var series = this, options = eventOptions.options;
    if (options.useOhlcData &&
        options.id !== 'highcharts-navigator-series') {
        extend(series, {
            pointValKey: OHLCSeries.prototype.pointValKey,
            // Keys: ohlcProto.keys, // @todo potentially nonsense
            pointArrayMap: OHLCSeries.prototype.pointArrayMap,
            toYData: OHLCSeries.prototype.toYData
        });
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * The ohlc series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.ohlc
 *
 * @augments Highcharts.Series
 */
var OHLCSeries = /** @class */ (function (_super) {
    __extends(OHLCSeries, _super);
    function OHLCSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    OHLCSeries.compose = function (SeriesClass) {
        var _args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            _args[_i - 1] = arguments[_i];
        }
        if (pushUnique(composed, 'OHLCSeries')) {
            addEvent(SeriesClass, 'afterSetOptions', onSeriesAfterSetOptions);
            addEvent(SeriesClass, 'init', onSeriesInit);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    OHLCSeries.prototype.getPointPath = function (point, graphic) {
        var path = _super.prototype.getPointPath.call(this, point, graphic), strokeWidth = graphic.strokeWidth(), crispX = crisp(point.plotX || 0, strokeWidth), halfWidth = Math.round(point.shapeArgs.width / 2);
        if (point.open !== null) {
            var plotOpen = crisp(point.plotOpen, strokeWidth);
            path.push(['M', crispX, plotOpen], ['L', crispX - halfWidth, plotOpen]);
            _super.prototype.extendStem.call(this, path, strokeWidth / 2, plotOpen);
        }
        return path;
    };
    /**
     * Postprocess mapping between options and SVG attributes
     * @private
     */
    OHLCSeries.prototype.pointAttribs = function (point, state) {
        var attribs = _super.prototype.pointAttribs.call(this, point, state), options = this.options;
        delete attribs.fill;
        if (!point.options.color &&
            options.upColor &&
            point.open < point.close) {
            attribs.stroke = options.upColor;
        }
        return attribs;
    };
    OHLCSeries.prototype.toYData = function (point) {
        // Return a plain array for speedy calculation
        return [point.open, point.high, point.low, point.close];
    };
    /* *
     *
     *  Static Properties
     *
     * */
    OHLCSeries.defaultOptions = merge(HLCSeries.defaultOptions, OHLCSeriesDefaults);
    return OHLCSeries;
}(HLCSeries));
extend(OHLCSeries.prototype, {
    pointClass: OHLCPoint,
    pointArrayMap: ['open', 'high', 'low', 'close']
});
SeriesRegistry.registerSeriesType('ohlc', OHLCSeries);
/* *
 *
 *  Default Export
 *
 * */
export default OHLCSeries;
