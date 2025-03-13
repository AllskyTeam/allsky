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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import U from '../Utilities.js';
var extend = U.extend, merge = U.merge, pick = U.pick;
/* *
 *
 *  Namespace
 *
 * */
var LegendSymbol;
(function (LegendSymbol) {
    /* *
    *
    *  Functions
    *
    * */
    /**
     * Draw a line, a point marker and an area in the legend.
     *
     * @private
     * @function Highcharts.LegendSymbolMixin.areaMarker
     *
     * @param {Highcharts.Legend} legend
     * The legend object.
     */
    function areaMarker(legend, item) {
        lineMarker.call(this, legend, item, true);
    }
    LegendSymbol.areaMarker = areaMarker;
    /**
     * Draw a line and a point marker in the legend.
     *
     * @private
     * @function Highcharts.LegendSymbolMixin.lineMarker
     *
     * @param {Highcharts.Legend} legend
     * The legend object.
     */
    function lineMarker(legend, item, hasArea) {
        var _a, _b;
        var legendItem = this.legendItem = this.legendItem || {}, _c = this, chart = _c.chart, options = _c.options, _d = legend.baseline, baseline = _d === void 0 ? 0 : _d, symbolWidth = legend.symbolWidth, symbolHeight = legend.symbolHeight, symbol = this.symbol || 'circle', generalRadius = symbolHeight / 2, renderer = chart.renderer, legendItemGroup = legendItem.group, verticalCenter = baseline - Math.round((((_a = legend.fontMetrics) === null || _a === void 0 ? void 0 : _a.b) || symbolHeight) *
            // Render line and marker slightly higher to make room for the
            // area
            (hasArea ? 0.4 : 0.3)), attr = {};
        var legendSymbol, markerOptions = options.marker, lineSizer = 0;
        // Draw the line
        if (!chart.styledMode) {
            attr['stroke-width'] = Math.min(options.lineWidth || 0, 24);
            if (options.dashStyle) {
                attr.dashstyle = options.dashStyle;
            }
            else if (options.linecap !== 'square') {
                attr['stroke-linecap'] = 'round';
            }
        }
        legendItem.line = renderer
            .path()
            .addClass('highcharts-graph')
            .attr(attr)
            .add(legendItemGroup);
        if (hasArea) {
            legendItem.area = renderer
                .path()
                .addClass('highcharts-area')
                .add(legendItemGroup);
        }
        if (attr['stroke-linecap']) {
            lineSizer = Math.min(legendItem.line.strokeWidth(), symbolWidth) / 2;
        }
        if (symbolWidth) {
            var d = [
                ['M', lineSizer, verticalCenter],
                ['L', symbolWidth - lineSizer, verticalCenter]
            ];
            legendItem.line.attr({ d: d });
            (_b = legendItem.area) === null || _b === void 0 ? void 0 : _b.attr({
                d: __spreadArray(__spreadArray([], d, true), [
                    ['L', symbolWidth - lineSizer, baseline],
                    ['L', lineSizer, baseline]
                ], false)
            });
        }
        // Draw the marker
        if (markerOptions && markerOptions.enabled !== false && symbolWidth) {
            // Do not allow the marker to be larger than the symbolHeight
            var radius = Math.min(pick(markerOptions.radius, generalRadius), generalRadius);
            // Restrict symbol markers size
            if (symbol.indexOf('url') === 0) {
                markerOptions = merge(markerOptions, {
                    width: symbolHeight,
                    height: symbolHeight
                });
                radius = 0;
            }
            legendItem.symbol = legendSymbol = renderer
                .symbol(symbol, (symbolWidth / 2) - radius, verticalCenter - radius, 2 * radius, 2 * radius, extend({ context: 'legend' }, markerOptions))
                .addClass('highcharts-point')
                .add(legendItemGroup);
            legendSymbol.isMarker = true;
        }
    }
    LegendSymbol.lineMarker = lineMarker;
    /**
     * Get the series' symbol in the legend.
     *
     * This method should be overridable to create custom symbols through
     * Highcharts.seriesTypes[type].prototype.drawLegendSymbol.
     *
     * @private
     * @function Highcharts.LegendSymbolMixin.rectangle
     *
     * @param {Highcharts.Legend} legend
     * The legend object
     *
     * @param {Highcharts.Point|Highcharts.Series} item
     * The series (this) or point
     */
    function rectangle(legend, item) {
        var legendItem = item.legendItem || {}, options = legend.options, symbolHeight = legend.symbolHeight, square = options.squareSymbol, symbolWidth = square ? symbolHeight : legend.symbolWidth;
        legendItem.symbol = this.chart.renderer
            .rect(square ? (legend.symbolWidth - symbolHeight) / 2 : 0, legend.baseline - symbolHeight + 1, // #3988
        symbolWidth, symbolHeight, pick(legend.options.symbolRadius, symbolHeight / 2))
            .addClass('highcharts-point')
            .attr({
            zIndex: 3
        })
            .add(legendItem.group);
    }
    LegendSymbol.rectangle = rectangle;
})(LegendSymbol || (LegendSymbol = {}));
/* *
 *
 *  Default Export
 *
 * */
export default LegendSymbol;
