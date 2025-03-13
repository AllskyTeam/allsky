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
import DGUtils from '../Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Abstract Class of Row
 *
 * */
/**
 * Represents a row in the data grid.
 */
var Row = /** @class */ (function () {
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
     */
    function Row(viewport) {
        /* *
        *
        *  Properties
        *
        * */
        /**
         * The cells of the row.
         */
        this.cells = [];
        this.viewport = viewport;
        this.htmlElement = makeHTMLElement('tr', {});
    }
    /**
     * Renders the row's content. It does not attach the row element to the
     * viewport nor pushes the rows to the viewport.rows array.
     */
    Row.prototype.render = function () {
        var _a, _b, _c;
        var columns = this.viewport.columns;
        for (var i = 0, iEnd = columns.length; i < iEnd; i++) {
            var cell = this.createCell(columns[i]);
            cell.render();
        }
        this.rendered = true;
        if ((_c = (_b = (_a = this.viewport.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization) {
            this.reflow();
        }
    };
    /**
     * Reflows the row's content dimensions.
     */
    Row.prototype.reflow = function () {
        for (var j = 0, jEnd = this.cells.length; j < jEnd; ++j) {
            this.cells[j].reflow();
        }
        var vp = this.viewport;
        if (vp.rowsWidth) {
            this.htmlElement.style.width = vp.rowsWidth + 'px';
        }
    };
    /**
     * Destroys the row.
     */
    Row.prototype.destroy = function () {
        if (!this.htmlElement) {
            return;
        }
        for (var i = this.cells.length - 1; i >= 0; --i) {
            this.cells[i].destroy();
        }
        this.htmlElement.remove();
    };
    /**
     * Returns the cell with the given column ID.
     *
     * @param columnId
     * The column ID that the cell belongs to.
     *
     * @returns
     * The cell with the given column ID or undefined if not found.
     */
    Row.prototype.getCell = function (columnId) {
        return this.cells.find(function (cell) { return cell.column.id === columnId; });
    };
    /**
     * Registers a cell in the row.
     *
     * @param cell
     * The cell to register.
     */
    Row.prototype.registerCell = function (cell) {
        this.cells.push(cell);
    };
    /**
     * Unregister a cell from the row.
     *
     * @param cell
     * The cell to unregister.
     */
    Row.prototype.unregisterCell = function (cell) {
        var index = this.cells.indexOf(cell);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
    };
    return Row;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Row;
