/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Class that can keep track of elements added to DOM and clean them up on
 *  destroy.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../../Core/Globals.js';
var doc = H.doc;
import HU from './HTMLUtilities.js';
var removeElement = HU.removeElement;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 */
var DOMElementProvider = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function DOMElementProvider() {
        this.elements = [];
    }
    /**
     * Create an element and keep track of it for later removal.
     * Same args as document.createElement
     * @private
     */
    DOMElementProvider.prototype.createElement = function () {
        var el = doc.createElement.apply(doc, arguments);
        this.elements.push(el);
        return el;
    };
    /**
     * Destroy created element, removing it from the DOM.
     * @private
     */
    DOMElementProvider.prototype.removeElement = function (element) {
        removeElement(element);
        this.elements.splice(this.elements.indexOf(element), 1);
    };
    /**
     * Destroy all created elements, removing them from the DOM.
     * @private
     */
    DOMElementProvider.prototype.destroyCreatedElements = function () {
        this.elements.forEach(function (element) {
            removeElement(element);
        });
        this.elements = [];
    };
    return DOMElementProvider;
}());
/* *
 *
 *  Default Export
 *
 * */
export default DOMElementProvider;
