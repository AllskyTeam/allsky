/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
/* *
 *
 *  Imports
 *
 * */
import AST from '../Core/Renderer/HTML/AST.js';
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, createElement = U.createElement;
/* *
 *
 *  Class
 *
 * */
var BaseForm = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function BaseForm(parentDiv, iconsURL) {
        this.iconsURL = iconsURL;
        this.container = this.createPopupContainer(parentDiv);
        this.closeButton = this.addCloseButton();
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Create popup div container.
     *
     * @param {HTMLElement} parentDiv
     * Parent div to attach popup.
     *
     * @param  {string} className
     * Class name of the popup.
     *
     * @return {HTMLElement}
     * Popup div.
     */
    BaseForm.prototype.createPopupContainer = function (parentDiv, className) {
        if (className === void 0) { className = 'highcharts-popup highcharts-no-tooltip'; }
        return createElement('div', { className: className }, void 0, parentDiv);
    };
    /**
     * Create HTML element and attach click event to close popup.
     *
     * @param {string} className
     * Class name of the close button.
     *
     * @return {HTMLElement}
     * Close button.
     */
    BaseForm.prototype.addCloseButton = function (className) {
        if (className === void 0) { className = 'highcharts-popup-close'; }
        var popup = this, iconsURL = this.iconsURL;
        // Create close popup button.
        var closeButton = createElement('button', { className: className }, void 0, this.container);
        closeButton.style['background-image'] = 'url(' +
            (iconsURL.match(/png|svg|jpeg|jpg|gif/ig) ?
                iconsURL : iconsURL + 'close.svg') + ')';
        ['click', 'touchstart'].forEach(function (eventName) {
            addEvent(closeButton, eventName, popup.closeButtonEvents.bind(popup));
        });
        // Close popup when press ESC
        addEvent(document, 'keydown', function (event) {
            if (event.code === 'Escape') {
                popup.closeButtonEvents();
            }
        });
        return closeButton;
    };
    /**
     * Close button events.
     * @return {void}
     */
    BaseForm.prototype.closeButtonEvents = function () {
        this.closePopup();
    };
    /**
     * Reset content of the current popup and show.
     *
     * @param {string} toolbarClass
     * Class name of the toolbar which styles should be reset.
     */
    BaseForm.prototype.showPopup = function (toolbarClass) {
        if (toolbarClass === void 0) { toolbarClass = 'highcharts-annotation-toolbar'; }
        var popupDiv = this.container, popupCloseButton = this.closeButton;
        this.type = void 0;
        // Reset content.
        popupDiv.innerHTML = AST.emptyHTML;
        // Reset toolbar styles if exists.
        if (popupDiv.className.indexOf(toolbarClass) >= 0) {
            popupDiv.classList.remove(toolbarClass);
            // Reset toolbar inline styles
            popupDiv.removeAttribute('style');
        }
        // Add close button.
        popupDiv.appendChild(popupCloseButton);
        popupDiv.style.display = 'block';
        popupDiv.style.height = '';
    };
    /**
     * Hide popup.
     */
    BaseForm.prototype.closePopup = function () {
        this.container.style.display = 'none';
    };
    return BaseForm;
}());
/* *
 *
 *  Default Export
 *
 * */
export default BaseForm;
