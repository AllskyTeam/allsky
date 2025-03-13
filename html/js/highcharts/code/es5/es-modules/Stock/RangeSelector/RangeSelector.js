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
import Axis from '../../Core/Axis/Axis.js';
import D from '../../Core/Defaults.js';
var defaultOptions = D.defaultOptions;
import H from '../../Core/Globals.js';
import RangeSelectorComposition from './RangeSelectorComposition.js';
import SVGElement from '../../Core/Renderer/SVG/SVGElement.js';
import U from '../../Core/Utilities.js';
import OrdinalAxis from '../../Core/Axis/OrdinalAxis.js';
var addEvent = U.addEvent, createElement = U.createElement, css = U.css, defined = U.defined, destroyObjectProperties = U.destroyObjectProperties, diffObjects = U.diffObjects, discardElement = U.discardElement, extend = U.extend, fireEvent = U.fireEvent, isNumber = U.isNumber, isString = U.isString, merge = U.merge, objectEach = U.objectEach, pick = U.pick, splat = U.splat;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get the preferred input type based on a date format string.
 *
 * @private
 * @function preferredInputType
 */
function preferredInputType(format) {
    var hasTimeKey = function (char) {
        return new RegExp("%[[a-zA-Z]*".concat(char)).test(format);
    };
    var ms = isString(format) ?
        format.indexOf('%L') !== -1 :
        // Implemented but not typed as of 2024
        format.fractionalSecondDigits;
    if (ms) {
        return 'text';
    }
    var date = isString(format) ?
        ['a', 'A', 'd', 'e', 'w', 'b', 'B', 'm', 'o', 'y', 'Y']
            .some(hasTimeKey) :
        format.dateStyle || format.day || format.month || format.year;
    var time = isString(format) ?
        ['H', 'k', 'I', 'l', 'M', 'S'].some(hasTimeKey) :
        format.timeStyle || format.hour || format.minute || format.second;
    if (date && time) {
        return 'datetime-local';
    }
    if (date) {
        return 'date';
    }
    if (time) {
        return 'time';
    }
    return 'text';
}
/* *
 *
 *  Class
 *
 * */
/**
 * The range selector.
 *
 * @private
 * @class
 * @name Highcharts.RangeSelector
 * @param {Highcharts.Chart} chart
 */
var RangeSelector = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function RangeSelector(chart) {
        var _this = this;
        this.isDirty = false;
        this.buttonOptions = RangeSelector.prototype.defaultButtons;
        this.initialButtonGroupWidth = 0;
        this.maxButtonWidth = function () {
            var buttonWidth = 0;
            _this.buttons.forEach(function (button) {
                var bBox = button.getBBox();
                if (bBox.width > buttonWidth) {
                    buttonWidth = bBox.width;
                }
            });
            return buttonWidth;
        };
        this.init(chart);
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * @private
     */
    RangeSelector.compose = function (AxisClass, ChartClass) {
        RangeSelectorComposition.compose(AxisClass, ChartClass, RangeSelector);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * The method to run when one of the buttons in the range selectors is
     * clicked
     *
     * @private
     * @function Highcharts.RangeSelector#clickButton
     * @param {number} i
     *        The index of the button
     * @param {boolean} [redraw]
     */
    RangeSelector.prototype.clickButton = function (i, redraw) {
        var rangeSelector = this, chart = rangeSelector.chart, rangeOptions = rangeSelector.buttonOptions[i], baseAxis = chart.xAxis[0], unionExtremes = (chart.scroller && chart.scroller.getUnionExtremes()) || baseAxis || {}, type = rangeOptions.type, dataGrouping = rangeOptions.dataGrouping;
        var dataMin = unionExtremes.dataMin, dataMax = unionExtremes.dataMax, newMin, newMax = isNumber(baseAxis === null || baseAxis === void 0 ? void 0 : baseAxis.max) ? Math.round(Math.min(baseAxis.max, dataMax !== null && dataMax !== void 0 ? dataMax : baseAxis.max)) : void 0, // #1568
        baseXAxisOptions, range = rangeOptions._range, rangeMin, ctx, ytdExtremes, addOffsetMin = true;
        // Chart has no data, base series is removed
        if (dataMin === null || dataMax === null) {
            return;
        }
        rangeSelector.setSelected(i);
        // Apply dataGrouping associated to button
        if (dataGrouping) {
            this.forcedDataGrouping = true;
            Axis.prototype.setDataGrouping.call(baseAxis || { chart: this.chart }, dataGrouping, false);
            this.frozenStates = rangeOptions.preserveDataGrouping;
        }
        // Apply range
        if (type === 'month' || type === 'year') {
            if (!baseAxis) {
                // This is set to the user options and picked up later when the
                // axis is instantiated so that we know the min and max.
                range = rangeOptions;
            }
            else {
                ctx = {
                    range: rangeOptions,
                    max: newMax,
                    chart: chart,
                    dataMin: dataMin,
                    dataMax: dataMax
                };
                newMin = baseAxis.minFromRange.call(ctx);
                if (isNumber(ctx.newMax)) {
                    newMax = ctx.newMax;
                }
                // #15799: offsetMin is added in minFromRange so that it works
                // with pre-selected buttons as well
                addOffsetMin = false;
            }
            // Fixed times like minutes, hours, days
        }
        else if (range) {
            if (isNumber(newMax)) {
                newMin = Math.max(newMax - range, dataMin);
                newMax = Math.min(newMin + range, dataMax);
                addOffsetMin = false;
            }
        }
        else if (type === 'ytd') {
            // On user clicks on the buttons, or a delayed action running from
            // the beforeRender event (below), the baseAxis is defined.
            if (baseAxis) {
                // When "ytd" is the pre-selected button for the initial view,
                // its calculation is delayed and rerun in the beforeRender
                // event (below). When the series are initialized, but before
                // the chart is rendered, we have access to the xData array
                // (#942).
                if (baseAxis.hasData() && (!isNumber(dataMax) ||
                    !isNumber(dataMin))) {
                    dataMin = Number.MAX_VALUE;
                    dataMax = -Number.MAX_VALUE;
                    chart.series.forEach(function (series) {
                        // Reassign it to the last item
                        var xData = series.getColumn('x');
                        if (xData.length) {
                            dataMin = Math.min(xData[0], dataMin);
                            dataMax = Math.max(xData[xData.length - 1], dataMax);
                        }
                    });
                    redraw = false;
                }
                if (isNumber(dataMax) && isNumber(dataMin)) {
                    ytdExtremes = rangeSelector.getYTDExtremes(dataMax, dataMin);
                    newMin = rangeMin = ytdExtremes.min;
                    newMax = ytdExtremes.max;
                }
                // "ytd" is pre-selected. We don't yet have access to processed
                // point and extremes data (things like pointStart and pointInterval
                // are missing), so we delay the process (#942)
            }
            else {
                rangeSelector.deferredYTDClick = i;
                return;
            }
        }
        else if (type === 'all' && baseAxis) {
            // If the navigator exist and the axis range is declared reset that
            // range and from now on only use the range set by a user, #14742.
            if (chart.navigator && chart.navigator.baseSeries[0]) {
                chart.navigator.baseSeries[0].xAxis.options.range = void 0;
            }
            newMin = dataMin;
            newMax = dataMax;
        }
        if (addOffsetMin && rangeOptions._offsetMin && defined(newMin)) {
            newMin += rangeOptions._offsetMin;
        }
        if (rangeOptions._offsetMax && defined(newMax)) {
            newMax += rangeOptions._offsetMax;
        }
        if (this.dropdown) {
            this.dropdown.selectedIndex = i + 1;
        }
        // Update the chart
        if (!baseAxis) {
            // Axis not yet instantiated. Temporarily set min and range
            // options and axes once defined and remove them on
            // chart load (#4317 & #20529).
            baseXAxisOptions = splat(chart.options.xAxis || {})[0];
            var axisRangeUpdateEvent_1 = addEvent(chart, 'afterCreateAxes', function () {
                var xAxis = chart.xAxis[0];
                xAxis.range = xAxis.options.range = range;
                xAxis.min = xAxis.options.min = rangeMin;
            });
            addEvent(chart, 'load', function resetMinAndRange() {
                var xAxis = chart.xAxis[0];
                chart.setFixedRange(rangeOptions._range);
                xAxis.options.range = baseXAxisOptions.range;
                xAxis.options.min = baseXAxisOptions.min;
                axisRangeUpdateEvent_1(); // Remove event
            });
        }
        else if (isNumber(newMin) && isNumber(newMax)) {
            // Existing axis object. Set extremes after render time.
            baseAxis.setExtremes(newMin, newMax, pick(redraw, true), void 0, // Auto animation
            {
                trigger: 'rangeSelectorButton',
                rangeSelectorButton: rangeOptions
            });
            chart.setFixedRange(rangeOptions._range);
        }
        fireEvent(this, 'afterBtnClick');
    };
    /**
     * Set the selected option. This method only sets the internal flag, it
     * doesn't update the buttons or the actual zoomed range.
     *
     * @private
     * @function Highcharts.RangeSelector#setSelected
     * @param {number} [selected]
     */
    RangeSelector.prototype.setSelected = function (selected) {
        this.selected = this.options.selected = selected;
    };
    /**
     * Initialize the range selector
     *
     * @private
     * @function Highcharts.RangeSelector#init
     * @param {Highcharts.Chart} chart
     */
    RangeSelector.prototype.init = function (chart) {
        var rangeSelector = this, options = chart.options.rangeSelector, buttonOptions = options.buttons, selectedOption = options.selected, blurInputs = function () {
            var minInput = rangeSelector.minInput, maxInput = rangeSelector.maxInput;
            // #3274 in some case blur is not defined
            if (minInput && !!minInput.blur) {
                fireEvent(minInput, 'blur');
            }
            if (maxInput && !!maxInput.blur) {
                fireEvent(maxInput, 'blur');
            }
        };
        rangeSelector.chart = chart;
        rangeSelector.options = options;
        rangeSelector.buttons = [];
        rangeSelector.buttonOptions = buttonOptions;
        this.eventsToUnbind = [];
        this.eventsToUnbind.push(addEvent(chart.container, 'mousedown', blurInputs));
        this.eventsToUnbind.push(addEvent(chart, 'resize', blurInputs));
        // Extend the buttonOptions with actual range
        buttonOptions.forEach(rangeSelector.computeButtonRange);
        // Zoomed range based on a pre-selected button index
        if (typeof selectedOption !== 'undefined' &&
            buttonOptions[selectedOption]) {
            this.clickButton(selectedOption, false);
        }
        this.eventsToUnbind.push(addEvent(chart, 'load', function () {
            // If a data grouping is applied to the current button, release it
            // when extremes change
            if (chart.xAxis && chart.xAxis[0]) {
                addEvent(chart.xAxis[0], 'setExtremes', function (e) {
                    if (isNumber(this.max) &&
                        isNumber(this.min) &&
                        this.max - this.min !== chart.fixedRange &&
                        e.trigger !== 'rangeSelectorButton' &&
                        e.trigger !== 'updatedData' &&
                        rangeSelector.forcedDataGrouping &&
                        !rangeSelector.frozenStates) {
                        this.setDataGrouping(false, false);
                    }
                });
            }
        }));
        this.createElements();
    };
    /**
     * Dynamically update the range selector buttons after a new range has been
     * set
     *
     * @private
     * @function Highcharts.RangeSelector#updateButtonStates
     */
    RangeSelector.prototype.updateButtonStates = function () {
        var rangeSelector = this, chart = this.chart, dropdown = this.dropdown, dropdownLabel = this.dropdownLabel, baseAxis = chart.xAxis[0], actualRange = Math.round(baseAxis.max - baseAxis.min), hasNoData = !baseAxis.hasVisibleSeries, day = 24 * 36e5, // A single day in milliseconds
        unionExtremes = (chart.scroller &&
            chart.scroller.getUnionExtremes()) || baseAxis, dataMin = unionExtremes.dataMin, dataMax = unionExtremes.dataMax, ytdExtremes = rangeSelector.getYTDExtremes(dataMax, dataMin), ytdMin = ytdExtremes.min, ytdMax = ytdExtremes.max, selected = rangeSelector.selected, allButtonsEnabled = rangeSelector.options.allButtonsEnabled, buttonStates = new Array(rangeSelector.buttonOptions.length)
            .fill(0), selectedExists = isNumber(selected), buttons = rangeSelector.buttons;
        var isSelectedTooGreat = false, selectedIndex = null;
        rangeSelector.buttonOptions.forEach(function (rangeOptions, i) {
            var _a;
            var range = rangeOptions._range, type = rangeOptions.type, count = rangeOptions.count || 1, offsetRange = rangeOptions._offsetMax -
                rangeOptions._offsetMin, isSelected = i === selected, 
            // Disable buttons where the range exceeds what is allowed i;
            // the current view
            isTooGreatRange = range >
                dataMax - dataMin, 
            // Disable buttons where the range is smaller than the minimum
            // range
            isTooSmallRange = range < baseAxis.minRange;
            // Do not select the YTD button if not explicitly told so
            var isYTDButNotSelected = false, 
            // Disable the All button if we're already showing all
            isSameRange = range === actualRange;
            if (isSelected && isTooGreatRange) {
                isSelectedTooGreat = true;
            }
            if (baseAxis.isOrdinal &&
                ((_a = baseAxis.ordinal) === null || _a === void 0 ? void 0 : _a.positions) &&
                range &&
                actualRange < range) {
                // Handle ordinal ranges
                var positions = baseAxis.ordinal.positions, prevOrdinalPosition = OrdinalAxis.Additions.findIndexOf(positions, baseAxis.min, true), nextOrdinalPosition = Math.min(OrdinalAxis.Additions.findIndexOf(positions, baseAxis.max, true) + 1, positions.length - 1);
                if (positions[nextOrdinalPosition] -
                    positions[prevOrdinalPosition] > range) {
                    isSameRange = true;
                }
            }
            else if (
            // Months and years have variable range so we check the extremes
            (type === 'month' || type === 'year') &&
                (actualRange + 36e5 >=
                    { month: 28, year: 365 }[type] * day * count - offsetRange) &&
                (actualRange - 36e5 <=
                    { month: 31, year: 366 }[type] * day * count + offsetRange)) {
                isSameRange = true;
            }
            else if (type === 'ytd') {
                isSameRange = (ytdMax - ytdMin + offsetRange) === actualRange;
                isYTDButNotSelected = !isSelected;
            }
            else if (type === 'all') {
                isSameRange = (baseAxis.max - baseAxis.min >=
                    dataMax - dataMin);
            }
            // The new zoom area happens to match the range for a button - mark
            // it selected. This happens when scrolling across an ordinal gap.
            // It can be seen in the intraday demos when selecting 1h and scroll
            // across the night gap.
            var disable = (!allButtonsEnabled &&
                !(isSelectedTooGreat && type === 'all') &&
                (isTooGreatRange ||
                    isTooSmallRange ||
                    hasNoData));
            var select = ((isSelectedTooGreat && type === 'all') ||
                (isYTDButNotSelected ? false : isSameRange) ||
                (isSelected && rangeSelector.frozenStates));
            if (disable) {
                buttonStates[i] = 3;
            }
            else if (select) {
                if (!selectedExists || i === selected) {
                    selectedIndex = i;
                }
            }
        });
        if (selectedIndex !== null) {
            buttonStates[selectedIndex] = 2;
            rangeSelector.setSelected(selectedIndex);
            if (this.dropdown) {
                this.dropdown.selectedIndex = selectedIndex + 1;
            }
        }
        else {
            rangeSelector.setSelected();
            if (this.dropdown) {
                this.dropdown.selectedIndex = -1;
            }
            if (dropdownLabel) {
                dropdownLabel.setState(0);
                dropdownLabel.attr({
                    text: (defaultOptions.lang.rangeSelectorZoom || '') + ' ▾'
                });
            }
        }
        for (var i = 0; i < buttonStates.length; i++) {
            var state = buttonStates[i];
            var button = buttons[i];
            if (button.state !== state) {
                button.setState(state);
                if (dropdown) {
                    dropdown.options[i + 1].disabled = (state === 3);
                    if (state === 2) {
                        if (dropdownLabel) {
                            dropdownLabel.setState(2);
                            dropdownLabel.attr({
                                text: rangeSelector.buttonOptions[i].text + ' ▾'
                            });
                        }
                        dropdown.selectedIndex = i + 1;
                    }
                    var bbox = dropdownLabel.getBBox();
                    css(dropdown, {
                        width: "".concat(bbox.width, "px"),
                        height: "".concat(bbox.height, "px")
                    });
                }
            }
        }
    };
    /**
     * Compute and cache the range for an individual button
     *
     * @private
     * @function Highcharts.RangeSelector#computeButtonRange
     * @param {Highcharts.RangeSelectorButtonsOptions} rangeOptions
     */
    RangeSelector.prototype.computeButtonRange = function (rangeOptions) {
        var type = rangeOptions.type, count = rangeOptions.count || 1, 
        // These time intervals have a fixed number of milliseconds, as
        // opposed to month, ytd and year
        fixedTimes = {
            millisecond: 1,
            second: 1000,
            minute: 60 * 1000,
            hour: 3600 * 1000,
            day: 24 * 3600 * 1000,
            week: 7 * 24 * 3600 * 1000
        };
        // Store the range on the button object
        if (fixedTimes[type]) {
            rangeOptions._range = fixedTimes[type] * count;
        }
        else if (type === 'month' || type === 'year') {
            rangeOptions._range = {
                month: 30,
                year: 365
            }[type] * 24 * 36e5 * count;
        }
        rangeOptions._offsetMin = pick(rangeOptions.offsetMin, 0);
        rangeOptions._offsetMax = pick(rangeOptions.offsetMax, 0);
        rangeOptions._range +=
            rangeOptions._offsetMax - rangeOptions._offsetMin;
    };
    /**
     * Get the unix timestamp of a HTML input for the dates
     *
     * @private
     * @function Highcharts.RangeSelector#getInputValue
     */
    RangeSelector.prototype.getInputValue = function (name) {
        var input = name === 'min' ? this.minInput : this.maxInput;
        var options = this.chart.options
            .rangeSelector;
        var time = this.chart.time;
        if (input) {
            return ((input.type === 'text' && options.inputDateParser) ||
                this.defaultInputDateParser)(input.value, time.timezone === 'UTC', time);
        }
        return 0;
    };
    /**
     * Set the internal and displayed value of a HTML input for the dates
     *
     * @private
     * @function Highcharts.RangeSelector#setInputValue
     */
    RangeSelector.prototype.setInputValue = function (name, inputTime) {
        var options = this.options, time = this.chart.time, input = name === 'min' ? this.minInput : this.maxInput, dateBox = name === 'min' ? this.minDateBox : this.maxDateBox;
        if (input) {
            input.setAttribute('type', preferredInputType(options.inputDateFormat || '%e %b %Y'));
            var hcTimeAttr = input.getAttribute('data-hc-time');
            var updatedTime = defined(hcTimeAttr) ? Number(hcTimeAttr) : void 0;
            if (defined(inputTime)) {
                var previousTime = updatedTime;
                if (defined(previousTime)) {
                    input.setAttribute('data-hc-time-previous', previousTime);
                }
                input.setAttribute('data-hc-time', inputTime);
                updatedTime = inputTime;
            }
            input.value = time.dateFormat((this.inputTypeFormats[input.type] ||
                options.inputEditDateFormat), updatedTime);
            if (dateBox) {
                dateBox.attr({
                    text: time.dateFormat(options.inputDateFormat, updatedTime)
                });
            }
        }
    };
    /**
     * Set the min and max value of a HTML input for the dates
     *
     * @private
     * @function Highcharts.RangeSelector#setInputExtremes
     */
    RangeSelector.prototype.setInputExtremes = function (name, min, max) {
        var input = name === 'min' ? this.minInput : this.maxInput;
        if (input) {
            var format = this.inputTypeFormats[input.type];
            var time = this.chart.time;
            if (format) {
                var newMin = time.dateFormat(format, min);
                if (input.min !== newMin) {
                    input.min = newMin;
                }
                var newMax = time.dateFormat(format, max);
                if (input.max !== newMax) {
                    input.max = newMax;
                }
            }
        }
    };
    /**
     * @private
     * @function Highcharts.RangeSelector#showInput
     * @param {string} name
     */
    RangeSelector.prototype.showInput = function (name) {
        var dateBox = name === 'min' ? this.minDateBox : this.maxDateBox, input = name === 'min' ? this.minInput : this.maxInput;
        if (input && dateBox && this.inputGroup) {
            var isTextInput = input.type === 'text', _a = this.inputGroup, _b = _a.translateX, translateX = _b === void 0 ? 0 : _b, _c = _a.translateY, translateY = _c === void 0 ? 0 : _c, _d = dateBox.x, x = _d === void 0 ? 0 : _d, _e = dateBox.width, width = _e === void 0 ? 0 : _e, _f = dateBox.height, height = _f === void 0 ? 0 : _f, inputBoxWidth = this.options.inputBoxWidth;
            css(input, {
                width: isTextInput ?
                    ((width + (inputBoxWidth ? -2 : 20)) + 'px') :
                    'auto',
                height: (height - 2) + 'px',
                border: '2px solid silver'
            });
            if (isTextInput && inputBoxWidth) {
                css(input, {
                    left: (translateX + x) + 'px',
                    top: translateY + 'px'
                });
                // Inputs of types date, time or datetime-local should be centered
                // on top of the dateBox
            }
            else {
                css(input, {
                    left: Math.min(Math.round(x +
                        translateX -
                        (input.offsetWidth - width) / 2), this.chart.chartWidth - input.offsetWidth) + 'px',
                    top: (translateY - (input.offsetHeight - height) / 2) + 'px'
                });
            }
        }
    };
    /**
     * @private
     * @function Highcharts.RangeSelector#hideInput
     * @param {string} name
     */
    RangeSelector.prototype.hideInput = function (name) {
        var input = name === 'min' ? this.minInput : this.maxInput;
        if (input) {
            css(input, {
                top: '-9999em',
                border: 0,
                width: '1px',
                height: '1px'
            });
        }
    };
    /**
     * @private
     * @function Highcharts.RangeSelector#defaultInputDateParser
     */
    RangeSelector.prototype.defaultInputDateParser = function (inputDate, useUTC, time) {
        return (time === null || time === void 0 ? void 0 : time.parse(inputDate)) || 0;
    };
    /**
     * Draw either the 'from' or the 'to' HTML input box of the range selector
     *
     * @private
     * @function Highcharts.RangeSelector#drawInput
     */
    RangeSelector.prototype.drawInput = function (name) {
        var _a = this, chart = _a.chart, div = _a.div, inputGroup = _a.inputGroup;
        var rangeSelector = this, chartStyle = chart.renderer.style || {}, renderer = chart.renderer, options = chart.options.rangeSelector, lang = defaultOptions.lang, isMin = name === 'min';
        /**
         * @private
         */
        function updateExtremes(name) {
            var _a;
            var maxInput = rangeSelector.maxInput, minInput = rangeSelector.minInput, chartAxis = chart.xAxis[0], unionExtremes = ((_a = chart.scroller) === null || _a === void 0 ? void 0 : _a.getUnionExtremes()) || chartAxis, dataMin = unionExtremes.dataMin, dataMax = unionExtremes.dataMax, currentExtreme = chart.xAxis[0].getExtremes()[name];
            var value = rangeSelector.getInputValue(name);
            if (isNumber(value) && value !== currentExtreme) {
                // Validate the extremes. If it goes beyond the data min or
                // max, use the actual data extreme (#2438).
                if (isMin && maxInput && isNumber(dataMin)) {
                    if (value > Number(maxInput.getAttribute('data-hc-time'))) {
                        value = void 0;
                    }
                    else if (value < dataMin) {
                        value = dataMin;
                    }
                }
                else if (minInput && isNumber(dataMax)) {
                    if (value < Number(minInput.getAttribute('data-hc-time'))) {
                        value = void 0;
                    }
                    else if (value > dataMax) {
                        value = dataMax;
                    }
                }
                // Set the extremes
                if (typeof value !== 'undefined') { // @todo typeof undefined
                    chartAxis.setExtremes(isMin ? value : chartAxis.min, isMin ? chartAxis.max : value, void 0, void 0, { trigger: 'rangeSelectorInput' });
                }
            }
        }
        // Create the text label
        var text = lang[isMin ? 'rangeSelectorFrom' : 'rangeSelectorTo'] || '';
        var label = renderer
            .label(text, 0)
            .addClass('highcharts-range-label')
            .attr({
            padding: text ? 2 : 0,
            height: text ? options.inputBoxHeight : 0
        })
            .add(inputGroup);
        // Create an SVG label that shows updated date ranges and records click
        // events that bring in the HTML input.
        var dateBox = renderer
            .label('', 0)
            .addClass('highcharts-range-input')
            .attr({
            padding: 2,
            width: options.inputBoxWidth,
            height: options.inputBoxHeight,
            'text-align': 'center'
        })
            .on('click', function () {
            // If it is already focused, the onfocus event doesn't fire
            // (#3713)
            rangeSelector.showInput(name);
            rangeSelector[name + 'Input'].focus();
        });
        if (!chart.styledMode) {
            dateBox.attr({
                stroke: options.inputBoxBorderColor,
                'stroke-width': 1
            });
        }
        dateBox.add(inputGroup);
        // Create the HTML input element. This is rendered as 1x1 pixel then set
        // to the right size when focused.
        var input = createElement('input', {
            name: name,
            className: 'highcharts-range-selector'
        }, void 0, div);
        // #14788: Setting input.type to an unsupported type throws in IE, so
        // we need to use setAttribute instead
        input.setAttribute('type', preferredInputType(options.inputDateFormat || '%e %b %Y'));
        if (!chart.styledMode) {
            // Styles
            label.css(merge(chartStyle, options.labelStyle));
            dateBox.css(merge({
                color: "#333333" /* Palette.neutralColor80 */
            }, chartStyle, options.inputStyle));
            css(input, extend({
                position: 'absolute',
                border: 0,
                boxShadow: '0 0 15px rgba(0,0,0,0.3)',
                width: '1px', // Chrome needs a pixel to see it
                height: '1px',
                padding: 0,
                textAlign: 'center',
                fontSize: chartStyle.fontSize,
                fontFamily: chartStyle.fontFamily,
                top: '-9999em' // #4798
            }, options.inputStyle));
        }
        // Blow up the input box
        input.onfocus = function () {
            rangeSelector.showInput(name);
        };
        // Hide away the input box
        input.onblur = function () {
            // Update extremes only when inputs are active
            if (input === H.doc.activeElement) { // Only when focused
                // Update also when no `change` event is triggered, like when
                // clicking inside the SVG (#4710)
                updateExtremes(name);
            }
            // #10404 - move hide and blur outside focus
            rangeSelector.hideInput(name);
            rangeSelector.setInputValue(name);
            input.blur(); // #4606
        };
        var keyDown = false;
        // Handle changes in the input boxes
        input.onchange = function () {
            // Update extremes and blur input when clicking date input calendar
            if (!keyDown) {
                updateExtremes(name);
                rangeSelector.hideInput(name);
                input.blur();
            }
        };
        input.onkeypress = function (event) {
            // IE does not fire onchange on enter
            if (event.keyCode === 13) {
                updateExtremes(name);
            }
        };
        input.onkeydown = function (event) {
            keyDown = true;
            // Arrow keys
            if (event.key === 'ArrowUp' ||
                event.key === 'ArrowDown' ||
                event.key === 'Tab') {
                updateExtremes(name);
            }
        };
        input.onkeyup = function () {
            keyDown = false;
        };
        return { dateBox: dateBox, input: input, label: label };
    };
    /**
     * Get the position of the range selector buttons and inputs. This can be
     * overridden from outside for custom positioning.
     *
     * @private
     * @function Highcharts.RangeSelector#getPosition
     */
    RangeSelector.prototype.getPosition = function () {
        var chart = this.chart, options = chart.options.rangeSelector, top = options.verticalAlign === 'top' ?
            chart.plotTop - chart.axisOffset[0] :
            0; // Set offset only for verticalAlign top
        return {
            buttonTop: top + options.buttonPosition.y,
            inputTop: top + options.inputPosition.y - 10
        };
    };
    /**
     * Get the extremes of YTD. Will choose dataMax if its value is lower than
     * the current timestamp. Will choose dataMin if its value is higher than
     * the timestamp for the start of current year.
     *
     * @private
     * @function Highcharts.RangeSelector#getYTDExtremes
     * @return {*}
     * Returns min and max for the YTD
     */
    RangeSelector.prototype.getYTDExtremes = function (dataMax, dataMin) {
        var time = this.chart.time, year = time.toParts(dataMax)[0], startOfYear = time.makeTime(year, 0);
        return {
            max: dataMax,
            min: Math.max(dataMin, startOfYear)
        };
    };
    RangeSelector.prototype.createElements = function () {
        var _a;
        var chart = this.chart, renderer = chart.renderer, container = chart.container, chartOptions = chart.options, options = chartOptions.rangeSelector, inputEnabled = options.inputEnabled, inputsZIndex = pick((_a = chartOptions.chart.style) === null || _a === void 0 ? void 0 : _a.zIndex, 0) + 1;
        if (options.enabled === false) {
            return;
        }
        this.group = renderer.g('range-selector-group')
            .attr({
            zIndex: 7
        })
            .add();
        this.div = createElement('div', void 0, {
            position: 'relative',
            height: 0,
            zIndex: inputsZIndex
        });
        if (this.buttonOptions.length) {
            this.renderButtons();
        }
        // First create a wrapper outside the container in order to make
        // the inputs work and make export correct
        if (container.parentNode) {
            container.parentNode.insertBefore(this.div, container);
        }
        if (inputEnabled) {
            this.createInputs();
        }
    };
    /**
     * Create the input elements and its group.
     *
     */
    RangeSelector.prototype.createInputs = function () {
        this.inputGroup = this.chart.renderer.g('input-group').add(this.group);
        var minElems = this.drawInput('min');
        this.minDateBox = minElems.dateBox;
        this.minLabel = minElems.label;
        this.minInput = minElems.input;
        var maxElems = this.drawInput('max');
        this.maxDateBox = maxElems.dateBox;
        this.maxLabel = maxElems.label;
        this.maxInput = maxElems.input;
    };
    /**
     * Render the range selector including the buttons and the inputs. The first
     * time render is called, the elements are created and positioned. On
     * subsequent calls, they are moved and updated.
     *
     * @private
     * @function Highcharts.RangeSelector#render
     * @param {number} [min]
     *        X axis minimum
     * @param {number} [max]
     *        X axis maximum
     */
    RangeSelector.prototype.render = function (min, max) {
        var _a, _b;
        if (this.options.enabled === false) {
            return;
        }
        var chart = this.chart, chartOptions = chart.options, options = chartOptions.rangeSelector, 
        // Place inputs above the container
        inputEnabled = options.inputEnabled;
        if (inputEnabled) {
            if (!this.inputGroup) {
                this.createInputs();
            }
            // Set or reset the input values
            this.setInputValue('min', min);
            this.setInputValue('max', max);
            if (!this.chart.styledMode) {
                (_a = this.maxLabel) === null || _a === void 0 ? void 0 : _a.css(options.labelStyle);
                (_b = this.minLabel) === null || _b === void 0 ? void 0 : _b.css(options.labelStyle);
            }
            var unionExtremes = (chart.scroller && chart.scroller.getUnionExtremes()) || chart.xAxis[0] || {};
            if (defined(unionExtremes.dataMin) &&
                defined(unionExtremes.dataMax)) {
                var minRange = chart.xAxis[0].minRange || 0;
                this.setInputExtremes('min', unionExtremes.dataMin, Math.min(unionExtremes.dataMax, this.getInputValue('max')) - minRange);
                this.setInputExtremes('max', Math.max(unionExtremes.dataMin, this.getInputValue('min')) + minRange, unionExtremes.dataMax);
            }
            // Reflow
            if (this.inputGroup) {
                var x_1 = 0;
                [
                    this.minLabel,
                    this.minDateBox,
                    this.maxLabel,
                    this.maxDateBox
                ].forEach(function (label) {
                    if (label) {
                        var width = label.getBBox().width;
                        if (width) {
                            label.attr({ x: x_1 });
                            x_1 += width + options.inputSpacing;
                        }
                    }
                });
            }
        }
        else {
            if (this.inputGroup) {
                this.inputGroup.destroy();
                delete this.inputGroup;
            }
        }
        if (!this.chart.styledMode) {
            if (this.zoomText) {
                this.zoomText.css(options.labelStyle);
            }
        }
        this.alignElements();
        this.updateButtonStates();
    };
    /**
     * Render the range buttons. This only runs the first time, later the
     * positioning is laid out in alignElements.
     *
     * @private
     * @function Highcharts.RangeSelector#renderButtons
     */
    RangeSelector.prototype.renderButtons = function () {
        var _this = this;
        var _a, _b;
        var _c;
        var _d = this, chart = _d.chart, options = _d.options;
        var lang = defaultOptions.lang;
        var renderer = chart.renderer;
        var buttonTheme = merge(options.buttonTheme);
        var states = buttonTheme && buttonTheme.states;
        // Prevent the button from resetting the width when the button state
        // changes since we need more control over the width when collapsing
        // the buttons
        delete buttonTheme.width;
        delete buttonTheme.states;
        this.buttonGroup = renderer.g('range-selector-buttons').add(this.group);
        var dropdown = this.dropdown = createElement('select', void 0, {
            position: 'absolute',
            padding: 0,
            border: 0,
            cursor: 'pointer',
            opacity: 0.0001
        }, this.div);
        // Create a label for dropdown select element
        var userButtonTheme = (_a = chart.userOptions.rangeSelector) === null || _a === void 0 ? void 0 : _a.buttonTheme;
        this.dropdownLabel = renderer.button('', 0, 0, function () { }, merge(buttonTheme, {
            'stroke-width': pick(buttonTheme['stroke-width'], 0),
            width: 'auto',
            paddingLeft: pick(options.buttonTheme.paddingLeft, userButtonTheme === null || userButtonTheme === void 0 ? void 0 : userButtonTheme.padding, 8),
            paddingRight: pick(options.buttonTheme.paddingRight, userButtonTheme === null || userButtonTheme === void 0 ? void 0 : userButtonTheme.padding, 8)
        }), states && states.hover, states && states.select, states && states.disabled)
            .hide()
            .add(this.group);
        // Prevent page zoom on iPhone
        addEvent(dropdown, 'touchstart', function () {
            dropdown.style.fontSize = '16px';
        });
        // Forward events from select to button
        var mouseOver = H.isMS ? 'mouseover' : 'mouseenter', mouseOut = H.isMS ? 'mouseout' : 'mouseleave';
        addEvent(dropdown, mouseOver, function () {
            fireEvent(_this.dropdownLabel.element, mouseOver);
        });
        addEvent(dropdown, mouseOut, function () {
            fireEvent(_this.dropdownLabel.element, mouseOut);
        });
        addEvent(dropdown, 'change', function () {
            var button = _this.buttons[dropdown.selectedIndex - 1];
            fireEvent(button.element, 'click');
        });
        this.zoomText = renderer
            .label(lang.rangeSelectorZoom || '', 0)
            .attr({
            padding: options.buttonTheme.padding,
            height: options.buttonTheme.height,
            paddingLeft: 0,
            paddingRight: 0
        })
            .add(this.buttonGroup);
        if (!this.chart.styledMode) {
            this.zoomText.css(options.labelStyle);
            (_b = (_c = options.buttonTheme)['stroke-width']) !== null && _b !== void 0 ? _b : (_c['stroke-width'] = 0);
        }
        createElement('option', {
            textContent: this.zoomText.textStr,
            disabled: true
        }, void 0, dropdown);
        this.createButtons();
    };
    RangeSelector.prototype.createButtons = function () {
        var _this = this;
        var options = this.options;
        var buttonTheme = merge(options.buttonTheme);
        var states = buttonTheme && buttonTheme.states;
        // Prevent the button from resetting the width when the button state
        // changes since we need more control over the width when collapsing
        // the buttons
        var width = buttonTheme.width || 28;
        delete buttonTheme.width;
        delete buttonTheme.states;
        this.buttonOptions.forEach(function (rangeOptions, i) {
            _this.createButton(rangeOptions, i, width, states);
        });
    };
    RangeSelector.prototype.createButton = function (rangeOptions, i, width, states) {
        var _this = this;
        var _a = this, dropdown = _a.dropdown, buttons = _a.buttons, chart = _a.chart, options = _a.options;
        var renderer = chart.renderer;
        var buttonTheme = merge(options.buttonTheme);
        dropdown === null || dropdown === void 0 ? void 0 : dropdown.add(createElement('option', {
            textContent: rangeOptions.title || rangeOptions.text
        }), i + 2);
        buttons[i] = renderer
            .button(rangeOptions.text, 0, 0, function (e) {
            // Extract events from button object and call
            var buttonEvents = (rangeOptions.events && rangeOptions.events.click);
            var callDefaultEvent;
            if (buttonEvents) {
                callDefaultEvent =
                    buttonEvents.call(rangeOptions, e);
            }
            if (callDefaultEvent !== false) {
                _this.clickButton(i);
            }
            _this.isActive = true;
        }, buttonTheme, states && states.hover, states && states.select, states && states.disabled)
            .attr({
            'text-align': 'center',
            width: width
        })
            .add(this.buttonGroup);
        if (rangeOptions.title) {
            buttons[i].attr('title', rangeOptions.title);
        }
    };
    /**
     * Align the elements horizontally and vertically.
     *
     * @private
     * @function Highcharts.RangeSelector#alignElements
     */
    RangeSelector.prototype.alignElements = function () {
        var _this = this;
        var _a;
        var _b = this, buttonGroup = _b.buttonGroup, buttons = _b.buttons, chart = _b.chart, group = _b.group, inputGroup = _b.inputGroup, options = _b.options, zoomText = _b.zoomText;
        var chartOptions = chart.options;
        var navButtonOptions = (chartOptions.exporting &&
            chartOptions.exporting.enabled !== false &&
            chartOptions.navigation &&
            chartOptions.navigation.buttonOptions);
        var buttonPosition = options.buttonPosition, inputPosition = options.inputPosition, verticalAlign = options.verticalAlign;
        // Get the X offset required to avoid overlapping with the exporting
        // button. This is used both by the buttonGroup and the inputGroup.
        var getXOffsetForExportButton = function (group, position, rightAligned) {
            if (navButtonOptions &&
                _this.titleCollision(chart) &&
                verticalAlign === 'top' &&
                rightAligned && ((position.y -
                group.getBBox().height - 12) <
                ((navButtonOptions.y || 0) +
                    (navButtonOptions.height || 0) +
                    chart.spacing[0]))) {
                return -40;
            }
            return 0;
        };
        var plotLeft = chart.plotLeft;
        if (group && buttonPosition && inputPosition) {
            var translateX = buttonPosition.x - chart.spacing[3];
            if (buttonGroup) {
                this.positionButtons();
                if (!this.initialButtonGroupWidth) {
                    var width_1 = 0;
                    if (zoomText) {
                        width_1 += zoomText.getBBox().width + 5;
                    }
                    buttons.forEach(function (button, i) {
                        width_1 += button.width || 0;
                        if (i !== buttons.length - 1) {
                            width_1 += options.buttonSpacing;
                        }
                    });
                    this.initialButtonGroupWidth = width_1;
                }
                plotLeft -= chart.spacing[3];
                // Detect collision between button group and exporting
                var xOffsetForExportButton_1 = getXOffsetForExportButton(buttonGroup, buttonPosition, buttonPosition.align === 'right' ||
                    inputPosition.align === 'right');
                this.alignButtonGroup(xOffsetForExportButton_1);
                if ((_a = this.buttonGroup) === null || _a === void 0 ? void 0 : _a.translateY) {
                    this.dropdownLabel
                        .attr({ y: this.buttonGroup.translateY });
                }
                // Skip animation
                group.placed = buttonGroup.placed = chart.hasLoaded;
            }
            var xOffsetForExportButton = 0;
            if (options.inputEnabled && inputGroup) {
                // Detect collision between the input group and exporting button
                xOffsetForExportButton = getXOffsetForExportButton(inputGroup, inputPosition, buttonPosition.align === 'right' ||
                    inputPosition.align === 'right');
                if (inputPosition.align === 'left') {
                    translateX = plotLeft;
                }
                else if (inputPosition.align === 'right') {
                    translateX = -Math.max(chart.axisOffset[1], -xOffsetForExportButton);
                }
                // Update the alignment to the updated spacing box
                inputGroup.align({
                    y: inputPosition.y,
                    width: inputGroup.getBBox().width,
                    align: inputPosition.align,
                    // Fix wrong getBBox() value on right align
                    x: inputPosition.x + translateX - 2
                }, true, chart.spacingBox);
                // Skip animation
                inputGroup.placed = chart.hasLoaded;
            }
            this.handleCollision(xOffsetForExportButton);
            // Vertical align
            group.align({
                verticalAlign: verticalAlign
            }, true, chart.spacingBox);
            var alignTranslateY = group.alignAttr.translateY;
            // Set position
            var groupHeight = group.getBBox().height + 20; // # 20 padding
            var translateY = 0;
            // Calculate bottom position
            if (verticalAlign === 'bottom') {
                var legendOptions = chart.legend && chart.legend.options;
                var legendHeight = (legendOptions &&
                    legendOptions.verticalAlign === 'bottom' &&
                    legendOptions.enabled &&
                    !legendOptions.floating ?
                    (chart.legend.legendHeight +
                        pick(legendOptions.margin, 10)) :
                    0);
                groupHeight = groupHeight + legendHeight - 20;
                translateY = (alignTranslateY -
                    groupHeight -
                    (options.floating ? 0 : options.y) -
                    (chart.titleOffset ? chart.titleOffset[2] : 0) -
                    10 // 10 spacing
                );
            }
            if (verticalAlign === 'top') {
                if (options.floating) {
                    translateY = 0;
                }
                if (chart.titleOffset && chart.titleOffset[0]) {
                    translateY = chart.titleOffset[0];
                }
                translateY += ((chart.margin[0] - chart.spacing[0]) || 0);
            }
            else if (verticalAlign === 'middle') {
                if (inputPosition.y === buttonPosition.y) {
                    translateY = alignTranslateY;
                }
                else if (inputPosition.y || buttonPosition.y) {
                    if (inputPosition.y < 0 ||
                        buttonPosition.y < 0) {
                        translateY -= Math.min(inputPosition.y, buttonPosition.y);
                    }
                    else {
                        translateY = alignTranslateY - groupHeight;
                    }
                }
            }
            group.translate(options.x, options.y + Math.floor(translateY));
            // Translate HTML inputs
            var _c = this, minInput = _c.minInput, maxInput = _c.maxInput, dropdown = _c.dropdown;
            if (options.inputEnabled && minInput && maxInput) {
                minInput.style.marginTop = group.translateY + 'px';
                maxInput.style.marginTop = group.translateY + 'px';
            }
            if (dropdown) {
                dropdown.style.marginTop = group.translateY + 'px';
            }
        }
    };
    /**
     * @private
     */
    RangeSelector.prototype.redrawElements = function () {
        var _a, _b, _c, _d, _e, _f, _g;
        var chart = this.chart, _h = this.options, inputBoxHeight = _h.inputBoxHeight, inputBoxBorderColor = _h.inputBoxBorderColor;
        (_a = this.maxDateBox) === null || _a === void 0 ? void 0 : _a.attr({
            height: inputBoxHeight
        });
        (_b = this.minDateBox) === null || _b === void 0 ? void 0 : _b.attr({
            height: inputBoxHeight
        });
        if (!chart.styledMode) {
            (_c = this.maxDateBox) === null || _c === void 0 ? void 0 : _c.attr({
                stroke: inputBoxBorderColor
            });
            (_d = this.minDateBox) === null || _d === void 0 ? void 0 : _d.attr({
                stroke: inputBoxBorderColor
            });
        }
        if (this.isDirty) {
            this.isDirty = false;
            // Reset this prop to force redrawing collapse of buttons
            this.isCollapsed = void 0;
            var newButtonsOptions = (_e = this.options.buttons) !== null && _e !== void 0 ? _e : [];
            var btnLength = Math.min(newButtonsOptions.length, this.buttonOptions.length);
            var _j = this, dropdown = _j.dropdown, options = _j.options;
            var buttonTheme = merge(options.buttonTheme);
            var states = buttonTheme && buttonTheme.states;
            // Prevent the button from resetting the width when the button state
            // changes since we need more control over the width when collapsing
            // the buttons
            var width = buttonTheme.width || 28;
            // Destroy additional buttons
            if (newButtonsOptions.length < this.buttonOptions.length) {
                for (var i = this.buttonOptions.length - 1; i >= newButtonsOptions.length; i--) {
                    var btn = this.buttons.pop();
                    btn === null || btn === void 0 ? void 0 : btn.destroy();
                    (_f = this.dropdown) === null || _f === void 0 ? void 0 : _f.options.remove(i + 1);
                }
            }
            // Update current buttons
            for (var i = btnLength - 1; i >= 0; i--) {
                var diff = diffObjects(newButtonsOptions[i], this.buttonOptions[i]);
                if (Object.keys(diff).length !== 0) {
                    var rangeOptions = newButtonsOptions[i];
                    this.buttons[i].destroy();
                    dropdown === null || dropdown === void 0 ? void 0 : dropdown.options.remove(i + 1);
                    this.createButton(rangeOptions, i, width, states);
                    this.computeButtonRange(rangeOptions);
                }
            }
            // Create missing buttons
            if (newButtonsOptions.length > this.buttonOptions.length) {
                for (var i = this.buttonOptions.length; i < newButtonsOptions.length; i++) {
                    this.createButton(newButtonsOptions[i], i, width, states);
                    this.computeButtonRange(newButtonsOptions[i]);
                }
            }
            this.buttonOptions = (_g = this.options.buttons) !== null && _g !== void 0 ? _g : [];
            if (defined(this.options.selected) && this.buttons.length) {
                this.clickButton(this.options.selected, false);
            }
        }
    };
    /**
     * Align the button group horizontally and vertically.
     *
     * @private
     * @function Highcharts.RangeSelector#alignButtonGroup
     * @param {number} xOffsetForExportButton
     * @param {number} [width]
     */
    RangeSelector.prototype.alignButtonGroup = function (xOffsetForExportButton, width) {
        var _a = this, chart = _a.chart, options = _a.options, buttonGroup = _a.buttonGroup, dropdown = _a.dropdown, dropdownLabel = _a.dropdownLabel;
        var buttonPosition = options.buttonPosition;
        var plotLeft = chart.plotLeft - chart.spacing[3];
        var translateX = buttonPosition.x - chart.spacing[3];
        var dropdownTranslateX = chart.plotLeft;
        if (buttonPosition.align === 'right') {
            translateX += xOffsetForExportButton - plotLeft; // #13014
            if (this.hasVisibleDropdown) {
                dropdownTranslateX = chart.chartWidth +
                    xOffsetForExportButton -
                    this.maxButtonWidth() - 20;
            }
        }
        else if (buttonPosition.align === 'center') {
            translateX -= plotLeft / 2;
            if (this.hasVisibleDropdown) {
                dropdownTranslateX = chart.chartWidth / 2 -
                    this.maxButtonWidth();
            }
        }
        if (dropdown) {
            css(dropdown, {
                left: dropdownTranslateX + 'px',
                top: (buttonGroup === null || buttonGroup === void 0 ? void 0 : buttonGroup.translateY) + 'px'
            });
        }
        dropdownLabel === null || dropdownLabel === void 0 ? void 0 : dropdownLabel.attr({
            x: dropdownTranslateX
        });
        if (buttonGroup) {
            // Align button group
            buttonGroup.align({
                y: buttonPosition.y,
                width: pick(width, this.initialButtonGroupWidth),
                align: buttonPosition.align,
                x: translateX
            }, true, chart.spacingBox);
        }
    };
    /**
     * @private
     * @function Highcharts.RangeSelector#positionButtons
     */
    RangeSelector.prototype.positionButtons = function () {
        var _a = this, buttons = _a.buttons, chart = _a.chart, options = _a.options, zoomText = _a.zoomText;
        var verb = chart.hasLoaded ? 'animate' : 'attr';
        var buttonPosition = options.buttonPosition;
        var plotLeft = chart.plotLeft;
        var buttonLeft = plotLeft;
        if (zoomText && zoomText.visibility !== 'hidden') {
            // #8769, allow dynamically updating margins
            zoomText[verb]({
                x: pick(plotLeft + buttonPosition.x, plotLeft)
            });
            // Button start position
            buttonLeft += buttonPosition.x +
                zoomText.getBBox().width + 5;
        }
        for (var i = 0, iEnd = this.buttonOptions.length; i < iEnd; ++i) {
            if (buttons[i].visibility !== 'hidden') {
                buttons[i][verb]({ x: buttonLeft });
                // Increase the button position for the next button
                buttonLeft += (buttons[i].width || 0) + options.buttonSpacing;
            }
            else {
                buttons[i][verb]({ x: plotLeft });
            }
        }
    };
    /**
     * Handle collision between the button group and the input group
     *
     * @private
     * @function Highcharts.RangeSelector#handleCollision
     *
     * @param  {number} xOffsetForExportButton
     *                  The X offset of the group required to make room for the
     *                  exporting button
     */
    RangeSelector.prototype.handleCollision = function (xOffsetForExportButton) {
        var _a = this, chart = _a.chart, buttonGroup = _a.buttonGroup, inputGroup = _a.inputGroup, initialButtonGroupWidth = _a.initialButtonGroupWidth;
        var _b = this.options, buttonPosition = _b.buttonPosition, dropdown = _b.dropdown, inputPosition = _b.inputPosition;
        var moveInputsDown = function () {
            if (inputGroup && buttonGroup) {
                inputGroup.attr({
                    translateX: inputGroup.alignAttr.translateX + (chart.axisOffset[1] >= -xOffsetForExportButton ?
                        0 :
                        -xOffsetForExportButton),
                    translateY: inputGroup.alignAttr.translateY +
                        buttonGroup.getBBox().height + 10
                });
            }
        };
        // Detect collision
        if (inputGroup && buttonGroup) {
            if (inputPosition.align === buttonPosition.align) {
                moveInputsDown();
                if (initialButtonGroupWidth >
                    chart.plotWidth + xOffsetForExportButton - 20) {
                    this.collapseButtons();
                }
                else {
                    this.expandButtons();
                }
            }
            else if (initialButtonGroupWidth -
                xOffsetForExportButton +
                inputGroup.getBBox().width >
                chart.plotWidth) {
                if (dropdown === 'responsive') {
                    this.collapseButtons();
                }
                else {
                    moveInputsDown();
                }
            }
            else {
                this.expandButtons();
            }
        }
        else if (buttonGroup && dropdown === 'responsive') {
            if (initialButtonGroupWidth > chart.plotWidth) {
                this.collapseButtons();
            }
            else {
                this.expandButtons();
            }
        }
        // Forced states
        if (buttonGroup) {
            if (dropdown === 'always') {
                this.collapseButtons();
            }
            if (dropdown === 'never') {
                this.expandButtons();
            }
        }
        this.alignButtonGroup(xOffsetForExportButton);
    };
    /**
     * Collapse the buttons and show the select element.
     *
     * @private
     * @function Highcharts.RangeSelector#collapseButtons
     * @param {number} xOffsetForExportButton
     */
    RangeSelector.prototype.collapseButtons = function () {
        var _a = this, buttons = _a.buttons, zoomText = _a.zoomText;
        if (this.isCollapsed === true) {
            return;
        }
        this.isCollapsed = true;
        zoomText.hide();
        buttons.forEach(function (button) { return void button.hide(); });
        this.showDropdown();
    };
    /**
     * Show all the buttons and hide the select element.
     *
     * @private
     * @function Highcharts.RangeSelector#expandButtons
     */
    RangeSelector.prototype.expandButtons = function () {
        var _a = this, buttons = _a.buttons, zoomText = _a.zoomText;
        if (this.isCollapsed === false) {
            return;
        }
        this.isCollapsed = false;
        this.hideDropdown();
        zoomText.show();
        buttons.forEach(function (button) { return void button.show(); });
        this.positionButtons();
    };
    /**
     * Position the select element on top of the button.
     *
     * @private
     * @function Highcharts.RangeSelector#showDropdown
     */
    RangeSelector.prototype.showDropdown = function () {
        var _a = this, buttonGroup = _a.buttonGroup, dropdownLabel = _a.dropdownLabel, dropdown = _a.dropdown;
        if (buttonGroup && dropdown) {
            dropdownLabel.show();
            css(dropdown, { visibility: 'inherit' });
            this.hasVisibleDropdown = true;
        }
    };
    /**
     * @private
     * @function Highcharts.RangeSelector#hideDropdown
     */
    RangeSelector.prototype.hideDropdown = function () {
        var dropdown = this.dropdown;
        if (dropdown) {
            this.dropdownLabel.hide();
            css(dropdown, {
                visibility: 'hidden',
                width: '1px',
                height: '1px'
            });
            this.hasVisibleDropdown = false;
        }
    };
    /**
     * Extracts height of range selector
     *
     * @private
     * @function Highcharts.RangeSelector#getHeight
     * @return {number}
     * Returns rangeSelector height
     */
    RangeSelector.prototype.getHeight = function () {
        var rangeSelector = this, options = rangeSelector.options, rangeSelectorGroup = rangeSelector.group, inputPosition = options.inputPosition, buttonPosition = options.buttonPosition, yPosition = options.y, buttonPositionY = buttonPosition.y, inputPositionY = inputPosition.y;
        var rangeSelectorHeight = 0;
        if (options.height) {
            return options.height;
        }
        // Align the elements before we read the height in case we're switching
        // between wrapped and non-wrapped layout
        this.alignElements();
        rangeSelectorHeight = rangeSelectorGroup ?
            // 13px to keep back compatibility
            (rangeSelectorGroup.getBBox(true).height) + 13 +
                yPosition :
            0;
        var minPosition = Math.min(inputPositionY, buttonPositionY);
        if ((inputPositionY < 0 && buttonPositionY < 0) ||
            (inputPositionY > 0 && buttonPositionY > 0)) {
            rangeSelectorHeight += Math.abs(minPosition);
        }
        return rangeSelectorHeight;
    };
    /**
     * Detect collision with title or subtitle
     *
     * @private
     * @function Highcharts.RangeSelector#titleCollision
     * @return {boolean}
     * Returns collision status
     */
    RangeSelector.prototype.titleCollision = function (chart) {
        return !(chart.options.title.text ||
            chart.options.subtitle.text);
    };
    /**
     * Update the range selector with new options
     *
     * @private
     * @function Highcharts.RangeSelector#update
     * @param {Highcharts.RangeSelectorOptions} options
     */
    RangeSelector.prototype.update = function (options, redraw) {
        if (redraw === void 0) { redraw = true; }
        var chart = this.chart;
        merge(true, this.options, options);
        if (this.options.selected &&
            this.options.selected >= this.options.buttons.length) {
            this.options.selected = void 0;
            chart.options.rangeSelector.selected = void 0;
        }
        if (defined(options.enabled)) {
            this.destroy();
            return this.init(chart);
        }
        this.isDirty = !!options.buttons;
        if (redraw) {
            this.render();
        }
    };
    /**
     * Destroys allocated elements.
     *
     * @private
     * @function Highcharts.RangeSelector#destroy
     */
    RangeSelector.prototype.destroy = function () {
        var rSelector = this, minInput = rSelector.minInput, maxInput = rSelector.maxInput;
        if (rSelector.eventsToUnbind) {
            rSelector.eventsToUnbind.forEach(function (unbind) { return unbind(); });
            rSelector.eventsToUnbind = void 0;
        }
        // Destroy elements in collections
        destroyObjectProperties(rSelector.buttons);
        // Clear input element events
        if (minInput) {
            minInput.onfocus = minInput.onblur = minInput.onchange = null;
        }
        if (maxInput) {
            maxInput.onfocus = maxInput.onblur = maxInput.onchange = null;
        }
        // Destroy HTML and SVG elements
        objectEach(rSelector, function (val, key) {
            if (val && key !== 'chart') {
                if (val instanceof SVGElement) {
                    // SVGElement
                    val.destroy();
                }
                else if (val instanceof window.HTMLElement) {
                    // HTML element
                    discardElement(val);
                }
                delete rSelector[key];
            }
            if (val !== RangeSelector.prototype[key]) {
                rSelector[key] = null;
            }
        }, this);
        this.buttons = [];
    };
    return RangeSelector;
}());
extend(RangeSelector.prototype, {
    /**
     * The date formats to use when setting min, max and value on date inputs.
     * @private
     */
    inputTypeFormats: {
        'datetime-local': '%Y-%m-%dT%H:%M:%S',
        'date': '%Y-%m-%d',
        'time': '%H:%M:%S'
    }
});
/* *
 *
 *  Default Export
 *
 * */
export default RangeSelector;
/* *
 *
 *  API Options
 *
 * */
/**
 * Define the time span for the button
 *
 * @typedef {"all"|"day"|"hour"|"millisecond"|"minute"|"month"|"second"|"week"|"year"|"ytd"} Highcharts.RangeSelectorButtonTypeValue
 */
/**
 * Callback function to react on button clicks.
 *
 * @callback Highcharts.RangeSelectorClickCallbackFunction
 *
 * @param {global.Event} e
 *        Event arguments.
 *
 * @param {boolean|undefined}
 *        Return false to cancel the default button event.
 */
/**
 * Callback function to parse values entered in the input boxes and return a
 * valid JavaScript time as milliseconds since 1970.
 *
 * @callback Highcharts.RangeSelectorParseCallbackFunction
 *
 * @param {string} value
 *        Input value to parse.
 *
 * @return {number}
 *         Parsed JavaScript time value.
 */
(''); // Keeps doclets above in JS file
