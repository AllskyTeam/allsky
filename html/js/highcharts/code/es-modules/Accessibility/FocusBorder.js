/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Extend SVG and Chart classes with focus border capabilities.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import U from '../Core/Utilities.js';
const { addEvent, pick } = U;
/* *
 *
 *  Composition
 *
 * */
var FocusBorderComposition;
(function (FocusBorderComposition) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Constants
     *
     * */
    // Attributes that trigger a focus border update
    const svgElementBorderUpdateTriggers = [
        'x', 'y', 'transform', 'width', 'height', 'r', 'd', 'stroke-width'
    ];
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(ChartClass, SVGElementClass) {
        const chartProto = ChartClass.prototype, svgElementProto = SVGElementClass.prototype;
        if (!chartProto.renderFocusBorder) {
            chartProto.renderFocusBorder = chartRenderFocusBorder;
            chartProto.setFocusToElement = chartSetFocusToElement;
        }
        if (!svgElementProto.addFocusBorder) {
            svgElementProto.addFocusBorder = svgElementAddFocusBorder;
            svgElementProto.removeFocusBorder = svgElementRemoveFocusBorder;
        }
    }
    FocusBorderComposition.compose = compose;
    /**
     * Redraws the focus border on the currently focused element.
     *
     * @private
     * @function Highcharts.Chart#renderFocusBorder
     */
    function chartRenderFocusBorder() {
        const focusElement = this.focusElement, focusBorderOptions = this.options.accessibility.keyboardNavigation.focusBorder;
        if (focusElement) {
            focusElement.removeFocusBorder();
            if (focusBorderOptions.enabled) {
                focusElement.addFocusBorder(focusBorderOptions.margin, {
                    stroke: focusBorderOptions.style.color,
                    strokeWidth: focusBorderOptions.style.lineWidth,
                    r: focusBorderOptions.style.borderRadius
                });
            }
        }
    }
    /**
     * Set chart's focus to an SVGElement. Calls focus() on it, and draws the
     * focus border. This is used by multiple components.
     *
     * @private
     * @function Highcharts.Chart#setFocusToElement
     *
     * @param {Highcharts.SVGElement} svgElement
     * Element to draw the border around.
     *
     * @param {SVGDOMElement|HTMLDOMElement} [focusElement]
     * If supplied, it draws the border around svgElement and sets the focus to
     * focusElement.
     */
    function chartSetFocusToElement(svgElement, focusElement) {
        const focusBorderOptions = this.options.accessibility.keyboardNavigation.focusBorder, browserFocusElement = focusElement || svgElement.element;
        // Set browser focus if possible
        if (browserFocusElement &&
            browserFocusElement.focus) {
            // If there is no focusin-listener, add one to work around Edge
            // where Narrator is not reading out points despite calling focus().
            if (!(browserFocusElement.hcEvents &&
                browserFocusElement.hcEvents.focusin)) {
                addEvent(browserFocusElement, 'focusin', function () { });
            }
            browserFocusElement.focus();
            // Hide default focus ring
            if (focusBorderOptions.hideBrowserFocusOutline) {
                browserFocusElement.style.outline = 'none';
            }
        }
        if (this.focusElement) {
            this.focusElement.removeFocusBorder();
        }
        this.focusElement = svgElement;
        this.renderFocusBorder();
    }
    /**
     * Add hook to destroy focus border if SVG element is destroyed, unless
     * hook already exists.
     * @private
     * @param el Element to add destroy hook to
     */
    function svgElementAddDestroyFocusBorderHook(el) {
        if (el.focusBorderDestroyHook) {
            return;
        }
        const origDestroy = el.destroy;
        el.destroy = function () {
            if (el.focusBorder && el.focusBorder.destroy) {
                el.focusBorder.destroy();
            }
            return origDestroy.apply(el, arguments);
        };
        el.focusBorderDestroyHook = origDestroy;
    }
    /**
     * Add focus border functionality to SVGElements. Draws a new rect on top of
     * element around its bounding box. This is used by multiple components.
     *
     * @private
     * @function Highcharts.SVGElement#addFocusBorder
     *
     * @param {number} margin
     *
     * @param {SVGAttributes} attribs
     */
    function svgElementAddFocusBorder(margin, attribs) {
        // Allow updating by just adding new border
        if (this.focusBorder) {
            this.removeFocusBorder();
        }
        // Add the border rect
        const bb = this.getBBox(), pad = pick(margin, 3), parent = this.parentGroup, scaleX = this.scaleX || parent && parent.scaleX, scaleY = this.scaleY || parent && parent.scaleY, oneDefined = scaleX ? !scaleY : scaleY, scaleBoth = oneDefined ? Math.abs(scaleX || scaleY || 1) :
            (Math.abs(scaleX || 1) + Math.abs(scaleY || 1)) / 2, lineHeight = this.renderer.fontMetrics(this).h;
        bb.x += this.translateX ? this.translateX : 0;
        bb.y += this.translateY ? this.translateY : 0;
        let borderPosX = bb.x - pad, borderPosY = bb.y - pad, borderWidth = bb.width + 2 * pad, borderHeight = bb.height + 2 * pad;
        /**
         * For text elements, apply x and y offset, #11397.
         * @private
         */
        function getTextAnchorCorrection(text) {
            let posXCorrection = 0, posYCorrection = 0;
            if (text.attr('text-anchor') === 'middle') {
                posXCorrection = posYCorrection = 0.5;
            }
            else if (!text.rotation) {
                posYCorrection = 0.75;
            }
            else {
                posXCorrection = 0.25;
            }
            return {
                x: posXCorrection,
                y: posYCorrection
            };
        }
        const isLabel = !!this.text;
        if (this.element.nodeName === 'text' || isLabel) {
            const isRotated = !!this.rotation;
            const correction = !isLabel ? getTextAnchorCorrection(this) :
                {
                    x: isRotated ? 1 : 0,
                    y: 0
                };
            const attrX = +this.attr('x');
            const attrY = +this.attr('y');
            if (!isNaN(attrX)) {
                borderPosX = attrX - (bb.width * correction.x) - pad;
            }
            if (!isNaN(attrY)) {
                // Correct by line height if "text-achor" == "start", #19335.
                const dim = this.attr('text-anchor') === 'start' ?
                    lineHeight :
                    bb.height;
                borderPosY = attrY - (dim * correction.y) - pad;
            }
            if (isLabel && isRotated) {
                const temp = borderWidth;
                borderWidth = borderHeight;
                borderHeight = temp;
                if (!isNaN(attrX)) {
                    borderPosX = attrX - (bb.height * correction.x) - pad;
                }
                if (!isNaN(attrY)) {
                    borderPosY = attrY - (bb.width * correction.y) - pad;
                }
            }
        }
        this.focusBorder = this.renderer.rect(borderPosX, borderPosY, borderWidth, borderHeight, parseInt((attribs && attribs.r || 0).toString(), 10) / scaleBoth)
            .addClass('highcharts-focus-border')
            .attr({
            zIndex: 99
        })
            .add(parent);
        if (!this.renderer.styledMode) {
            this.focusBorder.attr({
                stroke: attribs && attribs.stroke,
                'stroke-width': (attribs && attribs.strokeWidth || 0) / scaleBoth
            });
        }
        avgElementAddUpdateFocusBorderHooks(this, margin, attribs);
        svgElementAddDestroyFocusBorderHook(this);
    }
    /**
     * Add hooks to update the focus border of an element when the element
     * size/position is updated, unless already added.
     * @private
     * @param el Element to add update hooks to
     * @param updateParams Parameters to pass through to addFocusBorder when updating.
     */
    function avgElementAddUpdateFocusBorderHooks(el, ...updateParams) {
        if (el.focusBorderUpdateHooks) {
            return;
        }
        el.focusBorderUpdateHooks = {};
        svgElementBorderUpdateTriggers.forEach((trigger) => {
            const setterKey = trigger + 'Setter';
            const origSetter = el[setterKey] || el._defaultSetter;
            el.focusBorderUpdateHooks[setterKey] = origSetter;
            el[setterKey] = function () {
                const ret = origSetter.apply(el, arguments);
                el.addFocusBorder.apply(el, updateParams);
                return ret;
            };
        });
    }
    /**
     * Remove hook from SVG element added by addDestroyFocusBorderHook, if
     * existing.
     * @private
     * @param el Element to remove destroy hook from
     */
    function svgElementRemoveDestroyFocusBorderHook(el) {
        if (!el.focusBorderDestroyHook) {
            return;
        }
        el.destroy = el.focusBorderDestroyHook;
        delete el.focusBorderDestroyHook;
    }
    /**
     * Add focus border functionality to SVGElements. Draws a new rect on top of
     * element around its bounding box. This is used by multiple components.
     * @private
     * @function Highcharts.SVGElement#removeFocusBorder
     */
    function svgElementRemoveFocusBorder() {
        svgElementRemoveUpdateFocusBorderHooks(this);
        svgElementRemoveDestroyFocusBorderHook(this);
        if (this.focusBorder) {
            this.focusBorder.destroy();
            delete this.focusBorder;
        }
    }
    /**
     * Remove hooks from SVG element added by addUpdateFocusBorderHooks, if
     * existing.
     * @private
     * @param el Element to remove update hooks from
     */
    function svgElementRemoveUpdateFocusBorderHooks(el) {
        if (!el.focusBorderUpdateHooks) {
            return;
        }
        Object.keys(el.focusBorderUpdateHooks).forEach((setterKey) => {
            const origSetter = el.focusBorderUpdateHooks[setterKey];
            if (origSetter === el._defaultSetter) {
                delete el[setterKey];
            }
            else {
                el[setterKey] = origSetter;
            }
        });
        delete el.focusBorderUpdateHooks;
    }
})(FocusBorderComposition || (FocusBorderComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
export default FocusBorderComposition;
