/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
/* *
 *
 *  Variables
 *
 * */
var symbols;
/* *
 *
 *  Functions
 *
 * */
/**
 *
 */
function bottomButton(x, y, w, h, options) {
    if (options) {
        var r = (options === null || options === void 0 ? void 0 : options.r) || 0;
        options.brBoxY = y - r;
        options.brBoxHeight = h + r;
    }
    return symbols.roundedRect(x, y, w, h, options);
}
/**
 *
 */
function compose(SVGRendererClass) {
    symbols = SVGRendererClass.prototype.symbols;
    symbols.bottombutton = bottomButton;
    symbols.topbutton = topButton;
}
/**
 *
 */
function topButton(x, y, w, h, options) {
    if (options) {
        var r = (options === null || options === void 0 ? void 0 : options.r) || 0;
        options.brBoxHeight = h + r;
    }
    return symbols.roundedRect(x, y, w, h, options);
}
/* *
 *
 *  Default Export
 *
 * */
var MapSymbols = {
    compose: compose
};
export default MapSymbols;
