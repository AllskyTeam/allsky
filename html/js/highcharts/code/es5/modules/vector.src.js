/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/vector
 * @requires highcharts
 *
 * Vector plot series module
 *
 * (c) 2010-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/vector", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/vector"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ vector_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/Vector/VectorSeriesDefaults.js
/* *
 *
 *  Vector plot series module
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  API Options
 *
 * */
/**
 * A vector plot is a type of cartesian chart where each point has an X and
 * Y position, a length and a direction. Vectors are drawn as arrows.
 *
 * @sample {highcharts|highstock} highcharts/demo/vector-plot/
 *         Vector pot
 *
 * @since        6.0.0
 * @extends      plotOptions.scatter
 * @excluding    boostThreshold, marker, connectEnds, connectNulls,
 *               cropThreshold, dashStyle, dragDrop, gapSize, gapUnit,
 *               dataGrouping, linecap, shadow, stacking, step, jitter,
 *               boostBlending
 * @product      highcharts highstock
 * @requires     modules/vector
 * @optionparent plotOptions.vector
 */
var VectorSeriesDefaults = {
    /**
     * The line width for each vector arrow.
     */
    lineWidth: 2,
    marker: void 0,
    /**
     * What part of the vector it should be rotated around. Can be one of
     * `start`, `center` and `end`. When `start`, the vectors will start
     * from the given [x, y] position, and when `end` the vectors will end
     * in the [x, y] position.
     *
     * @sample highcharts/plotoptions/vector-rotationorigin-start/
     *         Rotate from start
     *
     * @validvalue ["start", "center", "end"]
     */
    rotationOrigin: 'center',
    states: {
        hover: {
            /**
             * Additonal line width for the vector errors when they are
             * hovered.
             */
            lineWidthPlus: 1
        }
    },
    tooltip: {
        /**
         * @default [{point.x}, {point.y}] Length: {point.length} Direction: {point.direction}°
         */
        pointFormat: '<b>[{point.x}, {point.y}]</b><br/>Length: <b>{point.length}</b><br/>Direction: <b>{point.direction}\u00B0</b><br/>'
    },
    /**
     * Maximum length of the arrows in the vector plot. The individual arrow
     * length is computed between 0 and this value.
     */
    vectorLength: 20
};
/**
 * A `vector` series. If the [type](#series.vector.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.vector
 * @excluding dataParser, dataURL, boostThreshold, boostBlending
 * @product   highcharts highstock
 * @requires  modules/vector
 * @apioption series.vector
 */
/**
 * An array of data points for the series. For the `vector` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 4 values. In this case, the values correspond to
 *    to `x,y,length,direction`. If the first value is a string, it is applied
 *    as the name of the point, and the `x` value is inferred.
 *    ```js
 *    data: [
 *        [0, 0, 10, 90],
 *        [0, 1, 5, 180],
 *        [1, 1, 2, 270]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.area.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 0,
 *        y: 0,
 *        name: "Point2",
 *        length: 10,
 *        direction: 90
 *    }, {
 *        x: 1,
 *        y: 1,
 *        name: "Point1",
 *        direction: 270
 *    }]
 *    ```
 *
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<Array<(number|string),number,number,number>|*>}
 * @extends   series.line.data
 * @product   highcharts highstock
 * @apioption series.vector.data
 */
/**
 * The length of the vector. The rendered length will relate to the
 * `vectorLength` setting.
 *
 * @type      {number}
 * @product   highcharts highstock
 * @apioption series.vector.data.length
 */
/**
 * The vector direction in degrees, where 0 is north (pointing towards south).
 *
 * @type      {number}
 * @product   highcharts highstock
 * @apioption series.vector.data.direction
 */
''; // Adds doclets above to the transpiled file
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Vector_VectorSeriesDefaults = (VectorSeriesDefaults);

;// ./code/es5/es-modules/Series/Vector/VectorSeries.js
/* *
 *
 *  Vector plot series module
 *
 *  (c) 2010-2024 Torstein Honsi
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

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject;


var Series = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, ScatterSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.scatter;

var arrayMax = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMax, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;

/* *
 *
 *  Class
 *
 * */
/**
 * The vector series class.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.vector
 *
 * @augments Highcharts.seriesTypes.scatter
 */
var VectorSeries = /** @class */ (function (_super) {
    __extends(VectorSeries, _super);
    function VectorSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Fade in the arrows on initializing series.
     * @private
     */
    VectorSeries.prototype.animate = function (init) {
        if (init) {
            this.markerGroup.attr({
                opacity: 0.01
            });
        }
        else {
            this.markerGroup.animate({
                opacity: 1
            }, animObject(this.options.animation));
        }
    };
    /**
     * Create a single arrow. It is later rotated around the zero
     * centerpoint.
     * @private
     */
    VectorSeries.prototype.arrow = function (point) {
        var fraction = point.length / this.lengthMax, u = fraction * this.options.vectorLength / 20, o = {
                start: 10 * u,
                center: 0,
                end: -10 * u
            }[this.options.rotationOrigin] || 0, 
            // The stem and the arrow head. Draw the arrow first with rotation
            // 0, which is the arrow pointing down (vector from north to south).
            path = [
                ['M', 0, 7 * u + o], // Base of arrow
                ['L', -1.5 * u, 7 * u + o],
                ['L', 0, 10 * u + o],
                ['L', 1.5 * u, 7 * u + o],
                ['L', 0, 7 * u + o],
                ['L', 0, -10 * u + o] // Top
            ];
        return path;
    };
    /*
    DrawLegendSymbol: function (legend, item) {
        let options = legend.options,
            symbolHeight = legend.symbolHeight,
            square = options.squareSymbol,
            symbolWidth = square ? symbolHeight : legend.symbolWidth,
            path = this.arrow.call({
                lengthMax: 1,
                options: {
                    vectorLength: symbolWidth
                }
            }, {
                length: 1
            });
        legendItem.line = this.chart.renderer.path(path)
        .addClass('highcharts-point')
        .attr({
            zIndex: 3,
            translateY: symbolWidth / 2,
            rotation: 270,
            'stroke-width': 1,
            'stroke': 'black'
        }).add(item.legendItem.group);
    },
    */
    /**
     * @private
     */
    VectorSeries.prototype.drawPoints = function () {
        var chart = this.chart;
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var plotX = point.plotX,
                plotY = point.plotY;
            if (this.options.clip === false ||
                chart.isInsidePlot(plotX, plotY, { inverted: chart.inverted })) {
                if (!point.graphic) {
                    point.graphic = this.chart.renderer
                        .path()
                        .add(this.markerGroup)
                        .addClass('highcharts-point ' +
                        'highcharts-color-' +
                        pick(point.colorIndex, point.series.colorIndex));
                }
                point.graphic
                    .attr({
                    d: this.arrow(point),
                    translateX: plotX,
                    translateY: plotY,
                    rotation: point.direction
                });
                if (!this.chart.styledMode) {
                    point.graphic
                        .attr(this.pointAttribs(point));
                }
            }
            else if (point.graphic) {
                point.graphic = point.graphic.destroy();
            }
        }
    };
    /**
     * Get presentational attributes.
     * @private
     */
    VectorSeries.prototype.pointAttribs = function (point, state) {
        var options = this.options;
        var stroke = (point === null || point === void 0 ? void 0 : point.color) || this.color,
            strokeWidth = this.options.lineWidth;
        if (state) {
            stroke = options.states[state].color || stroke;
            strokeWidth =
                (options.states[state].lineWidth || strokeWidth) +
                    (options.states[state].lineWidthPlus || 0);
        }
        return {
            'stroke': stroke,
            'stroke-width': strokeWidth
        };
    };
    /**
     * @private
     */
    VectorSeries.prototype.translate = function () {
        Series.prototype.translate.call(this);
        this.lengthMax = arrayMax(this.getColumn('length'));
    };
    /* *
     *
     *  Static Properties
     *
     * */
    VectorSeries.defaultOptions = merge(ScatterSeries.defaultOptions, Vector_VectorSeriesDefaults);
    return VectorSeries;
}(ScatterSeries));
extend(VectorSeries.prototype, {
    /**
     * @ignore
     * @deprecated
     */
    drawGraph: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop,
    /**
     * @ignore
     * @deprecated
     */
    getSymbol: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop,
    /**
     * @ignore
     * @deprecated
     */
    markerAttribs: (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop,
    parallelArrays: ['x', 'y', 'length', 'direction'],
    pointArrayMap: ['y', 'length', 'direction']
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('vector', VectorSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Vector_VectorSeries = ((/* unused pure expression or super */ null && (VectorSeries)));

;// ./code/es5/es-modules/masters/modules/vector.src.js




/* harmony default export */ var vector_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});