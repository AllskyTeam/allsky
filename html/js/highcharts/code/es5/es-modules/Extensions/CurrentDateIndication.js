/* *
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Author: Lars A. V. Cabrera
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../Core/Globals.js';
var composed = H.composed;
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, merge = U.merge, pushUnique = U.pushUnique, wrap = U.wrap;
/* *
 *
 *  Constants
 *
 * */
/**
 * Show an indicator on the axis for the current date and time. Can be a
 * boolean or a configuration object similar to
 * [xAxis.plotLines](#xAxis.plotLines).
 *
 * @sample gantt/current-date-indicator/demo
 *         Current date indicator enabled
 * @sample gantt/current-date-indicator/object-config
 *         Current date indicator with custom options
 *
 * @declare   Highcharts.CurrentDateIndicatorOptions
 * @type      {boolean|CurrentDateIndicatorOptions}
 * @default   true
 * @extends   xAxis.plotLines
 * @excluding value
 * @product   gantt
 * @apioption xAxis.currentDateIndicator
 */
var defaultOptions = {
    color: "#ccd3ff" /* Palette.highlightColor20 */,
    width: 2,
    /**
     * @declare Highcharts.AxisCurrentDateIndicatorLabelOptions
     */
    label: {
        /**
         * Format of the label. This options is passed as the first argument to
         * [dateFormat](/class-reference/Highcharts.Time#dateFormat) function.
         *
         * @type      {string|Intl.DateTimeFormatOptions}
         * @product   gantt
         * @apioption xAxis.currentDateIndicator.label.format
         */
        format: '%[abdYHM]',
        formatter: function (value, format) {
            return this.axis.chart.time.dateFormat(format || '', value, true);
        },
        rotation: 0,
        /**
         * @type {Highcharts.CSSObject}
         */
        style: {
            /** @internal */
            fontSize: '0.7em'
        }
    }
};
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function compose(AxisClass, PlotLineOrBandClass) {
    if (pushUnique(composed, 'CurrentDateIndication')) {
        addEvent(AxisClass, 'afterSetOptions', onAxisAfterSetOptions);
        addEvent(PlotLineOrBandClass, 'render', onPlotLineOrBandRender);
        wrap(PlotLineOrBandClass.prototype, 'getLabelText', wrapPlotLineOrBandGetLabelText);
    }
}
/**
 * @private
 */
function onAxisAfterSetOptions() {
    var options = this.options, cdiOptions = options.currentDateIndicator;
    if (cdiOptions) {
        var plotLineOptions = typeof cdiOptions === 'object' ?
            merge(defaultOptions, cdiOptions) :
            merge(defaultOptions);
        plotLineOptions.value = Date.now();
        plotLineOptions.className = 'highcharts-current-date-indicator';
        if (!options.plotLines) {
            options.plotLines = [];
        }
        options.plotLines.push(plotLineOptions);
    }
}
/**
 * @private
 */
function onPlotLineOrBandRender() {
    // If the label already exists, update its text
    if (this.label) {
        this.label.attr({
            text: this.getLabelText(this.options.label)
        });
    }
}
/**
 * @private
 */
function wrapPlotLineOrBandGetLabelText(defaultMethod, defaultLabelOptions) {
    var options = this.options;
    if (options &&
        options.className &&
        options.className.indexOf('highcharts-current-date-indicator') !== -1 &&
        options.label &&
        typeof options.label.formatter === 'function') {
        options.value = Date.now();
        return options.label.formatter
            .call(this, options.value, options.label.format);
    }
    return defaultMethod.call(this, defaultLabelOptions);
}
/* *
 *
 *  Default Export
 *
 * */
var CurrentDateIndication = {
    compose: compose
};
export default CurrentDateIndication;
