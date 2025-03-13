/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import Controllable from './Controllable.js';
import F from '../../../Core/Templating.js';
const { format } = F;
import MockPoint from '../MockPoint.js';
import U from '../../../Core/Utilities.js';
const { extend, getAlignFactor, isNumber, pick } = U;
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
    const anchorX = options && options.anchorX, anchorY = options && options.anchorY;
    let path, yOffset, lateral = w / 2;
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
class ControllableLabel extends Controllable {
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
    static alignedPosition(alignOptions, box) {
        return {
            x: Math.round((box.x || 0) + (alignOptions.x || 0) +
                (box.width - (alignOptions.width || 0)) *
                    getAlignFactor(alignOptions.align)),
            y: Math.round((box.y || 0) + (alignOptions.y || 0) +
                (box.height - (alignOptions.height || 0)) *
                    getAlignFactor(alignOptions.verticalAlign))
        };
    }
    static compose(SVGRendererClass) {
        const symbols = SVGRendererClass.prototype.symbols;
        symbols.connector = symbolConnector;
    }
    /**
     * Returns new alignment options for a label if the label is outside the
     * plot area. It is almost a one-to-one copy from
     * Series.prototype.justifyDataLabel except it does not mutate the label and
     * it works with absolute instead of relative position.
     */
    static justifiedOptions(chart, label, alignOptions, alignAttr) {
        const align = alignOptions.align, verticalAlign = alignOptions.verticalAlign, padding = label.box ? 0 : (label.padding || 0), bBox = label.getBBox(), 
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
        let off;
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
    }
    /* *
     *
     *  Constructors
     *
     * */
    constructor(annotation, options, index) {
        super(annotation, options, index, 'label');
    }
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
    translatePoint(dx, dy) {
        super.translatePoint(dx, dy, 0);
    }
    /**
     * Translate x and y position relative to the label's anchor.
     *
     * @param {number} dx translation for x coordinate
     * @param {number} dy translation for y coordinate
     */
    translate(dx, dy) {
        const chart = this.annotation.chart, 
        // Annotation.options
        labelOptions = this.annotation.userOptions, 
        // Chart.options.annotations
        annotationIndex = chart.annotations.indexOf(this.annotation), chartAnnotations = chart.options.annotations, chartOptions = chartAnnotations[annotationIndex];
        if (chart.inverted) {
            const temp = dx;
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
    }
    render(parent) {
        const options = this.options, attrs = this.attrsFromOptions(options), style = options.style;
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
        super.render();
    }
    redraw(animation) {
        const options = this.options, text = this.text || options.format || options.text, label = this.graphic, point = this.points[0];
        if (!label) {
            this.redraw(animation);
            return;
        }
        label.attr({
            text: text ?
                format(String(text), point, this.annotation.chart) :
                options.formatter.call(point, this)
        });
        const anchor = this.anchor(point);
        const attrs = this.position(anchor);
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
        super.redraw(animation);
    }
    /**
     * All basic shapes don't support alignTo() method except label.
     * For a controllable label, we need to subtract translation from
     * options.
     */
    anchor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _point) {
        const anchor = super.anchor.apply(this, arguments), x = this.options.x || 0, y = this.options.y || 0;
        anchor.absolutePosition.x -= x;
        anchor.absolutePosition.y -= y;
        anchor.relativePosition.x -= x;
        anchor.relativePosition.y -= y;
        return anchor;
    }
    /**
     * Returns the label position relative to its anchor.
     */
    position(anchor) {
        const item = this.graphic, chart = this.annotation.chart, tooltip = chart.tooltip, point = this.points[0], itemOptions = this.options, anchorAbsolutePosition = anchor.absolutePosition, anchorRelativePosition = anchor.relativePosition;
        let itemPosition, alignTo, itemPosRelativeX, itemPosRelativeY, showItem = point.series.visible &&
            MockPoint.prototype.isInsidePlot.call(point);
        if (item && showItem) {
            const { width = 0, height = 0 } = item;
            if (itemOptions.distance && tooltip) {
                itemPosition = tooltip.getPosition.call({
                    chart,
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
                    width,
                    height
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
    }
}
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
/* *
 *
 *  Default Export
 *
 * */
export default ControllableLabel;
