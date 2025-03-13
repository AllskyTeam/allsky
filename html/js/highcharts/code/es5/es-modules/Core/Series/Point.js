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
import AST from '../Renderer/HTML/AST.js';
import A from '../Animation/AnimationUtilities.js';
var animObject = A.animObject;
import D from '../Defaults.js';
var defaultOptions = D.defaultOptions;
import F from '../Templating.js';
var format = F.format;
import U from '../Utilities.js';
var addEvent = U.addEvent, crisp = U.crisp, erase = U.erase, extend = U.extend, fireEvent = U.fireEvent, getNestedProperty = U.getNestedProperty, isArray = U.isArray, isFunction = U.isFunction, isNumber = U.isNumber, isObject = U.isObject, merge = U.merge, pick = U.pick, syncTimeout = U.syncTimeout, removeEvent = U.removeEvent, uniqueKey = U.uniqueKey;
/* eslint-disable no-invalid-this, valid-jsdoc */
/* *
 *
 *  Class
 *
 * */
/**
 * The Point object. The point objects are generated from the `series.data`
 * configuration objects or raw numbers. They can be accessed from the
 * `Series.points` array. Other ways to instantiate points are through {@link
 * Highcharts.Series#addPoint} or {@link Highcharts.Series#setData}.
 *
 * @class
 * @name Highcharts.Point
 */
var Point = /** @class */ (function () {
    /**
     * Initialize the point. Called internally based on the `series.data`
     * option.
     *
     * @function Highcharts.Point#init
     *
     * @param {Highcharts.Series} series
     *        The series object containing this point.
     *
     * @param {Highcharts.PointOptionsType} options
     *        The data in either number, array or object format.
     *
     * @param {number} [x]
     *        Optionally, the X value of the point.
     *
     * @return {Highcharts.Point}
     *         The Point instance.
     *
     * @emits Highcharts.Point#event:afterInit
     */
    function Point(series, options, x) {
        var _a;
        this.formatPrefix = 'point';
        this.visible = true;
        // For tooltip and data label formatting
        this.point = this;
        this.series = series;
        this.applyOptions(options, x);
        // Add a unique ID to the point if none is assigned
        (_a = this.id) !== null && _a !== void 0 ? _a : (this.id = uniqueKey());
        this.resolveColor();
        series.chart.pointCount++;
        fireEvent(this, 'afterInit');
    }
    /**
     * For categorized axes this property holds the category name for the
     * point. For other axes it holds the X value.
     *
     * @name Highcharts.Point#category
     * @type {number|string}
     */
    /**
     * The name of the point. The name can be given as the first position of the
     * point configuration array, or as a `name` property in the configuration:
     *
     * @example
     * // Array config
     * data: [
     *     ['John', 1],
     *     ['Jane', 2]
     * ]
     *
     * // Object config
     * data: [{
     *        name: 'John',
     *        y: 1
     * }, {
     *     name: 'Jane',
     *     y: 2
     * }]
     *
     * @name Highcharts.Point#name
     * @type {string}
     */
    /**
     * The point's name if it is defined, or its category in case of a category,
     * otherwise the x value. Convenient for tooltip and data label formatting.
     *
     * @name Highcharts.Point#key
     * @type {number|string}
     */
    /**
     * The point's options as applied in the initial configuration, or
     * extended through `Point.update`.
     *
     * In TypeScript you have to extend `PointOptionsObject` via an
     * additional interface to allow custom data options:
     *
     * ```
     * declare interface PointOptionsObject {
     *     customProperty: string;
     * }
     * ```
     *
     * @name Highcharts.Point#options
     * @type {Highcharts.PointOptionsObject}
     */
    /**
     * The percentage for points in a stacked series, pies or gauges.
     *
     * @name Highcharts.Point#percentage
     * @type {number|undefined}
     */
    /**
     * The series object associated with the point.
     *
     * @name Highcharts.Point#series
     * @type {Highcharts.Series}
     */
    /**
     * The attributes of the rendered SVG shape like in `column` or `pie`
     * series.
     *
     * @readonly
     * @name Highcharts.Point#shapeArgs
     * @type {Readonly<Highcharts.SVGAttributes>|undefined}
     */
    /**
     * The total of values in either a stack for stacked series, or a pie in a
     * pie series.
     *
     * @name Highcharts.Point#total
     * @type {number|undefined}
     */
    /**
     * For certain series types, like pie charts, where individual points can
     * be shown or hidden.
     *
     * @name Highcharts.Point#visible
     * @type {boolean}
     * @default true
     */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Animate SVG elements associated with the point.
     *
     * @private
     * @function Highcharts.Point#animateBeforeDestroy
     */
    Point.prototype.animateBeforeDestroy = function () {
        var point = this, animateParams = { x: point.startXPos, opacity: 0 }, graphicalProps = point.getGraphicalProps();
        graphicalProps.singular.forEach(function (prop) {
            var isDataLabel = prop === 'dataLabel';
            point[prop] = point[prop].animate(isDataLabel ? {
                x: point[prop].startXPos,
                y: point[prop].startYPos,
                opacity: 0
            } : animateParams);
        });
        graphicalProps.plural.forEach(function (plural) {
            point[plural].forEach(function (item) {
                if (item.element) {
                    item.animate(extend({ x: point.startXPos }, (item.startYPos ? {
                        x: item.startXPos,
                        y: item.startYPos
                    } : {})));
                }
            });
        });
    };
    /**
     * Apply the options containing the x and y data and possible some extra
     * properties. Called on point init or from point.update.
     *
     * @private
     * @function Highcharts.Point#applyOptions
     *
     * @param {Highcharts.PointOptionsType} options
     *        The point options as defined in series.data.
     *
     * @param {number} [x]
     *        Optionally, the x value.
     *
     * @return {Highcharts.Point}
     *         The Point instance.
     */
    Point.prototype.applyOptions = function (options, x) {
        var point = this, series = point.series, pointValKey = series.options.pointValKey || series.pointValKey;
        options = Point.prototype.optionsToObject.call(this, options);
        // Copy options directly to point
        extend(point, options);
        point.options = point.options ?
            extend(point.options, options) :
            options;
        // Since options are copied into the Point instance, some accidental
        // options must be shielded (#5681)
        if (options.group) {
            delete point.group;
        }
        if (options.dataLabels) {
            delete point.dataLabels;
        }
        /**
         * The y value of the point.
         * @name Highcharts.Point#y
         * @type {number|undefined}
         */
        // For higher dimension series types. For instance, for ranges, point.y
        // is mapped to point.low.
        if (pointValKey) {
            point.y = Point.prototype.getNestedProperty.call(point, pointValKey);
        }
        // The point is initially selected by options (#5777)
        if (point.selected) {
            point.state = 'select';
        }
        /**
         * The x value of the point.
         * @name Highcharts.Point#x
         * @type {number}
         */
        // If no x is set by now, get auto incremented value. All points must
        // have an x value, however the y value can be null to create a gap in
        // the series
        if ('name' in point &&
            typeof x === 'undefined' &&
            series.xAxis &&
            series.xAxis.hasNames) {
            point.x = series.xAxis.nameToX(point);
        }
        if (typeof point.x === 'undefined' && series) {
            point.x = x !== null && x !== void 0 ? x : series.autoIncrement();
        }
        else if (isNumber(options.x) && series.options.relativeXValue) {
            point.x = series.autoIncrement(options.x);
            // If x is a string, try to parse it to a datetime
        }
        else if (typeof point.x === 'string') {
            x !== null && x !== void 0 ? x : (x = series.chart.time.parse(point.x));
            if (isNumber(x)) {
                point.x = x;
            }
        }
        point.isNull = this.isValid && !this.isValid();
        point.formatPrefix = point.isNull ? 'null' : 'point'; // #9233, #10874
        return point;
    };
    /**
     * Destroy a point to clear memory. Its reference still stays in
     * `series.data`.
     *
     * @private
     * @function Highcharts.Point#destroy
     */
    Point.prototype.destroy = function () {
        if (!this.destroyed) {
            var point_1 = this, series = point_1.series, chart = series.chart, dataSorting = series.options.dataSorting, hoverPoints = chart.hoverPoints, globalAnimation = point_1.series.chart.renderer.globalAnimation, animation = animObject(globalAnimation);
            /**
             * Allow to call after animation.
             * @private
             */
            var destroyPoint = function () {
                // Remove all events and elements
                if (point_1.graphic ||
                    point_1.graphics ||
                    point_1.dataLabel ||
                    point_1.dataLabels) {
                    removeEvent(point_1);
                    point_1.destroyElements();
                }
                for (var prop in point_1) { // eslint-disable-line guard-for-in
                    delete point_1[prop];
                }
            };
            if (point_1.legendItem) {
                // Pies have legend items
                chart.legend.destroyItem(point_1);
            }
            if (hoverPoints) {
                point_1.setState();
                erase(hoverPoints, point_1);
                if (!hoverPoints.length) {
                    chart.hoverPoints = null;
                }
            }
            if (point_1 === chart.hoverPoint) {
                point_1.onMouseOut();
            }
            // Remove properties after animation
            if (!dataSorting || !dataSorting.enabled) {
                destroyPoint();
            }
            else {
                this.animateBeforeDestroy();
                syncTimeout(destroyPoint, animation.duration);
            }
            chart.pointCount--;
        }
        this.destroyed = true;
    };
    /**
     * Destroy SVG elements associated with the point.
     *
     * @private
     * @function Highcharts.Point#destroyElements
     * @param {Highcharts.Dictionary<number>} [kinds]
     */
    Point.prototype.destroyElements = function (kinds) {
        var point = this, props = point.getGraphicalProps(kinds);
        props.singular.forEach(function (prop) {
            point[prop] = point[prop].destroy();
        });
        props.plural.forEach(function (plural) {
            point[plural].forEach(function (item) {
                if (item && item.element) {
                    item.destroy();
                }
            });
            delete point[plural];
        });
    };
    /**
     * Fire an event on the Point object.
     *
     * @private
     * @function Highcharts.Point#firePointEvent
     *
     * @param {string} eventType
     *        Type of the event.
     *
     * @param {Highcharts.Dictionary<any>|Event} [eventArgs]
     *        Additional event arguments.
     *
     * @param {Highcharts.EventCallbackFunction<Highcharts.Point>|Function} [defaultFunction]
     *        Default event handler.
     *
     * @emits Highcharts.Point#event:*
     */
    Point.prototype.firePointEvent = function (eventType, eventArgs, defaultFunction) {
        var point = this, series = this.series, seriesOptions = series.options;
        // Load event handlers on demand to save time on mouseover/out
        point.manageEvent(eventType);
        // Add default handler if in selection mode
        if (eventType === 'click' && seriesOptions.allowPointSelect) {
            defaultFunction = function (event) {
                // Control key is for Windows, meta (= Cmd key) for Mac, Shift
                // for Opera.
                if (!point.destroyed && point.select) { // #2911, #19075
                    point.select(null, event.ctrlKey || event.metaKey || event.shiftKey);
                }
            };
        }
        fireEvent(point, eventType, eventArgs, defaultFunction);
    };
    /**
     * Get the CSS class names for individual points. Used internally where the
     * returned value is set on every point.
     *
     * @function Highcharts.Point#getClassName
     *
     * @return {string}
     *         The class names.
     */
    Point.prototype.getClassName = function () {
        var point = this;
        return 'highcharts-point' +
            (point.selected ? ' highcharts-point-select' : '') +
            (point.negative ? ' highcharts-negative' : '') +
            (point.isNull ? ' highcharts-null-point' : '') +
            (typeof point.colorIndex !== 'undefined' ?
                ' highcharts-color-' + point.colorIndex : '') +
            (point.options.className ? ' ' + point.options.className : '') +
            (point.zone && point.zone.className ? ' ' +
                point.zone.className.replace('highcharts-negative', '') : '');
    };
    /**
     * Get props of all existing graphical point elements.
     *
     * @private
     * @function Highcharts.Point#getGraphicalProps
     */
    Point.prototype.getGraphicalProps = function (kinds) {
        var point = this, props = [], graphicalProps = { singular: [], plural: [] };
        var prop, i;
        kinds = kinds || { graphic: 1, dataLabel: 1 };
        if (kinds.graphic) {
            props.push('graphic', 'connector' // Used by dumbbell
            );
        }
        if (kinds.dataLabel) {
            props.push('dataLabel', 'dataLabelPath', 'dataLabelUpper');
        }
        i = props.length;
        while (i--) {
            prop = props[i];
            if (point[prop]) {
                graphicalProps.singular.push(prop);
            }
        }
        [
            'graphic',
            'dataLabel'
        ].forEach(function (prop) {
            var plural = prop + 's';
            if (kinds[prop] && point[plural]) {
                graphicalProps.plural.push(plural);
            }
        });
        return graphicalProps;
    };
    /**
     * Returns the value of the point property for a given value.
     * @private
     */
    Point.prototype.getNestedProperty = function (key) {
        if (!key) {
            return;
        }
        if (key.indexOf('custom.') === 0) {
            return getNestedProperty(key, this.options);
        }
        return this[key];
    };
    /**
     * In a series with `zones`, return the zone that the point belongs to.
     *
     * @function Highcharts.Point#getZone
     *
     * @return {Highcharts.SeriesZonesOptionsObject}
     *         The zone item.
     */
    Point.prototype.getZone = function () {
        var series = this.series, zones = series.zones, zoneAxis = series.zoneAxis || 'y';
        var zone, i = 0;
        zone = zones[i];
        while (this[zoneAxis] >= zone.value) {
            zone = zones[++i];
        }
        // For resetting or reusing the point (#8100)
        if (!this.nonZonedColor) {
            this.nonZonedColor = this.color;
        }
        if (zone && zone.color && !this.options.color) {
            this.color = zone.color;
        }
        else {
            this.color = this.nonZonedColor;
        }
        return zone;
    };
    /**
     * Utility to check if point has new shape type. Used in column series and
     * all others that are based on column series.
     * @private
     */
    Point.prototype.hasNewShapeType = function () {
        var point = this;
        var oldShapeType = point.graphic &&
            (point.graphic.symbolName || point.graphic.element.nodeName);
        return oldShapeType !== this.shapeType;
    };
    /**
     * Determine if point is valid.
     * @private
     * @function Highcharts.Point#isValid
     */
    Point.prototype.isValid = function () {
        return ((isNumber(this.x) ||
            this.x instanceof Date) &&
            isNumber(this.y));
    };
    /**
     * Transform number or array configs into objects. Also called for object
     * configs. Used internally to unify the different configuration formats for
     * points. For example, a simple number `10` in a line series will be
     * transformed to `{ y: 10 }`, and an array config like `[1, 10]` in a
     * scatter series will be transformed to `{ x: 1, y: 10 }`.
     *
     * @function Highcharts.Point#optionsToObject
     *
     * @param {Highcharts.PointOptionsType} options
     * Series data options.
     *
     * @return {Highcharts.Dictionary<*>}
     * Transformed point options.
     */
    Point.prototype.optionsToObject = function (options) {
        var _a;
        var series = this.series, keys = series.options.keys, pointArrayMap = keys || series.pointArrayMap || ['y'], valueCount = pointArrayMap.length;
        var ret = {}, firstItemType, i = 0, j = 0;
        if (isNumber(options) || options === null) {
            ret[pointArrayMap[0]] = options;
        }
        else if (isArray(options)) {
            // With leading x value
            if (!keys && options.length > valueCount) {
                firstItemType = typeof options[0];
                if (firstItemType === 'string') {
                    if ((_a = series.xAxis) === null || _a === void 0 ? void 0 : _a.dateTime) {
                        ret.x = series.chart.time.parse(options[0]);
                    }
                    else {
                        ret.name = options[0];
                    }
                }
                else if (firstItemType === 'number') {
                    ret.x = options[0];
                }
                i++;
            }
            while (j < valueCount) {
                // Skip undefined positions for keys
                if (!keys || typeof options[i] !== 'undefined') {
                    if (pointArrayMap[j].indexOf('.') > 0) {
                        // Handle nested keys, e.g. ['color.pattern.image']
                        // Avoid function call unless necessary.
                        Point.prototype.setNestedProperty(ret, options[i], pointArrayMap[j]);
                    }
                    else {
                        ret[pointArrayMap[j]] = options[i];
                    }
                }
                i++;
                j++;
            }
        }
        else if (typeof options === 'object') {
            ret = options;
            // This is the fastest way to detect if there are individual point
            // dataLabels that need to be considered in drawDataLabels. These
            // can only occur in object configs.
            if (options.dataLabels) {
                // Override the prototype function to always return true,
                // regardless of whether data labels are enabled series-wide
                series.hasDataLabels = function () { return true; };
            }
            // Same approach as above for markers
            if (options.marker) {
                series._hasPointMarkers = true;
            }
        }
        return ret;
    };
    /**
     * Get the pixel position of the point relative to the plot area.
     * @function Highcharts.Point#pos
     *
     * @sample highcharts/point/position
     *         Get point's position in pixels.
     *
     * @param {boolean} chartCoordinates
     * If true, the returned position is relative to the full chart area.
     * If false, it is relative to the plot area determined by the axes.
     *
     * @param {number|undefined} plotY
     * A custom plot y position to be computed. Used internally for some
     * series types that have multiple `y` positions, like area range (low
     * and high values).
     *
     * @return {Array<number>|undefined}
     * Coordinates of the point if the point exists.
     */
    Point.prototype.pos = function (chartCoordinates, plotY) {
        if (plotY === void 0) { plotY = this.plotY; }
        if (!this.destroyed) {
            var _a = this, plotX = _a.plotX, series = _a.series, chart = series.chart, xAxis = series.xAxis, yAxis = series.yAxis;
            var posX = 0, posY = 0;
            if (isNumber(plotX) && isNumber(plotY)) {
                if (chartCoordinates) {
                    posX = xAxis ? xAxis.pos : chart.plotLeft;
                    posY = yAxis ? yAxis.pos : chart.plotTop;
                }
                return chart.inverted && xAxis && yAxis ?
                    [yAxis.len - plotY + posY, xAxis.len - plotX + posX] :
                    [plotX + posX, plotY + posY];
            }
        }
    };
    /**
     * @private
     * @function Highcharts.Point#resolveColor
     */
    Point.prototype.resolveColor = function () {
        var series = this.series, optionsChart = series.chart.options.chart, styledMode = series.chart.styledMode;
        var color, colors, colorCount = optionsChart.colorCount, colorIndex;
        // Remove points nonZonedColor for later recalculation
        delete this.nonZonedColor;
        if (series.options.colorByPoint) {
            if (!styledMode) {
                colors = series.options.colors || series.chart.options.colors;
                color = colors[series.colorCounter];
                colorCount = colors.length;
            }
            colorIndex = series.colorCounter;
            series.colorCounter++;
            // Loop back to zero
            if (series.colorCounter === colorCount) {
                series.colorCounter = 0;
            }
        }
        else {
            if (!styledMode) {
                color = series.color;
            }
            colorIndex = series.colorIndex;
        }
        /**
         * The point's current color index, used in styled mode instead of
         * `color`. The color index is inserted in class names used for styling.
         *
         * @name Highcharts.Point#colorIndex
         * @type {number|undefined}
         */
        this.colorIndex = pick(this.options.colorIndex, colorIndex);
        /**
         * The point's current color.
         *
         * @name Highcharts.Point#color
         * @type {Highcharts.ColorString|Highcharts.GradientColorObject|Highcharts.PatternObject|undefined}
         */
        this.color = pick(this.options.color, color);
    };
    /**
     * Set a value in an object, on the property defined by key. The key
     * supports nested properties using dot notation. The function modifies the
     * input object and does not make a copy.
     *
     * @function Highcharts.Point#setNestedProperty<T>
     *
     * @param {T} object
     *        The object to set the value on.
     *
     * @param {*} value
     *        The value to set.
     *
     * @param {string} key
     *        Key to the property to set.
     *
     * @return {T}
     *         The modified object.
     */
    Point.prototype.setNestedProperty = function (object, value, key) {
        var nestedKeys = key.split('.');
        nestedKeys.reduce(function (result, key, i, arr) {
            var isLastKey = arr.length - 1 === i;
            result[key] = (isLastKey ?
                value :
                isObject(result[key], true) ?
                    result[key] :
                    {});
            return result[key];
        }, object);
        return object;
    };
    Point.prototype.shouldDraw = function () {
        return !this.isNull;
    };
    /**
     * Extendable method for formatting each point's tooltip line.
     *
     * @function Highcharts.Point#tooltipFormatter
     *
     * @param {string} pointFormat
     *        The point format.
     *
     * @return {string}
     *         A string to be concatenated in to the common tooltip text.
     */
    Point.prototype.tooltipFormatter = function (pointFormat) {
        var _a;
        // Insert options for valueDecimals, valuePrefix, and valueSuffix
        var _b = this.series, chart = _b.chart, _c = _b.pointArrayMap, pointArrayMap = _c === void 0 ? ['y'] : _c, tooltipOptions = _b.tooltipOptions, _d = tooltipOptions.valueDecimals, valueDecimals = _d === void 0 ? '' : _d, _e = tooltipOptions.valuePrefix, valuePrefix = _e === void 0 ? '' : _e, _f = tooltipOptions.valueSuffix, valueSuffix = _f === void 0 ? '' : _f;
        // Replace default point style with class name
        if (chart.styledMode) {
            pointFormat = ((_a = chart.tooltip) === null || _a === void 0 ? void 0 : _a.styledModeFormat(pointFormat)) ||
                pointFormat;
        }
        // Loop over the point array map and replace unformatted values with
        // sprintf formatting markup
        pointArrayMap.forEach(function (key) {
            key = '{point.' + key; // Without the closing bracket
            if (valuePrefix || valueSuffix) {
                pointFormat = pointFormat.replace(RegExp(key + '}', 'g'), valuePrefix + key + '}' + valueSuffix);
            }
            pointFormat = pointFormat.replace(RegExp(key + '}', 'g'), key + ':,.' + valueDecimals + 'f}');
        });
        return format(pointFormat, this, chart);
    };
    /**
     * Update point with new options (typically x/y data) and optionally redraw
     * the series.
     *
     * @sample highcharts/members/point-update-column/
     *         Update column value
     * @sample highcharts/members/point-update-pie/
     *         Update pie slice
     * @sample maps/members/point-update/
     *         Update map area value in Highmaps
     *
     * @function Highcharts.Point#update
     *
     * @param {Highcharts.PointOptionsType} options
     *        The point options. Point options are handled as described under
     *        the `series.type.data` item for each series type. For example
     *        for a line series, if options is a single number, the point will
     *        be given that number as the marin y value. If it is an array, it
     *        will be interpreted as x and y values respectively. If it is an
     *        object, advanced options are applied.
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart after the point is updated. If doing
     *        more operations on the chart, it is best practice to set
     *        `redraw` to false and call `chart.redraw()` after.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation=true]
     *        Whether to apply animation, and optionally animation
     *        configuration.
     *
     * @emits Highcharts.Point#event:update
     */
    Point.prototype.update = function (options, redraw, animation, runEvent) {
        var point = this, series = point.series, graphic = point.graphic, chart = series.chart, seriesOptions = series.options;
        var i;
        redraw = pick(redraw, true);
        /**
         * @private
         */
        function update() {
            point.applyOptions(options);
            // Update visuals, #4146
            // Handle mock graphic elements for a11y, #12718
            var hasMockGraphic = graphic && point.hasMockGraphic;
            var shouldDestroyGraphic = point.y === null ?
                !hasMockGraphic :
                hasMockGraphic;
            if (graphic && shouldDestroyGraphic) {
                point.graphic = graphic.destroy();
                delete point.hasMockGraphic;
            }
            if (isObject(options, true)) {
                // Destroy so we can get new elements
                if (graphic && graphic.element) {
                    // "null" is also a valid symbol
                    if (options &&
                        options.marker &&
                        typeof options.marker.symbol !== 'undefined') {
                        point.graphic = graphic.destroy();
                    }
                }
                if ((options === null || options === void 0 ? void 0 : options.dataLabels) && point.dataLabel) {
                    point.dataLabel = point.dataLabel.destroy(); // #2468
                }
            }
            // Record changes in the data table
            i = point.index;
            var row = {};
            for (var _i = 0, _a = series.dataColumnKeys(); _i < _a.length; _i++) {
                var key = _a[_i];
                row[key] = point[key];
            }
            series.dataTable.setRow(row, i);
            // Record the options to options.data. If the old or the new config
            // is an object, use point options, otherwise use raw options
            // (#4701, #4916).
            seriesOptions.data[i] = (isObject(seriesOptions.data[i], true) ||
                isObject(options, true)) ?
                point.options :
                pick(options, seriesOptions.data[i]);
            // Redraw
            series.isDirty = series.isDirtyData = true;
            if (!series.fixedBox && series.hasCartesianSeries) { // #1906, #2320
                chart.isDirtyBox = true;
            }
            if (seriesOptions.legendType === 'point') { // #1831, #1885
                chart.isDirtyLegend = true;
            }
            if (redraw) {
                chart.redraw(animation);
            }
        }
        // Fire the event with a default handler of doing the update
        if (runEvent === false) { // When called from setData
            update();
        }
        else {
            point.firePointEvent('update', { options: options }, update);
        }
    };
    /**
     * Remove a point and optionally redraw the series and if necessary the axes
     *
     * @sample highcharts/plotoptions/series-point-events-remove/
     *         Remove point and confirm
     * @sample highcharts/members/point-remove/
     *         Remove pie slice
     * @sample maps/members/point-remove/
     *         Remove selected points in Highmaps
     *
     * @function Highcharts.Point#remove
     *
     * @param {boolean} [redraw=true]
     *        Whether to redraw the chart or wait for an explicit call. When
     *        doing more operations on the chart, for example running
     *        `point.remove()` in a loop, it is best practice to set `redraw`
     *        to false and call `chart.redraw()` after.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation=false]
     *        Whether to apply animation, and optionally animation
     *        configuration.
     */
    Point.prototype.remove = function (redraw, animation) {
        this.series.removePoint(this.series.data.indexOf(this), redraw, animation);
    };
    /**
     * Toggle the selection status of a point.
     *
     * @see Highcharts.Chart#getSelectedPoints
     *
     * @sample highcharts/members/point-select/
     *         Select a point from a button
     * @sample highcharts/members/point-select-lasso/
     *         Lasso selection
     * @sample highcharts/chart/events-selection-points/
     *         Rectangle selection
     * @sample maps/series/data-id/
     *         Select a point in Highmaps
     *
     * @function Highcharts.Point#select
     *
     * @param {boolean} [selected]
     * When `true`, the point is selected. When `false`, the point is
     * unselected. When `null` or `undefined`, the selection state is toggled.
     *
     * @param {boolean} [accumulate=false]
     * When `true`, the selection is added to other selected points.
     * When `false`, other selected points are deselected. Internally in
     * Highcharts, when
     * [allowPointSelect](https://api.highcharts.com/highcharts/plotOptions.series.allowPointSelect)
     * is `true`, selected points are accumulated on Control, Shift or Cmd
     * clicking the point.
     *
     * @emits Highcharts.Point#event:select
     * @emits Highcharts.Point#event:unselect
     */
    Point.prototype.select = function (selected, accumulate) {
        var point = this, series = point.series, chart = series.chart;
        selected = pick(selected, !point.selected);
        this.selectedStaging = selected;
        // Fire the event with the default handler
        point.firePointEvent(selected ? 'select' : 'unselect', { accumulate: accumulate }, function () {
            /**
             * Whether the point is selected or not.
             *
             * @see Point#select
             * @see Chart#getSelectedPoints
             *
             * @name Highcharts.Point#selected
             * @type {boolean}
             */
            point.selected = point.options.selected = selected;
            series.options.data[series.data.indexOf(point)] =
                point.options;
            point.setState(selected && 'select');
            // Unselect all other points unless Ctrl or Cmd + click
            if (!accumulate) {
                chart.getSelectedPoints().forEach(function (loopPoint) {
                    var loopSeries = loopPoint.series;
                    if (loopPoint.selected && loopPoint !== point) {
                        loopPoint.selected = loopPoint.options.selected =
                            false;
                        loopSeries.options.data[loopSeries.data.indexOf(loopPoint)] = loopPoint.options;
                        // Programmatically selecting a point should restore
                        // normal state, but when click happened on other
                        // point, set inactive state to match other points
                        loopPoint.setState(chart.hoverPoints &&
                            loopSeries.options.inactiveOtherPoints ?
                            'inactive' : '');
                        loopPoint.firePointEvent('unselect');
                    }
                });
            }
        });
        delete this.selectedStaging;
    };
    /**
     * Runs on mouse over the point. Called internally from mouse and touch
     * events.
     *
     * @function Highcharts.Point#onMouseOver
     *
     * @param {Highcharts.PointerEventObject} [e]
     *        The event arguments.
     */
    Point.prototype.onMouseOver = function (e) {
        var point = this, series = point.series, _a = series.chart, inverted = _a.inverted, pointer = _a.pointer;
        if (pointer) {
            e = e ?
                pointer.normalize(e) :
                // In cases where onMouseOver is called directly without an
                // event
                pointer.getChartCoordinatesFromPoint(point, inverted);
            pointer.runPointActions(e, point);
        }
    };
    /**
     * Runs on mouse out from the point. Called internally from mouse and touch
     * events.
     *
     * @function Highcharts.Point#onMouseOut
     * @emits Highcharts.Point#event:mouseOut
     */
    Point.prototype.onMouseOut = function () {
        var point = this, chart = point.series.chart;
        point.firePointEvent('mouseOut');
        if (!point.series.options.inactiveOtherPoints) {
            (chart.hoverPoints || []).forEach(function (p) {
                p.setState();
            });
        }
        chart.hoverPoints = chart.hoverPoint = null;
    };
    /**
     * Manage specific event from the series' and point's options. Only do it on
     * demand, to save processing time on hovering.
     *
     * @private
     * @function Highcharts.Point#importEvents
     */
    Point.prototype.manageEvent = function (eventType) {
        var _a, _b, _c, _d, _e, _f, _g;
        var point = this, options = merge(point.series.options.point, point.options), userEvent = (_a = options.events) === null || _a === void 0 ? void 0 : _a[eventType];
        if (isFunction(userEvent) &&
            (!((_b = point.hcEvents) === null || _b === void 0 ? void 0 : _b[eventType]) ||
                // Some HC modules, like marker-clusters, draggable-poins etc.
                // use events in their logic, so we need to be sure, that
                // callback function is different
                ((_d = (_c = point.hcEvents) === null || _c === void 0 ? void 0 : _c[eventType]) === null || _d === void 0 ? void 0 : _d.map(function (el) { return el.fn; }).indexOf(userEvent)) === -1)) {
            // While updating the existing callback event the old one should be
            // removed
            (_e = point.importedUserEvent) === null || _e === void 0 ? void 0 : _e.call(point);
            point.importedUserEvent = addEvent(point, eventType, userEvent);
            if (point.hcEvents) {
                point.hcEvents[eventType].userEvent = true;
            }
        }
        else if (point.importedUserEvent &&
            !userEvent &&
            ((_f = point.hcEvents) === null || _f === void 0 ? void 0 : _f[eventType]) &&
            ((_g = point.hcEvents) === null || _g === void 0 ? void 0 : _g[eventType].userEvent)) {
            removeEvent(point, eventType);
            delete point.hcEvents[eventType];
            if (!Object.keys(point.hcEvents)) {
                delete point.importedUserEvent;
            }
        }
    };
    /**
     * Set the point's state.
     *
     * @function Highcharts.Point#setState
     *
     * @param {Highcharts.PointStateValue|""} [state]
     *        The new state, can be one of `'hover'`, `'select'`, `'inactive'`,
     *        or `''` (an empty string), `'normal'` or `undefined` to set to
     *        normal state.
     * @param {boolean} [move]
     *        State for animation.
     *
     * @emits Highcharts.Point#event:afterSetState
     */
    Point.prototype.setState = function (state, move) {
        var _a;
        var point = this, series = point.series, previousState = point.state, stateOptions = (series.options.states[state || 'normal'] ||
            {}), markerOptions = (defaultOptions.plotOptions[series.type].marker &&
            series.options.marker), normalDisabled = (markerOptions && markerOptions.enabled === false), markerStateOptions = ((markerOptions &&
            markerOptions.states &&
            markerOptions.states[state || 'normal']) || {}), stateDisabled = markerStateOptions.enabled === false, pointMarker = point.marker || {}, chart = series.chart, hasMarkers = (markerOptions && series.markerAttribs);
        var halo = series.halo, markerAttribs, pointAttribs, pointAttribsAnimation, stateMarkerGraphic = series.stateMarkerGraphic, newSymbol;
        state = state || ''; // Empty string
        if (
        // Already has this state
        (state === point.state && !move) ||
            // Selected points don't respond to hover
            (point.selected && state !== 'select') ||
            // Series' state options is disabled
            (stateOptions.enabled === false) ||
            // General point marker's state options is disabled
            (state && (stateDisabled ||
                (normalDisabled &&
                    markerStateOptions.enabled === false))) ||
            // Individual point marker's state options is disabled
            (state &&
                pointMarker.states &&
                pointMarker.states[state] &&
                pointMarker.states[state].enabled === false) // #1610
        ) {
            return;
        }
        point.state = state;
        if (hasMarkers) {
            markerAttribs = series.markerAttribs(point, state);
        }
        // Apply hover styles to the existing point
        // Prevent from mocked null points (#14966)
        if (point.graphic && !point.hasMockGraphic) {
            if (previousState) {
                point.graphic.removeClass('highcharts-point-' + previousState);
            }
            if (state) {
                point.graphic.addClass('highcharts-point-' + state);
            }
            if (!chart.styledMode) {
                pointAttribs = series.pointAttribs(point, state);
                pointAttribsAnimation = pick(chart.options.chart.animation, stateOptions.animation);
                var opacity_1 = pointAttribs.opacity;
                // Some inactive points (e.g. slices in pie) should apply
                // opacity also for their labels
                if (series.options.inactiveOtherPoints && isNumber(opacity_1)) {
                    (point.dataLabels || []).forEach(function (label) {
                        if (label &&
                            !label.hasClass('highcharts-data-label-hidden')) {
                            label.animate({ opacity: opacity_1 }, pointAttribsAnimation);
                            if (label.connector) {
                                label.connector.animate({ opacity: opacity_1 }, pointAttribsAnimation);
                            }
                        }
                    });
                }
                point.graphic.animate(pointAttribs, pointAttribsAnimation);
            }
            if (markerAttribs) {
                point.graphic.animate(markerAttribs, pick(
                // Turn off globally:
                chart.options.chart.animation, markerStateOptions.animation, markerOptions.animation));
            }
            // Zooming in from a range with no markers to a range with markers
            if (stateMarkerGraphic) {
                stateMarkerGraphic.hide();
            }
        }
        else {
            // If a graphic is not applied to each point in the normal state,
            // create a shared graphic for the hover state
            if (state && markerStateOptions) {
                newSymbol = pointMarker.symbol || series.symbol;
                // If the point has another symbol than the previous one, throw
                // away the state marker graphic and force a new one (#1459)
                if (stateMarkerGraphic &&
                    stateMarkerGraphic.currentSymbol !== newSymbol) {
                    stateMarkerGraphic = stateMarkerGraphic.destroy();
                }
                // Add a new state marker graphic
                if (markerAttribs) {
                    if (!stateMarkerGraphic) {
                        if (newSymbol) {
                            series.stateMarkerGraphic = stateMarkerGraphic =
                                chart.renderer
                                    .symbol(newSymbol, markerAttribs.x, markerAttribs.y, markerAttribs.width, markerAttribs.height, merge(markerOptions, markerStateOptions))
                                    .add(series.markerGroup);
                            stateMarkerGraphic.currentSymbol = newSymbol;
                        }
                        // Move the existing graphic
                    }
                    else {
                        stateMarkerGraphic[move ? 'animate' : 'attr']({
                            x: markerAttribs.x,
                            y: markerAttribs.y
                        });
                    }
                }
                if (!chart.styledMode && stateMarkerGraphic &&
                    point.state !== 'inactive') {
                    stateMarkerGraphic.attr(series.pointAttribs(point, state));
                }
            }
            if (stateMarkerGraphic) {
                stateMarkerGraphic[state && point.isInside ? 'show' : 'hide'](); // #2450
                stateMarkerGraphic.element.point = point; // #4310
                stateMarkerGraphic.addClass(point.getClassName(), true);
            }
        }
        // Show me your halo
        var haloOptions = stateOptions.halo;
        var markerGraphic = (point.graphic || stateMarkerGraphic);
        var markerVisibility = (markerGraphic && markerGraphic.visibility || 'inherit');
        if (haloOptions &&
            haloOptions.size &&
            markerGraphic &&
            markerVisibility !== 'hidden' &&
            !point.isCluster) {
            if (!halo) {
                series.halo = halo = chart.renderer.path()
                    // #5818, #5903, #6705
                    .add(markerGraphic.parentGroup);
            }
            halo.show()[move ? 'animate' : 'attr']({
                d: point.haloPath(haloOptions.size)
            });
            halo.attr({
                'class': 'highcharts-halo highcharts-color-' +
                    pick(point.colorIndex, series.colorIndex) +
                    (point.className ? ' ' + point.className : ''),
                'visibility': markerVisibility,
                'zIndex': -1 // #4929, #8276
            });
            halo.point = point; // #6055
            if (!chart.styledMode) {
                halo.attr(extend({
                    'fill': point.color || series.color,
                    'fill-opacity': haloOptions.opacity
                }, AST.filterUserAttributes(haloOptions.attributes || {})));
            }
        }
        else if (((_a = halo === null || halo === void 0 ? void 0 : halo.point) === null || _a === void 0 ? void 0 : _a.haloPath) &&
            !halo.point.destroyed) {
            // Animate back to 0 on the current halo point (#6055)
            halo.animate({ d: halo.point.haloPath(0) }, null, 
            // Hide after unhovering. The `complete` callback runs in the
            // halo's context (#7681).
            halo.hide);
        }
        fireEvent(point, 'afterSetState', { state: state });
    };
    /**
     * Get the path definition for the halo, which is usually a shadow-like
     * circle around the currently hovered point.
     *
     * @function Highcharts.Point#haloPath
     *
     * @param {number} size
     *        The radius of the circular halo.
     *
     * @return {Highcharts.SVGPathArray}
     *         The path definition.
     */
    Point.prototype.haloPath = function (size) {
        var pos = this.pos();
        return pos ? this.series.chart.renderer.symbols.circle(crisp(pos[0], 1) - size, pos[1] - size, size * 2, size * 2) : [];
    };
    return Point;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Point;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Function callback when a series point is clicked. Return false to cancel the
 * action.
 *
 * @callback Highcharts.PointClickCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        The point where the event occurred.
 *
 * @param {Highcharts.PointClickEventObject} event
 *        Event arguments.
 */
/**
 * Common information for a click event on a series point.
 *
 * @interface Highcharts.PointClickEventObject
 * @extends Highcharts.PointerEventObject
 */ /**
* Clicked point.
* @name Highcharts.PointClickEventObject#point
* @type {Highcharts.Point}
*/
/**
 * Gets fired when the mouse leaves the area close to the point.
 *
 * @callback Highcharts.PointMouseOutCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {global.PointerEvent} event
 *        Event that occurred.
 */
/**
 * Gets fired when the mouse enters the area close to the point.
 *
 * @callback Highcharts.PointMouseOverCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {global.Event} event
 *        Event that occurred.
 */
/**
 * The generic point options for all series.
 *
 * In TypeScript you have to extend `PointOptionsObject` with an additional
 * declaration to allow custom data options:
 *
 * ```
 * declare interface PointOptionsObject {
 *     customProperty: string;
 * }
 * ```
 *
 * @interface Highcharts.PointOptionsObject
 */
/**
 * Possible option types for a data point. Use `null` to indicate a gap.
 *
 * @typedef {number|string|Highcharts.PointOptionsObject|Array<(number|string|null)>|null} Highcharts.PointOptionsType
 */
/**
 * Gets fired when the point is removed using the `.remove()` method.
 *
 * @callback Highcharts.PointRemoveCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {global.Event} event
 *        Event that occurred.
 */
/**
 * Possible key values for the point state options.
 *
 * @typedef {"hover"|"inactive"|"normal"|"select"} Highcharts.PointStateValue
 */
/**
 * Gets fired when the point is updated programmatically through the `.update()`
 * method.
 *
 * @callback Highcharts.PointUpdateCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {Highcharts.PointUpdateEventObject} event
 *        Event that occurred.
 */
/**
 * Information about the update event.
 *
 * @interface Highcharts.PointUpdateEventObject
 * @extends global.Event
 */ /**
* Options data of the update event.
* @name Highcharts.PointUpdateEventObject#options
* @type {Highcharts.PointOptionsType}
*/
/**
 * @interface Highcharts.PointEventsOptionsObject
 */ /**
* Fires when the point is selected either programmatically or following a click
* on the point. One parameter, `event`, is passed to the function. Returning
* `false` cancels the operation.
* @name Highcharts.PointEventsOptionsObject#select
* @type {Highcharts.PointSelectCallbackFunction|undefined}
*/ /**
* Fires when the point is unselected either programmatically or following a
* click on the point. One parameter, `event`, is passed to the function.
* Returning `false` cancels the operation.
* @name Highcharts.PointEventsOptionsObject#unselect
* @type {Highcharts.PointUnselectCallbackFunction|undefined}
*/
/**
 * Information about the select/unselect event.
 *
 * @interface Highcharts.PointInteractionEventObject
 * @extends global.Event
 */ /**
* @name Highcharts.PointInteractionEventObject#accumulate
* @type {boolean}
*/
/**
 * Gets fired when the point is selected either programmatically or following a
 * click on the point.
 *
 * @callback Highcharts.PointSelectCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {Highcharts.PointInteractionEventObject} event
 *        Event that occurred.
 */
/**
 * Fires when the point is unselected either programmatically or following a
 * click on the point.
 *
 * @callback Highcharts.PointUnselectCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        Point where the event occurred.
 *
 * @param {Highcharts.PointInteractionEventObject} event
 *        Event that occurred.
 */
''; // Keeps doclets above in JS file.
