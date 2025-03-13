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
import AST from '../../Core/Renderer/HTML/AST.js';
import Templating from '../../Core/Templating.js';
/* *
 *
 *  Abstract Class of Cell
 *
 * */
var Cell = /** @class */ (function () {
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
    function Cell(column, row) {
        /**
         * Array of cell events to be removed when the cell is destroyed.
         */
        this.cellEvents = [];
        this.column = column;
        this.row = row;
        this.row.registerCell(this);
        this.htmlElement = this.init();
        this.htmlElement.setAttribute('tabindex', '-1');
        this.initEvents();
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Init element.
     * @internal
     */
    Cell.prototype.init = function () {
        return document.createElement('td', {});
    };
    /**
     * Initialize event listeners. Events added to the `cellEvents` array will
     * be registered now and unregistered when the cell is destroyed.
     */
    Cell.prototype.initEvents = function () {
        var _this = this;
        this.cellEvents.push(['blur', function () { return _this.onBlur(); }]);
        this.cellEvents.push(['focus', function () { return _this.onFocus(); }]);
        this.cellEvents.push(['click', function (e) {
                _this.onClick(e);
            }]);
        this.cellEvents.push(['keydown', function (e) {
                _this.onKeyDown(e);
            }]);
        this.cellEvents.forEach(function (pair) {
            _this.htmlElement.addEventListener(pair[0], pair[1]);
        });
    };
    /**
     * Handles the focus event on the cell.
     */
    Cell.prototype.onFocus = function () {
        var _a;
        var vp = this.row.viewport;
        var focusAnchor = (_a = vp.rowsVirtualizer.focusAnchorCell) === null || _a === void 0 ? void 0 : _a.htmlElement;
        focusAnchor === null || focusAnchor === void 0 ? void 0 : focusAnchor.setAttribute('tabindex', '-1');
    };
    /**
     * Handles the blur event on the cell.
     */
    Cell.prototype.onBlur = function () {
        var _a;
        var vp = this.row.viewport;
        var focusAnchor = (_a = vp.rowsVirtualizer.focusAnchorCell) === null || _a === void 0 ? void 0 : _a.htmlElement;
        focusAnchor === null || focusAnchor === void 0 ? void 0 : focusAnchor.setAttribute('tabindex', '0');
        delete vp.focusCursor;
    };
    /**
     * Handles user keydown on the cell.
     *
     * @param e
     * Keyboard event object.
     */
    Cell.prototype.onKeyDown = function (e) {
        var _a, _b, _c;
        var _d = this, row = _d.row, column = _d.column;
        var vp = row.viewport;
        var changeFocusKeys = {
            ArrowDown: [1, 0],
            ArrowUp: [-1, 0],
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1]
        };
        var dir = changeFocusKeys[e.key];
        if (dir) {
            e.preventDefault();
            e.stopPropagation();
            var localRowIndex = row.index === void 0 ? -1 : (row.index - vp.rows[0].index);
            var nextVerticalDir = localRowIndex + dir[0];
            if (nextVerticalDir < 0 && vp.header) {
                (_b = (_a = vp.columns[column.index + dir[1]]) === null || _a === void 0 ? void 0 : _a.header) === null || _b === void 0 ? void 0 : _b.htmlElement.focus();
                return;
            }
            var nextRow = vp.rows[nextVerticalDir];
            if (nextRow) {
                (_c = nextRow.cells[column.index + dir[1]]) === null || _c === void 0 ? void 0 : _c.htmlElement.focus();
            }
        }
    };
    /**
     * Renders the cell by appending the HTML element to the row.
     */
    Cell.prototype.render = function () {
        this.row.htmlElement.appendChild(this.htmlElement);
    };
    /**
     * Reflows the cell dimensions.
     */
    Cell.prototype.reflow = function () {
        var column = this.column;
        var elementStyle = this.htmlElement.style;
        elementStyle.width = elementStyle.maxWidth = column.getWidth() + 'px';
    };
    /**
     * Returns the formatted string where the templating context is the cell.
     *
     * @param template
     * The template string.
     *
     * @return
     * The formatted string.
     */
    Cell.prototype.format = function (template) {
        return Templating.format(template, this);
    };
    /**
     * Sets the custom class name of the cell based on the template.
     *
     * @param template
     * The template string.
     */
    Cell.prototype.setCustomClassName = function (template) {
        var _a, _b;
        var element = this.htmlElement;
        if (this.customClassName) {
            (_a = element.classList).remove.apply(_a, this.customClassName.split(/\s+/g));
        }
        if (!template) {
            delete this.customClassName;
            return;
        }
        var newClassName = this.format(template);
        if (!newClassName) {
            delete this.customClassName;
            return;
        }
        (_b = element.classList).add.apply(_b, newClassName.split(/\s+/g));
        this.customClassName = newClassName;
    };
    /**
     * Renders content of cell.
     *
     * @param cellContent
     * Content to render.
     *
     * @param parentElement
     * Parent element where the content should be.
     *
     * @internal
     */
    Cell.prototype.renderHTMLCellContent = function (cellContent, parentElement) {
        var formattedNodes = new AST(cellContent);
        formattedNodes.addToDOM(parentElement);
    };
    /**
     * Destroys the cell.
     */
    Cell.prototype.destroy = function () {
        var _this = this;
        this.cellEvents.forEach(function (pair) {
            _this.htmlElement.removeEventListener(pair[0], pair[1]);
        });
        this.column.unregisterCell(this);
        this.row.unregisterCell(this);
        this.htmlElement.remove();
    };
    return Cell;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Cell;
