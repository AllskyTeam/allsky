/* *
 *
 *  DataGrid Accessibility class
 *
 *  (c) 2020-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *  - Sebastian Bochan
 *
 * */
'use strict';
import Globals from '../Globals.js';
import DGUtils from '../Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/**
 *  Representing the accessibility functionalities for the Data Grid.
 */
var Accessibility = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Construct the accessibility object.
     *
     * @param dataGrid
     * The DataGrid Table instance which the accessibility controller belong to.
     */
    function Accessibility(dataGrid) {
        var _a;
        this.dataGrid = dataGrid;
        this.element = document.createElement('div');
        this.element.classList.add(Globals.classNames.visuallyHidden);
        (_a = this.dataGrid.container) === null || _a === void 0 ? void 0 : _a.prepend(this.element);
        this.announcerElement = document.createElement('p');
        this.announcerElement.setAttribute('aria-atomic', 'true');
        this.announcerElement.setAttribute('aria-hidden', 'false');
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Add the 'editable' hint span element for the editable cell.
     *
     * @param cellElement
     * The cell element to add the description to.
     */
    Accessibility.prototype.addEditableCellHint = function (cellElement) {
        var _a, _b, _c, _d;
        var editableLang = (_d = (_c = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.lang) === null || _b === void 0 ? void 0 : _b.accessibility) === null || _c === void 0 ? void 0 : _c.cellEditing) === null || _d === void 0 ? void 0 : _d.editable;
        if (!editableLang) {
            return;
        }
        makeHTMLElement('span', {
            className: Globals.classNames.visuallyHidden,
            innerText: ', ' + editableLang
        }, cellElement);
    };
    /**
     * Add the description to the header cell.
     *
     * @param thElement
     * The header cell element to add the description to.
     *
     * @param description
     * The description to be added.
     */
    Accessibility.prototype.addHeaderCellDescription = function (thElement, description) {
        if (description) {
            thElement.setAttribute('aria-description', description);
        }
    };
    /**
     * Announce the message to the screen reader.
     *
     * @param msg
     * The message to be announced.
     *
     * @param assertive
     * Whether the message should be assertive. Default is false.
     */
    Accessibility.prototype.announce = function (msg, assertive) {
        var _this = this;
        if (assertive === void 0) { assertive = false; }
        if (this.announcerTimeout) {
            clearTimeout(this.announcerTimeout);
        }
        this.announcerElement.remove();
        this.announcerElement.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
        this.element.appendChild(this.announcerElement);
        this.announcerElement.textContent = msg;
        this.announcerTimeout = setTimeout(function () {
            _this.announcerElement.remove();
        }, 3000);
    };
    /**
     * Announce the message to the screen reader that the user sorted the
     * column.
     *
     * @param order
     * The order of the sorting.
     */
    Accessibility.prototype.userSortedColumn = function (order) {
        var _a, _b, _c, _d, _e;
        var options = this.dataGrid.options;
        var announcementsLang = (_c = (_b = (_a = options === null || options === void 0 ? void 0 : options.lang) === null || _a === void 0 ? void 0 : _a.accessibility) === null || _b === void 0 ? void 0 : _b.sorting) === null || _c === void 0 ? void 0 : _c.announcements;
        if (!((_e = (_d = options === null || options === void 0 ? void 0 : options.accessibility) === null || _d === void 0 ? void 0 : _d.announcements) === null || _e === void 0 ? void 0 : _e.sorting)) {
            return;
        }
        var msg;
        switch (order) {
            case 'asc':
                msg = announcementsLang === null || announcementsLang === void 0 ? void 0 : announcementsLang.ascending;
                break;
            case 'desc':
                msg = announcementsLang === null || announcementsLang === void 0 ? void 0 : announcementsLang.descending;
                break;
            default:
                msg = announcementsLang === null || announcementsLang === void 0 ? void 0 : announcementsLang.none;
        }
        if (!msg) {
            return;
        }
        this.announce(msg, true);
    };
    /**
     * Announce the message to the screen reader that the user edited the cell.
     *
     * @param msgType
     * The type of the edit message.
     */
    Accessibility.prototype.userEditedCell = function (msgType) {
        var _a, _b, _c, _d, _e;
        var options = this.dataGrid.options;
        var announcementsLang = (_c = (_b = (_a = options === null || options === void 0 ? void 0 : options.lang) === null || _a === void 0 ? void 0 : _a.accessibility) === null || _b === void 0 ? void 0 : _b.cellEditing) === null || _c === void 0 ? void 0 : _c.announcements;
        if (!((_e = (_d = options === null || options === void 0 ? void 0 : options.accessibility) === null || _d === void 0 ? void 0 : _d.announcements) === null || _e === void 0 ? void 0 : _e.cellEditing)) {
            return;
        }
        var msg = announcementsLang === null || announcementsLang === void 0 ? void 0 : announcementsLang[msgType];
        if (!msg) {
            return;
        }
        this.announce(msg);
    };
    /**
     * Set the aria sort state of the column header cell element.
     *
     * @param thElement
     * The header cell element to set the `aria-sort` state to.
     *
     * @param state
     * The sort state to be set for the column header cell.
     */
    Accessibility.prototype.setColumnSortState = function (thElement, state) {
        thElement === null || thElement === void 0 ? void 0 : thElement.setAttribute('aria-sort', state);
    };
    /**
     * Set the row index attribute for the row element.
     *
     * @param el
     * The row element to set the index to.
     *
     * @param idx
     * The index of the row in the data table.
     */
    Accessibility.prototype.setRowIndex = function (el, idx) {
        el.setAttribute('aria-rowindex', idx);
    };
    return Accessibility;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Accessibility;
