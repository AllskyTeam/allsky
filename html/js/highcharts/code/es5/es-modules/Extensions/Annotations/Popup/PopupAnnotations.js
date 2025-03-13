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
import H from '../../../Core/Globals.js';
var doc = H.doc, isFirefox = H.isFirefox;
import U from '../../../Core/Utilities.js';
var createElement = U.createElement, isArray = U.isArray, isObject = U.isObject, objectEach = U.objectEach, pick = U.pick, stableSort = U.stableSort;
/* *
 *
 *  Functions
 *
 * */
/**
 * Create annotation simple form.
 * It contains fields with param names.
 * @private
 * @param {Highcharts.Chart} chart
 * Chart
 * @param {Object} options
 * Options
 * @param {Function} callback
 * On click callback
 * @param {boolean} [isInit]
 * If it is a form declared for init annotation
 */
function addForm(chart, options, callback, isInit) {
    if (!chart) {
        return;
    }
    var popupDiv = this.container, lang = this.lang;
    // Create title of annotations
    var lhsCol = createElement('h2', {
        className: 'highcharts-popup-main-title'
    }, void 0, popupDiv);
    lhsCol.appendChild(doc.createTextNode(lang[options.langKey] || options.langKey || ''));
    // Left column
    lhsCol = createElement('div', {
        className: ('highcharts-popup-lhs-col highcharts-popup-lhs-full')
    }, void 0, popupDiv);
    var bottomRow = createElement('div', {
        className: 'highcharts-popup-bottom-row'
    }, void 0, popupDiv);
    addFormFields.call(this, lhsCol, chart, '', options, [], true);
    this.addButton(bottomRow, isInit ?
        (lang.addButton || 'Add') :
        (lang.saveButton || 'Save'), isInit ? 'add' : 'save', popupDiv, callback);
}
/**
 * Create annotation simple form. It contains two buttons
 * (edit / remove) and text label.
 * @private
 * @param {Highcharts.Chart} - chart
 * @param {Highcharts.AnnotationsOptions} - options
 * @param {Function} - on click callback
 */
function addToolbar(chart, options, callback) {
    var _this = this;
    var lang = this.lang, popupDiv = this.container, showForm = this.showForm, toolbarClass = 'highcharts-annotation-toolbar';
    // Set small size
    if (popupDiv.className.indexOf(toolbarClass) === -1) {
        popupDiv.className += ' ' + toolbarClass + ' highcharts-no-mousewheel';
    }
    // Set position
    if (chart) {
        popupDiv.style.top = chart.plotTop + 10 + 'px';
    }
    // Create label
    var label = createElement('p', {
        className: 'highcharts-annotation-label'
    }, void 0, popupDiv);
    label.setAttribute('aria-label', 'Annotation type');
    label.appendChild(doc.createTextNode(pick(
    // Advanced annotations:
    lang[options.langKey] || options.langKey, 
    // Basic shapes:
    options.shapes && options.shapes[0].type, '')));
    // Add buttons
    var button = this.addButton(popupDiv, lang.editButton || 'Edit', 'edit', popupDiv, function () {
        showForm.call(_this, 'annotation-edit', chart, options, callback);
    });
    button.className += ' highcharts-annotation-edit-button';
    button.style['background-image'] = 'url(' +
        this.iconsURL + 'edit.svg)';
    button = this.addButton(popupDiv, lang.removeButton || 'Remove', 'remove', popupDiv, callback);
    button.className += ' highcharts-annotation-remove-button';
    button.style['background-image'] = 'url(' +
        this.iconsURL + 'destroy.svg)';
}
/**
 * Create annotation's form fields.
 * @private
 * @param {Highcharts.HTMLDOMElement} parentDiv
 * Div where inputs are placed
 * @param {Highcharts.Chart} chart
 * Chart
 * @param {string} parentNode
 * Name of parent to create chain of names
 * @param {Highcharts.AnnotationsOptions} options
 * Options
 * @param {Array<unknown>} storage
 * Array where all items are stored
 * @param {boolean} [isRoot]
 * Recursive flag for root
 */
function addFormFields(parentDiv, chart, parentNode, options, storage, isRoot) {
    var _this = this;
    if (!chart) {
        return;
    }
    var addInput = this.addInput, lang = this.lang;
    var parentFullName, titleName;
    objectEach(options, function (value, option) {
        // Create name like params.styles.fontSize
        parentFullName = parentNode !== '' ? parentNode + '.' + option : option;
        if (isObject(value)) {
            if (
            // Value is object of options
            !isArray(value) ||
                // Array of objects with params. i.e labels in Fibonacci
                (isArray(value) && isObject(value[0]))) {
                titleName = lang[option] || option;
                if (!titleName.match(/\d/g)) {
                    storage.push([
                        true,
                        titleName,
                        parentDiv
                    ]);
                }
                addFormFields.call(_this, parentDiv, chart, parentFullName, value, storage, false);
            }
            else {
                storage.push([
                    _this,
                    parentFullName,
                    'annotation',
                    parentDiv,
                    value
                ]);
            }
        }
    });
    if (isRoot) {
        stableSort(storage, function (a) { return (a[1].match(/format/g) ? -1 : 1); });
        if (isFirefox) {
            storage.reverse(); // (#14691)
        }
        storage.forEach(function (genInput) {
            if (genInput[0] === true) {
                createElement('span', {
                    className: 'highcharts-annotation-title'
                }, void 0, genInput[2]).appendChild(doc.createTextNode(genInput[1]));
            }
            else {
                genInput[4] = {
                    value: genInput[4][0],
                    type: genInput[4][1]
                };
                addInput.apply(genInput[0], genInput.splice(1));
            }
        });
    }
}
/* *
 *
 *  Default Export
 *
 * */
var PopupAnnotations = {
    addForm: addForm,
    addToolbar: addToolbar
};
export default PopupAnnotations;
