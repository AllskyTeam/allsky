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
import Globals from '../Globals.js';
import Utils from '../../Core/Utilities.js';
import DGUtils from '../Utils.js';
import Templating from '../../Core/Templating.js';
var merge = Utils.merge;
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Class
 *
 * */
/**
 * Represents a column in the data grid.
 */
var Column = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a column in the data grid.
     *
     * @param viewport
     * The viewport (table) the column belongs to.
     *
     * @param id
     * The id of the column (`name` in the Data Table).
     *
     * @param index
     * The index of the column.
     */
    function Column(viewport, id, index) {
        var _a, _b, _c, _d;
        /**
         * The cells of the column.
         */
        this.cells = [];
        this.options = merge((_b = (_a = viewport.dataGrid.options) === null || _a === void 0 ? void 0 : _a.columnDefaults) !== null && _b !== void 0 ? _b : {}, (_d = (_c = viewport.dataGrid.columnOptionsMap) === null || _c === void 0 ? void 0 : _c[id]) !== null && _d !== void 0 ? _d : {});
        this.id = id;
        this.index = index;
        this.viewport = viewport;
        this.width = this.getInitialWidth();
        this.loadData();
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Loads the data of the column from the viewport's data table.
     */
    Column.prototype.loadData = function () {
        this.data = this.viewport.dataTable.getColumn(this.id, true);
    };
    /**
     * Registers a cell in the column.
     *
     * @param cell
     * The cell to register.
     */
    Column.prototype.registerCell = function (cell) {
        var _a;
        cell.htmlElement.setAttribute('data-column-id', this.id);
        if (this.options.className) {
            (_a = cell.htmlElement.classList).add.apply(_a, this.options.className.split(/\s+/g));
        }
        if (this.viewport.dataGrid.hoveredColumnId === this.id) {
            cell.htmlElement.classList.add(Globals.classNames.hoveredColumn);
        }
        this.cells.push(cell);
    };
    /**
     * Unregister a cell from the column.
     *
     * @param cell
     * The cell to unregister.
     */
    Column.prototype.unregisterCell = function (cell) {
        var index = this.cells.indexOf(cell);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
    };
    /**
     * Returns the width of the column in pixels.
     */
    Column.prototype.getWidth = function () {
        var vp = this.viewport;
        return vp.columnDistribution === 'full' ?
            vp.getWidthFromRatio(this.width) :
            this.width;
    };
    /**
     * Adds or removes the hovered CSS class to the column element
     * and its cells.
     *
     * @param hovered
     * Whether the column should be hovered.
     */
    Column.prototype.setHoveredState = function (hovered) {
        var _a, _b;
        (_b = (_a = this.header) === null || _a === void 0 ? void 0 : _a.htmlElement) === null || _b === void 0 ? void 0 : _b.classList[hovered ? 'add' : 'remove'](Globals.classNames.hoveredColumn);
        for (var i = 0, iEnd = this.cells.length; i < iEnd; ++i) {
            this.cells[i].htmlElement.classList[hovered ? 'add' : 'remove'](Globals.classNames.hoveredColumn);
        }
    };
    /**
     * Creates a mock element to measure the width of the column from the CSS.
     * The element is appended to the viewport container and then removed.
     * It should be called only once for each column.
     *
     * @returns The initial width of the column.
     */
    Column.prototype.getInitialWidth = function () {
        var _a;
        var result;
        var viewport = this.viewport;
        // Set the initial width of the column.
        var mock = makeHTMLElement('div', {
            className: Globals.classNames.columnElement
        }, viewport.dataGrid.container);
        mock.setAttribute('data-column-id', this.id);
        if (this.options.className) {
            (_a = mock.classList).add.apply(_a, this.options.className.split(/\s+/g));
        }
        if (viewport.columnDistribution === 'full') {
            result = this.getInitialFullDistWidth(mock);
        }
        else {
            result = mock.offsetWidth || 100;
        }
        mock.remove();
        return result;
    };
    /**
     * The initial width of the column in the full distribution mode. The last
     * column in the viewport will have to fill the remaining space.
     *
     * @param mock
     * The mock element to measure the width.
     */
    Column.prototype.getInitialFullDistWidth = function (mock) {
        var _a, _b;
        var vp = this.viewport;
        var columnsCount = (_b = (_a = vp.dataGrid.enabledColumns) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (this.index < columnsCount - 1) {
            return vp.getRatioFromWidth(mock.offsetWidth) || 1 / columnsCount;
        }
        var allPreviousWidths = 0;
        for (var i = 0, iEnd = columnsCount - 1; i < iEnd; i++) {
            allPreviousWidths += vp.columns[i].width;
        }
        var result = 1 - allPreviousWidths;
        if (result < 0) {
            // eslint-disable-next-line no-console
            console.warn('The sum of the columns\' widths exceeds the ' +
                'viewport width. It may cause unexpected behavior in the ' +
                'full distribution mode. Check the CSS styles of the ' +
                'columns. Corrections may be needed.');
        }
        return result;
    };
    /**
     * Returns the formatted string where the templating context is the column.
     *
     * @param template
     * The template string.
     *
     * @return
     * The formatted string.
     */
    Column.prototype.format = function (template) {
        return Templating.format(template, this);
    };
    /* *
    *
    *  Static Properties
    *
    * */
    /**
     * The minimum width of a column.
     * @internal
     */
    Column.MIN_COLUMN_WIDTH = 20;
    return Column;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Column;
