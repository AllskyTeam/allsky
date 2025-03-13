/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Accessibility component for chart legend.
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
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import H from '../../Core/Globals.js';
var doc = H.doc;
import Legend from '../../Core/Legend/Legend.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, fireEvent = U.fireEvent, isNumber = U.isNumber, pick = U.pick, syncTimeout = U.syncTimeout;
import AccessibilityComponent from '../AccessibilityComponent.js';
import KeyboardNavigationHandler from '../KeyboardNavigationHandler.js';
import CU from '../Utils/ChartUtilities.js';
var getChartTitle = CU.getChartTitle;
import HU from '../Utils/HTMLUtilities.js';
var stripHTMLTags = HU.stripHTMLTagsFromString, addClass = HU.addClass, removeClass = HU.removeClass;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function scrollLegendToItem(legend, itemIx) {
    var itemPage = (legend.allItems[itemIx].legendItem || {}).pageIx, curPage = legend.currentPage;
    if (typeof itemPage !== 'undefined' && itemPage + 1 !== curPage) {
        legend.scroll(1 + itemPage - curPage);
    }
}
/**
 * @private
 */
function shouldDoLegendA11y(chart) {
    var items = chart.legend && chart.legend.allItems, legendA11yOptions = (chart.options.legend.accessibility || {}), unsupportedColorAxis = chart.colorAxis && chart.colorAxis.some(function (c) { return !c.dataClasses || !c.dataClasses.length; });
    return !!(items && items.length &&
        !unsupportedColorAxis &&
        legendA11yOptions.enabled !== false);
}
/**
 * @private
 */
function setLegendItemHoverState(hoverActive, item) {
    var legendItem = item.legendItem || {};
    item.setState(hoverActive ? 'hover' : '', true);
    for (var _i = 0, _a = ['group', 'label', 'symbol']; _i < _a.length; _i++) {
        var key = _a[_i];
        var svgElement = legendItem[key];
        var element = svgElement && svgElement.element || svgElement;
        if (element) {
            fireEvent(element, hoverActive ? 'mouseover' : 'mouseout');
        }
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * The LegendComponent class
 *
 * @private
 * @class
 * @name Highcharts.LegendComponent
 */
var LegendComponent = /** @class */ (function (_super) {
    __extends(LegendComponent, _super);
    function LegendComponent() {
        /* *
         *
         *  Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.highlightedLegendItemIx = NaN;
        _this.proxyGroup = null;
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Init the component
     * @private
     */
    LegendComponent.prototype.init = function () {
        var component = this;
        this.recreateProxies();
        // Note: Chart could create legend dynamically, so events cannot be
        // tied to the component's chart's current legend.
        // @todo 1. attach component to created legends
        // @todo 2. move listeners to composition and access `this.component`
        this.addEvent(Legend, 'afterScroll', function () {
            if (this.chart === component.chart) {
                component.proxyProvider.updateGroupProxyElementPositions('legend');
                component.updateLegendItemProxyVisibility();
                if (component.highlightedLegendItemIx > -1) {
                    this.chart.highlightLegendItem(component.highlightedLegendItemIx);
                }
            }
        });
        this.addEvent(Legend, 'afterPositionItem', function (e) {
            if (this.chart === component.chart && this.chart.renderer) {
                component.updateProxyPositionForItem(e.item);
            }
        });
        this.addEvent(Legend, 'afterRender', function () {
            if (this.chart === component.chart &&
                this.chart.renderer &&
                component.recreateProxies()) {
                syncTimeout(function () { return component.proxyProvider
                    .updateGroupProxyElementPositions('legend'); }, animObject(pick(this.chart.renderer.globalAnimation, true)).duration);
            }
        });
    };
    /**
     * Update visibility of legend items when using paged legend
     * @private
     */
    LegendComponent.prototype.updateLegendItemProxyVisibility = function () {
        var chart = this.chart;
        var legend = chart.legend;
        var items = legend.allItems || [];
        var curPage = legend.currentPage || 1;
        var clipHeight = legend.clipHeight || 0;
        var legendItem;
        items.forEach(function (item) {
            if (item.a11yProxyElement) {
                var hasPages = legend.pages && legend.pages.length;
                var proxyEl = item.a11yProxyElement.element;
                var hide = false;
                legendItem = item.legendItem || {};
                if (hasPages) {
                    var itemPage = legendItem.pageIx || 0;
                    var y = legendItem.y || 0;
                    var h = legendItem.label ?
                        Math.round(legendItem.label.getBBox().height) :
                        0;
                    hide = y + h - legend.pages[itemPage] > clipHeight ||
                        itemPage !== curPage - 1;
                }
                if (hide) {
                    if (chart.styledMode) {
                        addClass(proxyEl, 'highcharts-a11y-invisible');
                    }
                    else {
                        proxyEl.style.visibility = 'hidden';
                    }
                }
                else {
                    removeClass(proxyEl, 'highcharts-a11y-invisible');
                    proxyEl.style.visibility = '';
                }
            }
        });
    };
    /**
     * @private
     */
    LegendComponent.prototype.onChartRender = function () {
        if (!shouldDoLegendA11y(this.chart)) {
            this.removeProxies();
        }
    };
    /**
     * @private
     */
    LegendComponent.prototype.highlightAdjacentLegendPage = function (direction) {
        var chart = this.chart;
        var legend = chart.legend;
        var curPageIx = legend.currentPage || 1;
        var newPageIx = curPageIx + direction;
        var pages = legend.pages || [];
        if (newPageIx > 0 && newPageIx <= pages.length) {
            var i = 0, res = void 0;
            for (var _i = 0, _a = legend.allItems; _i < _a.length; _i++) {
                var item = _a[_i];
                if (((item.legendItem || {}).pageIx || 0) + 1 === newPageIx) {
                    res = chart.highlightLegendItem(i);
                    if (res) {
                        this.highlightedLegendItemIx = i;
                    }
                }
                ++i;
            }
        }
    };
    /**
     * @private
     */
    LegendComponent.prototype.updateProxyPositionForItem = function (item) {
        if (item.a11yProxyElement) {
            item.a11yProxyElement.refreshPosition();
        }
    };
    /**
     * Returns false if legend a11y is disabled and proxies were not created,
     * true otherwise.
     * @private
     */
    LegendComponent.prototype.recreateProxies = function () {
        var focusedElement = doc.activeElement;
        var proxyGroup = this.proxyGroup;
        var shouldRestoreFocus = focusedElement && proxyGroup &&
            proxyGroup.contains(focusedElement);
        this.removeProxies();
        if (shouldDoLegendA11y(this.chart)) {
            this.addLegendProxyGroup();
            this.proxyLegendItems();
            this.updateLegendItemProxyVisibility();
            this.updateLegendTitle();
            if (shouldRestoreFocus) {
                this.chart.highlightLegendItem(this.highlightedLegendItemIx);
            }
            return true;
        }
        return false;
    };
    /**
     * @private
     */
    LegendComponent.prototype.removeProxies = function () {
        this.proxyProvider.removeGroup('legend');
    };
    /**
     * @private
     */
    LegendComponent.prototype.updateLegendTitle = function () {
        var chart = this.chart;
        var legendTitle = stripHTMLTags((chart.legend &&
            chart.legend.options.title &&
            chart.legend.options.title.text ||
            '').replace(/<br ?\/?>/g, ' '), chart.renderer.forExport);
        var legendLabel = chart.langFormat('accessibility.legend.legendLabel' + (legendTitle ? '' : 'NoTitle'), {
            chart: chart,
            legendTitle: legendTitle,
            chartTitle: getChartTitle(chart)
        });
        this.proxyProvider.updateGroupAttrs('legend', {
            'aria-label': legendLabel
        });
    };
    /**
     * @private
     */
    LegendComponent.prototype.addLegendProxyGroup = function () {
        var a11yOptions = this.chart.options.accessibility;
        var groupRole = a11yOptions.landmarkVerbosity === 'all' ?
            'region' : null;
        this.proxyGroup = this.proxyProvider.addGroup('legend', 'ul', {
            // Filled by updateLegendTitle, to keep up to date without
            // recreating group
            'aria-label': '_placeholder_',
            role: groupRole
        });
    };
    /**
     * @private
     */
    LegendComponent.prototype.proxyLegendItems = function () {
        var component = this, items = (this.chart.legend || {}).allItems || [];
        var legendItem;
        items.forEach(function (item) {
            legendItem = item.legendItem || {};
            if (legendItem.label && legendItem.label.element) {
                component.proxyLegendItem(item);
            }
        });
    };
    /**
     * @private
     * @param {Highcharts.BubbleLegendItem|Point|Highcharts.Series} item
     */
    LegendComponent.prototype.proxyLegendItem = function (item) {
        var legendItem = item.legendItem || {};
        if (!legendItem.label || !legendItem.group) {
            return;
        }
        var itemLabel = this.chart.langFormat('accessibility.legend.legendItem', {
            chart: this.chart,
            itemName: stripHTMLTags(item.name, this.chart.renderer.forExport),
            item: item
        });
        var attribs = {
            tabindex: -1,
            'aria-pressed': item.visible,
            'aria-label': itemLabel
        };
        // Considers useHTML
        var proxyPositioningElement = legendItem.group.div ?
            legendItem.label :
            legendItem.group;
        item.a11yProxyElement = this.proxyProvider.addProxyElement('legend', {
            click: legendItem.label,
            visual: proxyPositioningElement.element
        }, 'button', attribs);
    };
    /**
     * Get keyboard navigation handler for this component.
     * @private
     */
    LegendComponent.prototype.getKeyboardNavigation = function () {
        var keys = this.keyCodes, component = this, chart = this.chart;
        return new KeyboardNavigationHandler(chart, {
            keyCodeMap: [
                [
                    [keys.left, keys.right, keys.up, keys.down],
                    function (keyCode) {
                        return component.onKbdArrowKey(this, keyCode);
                    }
                ],
                [
                    [keys.enter, keys.space],
                    function () {
                        return component.onKbdClick(this);
                    }
                ],
                [
                    [keys.pageDown, keys.pageUp],
                    function (keyCode) {
                        var direction = keyCode === keys.pageDown ? 1 : -1;
                        component.highlightAdjacentLegendPage(direction);
                        return this.response.success;
                    }
                ]
            ],
            validate: function () {
                return component.shouldHaveLegendNavigation();
            },
            init: function () {
                chart.highlightLegendItem(0);
                component.highlightedLegendItemIx = 0;
            },
            terminate: function () {
                component.highlightedLegendItemIx = -1;
                chart.legend.allItems.forEach(function (item) { return setLegendItemHoverState(false, item); });
            }
        });
    };
    /**
     * Arrow key navigation
     * @private
     */
    LegendComponent.prototype.onKbdArrowKey = function (keyboardNavigationHandler, key) {
        var _a = this, _b = _a.keyCodes, left = _b.left, up = _b.up, highlightedLegendItemIx = _a.highlightedLegendItemIx, chart = _a.chart, numItems = chart.legend.allItems.length, wrapAround = chart.options.accessibility
            .keyboardNavigation.wrapAround, direction = (key === left || key === up) ? -1 : 1, res = chart.highlightLegendItem(highlightedLegendItemIx + direction);
        if (res) {
            this.highlightedLegendItemIx += direction;
        }
        else if (wrapAround && numItems > 1) {
            this.highlightedLegendItemIx = direction > 0 ?
                0 : numItems - 1;
            chart.highlightLegendItem(this.highlightedLegendItemIx);
        }
        return keyboardNavigationHandler.response.success;
    };
    /**
     * @private
     * @param {Highcharts.KeyboardNavigationHandler} keyboardNavigationHandler
     * @return {number} Response code
     */
    LegendComponent.prototype.onKbdClick = function (keyboardNavigationHandler) {
        var legendItem = this.chart.legend.allItems[this.highlightedLegendItemIx];
        if (legendItem && legendItem.a11yProxyElement) {
            legendItem.a11yProxyElement.click();
        }
        return keyboardNavigationHandler.response.success;
    };
    /**
     * @private
     */
    LegendComponent.prototype.shouldHaveLegendNavigation = function () {
        if (!shouldDoLegendA11y(this.chart)) {
            return false;
        }
        var chart = this.chart, legendOptions = chart.options.legend || {}, legendA11yOptions = (legendOptions.accessibility || {});
        return !!(chart.legend.display &&
            legendA11yOptions.keyboardNavigation &&
            legendA11yOptions.keyboardNavigation.enabled);
    };
    /**
     * Clean up
     * @private
     */
    LegendComponent.prototype.destroy = function () {
        this.removeProxies();
    };
    return LegendComponent;
}(AccessibilityComponent));
/* *
 *
 *  Class Namespace
 *
 * */
(function (LegendComponent) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Highlight legend item by index.
     * @private
     */
    function chartHighlightLegendItem(ix) {
        var items = this.legend.allItems;
        var oldIx = this.accessibility &&
            this.accessibility.components.legend.highlightedLegendItemIx;
        var itemToHighlight = items[ix], legendItem = (itemToHighlight === null || itemToHighlight === void 0 ? void 0 : itemToHighlight.legendItem) || {};
        if (itemToHighlight) {
            if (isNumber(oldIx) && items[oldIx]) {
                setLegendItemHoverState(false, items[oldIx]);
            }
            scrollLegendToItem(this.legend, ix);
            var legendItemProp = legendItem.label;
            var proxyBtn = itemToHighlight.a11yProxyElement &&
                itemToHighlight.a11yProxyElement.innerElement;
            if (legendItemProp && legendItemProp.element && proxyBtn) {
                this.setFocusToElement(legendItemProp, proxyBtn);
            }
            setLegendItemHoverState(true, itemToHighlight);
            return true;
        }
        return false;
    }
    /**
     * @private
     */
    function compose(ChartClass, LegendClass) {
        var chartProto = ChartClass.prototype;
        if (!chartProto.highlightLegendItem) {
            chartProto.highlightLegendItem = chartHighlightLegendItem;
            addEvent(LegendClass, 'afterColorizeItem', legendOnAfterColorizeItem);
        }
    }
    LegendComponent.compose = compose;
    /**
     * Keep track of pressed state for legend items.
     * @private
     */
    function legendOnAfterColorizeItem(e) {
        var chart = this.chart, a11yOptions = chart.options.accessibility, legendItem = e.item;
        if (a11yOptions.enabled && legendItem && legendItem.a11yProxyElement) {
            legendItem.a11yProxyElement.innerElement.setAttribute('aria-pressed', e.visible ? 'true' : 'false');
        }
    }
})(LegendComponent || (LegendComponent = {}));
/* *
 *
 *  Default Export
 *
 * */
export default LegendComponent;
