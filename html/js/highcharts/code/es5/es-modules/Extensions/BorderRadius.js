/* *
 *
 *  Highcharts Border Radius module
 *
 *  Author: Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import D from '../Core/Defaults.js';
var defaultOptions = D.defaultOptions;
import H from '../Core/Globals.js';
var noop = H.noop;
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, isObject = U.isObject, merge = U.merge, relativeLength = U.relativeLength;
/* *
 *
 *  Constants
 *
 * */
var defaultBorderRadiusOptions = {
    radius: 0,
    scope: 'stack',
    where: void 0
};
/* *
 *
 *  Variables
 *
 * */
var oldArc = noop;
var oldRoundedRect = noop;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function applyBorderRadius(path, i, r) {
    var a = path[i];
    var b = path[i + 1];
    if (b[0] === 'Z') {
        b = path[0];
    }
    var line, arc, fromLineToArc;
    // From straight line to arc
    if ((a[0] === 'M' || a[0] === 'L') && b[0] === 'A') {
        line = a;
        arc = b;
        fromLineToArc = true;
        // From arc to straight line
    }
    else if (a[0] === 'A' && (b[0] === 'M' || b[0] === 'L')) {
        line = b;
        arc = a;
    }
    if (line && arc && arc.params) {
        var bigR = arc[1], 
        // In our use cases, outer pie slice arcs are clockwise and inner
        // arcs (donut/sunburst etc) are anti-clockwise
        clockwise = arc[5], params = arc.params, start = params.start, end = params.end, cx = params.cx, cy = params.cy;
        // Some geometric constants
        var relativeR = clockwise ? (bigR - r) : (bigR + r), 
        // The angle, on the big arc, that the border radius arc takes up
        angleOfBorderRadius = relativeR ? Math.asin(r / relativeR) : 0, angleOffset = clockwise ?
            angleOfBorderRadius :
            -angleOfBorderRadius, 
        // The distance along the radius of the big arc to the starting
        // point of the small border radius arc
        distanceBigCenterToStartArc = (Math.cos(angleOfBorderRadius) *
            relativeR);
        // From line to arc
        if (fromLineToArc) {
            // Update the cache
            params.start = start + angleOffset;
            // First move to the start position at the radial line. We want to
            // start one borderRadius closer to the center.
            line[1] = cx + distanceBigCenterToStartArc * Math.cos(start);
            line[2] = cy + distanceBigCenterToStartArc * Math.sin(start);
            // Now draw an arc towards the point where the small circle touches
            // the great circle.
            path.splice(i + 1, 0, [
                'A',
                r,
                r,
                0, // Slanting,
                0, // Long arc
                1, // Clockwise
                cx + bigR * Math.cos(params.start),
                cy + bigR * Math.sin(params.start)
            ]);
            // From arc to line
        }
        else {
            // Update the cache
            params.end = end - angleOffset;
            // End the big arc a bit earlier
            arc[6] = cx + bigR * Math.cos(params.end);
            arc[7] = cy + bigR * Math.sin(params.end);
            // Draw a small arc towards a point on the end angle, but one
            // borderRadius closer to the center relative to the perimeter.
            path.splice(i + 1, 0, [
                'A',
                r,
                r,
                0,
                0,
                1,
                cx + distanceBigCenterToStartArc * Math.cos(end),
                cy + distanceBigCenterToStartArc * Math.sin(end)
            ]);
        }
        // Long or short arc must be reconsidered because we have modified the
        // start and end points
        arc[4] = Math.abs(params.end - params.start) < Math.PI ? 0 : 1;
    }
}
/**
 * Extend arc with borderRadius.
 * @private
 */
function arc(x, y, w, h, options) {
    if (options === void 0) { options = {}; }
    var path = oldArc(x, y, w, h, options), _a = options.innerR, innerR = _a === void 0 ? 0 : _a, _b = options.r, r = _b === void 0 ? w : _b, _c = options.start, start = _c === void 0 ? 0 : _c, _d = options.end, end = _d === void 0 ? 0 : _d;
    if (options.open || !options.borderRadius) {
        return path;
    }
    var alpha = end - start, sinHalfAlpha = Math.sin(alpha / 2), borderRadius = Math.max(Math.min(relativeLength(options.borderRadius || 0, r - innerR), 
    // Cap to half the sector radius
    (r - innerR) / 2, 
    // For smaller pie slices, cap to the largest small circle that
    // can be fitted within the sector
    (r * sinHalfAlpha) / (1 + sinHalfAlpha)), 0), 
    // For the inner radius, we need an extra cap because the inner arc
    // is shorter than the outer arc
    innerBorderRadius = Math.min(borderRadius, 2 * (alpha / Math.PI) * innerR);
    // Apply turn-by-turn border radius. Start at the end since we're
    // splicing in arc segments.
    var i = path.length - 1;
    while (i--) {
        applyBorderRadius(path, i, i > 1 ? innerBorderRadius : borderRadius);
    }
    return path;
}
/** @private */
function seriesOnAfterColumnTranslate() {
    var _a, _b;
    if (this.options.borderRadius &&
        !(this.chart.is3d && this.chart.is3d())) {
        var _c = this, options = _c.options, yAxis = _c.yAxis, percent = options.stacking === 'percent', seriesDefault = (_b = (_a = defaultOptions.plotOptions) === null || _a === void 0 ? void 0 : _a[this.type]) === null || _b === void 0 ? void 0 : _b.borderRadius, borderRadius = optionsToObject(options.borderRadius, isObject(seriesDefault) ? seriesDefault : {}), reversed = yAxis.options.reversed;
        for (var _i = 0, _d = this.points; _i < _d.length; _i++) {
            var point = _d[_i];
            var shapeArgs = point.shapeArgs;
            if (point.shapeType === 'roundedRect' && shapeArgs) {
                var _e = shapeArgs.width, width = _e === void 0 ? 0 : _e, _f = shapeArgs.height, height = _f === void 0 ? 0 : _f, _g = shapeArgs.y, y = _g === void 0 ? 0 : _g;
                var brBoxY = y, brBoxHeight = height;
                // It would be nice to refactor StackItem.getStackBox/
                // setOffset so that we could get a reliable box out of
                // it. Currently it is close if we remove the label
                // offset, but we still need to run crispCol and also
                // flip it if inverted, so atm it is simpler to do it
                // like the below.
                if (borderRadius.scope === 'stack' &&
                    point.stackTotal) {
                    var stackEnd = yAxis.translate(percent ? 100 : point.stackTotal, false, true, false, true), stackThreshold = yAxis.translate(options.threshold || 0, false, true, false, true), box = this.crispCol(0, Math.min(stackEnd, stackThreshold), 0, Math.abs(stackEnd - stackThreshold));
                    brBoxY = box.y;
                    brBoxHeight = box.height;
                }
                var flip = (point.negative ? -1 : 1) *
                    (reversed ? -1 : 1) === -1;
                // Handle the where option
                var where = borderRadius.where;
                // Waterfall, hanging columns should have rounding on
                // all sides
                if (!where &&
                    this.is('waterfall') &&
                    Math.abs((point.yBottom || 0) -
                        (this.translatedThreshold || 0)) > this.borderWidth) {
                    where = 'all';
                }
                if (!where) {
                    where = 'end';
                }
                // Get the radius
                var r = Math.min(relativeLength(borderRadius.radius, width), width / 2, 
                // Cap to the height, but not if where is `end`
                where === 'all' ? height / 2 : Infinity) || 0;
                // If the `where` option is 'end', cut off the
                // rectangles by making the border-radius box one r
                // greater, so that the imaginary radius falls outside
                // the rectangle.
                if (where === 'end') {
                    if (flip) {
                        brBoxY -= r;
                        brBoxHeight += r;
                    }
                    else {
                        brBoxHeight += r;
                    }
                }
                extend(shapeArgs, { brBoxHeight: brBoxHeight, brBoxY: brBoxY, r: r });
            }
        }
    }
}
/** @private */
function compose(SeriesClass, SVGElementClass, SVGRendererClass) {
    var PieSeriesClass = SeriesClass.types.pie;
    if (!SVGElementClass.symbolCustomAttribs.includes('borderRadius')) {
        var symbols = SVGRendererClass.prototype.symbols;
        addEvent(SeriesClass, 'afterColumnTranslate', seriesOnAfterColumnTranslate, {
            // After columnrange and polar column modifications
            order: 9
        });
        addEvent(PieSeriesClass, 'afterTranslate', pieSeriesOnAfterTranslate);
        SVGElementClass.symbolCustomAttribs.push('borderRadius', 'brBoxHeight', 'brBoxY');
        oldArc = symbols.arc;
        oldRoundedRect = symbols.roundedRect;
        symbols.arc = arc;
        symbols.roundedRect = roundedRect;
    }
}
/** @private */
function optionsToObject(options, seriesBROptions) {
    if (!isObject(options)) {
        options = { radius: options || 0 };
    }
    return merge(defaultBorderRadiusOptions, seriesBROptions, options);
}
/** @private */
function pieSeriesOnAfterTranslate() {
    var borderRadius = optionsToObject(this.options.borderRadius);
    for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
        var point = _a[_i];
        var shapeArgs = point.shapeArgs;
        if (shapeArgs) {
            shapeArgs.borderRadius = relativeLength(borderRadius.radius, (shapeArgs.r || 0) - ((shapeArgs.innerR) || 0));
        }
    }
}
/**
 * Extend roundedRect with individual cutting through rOffset.
 * @private
 */
function roundedRect(x, y, width, height, options) {
    if (options === void 0) { options = {}; }
    var path = oldRoundedRect(x, y, width, height, options), _a = options.r, r = _a === void 0 ? 0 : _a, _b = options.brBoxHeight, brBoxHeight = _b === void 0 ? height : _b, _c = options.brBoxY, brBoxY = _c === void 0 ? y : _c, brOffsetTop = y - brBoxY, brOffsetBtm = (brBoxY + brBoxHeight) - (y + height), 
    // When the distance to the border-radius box is greater than the r
    // itself, it means no border radius. The -0.1 accounts for float
    // rounding errors.
    rTop = (brOffsetTop - r) > -0.1 ? 0 : r, rBtm = (brOffsetBtm - r) > -0.1 ? 0 : r, cutTop = Math.max(rTop && brOffsetTop, 0), cutBtm = Math.max(rBtm && brOffsetBtm, 0);
    /*

    The naming of control points:

      / a -------- b \
     /                \
    h                  c
    |                  |
    |                  |
    |                  |
    g                  d
     \                /
      \ f -------- e /

    */
    var a = [x + rTop, y], b = [x + width - rTop, y], c = [x + width, y + rTop], d = [
        x + width, y + height - rBtm
    ], e = [
        x + width - rBtm,
        y + height
    ], f = [x + rBtm, y + height], g = [x, y + height - rBtm], h = [x, y + rTop];
    var applyPythagoras = function (r, altitude) { return Math.sqrt(Math.pow(r, 2) - Math.pow(altitude, 2)); };
    // Inside stacks, cut off part of the top
    if (cutTop) {
        var base = applyPythagoras(rTop, rTop - cutTop);
        a[0] -= base;
        b[0] += base;
        c[1] = h[1] = y + rTop - cutTop;
    }
    // Column is lower than the radius. Cut off bottom inside the top
    // radius.
    if (height < rTop - cutTop) {
        var base = applyPythagoras(rTop, rTop - cutTop - height);
        c[0] = d[0] = x + width - rTop + base;
        e[0] = Math.min(c[0], e[0]);
        f[0] = Math.max(d[0], f[0]);
        g[0] = h[0] = x + rTop - base;
        c[1] = h[1] = y + height;
    }
    // Inside stacks, cut off part of the bottom
    if (cutBtm) {
        var base = applyPythagoras(rBtm, rBtm - cutBtm);
        e[0] += base;
        f[0] -= base;
        d[1] = g[1] = y + height - rBtm + cutBtm;
    }
    // Cut off top inside the bottom radius
    if (height < rBtm - cutBtm) {
        var base = applyPythagoras(rBtm, rBtm - cutBtm - height);
        c[0] = d[0] = x + width - rBtm + base;
        b[0] = Math.min(c[0], b[0]);
        a[0] = Math.max(d[0], a[0]);
        g[0] = h[0] = x + rBtm - base;
        d[1] = g[1] = y;
    }
    // Preserve the box for data labels
    path.length = 0;
    path.push(__spreadArray(['M'], a, true), __spreadArray(['L'], b, true), __spreadArray(['A', rTop, rTop, 0, 0, 1], c, true), __spreadArray(['L'], d, true), __spreadArray(['A', rBtm, rBtm, 0, 0, 1], e, true), __spreadArray(['L'], f, true), __spreadArray(['A', rBtm, rBtm, 0, 0, 1], g, true), __spreadArray(['L'], h, true), __spreadArray(['A', rTop, rTop, 0, 0, 1], a, true), ['Z']);
    return path;
}
/* *
 *
 *  Default Export
 *
 * */
var BorderRadius = {
    compose: compose,
    optionsToObject: optionsToObject
};
export default BorderRadius;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Detailed options for border radius.
 *
 * @sample  {highcharts} highcharts/plotoptions/column-borderradius/
 *          Rounded columns
 * @sample  highcharts/plotoptions/series-border-radius
 *          Column and pie with rounded border
 *
 * @interface Highcharts.BorderRadiusOptionsObject
 */ /**
* The border radius. A number signifies pixels. A percentage string, like for
* example `50%`, signifies a relative size. For columns this is relative to the
* column width, for pies it is relative to the radius and the inner radius.
*
* @name Highcharts.BorderRadiusOptionsObject#radius
* @type {string|number}
*/ /**
* The scope of the rounding for column charts. In a stacked column chart, the
* value `point` means each single point will get rounded corners. The value
* `stack` means the rounding will apply to the full stack, so that only points
* close to the top or bottom will receive rounding.
*
* @name Highcharts.BorderRadiusOptionsObject#scope
* @validvalue ["point", "stack"]
* @type {string}
*/ /**
* For column charts, where in the point or stack to apply rounding. The `end`
* value means only those corners at the point value will be rounded, leaving
* the corners at the base or threshold unrounded. This is the most intuitive
* behaviour. The `all` value means also the base will be rounded.
*
* @name Highcharts.BorderRadiusOptionsObject#where
* @validvalue ["all", "end"]
* @type {string}
* @default end
*/
(''); // Keeps doclets above in JS file
