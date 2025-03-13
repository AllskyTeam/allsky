/**
 *
 *  Events generator for Stock tools
 *
 *  (c) 2009-2024 Paweł Fus
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../../Core/Globals.js';
import STU from './StockToolsUtilities.js';
var addFlagFromForm = STU.addFlagFromForm, attractToPoint = STU.attractToPoint, isNotNavigatorYAxis = STU.isNotNavigatorYAxis, isPriceIndicatorEnabled = STU.isPriceIndicatorEnabled, manageIndicators = STU.manageIndicators, updateHeight = STU.updateHeight, updateNthPoint = STU.updateNthPoint, updateRectSize = STU.updateRectSize;
import U from '../../Core/Utilities.js';
var fireEvent = U.fireEvent, merge = U.merge;
/* *
 *
 *  Constants
 *
 * */
/**
 * @sample {highstock} stock/stocktools/custom-stock-tools-bindings
 *         Custom stock tools bindings
 *
 * @type         {Highcharts.Dictionary<Highcharts.NavigationBindingsOptionsObject>}
 * @since        7.0.0
 * @optionparent navigation.bindings
 */
var StockToolsBindings = {
    // Line type annotations:
    /**
     * A segment annotation bindings. Includes `start` and one event in `steps`
     * array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-segment", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    segment: {
        /** @ignore-option */
        className: 'highcharts-segment',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'segment',
                type: 'crookedLine',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.segment.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A segment with an arrow annotation bindings. Includes `start` and one
     * event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-arrow-segment", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    arrowSegment: {
        /** @ignore-option */
        className: 'highcharts-arrow-segment',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'arrowSegment',
                type: 'crookedLine',
                typeOptions: {
                    line: {
                        markerEnd: 'arrow'
                    },
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.arrowSegment.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A ray annotation bindings. Includes `start` and one event in `steps`
     * array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-ray", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    ray: {
        /** @ignore-option */
        className: 'highcharts-ray',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'ray',
                type: 'infinityLine',
                typeOptions: {
                    type: 'ray',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.ray.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A ray with an arrow annotation bindings. Includes `start` and one event
     * in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-arrow-ray", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    arrowRay: {
        /** @ignore-option */
        className: 'highcharts-arrow-ray',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'arrowRay',
                type: 'infinityLine',
                typeOptions: {
                    type: 'ray',
                    line: {
                        markerEnd: 'arrow'
                    },
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.arrowRay.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A line annotation. Includes `start` and one event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-infinity-line", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    infinityLine: {
        /** @ignore-option */
        className: 'highcharts-infinity-line',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'infinityLine',
                type: 'infinityLine',
                typeOptions: {
                    type: 'line',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.infinityLine.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A line with arrow annotation. Includes `start` and one event in `steps`
     * array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-arrow-infinity-line", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    arrowInfinityLine: {
        /** @ignore-option */
        className: 'highcharts-arrow-infinity-line',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'arrowInfinityLine',
                type: 'infinityLine',
                typeOptions: {
                    type: 'line',
                    line: {
                        markerEnd: 'arrow'
                    },
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }, {
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.arrowInfinityLine
                .annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1)
        ]
    },
    /**
     * A horizontal line annotation. Includes `start` event.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-horizontal-line", "start": function() {}, "annotationsOptions": {}}
     */
    horizontalLine: {
        /** @ignore-option */
        className: 'highcharts-horizontal-line',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'horizontalLine',
                type: 'infinityLine',
                draggable: 'y',
                typeOptions: {
                    type: 'horizontalLine',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings
                .horizontalLine.annotationsOptions);
            this.chart.addAnnotation(options);
        }
    },
    /**
     * A vertical line annotation. Includes `start` event.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-vertical-line", "start": function() {}, "annotationsOptions": {}}
     */
    verticalLine: {
        /** @ignore-option */
        className: 'highcharts-vertical-line',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'verticalLine',
                type: 'infinityLine',
                draggable: 'x',
                typeOptions: {
                    type: 'verticalLine',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.verticalLine.annotationsOptions);
            this.chart.addAnnotation(options);
        }
    },
    /**
     * Crooked line (three points) annotation bindings. Includes `start` and two
     * events in `steps` (for second and third points in crooked line) array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-crooked3", "start": function() {}, "steps": [function() {}, function() {}], "annotationsOptions": {}}
     */
    // Crooked Line type annotations:
    crooked3: {
        /** @ignore-option */
        className: 'highcharts-crooked3',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'crooked3',
                type: 'crookedLine',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                }
            }, navigation.annotationsOptions, navigation.bindings.crooked3.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateNthPoint(2)
        ]
    },
    /**
     * Crooked line (five points) annotation bindings. Includes `start` and four
     * events in `steps` (for all consequent points in crooked line) array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-crooked5", "start": function() {}, "steps": [function() {}, function() {}, function() {}, function() {}], "annotationsOptions": {}}
     */
    crooked5: {
        /** @ignore-option */
        className: 'highcharts-crooked5',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'crooked5',
                type: 'crookedLine',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                }
            }, navigation.annotationsOptions, navigation.bindings.crooked5.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateNthPoint(2),
            updateNthPoint(3),
            updateNthPoint(4)
        ]
    },
    /**
     * Elliott wave (three points) annotation bindings. Includes `start` and two
     * events in `steps` (for second and third points) array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-elliott3", "start": function() {}, "steps": [function() {}, function() {}], "annotationsOptions": {}}
     */
    elliott3: {
        /** @ignore-option */
        className: 'highcharts-elliott3',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'elliott3',
                type: 'elliottWave',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.elliott3.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateNthPoint(2),
            updateNthPoint(3)
        ]
    },
    /**
     * Elliott wave (five points) annotation bindings. Includes `start` and four
     * event in `steps` (for all consequent points in Elliott wave) array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-elliott3", "start": function() {}, "steps": [function() {}, function() {}, function() {}, function() {}], "annotationsOptions": {}}
     */
    elliott5: {
        /** @ignore-option */
        className: 'highcharts-elliott5',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'elliott5',
                type: 'elliottWave',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.elliott5.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateNthPoint(2),
            updateNthPoint(3),
            updateNthPoint(4),
            updateNthPoint(5)
        ]
    },
    /**
     * A measure (x-dimension) annotation bindings. Includes `start` and one
     * event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-measure-x", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    measureX: {
        /** @ignore-option */
        className: 'highcharts-measure-x',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'measure',
                type: 'measure',
                typeOptions: {
                    selectType: 'x',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    point: { x: x, y: y },
                    crosshairX: {
                        strokeWidth: 1,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    },
                    crosshairY: {
                        enabled: false,
                        strokeWidth: 0,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    },
                    background: {
                        width: 0,
                        height: 0,
                        strokeWidth: 0,
                        stroke: "#ffffff" /* Palette.backgroundColor */
                    }
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.measureX.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateRectSize
        ]
    },
    /**
     * A measure (y-dimension) annotation bindings. Includes `start` and one
     * event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-measure-y", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    measureY: {
        /** @ignore-option */
        className: 'highcharts-measure-y',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'measure',
                type: 'measure',
                typeOptions: {
                    selectType: 'y',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    point: { x: x, y: y },
                    crosshairX: {
                        enabled: false,
                        strokeWidth: 0,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    },
                    crosshairY: {
                        strokeWidth: 1,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    },
                    background: {
                        width: 0,
                        height: 0,
                        strokeWidth: 0,
                        stroke: "#ffffff" /* Palette.backgroundColor */
                    }
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.measureY.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateRectSize
        ]
    },
    /**
     * A measure (xy-dimension) annotation bindings. Includes `start` and one
     * event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-measure-xy", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    measureXY: {
        /** @ignore-option */
        className: 'highcharts-measure-xy',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'measure',
                type: 'measure',
                typeOptions: {
                    selectType: 'xy',
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    point: { x: x, y: y },
                    background: {
                        width: 0,
                        height: 0,
                        strokeWidth: 0,
                        stroke: "#ffffff" /* Palette.backgroundColor */
                    },
                    crosshairX: {
                        strokeWidth: 1,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    },
                    crosshairY: {
                        strokeWidth: 1,
                        stroke: "#000000" /* Palette.neutralColor100 */
                    }
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.measureXY.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateRectSize
        ]
    },
    // Advanced type annotations:
    /**
     * A fibonacci annotation bindings. Includes `start` and two events in
     * `steps` array (updates second point, then height).
     *
     *   @sample {highstock} stock/stocktools/custom-stock-tools-bindings
     *     Custom stock tools bindings
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-fibonacci", "start": function() {}, "steps": [function() {}, function() {}], "annotationsOptions": { "typeOptions": { "reversed": false }}}
     */
    fibonacci: {
        className: 'highcharts-fibonacci',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'fibonacci',
                type: 'fibonacci',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.fibonacci.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateHeight
        ]
    },
    /**
     * A parallel channel (tunnel) annotation bindings. Includes `start` and
     * two events in `steps` array (updates second point, then height).
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-parallel-channel", "start": function() {}, "steps": [function() {}, function() {}], "annotationsOptions": {}}
     */
    parallelChannel: {
        /** @ignore-option */
        className: 'highcharts-parallel-channel',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'parallelChannel',
                type: 'tunnel',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [
                        { x: x, y: y },
                        { x: x, y: y }
                    ]
                }
            }, navigation.annotationsOptions, navigation.bindings.parallelChannel
                .annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateHeight
        ]
    },
    /**
     * An Andrew's pitchfork annotation bindings. Includes `start` and two
     * events in `steps` array (sets second and third control points).
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-pitchfork", "start": function() {}, "steps": [function() {}, function() {}], "annotationsOptions": {}}
     */
    pitchfork: {
        /** @ignore-option */
        className: 'highcharts-pitchfork',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var x = coordsX.value, y = coordsY.value, navigation = this.chart.options.navigation, options = merge({
                langKey: 'pitchfork',
                type: 'pitchfork',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value,
                            y: coordsY.value,
                            controlPoint: {
                                style: {
                                    fill: "#f21313" /* Palette.negativeColor */
                                }
                            }
                        },
                        { x: x, y: y },
                        { x: x, y: y }
                    ],
                    innerBackground: {
                        fill: 'rgba(100, 170, 255, 0.8)'
                    }
                },
                shapeOptions: {
                    strokeWidth: 2
                }
            }, navigation.annotationsOptions, navigation.bindings.pitchfork.annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        steps: [
            updateNthPoint(1),
            updateNthPoint(2)
        ]
    },
    // Labels with arrow and auto increments
    /**
     * A vertical counter annotation bindings. Includes `start` event. On click,
     * finds the closest point and marks it with a numeric annotation -
     * incrementing counter on each add.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-vertical-counter", "start": function() {}, "annotationsOptions": {}}
     */
    verticalCounter: {
        /** @ignore-option */
        className: 'highcharts-vertical-counter',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var closestPoint = attractToPoint(e, this.chart);
            // Exit if clicked out of axes area
            if (!closestPoint) {
                return;
            }
            this.verticalCounter = this.verticalCounter || 0;
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'verticalCounter',
                type: 'verticalLine',
                typeOptions: {
                    point: {
                        x: closestPoint.x,
                        y: closestPoint.y,
                        xAxis: closestPoint.xAxis,
                        yAxis: closestPoint.yAxis
                    },
                    label: {
                        offset: closestPoint.below ? 40 : -40,
                        text: this.verticalCounter.toString()
                    }
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */,
                        fontSize: '0.7em'
                    }
                },
                shapeOptions: {
                    stroke: 'rgba(0, 0, 0, 0.75)',
                    strokeWidth: 1
                }
            }, navigation.annotationsOptions, navigation.bindings
                .verticalCounter.annotationsOptions), annotation = this.chart.addAnnotation(options);
            this.verticalCounter++;
            annotation.options.events.click.call(annotation, {});
        }
    },
    /**
     * A time cycles annotation bindings. Includes `start` event and 1 `step`
     * event. first click marks the beginning of the circle, and the second one
     * sets its diameter.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-time-cycles", "start": function() {}, "steps": [function (){}] "annotationsOptions": {}}
     */
    timeCycles: {
        className: 'highcharts-time-cycles',
        start: function (e) {
            var closestPoint = attractToPoint(e, this.chart);
            // Exit if clicked out of axes area
            if (!closestPoint) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'timeCycles',
                type: 'timeCycles',
                typeOptions: {
                    xAxis: closestPoint.xAxis,
                    yAxis: closestPoint.yAxis,
                    points: [{
                            x: closestPoint.x
                        }, {
                            x: closestPoint.x
                        }],
                    line: {
                        stroke: 'rgba(0, 0, 0, 0.75)',
                        fill: 'transparent',
                        strokeWidth: 2
                    }
                }
            }, navigation.annotationsOptions, navigation.bindings.timeCycles.annotationsOptions), annotation = this.chart.addAnnotation(options);
            annotation.options.events.click.call(annotation, {});
            return annotation;
        },
        steps: [
            updateNthPoint(1)
        ]
    },
    verticalLabel: {
        /** @ignore-option */
        className: 'highcharts-vertical-label',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var closestPoint = attractToPoint(e, this.chart);
            // Exit if clicked out of axes area
            if (!closestPoint) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'verticalLabel',
                type: 'verticalLine',
                typeOptions: {
                    point: {
                        x: closestPoint.x,
                        y: closestPoint.y,
                        xAxis: closestPoint.xAxis,
                        yAxis: closestPoint.yAxis
                    },
                    label: {
                        offset: closestPoint.below ? 40 : -40
                    }
                },
                labelOptions: {
                    style: {
                        color: "#666666" /* Palette.neutralColor60 */,
                        fontSize: '0.7em'
                    }
                },
                shapeOptions: {
                    stroke: 'rgba(0, 0, 0, 0.75)',
                    strokeWidth: 1
                }
            }, navigation.annotationsOptions, navigation.bindings
                .verticalLabel.annotationsOptions), annotation = this.chart.addAnnotation(options);
            annotation.options.events.click.call(annotation, {});
        }
    },
    /**
     * A vertical arrow annotation bindings. Includes `start` event. On click,
     * finds the closest point and marks it with an arrow.
     * `${palette.positiveColor}` is the color of the arrow when
     * pointing from above and `${palette.negativeColor}`
     * when pointing from below the point.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-vertical-arrow", "start": function() {}, "annotationsOptions": {}}
     */
    verticalArrow: {
        /** @ignore-option */
        className: 'highcharts-vertical-arrow',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var closestPoint = attractToPoint(e, this.chart);
            // Exit if clicked out of axes area
            if (!closestPoint) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                langKey: 'verticalArrow',
                type: 'verticalLine',
                typeOptions: {
                    point: {
                        x: closestPoint.x,
                        y: closestPoint.y,
                        xAxis: closestPoint.xAxis,
                        yAxis: closestPoint.yAxis
                    },
                    label: {
                        offset: closestPoint.below ? 40 : -40,
                        format: ' '
                    },
                    connector: {
                        fill: 'none',
                        stroke: closestPoint.below ?
                            "#f21313" /* Palette.negativeColor */ :
                            "#06b535" /* Palette.positiveColor */
                    }
                },
                shapeOptions: {
                    stroke: 'rgba(0, 0, 0, 0.75)',
                    strokeWidth: 1
                }
            }, navigation.annotationsOptions, navigation.bindings
                .verticalArrow.annotationsOptions), annotation = this.chart.addAnnotation(options);
            annotation.options.events.click.call(annotation, {});
        }
    },
    /**
     * The Fibonacci Time Zones annotation bindings. Includes `start` and one
     * event in `steps` array.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-fibonacci-time-zones", "start": function() {}, "steps": [function() {}], "annotationsOptions": {}}
     */
    fibonacciTimeZones: {
        /** @ignore-option */
        className: 'highcharts-fibonacci-time-zones',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        start: function (e) {
            var _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
            // Exit if clicked out of axes area
            if (!coordsX || !coordsY) {
                return;
            }
            var navigation = this.chart.options.navigation, options = merge({
                type: 'fibonacciTimeZones',
                langKey: 'fibonacciTimeZones',
                typeOptions: {
                    xAxis: coordsX.axis.index,
                    yAxis: coordsY.axis.index,
                    points: [{
                            x: coordsX.value
                        }]
                }
            }, navigation.annotationsOptions, navigation.bindings.fibonacciTimeZones
                .annotationsOptions);
            return this.chart.addAnnotation(options);
        },
        /** @ignore-option */
        // eslint-disable-next-line valid-jsdoc
        steps: [
            function (e, annotation) {
                var mockPointOpts = annotation.options.typeOptions.points, x = mockPointOpts && mockPointOpts[0].x, _a = this.getCoords(e), coordsX = _a[0], coordsY = _a[1];
                if (coordsX && coordsY) {
                    annotation.update({
                        typeOptions: {
                            xAxis: coordsX.axis.index,
                            yAxis: coordsY.axis.index,
                            points: [{
                                    x: x
                                }, {
                                    x: coordsX.value
                                }]
                        }
                    });
                }
            }
        ]
    },
    // Flag types:
    /**
     * A flag series bindings. Includes `start` event. On click, finds the
     * closest point and marks it with a flag with `'circlepin'` shape.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-flag-circlepin", "start": function() {}}
     */
    flagCirclepin: {
        /** @ignore-option */
        className: 'highcharts-flag-circlepin',
        /** @ignore-option */
        start: addFlagFromForm('circlepin')
    },
    /**
     * A flag series bindings. Includes `start` event. On click, finds the
     * closest point and marks it with a flag with `'diamondpin'` shape.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-flag-diamondpin", "start": function() {}}
     */
    flagDiamondpin: {
        /** @ignore-option */
        className: 'highcharts-flag-diamondpin',
        /** @ignore-option */
        start: addFlagFromForm('flag')
    },
    /**
     * A flag series bindings. Includes `start` event.
     * On click, finds the closest point and marks it with a flag with
     * `'squarepin'` shape.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-flag-squarepin", "start": function() {}}
     */
    flagSquarepin: {
        /** @ignore-option */
        className: 'highcharts-flag-squarepin',
        /** @ignore-option */
        start: addFlagFromForm('squarepin')
    },
    /**
     * A flag series bindings. Includes `start` event.
     * On click, finds the closest point and marks it with a flag without pin
     * shape.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-flag-simplepin", "start": function() {}}
     */
    flagSimplepin: {
        /** @ignore-option */
        className: 'highcharts-flag-simplepin',
        /** @ignore-option */
        start: addFlagFromForm('nopin')
    },
    // Other tools:
    /**
     * Enables zooming in xAxis on a chart. Includes `start` event which
     * changes [chart.zoomType](#chart.zoomType).
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-zoom-x", "init": function() {}}
     */
    zoomX: {
        /** @ignore-option */
        className: 'highcharts-zoom-x',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.update({
                chart: {
                    zooming: {
                        type: 'x'
                    }
                }
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Enables zooming in yAxis on a chart. Includes `start` event which
     * changes [chart.zoomType](#chart.zoomType).
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-zoom-y", "init": function() {}}
     */
    zoomY: {
        /** @ignore-option */
        className: 'highcharts-zoom-y',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.update({
                chart: {
                    zooming: {
                        type: 'y'
                    }
                }
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Enables zooming in xAxis and yAxis on a chart. Includes `start` event
     * which changes [chart.zoomType](#chart.zoomType).
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-zoom-xy", "init": function() {}}
     */
    zoomXY: {
        /** @ignore-option */
        className: 'highcharts-zoom-xy',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.update({
                chart: {
                    zooming: {
                        type: 'xy'
                    }
                }
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Changes main series to `'line'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-line", "init": function() {}}
     */
    seriesTypeLine: {
        /** @ignore-option */
        className: 'highcharts-series-type-line',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.series[0].update({
                type: 'line',
                useOhlcData: true
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Changes main series to `'ohlc'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-ohlc", "init": function() {}}
     */
    seriesTypeOhlc: {
        /** @ignore-option */
        className: 'highcharts-series-type-ohlc',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.series[0].update({
                type: 'ohlc'
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Changes main series to `'candlestick'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-candlestick", "init": function() {}}
     */
    seriesTypeCandlestick: {
        /** @ignore-option */
        className: 'highcharts-series-type-candlestick',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.series[0].update({
                type: 'candlestick'
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Changes main series to `'heikinashi'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-heikinashi", "init": function() {}}
     */
    seriesTypeHeikinAshi: {
        /** @ignore-option */
        className: 'highcharts-series-type-heikinashi',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.series[0].update({
                type: 'heikinashi'
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Change main series to `'hlc'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-hlc", "init": function () {}}
     */
    seriesTypeHLC: {
        className: 'highcharts-series-type-hlc',
        init: function (button) {
            this.chart.series[0].update({
                type: 'hlc',
                useOhlcData: true
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Changes main series to `'hollowcandlestick'` type.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-series-type-hollowcandlestick", "init": function() {}}
     */
    seriesTypeHollowCandlestick: {
        /** @ignore-option */
        className: 'highcharts-series-type-hollowcandlestick',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            this.chart.series[0].update({
                type: 'hollowcandlestick'
            });
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Displays chart in fullscreen.
     *
     * **Note**: Fullscreen is not supported on iPhone due to iOS limitations.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "noDataState": "normal", "highcharts-full-screen", "init": function() {}}
     */
    fullScreen: {
        /** @ignore-option */
        className: 'highcharts-full-screen',
        noDataState: 'normal',
        /** @ignore-option */
        init: function (button) {
            if (this.chart.fullscreen) {
                this.chart.fullscreen.toggle();
            }
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Hides/shows two price indicators:
     * - last price in the dataset
     * - last price in the selected range
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-current-price-indicator", "init": function() {}}
     */
    currentPriceIndicator: {
        /** @ignore-option */
        className: 'highcharts-current-price-indicator',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            var chart = this.chart, series = chart.series, gui = chart.stockTools, priceIndicatorEnabled = isPriceIndicatorEnabled(chart.series);
            if (gui && gui.guiEnabled) {
                series.forEach(function (series) {
                    series.update({
                        lastPrice: { enabled: !priceIndicatorEnabled },
                        lastVisiblePrice: {
                            enabled: !priceIndicatorEnabled,
                            label: { enabled: true }
                        }
                    }, false);
                });
                chart.redraw();
            }
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Indicators bindings. Includes `init` event to show a popup.
     *
     * Note: In order to show base series from the chart in the popup's
     * dropdown each series requires
     * [series.id](https://api.highcharts.com/highstock/series.line.id) to be
     * defined.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-indicators", "init": function() {}}
     */
    indicators: {
        /** @ignore-option */
        className: 'highcharts-indicators',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function () {
            var navigation = this;
            fireEvent(navigation, 'showPopup', {
                formType: 'indicators',
                options: {},
                // Callback on submit:
                onSubmit: function (data) {
                    manageIndicators.call(navigation, data);
                }
            });
        }
    },
    /**
     * Hides/shows all annotations on a chart.
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-toggle-annotations", "init": function() {}}
     */
    toggleAnnotations: {
        /** @ignore-option */
        className: 'highcharts-toggle-annotations',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            var chart = this.chart, gui = chart.stockTools, iconsURL = gui.getIconsURL();
            this.toggledAnnotations = !this.toggledAnnotations;
            (chart.annotations || []).forEach(function (annotation) {
                annotation.setVisibility(!this.toggledAnnotations);
            }, this);
            if (gui && gui.guiEnabled) {
                if (this.toggledAnnotations) {
                    button.firstChild.style['background-image'] =
                        'url("' + iconsURL +
                            'annotations-hidden.svg")';
                }
                else {
                    button.firstChild.style['background-image'] =
                        'url("' + iconsURL +
                            'annotations-visible.svg")';
                }
            }
            fireEvent(this, 'deselectButton', { button: button });
        }
    },
    /**
     * Save a chart in localStorage under `highcharts-chart` key.
     * Stored items:
     * - annotations
     * - indicators (with yAxes)
     * - flags
     *
     * @type    {Highcharts.NavigationBindingsOptionsObject}
     * @product highstock
     * @default {"className": "highcharts-save-chart", "noDataState": "normal", "init": function() {}}
     */
    saveChart: {
        /** @ignore-option */
        className: 'highcharts-save-chart',
        noDataState: 'normal',
        // eslint-disable-next-line valid-jsdoc
        /** @ignore-option */
        init: function (button) {
            var navigation = this, chart = navigation.chart, annotations = [], indicators = [], flags = [], yAxes = [];
            chart.annotations.forEach(function (annotation, index) {
                annotations[index] = annotation.userOptions;
            });
            chart.series.forEach(function (series) {
                if (series.is('sma')) {
                    indicators.push(series.userOptions);
                }
                else if (series.type === 'flags') {
                    flags.push(series.userOptions);
                }
            });
            chart.yAxis.forEach(function (yAxis) {
                if (isNotNavigatorYAxis(yAxis)) {
                    yAxes.push(yAxis.options);
                }
            });
            H.win.localStorage.setItem('highcharts-chart', JSON.stringify({
                annotations: annotations,
                indicators: indicators,
                flags: flags,
                yAxes: yAxes
            }));
            fireEvent(this, 'deselectButton', { button: button });
        }
    }
};
/* *
 *
 *  Default Export
 *
 * */
export default StockToolsBindings;
