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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import Cell from '../Cell.js';
import Utils from '../../../Core/Utilities.js';
import DGUtils from '../../Utils.js';
var defined = Utils.defined, fireEvent = Utils.fireEvent;
var isHTML = DGUtils.isHTML;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a cell in the data grid.
 */
var TableCell = /** @class */ (function (_super) {
    __extends(TableCell, _super);
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a cell in the data grid.
     *
     * @param column
     * The column of the cell.
     *
     * @param row
     * The row of the cell.
     */
    function TableCell(column, row) {
        var _this = _super.call(this, column, row) || this;
        _this.row = row;
        _this.column.registerCell(_this);
        return _this;
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Renders the cell by appending it to the row and setting its value.
     */
    TableCell.prototype.render = function () {
        var _a;
        _super.prototype.render.call(this);
        // It may happen that `await` will be needed here in the future.
        void this.setValue((_a = this.column.data) === null || _a === void 0 ? void 0 : _a[this.row.index], false);
    };
    TableCell.prototype.initEvents = function () {
        var _this = this;
        this.cellEvents.push(['dblclick', function (e) {
                _this.onDblClick(e);
            }]);
        this.cellEvents.push(['mouseout', function () { return _this.onMouseOut(); }]);
        this.cellEvents.push(['mouseover', function () { return _this.onMouseOver(); }]);
        this.cellEvents.push(['mousedown', function (e) {
                _this.onMouseDown(e);
            }]);
        _super.prototype.initEvents.call(this);
    };
    /**
     * Handles the focus event on the cell.
     */
    TableCell.prototype.onFocus = function () {
        _super.prototype.onFocus.call(this);
        var vp = this.row.viewport;
        vp.focusCursor = [
            this.row.index,
            this.column.index
        ];
    };
    /**
     * Handles the mouse down event on the cell.
     *
     * @param e
     * The mouse event object.
     */
    TableCell.prototype.onMouseDown = function (e) {
        var dataGrid = this.row.viewport.dataGrid;
        if (e.target === this.htmlElement) {
            this.htmlElement.focus();
        }
        fireEvent(dataGrid, 'cellMouseDown', {
            target: this
        });
    };
    /**
     * Handles the mouse over event on the cell.
     */
    TableCell.prototype.onMouseOver = function () {
        var _a, _b, _c, _d;
        var dataGrid = this.row.viewport.dataGrid;
        dataGrid.hoverRow(this.row.index);
        dataGrid.hoverColumn(this.column.id);
        (_d = (_c = (_b = (_a = dataGrid.options) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.cell) === null || _c === void 0 ? void 0 : _c.mouseOver) === null || _d === void 0 ? void 0 : _d.call(this);
        fireEvent(dataGrid, 'cellMouseOver', {
            target: this
        });
    };
    /**
     * Handles the mouse out event on the cell.
     */
    TableCell.prototype.onMouseOut = function () {
        var _a, _b, _c, _d;
        var dataGrid = this.row.viewport.dataGrid;
        dataGrid.hoverRow();
        dataGrid.hoverColumn();
        (_d = (_c = (_b = (_a = dataGrid.options) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.cell) === null || _c === void 0 ? void 0 : _c.mouseOut) === null || _d === void 0 ? void 0 : _d.call(this);
        fireEvent(dataGrid, 'cellMouseOut', {
            target: this
        });
    };
    /**
     * Handles the double click event on the cell.
     *
     * @param e
     * The mouse event object.
     */
    TableCell.prototype.onDblClick = function (e) {
        var _a, _b, _c, _d, _e;
        var vp = this.row.viewport;
        var dataGrid = vp.dataGrid;
        if ((_a = this.column.options.cells) === null || _a === void 0 ? void 0 : _a.editable) {
            e.preventDefault();
            vp.cellEditing.startEditing(this);
        }
        (_e = (_d = (_c = (_b = dataGrid.options) === null || _b === void 0 ? void 0 : _b.events) === null || _c === void 0 ? void 0 : _c.cell) === null || _d === void 0 ? void 0 : _d.dblClick) === null || _e === void 0 ? void 0 : _e.call(this);
        fireEvent(dataGrid, 'cellDblClick', {
            target: this
        });
    };
    TableCell.prototype.onClick = function () {
        var _a, _b, _c, _d;
        var vp = this.row.viewport;
        var dataGrid = vp.dataGrid;
        (_d = (_c = (_b = (_a = dataGrid.options) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.cell) === null || _c === void 0 ? void 0 : _c.click) === null || _d === void 0 ? void 0 : _d.call(this);
        fireEvent(dataGrid, 'cellClick', {
            target: this
        });
    };
    TableCell.prototype.onKeyDown = function (e) {
        var _a;
        if (e.target !== this.htmlElement) {
            return;
        }
        if (e.key === 'Enter') {
            if ((_a = this.column.options.cells) === null || _a === void 0 ? void 0 : _a.editable) {
                this.row.viewport.cellEditing.startEditing(this);
            }
            return;
        }
        _super.prototype.onKeyDown.call(this, e);
    };
    /**
     * Sets the value & updating content of the cell.
     *
     * @param value
     * The raw value to set.
     *
     * @param updateTable
     * Whether to update the table after setting the content.
     */
    TableCell.prototype.setValue = function (value, updateTable) {
        return __awaiter(this, void 0, void 0, function () {
            var vp, element, cellContent, originalDataTable, rowTableIndex, focusedRowId, newRowIndex;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        this.value = value;
                        vp = this.column.viewport;
                        element = this.htmlElement;
                        cellContent = this.formatCell();
                        if (isHTML(cellContent)) {
                            this.renderHTMLCellContent(cellContent, element);
                        }
                        else {
                            element.innerText = cellContent;
                        }
                        this.htmlElement.setAttribute('data-value', this.value + '');
                        this.setCustomClassName((_a = this.column.options.cells) === null || _a === void 0 ? void 0 : _a.className);
                        if ((_b = this.column.options.cells) === null || _b === void 0 ? void 0 : _b.editable) {
                            (_c = vp.dataGrid.accessibility) === null || _c === void 0 ? void 0 : _c.addEditableCellHint(this.htmlElement);
                        }
                        (_g = (_f = (_e = (_d = vp.dataGrid.options) === null || _d === void 0 ? void 0 : _d.events) === null || _e === void 0 ? void 0 : _e.cell) === null || _f === void 0 ? void 0 : _f.afterSetValue) === null || _g === void 0 ? void 0 : _g.call(this);
                        if (!updateTable) {
                            return [2 /*return*/];
                        }
                        originalDataTable = vp.dataGrid.dataTable;
                        rowTableIndex = this.row.id && (originalDataTable === null || originalDataTable === void 0 ? void 0 : originalDataTable.getLocalRowIndex(this.row.id));
                        if (!originalDataTable || rowTableIndex === void 0) {
                            return [2 /*return*/];
                        }
                        originalDataTable.setCell(this.column.id, rowTableIndex, this.value);
                        if (vp.dataGrid.querying.willNotModify()) {
                            // If the data table does not need to be modified, skip the
                            // data modification and don't update the whole table. It checks
                            // if the modifiers are globally set. Can be changed in the future
                            // to check if the modifiers are set for the specific columns.
                            return [2 /*return*/];
                        }
                        if (vp.focusCursor) {
                            focusedRowId = vp.dataTable.getOriginalRowIndex(vp.focusCursor[0]);
                        }
                        return [4 /*yield*/, vp.dataGrid.querying.proceed(true)];
                    case 1:
                        _j.sent();
                        vp.loadPresentationData();
                        if (focusedRowId !== void 0 && vp.focusCursor) {
                            newRowIndex = vp.dataTable.getLocalRowIndex(focusedRowId);
                            if (newRowIndex !== void 0) {
                                (_h = vp.rows[newRowIndex - vp.rows[0].index]) === null || _h === void 0 ? void 0 : _h.cells[vp.focusCursor[1]].htmlElement.focus();
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle the formatting content of the cell.
     */
    TableCell.prototype.formatCell = function () {
        var options = this.column.options.cells || {};
        var format = options.format, formatter = options.formatter;
        var value = this.value;
        if (!defined(value)) {
            value = '';
        }
        var cellContent = '';
        if (formatter) {
            cellContent = formatter.call(this).toString();
        }
        else {
            cellContent = (format ? this.format(format) : value + '');
        }
        return cellContent;
    };
    /**
     * Destroys the cell.
     */
    TableCell.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
    };
    return TableCell;
}(Cell));
/* *
 *
 *  Default Export
 *
 * */
export default TableCell;
