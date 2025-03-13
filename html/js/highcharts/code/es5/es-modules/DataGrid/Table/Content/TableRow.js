/* *
 *
 *  DataGrid class
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
import Row from '../Row.js';
import TableCell from './TableCell.js';
import Globals from '../../Globals.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a row in the data grid.
 */
var TableRow = /** @class */ (function (_super) {
    __extends(TableRow, _super);
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a row in the data grid.
     *
     * @param viewport
     * The DataGrid Table instance which the row belongs to.
     *
     * @param index
     * The index of the row in the data table.
     */
    function TableRow(viewport, index) {
        var _this = _super.call(this, viewport) || this;
        /* *
        *
        *  Properties
        *
        * */
        /**
         * The row values from the data table in the original column order.
         */
        _this.data = [];
        /**
         * The vertical translation of the row.
         */
        _this.translateY = 0;
        _this.index = index;
        _this.id = viewport.dataTable.getOriginalRowIndex(index);
        _this.loadData();
        _this.setRowAttributes();
        return _this;
    }
    /* *
    *
    *  Methods
    *
    * */
    TableRow.prototype.createCell = function (column) {
        return new TableCell(column, this);
    };
    /**
     * Loads the row data from the data table.
     */
    TableRow.prototype.loadData = function () {
        var data = this.viewport.dataTable.getRow(this.index);
        if (!data) {
            return;
        }
        this.data = data;
    };
    /**
     * Adds or removes the hovered CSS class to the row element.
     *
     * @param hovered
     * Whether the row should be hovered.
     */
    TableRow.prototype.setHoveredState = function (hovered) {
        this.htmlElement.classList[hovered ? 'add' : 'remove'](Globals.classNames.hoveredRow);
        if (hovered) {
            this.viewport.dataGrid.hoveredRowIndex = this.index;
        }
    };
    /**
     * Sets the row HTML element attributes and additional classes.
     */
    TableRow.prototype.setRowAttributes = function () {
        var _a, _b;
        var idx = this.index;
        var el = this.htmlElement;
        var a11y = this.viewport.dataGrid.accessibility;
        el.classList.add(Globals.classNames.rowElement);
        // Index of the row in the presentation data table
        el.setAttribute('data-row-index', idx);
        // Index of the row in the original data table (ID)
        if (this.id !== void 0) {
            el.setAttribute('data-row-id', this.id);
        }
        // Calculate levels of header, 1 to avoid indexing from 0
        a11y === null || a11y === void 0 ? void 0 : a11y.setRowIndex(el, idx + ((_b = (_a = this.viewport.header) === null || _a === void 0 ? void 0 : _a.levels) !== null && _b !== void 0 ? _b : 1) + 1);
        // Indexing from 0, so rows with even index are odd.
        el.classList.add(Globals.classNames[idx % 2 ? 'rowEven' : 'rowOdd']);
        if (this.viewport.dataGrid.hoveredRowIndex === idx) {
            el.classList.add(Globals.classNames.hoveredRow);
        }
    };
    /**
     * Sets the vertical translation of the row. Used for virtual scrolling.
     *
     * @param value
     * The vertical translation of the row.
     */
    TableRow.prototype.setTranslateY = function (value) {
        this.translateY = value;
        this.htmlElement.style.transform = "translateY(".concat(value, "px)");
    };
    /**
     * Returns the default top offset of the row (before adjusting row heights).
     * @internal
     */
    TableRow.prototype.getDefaultTopOffset = function () {
        return this.index * this.viewport.rowsVirtualizer.defaultRowHeight;
    };
    return TableRow;
}(Row));
/* *
 *
 *  Default Export
 *
 * */
export default TableRow;
