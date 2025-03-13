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
import HeaderRow from './HeaderRow.js';
import Utils from '../../../Core/Utilities.js';
var getStyle = Utils.getStyle;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a table header row containing the cells (headers) with
 * column names.
 */
var TableHeader = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a new table head.
     *
     * @param viewport
     * The viewport (table) the table head belongs to.
     */
    function TableHeader(viewport) {
        var _a, _b;
        /* *
        *
        *  Properties
        *
        * */
        /**
         * The visible columns of the table.
         */
        this.columns = [];
        /**
         * The container of the table head.
         */
        this.rows = [];
        /**
         * Amount of levels in the header, that is used in creating correct rows.
         */
        this.levels = 1;
        this.viewport = viewport;
        this.columns = viewport.columns;
        if ((_a = viewport.dataGrid.options) === null || _a === void 0 ? void 0 : _a.header) {
            this.levels = this.getRowLevels((_b = viewport.dataGrid.options) === null || _b === void 0 ? void 0 : _b.header);
        }
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Renders the table head content.
     */
    TableHeader.prototype.render = function () {
        var vp = this.viewport;
        var dataGrid = vp.dataGrid;
        if (!dataGrid.enabledColumns) {
            return;
        }
        for (var i = 0, iEnd = this.levels; i < iEnd; i++) {
            var row = new HeaderRow(vp, i + 1); // Avoid indexing from 0
            row.renderMultipleLevel(i);
            this.rows.push(row);
        }
    };
    /**
     * Reflows the table head's content dimensions.
     */
    TableHeader.prototype.reflow = function () {
        var vp = this.viewport;
        if (!vp.theadElement) {
            return;
        }
        var _a = vp.tbodyElement, clientWidth = _a.clientWidth, offsetWidth = _a.offsetWidth;
        var header = vp.header;
        var rows = this.rows;
        var tableEl = header === null || header === void 0 ? void 0 : header.viewport.dataGrid.tableElement;
        var theadEL = header === null || header === void 0 ? void 0 : header.viewport.theadElement;
        var theadBorder = theadEL && getStyle(theadEL, 'border-right-width', true) || 0;
        var tableBorder = (tableEl && getStyle(tableEl, 'border-right-width', true)) || 0;
        var bordersWidth = offsetWidth - clientWidth - theadBorder - tableBorder;
        for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
            var row = rows_1[_i];
            row.reflow();
        }
        if (vp.rowsWidth) {
            vp.theadElement.style.width =
                Math.max(vp.rowsWidth, clientWidth) + bordersWidth + 'px';
        }
        // Adjust cell's width when scrollbar is enabled.
        if (header && bordersWidth > 0) {
            var cells = header.rows[header.rows.length - 1].cells;
            var cellHtmlElement = cells[cells.length - 1].htmlElement;
            cellHtmlElement.style.width = cellHtmlElement.style.maxWidth =
                cellHtmlElement.offsetWidth + bordersWidth + 'px';
        }
    };
    /**
     * Returns amount of rows for the current cell in header tree.
     *
     * @param scope
     * Structure of header
     *
     * @returns
     */
    TableHeader.prototype.getRowLevels = function (scope) {
        var maxDepth = 0;
        for (var _i = 0, scope_1 = scope; _i < scope_1.length; _i++) {
            var item = scope_1[_i];
            if (typeof item !== 'string' && item.columns) {
                var depth = this.getRowLevels(item.columns);
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
        }
        return maxDepth + 1;
    };
    /**
     * Scrolls the table head horizontally, only when the virtualization
     * is enabled.
     *
     * @param scrollLeft
     * The left scroll position.
     */
    TableHeader.prototype.scrollHorizontally = function (scrollLeft) {
        var el = this.viewport.theadElement;
        if (!el) {
            return;
        }
        el.style.transform = "translateX(".concat(-scrollLeft, "px)");
    };
    return TableHeader;
}());
/* *
 *
 *  Default Export
 *
 * */
export default TableHeader;
