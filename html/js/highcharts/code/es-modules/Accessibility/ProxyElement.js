/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Proxy elements are used to shadow SVG elements in HTML for assistive
 *  technology, such as screen readers or voice input software.
 *
 *  The ProxyElement class represents such an element, and deals with
 *  overlay positioning and mirroring events for the target.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../Core/Globals.js';
const { doc } = H;
import U from '../Core/Utilities.js';
const { attr, css, merge } = U;
import EventProvider from './Utils/EventProvider.js';
import ChartUtilities from './Utils/ChartUtilities.js';
const { fireEventOnWrappedOrUnwrappedElement } = ChartUtilities;
import HTMLUtilities from './Utils/HTMLUtilities.js';
const { cloneMouseEvent, cloneTouchEvent, getFakeMouseEvent, removeElement } = HTMLUtilities;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a proxy element that overlays a target and relays events
 * to its target.
 *
 * @private
 * @class
 */
class ProxyElement {
    /* *
     *
     *  Constructor
     *
     * */
    constructor(chart, target, proxyElementType = 'button', wrapperElementType, attributes) {
        this.chart = chart;
        this.target = target;
        this.eventProvider = new EventProvider();
        const innerEl = this.innerElement =
            doc.createElement(proxyElementType), wrapperEl = this.element = wrapperElementType ?
            doc.createElement(wrapperElementType) : innerEl;
        if (!chart.styledMode) {
            this.hideElementVisually(innerEl);
        }
        if (wrapperElementType) {
            if (wrapperElementType === 'li' && !chart.styledMode) {
                wrapperEl.style.listStyle = 'none';
            }
            wrapperEl.appendChild(innerEl);
            this.element = wrapperEl;
        }
        this.updateTarget(target, attributes);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Fake a click event on the target.
     */
    click() {
        const pos = this.getTargetPosition();
        pos.x += pos.width / 2;
        pos.y += pos.height / 2;
        const fakeEventObject = getFakeMouseEvent('click', pos);
        fireEventOnWrappedOrUnwrappedElement(this.target.click, fakeEventObject);
    }
    /**
     * Update the target to be proxied. The position and events are updated to
     * match the new target.
     * @param target The new target definition
     * @param attributes New HTML attributes to apply to the proxy. Set an
     * attribute to null to remove.
     */
    updateTarget(target, attributes) {
        this.target = target;
        this.updateCSSClassName();
        const attrs = attributes || {};
        Object.keys(attrs).forEach((a) => {
            if (attrs[a] === null) {
                delete attrs[a];
            }
        });
        const targetAriaLabel = this.getTargetAttr(target.click, 'aria-label');
        attr(this.innerElement, merge(targetAriaLabel ? {
            'aria-label': targetAriaLabel
        } : {}, attrs));
        this.eventProvider.removeAddedEvents();
        this.addProxyEventsToElement(this.innerElement, target.click);
        this.refreshPosition();
    }
    /**
     * Refresh the position of the proxy element to match the current target
     */
    refreshPosition() {
        const bBox = this.getTargetPosition();
        css(this.innerElement, {
            width: (bBox.width || 1) + 'px',
            height: (bBox.height || 1) + 'px',
            left: (Math.round(bBox.x) || 0) + 'px',
            top: (Math.round(bBox.y) || 0) + 'px'
        });
    }
    /**
     * Remove button from DOM, and clear events.
     */
    remove() {
        this.eventProvider.removeAddedEvents();
        removeElement(this.element);
    }
    // -------------------------- private ------------------------------------
    /**
     * Update the CSS class name to match target
     */
    updateCSSClassName() {
        const stringHasNoTooltip = (s) => (s.indexOf('highcharts-no-tooltip') > -1);
        const legend = this.chart.legend;
        const groupDiv = legend.group && legend.group.div;
        const noTooltipOnGroup = stringHasNoTooltip(groupDiv && groupDiv.className || '');
        const targetClassName = this.getTargetAttr(this.target.click, 'class') || '';
        const noTooltipOnTarget = stringHasNoTooltip(targetClassName);
        this.innerElement.className = noTooltipOnGroup || noTooltipOnTarget ?
            'highcharts-a11y-proxy-element highcharts-no-tooltip' :
            'highcharts-a11y-proxy-element';
    }
    /**
     * Mirror events for a proxy element to a target
     */
    addProxyEventsToElement(element, target) {
        [
            'click', 'touchstart', 'touchend', 'touchcancel', 'touchmove',
            'mouseover', 'mouseenter', 'mouseleave', 'mouseout'
        ].forEach((evtType) => {
            const isTouchEvent = evtType.indexOf('touch') === 0;
            this.eventProvider.addEvent(element, evtType, (e) => {
                const clonedEvent = isTouchEvent ?
                    cloneTouchEvent(e) :
                    cloneMouseEvent(e);
                if (target) {
                    fireEventOnWrappedOrUnwrappedElement(target, clonedEvent);
                }
                e.stopPropagation();
                // #9682, #15318: Touch scrolling didn't work when touching
                // proxy
                if (!isTouchEvent) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }
    /**
     * Set visually hidden style on a proxy element
     */
    hideElementVisually(el) {
        css(el, {
            borderWidth: 0,
            backgroundColor: 'transparent',
            cursor: 'pointer',
            outline: 'none',
            opacity: 0.001,
            filter: 'alpha(opacity=1)',
            zIndex: 999,
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            display: 'block',
            position: 'absolute',
            '-ms-filter': 'progid:DXImageTransform.Microsoft.Alpha(Opacity=1)'
        });
    }
    /**
     * Get the position relative to chart container for the target
     */
    getTargetPosition() {
        const clickTarget = this.target.click;
        // We accept both DOM elements and wrapped elements as click targets.
        const clickTargetElement = clickTarget.element ?
            clickTarget.element :
            clickTarget;
        const posElement = this.target.visual || clickTargetElement;
        const chartDiv = this.chart.renderTo, pointer = this.chart.pointer;
        if (chartDiv && posElement?.getBoundingClientRect && pointer) {
            const rectEl = posElement.getBoundingClientRect(), chartPos = pointer.getChartPosition();
            return {
                x: (rectEl.left - chartPos.left) / chartPos.scaleX,
                y: (rectEl.top - chartPos.top) / chartPos.scaleY,
                width: rectEl.right / chartPos.scaleX -
                    rectEl.left / chartPos.scaleX,
                height: rectEl.bottom / chartPos.scaleY -
                    rectEl.top / chartPos.scaleY
            };
        }
        return { x: 0, y: 0, width: 1, height: 1 };
    }
    /**
     * Get an attribute value of a target
     */
    getTargetAttr(target, key) {
        if (target.element) {
            return target.element.getAttribute(key);
        }
        return target.getAttribute(key);
    }
}
/* *
 *
 *  Default Export
 *
 * */
export default ProxyElement;
