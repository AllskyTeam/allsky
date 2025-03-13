/* *
 *
 *  DataGrid Rows Renderer class.
 *
 *  (c) 2020-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *
 * */
'use strict';
import DGUtils from '../../Utils.js';
import Globals from '../../Globals.js';
import TableRow from '../Content/TableRow.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a virtualized rows renderer for the data grid.
 */
var RowsVirtualizer = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs an instance of the rows virtualizer.
     *
     * @param viewport
     * The viewport of the data grid to render rows in.
     */
    function RowsVirtualizer(viewport) {
        var _a, _b;
        /**
         * The index of the first visible row.
         */
        this.rowCursor = 0;
        /**
         * Flag indicating if the scrolling handler should be prevented to avoid
         * flickering loops when scrolling to the last row.
         */
        this.preventScroll = false;
        this.rowSettings =
            (_b = (_a = viewport.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows;
        this.viewport = viewport;
        this.strictRowHeights = this.rowSettings.strictHeights;
        this.buffer = Math.max(this.rowSettings.bufferSize, 0);
        this.defaultRowHeight = this.getDefaultRowHeight();
        if (this.strictRowHeights) {
            viewport.tbodyElement.classList.add(Globals.classNames.rowsContentNowrap);
        }
    }
    /* *
    *
    *  Functions
    *
    * */
    /**
     * Renders the rows in the viewport for the first time.
     */
    RowsVirtualizer.prototype.initialRender = function () {
        var _a, _b;
        // Initial reflow to set the viewport height
        if ((_a = this.rowSettings) === null || _a === void 0 ? void 0 : _a.virtualization) {
            this.viewport.reflow();
        }
        // Load & render rows
        this.renderRows(this.rowCursor);
        if ((_b = this.rowSettings) === null || _b === void 0 ? void 0 : _b.virtualization) {
            this.adjustRowHeights();
        }
    };
    /**
     * Renders the rows in the viewport. It is called when the rows need to be
     * re-rendered, e.g., after a sort or filter operation.
     */
    RowsVirtualizer.prototype.rerender = function () {
        var _a;
        var rows = this.viewport.rows;
        var tbody = this.viewport.tbodyElement;
        var oldScrollTop;
        if (rows.length) {
            oldScrollTop = tbody.scrollTop;
            for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
                rows[i].destroy();
            }
            rows.length = 0;
        }
        this.renderRows(this.rowCursor);
        if ((_a = this.rowSettings) === null || _a === void 0 ? void 0 : _a.virtualization) {
            if (oldScrollTop !== void 0) {
                tbody.scrollTop = oldScrollTop;
            }
            this.scroll();
        }
        // Reflow the rendered row cells widths (check redundancy)
        for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
            rows[i].reflow();
        }
    };
    /**
     * Method called on the viewport scroll event, only when the virtualization
     * is enabled.
     */
    RowsVirtualizer.prototype.scroll = function () {
        var target = this.viewport.tbodyElement;
        var rowHeight = this.defaultRowHeight;
        var lastScrollTop = target.scrollTop;
        if (this.preventScroll) {
            if (lastScrollTop <= target.scrollTop) {
                this.preventScroll = false;
            }
            this.adjustBottomRowHeights();
            return;
        }
        // Do vertical virtual scrolling
        var rowCursor = Math.floor(target.scrollTop / rowHeight);
        if (this.rowCursor !== rowCursor) {
            this.renderRows(rowCursor);
        }
        this.rowCursor = rowCursor;
        this.adjustRowHeights();
        if (!this.strictRowHeights &&
            lastScrollTop > target.scrollTop &&
            !this.preventScroll) {
            target.scrollTop = lastScrollTop;
            this.preventScroll = true;
        }
    };
    /**
     * Adjusts the visible row heights from the bottom of the viewport.
     */
    RowsVirtualizer.prototype.adjustBottomRowHeights = function () {
        var rows = this.viewport.rows;
        var rowsLn = rows.length;
        var lastRow = rows[rowsLn - 1];
        var rowTop = lastRow.translateY;
        var rowBottom = rowTop + lastRow.htmlElement.offsetHeight;
        var newHeight = lastRow.cells[0].htmlElement.offsetHeight;
        rowTop = rowBottom - newHeight;
        lastRow.htmlElement.style.height = newHeight + 'px';
        lastRow.setTranslateY(rowTop);
        for (var j = 0, jEnd = lastRow.cells.length; j < jEnd; ++j) {
            lastRow.cells[j].htmlElement.style.transform = '';
        }
        for (var i = rowsLn - 2; i >= 0; i--) {
            var row = rows[i];
            newHeight = row.cells[0].htmlElement.offsetHeight;
            rowTop -= newHeight;
            row.htmlElement.style.height = newHeight + 'px';
            row.setTranslateY(rowTop);
            for (var j = 0, jEnd = row.cells.length; j < jEnd; ++j) {
                row.cells[j].htmlElement.style.transform = '';
            }
        }
    };
    /**
     * Renders rows in the specified range. Removes rows that are out of the
     * range except the last row.
     *
     * @param rowCursor
     * The index of the first visible row.
     */
    RowsVirtualizer.prototype.renderRows = function (rowCursor) {
        var _a, _b, _c, _d;
        var _e = this, vp = _e.viewport, buffer = _e.buffer;
        var isVirtualization = (_a = this.rowSettings) === null || _a === void 0 ? void 0 : _a.virtualization;
        var rowsPerPage = isVirtualization ? Math.ceil(vp.tbodyElement.offsetHeight / this.defaultRowHeight) : Infinity; // Need to be refactored when add pagination
        var rows = vp.rows;
        if (!isVirtualization && rows.length > 50) {
            // eslint-disable-next-line no-console
            console.warn('DataGrid: a large dataset can cause performance issues.');
        }
        if (!rows.length) {
            var last = new TableRow(vp, vp.dataTable.getRowCount() - 1);
            last.render();
            rows.push(last);
            vp.tbodyElement.appendChild(last.htmlElement);
            if (isVirtualization) {
                last.setTranslateY(last.getDefaultTopOffset());
            }
        }
        var from = Math.max(0, Math.min(rowCursor - buffer, vp.dataTable.getRowCount() - rowsPerPage));
        var to = Math.min(rowCursor + rowsPerPage + buffer, rows[rows.length - 1].index - 1);
        var alwaysLastRow = rows.pop();
        var tempRows = [];
        // Remove rows that are out of the range except the last row.
        for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
            var row = rows[i];
            var rowIndex = row.index;
            if (rowIndex < from || rowIndex > to) {
                row.destroy();
            }
            else {
                tempRows.push(row);
            }
        }
        rows = tempRows;
        vp.rows = rows;
        for (var i = from; i <= to; ++i) {
            var row = rows[i - (((_b = rows[0]) === null || _b === void 0 ? void 0 : _b.index) || 0)];
            // Recreate row when it is destroyed and it is in the range.
            if (!row) {
                var newRow = new TableRow(vp, i);
                rows.push(newRow);
                newRow.rendered = false;
                if (isVirtualization) {
                    newRow.setTranslateY(newRow.getDefaultTopOffset());
                }
            }
        }
        rows.sort(function (a, b) { return a.index - b.index; });
        for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
            if (!rows[i].rendered) {
                rows[i].render();
                vp.tbodyElement.insertBefore(rows[i].htmlElement, vp.tbodyElement.lastChild);
            }
        }
        if (alwaysLastRow) {
            rows.push(alwaysLastRow);
        }
        // Focus the cell if the focus cursor is set
        if (vp.focusCursor) {
            var _f = vp.focusCursor, rowIndex_1 = _f[0], columnIndex = _f[1];
            var row = rows.find(function (row) { return row.index === rowIndex_1; });
            if (row) {
                (_c = row.cells[columnIndex]) === null || _c === void 0 ? void 0 : _c.htmlElement.focus({
                    preventScroll: true
                });
            }
        }
        var firstVisibleRow = rows[rowCursor - rows[0].index];
        this.focusAnchorCell = firstVisibleRow === null || firstVisibleRow === void 0 ? void 0 : firstVisibleRow.cells[0];
        (_d = this.focusAnchorCell) === null || _d === void 0 ? void 0 : _d.htmlElement.setAttribute('tabindex', '0');
    };
    /**
     * Adjusts the heights of the rows based on the current scroll position.
     * It handles the possibility of the rows having different heights than
     * the default height.
     */
    RowsVirtualizer.prototype.adjustRowHeights = function () {
        if (this.strictRowHeights) {
            return;
        }
        var _a = this, cursor = _a.rowCursor, defaultH = _a.defaultRowHeight;
        var _b = this.viewport, rows = _b.rows, tbodyElement = _b.tbodyElement;
        var rowsLn = rows.length;
        var translateBuffer = rows[0].getDefaultTopOffset();
        for (var i = 0; i < rowsLn; ++i) {
            var row = rows[i];
            // Reset row height and cell transforms
            row.htmlElement.style.height = '';
            if (row.cells[0].htmlElement.style.transform) {
                for (var j = 0, jEnd = row.cells.length; j < jEnd; ++j) {
                    var cell = row.cells[j];
                    cell.htmlElement.style.transform = '';
                }
            }
            // Rows above the first visible row
            if (row.index < cursor) {
                row.htmlElement.style.height = defaultH + 'px';
                continue;
            }
            var cellHeight = row.cells[0].htmlElement.offsetHeight;
            row.htmlElement.style.height = cellHeight + 'px';
            // Rows below the first visible row
            if (row.index > cursor) {
                continue;
            }
            // First visible row
            if (row.htmlElement.offsetHeight > defaultH) {
                var newHeight = Math.floor(cellHeight - (cellHeight - defaultH) * (tbodyElement.scrollTop / defaultH - cursor));
                row.htmlElement.style.height = newHeight + 'px';
                for (var j = 0, jEnd = row.cells.length; j < jEnd; ++j) {
                    var cell = row.cells[j];
                    cell.htmlElement.style.transform = "translateY(".concat(newHeight - cellHeight, "px)");
                }
            }
        }
        for (var i = 1, iEnd = rowsLn - 1; i < iEnd; ++i) {
            translateBuffer += rows[i - 1].htmlElement.offsetHeight;
            rows[i].setTranslateY(translateBuffer);
        }
        // Set the proper offset for the last row
        var lastRow = rows[rowsLn - 1];
        var preLastRow = rows[rowsLn - 2];
        if (preLastRow && preLastRow.index === lastRow.index - 1) {
            lastRow.setTranslateY(preLastRow.htmlElement.offsetHeight + translateBuffer);
        }
    };
    /**
     * Reflow the rendered rows content dimensions.
     */
    RowsVirtualizer.prototype.reflowRows = function () {
        var _a;
        var rows = this.viewport.rows;
        if (rows.length < 1) {
            return;
        }
        for (var i = 0, iEnd = rows.length; i < iEnd; ++i) {
            rows[i].reflow();
        }
        if ((_a = this.rowSettings) === null || _a === void 0 ? void 0 : _a.virtualization) {
            this.adjustRowHeights();
        }
    };
    /**
     * Returns the default height of a row. This method should be called only
     * once on initialization.
     */
    RowsVirtualizer.prototype.getDefaultRowHeight = function () {
        var mockRow = makeHTMLElement('tr', {
            className: Globals.classNames.rowElement
        }, this.viewport.tbodyElement);
        var defaultRowHeight = mockRow.offsetHeight;
        mockRow.remove();
        return defaultRowHeight;
    };
    return RowsVirtualizer;
}());
/* *
 *
 *  Default Export
 *
 * */
export default RowsVirtualizer;
