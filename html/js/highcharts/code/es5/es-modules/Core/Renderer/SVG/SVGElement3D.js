/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Extensions to the SVGRenderer class to enable 3D shapes
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
import Color from '../../Color/Color.js';
var color = Color.parse;
import RendererRegistry from '../RendererRegistry.js';
var SVGElement = RendererRegistry.getRendererType().prototype.Element;
import U from '../../Utilities.js';
var defined = U.defined, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
var SVGElement3D = /** @class */ (function (_super) {
    __extends(SVGElement3D, _super);
    function SVGElement3D() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /* *
         *
         *  Properties
         *
         * */
        _this.parts = ['front', 'top', 'side'];
        _this.pathType = 'cuboid';
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * The init is used by base - renderer.Element
     * @private
     */
    SVGElement3D.prototype.initArgs = function (args) {
        var elem3d = this, renderer = elem3d.renderer, paths = renderer[elem3d.pathType + 'Path'](args), zIndexes = paths.zIndexes;
        // Build parts
        for (var _i = 0, _a = elem3d.parts; _i < _a.length; _i++) {
            var part = _a[_i];
            var attribs = {
                'class': 'highcharts-3d-' + part,
                zIndex: zIndexes[part] || 0
            };
            if (renderer.styledMode) {
                if (part === 'top') {
                    attribs.filter = 'url(#highcharts-brighter)';
                }
                else if (part === 'side') {
                    attribs.filter = 'url(#highcharts-darker)';
                }
            }
            elem3d[part] = renderer.path(paths[part])
                .attr(attribs)
                .add(elem3d);
        }
        elem3d.attr({
            'stroke-linejoin': 'round',
            zIndex: zIndexes.group
        });
        // Store information if any side of element was rendered by force.
        elem3d.forcedSides = paths.forcedSides;
    };
    /**
     * Single property setter that applies options to each part
     * @private
     */
    SVGElement3D.prototype.singleSetterForParts = function (prop, val, values, verb, duration, complete) {
        var elem3d = this, newAttr = {}, optionsToApply = [null, null, (verb || 'attr'), duration, complete], hasZIndexes = values && values.zIndexes;
        if (!values) {
            newAttr[prop] = val;
            optionsToApply[0] = newAttr;
        }
        else {
            // It is needed to deal with the whole group zIndexing
            // in case of graph rotation
            if (hasZIndexes && hasZIndexes.group) {
                elem3d.attr({
                    zIndex: hasZIndexes.group
                });
            }
            for (var _i = 0, _a = Object.keys(values); _i < _a.length; _i++) {
                var part = _a[_i];
                newAttr[part] = {};
                newAttr[part][prop] = values[part];
                // Include zIndexes if provided
                if (hasZIndexes) {
                    newAttr[part].zIndex = values.zIndexes[part] || 0;
                }
            }
            optionsToApply[1] = newAttr;
        }
        return this.processParts.apply(elem3d, optionsToApply);
    };
    /**
     * Calls function for each part. Used for attr, animate and destroy.
     * @private
     */
    SVGElement3D.prototype.processParts = function (props, partsProps, verb, duration, complete) {
        var elem3d = this;
        for (var _i = 0, _a = elem3d.parts; _i < _a.length; _i++) {
            var part = _a[_i];
            // If different props for different parts
            if (partsProps) {
                props = pick(partsProps[part], false);
            }
            // Only if something to set, but allow undefined
            if (props !== false) {
                elem3d[part][verb](props, duration, complete);
            }
        }
        return elem3d;
    };
    /**
     * Destroy all parts
     * @private
     */
    SVGElement3D.prototype.destroy = function () {
        this.processParts(null, null, 'destroy');
        return _super.prototype.destroy.call(this);
    };
    // Following functions are SVGElement3DCuboid (= base)
    SVGElement3D.prototype.attr = function (args, val, complete, continueAnimation) {
        // Resolve setting attributes by string name
        if (typeof args === 'string' && typeof val !== 'undefined') {
            var key = args;
            args = {};
            args[key] = val;
        }
        if (args.shapeArgs || defined(args.x)) {
            return this.singleSetterForParts('d', null, this.renderer[this.pathType + 'Path'](args.shapeArgs || args));
        }
        return _super.prototype.attr.call(this, args, void 0, complete, continueAnimation);
    };
    SVGElement3D.prototype.animate = function (args, duration, complete) {
        if (defined(args.x) && defined(args.y)) {
            var paths = this.renderer[this.pathType + 'Path'](args), forcedSides = paths.forcedSides;
            this.singleSetterForParts('d', null, paths, 'animate', duration, complete);
            this.attr({
                zIndex: paths.zIndexes.group
            });
            // If sides that are forced to render changed, recalculate colors.
            if (forcedSides !== this.forcedSides) {
                this.forcedSides = forcedSides;
                if (!this.renderer.styledMode) {
                    this.fillSetter(this.fill);
                }
            }
        }
        else {
            _super.prototype.animate.call(this, args, duration, complete);
        }
        return this;
    };
    SVGElement3D.prototype.fillSetter = function (fill) {
        var elem3d = this;
        elem3d.forcedSides = elem3d.forcedSides || [];
        elem3d.singleSetterForParts('fill', null, {
            front: fill,
            // Do not change color if side was forced to render.
            top: color(fill).brighten(elem3d.forcedSides.indexOf('top') >= 0 ? 0 : 0.1).get(),
            side: color(fill).brighten(elem3d.forcedSides.indexOf('side') >= 0 ? 0 : -0.1).get()
        });
        // Fill for animation getter (#6776)
        elem3d.color = elem3d.fill = fill;
        return elem3d;
    };
    SVGElement3D.types = {
        base: SVGElement3D,
        cuboid: SVGElement3D
    };
    return SVGElement3D;
}(SVGElement));
/* *
 *
 *  Default Export
 *
 * */
export default SVGElement3D;
