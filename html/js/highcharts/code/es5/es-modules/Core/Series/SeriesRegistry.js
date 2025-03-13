/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
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
import H from '../Globals.js';
import D from '../Defaults.js';
var defaultOptions = D.defaultOptions;
import Point from './Point.js';
import U from '../Utilities.js';
var extend = U.extend, extendClass = U.extendClass, merge = U.merge;
/* *
 *
 *  Namespace
 *
 * */
var SeriesRegistry;
(function (SeriesRegistry) {
    /* *
     *
     *  Properties
     *
     * */
    /**
     * @internal
     * @todo Move `Globals.seriesTypes` code to her.
     */
    SeriesRegistry.seriesTypes = H.seriesTypes;
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Registers class pattern of a series.
     *
     * @private
     */
    function registerSeriesType(seriesType, SeriesClass) {
        var defaultPlotOptions = defaultOptions.plotOptions || {}, seriesOptions = SeriesClass.defaultOptions, seriesProto = SeriesClass.prototype;
        seriesProto.type = seriesType;
        if (!seriesProto.pointClass) {
            seriesProto.pointClass = Point;
        }
        if (SeriesRegistry.seriesTypes[seriesType]) {
            return false;
        }
        if (seriesOptions) {
            defaultPlotOptions[seriesType] = seriesOptions;
        }
        SeriesRegistry.seriesTypes[seriesType] = SeriesClass;
        return true;
    }
    SeriesRegistry.registerSeriesType = registerSeriesType;
    /**
     * Old factory to create new series prototypes.
     *
     * @deprecated
     * @function Highcharts.seriesType
     *
     * @param {string} type
     * The series type name.
     *
     * @param {string} parent
     * The parent series type name. Use `line` to inherit from the basic
     * {@link Series} object.
     *
     * @param {Highcharts.SeriesOptionsType|Highcharts.Dictionary<*>} options
     * The additional default options that are merged with the parent's options.
     *
     * @param {Highcharts.Dictionary<*>} [props]
     * The properties (functions and primitives) to set on the new prototype.
     *
     * @param {Highcharts.Dictionary<*>} [pointProps]
     * Members for a series-specific extension of the {@link Point} prototype if
     * needed.
     *
     * @return {Highcharts.Series}
     * The newly created prototype as extended from {@link Series} or its
     * derivatives.
     */
    function seriesType(type, parent, options, seriesProto, pointProto) {
        var defaultPlotOptions = defaultOptions.plotOptions || {};
        parent = parent || '';
        // Merge the options
        defaultPlotOptions[type] = merge(defaultPlotOptions[parent], options);
        // Create the class
        delete SeriesRegistry.seriesTypes[type];
        registerSeriesType(type, extendClass(SeriesRegistry.seriesTypes[parent] || function () { }, seriesProto));
        SeriesRegistry.seriesTypes[type].prototype.type = type;
        // Create the point class if needed
        if (pointProto) {
            var PointClass = /** @class */ (function (_super) {
                __extends(PointClass, _super);
                function PointClass() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return PointClass;
            }(Point));
            extend(PointClass.prototype, pointProto);
            SeriesRegistry.seriesTypes[type].prototype.pointClass = PointClass;
        }
        return SeriesRegistry.seriesTypes[type];
    }
    SeriesRegistry.seriesType = seriesType;
})(SeriesRegistry || (SeriesRegistry = {}));
/* *
 *
 *  Default Export
 *
 * */
export default SeriesRegistry;
