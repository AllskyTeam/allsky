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
import Globals from '../../Globals.js';
import HeaderCell from './HeaderCell.js';
import Column from '../Column.js';
import DGUtils from '../../Utils.js';
var sanitizeText = DGUtils.sanitizeText;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a row in the data grid header.
 */
var HeaderRow = /** @class */ (function (_super) {
    __extends(HeaderRow, _super);
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
     * @param level
     * The current level of header that is rendered.
     */
    function HeaderRow(viewport, level) {
        var _this = _super.call(this, viewport) || this;
        _this.level = level;
        _this.setRowAttributes();
        return _this;
    }
    /* *
    *
    *  Methods
    *
    * */
    HeaderRow.prototype.createCell = function (column) {
        return new HeaderCell(column, this);
    };
    /**
     * Renders the row's content in the header.
     *
     * @param level
     * The current level in the header tree
     */
    HeaderRow.prototype.renderMultipleLevel = function (level) {
        var _a, _b, _c, _d, _e;
        var header = (_a = this.viewport.dataGrid.options) === null || _a === void 0 ? void 0 : _a.header;
        var vp = this.viewport;
        var enabledColumns = vp.dataGrid.enabledColumns;
        // Render element
        (_b = vp.theadElement) === null || _b === void 0 ? void 0 : _b.appendChild(this.htmlElement);
        this.htmlElement.classList.add(Globals.classNames.headerRow);
        if (!header) {
            _super.prototype.render.call(this);
            return;
        }
        var columnsOnLevel = this.getColumnsAtLevel(header, level);
        for (var i = 0, iEnd = columnsOnLevel.length; i < iEnd; i++) {
            var column = columnsOnLevel[i];
            var colSpan = (typeof column !== 'string' && column.columns) ?
                vp.dataGrid.getColumnIds(column.columns).length : 0;
            var columnId = typeof column === 'string' ?
                column : column.columnId;
            var dataColumn = vp.getColumn(columnId || '');
            var headerFormat = (typeof column !== 'string') ?
                column.format : void 0;
            var className = (typeof column !== 'string') ?
                column.className : void 0;
            // Skip hidden column or header when all columns are hidden.
            if ((columnId &&
                enabledColumns && (enabledColumns === null || enabledColumns === void 0 ? void 0 : enabledColumns.indexOf(columnId)) < 0) || (!dataColumn && colSpan === 0)) {
                continue;
            }
            var headerCell = this.createCell(vp.getColumn(columnId || '') ||
                new Column(vp, 
                // Remove HTML tags and empty spaces.
                sanitizeText(headerFormat || '').trim() || '', i));
            if (typeof column !== 'string') {
                (_c = vp.dataGrid.accessibility) === null || _c === void 0 ? void 0 : _c.addHeaderCellDescription(headerCell.htmlElement, (_d = column.accessibility) === null || _d === void 0 ? void 0 : _d.description);
            }
            if (headerFormat) {
                if (!headerCell.options.header) {
                    headerCell.options.header = {};
                }
                headerCell.options.header.format = headerFormat;
            }
            if (className) {
                headerCell.options.className = className;
            }
            // Add class to disable left border on first column
            if ((dataColumn === null || dataColumn === void 0 ? void 0 : dataColumn.index) === 0 && i === 0) {
                headerCell.htmlElement.classList.add(Globals.classNames.columnFirst);
            }
            headerCell.render();
            headerCell.columns =
                typeof column !== 'string' ? column.columns : void 0;
            if (columnId) {
                headerCell.htmlElement.setAttribute('rowSpan', (((_e = this.viewport.header) === null || _e === void 0 ? void 0 : _e.levels) || 1) - level);
            }
            else {
                if (colSpan > 1) {
                    headerCell.htmlElement.setAttribute('colSpan', colSpan);
                }
            }
        }
    };
    HeaderRow.prototype.reflow = function () {
        var row = this;
        for (var i = 0, iEnd = row.cells.length; i < iEnd; i++) {
            var cell = row.cells[i];
            cell.reflow();
        }
    };
    /**
     * Get all headers that should be rendered in a level.
     *
     * @param scope
     * Level that we start from
     *
     * @param targetLevel
     * Max level
     *
     * @param currentLevel
     * Current level
     *
     * @return
     * Array of headers that should be rendered in a level
     */
    HeaderRow.prototype.getColumnsAtLevel = function (scope, targetLevel, currentLevel) {
        if (currentLevel === void 0) { currentLevel = 0; }
        var result = [];
        for (var _i = 0, scope_1 = scope; _i < scope_1.length; _i++) {
            var column = scope_1[_i];
            if (currentLevel === targetLevel) {
                result.push(column);
            }
            if (typeof column !== 'string' && column.columns) {
                result = result.concat(this.getColumnsAtLevel(column.columns, targetLevel, currentLevel + 1));
            }
        }
        return result;
    };
    /**
     * Sets the row HTML element attributes and additional classes.
     */
    HeaderRow.prototype.setRowAttributes = function () {
        var a11y = this.viewport.dataGrid.accessibility;
        a11y === null || a11y === void 0 ? void 0 : a11y.setRowIndex(this.htmlElement, this.level);
    };
    return HeaderRow;
}(Row));
/* *
 *
 *  Default Export
 *
 * */
export default HeaderRow;
