/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/wordcloud
 * @requires highcharts
 *
 * (c) 2016-2024 Highsoft AS
 * Authors: Jon Arild Nygard
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(root["_Highcharts"], root["_Highcharts"]["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/wordcloud", ["highcharts/highcharts"], function (amd1) {return factory(amd1,amd1["SeriesRegistry"]);});
	else if(typeof exports === 'object')
		exports["highcharts/modules/wordcloud"] = factory(root["_Highcharts"], root["_Highcharts"]["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"]);
})(typeof window === 'undefined' ? this : window, (__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 512:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 944:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__944__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ wordcloud_src)
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es-modules/Series/DrawPointUtilities.js
/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Functions
 *
 * */
/**
 * Handles the drawing of a component.
 * Can be used for any type of component that reserves the graphic property,
 * and provides a shouldDraw on its context.
 *
 * @private
 *
 * @todo add type checking.
 * @todo export this function to enable usage
 */
function draw(point, params) {
    const { animatableAttribs, onComplete, css, renderer } = params;
    const animation = (point.series && point.series.chart.hasRendered) ?
        // Chart-level animation on updates
        void 0 :
        // Series-level animation on new points
        (point.series &&
            point.series.options.animation);
    let graphic = point.graphic;
    params.attribs = {
        ...params.attribs,
        'class': point.getClassName()
    } || {};
    if ((point.shouldDraw())) {
        if (!graphic) {
            if (params.shapeType === 'text') {
                graphic = renderer.text();
            }
            else if (params.shapeType === 'image') {
                graphic = renderer.image(params.imageUrl || '')
                    .attr(params.shapeArgs || {});
            }
            else {
                graphic = renderer[params.shapeType](params.shapeArgs || {});
            }
            point.graphic = graphic;
            graphic.add(params.group);
        }
        if (css) {
            graphic.css(css);
        }
        graphic
            .attr(params.attribs)
            .animate(animatableAttribs, params.isNew ? false : animation, onComplete);
    }
    else if (graphic) {
        const destroy = () => {
            point.graphic = graphic = (graphic && graphic.destroy());
            if (typeof onComplete === 'function') {
                onComplete();
            }
        };
        // Animate only runs complete callback if something was animated.
        if (Object.keys(animatableAttribs).length) {
            graphic.animate(animatableAttribs, void 0, () => destroy());
        }
        else {
            destroy();
        }
    }
}
/* *
 *
 *  Default Export
 *
 * */
const DrawPointUtilities = {
    draw
};
/* harmony default export */ const Series_DrawPointUtilities = (DrawPointUtilities);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es-modules/Series/Wordcloud/WordcloudPoint.js
/* *
 *
 *  Experimental Highcharts module which enables visualization of a word cloud.
 *
 *  (c) 2016-2024 Highsoft AS
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 * */


const { column: { prototype: { pointClass: ColumnPoint } } } = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes;

const { extend } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 *  Class
 *
 * */
class WordcloudPoint extends ColumnPoint {
    /* *
     *
     *  Functions
     *
     * */
    isValid() {
        return true;
    }
}
extend(WordcloudPoint.prototype, {
    weight: 1
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Wordcloud_WordcloudPoint = (WordcloudPoint);

;// ./code/es-modules/Series/Wordcloud/WordcloudSeriesDefaults.js
/* *
 *
 *  Experimental Highcharts module which enables visualization of a word cloud.
 *
 *  (c) 2016-2024 Highsoft AS
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 * */

/* *
 *
 *  API Options
 *
 * */
/**
 * A word cloud is a visualization of a set of words, where the size and
 * placement of a word is determined by how it is weighted.
 *
 * @sample highcharts/demo/wordcloud Word Cloud chart
 *
 * @extends      plotOptions.column
 * @excluding    allAreas, boostThreshold, clip, colorAxis, compare,
 *               compareBase, crisp, cropThreshold, dataGrouping,
 *               dataLabels, depth, dragDrop, edgeColor, findNearestPointBy,
 *               getExtremesFromAll, grouping, groupPadding, groupZPadding,
 *               joinBy, maxPointWidth, minPointLength, navigatorOptions,
 *               negativeColor, pointInterval, pointIntervalUnit,
 *               pointPadding, pointPlacement, pointRange, pointStart,
 *               pointWidth, pointStart, pointWidth, shadow, showCheckbox,
 *               showInNavigator, softThreshold, stacking, threshold,
 *               zoneAxis, zones, dataSorting, boostBlending
 * @product      highcharts
 * @since        6.0.0
 * @requires     modules/wordcloud
 * @optionparent plotOptions.wordcloud
 */
const WordcloudSeriesDefaults = {
    /**
     * If there is no space for a word on the playing field, then this
     * option will allow the playing field to be extended to fit the word.
     * If false then the word will be dropped from the visualization.
     *
     * NB! This option is currently not decided to be published in the API,
     * and is therefore marked as private.
     *
     * @ignore-option
     */
    allowExtendPlayingField: true,
    animation: {
        /** @internal */
        duration: 500
    },
    borderWidth: 0,
    /**
     * @ignore-option
     */
    clip: false, // Something goes wrong with clip. // @todo fix this
    colorByPoint: true,
    cropThreshold: Infinity,
    /**
     * A threshold determining the minimum font size that can be applied to
     * a word.
     */
    minFontSize: 1,
    /**
     * The word with the largest weight will have a font size equal to this
     * value. The font size of a word is the ratio between its weight and
     * the largest occuring weight, multiplied with the value of
     * maxFontSize.
     */
    maxFontSize: 25,
    /**
     * This option decides which algorithm is used for placement, and
     * rotation of a word. The choice of algorith is therefore a crucial
     * part of the resulting layout of the wordcloud. It is possible for
     * users to add their own custom placement strategies for use in word
     * cloud. Read more about it in our
     * [documentation](https://www.highcharts.com/docs/chart-and-series-types/word-cloud-series#custom-placement-strategies)
     *
     * @validvalue ["center", "random"]
     */
    placementStrategy: 'center',
    /**
     * Rotation options for the words in the wordcloud.
     *
     * @sample highcharts/plotoptions/wordcloud-rotation
     *         Word cloud with rotation
     */
    rotation: {
        /**
         * The smallest degree of rotation for a word.
         */
        from: 0,
        /**
         * The number of possible orientations for a word, within the range
         * of `rotation.from` and `rotation.to`. Must be a number larger
         * than 0.
         */
        orientations: 2,
        /**
         * The largest degree of rotation for a word.
         */
        to: 90
    },
    showInLegend: false,
    /**
     * Spiral used for placing a word after the initial position
     * experienced a collision with either another word or the borders.
     * It is possible for users to add their own custom spiralling
     * algorithms for use in word cloud. Read more about it in our
     * [documentation](https://www.highcharts.com/docs/chart-and-series-types/word-cloud-series#custom-spiralling-algorithm)
     *
     * @validvalue ["archimedean", "rectangular", "square"]
     */
    spiral: 'rectangular',
    /**
     * CSS styles for the words.
     *
     * @type    {Highcharts.CSSObject}
     * @default {"fontFamily":"sans-serif", "fontWeight": "900"}
     */
    style: {
        /** @ignore-option */
        fontFamily: 'sans-serif',
        /** @ignore-option */
        fontWeight: '900',
        /** @ignore-option */
        whiteSpace: 'nowrap'
    },
    tooltip: {
        followPointer: true,
        pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.weight}</b><br/>'
    }
};
/**
 * A `wordcloud` series. If the [type](#series.wordcloud.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.wordcloud
 * @exclude   dataSorting, boostThreshold, boostBlending
 * @product   highcharts
 * @requires  modules/wordcloud
 * @apioption series.wordcloud
 */
/**
 * An array of data points for the series. For the `wordcloud` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 2 values. In this case, the values correspond to
 *    `name,weight`.
 *    ```js
 *    data: [
 *        ['Lorem', 4],
 *        ['Ipsum', 1]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.arearange.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        name: "Lorem",
 *        weight: 4
 *    }, {
 *        name: "Ipsum",
 *        weight: 1
 *    }]
 *    ```
 *
 * @type      {Array<Array<string,number>|*>}
 * @extends   series.line.data
 * @excluding drilldown, marker, x, y
 * @product   highcharts
 * @apioption series.wordcloud.data
 */
/**
 * The name decides the text for a word.
 *
 * @type      {string}
 * @since     6.0.0
 * @product   highcharts
 * @apioption series.wordcloud.data.name
 */
/**
 * The weighting of a word. The weight decides the relative size of a word
 * compared to the rest of the collection.
 *
 * @type      {number}
 * @since     6.0.0
 * @product   highcharts
 * @apioption series.wordcloud.data.weight
 */
''; // Detach doclets above
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Wordcloud_WordcloudSeriesDefaults = (WordcloudSeriesDefaults);

;// ./code/es-modules/Series/Wordcloud/WordcloudUtils.js
/* *
 *
 *  Experimental Highcharts module which enables visualization of a word cloud.
 *
 *  (c) 2016-2024 Highsoft AS
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 * */


const { deg2rad } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());

const { extend: WordcloudUtils_extend, find, isNumber, isObject, merge } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 * Functions
 *
 * */
/**
 * Detects if there is a collision between two rectangles.
 *
 * @private
 * @function isRectanglesIntersecting
 *
 * @param {Highcharts.PolygonBoxObject} r1
 * First rectangle.
 *
 * @param {Highcharts.PolygonBoxObject} r2
 * Second rectangle.
 *
 * @return {boolean}
 * Returns true if the rectangles overlap.
 */
function isRectanglesIntersecting(r1, r2) {
    return !(r2.left > r1.right ||
        r2.right < r1.left ||
        r2.top > r1.bottom ||
        r2.bottom < r1.top);
}
/**
 * Calculates the normals to a line between two points.
 *
 * @private
 * @function getNormals
 * @param {Highcharts.PolygonPointObject} p1
 *        Start point for the line. Array of x and y value.
 * @param {Highcharts.PolygonPointObject} p2
 *        End point for the line. Array of x and y value.
 * @return {Highcharts.PolygonObject}
 *         Returns the two normals in an array.
 */
function getNormals(p1, p2) {
    const dx = p2[0] - p1[0], // X2 - x1
    dy = p2[1] - p1[1]; // Y2 - y1
    return [
        [-dy, dx],
        [dy, -dx]
    ];
}
/**
 * @private
 */
function getAxesFromPolygon(polygon) {
    let points, axes = polygon.axes || [];
    if (!axes.length) {
        axes = [];
        points = points = polygon.concat([polygon[0]]);
        points.reduce((p1, p2) => {
            const normals = getNormals(p1, p2), axis = normals[0]; // Use the left normal as axis.
            // Check that the axis is unique.
            if (!find(axes, (existing) => existing[0] === axis[0] &&
                existing[1] === axis[1])) {
                axes.push(axis);
            }
            // Return p2 to be used as p1 in next iteration.
            return p2;
        });
        polygon.axes = axes;
    }
    return axes;
}
/**
 * Projects a polygon onto a coordinate.
 *
 * @private
 * @function project
 * @param {Highcharts.PolygonObject} polygon
 * Array of points in a polygon.
 * @param {Highcharts.PolygonPointObject} target
 * The coordinate of pr
 */
function project(polygon, target) {
    const products = polygon.map((point) => {
        const ax = point[0], ay = point[1], bx = target[0], by = target[1];
        return ax * bx + ay * by;
    });
    return {
        min: Math.min.apply(this, products),
        max: Math.max.apply(this, products)
    };
}
/**
 * @private
 */
function isPolygonsOverlappingOnAxis(axis, polygon1, polygon2) {
    const projection1 = project(polygon1, axis), projection2 = project(polygon2, axis), isOverlapping = !(projection2.min > projection1.max ||
        projection2.max < projection1.min);
    return !isOverlapping;
}
/**
 * Checks whether two convex polygons are colliding by using the Separating
 * Axis Theorem.
 *
 * @private
 * @function isPolygonsColliding
 * @param {Highcharts.PolygonObject} polygon1
 *        First polygon.
 *
 * @param {Highcharts.PolygonObject} polygon2
 *        Second polygon.
 *
 * @return {boolean}
 *         Returns true if they are colliding, otherwise false.
 */
function isPolygonsColliding(polygon1, polygon2) {
    // Get the axis from both polygons.
    const axes1 = getAxesFromPolygon(polygon1), axes2 = getAxesFromPolygon(polygon2), axes = axes1.concat(axes2), overlappingOnAllAxes = !find(axes, (axis) => isPolygonsOverlappingOnAxis(axis, polygon1, polygon2));
    return overlappingOnAllAxes;
}
/**
 * Detects if a word collides with any previously placed words.
 *
 * @private
 * @function intersectsAnyWord
 *
 * @param {Highcharts.Point} point
 * Point which the word is connected to.
 *
 * @param {Array<Highcharts.Point>} points
 * Previously placed points to check against.
 *
 * @return {boolean}
 * Returns true if there is collision.
 */
function intersectsAnyWord(point, points) {
    const rect = point.rect, polygon = point.polygon, lastCollidedWith = point.lastCollidedWith, isIntersecting = function (p) {
        let result = isRectanglesIntersecting(rect, p.rect);
        if (result &&
            (point.rotation % 90 || p.rotation % 90)) {
            result = isPolygonsColliding(polygon, p.polygon);
        }
        return result;
    };
    let intersects = false;
    // If the point has already intersected a different point, chances are
    // they are still intersecting. So as an enhancement we check this
    // first.
    if (lastCollidedWith) {
        intersects = isIntersecting(lastCollidedWith);
        // If they no longer intersects, remove the cache from the point.
        if (!intersects) {
            delete point.lastCollidedWith;
        }
    }
    // If not already found, then check if we can find a point that is
    // intersecting.
    if (!intersects) {
        intersects = !!find(points, function (p) {
            const result = isIntersecting(p);
            if (result) {
                point.lastCollidedWith = p;
            }
            return result;
        });
    }
    return intersects;
}
/**
 * Gives a set of cordinates for an Archimedian Spiral.
 *
 * @private
 * @function archimedeanSpiral
 *
 * @param {number} attempt
 * How far along the spiral we have traversed.
 *
 * @param {Highcharts.WordcloudSpiralParamsObject} [params]
 * Additional parameters.
 *
 * @return {boolean|Highcharts.PositionObject}
 * Resulting coordinates, x and y. False if the word should be dropped from
 * the visualization.
 */
function archimedeanSpiral(attempt, params) {
    const field = params.field, maxDelta = (field.width * field.width) + (field.height * field.height), t = attempt * 0.8; // 0.2 * 4 = 0.8. Enlarging the spiral.
    let result = false;
    // Emergency brake. TODO make spiralling logic more foolproof.
    if (attempt <= 10000) {
        result = {
            x: t * Math.cos(t),
            y: t * Math.sin(t)
        };
        if (!(Math.min(Math.abs(result.x), Math.abs(result.y)) < maxDelta)) {
            result = false;
        }
    }
    return result;
}
/**
 * Gives a set of coordinates for an rectangular spiral.
 *
 * @private
 * @function squareSpiral
 *
 * @param {number} attempt
 * How far along the spiral we have traversed.
 *
 * @param {Highcharts.WordcloudSpiralParamsObject} [params]
 * Additional parameters.
 *
 * @return {boolean|Highcharts.PositionObject}
 * Resulting coordinates, x and y. False if the word should be dropped from
 * the visualization.
 */
function squareSpiral(attempt, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
params) {
    const a = attempt * 4, k = Math.ceil((Math.sqrt(a) - 1) / 2), isBoolean = (x) => (typeof x === 'boolean');
    let t = 2 * k + 1, m = Math.pow(t, 2), result = false;
    t -= 1;
    if (attempt <= 10000) {
        if (isBoolean(result) && a >= m - t) {
            result = {
                x: k - (m - a),
                y: -k
            };
        }
        m -= t;
        if (isBoolean(result) && a >= m - t) {
            result = {
                x: -k,
                y: -k + (m - a)
            };
        }
        m -= t;
        if (isBoolean(result)) {
            if (a >= m - t) {
                result = {
                    x: -k + (m - a),
                    y: k
                };
            }
            else {
                result = {
                    x: k,
                    y: k - (m - a - t)
                };
            }
        }
        result.x *= 5;
        result.y *= 5;
    }
    return result;
}
/**
 * Gives a set of coordinates for an rectangular spiral.
 *
 * @private
 * @function rectangularSpiral
 *
 * @param {number} attempt
 * How far along the spiral we have traversed.
 *
 * @param {Highcharts.WordcloudSpiralParamsObject} [params]
 * Additional parameters.
 *
 * @return {boolean|Higcharts.PositionObject}
 * Resulting coordinates, x and y. False if the word should be dropped from
 * the visualization.
 */
function rectangularSpiral(attempt, params) {
    const result = squareSpiral(attempt, params), field = params.field;
    if (result) {
        result.x *= field.ratioX;
        result.y *= field.ratioY;
    }
    return result;
}
/**
 * @private
 * @function getRandomPosition
 *
 * @param {number} size
 * Random factor.
 *
 * @return {number}
 * Random position.
 */
function getRandomPosition(size) {
    return Math.round((size * (Math.random() + 0.5)) / 2);
}
/**
 * Calculates the proper scale to fit the cloud inside the plotting area.
 *
 * @private
 * @function getScale
 *
 * @param {number} targetWidth
 * Width of target area.
 *
 * @param {number} targetHeight
 * Height of target area.
 *
 * @param {Object} field
 * The playing field.
 *
 * @return {number}
 * Returns the value to scale the playing field up to the size of the target
 * area.
 */
function getScale(targetWidth, targetHeight, field) {
    const height = Math.max(Math.abs(field.top), Math.abs(field.bottom)) * 2, width = Math.max(Math.abs(field.left), Math.abs(field.right)) * 2, scaleX = width > 0 ? 1 / width * targetWidth : 1, scaleY = height > 0 ? 1 / height * targetHeight : 1;
    return Math.min(scaleX, scaleY);
}
/**
 * Calculates what is called the playing field. The field is the area which
 * all the words are allowed to be positioned within. The area is
 * proportioned to match the target aspect ratio.
 *
 * @private
 * @function getPlayingField
 *
 * @param {number} targetWidth
 * Width of the target area.
 *
 * @param {number} targetHeight
 * Height of the target area.
 *
 * @param {Array<Highcharts.Point>} data
 * Array of points.
 *
 * @param {Object} data.dimensions
 * The height and width of the word.
 *
 * @return {Object}
 * The width and height of the playing field.
 */
function getPlayingField(targetWidth, targetHeight, data) {
    const info = data.reduce(function (obj, point) {
        const dimensions = point.dimensions, x = Math.max(dimensions.width, dimensions.height);
        // Find largest height.
        obj.maxHeight = Math.max(obj.maxHeight, dimensions.height);
        // Find largest width.
        obj.maxWidth = Math.max(obj.maxWidth, dimensions.width);
        // Sum up the total maximum area of all the words.
        obj.area += x * x;
        return obj;
    }, {
        maxHeight: 0,
        maxWidth: 0,
        area: 0
    }), 
    /**
     * Use largest width, largest height, or root of total area to give
     * size to the playing field.
     */
    x = Math.max(info.maxHeight, // Have enough space for the tallest word
    info.maxWidth, // Have enough space for the broadest word
    // Adjust 15% to account for close packing of words
    Math.sqrt(info.area) * 0.85), ratioX = targetWidth > targetHeight ? targetWidth / targetHeight : 1, ratioY = targetHeight > targetWidth ? targetHeight / targetWidth : 1;
    return {
        width: x * ratioX,
        height: x * ratioY,
        ratioX: ratioX,
        ratioY: ratioY
    };
}
/**
 * Calculates a number of degrees to rotate, based upon a number of
 * orientations within a range from-to.
 *
 * @private
 * @function getRotation
 *
 * @param {number} [orientations]
 * Number of orientations.
 *
 * @param {number} [index]
 * Index of point, used to decide orientation.
 *
 * @param {number} [from]
 * The smallest degree of rotation.
 *
 * @param {number} [to]
 * The largest degree of rotation.
 *
 * @return {boolean|number}
 * Returns the resulting rotation for the word. Returns false if invalid
 * input parameters.
 */
function getRotation(orientations, index, from, to) {
    let result = false, // Default to false
    range, intervals, orientation;
    // Check if we have valid input parameters.
    if (isNumber(orientations) &&
        isNumber(index) &&
        isNumber(from) &&
        isNumber(to) &&
        orientations > 0 &&
        index > -1 &&
        to > from) {
        range = to - from;
        intervals = range / (orientations - 1 || 1);
        orientation = index % orientations;
        result = from + (orientation * intervals);
    }
    return result;
}
/**
 * Calculates the spiral positions and store them in scope for quick access.
 *
 * @private
 * @function getSpiral
 *
 * @param {Function} fn
 * The spiral function.
 *
 * @param {Object} params
 * Additional parameters for the spiral.
 *
 * @return {Function}
 * Function with access to spiral positions.
 */
function getSpiral(fn, params) {
    const length = 10000, arr = [];
    for (let i = 1; i < length; i++) {
        // @todo unnecessary amount of precalculation
        arr.push(fn(i, params));
    }
    return (attempt) => (attempt <= length ? arr[attempt - 1] : false);
}
/**
 * Detects if a word is placed outside the playing field.
 *
 * @private
 * @function outsidePlayingField
 *
 * @param {Highcharts.PolygonBoxObject} rect
 * The word box.
 *
 * @param {Highcharts.WordcloudFieldObject} field
 * The width and height of the playing field.
 *
 * @return {boolean}
 * Returns true if the word is placed outside the field.
 */
function outsidePlayingField(rect, field) {
    const playingField = {
        left: -(field.width / 2),
        right: field.width / 2,
        top: -(field.height / 2),
        bottom: field.height / 2
    };
    return !(playingField.left < rect.left &&
        playingField.right > rect.right &&
        playingField.top < rect.top &&
        playingField.bottom > rect.bottom);
}
/**
 * @private
 */
function movePolygon(deltaX, deltaY, polygon) {
    return polygon.map(function (point) {
        return [
            point[0] + deltaX,
            point[1] + deltaY
        ];
    });
}
/**
 * Check if a point intersects with previously placed words, or if it goes
 * outside the field boundaries. If a collision, then try to adjusts the
 * position.
 *
 * @private
 * @function intersectionTesting
 *
 * @param {Highcharts.Point} point
 * Point to test for intersections.
 *
 * @param {Highcharts.WordcloudTestOptionsObject} options
 * Options object.
 *
 * @return {boolean|Highcharts.PositionObject}
 * Returns an object with how much to correct the positions. Returns false
 * if the word should not be placed at all.
 */
function intersectionTesting(point, options) {
    const placed = options.placed, field = options.field, rectangle = options.rectangle, polygon = options.polygon, spiral = options.spiral, 
    // Make a copy to update values during intersection testing.
    rect = point.rect = WordcloudUtils_extend({}, rectangle);
    let attempt = 1, delta = {
        x: 0,
        y: 0
    };
    point.polygon = polygon;
    point.rotation = options.rotation;
    /* While w intersects any previously placed words:
        do {
        move w a little bit along a spiral path
        } while any part of w is outside the playing field and
                the spiral radius is still smallish */
    while (delta !== false &&
        (intersectsAnyWord(point, placed) ||
            outsidePlayingField(rect, field))) {
        delta = spiral(attempt);
        if (isObject(delta)) {
            // Update the DOMRect with new positions.
            rect.left = rectangle.left + delta.x;
            rect.right = rectangle.right + delta.x;
            rect.top = rectangle.top + delta.y;
            rect.bottom = rectangle.bottom + delta.y;
            point.polygon = movePolygon(delta.x, delta.y, polygon);
        }
        attempt++;
    }
    return delta;
}
/**
 * Extends the playing field to have enough space to fit a given word.
 *
 * @private
 * @function extendPlayingField
 *
 * @param {Highcharts.WordcloudFieldObject} field
 * The width, height and ratios of a playing field.
 *
 * @param {Highcharts.PolygonBoxObject} rectangle
 * The bounding box of the word to add space for.
 *
 * @return {Highcharts.WordcloudFieldObject}
 * Returns the extended playing field with updated height and width.
 */
function extendPlayingField(field, rectangle) {
    let height, width, ratioX, ratioY, x, extendWidth, extendHeight, result;
    if (isObject(field) && isObject(rectangle)) {
        height = (rectangle.bottom - rectangle.top);
        width = (rectangle.right - rectangle.left);
        ratioX = field.ratioX;
        ratioY = field.ratioY;
        // Use the same variable to extend both the height and width.
        x = ((width * ratioX) > (height * ratioY)) ? width : height;
        // Multiply variable with ratios to preserve aspect ratio.
        extendWidth = x * ratioX;
        extendHeight = x * ratioY;
        // Calculate the size of the new field after adding
        // space for the word.
        result = merge(field, {
            // Add space on the left and right.
            width: field.width + (extendWidth * 2),
            // Add space on the top and bottom.
            height: field.height + (extendHeight * 2)
        });
    }
    else {
        result = field;
    }
    // Return the new extended field.
    return result;
}
/**
 * If a rectangle is outside a give field, then the boundaries of the field
 * is adjusted accordingly. Modifies the field object which is passed as the
 * first parameter.
 *
 * @private
 * @function updateFieldBoundaries
 *
 * @param {Highcharts.WordcloudFieldObject} field
 * The bounding box of a playing field.
 *
 * @param {Highcharts.PolygonBoxObject} rectangle
 * The bounding box for a placed point.
 *
 * @return {Highcharts.WordcloudFieldObject}
 * Returns a modified field object.
 */
function updateFieldBoundaries(field, rectangle) {
    // @todo improve type checking.
    if (!isNumber(field.left) || field.left > rectangle.left) {
        field.left = rectangle.left;
    }
    if (!isNumber(field.right) || field.right < rectangle.right) {
        field.right = rectangle.right;
    }
    if (!isNumber(field.top) || field.top > rectangle.top) {
        field.top = rectangle.top;
    }
    if (!isNumber(field.bottom) || field.bottom < rectangle.bottom) {
        field.bottom = rectangle.bottom;
    }
    return field;
}
/**
 * Alternative solution to correctFloat.
 * E.g Highcharts.correctFloat(123, 2) returns 120, when it should be 123.
 *
 * @private
 * @function correctFloat
 */
function correctFloat(number, precision) {
    const p = isNumber(precision) ? precision : 14, magnitude = Math.pow(10, p);
    return Math.round(number * magnitude) / magnitude;
}
/**
 * @private
 */
function getBoundingBoxFromPolygon(points) {
    return points.reduce(function (obj, point) {
        const x = point[0], y = point[1];
        obj.left = Math.min(x, obj.left);
        obj.right = Math.max(x, obj.right);
        obj.bottom = Math.max(y, obj.bottom);
        obj.top = Math.min(y, obj.top);
        return obj;
    }, {
        left: Number.MAX_VALUE,
        right: -Number.MAX_VALUE,
        bottom: -Number.MAX_VALUE,
        top: Number.MAX_VALUE
    });
}
/**
 * @private
 */
function getPolygon(x, y, width, height, rotation) {
    const origin = [x, y], left = x - (width / 2), right = x + (width / 2), top = y - (height / 2), bottom = y + (height / 2), polygon = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom]
    ];
    return polygon.map(function (point) {
        return rotate2DToPoint(point, origin, -rotation);
    });
}
/**
 * Rotates a point clockwise around the origin.
 *
 * @private
 * @function rotate2DToOrigin
 * @param {Highcharts.PolygonPointObject} point
 *        The x and y coordinates for the point.
 * @param {number} angle
 *        The angle of rotation.
 * @return {Highcharts.PolygonPointObject}
 *         The x and y coordinate for the rotated point.
 */
function rotate2DToOrigin(point, angle) {
    const x = point[0], y = point[1], rad = deg2rad * -angle, cosAngle = Math.cos(rad), sinAngle = Math.sin(rad);
    return [
        correctFloat(x * cosAngle - y * sinAngle),
        correctFloat(x * sinAngle + y * cosAngle)
    ];
}
/**
 * Rotate a point clockwise around another point.
 *
 * @private
 * @function rotate2DToPoint
 * @param {Highcharts.PolygonPointObject} point
 *        The x and y coordinates for the point.
 * @param {Highcharts.PolygonPointObject} origin
 *        The point to rotate around.
 * @param {number} angle
 *        The angle of rotation.
 * @return {Highcharts.PolygonPointObject}
 *         The x and y coordinate for the rotated point.
 */
function rotate2DToPoint(point, origin, angle) {
    const x = point[0] - origin[0], y = point[1] - origin[1], rotated = rotate2DToOrigin([x, y], angle);
    return [
        rotated[0] + origin[0],
        rotated[1] + origin[1]
    ];
}
/* *
 *
 *  Default Export
 *
 * */
const WordcloudUtils = {
    archimedeanSpiral,
    extendPlayingField,
    getBoundingBoxFromPolygon,
    getPlayingField,
    getPolygon,
    getRandomPosition,
    getRotation,
    getScale,
    getSpiral,
    intersectionTesting,
    isPolygonsColliding,
    isRectanglesIntersecting,
    rectangularSpiral,
    rotate2DToOrigin,
    rotate2DToPoint,
    squareSpiral,
    updateFieldBoundaries
};
/* harmony default export */ const Wordcloud_WordcloudUtils = (WordcloudUtils);

;// ./code/es-modules/Series/Wordcloud/WordcloudSeries.js
/* *
 *
 *  Experimental Highcharts module which enables visualization of a word cloud.
 *
 *  (c) 2016-2024 Highsoft AS
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 * */



const { noop } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());

const { column: ColumnSeries } = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes;

const { extend: WordcloudSeries_extend, isArray, isNumber: WordcloudSeries_isNumber, isObject: WordcloudSeries_isObject, merge: WordcloudSeries_merge } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());



const { archimedeanSpiral: WordcloudSeries_archimedeanSpiral, extendPlayingField: WordcloudSeries_extendPlayingField, getBoundingBoxFromPolygon: WordcloudSeries_getBoundingBoxFromPolygon, getPlayingField: WordcloudSeries_getPlayingField, getPolygon: WordcloudSeries_getPolygon, getRandomPosition: WordcloudSeries_getRandomPosition, getRotation: WordcloudSeries_getRotation, getScale: WordcloudSeries_getScale, getSpiral: WordcloudSeries_getSpiral, intersectionTesting: WordcloudSeries_intersectionTesting, isPolygonsColliding: WordcloudSeries_isPolygonsColliding, rectangularSpiral: WordcloudSeries_rectangularSpiral, rotate2DToOrigin: WordcloudSeries_rotate2DToOrigin, rotate2DToPoint: WordcloudSeries_rotate2DToPoint, squareSpiral: WordcloudSeries_squareSpiral, updateFieldBoundaries: WordcloudSeries_updateFieldBoundaries } = Wordcloud_WordcloudUtils;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.wordcloud
 *
 * @augments Highcharts.Series
 */
class WordcloudSeries extends ColumnSeries {
    /**
     *
     * Functions
     *
     */
    pointAttribs(point, state) {
        const attribs = highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default().seriesTypes.column.prototype
            .pointAttribs.call(this, point, state);
        delete attribs.stroke;
        delete attribs['stroke-width'];
        return attribs;
    }
    /**
     * Calculates the fontSize of a word based on its weight.
     *
     * @private
     * @function Highcharts.Series#deriveFontSize
     *
     * @param {number} [relativeWeight=0]
     * The weight of the word, on a scale 0-1.
     *
     * @param {number} [maxFontSize=1]
     * The maximum font size of a word.
     *
     * @param {number} [minFontSize=1]
     * The minimum font size of a word.
     *
     * @return {number}
     * Returns the resulting fontSize of a word. If minFontSize is larger then
     * maxFontSize the result will equal minFontSize.
     */
    deriveFontSize(relativeWeight, maxFontSize, minFontSize) {
        const weight = WordcloudSeries_isNumber(relativeWeight) ? relativeWeight : 0, max = WordcloudSeries_isNumber(maxFontSize) ? maxFontSize : 1, min = WordcloudSeries_isNumber(minFontSize) ? minFontSize : 1;
        return Math.floor(Math.max(min, weight * max));
    }
    drawPoints() {
        const series = this, hasRendered = series.hasRendered, xAxis = series.xAxis, yAxis = series.yAxis, chart = series.chart, group = series.group, options = series.options, animation = options.animation, allowExtendPlayingField = options.allowExtendPlayingField, renderer = chart.renderer, placed = [], placementStrategy = series.placementStrategy[options.placementStrategy], rotation = options.rotation, weights = series.points.map(function (p) {
            return p.weight;
        }), maxWeight = Math.max.apply(null, weights), 
        // `concat()` prevents from sorting the original array.
        points = series.points.concat().sort((a, b) => (b.weight - a.weight // Sort descending
        ));
        let testElement = renderer.text().add(group), field;
        // Reset the scale before finding the dimensions (#11993).
        // SVGGRaphicsElement.getBBox() (used in SVGElement.getBBox(boolean))
        // returns slightly different values for the same element depending on
        // whether it is rendered in a group which has already defined scale
        // (e.g. 6) or in the group without a scale (scale = 1).
        series.group.attr({
            scaleX: 1,
            scaleY: 1
        });
        // Get the dimensions for each word.
        // Used in calculating the playing field.
        for (const point of points) {
            const relativeWeight = 1 / maxWeight * point.weight, fontSize = series.deriveFontSize(relativeWeight, options.maxFontSize, options.minFontSize), css = WordcloudSeries_extend({
                fontSize: fontSize + 'px'
            }, options.style);
            testElement.css(css).attr({
                x: 0,
                y: 0,
                text: point.name
            });
            const bBox = testElement.getBBox(true);
            point.dimensions = {
                height: bBox.height,
                width: bBox.width
            };
        }
        // Calculate the playing field.
        field = WordcloudSeries_getPlayingField(xAxis.len, yAxis.len, points);
        const spiral = WordcloudSeries_getSpiral(series.spirals[options.spiral], {
            field: field
        });
        // Draw all the points.
        for (const point of points) {
            const relativeWeight = 1 / maxWeight * point.weight, fontSize = series.deriveFontSize(relativeWeight, options.maxFontSize, options.minFontSize), css = WordcloudSeries_extend({
                fontSize: fontSize + 'px'
            }, options.style), placement = placementStrategy(point, {
                data: points,
                field: field,
                placed: placed,
                rotation: rotation
            }), attr = WordcloudSeries_extend(series.pointAttribs(point, (point.selected && 'select')), {
                align: 'center',
                'alignment-baseline': 'middle',
                'dominant-baseline': 'middle', // #15973: Firefox
                x: placement.x,
                y: placement.y,
                text: point.name,
                rotation: WordcloudSeries_isNumber(placement.rotation) ?
                    placement.rotation :
                    void 0
            }), polygon = WordcloudSeries_getPolygon(placement.x, placement.y, point.dimensions.width, point.dimensions.height, placement.rotation), rectangle = WordcloudSeries_getBoundingBoxFromPolygon(polygon);
            let delta = WordcloudSeries_intersectionTesting(point, {
                rectangle: rectangle,
                polygon: polygon,
                field: field,
                placed: placed,
                spiral: spiral,
                rotation: placement.rotation
            }), animate;
            // If there is no space for the word, extend the playing field.
            if (!delta && allowExtendPlayingField) {
                // Extend the playing field to fit the word.
                field = WordcloudSeries_extendPlayingField(field, rectangle);
                // Run intersection testing one more time to place the word.
                delta = WordcloudSeries_intersectionTesting(point, {
                    rectangle: rectangle,
                    polygon: polygon,
                    field: field,
                    placed: placed,
                    spiral: spiral,
                    rotation: placement.rotation
                });
            }
            // Check if point was placed, if so delete it, otherwise place it
            // on the correct positions.
            if (WordcloudSeries_isObject(delta)) {
                attr.x = (attr.x || 0) + delta.x;
                attr.y = (attr.y || 0) + delta.y;
                rectangle.left += delta.x;
                rectangle.right += delta.x;
                rectangle.top += delta.y;
                rectangle.bottom += delta.y;
                field = WordcloudSeries_updateFieldBoundaries(field, rectangle);
                placed.push(point);
                point.isNull = false;
                point.isInside = true; // #15447
            }
            else {
                point.isNull = true;
            }
            if (animation) {
                // Animate to new positions
                animate = {
                    x: attr.x,
                    y: attr.y
                };
                // Animate from center of chart
                if (!hasRendered) {
                    attr.x = 0;
                    attr.y = 0;
                    // Or animate from previous position
                }
                else {
                    delete attr.x;
                    delete attr.y;
                }
            }
            Series_DrawPointUtilities.draw(point, {
                animatableAttribs: animate,
                attribs: attr,
                css: css,
                group: group,
                renderer: renderer,
                shapeArgs: void 0,
                shapeType: 'text'
            });
        }
        // Destroy the element after use.
        testElement = testElement.destroy();
        // Scale the series group to fit within the plotArea.
        const scale = WordcloudSeries_getScale(xAxis.len, yAxis.len, field);
        series.group.attr({
            scaleX: scale,
            scaleY: scale
        });
    }
    hasData() {
        const series = this;
        return (WordcloudSeries_isObject(series) &&
            series.visible === true &&
            isArray(series.points) &&
            series.points.length > 0);
    }
    getPlotBox() {
        const series = this, chart = series.chart, inverted = chart.inverted, 
        // Swap axes for inverted (#2339)
        xAxis = series[(inverted ? 'yAxis' : 'xAxis')], yAxis = series[(inverted ? 'xAxis' : 'yAxis')], width = xAxis ? xAxis.len : chart.plotWidth, height = yAxis ? yAxis.len : chart.plotHeight, x = xAxis ? xAxis.left : chart.plotLeft, y = yAxis ? yAxis.top : chart.plotTop;
        return {
            translateX: x + (width / 2),
            translateY: y + (height / 2),
            scaleX: 1, // #1623
            scaleY: 1
        };
    }
}
/* *
 *
 *  Static properties
 *
 * */
WordcloudSeries.defaultOptions = WordcloudSeries_merge(ColumnSeries.defaultOptions, Wordcloud_WordcloudSeriesDefaults);
WordcloudSeries_extend(WordcloudSeries.prototype, {
    animate: noop,
    animateDrilldown: noop,
    animateDrillupFrom: noop,
    isCartesian: false,
    pointClass: Wordcloud_WordcloudPoint,
    setClip: noop,
    // Strategies used for deciding rotation and initial position of a word. To
    // implement a custom strategy, have a look at the function random for
    // example.
    placementStrategy: {
        random: function (point, options) {
            const field = options.field, r = options.rotation;
            return {
                x: WordcloudSeries_getRandomPosition(field.width) - (field.width / 2),
                y: WordcloudSeries_getRandomPosition(field.height) - (field.height / 2),
                rotation: WordcloudSeries_getRotation(r.orientations, point.index, r.from, r.to)
            };
        },
        center: function (point, options) {
            const r = options.rotation;
            return {
                x: 0,
                y: 0,
                rotation: WordcloudSeries_getRotation(r.orientations, point.index, r.from, r.to)
            };
        }
    },
    pointArrayMap: ['weight'],
    // Spirals used for placing a word after the initial position experienced a
    // collision with either another word or the borders. To implement a custom
    // spiral, look at the function archimedeanSpiral for example.
    spirals: {
        'archimedean': WordcloudSeries_archimedeanSpiral,
        'rectangular': WordcloudSeries_rectangularSpiral,
        'square': WordcloudSeries_squareSpiral
    },
    utils: {
        extendPlayingField: WordcloudSeries_extendPlayingField,
        getRotation: WordcloudSeries_getRotation,
        isPolygonsColliding: WordcloudSeries_isPolygonsColliding,
        rotate2DToOrigin: WordcloudSeries_rotate2DToOrigin,
        rotate2DToPoint: WordcloudSeries_rotate2DToPoint
    }
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('wordcloud', WordcloudSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Wordcloud_WordcloudSeries = ((/* unused pure expression or super */ null && (WordcloudSeries)));

;// ./code/es-modules/masters/modules/wordcloud.src.js




/* harmony default export */ const wordcloud_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});