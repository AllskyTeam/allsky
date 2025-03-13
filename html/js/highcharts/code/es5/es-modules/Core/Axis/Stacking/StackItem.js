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
import T from '../../Templating.js';
var format = T.format;
import SeriesRegistry from '../../Series/SeriesRegistry.js';
var Series = SeriesRegistry.series;
import U from '../../Utilities.js';
var destroyObjectProperties = U.destroyObjectProperties, fireEvent = U.fireEvent, getAlignFactor = U.getAlignFactor, isNumber = U.isNumber, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * The class for stacks. Each stack, on a specific X value and either negative
 * or positive, has its own stack item.
 * @private
 */
var StackItem = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function StackItem(axis, options, negativeValue, x, stackOption) {
        var inverted = axis.chart.inverted, reversed = axis.reversed;
        this.axis = axis;
        // The stack goes to the left either if the stack has negative value
        // or when axis is reversed. XOR operator.
        var isNegative = (this.isNegative = !!negativeValue !== !!reversed);
        // Save the options to be able to style the label
        this.options = options = options || {};
        // Save the x value to be able to position the label later
        this.x = x;
        // Initialize total value
        this.total = null;
        this.cumulative = null;
        // This will keep each points' extremes stored by series.index and point
        // index
        this.points = {};
        this.hasValidPoints = false;
        // Save the stack option on the series configuration object,
        // and whether to treat it as percent
        this.stack = stackOption;
        this.leftCliff = 0;
        this.rightCliff = 0;
        // The align options and text align varies on whether the stack is
        // negative and if the chart is inverted or not.
        // First test the user supplied value, then use the dynamic.
        this.alignOptions = {
            align: options.align ||
                (inverted ? (isNegative ? 'left' : 'right') : 'center'),
            verticalAlign: options.verticalAlign ||
                (inverted ? 'middle' : isNegative ? 'bottom' : 'top'),
            y: options.y,
            x: options.x
        };
        this.textAlign =
            options.textAlign ||
                (inverted ? (!isNegative ? 'left' : 'right') : 'center');
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    StackItem.prototype.destroy = function () {
        destroyObjectProperties(this, this.axis);
    };
    /**
     * Renders the stack total label and adds it to the stack label group.
     * @private
     */
    StackItem.prototype.render = function (group) {
        var chart = this.axis.chart, options = this.options, formatOption = options.format, 
        // Format the text in the label.
        str = formatOption ?
            format(formatOption, this, chart) :
            options.formatter.call(this);
        // Change the text to reflect the new total and set visibility to hidden
        // in case the series is hidden
        if (this.label) {
            this.label.attr({ text: str, visibility: 'hidden' });
        }
        else {
            // Create new label
            this.label = chart.renderer.label(str, null, void 0, options.shape, void 0, void 0, options.useHTML, false, 'stack-labels');
            var attr = {
                r: options.borderRadius || 0,
                text: str,
                // Set default padding to 5 as it is in datalabels #12308
                padding: pick(options.padding, 5),
                visibility: 'hidden' // Hidden until setOffset is called
            };
            if (!chart.styledMode) {
                attr.fill = options.backgroundColor;
                attr.stroke = options.borderColor;
                attr['stroke-width'] = options.borderWidth;
                this.label.css(options.style || {});
            }
            this.label.attr(attr);
            if (!this.label.added) {
                this.label.add(group); // Add to the labels-group
            }
        }
        // Rank it higher than data labels (#8742)
        this.label.labelrank = chart.plotSizeY;
        fireEvent(this, 'afterRender');
    };
    /**
     * Sets the offset that the stack has from the x value and repositions the
     * label.
     * @private
     */
    StackItem.prototype.setOffset = function (xOffset, width, boxBottom, boxTop, defaultX, xAxis) {
        var _a = this, alignOptions = _a.alignOptions, axis = _a.axis, label = _a.label, options = _a.options, textAlign = _a.textAlign, chart = axis.chart, stackBox = this.getStackBox({
            xOffset: xOffset,
            width: width,
            boxBottom: boxBottom,
            boxTop: boxTop,
            defaultX: defaultX,
            xAxis: xAxis
        }), verticalAlign = alignOptions.verticalAlign;
        if (label && stackBox) {
            var labelBox = label.getBBox(void 0, 0), padding = label.padding;
            var isJustify = pick(options.overflow, 'justify') === 'justify', visible = void 0;
            // Reset alignOptions property after justify #12337
            alignOptions.x = options.x || 0;
            alignOptions.y = options.y || 0;
            // Calculate the adjusted Stack position, to take into consideration
            // The size if the labelBox and vertical alignment as
            // well as the text alignment. It's need to be done to work with
            // default SVGLabel.align/justify methods.
            var _b = this.adjustStackPosition({
                labelBox: labelBox,
                verticalAlign: verticalAlign,
                textAlign: textAlign
            }), x = _b.x, y = _b.y;
            stackBox.x -= x;
            stackBox.y -= y;
            // Align the label to the adjusted box.
            label.align(alignOptions, false, stackBox);
            // Check if label is inside the plotArea #12294
            visible = chart.isInsidePlot(label.alignAttr.x + alignOptions.x + x, label.alignAttr.y + alignOptions.y + y);
            if (!visible) {
                isJustify = false;
            }
            if (isJustify) {
                // Justify stackLabel into the alignBox
                Series.prototype.justifyDataLabel.call(axis, label, alignOptions, label.alignAttr, labelBox, stackBox);
            }
            // Add attr to avoid the default animation of justifyDataLabel.
            // Also add correct rotation with its rotation origin. #15129
            label.attr({
                x: label.alignAttr.x,
                y: label.alignAttr.y,
                rotation: options.rotation,
                rotationOriginX: labelBox.width *
                    getAlignFactor(options.textAlign || 'center'),
                rotationOriginY: labelBox.height / 2
            });
            // Check if the dataLabel should be visible.
            if (pick(!isJustify && options.crop, true)) {
                visible =
                    isNumber(label.x) &&
                        isNumber(label.y) &&
                        chart.isInsidePlot(label.x - padding + (label.width || 0), label.y) &&
                        chart.isInsidePlot(label.x + padding, label.y);
            }
            label[visible ? 'show' : 'hide']();
        }
        fireEvent(this, 'afterSetOffset', { xOffset: xOffset, width: width });
    };
    /**
     * Adjust the stack BBox position, to take into consideration the alignment
     * of the dataLabel. This is necessary to make the stackDataLabel work with
     * core methods like `SVGLabel.adjust` and `Series.justifyDataLabel`.
     * @param AdjustStackPositionProps
     * @return {{x: number, y: number}} Adjusted BBox position of the stack.
     */
    StackItem.prototype.adjustStackPosition = function (_a) {
        var labelBox = _a.labelBox, verticalAlign = _a.verticalAlign, textAlign = _a.textAlign;
        return {
            x: labelBox.width / 2 +
                (labelBox.width / 2) * (2 * getAlignFactor(textAlign) - 1),
            y: (labelBox.height / 2) * 2 * (1 - getAlignFactor(verticalAlign))
        };
    };
    /**
     * Get the bbox of the stack.
     * @private
     * @function Highcharts.StackItem#getStackBox
     * @return {BBoxObject} The x, y, height, width of the stack.
     */
    StackItem.prototype.getStackBox = function (stackBoxProps) {
        var stackItem = this, axis = this.axis, chart = axis.chart, boxTop = stackBoxProps.boxTop, defaultX = stackBoxProps.defaultX, xOffset = stackBoxProps.xOffset, width = stackBoxProps.width, boxBottom = stackBoxProps.boxBottom, totalStackValue = axis.stacking.usePercentage ?
            100 :
            pick(boxTop, this.total, 0), y = axis.toPixels(totalStackValue), xAxis = stackBoxProps.xAxis || chart.xAxis[0], x = pick(defaultX, xAxis.translate(this.x)) + xOffset, yZero = axis.toPixels(boxBottom ||
            (isNumber(axis.min) &&
                axis.logarithmic &&
                axis.logarithmic.lin2log(axis.min)) ||
            0), height = Math.abs(y - yZero), inverted = chart.inverted, neg = stackItem.isNegative;
        return inverted ?
            {
                x: (neg ? y : y - height) - chart.plotLeft,
                y: xAxis.height - x - width + xAxis.top - chart.plotTop,
                width: height,
                height: width
            } : {
            x: x + xAxis.transB - chart.plotLeft,
            y: (neg ? y - height : y) - chart.plotTop,
            width: width,
            height: height
        };
    };
    return StackItem;
}());
/* *
 *
 *  Default Export
 *
 * */
export default StackItem;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Stack of data points
 *
 * @product highcharts
 *
 * @interface Highcharts.StackItemObject
 */ /**
* Alignment settings
* @name Highcharts.StackItemObject#alignOptions
* @type {Highcharts.AlignObject}
*/ /**
* Related axis
* @name Highcharts.StackItemObject#axis
* @type {Highcharts.Axis}
*/ /**
* Cumulative value of the stacked data points
* @name Highcharts.StackItemObject#cumulative
* @type {number}
*/ /**
* True if on the negative side
* @name Highcharts.StackItemObject#isNegative
* @type {boolean}
*/ /**
* Related SVG element
* @name Highcharts.StackItemObject#label
* @type {Highcharts.SVGElement}
*/ /**
* Related stack options
* @name Highcharts.StackItemObject#options
* @type {Highcharts.YAxisStackLabelsOptions}
*/ /**
* Total value of the stacked data points
* @name Highcharts.StackItemObject#total
* @type {number}
*/ /**
* Shared x value of the stack
* @name Highcharts.StackItemObject#x
* @type {number}
*/
''; // Keeps doclets above in JS file
