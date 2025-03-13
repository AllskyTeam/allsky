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
import Column from './Column.js';
import TableHeader from './Header/TableHeader.js';
import RowsVirtualizer from './Actions/RowsVirtualizer.js';
import ColumnsResizer from './Actions/ColumnsResizer.js';
import Globals from '../Globals.js';
import Utils from '../../Core/Utilities.js';
import CellEditing from './Actions/CellEditing.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
var getStyle = Utils.getStyle;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a table viewport of the data grid.
 */
var Table = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a new data grid table.
     *
     * @param dataGrid
     * The data grid instance which the table (viewport) belongs to.
     *
     * @param tableElement
     * The HTML table element of the data grid.
     */
    function Table(dataGrid, tableElement) {
        var _a;
        var _this = this;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        /**
         * The visible columns of the table.
         */
        this.columns = [];
        /**
         * The visible rows of the table.
         */
        this.rows = [];
        /**
         * Handles the focus event on the table body.
         *
         * @param e
         * The focus event.
         */
        this.onTBodyFocus = function (e) {
            var _a, _b;
            e.preventDefault();
            (_b = (_a = _this.rows[_this.rowsVirtualizer.rowCursor - _this.rows[0].index]) === null || _a === void 0 ? void 0 : _a.cells[0]) === null || _b === void 0 ? void 0 : _b.htmlElement.focus();
        };
        /**
         * Handles the resize event.
         */
        this.onResize = function () {
            _this.reflow(true);
        };
        /**
         * Handles the scroll event.
         */
        this.onScroll = function () {
            var _a;
            _this.rowsVirtualizer.scroll();
            (_a = _this.header) === null || _a === void 0 ? void 0 : _a.scrollHorizontally(_this.tbodyElement.scrollLeft);
        };
        this.dataGrid = dataGrid;
        this.dataTable = this.dataGrid.presentationTable;
        var dgOptions = dataGrid.options;
        var customClassName = (_c = (_b = dgOptions === null || dgOptions === void 0 ? void 0 : dgOptions.rendering) === null || _b === void 0 ? void 0 : _b.table) === null || _c === void 0 ? void 0 : _c.className;
        this.columnDistribution =
            (_e = (_d = dgOptions === null || dgOptions === void 0 ? void 0 : dgOptions.rendering) === null || _d === void 0 ? void 0 : _d.columns) === null || _e === void 0 ? void 0 : _e.distribution;
        this.renderCaption();
        if ((_g = (_f = dgOptions === null || dgOptions === void 0 ? void 0 : dgOptions.rendering) === null || _f === void 0 ? void 0 : _f.header) === null || _g === void 0 ? void 0 : _g.enabled) {
            this.theadElement = makeHTMLElement('thead', {}, tableElement);
        }
        this.tbodyElement = makeHTMLElement('tbody', {}, tableElement);
        this.rowsVirtualizer = new RowsVirtualizer(this);
        if ((_h = dgOptions === null || dgOptions === void 0 ? void 0 : dgOptions.columnDefaults) === null || _h === void 0 ? void 0 : _h.resizing) {
            this.columnsResizer = new ColumnsResizer(this);
        }
        this.cellEditing = new CellEditing();
        if (customClassName) {
            (_a = tableElement.classList).add.apply(_a, customClassName.split(/\s+/g));
        }
        this.init();
        // Add event listeners
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(tableElement);
        if ((_k = (_j = dgOptions === null || dgOptions === void 0 ? void 0 : dgOptions.rendering) === null || _j === void 0 ? void 0 : _j.rows) === null || _k === void 0 ? void 0 : _k.virtualization) {
            this.tbodyElement.addEventListener('scroll', this.onScroll);
            tableElement.classList.add(Globals.classNames.virtualization);
        }
        this.tbodyElement.addEventListener('focus', this.onTBodyFocus);
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Initializes the data grid table.
     */
    Table.prototype.init = function () {
        var _a, _b, _c;
        // Load columns
        this.loadColumns();
        // Load & render head
        if ((_c = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.header) === null || _c === void 0 ? void 0 : _c.enabled) {
            this.header = new TableHeader(this);
            this.header.render();
        }
        // TODO: Load & render footer
        // this.footer = new TableFooter(this);
        // this.footer.render();
        this.rowsVirtualizer.initialRender();
    };
    /**
     * Loads the columns of the table.
     */
    Table.prototype.loadColumns = function () {
        var enabledColumns = this.dataGrid.enabledColumns;
        if (!enabledColumns) {
            return;
        }
        var columnId;
        for (var i = 0, iEnd = enabledColumns.length; i < iEnd; ++i) {
            columnId = enabledColumns[i];
            this.columns.push(new Column(this, columnId, i));
        }
    };
    /**
     * Loads the modified data from the data table and renders the rows.
     */
    Table.prototype.loadPresentationData = function () {
        this.dataTable = this.dataGrid.presentationTable;
        for (var _i = 0, _a = this.columns; _i < _a.length; _i++) {
            var column = _a[_i];
            column.loadData();
        }
        this.rowsVirtualizer.rerender();
    };
    /**
     * Reflows the table's content dimensions.
     *
     * @param reflowColumns
     * Force reflow columns and recalculate widths.
     *
     */
    Table.prototype.reflow = function (reflowColumns) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (reflowColumns === void 0) { reflowColumns = false; }
        var tableEl = this.dataGrid.tableElement;
        var isVirtualization = (_c = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization;
        var borderWidth = tableEl ? (parseFloat('' + (getStyle(tableEl, 'border-top-width', false) || 0)) +
            parseFloat('' + (getStyle(tableEl, 'border-bottom-width', false) || 0))) : 0;
        if (isVirtualization) {
            this.tbodyElement.style.height = this.tbodyElement.style.minHeight = "".concat((((_d = this.dataGrid.container) === null || _d === void 0 ? void 0 : _d.clientHeight) || 0) -
                (((_e = this.theadElement) === null || _e === void 0 ? void 0 : _e.offsetHeight) || 0) -
                (((_f = this.captionElement) === null || _f === void 0 ? void 0 : _f.offsetHeight) || 0) -
                (((_g = this.dataGrid.credits) === null || _g === void 0 ? void 0 : _g.getHeight()) || 0) -
                borderWidth, "px");
        }
        // Get the width of the rows.
        if (this.columnDistribution === 'fixed') {
            var rowsWidth = 0;
            for (var i = 0, iEnd = this.columns.length; i < iEnd; ++i) {
                rowsWidth += this.columns[i].width;
            }
            this.rowsWidth = rowsWidth;
        }
        if (isVirtualization || reflowColumns) {
            // Reflow the head
            (_h = this.header) === null || _h === void 0 ? void 0 : _h.reflow();
            // Reflow rows content dimensions
            this.rowsVirtualizer.reflowRows();
        }
    };
    /**
     * Scrolls the table to the specified row.
     *
     * @param index
     * The index of the row to scroll to.
     *
     * Try it: {@link https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/data-grid/basic/scroll-to-row | Scroll to row}
     */
    Table.prototype.scrollToRow = function (index) {
        var _a, _b, _c;
        if ((_c = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization) {
            this.tbodyElement.scrollTop =
                index * this.rowsVirtualizer.defaultRowHeight;
            return;
        }
        var rowClass = '.' + Globals.classNames.rowElement;
        var firstRowTop = this.tbodyElement
            .querySelectorAll(rowClass)[0]
            .getBoundingClientRect().top;
        this.tbodyElement.scrollTop = (this.tbodyElement
            .querySelectorAll(rowClass)[index]
            .getBoundingClientRect().top) - firstRowTop;
    };
    /**
     * Get the widthRatio value from the width in pixels. The widthRatio is
     * calculated based on the width of the viewport.
     *
     * @param width
     * The width in pixels.
     *
     * @return The width ratio.
     *
     * @internal
     */
    Table.prototype.getRatioFromWidth = function (width) {
        return width / this.tbodyElement.clientWidth;
    };
    /**
     * Get the width in pixels from the widthRatio value. The width is
     * calculated based on the width of the viewport.
     *
     * @param ratio
     * The width ratio.
     *
     * @returns The width in pixels.
     *
     * @internal
     */
    Table.prototype.getWidthFromRatio = function (ratio) {
        return this.tbodyElement.clientWidth * ratio;
    };
    /**
     * Render caption above the datagrid
     * @internal
     */
    Table.prototype.renderCaption = function () {
        var _a;
        var _b;
        var captionOptions = (_b = this.dataGrid.options) === null || _b === void 0 ? void 0 : _b.caption;
        if (!(captionOptions === null || captionOptions === void 0 ? void 0 : captionOptions.text)) {
            return;
        }
        this.captionElement = makeHTMLElement('caption', {
            innerText: captionOptions.text,
            className: Globals.classNames.captionElement
        }, this.dataGrid.tableElement);
        if (captionOptions.className) {
            (_a = this.captionElement.classList).add.apply(_a, captionOptions.className.split(/\s+/g));
        }
    };
    /**
     * Destroys the data grid table.
     */
    Table.prototype.destroy = function () {
        var _a, _b, _c, _d;
        this.tbodyElement.removeEventListener('focus', this.onTBodyFocus);
        if ((_c = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization) {
            this.tbodyElement.removeEventListener('scroll', this.onScroll);
        }
        this.resizeObserver.disconnect();
        (_d = this.columnsResizer) === null || _d === void 0 ? void 0 : _d.removeEventListeners();
        for (var i = 0, iEnd = this.rows.length; i < iEnd; ++i) {
            this.rows[i].destroy();
        }
    };
    /**
     * Get the viewport state metadata. It is used to save the state of the
     * viewport and restore it when the data grid is re-rendered.
     *
     * @returns
     * The viewport state metadata.
     */
    Table.prototype.getStateMeta = function () {
        return {
            scrollTop: this.tbodyElement.scrollTop,
            scrollLeft: this.tbodyElement.scrollLeft,
            columnDistribution: this.columnDistribution,
            columnWidths: this.columns.map(function (column) { return column.width; }),
            focusCursor: this.focusCursor
        };
    };
    /**
     * Apply the metadata to the viewport state. It is used to restore the state
     * of the viewport when the data grid is re-rendered.
     *
     * @param meta
     * The viewport state metadata.
     */
    Table.prototype.applyStateMeta = function (meta) {
        var _a;
        this.tbodyElement.scrollTop = meta.scrollTop;
        this.tbodyElement.scrollLeft = meta.scrollLeft;
        if (this.columnDistribution === meta.columnDistribution &&
            this.columns.length === meta.columnWidths.length) {
            var widths = meta.columnWidths;
            for (var i = 0, iEnd = widths.length; i < iEnd; ++i) {
                this.columns[i].width = widths[i];
            }
            this.reflow();
            if (meta.focusCursor) {
                var _b = meta.focusCursor, rowIndex = _b[0], columnIndex = _b[1];
                var row = this.rows[rowIndex - this.rows[0].index];
                (_a = row === null || row === void 0 ? void 0 : row.cells[columnIndex]) === null || _a === void 0 ? void 0 : _a.htmlElement.focus();
            }
        }
    };
    /**
     * Returns the column with the provided ID.
     *
     * @param id
     * The ID of the column.
     */
    Table.prototype.getColumn = function (id) {
        var columns = this.dataGrid.enabledColumns;
        if (!columns) {
            return;
        }
        var columnIndex = columns.indexOf(id);
        if (columnIndex < 0) {
            return;
        }
        return this.columns[columnIndex];
    };
    /**
     * Returns the row with the provided ID.
     *
     * @param id
     * The ID of the row.
     */
    Table.prototype.getRow = function (id) {
        return this.rows.find(function (row) { return row.id === id; });
    };
    return Table;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Table;
