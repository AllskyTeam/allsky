/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import ControlTarget from '../ControlTarget.js';
import U from '../../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * It provides methods for handling points, control points
 * and points transformations.
 * @private
 */
var Controllable = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function Controllable(annotation, options, index, itemType) {
        this.annotation = annotation;
        this.chart = annotation.chart;
        this.collection = (itemType === 'label' ? 'labels' : 'shapes');
        this.controlPoints = [];
        this.options = options;
        this.points = [];
        this.index = index;
        this.itemType = itemType;
        this.init(annotation, options, index);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Redirect attr usage on the controllable graphic element.
     * @private
     */
    Controllable.prototype.attr = function () {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        var _args = [];
        for (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        var _i = 0; 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _i < arguments.length; 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _i++) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _args[_i] = arguments[_i];
        }
        this.graphic.attr.apply(this.graphic, arguments);
    };
    /**
     * Utility function for mapping item's options
     * to element's attribute
     * @private
     * @param {Highcharts.AnnotationsLabelsOptions|Highcharts.AnnotationsShapesOptions} options
     * @return {Highcharts.SVGAttributes}
     *         Mapped options.
     */
    Controllable.prototype.attrsFromOptions = function (options) {
        var map = this.constructor.attrsMap, attrs = {}, styledMode = this.chart.styledMode;
        var key, mappedKey;
        for (key in options) { // eslint-disable-line guard-for-in
            mappedKey = map[key];
            if (typeof map[key] !== 'undefined' &&
                (!styledMode ||
                    ['fill', 'stroke', 'stroke-width']
                        .indexOf(mappedKey) === -1)) {
                attrs[mappedKey] = options[key];
            }
        }
        return attrs;
    };
    /**
     * Destroy a controllable.
     * @private
     */
    Controllable.prototype.destroy = function () {
        if (this.graphic) {
            this.graphic = this.graphic.destroy();
        }
        if (this.tracker) {
            this.tracker = this.tracker.destroy();
        }
        this.destroyControlTarget();
    };
    /**
     * Init the controllable
     * @private
     */
    Controllable.prototype.init = function (annotation, options, index) {
        this.annotation = annotation;
        this.chart = annotation.chart;
        this.options = options;
        this.points = [];
        this.controlPoints = [];
        this.index = index;
        this.linkPoints();
        this.addControlPoints();
    };
    /**
     * Redraw a controllable.
     * @private
     */
    Controllable.prototype.redraw = function (animation) {
        this.redrawControlPoints(animation);
    };
    /**
     * Render a controllable.
     * @private
     */
    Controllable.prototype.render = function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parentGroup) {
        if (this.options.className && this.graphic) {
            this.graphic.addClass(this.options.className);
        }
        this.renderControlPoints();
    };
    /**
     * Rotate a controllable.
     * @private
     * @param {number} cx
     *        Origin x rotation
     * @param {number} cy
     *        Origin y rotation
     * @param {number} radians
     **/
    Controllable.prototype.rotate = function (cx, cy, radians) {
        this.transform('rotate', cx, cy, radians);
    };
    /**
     * Scale a controllable.
     * @private
     * @param {number} cx
     *        Origin x rotation
     * @param {number} cy
     *        Origin y rotation
     * @param {number} sx
     *        Scale factor x
     * @param {number} sy
     *        Scale factor y
     */
    Controllable.prototype.scale = function (cx, cy, sx, sy) {
        this.transform('scale', cx, cy, sx, sy);
    };
    /**
     * Set control points' visibility.
     * @private
     */
    Controllable.prototype.setControlPointsVisibility = function (visible) {
        this.controlPoints.forEach(function (controlPoint) {
            controlPoint.setVisibility(visible);
        });
    };
    /**
     * Check if a controllable should be rendered/redrawn.
     * @private
     * @return {boolean}
     *         Whether a controllable should be drawn.
     */
    Controllable.prototype.shouldBeDrawn = function () {
        return !!this.points.length;
    };
    /**
     * Translate shape within controllable item.
     * Replaces `controllable.translate` method.
     * @private
     * @param {number} dx
     *        Translation for x coordinate
     * @param {number} dy
     *        Translation for y coordinate
     * @param {boolean|undefined} translateSecondPoint
     *        If the shape has two points attached to it, this option allows you
     *        to translate also the second point.
     */
    Controllable.prototype.translateShape = function (dx, dy, translateSecondPoint) {
        var chart = this.annotation.chart, 
        // Annotation.options
        shapeOptions = this.annotation.userOptions, 
        // Chart.options.annotations
        annotationIndex = chart.annotations.indexOf(this.annotation), chartOptions = chart.options.annotations[annotationIndex];
        this.translatePoint(dx, dy, 0);
        if (translateSecondPoint) {
            this.translatePoint(dx, dy, 1);
        }
        // Options stored in:
        // - chart (for exporting)
        // - current config (for redraws)
        chartOptions[this.collection][this.index]
            .point = this.options.point;
        shapeOptions[this.collection][this.index]
            .point = this.options.point;
    };
    /**
     * Update a controllable.
     * @private
     */
    Controllable.prototype.update = function (newOptions) {
        var annotation = this.annotation, options = merge(true, this.options, newOptions), parentGroup = this.graphic.parentGroup, Constructor = this.constructor;
        this.destroy();
        var newControllable = new Constructor(annotation, options, this.index, this.itemType);
        merge(true, this, newControllable);
        this.render(parentGroup);
        this.redraw();
    };
    return Controllable;
}());
ControlTarget.compose(Controllable);
/* *
 *
 *  Default Export
 *
 * */
export default Controllable;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * An object which denotes a controllable's anchor positions - relative and
 * absolute.
 *
 * @private
 * @interface Highcharts.AnnotationAnchorObject
 */ /**
* Relative to the plot area position
* @name Highcharts.AnnotationAnchorObject#relativePosition
* @type {Highcharts.BBoxObject}
*/ /**
* Absolute position
* @name Highcharts.AnnotationAnchorObject#absolutePosition
* @type {Highcharts.BBoxObject}
*/
/**
 * @interface Highcharts.AnnotationControllable
 */ /**
* @name Highcharts.AnnotationControllable#annotation
* @type {Highcharts.Annotation}
*/ /**
* @name Highcharts.AnnotationControllable#chart
* @type {Highcharts.Chart}
*/ /**
* @name Highcharts.AnnotationControllable#collection
* @type {string}
*/ /**
* @private
* @name Highcharts.AnnotationControllable#controlPoints
* @type {Array<Highcharts.AnnotationControlPoint>}
*/ /**
* @name Highcharts.AnnotationControllable#points
* @type {Array<Highcharts.Point>}
*/
(''); // Keeps doclets above in JS file
