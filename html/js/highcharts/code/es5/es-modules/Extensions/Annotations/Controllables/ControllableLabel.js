/* *
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
import Controllable from './Controllable.js';
import F from '../../../Core/Templating.js';
var format = F.format;
import MockPoint from '../MockPoint.js';
import U from '../../../Core/Utilities.js';
var extend = U.extend, getAlignFactor = U.getAlignFactor, isNumber = U.isNumber, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * General symbol definition for labels with connector
 * @private
 */
function symbolConnector(x, y, w, h, options) {
    var anchorX = options && options.anchorX, anchorY = options && options.anchorY;
    var path, yOffset, lateral = w / 2;
    if (isNumber(anchorX) && isNumber(anchorY)) {
        path = [['M', anchorX, anchorY]];
        // Prefer 45 deg connectors
        yOffset = y - anchorY;
        if (yOffset < 0) {
            yOffset = -h - yOffset;
        }
        if (yOffset < w) {
            lateral = anchorX < x + (w / 2) ? yOffset : w - yOffset;
        }
        // Anchor below label
        if (anchorY > y + h) {
            path.push(['L', x + lateral, y + h]);
            // Anchor above label
        }
        else if (anchorY < y) {
            path.push(['L', x + lateral, y]);
            // Anchor left of label
        }
        else if (anchorX < x) {
            path.push(['L', x, y + h / 2]);
            // Anchor right of label
        }
        else if (anchorX > x + w) {
            path.push(['L', x + w, y + h / 2]);
        }
    }
    return path || [];
}
/* *
 *
 *  Class
 *
 * */
/**
 * A controllable label class.
 *
 * @requires modules/annotations
 *
 * @private
 * @class
 * @name Highcharts.AnnotationControllableLabel
 *
 * @param {Highcharts.Annotation} annotation
 * An annotation instance.
 * @param {Highcharts.AnnotationsLabelOptions} options
 * A label's options.
 * @param {number} index
 * Index of the label.
 */
var ControllableLabel = /** @class */ (function (_super) {
    __extends(ControllableLabel, _super);
    /* *
     *
     *  Constructors
     *
     * */
    function ControllableLabel(annotation, options, index) {
        return _super.call(this, annotation, options, index, 'label') || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * Returns new aligned position based alignment options and box to align to.
     * It is almost a one-to-one copy from SVGElement.prototype.align
     * except it does not use and mutate an element
     *
     * @param {Highcharts.AnnotationAlignObject} alignOptions
     *
     * @param {Highcharts.BBoxObject} box
     *
     * @return {Highcharts.PositionObject}
     * Aligned position.
     */
    ControllableLabel.alignedPosition = function (alignOptions, box) {
        return {
            x: Math.round((box.x || 0) + (alignOptions.x || 0) +
                (box.width - (alignOptions.width || 0)) *
                    getAlignFactor(alignOptions.align)),
            y: Math.round((box.y || 0) + (alignOptions.y || 0) +
                (box.height - (alignOptions.height || 0)) *
                    getAlignFactor(alignOptions.verticalAlign))
        };
    };
    ControllableLabel.compose = function (SVGRendererClass) {
        var symbols = SVGRendererClass.prototype.symbols;
        symbols.connector = symbolConnector;
    };
    /**
     * Returns new alignment options for a label if the label is outside the
     * plot area. It is almost a one-to-one copy from
     * Series.prototype.justifyDataLabel except it does not mutate the label and
     * it works with absolute instead of relative position.
     */
    ControllableLabel.justifiedOptions = function (chart, label, alignOptions, alignAttr) {
        var align = alignOptions.align, verticalAlign = alignOptions.verticalAlign, padding = label.box ? 0 : (label.padding || 0), bBox = label.getBBox(), 
        //
        options = {
            align: align,
            verticalAlign: verticalAlign,
            x: alignOptions.x,
            y: alignOptions.y,
            width: label.width,
            height: label.height
        }, 
        //
        x = (alignAttr.x || 0) - chart.plotLeft, y = (alignAttr.y || 0) - chart.plotTop;
        var off;
        // Off left
        off = x + padding;
        if (off < 0) {
            if (align === 'right') {
                options.align = 'left';
            }
            else {
                options.x = (options.x || 0) - off;
            }
        }
        // Off right
        off = x + bBox.width - padding;
        if (off > chart.plotWidth) {
            if (align === 'left') {
                options.align = 'right';
            }
            else {
                options.x = (options.x || 0) + chart.plotWidth - off;
            }
        }
        // Off top
        off = y + padding;
        if (off < 0) {
            if (verticalAlign === 'bottom') {
                options.verticalAlign = 'top';
            }
            else {
                options.y = (options.y || 0) - off;
            }
        }
        // Off bottom
        off = y + bBox.height - padding;
        if (off > chart.plotHeight) {
            if (verticalAlign === 'top') {
                options.verticalAlign = 'bottom';
            }
            else {
                options.y = (options.y || 0) + chart.plotHeight - off;
            }
        }
        return options;
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Translate the point of the label by deltaX and deltaY translations.
     * The point is the label's anchor.
     *
     * @param {number} dx translation for x coordinate
     * @param {number} dy translation for y coordinate
     */
    ControllableLabel.prototype.translatePoint = function (dx, dy) {
        _super.prototype.translatePoint.call(this, dx, dy, 0);
    };
    /**
     * Translate x and y position relative to the label's anchor.
     *
     * @param {number} dx translation for x coordinate
     * @param {number} dy translation for y coordinate
     */
    ControllableLabel.prototype.translate = function (dx, dy) {
        var chart = this.annotation.chart, 
        // Annotation.options
        labelOptions = this.annotation.userOptions, 
        // Chart.options.annotations
        annotationIndex = chart.annotations.indexOf(this.annotation), chartAnnotations = chart.options.annotations, chartOptions = chartAnnotations[annotationIndex];
        if (chart.inverted) {
            var temp = dx;
            dx = dy;
            dy = temp;
        }
        // Local options:
        this.options.x += dx;
        this.options.y += dy;
        // Options stored in chart:
        chartOptions[this.collection][this.index].x = this.options.x;
        chartOptions[this.collection][this.index].y = this.options.y;
        labelOptions[this.collection][this.index].x = this.options.x;
        labelOptions[this.collection][this.index].y = this.options.y;
    };
    ControllableLabel.prototype.render = function (parent) {
        var options = this.options, attrs = this.attrsFromOptions(options), style = options.style;
        this.graphic = this.annotation.chart.renderer
            .label('', 0, -9999, // #10055
        options.shape, null, null, options.useHTML, null, 'annotation-label')
            .attr(attrs)
            .add(parent);
        if (!this.annotation.chart.styledMode) {
            if (style.color === 'contrast') {
                style.color = this.annotation.chart.renderer.getContrast(ControllableLabel.shapesWithoutBackground.indexOf(options.shape) > -1 ? '#FFFFFF' : options.backgroundColor);
            }
            this.graphic
                .css(options.style)
                .shadow(options.shadow);
        }
        this.graphic.labelrank = options.labelrank;
        _super.prototype.render.call(this);
    };
    ControllableLabel.prototype.redraw = function (animation) {
        var options = this.options, text = this.text || options.format || options.text, label = this.graphic, point = this.points[0];
        if (!label) {
            this.redraw(animation);
            return;
        }
        label.attr({
            text: text ?
                format(String(text), point, this.annotation.chart) :
                options.formatter.call(point, this)
        });
        var anchor = this.anchor(point);
        var attrs = this.position(anchor);
        if (attrs) {
            label.alignAttr = attrs;
            attrs.anchorX = anchor.absolutePosition.x;
            attrs.anchorY = anchor.absolutePosition.y;
            label[animation ? 'animate' : 'attr'](attrs);
        }
        else {
            label.attr({
                x: 0,
                y: -9999 // #10055
            });
        }
        label.placed = !!attrs;
        _super.prototype.redraw.call(this, animation);
    };
    /**
     * All basic shapes don't support alignTo() method except label.
     * For a controllable label, we need to subtract translation from
     * options.
     */
    ControllableLabel.prototype.anchor = function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _point) {
        var anchor = _super.prototype.anchor.apply(this, arguments), x = this.options.x || 0, y = this.options.y || 0;
        anchor.absolutePosition.x -= x;
        anchor.absolutePosition.y -= y;
        anchor.relativePosition.x -= x;
        anchor.relativePosition.y -= y;
        return anchor;
    };
    /**
     * Returns the label position relative to its anchor.
     */
    ControllableLabel.prototype.position = function (anchor) {
        var item = this.graphic, chart = this.annotation.chart, tooltip = chart.tooltip, point = this.points[0], itemOptions = this.options, anchorAbsolutePosition = anchor.absolutePosition, anchorRelativePosition = anchor.relativePosition;
        var itemPosition, alignTo, itemPosRelativeX, itemPosRelativeY, showItem = point.series.visible &&
            MockPoint.prototype.isInsidePlot.call(point);
        if (item && showItem) {
            var _a = item.width, width = _a === void 0 ? 0 : _a, _b = item.height, height = _b === void 0 ? 0 : _b;
            if (itemOptions.distance && tooltip) {
                itemPosition = tooltip.getPosition.call({
                    chart: chart,
                    distance: pick(itemOptions.distance, 16),
                    getPlayingField: tooltip.getPlayingField,
                    pointer: tooltip.pointer
                }, width, height, {
                    plotX: anchorRelativePosition.x,
                    plotY: anchorRelativePosition.y,
                    negative: point.negative,
                    ttBelow: point.ttBelow,
                    h: (anchorRelativePosition.height ||
                        anchorRelativePosition.width)
                });
            }
            else if (itemOptions.positioner) {
                itemPosition = itemOptions.positioner.call(this);
            }
            else {
                alignTo = {
                    x: anchorAbsolutePosition.x,
                    y: anchorAbsolutePosition.y,
                    width: 0,
                    height: 0
                };
                itemPosition = ControllableLabel.alignedPosition(extend(itemOptions, {
                    width: width,
                    height: height
                }), alignTo);
                if (this.options.overflow === 'justify') {
                    itemPosition = ControllableLabel.alignedPosition(ControllableLabel.justifiedOptions(chart, item, itemOptions, itemPosition), alignTo);
                }
            }
            if (itemOptions.crop) {
                itemPosRelativeX = itemPosition.x - chart.plotLeft;
                itemPosRelativeY = itemPosition.y - chart.plotTop;
                showItem =
                    chart.isInsidePlot(itemPosRelativeX, itemPosRelativeY) &&
                        chart.isInsidePlot(itemPosRelativeX + width, itemPosRelativeY + height);
            }
        }
        return showItem ? itemPosition : null;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * A map object which allows to map options attributes to element attributes
     *
     * @type {Highcharts.Dictionary<string>}
     */
    ControllableLabel.attrsMap = {
        backgroundColor: 'fill',
        borderColor: 'stroke',
        borderWidth: 'stroke-width',
        zIndex: 'zIndex',
        borderRadius: 'r',
        padding: 'padding'
    };
    /**
     * Shapes which do not have background - the object is used for proper
     * setting of the contrast color.
     *
     * @type {Array<string>}
     */
    ControllableLabel.shapesWithoutBackground = ['connector'];
    return ControllableLabel;
}(Controllable));
/* *
 *
 *  Default Export
 *
 * */
export default ControllableLabel;
