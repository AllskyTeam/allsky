/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/color-axis
 * @requires highcharts
 *
 * ColorAxis module
 *
 * (c) 2012-2024 Pawel Potaczek
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["Axis"], require("highcharts")["Color"], require("highcharts")["LegendSymbol"], require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"], require("highcharts")["Series"], require("highcharts")["Chart"], require("highcharts")["SVGRenderer"], require("highcharts")["Templating"], require("highcharts")["Series"]["types"]["scatter"], require("highcharts")["Point"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/map", [["highcharts/highcharts"], ["highcharts/highcharts","Axis"], ["highcharts/highcharts","Color"], ["highcharts/highcharts","LegendSymbol"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","SVGElement"], ["highcharts/highcharts","Series"], ["highcharts/highcharts","Chart"], ["highcharts/highcharts","SVGRenderer"], ["highcharts/highcharts","Templating"], ["highcharts/highcharts","Series","types","scatter"], ["highcharts/highcharts","Point"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/map"] = factory(require("highcharts"), require("highcharts")["Axis"], require("highcharts")["Color"], require("highcharts")["LegendSymbol"], require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"], require("highcharts")["Series"], require("highcharts")["Chart"], require("highcharts")["SVGRenderer"], require("highcharts")["Templating"], require("highcharts")["Series"]["types"]["scatter"], require("highcharts")["Point"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["Axis"], root["Highcharts"]["Color"], root["Highcharts"]["LegendSymbol"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["SVGElement"], root["Highcharts"]["Series"], root["Highcharts"]["Chart"], root["Highcharts"]["SVGRenderer"], root["Highcharts"]["Templating"], root["Highcharts"]["Series"]["types"]["scatter"], root["Highcharts"]["Point"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__532__, __WEBPACK_EXTERNAL_MODULE__620__, __WEBPACK_EXTERNAL_MODULE__500__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__28__, __WEBPACK_EXTERNAL_MODULE__820__, __WEBPACK_EXTERNAL_MODULE__960__, __WEBPACK_EXTERNAL_MODULE__540__, __WEBPACK_EXTERNAL_MODULE__984__, __WEBPACK_EXTERNAL_MODULE__632__, __WEBPACK_EXTERNAL_MODULE__260__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 532:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__532__;

/***/ }),

/***/ 960:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__960__;

/***/ }),

/***/ 620:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__620__;

/***/ }),

/***/ 500:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__500__;

/***/ }),

/***/ 260:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__260__;

/***/ }),

/***/ 28:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__28__;

/***/ }),

/***/ 540:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__540__;

/***/ }),

/***/ 632:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__632__;

/***/ }),

/***/ 820:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__820__;

/***/ }),

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 984:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__984__;

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
  "default": function() { return /* binding */ map_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Axis"],"commonjs":["highcharts","Axis"],"commonjs2":["highcharts","Axis"],"root":["Highcharts","Axis"]}
var highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_ = __webpack_require__(532);
var highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_default = /*#__PURE__*/__webpack_require__.n(highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Color"],"commonjs":["highcharts","Color"],"commonjs2":["highcharts","Color"],"root":["Highcharts","Color"]}
var highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_ = __webpack_require__(620);
var highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default = /*#__PURE__*/__webpack_require__.n(highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_);
;// ./code/es5/es-modules/Core/Axis/Color/ColorAxisComposition.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var color = (highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default()).parse;

var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, splat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).splat;
/* *
 *
 *  Composition
 *
 * */
var ColorAxisComposition;
(function (ColorAxisComposition) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Variables
     *
     * */
    var ColorAxisConstructor;
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(ColorAxisClass, ChartClass, FxClass, LegendClass, SeriesClass) {
        var chartProto = ChartClass.prototype,
            fxProto = FxClass.prototype,
            seriesProto = SeriesClass.prototype;
        if (!chartProto.collectionsWithUpdate.includes('colorAxis')) {
            ColorAxisConstructor = ColorAxisClass;
            chartProto.collectionsWithUpdate.push('colorAxis');
            chartProto.collectionsWithInit.colorAxis = [
                chartProto.addColorAxis
            ];
            addEvent(ChartClass, 'afterCreateAxes', onChartAfterCreateAxes);
            wrapChartCreateAxis(ChartClass);
            fxProto.fillSetter = wrapFxFillSetter;
            fxProto.strokeSetter = wrapFxStrokeSetter;
            addEvent(LegendClass, 'afterGetAllItems', onLegendAfterGetAllItems);
            addEvent(LegendClass, 'afterColorizeItem', onLegendAfterColorizeItem);
            addEvent(LegendClass, 'afterUpdate', onLegendAfterUpdate);
            extend(seriesProto, {
                optionalAxis: 'colorAxis',
                translateColors: seriesTranslateColors
            });
            extend(seriesProto.pointClass.prototype, {
                setVisible: pointSetVisible
            });
            addEvent(SeriesClass, 'afterTranslate', onSeriesAfterTranslate, { order: 1 });
            addEvent(SeriesClass, 'bindAxes', onSeriesBindAxes);
        }
    }
    ColorAxisComposition.compose = compose;
    /**
     * Extend the chart createAxes method to also make the color axis.
     * @private
     */
    function onChartAfterCreateAxes() {
        var _this = this;
        var userOptions = this.userOptions;
        this.colorAxis = [];
        // If a `colorAxis` config is present in the user options (not in a
        // theme), instanciate it.
        if (userOptions.colorAxis) {
            userOptions.colorAxis = splat(userOptions.colorAxis);
            userOptions.colorAxis.map(function (axisOptions) { return (new ColorAxisConstructor(_this, axisOptions)); });
        }
    }
    /**
     * Add the color axis. This also removes the axis' own series to prevent
     * them from showing up individually.
     * @private
     */
    function onLegendAfterGetAllItems(e) {
        var _this = this;
        var colorAxes = this.chart.colorAxis || [],
            destroyItem = function (item) {
                var i = e.allItems.indexOf(item);
            if (i !== -1) {
                // #15436
                _this.destroyItem(e.allItems[i]);
                e.allItems.splice(i, 1);
            }
        };
        var colorAxisItems = [],
            options,
            i;
        colorAxes.forEach(function (colorAxis) {
            options = colorAxis.options;
            if (options && options.showInLegend) {
                // Data classes
                if (options.dataClasses && options.visible) {
                    colorAxisItems = colorAxisItems.concat(colorAxis.getDataClassLegendSymbols());
                    // Gradient legend
                }
                else if (options.visible) {
                    // Add this axis on top
                    colorAxisItems.push(colorAxis);
                }
                // If dataClasses are defined or showInLegend option is not set
                // to true, do not add color axis' series to legend.
                colorAxis.series.forEach(function (series) {
                    if (!series.options.showInLegend || options.dataClasses) {
                        if (series.options.legendType === 'point') {
                            series.points.forEach(function (point) {
                                destroyItem(point);
                            });
                        }
                        else {
                            destroyItem(series);
                        }
                    }
                });
            }
        });
        i = colorAxisItems.length;
        while (i--) {
            e.allItems.unshift(colorAxisItems[i]);
        }
    }
    /**
     * @private
     */
    function onLegendAfterColorizeItem(e) {
        if (e.visible && e.item.legendColor) {
            e.item.legendItem.symbol.attr({
                fill: e.item.legendColor
            });
        }
    }
    /**
     * Updates in the legend need to be reflected in the color axis. (#6888)
     * @private
     */
    function onLegendAfterUpdate(e) {
        var _a;
        (_a = this.chart.colorAxis) === null || _a === void 0 ? void 0 : _a.forEach(function (colorAxis) {
            colorAxis.update({}, e.redraw);
        });
    }
    /**
     * Calculate and set colors for points.
     * @private
     */
    function onSeriesAfterTranslate() {
        if (this.chart.colorAxis &&
            this.chart.colorAxis.length ||
            this.colorAttribs) {
            this.translateColors();
        }
    }
    /**
     * Add colorAxis to series axisTypes.
     * @private
     */
    function onSeriesBindAxes() {
        var axisTypes = this.axisTypes;
        if (!axisTypes) {
            this.axisTypes = ['colorAxis'];
        }
        else if (axisTypes.indexOf('colorAxis') === -1) {
            axisTypes.push('colorAxis');
        }
    }
    /**
     * Set the visibility of a single point
     * @private
     * @function Highcharts.colorPointMixin.setVisible
     * @param {boolean} visible
     */
    function pointSetVisible(vis) {
        var point = this,
            method = vis ? 'show' : 'hide';
        point.visible = point.options.visible = Boolean(vis);
        // Show and hide associated elements
        ['graphic', 'dataLabel'].forEach(function (key) {
            if (point[key]) {
                point[key][method]();
            }
        });
        this.series.buildKDTree(); // Rebuild kdtree #13195
    }
    ColorAxisComposition.pointSetVisible = pointSetVisible;
    /**
     * In choropleth maps, the color is a result of the value, so this needs
     * translation too
     * @private
     * @function Highcharts.colorSeriesMixin.translateColors
     */
    function seriesTranslateColors() {
        var series = this,
            points = this.getPointsCollection(), // #17945
            nullColor = this.options.nullColor,
            colorAxis = this.colorAxis,
            colorKey = this.colorKey;
        points.forEach(function (point) {
            var value = point.getNestedProperty(colorKey),
                color = point.options.color || (point.isNull || point.value === null ?
                    nullColor :
                    (colorAxis && typeof value !== 'undefined') ?
                        colorAxis.toColor(value,
                point) :
                        point.color || series.color);
            if (color && point.color !== color) {
                point.color = color;
                if (series.options.legendType === 'point' &&
                    point.legendItem &&
                    point.legendItem.label) {
                    series.chart.legend.colorizeItem(point, point.visible);
                }
            }
        });
    }
    /**
     * @private
     */
    function wrapChartCreateAxis(ChartClass) {
        var superCreateAxis = ChartClass.prototype.createAxis;
        ChartClass.prototype.createAxis = function (type, options) {
            var chart = this;
            if (type !== 'colorAxis') {
                return superCreateAxis.apply(chart, arguments);
            }
            var axis = new ColorAxisConstructor(chart,
                merge(options.axis, {
                    index: chart[type].length,
                    isX: false
                }));
            chart.isDirtyLegend = true;
            // Clear before 'bindAxes' (#11924)
            chart.axes.forEach(function (axis) {
                axis.series = [];
            });
            chart.series.forEach(function (series) {
                series.bindAxes();
                series.isDirtyData = true;
            });
            if (pick(options.redraw, true)) {
                chart.redraw(options.animation);
            }
            return axis;
        };
    }
    /**
     * Handle animation of the color attributes directly.
     * @private
     */
    function wrapFxFillSetter() {
        this.elem.attr('fill', color(this.start).tweenTo(color(this.end), this.pos), void 0, true);
    }
    /**
     * Handle animation of the color attributes directly.
     * @private
     */
    function wrapFxStrokeSetter() {
        this.elem.attr('stroke', color(this.start).tweenTo(color(this.end), this.pos), void 0, true);
    }
})(ColorAxisComposition || (ColorAxisComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Color_ColorAxisComposition = (ColorAxisComposition);

;// ./code/es5/es-modules/Core/Axis/Color/ColorAxisDefaults.js
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
 *  API Options
 *
 * */
/**
 * A color axis for series. Visually, the color
 * axis will appear as a gradient or as separate items inside the
 * legend, depending on whether the axis is scalar or based on data
 * classes.
 *
 * For supported color formats, see the
 * [docs article about colors](https://www.highcharts.com/docs/chart-design-and-style/colors).
 *
 * A scalar color axis is represented by a gradient. The colors either
 * range between the [minColor](#colorAxis.minColor) and the
 * [maxColor](#colorAxis.maxColor), or for more fine grained control the
 * colors can be defined in [stops](#colorAxis.stops). Often times, the
 * color axis needs to be adjusted to get the right color spread for the
 * data. In addition to stops, consider using a logarithmic
 * [axis type](#colorAxis.type), or setting [min](#colorAxis.min) and
 * [max](#colorAxis.max) to avoid the colors being determined by
 * outliers.
 *
 * When [dataClasses](#colorAxis.dataClasses) are used, the ranges are
 * subdivided into separate classes like categories based on their
 * values. This can be used for ranges between two values, but also for
 * a true category. However, when your data is categorized, it may be as
 * convenient to add each category to a separate series.
 *
 * Color axis does not work with: `sankey`, `sunburst`, `dependencywheel`,
 * `networkgraph`, `wordcloud`, `venn`, `gauge` and `solidgauge` series
 * types.
 *
 * Since v7.2.0 `colorAxis` can also be an array of options objects.
 *
 * See [the Axis object](/class-reference/Highcharts.Axis) for
 * programmatic access to the axis.
 *
 * @sample       {highcharts} highcharts/coloraxis/custom-color-key
 *               Column chart with color axis
 * @sample       {highcharts} highcharts/coloraxis/horizontal-layout
 *               Horizontal layout
 * @sample       {highmaps} maps/coloraxis/dataclasscolor
 *               With data classes
 * @sample       {highmaps} maps/coloraxis/mincolor-maxcolor
 *               Min color and max color
 *
 * @extends      xAxis
 * @excluding    alignTicks, allowDecimals, alternateGridColor, breaks,
 *               categories, crosshair, dateTimeLabelFormats, left,
 *               lineWidth, linkedTo, maxZoom, minRange, minTickInterval,
 *               offset, opposite, pane, plotBands, plotLines,
 *               reversedStacks, scrollbar, showEmpty, title, top,
 *               zoomEnabled
 * @product      highcharts highstock highmaps
 * @type         {*|Array<*>}
 * @optionparent colorAxis
 */
var colorAxisDefaults = {
    /**
     * Whether to allow decimals on the color axis.
     * @type      {boolean}
     * @default   true
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.allowDecimals
     */
    /**
     * Determines how to set each data class' color if no individual
     * color is set. The default value, `tween`, computes intermediate
     * colors between `minColor` and `maxColor`. The other possible
     * value, `category`, pulls colors from the global or chart specific
     * [colors](#colors) array.
     *
     * @sample {highmaps} maps/coloraxis/dataclasscolor/
     *         Category colors
     *
     * @type       {string}
     * @default    tween
     * @product    highcharts highstock highmaps
     * @validvalue ["tween", "category"]
     * @apioption  colorAxis.dataClassColor
     */
    /**
     * An array of data classes or ranges for the choropleth map. If
     * none given, the color axis is scalar and values are distributed
     * as a gradient between the minimum and maximum colors.
     *
     * @sample {highmaps} maps/demo/data-class-ranges/
     *         Multiple ranges
     *
     * @sample {highmaps} maps/demo/data-class-two-ranges/
     *         Two ranges
     *
     * @type      {Array<*>}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.dataClasses
     */
    /**
     * The layout of the color axis. Can be `'horizontal'` or `'vertical'`.
     * If none given, the color axis has the same layout as the legend.
     *
     * @sample highcharts/coloraxis/horizontal-layout/
     *         Horizontal color axis layout with vertical legend
     *
     * @type      {string|undefined}
     * @since     7.2.0
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.layout
     */
    /**
     * The color of each data class. If not set, the color is pulled
     * from the global or chart-specific [colors](#colors) array. In
     * styled mode, this option is ignored. Instead, use colors defined
     * in CSS.
     *
     * @sample {highmaps} maps/demo/data-class-two-ranges/
     *         Explicit colors
     *
     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.dataClasses.color
     */
    /**
     * The start of the value range that the data class represents,
     * relating to the point value.
     *
     * The range of each `dataClass` is closed in both ends, but can be
     * overridden by the next `dataClass`.
     *
     * @type      {number}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.dataClasses.from
     */
    /**
     * The name of the data class as it appears in the legend.
     * If no name is given, it is automatically created based on the
     * `from` and `to` values. For full programmatic control,
     * [legend.labelFormatter](#legend.labelFormatter) can be used.
     * In the formatter, `this.from` and `this.to` can be accessed.
     *
     * @sample {highmaps} maps/coloraxis/dataclasses-name/
     *         Named data classes
     *
     * @sample {highmaps} maps/coloraxis/dataclasses-labelformatter/
     *         Formatted data classes
     *
     * @type      {string}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.dataClasses.name
     */
    /**
     * The end of the value range that the data class represents,
     * relating to the point value.
     *
     * The range of each `dataClass` is closed in both ends, but can be
     * overridden by the next `dataClass`.
     *
     * @type      {number}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.dataClasses.to
     */
    /** @ignore-option */
    lineWidth: 0,
    /**
     * Padding of the min value relative to the length of the axis. A
     * padding of 0.05 will make a 100px axis 5px longer.
     *
     * @product highcharts highstock highmaps
     */
    minPadding: 0,
    /**
     * The maximum value of the axis in terms of map point values. If
     * `null`, the max value is automatically calculated. If the
     * `endOnTick` option is true, the max value might be rounded up.
     *
     * @sample {highmaps} maps/coloraxis/gridlines/
     *         Explicit min and max to reduce the effect of outliers
     *
     * @type      {number}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.max
     */
    /**
     * The minimum value of the axis in terms of map point values. If
     * `null`, the min value is automatically calculated. If the
     * `startOnTick` option is true, the min value might be rounded
     * down.
     *
     * @sample {highmaps} maps/coloraxis/gridlines/
     *         Explicit min and max to reduce the effect of outliers
     *
     * @type      {number}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.min
     */
    /**
     * Padding of the max value relative to the length of the axis. A
     * padding of 0.05 will make a 100px axis 5px longer.
     *
     * @product highcharts highstock highmaps
     */
    maxPadding: 0,
    /**
     * Color of the grid lines extending from the axis across the
     * gradient.
     *
     * @sample {highmaps} maps/coloraxis/gridlines/
     *         Grid lines demonstrated
     *
     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @product   highcharts highstock highmaps
     */
    gridLineColor: "#ffffff" /* Palette.backgroundColor */,
    /**
     * The width of the grid lines extending from the axis across the
     * gradient of a scalar color axis.
     *
     * @sample {highmaps} maps/coloraxis/gridlines/
     *         Grid lines demonstrated
     *
     * @product highcharts highstock highmaps
     */
    gridLineWidth: 1,
    /**
     * The interval of the tick marks in axis units. When `null`, the
     * tick interval is computed to approximately follow the
     * `tickPixelInterval`.
     *
     * @type      {number}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.tickInterval
     */
    /**
     * If [tickInterval](#colorAxis.tickInterval) is `null` this option
     * sets the approximate pixel interval of the tick marks.
     *
     * @product highcharts highstock highmaps
     */
    tickPixelInterval: 72,
    /**
     * Whether to force the axis to start on a tick. Use this option
     * with the `maxPadding` option to control the axis start.
     *
     * @product highcharts highstock highmaps
     */
    startOnTick: true,
    /**
     * Whether to force the axis to end on a tick. Use this option with
     * the [maxPadding](#colorAxis.maxPadding) option to control the
     * axis end.
     *
     * @product highcharts highstock highmaps
     */
    endOnTick: true,
    /** @ignore */
    offset: 0,
    /**
     * The triangular marker on a scalar color axis that points to the
     * value of the hovered area. To disable the marker, set
     * `marker: null`.
     *
     * @sample {highmaps} maps/coloraxis/marker/
     *         Black marker
     *
     * @declare Highcharts.PointMarkerOptionsObject
     * @product highcharts highstock highmaps
     */
    marker: {
        /**
         * Animation for the marker as it moves between values. Set to
         * `false` to disable animation. Defaults to `{ duration: 50 }`.
         *
         * @type    {boolean|Partial<Highcharts.AnimationOptionsObject>}
         * @product highcharts highstock highmaps
         */
        animation: {
            /** @internal */
            duration: 50
        },
        /** @internal */
        width: 0.01,
        /**
         * The color of the marker.
         *
         * @type    {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @product highcharts highstock highmaps
         */
        color: "#999999" /* Palette.neutralColor40 */
    },
    /**
     * The axis labels show the number for each tick.
     *
     * For more live examples on label options, see [xAxis.labels in the
     * Highcharts API.](/highcharts#xAxis.labels)
     *
     * @extends xAxis.labels
     * @product highcharts highstock highmaps
     */
    labels: {
        distance: 8,
        /**
         * How to handle overflowing labels on horizontal color axis. If set
         * to `"allow"`, it will not be aligned at all. By default it
         * `"justify"` labels inside the chart area. If there is room to
         * move it, it will be aligned to the edge, else it will be removed.
         *
         * @validvalue ["allow", "justify"]
         * @product    highcharts highstock highmaps
         */
        overflow: 'justify',
        rotation: 0
    },
    /**
     * The color to represent the minimum of the color axis. Unless
     * [dataClasses](#colorAxis.dataClasses) or
     * [stops](#colorAxis.stops) are set, the gradient starts at this
     * value.
     *
     * If dataClasses are set, the color is based on minColor and
     * maxColor unless a color is set for each data class, or the
     * [dataClassColor](#colorAxis.dataClassColor) is set.
     *
     * @sample {highmaps} maps/coloraxis/mincolor-maxcolor/
     *         Min and max colors on scalar (gradient) axis
     * @sample {highmaps} maps/coloraxis/mincolor-maxcolor-dataclasses/
     *         On data classes
     *
     * @type    {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @product highcharts highstock highmaps
     */
    minColor: "#e6e9ff" /* Palette.highlightColor10 */,
    /**
     * The color to represent the maximum of the color axis. Unless
     * [dataClasses](#colorAxis.dataClasses) or
     * [stops](#colorAxis.stops) are set, the gradient ends at this
     * value.
     *
     * If dataClasses are set, the color is based on minColor and
     * maxColor unless a color is set for each data class, or the
     * [dataClassColor](#colorAxis.dataClassColor) is set.
     *
     * @sample {highmaps} maps/coloraxis/mincolor-maxcolor/
     *         Min and max colors on scalar (gradient) axis
     * @sample {highmaps} maps/coloraxis/mincolor-maxcolor-dataclasses/
     *         On data classes
     *
     * @type    {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @product highcharts highstock highmaps
     */
    maxColor: "#0022ff" /* Palette.highlightColor100 */,
    /**
     * Color stops for the gradient of a scalar color axis. Use this in
     * cases where a linear gradient between a `minColor` and `maxColor`
     * is not sufficient. The stops is an array of tuples, where the
     * first item is a float between 0 and 1 assigning the relative
     * position in the gradient, and the second item is the color.
     *
     * @sample highcharts/coloraxis/coloraxis-stops/
     *         Color axis stops
     * @sample highcharts/coloraxis/color-key-with-stops/
     *         Color axis stops with custom colorKey
     * @sample {highmaps} maps/demo/heatmap/
     *         Heatmap with three color stops
     *
     * @type      {Array<Array<number,Highcharts.ColorString>>}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.stops
     */
    /**
     * The pixel length of the main tick marks on the color axis.
     */
    tickLength: 5,
    /**
     * The type of interpolation to use for the color axis. Can be
     * `linear` or `logarithmic`.
     *
     * @sample highcharts/coloraxis/logarithmic-with-emulate-negative-values/
     *         Logarithmic color axis with extension to emulate negative
     *         values
     *
     * @type      {Highcharts.ColorAxisTypeValue}
     * @default   linear
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.type
     */
    /**
     * Whether to reverse the axis so that the highest number is closest
     * to the origin. Defaults to `false` in a horizontal legend and
     * `true` in a vertical legend, where the smallest value starts on
     * top.
     *
     * @type      {boolean}
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.reversed
     */
    /**
     * @product   highcharts highstock highmaps
     * @excluding afterBreaks, pointBreak, pointInBreak
     * @apioption colorAxis.events
     */
    /**
     * Fires when the legend item belonging to the colorAxis is clicked.
     * One parameter, `event`, is passed to the function.
     *
     * **Note:** This option is deprecated in favor of
     * [legend.events.itemClick](#legend.events.itemClick).
     *
     * @deprecated 11.4.4
     * @type       {Function}
     * @product    highcharts highstock highmaps
     * @apioption  colorAxis.events.legendItemClick
     */
    /**
     * The width of the color axis. If it's a number, it is interpreted as
     * pixels.
     *
     * If it's a percentage string, it is interpreted as percentages of the
     * total plot width.
     *
     * @sample    highcharts/coloraxis/width-and-height
     *            Percentage width and pixel height for color axis
     *
     * @type      {number|string}
     * @since     11.3.0
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.width
     */
    /**
     * The height of the color axis. If it's a number, it is interpreted as
     * pixels.
     *
     * If it's a percentage string, it is interpreted as percentages of the
     * total plot height.
     *
     * @sample    highcharts/coloraxis/width-and-height
     *            Percentage width and pixel height for color axis
     *
     * @type      {number|string}
     * @since     11.3.0
     * @product   highcharts highstock highmaps
     * @apioption colorAxis.height
     */
    /**
     * Whether to display the colorAxis in the legend.
     *
     * @sample highcharts/coloraxis/hidden-coloraxis-with-3d-chart/
     *         Hidden color axis with 3d chart
     *
     * @see [heatmap.showInLegend](#series.heatmap.showInLegend)
     *
     * @since   4.2.7
     * @product highcharts highstock highmaps
     */
    showInLegend: true
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ColorAxisDefaults = (colorAxisDefaults);

;// ./code/es5/es-modules/Core/Axis/Color/ColorAxisLike.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var ColorAxisLike_color = (highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default()).parse;

var ColorAxisLike_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Namespace
 *
 * */
var ColorAxisLike;
(function (ColorAxisLike) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initialize defined data classes.
     * @private
     */
    function initDataClasses(userOptions) {
        var axis = this,
            chart = axis.chart,
            legendItem = axis.legendItem = axis.legendItem || {},
            options = axis.options,
            userDataClasses = userOptions.dataClasses || [];
        var dataClass,
            dataClasses,
            colorCount = chart.options.chart.colorCount,
            colorCounter = 0,
            colors;
        axis.dataClasses = dataClasses = [];
        legendItem.labels = [];
        for (var i = 0, iEnd = userDataClasses.length; i < iEnd; ++i) {
            dataClass = userDataClasses[i];
            dataClass = ColorAxisLike_merge(dataClass);
            dataClasses.push(dataClass);
            if (!chart.styledMode && dataClass.color) {
                continue;
            }
            if (options.dataClassColor === 'category') {
                if (!chart.styledMode) {
                    colors = chart.options.colors || [];
                    colorCount = colors.length;
                    dataClass.color = colors[colorCounter];
                }
                dataClass.colorIndex = colorCounter;
                // Loop back to zero
                colorCounter++;
                if (colorCounter === colorCount) {
                    colorCounter = 0;
                }
            }
            else {
                dataClass.color = ColorAxisLike_color(options.minColor).tweenTo(ColorAxisLike_color(options.maxColor), iEnd < 2 ? 0.5 : i / (iEnd - 1) // #3219
                );
            }
        }
    }
    ColorAxisLike.initDataClasses = initDataClasses;
    /**
     * Create initial color stops.
     * @private
     */
    function initStops() {
        var axis = this,
            options = axis.options,
            stops = axis.stops = options.stops || [
                [0,
            options.minColor || ''],
                [1,
            options.maxColor || '']
            ];
        for (var i = 0, iEnd = stops.length; i < iEnd; ++i) {
            stops[i].color = ColorAxisLike_color(stops[i][1]);
        }
    }
    ColorAxisLike.initStops = initStops;
    /**
     * Normalize logarithmic values.
     * @private
     */
    function normalizedValue(value) {
        var axis = this,
            max = axis.max || 0,
            min = axis.min || 0;
        if (axis.logarithmic) {
            value = axis.logarithmic.log2lin(value);
        }
        return 1 - ((max - value) /
            ((max - min) || 1));
    }
    ColorAxisLike.normalizedValue = normalizedValue;
    /**
     * Translate from a value to a color.
     * @private
     */
    function toColor(value, point) {
        var axis = this;
        var dataClasses = axis.dataClasses;
        var stops = axis.stops;
        var pos,
            from,
            to,
            color,
            dataClass,
            i;
        if (dataClasses) {
            i = dataClasses.length;
            while (i--) {
                dataClass = dataClasses[i];
                from = dataClass.from;
                to = dataClass.to;
                if ((typeof from === 'undefined' || value >= from) &&
                    (typeof to === 'undefined' || value <= to)) {
                    color = dataClass.color;
                    if (point) {
                        point.dataClass = i;
                        point.colorIndex = dataClass.colorIndex;
                    }
                    break;
                }
            }
        }
        else {
            pos = axis.normalizedValue(value);
            i = stops.length;
            while (i--) {
                if (pos > stops[i][0]) {
                    break;
                }
            }
            from = stops[i] || stops[i + 1];
            to = stops[i + 1] || from;
            // The position within the gradient
            pos = 1 - (to[0] - pos) / ((to[0] - from[0]) || 1);
            color = from.color.tweenTo(to.color, pos);
        }
        return color;
    }
    ColorAxisLike.toColor = toColor;
})(ColorAxisLike || (ColorAxisLike = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Color_ColorAxisLike = (ColorAxisLike);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","LegendSymbol"],"commonjs":["highcharts","LegendSymbol"],"commonjs2":["highcharts","LegendSymbol"],"root":["Highcharts","LegendSymbol"]}
var highcharts_LegendSymbol_commonjs_highcharts_LegendSymbol_commonjs2_highcharts_LegendSymbol_root_Highcharts_LegendSymbol_ = __webpack_require__(500);
var highcharts_LegendSymbol_commonjs_highcharts_LegendSymbol_commonjs2_highcharts_LegendSymbol_root_Highcharts_LegendSymbol_default = /*#__PURE__*/__webpack_require__.n(highcharts_LegendSymbol_commonjs_highcharts_LegendSymbol_commonjs2_highcharts_LegendSymbol_root_Highcharts_LegendSymbol_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Core/Axis/Color/ColorAxis.js
/* *
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





var defaultOptions = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defaultOptions;


var Series = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, ColorAxis_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, ColorAxis_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, ColorAxis_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
defaultOptions.colorAxis = ColorAxis_merge(defaultOptions.xAxis, ColorAxisDefaults);
/* *
 *
 *  Class
 *
 * */
/**
 * The ColorAxis object for inclusion in gradient legends.
 *
 * @class
 * @name Highcharts.ColorAxis
 * @augments Highcharts.Axis
 *
 * @param {Highcharts.Chart} chart
 * The related chart of the color axis.
 *
 * @param {Highcharts.ColorAxisOptions} userOptions
 * The color axis options for initialization.
 */
var ColorAxis = /** @class */ (function (_super) {
    __extends(ColorAxis, _super);
    /* *
     *
     *  Constructors
     *
     * */
    /**
     * @private
     */
    function ColorAxis(chart, userOptions) {
        var _this = _super.call(this,
            chart,
            userOptions) || this;
        _this.coll = 'colorAxis';
        _this.visible = true;
        _this.init(chart, userOptions);
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    ColorAxis.compose = function (ChartClass, FxClass, LegendClass, SeriesClass) {
        Color_ColorAxisComposition.compose(ColorAxis, ChartClass, FxClass, LegendClass, SeriesClass);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initializes the color axis.
     *
     * @function Highcharts.ColorAxis#init
     *
     * @param {Highcharts.Chart} chart
     * The related chart of the color axis.
     *
     * @param {Highcharts.ColorAxisOptions} userOptions
     * The color axis options for initialization.
     */
    ColorAxis.prototype.init = function (chart, userOptions) {
        var axis = this;
        var legend = chart.options.legend || {},
            horiz = userOptions.layout ?
                userOptions.layout !== 'vertical' :
                legend.layout !== 'vertical';
        axis.side = userOptions.side || horiz ? 2 : 1;
        axis.reversed = userOptions.reversed || !horiz;
        axis.opposite = !horiz;
        _super.prototype.init.call(this, chart, userOptions, 'colorAxis');
        // `super.init` saves the extended user options, now replace it with the
        // originals
        this.userOptions = userOptions;
        if (isArray(chart.userOptions.colorAxis)) {
            chart.userOptions.colorAxis[this.index] = userOptions;
        }
        // Prepare data classes
        if (userOptions.dataClasses) {
            axis.initDataClasses(userOptions);
        }
        axis.initStops();
        // Override original axis properties
        axis.horiz = horiz;
        axis.zoomEnabled = false;
    };
    /**
     * Returns true if the series has points at all.
     *
     * @function Highcharts.ColorAxis#hasData
     *
     * @return {boolean}
     * True, if the series has points, otherwise false.
     */
    ColorAxis.prototype.hasData = function () {
        return !!(this.tickPositions || []).length;
    };
    /**
     * Override so that ticks are not added in data class axes (#6914)
     * @private
     */
    ColorAxis.prototype.setTickPositions = function () {
        if (!this.dataClasses) {
            return _super.prototype.setTickPositions.call(this);
        }
    };
    /**
     * Extend the setOptions method to process extreme colors and color stops.
     * @private
     */
    ColorAxis.prototype.setOptions = function (userOptions) {
        var options = ColorAxis_merge(defaultOptions.colorAxis,
            userOptions, 
            // Forced options
            {
                showEmpty: false,
                title: null,
                visible: this.chart.options.legend.enabled &&
                    userOptions.visible !== false
            });
        _super.prototype.setOptions.call(this, options);
        this.options.crosshair = this.options.marker;
    };
    /**
     * @private
     */
    ColorAxis.prototype.setAxisSize = function () {
        var _a;
        var axis = this,
            chart = axis.chart,
            symbol = (_a = axis.legendItem) === null || _a === void 0 ? void 0 : _a.symbol;
        var _b = axis.getSize(),
            width = _b.width,
            height = _b.height;
        if (symbol) {
            this.left = +symbol.attr('x');
            this.top = +symbol.attr('y');
            this.width = width = +symbol.attr('width');
            this.height = height = +symbol.attr('height');
            this.right = chart.chartWidth - this.left - width;
            this.bottom = chart.chartHeight - this.top - height;
            this.pos = this.horiz ? this.left : this.top;
        }
        // Fake length for disabled legend to avoid tick issues
        // and such (#5205)
        this.len = (this.horiz ? width : height) ||
            ColorAxis.defaultLegendLength;
    };
    /**
     * Override the getOffset method to add the whole axis groups inside the
     * legend.
     * @private
     */
    ColorAxis.prototype.getOffset = function () {
        var _a;
        var axis = this;
        var group = (_a = axis.legendItem) === null || _a === void 0 ? void 0 : _a.group;
        var sideOffset = axis.chart.axisOffset[axis.side];
        if (group) {
            // Hook for the getOffset method to add groups to this parent
            // group
            axis.axisParent = group;
            // Call the base
            _super.prototype.getOffset.call(this);
            var legend_1 = this.chart.legend;
            // Adds `maxLabelLength` needed for label padding corrections done
            // by `render()` and `getMargins()` (#15551).
            legend_1.allItems.forEach(function (item) {
                if (item instanceof ColorAxis) {
                    item.drawLegendSymbol(legend_1, item);
                }
            });
            legend_1.render();
            this.chart.getMargins(true);
            // If not drilling down/up
            if (!this.chart.series.some(function (series) {
                return series.isDrilling;
            })) {
                axis.isDirty = true; // Flag to fire drawChartBox
            }
            // First time only
            if (!axis.added) {
                axis.added = true;
                axis.labelLeft = 0;
                axis.labelRight = axis.width;
            }
            // Reset it to avoid color axis reserving space
            axis.chart.axisOffset[axis.side] = sideOffset;
        }
    };
    /**
     * Create the color gradient.
     * @private
     */
    ColorAxis.prototype.setLegendColor = function () {
        var axis = this;
        var horiz = axis.horiz;
        var reversed = axis.reversed;
        var one = reversed ? 1 : 0;
        var zero = reversed ? 0 : 1;
        var grad = horiz ? [one, 0,
            zero, 0] : [0,
            zero, 0,
            one]; // #3190
            axis.legendColor = {
                linearGradient: {
                    x1: grad[0],
                    y1: grad[1],
                    x2: grad[2],
                    y2: grad[3]
                },
                stops: axis.stops
            };
    };
    /**
     * The color axis appears inside the legend and has its own legend symbol.
     * @private
     */
    ColorAxis.prototype.drawLegendSymbol = function (legend, item) {
        var _a;
        var axis = this,
            legendItem = item.legendItem || {},
            padding = legend.padding,
            legendOptions = legend.options,
            labelOptions = axis.options.labels,
            itemDistance = ColorAxis_pick(legendOptions.itemDistance, 10),
            horiz = axis.horiz,
            _b = axis.getSize(),
            width = _b.width,
            height = _b.height,
            labelPadding = ColorAxis_pick(
            // @todo: This option is not documented, nor implemented when
            // vertical
            legendOptions.labelPadding,
            horiz ? 16 : 30);
        this.setLegendColor();
        // Create the gradient
        if (!legendItem.symbol) {
            legendItem.symbol = this.chart.renderer.symbol('roundedRect')
                .attr({
                r: (_a = legendOptions.symbolRadius) !== null && _a !== void 0 ? _a : 3,
                zIndex: 1
            }).add(legendItem.group);
        }
        legendItem.symbol.attr({
            x: 0,
            y: (legend.baseline || 0) - 11,
            width: width,
            height: height
        });
        // Set how much space this legend item takes up
        legendItem.labelWidth = (width +
            padding +
            (horiz ?
                itemDistance :
                ColorAxis_pick(labelOptions.x, labelOptions.distance) +
                    (this.maxLabelLength || 0)));
        legendItem.labelHeight = height + padding + (horiz ? labelPadding : 0);
    };
    /**
     * Fool the legend.
     * @private
     */
    ColorAxis.prototype.setState = function (state) {
        this.series.forEach(function (series) {
            series.setState(state);
        });
    };
    /**
     * @private
     */
    ColorAxis.prototype.setVisible = function () {
    };
    /**
     * @private
     */
    ColorAxis.prototype.getSeriesExtremes = function () {
        var axis = this;
        var series = axis.series;
        var colorValArray,
            colorKey,
            calculatedExtremes,
            cSeries,
            i = series.length;
        this.dataMin = Infinity;
        this.dataMax = -Infinity;
        while (i--) { // X, y, value, other
            cSeries = series[i];
            colorKey = cSeries.colorKey = ColorAxis_pick(cSeries.options.colorKey, cSeries.colorKey, cSeries.pointValKey, cSeries.zoneAxis, 'y');
            calculatedExtremes = cSeries[colorKey + 'Min'] &&
                cSeries[colorKey + 'Max'];
            // Find the first column that has values
            for (var _i = 0, _a = [colorKey, 'value', 'y']; _i < _a.length; _i++) {
                var key = _a[_i];
                colorValArray = cSeries.getColumn(key);
                if (colorValArray.length) {
                    break;
                }
            }
            // If color key extremes are already calculated, use them.
            if (calculatedExtremes) {
                cSeries.minColorValue = cSeries[colorKey + 'Min'];
                cSeries.maxColorValue = cSeries[colorKey + 'Max'];
            }
            else {
                var cExtremes = Series.prototype.getExtremes.call(cSeries,
                    colorValArray);
                cSeries.minColorValue = cExtremes.dataMin;
                cSeries.maxColorValue = cExtremes.dataMax;
            }
            if (defined(cSeries.minColorValue) &&
                defined(cSeries.maxColorValue)) {
                this.dataMin =
                    Math.min(this.dataMin, cSeries.minColorValue);
                this.dataMax =
                    Math.max(this.dataMax, cSeries.maxColorValue);
            }
            if (!calculatedExtremes) {
                Series.prototype.applyExtremes.call(cSeries);
            }
        }
    };
    /**
     * Internal function to draw a crosshair.
     *
     * @function Highcharts.ColorAxis#drawCrosshair
     *
     * @param {Highcharts.PointerEventObject} [e]
     *        The event arguments from the modified pointer event, extended with
     *        `chartX` and `chartY`
     *
     * @param {Highcharts.Point} [point]
     *        The Point object if the crosshair snaps to points.
     *
     * @emits Highcharts.ColorAxis#event:afterDrawCrosshair
     * @emits Highcharts.ColorAxis#event:drawCrosshair
     */
    ColorAxis.prototype.drawCrosshair = function (e, point) {
        var axis = this,
            legendItem = axis.legendItem || {},
            plotX = point && point.plotX,
            plotY = point && point.plotY,
            axisPos = axis.pos,
            axisLen = axis.len;
        var crossPos;
        if (point) {
            crossPos = axis.toPixels(point.getNestedProperty(point.series.colorKey));
            if (crossPos < axisPos) {
                crossPos = axisPos - 2;
            }
            else if (crossPos > axisPos + axisLen) {
                crossPos = axisPos + axisLen + 2;
            }
            point.plotX = crossPos;
            point.plotY = axis.len - crossPos;
            _super.prototype.drawCrosshair.call(this, e, point);
            point.plotX = plotX;
            point.plotY = plotY;
            if (axis.cross &&
                !axis.cross.addedToColorAxis &&
                legendItem.group) {
                axis.cross
                    .addClass('highcharts-coloraxis-marker')
                    .add(legendItem.group);
                axis.cross.addedToColorAxis = true;
                if (!axis.chart.styledMode &&
                    typeof axis.crosshair === 'object') {
                    axis.cross.attr({
                        fill: axis.crosshair.color
                    });
                }
            }
        }
    };
    /**
     * @private
     */
    ColorAxis.prototype.getPlotLinePath = function (options) {
        var axis = this,
            left = axis.left,
            pos = options.translatedValue,
            top = axis.top;
        // Crosshairs only
        return isNumber(pos) ? // `pos` can be 0 (#3969)
            (axis.horiz ? [
                ['M', pos - 4, top - 6],
                ['L', pos + 4, top - 6],
                ['L', pos, top],
                ['Z']
            ] : [
                ['M', left, pos],
                ['L', left - 6, pos + 6],
                ['L', left - 6, pos - 6],
                ['Z']
            ]) :
            _super.prototype.getPlotLinePath.call(this, options);
    };
    /**
     * Updates a color axis instance with a new set of options. The options are
     * merged with the existing options, so only new or altered options need to
     * be specified.
     *
     * @function Highcharts.ColorAxis#update
     *
     * @param {Highcharts.ColorAxisOptions} newOptions
     * The new options that will be merged in with existing options on the color
     * axis.
     *
     * @param {boolean} [redraw]
     * Whether to redraw the chart after the color axis is altered. If doing
     * more operations on the chart, it is a good idea to set redraw to `false`
     * and call {@link Highcharts.Chart#redraw} after.
     */
    ColorAxis.prototype.update = function (newOptions, redraw) {
        var axis = this,
            chart = axis.chart,
            legend = chart.legend;
        this.series.forEach(function (series) {
            // Needed for Axis.update when choropleth colors change
            series.isDirtyData = true;
        });
        // When updating data classes, destroy old items and make sure new
        // ones are created (#3207)
        if (newOptions.dataClasses && legend.allItems || axis.dataClasses) {
            axis.destroyItems();
        }
        _super.prototype.update.call(this, newOptions, redraw);
        if (axis.legendItem && axis.legendItem.label) {
            axis.setLegendColor();
            legend.colorizeItem(this, true);
        }
    };
    /**
     * Destroy color axis legend items.
     * @private
     */
    ColorAxis.prototype.destroyItems = function () {
        var axis = this,
            chart = axis.chart,
            legendItem = axis.legendItem || {};
        if (legendItem.label) {
            chart.legend.destroyItem(axis);
        }
        else if (legendItem.labels) {
            for (var _i = 0, _a = legendItem.labels; _i < _a.length; _i++) {
                var item = _a[_i];
                chart.legend.destroyItem(item);
            }
        }
        chart.isDirtyLegend = true;
    };
    //   Removing the whole axis (#14283)
    ColorAxis.prototype.destroy = function () {
        this.chart.isDirtyLegend = true;
        this.destroyItems();
        _super.prototype.destroy.apply(this, [].slice.call(arguments));
    };
    /**
     * Removes the color axis and the related legend item.
     *
     * @function Highcharts.ColorAxis#remove
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart following the remove.
     */
    ColorAxis.prototype.remove = function (redraw) {
        this.destroyItems();
        _super.prototype.remove.call(this, redraw);
    };
    /**
     * Get the legend item symbols for data classes.
     * @private
     */
    ColorAxis.prototype.getDataClassLegendSymbols = function () {
        var axis = this,
            chart = axis.chart,
            legendItems = (axis.legendItem &&
                axis.legendItem.labels ||
                []),
            legendOptions = chart.options.legend,
            valueDecimals = ColorAxis_pick(legendOptions.valueDecimals, -1),
            valueSuffix = ColorAxis_pick(legendOptions.valueSuffix, '');
        var getPointsInDataClass = function (i) {
                return axis.series.reduce(function (points,
            s) {
                    points.push.apply(points,
            s.points.filter(function (point) {
                        return point.dataClass === i;
                }));
                return points;
            }, []);
        };
        var name;
        if (!legendItems.length) {
            axis.dataClasses.forEach(function (dataClass, i) {
                var from = dataClass.from,
                    to = dataClass.to,
                    numberFormatter = chart.numberFormatter;
                var vis = true;
                // Assemble the default name. This can be overridden
                // by legend.options.labelFormatter
                name = '';
                if (typeof from === 'undefined') {
                    name = '< ';
                }
                else if (typeof to === 'undefined') {
                    name = '> ';
                }
                if (typeof from !== 'undefined') {
                    name += numberFormatter(from, valueDecimals) + valueSuffix;
                }
                if (typeof from !== 'undefined' && typeof to !== 'undefined') {
                    name += ' - ';
                }
                if (typeof to !== 'undefined') {
                    name += numberFormatter(to, valueDecimals) + valueSuffix;
                }
                // Add a mock object to the legend items
                legendItems.push(ColorAxis_extend({
                    chart: chart,
                    name: name,
                    options: {},
                    drawLegendSymbol: (highcharts_LegendSymbol_commonjs_highcharts_LegendSymbol_commonjs2_highcharts_LegendSymbol_root_Highcharts_LegendSymbol_default()).rectangle,
                    visible: true,
                    isDataClass: true,
                    // Override setState to set either normal or inactive
                    // state to all points in this data class
                    setState: function (state) {
                        for (var _i = 0, _a = getPointsInDataClass(i); _i < _a.length; _i++) {
                            var point = _a[_i];
                            point.setState(state);
                        }
                    },
                    // Override setState to show or hide all points in this
                    // data class
                    setVisible: function () {
                        this.visible = vis = axis.visible = !vis;
                        var affectedSeries = [];
                        for (var _i = 0, _a = getPointsInDataClass(i); _i < _a.length; _i++) {
                            var point = _a[_i];
                            point.setVisible(vis);
                            point.hiddenInDataClass = !vis; // #20441
                            if (affectedSeries.indexOf(point.series) === -1) {
                                affectedSeries.push(point.series);
                            }
                        }
                        chart.legend.colorizeItem(this, vis);
                        affectedSeries.forEach(function (series) {
                            fireEvent(series, 'afterDataClassLegendClick');
                        });
                    }
                }, dataClass));
            });
        }
        return legendItems;
    };
    /**
     * Get size of color axis symbol.
     * @private
     */
    ColorAxis.prototype.getSize = function () {
        var axis = this,
            chart = axis.chart,
            horiz = axis.horiz,
            _a = axis.options,
            colorAxisHeight = _a.height,
            colorAxisWidth = _a.width,
            legendOptions = chart.options.legend,
            width = ColorAxis_pick(defined(colorAxisWidth) ?
                relativeLength(colorAxisWidth,
            chart.chartWidth) : void 0,
            legendOptions === null || legendOptions === void 0 ? void 0 : legendOptions.symbolWidth,
            horiz ? ColorAxis.defaultLegendLength : 12),
            height = ColorAxis_pick(defined(colorAxisHeight) ?
                relativeLength(colorAxisHeight,
            chart.chartHeight) : void 0,
            legendOptions === null || legendOptions === void 0 ? void 0 : legendOptions.symbolHeight,
            horiz ? 12 : ColorAxis.defaultLegendLength);
        return {
            width: width,
            height: height
        };
    };
    /* *
     *
     *  Static Properties
     *
     * */
    ColorAxis.defaultLegendLength = 200;
    /**
     * @private
     */
    ColorAxis.keepProps = [
        'legendItem'
    ];
    return ColorAxis;
}((highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_default())));
ColorAxis_extend(ColorAxis.prototype, Color_ColorAxisLike);
/* *
 *
 *  Registry
 *
 * */
// Properties to preserve after destroy, for Axis.update (#5881, #6025).
Array.prototype.push.apply((highcharts_Axis_commonjs_highcharts_Axis_commonjs2_highcharts_Axis_root_Highcharts_Axis_default()).keepProps, ColorAxis.keepProps);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Color_ColorAxis = (ColorAxis);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Color axis types
 *
 * @typedef {"linear"|"logarithmic"} Highcharts.ColorAxisTypeValue
 */
''; // Detach doclet above

;// ./code/es5/es-modules/masters/modules/coloraxis.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
G.ColorAxis = G.ColorAxis || Color_ColorAxis;
G.ColorAxis.compose(G.Chart, G.Fx, G.Legend, G.Series);
/* harmony default export */ var coloraxis_src = ((/* unused pure expression or super */ null && (Highcharts)));

;// ./code/es5/es-modules/Maps/MapNavigationDefaults.js
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
 *  Constants
 *
 * */
var lang = {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out'
};
/**
 * The `mapNavigation` option handles buttons for navigation in addition to
 * `mousewheel` and `doubleclick` handlers for map zooming.
 *
 * @product      highmaps
 * @optionparent mapNavigation
 */
var mapNavigation = {
    /**
     * General options for the map navigation buttons. Individual options
     * can be given from the [mapNavigation.buttons](#mapNavigation.buttons)
     * option set.
     *
     * @sample {highmaps} maps/mapnavigation/button-theme/
     *         Theming the navigation buttons
     */
    buttonOptions: {
        /**
         * What box to align the buttons to. Possible values are `plotBox`
         * and `spacingBox`.
         *
         * @type {Highcharts.ButtonRelativeToValue}
         */
        alignTo: 'plotBox',
        /**
         * The alignment of the navigation buttons.
         *
         * @type {Highcharts.AlignValue}
         */
        align: 'left',
        /**
         * The vertical alignment of the buttons. Individual alignment can
         * be adjusted by each button's `y` offset.
         *
         * @type {Highcharts.VerticalAlignValue}
         */
        verticalAlign: 'top',
        /**
         * The X offset of the buttons relative to its `align` setting.
         */
        x: 0,
        /**
         * The width of the map navigation buttons.
         */
        width: 18,
        /**
         * The pixel height of the map navigation buttons.
         */
        height: 18,
        /**
         * Padding for the navigation buttons.
         *
         * @since 5.0.0
         */
        padding: 5,
        /**
         * Text styles for the map navigation buttons.
         *
         * @type    {Highcharts.CSSObject}
         * @default {"fontSize": "1em", "fontWeight": "bold"}
         */
        style: {
            /** @ignore */
            color: "#666666" /* Palette.neutralColor60 */,
            /** @ignore */
            fontSize: '1em',
            /** @ignore */
            fontWeight: 'bold'
        },
        /**
         * A configuration object for the button theme. The object accepts
         * SVG properties like `stroke-width`, `stroke` and `fill`. Tri-state
         * button styles are supported by the `states.hover` and `states.select`
         * objects.
         *
         * @sample {highmaps} maps/mapnavigation/button-theme/
         *         Themed navigation buttons
         *
         * @type    {Highcharts.SVGAttributes}
         * @default {"stroke-width": 1, "text-align": "center"}
         */
        theme: {
            /** @ignore */
            fill: "#ffffff" /* Palette.backgroundColor */,
            /** @ignore */
            stroke: "#e6e6e6" /* Palette.neutralColor10 */,
            /** @ignore */
            'stroke-width': 1,
            /** @ignore */
            'text-align': 'center'
        }
    },
    /**
     * The individual buttons for the map navigation. This usually includes
     * the zoom in and zoom out buttons. Properties for each button is
     * inherited from
     * [mapNavigation.buttonOptions](#mapNavigation.buttonOptions), while
     * individual options can be overridden. But default, the `onclick`, `text`
     * and `y` options are individual.
     */
    buttons: {
        /**
         * Options for the zoom in button. Properties for the zoom in and zoom
         * out buttons are inherited from
         * [mapNavigation.buttonOptions](#mapNavigation.buttonOptions), while
         * individual options can be overridden. By default, the `onclick`,
         * `text` and `y` options are individual.
         *
         * @extends mapNavigation.buttonOptions
         */
        zoomIn: {
            // eslint-disable-next-line valid-jsdoc
            /**
             * Click handler for the button.
             *
             * @type    {Function}
             * @default function () { this.mapZoom(0.5); }
             */
            onclick: function () {
                this.mapZoom(0.5);
            },
            /**
             * The text for the button. The tooltip (title) is a language option
             * given by [lang.zoomIn](#lang.zoomIn).
             */
            text: '+',
            /**
             * The position of the zoomIn button relative to the vertical
             * alignment.
             */
            y: 0
        },
        /**
         * Options for the zoom out button. Properties for the zoom in and
         * zoom out buttons are inherited from
         * [mapNavigation.buttonOptions](#mapNavigation.buttonOptions), while
         * individual options can be overridden. By default, the `onclick`,
         * `text` and `y` options are individual.
         *
         * @extends mapNavigation.buttonOptions
         */
        zoomOut: {
            // eslint-disable-next-line valid-jsdoc
            /**
             * Click handler for the button.
             *
             * @type    {Function}
             * @default function () { this.mapZoom(2); }
             */
            onclick: function () {
                this.mapZoom(2);
            },
            /**
             * The text for the button. The tooltip (title) is a language option
             * given by [lang.zoomOut](#lang.zoomIn).
             */
            text: '-',
            /**
             * The position of the zoomOut button relative to the vertical
             * alignment.
             */
            y: 28
        }
    },
    /**
     * Whether to enable navigation buttons. By default it inherits the
     * [enabled](#mapNavigation.enabled) setting.
     *
     * @type      {boolean}
     * @apioption mapNavigation.enableButtons
     */
    /**
     * Whether to enable map navigation. The default is not to enable
     * navigation, as many choropleth maps are simple and don't need it.
     * Additionally, when touch zoom and mouse wheel zoom is enabled, it breaks
     * the default behaviour of these interactions in the website, and the
     * implementer should be aware of this.
     *
     * Individual interactions can be enabled separately, namely buttons,
     * multitouch zoom, double click zoom, double click zoom to element and
     * mouse wheel zoom.
     *
     * @type      {boolean}
     * @default   false
     * @apioption mapNavigation.enabled
     */
    /**
     * Enables zooming in on an area on double clicking in the map. By default
     * it inherits the [enabled](#mapNavigation.enabled) setting.
     *
     * @type      {boolean}
     * @apioption mapNavigation.enableDoubleClickZoom
     */
    /**
     * Whether to zoom in on an area when that area is double clicked.
     *
     * @sample {highmaps} maps/mapnavigation/doubleclickzoomto/
     *         Enable double click zoom to
     *
     * @type      {boolean}
     * @default   false
     * @apioption mapNavigation.enableDoubleClickZoomTo
     */
    /**
     * Enables zooming by mouse wheel. By default it inherits the [enabled](
     * #mapNavigation.enabled) setting.
     *
     * @type      {boolean}
     * @apioption mapNavigation.enableMouseWheelZoom
     */
    /**
     * Whether to enable multitouch zooming. Note that if the chart covers the
     * viewport, this prevents the user from using multitouch and touchdrag on
     * the web page, so you should make sure the user is not trapped inside the
     * chart. By default it inherits the [enabled](#mapNavigation.enabled)
     * setting.
     *
     * @type      {boolean}
     * @apioption mapNavigation.enableTouchZoom
     */
    /**
     * Sensitivity of mouse wheel or trackpad scrolling. 1 is no sensitivity,
     * while with 2, one mouse wheel delta will zoom in 50%.
     *
     * @since 4.2.4
     */
    mouseWheelSensitivity: 1.1
    // Enabled: false,
    // enableButtons: null, // inherit from enabled
    // enableTouchZoom: null, // inherit from enabled
    // enableDoubleClickZoom: null, // inherit from enabled
    // enableDoubleClickZoomTo: false
    // enableMouseWheelZoom: null, // inherit from enabled
};
/* *
 *
 *  Default Export
 *
 * */
var mapNavigationDefaults = {
    lang: lang,
    mapNavigation: mapNavigation
};
/* harmony default export */ var MapNavigationDefaults = (mapNavigationDefaults);

;// ./code/es5/es-modules/Maps/MapPointer.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var MapPointer_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, MapPointer_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapPointer_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, wrap = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).wrap;
/* *
 *
 *  Composition
 *
 * */
var MapPointer;
(function (MapPointer) {
    /* *
     *
     *  Variables
     *
     * */
    var totalWheelDelta = 0;
    var totalWheelDeltaTimer;
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Extend the Pointer.
     * @private
     */
    function compose(PointerClass) {
        var pointerProto = PointerClass.prototype;
        if (!pointerProto.onContainerDblClick) {
            MapPointer_extend(pointerProto, {
                onContainerDblClick: onContainerDblClick,
                onContainerMouseWheel: onContainerMouseWheel
            });
            wrap(pointerProto, 'normalize', wrapNormalize);
            wrap(pointerProto, 'zoomOption', wrapZoomOption);
        }
    }
    MapPointer.compose = compose;
    /**
     * The event handler for the doubleclick event.
     * @private
     */
    function onContainerDblClick(e) {
        var chart = this.chart;
        e = this.normalize(e);
        if (chart.options.mapNavigation.enableDoubleClickZoomTo) {
            if (chart.pointer.inClass(e.target, 'highcharts-tracker') &&
                chart.hoverPoint) {
                chart.hoverPoint.zoomTo();
            }
        }
        else if (chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {
            chart.mapZoom(0.5, void 0, void 0, e.chartX, e.chartY);
        }
    }
    /**
     * The event handler for the mouse scroll event.
     * @private
     */
    function onContainerMouseWheel(e) {
        var chart = this.chart;
        e = this.normalize(e);
        // Firefox uses e.deltaY or e.detail, WebKit and IE uses wheelDelta
        // try wheelDelta first #15656
        var delta = (MapPointer_defined(e.wheelDelta) && -e.wheelDelta / 120) ||
                e.deltaY || e.detail;
        // Wheel zooming on trackpads have different behaviours in Firefox vs
        // WebKit. In Firefox the delta increments in steps by 1, so it is not
        // distinguishable from true mouse wheel. Therefore we use this timer
        // to avoid trackpad zooming going too fast and out of control. In
        // WebKit however, the delta is < 1, so we simply disable animation in
        // the `chart.mapZoom` call below.
        if (Math.abs(delta) >= 1) {
            totalWheelDelta += Math.abs(delta);
            if (totalWheelDeltaTimer) {
                clearTimeout(totalWheelDeltaTimer);
            }
            totalWheelDeltaTimer = setTimeout(function () {
                totalWheelDelta = 0;
            }, 50);
        }
        if (totalWheelDelta < 10 && chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop) && chart.mapView) {
            chart.mapView.zoomBy((chart.options.mapNavigation.mouseWheelSensitivity -
                1) * -delta, void 0, [e.chartX, e.chartY], 
            // Delta less than 1 indicates stepless/trackpad zooming, avoid
            // animation delaying the zoom
            Math.abs(delta) < 1 ? false : void 0);
        }
    }
    /**
     * Add lon and lat information to pointer events
     * @private
     */
    function wrapNormalize(proceed, e, chartPosition) {
        var chart = this.chart;
        e = proceed.call(this, e, chartPosition);
        if (chart && chart.mapView) {
            var lonLat = chart.mapView.pixelsToLonLat({
                    x: e.chartX - chart.plotLeft,
                    y: e.chartY - chart.plotTop
                });
            if (lonLat) {
                MapPointer_extend(e, lonLat);
            }
        }
        return e;
    }
    /**
     * The pinchType is inferred from mapNavigation options.
     * @private
     */
    function wrapZoomOption(proceed) {
        var mapNavigation = this.chart.options.mapNavigation;
        // Pinch status
        if (mapNavigation &&
            MapPointer_pick(mapNavigation.enableTouchZoom, mapNavigation.enabled)) {
            this.chart.zooming.pinchType = 'xy';
        }
        proceed.apply(this, [].slice.call(arguments, 1));
    }
})(MapPointer || (MapPointer = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_MapPointer = (MapPointer);

;// ./code/es5/es-modules/Maps/MapSymbols.js
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
 *  Variables
 *
 * */
var symbols;
/* *
 *
 *  Functions
 *
 * */
/**
 *
 */
function bottomButton(x, y, w, h, options) {
    if (options) {
        var r = (options === null || options === void 0 ? void 0 : options.r) || 0;
        options.brBoxY = y - r;
        options.brBoxHeight = h + r;
    }
    return symbols.roundedRect(x, y, w, h, options);
}
/**
 *
 */
function compose(SVGRendererClass) {
    symbols = SVGRendererClass.prototype.symbols;
    symbols.bottombutton = bottomButton;
    symbols.topbutton = topButton;
}
/**
 *
 */
function topButton(x, y, w, h, options) {
    if (options) {
        var r = (options === null || options === void 0 ? void 0 : options.r) || 0;
        options.brBoxHeight = h + r;
    }
    return symbols.roundedRect(x, y, w, h, options);
}
/* *
 *
 *  Default Export
 *
 * */
var MapSymbols = {
    compose: compose
};
/* harmony default export */ var Maps_MapSymbols = (MapSymbols);

;// ./code/es5/es-modules/Maps/MapNavigation.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var setOptions = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).setOptions;

var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;




var MapNavigation_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, MapNavigation_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapNavigation_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, objectEach = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).objectEach, MapNavigation_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function stopEvent(e) {
    var _a,
        _b;
    if (e) {
        (_a = e.preventDefault) === null || _a === void 0 ? void 0 : _a.call(e);
        (_b = e.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(e);
        e.cancelBubble = true;
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * The MapNavigation handles buttons for navigation in addition to mousewheel
 * and doubleclick handlers for chart zooming.
 *
 * @private
 * @class
 * @name MapNavigation
 *
 * @param {Highcharts.Chart} chart
 *        The Chart instance.
 */
var MapNavigation = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function MapNavigation(chart) {
        this.chart = chart;
        this.navButtons = [];
    }
    /* *
     *
     *  Static Functions
     *
     * */
    MapNavigation.compose = function (MapChartClass, PointerClass, SVGRendererClass) {
        Maps_MapPointer.compose(PointerClass);
        Maps_MapSymbols.compose(SVGRendererClass);
        if (pushUnique(composed, 'Map.Navigation')) {
            // Extend the Chart.render method to add zooming and panning
            MapNavigation_addEvent(MapChartClass, 'beforeRender', function () {
                // Render the plus and minus buttons. Doing this before the
                // shapes makes getBBox much quicker, at least in Chrome.
                this.mapNavigation = new MapNavigation(this);
                this.mapNavigation.update();
            });
            setOptions(MapNavigationDefaults);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Update the map navigation with new options. Calling this is the same as
     * calling `chart.update({ mapNavigation: {} })`.
     *
     * @function MapNavigation#update
     *
     * @param {Partial<Highcharts.MapNavigationOptions>} [options]
     *        New options for the map navigation.
     */
    MapNavigation.prototype.update = function (options) {
        var _a;
        var mapNav = this,
            chart = mapNav.chart,
            navButtons = mapNav.navButtons,
            outerHandler = function (e) {
                this.handler.call(chart,
            e);
            stopEvent(e); // Stop default click event (#4444)
        };
        var navOptions = chart.options.mapNavigation;
        // Merge in new options in case of update, and register back to chart
        // options.
        if (options) {
            navOptions = chart.options.mapNavigation =
                MapNavigation_merge(chart.options.mapNavigation, options);
        }
        // Destroy buttons in case of dynamic update
        while (navButtons.length) {
            (_a = navButtons.pop()) === null || _a === void 0 ? void 0 : _a.destroy();
        }
        if (!chart.renderer.forExport &&
            MapNavigation_pick(navOptions.enableButtons, navOptions.enabled)) {
            if (!mapNav.navButtonsGroup) {
                mapNav.navButtonsGroup = chart.renderer.g()
                    .attr({
                    zIndex: 7 // #4955, #8392, #20476
                })
                    .add();
            }
            objectEach(navOptions.buttons, function (buttonOptions, n) {
                var _a;
                buttonOptions = MapNavigation_merge(navOptions.buttonOptions, buttonOptions);
                var attr = {
                        padding: buttonOptions.padding
                    };
                // Presentational
                if (!chart.styledMode && buttonOptions.theme) {
                    MapNavigation_extend(attr, buttonOptions.theme);
                    attr.style = MapNavigation_merge(buttonOptions.theme.style, buttonOptions.style // #3203
                    );
                }
                var text = buttonOptions.text,
                    _b = buttonOptions.width,
                    width = _b === void 0 ? 0 : _b,
                    _c = buttonOptions.height,
                    height = _c === void 0 ? 0 : _c,
                    _d = buttonOptions.padding,
                    padding = _d === void 0 ? 0 : _d;
                var button = chart.renderer
                        .button(
                    // Display the text from options only if it is not plus
                    // or minus
                    (text !== '+' && text !== '-' && text) || '', 0, 0, outerHandler, attr, void 0, void 0, void 0, n === 'zoomIn' ? 'topbutton' : 'bottombutton')
                        .addClass('highcharts-map-navigation highcharts-' + {
                        zoomIn: 'zoom-in',
                        zoomOut: 'zoom-out'
                    }[n])
                        .attr({
                        width: width,
                        height: height,
                        title: chart.options.lang[n],
                        zIndex: 5
                    })
                        .add(mapNav.navButtonsGroup);
                // Add SVG paths for the default symbols, because the text
                // representation of + and - is not sharp and position is not
                // easy to control.
                if (text === '+' || text === '-') {
                    // Mysterious +1 to achieve centering
                    var w = width + 1,
                        d = [
                            ['M',
                        padding + 3,
                        padding + height / 2],
                            ['L',
                        padding + w - 3,
                        padding + height / 2]
                        ];
                    if (text === '+') {
                        d.push(['M', padding + w / 2, padding + 3], ['L', padding + w / 2, padding + height - 3]);
                    }
                    chart.renderer
                        .path(d)
                        .addClass('highcharts-button-symbol')
                        .attr(chart.styledMode ? {} : {
                        stroke: (_a = buttonOptions.style) === null || _a === void 0 ? void 0 : _a.color,
                        'stroke-width': 3,
                        'stroke-linecap': 'round'
                    })
                        .add(button);
                }
                button.handler = buttonOptions.onclick;
                // Stop double click event (#4444)
                MapNavigation_addEvent(button.element, 'dblclick', stopEvent);
                navButtons.push(button);
                MapNavigation_extend(buttonOptions, {
                    width: button.width,
                    height: 2 * (button.height || 0)
                });
                if (!chart.hasLoaded) {
                    // Align it after the plotBox is known (#12776)
                    var unbind_1 = MapNavigation_addEvent(chart, 'load',
                        function () {
                            // #15406: Make sure button hasnt been destroyed
                            if (button.element) {
                                button.align(buttonOptions,
                        false,
                        buttonOptions.alignTo);
                        }
                        unbind_1();
                    });
                }
                else {
                    button.align(buttonOptions, false, buttonOptions.alignTo);
                }
            });
            // Borrowed from overlapping-datalabels. Consider a shared module.
            var isIntersectRect_1 = function (box1,
                box2) { return !(box2.x >= box1.x + box1.width ||
                    box2.x + box2.width <= box1.x ||
                    box2.y >= box1.y + box1.height ||
                    box2.y + box2.height <= box1.y); };
            // Check the mapNavigation buttons collision with exporting button
            // and translate the mapNavigation button if they overlap.
            var adjustMapNavBtn = function () {
                    var _a;
                var expBtnBBox = (_a = chart.exportingGroup) === null || _a === void 0 ? void 0 : _a.getBBox();
                if (expBtnBBox) {
                    var navBtnsBBox = mapNav.navButtonsGroup.getBBox();
                    // If buttons overlap
                    if (isIntersectRect_1(expBtnBBox, navBtnsBBox)) {
                        // Adjust the mapNav buttons' position by translating
                        // them above or below the exporting button
                        var aboveExpBtn = -navBtnsBBox.y -
                                navBtnsBBox.height + expBtnBBox.y - 5,
                            belowExpBtn = expBtnBBox.y + expBtnBBox.height -
                                navBtnsBBox.y + 5,
                            mapNavVerticalAlign = (navOptions.buttonOptions &&
                                navOptions.buttonOptions.verticalAlign);
                        // If bottom aligned and adjusting the mapNav button
                        // would translate it out of the plotBox, translate it
                        // up instead of down
                        mapNav.navButtonsGroup.attr({
                            translateY: mapNavVerticalAlign === 'bottom' ?
                                aboveExpBtn :
                                belowExpBtn
                        });
                    }
                }
            };
            if (!chart.hasLoaded) {
                // Align it after the plotBox is known (#12776) and after the
                // hamburger button's position is known so they don't overlap
                // (#15782)
                MapNavigation_addEvent(chart, 'render', adjustMapNavBtn);
            }
        }
        this.updateEvents(navOptions);
    };
    /**
     * Update events, called internally from the update function. Add new event
     * handlers, or unbinds events if disabled.
     *
     * @function MapNavigation#updateEvents
     *
     * @param {Partial<Highcharts.MapNavigationOptions>} options
     *        Options for map navigation.
     */
    MapNavigation.prototype.updateEvents = function (options) {
        var chart = this.chart;
        // Add the double click event
        if (MapNavigation_pick(options.enableDoubleClickZoom, options.enabled) ||
            options.enableDoubleClickZoomTo) {
            this.unbindDblClick = this.unbindDblClick || MapNavigation_addEvent(chart.container, 'dblclick', function (e) {
                chart.pointer.onContainerDblClick(e);
            });
        }
        else if (this.unbindDblClick) {
            // Unbind and set unbinder to undefined
            this.unbindDblClick = this.unbindDblClick();
        }
        // Add the mousewheel event
        if (MapNavigation_pick(options.enableMouseWheelZoom, options.enabled)) {
            this.unbindMouseWheel = this.unbindMouseWheel || MapNavigation_addEvent(chart.container, 'wheel', function (e) {
                var _a,
                    _b;
                // Prevent scrolling when the pointer is over the element
                // with that class, for example anotation popup #12100.
                if (!chart.pointer.inClass(e.target, 'highcharts-no-mousewheel')) {
                    var initialZoom = (_a = chart.mapView) === null || _a === void 0 ? void 0 : _a.zoom;
                    chart.pointer.onContainerMouseWheel(e);
                    // If the zoom level changed, prevent the default action
                    // which is to scroll the page
                    if (initialZoom !== ((_b = chart.mapView) === null || _b === void 0 ? void 0 : _b.zoom)) {
                        stopEvent(e);
                    }
                }
                return false;
            });
        }
        else if (this.unbindMouseWheel) {
            // Unbind and set unbinder to undefined
            this.unbindMouseWheel = this.unbindMouseWheel();
        }
    };
    return MapNavigation;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_MapNavigation = (MapNavigation);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGElement"],"commonjs":["highcharts","SVGElement"],"commonjs2":["highcharts","SVGElement"],"root":["Highcharts","SVGElement"]}
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_ = __webpack_require__(28);
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_);
;// ./code/es5/es-modules/Series/ColorMapComposition.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var columnProto = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.column.prototype;


var ColorMapComposition_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, ColorMapComposition_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined;
/* *
 *
 *  Composition
 *
 * */
var ColorMapComposition;
(function (ColorMapComposition) {
    /* *
     *
     *  Constants
     *
     * */
    ColorMapComposition.pointMembers = {
        dataLabelOnNull: true,
        moveToTopOnHover: true,
        isValid: pointIsValid
    };
    ColorMapComposition.seriesMembers = {
        colorKey: 'value',
        axisTypes: ['xAxis', 'yAxis', 'colorAxis'],
        parallelArrays: ['x', 'y', 'value'],
        pointArrayMap: ['value'],
        trackerGroups: ['group', 'markerGroup', 'dataLabelsGroup'],
        colorAttribs: seriesColorAttribs,
        pointAttribs: columnProto.pointAttribs
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(SeriesClass) {
        var PointClass = SeriesClass.prototype.pointClass;
        ColorMapComposition_addEvent(PointClass, 'afterSetState', onPointAfterSetState);
        return SeriesClass;
    }
    ColorMapComposition.compose = compose;
    /**
     * Move points to the top of the z-index order when hovered.
     * @private
     */
    function onPointAfterSetState(e) {
        var point = this,
            series = point.series,
            renderer = series.chart.renderer;
        if (point.moveToTopOnHover && point.graphic) {
            if (!series.stateMarkerGraphic) {
                // Create a `use` element and add it to the end of the group,
                // which would make it appear on top of the other elements. This
                // deals with z-index without reordering DOM elements (#13049).
                series.stateMarkerGraphic = new (highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default())(renderer, 'use')
                    .css({
                    pointerEvents: 'none'
                })
                    .add(point.graphic.parentGroup);
            }
            if ((e === null || e === void 0 ? void 0 : e.state) === 'hover') {
                // Give the graphic DOM element the same id as the Point
                // instance
                point.graphic.attr({
                    id: this.id
                });
                series.stateMarkerGraphic.attr({
                    href: "" + renderer.url + "#".concat(this.id),
                    visibility: 'visible'
                });
            }
            else {
                series.stateMarkerGraphic.attr({
                    href: ''
                });
            }
        }
    }
    /**
     * Color points have a value option that determines whether or not it is
     * a null point
     * @private
     */
    function pointIsValid() {
        return (this.value !== null &&
            this.value !== Infinity &&
            this.value !== -Infinity &&
            // Undefined is allowed, but NaN is not (#17279)
            (this.value === void 0 || !isNaN(this.value)));
    }
    /**
     * Get the color attributes to apply on the graphic
     * @private
     * @function Highcharts.colorMapSeriesMixin.colorAttribs
     * @param {Highcharts.Point} point
     * @return {Highcharts.SVGAttributes}
     *         The SVG attributes
     */
    function seriesColorAttribs(point) {
        var ret = {};
        if (ColorMapComposition_defined(point.color) &&
            (!point.state || point.state === 'normal') // #15746
        ) {
            ret[this.colorProp || 'fill'] = point.color;
        }
        return ret;
    }
})(ColorMapComposition || (ColorMapComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Series_ColorMapComposition = (ColorMapComposition);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series"],"commonjs":["highcharts","Series"],"commonjs2":["highcharts","Series"],"root":["Highcharts","Series"]}
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_ = __webpack_require__(820);
var highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default = /*#__PURE__*/__webpack_require__.n(highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_);
;// ./code/es5/es-modules/Series/CenteredUtilities.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var deg2rad = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad;


var CenteredUtilities_fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, CenteredUtilities_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, CenteredUtilities_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, CenteredUtilities_relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
/**
 * @private
 */
var CenteredUtilities;
(function (CenteredUtilities) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Get the center of the pie based on the size and center options relative
     * to the plot area. Borrowed by the polar and gauge series types.
     *
     * @private
     * @function Highcharts.CenteredSeriesMixin.getCenter
     */
    function getCenter() {
        var options = this.options,
            chart = this.chart,
            slicingRoom = 2 * (options.slicedOffset || 0),
            plotWidth = chart.plotWidth - 2 * slicingRoom,
            plotHeight = chart.plotHeight - 2 * slicingRoom,
            centerOption = options.center,
            smallestSize = Math.min(plotWidth,
            plotHeight),
            thickness = options.thickness;
        var handleSlicingRoom,
            size = options.size,
            innerSize = options.innerSize || 0,
            i,
            value;
        if (typeof size === 'string') {
            size = parseFloat(size);
        }
        if (typeof innerSize === 'string') {
            innerSize = parseFloat(innerSize);
        }
        var positions = [
                CenteredUtilities_pick(centerOption === null || centerOption === void 0 ? void 0 : centerOption[0], '50%'),
                CenteredUtilities_pick(centerOption === null || centerOption === void 0 ? void 0 : centerOption[1], '50%'),
                // Prevent from negative values
                CenteredUtilities_pick(size && size < 0 ? void 0 : options.size, '100%'),
                CenteredUtilities_pick(innerSize && innerSize < 0 ? void 0 : options.innerSize || 0, '0%')
            ];
        // No need for inner size in angular (gauges) series but still required
        // for pie series
        if (chart.angular && !(this instanceof (highcharts_Series_commonjs_highcharts_Series_commonjs2_highcharts_Series_root_Highcharts_Series_default()))) {
            positions[3] = 0;
        }
        for (i = 0; i < 4; ++i) {
            value = positions[i];
            handleSlicingRoom = i < 2 || (i === 2 && /%$/.test(value));
            // I == 0: centerX, relative to width
            // i == 1: centerY, relative to height
            // i == 2: size, relative to smallestSize
            // i == 3: innerSize, relative to size
            positions[i] = CenteredUtilities_relativeLength(value, [plotWidth, plotHeight, smallestSize, positions[2]][i]) + (handleSlicingRoom ? slicingRoom : 0);
        }
        // Inner size cannot be larger than size (#3632)
        if (positions[3] > positions[2]) {
            positions[3] = positions[2];
        }
        // Thickness overrides innerSize, need to be less than pie size (#6647)
        if (CenteredUtilities_isNumber(thickness) &&
            thickness * 2 < positions[2] && thickness > 0) {
            positions[3] = positions[2] - thickness * 2;
        }
        CenteredUtilities_fireEvent(this, 'afterGetCenter', { positions: positions });
        return positions;
    }
    CenteredUtilities.getCenter = getCenter;
    /**
     * GetStartAndEndRadians - Calculates start and end angles in radians.
     * Used in series types such as pie and sunburst.
     *
     * @private
     * @function Highcharts.CenteredSeriesMixin.getStartAndEndRadians
     *
     * @param {number} [start]
     *        Start angle in degrees.
     *
     * @param {number} [end]
     *        Start angle in degrees.
     *
     * @return {Highcharts.RadianAngles}
     *         Returns an object containing start and end angles as radians.
     */
    function getStartAndEndRadians(start, end) {
        var startAngle = CenteredUtilities_isNumber(start) ? start : 0, // Must be a number
            endAngle = ((CenteredUtilities_isNumber(end) && // Must be a number
                end > startAngle && // Must be larger than the start angle
                // difference must be less than 360 degrees
                (end - startAngle) < 360) ?
                end :
                startAngle + 360),
            correction = -90;
        return {
            start: deg2rad * (startAngle + correction),
            end: deg2rad * (endAngle + correction)
        };
    }
    CenteredUtilities.getStartAndEndRadians = getStartAndEndRadians;
})(CenteredUtilities || (CenteredUtilities = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Series_CenteredUtilities = (CenteredUtilities);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * @private
 * @interface Highcharts.RadianAngles
 */ /**
* @name Highcharts.RadianAngles#end
* @type {number}
*/ /**
* @name Highcharts.RadianAngles#start
* @type {number}
*/
''; // Keeps doclets above in JS file

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Chart"],"commonjs":["highcharts","Chart"],"commonjs2":["highcharts","Chart"],"root":["Highcharts","Chart"]}
var highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_ = __webpack_require__(960);
var highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_default = /*#__PURE__*/__webpack_require__.n(highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGRenderer"],"commonjs":["highcharts","SVGRenderer"],"commonjs2":["highcharts","SVGRenderer"],"root":["Highcharts","SVGRenderer"]}
var highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_ = __webpack_require__(540);
var highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_);
;// ./code/es5/es-modules/Core/Chart/MapChart.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapChart_extends = (undefined && undefined.__extends) || (function () {
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
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};


var getOptions = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).getOptions;


var MapChart_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, MapChart_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, MapChart_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;

/* *
 *
 *  Class
 *
 * */
/**
 * Map-optimized chart. Use {@link Highcharts.Chart|Chart} for common charts.
 *
 * @requires modules/map
 *
 * @class
 * @name Highcharts.MapChart
 * @extends Highcharts.Chart
 */
var MapChart = /** @class */ (function (_super) {
    MapChart_extends(MapChart, _super);
    function MapChart() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initializes the chart. The constructor's arguments are passed on
     * directly.
     *
     * @function Highcharts.MapChart#init
     *
     * @param {Highcharts.Options} userOptions
     *        Custom options.
     *
     * @param {Function} [callback]
     *        Function to run when the chart has loaded and all external
     *        images are loaded.
     *
     *
     * @emits Highcharts.MapChart#event:init
     * @emits Highcharts.MapChart#event:afterInit
     */
    MapChart.prototype.init = function (userOptions, callback) {
        var defaultCreditsOptions = getOptions().credits;
        var options = MapChart_merge({
                chart: {
                    panning: {
                        enabled: true,
                        type: 'xy'
                    },
                    type: 'map'
                },
                credits: {
                    mapText: MapChart_pick(defaultCreditsOptions.mapText, ' \u00a9 <a href="{geojson.copyrightUrl}">' +
                        '{geojson.copyrightShort}</a>'),
                    mapTextFull: MapChart_pick(defaultCreditsOptions.mapTextFull, '{geojson.copyright}')
                },
                mapView: {}, // Required to enable Chart.mapView
                tooltip: {
                    followTouchMove: false
                }
            },
            userOptions // User's options
            );
        _super.prototype.init.call(this, options, callback);
    };
    /**
     * Highcharts Maps only. Zoom in or out of the map. See also
     * {@link Point#zoomTo}. See {@link Chart#fromLatLonToPoint} for how to get
     * the `centerX` and `centerY` parameters for a geographic location.
     *
     * Deprecated as of v9.3 in favor of [MapView.zoomBy](https://api.highcharts.com/class-reference/Highcharts.MapView#zoomBy).
     *
     * @deprecated
     * @function Highcharts.Chart#mapZoom
     *
     * @param {number} [howMuch]
     *        How much to zoom the map. Values less than 1 zooms in. 0.5 zooms
     *        in to half the current view. 2 zooms to twice the current view. If
     *        omitted, the zoom is reset.
     *
     * @param {number} [xProjected]
     *        The projected x position to keep stationary when zooming, if
     *        available space.
     *
     * @param {number} [yProjected]
     *        The projected y position to keep stationary when zooming, if
     *        available space.
     *
     * @param {number} [chartX]
     *        Keep this chart position stationary if possible. This is used for
     *        example in `mousewheel` events, where the area under the mouse
     *        should be fixed as we zoom in.
     *
     * @param {number} [chartY]
     *        Keep this chart position stationary if possible.
     */
    MapChart.prototype.mapZoom = function (howMuch, xProjected, yProjected, chartX, chartY) {
        if (this.mapView) {
            if (MapChart_isNumber(howMuch)) {
                // Compliance, mapView.zoomBy uses different values
                howMuch = Math.log(howMuch) / Math.log(0.5);
            }
            this.mapView.zoomBy(howMuch, MapChart_isNumber(xProjected) && MapChart_isNumber(yProjected) ?
                this.mapView.projection.inverse([xProjected, yProjected]) :
                void 0, MapChart_isNumber(chartX) && MapChart_isNumber(chartY) ?
                [chartX, chartY] :
                void 0);
        }
    };
    MapChart.prototype.update = function (options) {
        var _a;
        // Calculate and set the recommended map view if map option is set
        if (options.chart && 'map' in options.chart) {
            (_a = this.mapView) === null || _a === void 0 ? void 0 : _a.recommendMapView(this, __spreadArray([
                options.chart.map
            ], (this.options.series || []).map(function (s) { return s.mapData; }), true), true);
        }
        _super.prototype.update.apply(this, arguments);
    };
    return MapChart;
}((highcharts_Chart_commonjs_highcharts_Chart_commonjs2_highcharts_Chart_root_Highcharts_Chart_default())));
/* *
 *
 *  Class Namespace
 *
 * */
(function (MapChart) {
    /* *
     *
     *  Constants
     *
     * */
    /**
     * Contains all loaded map data for Highmaps.
     *
     * @requires modules/map
     *
     * @name Highcharts.maps
     * @type {Record<string,*>}
     */
    MapChart.maps = {};
    /* *
     *
     *  Functions
     *
     * */
    /**
     * The factory function for creating new map charts. Creates a new {@link
     * Highcharts.MapChart|MapChart} object with different default options than
     * the basic Chart.
     *
     * @requires modules/map
     *
     * @function Highcharts.mapChart
     *
     * @param {string|Highcharts.HTMLDOMElement} [renderTo]
     *        The DOM element to render to, or its id.
     *
     * @param {Highcharts.Options} options
     *        The chart options structure as described in the
     *        [options reference](https://api.highcharts.com/highstock).
     *
     * @param {Highcharts.ChartCallbackFunction} [callback]
     *        A function to execute when the chart object is finished
     *        rendering and all external image files (`chart.backgroundImage`,
     *        `chart.plotBackgroundImage` etc) are loaded.  Defining a
     *        [chart.events.load](https://api.highcharts.com/highstock/chart.events.load)
     *        handler is equivalent.
     *
     * @return {Highcharts.MapChart}
     * The chart object.
     */
    function mapChart(a, b, c) {
        return new MapChart(a, b, c);
    }
    MapChart.mapChart = mapChart;
    /**
     * Utility for reading SVG paths directly.
     *
     * @requires modules/map
     *
     * @function Highcharts.splitPath
     *
     * @param {string|Array<(string|number)>} path
     *        Path to split.
     *
     * @return {Highcharts.SVGPathArray}
     * Splitted SVG path
     */
    function splitPath(path) {
        var arr;
        if (typeof path === 'string') {
            path = path
                // Move letters apart
                .replace(/([A-Z])/gi, ' $1 ')
                // Trim
                .replace(/^\s*/, '').replace(/\s*$/, '');
            // Split on spaces and commas. The semicolon is bogus, designed to
            // circumvent string replacement in the pre-v7 assembler that built
            // specific styled mode files.
            var split = path.split(/[ ,;]+/);
            arr = split.map(function (item) {
                if (!/[A-Z]/i.test(item)) {
                    return parseFloat(item);
                }
                return item;
            });
        }
        else {
            arr = path;
        }
        return highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default().prototype.pathToSegments(arr);
    }
    MapChart.splitPath = splitPath;
})(MapChart || (MapChart = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Chart_MapChart = (MapChart);

;// ./code/es5/es-modules/Maps/MapUtilities.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

// Compute bounds from a path element
var boundsFromPath = function (path) {
    var x2 = -Number.MAX_VALUE,
        x1 = Number.MAX_VALUE,
        y2 = -Number.MAX_VALUE,
        y1 = Number.MAX_VALUE,
        validBounds;
    path.forEach(function (seg) {
        var x = seg[seg.length - 2],
            y = seg[seg.length - 1];
        if (typeof x === 'number' &&
            typeof y === 'number') {
            x1 = Math.min(x1, x);
            x2 = Math.max(x2, x);
            y1 = Math.min(y1, y);
            y2 = Math.max(y2, y);
            validBounds = true;
        }
    });
    if (validBounds) {
        return { x1: x1, y1: y1, x2: x2, y2: y2 };
    }
};
/* *
 *
 *  Default Export
 *
 * */
var MapUtilities = {
    boundsFromPath: boundsFromPath
};
/* harmony default export */ var Maps_MapUtilities = (MapUtilities);

;// ./code/es5/es-modules/Series/Map/MapPoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapPoint_extends = (undefined && undefined.__extends) || (function () {
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
var __assign = (undefined && undefined.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};


var MapPoint_boundsFromPath = Maps_MapUtilities.boundsFromPath;

var ScatterPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.scatter.prototype.pointClass;

var MapPoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapPoint_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, MapPoint_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Class
 *
 * */
var MapPoint = /** @class */ (function (_super) {
    MapPoint_extends(MapPoint, _super);
    function MapPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * Get the projected path based on the geometry. May also be called on
     * mapData options (not point instances), hence static.
     * @private
     */
    MapPoint.getProjectedPath = function (point, projection) {
        if (!point.projectedPath) {
            if (projection && point.geometry) {
                // Always true when given GeoJSON coordinates
                projection.hasCoordinates = true;
                point.projectedPath = projection.path(point.geometry);
                // SVG path given directly in point options
            }
            else {
                point.projectedPath = point.path;
            }
        }
        return point.projectedPath || [];
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Extend the Point object to split paths.
     * @private
     */
    MapPoint.prototype.applyOptions = function (options, x) {
        var _a;
        var series = this.series,
            point = _super.prototype.applyOptions.call(this,
            options,
            x),
            joinBy = series.joinBy;
        if (series.mapData && series.mapMap) {
            var joinKey = joinBy[1],
                mapKey = _super.prototype.getNestedProperty.call(this,
                joinKey),
                mapPoint = typeof mapKey !== 'undefined' &&
                    series.mapMap[mapKey];
            if (mapPoint) {
                // Copy over properties; #20231 prioritize point.name
                MapPoint_extend(point, __assign(__assign({}, mapPoint), { name: (_a = point.name) !== null && _a !== void 0 ? _a : mapPoint.name }));
            }
            else if (series.pointArrayMap.indexOf('value') !== -1) {
                point.value = point.value || null;
            }
        }
        return point;
    };
    /**
     * Get the bounds in terms of projected units
     * @private
     */
    MapPoint.prototype.getProjectedBounds = function (projection) {
        var path = MapPoint.getProjectedPath(this,
            projection),
            bounds = MapPoint_boundsFromPath(path),
            properties = this.properties,
            mapView = this.series.chart.mapView;
        if (bounds) {
            // Cache point bounding box for use to position data labels, bubbles
            // etc
            var propMiddleLon = properties && properties['hc-middle-lon'], propMiddleLat = properties && properties['hc-middle-lat'];
            if (mapView && MapPoint_isNumber(propMiddleLon) && MapPoint_isNumber(propMiddleLat)) {
                var projectedPoint = projection.forward([propMiddleLon,
                    propMiddleLat]);
                bounds.midX = projectedPoint[0];
                bounds.midY = projectedPoint[1];
            }
            else {
                var propMiddleX = properties && properties['hc-middle-x'], propMiddleY = properties && properties['hc-middle-y'];
                bounds.midX = (bounds.x1 + (bounds.x2 - bounds.x1) * MapPoint_pick(this.middleX, MapPoint_isNumber(propMiddleX) ? propMiddleX : 0.5));
                var middleYFraction = MapPoint_pick(this.middleY,
                    MapPoint_isNumber(propMiddleY) ? propMiddleY : 0.5);
                // No geographic geometry, only path given => flip
                if (!this.geometry) {
                    middleYFraction = 1 - middleYFraction;
                }
                bounds.midY =
                    bounds.y2 - (bounds.y2 - bounds.y1) * middleYFraction;
            }
            return bounds;
        }
    };
    /**
     * Stop the fade-out
     * @private
     */
    MapPoint.prototype.onMouseOver = function (e) {
        highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default().clearTimeout(this.colorInterval);
        if (
        // Valid...
        (!this.isNull && this.visible) ||
            // ... or interact anyway
            this.series.options.nullInteraction) {
            _super.prototype.onMouseOver.call(this, e);
        }
        else {
            // #3401 Tooltip doesn't hide when hovering over null points
            this.series.onMouseOut();
        }
    };
    MapPoint.prototype.setVisible = function (vis) {
        var method = vis ? 'show' : 'hide';
        this.visible = this.options.visible = !!vis;
        // Show and hide associated elements
        if (this.dataLabel) {
            this.dataLabel[method]();
        }
        // For invisible map points, render them as null points rather than
        // fully removing them. Makes more sense for color axes with data
        // classes.
        if (this.graphic) {
            this.graphic.attr(this.series.pointAttribs(this));
        }
    };
    /**
     * Highmaps only. Zoom in on the point using the global animation.
     *
     * @sample maps/members/point-zoomto/
     *         Zoom to points from buttons
     *
     * @requires modules/map
     *
     * @function Highcharts.Point#zoomTo
     */
    MapPoint.prototype.zoomTo = function (animOptions) {
        var point = this,
            chart = point.series.chart,
            mapView = chart.mapView;
        var bounds = point.bounds;
        if (mapView && bounds) {
            var inset = MapPoint_isNumber(point.insetIndex) &&
                    mapView.insets[point.insetIndex];
            if (inset) {
                // If in an inset, translate the bounds to pixels ...
                var px1 = inset.projectedUnitsToPixels({
                        x: bounds.x1,
                        y: bounds.y1
                    }),
                    px2 = inset.projectedUnitsToPixels({
                        x: bounds.x2,
                        y: bounds.y2
                    }), 
                    // ... then back to projected units in the main mapView
                    proj1 = mapView.pixelsToProjectedUnits({
                        x: px1.x,
                        y: px1.y
                    }),
                    proj2 = mapView.pixelsToProjectedUnits({
                        x: px2.x,
                        y: px2.y
                    });
                bounds = {
                    x1: proj1.x,
                    y1: proj1.y,
                    x2: proj2.x,
                    y2: proj2.y
                };
            }
            mapView.fitToBounds(bounds, void 0, false);
            point.series.isDirty = true;
            chart.redraw(animOptions);
        }
    };
    return MapPoint;
}(ScatterPoint));
MapPoint_extend(MapPoint.prototype, {
    dataLabelOnNull: Series_ColorMapComposition.pointMembers.dataLabelOnNull,
    moveToTopOnHover: Series_ColorMapComposition.pointMembers.moveToTopOnHover,
    isValid: Series_ColorMapComposition.pointMembers.isValid
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Map_MapPoint = (MapPoint);

;// ./code/es5/es-modules/Series/Map/MapSeriesDefaults.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var MapSeriesDefaults_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  API Options
 *
 * */
/**
 * The map series is used for basic choropleth maps, where each map area has
 * a color based on its value.
 *
 * @sample maps/demo/all-maps/
 *         Choropleth map
 *
 * @extends      plotOptions.scatter
 * @excluding    boostBlending, boostThreshold, dragDrop, cluster, marker
 * @product      highmaps
 * @optionparent plotOptions.map
 *
 * @private
 */
var MapSeriesDefaults = {
    /**
     * Whether the MapView takes this series into account when computing the
     * default zoom and center of the map.
     *
     * @sample maps/series/affectsmapview/
     *         US map with world map backdrop
     *
     * @since 10.0.0
     *
     * @private
     */
    affectsMapView: true,
    animation: false, // Makes the complex shapes slow
    dataLabels: {
        crop: false,
        formatter: function () {
            var numberFormatter = this.series.chart.numberFormatter;
            var value = this.point.value;
            return MapSeriesDefaults_isNumber(value) ?
                numberFormatter(value, -1) :
                (this.point.name || ''); // #20231
        },
        inside: true, // For the color
        overflow: false,
        padding: 0,
        verticalAlign: 'middle'
    },
    /**
     * The SVG value used for the `stroke-linecap` and `stroke-linejoin` of
     * the map borders. Round means that borders are rounded in the ends and
     * bends.
     *
     * @sample maps/demo/mappoint-mapmarker/
     *         Backdrop coastline with round linecap
     *
     * @type   {Highcharts.SeriesLinecapValue}
     * @since  10.3.3
     */
    linecap: 'round',
    /**
     * @ignore-option
     *
     * @private
     */
    marker: null,
    /**
     * The color to apply to null points.
     *
     * In styled mode, the null point fill is set in the
     * `.highcharts-null-point` class.
     *
     * @sample maps/demo/all-areas-as-null/
     *         Null color
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     *
     * @private
     */
    nullColor: "#f7f7f7" /* Palette.neutralColor3 */,
    /**
     * Whether to allow pointer interaction like tooltips and mouse events
     * on null points.
     *
     * @type      {boolean}
     * @since     4.2.7
     * @apioption plotOptions.map.nullInteraction
     *
     * @private
     */
    stickyTracking: false,
    tooltip: {
        followPointer: true,
        pointFormat: '{point.name}: {point.value}<br/>'
    },
    /**
     * @ignore-option
     *
     * @private
     */
    turboThreshold: 0,
    /**
     * Whether all areas of the map defined in `mapData` should be rendered.
     * If `true`, areas which don't correspond to a data point, are rendered
     * as `null` points. If `false`, those areas are skipped.
     *
     * @sample maps/plotoptions/series-allareas-false/
     *         All areas set to false
     *
     * @type      {boolean}
     * @default   true
     * @product   highmaps
     * @apioption plotOptions.series.allAreas
     *
     * @private
     */
    allAreas: true,
    /**
     * The border color of the map areas.
     *
     * In styled mode, the border stroke is given in the `.highcharts-point`
     * class.
     *
     * @sample {highmaps} maps/plotoptions/series-border/
     *         Borders demo
     *
     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @default   #cccccc
     * @product   highmaps
     * @apioption plotOptions.series.borderColor
     *
     * @private
     */
    borderColor: "#e6e6e6" /* Palette.neutralColor10 */,
    /**
     * The border width of each map area.
     *
     * In styled mode, the border stroke width is given in the
     * `.highcharts-point` class.
     *
     * @sample maps/plotoptions/series-border/
     *         Borders demo
     *
     * @type      {number}
     * @default   1
     * @product   highmaps
     * @apioption plotOptions.series.borderWidth
     *
     * @private
     */
    borderWidth: 1,
    /**
     * @type      {string}
     * @default   value
     * @apioption plotOptions.map.colorKey
     */
    /**
     * What property to join the `mapData` to the value data. For example,
     * if joinBy is "code", the mapData items with a specific code is merged
     * into the data with the same code. For maps loaded from GeoJSON, the
     * keys may be held in each point's `properties` object.
     *
     * The joinBy option can also be an array of two values, where the first
     * points to a key in the `mapData`, and the second points to another
     * key in the `data`.
     *
     * When joinBy is `null`, the map items are joined by their position in
     * the array, which performs much better in maps with many data points.
     * This is the recommended option if you are printing more than a
     * thousand data points and have a backend that can preprocess the data
     * into a parallel array of the mapData.
     *
     * @sample maps/plotoptions/series-border/
     *         Joined by "code"
     * @sample maps/demo/geojson/
     *         GeoJSON joined by an array
     * @sample maps/series/joinby-null/
     *         Simple data joined by null
     *
     * @type      {string|Array<string>}
     * @default   hc-key
     * @product   highmaps
     * @apioption plotOptions.series.joinBy
     *
     * @private
     */
    joinBy: 'hc-key',
    /**
     * Define the z index of the series.
     *
     * @type      {number}
     * @product   highmaps
     * @apioption plotOptions.series.zIndex
     */
    /**
     * @apioption plotOptions.series.states
     *
     * @private
     */
    states: {
        /**
         * @apioption plotOptions.series.states.hover
         */
        hover: {
            /** @ignore-option */
            halo: void 0,
            /**
             * The color of the shape in this state.
             *
             * @sample maps/plotoptions/series-states-hover/
             *         Hover options
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @product   highmaps
             * @apioption plotOptions.series.states.hover.color
             */
            /**
             * The border color of the point in this state.
             *
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @product   highmaps
             * @apioption plotOptions.series.states.hover.borderColor
             */
            borderColor: "#666666" /* Palette.neutralColor60 */,
            /**
             * The border width of the point in this state
             *
             * @type      {number}
             * @product   highmaps
             * @apioption plotOptions.series.states.hover.borderWidth
             */
            borderWidth: 2
            /**
             * The relative brightness of the point when hovered, relative
             * to the normal point color.
             *
             * @type      {number}
             * @product   highmaps
             * @default   0
             * @apioption plotOptions.series.states.hover.brightness
             */
        },
        /**
         * @apioption plotOptions.series.states.normal
         */
        normal: {
            /**
             * @productdesc {highmaps}
             * The animation adds some latency in order to reduce the effect
             * of flickering when hovering in and out of for example an
             * uneven coastline.
             *
             * @sample {highmaps} maps/plotoptions/series-states-animation-false/
             *         No animation of fill color
             *
             * @apioption plotOptions.series.states.normal.animation
             */
            animation: true
        },
        /**
         * @apioption plotOptions.series.states.select
         */
        select: {
            /**
             * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
             * @default   ${palette.neutralColor20}
             * @product   highmaps
             * @apioption plotOptions.series.states.select.color
             */
            color: "#cccccc" /* Palette.neutralColor20 */
        }
    },
    legendSymbol: 'rectangle'
};
/**
 * An array of objects containing a `geometry` or `path` definition and
 * optionally additional properties to join in the `data` as per the `joinBy`
 * option. GeoJSON and TopoJSON structures can also be passed directly into
 * `mapData`.
 *
 * @sample maps/demo/category-map/
 *         Map data and joinBy
 * @sample maps/series/mapdata-multiple/
 *         Multiple map sources
 *
 * @type      {Array<Highcharts.SeriesMapDataOptions>|Highcharts.GeoJSON|Highcharts.TopoJSON}
 * @product   highmaps
 * @apioption series.mapData
 */
/**
 * A `map` series. If the [type](#series.map.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.map
 * @excluding dataParser, dataURL, dragDrop, marker
 * @product   highmaps
 * @apioption series.map
 */
/**
 * An array of data points for the series. For the `map` series type, points can
 * be given in the following ways:
 *
 * 1. An array of numerical values. In this case, the numerical values will be
 *    interpreted as `value` options. Example:
 *    ```js
 *    data: [0, 5, 3, 5]
 *    ```
 *
 * 2. An array of arrays with 2 values. In this case, the values correspond to
 *    `[hc-key, value]`. Example:
 *    ```js
 *        data: [
 *            ['us-ny', 0],
 *            ['us-mi', 5],
 *            ['us-tx', 3],
 *            ['us-ak', 5]
 *        ]
 *    ```
 *
 * 3. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.map.turboThreshold),
 *    this option is not available.
 *    ```js
 *        data: [{
 *            value: 6,
 *            name: "Point2",
 *            color: "#00FF00"
 *        }, {
 *            value: 6,
 *            name: "Point1",
 *            color: "#FF00FF"
 *        }]
 *    ```
 *
 * @type      {Array<number|Array<string,(number|null)>|null|*>}
 * @product   highmaps
 * @apioption series.map.data
 */
/**
 * When using automatic point colors pulled from the global
 * [colors](colors) or series-specific
 * [plotOptions.map.colors](series.colors) collections, this option
 * determines whether the chart should receive one color per series or
 * one color per point.
 *
 * In styled mode, the `colors` or `series.colors` arrays are not
 * supported, and instead this option gives the points individual color
 * class names on the form `highcharts-color-{n}`.
 *
 * @see [series colors](#plotOptions.map.colors)
 *
 * @sample {highmaps} maps/plotoptions/mapline-colorbypoint-false/
 *         Mapline colorByPoint set to false by default
 * @sample {highmaps} maps/plotoptions/mapline-colorbypoint-true/
 *         Mapline colorByPoint set to true
 *
 * @type      {boolean}
 * @default   false
 * @since     2.0
 * @product   highmaps
 * @apioption plotOptions.map.colorByPoint
 */
/**
 * A series specific or series type specific color set to apply instead
 * of the global [colors](#colors) when [colorByPoint](
 * #plotOptions.map.colorByPoint) is true.
 *
 * @type      {Array<Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject>}
 * @since     3.0
 * @product   highmaps
 * @apioption plotOptions.map.colors
 */
/**
 * Individual color for the point. By default the color is either used
 * to denote the value, or pulled from the global `colors` array.
 *
 * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
 * @product   highmaps
 * @apioption series.map.data.color
 */
/**
 * Individual data label for each point. The options are the same as
 * the ones for [plotOptions.series.dataLabels](
 * #plotOptions.series.dataLabels).
 *
 * @sample maps/series/data-datalabels/
 *         Disable data labels for individual areas
 *
 * @type      {Highcharts.DataLabelsOptions}
 * @product   highmaps
 * @apioption series.map.data.dataLabels
 */
/**
 * The `id` of a series in the [drilldown.series](#drilldown.series)
 * array to use for a drilldown for this point.
 *
 * @sample maps/demo/map-drilldown/
 *         Basic drilldown
 *
 * @type      {string}
 * @product   highmaps
 * @apioption series.map.data.drilldown
 */
/**
 * For map and mapline series types, the geometry of a point.
 *
 * To achieve a better separation between the structure and the data,
 * it is recommended to use `mapData` to define the geometry instead
 * of defining it on the data points themselves.
 *
 * The geometry object is compatible to that of a `feature` in GeoJSON, so
 * features of GeoJSON can be passed directly into the `data`, optionally
 * after first filtering and processing it.
 *
 * For pre-projected maps (like GeoJSON maps from our
 * [map collection](https://code.highcharts.com/mapdata/)), user has to specify
 * coordinates in `projectedUnits` for geometry type other than `Point`,
 * instead of `[longitude, latitude]`.
 *
 * @sample maps/series/mappoint-line-geometry/
 *         Map point and line geometry
 * @sample maps/series/geometry-types/
 *         Geometry types
 *
 * @type      {Object}
 * @since 9.3.0
 * @product   highmaps
 * @apioption series.map.data.geometry
 */
/**
 * The geometry type. Can be one of `LineString`, `Polygon`, `MultiLineString`
 * or `MultiPolygon`.
 *
 * @sample maps/series/geometry-types/
 *         Geometry types
 *
 * @declare   Highcharts.MapGeometryTypeValue
 * @type      {string}
 * @since     9.3.0
 * @product   highmaps
 * @validvalue ["LineString", "Polygon", "MultiLineString", "MultiPolygon"]
 * @apioption series.map.data.geometry.type
 */
/**
 * The geometry coordinates in terms of arrays of `[longitude, latitude]`, or
 * a two dimensional array of the same. The dimensionality must comply with the
 * `type`.
 *
 * @type      {Array<LonLatArray>|Array<Array<LonLatArray>>}
 * @since 9.3.0
 * @product   highmaps
 * @apioption series.map.data.geometry.coordinates
 */
/**
 * An id for the point. This can be used after render time to get a
 * pointer to the point object through `chart.get()`.
 *
 * @sample maps/series/data-id/
 *         Highlight a point by id
 *
 * @type      {string}
 * @product   highmaps
 * @apioption series.map.data.id
 */
/**
 * When data labels are laid out on a map, Highmaps runs a simplified
 * algorithm to detect collision. When two labels collide, the one with
 * the lowest rank is hidden. By default the rank is computed from the
 * area.
 *
 * @type      {number}
 * @product   highmaps
 * @apioption series.map.data.labelrank
 */
/**
 * The relative mid point of an area, used to place the data label.
 * Ranges from 0 to 1\. When `mapData` is used, middleX can be defined
 * there.
 *
 * @type      {number}
 * @default   0.5
 * @product   highmaps
 * @apioption series.map.data.middleX
 */
/**
 * The relative mid point of an area, used to place the data label.
 * Ranges from 0 to 1\. When `mapData` is used, middleY can be defined
 * there.
 *
 * @type      {number}
 * @default   0.5
 * @product   highmaps
 * @apioption series.map.data.middleY
 */
/**
 * The name of the point as shown in the legend, tooltip, dataLabel
 * etc.
 *
 * @sample maps/series/data-datalabels/
 *         Point names
 *
 * @type      {string}
 * @product   highmaps
 * @apioption series.map.data.name
 */
/**
 * For map and mapline series types, the SVG path for the shape. For
 * compatibility with old IE, not all SVG path definitions are supported,
 * but M, L and C operators are safe.
 *
 * To achieve a better separation between the structure and the data,
 * it is recommended to use `mapData` to define that paths instead
 * of defining them on the data points themselves.
 *
 * For providing true geographical shapes based on longitude and latitude, use
 * the `geometry` option instead.
 *
 * @sample maps/series/data-path/
 *         Paths defined in data
 *
 * @type      {string}
 * @product   highmaps
 * @apioption series.map.data.path
 */
/**
 * The numeric value of the data point.
 *
 * @type      {number|null}
 * @product   highmaps
 * @apioption series.map.data.value
 */
/**
 * Individual point events
 *
 * @extends   plotOptions.series.point.events
 * @product   highmaps
 * @apioption series.map.data.events
 */
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Map_MapSeriesDefaults = (MapSeriesDefaults);

;// ./code/es5/es-modules/Maps/MapViewDefaults.js
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
 *  API Options
 *
 * */
/**
 * The `mapView` options control the initial view of the chart, and how
 * projection is set up for raw geoJSON maps (beta as of v9.3).
 *
 * To set the view dynamically after chart generation, see
 * [mapView.setView](/class-reference/Highcharts.MapView#setView).
 *
 * @since        9.3.0
 * @product      highmaps
 * @optionparent mapView
 */
var MapViewDefaults = {
    /**
     * The center of the map in terms of longitude and latitude. For
     * preprojected maps (like the GeoJSON files in Map Collection v1.x),
     * the units are projected x and y units.
     *
     * @sample {highmaps} maps/mapview/center-zoom
     *         Custom view of a world map
     * @sample {highmaps} maps/mapview/get-view
     *         Report the current view of a preprojected map
     *
     * @type    {Highcharts.LonLatArray}
     * @default [0, 0]
     */
    center: [0, 0],
    /**
     * Fit the map to a geometry object consisting of individual points or
     * polygons. This is practical for responsive maps where we want to
     * focus on a specific area regardless of map size - unlike setting
     * `center` and `zoom`, where the view doesn't scale with different map
     * sizes.
     *
     * The geometry can be combined with the [padding](#mapView.padding)
     * option to avoid touching the edges of the chart.
     *
     * @sample maps/mapview/fittogeometry
     *         Fitting the view to geometries
     *
     * @type {object}
     * @since 10.3.3
     */
    fitToGeometry: void 0,
    /**
     * Prevents the end user from zooming too far in on the map. See
     * [zoom](#mapView.zoom).
     *
     * @sample {highmaps} maps/mapview/maxzoom
     *         Prevent zooming in too far
     *
     * @type   {number|undefined}
     */
    maxZoom: void 0,
    /**
     * The padding inside the plot area when auto fitting to the map bounds.
     * A number signifies pixels, and a percentage is relative to the plot
     * area size.
     *
     * An array sets individual padding for the sides in the order [top,
     * right, bottom, left].
     *
     * @sample {highmaps} maps/chart/plotbackgroundcolor-color
     *         Visible plot area and percentage padding
     * @sample {highmaps} maps/demo/mappoint-mapmarker
     *         Padding for individual sides
     *
     * @type  {number|string|Array<number|string>}
     */
    padding: 0,
    /**
     * The projection options allow applying client side projection to a map
     * given in geographic coordinates, typically from TopoJSON or GeoJSON.
     *
     * @sample maps/demo/projection-explorer
     *         Projection explorer
     * @sample maps/demo/topojson-projection
     *         Orthographic projection
     * @sample maps/mapview/projection-custom-proj4js
     *         Custom UTM projection definition
     * @sample maps/mapview/projection-custom-d3geo
     *         Custom Robinson projection definition
     *
     * @type   {object}
     */
    projection: {
        /**
         * Projection name. Built-in projections are `EqualEarth`,
         * `LambertConformalConic`, `Miller`, `Orthographic` and `WebMercator`.
         *
         * @sample maps/demo/projection-explorer
         *         Projection explorer
         * @sample maps/mapview/projection-custom-proj4js
         *         Custom UTM projection definition
         * @sample maps/mapview/projection-custom-d3geo
         *         Custom Robinson projection definition
         * @sample maps/demo/topojson-projection
         *         Orthographic projection
         *
         * @type   {string}
         */
        name: void 0,
        /**
         * The two standard parallels that define the map layout in conic
         * projections, like the LambertConformalConic projection. If only
         * one number is given, the second parallel will be the same as the
         * first.
         *
         * @sample maps/mapview/projection-parallels
         *         LCC projection with parallels
         * @sample maps/demo/projection-explorer
         *         Projection explorer
         *
         * @type {Array<number>}
         */
        parallels: void 0,
        /**
         * Rotation of the projection in terms of degrees `[lambda, phi,
         * gamma]`. When given, a three-axis spherical rotation is be applied
         * to the globe prior to the projection.
         *
         * * `lambda` shifts the longitudes by the given value.
         * * `phi` shifts the latitudes by the given value. Can be omitted.
         * * `gamma` applies a _roll_. Can be omitted.
         *
         * @sample maps/demo/projection-explorer
         *         Projection explorer
         * @sample maps/mapview/projection-america-centric
         *         America-centric world map
         */
        rotation: void 0
    },
    /**
     * The zoom level of a map. Higher zoom levels means more zoomed in. An
     * increase of 1 zooms in to a quarter of the viewed area (half the
     * width and height). Defaults to fitting to the map bounds.
     *
     * In a `WebMercator` projection, a zoom level of 0 represents
     * the world in a 256x256 pixel square. This is a common concept for WMS
     * tiling software.
     *
     * @sample {highmaps} maps/mapview/center-zoom
     *         Custom view of a world map
     * @sample {highmaps} maps/mapview/get-view
     *         Report the current view of a preprojected map
     *
     * @type   {number}
     */
    zoom: void 0,
    /**
     * Generic options for the placement and appearance of map insets like
     * non-contiguous territories.
     *
     * @since        10.0.0
     * @product      highmaps
     * @optionparent mapView.insetOptions
     */
    insetOptions: {
        /**
         * The border color of the insets.
         *
         * @sample maps/mapview/insetoptions-border
         *         Inset border options
         *
         * @type {Highcharts.ColorType}
         */
        borderColor: "#cccccc" /* Palette.neutralColor20 */,
        /**
         * The pixel border width of the insets.
         *
         * @sample maps/mapview/insetoptions-border
         *         Inset border options
         */
        borderWidth: 1,
        /**
         * The padding of the insets. Can be either a number of pixels, a
         * percentage string, or an array of either. If an array is given, it
         * sets the top, right, bottom, left paddings respectively.
         *
         * @type {number|string|Array<number|string>}
         */
        padding: '10%',
        /**
         * What coordinate system the `field` and `borderPath` should relate to.
         * If `plotBox`, they will be fixed to the plot box and responsively
         * move in relation to the main map. If `mapBoundingBox`, they will be
         * fixed to the map bounding box, which is constant and centered in
         * different chart sizes and ratios.
         *
         * @validvalue ["plotBox", "mapBoundingBox"]
         */
        relativeTo: 'mapBoundingBox',
        /**
         * The individual MapView insets, typically used for non-contiguous
         * areas of a country. Each item inherits from the generic
         * `insetOptions`.
         *
         * Some of the TopoJSON files of the [Highcharts Map
         * Collection](https://code.highcharts.com/mapdata/) include a property
         * called `hc-recommended-mapview`, and some of these include insets. In
         * order to override the recommended inset options, an inset option with
         * a matching id can be applied, and it will be merged into the embedded
         * settings.
         *
         * @sample      maps/mapview/insets-extended
         *              Extending the embedded insets
         * @sample      maps/mapview/insets-complete
         *              Complete inset config from scratch
         *
         * @extends     mapView.insetOptions
         * @type        Array<Object>
         * @product     highmaps
         * @apioption   mapView.insets
         */
        /**
         * A geometry object of type `MultiLineString` defining the border path
         * of the inset in terms of `units`. If undefined, a border is rendered
         * around the `field` geometry. It is recommended that the `borderPath`
         * partly follows the outline of the `field` in order to make pointer
         * positioning consistent.
         *
         * @sample    maps/mapview/insets-complete
         *            Complete inset config with `borderPath`
         *
         * @product   highmaps
         * @type      {Object|undefined}
         * @apioption mapView.insets.borderPath
         */
        /**
         * A geometry object of type `Polygon` defining where in the chart the
         * inset should be rendered, in terms of `units` and relative to the
         * `relativeTo` setting. If a `borderPath` is omitted, a border is
         * rendered around the field. If undefined, the inset is rendered in the
         * full plot area.
         *
         * @sample    maps/mapview/insets-extended
         *            Border path emitted, field is rendered
         *
         * @product   highmaps
         * @type      {object|undefined}
         * @apioption mapView.insets.field
         */
        /**
         * A geometry object of type `Polygon` encircling the shapes that should
         * be rendered in the inset, in terms of geographic coordinates.
         * Geometries within this geometry are removed from the default map view
         * and rendered in the inset.
         *
         * @sample    maps/mapview/insets-complete
         *            Complete inset config with `geoBounds`
         *
         * @product   highmaps
         * @type      {object}
         * @apioption mapView.insets.geoBounds
         */
        /**
         * The id of the inset, used for internal reference.
         *
         * @sample    maps/mapview/insets-extended
         *            Extending recommended insets by id
         *
         * @product   highmaps
         * @type      {string}
         * @apioption mapView.insets.id
         */
        /**
         * The projection options for the inset.
         *
         * @product   highmaps
         * @type      {Object}
         * @extends   mapView.projection
         * @apioption mapView.insets.projection
         */
        /**
         * What units to use for the `field` and `borderPath` geometries. If
         * `percent` (default), they relate to the box given in `relativeTo`. If
         * `pixels`, they are absolute values.
         *
         * @validvalue ["percent", "pixels"]
         */
        units: 'percent'
    }
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_MapViewDefaults = (MapViewDefaults);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Templating"],"commonjs":["highcharts","Templating"],"commonjs2":["highcharts","Templating"],"root":["Highcharts","Templating"]}
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_ = __webpack_require__(984);
var highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default = /*#__PURE__*/__webpack_require__.n(highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_);
;// ./code/es5/es-modules/Maps/GeoJSONComposition.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var win = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).win;

var format = (highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default()).format;

var error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, GeoJSONComposition_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, GeoJSONComposition_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, GeoJSONComposition_wrap = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).wrap;
/* *
 *
 *  Composition
 *
 * */
var GeoJSONComposition;
(function (GeoJSONComposition) {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Deprecated. Use `MapView.lonLatToProjectedUnits` instead.
     *
     * @deprecated
     *
     * @requires modules/map
     *
     * @function Highcharts.Chart#fromLatLonToPoint
     *
     * @param {Highcharts.MapLonLatObject} lonLat
     *        Coordinates.
     *
     * @return {Highcharts.ProjectedXY}
     * X and Y coordinates in terms of projected values
     */
    function chartFromLatLonToPoint(lonLat) {
        return this.mapView && this.mapView.lonLatToProjectedUnits(lonLat);
    }
    /**
     * Deprecated. Use `MapView.projectedUnitsToLonLat` instead.
     *
     * @deprecated
     *
     * @requires modules/map
     *
     * @function Highcharts.Chart#fromPointToLatLon
     *
     * @param {Highcharts.Point|Highcharts.ProjectedXY} point
     *        A `Point` instance or anything containing `x` and `y` properties
     *        with numeric values.
     *
     * @return {Highcharts.MapLonLatObject|undefined}
     * An object with `lat` and `lon` properties.
     */
    function chartFromPointToLatLon(point) {
        return this.mapView && this.mapView.projectedUnitsToLonLat(point);
    }
    /**
     * Highcharts Maps only. Get point from latitude and longitude using
     * specified transform definition.
     *
     * @requires modules/map
     *
     * @sample maps/series/latlon-transform/
     *         Use specific transformation for lat/lon
     *
     * @function Highcharts.Chart#transformFromLatLon
     *
     * @param {Highcharts.MapLonLatObject} latLon
     *        A latitude/longitude object.
     *
     * @param {*} transform
     *        The transform definition to use as explained in the
     *        {@link https://www.highcharts.com/docs/maps/latlon|documentation}.
     *
     * @return {ProjectedXY}
     * An object with `x` and `y` properties.
     */
    function chartTransformFromLatLon(latLon, transform) {
        /**
         * Allows to manually load the proj4 library from Highcharts options
         * instead of the `window`.
         * In case of loading the library from a `script` tag,
         * this option is not needed, it will be loaded from there by default.
         *
         * @type      {Function}
         * @product   highmaps
         * @apioption chart.proj4
         */
        var proj4 = this.options.chart.proj4 || win.proj4;
        if (!proj4) {
            error(21, false, this);
            return;
        }
        var _a = transform.jsonmarginX,
            jsonmarginX = _a === void 0 ? 0 : _a,
            _b = transform.jsonmarginY,
            jsonmarginY = _b === void 0 ? 0 : _b,
            _c = transform.jsonres,
            jsonres = _c === void 0 ? 1 : _c,
            _d = transform.scale,
            scale = _d === void 0 ? 1 : _d,
            _e = transform.xoffset,
            xoffset = _e === void 0 ? 0 : _e,
            _f = transform.xpan,
            xpan = _f === void 0 ? 0 : _f,
            _g = transform.yoffset,
            yoffset = _g === void 0 ? 0 : _g,
            _h = transform.ypan,
            ypan = _h === void 0 ? 0 : _h;
        var projected = proj4(transform.crs,
            [latLon.lon,
            latLon.lat]),
            cosAngle = transform.cosAngle ||
                (transform.rotation && Math.cos(transform.rotation)),
            sinAngle = transform.sinAngle ||
                (transform.rotation && Math.sin(transform.rotation)),
            rotated = transform.rotation ? [
                projected[0] * cosAngle + projected[1] * sinAngle,
                -projected[0] * sinAngle + projected[1] * cosAngle
            ] : projected;
        return {
            x: ((rotated[0] - xoffset) * scale + xpan) * jsonres + jsonmarginX,
            y: -(((yoffset - rotated[1]) * scale + ypan) * jsonres - jsonmarginY)
        };
    }
    /**
     * Highcharts Maps only. Get latLon from point using specified transform
     * definition. The method returns an object with the numeric properties
     * `lat` and `lon`.
     *
     * @requires modules/map
     *
     * @sample maps/series/latlon-transform/
     *         Use specific transformation for lat/lon
     *
     * @function Highcharts.Chart#transformToLatLon
     *
     * @param {Highcharts.Point|Highcharts.ProjectedXY} point
     *        A `Point` instance, or any object containing the properties `x`
     *        and `y` with numeric values.
     *
     * @param {*} transform
     *        The transform definition to use as explained in the
     *        {@link https://www.highcharts.com/docs/maps/latlon|documentation}.
     *
     * @return {Highcharts.MapLonLatObject|undefined}
     * An object with `lat` and `lon` properties.
     */
    function chartTransformToLatLon(point, transform) {
        var proj4 = this.options.chart.proj4 || win.proj4;
        if (!proj4) {
            error(21, false, this);
            return;
        }
        if (point.y === null) {
            return;
        }
        var _a = transform.jsonmarginX,
            jsonmarginX = _a === void 0 ? 0 : _a,
            _b = transform.jsonmarginY,
            jsonmarginY = _b === void 0 ? 0 : _b,
            _c = transform.jsonres,
            jsonres = _c === void 0 ? 1 : _c,
            _d = transform.scale,
            scale = _d === void 0 ? 1 : _d,
            _e = transform.xoffset,
            xoffset = _e === void 0 ? 0 : _e,
            _f = transform.xpan,
            xpan = _f === void 0 ? 0 : _f,
            _g = transform.yoffset,
            yoffset = _g === void 0 ? 0 : _g,
            _h = transform.ypan,
            ypan = _h === void 0 ? 0 : _h;
        var normalized = {
                x: ((point.x - jsonmarginX) / jsonres - xpan) / scale + xoffset,
                y: ((point.y - jsonmarginY) / jsonres + ypan) / scale + yoffset
            }, cosAngle = transform.cosAngle ||
                (transform.rotation && Math.cos(transform.rotation)), sinAngle = transform.sinAngle ||
                (transform.rotation && Math.sin(transform.rotation)), 
            // Note: Inverted sinAngle to reverse rotation direction
            projected = proj4(transform.crs, 'WGS84', transform.rotation ? {
                x: normalized.x * cosAngle + normalized.y * -sinAngle,
                y: normalized.x * sinAngle + normalized.y * cosAngle
            } : normalized);
        return { lat: projected.y, lon: projected.x };
    }
    /** @private */
    function compose(ChartClass) {
        var chartProto = ChartClass.prototype;
        if (!chartProto.transformFromLatLon) {
            chartProto.fromLatLonToPoint = chartFromLatLonToPoint;
            chartProto.fromPointToLatLon = chartFromPointToLatLon;
            chartProto.transformFromLatLon = chartTransformFromLatLon;
            chartProto.transformToLatLon = chartTransformToLatLon;
            GeoJSONComposition_wrap(chartProto, 'addCredits', wrapChartAddCredit);
        }
    }
    GeoJSONComposition.compose = compose;
    /**
     * Highcharts Maps only. Restructure a GeoJSON or TopoJSON object in
     * preparation to be read directly by the
     * {@link https://api.highcharts.com/highmaps/plotOptions.series.mapData|series.mapData}
     * option. The object will be broken down to fit a specific Highcharts type,
     * either `map`, `mapline` or `mappoint`. Meta data in GeoJSON's properties
     * object will be copied directly over to {@link Point.properties} in
     * Highcharts Maps.
     *
     * @requires modules/map
     *
     * @sample maps/demo/geojson/ Simple areas
     * @sample maps/demo/mapline-mappoint/ Multiple types
     * @sample maps/series/mapdata-multiple/ Multiple map sources
     *
     * @function Highcharts.geojson
     *
     * @param {Highcharts.GeoJSON|Highcharts.TopoJSON} json
     *        The GeoJSON or TopoJSON structure to parse, represented as a
     *        JavaScript object.
     *
     * @param {string} [hType=map]
     *        The Highcharts Maps series type to prepare for. Setting "map" will
     *        return GeoJSON polygons and multipolygons. Setting "mapline" will
     *        return GeoJSON linestrings and multilinestrings. Setting
     *        "mappoint" will return GeoJSON points and multipoints.
     *
     *
     * @return {Array<*>} An object ready for the `mapData` option.
     */
    function geojson(json, hType, series) {
        var _a,
            _b;
        if (hType === void 0) { hType = 'map'; }
        var mapData = [];
        var geojson = json.type === 'Topology' ? topo2geo(json) : json,
            features = geojson.features;
        for (var i = 0, iEnd = features.length; i < iEnd; ++i) {
            var feature = features[i],
                geometry = feature.geometry || {},
                type = geometry.type,
                coordinates = geometry.coordinates,
                properties = feature.properties;
            var pointOptions = void 0;
            if ((hType === 'map' || hType === 'mapbubble') &&
                (type === 'Polygon' || type === 'MultiPolygon')) {
                if (coordinates.length) {
                    pointOptions = { geometry: { coordinates: coordinates, type: type } };
                }
            }
            else if (hType === 'mapline' &&
                (type === 'LineString' ||
                    type === 'MultiLineString')) {
                if (coordinates.length) {
                    pointOptions = { geometry: { coordinates: coordinates, type: type } };
                }
            }
            else if (hType === 'mappoint' && type === 'Point') {
                if (coordinates.length) {
                    pointOptions = { geometry: { coordinates: coordinates, type: type } };
                }
            }
            if (pointOptions) {
                var name_1 = properties && (properties.name || properties.NAME),
                    lon = properties && properties.lon,
                    lat = properties && properties.lat;
                mapData.push(GeoJSONComposition_extend(pointOptions, {
                    lat: typeof lat === 'number' ? lat : void 0,
                    lon: typeof lon === 'number' ? lon : void 0,
                    name: typeof name_1 === 'string' ? name_1 : void 0,
                    /**
                     * In Highcharts Maps, when data is loaded from GeoJSON, the
                     * GeoJSON item's properies are copied over here.
                     *
                     * @requires modules/map
                     * @name Highcharts.Point#properties
                     * @type {*}
                     */
                    properties: properties
                }));
            }
        }
        // Create a credits text that includes map source, to be picked up in
        // Chart.addCredits
        if (series && geojson.copyrightShort) {
            series.chart.mapCredits = format((_a = series.chart.options.credits) === null || _a === void 0 ? void 0 : _a.mapText, { geojson: geojson });
            series.chart.mapCreditsFull = format((_b = series.chart.options.credits) === null || _b === void 0 ? void 0 : _b.mapTextFull, { geojson: geojson });
        }
        return mapData;
    }
    GeoJSONComposition.geojson = geojson;
    /**
     * Convert a TopoJSON topology to GeoJSON. By default the first object is
     * handled.
     * Based on https://github.com/topojson/topojson-specification
     */
    function topo2geo(topology, objectName) {
        // Decode first object/feature as default
        if (!objectName) {
            objectName = Object.keys(topology.objects)[0];
        }
        var obj = topology.objects[objectName];
        // Already decoded with the same title => return cache
        if (obj['hc-decoded-geojson'] &&
            obj['hc-decoded-geojson'].title === topology.title) {
            return obj['hc-decoded-geojson'];
        }
        // Do the initial transform
        var arcsArray = topology.arcs;
        if (topology.transform) {
            var arcs = topology.arcs,
                _a = topology.transform,
                scale = _a.scale,
                translate = _a.translate;
            var positionArray = void 0,
                x = void 0,
                y = void 0;
            arcsArray = [];
            for (var i = 0, iEnd = arcs.length; i < iEnd; ++i) {
                var positions = arcs[i];
                arcsArray.push(positionArray = []);
                x = 0;
                y = 0;
                for (var j = 0, jEnd = positions.length; j < jEnd; ++j) {
                    positionArray.push([
                        (x += positions[j][0]) * scale[0] + translate[0],
                        (y += positions[j][1]) * scale[1] + translate[1]
                    ]);
                }
            }
        }
        // Recurse down any depth of multi-dimensional arrays of arcs and insert
        // the coordinates
        var arcsToCoordinates = function (arcs) {
                if (typeof arcs[0] === 'number') {
                    return arcs.reduce(function (coordinates,
            arcNo,
            i) {
                        var arc = arcNo < 0 ? arcsArray[~arcNo] : arcsArray[arcNo];
                    // The first point of an arc is always identical to the last
                    // point of the previes arc, so slice it off to save further
                    // processing.
                    if (arcNo < 0) {
                        arc = arc.slice(0, i === 0 ? arc.length : arc.length - 1);
                        arc.reverse();
                    }
                    else if (i) {
                        arc = arc.slice(1);
                    }
                    return coordinates.concat(arc);
                }, []);
            }
            return arcs.map(arcsToCoordinates);
        };
        var geometries = obj.geometries,
            features = [];
        for (var i = 0, iEnd = geometries.length; i < iEnd; ++i) {
            features.push({
                type: 'Feature',
                properties: geometries[i].properties,
                geometry: {
                    type: geometries[i].type,
                    coordinates: geometries[i].coordinates ||
                        arcsToCoordinates(geometries[i].arcs)
                }
            });
        }
        var geojson = {
                type: 'FeatureCollection',
                copyright: topology.copyright,
                copyrightShort: topology.copyrightShort,
                copyrightUrl: topology.copyrightUrl,
                features: features,
                'hc-recommended-mapview': obj['hc-recommended-mapview'],
                bbox: topology.bbox,
                title: topology.title
            };
        obj['hc-decoded-geojson'] = geojson;
        return geojson;
    }
    GeoJSONComposition.topo2geo = topo2geo;
    /**
     * Override addCredits to include map source by default.
     * @private
     */
    function wrapChartAddCredit(proceed, credits) {
        credits = GeoJSONComposition_merge(true, this.options.credits, credits);
        proceed.call(this, credits);
        // Add full map credits to hover
        if (this.credits && this.mapCreditsFull) {
            this.credits.attr({
                title: this.mapCreditsFull
            });
        }
    }
})(GeoJSONComposition || (GeoJSONComposition = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_GeoJSONComposition = (GeoJSONComposition);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Represents the loose structure of a geographic JSON file.
 *
 * @interface Highcharts.GeoJSON
 */ /**
* Full copyright note of the geographic data.
* @name Highcharts.GeoJSON#copyright
* @type {string|undefined}
*/ /**
* Short copyright note of the geographic data suitable for watermarks.
* @name Highcharts.GeoJSON#copyrightShort
* @type {string|undefined}
*/ /**
* Additional meta information based on the coordinate reference system.
* @name Highcharts.GeoJSON#crs
* @type {Highcharts.Dictionary<any>|undefined}
*/ /**
* Data sets of geographic features.
* @name Highcharts.GeoJSON#features
* @type {Array<Highcharts.GeoJSONFeature>}
*/ /**
* Map projections and transformations to be used when calculating between
* lat/lon and chart values. Required for lat/lon support on maps. Allows
* resizing, rotating, and moving portions of a map within its projected
* coordinate system while still retaining lat/lon support. If using lat/lon
* on a portion of the map that does not match a `hitZone`, the definition with
* the key `default` is used.
* @name Highcharts.GeoJSON#hc-transform
* @type {Highcharts.Dictionary<Highcharts.GeoJSONTranslation>|undefined}
*/ /**
* Title of the geographic data.
* @name Highcharts.GeoJSON#title
* @type {string|undefined}
*/ /**
* Type of the geographic data. Type of an optimized map collection is
* `FeatureCollection`.
* @name Highcharts.GeoJSON#type
* @type {string|undefined}
*/ /**
* Version of the geographic data.
* @name Highcharts.GeoJSON#version
* @type {string|undefined}
*/
/**
 * Data set of a geographic feature.
 * @interface Highcharts.GeoJSONFeature
 * @extends Highcharts.Dictionary<*>
 */ /**
* Data type of the geographic feature.
* @name Highcharts.GeoJSONFeature#type
* @type {string}
*/
/**
 * Describes the map projection and transformations applied to a portion of
 * a map.
 * @interface Highcharts.GeoJSONTranslation
 */ /**
* The coordinate reference system used to generate this portion of the map.
* @name Highcharts.GeoJSONTranslation#crs
* @type {string}
*/ /**
* Define the portion of the map that this definition applies to. Defined as a
* GeoJSON polygon feature object, with `type` and `coordinates` properties.
* @name Highcharts.GeoJSONTranslation#hitZone
* @type {Highcharts.Dictionary<*>|undefined}
*/ /**
* Property for internal use for maps generated by Highsoft.
* @name Highcharts.GeoJSONTranslation#jsonmarginX
* @type {number|undefined}
*/ /**
* Property for internal use for maps generated by Highsoft.
* @name Highcharts.GeoJSONTranslation#jsonmarginY
* @type {number|undefined}
*/ /**
* Property for internal use for maps generated by Highsoft.
* @name Highcharts.GeoJSONTranslation#jsonres
* @type {number|undefined}
*/ /**
* Specifies clockwise rotation of the coordinates after the projection, but
* before scaling and panning. Defined in radians, relative to the coordinate
* system origin.
* @name Highcharts.GeoJSONTranslation#rotation
* @type {number|undefined}
*/ /**
* The scaling factor applied to the projected coordinates.
* @name Highcharts.GeoJSONTranslation#scale
* @type {number|undefined}
*/ /**
* Property for internal use for maps generated by Highsoft.
* @name Highcharts.GeoJSONTranslation#xoffset
* @type {number|undefined}
*/ /**
* X offset of projected coordinates after scaling.
* @name Highcharts.GeoJSONTranslation#xpan
* @type {number|undefined}
*/ /**
* Property for internal use for maps generated by Highsoft.
* @name Highcharts.GeoJSONTranslation#yoffset
* @type {number|undefined}
*/ /**
* Y offset of projected coordinates after scaling.
* @name Highcharts.GeoJSONTranslation#ypan
* @type {number|undefined}
*/
/**
 * Result object of a map transformation.
 *
 * @interface Highcharts.ProjectedXY
 */ /**
* X coordinate in projected units.
* @name Highcharts.ProjectedXY#x
* @type {number}
*/ /**
* Y coordinate in projected units
* @name Highcharts.ProjectedXY#y
* @type {number}
*/
/**
 * A latitude/longitude object.
 *
 * @interface Highcharts.MapLonLatObject
 */ /**
* The latitude.
* @name Highcharts.MapLonLatObject#lat
* @type {number}
*/ /**
* The longitude.
* @name Highcharts.MapLonLatObject#lon
* @type {number}
*/
/**
 * An array of longitude, latitude.
 *
 * @typedef {Array<number>} Highcharts.LonLatArray
 */
/**
 * An array of GeoJSON or TopoJSON objects or strings used as map data for
 * series.
 *
 * @typedef {Array<*>|GeoJSON|TopoJSON|string} Highcharts.MapDataType
 */
/**
 * A TopoJSON object, see description on the
 * [project's GitHub page](https://github.com/topojson/topojson).
 *
 * @typedef {Object} Highcharts.TopoJSON
 */
''; // Detach doclets above

;// ./code/es5/es-modules/Core/Geometry/GeometryUtilities.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Namespace
 *
 * */
var GeometryUtilities;
(function (GeometryUtilities) {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Calculates the center between a list of points.
     *
     * @private
     *
     * @param {Array<Highcharts.PositionObject>} points
     * A list of points to calculate the center of.
     *
     * @return {Highcharts.PositionObject}
     * Calculated center
     */
    function getCenterOfPoints(points) {
        var sum = points.reduce(function (sum,
            point) {
                sum.x += point.x;
            sum.y += point.y;
            return sum;
        }, { x: 0, y: 0 });
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }
    GeometryUtilities.getCenterOfPoints = getCenterOfPoints;
    /**
     * Calculates the distance between two points based on their x and y
     * coordinates.
     *
     * @private
     *
     * @param {Highcharts.PositionObject} p1
     * The x and y coordinates of the first point.
     *
     * @param {Highcharts.PositionObject} p2
     * The x and y coordinates of the second point.
     *
     * @return {number}
     * Returns the distance between the points.
     */
    function getDistanceBetweenPoints(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    GeometryUtilities.getDistanceBetweenPoints = getDistanceBetweenPoints;
    /**
     * Calculates the angle between two points.
     * @todo add unit tests.
     * @private
     * @param {Highcharts.PositionObject} p1 The first point.
     * @param {Highcharts.PositionObject} p2 The second point.
     * @return {number} Returns the angle in radians.
     */
    function getAngleBetweenPoints(p1, p2) {
        return Math.atan2(p2.x - p1.x, p2.y - p1.y);
    }
    GeometryUtilities.getAngleBetweenPoints = getAngleBetweenPoints;
    /**
     * Test for point in polygon. Polygon defined as array of [x,y] points.
     * @private
     * @param {PositionObject} point The point potentially within a polygon.
     * @param {Array<Array<number>>} polygon The polygon potentially containing the point.
     */
    function pointInPolygon(_a, polygon) {
        var x = _a.x,
            y = _a.y;
        var len = polygon.length;
        var i,
            j,
            inside = false;
        for (i = 0, j = len - 1; i < len; j = i++) {
            var _b = polygon[i],
                x1 = _b[0],
                y1 = _b[1],
                _c = polygon[j],
                x2 = _c[0],
                y2 = _c[1];
            if (y1 > y !== y2 > y &&
                (x < (x2 - x1) *
                    (y - y1) /
                    (y2 - y1) +
                    x1)) {
                inside = !inside;
            }
        }
        return inside;
    }
    GeometryUtilities.pointInPolygon = pointInPolygon;
})(GeometryUtilities || (GeometryUtilities = {}));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Geometry_GeometryUtilities = (GeometryUtilities);

;// ./code/es5/es-modules/Core/Geometry/PolygonClip.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
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
 * Simple line string clipping. Clip to bounds and insert intersection points.
 * @private
 */
function clipLineString(line, boundsPolygon) {
    var ret = [],
        l = clipPolygon(line,
        boundsPolygon,
        false);
    for (var i = 1; i < l.length; i++) {
        // Insert gap where two intersections follow each other
        if (l[i].isIntersection && l[i - 1].isIntersection) {
            ret.push(l.splice(0, i));
            i = 0;
        }
        // Push the rest
        if (i === l.length - 1) {
            ret.push(l);
        }
    }
    return ret;
}
/**
 * Clip a polygon to another polygon using the Sutherland/Hodgman algorithm.
 * @private
 */
function clipPolygon(subjectPolygon, boundsPolygon, closed) {
    if (closed === void 0) { closed = true; }
    var clipEdge1 = boundsPolygon[boundsPolygon.length - 1],
        clipEdge2,
        prevPoint,
        currentPoint,
        outputList = subjectPolygon;
    for (var j = 0; j < boundsPolygon.length; j++) {
        var inputList = outputList;
        clipEdge2 = boundsPolygon[j];
        outputList = [];
        prevPoint = closed ?
            // Polygon, wrap around
            inputList[inputList.length - 1] :
            // Open line string, don't wrap
            inputList[0];
        for (var i = 0; i < inputList.length; i++) {
            currentPoint = inputList[i];
            if (isInside(clipEdge1, clipEdge2, currentPoint)) {
                if (!isInside(clipEdge1, clipEdge2, prevPoint)) {
                    outputList.push(intersection(clipEdge1, clipEdge2, prevPoint, currentPoint));
                }
                outputList.push(currentPoint);
            }
            else if (isInside(clipEdge1, clipEdge2, prevPoint)) {
                outputList.push(intersection(clipEdge1, clipEdge2, prevPoint, currentPoint));
            }
            prevPoint = currentPoint;
        }
        clipEdge1 = clipEdge2;
    }
    return outputList;
}
/** @private */
function isInside(clipEdge1, clipEdge2, p) {
    return ((clipEdge2[0] - clipEdge1[0]) * (p[1] - clipEdge1[1]) >
        (clipEdge2[1] - clipEdge1[1]) * (p[0] - clipEdge1[0]));
}
/** @private */
function intersection(clipEdge1, clipEdge2, prevPoint, currentPoint) {
    var dc = [
            clipEdge1[0] - clipEdge2[0],
            clipEdge1[1] - clipEdge2[1]
        ],
        dp = [
            prevPoint[0] - currentPoint[0],
            prevPoint[1] - currentPoint[1]
        ],
        n1 = clipEdge1[0] * clipEdge2[1] - clipEdge1[1] * clipEdge2[0],
        n2 = prevPoint[0] * currentPoint[1] - prevPoint[1] * currentPoint[0],
        n3 = 1 / (dc[0] * dp[1] - dc[1] * dp[0]),
        intersection = [
            (n1 * dp[0] - n2 * dc[0]) * n3,
            (n1 * dp[1] - n2 * dc[1]) * n3
        ];
    intersection.isIntersection = true;
    return intersection;
}
/* *
 *
 *  Default Export
 *
 * */
var PolygonClip = {
    clipLineString: clipLineString,
    clipPolygon: clipPolygon
};
/* harmony default export */ var Geometry_PolygonClip = (PolygonClip);

;// ./code/es5/es-modules/Maps/Projections/LambertConformalConic.js
/* *
 * Lambert Conformal Conic projection
 * */

/* *
 *
 *  Constants
 *
 * */
var sign = Math.sign ||
    (function (n) { return (n === 0 ? 0 : n > 0 ? 1 : -1); }), scale = 63.78137, LambertConformalConic_deg2rad = Math.PI / 180, halfPI = Math.PI / 2, eps10 = 1e-6, tany = function (y) { return Math.tan((halfPI + y) / 2); };
/* *
 *
 *  Class
 *
 * */
var LambertConformalConic = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function LambertConformalConic(options) {
        var _a;
        var parallels = (options.parallels || [])
                .map(function (n) { return n * LambertConformalConic_deg2rad; }),
            lat1 = parallels[0] || 0,
            lat2 = (_a = parallels[1]) !== null && _a !== void 0 ? _a : lat1,
            cosLat1 = Math.cos(lat1);
        if (typeof options.projectedBounds === 'object') {
            this.projectedBounds = options.projectedBounds;
        }
        // Apply the global variables
        var n = lat1 === lat2 ?
                Math.sin(lat1) :
                Math.log(cosLat1 / Math.cos(lat2)) / Math.log(tany(lat2) / tany(lat1));
        if (Math.abs(n) < 1e-10) {
            n = (sign(n) || 1) * 1e-10;
        }
        this.n = n;
        this.c = cosLat1 * Math.pow(tany(lat1), n) / n;
    }
    /* *
     *
     *  Functions
     *
     * */
    LambertConformalConic.prototype.forward = function (lonLat) {
        var _a = this,
            c = _a.c,
            n = _a.n,
            projectedBounds = _a.projectedBounds,
            lon = lonLat[0] * LambertConformalConic_deg2rad;
        var lat = lonLat[1] * LambertConformalConic_deg2rad;
        if (c > 0) {
            if (lat < -halfPI + eps10) {
                lat = -halfPI + eps10;
            }
        }
        else {
            if (lat > halfPI - eps10) {
                lat = halfPI - eps10;
            }
        }
        var r = c / Math.pow(tany(lat),
            n),
            x = r * Math.sin(n * lon) * scale,
            y = (c - r * Math.cos(n * lon)) * scale,
            xy = [x,
            y];
        if (projectedBounds && (x < projectedBounds.x1 ||
            x > projectedBounds.x2 ||
            y < projectedBounds.y1 ||
            y > projectedBounds.y2)) {
            xy.outside = true;
        }
        return xy;
    };
    LambertConformalConic.prototype.inverse = function (xy) {
        var _a = this, c = _a.c, n = _a.n, x = xy[0] / scale, y = xy[1] / scale, cy = c - y, rho = sign(n) * Math.sqrt(x * x + cy * cy);
        var l = Math.atan2(x,
            Math.abs(cy)) * sign(cy);
        if (cy * n < 0) {
            l -= Math.PI * sign(x) * sign(cy);
        }
        return [
            (l / n) / LambertConformalConic_deg2rad,
            (2 * Math.atan(Math.pow(c / rho, 1 / n)) - halfPI) / LambertConformalConic_deg2rad
        ];
    };
    return LambertConformalConic;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Projections_LambertConformalConic = (LambertConformalConic);

;// ./code/es5/es-modules/Maps/Projections/EqualEarth.js
/* *
 *
 * Equal Earth projection, an equal-area projection designed to minimize
 * distortion and remain pleasing to the eye.
 *
 * Invented by Bojan Šavrič, Bernhard Jenny, and Tom Patterson in 2018. It is
 * inspired by the widely used Robinson projection.
 *
 * */

/* *
 *
 *  Constants
 *
 * */
var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2.0, EqualEarth_scale = 74.03120656864502;
/* *
 *
 *  Class
 *
 * */
var EqualEarth = /** @class */ (function () {
    function EqualEarth() {
        /* *
         *
         *  Properties
         *
         * */
        this.bounds = {
            x1: -200.37508342789243,
            x2: 200.37508342789243,
            y1: -97.52595454902263,
            y2: 97.52595454902263
        };
    }
    /* *
     *
     *  Functions
     *
     * */
    EqualEarth.prototype.forward = function (lonLat) {
        var d = Math.PI / 180,
            paramLat = Math.asin(M * Math.sin(lonLat[1] * d)),
            paramLatSq = paramLat * paramLat,
            paramLatPow6 = paramLatSq * paramLatSq * paramLatSq;
        var x = lonLat[0] * d * Math.cos(paramLat) * EqualEarth_scale /
                (M * (A1 +
                    3 * A2 * paramLatSq +
                    paramLatPow6 * (7 * A3 + 9 * A4 * paramLatSq))),
            y = paramLat * EqualEarth_scale * (A1 + A2 * paramLatSq + paramLatPow6 * (A3 + A4 * paramLatSq));
        return [x, y];
    };
    EqualEarth.prototype.inverse = function (xy) {
        var x = xy[0] / EqualEarth_scale, y = xy[1] / EqualEarth_scale, d = 180 / Math.PI, epsilon = 1e-9;
        var paramLat = y,
            paramLatSq,
            paramLatPow6,
            fy,
            fpy,
            dlat;
        for (var i = 0; i < 12; ++i) {
            paramLatSq = paramLat * paramLat;
            paramLatPow6 = paramLatSq * paramLatSq * paramLatSq;
            fy = paramLat * (A1 + A2 * paramLatSq + paramLatPow6 * (A3 + A4 * paramLatSq)) - y;
            fpy = A1 + 3 * A2 * paramLatSq + paramLatPow6 * (7 * A3 + 9 * A4 * paramLatSq);
            paramLat -= dlat = fy / fpy;
            if (Math.abs(dlat) < epsilon) {
                break;
            }
        }
        paramLatSq = paramLat * paramLat;
        paramLatPow6 = paramLatSq * paramLatSq * paramLatSq;
        var lon = d * M * x * (A1 + 3 * A2 * paramLatSq + paramLatPow6 *
                (7 * A3 + 9 * A4 * paramLatSq)) / Math.cos(paramLat), lat = d * Math.asin(Math.sin(paramLat) / M);
        // If lons are beyond the border of a map -> resolve via break
        if (Math.abs(lon) > 180) {
            return [NaN, NaN];
        }
        return [lon, lat];
    };
    return EqualEarth;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Projections_EqualEarth = (EqualEarth);

;// ./code/es5/es-modules/Maps/Projections/Miller.js
/* *
 * Miller projection
 * */

/* *
 *
 *  Constants
 *
 * */
var quarterPI = Math.PI / 4, Miller_deg2rad = Math.PI / 180, Miller_scale = 63.78137;
/* *
 *
 *  Class
 *
 * */
var Miller = /** @class */ (function () {
    function Miller() {
        /* *
         *
         *  Properties
         *
         * */
        this.bounds = {
            x1: -200.37508342789243,
            x2: 200.37508342789243,
            y1: -146.91480769173063,
            y2: 146.91480769173063
        };
    }
    /* *
     *
     *  Functions
     *
     * */
    Miller.prototype.forward = function (lonLat) {
        return [
            lonLat[0] * Miller_deg2rad * Miller_scale,
            1.25 * Miller_scale * Math.log(Math.tan(quarterPI + 0.4 * lonLat[1] * Miller_deg2rad))
        ];
    };
    Miller.prototype.inverse = function (xy) {
        return [
            (xy[0] / Miller_scale) / Miller_deg2rad,
            2.5 * (Math.atan(Math.exp(0.8 * (xy[1] / Miller_scale))) - quarterPI) / Miller_deg2rad
        ];
    };
    return Miller;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Projections_Miller = (Miller);

;// ./code/es5/es-modules/Maps/Projections/Orthographic.js
/* *
 * Orthographic projection
 * */

/* *
 *
 *  Constants
 *
 * */
var Orthographic_deg2rad = Math.PI / 180, Orthographic_scale = 63.78460826781007;
/* *
 *
 *  Class
 *
 * */
var Orthographic = /** @class */ (function () {
    function Orthographic() {
        /* *
         *
         *  Properties
         *
         * */
        this.antimeridianCutting = false;
        this.bounds = {
            x1: -Orthographic_scale,
            x2: Orthographic_scale,
            y1: -Orthographic_scale,
            y2: Orthographic_scale
        };
    }
    /* *
     *
     *  Functions
     *
     * */
    Orthographic.prototype.forward = function (lonLat) {
        var lonDeg = lonLat[0],
            latDeg = lonLat[1],
            lat = latDeg * Orthographic_deg2rad,
            xy = [
                Math.cos(lat) * Math.sin(lonDeg * Orthographic_deg2rad) * Orthographic_scale,
                Math.sin(lat) * Orthographic_scale
            ];
        if (lonDeg < -90 || lonDeg > 90) {
            xy.outside = true;
        }
        return xy;
    };
    Orthographic.prototype.inverse = function (xy) {
        var x = xy[0] / Orthographic_scale, y = xy[1] / Orthographic_scale, z = Math.sqrt(x * x + y * y), c = Math.asin(z), cSin = Math.sin(c), cCos = Math.cos(c);
        return [
            Math.atan2(x * cSin, z * cCos) / Orthographic_deg2rad,
            Math.asin(z && y * cSin / z) / Orthographic_deg2rad
        ];
    };
    return Orthographic;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Projections_Orthographic = (Orthographic);

;// ./code/es5/es-modules/Maps/Projections/WebMercator.js
/* *
 * Web Mercator projection, used for most online map tile services
 * */

/* *
 *
 *  Constants
 *
 * */
var r = 63.78137, WebMercator_deg2rad = Math.PI / 180;
/* *
 *
 *  Class
 *
 * */
var WebMercator = /** @class */ (function () {
    function WebMercator() {
        /* *
         *
         *  Properties
         *
         * */
        this.bounds = {
            x1: -200.37508342789243,
            x2: 200.37508342789243,
            y1: -200.3750834278071,
            y2: 200.3750834278071
        };
        this.maxLatitude = 85.0511287798; // The latitude that defines a square
    }
    /* *
     *
     *  Functions
     *
     * */
    WebMercator.prototype.forward = function (lonLat) {
        var sinLat = Math.sin(lonLat[1] * WebMercator_deg2rad), xy = [
                r * lonLat[0] * WebMercator_deg2rad,
                r * Math.log((1 + sinLat) / (1 - sinLat)) / 2
            ];
        if (Math.abs(lonLat[1]) > this.maxLatitude) {
            xy.outside = true;
        }
        return xy;
    };
    WebMercator.prototype.inverse = function (xy) {
        return [
            xy[0] / (r * WebMercator_deg2rad),
            (2 * Math.atan(Math.exp(xy[1] / r)) - (Math.PI / 2)) / WebMercator_deg2rad
        ];
    };
    return WebMercator;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Projections_WebMercator = (WebMercator);

;// ./code/es5/es-modules/Maps/Projections/ProjectionRegistry.js
/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Imports
 *
 * */





/* *
 *
 *  Constants
 *
 * */
var projectionRegistry = {
    EqualEarth: Projections_EqualEarth,
    LambertConformalConic: Projections_LambertConformalConic,
    Miller: Projections_Miller,
    Orthographic: Projections_Orthographic,
    WebMercator: Projections_WebMercator
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var ProjectionRegistry = (projectionRegistry);

;// ./code/es5/es-modules/Maps/Projection.js
/* *
 *
 *  (c) 2021 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var Projection_spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

var Projection_clipLineString = Geometry_PolygonClip.clipLineString, Projection_clipPolygon = Geometry_PolygonClip.clipPolygon;


var clamp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).clamp, erase = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).erase;
/* *
 *
 *  Constants
 *
 * */
var Projection_deg2rad = Math.PI * 2 / 360, 
// Safe padding on either side of the antimeridian to avoid points being
// projected to the wrong side of the plane
floatCorrection = 0.000001;
/* *
 *
 *  Functions
 *
 * */
/**
 * Keep longitude within -180 and 180. This is faster than using the modulo
 * operator, and preserves the distinction between -180 and 180.
 * @private
 */
var wrapLon = function (lon) {
    // Replacing the if's with while would increase the range, but make it prone
    // to crashes on bad data
    if (lon < -180) {
        lon += 360;
    }
    if (lon > 180) {
        lon -= 360;
    }
    return lon;
};
/**
 * Calculate the haversine of an angle.
 * @private
 */
var hav = function (radians) { return (1 - Math.cos(radians)) / 2; };
/**
* Calculate the haversine of an angle from two coordinates.
* @private
*/
var havFromCoords = function (point1, point2) {
    var cos = Math.cos,
        lat1 = point1[1] * Projection_deg2rad,
        lon1 = point1[0] * Projection_deg2rad,
        lat2 = point2[1] * Projection_deg2rad,
        lon2 = point2[0] * Projection_deg2rad,
        deltaLat = lat2 - lat1,
        deltaLon = lon2 - lon1,
        havFromCoords = hav(deltaLat) + cos(lat1) * cos(lat2) * hav(deltaLon);
    return havFromCoords;
};
/* *
 *
 *  Class
 *
 * */
var Projection = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function Projection(options) {
        if (options === void 0) { options = {}; }
        // Whether the chart has points, lines or polygons given as coordinates
        // with positive up, as opposed to paths in the SVG plane with positive
        // down.
        this.hasCoordinates = false;
        // Whether the chart has true projection as opposed to pre-projected geojson
        // as in the legacy map collection.
        this.hasGeoProjection = false;
        this.maxLatitude = 90;
        this.options = options;
        var name = options.name,
            projectedBounds = options.projectedBounds,
            rotation = options.rotation;
        this.rotator = rotation ? this.getRotator(rotation) : void 0;
        var ProjectionDefinition = name ? Projection.registry[name] : void 0;
        if (ProjectionDefinition) {
            this.def = new ProjectionDefinition(options);
        }
        var _a = this,
            def = _a.def,
            rotator = _a.rotator;
        if (def) {
            this.maxLatitude = def.maxLatitude || 90;
            this.hasGeoProjection = true;
        }
        if (rotator && def) {
            this.forward = function (lonLat) {
                return def.forward(rotator.forward(lonLat));
            };
            this.inverse = function (xy) {
                return rotator.inverse(def.inverse(xy));
            };
        }
        else if (def) {
            this.forward = function (lonLat) { return def.forward(lonLat); };
            this.inverse = function (xy) { return def.inverse(xy); };
        }
        else if (rotator) {
            this.forward = rotator.forward;
            this.inverse = rotator.inverse;
        }
        // Projected bounds/clipping
        this.bounds = projectedBounds === 'world' ?
            def && def.bounds :
            projectedBounds;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * Add a projection definition to the registry, accessible by its `name`.
     * @private
     */
    Projection.add = function (name, definition) {
        Projection.registry[name] = definition;
    };
    /**
     * Calculate the distance in meters between two given coordinates.
     * @private
     */
    Projection.distance = function (point1, point2) {
        var atan2 = Math.atan2,
            sqrt = Math.sqrt,
            hav = havFromCoords(point1,
            point2),
            angularDistance = 2 * atan2(sqrt(hav),
            sqrt(1 - hav)),
            distance = angularDistance * 6371e3;
        return distance;
    };
    /**
     * Calculate the geodesic line string between two given coordinates.
     * @private
     */
    Projection.geodesic = function (point1, point2, inclusive, stepDistance) {
        if (stepDistance === void 0) { stepDistance = 500000; }
        var atan2 = Math.atan2, cos = Math.cos, sin = Math.sin, sqrt = Math.sqrt, distance = Projection.distance, lat1 = point1[1] * Projection_deg2rad, lon1 = point1[0] * Projection_deg2rad, lat2 = point2[1] * Projection_deg2rad, lon2 = point2[0] * Projection_deg2rad, cosLat1CosLon1 = cos(lat1) * cos(lon1), cosLat2CosLon2 = cos(lat2) * cos(lon2), cosLat1SinLon1 = cos(lat1) * sin(lon1), cosLat2SinLon2 = cos(lat2) * sin(lon2), sinLat1 = sin(lat1), sinLat2 = sin(lat2), pointDistance = distance(point1, point2), angDistance = pointDistance / 6371e3, sinAng = sin(angDistance), jumps = Math.round(pointDistance / stepDistance), lineString = [];
        if (inclusive) {
            lineString.push(point1);
        }
        if (jumps > 1) {
            var step = 1 / jumps;
            for (var fraction = step; fraction < 0.999; // Account for float errors
             fraction += step) {
                // Add intermediate point to lineString
                var A = sin((1 - fraction) * angDistance) / sinAng, B = sin(fraction * angDistance) / sinAng, x = A * cosLat1CosLon1 + B * cosLat2CosLon2, y = A * cosLat1SinLon1 + B * cosLat2SinLon2, z = A * sinLat1 + B * sinLat2, lat3 = atan2(z, sqrt(x * x + y * y)), lon3 = atan2(y, x);
                lineString.push([lon3 / Projection_deg2rad, lat3 / Projection_deg2rad]);
            }
        }
        if (inclusive) {
            lineString.push(point2);
        }
        return lineString;
    };
    Projection.insertGeodesics = function (poly) {
        var i = poly.length - 1;
        while (i--) {
            // Distance in degrees, either in lon or lat. Avoid heavy
            // calculation of true distance.
            var roughDistance = Math.max(Math.abs(poly[i][0] - poly[i + 1][0]),
                Math.abs(poly[i][1] - poly[i + 1][1]));
            if (roughDistance > 10) {
                var geodesic = Projection.geodesic(poly[i],
                    poly[i + 1]);
                if (geodesic.length) {
                    poly.splice.apply(poly, Projection_spreadArray([i + 1, 0], geodesic, false));
                }
            }
        }
    };
    Projection.toString = function (options) {
        var _a = options || {},
            name = _a.name,
            rotation = _a.rotation;
        return [name, rotation && rotation.join(',')].join(';');
    };
    /* *
     *
     *  Functions
     *
     * */
    Projection.prototype.lineIntersectsBounds = function (line) {
        var _a = this.bounds || {},
            x1 = _a.x1,
            x2 = _a.x2,
            y1 = _a.y1,
            y2 = _a.y2;
        var getIntersect = function (line,
            dim,
            val) {
                var p1 = line[0],
            p2 = line[1],
            otherDim = dim ? 0 : 1;
            // Check if points are on either side of the line
            if (typeof val === 'number' && p1[dim] >= val !== p2[dim] >= val) {
                var fraction = ((val - p1[dim]) / (p2[dim] - p1[dim])),
                    crossingVal = p1[otherDim] +
                        fraction * (p2[otherDim] - p1[otherDim]);
                return dim ? [crossingVal, val] : [val, crossingVal];
            }
        };
        var intersection,
            ret = line[0];
        if ((intersection = getIntersect(line, 0, x1))) {
            ret = intersection;
            // Assuming line[1] was originally outside, replace it with the
            // intersection point so that the horizontal intersection will
            // be correct.
            line[1] = intersection;
        }
        else if ((intersection = getIntersect(line, 0, x2))) {
            ret = intersection;
            line[1] = intersection;
        }
        if ((intersection = getIntersect(line, 1, y1))) {
            ret = intersection;
        }
        else if ((intersection = getIntersect(line, 1, y2))) {
            ret = intersection;
        }
        return ret;
    };
    /**
     * Take the rotation options and returns the appropriate projection
     * functions.
     * @private
     */
    Projection.prototype.getRotator = function (rotation) {
        var deltaLambda = rotation[0] * Projection_deg2rad,
            deltaPhi = (rotation[1] || 0) * Projection_deg2rad,
            deltaGamma = (rotation[2] || 0) * Projection_deg2rad;
        var cosDeltaPhi = Math.cos(deltaPhi),
            sinDeltaPhi = Math.sin(deltaPhi),
            cosDeltaGamma = Math.cos(deltaGamma),
            sinDeltaGamma = Math.sin(deltaGamma);
        if (deltaLambda === 0 && deltaPhi === 0 && deltaGamma === 0) {
            // Don't waste processing time
            return;
        }
        return {
            forward: function (lonLat) {
                // Lambda (lon) rotation
                var lon = lonLat[0] * Projection_deg2rad + deltaLambda;
                // Phi (lat) and gamma rotation
                var lat = lonLat[1] * Projection_deg2rad,
                    cosLat = Math.cos(lat),
                    x = Math.cos(lon) * cosLat,
                    y = Math.sin(lon) * cosLat,
                    sinLat = Math.sin(lat),
                    k = sinLat * cosDeltaPhi + x * sinDeltaPhi;
                return [
                    Math.atan2(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - sinLat * sinDeltaPhi) / Projection_deg2rad,
                    Math.asin(k * cosDeltaGamma + y * sinDeltaGamma) / Projection_deg2rad
                ];
            },
            inverse: function (rLonLat) {
                // Lambda (lon) unrotation
                var lon = rLonLat[0] * Projection_deg2rad;
                // Phi (lat) and gamma unrotation
                var lat = rLonLat[1] * Projection_deg2rad,
                    cosLat = Math.cos(lat),
                    x = Math.cos(lon) * cosLat,
                    y = Math.sin(lon) * cosLat,
                    sinLat = Math.sin(lat),
                    k = sinLat * cosDeltaGamma - y * sinDeltaGamma;
                return [
                    (Math.atan2(y * cosDeltaGamma + sinLat * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi) - deltaLambda) / Projection_deg2rad,
                    Math.asin(k * cosDeltaPhi - x * sinDeltaPhi) / Projection_deg2rad
                ];
            }
        };
    };
    /**
     * Project a lonlat coordinate position to xy. Dynamically overridden when
     * projection is set.
     * @private
     */
    Projection.prototype.forward = function (lonLat) {
        return lonLat;
    };
    /**
     * Unproject an xy chart coordinate position to lonlat. Dynamically
     * overridden when projection is set.
     * @private
     */
    Projection.prototype.inverse = function (xy) {
        return xy;
    };
    Projection.prototype.cutOnAntimeridian = function (poly, isPolygon) {
        var antimeridian = 180,
            intersections = [];
        var polygons = [poly];
        for (var i = 0, iEnd = poly.length; i < iEnd; ++i) {
            var lonLat = poly[i];
            var previousLonLat = poly[i - 1];
            if (!i) {
                if (!isPolygon) {
                    continue;
                }
                // Else, wrap to beginning
                previousLonLat = poly[poly.length - 1];
            }
            var lon1 = previousLonLat[0],
                lon2 = lonLat[0];
            if (
            // Both points, after rotating for antimeridian, are on the far
            // side of the Earth
            (lon1 < -90 || lon1 > 90) &&
                (lon2 < -90 || lon2 > 90) &&
                // ... and on either side of the plane
                (lon1 > 0) !== (lon2 > 0)) {
                // Interpolate to the intersection latitude
                var fraction = clamp((antimeridian - (lon1 + 360) % 360) /
                        ((lon2 + 360) % 360 - (lon1 + 360) % 360), 0, 1),
                    lat = (previousLonLat[1] +
                        fraction * (lonLat[1] - previousLonLat[1]));
                intersections.push({
                    i: i,
                    lat: lat,
                    direction: lon1 < 0 ? 1 : -1,
                    previousLonLat: previousLonLat,
                    lonLat: lonLat
                });
            }
        }
        var polarIntersection;
        if (intersections.length) {
            if (isPolygon) {
                // Simplified use of the even-odd rule, if there is an odd
                // amount of intersections between the polygon and the
                // antimeridian, the pole is inside the polygon. Applies
                // primarily to Antarctica.
                if (intersections.length % 2 === 1) {
                    polarIntersection = intersections.slice().sort(function (a, b) { return Math.abs(b.lat) - Math.abs(a.lat); })[0];
                    erase(intersections, polarIntersection);
                }
                // Pull out slices of the polygon that is on the opposite side
                // of the antimeridian compared to the starting point
                var i = intersections.length - 2;
                while (i >= 0) {
                    var index = intersections[i].i;
                    var lonPlus = wrapLon(antimeridian +
                            intersections[i].direction * floatCorrection);
                    var lonMinus = wrapLon(antimeridian -
                            intersections[i].direction * floatCorrection);
                    var slice = poly.splice.apply(poly,
                        Projection_spreadArray([index,
                            intersections[i + 1].i - index],
                        Projection.geodesic([lonPlus,
                        intersections[i].lat],
                        [lonPlus,
                        intersections[i + 1].lat],
                        true),
                        false));
                    // Add interpolated points close to the cut
                    slice.push.apply(slice, Projection.geodesic([lonMinus, intersections[i + 1].lat], [lonMinus, intersections[i].lat], true));
                    polygons.push(slice);
                    i -= 2;
                }
                // Insert dummy points close to the pole
                if (polarIntersection) {
                    for (var i_1 = 0; i_1 < polygons.length; i_1++) {
                        var direction = polarIntersection.direction,
                            lat = polarIntersection.lat,
                            poly_1 = polygons[i_1],
                            indexOf = poly_1.indexOf(polarIntersection.lonLat);
                        if (indexOf > -1) {
                            var polarLatitude = (lat < 0 ? -1 : 1) *
                                    this.maxLatitude;
                            var lon1 = wrapLon(antimeridian +
                                    direction * floatCorrection);
                            var lon2 = wrapLon(antimeridian -
                                    direction * floatCorrection);
                            var polarSegment = Projection.geodesic([lon1,
                                lat],
                                [lon1,
                                polarLatitude],
                                true);
                            // Circle around the pole point in order to make
                            // polygon clipping right. Without this, Antarctica
                            // would wrap the wrong way in an LLC projection
                            // with parallels [30, 40].
                            for (var lon = lon1 + 120 * direction; lon > -180 && lon < 180; lon += 120 * direction) {
                                polarSegment.push([lon, polarLatitude]);
                            }
                            polarSegment.push.apply(polarSegment, Projection.geodesic([lon2, polarLatitude], [lon2, polarIntersection.lat], true));
                            poly_1.splice.apply(poly_1, Projection_spreadArray([indexOf,
                                0], polarSegment, false));
                            break;
                        }
                    }
                }
                // Map lines, not closed
            }
            else {
                var i = intersections.length;
                while (i--) {
                    var index = intersections[i].i;
                    var slice = poly.splice(index,
                        poly.length, 
                        // Add interpolated point close to the cut
                        [
                            wrapLon(antimeridian +
                                intersections[i].direction * floatCorrection),
                            intersections[i].lat
                        ]);
                    // Add interpolated point close to the cut
                    slice.unshift([
                        wrapLon(antimeridian -
                            intersections[i].direction * floatCorrection),
                        intersections[i].lat
                    ]);
                    polygons.push(slice);
                }
            }
        }
        return polygons;
    };
    /**
     * Take a GeoJSON geometry and return a translated SVGPath.
     * @private
     */
    Projection.prototype.path = function (geometry) {
        var _this = this;
        var _a = this,
            bounds = _a.bounds,
            def = _a.def,
            rotator = _a.rotator;
        var antimeridian = 180;
        var path = [];
        var isPolygon = geometry.type === 'Polygon' ||
                geometry.type === 'MultiPolygon';
        // @todo: It doesn't really have to do with whether north is
        // positive. It depends on whether the coordinates are
        // pre-projected.
        var hasGeoProjection = this.hasGeoProjection;
        // Detect whether we need to do antimeridian cutting and clipping to
        // bounds. The alternative (currently for Orthographic) is to apply a
        // clip angle.
        var projectingToPlane = !def || def.antimeridianCutting !== false;
        // We need to rotate in a separate step before applying antimeridian
        // cutting
        var preclip = projectingToPlane ? rotator : void 0;
        var postclip = projectingToPlane ? (def || this) : this;
        var boundsPolygon;
        if (bounds) {
            boundsPolygon = [
                [bounds.x1, bounds.y1],
                [bounds.x2, bounds.y1],
                [bounds.x2, bounds.y2],
                [bounds.x1, bounds.y2]
            ];
        }
        var addToPath = function (polygon) {
                // Create a copy of the original coordinates. The copy applies a
                // correction of points close to the antimeridian in order to
                // prevent the points to be projected to the wrong side of the
                // plane. Float errors in topojson or in the projection may cause
                // that.
                var poly = polygon.map(function (lonLat) {
                    if (projectingToPlane) {
                        if (preclip) {
                            lonLat = preclip.forward(lonLat);
                    }
                    var lon = lonLat[0];
                    if (Math.abs(lon - antimeridian) < floatCorrection) {
                        if (lon < antimeridian) {
                            lon = antimeridian - floatCorrection;
                        }
                        else {
                            lon = antimeridian + floatCorrection;
                        }
                    }
                    lonLat = [lon, lonLat[1]];
                }
                return lonLat;
            });
            var polygons = [poly];
            if (hasGeoProjection) {
                // Insert great circles into long straight lines
                Projection.insertGeodesics(poly);
                if (projectingToPlane) {
                    polygons = _this.cutOnAntimeridian(poly, isPolygon);
                }
            }
            polygons.forEach(function (poly) {
                if (poly.length < 2) {
                    return;
                }
                var movedTo = false;
                var firstValidLonLat;
                var lastValidLonLat;
                var gap = false;
                var pushToPath = function (point) {
                        if (!movedTo) {
                            path.push(['M',
                    point[0],
                    point[1]]);
                        movedTo = true;
                    }
                    else {
                        path.push(['L', point[0], point[1]]);
                    }
                };
                var someOutside = false,
                    someInside = false;
                var points = poly.map(function (lonLat) {
                        var xy = postclip.forward(lonLat);
                    if (xy.outside) {
                        someOutside = true;
                    }
                    else {
                        someInside = true;
                    }
                    // Mercator projects pole points to Infinity, and
                    // clipPolygon is not able to handle it.
                    if (xy[1] === Infinity) {
                        xy[1] = 10e9;
                    }
                    else if (xy[1] === -Infinity) {
                        xy[1] = -10e9;
                    }
                    return xy;
                });
                if (projectingToPlane) {
                    // Wrap around in order for pointInPolygon to work
                    if (isPolygon) {
                        points.push(points[0]);
                    }
                    if (someOutside) {
                        // All points are outside
                        if (!someInside) {
                            return;
                        }
                        // Some inside, some outside. Clip to the bounds.
                        if (boundsPolygon) {
                            // Polygons
                            if (isPolygon) {
                                points = Projection_clipPolygon(points, boundsPolygon);
                                // Linestrings
                            }
                            else if (bounds) {
                                Projection_clipLineString(points, boundsPolygon)
                                    .forEach(function (points) {
                                    movedTo = false;
                                    points.forEach(pushToPath);
                                });
                                return;
                            }
                        }
                    }
                    points.forEach(pushToPath);
                    // For orthographic projection, or when a clipAngle applies
                }
                else {
                    for (var i = 0; i < points.length; i++) {
                        var lonLat = poly[i],
                            point = points[i];
                        if (!point.outside) {
                            // In order to be able to interpolate if the first
                            // or last point is invalid (on the far side of the
                            // globe in an orthographic projection), we need to
                            // push the first valid point to the end of the
                            // polygon.
                            if (isPolygon && !firstValidLonLat) {
                                firstValidLonLat = lonLat;
                                poly.push(lonLat);
                                points.push(point);
                            }
                            // When entering the first valid point after a gap
                            // of invalid points, typically on the far side of
                            // the globe in an orthographic projection.
                            if (gap && lastValidLonLat) {
                                // For areas, in an orthographic projection, the
                                // great circle between two visible points will
                                // be close to the horizon. A possible exception
                                // may be when the two points are on opposite
                                // sides of the globe. It that poses a problem,
                                // we may have to rewrite this to use the small
                                // circle related to the current lon0 and lat0.
                                if (isPolygon && hasGeoProjection) {
                                    var geodesic = Projection.geodesic(lastValidLonLat,
                                        lonLat);
                                    geodesic.forEach(function (lonLat) {
                                        return pushToPath(postclip.forward(lonLat));
                                    });
                                    // For lines, just jump over the gap
                                }
                                else {
                                    movedTo = false;
                                }
                            }
                            pushToPath(point);
                            lastValidLonLat = lonLat;
                            gap = false;
                        }
                        else {
                            gap = true;
                        }
                    }
                }
            });
        };
        if (geometry.type === 'LineString') {
            addToPath(geometry.coordinates);
        }
        else if (geometry.type === 'MultiLineString') {
            geometry.coordinates.forEach(function (c) { return addToPath(c); });
        }
        else if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(function (c) { return addToPath(c); });
            if (path.length) {
                path.push(['Z']);
            }
        }
        else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(function (polygons) {
                polygons.forEach(function (c) { return addToPath(c); });
            });
            if (path.length) {
                path.push(['Z']);
            }
        }
        return path;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    Projection.registry = ProjectionRegistry;
    return Projection;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_Projection = (Projection);

;// ./code/es5/es-modules/Maps/MapView.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapView_extends = (undefined && undefined.__extends) || (function () {
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
var MapView_spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

var MapView_composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;



var pointInPolygon = Geometry_GeometryUtilities.pointInPolygon;
var topo2geo = Maps_GeoJSONComposition.topo2geo;

var MapView_boundsFromPath = Maps_MapUtilities.boundsFromPath;


var MapView_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, MapView_clamp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).clamp, crisp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).crisp, MapView_fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, MapView_isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, MapView_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, isObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isObject, isString = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isString, MapView_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, MapView_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, MapView_pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique, MapView_relativeLength = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).relativeLength;
/* *
 *
 *  Constants
 *
 * */
var tileSize = 256;
/**
 * The world size in terms of 10k meters in the Web Mercator projection, to
 * match a 256 square tile to zoom level 0.
 * @private
 */
var worldSize = 400.979322;
/* *
 *
 *  Variables
 *
 * */
var maps = {};
/* *
 *
 *  Functions
 *
 * */
/**
 * Compute the zoom from given bounds and the size of the playing field. Used in
 * two places, hence the local function.
 * @private
 */
function zoomFromBounds(b, playingField) {
    var width = playingField.width, height = playingField.height, scaleToField = Math.max((b.x2 - b.x1) / (width / tileSize), (b.y2 - b.y1) / (height / tileSize));
    return Math.log(worldSize / scaleToField) / Math.log(2);
}
/**
 * Calculate and set the recommended map view drilldown or drillup if mapData
 * is set for the series.
 * @private
 */
function recommendedMapViewAfterDrill(e) {
    var _a,
        _b;
    if (e.seriesOptions.mapData) {
        (_a = this.mapView) === null || _a === void 0 ? void 0 : _a.recommendMapView(this, [
            this.options.chart.map,
            e.seriesOptions.mapData
        ], (_b = this.options.drilldown) === null || _b === void 0 ? void 0 : _b.mapZooming);
    }
}
/*
Const mergeCollections = <
    T extends Array<AnyRecord|undefined>
>(a: T, b: T): T => {
    b.forEach((newer, i): void => {
        // Only merge by id supported for now. We may consider later to support
        // more complex rules like those of `Chart.update` with `oneToOne`, but
        // it is probably not needed. Existing insets can be disabled by
        // overwriting the `geoBounds` with empty data.
        if (newer && isString(newer.id)) {
            const older = U.find(
                a,
                (aItem): boolean => (aItem && aItem.id) === newer.id
            );
            if (older) {
                const aIndex = a.indexOf(older);
                a[aIndex] = merge(older, newer);
            }
        }
    });
    return a;
};
*/
/* *
 *
 *  Classes
 *
 * */
/**
 * The map view handles zooming and centering on the map, and various
 * client-side projection capabilities.
 *
 * On a chart instance of `MapChart`, the map view is available as `chart.mapView`.
 *
 * @class
 * @name Highcharts.MapView
 *
 * @param {Highcharts.MapChart} chart
 *        The MapChart instance
 * @param {Highcharts.MapViewOptions} options
 *        MapView options
 */
var MapView = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function MapView(chart, options) {
        var _this = this;
        var _a;
        /* *
         *
         *  Properties
         *
         * */
        this.allowTransformAnimation = true;
        this.eventsToUnbind = [];
        this.insets = [];
        this.padding = [0, 0, 0, 0];
        this.recommendedMapView = {};
        if (!(this instanceof MapViewInset)) {
            this.recommendMapView(chart, MapView_spreadArray([
                chart.options.chart.map
            ], (chart.options.series || []).map(function (s) { return s.mapData; }), true));
        }
        this.userOptions = options || {};
        var o = MapView_merge(Maps_MapViewDefaults,
            this.recommendedMapView,
            options);
        // Merge the inset collections by id, or index if id missing
        var recInsets = (_a = this.recommendedMapView) === null || _a === void 0 ? void 0 : _a.insets,
            optInsets = options && options.insets;
        if (recInsets && optInsets) {
            o.insets = MapView.mergeInsets(recInsets, optInsets);
        }
        this.chart = chart;
        /**
         * The current center of the view in terms of `[longitude, latitude]`.
         * @name Highcharts.MapView#center
         * @readonly
         * @type {LonLatArray}
         */
        this.center = o.center;
        this.options = o;
        this.projection = new Maps_Projection(o.projection);
        // Initialize with full plot box so we don't have to check for undefined
        // every time we use it
        this.playingField = chart.plotBox;
        /**
         * The current zoom level of the view.
         * @name Highcharts.MapView#zoom
         * @readonly
         * @type {number}
         */
        this.zoom = o.zoom || 0;
        this.minZoom = o.minZoom;
        // Create the insets
        this.createInsets();
        // Initialize and respond to chart size changes
        this.eventsToUnbind.push(MapView_addEvent(chart, 'afterSetChartSize', function () {
            _this.playingField = _this.getField();
            if (_this.minZoom === void 0 || // When initializing the chart
                _this.minZoom === _this.zoom // When resizing the chart
            ) {
                _this.fitToBounds(void 0, void 0, false);
                if (
                // Set zoom only when initializing the chart
                // (do not overwrite when zooming in/out, #17082)
                !_this.chart.hasRendered &&
                    MapView_isNumber(_this.userOptions.zoom)) {
                    _this.zoom = _this.userOptions.zoom;
                }
                if (_this.userOptions.center) {
                    MapView_merge(true, _this.center, _this.userOptions.center);
                }
            }
        }));
        this.setUpEvents();
    }
    /* *
     *
     *  Static Functions
     *
     * */
    MapView.compose = function (MapChartClass) {
        if (MapView_pushUnique(MapView_composed, 'MapView')) {
            maps = MapChartClass.maps;
            // Initialize MapView after initialization, but before firstRender
            MapView_addEvent(MapChartClass, 'afterInit', function () {
                /**
                 * The map view handles zooming and centering on the map, and
                 * various client-side projection capabilities.
                 *
                 * @name Highcharts.MapChart#mapView
                 * @type {Highcharts.MapView|undefined}
                 */
                this.mapView = new MapView(this, this.options.mapView);
            }, { order: 0 });
            MapView_addEvent(MapChartClass, 'addSeriesAsDrilldown', recommendedMapViewAfterDrill);
            MapView_addEvent(MapChartClass, 'afterDrillUp', recommendedMapViewAfterDrill);
        }
    };
    /**
     * Return the composite bounding box of a collection of bounding boxes
     * @private
     */
    MapView.compositeBounds = function (arrayOfBounds) {
        if (arrayOfBounds.length) {
            return arrayOfBounds
                .slice(1)
                .reduce(function (acc, cur) {
                acc.x1 = Math.min(acc.x1, cur.x1);
                acc.y1 = Math.min(acc.y1, cur.y1);
                acc.x2 = Math.max(acc.x2, cur.x2);
                acc.y2 = Math.max(acc.y2, cur.y2);
                return acc;
            }, MapView_merge(arrayOfBounds[0]));
        }
        return;
    };
    /**
     * Merge two collections of insets by the id.
     * @private
     */
    MapView.mergeInsets = function (a, b) {
        var toObject = function (insets) {
                var ob = {};
            insets.forEach(function (inset, i) {
                ob[inset && inset.id || "i".concat(i)] = inset;
            });
            return ob;
        };
        var insetsObj = MapView_merge(toObject(a),
            toObject(b)),
            insets = Object
                .keys(insetsObj)
                .map(function (key) { return insetsObj[key]; });
        return insets;
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Create MapViewInset instances from insets options
     * @private
     */
    MapView.prototype.createInsets = function () {
        var _this = this;
        var options = this.options,
            insets = options.insets;
        if (insets) {
            insets.forEach(function (item) {
                var inset = new MapViewInset(_this,
                    MapView_merge(options.insetOptions,
                    item));
                _this.insets.push(inset);
            });
        }
    };
    /**
     * Fit the view to given bounds
     *
     * @function Highcharts.MapView#fitToBounds
     * @param {Object} bounds
     *        Bounds in terms of projected units given as  `{ x1, y1, x2, y2 }`.
     *        If not set, fit to the bounds of the current data set
     * @param {number|string} [padding=0]
     *        Padding inside the bounds. A number signifies pixels, while a
     *        percentage string (like `5%`) can be used as a fraction of the
     *        plot area size.
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart immediately
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        What animation to use for redraw
     */
    MapView.prototype.fitToBounds = function (bounds, padding, redraw, animation) {
        if (redraw === void 0) { redraw = true; }
        var b = bounds || this.getProjectedBounds();
        if (b) {
            var pad = MapView_pick(padding,
                bounds ? 0 : this.options.padding),
                fullField = this.getField(false),
                padArr = MapView_isArray(pad) ? pad : [pad,
                pad,
                pad,
                pad];
            this.padding = [
                MapView_relativeLength(padArr[0], fullField.height),
                MapView_relativeLength(padArr[1], fullField.width),
                MapView_relativeLength(padArr[2], fullField.height),
                MapView_relativeLength(padArr[3], fullField.width)
            ];
            // Apply the playing field, corrected with padding
            this.playingField = this.getField();
            var zoom = zoomFromBounds(b,
                this.playingField);
            // Reset minZoom when fitting to natural bounds
            if (!bounds) {
                this.minZoom = zoom;
            }
            var center = this.projection.inverse([
                    (b.x2 + b.x1) / 2,
                    (b.y2 + b.y1) / 2
                ]);
            this.setView(center, zoom, redraw, animation);
        }
    };
    MapView.prototype.getField = function (padded) {
        if (padded === void 0) { padded = true; }
        var padding = padded ? this.padding : [0, 0, 0, 0];
        return {
            x: padding[3],
            y: padding[0],
            width: this.chart.plotWidth - padding[1] - padding[3],
            height: this.chart.plotHeight - padding[0] - padding[2]
        };
    };
    MapView.prototype.getGeoMap = function (map) {
        if (isString(map)) {
            if (maps[map] && maps[map].type === 'Topology') {
                return topo2geo(maps[map]);
            }
            return maps[map];
        }
        if (isObject(map, true)) {
            if (map.type === 'FeatureCollection') {
                return map;
            }
            if (map.type === 'Topology') {
                return topo2geo(map);
            }
        }
    };
    MapView.prototype.getMapBBox = function () {
        var bounds = this.getProjectedBounds(),
            scale = this.getScale();
        if (bounds) {
            var padding = this.padding,
                p1 = this.projectedUnitsToPixels({
                    x: bounds.x1,
                    y: bounds.y2
                }),
                width = ((bounds.x2 - bounds.x1) * scale +
                    padding[1] + padding[3]),
                height = ((bounds.y2 - bounds.y1) * scale +
                    padding[0] + padding[2]);
            return {
                width: width,
                height: height,
                x: p1.x - padding[3],
                y: p1.y - padding[0]
            };
        }
    };
    MapView.prototype.getProjectedBounds = function () {
        var projection = this.projection;
        var allBounds = this.chart.series.reduce(function (acc,
            s) {
                var bounds = s.getProjectedBounds && s.getProjectedBounds();
            if (bounds &&
                s.options.affectsMapView !== false) {
                acc.push(bounds);
            }
            return acc;
        }, []);
        // The bounds option
        var fitToGeometry = this.options.fitToGeometry;
        if (fitToGeometry) {
            if (!this.fitToGeometryCache) {
                if (fitToGeometry.type === 'MultiPoint') {
                    var positions = fitToGeometry.coordinates
                            .map(function (lonLat) {
                            return projection.forward(lonLat);
                    }), xs = positions.map(function (pos) { return pos[0]; }), ys = positions.map(function (pos) { return pos[1]; });
                    this.fitToGeometryCache = {
                        x1: Math.min.apply(0, xs),
                        x2: Math.max.apply(0, xs),
                        y1: Math.min.apply(0, ys),
                        y2: Math.max.apply(0, ys)
                    };
                }
                else {
                    this.fitToGeometryCache = MapView_boundsFromPath(projection.path(fitToGeometry));
                }
            }
            return this.fitToGeometryCache;
        }
        return this.projection.bounds || MapView.compositeBounds(allBounds);
    };
    MapView.prototype.getScale = function () {
        // A zoom of 0 means the world (360x360 degrees) fits in a 256x256 px
        // tile
        return (tileSize / worldSize) * Math.pow(2, this.zoom);
    };
    // Calculate the SVG transform to be applied to series groups
    MapView.prototype.getSVGTransform = function () {
        var _a = this.playingField, x = _a.x, y = _a.y, width = _a.width, height = _a.height, projectedCenter = this.projection.forward(this.center), flipFactor = this.projection.hasCoordinates ? -1 : 1, scaleX = this.getScale(), scaleY = scaleX * flipFactor, translateX = x + width / 2 - projectedCenter[0] * scaleX, translateY = y + height / 2 - projectedCenter[1] * scaleY;
        return { scaleX: scaleX, scaleY: scaleY, translateX: translateX, translateY: translateY };
    };
    /**
     * Convert map coordinates in longitude/latitude to pixels
     *
     * @function Highcharts.MapView#lonLatToPixels
     * @since 10.0.0
     * @param  {Highcharts.MapLonLatObject} lonLat
     *         The map coordinates
     * @return {Highcharts.PositionObject|undefined}
     *         The pixel position
     */
    MapView.prototype.lonLatToPixels = function (lonLat) {
        var pos = this.lonLatToProjectedUnits(lonLat);
        if (pos) {
            return this.projectedUnitsToPixels(pos);
        }
    };
    /**
     * Get projected units from longitude/latitude. Insets are accounted for.
     * Returns an object with x and y values corresponding to positions on the
     * projected plane.
     *
     * @requires modules/map
     *
     * @function Highcharts.MapView#lonLatToProjectedUnits
     *
     * @since 10.0.0
     * @sample maps/series/latlon-to-point/ Find a point from lon/lat
     *
     * @param {Highcharts.MapLonLatObject} lonLat Coordinates.
     *
     * @return {Highcharts.ProjectedXY} X and Y coordinates in terms of
     *      projected values
     */
    MapView.prototype.lonLatToProjectedUnits = function (lonLat) {
        var chart = this.chart,
            mapTransforms = chart.mapTransforms;
        // Legacy, built-in transforms
        if (mapTransforms) {
            for (var transform in mapTransforms) {
                if (Object.hasOwnProperty.call(mapTransforms, transform) &&
                    mapTransforms[transform].hitZone) {
                    var coords = chart.transformFromLatLon(lonLat,
                        mapTransforms[transform]);
                    if (coords && pointInPolygon(coords, mapTransforms[transform].hitZone.coordinates[0])) {
                        return coords;
                    }
                }
            }
            return chart.transformFromLatLon(lonLat, mapTransforms['default'] // eslint-disable-line dot-notation
            );
        }
        // Handle insets
        for (var _i = 0, _a = this.insets; _i < _a.length; _i++) {
            var inset = _a[_i];
            if (inset.options.geoBounds &&
                pointInPolygon({ x: lonLat.lon, y: lonLat.lat }, inset.options.geoBounds.coordinates[0])) {
                var insetProjectedPoint = inset.projection.forward([lonLat.lon,
                    lonLat.lat]),
                    pxPoint = inset.projectedUnitsToPixels({ x: insetProjectedPoint[0],
                    y: insetProjectedPoint[1] });
                return this.pixelsToProjectedUnits(pxPoint);
            }
        }
        var point = this.projection.forward([lonLat.lon,
            lonLat.lat]);
        if (!point.outside) {
            return { x: point[0], y: point[1] };
        }
    };
    /**
     * Calculate longitude/latitude values for a point or position. Returns an
     * object with the numeric properties `lon` and `lat`.
     *
     * @requires modules/map
     *
     * @function Highcharts.MapView#projectedUnitsToLonLat
     *
     * @since 10.0.0
     *
     * @sample maps/demo/latlon-advanced/ Advanced lat/lon demo
     *
     * @param {Highcharts.Point|Highcharts.ProjectedXY} point
     *        A `Point` instance or anything containing `x` and `y` properties
     *        with numeric values.
     *
     * @return {Highcharts.MapLonLatObject|undefined} An object with `lat` and
     *         `lon` properties.
     */
    MapView.prototype.projectedUnitsToLonLat = function (point) {
        var chart = this.chart,
            mapTransforms = chart.mapTransforms;
        // Legacy, built-in transforms
        if (mapTransforms) {
            for (var transform in mapTransforms) {
                if (Object.hasOwnProperty.call(mapTransforms, transform) &&
                    mapTransforms[transform].hitZone &&
                    pointInPolygon(point, mapTransforms[transform].hitZone.coordinates[0])) {
                    return chart.transformToLatLon(point, mapTransforms[transform]);
                }
            }
            return chart.transformToLatLon(point, mapTransforms['default'] // eslint-disable-line dot-notation
            );
        }
        var pxPoint = this.projectedUnitsToPixels(point);
        for (var _i = 0, _a = this.insets; _i < _a.length; _i++) {
            var inset = _a[_i];
            if (inset.hitZone &&
                pointInPolygon(pxPoint, inset.hitZone.coordinates[0])) {
                var insetProjectedPoint = inset
                        .pixelsToProjectedUnits(pxPoint),
                    coordinates_1 = inset.projection.inverse([insetProjectedPoint.x,
                    insetProjectedPoint.y]);
                return { lon: coordinates_1[0], lat: coordinates_1[1] };
            }
        }
        var coordinates = this.projection.inverse([point.x,
            point.y]);
        return { lon: coordinates[0], lat: coordinates[1] };
    };
    /**
     * Calculate and set the recommended map view based on provided map data
     * from series.
     *
     * @requires modules/map
     *
     * @function Highcharts.MapView#recommendMapView
     *
     * @since 11.4.0
     *
     * @param {Highcharts.Chart} chart
     *        Chart object
     *
     * @param {Array<MapDataType | undefined>} mapDataArray
     *        Array of map data from all series.
     *
     * @param {boolean} [update=false]
     *        Whether to update the chart with recommended map view.
     *
     * @return {Highcharts.MapViewOptions|undefined} Best suitable map view.
     */
    MapView.prototype.recommendMapView = function (chart, mapDataArray, update) {
        var _this = this;
        var _a;
        if (update === void 0) { update = false; }
        // Reset recommended map view
        this.recommendedMapView = {};
        // Handle the global map and series-level mapData
        var geoMaps = mapDataArray.map(function (mapData) {
                return _this.getGeoMap(mapData);
        });
        var allGeoBounds = [];
        geoMaps.forEach(function (geoMap) {
            if (geoMap) {
                // Use the first geo map as main
                if (!Object.keys(_this.recommendedMapView).length) {
                    _this.recommendedMapView =
                        geoMap['hc-recommended-mapview'] || {};
                }
                // Combine the bounding boxes of all loaded maps
                if (geoMap.bbox) {
                    var _a = geoMap.bbox,
                        x1 = _a[0],
                        y1 = _a[1],
                        x2 = _a[2],
                        y2 = _a[3];
                    allGeoBounds.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
                }
            }
        });
        // Get the composite bounds
        var geoBounds = (allGeoBounds.length &&
                MapView.compositeBounds(allGeoBounds));
        // Provide a best-guess recommended projection if not set in
        // the map or in user options
        MapView_fireEvent(this, 'onRecommendMapView', {
            geoBounds: geoBounds,
            chart: chart
        }, function () {
            if (geoBounds &&
                this.recommendedMapView) {
                if (!this.recommendedMapView.projection) {
                    var x1 = geoBounds.x1,
                        y1 = geoBounds.y1,
                        x2 = geoBounds.x2,
                        y2 = geoBounds.y2;
                    this.recommendedMapView.projection =
                        (x2 - x1 > 180 && y2 - y1 > 90) ?
                            // Wide angle, go for the world view
                            {
                                name: 'EqualEarth',
                                parallels: [0, 0],
                                rotation: [0]
                            } :
                            // Narrower angle, use a projection better
                            // suited for local view
                            {
                                name: 'LambertConformalConic',
                                parallels: [y1, y2],
                                rotation: [-(x1 + x2) / 2]
                            };
                }
                if (!this.recommendedMapView.insets) {
                    this.recommendedMapView.insets = void 0; // Reset insets
                }
            }
        });
        // Register the main geo map (from options.chart.map) if set
        this.geoMap = geoMaps[0];
        if (update &&
            chart.hasRendered &&
            !((_a = chart.userOptions.mapView) === null || _a === void 0 ? void 0 : _a.projection) &&
            this.recommendedMapView) {
            this.update(this.recommendedMapView);
        }
    };
    MapView.prototype.redraw = function (animation) {
        this.chart.series.forEach(function (s) {
            if (s.useMapGeometry) {
                s.isDirty = true;
            }
        });
        this.chart.redraw(animation);
    };
    /**
     * Set the view to given center and zoom values.
     * @function Highcharts.MapView#setView
     * @param {Highcharts.LonLatArray|undefined} center
     *        The center point
     * @param {number} zoom
     *        The zoom level
     * @param {boolean} [redraw=true]
     *        Whether to redraw immediately
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Animation options for the redraw
     *
     * @sample maps/mapview/setview
     *        Set the view programmatically
     */
    MapView.prototype.setView = function (center, zoom, redraw, animation) {
        if (redraw === void 0) { redraw = true; }
        if (center) {
            this.center = center;
        }
        if (typeof zoom === 'number') {
            if (typeof this.minZoom === 'number') {
                zoom = Math.max(zoom, this.minZoom);
            }
            if (typeof this.options.maxZoom === 'number') {
                zoom = Math.min(zoom, this.options.maxZoom);
            }
            // Use isNumber to prevent Infinity (#17205)
            if (MapView_isNumber(zoom)) {
                this.zoom = zoom;
            }
        }
        var bounds = this.getProjectedBounds();
        if (bounds) {
            var projectedCenter = this.projection.forward(this.center),
                _a = this.playingField,
                x = _a.x,
                y = _a.y,
                width = _a.width,
                height = _a.height,
                scale = this.getScale(),
                bottomLeft = this.projectedUnitsToPixels({
                    x: bounds.x1,
                    y: bounds.y1
                }),
                topRight = this.projectedUnitsToPixels({
                    x: bounds.x2,
                    y: bounds.y2
                }),
                boundsCenterProjected = [
                    (bounds.x1 + bounds.x2) / 2,
                    (bounds.y1 + bounds.y2) / 2
                ],
                isDrilling = this.chart.series.some(function (series) {
                    return series.isDrilling;
            });
            if (!isDrilling) {
                // Constrain to data bounds
                // Pixel coordinate system is reversed vs projected
                var x1 = bottomLeft.x,
                    y1 = topRight.y,
                    x2 = topRight.x,
                    y2 = bottomLeft.y;
                // Map smaller than plot area, center it
                if (x2 - x1 < width) {
                    projectedCenter[0] = boundsCenterProjected[0];
                    // Off west
                }
                else if (x1 < x && x2 < x + width) {
                    // Adjust eastwards
                    projectedCenter[0] +=
                        Math.max(x1 - x, x2 - width - x) / scale;
                    // Off east
                }
                else if (x2 > x + width && x1 > x) {
                    // Adjust westwards
                    projectedCenter[0] +=
                        Math.min(x2 - width - x, x1 - x) / scale;
                }
                // Map smaller than plot area, center it
                if (y2 - y1 < height) {
                    projectedCenter[1] = boundsCenterProjected[1];
                    // Off north
                }
                else if (y1 < y && y2 < y + height) {
                    // Adjust southwards
                    projectedCenter[1] -=
                        Math.max(y1 - y, y2 - height - y) / scale;
                    // Off south
                }
                else if (y2 > y + height && y1 > y) {
                    // Adjust northwards
                    projectedCenter[1] -=
                        Math.min(y2 - height - y, y1 - y) / scale;
                }
                this.center = this.projection.inverse(projectedCenter);
            }
            this.insets.forEach(function (inset) {
                if (inset.options.field) {
                    inset.hitZone = inset.getHitZone();
                    inset.playingField = inset.getField();
                }
            });
            this.render();
        }
        MapView_fireEvent(this, 'afterSetView');
        if (redraw) {
            this.redraw(animation);
        }
    };
    /**
     * Convert projected units to pixel position
     *
     * @function Highcharts.MapView#projectedUnitsToPixels
     * @param {Highcharts.PositionObject} pos
     *        The position in projected units
     * @return {Highcharts.PositionObject} The position in pixels
     */
    MapView.prototype.projectedUnitsToPixels = function (pos) {
        var scale = this.getScale(), projectedCenter = this.projection.forward(this.center), field = this.playingField, centerPxX = field.x + field.width / 2, centerPxY = field.y + field.height / 2;
        var x = centerPxX - scale * (projectedCenter[0] - pos.x);
        var y = centerPxY + scale * (projectedCenter[1] - pos.y);
        return { x: x, y: y };
    };
    /**
     * Convert pixel position to longitude and latitude.
     *
     * @function Highcharts.MapView#pixelsToLonLat
     * @since 10.0.0
     * @param  {Highcharts.PositionObject} pos
     *         The position in pixels
     * @return {Highcharts.MapLonLatObject|undefined}
     *         The map coordinates
     */
    MapView.prototype.pixelsToLonLat = function (pos) {
        return this.projectedUnitsToLonLat(this.pixelsToProjectedUnits(pos));
    };
    /**
     * Convert pixel position to projected units
     *
     * @function Highcharts.MapView#pixelsToProjectedUnits
     * @param {Highcharts.PositionObject} pos
     *        The position in pixels
     * @return {Highcharts.PositionObject} The position in projected units
     */
    MapView.prototype.pixelsToProjectedUnits = function (pos) {
        var x = pos.x, y = pos.y, scale = this.getScale(), projectedCenter = this.projection.forward(this.center), field = this.playingField, centerPxX = field.x + field.width / 2, centerPxY = field.y + field.height / 2;
        var projectedX = projectedCenter[0] + (x - centerPxX) / scale;
        var projectedY = projectedCenter[1] - (y - centerPxY) / scale;
        return { x: projectedX, y: projectedY };
    };
    MapView.prototype.setUpEvents = function () {
        var _this = this;
        var chart = this.chart;
        // Set up panning and touch zoom for maps. In orthographic projections
        // the globe will rotate, otherwise adjust the map center and zoom.
        var mouseDownCenterProjected,
            mouseDownKey,
            mouseDownRotation;
        var onPan = function (e) {
                var _a = chart.pointer,
            lastTouches = _a.lastTouches,
            pinchDown = _a.pinchDown,
            projection = _this.projection,
            touches = e.touches;
            var mouseDownX = chart.mouseDownX,
                mouseDownY = chart.mouseDownY,
                howMuch = 0;
            if ((pinchDown === null || pinchDown === void 0 ? void 0 : pinchDown.length) === 1) {
                mouseDownX = pinchDown[0].chartX;
                mouseDownY = pinchDown[0].chartY;
            }
            else if ((pinchDown === null || pinchDown === void 0 ? void 0 : pinchDown.length) === 2) {
                mouseDownX = (pinchDown[0].chartX + pinchDown[1].chartX) / 2;
                mouseDownY = (pinchDown[0].chartY + pinchDown[1].chartY) / 2;
            }
            // How much has the distance between the fingers changed?
            if ((touches === null || touches === void 0 ? void 0 : touches.length) === 2 && lastTouches) {
                var startDistance = Math.sqrt(Math.pow(lastTouches[0].chartX - lastTouches[1].chartX, 2) +
                        Math.pow(lastTouches[0].chartY - lastTouches[1].chartY, 2)),
                    endDistance = Math.sqrt(Math.pow(touches[0].chartX - touches[1].chartX, 2) +
                        Math.pow(touches[0].chartY - touches[1].chartY, 2));
                howMuch = Math.log(startDistance / endDistance) / Math.log(0.5);
            }
            if (MapView_isNumber(mouseDownX) && MapView_isNumber(mouseDownY)) {
                var key = "" + mouseDownX + ",".concat(mouseDownY);
                var _b = e.originalEvent,
                    chartX = _b.chartX,
                    chartY = _b.chartY;
                if ((touches === null || touches === void 0 ? void 0 : touches.length) === 2) {
                    chartX = (touches[0].chartX + touches[1].chartX) / 2;
                    chartY = (touches[0].chartY + touches[1].chartY) / 2;
                }
                // Reset starting position
                if (key !== mouseDownKey) {
                    mouseDownKey = key;
                    mouseDownCenterProjected = _this.projection
                        .forward(_this.center);
                    mouseDownRotation = (_this.projection.options.rotation || [0, 0]).slice();
                }
                // Get the natural zoom level of the projection itself when
                // zoomed to view the full world
                var worldBounds = projection.def && projection.def.bounds,
                    worldZoom = (worldBounds &&
                        zoomFromBounds(worldBounds,
                    _this.playingField)) || -Infinity;
                // Panning rotates the globe
                if (projection.options.name === 'Orthographic' &&
                    ((touches === null || touches === void 0 ? void 0 : touches.length) || 0) < 2 &&
                    // ... but don't rotate if we're loading only a part of the
                    // world
                    (_this.minZoom || Infinity) < worldZoom * 1.3) {
                    // Empirical ratio where the globe rotates roughly the same
                    // speed as moving the pointer across the center of the
                    // projection
                    var ratio = 440 / (_this.getScale() * Math.min(chart.plotWidth,
                        chart.plotHeight));
                    if (mouseDownRotation) {
                        var lon = (mouseDownX - chartX) * ratio -
                                mouseDownRotation[0],
                            lat = MapView_clamp(-mouseDownRotation[1] -
                                (mouseDownY - chartY) * ratio, -80, 80),
                            zoom = _this.zoom;
                        _this.update({
                            projection: {
                                rotation: [-lon, -lat]
                            }
                        }, false);
                        _this.fitToBounds(void 0, void 0, false);
                        _this.zoom = zoom;
                        chart.redraw(false);
                    }
                    // #17925 Skip NaN values
                }
                else if (MapView_isNumber(chartX) && MapView_isNumber(chartY)) {
                    // #17238
                    var scale = _this.getScale(),
                        flipFactor = _this.projection.hasCoordinates ? 1 : -1;
                    var newCenter = _this.projection.inverse([
                            mouseDownCenterProjected[0] +
                                (mouseDownX - chartX) / scale,
                            mouseDownCenterProjected[1] -
                                (mouseDownY - chartY) / scale * flipFactor
                        ]);
                    // #19190 Skip NaN coords
                    if (!isNaN(newCenter[0] + newCenter[1])) {
                        _this.zoomBy(howMuch, newCenter, void 0, false);
                    }
                }
                e.preventDefault();
            }
        };
        MapView_addEvent(chart, 'pan', onPan);
        MapView_addEvent(chart, 'touchpan', onPan);
        // Perform the map zoom by selection
        MapView_addEvent(chart, 'selection', function (evt) {
            // Zoom in
            if (!evt.resetSelection) {
                var x = evt.x - chart.plotLeft;
                var y = evt.y - chart.plotTop;
                var _a = _this.pixelsToProjectedUnits({ x: x,
                    y: y }),
                    y1 = _a.y,
                    x1 = _a.x;
                var _b = _this.pixelsToProjectedUnits({ x: x + evt.width,
                    y: y + evt.height }),
                    y2 = _b.y,
                    x2 = _b.x;
                _this.fitToBounds({ x1: x1, y1: y1, x2: x2, y2: y2 }, void 0, true, evt.originalEvent.touches ?
                    // On touch zoom, don't animate, since we're already in
                    // transformed zoom preview
                    false :
                    // On mouse zoom, obey the chart-level animation
                    void 0);
                // Only for mouse. Touch users can pinch out.
                if (!/^touch/.test((evt.originalEvent.type))) {
                    chart.showResetZoom();
                }
                evt.preventDefault();
                // Reset zoom
            }
            else {
                _this.zoomBy();
            }
        });
    };
    MapView.prototype.render = function () {
        // We need a group for the insets
        if (!this.group) {
            this.group = this.chart.renderer.g('map-view')
                .attr({ zIndex: 4 })
                .add();
        }
    };
    /**
     * Update the view with given options
     *
     * @function Highcharts.MapView#update
     *
     * @param {Partial<Highcharts.MapViewOptions>} options
     *        The new map view options to apply
     * @param {boolean} [redraw=true]
     *        Whether to redraw immediately
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        The animation to apply to a the redraw
     */
    MapView.prototype.update = function (options, redraw, animation) {
        if (redraw === void 0) { redraw = true; }
        var newProjection = options.projection,
            isDirtyProjection = newProjection && ((Maps_Projection.toString(newProjection) !==
                Maps_Projection.toString(this.options.projection)));
        var isDirtyInsets = false;
        MapView_merge(true, this.userOptions, options);
        MapView_merge(true, this.options, options);
        // If anything changed with the insets, destroy them all and create
        // again below
        if ('insets' in options) {
            this.insets.forEach(function (inset) { return inset.destroy(); });
            this.insets.length = 0;
            isDirtyInsets = true;
        }
        if (isDirtyProjection || 'fitToGeometry' in options) {
            delete this.fitToGeometryCache;
        }
        if (isDirtyProjection || isDirtyInsets) {
            this.chart.series.forEach(function (series) {
                var groups = series.transformGroups;
                if (series.clearBounds) {
                    series.clearBounds();
                }
                series.isDirty = true;
                series.isDirtyData = true;
                // Destroy inset transform groups
                if (isDirtyInsets && groups) {
                    while (groups.length > 1) {
                        var group = groups.pop();
                        if (group) {
                            group.destroy();
                        }
                    }
                }
            });
            if (isDirtyProjection) {
                this.projection = new Maps_Projection(this.options.projection);
            }
            // Create new insets
            if (isDirtyInsets) {
                this.createInsets();
            }
            // Fit to natural bounds if center/zoom are not explicitly given
            if (!options.center &&
                // Do not fire fitToBounds if user don't want to set zoom
                Object.hasOwnProperty.call(options, 'zoom') &&
                !MapView_isNumber(options.zoom)) {
                this.fitToBounds(void 0, void 0, false);
            }
        }
        if (options.center || MapView_isNumber(options.zoom)) {
            this.setView(this.options.center, options.zoom, false);
        }
        else if ('fitToGeometry' in options) {
            this.fitToBounds(void 0, void 0, false);
        }
        if (redraw) {
            this.chart.redraw(animation);
        }
    };
    /**
     * Zoom the map view by a given number
     *
     * @function Highcharts.MapView#zoomBy
     *
     * @param {number|undefined} [howMuch]
     *        The amount of zoom to apply. 1 zooms in on half the current view,
     *        -1 zooms out. Pass `undefined` to zoom to the full bounds of the
     *        map.
     * @param {Highcharts.LonLatArray} [coords]
     *        Optional map coordinates to keep fixed
     * @param {Array<number>} [chartCoords]
     *        Optional chart coordinates to keep fixed, in pixels
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        The animation to apply to a the redraw
     */
    MapView.prototype.zoomBy = function (howMuch, coords, chartCoords, animation) {
        var chart = this.chart,
            projectedCenter = this.projection.forward(this.center);
        if (typeof howMuch === 'number') {
            var zoom = this.zoom + howMuch;
            var center = void 0,
                x = void 0,
                y = void 0;
            // Keep chartX and chartY stationary - convert to lat and lng
            if (chartCoords) {
                var chartX = chartCoords[0],
                    chartY = chartCoords[1];
                var scale = this.getScale();
                var offsetX = chartX - chart.plotLeft - chart.plotWidth / 2;
                var offsetY = chartY - chart.plotTop - chart.plotHeight / 2;
                x = projectedCenter[0] + offsetX / scale;
                y = projectedCenter[1] + offsetY / scale;
            }
            // Keep lon and lat stationary by adjusting the center
            if (typeof x === 'number' && typeof y === 'number') {
                var scale = 1 - Math.pow(2,
                    this.zoom) / Math.pow(2,
                    zoom);
                var offsetX = projectedCenter[0] - x;
                var offsetY = projectedCenter[1] - y;
                projectedCenter[0] -= offsetX * scale;
                projectedCenter[1] += offsetY * scale;
                center = this.projection.inverse(projectedCenter);
            }
            this.setView(coords || center, zoom, void 0, animation);
            // Undefined howMuch => reset zoom
        }
        else {
            this.fitToBounds(void 0, void 0, void 0, animation);
        }
    };
    return MapView;
}());
// Putting this in the same file due to circular dependency with MapView
var MapViewInset = /** @class */ (function (_super) {
    MapView_extends(MapViewInset, _super);
    /* *
     *
     *  Constructor
     *
     * */
    function MapViewInset(mapView, options) {
        var _this = _super.call(this,
            mapView.chart,
            options) || this;
        _this.id = options.id;
        _this.mapView = mapView;
        _this.options = MapView_merge({ center: [0, 0] }, mapView.options.insetOptions, options);
        _this.allBounds = [];
        if (_this.options.geoBounds) {
            // The path in projected units in the map view's main projection.
            // This is used for hit testing where the points should render.
            var path = mapView.projection.path(_this.options.geoBounds);
            _this.geoBoundsProjectedBox = MapView_boundsFromPath(path);
            _this.geoBoundsProjectedPolygon = path.map(function (segment) { return [
                segment[1] || 0,
                segment[2] || 0
            ]; });
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Get the playing field in pixels
     * @private
     */
    MapViewInset.prototype.getField = function (padded) {
        if (padded === void 0) { padded = true; }
        var hitZone = this.hitZone;
        if (hitZone) {
            var padding = padded ? this.padding : [0, 0, 0, 0],
                polygon = hitZone.coordinates[0],
                xs = polygon.map(function (xy) { return xy[0]; }),
                ys = polygon.map(function (xy) { return xy[1]; }),
                x = Math.min.apply(0,
                xs) + padding[3],
                x2 = Math.max.apply(0,
                xs) - padding[1],
                y = Math.min.apply(0,
                ys) + padding[0],
                y2 = Math.max.apply(0,
                ys) - padding[2];
            if (MapView_isNumber(x) && MapView_isNumber(y)) {
                return {
                    x: x,
                    y: y,
                    width: x2 - x,
                    height: y2 - y
                };
            }
        }
        // Fall back to plot area
        return _super.prototype.getField.call(this, padded);
    };
    /**
     * Get the hit zone in pixels.
     * @private
     */
    MapViewInset.prototype.getHitZone = function () {
        var _a = this,
            chart = _a.chart,
            mapView = _a.mapView,
            options = _a.options,
            coordinates = (options.field || {}).coordinates;
        if (coordinates) {
            var polygon = coordinates[0];
            if (options.units === 'percent') {
                var relativeTo_1 = options.relativeTo === 'mapBoundingBox' &&
                        mapView.getMapBBox() ||
                        MapView_merge(chart.plotBox, { x: 0,
                    y: 0 });
                polygon = polygon.map(function (xy) { return [
                    MapView_relativeLength("" + xy[0] + "%", relativeTo_1.width, relativeTo_1.x),
                    MapView_relativeLength("" + xy[1] + "%", relativeTo_1.height, relativeTo_1.y)
                ]; });
            }
            return {
                type: 'Polygon',
                coordinates: [polygon]
            };
        }
    };
    MapViewInset.prototype.getProjectedBounds = function () {
        return MapView.compositeBounds(this.allBounds);
    };
    /**
     * Determine whether a point on the main projected plane is inside the
     * geoBounds of the inset.
     * @private
     */
    MapViewInset.prototype.isInside = function (point) {
        var _a = this,
            geoBoundsProjectedBox = _a.geoBoundsProjectedBox,
            geoBoundsProjectedPolygon = _a.geoBoundsProjectedPolygon;
        return Boolean(
        // First we do a pre-pass to check whether the test point is inside
        // the rectangular bounding box of the polygon. This is less
        // expensive and will rule out most cases.
        geoBoundsProjectedBox &&
            point.x >= geoBoundsProjectedBox.x1 &&
            point.x <= geoBoundsProjectedBox.x2 &&
            point.y >= geoBoundsProjectedBox.y1 &&
            point.y <= geoBoundsProjectedBox.y2 &&
            // Next, do the more expensive check whether the point is inside the
            // polygon itself.
            geoBoundsProjectedPolygon &&
            pointInPolygon(point, geoBoundsProjectedPolygon));
    };
    /**
     * Render the map view inset with the border path
     * @private
     */
    MapViewInset.prototype.render = function () {
        var _a = this,
            chart = _a.chart,
            mapView = _a.mapView,
            options = _a.options,
            borderPath = options.borderPath || options.field;
        if (borderPath && mapView.group) {
            var animate = true;
            if (!this.border) {
                this.border = chart.renderer
                    .path()
                    .addClass('highcharts-mapview-inset-border')
                    .add(mapView.group);
                animate = false;
            }
            if (!chart.styledMode) {
                this.border.attr({
                    stroke: options.borderColor,
                    'stroke-width': options.borderWidth
                });
            }
            var strokeWidth_1 = this.border.strokeWidth(),
                field_1 = (options.relativeTo === 'mapBoundingBox' &&
                    mapView.getMapBBox()) || mapView.playingField;
            var d = (borderPath.coordinates || []).reduce(function (d,
                lineString) {
                    return lineString.reduce(function (d,
                point,
                i) {
                        var x = point[0],
                y = point[1];
                    if (options.units === 'percent') {
                        x = chart.plotLeft + MapView_relativeLength("" + x + "%", field_1.width, field_1.x);
                        y = chart.plotTop + MapView_relativeLength("" + y + "%", field_1.height, field_1.y);
                    }
                    x = crisp(x, strokeWidth_1);
                    y = crisp(y, strokeWidth_1);
                    d.push(i === 0 ? ['M', x, y] : ['L', x, y]);
                    return d;
                }, d);
            }, []);
            // Apply the border path
            this.border[animate ? 'animate' : 'attr']({ d: d });
        }
    };
    MapViewInset.prototype.destroy = function () {
        if (this.border) {
            this.border = this.border.destroy();
        }
        this.eventsToUnbind.forEach(function (f) { return f(); });
    };
    /**
     * No chart-level events for insets
     * @private
     */
    MapViewInset.prototype.setUpEvents = function () { };
    return MapViewInset;
}(MapView));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Maps_MapView = (MapView);

;// ./code/es5/es-modules/Series/Map/MapSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapSeries_extends = (undefined && undefined.__extends) || (function () {
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
var MapSeries_spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};

var animObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).animObject, stop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).stop;



var noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;

var splitPath = Chart_MapChart.splitPath;




var _a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, 
// Indirect dependency to keep product size low
ColumnSeries = _a.column, ScatterSeries = _a.scatter;

var MapSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, find = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).find, MapSeries_fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, getNestedProperty = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).getNestedProperty, MapSeries_isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, MapSeries_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, MapSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, MapSeries_isObject = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isObject, MapSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, MapSeries_objectEach = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).objectEach, MapSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, MapSeries_splat = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).splat;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.map
 *
 * @augments Highcharts.Series
 */
var MapSeries = /** @class */ (function (_super) {
    MapSeries_extends(MapSeries, _super);
    function MapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.processedData = [];
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * The initial animation for the map series. By default, animation is
     * disabled.
     * @private
     */
    MapSeries.prototype.animate = function (init) {
        var _a = this,
            chart = _a.chart,
            group = _a.group,
            animation = animObject(this.options.animation);
        // Initialize the animation
        if (init) {
            // Scale down the group and place it in the center
            group.attr({
                translateX: chart.plotLeft + chart.plotWidth / 2,
                translateY: chart.plotTop + chart.plotHeight / 2,
                scaleX: 0.001, // #1499
                scaleY: 0.001
            });
            // Run the animation
        }
        else {
            group.animate({
                translateX: chart.plotLeft,
                translateY: chart.plotTop,
                scaleX: 1,
                scaleY: 1
            }, animation);
        }
    };
    MapSeries.prototype.clearBounds = function () {
        this.points.forEach(function (point) {
            delete point.bounds;
            delete point.insetIndex;
            delete point.projectedPath;
        });
        delete this.bounds;
    };
    /**
     * Allow a quick redraw by just translating the area group. Used for zooming
     * and panning in capable browsers.
     * @private
     */
    MapSeries.prototype.doFullTranslate = function () {
        return Boolean(this.isDirtyData ||
            this.chart.isResizing ||
            !this.hasRendered);
    };
    /**
     * Draw the data labels. Special for maps is the time that the data labels
     * are drawn (after points), and the clipping of the dataLabelsGroup.
     * @private
     */
    MapSeries.prototype.drawMapDataLabels = function () {
        _super.prototype.drawDataLabels.call(this);
        if (this.dataLabelsGroup) {
            this.dataLabelsGroup.clip(this.chart.clipRect);
        }
    };
    /**
     * Use the drawPoints method of column, that is able to handle simple
     * shapeArgs. Extend it by assigning the tooltip position.
     * @private
     */
    MapSeries.prototype.drawPoints = function () {
        var _this = this;
        var series = this,
            _a = this,
            chart = _a.chart,
            group = _a.group,
            _b = _a.transformGroups,
            transformGroups = _b === void 0 ? [] : _b,
            mapView = chart.mapView,
            renderer = chart.renderer;
        if (!mapView) {
            return;
        }
        // Set groups that handle transform during zooming and panning in order
        // to preserve clipping on series.group
        this.transformGroups = transformGroups;
        if (!transformGroups[0]) {
            transformGroups[0] = renderer.g().add(group);
        }
        for (var i = 0, iEnd = mapView.insets.length; i < iEnd; ++i) {
            if (!transformGroups[i + 1]) {
                transformGroups.push(renderer.g().add(group));
            }
        }
        // Draw the shapes again
        if (this.doFullTranslate()) {
            // Individual point actions.
            this.points.forEach(function (point) {
                var graphic = point.graphic;
                // Points should be added in the corresponding transform group
                point.group = transformGroups[typeof point.insetIndex === 'number' ?
                    point.insetIndex + 1 :
                    0];
                // When the point has been moved between insets after
                // MapView.update
                if (graphic && graphic.parentGroup !== point.group) {
                    graphic.add(point.group);
                }
            });
            // Draw the points
            ColumnSeries.prototype.drawPoints.apply(this);
            // Add class names
            this.points.forEach(function (point) {
                var graphic = point.graphic;
                if (graphic) {
                    var animate_1 = graphic.animate;
                    var className = '';
                    if (point.name) {
                        className +=
                            'highcharts-name-' +
                                point.name.replace(/ /g, '-').toLowerCase();
                    }
                    if (point.properties && point.properties['hc-key']) {
                        className +=
                            ' highcharts-key-' +
                                point.properties['hc-key'].toString().toLowerCase();
                    }
                    if (className) {
                        graphic.addClass(className);
                    }
                    // In styled mode, apply point colors by CSS
                    if (chart.styledMode) {
                        graphic.css(_this.pointAttribs(point, point.selected && 'select' || void 0));
                    }
                    // If the map point is not visible and is not null (e.g.
                    // hidden by data classes), then the point should be
                    // visible, but without value
                    graphic.attr({
                        visibility: (point.visible ||
                            (!point.visible && !point.isNull)) ? 'inherit' : 'hidden'
                    });
                    graphic.animate = function (params, options, complete) {
                        var animateIn = (MapSeries_isNumber(params['stroke-width']) &&
                                !MapSeries_isNumber(graphic['stroke-width'])), animateOut = (MapSeries_isNumber(graphic['stroke-width']) &&
                                !MapSeries_isNumber(params['stroke-width']));
                        // When strokeWidth is animating
                        if (animateIn || animateOut) {
                            var strokeWidth = MapSeries_pick(series.getStrokeWidth(series.options), 1 // Styled mode
                                ),
                                inheritedStrokeWidth = (strokeWidth /
                                    (chart.mapView &&
                                        chart.mapView.getScale() ||
                                        1));
                            // For animating from undefined, .attr() reads the
                            // property as the starting point
                            if (animateIn) {
                                graphic['stroke-width'] = inheritedStrokeWidth;
                            }
                            // For animating to undefined
                            if (animateOut) {
                                params['stroke-width'] = inheritedStrokeWidth;
                            }
                        }
                        var ret = animate_1.call(graphic,
                            params,
                            options,
                            animateOut ? function () {
                                // Remove the attribute after finished animation
                                graphic.element.removeAttribute('stroke-width');
                            delete graphic['stroke-width'];
                            // Proceed
                            if (complete) {
                                complete.apply(this, arguments);
                            }
                        } : complete);
                        return ret;
                    };
                }
            });
        }
        // Apply the SVG transform
        transformGroups.forEach(function (transformGroup, i) {
            var view = i === 0 ? mapView : mapView.insets[i - 1],
                svgTransform = view.getSVGTransform(),
                strokeWidth = MapSeries_pick(_this.getStrokeWidth(_this.options), 1 // Styled mode
                );
            /*
            Animate or move to the new zoom level. In order to prevent
            flickering as the different transform components are set out of sync
            (#5991), we run a fake animator attribute and set scale and
            translation synchronously in the same step.

            A possible improvement to the API would be to handle this in the
            renderer or animation engine itself, to ensure that when we are
            animating multiple properties, we make sure that each step for each
            property is performed in the same step. Also, for symbols and for
            transform properties, it should induce a single updateTransform and
            symbolAttr call.
            */
            var scale = svgTransform.scaleX,
                flipFactor = svgTransform.scaleY > 0 ? 1 : -1;
            var animatePoints = function (scale) {
                    (series.points || []).forEach(function (point) {
                        var graphic = point.graphic;
                    var strokeWidth;
                    if (graphic &&
                        graphic['stroke-width'] &&
                        (strokeWidth = _this.getStrokeWidth(point.options))) {
                        graphic.attr({
                            'stroke-width': strokeWidth / scale
                        });
                    }
                });
            };
            if (renderer.globalAnimation &&
                chart.hasRendered &&
                mapView.allowTransformAnimation) {
                var startTranslateX_1 = Number(transformGroup.attr('translateX'));
                var startTranslateY_1 = Number(transformGroup.attr('translateY'));
                var startScale_1 = Number(transformGroup.attr('scaleX'));
                var step_1 = function (now,
                    fx) {
                        var scaleStep = startScale_1 +
                            (scale - startScale_1) * fx.pos;
                    transformGroup.attr({
                        translateX: (startTranslateX_1 + (svgTransform.translateX - startTranslateX_1) * fx.pos),
                        translateY: (startTranslateY_1 + (svgTransform.translateY - startTranslateY_1) * fx.pos),
                        scaleX: scaleStep,
                        scaleY: scaleStep * flipFactor,
                        'stroke-width': strokeWidth / scaleStep
                    });
                    animatePoints(scaleStep); // #18166
                };
                var animOptions = MapSeries_merge(animObject(renderer.globalAnimation)),
                    userStep_1 = animOptions.step;
                animOptions.step = function () {
                    if (userStep_1) {
                        userStep_1.apply(this, arguments);
                    }
                    step_1.apply(this, arguments);
                };
                transformGroup
                    .attr({ animator: 0 })
                    .animate({ animator: 1 }, animOptions, function () {
                    if (typeof renderer.globalAnimation !== 'boolean' &&
                        renderer.globalAnimation.complete) {
                        // Fire complete only from this place
                        renderer.globalAnimation.complete({
                            applyDrilldown: true
                        });
                    }
                    MapSeries_fireEvent(this, 'mapZoomComplete');
                }.bind(_this));
                // When dragging or first rendering, animation is off
            }
            else {
                stop(transformGroup);
                transformGroup.attr(MapSeries_merge(svgTransform, { 'stroke-width': strokeWidth / scale }));
                animatePoints(scale); // #18166
            }
        });
        if (!this.isDrilling) {
            this.drawMapDataLabels();
        }
    };
    /**
     * Get the bounding box of all paths in the map combined.
     *
     */
    MapSeries.prototype.getProjectedBounds = function () {
        var _this = this;
        if (!this.bounds && this.chart.mapView) {
            var _a = this.chart.mapView,
                insets_1 = _a.insets,
                projection_1 = _a.projection,
                allBounds_1 = [];
            // Find the bounding box of each point
            (this.points || []).forEach(function (point) {
                if (point.path || point.geometry) {
                    // @todo Try to put these two conversions in
                    // MapPoint.applyOptions
                    if (typeof point.path === 'string') {
                        point.path = splitPath(point.path);
                        // Legacy one-dimensional array
                    }
                    else if (MapSeries_isArray(point.path) &&
                        point.path[0] === 'M') {
                        point.path = _this.chart.renderer
                            .pathToSegments(point.path);
                    }
                    // The first time a map point is used, analyze its box
                    if (!point.bounds) {
                        var bounds = point.getProjectedBounds(projection_1);
                        if (bounds) {
                            point.labelrank = MapSeries_pick(point.labelrank, 
                            // Bigger shape, higher rank
                            ((bounds.x2 - bounds.x1) *
                                (bounds.y2 - bounds.y1)));
                            var midX_1 = bounds.midX,
                                midY_1 = bounds.midY;
                            if (insets_1 && MapSeries_isNumber(midX_1) && MapSeries_isNumber(midY_1)) {
                                var inset = find(insets_1,
                                    function (inset) { return inset.isInside({
                                        x: midX_1,
                                    y: midY_1
                                    }); });
                                if (inset) {
                                    // Project again, but with the inset
                                    // projection
                                    delete point.projectedPath;
                                    bounds = point.getProjectedBounds(inset.projection);
                                    if (bounds) {
                                        inset.allBounds.push(bounds);
                                    }
                                    point.insetIndex = insets_1.indexOf(inset);
                                }
                            }
                            point.bounds = bounds;
                        }
                    }
                    if (point.bounds && point.insetIndex === void 0) {
                        allBounds_1.push(point.bounds);
                    }
                }
            });
            this.bounds = Maps_MapView.compositeBounds(allBounds_1);
        }
        return this.bounds;
    };
    /**
     * Return the stroke-width either from a series options or point options
     * object. This function is used by both the map series where the
     * `borderWidth` sets the stroke-width, and the mapline series where the
     * `lineWidth` sets the stroke-width.
     * @private
     */
    MapSeries.prototype.getStrokeWidth = function (options) {
        var pointAttrToOptions = this.pointAttrToOptions;
        return options[pointAttrToOptions &&
            pointAttrToOptions['stroke-width'] || 'borderWidth'];
    };
    /**
     * Define hasData function for non-cartesian series. Returns true if the
     * series has points at all.
     * @private
     */
    MapSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * Get presentational attributes. In the maps series this runs in both
     * styled and non-styled mode, because colors hold data when a colorAxis is
     * used.
     * @private
     */
    MapSeries.prototype.pointAttribs = function (point, state) {
        var _a;
        var _b = point.series.chart,
            mapView = _b.mapView,
            styledMode = _b.styledMode;
        var attr = styledMode ?
                this.colorAttribs(point) :
                ColumnSeries.prototype.pointAttribs.call(this,
            point,
            state);
        // Individual stroke width
        var pointStrokeWidth = this.getStrokeWidth(point.options);
        // Handle state specific border or line width
        if (state) {
            var stateOptions = MapSeries_merge(this.options.states &&
                    this.options.states[state],
                point.options.states &&
                    point.options.states[state] ||
                    {}),
                stateStrokeWidth = this.getStrokeWidth(stateOptions);
            if (MapSeries_defined(stateStrokeWidth)) {
                pointStrokeWidth = stateStrokeWidth;
            }
            attr.stroke = (_a = stateOptions.borderColor) !== null && _a !== void 0 ? _a : point.color;
        }
        if (pointStrokeWidth && mapView) {
            pointStrokeWidth /= mapView.getScale();
        }
        // In order for dash style to avoid being scaled, set the transformed
        // stroke width on the item
        var seriesStrokeWidth = this.getStrokeWidth(this.options);
        if (attr.dashstyle &&
            mapView &&
            MapSeries_isNumber(seriesStrokeWidth)) {
            pointStrokeWidth = seriesStrokeWidth / mapView.getScale();
        }
        // Invisible map points means that the data value is removed from the
        // map, but not the map area shape itself. Instead it is rendered like a
        // null point. To fully remove a map area, it should be removed from the
        // mapData.
        if (!point.visible) {
            attr.fill = this.options.nullColor;
        }
        if (MapSeries_defined(pointStrokeWidth)) {
            attr['stroke-width'] = pointStrokeWidth;
        }
        else {
            delete attr['stroke-width'];
        }
        attr['stroke-linecap'] = attr['stroke-linejoin'] = this.options.linecap;
        return attr;
    };
    MapSeries.prototype.updateData = function () {
        // #16782
        if (this.processedData) {
            return false;
        }
        return _super.prototype.updateData.apply(this, arguments);
    };
    /**
     * Extend setData to call processData and generatePoints immediately.
     * @private
     */
    MapSeries.prototype.setData = function (data, redraw, animation, updatePoints) {
        if (redraw === void 0) { redraw = true; }
        delete this.bounds;
        _super.prototype.setData.call(this, data, false, void 0, updatePoints);
        this.processData();
        this.generatePoints();
        if (redraw) {
            this.chart.redraw(animation);
        }
    };
    MapSeries.prototype.dataColumnKeys = function () {
        // No x data for maps
        return this.pointArrayMap;
    };
    /**
     * Extend processData to join in mapData. If the allAreas option is true,
     * all areas from the mapData are used, and those that don't correspond to a
     * data value are given null values. The results are stored in
     * `processedData` in order to avoid mutating `data`.
     * @private
     */
    MapSeries.prototype.processData = function () {
        var options = this.options,
            data = options.data,
            chart = this.chart,
            chartOptions = chart.options.chart,
            joinBy = this.joinBy,
            pointArrayMap = options.keys || this.pointArrayMap,
            dataUsed = [],
            mapMap = {},
            mapView = this.chart.mapView,
            mapDataObject = mapView && (
            // Get map either from series or global
            MapSeries_isObject(options.mapData,
            true) ?
                mapView.getGeoMap(options.mapData) : mapView.geoMap), 
            // Pick up transform definitions for chart
            mapTransforms = chart.mapTransforms =
                chartOptions.mapTransforms ||
                    mapDataObject && mapDataObject['hc-transform'] ||
                    chart.mapTransforms;
        var mapPoint,
            props;
        // Cache cos/sin of transform rotation angle
        if (mapTransforms) {
            MapSeries_objectEach(mapTransforms, function (transform) {
                if (transform.rotation) {
                    transform.cosAngle = Math.cos(transform.rotation);
                    transform.sinAngle = Math.sin(transform.rotation);
                }
            });
        }
        var mapData;
        if (MapSeries_isArray(options.mapData)) {
            mapData = options.mapData;
        }
        else if (mapDataObject && mapDataObject.type === 'FeatureCollection') {
            this.mapTitle = mapDataObject.title;
            mapData = highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default().geojson(mapDataObject, this.type, this);
        }
        // Reset processedData
        this.processedData = [];
        var processedData = this.processedData;
        // Pick up numeric values, add index. Convert Array point definitions to
        // objects using pointArrayMap.
        if (data) {
            var val = void 0;
            for (var i = 0, iEnd = data.length; i < iEnd; ++i) {
                val = data[i];
                if (MapSeries_isNumber(val)) {
                    processedData[i] = {
                        value: val
                    };
                }
                else if (MapSeries_isArray(val)) {
                    var ix = 0;
                    processedData[i] = {};
                    // Automatically copy first item to hc-key if there is
                    // an extra leading string
                    if (!options.keys &&
                        val.length > pointArrayMap.length &&
                        typeof val[0] === 'string') {
                        processedData[i]['hc-key'] = val[0];
                        ++ix;
                    }
                    // Run through pointArrayMap and what's left of the
                    // point data array in parallel, copying over the values
                    for (var j = 0; j < pointArrayMap.length; ++j, ++ix) {
                        if (pointArrayMap[j] &&
                            typeof val[ix] !== 'undefined') {
                            if (pointArrayMap[j].indexOf('.') > 0) {
                                Map_MapPoint.prototype.setNestedProperty(processedData[i], val[ix], pointArrayMap[j]);
                            }
                            else {
                                processedData[i][pointArrayMap[j]] = val[ix];
                            }
                        }
                    }
                }
                else {
                    processedData[i] = data[i];
                }
                if (joinBy &&
                    joinBy[0] === '_i') {
                    processedData[i]._i = i;
                }
            }
        }
        if (mapData) {
            this.mapData = mapData;
            this.mapMap = {};
            for (var i = 0; i < mapData.length; i++) {
                mapPoint = mapData[i];
                props = mapPoint.properties;
                mapPoint._i = i;
                // Copy the property over to root for faster access
                if (joinBy[0] && props && props[joinBy[0]]) {
                    mapPoint[joinBy[0]] = props[joinBy[0]];
                }
                mapMap[mapPoint[joinBy[0]]] = mapPoint;
            }
            this.mapMap = mapMap;
            // Registered the point codes that actually hold data
            if (joinBy[1]) {
                var joinKey_1 = joinBy[1];
                processedData.forEach(function (pointOptions) {
                    var mapKey = getNestedProperty(joinKey_1,
                        pointOptions);
                    if (mapMap[mapKey]) {
                        dataUsed.push(mapMap[mapKey]);
                    }
                });
            }
            if (options.allAreas) {
                // Register the point codes that actually hold data
                if (joinBy[1]) {
                    var joinKey_2 = joinBy[1];
                    processedData.forEach(function (pointOptions) {
                        dataUsed.push(getNestedProperty(joinKey_2, pointOptions));
                    });
                }
                // Add those map points that don't correspond to data, which
                // will be drawn as null points. Searching a string is faster
                // than Array.indexOf
                var dataUsedString_1 = ('|' +
                        dataUsed
                            .map(function (point) {
                            return point && point[joinBy[0]];
                    })
                        .join('|') +
                    '|');
                mapData.forEach(function (mapPoint) {
                    if (!joinBy[0] ||
                        dataUsedString_1.indexOf('|' +
                            mapPoint[joinBy[0]] +
                            '|') === -1) {
                        processedData.push(MapSeries_merge(mapPoint, { value: null }));
                    }
                });
            }
        }
        // The processedXData array is used by general chart logic for checking
        // data length in various scanarios.
        this.dataTable.rowCount = processedData.length;
        return void 0;
    };
    /**
     * Extend setOptions by picking up the joinBy option and applying it to a
     * series property.
     * @private
     */
    MapSeries.prototype.setOptions = function (itemOptions) {
        var options = _super.prototype.setOptions.call(this,
            itemOptions);
        var joinBy = options.joinBy;
        if (options.joinBy === null) {
            joinBy = '_i';
        }
        if (joinBy) {
            this.joinBy = MapSeries_splat(joinBy);
            if (!this.joinBy[1]) {
                this.joinBy[1] = this.joinBy[0];
            }
        }
        return options;
    };
    /**
     * Add the path option for data points. Find the max value for color
     * calculation.
     * @private
     */
    MapSeries.prototype.translate = function () {
        var series = this,
            doFullTranslate = series.doFullTranslate(),
            mapView = this.chart.mapView,
            projection = mapView && mapView.projection;
        // Recalculate box on updated data
        if (this.chart.hasRendered && (this.isDirtyData || !this.hasRendered)) {
            this.processData();
            this.generatePoints();
            delete this.bounds;
            if (mapView &&
                !mapView.userOptions.center &&
                !MapSeries_isNumber(mapView.userOptions.zoom) &&
                mapView.zoom === mapView.minZoom // #18542 don't zoom out if
            // map is zoomed
            ) {
                // Not only recalculate bounds but also fit view
                mapView.fitToBounds(void 0, void 0, false); // #17012
            }
            else {
                // If center and zoom is defined in user options, get bounds but
                // don't change view
                this.getProjectedBounds();
            }
        }
        if (mapView) {
            var mainSvgTransform_1 = mapView.getSVGTransform();
            series.points.forEach(function (point) {
                var svgTransform = (MapSeries_isNumber(point.insetIndex) &&
                        mapView.insets[point.insetIndex].getSVGTransform()) || mainSvgTransform_1;
                // Record the middle point (loosely based on centroid),
                // determined by the middleX and middleY options.
                if (svgTransform &&
                    point.bounds &&
                    MapSeries_isNumber(point.bounds.midX) &&
                    MapSeries_isNumber(point.bounds.midY)) {
                    point.plotX = point.bounds.midX * svgTransform.scaleX +
                        svgTransform.translateX;
                    point.plotY = point.bounds.midY * svgTransform.scaleY +
                        svgTransform.translateY;
                }
                if (doFullTranslate) {
                    point.shapeType = 'path';
                    point.shapeArgs = {
                        d: Map_MapPoint.getProjectedPath(point, projection)
                    };
                }
                if (!point.hiddenInDataClass) { // #20441
                    if (point.projectedPath && !point.projectedPath.length) {
                        point.setVisible(false);
                    }
                    else if (!point.visible) {
                        point.setVisible(true);
                    }
                }
            });
        }
        MapSeries_fireEvent(series, 'afterTranslate');
    };
    MapSeries.prototype.update = function (options) {
        var _this = this;
        var _a;
        // Calculate and set the recommended map view after every series update
        // if new mapData is set
        if (options.mapData) {
            (_a = this.chart.mapView) === null || _a === void 0 ? void 0 : _a.recommendMapView(this.chart, MapSeries_spreadArray([
                this.chart.options.chart.map
            ], (this.chart.options.series || []).map(function (s, i) {
                if (i === _this._i) {
                    return options.mapData;
                }
                return s.mapData;
            }), true), true);
        }
        _super.prototype.update.apply(this, arguments);
    };
    MapSeries.defaultOptions = MapSeries_merge(ScatterSeries.defaultOptions, Map_MapSeriesDefaults);
    return MapSeries;
}(ScatterSeries));
MapSeries_extend(MapSeries.prototype, {
    type: 'map',
    axisTypes: Series_ColorMapComposition.seriesMembers.axisTypes,
    colorAttribs: Series_ColorMapComposition.seriesMembers.colorAttribs,
    colorKey: Series_ColorMapComposition.seriesMembers.colorKey,
    // When tooltip is not shared, this series (and derivatives) requires
    // direct touch/hover. KD-tree does not apply.
    directTouch: true,
    // We need the points' bounding boxes in order to draw the data labels,
    // so we skip it now and call it from drawPoints instead.
    drawDataLabels: noop,
    // No graph for the map series
    drawGraph: noop,
    forceDL: true,
    getCenter: Series_CenteredUtilities.getCenter,
    getExtremesFromAll: true,
    getSymbol: noop,
    isCartesian: false,
    parallelArrays: Series_ColorMapComposition.seriesMembers.parallelArrays,
    pointArrayMap: Series_ColorMapComposition.seriesMembers.pointArrayMap,
    pointClass: Map_MapPoint,
    // X axis and Y axis must have same translation slope
    preserveAspectRatio: true,
    searchPoint: noop,
    trackerGroups: Series_ColorMapComposition.seriesMembers.trackerGroups,
    // Get axis extremes from paths, not values
    useMapGeometry: true
});
Series_ColorMapComposition.compose(MapSeries);
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('map', MapSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Map_MapSeries = (MapSeries);

;// ./code/es5/es-modules/Series/MapLine/MapLineSeriesDefaults.js
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
 *  API Options
 *
 * */
/**
 * A mapline series is a special case of the map series where the value
 * colors are applied to the strokes rather than the fills. It can also be
 * used for freeform drawing, like dividers, in the map.
 *
 * @sample maps/demo/mapline-mappoint/
 *         Mapline and map-point chart
 * @sample maps/demo/animated-mapline/
 *         Mapline with CSS keyframe animation
 * @sample maps/demo/flight-routes
 *         Flight routes
 *
 * @extends      plotOptions.map
 * @excluding    dragDrop
 * @product      highmaps
 * @optionparent plotOptions.mapline
 */
var MapLineSeriesDefaults = {
    /**
     * Pixel width of the mapline line.
     *
     * @type      {number}
     * @since     10.3.3
     * @product   highmaps
     * @default   1
     * @apioption plotOptions.mapline.lineWidth
     */
    lineWidth: 1,
    /**
     * Fill color for the map line shapes
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     */
    fillColor: 'none',
    legendSymbol: 'lineMarker'
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapLine_MapLineSeriesDefaults = (MapLineSeriesDefaults);
/**
 * A `mapline` series. If the [type](#series.mapline.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.mapline
 * @excluding dataParser, dataURL, dragDrop, marker
 * @product   highmaps
 * @apioption series.mapline
 */
/**
 * An array of data points for the series. For the `mapline` series type,
 * points can be given in the following ways:
 *
 * 1.  An array of numerical values. In this case, the numerical values
 * will be interpreted as `value` options. Example:
 *
 *  ```js
 *  data: [0, 5, 3, 5]
 *  ```
 *
 * 2.  An array of arrays with 2 values. In this case, the values correspond
 * to `[hc-key, value]`. Example:
 *
 *  ```js
 *     data: [
 *         ['us-ny', 0],
 *         ['us-mi', 5],
 *         ['us-tx', 3],
 *         ['us-ak', 5]
 *     ]
 *  ```
 *
 * 3.  An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of data
 * points exceeds the series' [turboThreshold](#series.map.turboThreshold),
 * this option is not available.
 *
 *  ```js
 *     data: [{
 *         value: 6,
 *         name: "Point2",
 *         color: "#00FF00"
 *     }, {
 *         value: 6,
 *         name: "Point1",
 *         color: "#FF00FF"
 *     }]
 *  ```
 *
 * @type      {Array<number|Array<string,(number|null)>|null|*>}
 * @extends   series.map.data
 * @excluding drilldown
 * @product   highmaps
 * @apioption series.mapline.data
 */
/**
 * Pixel width of the mapline line.
 *
 * @type      {number}
 * @since 10.2.0
 * @product   highmaps
 * @apioption plotOptions.mapline.states.hover.lineWidth
 */
/**
 * Pixel width of the mapline line.
 *
 * @type      {number|undefined}
 * @since 10.3.3
 * @product   highmaps
 * @apioption series.mapline.data.lineWidth
 */
/**
 *
 * @type      {number}
 * @product   highmaps
 * @excluding borderWidth
 * @apioption plotOptions.mapline.states.hover
 */
(''); // Keeps doclets above in JS file

;// ./code/es5/es-modules/Series/MapLine/MapLineSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapLineSeries_extends = (undefined && undefined.__extends) || (function () {
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




var MapLineSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapLineSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.mapline
 *
 * @augments Highcharts.Series
 */
var MapLineSeries = /** @class */ (function (_super) {
    MapLineSeries_extends(MapLineSeries, _super);
    function MapLineSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Get presentational attributes
     * @private
     * @function Highcharts.seriesTypes.mapline#pointAttribs
     */
    MapLineSeries.prototype.pointAttribs = function (point, state) {
        var attr = _super.prototype.pointAttribs.call(this,
            point,
            state);
        // The difference from a map series is that the stroke takes the
        // point color
        attr.fill = this.options.fillColor;
        return attr;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    MapLineSeries.defaultOptions = MapLineSeries_merge(Map_MapSeries.defaultOptions, MapLine_MapLineSeriesDefaults);
    return MapLineSeries;
}(Map_MapSeries));
MapLineSeries_extend(MapLineSeries.prototype, {
    type: 'mapline',
    colorProp: 'stroke',
    pointAttrToOptions: {
        'stroke': 'color',
        'stroke-width': 'lineWidth'
    }
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('mapline', MapLineSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapLine_MapLineSeries = ((/* unused pure expression or super */ null && (MapLineSeries)));

;// ./code/es5/es-modules/Series/MapPoint/MapPointPoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapPointPoint_extends = (undefined && undefined.__extends) || (function () {
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

var MapPointPoint_ScatterSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.scatter;

var MapPointPoint_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  Class
 *
 * */
var MapPointPoint = /** @class */ (function (_super) {
    MapPointPoint_extends(MapPointPoint, _super);
    function MapPointPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    MapPointPoint.prototype.isValid = function () {
        return Boolean(this.options.geometry ||
            (MapPointPoint_isNumber(this.x) && MapPointPoint_isNumber(this.y)) ||
            (MapPointPoint_isNumber(this.options.lon) && MapPointPoint_isNumber(this.options.lat)));
    };
    return MapPointPoint;
}(MapPointPoint_ScatterSeries.prototype.pointClass));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapPoint_MapPointPoint = (MapPointPoint);

;// ./code/es5/es-modules/Series/MapPoint/MapPointSeriesDefaults.js
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
 *  API Options
 *
 * */
/**
 * A mappoint series is a special form of scatter series where the points
 * can be laid out in map coordinates on top of a map.
 *
 * @sample maps/demo/mapline-mappoint/
 *         Map-line and map-point series.
 * @sample maps/demo/mappoint-mapmarker
 *         Using the mapmarker symbol for points
 * @sample maps/demo/mappoint-datalabels-mapmarker
 *         Using the mapmarker shape for data labels
 *
 * @extends      plotOptions.scatter
 * @product      highmaps
 * @optionparent plotOptions.mappoint
 */
var MapPointSeriesDefaults = {
    dataLabels: {
        crop: false,
        defer: false,
        enabled: true,
        formatter: function () {
            return this.point.name;
        },
        overflow: false,
        style: {
            /** @internal */
            color: "#000000" /* Palette.neutralColor100 */
        }
    },
    legendSymbol: 'lineMarker'
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapPoint_MapPointSeriesDefaults = (MapPointSeriesDefaults);
/* *
 *
 *  API Options
 *
 * */
/**
 * A `mappoint` series. If the [type](#series.mappoint.type) option
 * is not specified, it is inherited from [chart.type](#chart.type).
 *
 *
 * @extends   series,plotOptions.mappoint
 * @excluding dataParser, dataURL
 * @product   highmaps
 * @apioption series.mappoint
 */
/**
 * An array of data points for the series. For the `mappoint` series
 * type, points can be given in the following ways:
 *
 * 1. An array of numerical values. In this case, the numerical values will be
 *    interpreted as `y` options. The `x` values will be automatically
 *    calculated, either starting at 0 and incremented by 1, or from
 *    `pointStart` and `pointInterval` given in the series options. If the axis
 *    has categories, these will be used. Example:
 *    ```js
 *    data: [0, 5, 3, 5]
 *    ```
 *
 * 2. An array of arrays with 2 values. In this case, the values correspond
 * to `[hc-key, value]`. Example:
 *
 *  ```js
 *     data: [
 *         ['us-ny', 0],
 *         ['us-mi', 5],
 *         ['us-tx', 3],
 *         ['us-ak', 5]
 *     ]
 *  ```
 *
 * 3. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.mappoint.turboThreshold),
 *    this option is not available.
 *    ```js
 *        data: [{
 *            x: 1,
 *            y: 7,
 *            name: "Point2",
 *            color: "#00FF00"
 *        }, {
 *            x: 1,
 *            y: 4,
 *            name: "Point1",
 *            color: "#FF00FF"
 *        }]
 *    ```
 *
 * @type      {Array<number|Array<number,(number|null)>|null|*>}
 * @extends   series.map.data
 * @excluding labelrank, middleX, middleY, path, value
 * @product   highmaps
 * @apioption series.mappoint.data
 */
/**
 * The geometry of a point.
 *
 * To achieve a better separation between the structure and the data,
 * it is recommended to use `mapData` to define the geometry instead
 * of defining it on the data points themselves.
 *
 * The geometry object is compatible to that of a `feature` in geoJSON, so
 * features of geoJSON can be passed directly into the `data`, optionally
 * after first filtering and processing it.
 *
 * @sample maps/series/mappoint-line-geometry/
 *         Map point and line geometry
 *
 * @type      {Object}
 * @since 9.3.0
 * @product   highmaps
 * @apioption series.mappoint.data.geometry
 */
/**
 * The geometry type, which in case of the `mappoint` series is always `Point`.
 *
 * @type      {string}
 * @since 9.3.0
 * @product   highmaps
 * @validvalue ["Point"]
 * @apioption series.mappoint.data.geometry.type
 */
/**
 * The geometry coordinates in terms of `[longitude, latitude]`.
 *
 * @type      {Highcharts.LonLatArray}
 * @since 9.3.0
 * @product   highmaps
 * @apioption series.mappoint.data.geometry.coordinates
 */
/**
 * The latitude of the point. Must be combined with the `lon` option
 * to work. Overrides `x` and `y` values.
 *
 * @sample {highmaps} maps/demo/mappoint-latlon/
 *         Point position by lat/lon
 *
 * @type      {number}
 * @since     1.1.0
 * @product   highmaps
 * @apioption series.mappoint.data.lat
 */
/**
 * The longitude of the point. Must be combined with the `lon` option
 * to work. Overrides `x` and `y` values.
 *
 * @sample {highmaps} maps/demo/mappoint-latlon/
 *         Point position by lat/lon
 *
 * @type      {number}
 * @since     1.1.0
 * @product   highmaps
 * @apioption series.mappoint.data.lon
 */
/**
 * The x coordinate of the point in terms of projected units.
 *
 * @sample {highmaps} maps/series/mapline-mappoint-path-xy/
 *         Map point demo
 *
 * @type      {number}
 * @product   highmaps
 * @apioption series.mappoint.data.x
 */
/**
 * The x coordinate of the point in terms of projected units.
 *
 * @sample {highmaps} maps/series/mapline-mappoint-path-xy/
 *         Map point demo
 *
 * @type      {number|null}
 * @product   highmaps
 * @apioption series.mappoint.data.y
 */
/**
 * @type      {number}
 * @product   highmaps
 * @excluding borderColor, borderWidth
 * @apioption plotOptions.mappoint
 */
(''); // Keeps doclets above in JS file

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Series","types","scatter"],"commonjs":["highcharts","Series","types","scatter"],"commonjs2":["highcharts","Series","types","scatter"],"root":["Highcharts","Series","types","scatter"]}
var highcharts_Series_types_scatter_commonjs_highcharts_Series_types_scatter_commonjs2_highcharts_Series_types_scatter_root_Highcharts_Series_types_scatter_ = __webpack_require__(632);
;// ./code/es5/es-modules/Series/MapPoint/MapPointSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapPointSeries_extends = (undefined && undefined.__extends) || (function () {
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

var MapPointSeries_noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;



var MapPointSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, MapPointSeries_MapSeries = MapPointSeries_a.map, MapPointSeries_ScatterSeries = MapPointSeries_a.scatter;


var MapPointSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapPointSeries_fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, MapPointSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, MapPointSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;


/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.mappoint
 *
 * @augments Highcharts.Series
 */
var MapPointSeries = /** @class */ (function (_super) {
    MapPointSeries_extends(MapPointSeries, _super);
    function MapPointSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.clearBounds = MapPointSeries_MapSeries.prototype.clearBounds;
        return _this;
        /* eslint-enable valid-jsdoc */
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    MapPointSeries.prototype.drawDataLabels = function () {
        _super.prototype.drawDataLabels.call(this);
        if (this.dataLabelsGroup) {
            this.dataLabelsGroup.clip(this.chart.clipRect);
        }
    };
    /**
     * Resolve `lon`, `lat` or `geometry` options and project the resulted
     * coordinates.
     *
     * @private
     */
    MapPointSeries.prototype.projectPoint = function (pointOptions) {
        var mapView = this.chart.mapView;
        if (mapView) {
            var geometry = pointOptions.geometry,
                lon = pointOptions.lon,
                lat = pointOptions.lat;
            var coordinates = (geometry &&
                    geometry.type === 'Point' &&
                    geometry.coordinates);
            if (MapPointSeries_isNumber(lon) && MapPointSeries_isNumber(lat)) {
                coordinates = [lon, lat];
            }
            if (coordinates) {
                return mapView.lonLatToProjectedUnits({
                    lon: coordinates[0],
                    lat: coordinates[1]
                });
            }
        }
    };
    MapPointSeries.prototype.translate = function () {
        var _this = this;
        var mapView = this.chart.mapView;
        this.generatePoints();
        if (this.getProjectedBounds && this.isDirtyData) {
            delete this.bounds;
            this.getProjectedBounds(); // Added point needs bounds(#16598)
        }
        // Create map based translation
        if (mapView) {
            var mainSvgTransform_1 = mapView.getSVGTransform(),
                hasCoordinates_1 = mapView.projection.hasCoordinates;
            this.points.forEach(function (p) {
                var _a = p.x,
                    x = _a === void 0 ? void 0 : _a,
                    _b = p.y,
                    y = _b === void 0 ? void 0 : _b;
                var svgTransform = (MapPointSeries_isNumber(p.insetIndex) &&
                        mapView.insets[p.insetIndex].getSVGTransform()) || mainSvgTransform_1;
                var xy = (_this.projectPoint(p.options) ||
                        (p.properties &&
                            _this.projectPoint(p.properties)));
                var didBounds;
                if (xy) {
                    x = xy.x;
                    y = xy.y;
                    // Map bubbles getting geometry from shape
                }
                else if (p.bounds) {
                    x = p.bounds.midX;
                    y = p.bounds.midY;
                    if (svgTransform && MapPointSeries_isNumber(x) && MapPointSeries_isNumber(y)) {
                        p.plotX = x * svgTransform.scaleX +
                            svgTransform.translateX;
                        p.plotY = y * svgTransform.scaleY +
                            svgTransform.translateY;
                        didBounds = true;
                    }
                }
                if (MapPointSeries_isNumber(x) && MapPointSeries_isNumber(y)) {
                    // Establish plotX and plotY
                    if (!didBounds) {
                        var plotCoords = mapView.projectedUnitsToPixels({ x: x,
                            y: y });
                        p.plotX = plotCoords.x;
                        p.plotY = hasCoordinates_1 ?
                            plotCoords.y :
                            _this.chart.plotHeight - plotCoords.y;
                    }
                }
                else {
                    p.y = p.plotX = p.plotY = void 0;
                }
                p.isInside = _this.isPointInside(p);
                // Find point zone
                p.zone = _this.zones.length ? p.getZone() : void 0;
            });
        }
        MapPointSeries_fireEvent(this, 'afterTranslate');
    };
    MapPointSeries.defaultOptions = MapPointSeries_merge(MapPointSeries_ScatterSeries.defaultOptions, MapPoint_MapPointSeriesDefaults);
    return MapPointSeries;
}(MapPointSeries_ScatterSeries));
/* *
 *
 * Extra
 *
 * */
/* *
 * The mapmarker symbol
 */
var mapmarker = function (x, y, w, h, options) {
    var isLegendSymbol = options && options.context === 'legend';
    var anchorX,
        anchorY;
    if (isLegendSymbol) {
        anchorX = x + w / 2;
        anchorY = y + h;
        // Put the pin in the anchor position (dataLabel.shape)
    }
    else if (options &&
        typeof options.anchorX === 'number' &&
        typeof options.anchorY === 'number') {
        anchorX = options.anchorX;
        anchorY = options.anchorY;
        // Put the pin in the center and shift upwards (point.marker.symbol)
    }
    else {
        anchorX = x + w / 2;
        anchorY = y + h / 2;
        y -= h;
    }
    var r = isLegendSymbol ? h / 3 : h / 2;
    return [
        ['M', anchorX, anchorY],
        ['C', anchorX, anchorY, anchorX - r, y + r * 1.5, anchorX - r, y + r],
        // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
        ['A', r, r, 1, 1, 1, anchorX + r, y + r],
        ['C', anchorX + r, y + r * 1.5, anchorX, anchorY, anchorX, anchorY],
        ['Z']
    ];
};
(highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default()).prototype.symbols.mapmarker = mapmarker;
MapPointSeries_extend(MapPointSeries.prototype, {
    type: 'mappoint',
    axisTypes: ['colorAxis'],
    forceDL: true,
    isCartesian: false,
    pointClass: MapPoint_MapPointPoint,
    searchPoint: MapPointSeries_noop,
    useMapGeometry: true // #16534
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('mappoint', MapPointSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapPoint_MapPointSeries = ((/* unused pure expression or super */ null && (MapPointSeries)));
/* *
 *
 *  API Options
 *
 * */
''; // Adds doclets above to transpiled file

;// ./code/es5/es-modules/Series/Bubble/BubbleLegendDefaults.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Paweł Potaczek
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Constants
 *
 * */
/**
 * The bubble legend is an additional element in legend which
 * presents the scale of the bubble series. Individual bubble ranges
 * can be defined by user or calculated from series. In the case of
 * automatically calculated ranges, a 1px margin of error is
 * permitted.
 *
 * @since        7.0.0
 * @product      highcharts highstock highmaps
 * @requires     highcharts-more
 * @optionparent legend.bubbleLegend
 */
var BubbleLegendDefaults = {
    /**
     * The color of the ranges borders, can be also defined for an
     * individual range.
     *
     * @sample highcharts/bubble-legend/similartoseries/
     *         Similar look to the bubble series
     * @sample highcharts/bubble-legend/bordercolor/
     *         Individual bubble border color
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     */
    borderColor: void 0,
    /**
     * The width of the ranges borders in pixels, can be also
     * defined for an individual range.
     */
    borderWidth: 2,
    /**
     * An additional class name to apply to the bubble legend'
     * circle graphical elements. This option does not replace
     * default class names of the graphical element.
     *
     * @sample {highcharts} highcharts/css/bubble-legend/
     *         Styling by CSS
     *
     * @type {string}
     */
    className: void 0,
    /**
     * The main color of the bubble legend. Applies to ranges, if
     * individual color is not defined.
     *
     * @sample highcharts/bubble-legend/similartoseries/
     *         Similar look to the bubble series
     * @sample highcharts/bubble-legend/color/
     *         Individual bubble color
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     */
    color: void 0,
    /**
     * An additional class name to apply to the bubble legend's
     * connector graphical elements. This option does not replace
     * default class names of the graphical element.
     *
     * @sample {highcharts} highcharts/css/bubble-legend/
     *         Styling by CSS
     *
     * @type {string}
     */
    connectorClassName: void 0,
    /**
     * The color of the connector, can be also defined
     * for an individual range.
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     */
    connectorColor: void 0,
    /**
     * The length of the connectors in pixels. If labels are
     * centered, the distance is reduced to 0.
     *
     * @sample highcharts/bubble-legend/connectorandlabels/
     *         Increased connector length
     */
    connectorDistance: 60,
    /**
     * The width of the connectors in pixels.
     *
     * @sample highcharts/bubble-legend/connectorandlabels/
     *         Increased connector width
     */
    connectorWidth: 1,
    /**
     * Enable or disable the bubble legend.
     */
    enabled: false,
    /**
     * Options for the bubble legend labels.
     */
    labels: {
        /**
         * An additional class name to apply to the bubble legend
         * label graphical elements. This option does not replace
         * default class names of the graphical element.
         *
         * @sample {highcharts} highcharts/css/bubble-legend/
         *         Styling by CSS
         *
         * @type {string}
         */
        className: void 0,
        /**
         * Whether to allow data labels to overlap.
         */
        allowOverlap: false,
        /**
         * A format string for the bubble legend labels. Available
         * variables are the same as for `formatter`.
         *
         * @sample highcharts/bubble-legend/format/
         *         Add a unit
         *
         * @type {string}
         */
        format: '',
        /**
         * Available `this` properties are:
         *
         * - `this.value`: The bubble value.
         *
         * - `this.radius`: The radius of the bubble range.
         *
         * - `this.center`: The center y position of the range.
         *
         * @type {Highcharts.FormatterCallbackFunction<Highcharts.BubbleLegendFormatterContextObject>}
         */
        formatter: void 0,
        /**
         * The alignment of the labels compared to the bubble
         * legend. Can be one of `left`, `center` or `right`.
         *
         * @sample highcharts/bubble-legend/connectorandlabels/
         *         Labels on left
         *
         * @type {Highcharts.AlignValue}
         */
        align: 'right',
        /**
         * CSS styles for the labels.
         *
         * @type {Highcharts.CSSObject}
         */
        style: {
            /** @ignore-option */
            fontSize: '0.9em',
            /** @ignore-option */
            color: "#000000" /* Palette.neutralColor100 */
        },
        /**
         * The x position offset of the label relative to the
         * connector.
         */
        x: 0,
        /**
         * The y position offset of the label relative to the
         * connector.
         */
        y: 0
    },
    /**
     * Maximum bubble legend range size. If values for ranges are
     * not specified, the `minSize` and the `maxSize` are calculated
     * from bubble series.
     */
    maxSize: 60, // Number
    /**
     * Minimum bubble legend range size. If values for ranges are
     * not specified, the `minSize` and the `maxSize` are calculated
     * from bubble series.
     */
    minSize: 10, // Number
    /**
     * The position of the bubble legend in the legend.
     * @sample highcharts/bubble-legend/connectorandlabels/
     *         Bubble legend as last item in legend
     */
    legendIndex: 0, // Number
    /**
     * Options for specific range. One range consists of bubble,
     * label and connector.
     *
     * @sample highcharts/bubble-legend/ranges/
     *         Manually defined ranges
     * @sample highcharts/bubble-legend/autoranges/
     *         Auto calculated ranges
     *
     * @type {Array<*>}
     */
    ranges: {
        /**
         * Range size value, similar to bubble Z data.
         * @type {number}
         */
        value: void 0,
        /**
         * The color of the border for individual range.
         * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         */
        borderColor: void 0,
        /**
         * The color of the bubble for individual range.
         * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         */
        color: void 0,
        /**
         * The color of the connector for individual range.
         * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         */
        connectorColor: void 0
    },
    /**
     * Whether the bubble legend range value should be represented
     * by the area or the width of the bubble. The default, area,
     * corresponds best to the human perception of the size of each
     * bubble.
     *
     * @sample highcharts/bubble-legend/ranges/
     *         Size by width
     *
     * @type {Highcharts.BubbleSizeByValue}
     */
    sizeBy: 'area',
    /**
     * When this is true, the absolute value of z determines the
     * size of the bubble. This means that with the default
     * zThreshold of 0, a bubble of value -1 will have the same size
     * as a bubble of value 1, while a bubble of value 0 will have a
     * smaller size according to minSize.
     */
    sizeByAbsoluteValue: false,
    /**
     * Define the visual z index of the bubble legend.
     */
    zIndex: 1,
    /**
     * Ranges with lower value than zThreshold are skipped.
     */
    zThreshold: 0
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Bubble_BubbleLegendDefaults = (BubbleLegendDefaults);

;// ./code/es5/es-modules/Series/Bubble/BubbleLegendItem.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Paweł Potaczek
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var BubbleLegendItem_color = (highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default()).parse;


var BubbleLegendItem_noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;

var arrayMax = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMax, arrayMin = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMin, BubbleLegendItem_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, BubbleLegendItem_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, BubbleLegendItem_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, stableSort = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).stableSort;
/* *
 *
 *  Class
 *
 * */
/**
 * BubbleLegend class.
 *
 * @private
 * @class
 * @name Highcharts.BubbleLegend
 * @param {Highcharts.LegendBubbleLegendOptions} options
 * Options of BubbleLegendItem.
 *
 * @param {Highcharts.Legend} legend
 * Legend of item.
 */
var BubbleLegendItem = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function BubbleLegendItem(options, legend) {
        this.setState = BubbleLegendItem_noop;
        this.init(options, legend);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Create basic bubbleLegend properties similar to item in legend.
     * @private
     */
    BubbleLegendItem.prototype.init = function (options, legend) {
        this.options = options;
        this.visible = true;
        this.chart = legend.chart;
        this.legend = legend;
    };
    /**
     * Depending on the position option, add bubbleLegend to legend items.
     *
     * @private
     *
     * @param {Array<(Highcharts.Point|Highcharts.Series)>} items
     *        All legend items
     */
    BubbleLegendItem.prototype.addToLegend = function (items) {
        // Insert bubbleLegend into legend items
        items.splice(this.options.legendIndex, 0, this);
    };
    /**
     * Calculate ranges, sizes and call the next steps of bubbleLegend
     * creation.
     *
     * @private
     *
     * @param {Highcharts.Legend} legend
     *        Legend instance
     */
    BubbleLegendItem.prototype.drawLegendSymbol = function (legend) {
        var itemDistance = BubbleLegendItem_pick(legend.options.itemDistance, 20),
            legendItem = this.legendItem || {},
            options = this.options,
            ranges = options.ranges,
            connectorDistance = options.connectorDistance;
        var connectorSpace;
        // Do not create bubbleLegend now if ranges or ranges values are not
        // specified or if are empty array.
        if (!ranges || !ranges.length || !BubbleLegendItem_isNumber(ranges[0].value)) {
            legend.options.bubbleLegend.autoRanges = true;
            return;
        }
        // Sort ranges to right render order
        stableSort(ranges, function (a, b) {
            return b.value - a.value;
        });
        this.ranges = ranges;
        this.setOptions();
        this.render();
        // Get max label size
        var maxLabel = this.getMaxLabelSize(),
            radius = this.ranges[0].radius,
            size = radius * 2;
        // Space for connectors and labels.
        connectorSpace =
            connectorDistance - radius + maxLabel.width;
        connectorSpace = connectorSpace > 0 ? connectorSpace : 0;
        this.maxLabel = maxLabel;
        this.movementX = options.labels.align === 'left' ?
            connectorSpace : 0;
        legendItem.labelWidth = size + connectorSpace + itemDistance;
        legendItem.labelHeight = size + maxLabel.height / 2;
    };
    /**
     * Set style options for each bubbleLegend range.
     * @private
     */
    BubbleLegendItem.prototype.setOptions = function () {
        var ranges = this.ranges,
            options = this.options,
            series = this.chart.series[options.seriesIndex],
            baseline = this.legend.baseline,
            bubbleAttribs = {
                zIndex: options.zIndex,
                'stroke-width': options.borderWidth
            },
            connectorAttribs = {
                zIndex: options.zIndex,
                'stroke-width': options.connectorWidth
            },
            labelAttribs = {
                align: (this.legend.options.rtl ||
                    options.labels.align === 'left') ? 'right' : 'left',
                zIndex: options.zIndex
            },
            fillOpacity = series.options.marker.fillOpacity,
            styledMode = this.chart.styledMode;
        // Allow to parts of styles be used individually for range
        ranges.forEach(function (range, i) {
            if (!styledMode) {
                bubbleAttribs.stroke = BubbleLegendItem_pick(range.borderColor, options.borderColor, series.color);
                bubbleAttribs.fill = BubbleLegendItem_pick(range.color, options.color, fillOpacity !== 1 ?
                    BubbleLegendItem_color(series.color).setOpacity(fillOpacity)
                        .get('rgba') :
                    series.color);
                connectorAttribs.stroke = BubbleLegendItem_pick(range.connectorColor, options.connectorColor, series.color);
            }
            // Set options needed for rendering each range
            ranges[i].radius = this.getRangeRadius(range.value);
            ranges[i] = BubbleLegendItem_merge(ranges[i], {
                center: (ranges[0].radius - ranges[i].radius +
                    baseline)
            });
            if (!styledMode) {
                BubbleLegendItem_merge(true, ranges[i], {
                    bubbleAttribs: BubbleLegendItem_merge(bubbleAttribs),
                    connectorAttribs: BubbleLegendItem_merge(connectorAttribs),
                    labelAttribs: labelAttribs
                });
            }
        }, this);
    };
    /**
     * Calculate radius for each bubble range,
     * used code from BubbleSeries.js 'getRadius' method.
     *
     * @private
     *
     * @param {number} value
     *        Range value
     *
     * @return {number|null}
     *         Radius for one range
     */
    BubbleLegendItem.prototype.getRangeRadius = function (value) {
        var options = this.options,
            seriesIndex = this.options.seriesIndex,
            bubbleSeries = this.chart.series[seriesIndex],
            zMax = options.ranges[0].value,
            zMin = options.ranges[options.ranges.length - 1].value,
            minSize = options.minSize,
            maxSize = options.maxSize;
        return bubbleSeries.getRadius.call(this, zMin, zMax, minSize, maxSize, value);
    };
    /**
     * Render the legendItem group.
     * @private
     */
    BubbleLegendItem.prototype.render = function () {
        var legendItem = this.legendItem || {},
            renderer = this.chart.renderer,
            zThreshold = this.options.zThreshold;
        if (!this.symbols) {
            this.symbols = {
                connectors: [],
                bubbleItems: [],
                labels: []
            };
        }
        // Nesting SVG groups to enable handleOverflow
        legendItem.symbol = renderer.g('bubble-legend');
        legendItem.label = renderer.g('bubble-legend-item')
            .css(this.legend.itemStyle || {});
        // To enable default 'hideOverlappingLabels' method
        legendItem.symbol.translateX = 0;
        legendItem.symbol.translateY = 0;
        // To use handleOverflow method
        legendItem.symbol.add(legendItem.label);
        legendItem.label.add(legendItem.group);
        for (var _i = 0, _a = this.ranges; _i < _a.length; _i++) {
            var range = _a[_i];
            if (range.value >= zThreshold) {
                this.renderRange(range);
            }
        }
        this.hideOverlappingLabels();
    };
    /**
     * Render one range, consisting of bubble symbol, connector and label.
     *
     * @private
     *
     * @param {Highcharts.LegendBubbleLegendRangesOptions} range
     *        Range options
     */
    BubbleLegendItem.prototype.renderRange = function (range) {
        var mainRange = this.ranges[0], legend = this.legend, options = this.options, labelsOptions = options.labels, chart = this.chart, bubbleSeries = chart.series[options.seriesIndex], renderer = chart.renderer, symbols = this.symbols, labels = symbols.labels, elementCenter = range.center, absoluteRadius = Math.abs(range.radius), connectorDistance = options.connectorDistance || 0, labelsAlign = labelsOptions.align, rtl = legend.options.rtl, borderWidth = options.borderWidth, connectorWidth = options.connectorWidth, posX = mainRange.radius || 0, posY = elementCenter - absoluteRadius -
                borderWidth / 2 + connectorWidth / 2, crispMovement = (posY % 1 ? 1 : 0.5) -
                (connectorWidth % 2 ? 0 : 0.5), styledMode = renderer.styledMode;
        var connectorLength = rtl || labelsAlign === 'left' ?
                -connectorDistance : connectorDistance;
        // Set options for centered labels
        if (labelsAlign === 'center') {
            connectorLength = 0; // Do not use connector
            options.connectorDistance = 0;
            range.labelAttribs.align = 'center';
        }
        // Render bubble symbol
        symbols.bubbleItems.push(renderer
            .circle(posX, elementCenter + crispMovement, absoluteRadius)
            .attr(styledMode ? {} : range.bubbleAttribs)
            .addClass((styledMode ?
            'highcharts-color-' +
                bubbleSeries.colorIndex + ' ' :
            '') +
            'highcharts-bubble-legend-symbol ' +
            (options.className || '')).add(this.legendItem.symbol));
        // Render connector
        symbols.connectors.push(renderer
            .path(renderer.crispLine([
            ['M', posX, posY],
            ['L', posX + connectorLength, posY]
        ], options.connectorWidth))
            .attr((styledMode ? {} : range.connectorAttribs))
            .addClass((styledMode ?
            'highcharts-color-' +
                this.options.seriesIndex + ' ' : '') +
            'highcharts-bubble-legend-connectors ' +
            (options.connectorClassName || '')).add(this.legendItem.symbol));
        // Render label
        var label = renderer
                .text(this.formatLabel(range))
                .attr((styledMode ? {} : range.labelAttribs))
                .css(styledMode ? {} : labelsOptions.style)
                .addClass('highcharts-bubble-legend-labels ' +
                (options.labels.className || '')).add(this.legendItem.symbol);
        // Now that the label is added we can read the bounding box and
        // vertically align
        var position = {
                x: posX + connectorLength + options.labels.x,
                y: posY + options.labels.y + label.getBBox().height * 0.4
            };
        label.attr(position);
        labels.push(label);
        // To enable default 'hideOverlappingLabels' method
        label.placed = true;
        label.alignAttr = position;
    };
    /**
     * Get the label which takes up the most space.
     * @private
     */
    BubbleLegendItem.prototype.getMaxLabelSize = function () {
        var labels = this.symbols.labels;
        var maxLabel,
            labelSize;
        labels.forEach(function (label) {
            labelSize = label.getBBox(true);
            if (maxLabel) {
                maxLabel = labelSize.width > maxLabel.width ?
                    labelSize : maxLabel;
            }
            else {
                maxLabel = labelSize;
            }
        });
        return maxLabel || {};
    };
    /**
     * Get formatted label for range.
     *
     * @private
     *
     * @param {Highcharts.LegendBubbleLegendRangesOptions} range
     *        Range options
     *
     * @return {string}
     *         Range label text
     */
    BubbleLegendItem.prototype.formatLabel = function (range) {
        var options = this.options,
            formatter = options.labels.formatter,
            format = options.labels.format;
        var numberFormatter = this.chart.numberFormatter;
        return format ? highcharts_Templating_commonjs_highcharts_Templating_commonjs2_highcharts_Templating_root_Highcharts_Templating_default().format(format, range, this.chart) :
            formatter ? formatter.call(range) :
                numberFormatter(range.value, 1);
    };
    /**
     * By using default chart 'hideOverlappingLabels' method, hide or show
     * labels and connectors.
     * @private
     */
    BubbleLegendItem.prototype.hideOverlappingLabels = function () {
        var chart = this.chart,
            allowOverlap = this.options.labels.allowOverlap,
            symbols = this.symbols;
        if (!allowOverlap && symbols) {
            chart.hideOverlappingLabels(symbols.labels);
            // Hide or show connectors
            symbols.labels.forEach(function (label, index) {
                if (!label.newOpacity) {
                    symbols.connectors[index].hide();
                }
                else if (label.newOpacity !== label.oldOpacity) {
                    symbols.connectors[index].show();
                }
            });
        }
    };
    /**
     * Calculate ranges from created series.
     *
     * @private
     *
     * @return {Array<Highcharts.LegendBubbleLegendRangesOptions>}
     *         Array of range objects
     */
    BubbleLegendItem.prototype.getRanges = function () {
        var bubbleLegend = this.legend.bubbleLegend,
            series = bubbleLegend.chart.series,
            rangesOptions = bubbleLegend.options.ranges;
        var ranges,
            zData,
            minZ = Number.MAX_VALUE,
            maxZ = -Number.MAX_VALUE;
        series.forEach(function (s) {
            // Find the min and max Z, like in bubble series
            if (s.isBubble && !s.ignoreSeries) {
                zData = s.getColumn('z').filter(BubbleLegendItem_isNumber);
                if (zData.length) {
                    minZ = BubbleLegendItem_pick(s.options.zMin, Math.min(minZ, Math.max(arrayMin(zData), s.options.displayNegative === false ?
                        s.options.zThreshold :
                        -Number.MAX_VALUE)));
                    maxZ = BubbleLegendItem_pick(s.options.zMax, Math.max(maxZ, arrayMax(zData)));
                }
            }
        });
        // Set values for ranges
        if (minZ === maxZ) {
            // Only one range if min and max values are the same.
            ranges = [{ value: maxZ }];
        }
        else {
            ranges = [
                { value: minZ },
                { value: (minZ + maxZ) / 2 },
                { value: maxZ, autoRanges: true }
            ];
        }
        // Prevent reverse order of ranges after redraw
        if (rangesOptions.length && rangesOptions[0].radius) {
            ranges.reverse();
        }
        // Merge ranges values with user options
        ranges.forEach(function (range, i) {
            if (rangesOptions && rangesOptions[i]) {
                ranges[i] = BubbleLegendItem_merge(rangesOptions[i], range);
            }
        });
        return ranges;
    };
    /**
     * Calculate bubble legend sizes from rendered series.
     *
     * @private
     *
     * @return {Array<number,number>}
     *         Calculated min and max bubble sizes
     */
    BubbleLegendItem.prototype.predictBubbleSizes = function () {
        var chart = this.chart,
            legendOptions = chart.legend.options,
            floating = legendOptions.floating,
            horizontal = legendOptions.layout === 'horizontal',
            lastLineHeight = horizontal ? chart.legend.lastLineHeight : 0,
            plotSizeX = chart.plotSizeX,
            plotSizeY = chart.plotSizeY,
            bubbleSeries = chart.series[this.options.seriesIndex],
            pxSizes = bubbleSeries.getPxExtremes(),
            minSize = Math.ceil(pxSizes.minPxSize),
            maxPxSize = Math.ceil(pxSizes.maxPxSize),
            plotSize = Math.min(plotSizeY,
            plotSizeX);
        var calculatedSize,
            maxSize = bubbleSeries.options.maxSize;
        // Calculate predicted max size of bubble
        if (floating || !(/%$/.test(maxSize))) {
            calculatedSize = maxPxSize;
        }
        else {
            maxSize = parseFloat(maxSize);
            calculatedSize = ((plotSize + lastLineHeight) * maxSize / 100) /
                (maxSize / 100 + 1);
            // Get maxPxSize from bubble series if calculated bubble legend
            // size will not affect to bubbles series.
            if ((horizontal && plotSizeY - calculatedSize >=
                plotSizeX) || (!horizontal && plotSizeX -
                calculatedSize >= plotSizeY)) {
                calculatedSize = maxPxSize;
            }
        }
        return [minSize, Math.ceil(calculatedSize)];
    };
    /**
     * Correct ranges with calculated sizes.
     * @private
     */
    BubbleLegendItem.prototype.updateRanges = function (min, max) {
        var bubbleLegendOptions = this.legend.options.bubbleLegend;
        bubbleLegendOptions.minSize = min;
        bubbleLegendOptions.maxSize = max;
        bubbleLegendOptions.ranges = this.getRanges();
    };
    /**
     * Because of the possibility of creating another legend line, predicted
     * bubble legend sizes may differ by a few pixels, so it is necessary to
     * correct them.
     * @private
     */
    BubbleLegendItem.prototype.correctSizes = function () {
        var legend = this.legend,
            chart = this.chart,
            bubbleSeries = chart.series[this.options.seriesIndex],
            pxSizes = bubbleSeries.getPxExtremes(),
            bubbleSeriesSize = pxSizes.maxPxSize,
            bubbleLegendSize = this.options.maxSize;
        if (Math.abs(Math.ceil(bubbleSeriesSize) - bubbleLegendSize) >
            1) {
            this.updateRanges(this.options.minSize, pxSizes.maxPxSize);
            legend.render();
        }
    };
    return BubbleLegendItem;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Bubble_BubbleLegendItem = (BubbleLegendItem);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * @interface Highcharts.BubbleLegendFormatterContextObject
 */ /**
* The center y position of the range.
* @name Highcharts.BubbleLegendFormatterContextObject#center
* @type {number}
*/ /**
* The radius of the bubble range.
* @name Highcharts.BubbleLegendFormatterContextObject#radius
* @type {number}
*/ /**
* The bubble value.
* @name Highcharts.BubbleLegendFormatterContextObject#value
* @type {number}
*/
''; // Detach doclets above

;// ./code/es5/es-modules/Series/Bubble/BubbleLegendComposition.js
/* *
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Paweł Potaczek
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */




var BubbleLegendComposition_setOptions = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).setOptions;

var BubbleLegendComposition_composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;

var BubbleLegendComposition_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, BubbleLegendComposition_objectEach = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).objectEach, BubbleLegendComposition_pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique, BubbleLegendComposition_wrap = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).wrap;
/* *
 *
 *  Functions
 *
 * */
/**
 * If ranges are not specified, determine ranges from rendered bubble series
 * and render legend again.
 */
function chartDrawChartBox(proceed, options, callback) {
    var chart = this,
        legend = chart.legend,
        bubbleSeries = getVisibleBubbleSeriesIndex(chart) >= 0;
    var bubbleLegendOptions,
        bubbleSizes,
        legendItem;
    if (legend && legend.options.enabled && legend.bubbleLegend &&
        legend.options.bubbleLegend.autoRanges && bubbleSeries) {
        bubbleLegendOptions = legend.bubbleLegend.options;
        bubbleSizes = legend.bubbleLegend.predictBubbleSizes();
        legend.bubbleLegend.updateRanges(bubbleSizes[0], bubbleSizes[1]);
        // Disable animation on init
        if (!bubbleLegendOptions.placed) {
            legend.group.placed = false;
            legend.allItems.forEach(function (item) {
                legendItem = item.legendItem || {};
                if (legendItem.group) {
                    legendItem.group.translateY = void 0;
                }
            });
        }
        // Create legend with bubbleLegend
        legend.render();
        // Calculate margins after first rendering the bubble legend
        if (!bubbleLegendOptions.placed) {
            chart.getMargins();
            chart.axes.forEach(function (axis) {
                axis.setScale();
                axis.updateNames();
                // Disable axis animation on init
                BubbleLegendComposition_objectEach(axis.ticks, function (tick) {
                    tick.isNew = true;
                    tick.isNewLabel = true;
                });
            });
            chart.getMargins();
        }
        bubbleLegendOptions.placed = true;
        // Call default 'drawChartBox' method.
        proceed.call(chart, options, callback);
        // Check bubble legend sizes and correct them if necessary.
        legend.bubbleLegend.correctSizes();
        // Correct items positions with different dimensions in legend.
        retranslateItems(legend, getLinesHeights(legend));
    }
    else {
        proceed.call(chart, options, callback);
        // Allow color change on static bubble legend after click on legend
        if (legend && legend.options.enabled && legend.bubbleLegend) {
            legend.render();
            retranslateItems(legend, getLinesHeights(legend));
        }
    }
}
/**
 * Compose classes for use with Bubble series.
 * @private
 *
 * @param {Highcharts.Chart} ChartClass
 * Core chart class to use with Bubble series.
 *
 * @param {Highcharts.Legend} LegendClass
 * Core legend class to use with Bubble series.
 */
function BubbleLegendComposition_compose(ChartClass, LegendClass) {
    if (BubbleLegendComposition_pushUnique(BubbleLegendComposition_composed, 'Series.BubbleLegend')) {
        BubbleLegendComposition_setOptions({
            // Set default bubble legend options
            legend: {
                bubbleLegend: Bubble_BubbleLegendDefaults
            }
        });
        BubbleLegendComposition_wrap(ChartClass.prototype, 'drawChartBox', chartDrawChartBox);
        BubbleLegendComposition_addEvent(LegendClass, 'afterGetAllItems', onLegendAfterGetAllItems);
        BubbleLegendComposition_addEvent(LegendClass, 'itemClick', onLegendItemClick);
    }
}
/**
 * Check if there is at least one visible bubble series.
 *
 * @private
 * @function getVisibleBubbleSeriesIndex
 * @param {Highcharts.Chart} chart
 * Chart to check.
 * @return {number}
 * First visible bubble series index
 */
function getVisibleBubbleSeriesIndex(chart) {
    var series = chart.series;
    var i = 0;
    while (i < series.length) {
        if (series[i] &&
            series[i].isBubble &&
            series[i].visible &&
            series[i].dataTable.rowCount) {
            return i;
        }
        i++;
    }
    return -1;
}
/**
 * Calculate height for each row in legend.
 *
 * @private
 * @function getLinesHeights
 *
 * @param {Highcharts.Legend} legend
 * Legend to calculate from.
 *
 * @return {Array<Highcharts.Dictionary<number>>}
 * Informations about line height and items amount
 */
function getLinesHeights(legend) {
    var items = legend.allItems,
        lines = [],
        length = items.length;
    var lastLine,
        legendItem,
        legendItem2,
        i = 0,
        j = 0;
    for (i = 0; i < length; i++) {
        legendItem = items[i].legendItem || {};
        legendItem2 = (items[i + 1] || {}).legendItem || {};
        if (legendItem.labelHeight) {
            // For bubbleLegend
            items[i].itemHeight = legendItem.labelHeight;
        }
        if ( // Line break
        items[i] === items[length - 1] ||
            legendItem.y !== legendItem2.y) {
            lines.push({ height: 0 });
            lastLine = lines[lines.length - 1];
            // Find the highest item in line
            for (j; j <= i; j++) {
                if (items[j].itemHeight > lastLine.height) {
                    lastLine.height = items[j].itemHeight;
                }
            }
            lastLine.step = i;
        }
    }
    return lines;
}
/**
 * Start the bubble legend creation process.
 */
function onLegendAfterGetAllItems(e) {
    var legend = this,
        bubbleLegend = legend.bubbleLegend,
        legendOptions = legend.options,
        options = legendOptions.bubbleLegend,
        bubbleSeriesIndex = getVisibleBubbleSeriesIndex(legend.chart);
    // Remove unnecessary element
    if (bubbleLegend && bubbleLegend.ranges && bubbleLegend.ranges.length) {
        // Allow change the way of calculating ranges in update
        if (options.ranges.length) {
            options.autoRanges =
                !!options.ranges[0].autoRanges;
        }
        // Update bubbleLegend dimensions in each redraw
        legend.destroyItem(bubbleLegend);
    }
    // Create bubble legend
    if (bubbleSeriesIndex >= 0 &&
        legendOptions.enabled &&
        options.enabled) {
        options.seriesIndex = bubbleSeriesIndex;
        legend.bubbleLegend = new Bubble_BubbleLegendItem(options, legend);
        legend.bubbleLegend.addToLegend(e.allItems);
    }
}
/**
 * Toggle bubble legend depending on the visible status of bubble series.
 */
function onLegendItemClick(e) {
    // #14080 don't fire this code if click function is prevented
    if (e.defaultPrevented) {
        return false;
    }
    var legend = this,
        series = e.legendItem,
        chart = legend.chart,
        visible = series.visible;
    var status;
    if (legend && legend.bubbleLegend) {
        // Temporary correct 'visible' property
        series.visible = !visible;
        // Save future status for getRanges method
        series.ignoreSeries = visible;
        // Check if at lest one bubble series is visible
        status = getVisibleBubbleSeriesIndex(chart) >= 0;
        // Hide bubble legend if all bubble series are disabled
        if (legend.bubbleLegend.visible !== status) {
            // Show or hide bubble legend
            legend.update({
                bubbleLegend: { enabled: status }
            });
            legend.bubbleLegend.visible = status; // Restore default status
        }
        series.visible = visible;
    }
}
/**
 * Correct legend items translation in case of different elements heights.
 *
 * @private
 * @function Highcharts.Legend#retranslateItems
 *
 * @param {Highcharts.Legend} legend
 * Legend to translate in.
 *
 * @param {Array<Highcharts.Dictionary<number>>} lines
 * Informations about line height and items amount
 */
function retranslateItems(legend, lines) {
    var items = legend.allItems,
        rtl = legend.options.rtl;
    var orgTranslateX,
        orgTranslateY,
        movementX,
        legendItem,
        actualLine = 0;
    items.forEach(function (item, index) {
        legendItem = item.legendItem || {};
        if (!legendItem.group) {
            return;
        }
        orgTranslateX = legendItem.group.translateX || 0;
        orgTranslateY = legendItem.y || 0;
        movementX = item.movementX;
        if (movementX || (rtl && item.ranges)) {
            movementX = rtl ?
                orgTranslateX - item.options.maxSize / 2 :
                orgTranslateX + movementX;
            legendItem.group.attr({ translateX: movementX });
        }
        if (index > lines[actualLine].step) {
            actualLine++;
        }
        legendItem.group.attr({
            translateY: Math.round(orgTranslateY + lines[actualLine].height / 2)
        });
        legendItem.y = orgTranslateY + lines[actualLine].height / 2;
    });
}
/* *
 *
 *  Default Export
 *
 * */
var BubbleLegendComposition = {
    compose: BubbleLegendComposition_compose
};
/* harmony default export */ var Bubble_BubbleLegendComposition = (BubbleLegendComposition);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","Point"],"commonjs":["highcharts","Point"],"commonjs2":["highcharts","Point"],"root":["Highcharts","Point"]}
var highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_ = __webpack_require__(260);
var highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_default = /*#__PURE__*/__webpack_require__.n(highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_);
;// ./code/es5/es-modules/Series/Bubble/BubblePoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var BubblePoint_extends = (undefined && undefined.__extends) || (function () {
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


var BubblePoint_ScatterPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.scatter.prototype.pointClass;

var BubblePoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/* *
 *
 *  Class
 *
 * */
var BubblePoint = /** @class */ (function (_super) {
    BubblePoint_extends(BubblePoint, _super);
    function BubblePoint() {
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
    BubblePoint.prototype.haloPath = function (size) {
        var computedSize = (size && this.marker ?
                this.marker.radius ||
                    0 :
                0) + size;
        if (this.series.chart.inverted) {
            var pos = this.pos() || [0, 0],
                _a = this.series,
                xAxis = _a.xAxis,
                yAxis = _a.yAxis,
                chart = _a.chart;
            return chart.renderer.symbols.circle(xAxis.len - pos[1] - computedSize, yAxis.len - pos[0] - computedSize, computedSize * 2, computedSize * 2);
        }
        return highcharts_Point_commonjs_highcharts_Point_commonjs2_highcharts_Point_root_Highcharts_Point_default().prototype.haloPath.call(this, 
        // #6067
        computedSize);
    };
    return BubblePoint;
}(BubblePoint_ScatterPoint));
/* *
 *
 *  Class Prototype
 *
 * */
BubblePoint_extend(BubblePoint.prototype, {
    ttBelow: false
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Bubble_BubblePoint = (BubblePoint);

;// ./code/es5/es-modules/Series/Bubble/BubbleSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var BubbleSeries_extends = (undefined && undefined.__extends) || (function () {
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



var BubbleSeries_color = (highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default()).parse;

var BubbleSeries_composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed, BubbleSeries_noop = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).noop;

var BubbleSeries_Series = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, BubbleSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, BubbleSeries_columnProto = BubbleSeries_a.column.prototype, BubbleSeries_ScatterSeries = BubbleSeries_a.scatter;

var BubbleSeries_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, BubbleSeries_arrayMax = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMax, BubbleSeries_arrayMin = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).arrayMin, BubbleSeries_clamp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).clamp, BubbleSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, BubbleSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, BubbleSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, BubbleSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, BubbleSeries_pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * Add logic to pad each axis with the amount of pixels necessary to avoid the
 * bubbles to overflow.
 */
function onAxisFoundExtremes() {
    var _this = this;
    var axisLength = this.len,
        _a = this,
        coll = _a.coll,
        isXAxis = _a.isXAxis,
        min = _a.min,
        range = (this.max || 0) - (min || 0);
    var pxMin = 0,
        pxMax = axisLength,
        transA = axisLength / range,
        hasActiveSeries;
    if (coll !== 'xAxis' && coll !== 'yAxis') {
        return;
    }
    // Handle padding on the second pass, or on redraw
    this.series.forEach(function (series) {
        if (series.bubblePadding && series.reserveSpace()) {
            // Correction for #1673
            _this.allowZoomOutside = true;
            hasActiveSeries = true;
            var data = series.getColumn(isXAxis ? 'x' : 'y');
            if (isXAxis) {
                (series.onPoint || series).getRadii(0, 0, series);
                if (series.onPoint) {
                    series.radii = series.onPoint.radii;
                }
            }
            if (range > 0) {
                var i = data.length;
                while (i--) {
                    if (BubbleSeries_isNumber(data[i]) &&
                        _this.dataMin <= data[i] &&
                        data[i] <= _this.max) {
                        var radius = series.radii && series.radii[i] || 0;
                        pxMin = Math.min(((data[i] - min) * transA) - radius, pxMin);
                        pxMax = Math.max(((data[i] - min) * transA) + radius, pxMax);
                    }
                }
            }
        }
    });
    // Apply the padding to the min and max properties
    if (hasActiveSeries && range > 0 && !this.logarithmic) {
        pxMax -= axisLength;
        transA *= (axisLength +
            Math.max(0, pxMin) - // #8901
            Math.min(pxMax, axisLength)) / axisLength;
        [
            ['min', 'userMin', pxMin],
            ['max', 'userMax', pxMax]
        ].forEach(function (keys) {
            if (typeof BubbleSeries_pick(_this.options[keys[0]], _this[keys[1]]) === 'undefined') {
                _this[keys[0]] += keys[2] / transA;
            }
        });
    }
}
/**
 * If a user has defined categories, it is necessary to retroactively hide any
 * ticks added by the 'onAxisFoundExtremes' function above (#21672).
 *
 * Otherwise they can show up on the axis, alongside user-defined categories.
 */
function onAxisAfterRender() {
    var _a;
    var _b = this,
        ticks = _b.ticks,
        tickPositions = _b.tickPositions,
        _c = _b.dataMin,
        dataMin = _c === void 0 ? 0 : _c,
        _d = _b.dataMax,
        dataMax = _d === void 0 ? 0 : _d,
        categories = _b.categories,
        type = this.options.type;
    if (((categories === null || categories === void 0 ? void 0 : categories.length) || type === 'category') &&
        this.series.find(function (s) { return s.bubblePadding; })) {
        var tickCount = tickPositions.length;
        while (tickCount--) {
            var tick = ticks[tickPositions[tickCount]],
                pos = tick.pos || 0;
            if (pos > dataMax || pos < dataMin) {
                (_a = tick.label) === null || _a === void 0 ? void 0 : _a.hide();
            }
        }
    }
}
/* *
 *
 *  Class
 *
 * */
var BubbleSeries = /** @class */ (function (_super) {
    BubbleSeries_extends(BubbleSeries, _super);
    function BubbleSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    BubbleSeries.compose = function (AxisClass, ChartClass, LegendClass) {
        Bubble_BubbleLegendComposition.compose(ChartClass, LegendClass);
        if (BubbleSeries_pushUnique(BubbleSeries_composed, 'Series.Bubble')) {
            BubbleSeries_addEvent(AxisClass, 'foundExtremes', onAxisFoundExtremes);
            BubbleSeries_addEvent(AxisClass, 'afterRender', onAxisAfterRender);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Perform animation on the bubbles
     * @private
     */
    BubbleSeries.prototype.animate = function (init) {
        if (!init &&
            this.points.length < this.options.animationLimit // #8099
        ) {
            this.points.forEach(function (point) {
                var graphic = point.graphic,
                    _a = point.plotX,
                    plotX = _a === void 0 ? 0 : _a,
                    _b = point.plotY,
                    plotY = _b === void 0 ? 0 : _b;
                if (graphic && graphic.width) { // URL symbols don't have width
                    // Start values
                    if (!this.hasRendered) {
                        graphic.attr({
                            x: plotX,
                            y: plotY,
                            width: 1,
                            height: 1
                        });
                    }
                    graphic.animate(this.markerAttribs(point), this.options.animation);
                }
            }, this);
        }
    };
    /**
     * Get the radius for each point based on the minSize, maxSize and each
     * point's Z value. This must be done prior to Series.translate because
     * the axis needs to add padding in accordance with the point sizes.
     * @private
     */
    BubbleSeries.prototype.getRadii = function () {
        var zData = this.getColumn('z'), yData = this.getColumn('y'), radii = [];
        var len,
            i,
            value,
            zExtremes = this.chart.bubbleZExtremes;
        var _a = this.getPxExtremes(),
            minPxSize = _a.minPxSize,
            maxPxSize = _a.maxPxSize;
        // Get the collective Z extremes of all bubblish series. The chart-level
        // `bubbleZExtremes` are only computed once, and reset on `updatedData`
        // in any member series.
        if (!zExtremes) {
            var zMin_1 = Number.MAX_VALUE;
            var zMax_1 = -Number.MAX_VALUE;
            var valid_1;
            this.chart.series.forEach(function (otherSeries) {
                if (otherSeries.bubblePadding && otherSeries.reserveSpace()) {
                    var zExtremes_1 = (otherSeries.onPoint || otherSeries).getZExtremes();
                    if (zExtremes_1) {
                        // Changed '||' to 'pick' because min or max can be 0.
                        // #17280
                        zMin_1 = Math.min(BubbleSeries_pick(zMin_1, zExtremes_1.zMin), zExtremes_1.zMin);
                        zMax_1 = Math.max(BubbleSeries_pick(zMax_1, zExtremes_1.zMax), zExtremes_1.zMax);
                        valid_1 = true;
                    }
                }
            });
            if (valid_1) {
                zExtremes = { zMin: zMin_1, zMax: zMax_1 };
                this.chart.bubbleZExtremes = zExtremes;
            }
            else {
                zExtremes = { zMin: 0, zMax: 0 };
            }
        }
        // Set the shape type and arguments to be picked up in drawPoints
        for (i = 0, len = zData.length; i < len; i++) {
            value = zData[i];
            // Separate method to get individual radius for bubbleLegend
            radii.push(this.getRadius(zExtremes.zMin, zExtremes.zMax, minPxSize, maxPxSize, value, yData && yData[i]));
        }
        this.radii = radii;
    };
    /**
     * Get the individual radius for one point.
     * @private
     */
    BubbleSeries.prototype.getRadius = function (zMin, zMax, minSize, maxSize, value, yValue) {
        var options = this.options,
            sizeByArea = options.sizeBy !== 'width',
            zThreshold = options.zThreshold;
        var zRange = zMax - zMin,
            pos = 0.5;
        // #8608 - bubble should be visible when z is undefined
        if (yValue === null || value === null) {
            return null;
        }
        if (BubbleSeries_isNumber(value)) {
            // When sizing by threshold, the absolute value of z determines
            // the size of the bubble.
            if (options.sizeByAbsoluteValue) {
                value = Math.abs(value - zThreshold);
                zMax = zRange = Math.max(zMax - zThreshold, Math.abs(zMin - zThreshold));
                zMin = 0;
            }
            // Issue #4419 - if value is less than zMin, push a radius that's
            // always smaller than the minimum size
            if (value < zMin) {
                return minSize / 2 - 1;
            }
            // Relative size, a number between 0 and 1
            if (zRange > 0) {
                pos = (value - zMin) / zRange;
            }
        }
        if (sizeByArea && pos >= 0) {
            pos = Math.sqrt(pos);
        }
        return Math.ceil(minSize + pos * (maxSize - minSize)) / 2;
    };
    /**
     * Define hasData function for non-cartesian series.
     * Returns true if the series has points at all.
     * @private
     */
    BubbleSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * @private
     */
    BubbleSeries.prototype.markerAttribs = function (point, state) {
        var attr = _super.prototype.markerAttribs.call(this,
            point,
            state),
            _a = attr.height,
            height = _a === void 0 ? 0 : _a,
            _b = attr.width,
            width = _b === void 0 ? 0 : _b;
        // Bubble needs a specific `markerAttribs` override because the markers
        // are rendered into the potentially inverted `series.group`. Unlike
        // regular markers, which are rendered into the `markerGroup` (#21125).
        return this.chart.inverted ? BubbleSeries_extend(attr, {
            x: (point.plotX || 0) - width / 2,
            y: (point.plotY || 0) - height / 2
        }) : attr;
    };
    /**
     * @private
     */
    BubbleSeries.prototype.pointAttribs = function (point, state) {
        var markerOptions = this.options.marker,
            fillOpacity = markerOptions.fillOpacity,
            attr = BubbleSeries_Series.prototype.pointAttribs.call(this,
            point,
            state);
        if (fillOpacity !== 1) {
            attr.fill = BubbleSeries_color(attr.fill)
                .setOpacity(fillOpacity)
                .get('rgba');
        }
        return attr;
    };
    /**
     * Extend the base translate method to handle bubble size
     * @private
     */
    BubbleSeries.prototype.translate = function () {
        // Run the parent method
        _super.prototype.translate.call(this);
        this.getRadii();
        this.translateBubble();
    };
    BubbleSeries.prototype.translateBubble = function () {
        var _a = this,
            data = _a.data,
            options = _a.options,
            radii = _a.radii,
            minPxSize = this.getPxExtremes().minPxSize;
        // Set the shape type and arguments to be picked up in drawPoints
        var i = data.length;
        while (i--) {
            var point = data[i],
                radius = radii ? radii[i] : 0; // #1737
                // Negative points means negative z values (#9728)
                if (this.zoneAxis === 'z') {
                    point.negative = (point.z || 0) < (options.zThreshold || 0);
            }
            if (BubbleSeries_isNumber(radius) && radius >= minPxSize / 2) {
                // Shape arguments
                point.marker = BubbleSeries_extend(point.marker, {
                    radius: radius,
                    width: 2 * radius,
                    height: 2 * radius
                });
                // Alignment box for the data label
                point.dlBox = {
                    x: point.plotX - radius,
                    y: point.plotY - radius,
                    width: 2 * radius,
                    height: 2 * radius
                };
            }
            else { // Below zThreshold
                // #1691
                point.shapeArgs = point.plotY = point.dlBox = void 0;
                point.isInside = false; // #17281
            }
        }
    };
    BubbleSeries.prototype.getPxExtremes = function () {
        var smallestSize = Math.min(this.chart.plotWidth,
            this.chart.plotHeight);
        var getPxSize = function (length) {
                var isPercent;
            if (typeof length === 'string') {
                isPercent = /%$/.test(length);
                length = parseInt(length, 10);
            }
            return isPercent ? smallestSize * length / 100 : length;
        };
        var minPxSize = getPxSize(BubbleSeries_pick(this.options.minSize, 8));
        // Prioritize min size if conflict to make sure bubbles are
        // always visible. #5873
        var maxPxSize = Math.max(getPxSize(BubbleSeries_pick(this.options.maxSize, '20%')),
            minPxSize);
        return { minPxSize: minPxSize, maxPxSize: maxPxSize };
    };
    BubbleSeries.prototype.getZExtremes = function () {
        var options = this.options,
            zData = this.getColumn('z').filter(BubbleSeries_isNumber);
        if (zData.length) {
            var zMin = BubbleSeries_pick(options.zMin,
                BubbleSeries_clamp(BubbleSeries_arrayMin(zData),
                options.displayNegative === false ?
                    (options.zThreshold || 0) :
                    -Number.MAX_VALUE,
                Number.MAX_VALUE));
            var zMax = BubbleSeries_pick(options.zMax,
                BubbleSeries_arrayMax(zData));
            if (BubbleSeries_isNumber(zMin) && BubbleSeries_isNumber(zMax)) {
                return { zMin: zMin, zMax: zMax };
            }
        }
    };
    /**
     * @private
     * @function Highcharts.Series#searchKDTree
     */
    BubbleSeries.prototype.searchKDTree = function (point, compareX, e, suppliedPointEvaluator, suppliedBSideCheckEvaluator) {
        if (suppliedPointEvaluator === void 0) { suppliedPointEvaluator = BubbleSeries_noop; }
        if (suppliedBSideCheckEvaluator === void 0) { suppliedBSideCheckEvaluator = BubbleSeries_noop; }
        suppliedPointEvaluator = function (p1, p2, comparisonProp) {
            var _a,
                _b;
            var p1Dist = p1[comparisonProp] || 0;
            var p2Dist = p2[comparisonProp] || 0;
            var ret,
                flip = false;
            if (p1Dist < 0 && p2Dist < 0) {
                ret = (p1Dist - (((_a = p1.marker) === null || _a === void 0 ? void 0 : _a.radius) || 0) >=
                    p2Dist - (((_b = p2.marker) === null || _b === void 0 ? void 0 : _b.radius) || 0)) ?
                    p1 :
                    p2;
                flip = true;
            }
            else {
                ret = p1Dist < p2Dist ? p1 : p2;
            }
            return [ret, flip];
        };
        suppliedBSideCheckEvaluator = function (a, b, flip) { return !flip && (a > b) || (a < b); };
        return _super.prototype.searchKDTree.call(this, point, compareX, e, suppliedPointEvaluator, suppliedBSideCheckEvaluator);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * A bubble series is a three dimensional series type where each point
     * renders an X, Y and Z value. Each points is drawn as a bubble where the
     * position along the X and Y axes mark the X and Y values, and the size of
     * the bubble relates to the Z value.
     *
     * @sample {highcharts} highcharts/demo/bubble/
     *         Bubble chart
     *
     * @extends      plotOptions.scatter
     * @excluding    cluster
     * @product      highcharts highstock
     * @requires     highcharts-more
     * @optionparent plotOptions.bubble
     */
    BubbleSeries.defaultOptions = BubbleSeries_merge(BubbleSeries_ScatterSeries.defaultOptions, {
        dataLabels: {
            formatter: function () {
                var numberFormatter = this.series.chart.numberFormatter;
                var z = this.point.z;
                return BubbleSeries_isNumber(z) ? numberFormatter(z, -1) : '';
            },
            inside: true,
            verticalAlign: 'middle'
        },
        /**
         * If there are more points in the series than the `animationLimit`, the
         * animation won't run. Animation affects overall performance and
         * doesn't work well with heavy data series.
         *
         * @since 6.1.0
         */
        animationLimit: 250,
        /**
         * Whether to display negative sized bubbles. The threshold is given
         * by the [zThreshold](#plotOptions.bubble.zThreshold) option, and negative
         * bubbles can be visualized by setting
         * [negativeColor](#plotOptions.bubble.negativeColor).
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @type      {boolean}
         * @default   true
         * @since     3.0
         * @apioption plotOptions.bubble.displayNegative
         */
        /**
         * @extends   plotOptions.series.marker
         * @excluding enabled, enabledThreshold, height, radius, width
         */
        marker: {
            lineColor: null, // Inherit from series.color
            lineWidth: 1,
            /**
             * The fill opacity of the bubble markers.
             */
            fillOpacity: 0.5,
            /**
             * In bubble charts, the radius is overridden and determined based
             * on the point's data value.
             *
             * @ignore-option
             */
            radius: null,
            states: {
                hover: {
                    radiusPlus: 0
                }
            },
            /**
             * A predefined shape or symbol for the marker. Possible values are
             * "circle", "square", "diamond", "triangle" and "triangle-down".
             *
             * Additionally, the URL to a graphic can be given on the form
             * `url(graphic.png)`. Note that for the image to be applied to
             * exported charts, its URL needs to be accessible by the export
             * server.
             *
             * Custom callbacks for symbol path generation can also be added to
             * `Highcharts.SVGRenderer.prototype.symbols`. The callback is then
             * used by its method name, as shown in the demo.
             *
             * @sample {highcharts} highcharts/plotoptions/bubble-symbol/
             *         Bubble chart with various symbols
             * @sample {highcharts} highcharts/plotoptions/series-marker-symbol/
             *         General chart with predefined, graphic and custom markers
             *
             * @type  {Highcharts.SymbolKeyValue|string}
             * @since 5.0.11
             */
            symbol: 'circle'
        },
        /**
         * Minimum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-size/
         *         Bubble size
         *
         * @type    {number|string}
         * @since   3.0
         * @product highcharts highstock
         */
        minSize: 8,
        /**
         * Maximum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-size/
         *         Bubble size
         *
         * @type    {number|string}
         * @since   3.0
         * @product highcharts highstock
         */
        maxSize: '20%',
        /**
         * When a point's Z value is below the
         * [zThreshold](#plotOptions.bubble.zThreshold)
         * setting, this color is used.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @since     3.0
         * @product   highcharts
         * @apioption plotOptions.bubble.negativeColor
         */
        /**
         * Whether the bubble's value should be represented by the area or the
         * width of the bubble. The default, `area`, corresponds best to the
         * human perception of the size of each bubble.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-sizeby/
         *         Comparison of area and size
         *
         * @type       {Highcharts.BubbleSizeByValue}
         * @default    area
         * @since      3.0.7
         * @apioption  plotOptions.bubble.sizeBy
         */
        /**
         * When this is true, the absolute value of z determines the size of
         * the bubble. This means that with the default `zThreshold` of 0, a
         * bubble of value -1 will have the same size as a bubble of value 1,
         * while a bubble of value 0 will have a smaller size according to
         * `minSize`.
         *
         * @sample    {highcharts} highcharts/plotoptions/bubble-sizebyabsolutevalue/
         *            Size by absolute value, various thresholds
         *
         * @type      {boolean}
         * @default   false
         * @since     4.1.9
         * @product   highcharts
         * @apioption plotOptions.bubble.sizeByAbsoluteValue
         */
        /**
         * When this is true, the series will not cause the Y axis to cross
         * the zero plane (or [threshold](#plotOptions.series.threshold) option)
         * unless the data actually crosses the plane.
         *
         * For example, if `softThreshold` is `false`, a series of 0, 1, 2,
         * 3 will make the Y axis show negative values according to the
         * `minPadding` option. If `softThreshold` is `true`, the Y axis starts
         * at 0.
         *
         * @since   4.1.9
         * @product highcharts
         */
        softThreshold: false,
        states: {
            hover: {
                halo: {
                    size: 5
                }
            }
        },
        tooltip: {
            pointFormat: '({point.x}, {point.y}), Size: {point.z}'
        },
        turboThreshold: 0,
        /**
         * The minimum for the Z value range. Defaults to the highest Z value
         * in the data.
         *
         * @see [zMin](#plotOptions.bubble.zMin)
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     4.0.3
         * @product   highcharts
         * @apioption plotOptions.bubble.zMax
         */
        /**
         * @default   z
         * @apioption plotOptions.bubble.colorKey
         */
        /**
         * The minimum for the Z value range. Defaults to the lowest Z value
         * in the data.
         *
         * @see [zMax](#plotOptions.bubble.zMax)
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     4.0.3
         * @product   highcharts
         * @apioption plotOptions.bubble.zMin
         */
        /**
         * When [displayNegative](#plotOptions.bubble.displayNegative) is `false`,
         * bubbles with lower Z values are skipped. When `displayNegative`
         * is `true` and a [negativeColor](#plotOptions.bubble.negativeColor)
         * is given, points with lower Z is colored.
         *
         * @sample {highcharts} highcharts/plotoptions/bubble-negative/
         *         Negative bubbles
         *
         * @since   3.0
         * @product highcharts
         */
        zThreshold: 0,
        zoneAxis: 'z'
    });
    return BubbleSeries;
}(BubbleSeries_ScatterSeries));
BubbleSeries_extend(BubbleSeries.prototype, {
    alignDataLabel: BubbleSeries_columnProto.alignDataLabel,
    applyZones: BubbleSeries_noop,
    bubblePadding: true,
    isBubble: true,
    keysAffectYAxis: ['y'],
    pointArrayMap: ['y', 'z'],
    pointClass: Bubble_BubblePoint,
    parallelArrays: ['x', 'y', 'z'],
    trackerGroups: ['group', 'dataLabelsGroup'],
    specialGroup: 'group', // To allow clipping (#6296)
    zoneAxis: 'z'
});
// On updated data in any series, delete the chart-level Z extremes cache
BubbleSeries_addEvent(BubbleSeries, 'updatedData', function (e) {
    delete e.target.chart.bubbleZExtremes;
});
// After removing series, delete the chart-level Z extremes cache, #17502.
BubbleSeries_addEvent(BubbleSeries, 'remove', function (e) {
    delete e.target.chart.bubbleZExtremes;
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('bubble', BubbleSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Bubble_BubbleSeries = (BubbleSeries);
/* *
 *
 *  API Declarations
 *
 * */
/**
 * @typedef {"area"|"width"} Highcharts.BubbleSizeByValue
 */
''; // Detach doclets above
/* *
 *
 *  API Options
 *
 * */
/**
 * A `bubble` series. If the [type](#series.bubble.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.bubble
 * @excluding dataParser, dataURL, legendSymbolColor, stack
 * @product   highcharts highstock
 * @requires  highcharts-more
 * @apioption series.bubble
 */
/**
 * An array of data points for the series. For the `bubble` series type,
 * points can be given in the following ways:
 *
 * 1. An array of arrays with 3 or 2 values. In this case, the values correspond
 *    to `x,y,z`. If the first value is a string, it is applied as the name of
 *    the point, and the `x` value is inferred. The `x` value can also be
 *    omitted, in which case the inner arrays should be of length 2\. Then the
 *    `x` value is automatically calculated, either starting at 0 and
 *    incremented by 1, or from `pointStart` and `pointInterval` given in the
 *    series options.
 *    ```js
 *    data: [
 *        [0, 1, 2],
 *        [1, 5, 5],
 *        [2, 0, 2]
 *    ]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.bubble.turboThreshold), this option is not
 *    available.
 *    ```js
 *    data: [{
 *        x: 1,
 *        y: 1,
 *        z: 1,
 *        name: "Point2",
 *        color: "#00FF00"
 *    }, {
 *        x: 1,
 *        y: 5,
 *        z: 4,
 *        name: "Point1",
 *        color: "#FF00FF"
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
 * @type      {Array<Array<(number|string),number>|Array<(number|string),number,number>|*>}
 * @extends   series.line.data
 * @product   highcharts
 * @apioption series.bubble.data
 */
/**
 * @extends     series.line.data.marker
 * @excluding   enabledThreshold, height, radius, width
 * @product     highcharts
 * @apioption   series.bubble.data.marker
 */
/**
 * The size value for each bubble. The bubbles' diameters are computed
 * based on the `z`, and controlled by series options like `minSize`,
 * `maxSize`, `sizeBy`, `zMin` and `zMax`.
 *
 * @type      {number|null}
 * @product   highcharts
 * @apioption series.bubble.data.z
 */
/**
 * @excluding enabled, enabledThreshold, height, radius, width
 * @apioption series.bubble.marker
 */
''; // Adds doclets above to transpiled file

;// ./code/es5/es-modules/Series/MapBubble/MapBubblePoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapBubblePoint_extends = (undefined && undefined.__extends) || (function () {
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
/* *
 *
 *  Imports
 *
 * */


var mapPointProto = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.map.prototype.pointClass.prototype;

var MapBubblePoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/* *
 *
 *  Class
 *
 * */
var MapBubblePoint = /** @class */ (function (_super) {
    MapBubblePoint_extends(MapBubblePoint, _super);
    function MapBubblePoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    MapBubblePoint.prototype.isValid = function () {
        return typeof this.z === 'number';
    };
    return MapBubblePoint;
}(Bubble_BubblePoint));
MapBubblePoint_extend(MapBubblePoint.prototype, {
    applyOptions: mapPointProto.applyOptions,
    getProjectedBounds: mapPointProto.getProjectedBounds
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapBubble_MapBubblePoint = (MapBubblePoint);

;// ./code/es5/es-modules/Series/MapBubble/MapBubbleSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var MapBubbleSeries_extends = (undefined && undefined.__extends) || (function () {
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



var MapBubbleSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, mapProto = MapBubbleSeries_a.map.prototype, MapBubbleSeries_mapPointProto = MapBubbleSeries_a.mappoint.prototype;

var MapBubbleSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, MapBubbleSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.mapbubble
 *
 * @augments Highcharts.Series
 *
 * @requires BubbleSeries
 * @requires MapPointSeries
 */
var MapBubbleSeries = /** @class */ (function (_super) {
    MapBubbleSeries_extends(MapBubbleSeries, _super);
    function MapBubbleSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.clearBounds = mapProto.clearBounds;
        return _this;
    }
    MapBubbleSeries.prototype.searchPoint = function (e, compareX) {
        return this.searchKDTree({
            plotX: e.chartX - this.chart.plotLeft,
            plotY: e.chartY - this.chart.plotTop
        }, compareX, e);
    };
    MapBubbleSeries.prototype.translate = function () {
        MapBubbleSeries_mapPointProto.translate.call(this);
        this.getRadii();
        this.translateBubble();
    };
    /**
     * A map bubble series is a bubble series laid out on top of a map
     * series, where each bubble is tied to a specific map area.
     *
     * @sample maps/demo/map-bubble/
     *         Map bubble chart
     *
     * @extends      plotOptions.bubble
     * @product      highmaps
     * @optionparent plotOptions.mapbubble
     */
    MapBubbleSeries.defaultOptions = MapBubbleSeries_merge(Bubble_BubbleSeries.defaultOptions, {
        /**
         * The main color of the series. This color affects both the fill
         * and the stroke of the bubble. For enhanced control, use `marker`
         * options.
         *
         * @sample {highmaps} maps/plotoptions/mapbubble-color/
         *         Pink bubbles
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @apioption plotOptions.mapbubble.color
         */
        /**
         * Whether to display negative sized bubbles. The threshold is
         * given by the [zThreshold](#plotOptions.mapbubble.zThreshold)
         * option, and negative bubbles can be visualized by setting
         * [negativeColor](#plotOptions.bubble.negativeColor).
         *
         * @type      {boolean}
         * @default   true
         * @apioption plotOptions.mapbubble.displayNegative
         */
        /**
         * Color of the line connecting bubbles. The default value is the same
         * as series' color.
         *
         * In styled mode, the color can be defined by the
         * [colorIndex](#plotOptions.series.colorIndex) option. Also, the series
         * color can be set with the `.highcharts-series`,
         * `.highcharts-color-{n}`, `.highcharts-{type}-series` or
         * `.highcharts-series-{n}` class, or individual classes given by the
         * `className` option.
         *
         *
         * @sample {highmaps} maps/demo/spider-map/
         *         Spider map
         * @sample {highmaps} maps/plotoptions/spider-map-line-color/
         *         Different line color
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @apioption plotOptions.mapbubble.lineColor
         */
        /**
         * Pixel width of the line connecting bubbles.
         *
         * @sample {highmaps} maps/demo/spider-map/
         *         Spider map
         *
         * @product   highmaps
         * @apioption plotOptions.mapbubble.lineWidth
         */
        lineWidth: 0,
        /**
         * Maximum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highmaps} highcharts/plotoptions/bubble-size/
         *         Bubble size
         * @sample {highmaps} maps/demo/spider-map/
         *         Spider map
         *
         * @product   highmaps
         * @apioption plotOptions.mapbubble.maxSize
         */
        /**
         * Minimum bubble size. Bubbles will automatically size between the
         * `minSize` and `maxSize` to reflect the `z` value of each bubble.
         * Can be either pixels (when no unit is given), or a percentage of
         * the smallest one of the plot width and height.
         *
         * @sample {highmaps} maps/demo/map-bubble/
         *         Bubble size
         * @sample {highmaps} maps/demo/spider-map/
         *         Spider map
         *
         * @product   highmaps
         * @apioption plotOptions.mapbubble.minSize
         */
        /**
         * When a point's Z value is below the
         * [zThreshold](#plotOptions.mapbubble.zThreshold) setting, this
         * color is used.
         *
         * @sample {highmaps} maps/plotoptions/mapbubble-negativecolor/
         *         Negative color below a threshold
         *
         * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
         * @apioption plotOptions.mapbubble.negativeColor
         */
        /**
         * Whether the bubble's value should be represented by the area or
         * the width of the bubble. The default, `area`, corresponds best to
         * the human perception of the size of each bubble.
         *
         * @type       {Highcharts.BubbleSizeByValue}
         * @default    area
         * @apioption  plotOptions.mapbubble.sizeBy
         */
        /**
         * When this is true, the absolute value of z determines the size
         * of the bubble. This means that with the default `zThreshold` of
         * 0, a bubble of value -1 will have the same size as a bubble of
         * value 1, while a bubble of value 0 will have a smaller size
         * according to `minSize`.
         *
         * @sample {highmaps} highcharts/plotoptions/bubble-sizebyabsolutevalue/
         *         Size by absolute value, various thresholds
         *
         * @type      {boolean}
         * @default   false
         * @since     1.1.9
         * @apioption plotOptions.mapbubble.sizeByAbsoluteValue
         */
        /**
         * The maximum for the Z value range. Defaults to the highest Z value in
         * the data.
         *
         * @see [zMin](#plotOptions.mapbubble.zMin)
         *
         * @sample {highmaps} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     1.0.3
         * @apioption plotOptions.mapbubble.zMax
         */
        /**
         * The minimum for the Z value range. Defaults to the lowest Z value
         * in the data.
         *
         * @see [zMax](#plotOptions.mapbubble.zMax)
         *
         * @sample {highmaps} highcharts/plotoptions/bubble-zmin-zmax/
         *         Z has a possible range of 0-100
         *
         * @type      {number}
         * @since     1.0.3
         * @apioption plotOptions.mapbubble.zMin
         */
        /**
         * When [displayNegative](#plotOptions.mapbubble.displayNegative)
         * is `false`, bubbles with lower Z values are skipped. When
         * `displayNegative` is `true` and a
         * [negativeColor](#plotOptions.mapbubble.negativeColor) is given,
         * points with lower Z is colored.
         *
         * @sample {highmaps} maps/plotoptions/mapbubble-negativecolor/
         *         Negative color below a threshold
         *
         * @type      {number}
         * @default   0
         * @apioption plotOptions.mapbubble.zThreshold
         */
        /**
         * @default 500
         */
        animationLimit: 500,
        /**
         * @type {string|Array<string>}
         */
        joinBy: 'hc-key',
        tooltip: {
            pointFormat: '{point.name}: {point.z}'
        }
    });
    return MapBubbleSeries;
}(Bubble_BubbleSeries));
MapBubbleSeries_extend(MapBubbleSeries.prototype, {
    type: 'mapbubble',
    axisTypes: ['colorAxis'],
    getProjectedBounds: mapProto.getProjectedBounds,
    isCartesian: false,
    // If one single value is passed, it is interpreted as z
    pointArrayMap: ['z'],
    pointClass: MapBubble_MapBubblePoint,
    processData: mapProto.processData,
    projectPoint: MapBubbleSeries_mapPointProto.projectPoint,
    kdAxisArray: ['plotX', 'plotY'],
    setData: mapProto.setData,
    setOptions: mapProto.setOptions,
    updateData: mapProto.updateData,
    useMapGeometry: true,
    xyFromShape: true
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('mapbubble', MapBubbleSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var MapBubble_MapBubbleSeries = (MapBubbleSeries);
/* *
 *
 *  API Options
 *
 * */
/**
 * A `mapbubble` series. If the [type](#series.mapbubble.type) option
 * is not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.mapbubble
 * @excluding dataParser, dataURL
 * @product   highmaps
 * @apioption series.mapbubble
 */
/**
 * An array of data points for the series. For the `mapbubble` series
 * type, points can be given in the following ways:
 *
 * 1. An array of numerical values. In this case, the numerical values
 *    will be interpreted as `z` options. Example:
 *
 *    ```js
 *    data: [0, 5, 3, 5]
 *    ```
 *
 * 2. An array of objects with named values. The following snippet shows only a
 *    few settings, see the complete options set below. If the total number of
 *    data points exceeds the series'
 *    [turboThreshold](#series.mapbubble.turboThreshold),
 *    this option is not available.
 *
 *    ```js
 *        data: [{
 *            z: 9,
 *            name: "Point2",
 *            color: "#00FF00"
 *        }, {
 *            z: 10,
 *            name: "Point1",
 *            color: "#FF00FF"
 *        }]
 *    ```
 *
 * @type      {Array<number|null|*>}
 * @extends   series.mappoint.data
 * @excluding labelrank, middleX, middleY, path, value, x, y, lat, lon
 * @product   highmaps
 * @apioption series.mapbubble.data
 */
/**
 * While the `x` and `y` values of the bubble are determined by the
 * underlying map, the `z` indicates the actual value that gives the
 * size of the bubble.
 *
 * @sample {highmaps} maps/demo/map-bubble/
 *         Bubble
 *
 * @type      {number|null}
 * @product   highmaps
 * @apioption series.mapbubble.data.z
 */
/**
 * @excluding enabled, enabledThreshold, height, radius, width
 * @sample {highmaps} maps/plotoptions/mapbubble-symbol
 *         Map bubble with mapmarker symbol
 * @apioption series.mapbubble.marker
 */
''; // Adds doclets above to transpiled file

;// ./code/es5/es-modules/Series/Heatmap/HeatmapPoint.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var HeatmapPoint_extends = (undefined && undefined.__extends) || (function () {
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

var HeatmapPoint_ScatterPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.scatter.prototype.pointClass;

var HeatmapPoint_clamp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).clamp, HeatmapPoint_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, HeatmapPoint_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, HeatmapPoint_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Class
 *
 * */
var HeatmapPoint = /** @class */ (function (_super) {
    HeatmapPoint_extends(HeatmapPoint, _super);
    function HeatmapPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /** @private */
    HeatmapPoint.prototype.applyOptions = function (options, x) {
        // #17970, if point is null remove its color, because it may be updated
        if (this.isNull || this.value === null) {
            delete this.color;
        }
        _super.prototype.applyOptions.call(this, options, x);
        this.formatPrefix = this.isNull || this.value === null ?
            'null' : 'point';
        return this;
    };
    /** @private */
    HeatmapPoint.prototype.getCellAttributes = function () {
        var point = this, series = point.series, seriesOptions = series.options, xPad = (seriesOptions.colsize || 1) / 2, yPad = (seriesOptions.rowsize || 1) / 2, xAxis = series.xAxis, yAxis = series.yAxis, markerOptions = point.options.marker || series.options.marker, pointPlacement = series.pointPlacementToXValue(), // #7860
            pointPadding = HeatmapPoint_pick(point.pointPadding, seriesOptions.pointPadding, 0), cellAttr = {
                x1: HeatmapPoint_clamp(Math.round(xAxis.len -
                    xAxis.translate(point.x - xPad, false, true, false, true, -pointPlacement)), -xAxis.len, 2 * xAxis.len),
                x2: HeatmapPoint_clamp(Math.round(xAxis.len -
                    xAxis.translate(point.x + xPad, false, true, false, true, -pointPlacement)), -xAxis.len, 2 * xAxis.len),
                y1: HeatmapPoint_clamp(Math.round(yAxis.translate(point.y - yPad, false, true, false, true)), -yAxis.len, 2 * yAxis.len),
                y2: HeatmapPoint_clamp(Math.round(yAxis.translate(point.y + yPad, false, true, false, true)), -yAxis.len, 2 * yAxis.len)
            };
        var dimensions = [['width', 'x'], ['height', 'y']];
        // Handle marker's fixed width, and height values including border
        // and pointPadding while calculating cell attributes.
        for (var _i = 0, dimensions_1 = dimensions; _i < dimensions_1.length; _i++) {
            var dimension = dimensions_1[_i];
            var prop = dimension[0],
                direction = dimension[1];
            var start = direction + '1', end = direction + '2';
            var side = Math.abs(cellAttr[start] - cellAttr[end]),
                borderWidth = markerOptions &&
                    markerOptions.lineWidth || 0,
                plotPos = Math.abs(cellAttr[start] + cellAttr[end]) / 2,
                widthOrHeight = markerOptions && markerOptions[prop];
            if (HeatmapPoint_defined(widthOrHeight) && widthOrHeight < side) {
                var halfCellSize = widthOrHeight / 2 + borderWidth / 2;
                cellAttr[start] = plotPos - halfCellSize;
                cellAttr[end] = plotPos + halfCellSize;
            }
            // Handle pointPadding
            if (pointPadding) {
                if ((direction === 'x' && xAxis.reversed) ||
                    (direction === 'y' && !yAxis.reversed)) {
                    start = end;
                    end = direction + '1';
                }
                cellAttr[start] += pointPadding;
                cellAttr[end] -= pointPadding;
            }
        }
        return cellAttr;
    };
    /**
     * @private
     */
    HeatmapPoint.prototype.haloPath = function (size) {
        if (!size) {
            return [];
        }
        var _a = this.shapeArgs || {},
            _b = _a.x,
            x = _b === void 0 ? 0 : _b,
            _c = _a.y,
            y = _c === void 0 ? 0 : _c,
            _d = _a.width,
            width = _d === void 0 ? 0 : _d,
            _e = _a.height,
            height = _e === void 0 ? 0 : _e;
        return [
            ['M', x - size, y - size],
            ['L', x - size, y + height + size],
            ['L', x + width + size, y + height + size],
            ['L', x + width + size, y - size],
            ['Z']
        ];
    };
    /**
     * Color points have a value option that determines whether or not it is
     * a null point
     * @private
     */
    HeatmapPoint.prototype.isValid = function () {
        // Undefined is allowed
        return (this.value !== Infinity &&
            this.value !== -Infinity);
    };
    return HeatmapPoint;
}(HeatmapPoint_ScatterPoint));
HeatmapPoint_extend(HeatmapPoint.prototype, {
    dataLabelOnNull: true,
    moveToTopOnHover: true,
    ttBelow: false
});
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Heatmap_HeatmapPoint = (HeatmapPoint);

;// ./code/es5/es-modules/Series/Heatmap/HeatmapSeriesDefaults.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */


var HeatmapSeriesDefaults_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber;
/* *
 *
 *  API Options
 *
 * */
/**
 * A heatmap is a graphical representation of data where the individual
 * values contained in a matrix are represented as colors.
 *
 * @productdesc {highcharts}
 * Requires `modules/heatmap`.
 *
 * @sample highcharts/demo/heatmap/
 *         Simple heatmap
 * @sample highcharts/demo/heatmap-canvas/
 *         Heavy heatmap
 *
 * @extends      plotOptions.scatter
 * @excluding    animationLimit, cluster, connectEnds, connectNulls,
 *               cropThreshold, dashStyle, dragDrop, findNearestPointBy,
 *               getExtremesFromAll, jitter, legendSymbolColor, linecap,
 *               lineWidth, pointInterval, pointIntervalUnit, pointRange,
 *               pointStart, shadow, softThreshold, stacking, step, threshold
 * @product      highcharts highmaps
 * @optionparent plotOptions.heatmap
 */
var HeatmapSeriesDefaults = {
    /**
     * Animation is disabled by default on the heatmap series.
     */
    animation: false,
    /**
     * The border radius for each heatmap item. The border's color and
     * width can be set in marker options.
     *
     * @see [lineColor](#plotOptions.heatmap.marker.lineColor)
     * @see [lineWidth](#plotOptions.heatmap.marker.lineWidth)
     */
    borderRadius: 0,
    /**
     * The border width for each heatmap item.
     */
    borderWidth: 0,
    /**
     * Padding between the points in the heatmap.
     *
     * @type      {number}
     * @default   0
     * @since     6.0
     * @apioption plotOptions.heatmap.pointPadding
     */
    /**
     * @default   value
     * @apioption plotOptions.heatmap.colorKey
     */
    /**
     * The main color of the series. In heat maps this color is rarely used,
     * as we mostly use the color to denote the value of each point. Unless
     * options are set in the [colorAxis](#colorAxis), the default value
     * is pulled from the [options.colors](#colors) array.
     *
     * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     * @since     4.0
     * @product   highcharts
     * @apioption plotOptions.heatmap.color
     */
    /**
     * The column size - how many X axis units each column in the heatmap
     * should span.
     *
     * @sample {highcharts} maps/demo/heatmap/
     *         One day
     * @sample {highmaps} maps/demo/heatmap/
     *         One day
     *
     * @type      {number}
     * @default   1
     * @since     4.0
     * @product   highcharts highmaps
     * @apioption plotOptions.heatmap.colsize
     */
    /**
     * The row size - how many Y axis units each heatmap row should span.
     *
     * @sample {highcharts} maps/demo/heatmap/
     *         1 by default
     * @sample {highmaps} maps/demo/heatmap/
     *         1 by default
     *
     * @type      {number}
     * @default   1
     * @since     4.0
     * @product   highcharts highmaps
     * @apioption plotOptions.heatmap.rowsize
     */
    /**
     * Make the heatmap render its data points as an interpolated image.
     *
     * @sample highcharts/demo/heatmap-interpolation
     *   Interpolated heatmap image displaying user activity on a website
     * @sample highcharts/series-heatmap/interpolation
     *   Interpolated heatmap toggle
     *
     */
    interpolation: false,
    /**
     * The color applied to null points. In styled mode, a general CSS class
     * is applied instead.
     *
     * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
     */
    nullColor: "#f7f7f7" /* Palette.neutralColor3 */,
    dataLabels: {
        formatter: function () {
            var numberFormatter = this.series.chart.numberFormatter;
            var value = this.point.value;
            return HeatmapSeriesDefaults_isNumber(value) ? numberFormatter(value, -1) : '';
        },
        inside: true,
        verticalAlign: 'middle',
        crop: false,
        /**
         * @ignore-option
         */
        overflow: 'allow',
        padding: 0 // #3837
    },
    /**
     * @excluding radius, enabledThreshold
     * @since     8.1
     */
    marker: {
        /**
         * A predefined shape or symbol for the marker. When undefined, the
         * symbol is pulled from options.symbols. Other possible values are
         * `'circle'`, `'square'`,`'diamond'`, `'triangle'`,
         * `'triangle-down'`, `'rect'`, and `'ellipse'`.
         *
         * Additionally, the URL to a graphic can be given on this form:
         * `'url(graphic.png)'`. Note that for the image to be applied to
         * exported charts, its URL needs to be accessible by the export
         * server.
         *
         * Custom callbacks for symbol path generation can also be added to
         * `Highcharts.SVGRenderer.prototype.symbols`. The callback is then
         * used by its method name, as shown in the demo.
         *
         * @sample {highcharts} highcharts/plotoptions/series-marker-symbol/
         *         Predefined, graphic and custom markers
         * @sample {highstock} highcharts/plotoptions/series-marker-symbol/
         *         Predefined, graphic and custom markers
         */
        symbol: 'rect',
        /** @ignore-option */
        radius: 0,
        lineColor: void 0,
        states: {
            /**
             * @excluding radius, radiusPlus
             */
            hover: {
                /**
                 * Set the marker's fixed width on hover state.
                 *
                 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
                 *         70px fixed marker's width and height on hover
                 *
                 * @type      {number|undefined}
                 * @default   undefined
                 * @product   highcharts highmaps
                 * @apioption plotOptions.heatmap.marker.states.hover.width
                 */
                /**
                 * Set the marker's fixed height on hover state.
                 *
                 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
                 *         70px fixed marker's width and height on hover
                 *
                 * @type      {number|undefined}
                 * @default   undefined
                 * @product   highcharts highmaps
                 * @apioption plotOptions.heatmap.marker.states.hover.height
                 */
                /**
                 * The number of pixels to increase the width of the
                 * selected point.
                 *
                 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
                 *         20px greater width and height on hover
                 *
                 * @type      {number|undefined}
                 * @default   undefined
                 * @product   highcharts highmaps
                 * @apioption plotOptions.heatmap.marker.states.hover.widthPlus
                 */
                /**
                 * The number of pixels to increase the height of the
                 * selected point.
                 *
                 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
                *          20px greater width and height on hover
                    *
                    * @type      {number|undefined}
                    * @default   undefined
                    * @product   highcharts highmaps
                    * @apioption plotOptions.heatmap.marker.states.hover.heightPlus
                    */
                /**
                 * The additional line width for a hovered point.
                 *
                 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-linewidthplus
                 *         5 pixels wider lineWidth on hover
                 * @sample {highmaps} maps/plotoptions/heatmap-marker-states-hover-linewidthplus
                 *         5 pixels wider lineWidth on hover
                 */
                lineWidthPlus: 0
            },
            /**
             * @excluding radius
             */
            select: {
            /**
             * Set the marker's fixed width on select state.
             *
             * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
             *         70px fixed marker's width and height on hover
             *
             * @type      {number|undefined}
             * @default   undefined
             * @product   highcharts highmaps
             * @apioption plotOptions.heatmap.marker.states.select.width
             */
            /**
             * Set the marker's fixed height on select state.
             *
             * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
             *         70px fixed marker's width and height on hover
             *
             * @type      {number|undefined}
             * @default   undefined
             * @product   highcharts highmaps
             * @apioption plotOptions.heatmap.marker.states.select.height
             */
            /**
             * The number of pixels to increase the width of the
             * selected point.
             *
             * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
             *         20px greater width and height on hover
             *
             * @type      {number|undefined}
             * @default   undefined
             * @product   highcharts highmaps
             * @apioption plotOptions.heatmap.marker.states.select.widthPlus
             */
            /**
             * The number of pixels to increase the height of the
             * selected point.
             *
             * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
             *         20px greater width and height on hover
             *
             * @type      {number|undefined}
             * @default   undefined
             * @product   highcharts highmaps
             * @apioption plotOptions.heatmap.marker.states.select.heightPlus
             */
            }
        }
    },
    clip: true,
    /** @ignore-option */
    pointRange: null, // Dynamically set to colsize by default
    tooltip: {
        pointFormat: '{point.x}, {point.y}: {point.value}<br/>'
    },
    states: {
        hover: {
            /** @ignore-option */
            halo: false, // #3406, halo is disabled on heatmaps by default
            /**
             * How much to brighten the point on interaction. Requires the
             * main color to be defined in hex or rgb(a) format.
             *
             * In styled mode, the hover brightening is by default replaced
             * with a fill-opacity set in the `.highcharts-point:hover`
             * rule.
             */
            brightness: 0.2
        }
    },
    legendSymbol: 'rectangle'
};
/**
 * A `heatmap` series. If the [type](#series.heatmap.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @productdesc {highcharts}
 * Requires `modules/heatmap`.
 *
 * @extends   series,plotOptions.heatmap
 * @excluding cropThreshold, dataParser, dataURL, dragDrop ,pointRange, stack,
 * @product   highcharts highmaps
 * @apioption series.heatmap
 */
/**
 * An array of data points for the series. For the `heatmap` series
 * type, points can be given in the following ways:
 *
 * 1.  An array of arrays with 3 or 2 values. In this case, the values
 * correspond to `x,y,value`. If the first value is a string, it is
 * applied as the name of the point, and the `x` value is inferred.
 * The `x` value can also be omitted, in which case the inner arrays
 * should be of length 2\. Then the `x` value is automatically calculated,
 * either starting at 0 and incremented by 1, or from `pointStart`
 * and `pointInterval` given in the series options.
 *
 *  ```js
 *     data: [
 *         [0, 9, 7],
 *         [1, 10, 4],
 *         [2, 6, 3]
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
 *         x: 1,
 *         y: 3,
 *         value: 10,
 *         name: "Point2",
 *         color: "#00FF00"
 *     }, {
 *         x: 1,
 *         y: 7,
 *         value: 10,
 *         name: "Point1",
 *         color: "#FF00FF"
 *     }]
 *  ```
 *
 * @sample {highcharts} highcharts/chart/reflow-true/
 *         Numerical values
 * @sample {highcharts} highcharts/series/data-array-of-arrays/
 *         Arrays of numeric x and y
 * @sample {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *         Arrays of datetime x and y
 * @sample {highcharts} highcharts/series/data-array-of-name-value/
 *         Arrays of point.name and y
 * @sample {highcharts} highcharts/series/data-array-of-objects/
 *         Config objects
 *
 * @type      {Array<Array<number>|*>}
 * @extends   series.line.data
 * @product   highcharts highmaps
 * @apioption series.heatmap.data
 */
/**
 * The color of the point. In heat maps the point color is rarely set
 * explicitly, as we use the color to denote the `value`. Options for
 * this are set in the [colorAxis](#colorAxis) configuration.
 *
 * @type      {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject}
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.color
 */
/**
 * The value of the point, resulting in a color controlled by options
 * as set in the [colorAxis](#colorAxis) configuration.
 *
 * @type      {number}
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.value
 */
/**
 * The x value of the point. For datetime axes,
 * the X value is the timestamp in milliseconds since 1970.
 *
 * @type      {number}
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.x
 */
/**
 * The y value of the point.
 *
 * @type      {number}
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.y
 */
/**
 * Point padding for a single point.
 *
 * @sample maps/plotoptions/tilemap-pointpadding
 *         Point padding on tiles
 *
 * @type      {number}
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.pointPadding
 */
/**
 * @excluding radius, enabledThreshold
 * @product   highcharts highmaps
 * @since     8.1
 * @apioption series.heatmap.data.marker
 */
/**
 * @excluding radius, enabledThreshold
 * @product   highcharts highmaps
 * @since     8.1
 * @apioption series.heatmap.marker
 */
/**
 * @excluding radius, radiusPlus
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.hover
 */
/**
 * @excluding radius
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.select
 */
/**
 * @excluding radius, radiusPlus
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.marker.states.hover
 */
/**
 * @excluding radius
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.marker.states.select
 */
/**
* Set the marker's fixed width on hover state.
*
* @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-linewidthplus
*         5 pixels wider lineWidth on hover
*
* @type      {number|undefined}
* @default   0
* @product   highcharts highmaps
* @apioption series.heatmap.marker.states.hover.lineWidthPlus
*/
/**
* Set the marker's fixed width on hover state.
*
* @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
*         70px fixed marker's width and height on hover
*
* @type      {number|undefined}
* @default   undefined
* @product   highcharts highmaps
* @apioption series.heatmap.marker.states.hover.width
*/
/**
 * Set the marker's fixed height on hover state.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
 *         70px fixed marker's width and height on hover
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.hover.height
 */
/**
* The number of pixels to increase the width of the
* hovered point.
*
* @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
*         One day
*
* @type      {number|undefined}
* @default   undefined
* @product   highcharts highmaps
* @apioption series.heatmap.marker.states.hover.widthPlus
*/
/**
 * The number of pixels to increase the height of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.hover.heightPlus
 */
/**
 * The number of pixels to increase the width of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.select.widthPlus
 */
/**
 * The number of pixels to increase the height of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.marker.states.select.heightPlus
 */
/**
* Set the marker's fixed width on hover state.
*
* @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-linewidthplus
*         5 pixels wider lineWidth on hover
*
* @type      {number|undefined}
* @default   0
* @product   highcharts highmaps
* @apioption series.heatmap.data.marker.states.hover.lineWidthPlus
*/
/**
 * Set the marker's fixed width on hover state.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
 *         70px fixed marker's width and height on hover
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.marker.states.hover.width
 */
/**
 * Set the marker's fixed height on hover state.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
 *         70px fixed marker's width and height on hover
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.marker.states.hover.height
 */
/**
 * The number of pixels to increase the width of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highstock
 * @apioption series.heatmap.data.marker.states.hover.widthPlus
 */
/**
 * The number of pixels to increase the height of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highstock
 * @apioption series.heatmap.data.marker.states.hover.heightPlus
 */
/**
* Set the marker's fixed width on select state.
*
* @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
*         70px fixed marker's width and height on hover
*
* @type      {number|undefined}
* @default   undefined
* @product   highcharts highmaps
* @apioption series.heatmap.data.marker.states.select.width
*/
/**
 * Set the marker's fixed height on select state.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-width
 *         70px fixed marker's width and height on hover
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highmaps
 * @apioption series.heatmap.data.marker.states.select.height
 */
/**
 * The number of pixels to increase the width of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highstock
 * @apioption series.heatmap.data.marker.states.select.widthPlus
 */
/**
 * The number of pixels to increase the height of the
 * hovered point.
 *
 * @sample {highcharts} maps/plotoptions/heatmap-marker-states-hover-widthplus
 *         One day
 *
 * @type      {number|undefined}
 * @default   undefined
 * @product   highcharts highstock
 * @apioption series.heatmap.data.marker.states.select.heightPlus
 */
''; // Keeps doclets above separate
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Heatmap_HeatmapSeriesDefaults = (HeatmapSeriesDefaults);

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

var InterpolationUtilities_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, InterpolationUtilities_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
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
                .map(function (s) { return InterpolationUtilities_pick(parseFloat(s), parseInt(s, 10)); }));
        rgba[3] = InterpolationUtilities_pick(rgba[3], 1.0) * 255;
        if (!InterpolationUtilities_defined(value) || !point.visible) {
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

;// ./code/es5/es-modules/Series/Heatmap/HeatmapSeries.js
/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var HeatmapSeries_extends = (undefined && undefined.__extends) || (function () {
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
var HeatmapSeries_assign = (undefined && undefined.__assign) || function () {
    HeatmapSeries_assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return HeatmapSeries_assign.apply(this, arguments);
};





var HeatmapSeries_Series = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).series, HeatmapSeries_a = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes, HeatmapSeries_ColumnSeries = HeatmapSeries_a.column, HeatmapSeries_ScatterSeries = HeatmapSeries_a.scatter;

var HeatmapSeries_symbols = (highcharts_SVGRenderer_commonjs_highcharts_SVGRenderer_commonjs2_highcharts_SVGRenderer_root_Highcharts_SVGRenderer_default()).prototype.symbols;

var HeatmapSeries_addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, HeatmapSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, HeatmapSeries_fireEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).fireEvent, HeatmapSeries_isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, HeatmapSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, HeatmapSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;

var HeatmapSeries_colorFromPoint = Series_InterpolationUtilities.colorFromPoint, HeatmapSeries_getContext = Series_InterpolationUtilities.getContext;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.heatmap
 *
 * @augments Highcharts.Series
 */
var HeatmapSeries = /** @class */ (function (_super) {
    HeatmapSeries_extends(HeatmapSeries, _super);
    function HeatmapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.valueMax = NaN;
        _this.valueMin = NaN;
        _this.isDirtyCanvas = true;
        return _this;
        /* eslint-enable valid-jsdoc */
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    HeatmapSeries.prototype.drawPoints = function () {
        var series = this,
            seriesOptions = series.options,
            interpolation = seriesOptions.interpolation,
            seriesMarkerOptions = seriesOptions.marker || {};
        if (interpolation) {
            var image = series.image,
                chart = series.chart,
                xAxis = series.xAxis,
                yAxis = series.yAxis,
                _a = xAxis.reversed,
                xRev = _a === void 0 ? false : _a,
                width = xAxis.len,
                _b = yAxis.reversed,
                yRev = _b === void 0 ? false : _b,
                height = yAxis.len,
                dimensions = { width: width,
                height: height };
            if (!image || series.isDirtyData || series.isDirtyCanvas) {
                var ctx = HeatmapSeries_getContext(series),
                    canvas = series.canvas,
                    _c = series.options,
                    _d = _c.colsize,
                    colsize = _d === void 0 ? 1 : _d,
                    _e = _c.rowsize,
                    rowsize = _e === void 0 ? 1 : _e,
                    points = series.points,
                    length_1 = series.points.length,
                    pointsLen = length_1 - 1,
                    colorAxis = (chart.colorAxis && chart.colorAxis[0]);
                if (canvas && ctx && colorAxis) {
                    var _f = xAxis.getExtremes(), xMin_1 = _f.min, xMax = _f.max, _g = yAxis.getExtremes(), yMin_1 = _g.min, yMax = _g.max, xDelta = xMax - xMin_1, yDelta = yMax - yMin_1, imgMultiple = 8.0, lastX = Math.round(imgMultiple * ((xDelta / colsize) / imgMultiple)), lastY = Math.round(imgMultiple * ((yDelta / rowsize) / imgMultiple)), _h = [
                            [lastX, lastX / xDelta, xRev, 'ceil'],
                            [lastY, lastY / yDelta, !yRev, 'floor']
                        ].map(function (_a) {
                            var last = _a[0], scale = _a[1], rev = _a[2], rounding = _a[3];
                        return (rev ?
                            function (v) { return (Math[rounding](last -
                                (scale * (v)))); } :
                            function (v) { return (Math[rounding](scale * v)); });
                    }), transformX_1 = _h[0], transformY_1 = _h[1], canvasWidth_1 = canvas.width = lastX + 1, canvasHeight = canvas.height = lastY + 1, canvasArea = canvasWidth_1 * canvasHeight, pixelToPointScale = pointsLen / canvasArea, pixelData = new Uint8ClampedArray(canvasArea * 4), pointInPixels = function (x, y) { return (Math.ceil((canvasWidth_1 * transformY_1(y - yMin_1)) +
                        transformX_1(x - xMin_1)) * 4); };
                    series.buildKDTree();
                    for (var i = 0; i < canvasArea; i++) {
                        var point = points[Math.ceil(pixelToPointScale * i)],
                            x = point.x,
                            y = point.y;
                        pixelData.set(HeatmapSeries_colorFromPoint(point.value, point), pointInPixels(x, y));
                    }
                    ctx.putImageData(new ImageData(pixelData, canvasWidth_1), 0, 0);
                    if (image) {
                        image.attr(HeatmapSeries_assign(HeatmapSeries_assign({}, dimensions), { href: canvas.toDataURL('image/png', 1) }));
                    }
                    else {
                        series.directTouch = false;
                        series.image = chart.renderer.image(canvas.toDataURL('image/png', 1))
                            .attr(dimensions)
                            .add(series.group);
                    }
                }
                series.isDirtyCanvas = false;
            }
            else if (image.width !== width || image.height !== height) {
                image.attr(dimensions);
            }
        }
        else if (seriesMarkerOptions.enabled || series._hasPointMarkers) {
            HeatmapSeries_Series.prototype.drawPoints.call(series);
            series.points.forEach(function (point) {
                if (point.graphic) {
                    // In styled mode, use CSS, otherwise the fill used in
                    // the style sheet will take precedence over
                    // the fill attribute.
                    point.graphic[series.chart.styledMode ? 'css' : 'animate'](series.colorAttribs(point));
                    if (point.value === null) { // #15708
                        point.graphic.addClass('highcharts-null-point');
                    }
                }
            });
        }
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.getExtremes = function () {
        // Get the extremes from the value data
        var _a = HeatmapSeries_Series.prototype.getExtremes
                .call(this,
            this.getColumn('value')),
            dataMin = _a.dataMin,
            dataMax = _a.dataMax;
        if (HeatmapSeries_isNumber(dataMin)) {
            this.valueMin = dataMin;
        }
        if (HeatmapSeries_isNumber(dataMax)) {
            this.valueMax = dataMax;
        }
        // Get the extremes from the y data
        return HeatmapSeries_Series.prototype.getExtremes.call(this);
    };
    /**
     * Override to also allow null points, used when building the k-d-tree for
     * tooltips in boost mode.
     * @private
     */
    HeatmapSeries.prototype.getValidPoints = function (points, insideOnly) {
        return HeatmapSeries_Series.prototype.getValidPoints.call(this, points, insideOnly, true);
    };
    /**
     * Define hasData function for non-cartesian series. Returns true if the
     * series has points at all.
     * @private
     */
    HeatmapSeries.prototype.hasData = function () {
        return !!this.dataTable.rowCount;
    };
    /**
     * Override the init method to add point ranges on both axes.
     * @private
     */
    HeatmapSeries.prototype.init = function () {
        _super.prototype.init.apply(this, arguments);
        var options = this.options;
        // #3758, prevent resetting in setData
        options.pointRange = HeatmapSeries_pick(options.pointRange, options.colsize || 1);
        // General point range
        this.yAxis.axisPointRange = options.rowsize || 1;
        // Bind new symbol names
        HeatmapSeries_symbols.ellipse = HeatmapSeries_symbols.circle;
        // @todo
        //
        // Setting the border radius here is a workaround. It should be set in
        // the shapeArgs or returned from `markerAttribs`. However,
        // Series.drawPoints does not pick up markerAttribs to be passed over to
        // `renderer.symbol`. Also, image symbols are not positioned by their
        // top left corner like other symbols are. This should be refactored,
        // then we could save ourselves some tests for .hasImage etc. And the
        // evaluation of borderRadius would be moved to `markerAttribs`.
        if (options.marker && HeatmapSeries_isNumber(options.borderRadius)) {
            options.marker.r = options.borderRadius;
        }
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.markerAttribs = function (point, state) {
        var shapeArgs = point.shapeArgs || {};
        if (point.hasImage) {
            return {
                x: point.plotX,
                y: point.plotY
            };
        }
        // Setting width and height attributes on image does not affect on its
        // dimensions.
        if (state && state !== 'normal') {
            var pointMarkerOptions = point.options.marker || {},
                seriesMarkerOptions = this.options.marker || {},
                seriesStateOptions = (seriesMarkerOptions.states &&
                    seriesMarkerOptions.states[state]) || {},
                pointStateOptions = (pointMarkerOptions.states &&
                    pointMarkerOptions.states[state]) || {};
            // Set new width and height basing on state options.
            var width = (pointStateOptions.width ||
                    seriesStateOptions.width ||
                    shapeArgs.width ||
                    0) + (pointStateOptions.widthPlus ||
                    seriesStateOptions.widthPlus ||
                    0);
            var height = (pointStateOptions.height ||
                    seriesStateOptions.height ||
                    shapeArgs.height ||
                    0) + (pointStateOptions.heightPlus ||
                    seriesStateOptions.heightPlus ||
                    0);
            // Align marker by the new size.
            var x = (shapeArgs.x || 0) + ((shapeArgs.width || 0) - width) / 2, y = (shapeArgs.y || 0) + ((shapeArgs.height || 0) - height) / 2;
            return { x: x, y: y, width: width, height: height };
        }
        return shapeArgs;
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.pointAttribs = function (point, state) {
        var series = this,
            attr = HeatmapSeries_Series.prototype.pointAttribs.call(series,
            point,
            state),
            seriesOptions = series.options || {},
            plotOptions = series.chart.options.plotOptions || {},
            seriesPlotOptions = plotOptions.series || {},
            heatmapPlotOptions = plotOptions.heatmap || {}, 
            // Get old properties in order to keep backward compatibility
            borderColor = (point && point.options.borderColor) ||
                seriesOptions.borderColor ||
                heatmapPlotOptions.borderColor ||
                seriesPlotOptions.borderColor,
            borderWidth = (point && point.options.borderWidth) ||
                seriesOptions.borderWidth ||
                heatmapPlotOptions.borderWidth ||
                seriesPlotOptions.borderWidth ||
                attr['stroke-width'];
        // Apply lineColor, or set it to default series color.
        attr.stroke = ((point && point.marker && point.marker.lineColor) ||
            (seriesOptions.marker && seriesOptions.marker.lineColor) ||
            borderColor ||
            this.color);
        // Apply old borderWidth property if exists.
        attr['stroke-width'] = borderWidth;
        if (state && state !== 'normal') {
            var stateOptions = HeatmapSeries_merge((seriesOptions.states &&
                    seriesOptions.states[state]), (seriesOptions.marker &&
                    seriesOptions.marker.states &&
                    seriesOptions.marker.states[state]), (point &&
                    point.options.states &&
                    point.options.states[state] || {}));
            attr.fill =
                stateOptions.color ||
                    highcharts_Color_commonjs_highcharts_Color_commonjs2_highcharts_Color_root_Highcharts_Color_default().parse(attr.fill).brighten(stateOptions.brightness || 0).get();
            attr.stroke = (stateOptions.lineColor || attr.stroke); // #17896
        }
        return attr;
    };
    /**
     * @private
     */
    HeatmapSeries.prototype.translate = function () {
        var series = this, options = series.options, borderRadius = options.borderRadius, marker = options.marker, symbol = marker && marker.symbol || 'rect', shape = HeatmapSeries_symbols[symbol] ? symbol : 'rect', hasRegularShape = ['circle', 'square'].indexOf(shape) !== -1;
        series.generatePoints();
        for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
            var point = _a[_i];
            var cellAttr = point.getCellAttributes();
            var x = Math.min(cellAttr.x1,
                cellAttr.x2),
                y = Math.min(cellAttr.y1,
                cellAttr.y2),
                width = Math.max(Math.abs(cellAttr.x2 - cellAttr.x1), 0),
                height = Math.max(Math.abs(cellAttr.y2 - cellAttr.y1), 0);
            point.hasImage = (point.marker && point.marker.symbol || symbol || '').indexOf('url') === 0;
            // If marker shape is regular (square), find the shorter cell's
            // side.
            if (hasRegularShape) {
                var sizeDiff = Math.abs(width - height);
                x = Math.min(cellAttr.x1, cellAttr.x2) +
                    (width < height ? 0 : sizeDiff / 2);
                y = Math.min(cellAttr.y1, cellAttr.y2) +
                    (width < height ? sizeDiff / 2 : 0);
                width = height = Math.min(width, height);
            }
            if (point.hasImage) {
                point.marker = { width: width, height: height };
            }
            point.plotX = point.clientX = (cellAttr.x1 + cellAttr.x2) / 2;
            point.plotY = (cellAttr.y1 + cellAttr.y2) / 2;
            point.shapeType = 'path';
            point.shapeArgs = HeatmapSeries_merge(true, { x: x, y: y, width: width, height: height }, {
                d: HeatmapSeries_symbols[shape](x, y, width, height, { r: HeatmapSeries_isNumber(borderRadius) ? borderRadius : 0 })
            });
        }
        HeatmapSeries_fireEvent(series, 'afterTranslate');
    };
    HeatmapSeries.defaultOptions = HeatmapSeries_merge(HeatmapSeries_ScatterSeries.defaultOptions, Heatmap_HeatmapSeriesDefaults);
    return HeatmapSeries;
}(HeatmapSeries_ScatterSeries));
HeatmapSeries_addEvent(HeatmapSeries, 'afterDataClassLegendClick', function () {
    this.isDirtyCanvas = true;
    this.drawPoints();
});
HeatmapSeries_extend(HeatmapSeries.prototype, {
    axisTypes: Series_ColorMapComposition.seriesMembers.axisTypes,
    colorKey: Series_ColorMapComposition.seriesMembers.colorKey,
    directTouch: true,
    getExtremesFromAll: true,
    keysAffectYAxis: ['y'],
    parallelArrays: Series_ColorMapComposition.seriesMembers.parallelArrays,
    pointArrayMap: ['y', 'value'],
    pointClass: Heatmap_HeatmapPoint,
    specialGroup: 'group',
    trackerGroups: Series_ColorMapComposition.seriesMembers.trackerGroups,
    /**
     * @private
     */
    alignDataLabel: HeatmapSeries_ColumnSeries.prototype.alignDataLabel,
    colorAttribs: Series_ColorMapComposition.seriesMembers.colorAttribs,
    getSymbol: HeatmapSeries_Series.prototype.getSymbol
});
Series_ColorMapComposition.compose(HeatmapSeries);
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('heatmap', HeatmapSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Heatmap_HeatmapSeries = ((/* unused pure expression or super */ null && (HeatmapSeries)));
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Heatmap series only. Padding between the points in the heatmap.
 * @name Highcharts.Point#pointPadding
 * @type {number|undefined}
 */
/**
 * Heatmap series only. The value of the point, resulting in a color
 * controlled by options as set in the colorAxis configuration.
 * @name Highcharts.Point#value
 * @type {number|null|undefined}
 */
/* *
 * @interface Highcharts.PointOptionsObject in parts/Point.ts
 */ /**
* Heatmap series only. Point padding for a single point.
* @name Highcharts.PointOptionsObject#pointPadding
* @type {number|undefined}
*/ /**
* Heatmap series only. The value of the point, resulting in a color controlled
* by options as set in the colorAxis configuration.
* @name Highcharts.PointOptionsObject#value
* @type {number|null|undefined}
*/
''; // Detach doclets above

;// ./code/es5/es-modules/masters/modules/map.src.js
/**
 * @license Highmaps JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/map
 * @requires highcharts
 *
 * Highmaps as a plugin for Highcharts or Highcharts Stock.
 *
 * (c) 2011-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */














var map_src_G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
// Classes
map_src_G.ColorMapComposition = Series_ColorMapComposition;
map_src_G.MapChart = map_src_G.MapChart || Chart_MapChart;
map_src_G.MapNavigation = map_src_G.MapNavigation || Maps_MapNavigation;
map_src_G.MapView = map_src_G.MapView || Maps_MapView;
map_src_G.Projection = map_src_G.Projection || Maps_Projection;
// Functions
map_src_G.mapChart = map_src_G.Map = map_src_G.MapChart.mapChart;
map_src_G.maps = map_src_G.MapChart.maps;
map_src_G.geojson = Maps_GeoJSONComposition.geojson;
map_src_G.topo2geo = Maps_GeoJSONComposition.topo2geo;
// Compositions
Maps_GeoJSONComposition.compose(map_src_G.Chart);
MapBubble_MapBubbleSeries.compose(map_src_G.Axis, map_src_G.Chart, map_src_G.Legend);
Maps_MapNavigation.compose(Chart_MapChart, map_src_G.Pointer, map_src_G.SVGRenderer);
Maps_MapView.compose(Chart_MapChart);
// Default Export
/* harmony default export */ var map_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});