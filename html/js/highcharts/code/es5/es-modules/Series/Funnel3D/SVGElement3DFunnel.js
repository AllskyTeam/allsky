/* *
 *
 *  Highcharts funnel3d series module
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
import H from '../../Core/Globals.js';
var charts = H.charts;
import RendererRegistry from '../../Core/Renderer/RendererRegistry.js';
var SVGElement3D = RendererRegistry.getRendererType().prototype.Element3D;
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
var SVGElement3DFunnel = /** @class */ (function (_super) {
    __extends(SVGElement3DFunnel, _super);
    function SVGElement3DFunnel() {
        /* *
         *
         *  Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.mainParts = ['top', 'bottom'];
        _this.parts = [
            'top', 'bottom',
            'frontUpper', 'backUpper',
            'frontLower', 'backLower',
            'rightUpper', 'rightLower'
        ];
        _this.sideGroups = [
            'upperGroup', 'lowerGroup'
        ];
        _this.sideParts = {
            upperGroup: ['frontUpper', 'backUpper', 'rightUpper'],
            lowerGroup: ['frontLower', 'backLower', 'rightLower']
        };
        _this.pathType = 'funnel3d';
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    // override opacity and color setters to control opacity
    SVGElement3DFunnel.prototype.opacitySetter = function (value) {
        var funnel3d = this, opacity = parseFloat(value), parts = funnel3d.parts, chart = charts[funnel3d.renderer.chartIndex], filterId = 'group-opacity-' + opacity + '-' + chart.index;
        // Use default for top and bottom
        funnel3d.parts = funnel3d.mainParts;
        funnel3d.singleSetterForParts('opacity', opacity);
        // Restore
        funnel3d.parts = parts;
        if (!chart.renderer.filterId) {
            chart.renderer.definition({
                tagName: 'filter',
                attributes: {
                    id: filterId
                },
                children: [{
                        tagName: 'feComponentTransfer',
                        children: [{
                                tagName: 'feFuncA',
                                attributes: {
                                    type: 'table',
                                    tableValues: '0 ' + opacity
                                }
                            }]
                    }]
            });
            for (var _i = 0, _a = funnel3d.sideGroups; _i < _a.length; _i++) {
                var groupName = _a[_i];
                funnel3d[groupName].attr({
                    filter: 'url(#' + filterId + ')'
                });
            }
            // Styled mode
            if (funnel3d.renderer.styledMode) {
                chart.renderer.definition({
                    tagName: 'style',
                    textContent: '.highcharts-' + filterId +
                        ' {filter:url(#' + filterId + ')}'
                });
                for (var _b = 0, _c = funnel3d.sideGroups; _b < _c.length; _b++) {
                    var groupName = _c[_b];
                    funnel3d[groupName].addClass('highcharts-' + filterId);
                }
            }
        }
        return funnel3d;
    };
    SVGElement3DFunnel.prototype.fillSetter = function (fill) {
        var fillColor = color(fill);
        // Extract alpha channel to use the opacitySetter
        var funnel3d = this, alpha = fillColor.rgba[3], partsWithColor = {
            // Standard color for top and bottom
            top: color(fill).brighten(0.1).get(),
            bottom: color(fill).brighten(-0.2).get()
        };
        if (alpha < 1) {
            fillColor.rgba[3] = 1;
            fillColor = fillColor.get('rgb');
            // Set opacity through the opacitySetter
            funnel3d.attr({
                opacity: alpha
            });
        }
        else {
            // Use default for full opacity
            fillColor = fill;
        }
        // Add gradient for sides
        if (!fillColor.linearGradient &&
            !fillColor.radialGradient &&
            funnel3d.gradientForSides) {
            fillColor = {
                linearGradient: { x1: 0, x2: 1, y1: 1, y2: 1 },
                stops: [
                    [0, color(fill).brighten(-0.2).get()],
                    [0.5, fill],
                    [1, color(fill).brighten(-0.2).get()]
                ]
            };
        }
        // Gradient support
        if (fillColor.linearGradient) {
            // Color in steps, as each gradient will generate a key
            for (var _i = 0, _a = funnel3d.sideGroups; _i < _a.length; _i++) {
                var sideGroupName = _a[_i];
                var box = funnel3d[sideGroupName].gradientBox, gradient = fillColor.linearGradient, alteredGradient = merge(fillColor, {
                    linearGradient: {
                        x1: box.x + gradient.x1 * box.width,
                        y1: box.y + gradient.y1 * box.height,
                        x2: box.x + gradient.x2 * box.width,
                        y2: box.y + gradient.y2 * box.height
                    }
                });
                for (var _b = 0, _c = funnel3d.sideParts[sideGroupName]; _b < _c.length; _b++) {
                    var partName = _c[_b];
                    partsWithColor[partName] = alteredGradient;
                }
            }
        }
        else {
            merge(true, partsWithColor, {
                frontUpper: fillColor,
                backUpper: fillColor,
                rightUpper: fillColor,
                frontLower: fillColor,
                backLower: fillColor,
                rightLower: fillColor
            });
            if (fillColor.radialGradient) {
                for (var _d = 0, _e = funnel3d.sideGroups; _d < _e.length; _d++) {
                    var sideGroupName = _e[_d];
                    var gradBox = funnel3d[sideGroupName].gradientBox, centerX = gradBox.x + gradBox.width / 2, centerY = gradBox.y + gradBox.height / 2, diameter = Math.min(gradBox.width, gradBox.height);
                    for (var _f = 0, _g = funnel3d.sideParts[sideGroupName]; _f < _g.length; _f++) {
                        var partName = _g[_f];
                        funnel3d[partName].setRadialReference([
                            centerX, centerY, diameter
                        ]);
                    }
                }
            }
        }
        funnel3d.singleSetterForParts('fill', null, partsWithColor);
        // Fill for animation getter (#6776)
        funnel3d.color = funnel3d.fill = fill;
        // Change gradientUnits to userSpaceOnUse for linearGradient
        if (fillColor.linearGradient) {
            for (var _h = 0, _j = [funnel3d.frontLower, funnel3d.frontUpper]; _h < _j.length; _h++) {
                var part = _j[_h];
                var elem = part.element, grad = (elem &&
                    funnel3d.renderer.gradients[elem.gradient]);
                if (grad &&
                    grad.attr('gradientUnits') !== 'userSpaceOnUse') {
                    grad.attr({
                        gradientUnits: 'userSpaceOnUse'
                    });
                }
            }
        }
        return funnel3d;
    };
    SVGElement3DFunnel.prototype.adjustForGradient = function () {
        var funnel3d = this;
        var bbox;
        for (var _i = 0, _a = funnel3d.sideGroups; _i < _a.length; _i++) {
            var sideGroupName = _a[_i];
            // Use common extremes for groups for matching gradients
            var topLeftEdge = {
                x: Number.MAX_VALUE,
                y: Number.MAX_VALUE
            }, bottomRightEdge = {
                x: -Number.MAX_VALUE,
                y: -Number.MAX_VALUE
            };
            // Get extremes
            for (var _b = 0, _c = funnel3d.sideParts[sideGroupName]; _b < _c.length; _b++) {
                var partName = _c[_b];
                var part = funnel3d[partName];
                bbox = part.getBBox(true);
                topLeftEdge = {
                    x: Math.min(topLeftEdge.x, bbox.x),
                    y: Math.min(topLeftEdge.y, bbox.y)
                };
                bottomRightEdge = {
                    x: Math.max(bottomRightEdge.x, bbox.x + bbox.width),
                    y: Math.max(bottomRightEdge.y, bbox.y + bbox.height)
                };
            }
            // Store for color fillSetter
            funnel3d[sideGroupName].gradientBox = {
                x: topLeftEdge.x,
                width: bottomRightEdge.x - topLeftEdge.x,
                y: topLeftEdge.y,
                height: bottomRightEdge.y - topLeftEdge.y
            };
        }
    };
    SVGElement3DFunnel.prototype.zIndexSetter = function () {
        // `this.added` won't work, because zIndex is set after the prop is set,
        // but before the graphic is really added
        if (this.finishedOnAdd) {
            this.adjustForGradient();
        }
        // Run default
        return this.renderer.Element.prototype.zIndexSetter.apply(this, arguments);
    };
    SVGElement3DFunnel.prototype.onAdd = function () {
        this.adjustForGradient();
        this.finishedOnAdd = true;
    };
    return SVGElement3DFunnel;
}(SVGElement3D));
/* *
 *
 *  Default Export
 *
 * */
export default SVGElement3DFunnel;
