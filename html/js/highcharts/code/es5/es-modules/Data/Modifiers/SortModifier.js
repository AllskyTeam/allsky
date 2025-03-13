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
 *  - Dawid Dragula
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
import DataModifier from './DataModifier.js';
import DataTable from '../DataTable.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Sort table rows according to values of a column.
 *
 */
var SortModifier = /** @class */ (function (_super) {
    __extends(SortModifier, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of the range modifier.
     *
     * @param {Partial<RangeDataModifier.Options>} [options]
     * Options to configure the range modifier.
     */
    function SortModifier(options) {
        var _this = _super.call(this) || this;
        _this.options = merge(SortModifier.defaultOptions, options);
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    SortModifier.ascending = function (a, b) {
        return ((a || 0) < (b || 0) ? -1 :
            (a || 0) > (b || 0) ? 1 :
                0);
    };
    SortModifier.descending = function (a, b) {
        return ((b || 0) < (a || 0) ? -1 :
            (b || 0) > (a || 0) ? 1 :
                0);
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Returns index and row for sort reference.
     *
     * @private
     *
     * @param {Highcharts.DataTable} table
     * Table with rows to reference.
     *
     * @return {Array<SortModifier.RowReference>}
     * Array of row references.
     */
    SortModifier.prototype.getRowReferences = function (table) {
        var rows = table.getRows(), rowReferences = [];
        for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
            rowReferences.push({
                index: i,
                row: rows[i]
            });
        }
        return rowReferences;
    };
    /**
     * Applies partial modifications of a cell change to the property `modified`
     * of the given modified table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {string} columnName
     * Column name of changed cell.
     *
     * @param {number|undefined} rowIndex
     * Row index of changed cell.
     *
     * @param {Highcharts.DataTableCellType} cellValue
     * Changed cell value.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    SortModifier.prototype.modifyCell = function (table, columnName, rowIndex, cellValue, eventDetail) {
        var modifier = this, _a = modifier.options, orderByColumn = _a.orderByColumn, orderInColumn = _a.orderInColumn;
        if (columnName === orderByColumn) {
            if (orderInColumn) {
                table.modified.setCell(columnName, rowIndex, cellValue);
                table.modified.setColumn(orderInColumn, modifier
                    .modifyTable(new DataTable({
                    columns: table
                        .getColumns([orderByColumn, orderInColumn])
                }))
                    .modified
                    .getColumn(orderInColumn));
            }
            else {
                modifier.modifyTable(table, eventDetail);
            }
        }
        return table;
    };
    /**
     * Applies partial modifications of column changes to the property
     * `modified` of the given table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Highcharts.DataTableColumnCollection} columns
     * Changed columns as a collection, where the keys are the column names.
     *
     * @param {number} [rowIndex=0]
     * Index of the first changed row.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    SortModifier.prototype.modifyColumns = function (table, columns, rowIndex, eventDetail) {
        var modifier = this, _a = modifier.options, orderByColumn = _a.orderByColumn, orderInColumn = _a.orderInColumn, columnNames = Object.keys(columns);
        if (columnNames.indexOf(orderByColumn) > -1) {
            if (orderInColumn &&
                columns[columnNames[0]].length) {
                table.modified.setColumns(columns, rowIndex);
                table.modified.setColumn(orderInColumn, modifier
                    .modifyTable(new DataTable({
                    columns: table
                        .getColumns([orderByColumn, orderInColumn])
                }))
                    .modified
                    .getColumn(orderInColumn));
            }
            else {
                modifier.modifyTable(table, eventDetail);
            }
        }
        return table;
    };
    /**
     * Applies partial modifications of row changes to the property `modified`
     * of the given table.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Array<(Highcharts.DataTableRow|Highcharts.DataTableRowObject)>} rows
     * Changed rows.
     *
     * @param {number} [rowIndex]
     * Index of the first changed row.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    SortModifier.prototype.modifyRows = function (table, rows, rowIndex, eventDetail) {
        var modifier = this, _a = modifier.options, orderByColumn = _a.orderByColumn, orderInColumn = _a.orderInColumn;
        if (orderInColumn &&
            rows.length) {
            table.modified.setRows(rows, rowIndex);
            table.modified.setColumn(orderInColumn, modifier
                .modifyTable(new DataTable({
                columns: table
                    .getColumns([orderByColumn, orderInColumn])
            }))
                .modified
                .getColumn(orderInColumn));
        }
        else {
            modifier.modifyTable(table, eventDetail);
        }
        return table;
    };
    /**
     * Sorts rows in the table.
     *
     * @param {DataTable} table
     * Table to sort in.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {DataTable}
     * Table with `modified` property as a reference.
     */
    SortModifier.prototype.modifyTable = function (table, eventDetail) {
        var _a;
        var modifier = this;
        modifier.emit({ type: 'modify', detail: eventDetail, table: table });
        var columnNames = table.getColumnNames(), rowCount = table.getRowCount(), rowReferences = this.getRowReferences(table), _b = modifier.options, direction = _b.direction, orderByColumn = _b.orderByColumn, orderInColumn = _b.orderInColumn, compare = (direction === 'asc' ?
            SortModifier.ascending :
            SortModifier.descending), orderByColumnIndex = columnNames.indexOf(orderByColumn), modified = table.modified;
        if (orderByColumnIndex !== -1) {
            rowReferences.sort(function (a, b) { return compare(a.row[orderByColumnIndex], b.row[orderByColumnIndex]); });
        }
        if (orderInColumn) {
            var column = [];
            for (var i = 0; i < rowCount; ++i) {
                column[rowReferences[i].index] = i;
            }
            modified.setColumns((_a = {}, _a[orderInColumn] = column, _a));
        }
        else {
            var originalIndexes = [];
            var rows = [];
            var rowReference = void 0;
            for (var i = 0; i < rowCount; ++i) {
                rowReference = rowReferences[i];
                originalIndexes.push(modified.getOriginalRowIndex(rowReference.index));
                rows.push(rowReference.row);
            }
            modified.setRows(rows, 0);
            modified.setOriginalRowIndexes(originalIndexes);
        }
        modifier.emit({ type: 'afterModify', detail: eventDetail, table: table });
        return table;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Default options to group table rows.
     */
    SortModifier.defaultOptions = {
        type: 'Sort',
        direction: 'desc',
        orderByColumn: 'y'
    };
    return SortModifier;
}(DataModifier));
DataModifier.registerType('Sort', SortModifier);
/* *
 *
 *  Default Export
 *
 * */
export default SortModifier;
