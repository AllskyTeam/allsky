/**
 * @license Highstock JS v12.1.2 (2025-01-09)
 * @module highcharts/indicators/pivot-points
 * @requires highcharts
 * @requires highcharts/modules/stock
 *
 * Indicator series type for Highcharts Stock
 *
 * (c) 2010-2024 Paweł Fus
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/indicators/pivot-points", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/indicators/pivot-points"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
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
  "default": function() { return /* binding */ pivot_points_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Stock/Indicators/PivotPoints/PivotPointsPoint.js
/* *
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

var SMAPoint = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma.prototype.pointClass;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function destroyExtraLabels(point, functionName) {
    var props = point.series.pointArrayMap;
    var prop,
        i = props.length;
    (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma.prototype.pointClass.prototype[functionName].call(point);
    while (i--) {
        prop = 'dataLabel' + props[i];
        // S4 dataLabel could be removed by parent method:
        if (point[prop] && point[prop].element) {
            point[prop].destroy();
        }
        point[prop] = null;
    }
}
/* *
 *
 *  Class
 *
 * */
var PivotPointsPoint = /** @class */ (function (_super) {
    __extends(PivotPointsPoint, _super);
    function PivotPointsPoint() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PivotPointsPoint.prototype.destroyElements = function () {
        destroyExtraLabels(this, 'destroyElements');
    };
    // This method is called when removing points, e.g. series.update()
    PivotPointsPoint.prototype.destroy = function () {
        destroyExtraLabels(this, 'destroyElements');
    };
    return PivotPointsPoint;
}(SMAPoint));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var PivotPoints_PivotPointsPoint = (PivotPointsPoint);

;// ./code/es5/es-modules/Stock/Indicators/PivotPoints/PivotPointsIndicator.js
/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var PivotPointsIndicator_extends = (undefined && undefined.__extends) || (function () {
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


var SMAIndicator = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sma;

var merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, isArray = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isArray;
/**
 *
 *  Class
 *
 **/
/**
 * The Pivot Points series type.
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pivotpoints
 *
 * @augments Highcharts.Series
 */
var PivotPointsIndicator = /** @class */ (function (_super) {
    PivotPointsIndicator_extends(PivotPointsIndicator, _super);
    function PivotPointsIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    PivotPointsIndicator.prototype.toYData = function (point) {
        return [point.P]; // The rest should not affect extremes
    };
    PivotPointsIndicator.prototype.translate = function () {
        var indicator = this;
        _super.prototype.translate.apply(indicator);
        indicator.points.forEach(function (point) {
            indicator.pointArrayMap.forEach(function (value) {
                if (defined(point[value])) {
                    point['plot' + value] = (indicator.yAxis.toPixels(point[value], true));
                }
            });
        });
        // Pivot points are rendered as horizontal lines
        // And last point start not from the next one (as it's the last one)
        // But from the approximated last position in a given range
        indicator.plotEndPoint = indicator.xAxis.toPixels(indicator.endPoint, true);
    };
    PivotPointsIndicator.prototype.getGraphPath = function (points) {
        var indicator = this,
            allPivotPoints = ([[],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []]),
            pointArrayMapLength = indicator.pointArrayMap.length;
        var endPoint = indicator.plotEndPoint,
            path = [],
            position,
            point,
            pointsLength = points.length,
            i;
        while (pointsLength--) {
            point = points[pointsLength];
            for (i = 0; i < pointArrayMapLength; i++) {
                position = indicator.pointArrayMap[i];
                if (defined(point[position])) {
                    allPivotPoints[i].push({
                        // Start left:
                        plotX: point.plotX,
                        plotY: point['plot' + position],
                        isNull: false
                    }, {
                        // Go to right:
                        plotX: endPoint,
                        plotY: point['plot' + position],
                        isNull: false
                    }, {
                        // And add null points in path to generate breaks:
                        plotX: endPoint,
                        plotY: null,
                        isNull: true
                    });
                }
            }
            endPoint = point.plotX;
        }
        allPivotPoints.forEach(function (pivotPoints) {
            path = path.concat(_super.prototype.getGraphPath.call(indicator, pivotPoints));
        });
        return path;
    };
    // TODO: Rewrite this logic to use multiple datalabels
    PivotPointsIndicator.prototype.drawDataLabels = function () {
        var indicator = this,
            pointMapping = indicator.pointArrayMap;
        var currentLabel,
            pointsLength,
            point,
            i;
        if (indicator.options.dataLabels.enabled) {
            pointsLength = indicator.points.length;
            // For every Resistance/Support group we need to render labels.
            // Add one more item, which will just store dataLabels from
            // previous iteration
            pointMapping.concat([false]).forEach(function (position, k) {
                i = pointsLength;
                while (i--) {
                    point = indicator.points[i];
                    if (!position) {
                        // Store S4 dataLabel too:
                        point['dataLabel' + pointMapping[k - 1]] =
                            point.dataLabel;
                    }
                    else {
                        point.y = point[position];
                        point.pivotLine = position;
                        point.plotY = point['plot' + position];
                        currentLabel = point['dataLabel' + position];
                        // Store previous label
                        if (k) {
                            point['dataLabel' + pointMapping[k - 1]] = point.dataLabel;
                        }
                        if (!point.dataLabels) {
                            point.dataLabels = [];
                        }
                        point.dataLabels[0] = point.dataLabel =
                            currentLabel =
                                currentLabel && currentLabel.element ?
                                    currentLabel :
                                    null;
                    }
                }
                _super.prototype.drawDataLabels
                    .call(indicator);
            });
        }
    };
    PivotPointsIndicator.prototype.getValues = function (series, params) {
        var period = params.period,
            xVal = series.xData,
            yVal = series.yData,
            yValLen = yVal ? yVal.length : 0,
            placement = this[params.algorithm + 'Placement'], 
            // 0- from, 1- to, 2- R1, 3- R2, 4- pivot, 5- S1 etc.
            PP = [],
            xData = [],
            yData = [];
        var endTimestamp,
            slicedXLen,
            slicedX,
            slicedY,
            lastPP,
            pivot,
            avg,
            i;
        // Pivot Points requires high, low and close values
        if (xVal.length < period ||
            !isArray(yVal[0]) ||
            yVal[0].length !== 4) {
            return;
        }
        for (i = period + 1; i <= yValLen + period; i += period) {
            slicedX = xVal.slice(i - period - 1, i);
            slicedY = yVal.slice(i - period - 1, i);
            slicedXLen = slicedX.length;
            endTimestamp = slicedX[slicedXLen - 1];
            pivot = this.getPivotAndHLC(slicedY);
            avg = placement(pivot);
            lastPP = PP.push([endTimestamp]
                .concat(avg));
            xData.push(endTimestamp);
            yData.push(PP[lastPP - 1].slice(1));
        }
        // We don't know exact position in ordinal axis
        // So we use simple logic:
        // Get first point in last range, calculate visible average range
        // and multiply by period
        this.endPoint = slicedX[0] + ((endTimestamp - slicedX[0]) /
            slicedXLen) * period;
        return {
            values: PP,
            xData: xData,
            yData: yData
        };
    };
    PivotPointsIndicator.prototype.getPivotAndHLC = function (values) {
        var close = values[values.length - 1][3];
        var high = -Infinity,
            low = Infinity;
        values.forEach(function (p) {
            high = Math.max(high, p[1]);
            low = Math.min(low, p[2]);
        });
        var pivot = (high + low + close) / 3;
        return [pivot, high, low, close];
    };
    PivotPointsIndicator.prototype.standardPlacement = function (values) {
        var diff = values[1] - values[2],
            avg = [
                null,
                null,
                values[0] + diff,
                values[0] * 2 - values[2],
                values[0],
                values[0] * 2 - values[1],
                values[0] - diff,
                null,
                null
            ];
        return avg;
    };
    PivotPointsIndicator.prototype.camarillaPlacement = function (values) {
        var diff = values[1] - values[2],
            avg = [
                values[3] + diff * 1.5,
                values[3] + diff * 1.25,
                values[3] + diff * 1.1666,
                values[3] + diff * 1.0833,
                values[0],
                values[3] - diff * 1.0833,
                values[3] - diff * 1.1666,
                values[3] - diff * 1.25,
                values[3] - diff * 1.5
            ];
        return avg;
    };
    PivotPointsIndicator.prototype.fibonacciPlacement = function (values) {
        var diff = values[1] - values[2],
            avg = [
                null,
                values[0] + diff,
                values[0] + diff * 0.618,
                values[0] + diff * 0.382,
                values[0],
                values[0] - diff * 0.382,
                values[0] - diff * 0.618,
                values[0] - diff,
                null
            ];
        return avg;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Pivot points indicator. This series requires the `linkedTo` option to be
     * set and should be loaded after `stock/indicators/indicators.js` file.
     *
     * @sample stock/indicators/pivot-points
     *         Pivot points
     *
     * @extends      plotOptions.sma
     * @since        6.0.0
     * @product      highstock
     * @requires     stock/indicators/indicators
     * @requires     stock/indicators/pivot-points
     * @optionparent plotOptions.pivotpoints
     */
    PivotPointsIndicator.defaultOptions = merge(SMAIndicator.defaultOptions, {
        /**
         * @excluding index
         */
        params: {
            index: void 0, // Unchangeable index, do not inherit (#15362)
            period: 28,
            /**
             * Algorithm used to calculate resistance and support lines based
             * on pivot points. Implemented algorithms: `'standard'`,
             * `'fibonacci'` and `'camarilla'`
             */
            algorithm: 'standard'
        },
        marker: {
            enabled: false
        },
        enableMouseTracking: false,
        dataLabels: {
            enabled: true,
            format: '{point.pivotLine}'
        },
        dataGrouping: {
            approximation: 'averages'
        }
    });
    return PivotPointsIndicator;
}(SMAIndicator));
extend(PivotPointsIndicator.prototype, {
    nameBase: 'Pivot Points',
    pointArrayMap: ['R4', 'R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3', 'S4'],
    pointValKey: 'P',
    pointClass: PivotPoints_PivotPointsPoint
});
/* *
 *
 *  Registry
 *
 * */
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('pivotpoints', PivotPointsIndicator);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var PivotPoints_PivotPointsIndicator = ((/* unused pure expression or super */ null && (PivotPointsIndicator)));
/* *
 *
 *  API Options
 *
 * */
/**
 * A pivot points indicator. If the [type](#series.pivotpoints.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.pivotpoints
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL
 * @requires  stock/indicators/indicators
 * @requires  stock/indicators/pivot-points
 * @apioption series.pivotpoints
 */
''; // To include the above in the js output'

;// ./code/es5/es-modules/masters/indicators/pivot-points.src.js




/* harmony default export */ var pivot_points_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});