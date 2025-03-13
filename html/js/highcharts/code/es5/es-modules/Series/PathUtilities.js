/* *
 *
 *  (c) 2010-2024 Pawel Lysy
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var getLinkPath = {
    'default': getDefaultPath,
    straight: getStraightPath,
    curved: getCurvedPath
};
/**
 *
 */
function getDefaultPath(pathParams) {
    var x1 = pathParams.x1, y1 = pathParams.y1, x2 = pathParams.x2, y2 = pathParams.y2, _a = pathParams.width, width = _a === void 0 ? 0 : _a, _b = pathParams.inverted, inverted = _b === void 0 ? false : _b, radius = pathParams.radius, parentVisible = pathParams.parentVisible;
    var path = [
        ['M', x1, y1],
        ['L', x1, y1],
        ['C', x1, y1, x1, y2, x1, y2],
        ['L', x1, y2],
        ['C', x1, y1, x1, y2, x1, y2],
        ['L', x1, y2]
    ];
    return parentVisible ?
        applyRadius([
            ['M', x1, y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y2],
            ['L', x2, y2]
        ], radius) :
        path;
}
/**
 *
 */
function getStraightPath(pathParams) {
    var x1 = pathParams.x1, y1 = pathParams.y1, x2 = pathParams.x2, y2 = pathParams.y2, _a = pathParams.width, width = _a === void 0 ? 0 : _a, _b = pathParams.inverted, inverted = _b === void 0 ? false : _b, parentVisible = pathParams.parentVisible;
    return parentVisible ? [
        ['M', x1, y1],
        ['L', x1 + width * (inverted ? -1 : 1), y2],
        ['L', x2, y2]
    ] : [
        ['M', x1, y1],
        ['L', x1, y2],
        ['L', x1, y2]
    ];
}
/**
 *
 */
function getCurvedPath(pathParams) {
    var x1 = pathParams.x1, y1 = pathParams.y1, x2 = pathParams.x2, y2 = pathParams.y2, _a = pathParams.offset, offset = _a === void 0 ? 0 : _a, _b = pathParams.width, width = _b === void 0 ? 0 : _b, _c = pathParams.inverted, inverted = _c === void 0 ? false : _c, parentVisible = pathParams.parentVisible;
    return parentVisible ?
        [
            ['M', x1, y1],
            [
                'C',
                x1 + offset,
                y1,
                x1 - offset + width * (inverted ? -1 : 1),
                y2,
                x1 + width * (inverted ? -1 : 1),
                y2
            ],
            ['L', x2, y2]
        ] :
        [
            ['M', x1, y1],
            ['C', x1, y1, x1, y2, x1, y2],
            ['L', x2, y2]
        ];
}
/**
 * General function to apply corner radius to a path
 * @private
 */
function applyRadius(path, r) {
    var d = [];
    for (var i = 0; i < path.length; i++) {
        var x = path[i][1];
        var y = path[i][2];
        if (typeof x === 'number' && typeof y === 'number') {
            // MoveTo
            if (i === 0) {
                d.push(['M', x, y]);
            }
            else if (i === path.length - 1) {
                d.push(['L', x, y]);
                // CurveTo
            }
            else if (r) {
                var prevSeg = path[i - 1];
                var nextSeg = path[i + 1];
                if (prevSeg && nextSeg) {
                    var x1 = prevSeg[1], y1 = prevSeg[2], x2 = nextSeg[1], y2 = nextSeg[2];
                    // Only apply to breaks
                    if (typeof x1 === 'number' &&
                        typeof x2 === 'number' &&
                        typeof y1 === 'number' &&
                        typeof y2 === 'number' &&
                        x1 !== x2 &&
                        y1 !== y2) {
                        var directionX = x1 < x2 ? 1 : -1, directionY = y1 < y2 ? 1 : -1;
                        d.push([
                            'L',
                            x - directionX * Math.min(Math.abs(x - x1), r),
                            y - directionY * Math.min(Math.abs(y - y1), r)
                        ], [
                            'C',
                            x,
                            y,
                            x,
                            y,
                            x + directionX * Math.min(Math.abs(x - x2), r),
                            y + directionY * Math.min(Math.abs(y - y2), r)
                        ]);
                    }
                }
                // LineTo
            }
            else {
                d.push(['L', x, y]);
            }
        }
    }
    return d;
}
var PathUtilities = {
    applyRadius: applyRadius,
    getLinkPath: getLinkPath
};
export default PathUtilities;
