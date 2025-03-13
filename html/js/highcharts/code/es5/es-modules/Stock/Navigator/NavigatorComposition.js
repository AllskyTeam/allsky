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
import D from '../../Core/Defaults.js';
var setOptions = D.setOptions;
import H from '../../Core/Globals.js';
var composed = H.composed;
import NavigatorAxisAdditions from '../../Core/Axis/NavigatorAxisComposition.js';
import NavigatorDefaults from './NavigatorDefaults.js';
import NavigatorSymbols from './NavigatorSymbols.js';
import RendererRegistry from '../../Core/Renderer/RendererRegistry.js';
var getRendererType = RendererRegistry.getRendererType;
import StockUtilities from '../../Stock/Utilities/StockUtilities.js';
var setFixedRange = StockUtilities.setFixedRange;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, pushUnique = U.pushUnique;
/* *
 *
 *  Variables
 *
 * */
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function compose(ChartClass, AxisClass, SeriesClass) {
    NavigatorAxisAdditions.compose(AxisClass);
    if (pushUnique(composed, 'Navigator')) {
        ChartClass.prototype.setFixedRange = setFixedRange;
        extend(getRendererType().prototype.symbols, NavigatorSymbols);
        addEvent(SeriesClass, 'afterUpdate', onSeriesAfterUpdate);
        setOptions({ navigator: NavigatorDefaults });
    }
}
/**
 * Handle updating series
 * @private
 */
function onSeriesAfterUpdate() {
    if (this.chart.navigator && !this.options.isInternal) {
        this.chart.navigator.setBaseSeries(null, false);
    }
}
/* *
 *
 *  Default Export
 *
 * */
var NavigatorComposition = {
    compose: compose
};
export default NavigatorComposition;
