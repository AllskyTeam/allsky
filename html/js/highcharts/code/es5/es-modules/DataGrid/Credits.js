/* *
 *
 *  DataGrid Credits class
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
import Globals from './Globals.js';
import DGUtils from './Utils.js';
var makeHTMLElement = DGUtils.makeHTMLElement;
/* *
 *
 *  Abstract Class of Row
 *
 * */
/**
 * Represents a credits in the data grid.
 */
var Credits = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Construct the credits.
     *
     * @param dataGrid
     * The DataGrid Table instance which the credits belong to.
     */
    function Credits(dataGrid) {
        var _a, _b;
        this.dataGrid = dataGrid;
        this.options = (_b = (_a = dataGrid.options) === null || _a === void 0 ? void 0 : _a.credits) !== null && _b !== void 0 ? _b : {};
        this.containerElement = makeHTMLElement('div', {
            className: Globals.classNames.creditsContainer
        });
        this.textElement = makeHTMLElement('a', {
            className: Globals.classNames.creditsText
        }, this.containerElement);
        this.textElement.setAttribute('target', '_top');
        this.render();
    }
    /* *
    *
    *  Methods
    *
    * */
    /**
     * Set the content of the credits.
     */
    Credits.prototype.setContent = function () {
        var _a = this.options, text = _a.text, href = _a.href;
        this.textElement.innerText = text || '';
        this.textElement.setAttribute('href', href || '');
    };
    /**
     * Append the credits to the container. The position of the credits is
     * determined by the `position` option.
     */
    Credits.prototype.appendToContainer = function () {
        var _a, _b;
        var position = this.options.position;
        if (position === 'top') {
            // Append the credits to the top of the table.
            (_a = this.dataGrid.contentWrapper) === null || _a === void 0 ? void 0 : _a.prepend(this.containerElement);
            return;
        }
        // Append the credits to the bottom of the table.
        (_b = this.dataGrid.contentWrapper) === null || _b === void 0 ? void 0 : _b.appendChild(this.containerElement);
    };
    /**
     * Update the credits with new options.
     *
     * @param options
     * The new options for the credits.
     *
     * @param render
     * Whether to render the credits after the update.
     */
    Credits.prototype.update = function (options, render) {
        var _a, _b;
        if (render === void 0) { render = true; }
        if (options) {
            this.dataGrid.update({
                credits: options
            }, false);
            this.options = (_b = (_a = this.dataGrid.options) === null || _a === void 0 ? void 0 : _a.credits) !== null && _b !== void 0 ? _b : {};
        }
        if (render) {
            this.render();
        }
    };
    /**
     * Render the credits. If the credits are disabled, they will be removed
     * from the container. If also reflows the viewport dimensions.
     */
    Credits.prototype.render = function () {
        var _a, _b;
        var enabled = (_a = this.options.enabled) !== null && _a !== void 0 ? _a : false;
        this.containerElement.remove();
        if (enabled) {
            this.setContent();
            this.appendToContainer();
        }
        else {
            this.destroy();
        }
        (_b = this.dataGrid.viewport) === null || _b === void 0 ? void 0 : _b.reflow();
    };
    /**
     * Get the height of the credits container.
     */
    Credits.prototype.getHeight = function () {
        return this.containerElement.offsetHeight;
    };
    /**
     * Destroy the credits. The credits will be removed from the container and
     * the reference to the credits will be deleted from the DataGrid instance
     * it belongs to.
     */
    Credits.prototype.destroy = function () {
        this.containerElement.remove();
        delete this.dataGrid.credits;
    };
    return Credits;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Credits;
