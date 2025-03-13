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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject, stop = A.stop;
import ColorMapComposition from '../ColorMapComposition.js';
import CU from '../CenteredUtilities.js';
import H from '../../Core/Globals.js';
var noop = H.noop;
import MapChart from '../../Core/Chart/MapChart.js';
var splitPath = MapChart.splitPath;
import MapPoint from './MapPoint.js';
import MapSeriesDefaults from './MapSeriesDefaults.js';
import MapView from '../../Maps/MapView.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var _a = SeriesRegistry.seriesTypes, 
// Indirect dependency to keep product size low
ColumnSeries = _a.column, ScatterSeries = _a.scatter;
import U from '../../Core/Utilities.js';
var extend = U.extend, find = U.find, fireEvent = U.fireEvent, getNestedProperty = U.getNestedProperty, isArray = U.isArray, defined = U.defined, isNumber = U.isNumber, isObject = U.isObject, merge = U.merge, objectEach = U.objectEach, pick = U.pick, splat = U.splat;
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
    __extends(MapSeries, _super);
    function MapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
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
        var _a = this, chart = _a.chart, group = _a.group, animation = animObject(this.options.animation);
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
        var series = this, _a = this, chart = _a.chart, group = _a.group, _b = _a.transformGroups, transformGroups = _b === void 0 ? [] : _b, mapView = chart.mapView, renderer = chart.renderer;
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
                        var animateIn = (isNumber(params['stroke-width']) &&
                            !isNumber(graphic['stroke-width'])), animateOut = (isNumber(graphic['stroke-width']) &&
                            !isNumber(params['stroke-width']));
                        // When strokeWidth is animating
                        if (animateIn || animateOut) {
                            var strokeWidth = pick(series.getStrokeWidth(series.options), 1 // Styled mode
                            ), inheritedStrokeWidth = (strokeWidth /
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
                        var ret = animate_1.call(graphic, params, options, animateOut ? function () {
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
            var view = i === 0 ? mapView : mapView.insets[i - 1], svgTransform = view.getSVGTransform(), strokeWidth = pick(_this.getStrokeWidth(_this.options), 1 // Styled mode
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
            var scale = svgTransform.scaleX, flipFactor = svgTransform.scaleY > 0 ? 1 : -1;
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
                var step_1 = function (now, fx) {
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
                var animOptions = merge(animObject(renderer.globalAnimation)), userStep_1 = animOptions.step;
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
                    fireEvent(this, 'mapZoomComplete');
                }.bind(_this));
                // When dragging or first rendering, animation is off
            }
            else {
                stop(transformGroup);
                transformGroup.attr(merge(svgTransform, { 'stroke-width': strokeWidth / scale }));
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
            var _a = this.chart.mapView, insets_1 = _a.insets, projection_1 = _a.projection, allBounds_1 = [];
            // Find the bounding box of each point
            (this.points || []).forEach(function (point) {
                if (point.path || point.geometry) {
                    // @todo Try to put these two conversions in
                    // MapPoint.applyOptions
                    if (typeof point.path === 'string') {
                        point.path = splitPath(point.path);
                        // Legacy one-dimensional array
                    }
                    else if (isArray(point.path) &&
                        point.path[0] === 'M') {
                        point.path = _this.chart.renderer
                            .pathToSegments(point.path);
                    }
                    // The first time a map point is used, analyze its box
                    if (!point.bounds) {
                        var bounds = point.getProjectedBounds(projection_1);
                        if (bounds) {
                            point.labelrank = pick(point.labelrank, 
                            // Bigger shape, higher rank
                            ((bounds.x2 - bounds.x1) *
                                (bounds.y2 - bounds.y1)));
                            var midX_1 = bounds.midX, midY_1 = bounds.midY;
                            if (insets_1 && isNumber(midX_1) && isNumber(midY_1)) {
                                var inset = find(insets_1, function (inset) { return inset.isInside({
                                    x: midX_1, y: midY_1
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
            this.bounds = MapView.compositeBounds(allBounds_1);
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
        var _b = point.series.chart, mapView = _b.mapView, styledMode = _b.styledMode;
        var attr = styledMode ?
            this.colorAttribs(point) :
            ColumnSeries.prototype.pointAttribs.call(this, point, state);
        // Individual stroke width
        var pointStrokeWidth = this.getStrokeWidth(point.options);
        // Handle state specific border or line width
        if (state) {
            var stateOptions = merge(this.options.states &&
                this.options.states[state], point.options.states &&
                point.options.states[state] ||
                {}), stateStrokeWidth = this.getStrokeWidth(stateOptions);
            if (defined(stateStrokeWidth)) {
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
            isNumber(seriesStrokeWidth)) {
            pointStrokeWidth = seriesStrokeWidth / mapView.getScale();
        }
        // Invisible map points means that the data value is removed from the
        // map, but not the map area shape itself. Instead it is rendered like a
        // null point. To fully remove a map area, it should be removed from the
        // mapData.
        if (!point.visible) {
            attr.fill = this.options.nullColor;
        }
        if (defined(pointStrokeWidth)) {
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
        var options = this.options, data = options.data, chart = this.chart, chartOptions = chart.options.chart, joinBy = this.joinBy, pointArrayMap = options.keys || this.pointArrayMap, dataUsed = [], mapMap = {}, mapView = this.chart.mapView, mapDataObject = mapView && (
        // Get map either from series or global
        isObject(options.mapData, true) ?
            mapView.getGeoMap(options.mapData) : mapView.geoMap), 
        // Pick up transform definitions for chart
        mapTransforms = chart.mapTransforms =
            chartOptions.mapTransforms ||
                mapDataObject && mapDataObject['hc-transform'] ||
                chart.mapTransforms;
        var mapPoint, props;
        // Cache cos/sin of transform rotation angle
        if (mapTransforms) {
            objectEach(mapTransforms, function (transform) {
                if (transform.rotation) {
                    transform.cosAngle = Math.cos(transform.rotation);
                    transform.sinAngle = Math.sin(transform.rotation);
                }
            });
        }
        var mapData;
        if (isArray(options.mapData)) {
            mapData = options.mapData;
        }
        else if (mapDataObject && mapDataObject.type === 'FeatureCollection') {
            this.mapTitle = mapDataObject.title;
            mapData = H.geojson(mapDataObject, this.type, this);
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
                if (isNumber(val)) {
                    processedData[i] = {
                        value: val
                    };
                }
                else if (isArray(val)) {
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
                                MapPoint.prototype.setNestedProperty(processedData[i], val[ix], pointArrayMap[j]);
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
                    var mapKey = getNestedProperty(joinKey_1, pointOptions);
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
                        processedData.push(merge(mapPoint, { value: null }));
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
        var options = _super.prototype.setOptions.call(this, itemOptions);
        var joinBy = options.joinBy;
        if (options.joinBy === null) {
            joinBy = '_i';
        }
        if (joinBy) {
            this.joinBy = splat(joinBy);
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
        var series = this, doFullTranslate = series.doFullTranslate(), mapView = this.chart.mapView, projection = mapView && mapView.projection;
        // Recalculate box on updated data
        if (this.chart.hasRendered && (this.isDirtyData || !this.hasRendered)) {
            this.processData();
            this.generatePoints();
            delete this.bounds;
            if (mapView &&
                !mapView.userOptions.center &&
                !isNumber(mapView.userOptions.zoom) &&
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
                var svgTransform = (isNumber(point.insetIndex) &&
                    mapView.insets[point.insetIndex].getSVGTransform()) || mainSvgTransform_1;
                // Record the middle point (loosely based on centroid),
                // determined by the middleX and middleY options.
                if (svgTransform &&
                    point.bounds &&
                    isNumber(point.bounds.midX) &&
                    isNumber(point.bounds.midY)) {
                    point.plotX = point.bounds.midX * svgTransform.scaleX +
                        svgTransform.translateX;
                    point.plotY = point.bounds.midY * svgTransform.scaleY +
                        svgTransform.translateY;
                }
                if (doFullTranslate) {
                    point.shapeType = 'path';
                    point.shapeArgs = {
                        d: MapPoint.getProjectedPath(point, projection)
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
        fireEvent(series, 'afterTranslate');
    };
    MapSeries.prototype.update = function (options) {
        var _this = this;
        var _a;
        // Calculate and set the recommended map view after every series update
        // if new mapData is set
        if (options.mapData) {
            (_a = this.chart.mapView) === null || _a === void 0 ? void 0 : _a.recommendMapView(this.chart, __spreadArray([
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
    MapSeries.defaultOptions = merge(ScatterSeries.defaultOptions, MapSeriesDefaults);
    return MapSeries;
}(ScatterSeries));
extend(MapSeries.prototype, {
    type: 'map',
    axisTypes: ColorMapComposition.seriesMembers.axisTypes,
    colorAttribs: ColorMapComposition.seriesMembers.colorAttribs,
    colorKey: ColorMapComposition.seriesMembers.colorKey,
    // When tooltip is not shared, this series (and derivatives) requires
    // direct touch/hover. KD-tree does not apply.
    directTouch: true,
    // We need the points' bounding boxes in order to draw the data labels,
    // so we skip it now and call it from drawPoints instead.
    drawDataLabels: noop,
    // No graph for the map series
    drawGraph: noop,
    forceDL: true,
    getCenter: CU.getCenter,
    getExtremesFromAll: true,
    getSymbol: noop,
    isCartesian: false,
    parallelArrays: ColorMapComposition.seriesMembers.parallelArrays,
    pointArrayMap: ColorMapComposition.seriesMembers.pointArrayMap,
    pointClass: MapPoint,
    // X axis and Y axis must have same translation slope
    preserveAspectRatio: true,
    searchPoint: noop,
    trackerGroups: ColorMapComposition.seriesMembers.trackerGroups,
    // Get axis extremes from paths, not values
    useMapGeometry: true
});
ColorMapComposition.compose(MapSeries);
SeriesRegistry.registerSeriesType('map', MapSeries);
/* *
 *
 *  Default Export
 *
 * */
export default MapSeries;
