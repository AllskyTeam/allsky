/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/dotplot
 * @requires highcharts
 *
 * Dot plot series type for Highcharts
 *
 * (c) 2010-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/dotplot", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/dotplot"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ dotplot_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es5/es-modules/Series/DotPlot/DotPlotSeriesDefaults.js
/* *
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  Dot plot series type for Highcharts
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
var DotPlotSeriesDefaults = {
    itemPadding: 0.1,
    marker: {
        symbol: 'circle',
        states: {
            hover: {},
            select: {}
        }
    },
    slotsPerBar: void 0
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DotPlot_DotPlotSeriesDefaults = (DotPlotSeriesDefaults);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/DotPlot/DotPlotSeries.js
/* *
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  Dot plot series type for Highcharts
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
/**
 * @private
 * @todo
 * - Check update, remove etc.
 * - Custom icons like persons, carts etc. Either as images, font icons or
 *   Highcharts symbols.
 */

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


var ColumnSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.column;

var extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.dotplot
 *
 * @augments Highcharts.Series
 */
var DotPlotSeries = /** @class */ (function (_super) {
    __extends(DotPlotSeries, _super);
    function DotPlotSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    DotPlotSeries.prototype.drawPoints = function () {
        var _a,
            _b,
            _c;
        var series = this,
            options = series.options,
            renderer = series.chart.renderer,
            seriesMarkerOptions = options.marker,
            total = this.points.reduce(function (acc,
            point) { return acc + Math.abs(point.y || 0); }, 0),
            totalHeight = this.points.reduce(function (acc,
            point) { var _a; return acc + (((_a = point.shapeArgs) === null || _a === void 0 ? void 0 : _a.height) || 0); }, 0),
            itemPadding = options.itemPadding || 0,
            columnWidth = ((_b = (_a = this.points[0]) === null || _a === void 0 ? void 0 : _a.shapeArgs) === null || _b === void 0 ? void 0 : _b.width) || 0;
        var slotsPerBar = options.slotsPerBar,
            slotWidth = columnWidth;
        // Find the suitable number of slots per column
        if (!isNumber(slotsPerBar)) {
            slotsPerBar = 1;
            while (slotsPerBar < total) {
                if (total / slotsPerBar <
                    (totalHeight / slotWidth) * 1.2) {
                    break;
                }
                slotsPerBar++;
                slotWidth = columnWidth / slotsPerBar;
            }
        }
        var height = (totalHeight * slotsPerBar) / total;
        for (var _i = 0, _d = series.points; _i < _d.length; _i++) {
            var point = _d[_i];
            var pointMarkerOptions = point.marker || {},
                symbol = (pointMarkerOptions.symbol ||
                    seriesMarkerOptions.symbol),
                radius = pick(pointMarkerOptions.radius,
                seriesMarkerOptions.radius),
                isSquare = symbol !== 'rect',
                width = isSquare ? height : slotWidth,
                shapeArgs = point.shapeArgs || {},
                startX = (shapeArgs.x || 0) + ((shapeArgs.width || 0) -
                    slotsPerBar * width) / 2,
                positiveYValue = Math.abs((_c = point.y) !== null && _c !== void 0 ? _c : 0),
                shapeY = (shapeArgs.y || 0),
                shapeHeight = (shapeArgs.height || 0);
            var graphics = void 0,
                x = startX,
                y = point.negative ? shapeY : shapeY + shapeHeight - height,
                slotColumn = 0;
            point.graphics = graphics = point.graphics || [];
            var pointAttr = point.pointAttr ?
                    (point.pointAttr[point.selected ? 'selected' : ''] ||
                        series.pointAttr['']) :
                    series.pointAttribs(point,
                point.selected && 'select');
            delete pointAttr.r;
            if (series.chart.styledMode) {
                delete pointAttr.stroke;
                delete pointAttr['stroke-width'];
            }
            if (typeof point.y === 'number') {
                if (!point.graphic) {
                    point.graphic = renderer.g('point').add(series.group);
                }
                for (var val = 0; val < positiveYValue; val++) {
                    var attr = {
                            x: x + width * itemPadding,
                            y: y + height * itemPadding,
                            width: width * (1 - 2 * itemPadding),
                            height: height * (1 - 2 * itemPadding),
                            r: radius
                        };
                    var graphic = graphics[val];
                    if (graphic) {
                        graphic.animate(attr);
                    }
                    else {
                        graphic = renderer
                            .symbol(symbol)
                            .attr(extend(attr, pointAttr))
                            .add(point.graphic);
                    }
                    graphic.isActive = true;
                    graphics[val] = graphic;
                    x += width;
                    slotColumn++;
                    if (slotColumn >= slotsPerBar) {
                        slotColumn = 0;
                        x = startX;
                        y = point.negative ? y + height : y - height;
                    }
                }
            }
            var i = -1;
            for (var _e = 0, graphics_1 = graphics; _e < graphics_1.length; _e++) {
                var graphic = graphics_1[_e];
                ++i;
                if (graphic) {
                    if (!graphic.isActive) {
                        graphic.destroy();
                        graphics.splice(i, 1);
                    }
                    else {
                        graphic.isActive = false;
                    }
                }
            }
        }
    };
    /* *
     *
     *  Static Properties
     *
     * */
    DotPlotSeries.defaultOptions = merge(ColumnSeries.defaultOptions, DotPlot_DotPlotSeriesDefaults);
    return DotPlotSeries;
}(ColumnSeries));
extend(DotPlotSeries.prototype, {
    markerAttribs: void 0
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('dotplot', DotPlotSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var DotPlot_DotPlotSeries = ((/* unused pure expression or super */ null && (DotPlotSeries)));

;// ./code/es5/es-modules/masters/modules/dotplot.src.js




/* harmony default export */ var dotplot_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});