/* *
 *
 *  Highcharts cylinder - a 3D series
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Kacper Madej
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
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
import Color from '../../Core/Color/Color.js';
var color = Color.parse;
import RendererRegistry from '../../Core/Renderer/RendererRegistry.js';
var SVGElement3D = RendererRegistry.getRendererType().prototype.Element3D;
/* *
 *
 *  Class
 *
 * */
var SVGElement3DCylinder = /** @class */ (function (_super) {
    __extends(SVGElement3DCylinder, _super);
    function SVGElement3DCylinder() {
        /* *
         *
         *  Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.parts = ['top', 'bottom', 'front', 'back'];
        _this.pathType = 'cylinder';
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    SVGElement3DCylinder.prototype.fillSetter = function (fill) {
        this.singleSetterForParts('fill', null, {
            front: fill,
            back: fill,
            top: color(fill).brighten(0.1).get(),
            bottom: color(fill).brighten(-0.1).get()
        });
        // Fill for animation getter (#6776)
        this.color = this.fill = fill;
        return this;
    };
    return SVGElement3DCylinder;
}(SVGElement3D));
/* *
 *
 *  Default Export
 *
 * */
export default SVGElement3DCylinder;
