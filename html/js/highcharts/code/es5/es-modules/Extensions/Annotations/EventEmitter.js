/* *
 *
 *  (c) 2009-2024 Highsoft, Black Label
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../../Core/Globals.js';
var doc = H.doc, isTouchDevice = H.isTouchDevice;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, fireEvent = U.fireEvent, objectEach = U.objectEach, pick = U.pick, removeEvent = U.removeEvent;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 */
var EventEmitter = /** @class */ (function () {
    function EventEmitter() {
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Add emitter events.
     * @private
     */
    EventEmitter.prototype.addEvents = function () {
        var emitter = this, addMouseDownEvent = function (element) {
            addEvent(element, isTouchDevice ? 'touchstart' : 'mousedown', function (e) {
                emitter.onMouseDown(e);
            }, { passive: false });
        };
        addMouseDownEvent(this.graphic.element);
        (emitter.labels || []).forEach(function (label) {
            if (label.options.useHTML && label.graphic.text) {
                // Mousedown event bound to HTML element (#13070).
                addMouseDownEvent(label.graphic.text.element);
            }
        });
        objectEach(emitter.options.events, function (event, type) {
            var eventHandler = function (e) {
                var _a;
                if (type !== 'click' || !emitter.cancelClick) {
                    event.call(emitter, (_a = emitter.chart.pointer) === null || _a === void 0 ? void 0 : _a.normalize(e), emitter.target);
                }
            };
            if ((emitter.nonDOMEvents || []).indexOf(type) === -1) {
                addEvent(emitter.graphic.element, type, eventHandler, { passive: false });
                if (emitter.graphic.div) {
                    addEvent(emitter.graphic.div, type, eventHandler, { passive: false });
                }
            }
            else {
                addEvent(emitter, type, eventHandler, { passive: false });
            }
        });
        if (emitter.options.draggable) {
            addEvent(emitter, 'drag', emitter.onDrag);
            if (!emitter.graphic.renderer.styledMode) {
                var cssPointer_1 = {
                    cursor: {
                        x: 'ew-resize',
                        y: 'ns-resize',
                        xy: 'move'
                    }[emitter.options.draggable]
                };
                emitter.graphic.css(cssPointer_1);
                (emitter.labels || []).forEach(function (label) {
                    if (label.options.useHTML && label.graphic.text) {
                        label.graphic.text.css(cssPointer_1);
                    }
                });
            }
        }
        if (!emitter.isUpdating) {
            fireEvent(emitter, 'add');
        }
    };
    /**
     * Destroy the event emitter.
     */
    EventEmitter.prototype.destroy = function () {
        this.removeDocEvents();
        removeEvent(this);
        this.hcEvents = null;
    };
    /**
     * Map mouse move event to the radians.
     * @private
     */
    EventEmitter.prototype.mouseMoveToRadians = function (e, cx, cy) {
        var prevDy = e.prevChartY - cy, prevDx = e.prevChartX - cx, dy = e.chartY - cy, dx = e.chartX - cx, temp;
        if (this.chart.inverted) {
            temp = prevDx;
            prevDx = prevDy;
            prevDy = temp;
            temp = dx;
            dx = dy;
            dy = temp;
        }
        return Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
    };
    /**
     * Map mouse move to the scale factors.
     * @private
     */
    EventEmitter.prototype.mouseMoveToScale = function (e, cx, cy) {
        var prevDx = e.prevChartX - cx, prevDy = e.prevChartY - cy, dx = e.chartX - cx, dy = e.chartY - cy;
        var sx = (dx || 1) / (prevDx || 1), sy = (dy || 1) / (prevDy || 1);
        if (this.chart.inverted) {
            var temp = sy;
            sy = sx;
            sx = temp;
        }
        return {
            x: sx,
            y: sy
        };
    };
    /**
     * Map mouse move event to the distance between two following events.
     * @private
     */
    EventEmitter.prototype.mouseMoveToTranslation = function (e) {
        var dx = e.chartX - e.prevChartX, dy = e.chartY - e.prevChartY, temp;
        if (this.chart.inverted) {
            temp = dy;
            dy = dx;
            dx = temp;
        }
        return {
            x: dx,
            y: dy
        };
    };
    /**
     * Drag and drop event. All basic annotations should share this
     * capability as well as the extended ones.
     * @private
     */
    EventEmitter.prototype.onDrag = function (e) {
        if (this.chart.isInsidePlot(e.chartX - this.chart.plotLeft, e.chartY - this.chart.plotTop, {
            visiblePlotOnly: true
        })) {
            var translation_1 = this.mouseMoveToTranslation(e);
            if (this.options.draggable === 'x') {
                translation_1.y = 0;
            }
            if (this.options.draggable === 'y') {
                translation_1.x = 0;
            }
            var emitter = this;
            if (emitter.points.length) {
                emitter.translate(translation_1.x, translation_1.y);
            }
            else {
                emitter.shapes.forEach(function (shape) {
                    return shape.translate(translation_1.x, translation_1.y);
                });
                emitter.labels.forEach(function (label) {
                    return label.translate(translation_1.x, translation_1.y);
                });
            }
            this.redraw(false);
        }
    };
    /**
     * Mouse down handler.
     * @private
     */
    EventEmitter.prototype.onMouseDown = function (e) {
        var _a;
        if (e.preventDefault) {
            e.preventDefault();
        }
        // On right click, do nothing:
        if (e.button === 2) {
            return;
        }
        var emitter = this, pointer = emitter.chart.pointer, 
        // Using experimental property on event object to check if event was
        // created by touch on screen on hybrid device (#18122)
        firesTouchEvents = ((_a = e === null || e === void 0 ? void 0 : e.sourceCapabilities) === null || _a === void 0 ? void 0 : _a.firesTouchEvents) || false;
        e = (pointer === null || pointer === void 0 ? void 0 : pointer.normalize(e)) || e;
        var prevChartX = e.chartX, prevChartY = e.chartY;
        emitter.cancelClick = false;
        emitter.chart.hasDraggedAnnotation = true;
        emitter.removeDrag = addEvent(doc, isTouchDevice || firesTouchEvents ? 'touchmove' : 'mousemove', function (e) {
            emitter.hasDragged = true;
            e = (pointer === null || pointer === void 0 ? void 0 : pointer.normalize(e)) || e;
            e.prevChartX = prevChartX;
            e.prevChartY = prevChartY;
            fireEvent(emitter, 'drag', e);
            prevChartX = e.chartX;
            prevChartY = e.chartY;
        }, isTouchDevice || firesTouchEvents ? { passive: false } : void 0);
        emitter.removeMouseUp = addEvent(doc, isTouchDevice || firesTouchEvents ? 'touchend' : 'mouseup', function () {
            // Sometimes the target is the annotation and sometimes its the
            // controllable
            var annotation = pick(emitter.target && emitter.target.annotation, emitter.target);
            if (annotation) {
                // Keep annotation selected after dragging control point
                annotation.cancelClick = emitter.hasDragged;
            }
            emitter.cancelClick = emitter.hasDragged;
            emitter.chart.hasDraggedAnnotation = false;
            if (emitter.hasDragged) {
                // ControlPoints vs Annotation:
                fireEvent(pick(annotation, // #15952
                emitter), 'afterUpdate');
            }
            emitter.hasDragged = false;
            emitter.onMouseUp();
        }, isTouchDevice || firesTouchEvents ? { passive: false } : void 0);
    };
    /**
     * Mouse up handler.
     */
    EventEmitter.prototype.onMouseUp = function () {
        this.removeDocEvents();
    };
    /**
     * Remove emitter document events.
     * @private
     */
    EventEmitter.prototype.removeDocEvents = function () {
        if (this.removeDrag) {
            this.removeDrag = this.removeDrag();
        }
        if (this.removeMouseUp) {
            this.removeMouseUp = this.removeMouseUp();
        }
    };
    return EventEmitter;
}());
/* *
 *
 *  Default Export
 *
 * */
export default EventEmitter;
