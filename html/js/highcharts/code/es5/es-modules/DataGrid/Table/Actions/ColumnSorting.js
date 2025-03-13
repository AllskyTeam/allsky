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
import Globals from '../../Globals.js';
import DGUtils from '../../Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Class
 *
 * */
/**
 * Class that manages sorting for a dedicated column.
 */
var ColumnSorting = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs sorting for a dedicated column.
     *
     * @param column
     * The column that be sorted.
     *
     * @param headerCellElement
     * The head element of the column.
     */
    function ColumnSorting(column, headerCellElement) {
        var _this = this;
        var _a;
        /**
         * Toggle sorting order for the column in the order: asc -> desc -> none
         */
        this.toggle = function () {
            var _a;
            var viewport = _this.column.viewport;
            var querying = viewport.dataGrid.querying;
            var sortingController = querying.sorting;
            var currentOrder = (((_a = sortingController.currentSorting) === null || _a === void 0 ? void 0 : _a.columnId) === _this.column.id ?
                sortingController.currentSorting.order : null) || 'none';
            var consequents = {
                none: 'asc',
                asc: 'desc',
                desc: null
            };
            void _this.setOrder(consequents[currentOrder]);
        };
        this.column = column;
        this.headerCellElement = headerCellElement;
        this.addHeaderElementAttributes();
        if ((_a = column.options.sorting) === null || _a === void 0 ? void 0 : _a.sortable) {
            makeHTMLElement('span', {
                className: Globals.classNames.columnSortableIcon,
                innerText: '▲'
            }, headerCellElement).setAttribute('aria-hidden', true);
            headerCellElement.classList.add(Globals.classNames.columnSortable);
        }
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Adds attributes to the column header.
     */
    ColumnSorting.prototype.addHeaderElementAttributes = function () {
        var col = this.column;
        var a11y = col.viewport.dataGrid.accessibility;
        var sortingOptions = col.options.sorting;
        var currentSorting = col.viewport.dataGrid.querying.sorting.currentSorting;
        var el = this.headerCellElement;
        if ((currentSorting === null || currentSorting === void 0 ? void 0 : currentSorting.columnId) !== col.id || !(currentSorting === null || currentSorting === void 0 ? void 0 : currentSorting.order)) {
            el.classList.remove(Globals.classNames.columnSortedAsc);
            el.classList.remove(Globals.classNames.columnSortedDesc);
            if (sortingOptions === null || sortingOptions === void 0 ? void 0 : sortingOptions.sortable) {
                a11y === null || a11y === void 0 ? void 0 : a11y.setColumnSortState(el, 'none');
            }
            return;
        }
        switch (currentSorting === null || currentSorting === void 0 ? void 0 : currentSorting.order) {
            case 'asc':
                el.classList.add(Globals.classNames.columnSortedAsc);
                el.classList.remove(Globals.classNames.columnSortedDesc);
                a11y === null || a11y === void 0 ? void 0 : a11y.setColumnSortState(el, 'ascending');
                break;
            case 'desc':
                el.classList.remove(Globals.classNames.columnSortedAsc);
                el.classList.add(Globals.classNames.columnSortedDesc);
                a11y === null || a11y === void 0 ? void 0 : a11y.setColumnSortState(el, 'descending');
                break;
        }
    };
    /**
     * Set sorting order for the column. It will modify the presentation data
     * and rerender the rows.
     *
     * @param order
     * The order of sorting. It can be `'asc'`, `'desc'` or `null` if the
     * sorting should be disabled.
     */
    ColumnSorting.prototype.setOrder = function (order) {
        return __awaiter(this, void 0, void 0, function () {
            var viewport, querying, sortingController, a11y, _i, _a, col;
            var _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        viewport = this.column.viewport;
                        querying = viewport.dataGrid.querying;
                        sortingController = querying.sorting;
                        a11y = viewport.dataGrid.accessibility;
                        sortingController.setSorting(order, this.column.id);
                        return [4 /*yield*/, querying.proceed()];
                    case 1:
                        _g.sent();
                        viewport.loadPresentationData();
                        for (_i = 0, _a = viewport.columns; _i < _a.length; _i++) {
                            col = _a[_i];
                            (_b = col.sorting) === null || _b === void 0 ? void 0 : _b.addHeaderElementAttributes();
                        }
                        a11y === null || a11y === void 0 ? void 0 : a11y.userSortedColumn(order);
                        (_f = (_e = (_d = (_c = viewport.dataGrid.options) === null || _c === void 0 ? void 0 : _c.events) === null || _d === void 0 ? void 0 : _d.column) === null || _e === void 0 ? void 0 : _e.afterSorting) === null || _f === void 0 ? void 0 : _f.call(this.column);
                        return [2 /*return*/];
                }
            });
        });
    };
    return ColumnSorting;
}());
/* *
 *
 *  Default Export
 *
 * */
export default ColumnSorting;
