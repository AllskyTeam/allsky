/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/no-data-to-display
 * @requires highcharts
 *
 * Plugin for displaying a message when there is no data visible in chart.
 *
 * (c) 2010-2024 Highsoft AS
 * Author: Oystein Moseng
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["AST"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/no-data-to-display", [["highcharts/highcharts"], ["highcharts/highcharts","AST"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/no-data-to-display"] = factory(require("highcharts"), require("highcharts")["AST"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["AST"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__660__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 660:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__660__;

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
  "default": function() { return /* binding */ no_data_to_display_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","AST"],"commonjs":["highcharts","AST"],"commonjs2":["highcharts","AST"],"root":["Highcharts","AST"]}
var highcharts_AST_commonjs_highcharts_AST_commonjs2_highcharts_AST_root_Highcharts_AST_ = __webpack_require__(660);
var highcharts_AST_commonjs_highcharts_AST_commonjs2_highcharts_AST_root_Highcharts_AST_default = /*#__PURE__*/__webpack_require__.n(highcharts_AST_commonjs_highcharts_AST_commonjs2_highcharts_AST_root_Highcharts_AST_);
;// ./code/es5/es-modules/Extensions/NoDataToDisplay/NoDataDefaults.js
/* *
 *
 *  Plugin for displaying a message when there is no data visible in chart.
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Oystein Moseng
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
 * @optionparent lang
 */
var lang = {
    /**
     * The text to display when the chart contains no data.
     *
     * @see [noData](#noData)
     *
     * @sample highcharts/no-data-to-display/no-data-line
     *         No-data text
     *
     * @since    3.0.8
     * @product  highcharts highstock
     * @requires modules/no-data-to-display
     */
    noData: 'No data to display'
};
/**
 * Options for displaying a message like "No data to display".
 * This feature requires the file no-data-to-display.js to be loaded in the
 * page. The actual text to display is set in the lang.noData option.
 *
 * @sample highcharts/no-data-to-display/no-data-line
 *         Line chart with no-data module
 * @sample highcharts/no-data-to-display/no-data-pie
 *         Pie chart with no-data module
 *
 * @product      highcharts highstock gantt
 * @requires     modules/no-data-to-display
 * @optionparent noData
 */
var noData = {
    /**
     * An object of additional SVG attributes for the no-data label.
     *
     * @type      {Highcharts.SVGAttributes}
     * @since     3.0.8
     * @product   highcharts highstock gantt
     * @apioption noData.attr
     */
    attr: {
        zIndex: 1
    },
    /**
     * Whether to insert the label as HTML, or as pseudo-HTML rendered with
     * SVG.
     *
     * @type      {boolean}
     * @default   false
     * @since     4.1.10
     * @product   highcharts highstock gantt
     * @apioption noData.useHTML
     */
    /**
     * The position of the no-data label, relative to the plot area.
     *
     * @type  {Highcharts.AlignObject}
     * @since 3.0.8
     */
    position: {
        /**
         * Horizontal offset of the label, in pixels.
         */
        x: 0,
        /**
         * Vertical offset of the label, in pixels.
         */
        y: 0,
        /**
         * Horizontal alignment of the label.
         *
         * @type {Highcharts.AlignValue}
         */
        align: 'center',
        /**
         * Vertical alignment of the label.
         *
         * @type {Highcharts.VerticalAlignValue}
         */
        verticalAlign: 'middle'
    },
    /**
     * CSS styles for the no-data label.
     *
     * @sample highcharts/no-data-to-display/no-data-line
     *         Styled no-data text
     *
     * @type {Highcharts.CSSObject}
     */
    style: {
        /** @ignore */
        fontWeight: 'bold',
        /** @ignore */
        fontSize: '0.8em',
        /** @ignore */
        color: "#666666" /* Palette.neutralColor60 */
    }
};
/* *
 *
 *  Default Export
 *
 * */
var NoDataDefaults = {
    lang: lang,
    noData: noData
};
/* harmony default export */ var NoDataToDisplay_NoDataDefaults = (NoDataDefaults);

;// ./code/es5/es-modules/Extensions/NoDataToDisplay/NoDataToDisplay.js
/* *
 *
 *  Plugin for displaying a message when there is no data visible in chart.
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Oystein Moseng
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */




var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Functions
 *
 * */
/**
 * Returns true if there are data points within the plot area now.
 *
 * @private
 * @function Highcharts.Chart#hasData
 * @return {boolean|undefined}
 * True, if there are data points.
 * @requires modules/no-data-to-display
 */
function chartHasData() {
    var chart = this,
        series = chart.series || [];
    var i = series.length;
    while (i--) {
        if (series[i].hasData() && !series[i].options.isInternal) {
            return true;
        }
    }
    return chart.loadingShown; // #4588
}
/**
 * Hide no-data message.
 *
 * @private
 * @function Highcharts.Chart#hideNoData
 * @return {void}
 * @requires modules/no-data-to-display
 */
function chartHideNoData() {
    var chart = this;
    if (chart.noDataLabel) {
        chart.noDataLabel = chart.noDataLabel.destroy();
    }
}
/**
 * Display a no-data message.
 * @private
 * @function Highcharts.Chart#showNoData
 * @param {string} [str]
 * An optional message to show in place of the default one
 * @return {void}
 * @requires modules/no-data-to-display
 */
function chartShowNoData(str) {
    var chart = this,
        options = chart.options,
        text = str || (options && options.lang.noData) || '',
        noDataOptions = options && (options.noData || {});
    if (chart.renderer) { // Meaning chart is not destroyed
        if (!chart.noDataLabel) {
            chart.noDataLabel = chart.renderer
                .label(text, 0, 0, void 0, void 0, void 0, noDataOptions.useHTML, void 0, 'no-data')
                .add();
        }
        if (!chart.styledMode) {
            chart.noDataLabel
                .attr(highcharts_AST_commonjs_highcharts_AST_commonjs2_highcharts_AST_root_Highcharts_AST_default().filterUserAttributes(noDataOptions.attr || {}))
                .css(noDataOptions.style || {});
        }
        chart.noDataLabel.align(extend(chart.noDataLabel.getBBox(), noDataOptions.position || {}), false, 'plotBox');
    }
}
/** @private */
function compose(ChartClass, highchartsDefaultOptions) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.showNoData) {
        chartProto.hasData = chartHasData;
        chartProto.hideNoData = chartHideNoData;
        chartProto.showNoData = chartShowNoData;
        addEvent(ChartClass, 'render', onChartRender);
        merge(true, highchartsDefaultOptions, NoDataToDisplay_NoDataDefaults);
    }
}
/**
 * Add event listener to handle automatic show or hide no-data message.
 * @private
 */
function onChartRender() {
    var chart = this;
    if (chart.hasData()) {
        chart.hideNoData();
    }
    else {
        chart.showNoData();
    }
}
/* *
 *
 *  Default Export
 *
 * */
var NoDataToDisplay = {
    compose: compose
};
/* harmony default export */ var NoDataToDisplay_NoDataToDisplay = (NoDataToDisplay);

;// ./code/es5/es-modules/masters/modules/no-data-to-display.src.js




var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
NoDataToDisplay_NoDataToDisplay.compose(G.Chart, G.defaultOptions);
/* harmony default export */ var no_data_to_display_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});