/* *
 *
 *  DataGrid Cell Editing class.
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
import Globals from '../../Globals.js';
import DGUtils from '../../Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Class
 *
 * */
/**
 * The class that handles the manual editing of cells in the data grid.
 */
var CellEditing = /** @class */ (function () {
    function CellEditing() {
        /* *
        *
        *  Properties
        *
        * */
        var _this = this;
        /**
         * Handles the blur event on the input field.
         */
        this.onInputBlur = function () {
            _this.stopEditing();
        };
        /**
         * Handles the keydown event on the input field. Cancels editing on escape
         * and saves the value on enter.
         *
         * @param e
         * The keyboard event.
         */
        this.onInputKeyDown = function (e) {
            var keyCode = e.keyCode;
            // Enter / Escape
            if (keyCode === 13 || keyCode === 27) {
                // Cancel editing on escape
                _this.stopEditing(keyCode === 13);
            }
        };
    }
    /* *
     *
     *  Methods
     *
     * */
    /**
     * Turns the cell into an editable input field.
     *
     * @param cell
     * The cell that is to be edited.
     */
    CellEditing.prototype.startEditing = function (cell) {
        var _a;
        if (this.editedCell === cell) {
            return;
        }
        if (this.editedCell) {
            this.stopEditing();
        }
        this.editedCell = cell;
        var cellElement = cell.htmlElement;
        cellElement.innerHTML = '';
        cellElement.classList.add(Globals.classNames.editedCell);
        (_a = cell.row.viewport.dataGrid.accessibility) === null || _a === void 0 ? void 0 : _a.userEditedCell('started');
        this.renderInput();
    };
    /**
     * Stops the editing of the cell.
     *
     * @param submit
     * Whether to save the value of the input to the cell. Defaults to true.
     */
    CellEditing.prototype.stopEditing = function (submit) {
        var _a, _b, _c, _d, _e;
        if (submit === void 0) { submit = true; }
        var cell = this.editedCell;
        var input = this.inputElement;
        if (!cell || !input) {
            return;
        }
        var dataGrid = cell.column.viewport.dataGrid;
        var newValue = input.value;
        this.destroyInput();
        cell.htmlElement.classList.remove(Globals.classNames.editedCell);
        cell.htmlElement.focus();
        // Convert to number if possible
        if (!isNaN(+newValue)) {
            newValue = +newValue;
        }
        void cell.setValue(submit ? newValue : cell.value, submit && cell.value !== newValue);
        (_d = (_c = (_b = (_a = dataGrid.options) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.cell) === null || _c === void 0 ? void 0 : _c.afterEdit) === null || _d === void 0 ? void 0 : _d.call(cell);
        (_e = cell.row.viewport.dataGrid.accessibility) === null || _e === void 0 ? void 0 : _e.userEditedCell(submit ? 'edited' : 'cancelled');
        delete this.editedCell;
    };
    /**
     * Renders the input field for the cell, focuses it and sets up event
     * listeners.
     */
    CellEditing.prototype.renderInput = function () {
        var cell = this.editedCell;
        if (!cell) {
            return;
        }
        var cellEl = cell.htmlElement;
        var input = this.inputElement = makeHTMLElement('input', {}, cellEl);
        input.value = '' + cell.value;
        input.focus();
        input.addEventListener('blur', this.onInputBlur);
        input.addEventListener('keydown', this.onInputKeyDown);
    };
    /**
     * Removes event listeners and the input element.
     */
    CellEditing.prototype.destroyInput = function () {
        var input = this.inputElement;
        if (!input) {
            return;
        }
        input.removeEventListener('keydown', this.onInputKeyDown);
        input.removeEventListener('blur', this.onInputBlur);
        input.remove();
        delete this.inputElement;
    };
    return CellEditing;
}());
/* *
 *
 *  Default Export
 *
 * */
export default CellEditing;
