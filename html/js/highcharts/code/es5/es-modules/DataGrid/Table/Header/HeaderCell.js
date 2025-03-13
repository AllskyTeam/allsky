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
import Cell from '../Cell.js';
import DGUtils from '../../Utils.js';
import Globals from '../../Globals.js';
import ColumnSorting from '../Actions/ColumnSorting.js';
import Utilities from '../../../Core/Utilities.js';
var makeHTMLElement = DGUtils.makeHTMLElement, isHTML = DGUtils.isHTML;
var merge = Utilities.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a cell in the data grid header.
 */
var HeaderCell = /** @class */ (function (_super) {
    __extends(HeaderCell, _super);
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a cell in the data grid header.
     *
     * @param column
     * The column of the cell.
     *
     * @param row
     * The row of the cell.
     */
    function HeaderCell(column, row) {
        var _this = _super.call(this, column, row) || this;
        /**
         * Reference to options in settings header.
         */
        _this.options = {};
        /**
         * Content value of the header cell.
         */
        _this.value = '';
        column.header = _this;
        _this.isMain = !!_this.row.viewport.getColumn(_this.column.id);
        return _this;
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Init element.
     */
    HeaderCell.prototype.init = function () {
        var elem = document.createElement('th', {});
        elem.classList.add(Globals.classNames.headerCell);
        return elem;
    };
    /**
     * Render the cell container.
     */
    HeaderCell.prototype.render = function () {
        var _a, _b;
        var _c, _d, _e;
        var column = this.column;
        var options = merge(column.options, this.options); // ??
        var headerCellOptions = options.header || {};
        var isSortableData = ((_c = options.sorting) === null || _c === void 0 ? void 0 : _c.sortable) && column.data;
        if (headerCellOptions.formatter) {
            this.value = headerCellOptions.formatter.call(this).toString();
        }
        else if (headerCellOptions.format) {
            this.value = column.format(headerCellOptions.format);
        }
        else {
            this.value = column.id;
        }
        // Render content of th element
        this.row.htmlElement.appendChild(this.htmlElement);
        this.headerContent = makeHTMLElement(isSortableData ? 'button' : 'span', {
            className: Globals.classNames.headerCellContent
        }, this.htmlElement);
        if (isSortableData) {
            this.headerContent.setAttribute('type', 'button');
        }
        if (isHTML(this.value)) {
            this.renderHTMLCellContent(this.value, this.headerContent);
        }
        else {
            this.headerContent.innerText = this.value;
        }
        this.htmlElement.setAttribute('scope', 'col');
        if (this.options.className) {
            (_a = this.htmlElement.classList).add.apply(_a, this.options.className.split(/\s+/g));
        }
        if (this.isMain) {
            this.htmlElement.setAttribute('data-column-id', column.id);
            // Add user column classname
            if (column.options.className) {
                (_b = this.htmlElement.classList).add.apply(_b, column.options.className.split(/\s+/g));
            }
            // Add resizing
            (_d = this.column.viewport.columnsResizer) === null || _d === void 0 ? void 0 : _d.renderColumnDragHandles(this.column, this);
            // Add sorting
            this.initColumnSorting();
        }
        this.setCustomClassName((_e = options.header) === null || _e === void 0 ? void 0 : _e.className);
    };
    HeaderCell.prototype.reflow = function () {
        var _a;
        var cell = this;
        var th = cell.htmlElement;
        var vp = cell.column.viewport;
        if (!th) {
            return;
        }
        var width = 0;
        if (cell.columns) {
            var columnsIds = vp.dataGrid.getColumnIds(cell.columns);
            for (var _i = 0, columnsIds_1 = columnsIds; _i < columnsIds_1.length; _i++) {
                var columnId = columnsIds_1[_i];
                width += ((_a = vp.getColumn(columnId || '')) === null || _a === void 0 ? void 0 : _a.getWidth()) || 0;
            }
        }
        else {
            width = cell.column.getWidth();
        }
        // Set the width of the column. Max width is needed for the
        // overflow: hidden to work.
        th.style.width = th.style.maxWidth = width + 'px';
    };
    HeaderCell.prototype.onKeyDown = function (e) {
        var _a, _b;
        if (e.target !== this.htmlElement) {
            return;
        }
        if (e.key === 'Enter') {
            if ((_a = this.column.options.sorting) === null || _a === void 0 ? void 0 : _a.sortable) {
                (_b = this.column.sorting) === null || _b === void 0 ? void 0 : _b.toggle();
            }
            return;
        }
        _super.prototype.onKeyDown.call(this, e);
    };
    HeaderCell.prototype.onClick = function (e) {
        var _a, _b, _c, _d, _e, _f, _g;
        var column = this.column;
        if (!this.isMain || (e.target !== this.htmlElement &&
            e.target !== ((_a = column.header) === null || _a === void 0 ? void 0 : _a.headerContent))) {
            return;
        }
        if ((_b = column.options.sorting) === null || _b === void 0 ? void 0 : _b.sortable) {
            (_c = column.sorting) === null || _c === void 0 ? void 0 : _c.toggle();
        }
        (_g = (_f = (_e = (_d = column.viewport.dataGrid.options) === null || _d === void 0 ? void 0 : _d.events) === null || _e === void 0 ? void 0 : _e.header) === null || _f === void 0 ? void 0 : _f.click) === null || _g === void 0 ? void 0 : _g.call(column);
    };
    /**
     * Add sorting option to the column.
     */
    HeaderCell.prototype.initColumnSorting = function () {
        var column = this.column;
        column.sorting = new ColumnSorting(column, this.htmlElement);
    };
    return HeaderCell;
}(Cell));
/* *
 *
 *  Default Export
 *
 * */
export default HeaderCell;
