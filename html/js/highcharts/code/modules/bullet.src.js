/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/bullet
 * @requires highcharts
 *
 * Bullet graph series type for Highcharts
 *
 * (c) 2010-2024 Kacper Madej
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(root["_Highcharts"], root["_Highcharts"]["Series"]["types"]["column"], root["_Highcharts"]["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/bullet", ["highcharts/highcharts"], function (amd1) {return factory(amd1,amd1["Series"],["types"],["column"],amd1["SeriesRegistry"]);});
	else if(typeof exports === 'object')
		exports["highcharts/modules/bullet"] = factory(root["_Highcharts"], root["_Highcharts"]["Series"]["types"]["column"], root["_Highcharts"]["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["Series"]["types"]["column"], root["Highcharts"]["SeriesRegistry"]);
})(typeof window === 'undefined' ? this : window, (__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__448__, __WEBPACK_EXTERNAL_MODULE__512__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 448:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__448__;

/***/ }),

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
  "default": () => (/* binding */ bullet_src)
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series","types","column"],"commonjs":["highcharts","Series","types","column"],"commonjs2":["highcharts","Series","types","column"],"root":["Highcharts","Series","types","column"]}
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_ = __webpack_require__(448);
var highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_);
;// ./code/es-modules/Series/Bullet/BulletPoint.js
/* *
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
 *  Class
 *
 * */
class BulletPoint extends (highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()).prototype.pointClass {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Destroys target graphic.
     * @private
     */
    destroy() {
        const series = this;
        if (series.targetGraphic) {
            series.targetGraphic = series.targetGraphic.destroy();
        }
        super.destroy.apply(series, arguments);
        return;
    }
}
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Bullet_BulletPoint = (BulletPoint);

;// ./code/es-modules/Series/Bullet/BulletSeriesDefaults.js
/* *
 *
 *  Imports
 *
 * */
/* *
 *
 *  API Options
 *
 * */
/**
 * A bullet graph is a variation of a bar graph. The bullet graph features
 * a single measure, compares it to a target, and displays it in the context
 * of qualitative ranges of performance that could be set using
 * [plotBands](#yAxis.plotBands) on [yAxis](#yAxis).
 *
 * @sample {highcharts} highcharts/demo/bullet-graph/
 *         Bullet graph
 *
 * @extends      plotOptions.column
 * @since        6.0.0
 * @product      highcharts
 * @excluding    allAreas, boostThreshold, colorAxis, compare, compareBase,
 *               dataSorting, boostBlending
 * @requires     modules/bullet
 * @optionparent plotOptions.bullet
 */
const BulletSeriesDefaults = {
    /**
     * All options related with look and positioning of targets.
     *
     * @since 6.0.0
     */
    targetOptions: {
        /**
         * The width of the rectangle representing the target. Could be set
         * as a pixel value or as a percentage of a column width.
         *
         * @type  {number|string}
         * @since 6.0.0
         */
        width: '140%',
        /**
         * The height of the rectangle representing the target.
         *
         * @since 6.0.0
         */
        height: 3,
        /**
         * The border color of the rectangle representing the target. When
         * not set, the point's border color is used.
         *
         * In styled mode, use class `highcharts-bullet-target` instead.
         *
         * @type      {Highcharts.ColorString}
         * @since     6.0.0
         * @product   highcharts
         * @apioption plotOptions.bullet.targetOptions.borderColor
         */
        /**
         * The color of the rectangle representing the target. When not set,
         * point's color (if set in point's options -
         * [`color`](#series.bullet.data.color)) or zone of the target value
         * (if [`zones`](#plotOptions.bullet.zones) or
         * [`negativeColor`](#plotOptions.bullet.negativeColor) are set)
         * or the same color as the point has is used.
         *
         * In styled mode, use class `highcharts-bullet-target` instead.
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     6.0.0
         * @product   highcharts
         * @apioption plotOptions.bullet.targetOptions.color
         */
        /**
         * The border width of the rectangle representing the target.
         *
         * In styled mode, use class `highcharts-bullet-target` instead.
         *
         * @since   6.0.0
         */
        borderWidth: 0,
        /**
         * The border radius of the rectangle representing the target.
         */
        borderRadius: 0
    },
    tooltip: {
        pointFormat: '<span style="color:{series.color}">\u25CF</span>' +
            ' {series.name}: <b>{point.y}</b>. Target: <b>{point.target}' +
            '</b><br/>'
    }
};
/**
 * A `bullet` series. If the [type](#series.bullet.type) option is not
 * specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.bullet
 * @since     6.0.0
 * @product   highcharts
 * @excluding dataParser, dataURL, marker, boostThreshold,
 *            boostBlending
 * @requires  modules/bullet
 * @apioption series.bullet
 */
/**
 * An array of data points for the series. For the `bullet` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 3 or 2 values. In this case, the values correspond
 *    to `x,y,target`. If the first value is a string, it is applied as the name
 *    of the point, and the `x` value is inferred. The `x` value can also be
 *    omitted, in which case the inner arrays should be of length 2\. Then the
 *    `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *    data: [
 *        [0, 40, 75],
 *        [1, 50, 50],
 *        [2, 60, 40]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.bullet.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 0,
 *        y: 40,
 *        target: 75,
 *        name: "Point1",
 *        color: "#00FF00"
 *    }, {
 *         x: 1,
 *        y: 60,
 *        target: 40,
 *        name: "Point2",
 *        color: "#FF00FF"
 *    }]
 *    ```
 *
 * @type      {Array<Array<(number|string),number>|Array<(number|string),number,number>|*>}
 * @extends   series.column.data
 * @since     6.0.0
 * @product   highcharts
 * @apioption series.bullet.data
 */
/**
 * The target value of a point.
 *
 * @type      {number}
 * @since     6.0.0
 * @product   highcharts
 * @apioption series.bullet.data.target
 */
/**
 * Individual target options for each point.
 *
 * @extends   plotOptions.bullet.targetOptions
 * @product   highcharts
 * @apioption series.bullet.data.targetOptions
 */
/**
 * @product   highcharts
 * @excluding halo, lineWidth, lineWidthPlus, marker
 * @apioption series.bullet.states.hover
 */
/**
 * @product   highcharts
 * @excluding halo, lineWidth, lineWidthPlus, marker
 * @apioption series.bullet.states.select
 */
''; // Keeps doclets above separate
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Bullet_BulletSeriesDefaults = (BulletSeriesDefaults);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es-modules/Series/Bullet/BulletSeries.js
/* *
 *
 *  (c) 2010-2024 Kacper Madej
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */






const { extend, isNumber, merge, pick, relativeLength } = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
/* *
 *
 *  Class
 *
 * */
/**
 * The bullet series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.bullet
 *
 * @augments Highcharts.Series
 */
class BulletSeries extends (highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()) {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Draws the targets. For inverted chart, the `series.group` is rotated,
     * so the same coordinates apply. This method is based on column series
     * drawPoints function.
     *
     * @ignore
     * @function Highcharts.Series#drawPoints
     */
    drawPoints() {
        const series = this, chart = series.chart, options = series.options, animationLimit = options.animationLimit || 250;
        super.drawPoints.apply(this, arguments);
        for (const point of series.points) {
            const pointOptions = point.options, targetVal = point.target, pointVal = point.y;
            let targetShapeArgs, targetGraphic = point.targetGraphic, width, height, targetOptions, y;
            if (isNumber(targetVal) && targetVal !== null) {
                targetOptions = merge(options.targetOptions, pointOptions.targetOptions);
                height = targetOptions.height;
                let shapeArgs = point.shapeArgs;
                // #15547
                if (point.dlBox && shapeArgs && !isNumber(shapeArgs.width)) {
                    shapeArgs = point.dlBox;
                }
                width = relativeLength(targetOptions.width, shapeArgs.width);
                y = series.yAxis.translate(targetVal, false, true, false, true) - targetOptions.height / 2 - 0.5;
                targetShapeArgs = series.crispCol.apply({
                    // Use fake series object to set borderWidth of target
                    chart: chart,
                    borderWidth: targetOptions.borderWidth,
                    options: {
                        crisp: options.crisp
                    }
                }, [
                    (shapeArgs.x +
                        shapeArgs.width / 2 - width / 2),
                    y,
                    width,
                    height
                ]);
                if (targetGraphic) {
                    // Update
                    targetGraphic[chart.pointCount < animationLimit ?
                        'animate' :
                        'attr'](targetShapeArgs);
                    // Add or remove tooltip reference
                    if (isNumber(pointVal) && pointVal !== null) {
                        targetGraphic.element.point = point;
                    }
                    else {
                        targetGraphic.element.point = void 0;
                    }
                }
                else {
                    point.targetGraphic = targetGraphic = chart.renderer
                        .rect()
                        .attr(targetShapeArgs)
                        .add(series.group);
                }
                // Presentational
                if (!chart.styledMode) {
                    targetGraphic.attr({
                        fill: pick(targetOptions.color, pointOptions.color, (series.zones.length && (point.getZone.call({
                            series: series,
                            x: point.x,
                            y: targetVal,
                            options: {}
                        }).color || series.color)) || void 0, point.color, series.color),
                        stroke: pick(targetOptions.borderColor, point.borderColor, series.options.borderColor),
                        'stroke-width': targetOptions.borderWidth,
                        r: targetOptions.borderRadius
                    });
                }
                // Add tooltip reference
                if (isNumber(pointVal) && pointVal !== null) {
                    targetGraphic.element.point = point;
                }
                targetGraphic.addClass(point.getClassName() +
                    ' highcharts-bullet-target', true);
            }
            else if (targetGraphic) {
                // #1269:
                point.targetGraphic = targetGraphic.destroy();
            }
        }
    }
    /**
     * Includes target values to extend extremes from y values.
     *
     * @ignore
     * @function Highcharts.Series#getExtremes
     */
    getExtremes(yData) {
        const dataExtremes = super.getExtremes.call(this, yData), targetData = this.targetData;
        if (targetData && targetData.length) {
            const targetExtremes = super.getExtremes.call(this, targetData);
            if (isNumber(targetExtremes.dataMin)) {
                dataExtremes.dataMin = Math.min(pick(dataExtremes.dataMin, Infinity), targetExtremes.dataMin);
            }
            if (isNumber(targetExtremes.dataMax)) {
                dataExtremes.dataMax = Math.max(pick(dataExtremes.dataMax, -Infinity), targetExtremes.dataMax);
            }
        }
        return dataExtremes;
    }
}
/* *
 *
 *  Static Properties
 *
 * */
BulletSeries.defaultOptions = merge((highcharts_Series_types_column_commonjs_highcharts_Series_types_column_commonjs2_highcharts_Series_types_column_root_Highcharts_Series_types_column_default()).defaultOptions, Bullet_BulletSeriesDefaults);
extend(BulletSeries.prototype, {
    parallelArrays: ['x', 'y', 'target'],
    pointArrayMap: ['y', 'target']
});
BulletSeries.prototype.pointClass = Bullet_BulletPoint;
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('bullet', BulletSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ const Bullet_BulletSeries = ((/* unused pure expression or super */ null && (BulletSeries)));

;// ./code/es-modules/masters/modules/bullet.src.js




/* harmony default export */ const bullet_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});