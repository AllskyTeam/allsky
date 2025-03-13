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
var defaultOptions = D.defaultOptions;
import H from '../../Core/Globals.js';
var composed = H.composed;
import RangeSelectorDefaults from './RangeSelectorDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, extend = U.extend, isNumber = U.isNumber, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Constants
 *
 * */
var chartDestroyEvents = [];
/* *
 *
 *  Variables
 *
 * */
var RangeSelectorConstructor;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get the axis min value based on the range option and the current max. For
 * stock charts this is extended via the {@link RangeSelector} so that if the
 * selected range is a multiple of months or years, it is compensated for
 * various month lengths.
 *
 * @private
 * @function Highcharts.Axis#minFromRange
 * @return {number|undefined}
 *         The new minimum value.
 */
function axisMinFromRange() {
    var rangeOptions = this.range, type = rangeOptions.type, max = this.max, time = this.chart.time, 
    // Get the true range from a start date
    getTrueRange = function (base, count) {
        var original = time.toParts(base), modified = original.slice();
        if (type === 'year') {
            modified[0] += count;
        }
        else {
            modified[1] += count;
        }
        var d = time.makeTime.apply(time, modified);
        var numbers = time.toParts(d);
        // When subtracting a month still places us in the same month, like
        // subtracting one month from March 31 places us on February 31,
        // which translates to March 3 (#6537)
        if (type === 'month' &&
            original[1] === numbers[1] &&
            Math.abs(count) === 1) {
            modified[0] = original[0];
            modified[1] = original[1];
            // 0 is the last day of the previous month
            modified[2] = 0;
        }
        d = time.makeTime.apply(time, modified);
        return d - base;
    };
    var min, range;
    if (isNumber(rangeOptions)) {
        min = max - rangeOptions;
        range = rangeOptions;
    }
    else if (rangeOptions) {
        min = max + getTrueRange(max, -(rangeOptions.count || 1));
        // Let the fixedRange reflect initial settings (#5930)
        if (this.chart) {
            this.chart.setFixedRange(max - min);
        }
    }
    var dataMin = pick(this.dataMin, Number.MIN_VALUE);
    if (!isNumber(min)) {
        min = dataMin;
    }
    if (min <= dataMin) {
        min = dataMin;
        if (typeof range === 'undefined') { // #4501
            range = getTrueRange(min, rangeOptions.count);
        }
        this.newMax = Math.min(min + range, pick(this.dataMax, Number.MAX_VALUE));
    }
    if (!isNumber(max)) {
        min = void 0;
    }
    else if (!isNumber(rangeOptions) &&
        rangeOptions &&
        rangeOptions._offsetMin) {
        min += rangeOptions._offsetMin;
    }
    return min;
}
/**
 * @private
 */
function updateRangeSelectorButtons() {
    var _a;
    (_a = this.rangeSelector) === null || _a === void 0 ? void 0 : _a.redrawElements();
}
/**
 * @private
 */
function compose(AxisClass, ChartClass, RangeSelectorClass) {
    RangeSelectorConstructor = RangeSelectorClass;
    if (pushUnique(composed, 'RangeSelector')) {
        var chartProto = ChartClass.prototype;
        AxisClass.prototype.minFromRange = axisMinFromRange;
        addEvent(ChartClass, 'afterGetContainer', createRangeSelector);
        addEvent(ChartClass, 'beforeRender', onChartBeforeRender);
        addEvent(ChartClass, 'destroy', onChartDestroy);
        addEvent(ChartClass, 'getMargins', onChartGetMargins);
        addEvent(ChartClass, 'redraw', redrawRangeSelector);
        addEvent(ChartClass, 'update', onChartUpdate);
        addEvent(ChartClass, 'beforeRedraw', updateRangeSelectorButtons);
        chartProto.callbacks.push(redrawRangeSelector);
        extend(defaultOptions, { rangeSelector: RangeSelectorDefaults.rangeSelector });
        extend(defaultOptions.lang, RangeSelectorDefaults.lang);
    }
}
/**
 * Initialize rangeselector for stock charts
 * @private
 */
function createRangeSelector() {
    if (this.options.rangeSelector &&
        this.options.rangeSelector.enabled) {
        this.rangeSelector = new RangeSelectorConstructor(this);
    }
}
/**
 * @private
 */
function onChartBeforeRender() {
    var chart = this, rangeSelector = chart.rangeSelector;
    if (rangeSelector) {
        if (isNumber(rangeSelector.deferredYTDClick)) {
            rangeSelector.clickButton(rangeSelector.deferredYTDClick);
            delete rangeSelector.deferredYTDClick;
        }
        var verticalAlign = rangeSelector.options.verticalAlign;
        if (!rangeSelector.options.floating) {
            if (verticalAlign === 'bottom') {
                this.extraBottomMargin = true;
            }
            else if (verticalAlign === 'top') {
                this.extraTopMargin = true;
            }
        }
    }
}
function redrawRangeSelector() {
    var chart = this;
    var rangeSelector = this.rangeSelector;
    if (!rangeSelector) {
        return;
    }
    var alignTo;
    var extremes = chart.xAxis[0].getExtremes();
    var legend = chart.legend;
    var verticalAlign = (rangeSelector &&
        rangeSelector.options.verticalAlign);
    if (isNumber(extremes.min)) {
        rangeSelector.render(extremes.min, extremes.max);
    }
    // Re-align the legend so that it's below the rangeselector
    if (legend.display &&
        verticalAlign === 'top' &&
        verticalAlign === legend.options.verticalAlign) {
        // Create a new alignment box for the legend.
        alignTo = merge(chart.spacingBox);
        if (legend.options.layout === 'vertical') {
            alignTo.y = chart.plotTop;
        }
        else {
            alignTo.y += rangeSelector.getHeight();
        }
        legend.group.placed = false; // Don't animate the alignment.
        legend.align(alignTo);
    }
}
/**
 * Remove resize/afterSetExtremes at chart destroy.
 * @private
 */
function onChartDestroy() {
    for (var i = 0, iEnd = chartDestroyEvents.length; i < iEnd; ++i) {
        var events = chartDestroyEvents[i];
        if (events[0] === this) {
            events[1].forEach(function (unbind) { return unbind(); });
            chartDestroyEvents.splice(i, 1);
            return;
        }
    }
}
/**
 *
 */
function onChartGetMargins() {
    var _a;
    var rangeSelector = this.rangeSelector;
    if ((_a = rangeSelector === null || rangeSelector === void 0 ? void 0 : rangeSelector.options) === null || _a === void 0 ? void 0 : _a.enabled) {
        var rangeSelectorHeight = rangeSelector.getHeight();
        var verticalAlign = rangeSelector.options.verticalAlign;
        if (!rangeSelector.options.floating) {
            if (verticalAlign === 'bottom') {
                this.marginBottom += rangeSelectorHeight;
            }
            else if (verticalAlign !== 'middle') {
                this.plotTop += rangeSelectorHeight;
            }
        }
    }
}
/**
 * @private
 */
function onChartUpdate(e) {
    var chart = this, options = e.options, optionsRangeSelector = options.rangeSelector, extraBottomMarginWas = this.extraBottomMargin, extraTopMarginWas = this.extraTopMargin;
    var rangeSelector = chart.rangeSelector;
    if (optionsRangeSelector &&
        optionsRangeSelector.enabled &&
        !defined(rangeSelector) &&
        this.options.rangeSelector) {
        this.options.rangeSelector.enabled = true;
        this.rangeSelector = rangeSelector = new RangeSelectorConstructor(this);
    }
    this.extraBottomMargin = false;
    this.extraTopMargin = false;
    if (rangeSelector) {
        var verticalAlign = (optionsRangeSelector &&
            optionsRangeSelector.verticalAlign) || (rangeSelector.options && rangeSelector.options.verticalAlign);
        if (!rangeSelector.options.floating) {
            if (verticalAlign === 'bottom') {
                this.extraBottomMargin = true;
            }
            else if (verticalAlign !== 'middle') {
                this.extraTopMargin = true;
            }
        }
        if (this.extraBottomMargin !== extraBottomMarginWas ||
            this.extraTopMargin !== extraTopMarginWas) {
            this.isDirtyBox = true;
        }
    }
}
/* *
 *
 *  Default Export
 *
 * */
var RangeSelectorComposition = {
    compose: compose
};
export default RangeSelectorComposition;
