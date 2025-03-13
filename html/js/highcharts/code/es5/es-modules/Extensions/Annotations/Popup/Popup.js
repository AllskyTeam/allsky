/* *
 *
 *  Popup generator for Stock tools
 *
 *  (c) 2009-2024 Sebastian Bochan
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
import BaseForm from '../../../Shared/BaseForm.js';
import H from '../../../Core/Globals.js';
var doc = H.doc;
import D from '../../../Core/Defaults.js';
var getOptions = D.getOptions;
import PopupAnnotations from './PopupAnnotations.js';
import PopupIndicators from './PopupIndicators.js';
import PopupTabs from './PopupTabs.js';
import U from '../../../Core/Utilities.js';
var addEvent = U.addEvent, createElement = U.createElement, extend = U.extend, fireEvent = U.fireEvent, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get values from all inputs and selections then create JSON.
 *
 * @private
 *
 * @param {Highcharts.HTMLDOMElement} parentDiv
 * The container where inputs and selections are created.
 *
 * @param {string} type
 * Type of the popup bookmark (add|edit|remove).
 */
function getFields(parentDiv, type) {
    var inputList = Array.prototype.slice.call(parentDiv.querySelectorAll('input')), selectList = Array.prototype.slice.call(parentDiv.querySelectorAll('select')), optionSeries = '#highcharts-select-series > option:checked', optionVolume = '#highcharts-select-volume > option:checked', linkedTo = parentDiv.querySelectorAll(optionSeries)[0], volumeTo = parentDiv.querySelectorAll(optionVolume)[0];
    var fieldsOutput = {
        actionType: type,
        linkedTo: linkedTo && linkedTo.getAttribute('value') || '',
        fields: {}
    };
    inputList.forEach(function (input) {
        var param = input.getAttribute('highcharts-data-name'), seriesId = input.getAttribute('highcharts-data-series-id');
        // Params
        if (seriesId) {
            fieldsOutput.seriesId = input.value;
        }
        else if (param) {
            fieldsOutput.fields[param] = input.value;
        }
        else {
            // Type like sma / ema
            fieldsOutput.type = input.value;
        }
    });
    selectList.forEach(function (select) {
        var id = select.id;
        // Get inputs only for the parameters, not for series and volume.
        if (id !== 'highcharts-select-series' &&
            id !== 'highcharts-select-volume') {
            var parameter = id.split('highcharts-select-')[1];
            fieldsOutput.fields[parameter] = select.value;
        }
    });
    if (volumeTo) {
        fieldsOutput.fields['params.volumeSeriesID'] = volumeTo
            .getAttribute('value') || '';
    }
    return fieldsOutput;
}
/* *
 *
 *  Class
 *
 * */
var Popup = /** @class */ (function (_super) {
    __extends(Popup, _super);
    /* *
     *
     *  Constructor
     *
     * */
    function Popup(parentDiv, iconsURL, chart) {
        var _this = _super.call(this, parentDiv, iconsURL) || this;
        _this.chart = chart;
        _this.lang = (getOptions().lang.navigation || {}).popup || {};
        addEvent(_this.container, 'mousedown', function () {
            var activeAnnotation = chart &&
                chart.navigationBindings &&
                chart.navigationBindings.activeAnnotation;
            if (activeAnnotation) {
                activeAnnotation.cancelClick = true;
                var unbind_1 = addEvent(doc, 'click', function () {
                    setTimeout(function () {
                        activeAnnotation.cancelClick = false;
                    }, 0);
                    unbind_1();
                });
            }
        });
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Create input with label.
     *
     * @private
     *
     * @param {string} option
     *        Chain of fields i.e params.styles.fontSize separated by the dot.
     *
     * @param {string} indicatorType
     *        Type of the indicator i.e. sma, ema...
     *
     * @param {HTMLDOMElement} parentDiv
     *        HTML parent element.
     *
     * @param {Highcharts.InputAttributes} inputAttributes
     *        Attributes of the input.
     *
     * @return {HTMLInputElement}
     *         Return created input element.
     */
    Popup.prototype.addInput = function (option, indicatorType, parentDiv, inputAttributes) {
        var optionParamList = option.split('.'), optionName = optionParamList[optionParamList.length - 1], lang = this.lang, inputName = 'highcharts-' + indicatorType + '-' + pick(inputAttributes.htmlFor, optionName);
        if (!optionName.match(/^\d+$/)) {
            // Add label
            createElement('label', {
                htmlFor: inputName,
                className: inputAttributes.labelClassName
            }, void 0, parentDiv).appendChild(doc.createTextNode(lang[optionName] || optionName));
        }
        // Add input
        var input = createElement('input', {
            name: inputName,
            value: inputAttributes.value,
            type: inputAttributes.type,
            className: 'highcharts-popup-field'
        }, void 0, parentDiv);
        input.setAttribute('highcharts-data-name', option);
        return input;
    };
    Popup.prototype.closeButtonEvents = function () {
        if (this.chart) {
            var navigationBindings = this.chart.navigationBindings;
            fireEvent(navigationBindings, 'closePopup');
            if (navigationBindings &&
                navigationBindings.selectedButtonElement) {
                fireEvent(navigationBindings, 'deselectButton', { button: navigationBindings.selectedButtonElement });
            }
        }
        else {
            _super.prototype.closeButtonEvents.call(this);
        }
    };
    /**
     * Create button.
     * @private
     * @param {Highcharts.HTMLDOMElement} parentDiv
     * Container where elements should be added
     * @param {string} label
     * Text placed as button label
     * @param {string} type
     * add | edit | remove
     * @param {Function} callback
     * On click callback
     * @param {Highcharts.HTMLDOMElement} fieldsDiv
     * Container where inputs are generated
     * @return {Highcharts.HTMLDOMElement}
     * HTML button
     */
    Popup.prototype.addButton = function (parentDiv, label, type, fieldsDiv, callback) {
        var _this = this;
        var button = createElement('button', void 0, void 0, parentDiv);
        button.appendChild(doc.createTextNode(label));
        if (callback) {
            ['click', 'touchstart'].forEach(function (eventName) {
                addEvent(button, eventName, function () {
                    _this.closePopup();
                    return callback(getFields(fieldsDiv, type));
                });
            });
        }
        return button;
    };
    /**
     * Create content and show popup.
     * @private
     * @param {string} - type of popup i.e indicators
     * @param {Highcharts.Chart} - chart
     * @param {Highcharts.AnnotationsOptions} - options
     * @param {Function} - on click callback
     */
    Popup.prototype.showForm = function (type, chart, options, callback) {
        if (!chart) {
            return;
        }
        // Show blank popup
        this.showPopup();
        // Indicator form
        if (type === 'indicators') {
            this.indicators.addForm.call(this, chart, options, callback);
        }
        // Annotation small toolbar
        if (type === 'annotation-toolbar') {
            this.annotations.addToolbar.call(this, chart, options, callback);
        }
        // Annotation edit form
        if (type === 'annotation-edit') {
            this.annotations.addForm.call(this, chart, options, callback);
        }
        // Flags form - add / edit
        if (type === 'flag') {
            this.annotations.addForm.call(this, chart, options, callback, true);
        }
        this.type = type;
        // Explicit height is needed to make inner elements scrollable
        this.container.style.height = this.container.offsetHeight + 'px';
    };
    return Popup;
}(BaseForm));
extend(Popup.prototype, {
    annotations: PopupAnnotations,
    indicators: PopupIndicators,
    tabs: PopupTabs
});
/* *
 *
 *  Default Export
 *
 * */
export default Popup;
