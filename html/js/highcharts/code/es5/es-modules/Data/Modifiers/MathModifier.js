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
import DataModifier from './DataModifier.js';
import FormulaParser from '../Formula/FormulaParser.js';
import FormulaProcessor from '../Formula/FormulaProcessor.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Replaces formula strings in a table with calculated values.
 *
 * @class
 * @name Highcharts.DataModifier.types.MathModifier
 * @augments Highcharts.DataModifier
 */
var MathModifier = /** @class */ (function (_super) {
    __extends(MathModifier, _super);
    /* *
     *
     *  Constructor
     *
     * */
    function MathModifier(options) {
        var _this = _super.call(this) || this;
        _this.options = __assign(__assign({}, MathModifier.defaultOptions), options);
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    MathModifier.prototype.modifyTable = function (table, eventDetail) {
        var modifier = this;
        modifier.emit({ type: 'modify', detail: eventDetail, table: table });
        var alternativeSeparators = modifier.options.alternativeSeparators, formulaColumns = (modifier.options.formulaColumns ||
            table.getColumnNames()), modified = table.modified;
        for (var i = 0, iEnd = formulaColumns.length, columnName = void 0; i < iEnd; ++i) {
            columnName = formulaColumns[i];
            if (formulaColumns.indexOf(columnName) >= 0) {
                modified.setColumn(columnName, modifier.processColumn(table, columnName));
            }
        }
        var columnFormulas = (modifier.options.columnFormulas || []);
        for (var i = 0, iEnd = columnFormulas.length, columnFormula = void 0, formula = void 0; i < iEnd; ++i) {
            columnFormula = columnFormulas[i];
            formula = FormulaParser.parseFormula(columnFormula.formula, alternativeSeparators);
            modified.setColumn(columnFormula.column, modifier.processColumnFormula(formula, table, columnFormula.rowStart, columnFormula.rowEnd));
        }
        modifier.emit({ type: 'afterModify', detail: eventDetail, table: table });
        return table;
    };
    /**
     * Process a column by replacing formula strings with calculated values.
     *
     * @private
     *
     * @param {Highcharts.DataTable} table
     * Table to extract column from and use as reference.
     *
     * @param {string} columnName
     * Name of column to process.
     *
     * @param {number} rowIndex
     * Row index to start the replacing process from.
     *
     * @return {Highcharts.DataTableColumn}
     * Returns the processed table column.
     */
    MathModifier.prototype.processColumn = function (table, columnName, rowIndex) {
        if (rowIndex === void 0) { rowIndex = 0; }
        var alternativeSeparators = this.options.alternativeSeparators, column = (table.getColumn(columnName, true) || [])
            .slice(rowIndex > 0 ? rowIndex : 0);
        for (var i = 0, iEnd = column.length, cacheFormula = [], cacheString = '', cell = void 0; i < iEnd; ++i) {
            cell = column[i];
            if (typeof cell === 'string' &&
                cell[0] === '=') {
                try {
                    // Use cache while formula string is repetitive
                    cacheFormula = (cacheString === cell ?
                        cacheFormula :
                        FormulaParser.parseFormula(cell.substring(1), alternativeSeparators));
                    // Process parsed formula string
                    column[i] =
                        FormulaProcessor.processFormula(cacheFormula, table);
                }
                catch (_a) {
                    column[i] = NaN;
                }
            }
        }
        return column;
    };
    /**
     * Process a column by replacing cell values with calculated values from a
     * given formula.
     *
     * @private
     *
     * @param {Highcharts.Formula} formula
     * Formula to use for processing.
     *
     * @param {Highcharts.DataTable} table
     * Table to extract column from and use as reference.
     *
     * @param {number} rowStart
     * Row index to start the replacing process from.
     *
     * @param {number} rowEnd
     * Row index to end the replacing process.
     *
     * @return {Highcharts.DataTableColumn}
     * Returns the processed table column.
     */
    MathModifier.prototype.processColumnFormula = function (formula, table, rowStart, rowEnd) {
        if (rowStart === void 0) { rowStart = 0; }
        if (rowEnd === void 0) { rowEnd = table.getRowCount(); }
        rowStart = rowStart >= 0 ? rowStart : 0;
        rowEnd = rowEnd >= 0 ? rowEnd : table.getRowCount() + rowEnd;
        var column = [], modified = table.modified;
        for (var i = 0, iEnd = (rowEnd - rowStart); i < iEnd; ++i) {
            try {
                column[i] = FormulaProcessor.processFormula(formula, modified);
            }
            catch (_a) {
                column[i] = NaN;
            }
            finally {
                formula = FormulaProcessor.translateReferences(formula, 0, 1);
            }
        }
        return column;
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Default options of MathModifier.
     * @private
     */
    MathModifier.defaultOptions = {
        type: 'Math',
        alternativeSeparators: false
    };
    return MathModifier;
}(DataModifier));
DataModifier.registerType('Math', MathModifier);
/* *
 *
 *  Default Export
 *
 * */
export default MathModifier;
