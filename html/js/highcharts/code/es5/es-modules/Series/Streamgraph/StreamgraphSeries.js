/* *
 *
 *  Streamgraph module
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
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var AreaSplineSeries = SeriesRegistry.seriesTypes.areaspline;
import StreamgraphSeriesDefaults from './StreamgraphSeriesDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, merge = U.merge, extend = U.extend;
/**
 * Streamgraph series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.streamgraph
 *
 * @augments Highcharts.Series
 */
var StreamgraphSeries = /** @class */ (function (_super) {
    __extends(StreamgraphSeries, _super);
    function StreamgraphSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    // Modifier function for stream stacks. It simply moves the point up or
    // down in order to center the full stack vertically.
    StreamgraphSeries.prototype.streamStacker = function (pointExtremes, stack, i) {
        // Y bottom value
        pointExtremes[0] -= stack.total / 2;
        // Y value
        pointExtremes[1] -= stack.total / 2;
        // Record the Y data for use when getting axis extremes. Register only
        // the max. This is picked up in the `afterGetExtremes` event, and the
        // dataMin property is reflected.
        if (this.stackedYData) {
            this.stackedYData[i] = Math.max.apply(0, pointExtremes);
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    StreamgraphSeries.defaultOptions = merge(AreaSplineSeries.defaultOptions, StreamgraphSeriesDefaults);
    return StreamgraphSeries;
}(AreaSplineSeries));
// Reflect the dataMin property, as only dataMax is registered above
addEvent(StreamgraphSeries, 'afterGetExtremes', function (e) {
    e.dataExtremes.dataMin = -e.dataExtremes.dataMax;
});
extend(StreamgraphSeries.prototype, {
    negStacks: false
});
SeriesRegistry.registerSeriesType('streamgraph', StreamgraphSeries);
/* *
 *
 *  Default Export
 *
 * */
export default StreamgraphSeries;
