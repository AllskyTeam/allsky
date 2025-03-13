/* *
 *
 *  Plugin for displaying a message when there is no data visible in chart.
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Oystein Moseng
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import AST from '../../Core/Renderer/HTML/AST.js';
import NoDataDefaults from './NoDataDefaults.js';
import U from '../../Core/Utilities.js';
const { addEvent, extend, merge } = U;
/* *
 *
 *  Functions
 *
 * */
/**
 * Returns true if there are data points within the plot area now.
 *
 * @private
 * @function Highcharts.Chart#hasData
 * @return {boolean|undefined}
 * True, if there are data points.
 * @requires modules/no-data-to-display
 */
function chartHasData() {
    const chart = this, series = chart.series || [];
    let i = series.length;
    while (i--) {
        if (series[i].hasData() && !series[i].options.isInternal) {
            return true;
        }
    }
    return chart.loadingShown; // #4588
}
/**
 * Hide no-data message.
 *
 * @private
 * @function Highcharts.Chart#hideNoData
 * @return {void}
 * @requires modules/no-data-to-display
 */
function chartHideNoData() {
    const chart = this;
    if (chart.noDataLabel) {
        chart.noDataLabel = chart.noDataLabel.destroy();
    }
}
/**
 * Display a no-data message.
 * @private
 * @function Highcharts.Chart#showNoData
 * @param {string} [str]
 * An optional message to show in place of the default one
 * @return {void}
 * @requires modules/no-data-to-display
 */
function chartShowNoData(str) {
    const chart = this, options = chart.options, text = str || (options && options.lang.noData) || '', noDataOptions = options && (options.noData || {});
    if (chart.renderer) { // Meaning chart is not destroyed
        if (!chart.noDataLabel) {
            chart.noDataLabel = chart.renderer
                .label(text, 0, 0, void 0, void 0, void 0, noDataOptions.useHTML, void 0, 'no-data')
                .add();
        }
        if (!chart.styledMode) {
            chart.noDataLabel
                .attr(AST.filterUserAttributes(noDataOptions.attr || {}))
                .css(noDataOptions.style || {});
        }
        chart.noDataLabel.align(extend(chart.noDataLabel.getBBox(), noDataOptions.position || {}), false, 'plotBox');
    }
}
/** @private */
function compose(ChartClass, highchartsDefaultOptions) {
    const chartProto = ChartClass.prototype;
    if (!chartProto.showNoData) {
        chartProto.hasData = chartHasData;
        chartProto.hideNoData = chartHideNoData;
        chartProto.showNoData = chartShowNoData;
        addEvent(ChartClass, 'render', onChartRender);
        merge(true, highchartsDefaultOptions, NoDataDefaults);
    }
}
/**
 * Add event listener to handle automatic show or hide no-data message.
 * @private
 */
function onChartRender() {
    const chart = this;
    if (chart.hasData()) {
        chart.hideNoData();
    }
    else {
        chart.showNoData();
    }
}
/* *
 *
 *  Default Export
 *
 * */
const NoDataToDisplay = {
    compose
};
export default NoDataToDisplay;
