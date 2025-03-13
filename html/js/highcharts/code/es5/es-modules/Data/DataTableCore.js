/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Sophie Bremer
 *  - Gøran Slettemark
 *  - Torstein Hønsi
 *
 * */
'use strict';
import U from '../Core/Utilities.js';
var fireEvent = U.fireEvent, isArray = U.isArray, objectEach = U.objectEach, uniqueKey = U.uniqueKey;
/* *
 *
 *  Class
 *
 * */
/**
 * Class to manage columns and rows in a table structure. It provides methods
 * to add, remove, and manipulate columns and rows, as well as to retrieve data
 * from specific cells.
 *
 * @class
 * @name Highcharts.DataTable
 *
 * @param {Highcharts.DataTableOptions} [options]
 * Options to initialize the new DataTable instance.
 */
var DataTableCore = /** @class */ (function () {
    /**
     * Constructs an instance of the DataTable class.
     *
     * @example
     * const dataTable = new Highcharts.DataTableCore({
     *   columns: {
     *     year: [2020, 2021, 2022, 2023],
     *     cost: [11, 13, 12, 14],
     *     revenue: [12, 15, 14, 18]
     *   }
     * });

     *
     * @param {Highcharts.DataTableOptions} [options]
     * Options to initialize the new DataTable instance.
     */
    function DataTableCore(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        /**
         * Whether the ID was automatic generated or given in the constructor.
         *
         * @name Highcharts.DataTable#autoId
         * @type {boolean}
         */
        this.autoId = !options.id;
        this.columns = {};
        /**
         * ID of the table for indentification purposes.
         *
         * @name Highcharts.DataTable#id
         * @type {string}
         */
        this.id = (options.id || uniqueKey());
        this.modified = this;
        this.rowCount = 0;
        this.versionTag = uniqueKey();
        var rowCount = 0;
        objectEach(options.columns || {}, function (column, columnName) {
            _this.columns[columnName] = column.slice();
            rowCount = Math.max(rowCount, column.length);
        });
        this.applyRowCount(rowCount);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Applies a row count to the table by setting the `rowCount` property and
     * adjusting the length of all columns.
     *
     * @private
     * @param {number} rowCount The new row count.
     */
    DataTableCore.prototype.applyRowCount = function (rowCount) {
        this.rowCount = rowCount;
        objectEach(this.columns, function (column) {
            if (isArray(column)) { // Not on typed array
                column.length = rowCount;
            }
        });
    };
    /**
     * Fetches the given column by the canonical column name. Simplified version
     * of the full `DataTable.getRow` method, always returning by reference.
     *
     * @param {string} columnName
     * Name of the column to get.
     *
     * @return {Highcharts.DataTableColumn|undefined}
     * A copy of the column, or `undefined` if not found.
     */
    DataTableCore.prototype.getColumn = function (columnName, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asReference) {
        return this.columns[columnName];
    };
    /**
     * Retrieves all or the given columns. Simplified version of the full
     * `DataTable.getColumns` method, always returning by reference.
     *
     * @param {Array<string>} [columnNames]
     * Column names to retrieve.
     *
     * @return {Highcharts.DataTableColumnCollection}
     * Collection of columns. If a requested column was not found, it is
     * `undefined`.
     */
    DataTableCore.prototype.getColumns = function (columnNames, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asReference) {
        var _this = this;
        return (columnNames || Object.keys(this.columns)).reduce(function (columns, columnName) {
            columns[columnName] = _this.columns[columnName];
            return columns;
        }, {});
    };
    /**
     * Retrieves the row at a given index.
     *
     * @param {number} rowIndex
     * Row index to retrieve. First row has index 0.
     *
     * @param {Array<string>} [columnNames]
     * Column names to retrieve.
     *
     * @return {Record<string, number|string|undefined>|undefined}
     * Returns the row values, or `undefined` if not found.
     */
    DataTableCore.prototype.getRow = function (rowIndex, columnNames) {
        var _this = this;
        return (columnNames || Object.keys(this.columns)).map(function (key) { var _a; return (_a = _this.columns[key]) === null || _a === void 0 ? void 0 : _a[rowIndex]; });
    };
    /**
     * Sets cell values for a column. Will insert a new column, if not found.
     *
     * @param {string} columnName
     * Column name to set.
     *
     * @param {Highcharts.DataTableColumn} [column]
     * Values to set in the column.
     *
     * @param {number} [rowIndex=0]
     * Index of the first row to change. (Default: 0)
     *
     * @param {Record<string, (boolean|number|string|null|undefined)>} [eventDetail]
     * Custom information for pending events.
     *
     * @emits #setColumns
     * @emits #afterSetColumns
     */
    DataTableCore.prototype.setColumn = function (columnName, column, rowIndex, eventDetail) {
        var _a;
        if (column === void 0) { column = []; }
        if (rowIndex === void 0) { rowIndex = 0; }
        this.setColumns((_a = {}, _a[columnName] = column, _a), rowIndex, eventDetail);
    };
    /**
     * * Sets cell values for multiple columns. Will insert new columns, if not
     * found. Simplified version of the full `DataTable.setColumns`, limited to
     * full replacement of the columns (undefined `rowIndex`).
     *
     * @param {Highcharts.DataTableColumnCollection} columns
     * Columns as a collection, where the keys are the column names.
     *
     * @param {number} [rowIndex]
     * Index of the first row to change. Keep undefined to reset.
     *
     * @param {Record<string, (boolean|number|string|null|undefined)>} [eventDetail]
     * Custom information for pending events.
     *
     * @emits #setColumns
     * @emits #afterSetColumns
     */
    DataTableCore.prototype.setColumns = function (columns, rowIndex, eventDetail) {
        var _this = this;
        var rowCount = this.rowCount;
        objectEach(columns, function (column, columnName) {
            _this.columns[columnName] = column.slice();
            rowCount = column.length;
        });
        this.applyRowCount(rowCount);
        if (!(eventDetail === null || eventDetail === void 0 ? void 0 : eventDetail.silent)) {
            fireEvent(this, 'afterSetColumns');
            this.versionTag = uniqueKey();
        }
    };
    /**
     * Sets cell values of a row. Will insert a new row if no index was
     * provided, or if the index is higher than the total number of table rows.
     * A simplified version of the full `DateTable.setRow`, limited to objects.
     *
     * @param {Record<string, number|string|undefined>} row
     * Cell values to set.
     *
     * @param {number} [rowIndex]
     * Index of the row to set. Leave `undefind` to add as a new row.
     *
     * @param {boolean} [insert]
     * Whether to insert the row at the given index, or to overwrite the row.
     *
     * @param {Record<string, (boolean|number|string|null|undefined)>} [eventDetail]
     * Custom information for pending events.
     *
     * @emits #afterSetRows
     */
    DataTableCore.prototype.setRow = function (row, rowIndex, insert, eventDetail) {
        if (rowIndex === void 0) { rowIndex = this.rowCount; }
        var columns = this.columns, indexRowCount = insert ? this.rowCount + 1 : rowIndex + 1;
        objectEach(row, function (cellValue, columnName) {
            var column = columns[columnName] ||
                (eventDetail === null || eventDetail === void 0 ? void 0 : eventDetail.addColumns) !== false && new Array(indexRowCount);
            if (column) {
                if (insert) {
                    column.splice(rowIndex, 0, cellValue);
                }
                else {
                    column[rowIndex] = cellValue;
                }
                columns[columnName] = column;
            }
        });
        if (indexRowCount > this.rowCount) {
            this.applyRowCount(indexRowCount);
        }
        if (!(eventDetail === null || eventDetail === void 0 ? void 0 : eventDetail.silent)) {
            fireEvent(this, 'afterSetRows');
            this.versionTag = uniqueKey();
        }
    };
    return DataTableCore;
}());
/* *
 *
 *  Default Export
 *
 * */
export default DataTableCore;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * A column of values in a data table.
 * @typedef {Array<boolean|null|number|string|undefined>} Highcharts.DataTableColumn
 */ /**
* A collection of data table columns defined by a object where the key is the
* column name and the value is an array of the column values.
* @typedef {Record<string, Highcharts.DataTableColumn>} Highcharts.DataTableColumnCollection
*/
/**
 * Options for the `DataTable` or `DataTableCore` classes.
 * @interface Highcharts.DataTableOptions
 */ /**
* The column options for the data table. The columns are defined by an object
* where the key is the column ID and the value is an array of the column
* values.
*
* @name Highcharts.DataTableOptions.columns
* @type {Highcharts.DataTableColumnCollection|undefined}
*/ /**
* Custom ID to identify the new DataTable instance.
*
* @name Highcharts.DataTableOptions.id
* @type {string|undefined}
*/
(''); // Keeps doclets above in JS file
