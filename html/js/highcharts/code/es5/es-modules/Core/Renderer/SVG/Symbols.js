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
import U from '../../Utilities.js';
var defined = U.defined, isNumber = U.isNumber, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/* eslint-disable require-jsdoc, valid-jsdoc */
/**
 *
 */
function arc(cx, cy, w, h, options) {
    var arc = [];
    if (options) {
        var start = options.start || 0, rx = pick(options.r, w), ry = pick(options.r, h || w), 
        // Subtract a small number to prevent cos and sin of start and end
        // from becoming equal on 360 arcs (#1561). The size of the circle
        // affects the constant, therefore the division by `rx`. If the
        // proximity is too small, the arc disappears. If it is too great, a
        // gap appears. This can be seen in the animation of the official
        // bubble demo (#20586).
        proximity = 0.0002 / (options.borderRadius ? 1 : Math.max(rx, 1)), fullCircle = (Math.abs((options.end || 0) - start - 2 * Math.PI) <
            proximity), end = (options.end || 0) - (fullCircle ? proximity : 0), innerRadius = options.innerR, open_1 = pick(options.open, fullCircle), cosStart = Math.cos(start), sinStart = Math.sin(start), cosEnd = Math.cos(end), sinEnd = Math.sin(end), 
        // Proximity takes care of rounding errors around PI (#6971)
        longArc = pick(options.longArc, end - start - Math.PI < proximity ? 0 : 1);
        var arcSegment = [
            'A', // ArcTo
            rx, // X radius
            ry, // Y radius
            0, // Slanting
            longArc, // Long or short arc
            pick(options.clockwise, 1), // Clockwise
            cx + rx * cosEnd,
            cy + ry * sinEnd
        ];
        arcSegment.params = { start: start, end: end, cx: cx, cy: cy }; // Memo for border radius
        arc.push([
            'M',
            cx + rx * cosStart,
            cy + ry * sinStart
        ], arcSegment);
        if (defined(innerRadius)) {
            arcSegment = [
                'A', // ArcTo
                innerRadius, // X radius
                innerRadius, // Y radius
                0, // Slanting
                longArc, // Long or short arc
                // Clockwise - opposite to the outer arc clockwise
                defined(options.clockwise) ? 1 - options.clockwise : 0,
                cx + innerRadius * cosStart,
                cy + innerRadius * sinStart
            ];
            // Memo for border radius
            arcSegment.params = {
                start: end,
                end: start,
                cx: cx,
                cy: cy
            };
            arc.push(open_1 ?
                [
                    'M',
                    cx + innerRadius * cosEnd,
                    cy + innerRadius * sinEnd
                ] : [
                'L',
                cx + innerRadius * cosEnd,
                cy + innerRadius * sinEnd
            ], arcSegment);
        }
        if (!open_1) {
            arc.push(['Z']);
        }
    }
    return arc;
}
/**
 * Callout shape used for default tooltips.
 */
function callout(x, y, w, h, options) {
    var arrowLength = 6, halfDistance = 6, r = Math.min((options && options.r) || 0, w, h), safeDistance = r + halfDistance, anchorX = options && options.anchorX, anchorY = options && options.anchorY || 0;
    var path = roundedRect(x, y, w, h, { r: r });
    if (!isNumber(anchorX)) {
        return path;
    }
    // Do not render a connector, if anchor starts inside the label
    if (anchorX < w && anchorX > 0 && anchorY < h && anchorY > 0) {
        return path;
    }
    // Anchor on right side
    if (x + anchorX > w - safeDistance) {
        // Chevron
        if (anchorY > y + safeDistance &&
            anchorY < y + h - safeDistance) {
            path.splice(3, 1, ['L', x + w, anchorY - halfDistance], ['L', x + w + arrowLength, anchorY], ['L', x + w, anchorY + halfDistance], ['L', x + w, y + h - r]);
            // Simple connector
        }
        else {
            if (anchorX < w) { // Corner connector
                var isTopCorner = anchorY < y + safeDistance, cornerY = isTopCorner ? y : y + h, sliceStart = isTopCorner ? 2 : 5;
                path.splice(sliceStart, 0, ['L', anchorX, anchorY], ['L', x + w - r, cornerY]);
            }
            else { // Side connector
                path.splice(3, 1, ['L', x + w, h / 2], ['L', anchorX, anchorY], ['L', x + w, h / 2], ['L', x + w, y + h - r]);
            }
        }
        // Anchor on left side
    }
    else if (x + anchorX < safeDistance) {
        // Chevron
        if (anchorY > y + safeDistance &&
            anchorY < y + h - safeDistance) {
            path.splice(7, 1, ['L', x, anchorY + halfDistance], ['L', x - arrowLength, anchorY], ['L', x, anchorY - halfDistance], ['L', x, y + r]);
            // Simple connector
        }
        else {
            if (anchorX > 0) { // Corner connector
                var isTopCorner = anchorY < y + safeDistance, cornerY = isTopCorner ? y : y + h, sliceStart = isTopCorner ? 1 : 6;
                path.splice(sliceStart, 0, ['L', anchorX, anchorY], ['L', x + r, cornerY]);
            }
            else { // Side connector
                path.splice(7, 1, ['L', x, h / 2], ['L', anchorX, anchorY], ['L', x, h / 2], ['L', x, y + r]);
            }
        }
    }
    else if ( // Replace bottom
    anchorY > h &&
        anchorX < w - safeDistance) {
        path.splice(5, 1, ['L', anchorX + halfDistance, y + h], ['L', anchorX, y + h + arrowLength], ['L', anchorX - halfDistance, y + h], ['L', x + r, y + h]);
    }
    else if ( // Replace top
    anchorY < 0 &&
        anchorX > safeDistance) {
        path.splice(1, 1, ['L', anchorX - halfDistance, y], ['L', anchorX, y - arrowLength], ['L', anchorX + halfDistance, y], ['L', w - r, y]);
    }
    return path;
}
/**
 *
 */
function circle(x, y, w, h) {
    // Return a full arc
    return arc(x + w / 2, y + h / 2, w / 2, h / 2, {
        start: Math.PI * 0.5,
        end: Math.PI * 2.5,
        open: false
    });
}
/**
 *
 */
function diamond(x, y, w, h) {
    return [
        ['M', x + w / 2, y],
        ['L', x + w, y + h / 2],
        ['L', x + w / 2, y + h],
        ['L', x, y + h / 2],
        ['Z']
    ];
}
// #15291
/**
 *
 */
function rect(x, y, w, h, options) {
    if (options && options.r) {
        return roundedRect(x, y, w, h, options);
    }
    return [
        ['M', x, y],
        ['L', x + w, y],
        ['L', x + w, y + h],
        ['L', x, y + h],
        ['Z']
    ];
}
/**
 *
 */
function roundedRect(x, y, w, h, options) {
    var r = (options === null || options === void 0 ? void 0 : options.r) || 0;
    return [
        ['M', x + r, y],
        ['L', x + w - r, y], // Top side
        ['A', r, r, 0, 0, 1, x + w, y + r], // Top-right corner
        ['L', x + w, y + h - r], // Right side
        ['A', r, r, 0, 0, 1, x + w - r, y + h], // Bottom-right corner
        ['L', x + r, y + h], // Bottom side
        ['A', r, r, 0, 0, 1, x, y + h - r], // Bottom-left corner
        ['L', x, y + r], // Left side
        ['A', r, r, 0, 0, 1, x + r, y],
        ['Z'] // Top-left corner
    ];
}
/**
 *
 */
function triangle(x, y, w, h) {
    return [
        ['M', x + w / 2, y],
        ['L', x + w, y + h],
        ['L', x, y + h],
        ['Z']
    ];
}
/**
 *
 */
function triangleDown(x, y, w, h) {
    return [
        ['M', x, y],
        ['L', x + w, y],
        ['L', x + w / 2, y + h],
        ['Z']
    ];
}
var Symbols = {
    arc: arc,
    callout: callout,
    circle: circle,
    diamond: diamond,
    rect: rect,
    roundedRect: roundedRect,
    square: rect,
    triangle: triangle,
    'triangle-down': triangleDown
};
/* *
 *
 *  Default Export
 *
 * */
export default Symbols;
