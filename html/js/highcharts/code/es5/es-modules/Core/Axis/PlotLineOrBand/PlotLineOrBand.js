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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import PlotLineOrBandAxis from './PlotLineOrBandAxis.js';
import U from '../../Utilities.js';
var addEvent = U.addEvent, arrayMax = U.arrayMax, arrayMin = U.arrayMin, defined = U.defined, destroyObjectProperties = U.destroyObjectProperties, erase = U.erase, fireEvent = U.fireEvent, merge = U.merge, objectEach = U.objectEach, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * The object wrapper for plot lines and plot bands
 *
 * @class
 * @name Highcharts.PlotLineOrBand
 *
 * @param {Highcharts.Axis} axis
 * Related axis.
 *
 * @param {Highcharts.AxisPlotLinesOptions|Highcharts.AxisPlotBandsOptions} [options]
 * Options to use.
 */
var PlotLineOrBand = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function PlotLineOrBand(axis, options) {
        /**
         * Related axis.
         *
         * @name Highcharts.PlotLineOrBand#axis
         * @type {Highcharts.Axis}
         */
        this.axis = axis;
        /**
         * Options of the plot line or band.
         *
         * @name Highcharts.PlotLineOrBand#options
         * @type {AxisPlotBandsOptions|AxisPlotLinesOptions}
         */
        this.options = options;
        this.id = options.id;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    PlotLineOrBand.compose = function (ChartClass, AxisClass) {
        addEvent(ChartClass, 'afterInit', function () {
            var _this = this;
            this.labelCollectors.push(function () {
                var _a;
                var labels = [];
                for (var _i = 0, _b = _this.axes; _i < _b.length; _i++) {
                    var axis = _b[_i];
                    for (var _c = 0, _d = axis.plotLinesAndBands; _c < _d.length; _c++) {
                        var _e = _d[_c], label = _e.label, options = _e.options;
                        if (label && !((_a = options === null || options === void 0 ? void 0 : options.label) === null || _a === void 0 ? void 0 : _a.allowOverlap)) {
                            labels.push(label);
                        }
                    }
                }
                return labels;
            });
        });
        return PlotLineOrBandAxis.compose(PlotLineOrBand, AxisClass);
    };
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable no-invalid-this, valid-jsdoc */
    /**
     * Render the plot line or plot band. If it is already existing,
     * move it.
     * @private
     * @function Highcharts.PlotLineOrBand#render
     */
    PlotLineOrBand.prototype.render = function () {
        var _this = this;
        var _a, _b, _c;
        fireEvent(this, 'render');
        var _d = this, axis = _d.axis, options = _d.options, horiz = axis.horiz, logarithmic = axis.logarithmic, color = options.color, events = options.events, _e = options.zIndex, zIndex = _e === void 0 ? 0 : _e, _f = axis.chart, renderer = _f.renderer, time = _f.time, groupAttribs = {}, 
        // These properties only exist on either band or line
        to = time.parse(options.to), from = time.parse(options.from), value = time.parse(options.value), borderWidth = options.borderWidth;
        var optionsLabel = options.label, _g = this, label = _g.label, svgElem = _g.svgElem, path = [], group;
        var isBand = defined(from) && defined(to), isLine = defined(value), isNew = !svgElem, attribs = {
            'class': 'highcharts-plot-' + (isBand ? 'band ' : 'line ') +
                (options.className || '')
        };
        var groupName = isBand ? 'bands' : 'lines';
        // Set the presentational attributes
        if (!axis.chart.styledMode) {
            if (isLine) {
                attribs.stroke = color || "#999999" /* Palette.neutralColor40 */;
                attribs['stroke-width'] = pick(options.width, 1);
                if (options.dashStyle) {
                    attribs.dashstyle = options.dashStyle;
                }
            }
            else if (isBand) { // Plot band
                attribs.fill = color || "#e6e9ff" /* Palette.highlightColor10 */;
                if (borderWidth) {
                    attribs.stroke = options.borderColor;
                    attribs['stroke-width'] = borderWidth;
                }
            }
        }
        // Grouping and zIndex
        groupAttribs.zIndex = zIndex;
        groupName += '-' + zIndex;
        group = axis.plotLinesAndBandsGroups[groupName];
        if (!group) {
            axis.plotLinesAndBandsGroups[groupName] = group =
                renderer.g('plot-' + groupName)
                    .attr(groupAttribs).add();
        }
        // Create the path
        if (!svgElem) {
            /**
             * SVG element of the plot line or band.
             *
             * @name Highcharts.PlotLineOrBand#svgElem
             * @type {Highcharts.SVGElement}
             */
            this.svgElem = svgElem = renderer
                .path()
                .attr(attribs)
                .add(group);
        }
        // Set the path or return
        if (defined(value)) { // Plot line
            path = axis.getPlotLinePath({
                value: (_a = logarithmic === null || logarithmic === void 0 ? void 0 : logarithmic.log2lin(value)) !== null && _a !== void 0 ? _a : value,
                lineWidth: svgElem.strokeWidth(),
                acrossPanes: options.acrossPanes
            });
        }
        else if (defined(from) && defined(to)) { // Plot band
            path = axis.getPlotBandPath((_b = logarithmic === null || logarithmic === void 0 ? void 0 : logarithmic.log2lin(from)) !== null && _b !== void 0 ? _b : from, (_c = logarithmic === null || logarithmic === void 0 ? void 0 : logarithmic.log2lin(to)) !== null && _c !== void 0 ? _c : to, options);
        }
        else {
            return;
        }
        // Common for lines and bands. Add events only if they were not added
        // before.
        if (!this.eventsAdded && events) {
            objectEach(events, function (event, eventType) {
                svgElem === null || svgElem === void 0 ? void 0 : svgElem.on(eventType, function (e) {
                    events[eventType].apply(_this, [e]);
                });
            });
            this.eventsAdded = true;
        }
        if ((isNew || !svgElem.d) && (path === null || path === void 0 ? void 0 : path.length)) {
            svgElem.attr({ d: path });
        }
        else if (svgElem) {
            if (path) {
                svgElem.show();
                svgElem.animate({ d: path });
            }
            else if (svgElem.d) {
                svgElem.hide();
                if (label) {
                    this.label = label = label.destroy();
                }
            }
        }
        // The plot band/line label
        if (optionsLabel &&
            (defined(optionsLabel.text) || defined(optionsLabel.formatter)) &&
            (path === null || path === void 0 ? void 0 : path.length) &&
            axis.width > 0 &&
            axis.height > 0 &&
            !path.isFlat) {
            // Apply defaults
            optionsLabel = merge(__assign({ align: horiz && isBand ? 'center' : void 0, x: horiz ? !isBand && 4 : 10, verticalAlign: !horiz && isBand ? 'middle' : void 0, y: horiz ? isBand ? 16 : 10 : isBand ? 6 : -4, rotation: horiz && !isBand ? 90 : 0 }, (isBand ? { inside: true } : {})), optionsLabel);
            this.renderLabel(optionsLabel, path, isBand, zIndex);
            // Move out of sight
        }
        else if (label) {
            label.hide();
        }
        // Chainable
        return this;
    };
    /**
     * Render and align label for plot line or band.
     * @private
     * @function Highcharts.PlotLineOrBand#renderLabel
     */
    PlotLineOrBand.prototype.renderLabel = function (optionsLabel, path, isBand, zIndex) {
        var _a;
        var plotLine = this, axis = plotLine.axis, renderer = axis.chart.renderer, inside = optionsLabel.inside;
        var label = plotLine.label;
        // Add the SVG element
        if (!label) {
            /**
             * SVG element of the label.
             *
             * @name Highcharts.PlotLineOrBand#label
             * @type {Highcharts.SVGElement}
             */
            plotLine.label = label = renderer
                .text(this.getLabelText(optionsLabel), 0, 0, optionsLabel.useHTML)
                .attr({
                align: optionsLabel.textAlign || optionsLabel.align,
                rotation: optionsLabel.rotation,
                'class': 'highcharts-plot-' + (isBand ? 'band' : 'line') +
                    '-label ' + (optionsLabel.className || ''),
                zIndex: zIndex
            });
            if (!axis.chart.styledMode) {
                label.css(merge({
                    fontSize: '0.8em',
                    textOverflow: (isBand && !inside) ? '' : 'ellipsis'
                }, optionsLabel.style));
            }
            label.add();
        }
        // Get the bounding box and align the label
        // #3000 changed to better handle choice between plotband or plotline
        var xBounds = path.xBounds ||
            [path[0][1], path[1][1], (isBand ? path[2][1] : path[0][1])], yBounds = path.yBounds ||
            [path[0][2], path[1][2], (isBand ? path[2][2] : path[0][2])], x = arrayMin(xBounds), y = arrayMin(yBounds), bBoxWidth = arrayMax(xBounds) - x;
        label.align(optionsLabel, false, {
            x: x,
            y: y,
            width: bBoxWidth,
            height: arrayMax(yBounds) - y
        });
        if (!label.alignValue ||
            label.alignValue === 'left' ||
            defined(inside)) {
            label.css({
                width: (((_a = optionsLabel.style) === null || _a === void 0 ? void 0 : _a.width) || ((!isBand ||
                    !inside) ? (label.rotation === 90 ?
                    axis.height - (label.alignAttr.y -
                        axis.top) : (optionsLabel.clip ?
                    axis.width :
                    axis.chart.chartWidth) - (label.alignAttr.x - axis.left)) :
                    bBoxWidth)) + 'px'
            });
        }
        label.show(true);
    };
    /**
     * Get label's text content.
     * @private
     * @function Highcharts.PlotLineOrBand#getLabelText
     */
    PlotLineOrBand.prototype.getLabelText = function (optionsLabel) {
        return defined(optionsLabel.formatter) ?
            optionsLabel.formatter
                .call(this) :
            optionsLabel.text;
    };
    /**
     * Remove the plot line or band.
     *
     * @function Highcharts.PlotLineOrBand#destroy
     */
    PlotLineOrBand.prototype.destroy = function () {
        // Remove it from the lookup
        erase(this.axis.plotLinesAndBands, this);
        delete this.axis;
        destroyObjectProperties(this);
    };
    return PlotLineOrBand;
}());
/* *
 *
 *  Default Export
 *
 * */
export default PlotLineOrBand;
/* *
 *
 *  API Options
 *
 * */
/**
 * Options for plot bands on axes.
 *
 * @typedef {Highcharts.XAxisPlotBandsOptions|Highcharts.YAxisPlotBandsOptions|Highcharts.ZAxisPlotBandsOptions} Highcharts.AxisPlotBandsOptions
 */
/**
 * Options for plot band labels on axes.
 *
 * @typedef {Highcharts.XAxisPlotBandsLabelOptions|Highcharts.YAxisPlotBandsLabelOptions|Highcharts.ZAxisPlotBandsLabelOptions} Highcharts.AxisPlotBandsLabelOptions
 */
/**
 * Options for plot lines on axes.
 *
 * @typedef {Highcharts.XAxisPlotLinesOptions|Highcharts.YAxisPlotLinesOptions|Highcharts.ZAxisPlotLinesOptions} Highcharts.AxisPlotLinesOptions
 */
/**
 * Options for plot line labels on axes.
 *
 * @typedef {Highcharts.XAxisPlotLinesLabelOptions|Highcharts.YAxisPlotLinesLabelOptions|Highcharts.ZAxisPlotLinesLabelOptions} Highcharts.AxisPlotLinesLabelOptions
 */
('');
/* *
 *
 *  API Options
 *
 * */
/**
 * An array of colored bands stretching across the plot area marking an
 * interval on the axis.
 *
 * In styled mode, the plot bands are styled by the `.highcharts-plot-band`
 * class in addition to the `className` option.
 *
 * @productdesc {highcharts}
 * In a gauge, a plot band on the Y axis (value axis) will stretch along the
 * perimeter of the gauge.
 *
 * @type      {Array<*>}
 * @product   highcharts highstock gantt
 * @apioption xAxis.plotBands
 */
/**
 * Flag to decide if plotBand should be rendered across all panes.
 *
 * @since     7.1.2
 * @product   highstock
 * @type      {boolean}
 * @default   true
 * @apioption xAxis.plotBands.acrossPanes
 */
/**
 * Border color for the plot band. Also requires `borderWidth` to be set.
 *
 * @type      {Highcharts.ColorString}
 * @apioption xAxis.plotBands.borderColor
 */
/**
 * Border radius for the plot band. Applies only to gauges. Can be a pixel
 * value or a percentage, for example `50%`.
 *
 * @type      {number|string}
 * @since 11.4.2
 * @sample    {highcharts} highcharts/xaxis/plotbands-gauge-borderradius
 *            Angular gauge with rounded plot bands
 * @apioption xAxis.plotBands.borderRadius
 */
/**
 * Border width for the plot band. Also requires `borderColor` to be set.
 *
 * @type      {number}
 * @default   0
 * @apioption xAxis.plotBands.borderWidth
 */
/**
 * A custom class name, in addition to the default `highcharts-plot-band`,
 * to apply to each individual band.
 *
 * @type      {string}
 * @since     5.0.0
 * @apioption xAxis.plotBands.className
 */
/**
 * The color of the plot band.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-color/
 *         Color band
 * @sample {highstock} stock/xaxis/plotbands/
 *         Plot band on Y axis
 *
 * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
 * @default   ${palette.highlightColor10}
 * @apioption xAxis.plotBands.color
 */
/**
 * An object defining mouse events for the plot band. Supported properties
 * are `click`, `mouseover`, `mouseout`, `mousemove`.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-events/
 *         Mouse events demonstrated
 *
 * @since     1.2
 * @apioption xAxis.plotBands.events
 */
/**
 * Click event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotBands.events.click
 */
/**
 * Mouse move event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotBands.events.mousemove
 */
/**
 * Mouse out event on the corner of a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotBands.events.mouseout
 */
/**
 * Mouse over event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotBands.events.mouseover
 */
/**
 * The start position of the plot band in axis units.
 *
 * On datetime axes, the value can be given as a timestamp or a date string.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-color/
 *         Datetime axis
 * @sample {highcharts} highcharts/xaxis/plotbands-from/
 *         Categorized axis
 * @sample {highstock} stock/xaxis/plotbands/
 *         Plot band on Y axis
 *
 * @type      {number|string}
 * @apioption xAxis.plotBands.from
 */
/**
 * An id used for identifying the plot band in Axis.removePlotBand.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-id/
 *         Remove plot band by id
 * @sample {highstock} highcharts/xaxis/plotbands-id/
 *         Remove plot band by id
 *
 * @type      {string}
 * @apioption xAxis.plotBands.id
 */
/**
 * The end position of the plot band in axis units.
 *
 * On datetime axes, the value can be given as a timestamp or a date string.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-color/
 *         Datetime axis
 * @sample {highcharts} highcharts/xaxis/plotbands-from/
 *         Categorized axis
 * @sample {highstock} stock/xaxis/plotbands/
 *         Plot band on Y axis
 *
 * @type      {number|string}
 * @apioption xAxis.plotBands.to
 */
/**
 * The z index of the plot band within the chart, relative to other
 * elements. Using the same z index as another element may give
 * unpredictable results, as the last rendered element will be on top.
 * Values from 0 to 20 make sense.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-color/
 *         Behind plot lines by default
 * @sample {highcharts} highcharts/xaxis/plotbands-zindex/
 *         Above plot lines
 * @sample {highcharts} highcharts/xaxis/plotbands-zindex-above-series/
 *         Above plot lines and series
 *
 * @type      {number}
 * @since     1.2
 * @apioption xAxis.plotBands.zIndex
 */
/**
 * Text labels for the plot bands
 *
 * @product   highcharts highstock gantt
 * @apioption xAxis.plotBands.label
 */
/**
 * Horizontal alignment of the label. Can be one of "left", "center" or
 * "right".
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-align/
 *         Aligned to the right
 * @sample {highstock} stock/xaxis/plotbands-label/
 *         Plot band with labels
 *
 * @type      {Highcharts.AlignValue}
 * @default   center
 * @since     2.1
 * @apioption xAxis.plotBands.label.align
 */
/**
 * Whether or not the label can be hidden if it overlaps with another label.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-allowoverlap/
 *         A Plotband label overlapping another
 *
 * @type      {boolean}
 * @default   undefined
 * @since     11.4.8
 * @apioption xAxis.plotBands.label.allowOverlap
 */
/**
 * Wether or not the text of the label can exceed the width of the label.
 *
 * @type      {boolean}
 * @product   highcharts highstock gantt
 * @sample {highcharts} highcharts/xaxis/plotbands-label-textwidth/
 *         Displaying text with text-wrapping/ellipsis, or the full text.
 *
 * @default   true
 * @since     11.4.6
 * @apioption xAxis.plotBands.label.inside
 */
/**
 * Rotation of the text label in degrees .
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-rotation/
 *         Vertical text
 *
 * @type      {number}
 * @default   0
 * @since     2.1
 * @apioption xAxis.plotBands.label.rotation
 */
/**
 * CSS styles for the text label.
 *
 * In styled mode, the labels are styled by the
 * `.highcharts-plot-band-label` class.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-style/
 *         Blue and bold label
 *
 * @type      {Highcharts.CSSObject}
 * @since     2.1
 * @apioption xAxis.plotBands.label.style
 */
/**
 * The string text itself. A subset of HTML is supported.
 *
 * @type      {string}
 * @since     2.1
 * @apioption xAxis.plotBands.label.text
 */
/**
 * The text alignment for the label. While `align` determines where the
 * texts anchor point is placed within the plot band, `textAlign` determines
 * how the text is aligned against its anchor point. Possible values are
 * "left", "center" and "right". Defaults to the same as the `align` option.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-rotation/
 *         Vertical text in center position but text-aligned left
 *
 * @type       {Highcharts.AlignValue}
 * @since      2.1
 * @apioption  xAxis.plotBands.label.textAlign
 */
/**
 * Whether to [use HTML](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html)
 * to render the labels.
 *
 * @type      {boolean}
 * @default   false
 * @since     3.0.3
 * @apioption xAxis.plotBands.label.useHTML
 */
/**
 * Vertical alignment of the label relative to the plot band. Can be one of
 * "top", "middle" or "bottom".
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-verticalalign/
 *         Vertically centered label
 * @sample {highstock} stock/xaxis/plotbands-label/
 *         Plot band with labels
 *
 * @type       {Highcharts.VerticalAlignValue}
 * @default    top
 * @since      2.1
 * @apioption  xAxis.plotBands.label.verticalAlign
 */
/**
 * Horizontal position relative the alignment. Default varies by
 * orientation.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-align/
 *         Aligned 10px from the right edge
 * @sample {highstock} stock/xaxis/plotbands-label/
 *         Plot band with labels
 *
 * @type      {number}
 * @since     2.1
 * @apioption xAxis.plotBands.label.x
 */
/**
 * Vertical position of the text baseline relative to the alignment. Default
 * varies by orientation.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-label-y/
 *         Label on x axis
 * @sample {highstock} stock/xaxis/plotbands-label/
 *         Plot band with labels
 *
 * @type      {number}
 * @since     2.1
 * @apioption xAxis.plotBands.label.y
 */
/**
 * An array of lines stretching across the plot area, marking a specific
 * value on one of the axes.
 *
 * In styled mode, the plot lines are styled by the
 * `.highcharts-plot-line` class in addition to the `className` option.
 *
 * @type      {Array<*>}
 * @product   highcharts highstock gantt
 * @sample {highcharts} highcharts/xaxis/plotlines-color/
 *         Basic plot line
 * @sample {highcharts} highcharts/series-solidgauge/labels-auto-aligned/
 *         Solid gauge plot line
 * @apioption xAxis.plotLines
 */
/**
 * Flag to decide if plotLine should be rendered across all panes.
 *
 * @sample {highstock} stock/xaxis/plotlines-acrosspanes/
 *         Plot lines on different panes
 *
 * @since     7.1.2
 * @product   highstock
 * @type      {boolean}
 * @default   true
 * @apioption xAxis.plotLines.acrossPanes
 */
/**
 * A custom class name, in addition to the default `highcharts-plot-line`,
 * to apply to each individual line.
 *
 * @type      {string}
 * @since     5.0.0
 * @apioption xAxis.plotLines.className
 */
/**
 * The color of the line.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-color/
 *         A red line from X axis
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {Highcharts.ColorString}
 * @default   ${palette.neutralColor40}
 * @apioption xAxis.plotLines.color
 */
/**
 * The dashing or dot style for the plot line. For possible values see
 * [this overview](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/series-dashstyle-all/).
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-dashstyle/
 *         Dash and dot pattern
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {Highcharts.DashStyleValue}
 * @default   Solid
 * @since     1.2
 * @apioption xAxis.plotLines.dashStyle
 */
/**
 * An object defining mouse events for the plot line. Supported
 * properties are `click`, `mouseover`, `mouseout`, `mousemove`.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-events/
 *         Mouse events demonstrated
 *
 * @since     1.2
 * @apioption xAxis.plotLines.events
 */
/**
 * Click event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotLines.events.click
 */
/**
 * Mouse move event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotLines.events.mousemove
 */
/**
 * Mouse out event on the corner of a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotLines.events.mouseout
 */
/**
 * Mouse over event on a plot band.
 *
 * @type      {Highcharts.EventCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotLines.events.mouseover
 */
/**
 * An id used for identifying the plot line in Axis.removePlotLine.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-id/
 *         Remove plot line by id
 *
 * @type      {string}
 * @apioption xAxis.plotLines.id
 */
/**
 * The position of the line in axis units.
 *
 * On datetime axes, the value can be given as a timestamp or a date string.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-color/
 *         Between two categories on X axis
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {number|string}
 * @apioption xAxis.plotLines.value
 */
/**
 * The width or thickness of the plot line.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-color/
 *         2px wide line from X axis
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {number}
 * @default   2
 * @apioption xAxis.plotLines.width
 */
/**
 * The z index of the plot line within the chart.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-zindex-behind/
 *         Behind plot lines by default
 * @sample {highcharts} highcharts/xaxis/plotlines-zindex-above/
 *         Above plot lines
 * @sample {highcharts} highcharts/xaxis/plotlines-zindex-above-all/
 *         Above plot lines and series
 *
 * @type      {number}
 * @since     1.2
 * @apioption xAxis.plotLines.zIndex
 */
/**
 * Text labels for the plot bands
 *
 * @apioption xAxis.plotLines.label
 */
/**
 * Horizontal alignment of the label. Can be one of "left", "center" or
 * "right".
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-align-right/
 *         Aligned to the right
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type       {Highcharts.AlignValue}
 * @default    left
 * @since      2.1
 * @apioption  xAxis.plotLines.label.align
 */
/**
 * Whether to hide labels that are outside the plot area.
 *
 * @type      {boolean}
 * @default   false
 * @since 10.3.3
 * @apioption xAxis.plotLines.labels.clip
 */
/**
 * Callback JavaScript function to format the label. Useful properties like
 * the value of plot line or the range of plot band (`from` & `to`
 * properties) can be found in `this.options` object.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-plotbands-label-formatter
 *         Label formatters for plot line and plot band.
 * @type      {Highcharts.FormatterCallbackFunction<Highcharts.PlotLineOrBand>}
 * @apioption xAxis.plotLines.label.formatter
 */
/**
 * Rotation of the text label in degrees. Defaults to 0 for horizontal plot
 * lines and 90 for vertical lines.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-verticalalign-middle/
 *         Slanted text
 *
 * @type      {number}
 * @since     2.1
 * @apioption xAxis.plotLines.label.rotation
 */
/**
 * CSS styles for the text label.
 *
 * In styled mode, the labels are styled by the
 * `.highcharts-plot-line-label` class.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-style/
 *         Blue and bold label
 *
 * @type      {Highcharts.CSSObject}
 * @since     2.1
 * @apioption xAxis.plotLines.label.style
 */
/**
 * The text itself. A subset of HTML is supported.
 *
 * @type      {string}
 * @since     2.1
 * @apioption xAxis.plotLines.label.text
 */
/**
 * The text alignment for the label. While `align` determines where the
 * texts anchor point is placed within the plot band, `textAlign` determines
 * how the text is aligned against its anchor point. Possible values are
 * "left", "center" and "right". Defaults to the same as the `align` option.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-textalign/
 *         Text label in bottom position
 *
 * @type      {Highcharts.AlignValue}
 * @since     2.1
 * @apioption xAxis.plotLines.label.textAlign
 */
/**
 * Whether to [use HTML](https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html)
 * to render the labels.
 *
 * @type      {boolean}
 * @default   false
 * @since     3.0.3
 * @apioption xAxis.plotLines.label.useHTML
 */
/**
 * Vertical alignment of the label relative to the plot line. Can be
 * one of "top", "middle" or "bottom".
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-verticalalign-middle/
 *         Vertically centered label
 *
 * @type       {Highcharts.VerticalAlignValue}
 * @default    {highcharts} top
 * @default    {highstock} top
 * @since      2.1
 * @apioption  xAxis.plotLines.label.verticalAlign
 */
/**
 * Horizontal position relative the alignment. Default varies by
 * orientation.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-align-right/
 *         Aligned 10px from the right edge
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {number}
 * @since     2.1
 * @apioption xAxis.plotLines.label.x
 */
/**
 * Vertical position of the text baseline relative to the alignment. Default
 * varies by orientation.
 *
 * @sample {highcharts} highcharts/xaxis/plotlines-label-y/
 *         Label below the plot line
 * @sample {highstock} stock/xaxis/plotlines/
 *         Plot line on Y axis
 *
 * @type      {number}
 * @since     2.1
 * @apioption xAxis.plotLines.label.y
 */
/**
 * @type      {Array<*>}
 * @extends   xAxis.plotBands
 * @apioption yAxis.plotBands
 */
/**
 * In a gauge chart, this option determines the inner radius of the
 * plot band that stretches along the perimeter. It can be given as
 * a percentage string, like `"100%"`, or as a pixel number, like `100`.
 * By default, the inner radius is controlled by the [thickness](
 * #yAxis.plotBands.thickness) option.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-gauge
 *         Gauge plot band
 *
 * @type      {number|string}
 * @since     2.3
 * @product   highcharts
 * @apioption yAxis.plotBands.innerRadius
 */
/**
 * In a gauge chart, this option determines the outer radius of the
 * plot band that stretches along the perimeter. It can be given as
 * a percentage string, like `"100%"`, or as a pixel number, like `100`.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-gauge
 *         Gauge plot band
 *
 * @type      {number|string}
 * @default   100%
 * @since     2.3
 * @product   highcharts
 * @apioption yAxis.plotBands.outerRadius
 */
/**
 * In a gauge chart, this option sets the width of the plot band
 * stretching along the perimeter. It can be given as a percentage
 * string, like `"10%"`, or as a pixel number, like `10`. The default
 * value 10 is the same as the default [tickLength](#yAxis.tickLength),
 * thus making the plot band act as a background for the tick markers.
 *
 * @sample {highcharts} highcharts/xaxis/plotbands-gauge
 *         Gauge plot band
 *
 * @type      {number|string}
 * @default   10
 * @since     2.3
 * @product   highcharts
 * @apioption yAxis.plotBands.thickness
 */
/**
 * @type      {Array<*>}
 * @extends   xAxis.plotLines
 * @apioption yAxis.plotLines
 */
(''); // Keeps doclets above in JS file
