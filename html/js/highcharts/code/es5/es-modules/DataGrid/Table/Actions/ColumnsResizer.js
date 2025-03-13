/* *
 *
 *  DataGrid Columns Resizer class.
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
import Column from '../Column.js';
import Globals from '../../Globals.js';
import DGUtils from '../../Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Class
 *
 * */
/**
 * The class that handles the resizing of columns in the data grid.
 */
var ColumnsResizer = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function ColumnsResizer(viewport) {
        var _this = this;
        /**
         * The handles and their mouse down event listeners.
         */
        this.handles = [];
        /**
         * Handles the mouse move event on the document.
         *
         * @param e
         * The mouse event.
         */
        this.onDocumentMouseMove = function (e) {
            var _a, _b, _c, _d, _e, _f, _g;
            if (!_this.draggedResizeHandle || !_this.draggedColumn) {
                return;
            }
            var diff = e.pageX - (_this.dragStartX || 0);
            var vp = _this.viewport;
            if (vp.columnDistribution === 'full') {
                _this.fullDistributionResize(diff);
            }
            else {
                _this.fixedDistributionResize(diff);
            }
            vp.reflow(true);
            if ((_c = (_b = (_a = vp.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization) {
                vp.rowsVirtualizer.adjustRowHeights();
            }
            (_g = (_f = (_e = (_d = vp.dataGrid.options) === null || _d === void 0 ? void 0 : _d.events) === null || _e === void 0 ? void 0 : _e.column) === null || _f === void 0 ? void 0 : _f.afterResize) === null || _g === void 0 ? void 0 : _g.call(_this.draggedColumn);
        };
        /**
         * Handles the mouse up event on the document.
         */
        this.onDocumentMouseUp = function () {
            var _a, _b, _c;
            (_c = (_b = (_a = _this.draggedColumn) === null || _a === void 0 ? void 0 : _a.header) === null || _b === void 0 ? void 0 : _b.htmlElement) === null || _c === void 0 ? void 0 : _c.classList.remove(Globals.classNames.resizedColumn);
            _this.dragStartX = void 0;
            _this.draggedColumn = void 0;
            _this.draggedResizeHandle = void 0;
            _this.columnStartWidth = void 0;
            _this.nextColumnStartWidth = void 0;
        };
        this.viewport = viewport;
        document.addEventListener('mousemove', this.onDocumentMouseMove);
        document.addEventListener('mouseup', this.onDocumentMouseUp);
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Resizes the columns in the full distribution mode.
     *
     * @param diff
     * The X position difference in pixels.
     */
    ColumnsResizer.prototype.fullDistributionResize = function (diff) {
        var _a, _b;
        var vp = this.viewport;
        var column = this.draggedColumn;
        if (!column) {
            return;
        }
        var nextColumn = vp.columns[column.index + 1];
        if (!nextColumn) {
            return;
        }
        var leftColW = (_a = this.columnStartWidth) !== null && _a !== void 0 ? _a : 0;
        var rightColW = (_b = this.nextColumnStartWidth) !== null && _b !== void 0 ? _b : 0;
        var MIN_WIDTH = Column.MIN_COLUMN_WIDTH;
        var newLeftW = leftColW + diff;
        var newRightW = rightColW - diff;
        if (newLeftW < MIN_WIDTH) {
            newLeftW = MIN_WIDTH;
            newRightW = leftColW + rightColW - MIN_WIDTH;
        }
        if (newRightW < MIN_WIDTH) {
            newRightW = MIN_WIDTH;
            newLeftW = leftColW + rightColW - MIN_WIDTH;
        }
        column.width = vp.getRatioFromWidth(newLeftW);
        nextColumn.width = vp.getRatioFromWidth(newRightW);
    };
    /**
     * Render the drag handle for resizing columns.
     *
     * @param column
     * The reference to rendered column
     *
     * @param cell
     * The reference to rendered cell, where hadles should be added
     */
    ColumnsResizer.prototype.renderColumnDragHandles = function (column, cell) {
        var _a;
        var vp = column.viewport;
        if (vp.columnsResizer && (vp.columnDistribution !== 'full' ||
            (vp.dataGrid.enabledColumns &&
                column.index < vp.dataGrid.enabledColumns.length - 1))) {
            var handle = makeHTMLElement('div', {
                className: Globals.classNames.resizerHandles
            }, cell.htmlElement);
            handle.setAttribute('aria-hidden', true);
            (_a = vp.columnsResizer) === null || _a === void 0 ? void 0 : _a.addHandleListeners(handle, column);
        }
    };
    /**
     * Resizes the columns in the fixed distribution mode.
     *
     * @param diff
     * The X position difference in pixels.
     */
    ColumnsResizer.prototype.fixedDistributionResize = function (diff) {
        var _a;
        var column = this.draggedColumn;
        if (!column) {
            return;
        }
        var colW = (_a = this.columnStartWidth) !== null && _a !== void 0 ? _a : 0;
        var MIN_WIDTH = Column.MIN_COLUMN_WIDTH;
        var newW = colW + diff;
        if (newW < MIN_WIDTH) {
            newW = MIN_WIDTH;
        }
        column.width = newW;
    };
    /**
     * Adds event listeners to the handle.
     *
     * @param handle
     * The handle element.
     *
     * @param column
     * The column the handle belongs to.
     */
    ColumnsResizer.prototype.addHandleListeners = function (handle, column) {
        var _this = this;
        var onHandleMouseDown = function (e) {
            var _a, _b, _c, _d, _e, _f;
            var vp = column.viewport;
            if (!((_c = (_b = (_a = vp.dataGrid.options) === null || _a === void 0 ? void 0 : _a.rendering) === null || _b === void 0 ? void 0 : _b.rows) === null || _c === void 0 ? void 0 : _c.virtualization)) {
                (_d = vp.dataGrid.contentWrapper) === null || _d === void 0 ? void 0 : _d.classList.add(Globals.classNames.resizerWrapper);
                // Apply widths before resizing
                _this.viewport.reflow(true);
            }
            _this.dragStartX = e.pageX;
            _this.draggedColumn = column;
            _this.draggedResizeHandle = handle;
            _this.columnStartWidth = column.getWidth();
            _this.nextColumnStartWidth =
                (_e = _this.viewport.columns[column.index + 1]) === null || _e === void 0 ? void 0 : _e.getWidth();
            (_f = column.header) === null || _f === void 0 ? void 0 : _f.htmlElement.classList.add(Globals.classNames.resizedColumn);
        };
        this.handles.push([handle, onHandleMouseDown]);
        handle.addEventListener('mousedown', onHandleMouseDown);
    };
    /**
     * Removes all added event listeners from the document and handles. This
     * should be called on the destroy of the data grid.
     */
    ColumnsResizer.prototype.removeEventListeners = function () {
        document.removeEventListener('mousemove', this.onDocumentMouseMove);
        document.removeEventListener('mouseup', this.onDocumentMouseUp);
        for (var i = 0, iEnd = this.handles.length; i < iEnd; i++) {
            var _a = this.handles[i], handle = _a[0], listener = _a[1];
            handle.removeEventListener('mousedown', listener);
        }
    };
    return ColumnsResizer;
}());
/* *
 *
 *  Default Export
 *
 * */
export default ColumnsResizer;
