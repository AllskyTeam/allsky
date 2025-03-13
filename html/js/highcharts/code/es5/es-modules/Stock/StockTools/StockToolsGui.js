/* *
 *
 *  GUI generator for Stock tools
 *
 *  (c) 2009-2024 Sebastian Bochan
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import D from '../../Core/Defaults.js';
var setOptions = D.setOptions;
import StockToolsDefaults from './StockToolsDefaults.js';
import Toolbar from './StockToolbar.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, getStyle = U.getStyle, merge = U.merge, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Verify if Toolbar should be added.
 * @private
 */
function chartSetStockTools(options) {
    var chartOptions = this.options, lang = chartOptions.lang, guiOptions = merge(chartOptions.stockTools && chartOptions.stockTools.gui, options && options.gui), langOptions = lang && lang.stockTools && lang.stockTools.gui;
    this.stockTools = new Toolbar(guiOptions, langOptions, this);
    if (this.stockTools.guiEnabled) {
        this.isDirtyBox = true;
    }
}
/**
 * @private
 */
function compose(ChartClass, NavigationBindingsClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.setStockTools) {
        addEvent(ChartClass, 'afterGetContainer', onChartAfterGetContainer);
        addEvent(ChartClass, 'beforeRedraw', onChartBeforeRedraw);
        addEvent(ChartClass, 'beforeRender', onChartBeforeRedraw);
        addEvent(ChartClass, 'destroy', onChartDestroy);
        addEvent(ChartClass, 'getMargins', onChartGetMargins, { order: 0 });
        addEvent(ChartClass, 'render', onChartRender);
        chartProto.setStockTools = chartSetStockTools;
        addEvent(NavigationBindingsClass, 'deselectButton', onNavigationBindingsDeselectButton);
        addEvent(NavigationBindingsClass, 'selectButton', onNavigationBindingsSelectButton);
        setOptions(StockToolsDefaults);
    }
}
/**
 * Run HTML generator
 * @private
 */
function onChartAfterGetContainer() {
    this.setStockTools();
}
/**
 * Handle beforeRedraw and beforeRender
 * @private
 */
function onChartBeforeRedraw() {
    if (this.stockTools) {
        this.stockTools.redraw();
        setOffset(this);
    }
}
/**
 * Function to calculate and set the offset width for stock tools.
 * @private
 */
function setOffset(chart) {
    var _a;
    if ((_a = chart.stockTools) === null || _a === void 0 ? void 0 : _a.guiEnabled) {
        var optionsChart = chart.options.chart;
        var listWrapper = chart.stockTools.listWrapper;
        var offsetWidth = listWrapper && ((listWrapper.startWidth +
            getStyle(listWrapper, 'padding-left') +
            getStyle(listWrapper, 'padding-right')) || listWrapper.offsetWidth);
        chart.stockTools.width = offsetWidth;
        var dirty = false;
        if (offsetWidth < chart.plotWidth) {
            var nextX = pick(optionsChart.spacingLeft, optionsChart.spacing && optionsChart.spacing[3], 0) + offsetWidth;
            var diff = nextX - chart.spacingBox.x;
            chart.spacingBox.x = nextX;
            chart.spacingBox.width -= diff;
            dirty = true;
        }
        else if (offsetWidth === 0) {
            dirty = true;
        }
        if (offsetWidth !== chart.stockTools.prevOffsetWidth) {
            chart.stockTools.prevOffsetWidth = offsetWidth;
            if (dirty) {
                chart.isDirtyLegend = true;
            }
        }
    }
}
/**
 * @private
 */
function onChartDestroy() {
    if (this.stockTools) {
        this.stockTools.destroy();
    }
}
/**
 * @private
 */
function onChartGetMargins() {
    var _a;
    var offsetWidth = ((_a = this.stockTools) === null || _a === void 0 ? void 0 : _a.visible) && this.stockTools.guiEnabled ?
        this.stockTools.width : 0;
    if (offsetWidth && offsetWidth < this.plotWidth) {
        this.plotLeft += offsetWidth;
        this.spacing[3] += offsetWidth;
    }
}
/**
 * Check if the correct price indicator button is displayed, #15029.
 * @private
 */
function onChartRender() {
    var _a, _b;
    var stockTools = this.stockTools, button = stockTools &&
        stockTools.toolbar &&
        stockTools.toolbar.querySelector('.highcharts-current-price-indicator');
    // Change the initial button background.
    if (stockTools &&
        this.navigationBindings &&
        this.options.series &&
        button) {
        if ((_b = (_a = this.navigationBindings.utils) === null || _a === void 0 ? void 0 : _a.isPriceIndicatorEnabled) === null || _b === void 0 ? void 0 : _b.call(_a, this.series)) {
            button.firstChild.style['background-image'] =
                'url("' + stockTools.getIconsURL() + 'current-price-hide.svg")';
        }
        else {
            button.firstChild.style['background-image'] =
                'url("' + stockTools.getIconsURL() + 'current-price-show.svg")';
        }
    }
}
/**
 * @private
 */
function onNavigationBindingsDeselectButton(event) {
    var className = 'highcharts-submenu-wrapper', gui = this.chart.stockTools;
    if (gui && gui.guiEnabled) {
        var button = event.button;
        // If deselecting a button from a submenu, select state for it's parent
        if (button.parentNode.className.indexOf(className) >= 0) {
            button = button.parentNode.parentNode;
        }
        button.classList.remove('highcharts-active');
    }
}
/**
 * Communication with bindings
 * @private
 */
function onNavigationBindingsSelectButton(event) {
    var className = 'highcharts-submenu-wrapper', gui = this.chart.stockTools;
    if (gui && gui.guiEnabled) {
        var button = event.button;
        // Unselect other active buttons
        gui.unselectAllButtons(event.button);
        // If clicked on a submenu, select state for it's parent
        if (button.parentNode.className.indexOf(className) >= 0) {
            button = button.parentNode.parentNode;
        }
        // Set active class on the current button
        gui.toggleButtonActiveClass(button);
    }
}
/* *
 *
 *  Default Export
 *
 * */
var StockToolsGui = {
    compose: compose
};
export default StockToolsGui;
