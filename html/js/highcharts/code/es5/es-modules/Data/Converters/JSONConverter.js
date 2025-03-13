/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Pawel Lysy
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
import DataTable from '../DataTable.js';
import U from '../../Core/Utilities.js';
var error = U.error, isArray = U.isArray, merge = U.merge, objectEach = U.objectEach;
/* *
 *
 *  Class
 *
 * */
/**
 * Handles parsing and transforming JSON to a table.
 *
 * @private
 */
var JSONConverter = /** @class */ (function (_super) {
    __extends(JSONConverter, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of the JSON parser.
     *
     * @param {JSONConverter.UserOptions} [options]
     * Options for the JSON parser.
     */
    function JSONConverter(options) {
        var _this = this;
        var mergedOptions = merge(JSONConverter.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        /* *
         *
         *  Properties
         *
         * */
        _this.columns = [];
        _this.headers = [];
        _this.options = mergedOptions;
        _this.table = new DataTable();
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initiates parsing of JSON structure.
     *
     * @param {JSONConverter.UserOptions}[options]
     * Options for the parser
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits JSONConverter#parse
     * @emits JSONConverter#afterParse
     */
    JSONConverter.prototype.parse = function (options, eventDetail) {
        var converter = this;
        options = merge(converter.options, options);
        var beforeParse = options.beforeParse, orientation = options.orientation, firstRowAsNames = options.firstRowAsNames, columnNames = options.columnNames;
        var data = options.data;
        if (!data) {
            return;
        }
        converter.columns = [];
        converter.emit({
            type: 'parse',
            columns: converter.columns,
            detail: eventDetail,
            headers: converter.headers
        });
        if (beforeParse) {
            data = beforeParse(data);
        }
        data = data.slice();
        if (orientation === 'columns') {
            for (var i = 0, iEnd = data.length; i < iEnd; i++) {
                var item = data[i];
                if (!(item instanceof Array)) {
                    return;
                }
                if (converter.headers instanceof Array) {
                    if (firstRowAsNames) {
                        converter.headers.push("".concat(item.shift()));
                    }
                    else if (columnNames && columnNames instanceof Array) {
                        converter.headers.push(columnNames[i]);
                    }
                    converter.table.setColumn(converter.headers[i] || i.toString(), item);
                }
                else {
                    error('JSONConverter: Invalid `columnNames` option.', false);
                }
            }
        }
        else if (orientation === 'rows') {
            if (firstRowAsNames) {
                converter.headers = data.shift();
            }
            else if (columnNames) {
                converter.headers = columnNames;
            }
            var _loop_1 = function (rowIndex, iEnd) {
                var row = data[rowIndex];
                if (isArray(row)) {
                    for (var columnIndex = 0, jEnd = row.length; columnIndex < jEnd; columnIndex++) {
                        if (converter.columns.length < columnIndex + 1) {
                            converter.columns.push([]);
                        }
                        converter.columns[columnIndex].push(row[columnIndex]);
                        if (converter.headers instanceof Array) {
                            this_1.table.setColumn(converter.headers[columnIndex] ||
                                columnIndex.toString(), converter.columns[columnIndex]);
                        }
                        else {
                            error('JSONConverter: Invalid `columnNames` option.', false);
                        }
                    }
                }
                else {
                    var columnNames_1 = converter.headers;
                    if (columnNames_1 && !(columnNames_1 instanceof Array)) {
                        var newRow_1 = {};
                        objectEach(columnNames_1, function (arrayWithPath, name) {
                            newRow_1[name] = arrayWithPath.reduce(function (acc, key) {
                                return acc[key];
                            }, row);
                        });
                        row = newRow_1;
                    }
                    this_1.table.setRows([row], rowIndex);
                }
            };
            var this_1 = this;
            for (var rowIndex = 0, iEnd = data.length; rowIndex < iEnd; rowIndex++) {
                _loop_1(rowIndex, iEnd);
            }
        }
        converter.emit({
            type: 'afterParse',
            columns: converter.columns,
            detail: eventDetail,
            headers: converter.headers
        });
    };
    /**
     * Handles converting the parsed data to a table.
     *
     * @return {DataTable}
     * Table from the parsed CSV.
     */
    JSONConverter.prototype.getTable = function () {
        return this.table;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Default options
     */
    JSONConverter.defaultOptions = __assign(__assign({}, DataConverter.defaultOptions), { data: [], orientation: 'rows' });
    return JSONConverter;
}(DataConverter));
DataConverter.registerType('JSON', JSONConverter);
/* *
 *
 *  Default Export
 *
 * */
export default JSONConverter;
