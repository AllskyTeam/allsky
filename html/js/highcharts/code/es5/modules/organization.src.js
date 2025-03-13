/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * Organization chart series type
 * @module highcharts/modules/organization
 * @requires highcharts
 * @requires highcharts/modules/sankey
 *
 * (c) 2019-2024 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/organization", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"], ["highcharts/highcharts","SVGElement"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/organization"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"], require("highcharts")["SVGElement"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"], root["Highcharts"]["SVGElement"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__, __WEBPACK_EXTERNAL_MODULE__28__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 28:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__28__;

/***/ }),

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 944:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__944__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ organization_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/Organization/OrganizationPoint.js
/* *
 *
 *  Organization chart module
 *
 *  (c) 2018-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var SankeyPointClass = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sankey.prototype.pointClass;

var defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, find = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).find, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get columns offset including all sibling and cousins etc.
 * @private
 */
function getOffset(node) {
    var offset = node.linksFrom.length;
    node.linksFrom.forEach(function (link) {
        if (link.id === link.toNode.linksTo[0].id) {
            // Node has children, that hangs directly from it:
            offset += getOffset(link.toNode);
        }
        else {
            // If the node hangs from multiple parents, and this is not
            // the last one, ignore it:
            offset--;
        }
    });
    return offset;
}
/* *
 *
 *  Class
 *
 * */
var OrganizationPoint = /** @class */ (function (_super) {
    __extends(OrganizationPoint, _super);
    /* *
     *
     *  Functions
     *
     * */
    function OrganizationPoint(series, options, x) {
        var _this = _super.call(this,
            series,
            options,
            x) || this;
        if (!_this.isNode) {
            _this.dataLabelOnNull = true;
            _this.formatPrefix = 'link';
        }
        return _this;
    }
    /**
     * All nodes in an org chart are equal width.
     * @private
     */
    OrganizationPoint.prototype.getSum = function () {
        return 1;
    };
    /**
     * Set node.column for hanging layout
     * @private
     */
    OrganizationPoint.prototype.setNodeColumn = function () {
        _super.prototype.setNodeColumn.call(this);
        var node = this,
            fromNode = node.getFromNode().fromNode;
        // Hanging layout
        if (
        // Not defined by user
        !defined(node.options.column) &&
            // Has links to
            node.linksTo.length !== 0 &&
            // And parent uses hanging layout
            fromNode &&
            fromNode.options.layout === 'hanging') {
            var i_1 = -1,
                link = void 0;
            // Default all children of the hanging node
            // to have hanging layout
            node.options.layout = pick(node.options.layout, 'hanging');
            node.hangsFrom = fromNode;
            find(fromNode.linksFrom, function (link, index) {
                var found = link.toNode === node;
                if (found) {
                    i_1 = index;
                }
                return found;
            });
            // For all siblings' children (recursively)
            // increase the column offset to prevent overlapping
            for (var j = 0; j < fromNode.linksFrom.length; ++j) {
                link = fromNode.linksFrom[j];
                if (link.toNode.id === node.id) {
                    // Break
                    j = fromNode.linksFrom.length;
                }
                else {
                    i_1 += getOffset(link.toNode);
                }
            }
            node.column = (node.column || 0) + i_1;
        }
    };
    return OrganizationPoint;
}(SankeyPointClass));
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Organization_OrganizationPoint = (OrganizationPoint);

;// ./code/es5/es-modules/Series/Organization/OrganizationSeriesDefaults.js
/* *
 *
 *  Organization chart module
 *
 *  (c) 2018-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  API Options
 *
 * */
/**
 * An organization chart is a diagram that shows the structure of an
 * organization and the relationships and relative ranks of its parts and
 * positions.
 *
 * @sample       highcharts/demo/organization-chart/
 *               Organization chart
 * @sample       highcharts/series-organization/horizontal/
 *               Horizontal organization chart
 * @sample       highcharts/series-organization/borderless
 *               Borderless design
 * @sample       highcharts/series-organization/center-layout
 *               Centered layout
 *
 * @extends      plotOptions.sankey
 * @excluding    allowPointSelect, curveFactor, dataSorting
 * @since        7.1.0
 * @product      highcharts
 * @requires     modules/organization
 * @optionparent plotOptions.organization
 */
var OrganizationSeriesDefaults = {
    /**
     * The border color of the node cards.
     *
     * @type {Highcharts.ColorString}
     */
    borderColor: "#666666" /* Palette.neutralColor60 */,
    /**
     * The border radius of the node cards.
     *
     * @private
     */
    borderRadius: 3,
    /**
     * Radius for the rounded corners of the links between nodes. This
     * option is now deprecated, and moved to
     * [link.radius](#plotOptions.organization.link.radius).
     *
     * @sample   highcharts/series-organization/link-options
     *           Square links
     *
     * @deprecated
     * @apioption series.organization.linkRadius
     */
    /**
     * Link Styling options
     * @since 10.3.0
     * @product highcharts
     */
    link: {
        /**
         * Modifier of the shape of the curved link. Works best for values
         * between 0 and 1, where 0 is a straight line, and 1 is a shape
         * close to the default one.
         *
         * @default 0.5
         * @type {number}
         * @since 10.3.0
         * @product highcharts
         * @apioption series.organization.link.offset
         */
        /**
         * The color of the links between nodes.
         *
         * @type {Highcharts.ColorString}
         */
        color: "#666666" /* Palette.neutralColor60 */,
        /**
         * The line width of the links connecting nodes, in pixels.
         *
         * @sample   highcharts/series-organization/link-options
         *           Square links
         */
        lineWidth: 1,
        /**
         * Radius for the rounded corners of the links between nodes.
         * Works for `default` link type.
         *
         * @sample   highcharts/series-organization/link-options
         *           Square links
         */
        radius: 10,
        /**
         * Type of the link shape.
         *
         * @sample   highcharts/series-organization/different-link-types
         *           Different link types
         *
         * @declare Highcharts.OrganizationLinkTypeValue
         * @type {'default' | 'curved' | 'straight'}
         * @default 'default'
         * @product highcharts
         */
        type: 'default'
    },
    borderWidth: 1,
    /**
     * @declare Highcharts.SeriesOrganizationDataLabelsOptionsObject
     *
     * @private
     */
    dataLabels: {
        /* eslint-disable valid-jsdoc */
        /**
         * A callback for defining the format for _nodes_ in the
         * organization chart. The `nodeFormat` option takes precedence
         * over `nodeFormatter`.
         *
         * In an organization chart, the `nodeFormatter` is a quite complex
         * function of the available options, striving for a good default
         * layout of cards with or without images. In organization chart,
         * the data labels come with `useHTML` set to true, meaning they
         * will be rendered as true HTML above the SVG.
         *
         * @sample highcharts/series-organization/datalabels-nodeformatter
         *         Modify the default label format output
         *
         * @type  {Highcharts.SeriesSankeyDataLabelsFormatterCallbackFunction}
         * @since 6.0.2
         */
        nodeFormatter: function () {
            var outerStyle = {
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    'flex-direction': 'row',
                    'align-items': 'center',
                    'justify-content': 'center'
                },
                imageStyle = {
                    'max-height': '100%',
                    'border-radius': '50%'
                },
                innerStyle = {
                    width: '100%',
                    padding: 0,
                    'text-align': 'center',
                    'white-space': 'normal'
                },
                nameStyle = {
                    margin: 0
                },
                titleStyle = {
                    margin: 0
                },
                descriptionStyle = {
                    opacity: 0.75,
                    margin: '5px'
                };
            // eslint-disable-next-line valid-jsdoc
            /**
             * @private
             */
            function styleAttr(style) {
                return Object.keys(style).reduce(function (str, key) {
                    return str + key + ':' + style[key] + ';';
                }, 'style="') + '"';
            }
            var _a = this.point,
                description = _a.description,
                image = _a.image,
                title = _a.title;
            if (image) {
                imageStyle['max-width'] = '30%';
                innerStyle.width = '70%';
            }
            // PhantomJS doesn't support flex, roll back to absolute
            // positioning
            if (this.series.chart.renderer.forExport) {
                outerStyle.display = 'block';
                innerStyle.position = 'absolute';
                innerStyle.left = image ? '30%' : 0;
                innerStyle.top = 0;
            }
            var html = '<div ' + styleAttr(outerStyle) + '>';
            if (image) {
                html += '<img src="' + image + '" ' +
                    styleAttr(imageStyle) + '>';
            }
            html += '<div ' + styleAttr(innerStyle) + '>';
            if (this.point.name) {
                html += '<h4 ' + styleAttr(nameStyle) + '>' +
                    this.point.name + '</h4>';
            }
            if (title) {
                html += '<p ' + styleAttr(titleStyle) + '>' +
                    (title || '') + '</p>';
            }
            if (description) {
                html += '<p ' + styleAttr(descriptionStyle) + '>' +
                    description + '</p>';
            }
            html += '</div>' +
                '</div>';
            return html;
        },
        /* eslint-enable valid-jsdoc */
        style: {
            /** @internal */
            fontWeight: 'normal',
            /** @internal */
            fontSize: '0.9em',
            /** @internal */
            textAlign: 'left'
        },
        useHTML: true,
        linkTextPath: {
            attributes: {
                startOffset: '95%',
                textAnchor: 'end'
            }
        }
    },
    /**
     * The indentation in pixels of hanging nodes, nodes which parent has
     * [layout](#series.organization.nodes.layout) set to `hanging`.
     *
     * @private
     */
    hangingIndent: 20,
    /**
     * Defines the indentation of a `hanging` layout parent's children.
     * Possible options:
     *
     * - `inherit` (default): Only the first child adds the indentation,
     * children of a child with indentation inherit the indentation.
     * - `cumulative`: All children of a child with indentation add its
     * own indent. The option may cause overlapping of nodes.
     * Then use `shrink` option:
     * - `shrink`: Nodes shrink by the
     * [hangingIndent](#plotOptions.organization.hangingIndent)
     * value until they reach the
     * [minNodeLength](#plotOptions.organization.minNodeLength).
     *
     * @sample highcharts/series-organization/hanging-cumulative
     *         Every indent increases the indentation
     *
     * @sample highcharts/series-organization/hanging-shrink
     *         Every indent decreases the nodes' width
     *
     * @type {Highcharts.OrganizationHangingIndentTranslationValue}
     * @since 10.0.0
     * @default inherit
     *
     * @private
     */
    hangingIndentTranslation: 'inherit',
    /**
     * Whether links connecting hanging nodes should be drawn on the left
     * or right side. Useful for RTL layouts.
     * **Note:** Only effects inverted charts (vertical layout).
     *
     * @sample highcharts/series-organization/hanging-side
     *         Nodes hanging from right side.
     *
     * @type {'left'|'right'}
     * @since 11.3.0
     * @default 'left'
     */
    hangingSide: 'left',
    /**
     *
     * The color of the links between nodes. This option is moved to
     * [link.color](#plotOptions.organization.link.color).
     *
     * @type {Highcharts.ColorString}
     * @deprecated
     * @apioption series.organization.linkColor
     * @private
     */
    /**
     * The line width of the links connecting nodes, in pixels. This option
     * is now deprecated and moved to the
     * [link.radius](#plotOptions.organization.link.lineWidth).
     *
     * @sample   highcharts/series-organization/link-options
     *           Square links
     *
     * @deprecated
     * @apioption series.organization.linkLineWidth
     * @private
     */
    /**
     * In a horizontal chart, the minimum width of the **hanging** nodes
     * only, in pixels. In a vertical chart, the minimum height of the
     * **haning** nodes only, in pixels too.
     *
     * Note: Used only when
     * [hangingIndentTranslation](#plotOptions.organization.hangingIndentTranslation)
     * is set to `shrink`.
     *
     * @see [nodeWidth](#plotOptions.organization.nodeWidth)
     *
     * @private
     */
    minNodeLength: 10,
    /**
     * In a horizontal chart, the width of the nodes in pixels. Note that
     * most organization charts are inverted (vertical), so the name of this
     * option is counterintuitive.
     *
     * @see [minNodeLength](#plotOptions.organization.minNodeLength)
     *
     * @private
     */
    nodeWidth: 50,
    tooltip: {
        nodeFormat: '{point.name}<br>{point.title}<br>{point.description}'
    }
};
/**
 * An `organization` series. If the [type](#series.organization.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.organization
 * @exclude   dataSorting, boostThreshold, boostBlending
 * @product   highcharts
 * @requires  modules/sankey
 * @requires  modules/organization
 * @apioption series.organization
 */
/**
 * @type      {Highcharts.SeriesOrganizationDataLabelsOptionsObject|Array<Highcharts.SeriesOrganizationDataLabelsOptionsObject>}
 * @product   highcharts
 * @apioption series.organization.data.dataLabels
 */
/**
 * A collection of options for the individual nodes. The nodes in an org chart
 * are auto-generated instances of `Highcharts.Point`, but options can be
 * applied here and linked by the `id`.
 *
 * @extends   series.sankey.nodes
 * @type      {Array<*>}
 * @product   highcharts
 * @apioption series.organization.nodes
 */
/**
 * Individual data label for each node. The options are the same as
 * the ones for [series.organization.dataLabels](#series.organization.dataLabels).
 *
 * @type    {Highcharts.SeriesOrganizationDataLabelsOptionsObject|Array<Highcharts.SeriesOrganizationDataLabelsOptionsObject>}
 *
 * @apioption series.organization.nodes.dataLabels
 */
/**
 * The job description for the node card, will be inserted by the default
 * `dataLabel.nodeFormatter`.
 *
 * @sample highcharts/demo/organization-chart
 *         Org chart with job descriptions
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.organization.nodes.description
 */
/**
 * An image for the node card, will be inserted by the default
 * `dataLabel.nodeFormatter`.
 *
 * @sample highcharts/demo/organization-chart
 *         Org chart with images
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.organization.nodes.image
 */
/**
 * The format string specifying what to show for *links* in the
 * organization chart.
 *
 * Best to use with [`linkTextPath`](#series.organization.dataLabels.linkTextPath) enabled.
 *
 * @sample highcharts/series-organization/link-labels
 *         Organization chart with link labels
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.organization.dataLabels.linkFormat
 * @since 11.0.0
 */
/**
 * Callback to format data labels for _links_ in the
 * organization chart. The `linkFormat` option takes
 * precedence over the `linkFormatter`.
 *
 * @type      {OrganizationDataLabelsFormatterCallbackFunction}
 * @product   highcharts
 * @apioption series.organization.dataLabels.linkFormatter
 * @since 11.0.0
 */
/**
 * Options for a _link_ label text which should follow link
 * connection.
 *
 * @sample highcharts/series-organization/link-labels
 *         Organization chart with link labels
 *
 * @type { DataLabelTextPathOptions }
 * @product highcharts
 * @apioption series.organization.dataLabels.linkTextPath
 * @since 11.0.0
 */
/**
 * Layout for the node's children. If `hanging`, this node's children will hang
 * below their parent, allowing a tighter packing of nodes in the diagram.
 *
 * Note: Since version 10.0.0, the `hanging` layout is set by default for
 * children of a parent using `hanging` layout.
 *
 * @sample highcharts/demo/organization-chart
 *         Hanging layout
 *
 * @type      {Highcharts.SeriesOrganizationNodesLayoutValue}
 * @default   normal
 * @product   highcharts
 * @apioption series.organization.nodes.layout
 */
/**
 * The job title for the node card, will be inserted by the default
 * `dataLabel.nodeFormatter`.
 *
 * @sample highcharts/demo/organization-chart
 *         Org chart with job titles
 *
 * @type      {string}
 * @product   highcharts
 * @apioption series.organization.nodes.title
 */
/**
 * An array of data points for the series. For the `organization` series
 * type, points can be given in the following way:
 *
 * An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of data
 * points exceeds the series' [turboThreshold](#series.area.turboThreshold),
 * this option is not available.
 *
 *  ```js
 *     data: [{
 *         from: 'Category1',
 *         to: 'Category2',
 *         weight: 2
 *     }, {
 *         from: 'Category1',
 *         to: 'Category3',
 *         weight: 5
 *     }]
 *  ```
 *
 * @type      {Array<*>}
 * @extends   series.sankey.data
 * @product   highcharts
 * @apioption series.organization.data
 */
''; // Keeps doclets above in JS file
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Organization_OrganizationSeriesDefaults = (OrganizationSeriesDefaults);

;// ./code/es5/es-modules/Series/PathUtilities.js
/* *
 *
 *  (c) 2010-2024 Pawel Lysy
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var getLinkPath = {
    'default': getDefaultPath,
    straight: getStraightPath,
    curved: getCurvedPath
};
/**
 *
 */
function getDefaultPath(pathParams) {
    var x1 = pathParams.x1,
        y1 = pathParams.y1,
        x2 = pathParams.x2,
        y2 = pathParams.y2,
        _a = pathParams.width,
        width = _a === void 0 ? 0 : _a,
        _b = pathParams.inverted,
        inverted = _b === void 0 ? false : _b,
        radius = pathParams.radius,
        parentVisible = pathParams.parentVisible;
    var path = [
            ['M',
        x1,
        y1],
            ['L',
        x1,
        y1],
            ['C',
        x1,
        y1,
        x1,
        y2,
        x1,
        y2],
            ['L',
        x1,
        y2],
            ['C',
        x1,
        y1,
        x1,
        y2,
        x1,
        y2],
            ['L',
        x1,
        y2]
        ];
    return parentVisible ?
        applyRadius([
            ['M', x1, y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y1],
            ['L', x1 + width * (inverted ? -0.5 : 0.5), y2],
            ['L', x2, y2]
        ], radius) :
        path;
}
/**
 *
 */
function getStraightPath(pathParams) {
    var x1 = pathParams.x1,
        y1 = pathParams.y1,
        x2 = pathParams.x2,
        y2 = pathParams.y2,
        _a = pathParams.width,
        width = _a === void 0 ? 0 : _a,
        _b = pathParams.inverted,
        inverted = _b === void 0 ? false : _b,
        parentVisible = pathParams.parentVisible;
    return parentVisible ? [
        ['M', x1, y1],
        ['L', x1 + width * (inverted ? -1 : 1), y2],
        ['L', x2, y2]
    ] : [
        ['M', x1, y1],
        ['L', x1, y2],
        ['L', x1, y2]
    ];
}
/**
 *
 */
function getCurvedPath(pathParams) {
    var x1 = pathParams.x1,
        y1 = pathParams.y1,
        x2 = pathParams.x2,
        y2 = pathParams.y2,
        _a = pathParams.offset,
        offset = _a === void 0 ? 0 : _a,
        _b = pathParams.width,
        width = _b === void 0 ? 0 : _b,
        _c = pathParams.inverted,
        inverted = _c === void 0 ? false : _c,
        parentVisible = pathParams.parentVisible;
    return parentVisible ?
        [
            ['M', x1, y1],
            [
                'C',
                x1 + offset,
                y1,
                x1 - offset + width * (inverted ? -1 : 1),
                y2,
                x1 + width * (inverted ? -1 : 1),
                y2
            ],
            ['L', x2, y2]
        ] :
        [
            ['M', x1, y1],
            ['C', x1, y1, x1, y2, x1, y2],
            ['L', x2, y2]
        ];
}
/**
 * General function to apply corner radius to a path
 * @private
 */
function applyRadius(path, r) {
    var d = [];
    for (var i = 0; i < path.length; i++) {
        var x = path[i][1];
        var y = path[i][2];
        if (typeof x === 'number' && typeof y === 'number') {
            // MoveTo
            if (i === 0) {
                d.push(['M', x, y]);
            }
            else if (i === path.length - 1) {
                d.push(['L', x, y]);
                // CurveTo
            }
            else if (r) {
                var prevSeg = path[i - 1];
                var nextSeg = path[i + 1];
                if (prevSeg && nextSeg) {
                    var x1 = prevSeg[1],
                        y1 = prevSeg[2],
                        x2 = nextSeg[1],
                        y2 = nextSeg[2];
                    // Only apply to breaks
                    if (typeof x1 === 'number' &&
                        typeof x2 === 'number' &&
                        typeof y1 === 'number' &&
                        typeof y2 === 'number' &&
                        x1 !== x2 &&
                        y1 !== y2) {
                        var directionX = x1 < x2 ? 1 : -1,
                            directionY = y1 < y2 ? 1 : -1;
                        d.push([
                            'L',
                            x - directionX * Math.min(Math.abs(x - x1), r),
                            y - directionY * Math.min(Math.abs(y - y1), r)
                        ], [
                            'C',
                            x,
                            y,
                            x,
                            y,
                            x + directionX * Math.min(Math.abs(x - x2), r),
                            y + directionY * Math.min(Math.abs(y - y2), r)
                        ]);
                    }
                }
                // LineTo
            }
            else {
                d.push(['L', x, y]);
            }
        }
    }
    return d;
}
var PathUtilities = {
    applyRadius: applyRadius,
    getLinkPath: getLinkPath
};
/* harmony default export */ var Series_PathUtilities = (PathUtilities);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SVGElement"],"commonjs":["highcharts","SVGElement"],"commonjs2":["highcharts","SVGElement"],"root":["Highcharts","SVGElement"]}
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_ = __webpack_require__(28);
var highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default = /*#__PURE__*/__webpack_require__.n(highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_);
;// ./code/es5/es-modules/Extensions/TextPath.js
/* *
 *
 *  Highcharts module with textPath functionality.
 *
 *  (c) 2009-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */



var deg2rad = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).deg2rad;
var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, uniqueKey = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).uniqueKey, TextPath_defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend;
/**
 * Set a text path for a `text` or `label` element, allowing the text to
 * flow along a path.
 *
 * In order to unset the path for an existing element, call `setTextPath`
 * with `{ enabled: false }` as the second argument.
 *
 * Text path support is not bundled into `highcharts.js`, and requires the
 * `modules/textpath.js` file. However, it is included in the script files of
 * those series types that use it by default
 *
 * @sample highcharts/members/renderer-textpath/ Text path demonstrated
 *
 * @function Highcharts.SVGElement#setTextPath
 *
 * @param {Highcharts.SVGElement|undefined} path
 *        Path to follow. If undefined, it allows changing options for the
 *        existing path.
 *
 * @param {Highcharts.DataLabelsTextPathOptionsObject} textPathOptions
 *        Options.
 *
 * @return {Highcharts.SVGElement} Returns the SVGElement for chaining.
 */
function setTextPath(path, textPathOptions) {
    var _this = this;
    // Defaults
    textPathOptions = merge(true, {
        enabled: true,
        attributes: {
            dy: -5,
            startOffset: '50%',
            textAnchor: 'middle'
        }
    }, textPathOptions);
    var url = this.renderer.url,
        textWrapper = this.text || this,
        textPath = textWrapper.textPath,
        attributes = textPathOptions.attributes,
        enabled = textPathOptions.enabled;
    path = path || (textPath && textPath.path);
    // Remove previously added event
    if (textPath) {
        textPath.undo();
    }
    if (path && enabled) {
        var undo = addEvent(textWrapper, 'afterModifyTree',
            function (e) {
                if (path && enabled) {
                    // Set ID for the path
                    var textPathId = path.attr('id');
                if (!textPathId) {
                    path.attr('id', textPathId = uniqueKey());
                }
                // Set attributes for the <text>
                var textAttribs = {
                        // `dx`/`dy` options must by set on <text> (parent), the
                        // rest should be set on <textPath>
                        x: 0,
                        y: 0
                    };
                if (TextPath_defined(attributes.dx)) {
                    textAttribs.dx = attributes.dx;
                    delete attributes.dx;
                }
                if (TextPath_defined(attributes.dy)) {
                    textAttribs.dy = attributes.dy;
                    delete attributes.dy;
                }
                textWrapper.attr(textAttribs);
                // Handle label properties
                _this.attr({ transform: '' });
                if (_this.box) {
                    _this.box = _this.box.destroy();
                }
                // Wrap the nodes in a textPath
                var children = e.nodes.slice(0);
                e.nodes.length = 0;
                e.nodes[0] = {
                    tagName: 'textPath',
                    attributes: extend(attributes, {
                        'text-anchor': attributes.textAnchor,
                        href: "" + url + "#".concat(textPathId)
                    }),
                    children: children
                };
            }
        });
        // Set the reference
        textWrapper.textPath = { path: path, undo: undo };
    }
    else {
        textWrapper.attr({ dx: 0, dy: 0 });
        delete textWrapper.textPath;
    }
    if (this.added) {
        // Rebuild text after added
        textWrapper.textCache = '';
        this.renderer.buildText(textWrapper);
    }
    return this;
}
/**
 * Attach a polygon to a bounding box if the element contains a textPath.
 *
 * @function Highcharts.SVGElement#setPolygon
 *
 * @param {any} event
 *        An event containing a bounding box object
 *
 * @return {Highcharts.BBoxObject} Returns the bounding box object.
 */
function setPolygon(event) {
    var _a;
    var bBox = event.bBox,
        tp = (_a = this.element) === null || _a === void 0 ? void 0 : _a.querySelector('textPath');
    if (tp) {
        var polygon = [], _b = this.renderer.fontMetrics(this.element), b_1 = _b.b, h = _b.h, descender_1 = h - b_1, lineCleanerRegex = new RegExp('(<tspan>|' +
                '<tspan(?!\\sclass="highcharts-br")[^>]*>|' +
                '<\\/tspan>)', 'g'), lines = tp
                .innerHTML
                .replace(lineCleanerRegex, '')
                .split(/<tspan class="highcharts-br"[^>]*>/), numOfLines = lines.length;
        // Calculate top and bottom coordinates for
        // either the start or the end of a single
        // character, and append it to the polygon.
        var appendTopAndBottom = function (charIndex,
            positionOfChar) {
                var x = positionOfChar.x,
            y = positionOfChar.y,
            rotation = (tp.getRotationOfChar(charIndex) - 90) * deg2rad,
            cosRot = Math.cos(rotation),
            sinRot = Math.sin(rotation);
            return [
                [
                    x - descender_1 * cosRot,
                    y - descender_1 * sinRot
                ],
                [
                    x + b_1 * cosRot,
                    y + b_1 * sinRot
                ]
            ];
        };
        for (var i = 0, lineIndex = 0; lineIndex < numOfLines; lineIndex++) {
            var line = lines[lineIndex],
                lineLen = line.length;
            for (var lineCharIndex = 0; lineCharIndex < lineLen; lineCharIndex += 5) {
                try {
                    var srcCharIndex = (i +
                            lineCharIndex +
                            lineIndex),
                        _c = appendTopAndBottom(srcCharIndex,
                        tp.getStartPositionOfChar(srcCharIndex)),
                        lower = _c[0],
                        upper = _c[1];
                    if (lineCharIndex === 0) {
                        polygon.push(upper);
                        polygon.push(lower);
                    }
                    else {
                        if (lineIndex === 0) {
                            polygon.unshift(upper);
                        }
                        if (lineIndex === numOfLines - 1) {
                            polygon.push(lower);
                        }
                    }
                }
                catch (e) {
                    // Safari fails on getStartPositionOfChar even if the
                    // character is within the `textContent.length`
                    break;
                }
            }
            i += lineLen - 1;
            try {
                var srcCharIndex = i + lineIndex,
                    charPos = tp.getEndPositionOfChar(srcCharIndex),
                    _d = appendTopAndBottom(srcCharIndex,
                    charPos),
                    lower = _d[0],
                    upper = _d[1];
                polygon.unshift(upper);
                polygon.unshift(lower);
            }
            catch (e) {
                // Safari fails on getStartPositionOfChar even if the character
                // is within the `textContent.length`
                break;
            }
        }
        // Close it
        if (polygon.length) {
            polygon.push(polygon[0].slice());
        }
        bBox.polygon = polygon;
    }
    return bBox;
}
/**
 * Draw text along a textPath for a dataLabel.
 *
 * @function Highcharts.SVGElement#setTextPath
 *
 * @param {any} event
 *        An event containing label options
 *
 * @return {void}
 */
function drawTextPath(event) {
    var _a;
    var labelOptions = event.labelOptions,
        point = event.point,
        textPathOptions = (labelOptions[point.formatPrefix + 'TextPath'] ||
            labelOptions.textPath);
    if (textPathOptions && !labelOptions.useHTML) {
        this.setTextPath(((_a = point.getDataLabelPath) === null || _a === void 0 ? void 0 : _a.call(point, this)) || point.graphic, textPathOptions);
        if (point.dataLabelPath &&
            !textPathOptions.enabled) {
            // Clean the DOM
            point.dataLabelPath = (point.dataLabelPath.destroy());
        }
    }
}
function compose(SVGElementClass) {
    addEvent(SVGElementClass, 'afterGetBBox', setPolygon);
    addEvent(SVGElementClass, 'beforeAddingDataLabel', drawTextPath);
    var svgElementProto = SVGElementClass.prototype;
    if (!svgElementProto.setTextPath) {
        svgElementProto.setTextPath = setTextPath;
    }
}
var TextPath = {
    compose: compose
};
/* harmony default export */ var Extensions_TextPath = (TextPath);

;// ./code/es5/es-modules/Series/Organization/OrganizationSeries.js
/* *
 *
 *  Organization chart module
 *
 *  (c) 2018-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var OrganizationSeries_extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b,
        p)) d[p] = b[p]; };
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




var SankeySeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.sankey;

var css = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).css, crisp = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).crisp, OrganizationSeries_extend = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).extend, isNumber = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).isNumber, OrganizationSeries_merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, OrganizationSeries_pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick;


Extensions_TextPath.compose((highcharts_SVGElement_commonjs_highcharts_SVGElement_commonjs2_highcharts_SVGElement_root_Highcharts_SVGElement_default()));
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 * @name Highcharts.seriesTypes.organization
 *
 * @augments Highcharts.seriesTypes.sankey
 */
var OrganizationSeries = /** @class */ (function (_super) {
    OrganizationSeries_extends(OrganizationSeries, _super);
    function OrganizationSeries() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* *
     *
     *  Functions
     *
     * */
    OrganizationSeries.prototype.alignDataLabel = function (point, dataLabel, options) {
        // Align the data label to the point graphic
        var shapeArgs = point.shapeArgs;
        if (options.useHTML && shapeArgs) {
            var padjust = (this.options.borderWidth +
                    2 * this.options.dataLabels.padding);
            var width_1 = shapeArgs.width || 0,
                height_1 = shapeArgs.height || 0;
            if (this.chart.inverted) {
                width_1 = height_1;
                height_1 = shapeArgs.width || 0;
            }
            height_1 -= padjust;
            width_1 -= padjust;
            // Set the size of the surrounding div emulating `g`
            var text = dataLabel.text;
            if (text) {
                css(text.element.parentNode, {
                    width: width_1 + 'px',
                    height: height_1 + 'px'
                });
                // Set properties for the span emulating `text`
                css(text.element, {
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                });
            }
            // The getBBox function is used in `alignDataLabel` to align
            // inside the box
            dataLabel.getBBox = function () { return ({ width: width_1, height: height_1, x: 0, y: 0 }); };
            // Overwrite dataLabel dimensions (#13100).
            dataLabel.width = width_1;
            dataLabel.height = height_1;
        }
        _super.prototype.alignDataLabel.apply(this, arguments);
    };
    OrganizationSeries.prototype.createNode = function (id) {
        var node = _super.prototype.createNode.call(this,
            id);
        // All nodes in an org chart are equal width
        node.getSum = function () { return 1; };
        return node;
    };
    OrganizationSeries.prototype.pointAttribs = function (point, state) {
        var series = this,
            attribs = SankeySeries.prototype.pointAttribs.call(series,
            point,
            state),
            level = point.isNode ? point.level : point.fromNode.level,
            levelOptions = series.mapOptionsToLevel[level || 0] || {},
            options = point.options,
            stateOptions = (levelOptions.states &&
                levelOptions.states[state]) ||
                {},
            borderRadius = OrganizationSeries_pick(stateOptions.borderRadius,
            options.borderRadius,
            levelOptions.borderRadius,
            series.options.borderRadius),
            linkColor = OrganizationSeries_pick(stateOptions.linkColor,
            options.linkColor,
            levelOptions.linkColor,
            series.options.linkColor,
            stateOptions.link && stateOptions.link.color,
            options.link && options.link.color,
            levelOptions.link && levelOptions.link.color,
            series.options.link && series.options.link.color),
            linkLineWidth = OrganizationSeries_pick(stateOptions.linkLineWidth,
            options.linkLineWidth,
            levelOptions.linkLineWidth,
            series.options.linkLineWidth,
            stateOptions.link && stateOptions.link.lineWidth,
            options.link && options.link.lineWidth,
            levelOptions.link && levelOptions.link.lineWidth,
            series.options.link && series.options.link.lineWidth),
            linkOpacity = OrganizationSeries_pick(stateOptions.linkOpacity,
            options.linkOpacity,
            levelOptions.linkOpacity,
            series.options.linkOpacity,
            stateOptions.link && stateOptions.link.linkOpacity,
            options.link && options.link.linkOpacity,
            levelOptions.link && levelOptions.link.linkOpacity,
            series.options.link && series.options.link.linkOpacity);
        if (!point.isNode) {
            attribs.stroke = linkColor;
            attribs['stroke-width'] = linkLineWidth;
            attribs.opacity = linkOpacity;
            delete attribs.fill;
        }
        else {
            if (isNumber(borderRadius)) {
                attribs.r = borderRadius;
            }
        }
        return attribs;
    };
    OrganizationSeries.prototype.translateLink = function (point) {
        var chart = this.chart,
            options = this.options,
            fromNode = point.fromNode,
            toNode = point.toNode,
            linkWidth = OrganizationSeries_pick(options.linkLineWidth,
            options.link.lineWidth, 0),
            factor = OrganizationSeries_pick(options.link.offset, 0.5),
            type = OrganizationSeries_pick(point.options.link && point.options.link.type,
            options.link.type);
        if (fromNode.shapeArgs && toNode.shapeArgs) {
            var hangingIndent = options.hangingIndent, hangingRight = options.hangingSide === 'right', toOffset = toNode.options.offset, percentOffset = /%$/.test(toOffset) && parseInt(toOffset, 10), inverted = chart.inverted;
            var x1 = crisp((fromNode.shapeArgs.x || 0) +
                    (fromNode.shapeArgs.width || 0),
                linkWidth),
                y1 = crisp((fromNode.shapeArgs.y || 0) +
                    (fromNode.shapeArgs.height || 0) / 2,
                linkWidth),
                x2 = crisp(toNode.shapeArgs.x || 0,
                linkWidth),
                y2 = crisp((toNode.shapeArgs.y || 0) +
                    (toNode.shapeArgs.height || 0) / 2,
                linkWidth),
                xMiddle = void 0;
            if (inverted) {
                x1 -= (fromNode.shapeArgs.width || 0);
                x2 += (toNode.shapeArgs.width || 0);
            }
            xMiddle = this.colDistance ?
                crisp(x2 +
                    ((inverted ? 1 : -1) *
                        (this.colDistance - this.nodeWidth)) /
                        2, linkWidth) :
                crisp((x2 + x1) / 2, linkWidth);
            // Put the link on the side of the node when an offset is given. HR
            // node in the main demo.
            if (percentOffset &&
                (percentOffset >= 50 || percentOffset <= -50)) {
                xMiddle = x2 = crisp(x2 + (inverted ? -0.5 : 0.5) *
                    (toNode.shapeArgs.width || 0), linkWidth);
                y2 = toNode.shapeArgs.y || 0;
                if (percentOffset > 0) {
                    y2 += toNode.shapeArgs.height || 0;
                }
            }
            if (toNode.hangsFrom === fromNode) {
                if (chart.inverted) {
                    y1 = !hangingRight ?
                        crisp((fromNode.shapeArgs.y || 0) +
                            (fromNode.shapeArgs.height || 0) -
                            hangingIndent / 2, linkWidth) :
                        crisp((fromNode.shapeArgs.y || 0) + hangingIndent / 2, linkWidth);
                    y2 = !hangingRight ? ((toNode.shapeArgs.y || 0) +
                        (toNode.shapeArgs.height || 0)) : (toNode.shapeArgs.y || 0) + hangingIndent / 2;
                }
                else {
                    y1 = crisp((fromNode.shapeArgs.y || 0) + hangingIndent / 2, linkWidth);
                }
                xMiddle = x2 = crisp((toNode.shapeArgs.x || 0) +
                    (toNode.shapeArgs.width || 0) / 2, linkWidth);
            }
            point.plotX = xMiddle;
            point.plotY = (y1 + y2) / 2;
            point.shapeType = 'path';
            if (type === 'straight') {
                point.shapeArgs = {
                    d: [
                        ['M', x1, y1],
                        ['L', x2, y2]
                    ]
                };
            }
            else if (type === 'curved') {
                var offset = Math.abs(x2 - x1) * factor * (inverted ? -1 : 1);
                point.shapeArgs = {
                    d: [
                        ['M', x1, y1],
                        ['C', x1 + offset, y1, x2 - offset, y2, x2, y2]
                    ]
                };
            }
            else {
                point.shapeArgs = {
                    d: Series_PathUtilities.applyRadius([
                        ['M', x1, y1],
                        ['L', xMiddle, y1],
                        ['L', xMiddle, y2],
                        ['L', x2, y2]
                    ], OrganizationSeries_pick(options.linkRadius, options.link.radius))
                };
            }
            point.dlBox = {
                x: (x1 + x2) / 2,
                y: (y1 + y2) / 2,
                height: linkWidth,
                width: 0
            };
        }
    };
    OrganizationSeries.prototype.translateNode = function (node, column) {
        _super.prototype.translateNode.call(this, node, column);
        var chart = this.chart,
            options = this.options,
            sum = node.getSum(),
            translationFactor = this.translationFactor,
            nodeHeight = Math.max(Math.round(sum * translationFactor),
            options.minLinkWidth || 0),
            hangingRight = options.hangingSide === 'right',
            indent = options.hangingIndent || 0,
            indentLogic = options.hangingIndentTranslation,
            minLength = options.minNodeLength || 10,
            nodeWidth = Math.round(this.nodeWidth),
            shapeArgs = node.shapeArgs,
            sign = chart.inverted ? -1 : 1;
        var parentNode = node.hangsFrom;
        if (parentNode) {
            if (indentLogic === 'cumulative') {
                // Move to the right:
                shapeArgs.height -= indent;
                // If hanging right, first indent is handled by shrinking.
                if (chart.inverted && !hangingRight) {
                    shapeArgs.y -= sign * indent;
                }
                while (parentNode) {
                    // Hanging right is the same direction as non-inverted.
                    shapeArgs.y += (hangingRight ? 1 : sign) * indent;
                    parentNode = parentNode.hangsFrom;
                }
            }
            else if (indentLogic === 'shrink') {
                // Resize the node:
                while (parentNode &&
                    shapeArgs.height > indent + minLength) {
                    shapeArgs.height -= indent;
                    // Fixes nodes not dropping in non-inverted charts.
                    // Hanging right is the same as non-inverted.
                    if (!chart.inverted || hangingRight) {
                        shapeArgs.y += indent;
                    }
                    parentNode = parentNode.hangsFrom;
                }
            }
            else {
                // Option indentLogic === "inherit"
                // Do nothing (v9.3.2 and prev versions):
                shapeArgs.height -= indent;
                if (!chart.inverted || hangingRight) {
                    shapeArgs.y += indent;
                }
            }
        }
        node.nodeHeight = chart.inverted ?
            shapeArgs.width :
            shapeArgs.height;
        // Calculate shape args correctly to align nodes to center (#19946)
        if (node.shapeArgs && !node.hangsFrom) {
            node.shapeArgs = OrganizationSeries_merge(node.shapeArgs, {
                x: (node.shapeArgs.x || 0) + (nodeWidth / 2) -
                    ((node.shapeArgs.width || 0) / 2),
                y: (node.shapeArgs.y || 0) + (nodeHeight / 2) -
                    ((node.shapeArgs.height || 0) / 2)
            });
        }
    };
    OrganizationSeries.prototype.drawDataLabels = function () {
        var dlOptions = this.options.dataLabels;
        if (dlOptions.linkTextPath && dlOptions.linkTextPath.enabled) {
            for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
                var link = _a[_i];
                link.options.dataLabels = OrganizationSeries_merge(link.options.dataLabels, { useHTML: false });
            }
        }
        _super.prototype.drawDataLabels.call(this);
    };
    /* *
     *
     *  Static Properties
     *
     * */
    OrganizationSeries.defaultOptions = OrganizationSeries_merge(SankeySeries.defaultOptions, Organization_OrganizationSeriesDefaults);
    return OrganizationSeries;
}(SankeySeries));
OrganizationSeries_extend(OrganizationSeries.prototype, {
    pointClass: Organization_OrganizationPoint
});
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('organization', OrganizationSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var Organization_OrganizationSeries = ((/* unused pure expression or super */ null && (OrganizationSeries)));
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Layout value for the child nodes in an organization chart. If `hanging`, this
 * node's children will hang below their parent, allowing a tighter packing of
 * nodes in the diagram.
 *
 * @typedef {"normal"|"hanging"} Highcharts.SeriesOrganizationNodesLayoutValue
 */
/**
 * Indent translation value for the child nodes in an organization chart, when
 * parent has `hanging` layout. Option can shrink nodes (for tight charts),
 * translate children to the left, or render nodes directly under the parent.
 *
 * @typedef {"inherit"|"cumulative"|"shrink"} Highcharts.OrganizationHangingIndentTranslationValue
 */
''; // Detach doclets above

;// ./code/es5/es-modules/masters/modules/organization.src.js




/* harmony default export */ var organization_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});