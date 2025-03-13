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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import AST from './AST.js';
import H from '../../Globals.js';
var composed = H.composed;
import SVGElement from '../SVG/SVGElement.js';
import U from '../../Utilities.js';
var attr = U.attr, css = U.css, createElement = U.createElement, defined = U.defined, extend = U.extend, getAlignFactor = U.getAlignFactor, isNumber = U.isNumber, pInt = U.pInt, pushUnique = U.pushUnique;
/**
 * The opacity and visibility properties are set as attributes on the main
 * element and SVG groups, and as identical CSS properties on the HTML element
 * and the ancestry divs. (#3542)
 *
 * @private
 */
function commonSetter(value, key, elem) {
    var _a;
    var style = ((_a = this.div) === null || _a === void 0 ? void 0 : _a.style) || elem.style;
    SVGElement.prototype["".concat(key, "Setter")].call(this, value, key, elem);
    if (style) {
        style[key] = value;
    }
}
/**
 * Decorate each SVG group in the ancestry line. Each SVG `g` element that
 * contains children with useHTML, will receive a `div` element counterpart to
 * contain the HTML span. These div elements are translated and styled like
 * original `g` counterparts.
 *
 * @private
 */
var decorateSVGGroup = function (g, container) {
    var _a;
    if (!g.div) {
        var className = attr(g.element, 'class'), cssProto_1 = g.css;
        // Create the parallel HTML group
        var div_1 = createElement('div', className ? { className: className } : void 0, __assign(__assign({ 
            // Add HTML specific styles
            position: 'absolute', left: "".concat(g.translateX || 0, "px"), top: "".concat(g.translateY || 0, "px") }, g.styles), { 
            // Add g attributes that correspond to CSS
            display: g.display, opacity: g.opacity, visibility: g.visibility }), 
        // The top group is appended to container
        ((_a = g.parentGroup) === null || _a === void 0 ? void 0 : _a.div) || container);
        g.classSetter = function (value, key, element) {
            element.setAttribute('class', value);
            div_1.className = value;
        };
        /**
         * Common translate setter for X and Y on the HTML group.
         *
         * Reverted the fix for #6957 due to positioning problems and offline
         * export (#7254, #7280, #7529)
         * @private
         */
        g.translateXSetter = g.translateYSetter = function (value, key) {
            g[key] = value;
            div_1.style[key === 'translateX' ? 'left' : 'top'] = "".concat(value, "px");
            g.doTransform = true;
        };
        g.opacitySetter = g.visibilitySetter = commonSetter;
        // Extend the parent group's css function by updating the parallel div
        // counterpart with the same style.
        g.css = function (styles) {
            // Call the base css method. The `parentGroup` can be either an
            // SVGElement or an SVGLabel, in which the css method is extended
            // (#19200).
            cssProto_1.call(g, styles);
            // #6794
            if (styles.cursor) {
                div_1.style.cursor = styles.cursor;
            }
            // #18821
            if (styles.pointerEvents) {
                div_1.style.pointerEvents = styles.pointerEvents;
            }
            return g;
        };
        // Event handling
        g.on = function () {
            SVGElement.prototype.on.apply({
                element: div_1,
                onEvents: g.onEvents
            }, arguments);
            return g;
        };
        g.div = div_1;
    }
    return g.div;
};
/* *
 *
 *  Class
 *
 * */
var HTMLElement = /** @class */ (function (_super) {
    __extends(HTMLElement, _super);
    /* *
     *
     *  Functions
     *
     * */
    function HTMLElement(renderer, nodeName) {
        var _this = _super.call(this, renderer, nodeName) || this;
        _this.css(__assign({ position: 'absolute' }, (renderer.styledMode ? {} : {
            fontFamily: renderer.style.fontFamily,
            fontSize: renderer.style.fontSize
        })));
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    /**
     * Compose
     * @private
     */
    HTMLElement.compose = function (SVGRendererClass) {
        if (pushUnique(composed, this.compose)) {
            /**
             * Create a HTML text node. This is used by the SVG renderer `text`
             * and `label` functions through the `useHTML` parameter.
             *
             * @private
             */
            SVGRendererClass.prototype.html = function (str, x, y) {
                return new HTMLElement(this, 'span')
                    // Set the default attributes
                    .attr({
                    text: str,
                    x: Math.round(x),
                    y: Math.round(y)
                });
            };
        }
    };
    /**
     * Get the correction in X and Y positioning as the element is rotated.
     * @private
     */
    HTMLElement.prototype.getSpanCorrection = function (width, baseline, alignCorrection) {
        this.xCorr = -width * alignCorrection;
        this.yCorr = -baseline;
    };
    /**
     * Apply CSS to HTML elements. This is used in text within SVG rendering.
     * @private
     */
    HTMLElement.prototype.css = function (styles) {
        var element = this.element, 
        // When setting or unsetting the width style, we need to update
        // transform (#8809)
        isSettingWidth = (element.tagName === 'SPAN' &&
            styles &&
            'width' in styles), textWidth = isSettingWidth && styles.width;
        var doTransform;
        if (isSettingWidth) {
            delete styles.width;
            this.textWidth = pInt(textWidth) || void 0;
            doTransform = true;
        }
        // Some properties require other properties to be set
        if ((styles === null || styles === void 0 ? void 0 : styles.textOverflow) === 'ellipsis') {
            styles.overflow = 'hidden';
        }
        if (styles === null || styles === void 0 ? void 0 : styles.lineClamp) {
            styles.display = '-webkit-box';
            styles.WebkitLineClamp = styles.lineClamp;
            styles.WebkitBoxOrient = 'vertical';
            styles.overflow = 'hidden';
        }
        // SVG natively supports setting font size as numbers. With HTML, the
        // font size should behave in the same way (#21624).
        if (isNumber(Number(styles === null || styles === void 0 ? void 0 : styles.fontSize))) {
            styles.fontSize = styles.fontSize + 'px';
        }
        extend(this.styles, styles);
        css(element, styles);
        // Now that all styles are applied, to the transform
        if (doTransform) {
            this.updateTransform();
        }
        return this;
    };
    /**
     * The useHTML method for calculating the bounding box based on offsets.
     * Called internally from the `SVGElement.getBBox` function and subsequently
     * rotated.
     *
     * @private
     */
    HTMLElement.prototype.htmlGetBBox = function () {
        var element = this.element;
        return {
            x: element.offsetLeft,
            y: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight
        };
    };
    /**
     * Batch update styles and attributes related to transform
     *
     * @private
     */
    HTMLElement.prototype.updateTransform = function () {
        var _this = this;
        var _a;
        // Aligning non added elements is expensive
        if (!this.added) {
            this.alignOnAdd = true;
            return;
        }
        var _b = this, element = _b.element, renderer = _b.renderer, rotation = _b.rotation, rotationOriginX = _b.rotationOriginX, rotationOriginY = _b.rotationOriginY, scaleX = _b.scaleX, scaleY = _b.scaleY, styles = _b.styles, _c = _b.textAlign, textAlign = _c === void 0 ? 'left' : _c, textWidth = _b.textWidth, _d = _b.translateX, translateX = _d === void 0 ? 0 : _d, _e = _b.translateY, translateY = _e === void 0 ? 0 : _e, _f = _b.x, x = _f === void 0 ? 0 : _f, _g = _b.y, y = _g === void 0 ? 0 : _g, _h = styles.display, display = _h === void 0 ? 'block' : _h, whiteSpace = styles.whiteSpace;
        // Get the pixel length of the text
        var getTextPxLength = function () {
            if (_this.textPxLength) {
                return _this.textPxLength;
            }
            // Reset multiline/ellipsis in order to read width (#4928,
            // #5417)
            css(element, {
                width: '',
                whiteSpace: whiteSpace || 'nowrap'
            });
            return element.offsetWidth;
        };
        // Apply translate
        css(element, {
            marginLeft: "".concat(translateX, "px"),
            marginTop: "".concat(translateY, "px")
        });
        if (element.tagName === 'SPAN') {
            var currentTextTransform = [
                rotation,
                textAlign,
                element.innerHTML,
                textWidth,
                this.textAlign
            ].join(','), parentPadding = (((_a = this.parentGroup) === null || _a === void 0 ? void 0 : _a.padding) * -1) || 0;
            var baseline = void 0;
            // Update textWidth. Use the memoized textPxLength if possible, to
            // avoid the getTextPxLength function using elem.offsetWidth.
            // Calling offsetWidth affects rendering time as it forces layout
            // (#7656).
            if (textWidth !== this.oldTextWidth) { // #983, #1254
                var textPxLength = getTextPxLength(), textWidthNum = textWidth || 0;
                if (((textWidthNum > this.oldTextWidth) ||
                    textPxLength > textWidthNum) && (
                // Only set the width if the text is able to word-wrap,
                // or text-overflow is ellipsis (#9537)
                /[ \-]/.test(element.textContent || element.innerText) ||
                    element.style.textOverflow === 'ellipsis')) {
                    css(element, {
                        width: ((textPxLength > textWidthNum) ||
                            rotation ||
                            scaleX) ?
                            textWidth + 'px' :
                            'auto', // #16261
                        display: display,
                        whiteSpace: whiteSpace || 'normal' // #3331
                    });
                    this.oldTextWidth = textWidth;
                }
            }
            // Do the calculations and DOM access only if properties changed
            if (currentTextTransform !== this.cTT) {
                baseline = renderer.fontMetrics(element).b;
                // Renderer specific handling of span rotation, but only if we
                // have something to update.
                if (defined(rotation) &&
                    ((rotation !== (this.oldRotation || 0)) ||
                        (textAlign !== this.oldAlign))) {
                    this.setSpanRotation(rotation, parentPadding, parentPadding);
                }
                this.getSpanCorrection(
                // Avoid elem.offsetWidth if we can, it affects rendering
                // time heavily (#7656)
                ((!defined(rotation) &&
                    !this.textWidth &&
                    this.textPxLength) || // #7920
                    element.offsetWidth), baseline, getAlignFactor(textAlign));
            }
            // Apply position with correction and rotation origin
            var _j = this, _k = _j.xCorr, xCorr = _k === void 0 ? 0 : _k, _l = _j.yCorr, yCorr = _l === void 0 ? 0 : _l, rotOriginX = (rotationOriginX !== null && rotationOriginX !== void 0 ? rotationOriginX : x) - xCorr - x - parentPadding, rotOriginY = (rotationOriginY !== null && rotationOriginY !== void 0 ? rotationOriginY : y) - yCorr - y - parentPadding, styles_1 = {
                left: "".concat(x + xCorr, "px"),
                top: "".concat(y + yCorr, "px"),
                textAlign: textAlign,
                transformOrigin: "".concat(rotOriginX, "px ").concat(rotOriginY, "px")
            };
            if (scaleX || scaleY) {
                styles_1.transform = "scale(".concat(scaleX !== null && scaleX !== void 0 ? scaleX : 1, ",").concat(scaleY !== null && scaleY !== void 0 ? scaleY : 1, ")");
            }
            css(element, styles_1);
            // Record current text transform
            this.cTT = currentTextTransform;
            this.oldRotation = rotation;
            this.oldAlign = textAlign;
        }
    };
    /**
     * Set the rotation of an individual HTML span.
     * @private
     */
    HTMLElement.prototype.setSpanRotation = function (rotation, originX, originY) {
        // CSS transform and transform-origin both supported without prefix
        // since Firefox 16 (2012), IE 10 (2012), Chrome 36 (2014), Safari 9
        // (2015).;
        css(this.element, {
            transform: "rotate(".concat(rotation, "deg)"),
            transformOrigin: "".concat(originX, "% ").concat(originY, "px")
        });
    };
    /**
     * Add the element to a group wrapper. For HTML elements, a parallel div
     * will be created for each ancenstor SVG `g` element.
     *
     * @private
     */
    HTMLElement.prototype.add = function (parentGroup) {
        var container = this.renderer.box
            .parentNode, parents = [];
        var div;
        this.parentGroup = parentGroup;
        // Create a parallel divs to hold the HTML elements
        if (parentGroup) {
            div = parentGroup.div;
            if (!div) {
                // Read the parent chain into an array and read from top
                // down
                var svgGroup = parentGroup;
                while (svgGroup) {
                    parents.push(svgGroup);
                    // Move up to the next parent group
                    svgGroup = svgGroup.parentGroup;
                }
                // Decorate each of the ancestor group elements with a parallel
                // div that reflects translation and styling
                for (var _i = 0, _a = parents.reverse(); _i < _a.length; _i++) {
                    var parentGroup_1 = _a[_i];
                    div = decorateSVGGroup(parentGroup_1, container);
                }
            }
        }
        (div || container).appendChild(this.element);
        this.added = true;
        if (this.alignOnAdd) {
            this.updateTransform();
        }
        return this;
    };
    /**
     * Text setter
     * @private
     */
    HTMLElement.prototype.textSetter = function (value) {
        if (value !== this.textStr) {
            delete this.bBox;
            delete this.oldTextWidth;
            AST.setElementHTML(this.element, value !== null && value !== void 0 ? value : '');
            this.textStr = value;
            this.doTransform = true;
        }
    };
    /**
     * Align setter
     *
     * @private
     */
    HTMLElement.prototype.alignSetter = function (value) {
        this.alignValue = this.textAlign = value;
        this.doTransform = true;
    };
    /**
     * Various setters which rely on update transform
     * @private
     */
    HTMLElement.prototype.xSetter = function (value, key) {
        this[key] = value;
        this.doTransform = true;
    };
    return HTMLElement;
}(SVGElement));
// Some shared setters
var proto = HTMLElement.prototype;
proto.visibilitySetter = proto.opacitySetter = commonSetter;
proto.ySetter =
    proto.rotationSetter =
        proto.rotationOriginXSetter =
            proto.rotationOriginYSetter = proto.xSetter;
/* *
 *
 *  Default Export
 *
 * */
export default HTMLElement;
