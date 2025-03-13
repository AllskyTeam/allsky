/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/geoheatmap
 * @requires highcharts
 *
 * (c) 2009-2024
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/geoheatmap", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/geoheatmap"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 944:
/***/ (function(module) {

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
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ geoheatmap_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/GeoHeatmap/GeoHeatmapPoint.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Authors: Magdalena Gut, Piotr Madej
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();


var MapPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.map.prototype.pointClass;
var isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  Class
 *
 * */
var GeoHeatmapPoint = /** @class */ (function (_super) {
    __extends(GeoHeatmapPoint, _super);
    function GeoHeatmapPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * @private
     */
    GeoHeatmapPoint.prototype.applyOptions = function (options, x) {
        var point = _super.prototype.applyOptions.call(this,
            options,
            x),
            _a = point.options,
            lat = _a.lat,
            lon = _a.lon;
        if (isNumber(lon) && isNumber(lat)) {
            var _b = this.series.options, _c = _b.colsize, colsize = _c === void 0 ? 1 : _c, _d = _b.rowsize, rowsize = _d === void 0 ? 1 : _d, x1 = lon - colsize / 2, y1 = lat - rowsize / 2;
            point.geometry = point.options.geometry = {
                type: 'Polygon',
                // A rectangle centered in lon/lat
                coordinates: [
                    [
                        [x1, y1],
                        [x1 + colsize, y1],
                        [x1 + colsize, y1 + rowsize],
                        [x1, y1 + rowsize],
                        [x1, y1]
                    ]
                ]
            };
        }
        return point;
        /* eslint-enable valid-jsdoc */
    };
    return GeoHeatmapPoint;
}(MapPoint));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var GeoHeatmap_GeoHeatmapPoint = (GeoHeatmapPoint);

;// ./code/es5/es-modules/Series/InterpolationUtilities.js
/* *
 *
 *  (c) 2010-2024 Hubert Kozik
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var doc = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).doc;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Find color of point based on color axis.
 *
 * @function Highcharts.colorFromPoint
 *
 * @param {number | null} value
 *        Value to find corresponding color on the color axis.
 *
 * @param {Highcharts.Point} point
 *        Point to find it's color from color axis.
 *
 * @return {number[]}
 *        Color in RGBa array.
 */
function colorFromPoint(value, point) {
    var colorAxis = point.series.colorAxis;
    if (colorAxis) {
        var rgba = (colorAxis.toColor(value || 0, point)
                .split(')')[0]
                .split('(')[1]
                .split(',')
                .map(function (s) { return pick(parseFloat(s), parseInt(s, 10)); }));
        rgba[3] = pick(rgba[3], 1.0) * 255;
        if (!defined(value) || !point.visible) {
            rgba[3] = 0;
        }
        return rgba;
    }
    return [0, 0, 0, 0];
}
/**
 * Method responsible for creating a canvas for interpolation image.
 * @private
 */
function getContext(series) {
    var canvas = series.canvas,
        context = series.context;
    if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    else {
        series.canvas = doc.createElement('canvas');
        series.context = series.canvas.getContext('2d', {
            willReadFrequently: true
        }) || void 0;
        return series.context;
    }
    return context;
}
var InterpolationUtilities = {
    colorFromPoint: colorFromPoint,
    getContext: getContext
};
/* harmony default export */ var Series_InterpolationUtilities = (InterpolationUtilities);

;// ./code/es5/es-modules/Series/GeoHeatmap/GeoHeatmapSeries.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Authors: Magdalena Gut, Piotr Madej
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var GeoHeatmapSeries_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b,
        p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject, stop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).stop;


var noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;

var GeoHeatmapSeries_colorFromPoint = Series_InterpolationUtilities.colorFromPoint, GeoHeatmapSeries_getContext = Series_InterpolationUtilities.getContext;

var MapSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.map;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, GeoHeatmapSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, isObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isObject, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, GeoHeatmapSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/**
 * Normalize longitute value to -180:180 range.
 * @private
 */
function normalizeLonValue(lon) {
    return lon - Math.floor((lon + 180) / 360) * 360;
}
/**
 * Get proper point's position for PixelData array.
 * @private
 */
function scaledPointPos(lon, lat, canvasWidth, canvasHeight, colsize, rowsize) {
    return Math.ceil((canvasWidth * (canvasHeight - 1 - (lat + 90) / rowsize)) +
        ((lon + 180) / colsize));
}
/* *
 *
 *  Class
 *
 * */
/**
 * The Geo Heatmap series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.geoheatmap
 *
 * @augments Highcharts.Series
 */
var GeoHeatmapSeries = /** @class */ (function (_super) {
    GeoHeatmapSeries_extends(GeoHeatmapSeries, _super);
    function GeoHeatmapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.isDirtyCanvas = true;
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * For updated colsize and rowsize options
     * @private
     */
    GeoHeatmapSeries.prototype.update = function () {
        var series = this;
        series.options = merge(series.options, arguments[0]);
        if (series.getInterpolation().enabled) {
            series.isDirtyCanvas = true;
            series.points.forEach(function (point) {
                if (point.graphic) {
                    point.graphic.destroy();
                    delete point.graphic;
                }
            });
        }
        _super.prototype.update.apply(series, arguments);
    };
    /**
     * Override translate method to not fire if not needed.
     * @private
     */
    GeoHeatmapSeries.prototype.translate = function () {
        if (this.getInterpolation().enabled &&
            this.image &&
            !this.isDirty &&
            !this.isDirtyData) {
            return;
        }
        _super.prototype.translate.apply(this, arguments);
    };
    /**
     * Create the extended object out of the boolean
     * @private
     */
    GeoHeatmapSeries.prototype.getInterpolation = function () {
        if (!isObject(this.options.interpolation)) {
            return {
                blur: 1,
                enabled: this.options.interpolation
            };
        }
        return this.options.interpolation;
    };
    /**
     * Overriding drawPoints original method to apply new features.
     * @private
     */
    GeoHeatmapSeries.prototype.drawPoints = function () {
        var series = this,
            chart = series.chart,
            mapView = chart.mapView,
            seriesOptions = series.options;
        if (series.getInterpolation().enabled && mapView && series.bounds) {
            var ctx = series.context || GeoHeatmapSeries_getContext(series),
                canvas = series.canvas,
                colorAxis = series.colorAxis,
                image_1 = series.image,
                chart_1 = series.chart,
                points = series.points,
                _a = [
                    GeoHeatmapSeries_pick(seriesOptions.colsize, 1),
                    GeoHeatmapSeries_pick(seriesOptions.rowsize, 1)
                ],
                colsize = _a[0],
                rowsize = _a[1], 
                // Calculate dimensions based on series bounds
                topLeft = mapView.projectedUnitsToPixels({
                    x: series.bounds.x1,
                    y: series.bounds.y2
                }),
                bottomRight = mapView.projectedUnitsToPixels({
                    x: series.bounds.x2,
                    y: series.bounds.y1
                });
            if (canvas && ctx && colorAxis && topLeft && bottomRight) {
                var dimensions_1 = {
                        x: topLeft.x,
                        y: topLeft.y,
                        width: bottomRight.x - topLeft.x,
                        height: bottomRight.y - topLeft.y
                    };
                if (
                // Do not calculate new canvas if not necessary
                series.isDirtyCanvas ||
                    // Calculate new canvas if data is dirty
                    series.isDirtyData ||
                    // Always calculate new canvas for Orthographic projection
                    mapView.projection.options.name === 'Orthographic') {
                    series.isDirtyCanvas = true;
                    var canvasWidth = canvas.width = ~~(360 / colsize) + 1, canvasHeight = canvas.height = ~~(180 / rowsize) + 1, canvasArea = canvasWidth * canvasHeight, pixelData = new Uint8ClampedArray(canvasArea * 4);
                    series.directTouch = false; // Needed for tooltip
                    // First pixelData represents the geo coordinates
                    for (var i = 0; i < points.length; i++) {
                        var p = points[i],
                            sourceArr = new Uint8ClampedArray(GeoHeatmapSeries_colorFromPoint(p.value,
                            p)),
                            _b = p.options,
                            lon = _b.lon,
                            lat = _b.lat;
                        if (GeoHeatmapSeries_isNumber(lon) && GeoHeatmapSeries_isNumber(lat)) {
                            pixelData.set(sourceArr, scaledPointPos(lon, lat, canvasWidth, canvasHeight, colsize, rowsize) * 4);
                        }
                    }
                    var blur_1 = series.getInterpolation().blur,
                        blurFactor = blur_1 === 0 ? 1 : blur_1 * 11,
                        upscaledWidth = ~~(canvasWidth * blurFactor),
                        upscaledHeight = ~~(canvasHeight * blurFactor),
                        projectedWidth = ~~dimensions_1.width,
                        projectedHeight = ~~dimensions_1.height,
                        img = new ImageData(pixelData,
                        canvasWidth,
                        canvasHeight);
                    canvas.width = upscaledWidth;
                    canvas.height = upscaledHeight;
                    // Next step is to upscale pixelData to big image to get
                    // the blur on the interpolation
                    ctx.putImageData(img, 0, 0);
                    // Now we have an unscaled version of our ImageData
                    // let's make the compositing mode to 'copy' so that
                    // our next drawing op erases whatever was there
                    // previously just like putImageData would have done
                    ctx.globalCompositeOperation = 'copy';
                    // Now we can draw ourself over ourself
                    ctx.drawImage(canvas, 0, 0, img.width, img.height, // Grab the ImageData
                    0, 0, canvas.width, canvas.height // Scale it
                    );
                    // Add projection to upscaled ImageData
                    var cartesianImageData = ctx.getImageData(0, 0,
                        canvas.width,
                        canvas.height),
                        projectedPixelData = this.getProjectedImageData(mapView,
                        projectedWidth,
                        projectedHeight,
                        cartesianImageData,
                        canvas,
                        dimensions_1.x,
                        dimensions_1.y),
                        projectedImg = new ImageData(projectedPixelData,
                        projectedWidth,
                        projectedHeight);
                    ctx.globalCompositeOperation = 'copy';
                    canvas.width = projectedWidth;
                    canvas.height = projectedHeight;
                    ctx.putImageData(projectedImg, 0, 0);
                }
                if (image_1) {
                    if (chart_1.renderer.globalAnimation && chart_1.hasRendered) {
                        var startX_1 = Number(image_1.attr('x')), startY_1 = Number(image_1.attr('y')), startWidth_1 = Number(image_1.attr('width')), startHeight_1 = Number(image_1.attr('height'));
                        var step_1 = function (now,
                            fx) {
                                image_1.attr({
                                    x: (startX_1 + (dimensions_1.x - startX_1) * fx.pos),
                                    y: (startY_1 + (dimensions_1.y - startY_1) * fx.pos),
                                    width: (startWidth_1 + (dimensions_1.width - startWidth_1) * fx.pos),
                                    height: (startHeight_1 + (dimensions_1.height - startHeight_1) * fx.pos)
                                });
                        };
                        var animOptions = merge(animObject(chart_1.renderer.globalAnimation)),
                            userStep_1 = animOptions.step;
                        animOptions.step =
                            function () {
                                if (userStep_1) {
                                    userStep_1.apply(this, arguments);
                                }
                                step_1.apply(this, arguments);
                            };
                        image_1
                            .attr(merge({ animator: 0 }, series.isDirtyCanvas ? {
                            href: canvas.toDataURL('image/png', 1)
                        } : void 0))
                            .animate({ animator: 1 }, animOptions);
                        // When dragging or first rendering, animation is off
                    }
                    else {
                        stop(image_1);
                        image_1.attr(merge(dimensions_1, series.isDirtyCanvas ? {
                            href: canvas.toDataURL('image/png', 1)
                        } : void 0));
                    }
                }
                else {
                    series.image = chart_1.renderer.image(canvas.toDataURL('image/png', 1))
                        .attr(dimensions_1)
                        .add(series.group);
                }
                series.isDirtyCanvas = false;
            }
        }
        else {
            _super.prototype.drawPoints.apply(series, arguments);
        }
    };
    /**
     * Project ImageData to actual mapView projection used on a chart.
     * @private
     */
    GeoHeatmapSeries.prototype.getProjectedImageData = function (mapView, projectedWidth, projectedHeight, cartesianImageData, canvas, horizontalShift, verticalShift) {
        var _a;
        var projectedPixelData = new Uint8ClampedArray(projectedWidth * projectedHeight * 4), lambda = GeoHeatmapSeries_pick((_a = mapView.projection.options.rotation) === null || _a === void 0 ? void 0 : _a[0], 0), widthFactor = canvas.width / 360, heightFactor = -1 * canvas.height / 180;
        var y = -1;
        // For each pixel on the map plane, find the map
        // coordinate and get the color value
        for (var i = 0; i < projectedPixelData.length; i += 4) {
            var x = (i / 4) % projectedWidth;
            if (x === 0) {
                y++;
            }
            var projectedCoords = mapView.pixelsToLonLat({
                    x: horizontalShift + x,
                    y: verticalShift + y
                });
            if (projectedCoords) {
                // Normalize lon values
                if (projectedCoords.lon > -180 - lambda &&
                    projectedCoords.lon < 180 - lambda) {
                    projectedCoords.lon =
                        normalizeLonValue(projectedCoords.lon);
                }
                var projected = [
                        projectedCoords.lon,
                        projectedCoords.lat
                    ],
                    cvs2PixelX = projected[0] * widthFactor + canvas.width / 2,
                    cvs2PixelY = projected[1] * heightFactor +
                        canvas.height / 2;
                if (cvs2PixelX >= 0 &&
                    cvs2PixelX <= canvas.width &&
                    cvs2PixelY >= 0 &&
                    cvs2PixelY <= canvas.height) {
                    var redPos = (
                        // Rows
                        Math.floor(cvs2PixelY) *
                            canvas.width * 4 +
                            // Columns
                            Math.round(cvs2PixelX) * 4);
                    projectedPixelData[i] =
                        cartesianImageData.data[redPos];
                    projectedPixelData[i + 1] =
                        cartesianImageData.data[redPos + 1];
                    projectedPixelData[i + 2] =
                        cartesianImageData.data[redPos + 2];
                    projectedPixelData[i + 3] =
                        cartesianImageData.data[redPos + 3];
                }
            }
        }
        return projectedPixelData;
    };
    GeoHeatmapSeries.prototype.searchPoint = function (e, compareX) {
        var series = this,
            chart = this.chart,
            mapView = chart.mapView;
        if (mapView &&
            series.bounds &&
            series.image &&
            chart.tooltip &&
            chart.tooltip.options.enabled) {
            if (
            // If user drags map do not build k-d-tree
            !chart.pointer.hasDragged &&
                // If user zooms in/out map do not build k-d-tree
                (+series.image.attr('animator') <= 0.01 ||
                    +series.image.attr('animator') >= 0.99)) {
                var topLeft = mapView.projectedUnitsToPixels({
                        x: series.bounds.x1,
                        y: series.bounds.y2
                    }),
                    bottomRight = mapView.projectedUnitsToPixels({
                        x: series.bounds.x2,
                        y: series.bounds.y1
                    });
                chart.pointer.normalize(e);
                if (e.lon && e.lat &&
                    topLeft && bottomRight &&
                    e.chartX - chart.plotLeft > topLeft.x &&
                    e.chartX - chart.plotLeft < bottomRight.x &&
                    e.chartY - chart.plotTop > topLeft.y &&
                    e.chartY - chart.plotTop < bottomRight.y) {
                    return this.searchKDTree({
                        clientX: e.chartX,
                        lon: normalizeLonValue(e.lon),
                        lat: e.lat
                    }, compareX, e);
                }
            }
            else {
                chart.tooltip.destroy();
            }
        }
    };
    /**
     * A `geoheatmap` series is a variety of heatmap series, composed into
     * the map projection, where the units are expressed in the latitude
     * and longitude, and individual values contained in a matrix are
     * represented as colors.
     *
     * @sample maps/demo/geoheatmap-europe/
     *         GeoHeatmap Chart with interpolation on Europe map
     * @sample maps/series-geoheatmap/geoheatmap-equalearth/
     *         GeoHeatmap Chart on the Equal Earth Projection
     *
     * @extends      plotOptions.map
     * @since        11.0.0
     * @product      highmaps
     * @excluding    allAreas, dragDrop, findNearestPointBy, geometry, joinBy,
     * negativeColor, onPoint, stickyTracking
     * @requires     modules/geoheatmap
     * @optionparent plotOptions.geoheatmap
     */
    GeoHeatmapSeries.defaultOptions = merge(MapSeries.defaultOptions, {
        nullColor: 'transparent',
        tooltip: {
            pointFormat: 'Lat: {point.lat}, Lon: {point.lon}, Value: {point.value}<br/>'
        },
        /**
         * The border width of each geoheatmap tile.
         *
         * In styled mode, the border stroke width is given in the
         * `.highcharts-point` class.
         *
         * @sample maps/demo/geoheatmap-orthographic/
         *         borderWidth set to 1 to create a grid
         *
         * @type      {number|null}
         * @default   0
         * @product   highmaps
         * @apioption plotOptions.geoheatmap.borderWidth
         */
        borderWidth: 0,
        /**
         * The column size - how many longitude units each column in the
         * geoheatmap should span.
         *
         * @sample maps/demo/geoheatmap-europe/
         *         1 by default, set to 5
         *
         * @product   highmaps
         * @apioption plotOptions.geoheatmap.colsize
         */
        colsize: 1,
        /**
         * The main color of the series. In heat maps this color is rarely
         * used, as we mostly use the color to denote the value of each
         * point. Unless options are set in the [colorAxis](#colorAxis), the
         * default value is pulled from the [options.colors](#colors) array.
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @product   highmaps
         * @apioption plotOptions.geoheatmap.color
         */
        /**
         * The rowsize size - how many latitude units each row in the
         * geoheatmap should span.
         *
         * @sample maps/demo/geoheatmap-europe/
         *         1 by default, set to 5
         *
         * @product   highmaps
         * @apioption plotOptions.geoheatmap.rowsize
         */
        rowsize: 1,
        stickyTracking: true,
        /**
         * Make the geoheatmap render its data points as an interpolated
         * image. It can be used to show a Temperature Map-like charts.
         *
         * @sample maps/demo/geoheatmap-earth-statistics
         *         Advanced demo of GeoHeatmap interpolation with multiple
         *         datasets
         *
         * @type      {boolean|Highcharts.InterpolationOptionsObject}
         * @since     11.2.0
         * @product   highmaps
         */
        interpolation: {
            /**
             * Enable or disable the interpolation of the geoheatmap series.
             *
             * @since 11.2.0
             */
            enabled: false,
            /**
             * Represents how much blur should be added to the interpolated
             * image. Works best in the range of 0-1, all higher values
             * would need a lot more performance of the machine to calculate
             * more detailed interpolation.
             *
             *  * **Note:** Useful, if the data is spread into wide range of
             *  longitude and latitude values.
             *
             * @sample maps/series-geoheatmap/turkey-fire-areas
             *         Simple demo of GeoHeatmap interpolation
             *
             * @since  11.2.0
             */
            blur: 1
        }
    });
    return GeoHeatmapSeries;
}(MapSeries));
addEvent(GeoHeatmapSeries, 'afterDataClassLegendClick', function () {
    this.isDirtyCanvas = true;
    this.drawPoints();
});
extend(GeoHeatmapSeries.prototype, {
    type: 'geoheatmap',
    applyJitter: noop,
    pointClass: GeoHeatmap_GeoHeatmapPoint,
    pointArrayMap: ['lon', 'lat', 'value'],
    kdAxisArray: ['lon', 'lat'] // Search k-d-tree by lon/lat values
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('geoheatmap', GeoHeatmapSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var GeoHeatmap_GeoHeatmapSeries = ((/* unused pure expression or super */ null && (GeoHeatmapSeries)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A `geoheatmap` series. If the [type](#series.map.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.geoheatmap
 * @excluding allAreas, dataParser, dataURL, dragDrop, findNearestPointBy,
 *            joinBy, marker, mapData, negativeColor, onPoint, shadow,
 *            stickyTracking
 * @product   highmaps
 * @apioption series.geoheatmap
 */
/**
 * An array of data points for the series. For the `geoheatmap` series
 * type, points can be given in the following ways:
 *
 * 1.  An array of arrays with 3 or 2 values. In this case, the values
 * correspond to `lon,lat,value`. The `value` refers to the color on the `colorAxis`.
 *
 *  ```js
 *     data: [
 *         [51.50, -0.12, 7],
 *         [54.59, -5.93, 4],
 *         [55.8, -4.25, 3]
 *     ]
 *  ```
 *
 * 2.  An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of data
 * points exceeds the series' [turboThreshold](#series.heatmap.turboThreshold),
 * this option is not available.
 *
 *  ```js
 *     data: [{
 *         lat: 51.50,
 *         lon: -0.12,
 *         value: 7,
 *         name: "London"
 *     }, {
 *         lat: 54.59,
 *         lon: -5.93,
 *         value: 4,
 *         name: "Belfast"
 *     }]
 *  ```
 *
 * @sample maps/demo/geoheatmap-europe/
 *         GeoHeatmap Chart with interpolation on Europe map
 * @sample maps/series-geoheatmap/geoheatmap-equalearth/
 *         GeoHeatmap Chart on the Equal Earth Projection
 *
 * @type      {Array<Array<number>|*>}
 * @extends   series.map.data
 * @product   highmaps
 * @apioption series.geoheatmap.data
 */
/**
 * Individual color for the point. By default the color is either used
 * to denote the value, or pulled from the global `colors` array.
 *
 * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
 * @product   highmaps
 * @apioption series.geoheatmap.data.color
 */
/**
 * The value of the point, resulting in a color controlled by options
 * as set in the [colorAxis](#colorAxis) configuration.
 *
 * @type      {number|null}
 * @product   highmaps
 * @apioption series.geoheatmap.data.value
 */
/**
 * Detailed options for interpolation object.
 *
 * @interface Highcharts.InterpolationOptionsObject
 */ /**
*  Enable or disable the interpolation.
*
* @name Highcharts.InterpolationOptionsObject#enabled
* @type {boolean}
*/ /**
* Represents how much blur should be added to the interpolated
* image. Works best in the range of 0-1, all higher values
* would need a lot more performance of the machine to calculate
* more detailed interpolation.
*
* @name Highcharts.InterpolationOptionsObject#blur
* @type {number}
*/
''; // Adds doclets above to the transpiled file

;// ./code/es5/es-modules/masters/modules/geoheatmap.src.js




/* harmony default export */ var geoheatmap_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});