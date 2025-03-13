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
import H from './Globals.js';
const { charts, composed, doc, noop, win } = H;
import Pointer from './Pointer.js';
import U from './Utilities.js';
const { addEvent, attr, css, defined, objectEach, pick, pushUnique, removeEvent } = U;
/* *
 *
 *  Constants
 *
 * */
// The touches object keeps track of the points being touched at all times
const touches = {};
const hasPointerEvent = !!win.PointerEvent;
/* *
 *
 *  Functions
 *
 * */
/* eslint-disable valid-jsdoc */
/** @private */
function getWebkitTouches() {
    const fake = [];
    fake.item = function (i) {
        return this[i];
    };
    objectEach(touches, function (touch) {
        fake.push({
            pageX: touch.pageX,
            pageY: touch.pageY,
            target: touch.target
        });
    });
    return fake;
}
/** @private */
function translateMSPointer(e, method, wktype, func) {
    const pointer = charts[Pointer.hoverChartIndex ?? -1]?.pointer;
    if (pointer &&
        (e.pointerType === 'touch' ||
            e.pointerType === e.MSPOINTER_TYPE_TOUCH)) {
        func(e);
        pointer[method]({
            type: wktype,
            target: e.currentTarget,
            preventDefault: noop,
            touches: getWebkitTouches()
        });
    }
}
/* *
 *
 *  Class
 *
 * */
/** @private */
class MSPointer extends Pointer {
    /* *
     *
     *  Static Functions
     *
     * */
    static isRequired() {
        return !!(!win.TouchEvent && (win.PointerEvent || win.MSPointerEvent));
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Add or remove the MS Pointer specific events
     * @private
     * @function Highcharts.Pointer#batchMSEvents
     */
    batchMSEvents(fn) {
        fn(this.chart.container, hasPointerEvent ? 'pointerdown' : 'MSPointerDown', this.onContainerPointerDown);
        fn(this.chart.container, hasPointerEvent ? 'pointermove' : 'MSPointerMove', this.onContainerPointerMove);
        fn(doc, hasPointerEvent ? 'pointerup' : 'MSPointerUp', this.onDocumentPointerUp);
    }
    // Destroy MS events also
    destroy() {
        this.batchMSEvents(removeEvent);
        super.destroy();
    }
    // Disable default IE actions for pinch and such on chart element
    constructor(chart, options) {
        super(chart, options);
        if (this.hasZoom) { // #4014
            css(chart.container, {
                '-ms-touch-action': 'none',
                'touch-action': 'none'
            });
        }
    }
    /**
     * Utility to detect whether an element has, or has a parent with, a
     * specific class name. Used on detection of tracker objects and on deciding
     * whether hovering the tooltip should cause the active series to mouse out.
     *
     * @function Highcharts.Pointer#inClass
     *
     * @param {Highcharts.SVGDOMElement|Highcharts.HTMLDOMElement} element
     * The element to investigate.
     *
     * @param {string} className
     * The class name to look for.
     *
     * @return {boolean|undefined}
     * True if either the element or one of its parents has the given class
     * name.
     */
    inClass(element, className) {
        let elem = element, elemClassName;
        while (elem) {
            elemClassName = attr(elem, 'class');
            if (elemClassName) {
                if (elemClassName.indexOf(className) !== -1) {
                    return true;
                }
                if (elemClassName.indexOf('highcharts-container') !== -1) {
                    return false;
                }
            }
            // #21098 IE11 compatibility
            elem = elem.parentNode;
            if (elem && (
            // HTMLElement
            elem === document.documentElement ||
                // Document
                defined(elem.nodeType) &&
                    elem.nodeType === document.nodeType)) {
                elem = null;
            }
        }
    }
    /**
     * @private
     * @function Highcharts.Pointer#onContainerPointerDown
     */
    onContainerPointerDown(e) {
        translateMSPointer(e, 'onContainerTouchStart', 'touchstart', function (e) {
            touches[e.pointerId] = {
                pageX: e.pageX,
                pageY: e.pageY,
                target: e.currentTarget
            };
        });
    }
    /**
     * @private
     * @function Highcharts.Pointer#onContainerPointerMove
     */
    onContainerPointerMove(e) {
        translateMSPointer(e, 'onContainerTouchMove', 'touchmove', function (e) {
            touches[e.pointerId] = ({ pageX: e.pageX, pageY: e.pageY });
            if (!touches[e.pointerId].target) {
                touches[e.pointerId].target = e.currentTarget;
            }
        });
    }
    /**
     * @private
     * @function Highcharts.Pointer#onDocumentPointerUp
     */
    onDocumentPointerUp(e) {
        translateMSPointer(e, 'onDocumentTouchEnd', 'touchend', function (e) {
            delete touches[e.pointerId];
        });
    }
    // Add IE specific touch events to chart
    setDOMEvents() {
        const tooltip = this.chart.tooltip;
        super.setDOMEvents();
        if (this.hasZoom ||
            pick((tooltip && tooltip.options.followTouchMove), true)) {
            this.batchMSEvents(addEvent);
        }
    }
}
/* *
 *
 *  Class Namespace
 *
 * */
(function (MSPointer) {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(ChartClass) {
        if (pushUnique(composed, 'Core.MSPointer')) {
            addEvent(ChartClass, 'beforeRender', function () {
                this.pointer = new MSPointer(this, this.options);
            });
        }
    }
    MSPointer.compose = compose;
})(MSPointer || (MSPointer = {}));
/* *
 *
 *  Default Export
 *
 * */
export default MSPointer;
