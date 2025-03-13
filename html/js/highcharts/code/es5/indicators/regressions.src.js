/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/regressions
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Kamil Kulig
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/regressions", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/regressions"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ regressions_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/LinearRegression/LinearRegressionIndicator.js
/**
 *
 *  (c) 2010-2024 Kamil Kulig
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

var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Linear regression series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.linearregression
 *
 * @augments Highcharts.Series
 */
var LinearRegressionIndicator = /** @class */ (function (_super) {
    __extends(LinearRegressionIndicator, _super);
    function LinearRegressionIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Return the slope and intercept of a straight line function.
     *
     * @private
     *
     * @param {Array<number>} xData
     * List of all x coordinates in a period.
     *
     * @param {Array<number>} yData
     * List of all y coordinates in a period.
     *
     * @return {Highcharts.RegressionLineParametersObject}
     * Object that contains the slope and the intercept of a straight line
     * function.
     */
    LinearRegressionIndicator.prototype.getRegressionLineParameters = function (xData, yData) {
        // Least squares method
        var yIndex = this.options.params.index,
            getSingleYValue = function (yValue,
            yIndex) {
                return isArray(yValue) ? yValue[yIndex] : yValue;
        }, xSum = xData.reduce(function (accX, val) {
            return val + accX;
        }, 0), ySum = yData.reduce(function (accY, val) {
            return getSingleYValue(val, yIndex) + accY;
        }, 0), xMean = xSum / xData.length, yMean = ySum / yData.length;
        var xError,
            yError,
            i,
            formulaNumerator = 0,
            formulaDenominator = 0;
        for (i = 0; i < xData.length; i++) {
            xError = xData[i] - xMean;
            yError = getSingleYValue(yData[i], yIndex) - yMean;
            formulaNumerator += xError * yError;
            formulaDenominator += Math.pow(xError, 2);
        }
        var slope = formulaDenominator ?
                formulaNumerator / formulaDenominator : 0; // Don't divide by 0
            return {
                slope: slope,
                intercept: yMean - slope * xMean
            };
    };
    /**
     * Return the y value on a straight line.
     *
     * @private
     *
     * @param {Highcharts.RegressionLineParametersObject} lineParameters
     * Object that contains the slope and the intercept of a straight line
     * function.
     *
     * @param {number} endPointX
     * X coordinate of the point.
     *
     * @return {number}
     * Y value of the point that lies on the line.
     */
    LinearRegressionIndicator.prototype.getEndPointY = function (lineParameters, endPointX) {
        return lineParameters.slope * endPointX + lineParameters.intercept;
    };
    /**
     * Transform the coordinate system so that x values start at 0 and
     * apply xAxisUnit.
     *
     * @private
     *
     * @param {Array<number>} xData
     * List of all x coordinates in a period
     *
     * @param {number} xAxisUnit
     * Option (see the API)
     *
     * @return {Array<number>}
     * Array of transformed x data
     */
    LinearRegressionIndicator.prototype.transformXData = function (xData, xAxisUnit) {
        var xOffset = xData[0];
        return xData.map(function (xValue) {
            return (xValue - xOffset) / xAxisUnit;
        });
    };
    /**
     * Find the closest distance between points in the base series.
     * @private
     * @param {Array<number>} xData list of all x coordinates in the base series
     * @return {number} - closest distance between points in the base series
     */
    LinearRegressionIndicator.prototype.findClosestDistance = function (xData) {
        var distance,
            closestDistance,
            i;
        for (i = 1; i < xData.length - 1; i++) {
            distance = xData[i] - xData[i - 1];
            if (distance > 0 &&
                (typeof closestDistance === 'undefined' ||
                    distance < closestDistance)) {
                closestDistance = distance;
            }
        }
        return closestDistance;
    };
    // Required to be implemented - starting point for indicator's logic
    LinearRegressionIndicator.prototype.getValues = function (baseSeries, regressionSeriesParams) {
        var xData = baseSeries.xData,
            yData = baseSeries.yData,
            period = regressionSeriesParams.period, 
            // Format required to be returned
            indicatorData = {
                xData: [], // By getValues() method
                yData: [],
                values: []
            },
            xAxisUnit = this.options.params.xAxisUnit ||
                this.findClosestDistance(xData);
        var lineParameters,
            i,
            periodStart,
            periodEnd,
            endPointX,
            endPointY,
            periodXData,
            periodYData,
            periodTransformedXData;
        // Iteration logic: x value of the last point within the period
        // (end point) is used to represent the y value (regression)
        // of the entire period.
        for (i = period - 1; i <= xData.length - 1; i++) {
            periodStart = i - period + 1; // Adjusted for slice() function
            periodEnd = i + 1; // (as above)
            endPointX = xData[i];
            periodXData = xData.slice(periodStart, periodEnd);
            periodYData = yData.slice(periodStart, periodEnd);
            periodTransformedXData = this.transformXData(periodXData, xAxisUnit);
            lineParameters = this.getRegressionLineParameters(periodTransformedXData, periodYData);
            endPointY = this.getEndPointY(lineParameters, periodTransformedXData[periodTransformedXData.length - 1]);
            // @todo this is probably not used anywhere
            indicatorData.values.push({
                regressionLineParameters: lineParameters,
                x: endPointX,
                y: endPointY
            });
            if (isArray(indicatorData.xData)) {
                indicatorData.xData.push(endPointX);
            }
            if (isArray(indicatorData.yData)) {
                indicatorData.yData.push(endPointY);
            }
        }
        return indicatorData;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Linear regression indicator. This series requires `linkedTo` option to be
     * set.
     *
     * @sample {highstock} stock/indicators/linear-regression
     *         Linear regression indicator
     *
     * @extends      plotOptions.sma
     * @since        7.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/regressions
     * @optionparent plotOptions.linearregression
     */
    LinearRegressionIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        params: {
            /**
             * Unit (in milliseconds) for the x axis distances used to
             * compute the regression line parameters (slope & intercept)
             * for every range. In Highcharts Stock the x axis values are
             * always represented in milliseconds which may cause that
             * distances between points are "big" integer numbers.
             *
             * Highcharts Stock's linear regression algorithm (least squares
             * method) will utilize these "big" integers for finding the
             * slope and the intercept of the regression line for each
             * period. In consequence, this value may be a very "small"
             * decimal number that's hard to interpret by a human.
             *
             * For instance: `xAxisUnit` equaled to `86400000` ms (1 day)
             * forces the algorithm to treat `86400000` as `1` while
             * computing the slope and the intercept. This may enhance the
             * legibility of the indicator's values.
             *
             * Default value is the closest distance between two data
             * points.
             *
             * In `v9.0.2`, the default value has been changed
             * from `undefined` to `null`.
             *
             * @sample {highstock} stock/plotoptions/linear-regression-xaxisunit
             *         xAxisUnit set to 1 minute
             *
             * @example
             * // In Liniear Regression Slope Indicator series `xAxisUnit`is
             * // `86400000` (1 day) and period is `3`. There're 3 points in
             * // the base series:
             *
             * data: [
             *   [Date.UTC(2020, 0, 1), 1],
             *   [Date.UTC(2020, 0, 2), 3],
             *   [Date.UTC(2020, 0, 3), 5]
             * ]
             *
             * // This will produce one point in the indicator series that
             * // has a `y` value of `2` (slope of the regression line). If
             * // we change the `xAxisUnit` to `1` (ms) the value of the
             * // indicator's point will be `2.3148148148148148e-8` which is
             * // harder to interpert for a human.
             *
             * @type    {null|number}
             * @product highstock
             */
            xAxisUnit: null
        },
        tooltip: {
            valueDecimals: 4
        }
    });
    return LinearRegressionIndicator;
}(SMAIndicator));
extend(LinearRegressionIndicator.prototype, {
    nameBase: 'Linear Regression Indicator'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('linearRegression', LinearRegressionIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var LinearRegression_LinearRegressionIndicator = ((/* unused pure expression or super */ null && (LinearRegressionIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A linear regression series. If the
 * [type](#series.linearregression.type) option is not specified, it is
 * inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.linearregression
 * @since     7.0.0
 * @product   highstock
 * @excluding dataParser,dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @apioption series.linearregression
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/Stock/Indicators/LinearRegressionSlopes/LinearRegressionSlopesIndicator.js
/**
 *
 *  (c) 2010-2024 Kamil Kulig
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var LinearRegressionSlopesIndicator_extends = (undefined && undefined.__extends) || (function () {
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

var LinearRegressionSlopesIndicator_LinearRegressionIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.linearRegression;

var LinearRegressionSlopesIndicator_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, LinearRegressionSlopesIndicator_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Linear Regression Slope series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.linearRegressionSlope
 *
 * @augments Highcharts.Series
 */
var LinearRegressionSlopesIndicator = /** @class */ (function (_super) {
    LinearRegressionSlopesIndicator_extends(LinearRegressionSlopesIndicator, _super);
    function LinearRegressionSlopesIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    LinearRegressionSlopesIndicator.prototype.getEndPointY = function (lineParameters) {
        return lineParameters.slope;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Linear regression slope indicator. This series requires `linkedTo`
     * option to be set.
     *
     * @sample {highstock} stock/indicators/linear-regression-slope
     *         Linear regression slope indicator
     *
     * @extends      plotOptions.linearregression
     * @since        7.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires  stock/indicators/regressions
     * @optionparent plotOptions.linearregressionslope
     */
    LinearRegressionSlopesIndicator.defaultOptions = LinearRegressionSlopesIndicator_merge(LinearRegressionSlopesIndicator_LinearRegressionIndicator.defaultOptions);
    return LinearRegressionSlopesIndicator;
}(LinearRegressionSlopesIndicator_LinearRegressionIndicator));
LinearRegressionSlopesIndicator_extend(LinearRegressionSlopesIndicator.prototype, {
    nameBase: 'Linear Regression Slope Indicator'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('linearRegressionSlope', LinearRegressionSlopesIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var LinearRegressionSlopes_LinearRegressionSlopesIndicator = ((/* unused pure expression or super */ null && (LinearRegressionSlopesIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A linear regression intercept series. If the
 * [type](#series.linearregressionslope.type) option is not specified, it is
 * inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.linearregressionslope
 * @since     7.0.0
 * @product   highstock
 * @excluding dataParser,dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @apioption series.linearregressionslope
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/Stock/Indicators/LinearRegressionIntercept/LinearRegressionInterceptIndicator.js
/**
 *
 *  (c) 2010-2024 Kamil Kulig
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var LinearRegressionInterceptIndicator_extends = (undefined && undefined.__extends) || (function () {
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

var LinearRegressionInterceptIndicator_LinearRegressionIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.linearRegression;

var LinearRegressionInterceptIndicator_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, LinearRegressionInterceptIndicator_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Linear Regression Intercept series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.linearRegressionIntercept
 *
 * @augments Highcharts.Series
 */
var LinearRegressionInterceptIndicator = /** @class */ (function (_super) {
    LinearRegressionInterceptIndicator_extends(LinearRegressionInterceptIndicator, _super);
    function LinearRegressionInterceptIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    LinearRegressionInterceptIndicator.prototype.getEndPointY = function (lineParameters) {
        return lineParameters.intercept;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Linear regression intercept indicator. This series requires `linkedTo`
     * option to be set.
     *
     * @sample {highstock} stock/indicators/linear-regression-intercept
     *         Linear intercept slope indicator
     *
     * @extends      plotOptions.linearregression
     * @since        7.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires  stock/indicators/regressions
     * @optionparent plotOptions.linearregressionintercept
     */
    LinearRegressionInterceptIndicator.defaultOptions = LinearRegressionInterceptIndicator_merge(LinearRegressionInterceptIndicator_LinearRegressionIndicator.defaultOptions);
    return LinearRegressionInterceptIndicator;
}(LinearRegressionInterceptIndicator_LinearRegressionIndicator));
LinearRegressionInterceptIndicator_extend(LinearRegressionInterceptIndicator.prototype, {
    nameBase: 'Linear Regression Intercept Indicator'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('linearRegressionIntercept', LinearRegressionInterceptIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var LinearRegressionIntercept_LinearRegressionInterceptIndicator = ((/* unused pure expression or super */ null && (LinearRegressionInterceptIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A linear regression intercept series. If the
 * [type](#series.linearregressionintercept.type) option is not specified, it is
 * inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.linearregressionintercept
 * @since     7.0.0
 * @product   highstock
 * @excluding dataParser,dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @apioption series.linearregressionintercept
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/Stock/Indicators/LinearRegressionAngle/LinearRegressionAngleIndicator.js
/**
 *
 *  (c) 2010-2024 Kamil Kulig
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var LinearRegressionAngleIndicator_extends = (undefined && undefined.__extends) || (function () {
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

var LinearRegressionAngleIndicator_LinearRegressionIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.linearRegression;

var LinearRegressionAngleIndicator_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, LinearRegressionAngleIndicator_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge;
/* *
 *
 *  Class
 *
 * */
/**
 * The Linear Regression Angle series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.linearRegressionAngle
 *
 * @augments Highcharts.Series
 */
var LinearRegressionAngleIndicator = /** @class */ (function (_super) {
    LinearRegressionAngleIndicator_extends(LinearRegressionAngleIndicator, _super);
    function LinearRegressionAngleIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Convert a slope of a line to angle (in degrees) between
     * the line and x axis
     * @private
     * @param {number} slope of the straight line function
     * @return {number} angle in degrees
     */
    LinearRegressionAngleIndicator.prototype.slopeToAngle = function (slope) {
        return Math.atan(slope) * (180 / Math.PI); // Rad to deg
    };
    LinearRegressionAngleIndicator.prototype.getEndPointY = function (lineParameters) {
        return this.slopeToAngle(lineParameters.slope);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Linear regression angle indicator. This series requires `linkedTo`
     * option to be set.
     *
     * @sample {highstock} stock/indicators/linear-regression-angle
     *         Linear intercept angle indicator
     *
     * @extends      plotOptions.linearregression
     * @since        7.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires  stock/indicators/regressions
     * @optionparent plotOptions.linearregressionangle
     */
    LinearRegressionAngleIndicator.defaultOptions = LinearRegressionAngleIndicator_merge(LinearRegressionAngleIndicator_LinearRegressionIndicator.defaultOptions, {
        tooltip: {
            pointFormat: '<span style="color:{point.color}">\u25CF</span>' +
                '{series.name}: <b>{point.y}°</b><br/>'
        }
    });
    return LinearRegressionAngleIndicator;
}(LinearRegressionAngleIndicator_LinearRegressionIndicator));
LinearRegressionAngleIndicator_extend(LinearRegressionAngleIndicator.prototype, {
    nameBase: 'Linear Regression Angle Indicator'
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('linearRegressionAngle', LinearRegressionAngleIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var LinearRegressionAngle_LinearRegressionAngleIndicator = ((/* unused pure expression or super */ null && (LinearRegressionAngleIndicator)));
/**
 * A linear regression intercept series. If the
 * [type](#series.linearregressionangle.type) option is not specified, it is
 * inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.linearregressionangle
 * @since     7.0.0
 * @product   highstock
 * @excluding dataParser,dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/regressions
 * @apioption series.linearregressionangle
 */
''; // To include the above in the js output

;// ./code/es5/es-modules/masters/indicators/regressions.src.js




// eslint-disable-next-line max-len

// eslint-disable-next-line max-len


/* harmony default export */ var regressions_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});