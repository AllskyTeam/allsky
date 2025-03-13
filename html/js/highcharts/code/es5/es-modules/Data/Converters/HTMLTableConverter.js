/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Torstein Hønsi
 *  - Gøran Slettemark
 *  - Wojciech Chmiel
 *  - Sophie Bremer
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import DataConverter from './DataConverter.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Functions
 *
 * */
/**
 * Row equal
 */
function isRowEqual(row1, row2) {
    var i = row1.length;
    if (row2.length === i) {
        while (--i) {
            if (row1[i] !== row2[i]) {
                return false;
            }
        }
    }
    else {
        return false;
    }
    return true;
}
/* *
 *
 *  Class
 *
 * */
/**
 * Handles parsing and transformation of an HTML table to a table.
 *
 * @private
 */
var HTMLTableConverter = /** @class */ (function (_super) {
    __extends(HTMLTableConverter, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of the HTMLTableConverter.
     *
     * @param {HTMLTableConverter.UserOptions} [options]
     * Options for the HTMLTableConverter.
     */
    function HTMLTableConverter(options) {
        var _this = this;
        var mergedOptions = merge(HTMLTableConverter.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        _this.columns = [];
        _this.headers = [];
        _this.options = mergedOptions;
        if (mergedOptions.tableElement) {
            _this.tableElement = mergedOptions.tableElement;
            _this.tableElementID = mergedOptions.tableElement.id;
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Exports the dataconnector as an HTML string, using the options
     * provided on import unless other options are provided.
     *
     * @param {DataConnector} connector
     * Connector instance to export from.
     *
     * @param {HTMLTableConnector.ExportOptions} [options]
     * Options that override default or existing export options.
     *
     * @return {string}
     * HTML from the current dataTable.
     */
    HTMLTableConverter.prototype.export = function (connector, options) {
        if (options === void 0) { options = this.options; }
        var exportNames = (options.firstRowAsNames !== false), useMultiLevelHeaders = options.useMultiLevelHeaders;
        var columns = connector.getSortedColumns(options.usePresentationOrder), columnNames = Object.keys(columns), htmlRows = [], columnsCount = columnNames.length;
        var rowArray = [];
        var tableHead = '';
        // Add the names as the first row if they should be exported
        if (exportNames) {
            var subcategories = [];
            // If using multilevel headers, the first value
            // of each column is a subcategory
            if (useMultiLevelHeaders) {
                for (var _i = 0, columnNames_1 = columnNames; _i < columnNames_1.length; _i++) {
                    var name_1 = columnNames_1[_i];
                    var subhead = (columns[name_1].shift() || '').toString();
                    subcategories.push(subhead);
                }
                tableHead = this.getTableHeaderHTML(columnNames, subcategories, options);
            }
            else {
                tableHead = this.getTableHeaderHTML(void 0, columnNames, options);
            }
        }
        for (var columnIndex = 0; columnIndex < columnsCount; columnIndex++) {
            var columnName = columnNames[columnIndex], column = columns[columnName], columnLength = column.length;
            for (var rowIndex = 0; rowIndex < columnLength; rowIndex++) {
                var cellValue = column[rowIndex];
                if (!rowArray[rowIndex]) {
                    rowArray[rowIndex] = [];
                }
                // Alternative: Datatype from HTML attribute with
                // connector.whatIs(columnName)
                if (!(typeof cellValue === 'string' ||
                    typeof cellValue === 'number' ||
                    typeof cellValue === 'undefined')) {
                    cellValue = (cellValue || '').toString();
                }
                rowArray[rowIndex][columnIndex] = this.getCellHTMLFromValue(columnIndex ? 'td' : 'th', null, columnIndex ? '' : 'scope="row"', cellValue);
                // On the final column, push the row to the array
                if (columnIndex === columnsCount - 1) {
                    htmlRows.push('<tr>' +
                        rowArray[rowIndex].join('') +
                        '</tr>');
                }
            }
        }
        var caption = '';
        // Add table caption
        // Current exportdata falls back to chart title
        // but that should probably be handled elsewhere?
        if (options.tableCaption) {
            caption = '<caption class="highcharts-table-caption">' +
                options.tableCaption +
                '</caption>';
        }
        return ('<table>' +
            caption +
            tableHead +
            '<tbody>' +
            htmlRows.join('') +
            '</tbody>' +
            '</table>');
    };
    /**
     * Get table cell markup from row data.
     */
    HTMLTableConverter.prototype.getCellHTMLFromValue = function (tag, classes, attrs, value, decimalPoint) {
        var val = value, className = 'text' + (classes ? ' ' + classes : '');
        // Convert to string if number
        if (typeof val === 'number') {
            val = val.toString();
            if (decimalPoint === ',') {
                val = val.replace('.', decimalPoint);
            }
            className = 'number';
        }
        else if (!value) {
            val = '';
            className = 'empty';
        }
        return '<' + tag + (attrs ? ' ' + attrs : '') +
            ' class="' + className + '">' +
            val + '</' + tag + '>';
    };
    /**
     * Get table header markup from row data.
     */
    HTMLTableConverter.prototype.getTableHeaderHTML = function (topheaders, subheaders, options) {
        if (topheaders === void 0) { topheaders = []; }
        if (subheaders === void 0) { subheaders = []; }
        if (options === void 0) { options = this.options; }
        var useMultiLevelHeaders = options.useMultiLevelHeaders, useRowspanHeaders = options.useRowspanHeaders;
        var html = '<thead>', i = 0, len = subheaders && subheaders.length, next, cur, curColspan = 0, rowspan;
        // Clean up multiple table headers. Chart.getDataRows() returns two
        // levels of headers when using multilevel, not merged. We need to
        // merge identical headers, remove redundant headers, and keep it
        // all marked up nicely.
        if (useMultiLevelHeaders &&
            topheaders &&
            subheaders &&
            !isRowEqual(topheaders, subheaders)) {
            html += '<tr>';
            for (; i < len; ++i) {
                cur = topheaders[i];
                next = topheaders[i + 1];
                if (cur === next) {
                    ++curColspan;
                }
                else if (curColspan) {
                    // Ended colspan
                    // Add cur to HTML with colspan.
                    html += this.getCellHTMLFromValue('th', 'highcharts-table-topheading', 'scope="col" ' +
                        'colspan="' + (curColspan + 1) + '"', cur);
                    curColspan = 0;
                }
                else {
                    // Cur is standalone. If it is same as sublevel,
                    // remove sublevel and add just toplevel.
                    if (cur === subheaders[i]) {
                        if (useRowspanHeaders) {
                            rowspan = 2;
                            delete subheaders[i];
                        }
                        else {
                            rowspan = 1;
                            subheaders[i] = '';
                        }
                    }
                    else {
                        rowspan = 1;
                    }
                    html += this.getCellHTMLFromValue('th', 'highcharts-table-topheading', 'scope="col"' +
                        (rowspan > 1 ?
                            ' valign="top" rowspan="' + rowspan + '"' :
                            ''), cur);
                }
            }
            html += '</tr>';
        }
        // Add the subheaders (the only headers if not using multilevels)
        if (subheaders) {
            html += '<tr>';
            for (i = 0, len = subheaders.length; i < len; ++i) {
                if (typeof subheaders[i] !== 'undefined') {
                    html += this.getCellHTMLFromValue('th', null, 'scope="col"', subheaders[i]);
                }
            }
            html += '</tr>';
        }
        html += '</thead>';
        return html;
    };
    /**
     * Initiates the parsing of the HTML table
     *
     * @param {HTMLTableConverter.UserOptions}[options]
     * Options for the parser
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits CSVDataParser#parse
     * @emits CSVDataParser#afterParse
     * @emits HTMLTableParser#parseError
     */
    HTMLTableConverter.prototype.parse = function (options, eventDetail) {
        var converter = this, columns = [], headers = [], parseOptions = merge(converter.options, options), endRow = parseOptions.endRow, startColumn = parseOptions.startColumn, endColumn = parseOptions.endColumn, firstRowAsNames = parseOptions.firstRowAsNames, tableHTML = parseOptions.tableElement || this.tableElement;
        if (!(tableHTML instanceof HTMLElement)) {
            converter.emit({
                type: 'parseError',
                columns: columns,
                detail: eventDetail,
                headers: headers,
                error: 'Not a valid HTML Table'
            });
            return;
        }
        converter.tableElement = tableHTML;
        converter.tableElementID = tableHTML.id;
        this.emit({
            type: 'parse',
            columns: converter.columns,
            detail: eventDetail,
            headers: converter.headers
        });
        var rows = tableHTML.getElementsByTagName('tr'), rowsCount = rows.length;
        var rowIndex = 0, item, startRow = parseOptions.startRow;
        // Insert headers from the first row
        if (firstRowAsNames && rowsCount) {
            var items = rows[0].children, itemsLength = items.length;
            for (var i = startColumn; i < itemsLength; i++) {
                if (i > endColumn) {
                    break;
                }
                item = items[i];
                if (item.tagName === 'TD' ||
                    item.tagName === 'TH') {
                    headers.push(item.innerHTML);
                }
            }
            startRow++;
        }
        while (rowIndex < rowsCount) {
            if (rowIndex >= startRow && rowIndex <= endRow) {
                var columnsInRow = rows[rowIndex].children, columnsInRowLength = columnsInRow.length;
                var columnIndex = 0;
                while (columnIndex < columnsInRowLength) {
                    var relativeColumnIndex = columnIndex - startColumn, row = columns[relativeColumnIndex];
                    item = columnsInRow[columnIndex];
                    if ((item.tagName === 'TD' ||
                        item.tagName === 'TH') &&
                        (columnIndex >= startColumn &&
                            columnIndex <= endColumn)) {
                        if (!columns[relativeColumnIndex]) {
                            columns[relativeColumnIndex] = [];
                        }
                        var cellValue = converter.asGuessedType(item.innerHTML);
                        if (cellValue instanceof Date) {
                            cellValue = cellValue.getTime();
                        }
                        columns[relativeColumnIndex][rowIndex - startRow] = cellValue;
                        // Loop over all previous indices and make sure
                        // they are nulls, not undefined.
                        var i = 1;
                        while (rowIndex - startRow >= i &&
                            row[rowIndex - startRow - i] === void 0) {
                            row[rowIndex - startRow - i] = null;
                            i++;
                        }
                    }
                    columnIndex++;
                }
            }
            rowIndex++;
        }
        this.columns = columns;
        this.headers = headers;
        this.emit({
            type: 'afterParse',
            columns: columns,
            detail: eventDetail,
            headers: headers
        });
    };
    /**
     * Handles converting the parsed data to a table.
     *
     * @return {DataTable}
     * Table from the parsed HTML table
     */
    HTMLTableConverter.prototype.getTable = function () {
        return DataConverter.getTableFromColumns(this.columns, this.headers);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Default options
     */
    HTMLTableConverter.defaultOptions = __assign(__assign({}, DataConverter.defaultOptions), { useRowspanHeaders: true, useMultiLevelHeaders: true });
    return HTMLTableConverter;
}(DataConverter));
DataConverter.registerType('HTMLTable', HTMLTableConverter);
/* *
 *
 *  Default Export
 *
 * */
export default HTMLTableConverter;
