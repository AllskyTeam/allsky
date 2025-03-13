/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Highcharts feature to make the Y axis stay fixed when scrolling the chart
 *  horizontally on mobile devices. Supports left and right side axes.
 */
'use strict';
import A from '../Core/Animation/AnimationUtilities.js';
var stop = A.stop;
import H from '../Core/Globals.js';
var composed = H.composed;
import RendererRegistry from '../Core/Renderer/RendererRegistry.js';
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, createElement = U.createElement, css = U.css, defined = U.defined, erase = U.erase, merge = U.merge, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function onChartRender() {
    var scrollablePlotArea = this.scrollablePlotArea;
    if ((this.scrollablePixelsX || this.scrollablePixelsY) &&
        !scrollablePlotArea) {
        this.scrollablePlotArea = scrollablePlotArea = new ScrollablePlotArea(this);
    }
    scrollablePlotArea === null || scrollablePlotArea === void 0 ? void 0 : scrollablePlotArea.applyFixed();
}
/** @private */
function markDirty() {
    if (this.chart.scrollablePlotArea) {
        this.chart.scrollablePlotArea.isDirty = true;
    }
}
var ScrollablePlotArea = /** @class */ (function () {
    function ScrollablePlotArea(chart) {
        var _a, _b;
        var chartOptions = chart.options.chart, Renderer = RendererRegistry.getRendererType(), scrollableOptions = chartOptions.scrollablePlotArea || {}, moveFixedElements = this.moveFixedElements.bind(this), styles = {
            WebkitOverflowScrolling: 'touch',
            overflowX: 'hidden',
            overflowY: 'hidden'
        };
        if (chart.scrollablePixelsX) {
            styles.overflowX = 'auto';
        }
        if (chart.scrollablePixelsY) {
            styles.overflowY = 'auto';
        }
        this.chart = chart;
        // Insert a container with relative position that scrolling and fixed
        // container renders to (#10555)
        var parentDiv = this.parentDiv = createElement('div', {
            className: 'highcharts-scrolling-parent'
        }, {
            position: 'relative'
        }, chart.renderTo), 
        // Add the necessary divs to provide scrolling
        scrollingContainer = this.scrollingContainer = createElement('div', {
            'className': 'highcharts-scrolling'
        }, styles, parentDiv), innerContainer = this.innerContainer = createElement('div', {
            'className': 'highcharts-inner-container'
        }, void 0, scrollingContainer), fixedDiv = this.fixedDiv = createElement('div', {
            className: 'highcharts-fixed'
        }, {
            position: 'absolute',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: (((_a = chartOptions.style) === null || _a === void 0 ? void 0 : _a.zIndex) || 0) + 2,
            top: 0
        }, void 0, true), fixedRenderer = this.fixedRenderer = new Renderer(fixedDiv, chart.chartWidth, chart.chartHeight, chartOptions.style);
        // Mask
        this.mask = fixedRenderer
            .path()
            .attr({
            fill: chartOptions.backgroundColor || '#fff',
            'fill-opacity': (_b = scrollableOptions.opacity) !== null && _b !== void 0 ? _b : 0.85,
            zIndex: -1
        })
            .addClass('highcharts-scrollable-mask')
            .add();
        scrollingContainer.parentNode.insertBefore(fixedDiv, scrollingContainer);
        css(chart.renderTo, { overflow: 'visible' });
        addEvent(chart, 'afterShowResetZoom', moveFixedElements);
        addEvent(chart, 'afterApplyDrilldown', moveFixedElements);
        addEvent(chart, 'afterLayOutTitles', moveFixedElements);
        // On scroll, reset the chart position because it applies to the
        // scrolled container
        var lastHoverPoint;
        addEvent(scrollingContainer, 'scroll', function () {
            var pointer = chart.pointer, hoverPoint = chart.hoverPoint;
            if (pointer) {
                delete pointer.chartPosition;
                if (hoverPoint) {
                    lastHoverPoint = hoverPoint;
                }
                pointer.runPointActions(void 0, lastHoverPoint, true);
            }
        });
        // Now move the container inside
        innerContainer.appendChild(chart.container);
    }
    ScrollablePlotArea.compose = function (AxisClass, ChartClass, SeriesClass) {
        var _this = this;
        if (pushUnique(composed, this.compose)) {
            addEvent(AxisClass, 'afterInit', markDirty);
            addEvent(ChartClass, 'afterSetChartSize', function (e) {
                return _this.afterSetSize(e.target, e);
            });
            addEvent(ChartClass, 'render', onChartRender);
            addEvent(SeriesClass, 'show', markDirty);
        }
    };
    ScrollablePlotArea.afterSetSize = function (chart, e) {
        var _a = chart.options.chart.scrollablePlotArea || {}, minWidth = _a.minWidth, minHeight = _a.minHeight, clipBox = chart.clipBox, plotBox = chart.plotBox, inverted = chart.inverted, renderer = chart.renderer;
        var scrollablePixelsX, scrollablePixelsY, recalculateHoriz;
        if (!renderer.forExport) {
            // The amount of pixels to scroll, the difference between chart
            // width and scrollable width
            if (minWidth) {
                chart.scrollablePixelsX = scrollablePixelsX = Math.max(0, minWidth - chart.chartWidth);
                if (scrollablePixelsX) {
                    chart.scrollablePlotBox = merge(chart.plotBox);
                    plotBox.width = chart.plotWidth += scrollablePixelsX;
                    clipBox[inverted ? 'height' : 'width'] += scrollablePixelsX;
                    recalculateHoriz = true;
                }
                // Currently we can only do either X or Y
            }
            else if (minHeight) {
                chart.scrollablePixelsY = scrollablePixelsY = Math.max(0, minHeight - chart.chartHeight);
                if (defined(scrollablePixelsY)) {
                    chart.scrollablePlotBox = merge(chart.plotBox);
                    plotBox.height = chart.plotHeight += scrollablePixelsY;
                    clipBox[inverted ? 'width' : 'height'] += scrollablePixelsY;
                    recalculateHoriz = false;
                }
            }
            if (defined(recalculateHoriz) && !e.skipAxes) {
                for (var _i = 0, _b = chart.axes; _i < _b.length; _i++) {
                    var axis = _b[_i];
                    // Apply the corrected plot size to the axes of the other
                    // orientation than the scrolling direction
                    if (axis.horiz === recalculateHoriz ||
                        // Or parallel axes
                        (chart.hasParallelCoordinates && axis.coll === 'yAxis')) {
                        axis.setAxisSize();
                        axis.setAxisTranslation();
                    }
                }
            }
        }
    };
    ScrollablePlotArea.prototype.applyFixed = function () {
        var _a;
        var _b = this, chart = _b.chart, fixedRenderer = _b.fixedRenderer, isDirty = _b.isDirty, scrollingContainer = _b.scrollingContainer, axisOffset = chart.axisOffset, chartWidth = chart.chartWidth, chartHeight = chart.chartHeight, container = chart.container, plotHeight = chart.plotHeight, plotLeft = chart.plotLeft, plotTop = chart.plotTop, plotWidth = chart.plotWidth, _c = chart.scrollablePixelsX, scrollablePixelsX = _c === void 0 ? 0 : _c, _d = chart.scrollablePixelsY, scrollablePixelsY = _d === void 0 ? 0 : _d, chartOptions = chart.options.chart, scrollableOptions = chartOptions.scrollablePlotArea || {}, _e = scrollableOptions.scrollPositionX, scrollPositionX = _e === void 0 ? 0 : _e, _f = scrollableOptions.scrollPositionY, scrollPositionY = _f === void 0 ? 0 : _f, scrollableWidth = chartWidth + scrollablePixelsX, scrollableHeight = chartHeight + scrollablePixelsY;
        // Set the size of the fixed renderer to the visible width
        fixedRenderer.setSize(chartWidth, chartHeight);
        if (isDirty !== null && isDirty !== void 0 ? isDirty : true) {
            this.isDirty = false;
            this.moveFixedElements();
        }
        // Increase the size of the scrollable renderer and background
        stop(chart.container);
        css(container, {
            width: "".concat(scrollableWidth, "px"),
            height: "".concat(scrollableHeight, "px")
        });
        chart.renderer.boxWrapper.attr({
            width: scrollableWidth,
            height: scrollableHeight,
            viewBox: [0, 0, scrollableWidth, scrollableHeight].join(' ')
        });
        (_a = chart.chartBackground) === null || _a === void 0 ? void 0 : _a.attr({
            width: scrollableWidth,
            height: scrollableHeight
        });
        css(scrollingContainer, {
            width: "".concat(chartWidth, "px"),
            height: "".concat(chartHeight, "px")
        });
        // Set scroll position the first time (this.isDirty was undefined at
        // the top of this function)
        if (!defined(isDirty)) {
            scrollingContainer.scrollLeft = scrollablePixelsX * scrollPositionX;
            scrollingContainer.scrollTop = scrollablePixelsY * scrollPositionY;
        }
        // Mask behind the left and right side
        var maskTop = plotTop - axisOffset[0] - 1, maskLeft = plotLeft - axisOffset[3] - 1, maskBottom = plotTop + plotHeight + axisOffset[2] + 1, maskRight = plotLeft + plotWidth + axisOffset[1] + 1, maskPlotRight = plotLeft + plotWidth - scrollablePixelsX, maskPlotBottom = plotTop + plotHeight - scrollablePixelsY;
        var d = [['M', 0, 0]];
        if (scrollablePixelsX) {
            d = [
                // Left side
                ['M', 0, maskTop],
                ['L', plotLeft - 1, maskTop],
                ['L', plotLeft - 1, maskBottom],
                ['L', 0, maskBottom],
                ['Z'],
                // Right side
                ['M', maskPlotRight, maskTop],
                ['L', chartWidth, maskTop],
                ['L', chartWidth, maskBottom],
                ['L', maskPlotRight, maskBottom],
                ['Z']
            ];
        }
        else if (scrollablePixelsY) {
            d = [
                // Top side
                ['M', maskLeft, 0],
                ['L', maskLeft, plotTop - 1],
                ['L', maskRight, plotTop - 1],
                ['L', maskRight, 0],
                ['Z'],
                // Bottom side
                ['M', maskLeft, maskPlotBottom],
                ['L', maskLeft, chartHeight],
                ['L', maskRight, chartHeight],
                ['L', maskRight, maskPlotBottom],
                ['Z']
            ];
        }
        if (chart.redrawTrigger !== 'adjustHeight') {
            this.mask.attr({ d: d });
        }
    };
    /**
     * These elements are moved over to the fixed renderer and stay fixed when
     * the user scrolls the chart
     * @private
     */
    ScrollablePlotArea.prototype.moveFixedElements = function () {
        var _a = this.chart, container = _a.container, inverted = _a.inverted, scrollablePixelsX = _a.scrollablePixelsX, scrollablePixelsY = _a.scrollablePixelsY, fixedRenderer = this.fixedRenderer, fixedSelectors = ScrollablePlotArea.fixedSelectors;
        var axisClass;
        if (scrollablePixelsX && !inverted) {
            axisClass = '.highcharts-yaxis';
        }
        else if (scrollablePixelsX && inverted) {
            axisClass = '.highcharts-xaxis';
        }
        else if (scrollablePixelsY && !inverted) {
            axisClass = '.highcharts-xaxis';
        }
        else if (scrollablePixelsY && inverted) {
            axisClass = '.highcharts-yaxis';
        }
        if (axisClass && !(this.chart.hasParallelCoordinates &&
            axisClass === '.highcharts-yaxis')) {
            // Add if not added yet
            for (var _i = 0, _b = [
                "".concat(axisClass, ":not(.highcharts-radial-axis)"),
                "".concat(axisClass, "-labels:not(.highcharts-radial-axis-labels)")
            ]; _i < _b.length; _i++) {
                var className = _b[_i];
                pushUnique(fixedSelectors, className);
            }
        }
        else {
            // Clear all axis related selectors
            for (var _c = 0, _d = [
                '.highcharts-xaxis',
                '.highcharts-yaxis'
            ]; _c < _d.length; _c++) {
                var classBase = _d[_c];
                for (var _e = 0, _f = [
                    "".concat(classBase, ":not(.highcharts-radial-axis)"),
                    "".concat(classBase, "-labels:not(.highcharts-radial-axis-labels)")
                ]; _e < _f.length; _e++) {
                    var className = _f[_e];
                    erase(fixedSelectors, className);
                }
            }
        }
        for (var _g = 0, fixedSelectors_1 = fixedSelectors; _g < fixedSelectors_1.length; _g++) {
            var className = fixedSelectors_1[_g];
            [].forEach.call(container.querySelectorAll(className), function (elem) {
                (elem.namespaceURI === fixedRenderer.SVG_NS ?
                    fixedRenderer.box :
                    fixedRenderer.box.parentNode).appendChild(elem);
                elem.style.pointerEvents = 'auto';
            });
        }
    };
    ScrollablePlotArea.fixedSelectors = [
        '.highcharts-breadcrumbs-group',
        '.highcharts-contextbutton',
        '.highcharts-caption',
        '.highcharts-credits',
        '.highcharts-drillup-button',
        '.highcharts-legend',
        '.highcharts-legend-checkbox',
        '.highcharts-navigator-series',
        '.highcharts-navigator-xaxis',
        '.highcharts-navigator-yaxis',
        '.highcharts-navigator',
        '.highcharts-range-selector-group',
        '.highcharts-reset-zoom',
        '.highcharts-scrollbar',
        '.highcharts-subtitle',
        '.highcharts-title'
    ];
    return ScrollablePlotArea;
}());
/* *
 *
 *  Default Export
 *
 * */
export default ScrollablePlotArea;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Options for a scrollable plot area. This feature provides a minimum size for
 * the plot area of the chart. If the size gets smaller than this, typically
 * on mobile devices, a native browser scrollbar is presented. This scrollbar
 * provides smooth scrolling for the contents of the plot area, whereas the
 * title, legend and unaffected axes are fixed.
 *
 * Since v7.1.2, a scrollable plot area can be defined for either horizontal or
 * vertical scrolling, depending on whether the `minWidth` or `minHeight`
 * option is set.
 *
 * @sample highcharts/chart/scrollable-plotarea
 *         Scrollable plot area
 * @sample highcharts/chart/scrollable-plotarea-vertical
 *         Vertically scrollable plot area
 * @sample {gantt} gantt/chart/scrollable-plotarea-vertical
 *         Gantt chart with vertically scrollable plot area
 *
 * @since     6.1.0
 * @product   highcharts gantt
 * @apioption chart.scrollablePlotArea
 */
/**
 * The minimum height for the plot area. If it gets smaller than this, the plot
 * area will become scrollable.
 *
 * @type      {number}
 * @since     7.1.2
 * @apioption chart.scrollablePlotArea.minHeight
 */
/**
 * The minimum width for the plot area. If it gets smaller than this, the plot
 * area will become scrollable.
 *
 * @type      {number}
 * @since     6.1.0
 * @apioption chart.scrollablePlotArea.minWidth
 */
/**
 * The initial scrolling position of the scrollable plot area. Ranges from 0 to
 * 1, where 0 aligns the plot area to the left and 1 aligns it to the right.
 * Typically we would use 1 if the chart has right aligned Y axes.
 *
 * @type      {number}
 * @since     6.1.0
 * @apioption chart.scrollablePlotArea.scrollPositionX
 */
/**
 * The initial scrolling position of the scrollable plot area. Ranges from 0 to
 * 1, where 0 aligns the plot area to the top and 1 aligns it to the bottom.
 *
 * @type      {number}
 * @since     7.1.2
 * @apioption chart.scrollablePlotArea.scrollPositionY
 */
/**
 * The opacity of mask applied on one of the sides of the plot
 * area.
 *
 * @sample {highcharts} highcharts/chart/scrollable-plotarea-opacity
 *         Disabled opacity for the mask
 *
 * @type        {number}
 * @default     0.85
 * @since       7.1.1
 * @apioption   chart.scrollablePlotArea.opacity
 */
(''); // Keep doclets above in transpiled file
