/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Accessibility component for chart container.
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
import AccessibilityComponent from '../AccessibilityComponent.js';
import KeyboardNavigationHandler from '../KeyboardNavigationHandler.js';
import CU from '../Utils/ChartUtilities.js';
var unhideChartElementFromAT = CU.unhideChartElementFromAT, getChartTitle = CU.getChartTitle;
import H from '../../Core/Globals.js';
var doc = H.doc;
import HU from '../Utils/HTMLUtilities.js';
var stripHTMLTags = HU.stripHTMLTagsFromString;
/**
 * The ContainerComponent class
 *
 * @private
 * @class
 * @name Highcharts.ContainerComponent
 */
var ContainerComponent = /** @class */ (function (_super) {
    __extends(ContainerComponent, _super);
    function ContainerComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Called on first render/updates to the chart, including options changes.
     */
    ContainerComponent.prototype.onChartUpdate = function () {
        this.handleSVGTitleElement();
        this.setSVGContainerLabel();
        this.setGraphicContainerAttrs();
        this.setRenderToAttrs();
        this.makeCreditsAccessible();
    };
    /**
     * @private
     */
    ContainerComponent.prototype.handleSVGTitleElement = function () {
        var chart = this.chart, titleId = 'highcharts-title-' + chart.index, titleContents = stripHTMLTags(chart.langFormat('accessibility.svgContainerTitle', {
            chartTitle: getChartTitle(chart)
        }));
        if (titleContents.length) {
            var titleElement = this.svgTitleElement =
                this.svgTitleElement || doc.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleElement.textContent = titleContents;
            titleElement.id = titleId;
            chart.renderTo.insertBefore(titleElement, chart.renderTo.firstChild);
        }
    };
    /**
     * @private
     */
    ContainerComponent.prototype.setSVGContainerLabel = function () {
        var chart = this.chart, svgContainerLabel = chart.langFormat('accessibility.svgContainerLabel', {
            chartTitle: getChartTitle(chart)
        });
        if (chart.renderer.box && svgContainerLabel.length) {
            chart.renderer.box.setAttribute('aria-label', svgContainerLabel);
        }
    };
    /**
     * @private
     */
    ContainerComponent.prototype.setGraphicContainerAttrs = function () {
        var chart = this.chart, label = chart.langFormat('accessibility.graphicContainerLabel', {
            chartTitle: getChartTitle(chart)
        });
        if (label.length) {
            chart.container.setAttribute('aria-label', label);
        }
    };
    /**
     * Set attributes on the chart container element.
     * @private
     */
    ContainerComponent.prototype.setRenderToAttrs = function () {
        var chart = this.chart, shouldHaveLandmark = chart.options.accessibility
            .landmarkVerbosity !== 'disabled', containerLabel = chart.langFormat('accessibility.chartContainerLabel', {
            title: getChartTitle(chart),
            chart: chart
        });
        if (containerLabel) {
            chart.renderTo.setAttribute('role', shouldHaveLandmark ? 'region' : 'group');
            chart.renderTo.setAttribute('aria-label', containerLabel);
        }
    };
    /**
     * @private
     */
    ContainerComponent.prototype.makeCreditsAccessible = function () {
        var chart = this.chart, credits = chart.credits;
        if (credits) {
            if (credits.textStr) {
                credits.element.setAttribute('aria-label', chart.langFormat('accessibility.credits', {
                    creditsStr: stripHTMLTags(credits.textStr, chart.renderer.forExport)
                }));
            }
            unhideChartElementFromAT(chart, credits.element);
        }
    };
    /**
     * Empty handler to just set focus on chart
     * @private
     */
    ContainerComponent.prototype.getKeyboardNavigation = function () {
        var chart = this.chart;
        return new KeyboardNavigationHandler(chart, {
            keyCodeMap: [],
            validate: function () {
                return true;
            },
            init: function () {
                var a11y = chart.accessibility;
                if (a11y) {
                    a11y.keyboardNavigation.tabindexContainer.focus();
                }
            }
        });
    };
    /**
     * Accessibility disabled/chart destroyed.
     */
    ContainerComponent.prototype.destroy = function () {
        this.chart.renderTo.setAttribute('aria-hidden', true);
    };
    return ContainerComponent;
}(AccessibilityComponent));
/* *
 *
 *  Default Export
 *
 * */
export default ContainerComponent;
