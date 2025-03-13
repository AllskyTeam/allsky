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
import A from '../Animation/AnimationUtilities.js';
var animObject = A.animObject, setAnimation = A.setAnimation;
import F from '../Foundation.js';
var registerEventOptions = F.registerEventOptions;
import H from '../Globals.js';
var composed = H.composed, marginNames = H.marginNames;
import Series from '../Series/Series.js';
import Point from '../Series/Point.js';
import R from '../Renderer/RendererUtilities.js';
var distribute = R.distribute;
import T from '../Templating.js';
var format = T.format;
import U from '../Utilities.js';
var addEvent = U.addEvent, createElement = U.createElement, css = U.css, defined = U.defined, discardElement = U.discardElement, find = U.find, fireEvent = U.fireEvent, isNumber = U.isNumber, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique, relativeLength = U.relativeLength, stableSort = U.stableSort, syncTimeout = U.syncTimeout;
/* *
 *
 *  Class
 *
 * */
/**
 * The overview of the chart's series. The legend object is instantiated
 * internally in the chart constructor, and is available from the `chart.legend`
 * property. Each chart has only one legend.
 *
 * @class
 * @name Highcharts.Legend
 *
 * @param {Highcharts.Chart} chart
 * The chart instance.
 *
 * @param {Highcharts.LegendOptions} options
 * Legend options.
 */
var Legend = /** @class */ (function () {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initialize the legend.
     *
     * @private
     * @function Highcharts.Legend#init
     *
     * @param {Highcharts.Chart} chart
     * The chart instance.
     *
     * @param {Highcharts.LegendOptions} options
     * Legend options.
     */
    function Legend(chart, options) {
        var _this = this;
        /* *
         *
         *  Properties
         *
         * */
        this.allItems = [];
        this.initialItemY = 0;
        this.itemHeight = 0;
        this.itemMarginBottom = 0;
        this.itemMarginTop = 0;
        this.itemX = 0;
        this.itemY = 0;
        this.lastItemY = 0;
        this.lastLineHeight = 0;
        this.legendHeight = 0;
        this.legendWidth = 0;
        this.maxItemWidth = 0;
        this.maxLegendWidth = 0;
        this.offsetWidth = 0;
        this.padding = 0;
        this.pages = [];
        this.symbolHeight = 0;
        this.symbolWidth = 0;
        this.titleHeight = 0;
        this.totalItemWidth = 0;
        this.widthOption = 0;
        /**
         * Chart of this legend.
         *
         * @readonly
         * @name Highcharts.Legend#chart
         * @type {Highcharts.Chart}
         */
        this.chart = chart;
        this.setOptions(options);
        if (options.enabled) {
            // Render it
            this.render();
            registerEventOptions(this, options);
            // Move checkboxes
            addEvent(this.chart, 'endResize', function () {
                this.legend.positionCheckboxes();
            });
        }
        // On Legend.init and Legend.update, make sure that proximate layout
        // events are either added or removed (#18362).
        addEvent(this.chart, 'render', function () {
            if (_this.options.enabled && _this.proximate) {
                _this.proximatePositions();
                _this.positionItems();
            }
        });
    }
    /**
     * @private
     * @function Highcharts.Legend#setOptions
     * @param {Highcharts.LegendOptions} options
     */
    Legend.prototype.setOptions = function (options) {
        var padding = pick(options.padding, 8);
        /**
         * Legend options.
         *
         * @readonly
         * @name Highcharts.Legend#options
         * @type {Highcharts.LegendOptions}
         */
        this.options = options;
        if (!this.chart.styledMode) {
            this.itemStyle = options.itemStyle;
            this.itemHiddenStyle = merge(this.itemStyle, options.itemHiddenStyle);
        }
        this.itemMarginTop = options.itemMarginTop;
        this.itemMarginBottom = options.itemMarginBottom;
        this.padding = padding;
        this.initialItemY = padding - 5; // 5 is pixels above the text
        this.symbolWidth = pick(options.symbolWidth, 16);
        this.pages = [];
        this.proximate = options.layout === 'proximate' && !this.chart.inverted;
        // #12705: baseline has to be reset on every update
        this.baseline = void 0;
    };
    /**
     * Update the legend with new options. Equivalent to running `chart.update`
     * with a legend configuration option.
     *
     * @sample highcharts/legend/legend-update/
     *         Legend update
     *
     * @function Highcharts.Legend#update
     *
     * @param {Highcharts.LegendOptions} options
     * Legend options.
     *
     * @param {boolean} [redraw=true]
     * Whether to redraw the chart after the axis is altered. If doing more
     * operations on the chart, it is a good idea to set redraw to false and
     * call {@link Chart#redraw} after. Whether to redraw the chart.
     *
     * @emits Highcharts.Legends#event:afterUpdate
     */
    Legend.prototype.update = function (options, redraw) {
        var chart = this.chart;
        this.setOptions(merge(true, this.options, options));
        if ('events' in this.options) {
            // Legend event handlers
            registerEventOptions(this, this.options);
        }
        this.destroy();
        chart.isDirtyLegend = chart.isDirtyBox = true;
        if (pick(redraw, true)) {
            chart.redraw();
        }
        fireEvent(this, 'afterUpdate', { redraw: redraw });
    };
    /**
     * Set the colors for the legend item.
     *
     * @private
     * @function Highcharts.Legend#colorizeItem
     * @param {Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series} item
     *        A Series or Point instance
     * @param {boolean} [visible=false]
     *        Dimmed or colored
     *
     * @todo
     * Make events official: Fires the event `afterColorizeItem`.
     */
    Legend.prototype.colorizeItem = function (item, visible) {
        var _a;
        var originalColor = item.color, _b = item.legendItem || {}, area = _b.area, group = _b.group, label = _b.label, line = _b.line, symbol = _b.symbol;
        if (item instanceof Series || item instanceof Point) {
            item.color = ((_a = item.options) === null || _a === void 0 ? void 0 : _a.legendSymbolColor) || originalColor;
        }
        group === null || group === void 0 ? void 0 : group[visible ? 'removeClass' : 'addClass']('highcharts-legend-item-hidden');
        if (!this.chart.styledMode) {
            var _c = this.itemHiddenStyle, itemHiddenStyle = _c === void 0 ? {} : _c, hiddenColor_1 = itemHiddenStyle.color, _d = item.options, fillColor = _d.fillColor, fillOpacity = _d.fillOpacity, lineColor = _d.lineColor, marker = _d.marker, colorizeHidden = function (attr) {
                if (!visible) {
                    if (attr.fill) {
                        attr.fill = hiddenColor_1;
                    }
                    if (attr.stroke) {
                        attr.stroke = hiddenColor_1;
                    }
                }
                return attr;
            };
            label === null || label === void 0 ? void 0 : label.css(merge(visible ? this.itemStyle : itemHiddenStyle));
            line === null || line === void 0 ? void 0 : line.attr(colorizeHidden({ stroke: lineColor || item.color }));
            if (symbol) {
                // Apply marker options
                symbol.attr(colorizeHidden(marker && symbol.isMarker ? // #585
                    item.pointAttribs() :
                    { fill: item.color }));
            }
            area === null || area === void 0 ? void 0 : area.attr(colorizeHidden({
                fill: fillColor || item.color,
                'fill-opacity': fillColor ? 1 : (fillOpacity !== null && fillOpacity !== void 0 ? fillOpacity : 0.75)
            }));
        }
        item.color = originalColor;
        fireEvent(this, 'afterColorizeItem', { item: item, visible: visible });
    };
    /**
     * @private
     * @function Highcharts.Legend#positionItems
     */
    Legend.prototype.positionItems = function () {
        // Now that the legend width and height are established, put the items
        // in the final position
        this.allItems.forEach(this.positionItem, this);
        if (!this.chart.isResizing) {
            this.positionCheckboxes();
        }
    };
    /**
     * Position the legend item.
     *
     * @private
     * @function Highcharts.Legend#positionItem
     * @param {Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series} item
     * The item to position
     */
    Legend.prototype.positionItem = function (item) {
        var _this = this;
        var legend = this, _a = item.legendItem || {}, group = _a.group, _b = _a.x, x = _b === void 0 ? 0 : _b, _c = _a.y, y = _c === void 0 ? 0 : _c, options = legend.options, symbolPadding = options.symbolPadding, ltr = !options.rtl, checkbox = item.checkbox;
        if (group && group.element) {
            var attribs = {
                translateX: ltr ?
                    x :
                    legend.legendWidth - x - 2 * symbolPadding - 4,
                translateY: y
            };
            var complete = function () {
                fireEvent(_this, 'afterPositionItem', { item: item });
            };
            group[defined(group.translateY) ? 'animate' : 'attr'](attribs, void 0, complete);
        }
        if (checkbox) {
            checkbox.x = x;
            checkbox.y = y;
        }
    };
    /**
     * Destroy a single legend item, used internally on removing series items.
     *
     * @private
     * @function Highcharts.Legend#destroyItem
     * @param {Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series} item
     * The item to remove
     */
    Legend.prototype.destroyItem = function (item) {
        var checkbox = item.checkbox, legendItem = item.legendItem || {};
        // Destroy SVG elements
        for (var _i = 0, _a = ['group', 'label', 'line', 'symbol']; _i < _a.length; _i++) {
            var key = _a[_i];
            if (legendItem[key]) {
                legendItem[key] = legendItem[key].destroy();
            }
        }
        if (checkbox) {
            discardElement(checkbox);
        }
        item.legendItem = void 0;
    };
    /**
     * Destroy the legend. Used internally. To reflow objects, `chart.redraw`
     * must be called after destruction.
     *
     * @private
     * @function Highcharts.Legend#destroy
     */
    Legend.prototype.destroy = function () {
        var legend = this;
        // Destroy items
        for (var _i = 0, _a = this.getAllItems(); _i < _a.length; _i++) {
            var item = _a[_i];
            this.destroyItem(item);
        }
        // Destroy legend elements
        for (var _b = 0, _c = [
            'clipRect',
            'up',
            'down',
            'pager',
            'nav',
            'box',
            'title',
            'group'
        ]; _b < _c.length; _b++) {
            var key = _c[_b];
            if (legend[key]) {
                legend[key] = legend[key].destroy();
            }
        }
        this.display = null; // Reset in .render on update.
    };
    /**
     * Position the checkboxes after the width is determined.
     *
     * @private
     * @function Highcharts.Legend#positionCheckboxes
     */
    Legend.prototype.positionCheckboxes = function () {
        var alignAttr = this.group && this.group.alignAttr, clipHeight = this.clipHeight || this.legendHeight, titleHeight = this.titleHeight;
        var translateY;
        if (alignAttr) {
            translateY = alignAttr.translateY;
            this.allItems.forEach(function (item) {
                var checkbox = item.checkbox;
                var top;
                if (checkbox) {
                    top = translateY + titleHeight + checkbox.y +
                        (this.scrollOffset || 0) + 3;
                    css(checkbox, {
                        left: (alignAttr.translateX + item.checkboxOffset +
                            checkbox.x - 20) + 'px',
                        top: top + 'px',
                        display: this.proximate || (top > translateY - 6 &&
                            top < translateY + clipHeight - 6) ?
                            '' :
                            'none'
                    });
                }
            }, this);
        }
    };
    /**
     * Render the legend title on top of the legend.
     *
     * @private
     * @function Highcharts.Legend#renderTitle
     */
    Legend.prototype.renderTitle = function () {
        var options = this.options, padding = this.padding, titleOptions = options.title;
        var bBox, titleHeight = 0;
        if (titleOptions.text) {
            if (!this.title) {
                /**
                 * SVG element of the legend title.
                 *
                 * @readonly
                 * @name Highcharts.Legend#title
                 * @type {Highcharts.SVGElement}
                 */
                this.title = this.chart.renderer.label(titleOptions.text, padding - 3, padding - 4, void 0, void 0, void 0, options.useHTML, void 0, 'legend-title')
                    .attr({ zIndex: 1 });
                if (!this.chart.styledMode) {
                    this.title.css(titleOptions.style);
                }
                this.title.add(this.group);
            }
            // Set the max title width (#7253)
            if (!titleOptions.width) {
                this.title.css({
                    width: this.maxLegendWidth + 'px'
                });
            }
            bBox = this.title.getBBox();
            titleHeight = bBox.height;
            this.offsetWidth = bBox.width; // #1717
            this.contentGroup.attr({ translateY: titleHeight });
        }
        this.titleHeight = titleHeight;
    };
    /**
     * Set the legend item text.
     *
     * @function Highcharts.Legend#setText
     * @param {Highcharts.Point|Highcharts.Series} item
     *        The item for which to update the text in the legend.
     */
    Legend.prototype.setText = function (item) {
        var options = this.options;
        item.legendItem.label.attr({
            text: options.labelFormat ?
                format(options.labelFormat, item, this.chart) :
                options.labelFormatter.call(item)
        });
    };
    /**
     * Render a single specific legend item. Called internally from the `render`
     * function.
     *
     * @private
     * @function Highcharts.Legend#renderItem
     * @param {Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series} item
     * The item to render.
     */
    Legend.prototype.renderItem = function (item) {
        var legend = this, legendItem = item.legendItem = item.legendItem || {}, chart = legend.chart, renderer = chart.renderer, options = legend.options, horizontal = options.layout === 'horizontal', symbolWidth = legend.symbolWidth, symbolPadding = options.symbolPadding || 0, itemStyle = legend.itemStyle, itemHiddenStyle = legend.itemHiddenStyle, itemDistance = horizontal ? pick(options.itemDistance, 20) : 0, ltr = !options.rtl, isSeries = !item.series, series = !isSeries && item.series.drawLegendSymbol ?
            item.series :
            item, seriesOptions = series.options, showCheckbox = (!!legend.createCheckboxForItem &&
            seriesOptions &&
            seriesOptions.showCheckbox), useHTML = options.useHTML, itemClassName = item.options.className;
        var label = legendItem.label, 
        // Full width minus text width
        itemExtraWidth = symbolWidth + symbolPadding +
            itemDistance + (showCheckbox ? 20 : 0);
        if (!label) { // Generate it once, later move it
            // Generate the group box, a group to hold the symbol and text. Text
            // is to be appended in Legend class.
            legendItem.group = renderer
                .g('legend-item')
                .addClass('highcharts-' + series.type + '-series ' +
                'highcharts-color-' + item.colorIndex +
                (itemClassName ? ' ' + itemClassName : '') +
                (isSeries ?
                    ' highcharts-series-' + item.index :
                    ''))
                .attr({ zIndex: 1 })
                .add(legend.scrollGroup);
            // Generate the list item text and add it to the group
            legendItem.label = label = renderer.text('', ltr ?
                symbolWidth + symbolPadding :
                -symbolPadding, legend.baseline || 0, useHTML);
            if (!chart.styledMode) {
                // Merge to prevent modifying original (#1021)
                label.css(merge(item.visible ?
                    itemStyle :
                    itemHiddenStyle));
            }
            label
                .attr({
                align: ltr ? 'left' : 'right',
                zIndex: 2
            })
                .add(legendItem.group);
            // Get the baseline for the first item - the font size is equal for
            // all
            if (!legend.baseline) {
                legend.fontMetrics = renderer.fontMetrics(label);
                legend.baseline =
                    legend.fontMetrics.f + 3 + legend.itemMarginTop;
                label.attr('y', legend.baseline);
                legend.symbolHeight =
                    pick(options.symbolHeight, legend.fontMetrics.f);
                if (options.squareSymbol) {
                    legend.symbolWidth = pick(options.symbolWidth, Math.max(legend.symbolHeight, 16));
                    itemExtraWidth = legend.symbolWidth + symbolPadding +
                        itemDistance + (showCheckbox ? 20 : 0);
                    if (ltr) {
                        label.attr('x', legend.symbolWidth + symbolPadding);
                    }
                }
            }
            // Draw the legend symbol inside the group box
            series.drawLegendSymbol(legend, item);
            if (legend.setItemEvents) {
                legend.setItemEvents(item, label, useHTML);
            }
        }
        // Add the HTML checkbox on top
        if (showCheckbox && !item.checkbox && legend.createCheckboxForItem) {
            legend.createCheckboxForItem(item);
        }
        // Colorize the items
        legend.colorizeItem(item, item.visible);
        // Take care of max width and text overflow (#6659)
        if (chart.styledMode || !itemStyle.width) {
            label.css({
                width: ((options.itemWidth ||
                    legend.widthOption ||
                    chart.spacingBox.width) - itemExtraWidth) + 'px'
            });
        }
        // Always update the text
        legend.setText(item);
        // Calculate the positions for the next line
        var bBox = label.getBBox();
        var fontMetricsH = (legend.fontMetrics && legend.fontMetrics.h) || 0;
        item.itemWidth = item.checkboxOffset =
            options.itemWidth ||
                legendItem.labelWidth ||
                bBox.width + itemExtraWidth;
        legend.maxItemWidth = Math.max(legend.maxItemWidth, item.itemWidth);
        legend.totalItemWidth += item.itemWidth;
        legend.itemHeight = item.itemHeight = Math.round(legendItem.labelHeight ||
            // Use bBox for multiline (#16398)
            (bBox.height > fontMetricsH * 1.5 ? bBox.height : fontMetricsH));
    };
    /**
     * Get the position of the item in the layout. We now know the
     * maxItemWidth from the previous loop.
     *
     * @private
     * @function Highcharts.Legend#layoutItem
     * @param {Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series} item
     */
    Legend.prototype.layoutItem = function (item) {
        var options = this.options, padding = this.padding, horizontal = options.layout === 'horizontal', itemHeight = item.itemHeight, itemMarginBottom = this.itemMarginBottom, itemMarginTop = this.itemMarginTop, itemDistance = horizontal ? pick(options.itemDistance, 20) : 0, maxLegendWidth = this.maxLegendWidth, itemWidth = (options.alignColumns &&
            this.totalItemWidth > maxLegendWidth) ?
            this.maxItemWidth :
            item.itemWidth, legendItem = item.legendItem || {};
        // If the item exceeds the width, start a new line
        if (horizontal &&
            this.itemX - padding + itemWidth > maxLegendWidth) {
            this.itemX = padding;
            if (this.lastLineHeight) { // Not for the first line (#10167)
                this.itemY += (itemMarginTop +
                    this.lastLineHeight +
                    itemMarginBottom);
            }
            this.lastLineHeight = 0; // Reset for next line (#915, #3976)
        }
        // Set the edge positions
        this.lastItemY = itemMarginTop + this.itemY + itemMarginBottom;
        this.lastLineHeight = Math.max(// #915
        itemHeight, this.lastLineHeight);
        // Cache the position of the newly generated or reordered items
        legendItem.x = this.itemX;
        legendItem.y = this.itemY;
        // Advance
        if (horizontal) {
            this.itemX += itemWidth;
        }
        else {
            this.itemY +=
                itemMarginTop + itemHeight + itemMarginBottom;
            this.lastLineHeight = itemHeight;
        }
        // The width of the widest item
        this.offsetWidth = this.widthOption || Math.max((horizontal ? this.itemX - padding - (item.checkbox ?
            // Decrease by itemDistance only when no checkbox #4853
            0 :
            itemDistance) : itemWidth) + padding, this.offsetWidth);
    };
    /**
     * Get all items, which is one item per series for most series and one
     * item per point for pie series and its derivatives. Fires the event
     * `afterGetAllItems`.
     *
     * @private
     * @function Highcharts.Legend#getAllItems
     * @return {Array<(Highcharts.BubbleLegendItem|Highcharts.Point|Highcharts.Series)>}
     * The current items in the legend.
     * @emits Highcharts.Legend#event:afterGetAllItems
     */
    Legend.prototype.getAllItems = function () {
        var allItems = [];
        this.chart.series.forEach(function (series) {
            var seriesOptions = series && series.options;
            // Handle showInLegend. If the series is linked to another series,
            // defaults to false.
            if (series && pick(seriesOptions.showInLegend, !defined(seriesOptions.linkedTo) ? void 0 : false, true)) {
                // Use points or series for the legend item depending on
                // legendType
                allItems = allItems.concat((series.legendItem || {}).labels ||
                    (seriesOptions.legendType === 'point' ?
                        series.data :
                        series));
            }
        });
        fireEvent(this, 'afterGetAllItems', { allItems: allItems });
        return allItems;
    };
    /**
     * Get a short, three letter string reflecting the alignment and layout.
     *
     * @private
     * @function Highcharts.Legend#getAlignment
     * @return {string}
     * The alignment, empty string if floating
     */
    Legend.prototype.getAlignment = function () {
        var options = this.options;
        // Use the first letter of each alignment option in order to detect
        // the side. (#4189 - use charAt(x) notation instead of [x] for IE7)
        if (this.proximate) {
            return options.align.charAt(0) + 'tv';
        }
        return options.floating ? '' : (options.align.charAt(0) +
            options.verticalAlign.charAt(0) +
            options.layout.charAt(0));
    };
    /**
     * Adjust the chart margins by reserving space for the legend on only one
     * side of the chart. If the position is set to a corner, top or bottom is
     * reserved for horizontal legends and left or right for vertical ones.
     *
     * @private
     * @function Highcharts.Legend#adjustMargins
     * @param {Array<number>} margin
     * @param {Array<number>} spacing
     */
    Legend.prototype.adjustMargins = function (margin, spacing) {
        var chart = this.chart, options = this.options, alignment = this.getAlignment();
        if (alignment) {
            ([
                /(lth|ct|rth)/,
                /(rtv|rm|rbv)/,
                /(rbh|cb|lbh)/,
                /(lbv|lm|ltv)/
            ]).forEach(function (alignments, side) {
                if (alignments.test(alignment) && !defined(margin[side])) {
                    // Now we have detected on which side of the chart we should
                    // reserve space for the legend
                    chart[marginNames[side]] = Math.max(chart[marginNames[side]], (chart.legend[(side + 1) % 2 ? 'legendHeight' : 'legendWidth'] +
                        [1, -1, -1, 1][side] * options[(side % 2) ? 'x' : 'y'] +
                        pick(options.margin, 12) +
                        spacing[side] +
                        (chart.titleOffset[side] || 0)));
                }
            });
        }
    };
    /**
     * @private
     * @function Highcharts.Legend#proximatePositions
     */
    Legend.prototype.proximatePositions = function () {
        var chart = this.chart, boxes = [], alignLeft = this.options.align === 'left';
        this.allItems.forEach(function (item) {
            var lastPoint, height, useFirstPoint = alignLeft, target, top;
            if (item.yAxis) {
                if (item.xAxis.options.reversed) {
                    useFirstPoint = !useFirstPoint;
                }
                if (item.points) {
                    lastPoint = find(useFirstPoint ?
                        item.points :
                        item.points.slice(0).reverse(), function (item) {
                        return isNumber(item.plotY);
                    });
                }
                height = this.itemMarginTop +
                    item.legendItem.label.getBBox().height +
                    this.itemMarginBottom;
                top = item.yAxis.top - chart.plotTop;
                if (item.visible) {
                    target = lastPoint ?
                        lastPoint.plotY :
                        item.yAxis.height;
                    target += top - 0.3 * height;
                }
                else {
                    target = top + item.yAxis.height;
                }
                boxes.push({
                    target: target,
                    size: height,
                    item: item
                });
            }
        }, this);
        var legendItem;
        for (var _i = 0, _a = distribute(boxes, chart.plotHeight); _i < _a.length; _i++) {
            var box = _a[_i];
            legendItem = box.item.legendItem || {};
            if (isNumber(box.pos)) {
                legendItem.y = chart.plotTop - chart.spacing[0] + box.pos;
            }
        }
    };
    /**
     * Render the legend. This method can be called both before and after
     * `chart.render`. If called after, it will only rearrange items instead
     * of creating new ones. Called internally on initial render and after
     * redraws.
     *
     * @private
     * @function Highcharts.Legend#render
     */
    Legend.prototype.render = function () {
        var legend = this, chart = legend.chart, renderer = chart.renderer, options = legend.options, padding = legend.padding, 
        // Add each series or point
        allItems = legend.getAllItems();
        var display, legendWidth, legendHeight, legendGroup = legend.group, allowedWidth, box = legend.box;
        legend.itemX = padding;
        legend.itemY = legend.initialItemY;
        legend.offsetWidth = 0;
        legend.lastItemY = 0;
        legend.widthOption = relativeLength(options.width, chart.spacingBox.width - padding);
        // Compute how wide the legend is allowed to be
        allowedWidth = chart.spacingBox.width - 2 * padding - options.x;
        if (['rm', 'lm'].indexOf(legend.getAlignment().substring(0, 2)) > -1) {
            allowedWidth /= 2;
        }
        legend.maxLegendWidth = legend.widthOption || allowedWidth;
        if (!legendGroup) {
            /**
             * SVG group of the legend.
             *
             * @readonly
             * @name Highcharts.Legend#group
             * @type {Highcharts.SVGElement}
             */
            legend.group = legendGroup = renderer
                .g('legend')
                .addClass(options.className || '')
                .attr({ zIndex: 7 })
                .add();
            legend.contentGroup = renderer
                .g()
                .attr({ zIndex: 1 }) // Above background
                .add(legendGroup);
            legend.scrollGroup = renderer
                .g()
                .add(legend.contentGroup);
        }
        legend.renderTitle();
        // Sort by legendIndex
        stableSort(allItems, function (a, b) {
            return ((a.options && a.options.legendIndex) || 0) -
                ((b.options && b.options.legendIndex) || 0);
        });
        // Reversed legend
        if (options.reversed) {
            allItems.reverse();
        }
        /**
         * All items for the legend, which is an array of series for most series
         * and an array of points for pie series and its derivatives.
         *
         * @readonly
         * @name Highcharts.Legend#allItems
         * @type {Array<(Highcharts.Point|Highcharts.Series)>}
         */
        legend.allItems = allItems;
        legend.display = display = !!allItems.length;
        // Render the items. First we run a loop to set the text and properties
        // and read all the bounding boxes. The next loop computes the item
        // positions based on the bounding boxes.
        legend.lastLineHeight = 0;
        legend.maxItemWidth = 0;
        legend.totalItemWidth = 0;
        legend.itemHeight = 0;
        allItems.forEach(legend.renderItem, legend);
        allItems.forEach(legend.layoutItem, legend);
        // Get the box
        legendWidth = (legend.widthOption || legend.offsetWidth) + padding;
        legendHeight = legend.lastItemY + legend.lastLineHeight +
            legend.titleHeight;
        legendHeight = legend.handleOverflow(legendHeight);
        legendHeight += padding;
        // Draw the border and/or background
        if (!box) {
            /**
             * SVG element of the legend box.
             *
             * @readonly
             * @name Highcharts.Legend#box
             * @type {Highcharts.SVGElement}
             */
            legend.box = box = renderer.rect()
                .addClass('highcharts-legend-box')
                .attr({
                r: options.borderRadius
            })
                .add(legendGroup);
        }
        // Presentational
        if (!chart.styledMode) {
            box
                .attr({
                stroke: options.borderColor,
                'stroke-width': options.borderWidth || 0,
                fill: options.backgroundColor || 'none'
            })
                .shadow(options.shadow);
        }
        if (legendWidth > 0 && legendHeight > 0) {
            box[box.placed ? 'animate' : 'attr'](box.crisp.call({}, {
                x: 0,
                y: 0,
                width: legendWidth,
                height: legendHeight
            }, box.strokeWidth()));
        }
        // Hide the border if no items
        legendGroup[display ? 'show' : 'hide']();
        // Open for responsiveness
        if (chart.styledMode && legendGroup.getStyle('display') === 'none') {
            legendWidth = legendHeight = 0;
        }
        legend.legendWidth = legendWidth;
        legend.legendHeight = legendHeight;
        if (display) {
            legend.align();
        }
        if (!this.proximate) {
            this.positionItems();
        }
        fireEvent(this, 'afterRender');
    };
    /**
     * Align the legend to chart's box.
     *
     * @private
     * @function Highcharts.align
     * @param {Highcharts.BBoxObject} alignTo
     */
    Legend.prototype.align = function (alignTo) {
        if (alignTo === void 0) { alignTo = this.chart.spacingBox; }
        var chart = this.chart, options = this.options;
        // If aligning to the top and the layout is horizontal, adjust for
        // the title (#7428)
        var y = alignTo.y;
        if (/(lth|ct|rth)/.test(this.getAlignment()) &&
            chart.titleOffset[0] > 0) {
            y += chart.titleOffset[0];
        }
        else if (/(lbh|cb|rbh)/.test(this.getAlignment()) &&
            chart.titleOffset[2] > 0) {
            y -= chart.titleOffset[2];
        }
        if (y !== alignTo.y) {
            alignTo = merge(alignTo, { y: y });
        }
        if (!chart.hasRendered) {
            // Avoid animation when adjusting alignment for responsiveness and
            // colorAxis label layout
            this.group.placed = false;
        }
        this.group.align(merge(options, {
            width: this.legendWidth,
            height: this.legendHeight,
            verticalAlign: this.proximate ? 'top' : options.verticalAlign
        }), true, alignTo);
    };
    /**
     * Set up the overflow handling by adding navigation with up and down arrows
     * below the legend.
     *
     * @private
     * @function Highcharts.Legend#handleOverflow
     */
    Legend.prototype.handleOverflow = function (legendHeight) {
        var legend = this, chart = this.chart, renderer = chart.renderer, options = this.options, optionsY = options.y, alignTop = options.verticalAlign === 'top', padding = this.padding, maxHeight = options.maxHeight, navOptions = options.navigation, animation = pick(navOptions.animation, true), arrowSize = navOptions.arrowSize || 12, pages = this.pages, allItems = this.allItems, clipToHeight = function (height) {
            if (typeof height === 'number') {
                clipRect.attr({
                    height: height
                });
            }
            else if (clipRect) { // Reset (#5912)
                legend.clipRect = clipRect.destroy();
                legend.contentGroup.clip();
            }
            // Use HTML
            if (legend.contentGroup.div) {
                legend.contentGroup.div.style.clip = height ?
                    'rect(' + padding + 'px,9999px,' +
                        (padding + height) + 'px,0)' :
                    'auto';
            }
        }, addTracker = function (key) {
            legend[key] = renderer
                .circle(0, 0, arrowSize * 1.3)
                .translate(arrowSize / 2, arrowSize / 2)
                .add(nav);
            if (!chart.styledMode) {
                legend[key].attr('fill', 'rgba(0,0,0,0.0001)');
            }
            return legend[key];
        };
        var clipHeight, lastY, legendItem, spaceHeight = (chart.spacingBox.height +
            (alignTop ? -optionsY : optionsY) - padding), nav = this.nav, clipRect = this.clipRect;
        // Adjust the height
        if (options.layout === 'horizontal' &&
            options.verticalAlign !== 'middle' &&
            !options.floating) {
            spaceHeight /= 2;
        }
        if (maxHeight) {
            spaceHeight = Math.min(spaceHeight, maxHeight);
        }
        // Reset the legend height and adjust the clipping rectangle
        pages.length = 0;
        if (legendHeight &&
            spaceHeight > 0 &&
            legendHeight > spaceHeight &&
            navOptions.enabled !== false) {
            this.clipHeight = clipHeight =
                Math.max(spaceHeight - 20 - this.titleHeight - padding, 0);
            this.currentPage = pick(this.currentPage, 1);
            this.fullHeight = legendHeight;
            // Fill pages with Y positions so that the top of each a legend item
            // defines the scroll top for each page (#2098)
            allItems.forEach(function (item, i) {
                legendItem = item.legendItem || {};
                var y = legendItem.y || 0, h = Math.round(legendItem.label.getBBox().height);
                var len = pages.length;
                if (!len || (y - pages[len - 1] > clipHeight &&
                    (lastY || y) !== pages[len - 1])) {
                    pages.push(lastY || y);
                    len++;
                }
                // Keep track of which page each item is on
                legendItem.pageIx = len - 1;
                if (lastY) {
                    (allItems[i - 1].legendItem || {}).pageIx = len - 1;
                }
                // Add the last page if needed (#2617, #13683)
                if (
                // Check the last item
                i === allItems.length - 1 &&
                    // If adding next page is needed (#18768)
                    y + h - pages[len - 1] > clipHeight &&
                    y > pages[len - 1]) {
                    pages.push(y);
                    legendItem.pageIx = len;
                }
                if (y !== lastY) {
                    lastY = y;
                }
            });
            // Only apply clipping if needed. Clipping causes blurred legend in
            // PDF export (#1787)
            if (!clipRect) {
                clipRect = legend.clipRect =
                    renderer.clipRect(0, padding - 2, 9999, 0);
                legend.contentGroup.clip(clipRect);
            }
            clipToHeight(clipHeight);
            // Add navigation elements
            if (!nav) {
                this.nav = nav = renderer.g()
                    .attr({ zIndex: 1 })
                    .add(this.group);
                this.up = renderer
                    .symbol('triangle', 0, 0, arrowSize, arrowSize)
                    .add(nav);
                addTracker('upTracker')
                    .on('click', function () {
                    legend.scroll(-1, animation);
                });
                this.pager = renderer.text('', 15, 10)
                    .addClass('highcharts-legend-navigation');
                if (!chart.styledMode && navOptions.style) {
                    this.pager.css(navOptions.style);
                }
                this.pager.add(nav);
                this.down = renderer
                    .symbol('triangle-down', 0, 0, arrowSize, arrowSize)
                    .add(nav);
                addTracker('downTracker')
                    .on('click', function () {
                    legend.scroll(1, animation);
                });
            }
            // Set initial position
            legend.scroll(0);
            legendHeight = spaceHeight;
            // Reset
        }
        else if (nav) {
            clipToHeight();
            this.nav = nav.destroy(); // #6322
            this.scrollGroup.attr({
                translateY: 1
            });
            this.clipHeight = 0; // #1379
        }
        return legendHeight;
    };
    /**
     * Scroll the legend by a number of pages.
     *
     * @private
     * @function Highcharts.Legend#scroll
     *
     * @param {number} scrollBy
     *        The number of pages to scroll.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     *        Whether and how to apply animation.
     *
     */
    Legend.prototype.scroll = function (scrollBy, animation) {
        var _this = this;
        var chart = this.chart, pages = this.pages, pageCount = pages.length, clipHeight = this.clipHeight, navOptions = this.options.navigation, pager = this.pager, padding = this.padding;
        var currentPage = this.currentPage + scrollBy;
        // When resizing while looking at the last page
        if (currentPage > pageCount) {
            currentPage = pageCount;
        }
        if (currentPage > 0) {
            if (typeof animation !== 'undefined') {
                setAnimation(animation, chart);
            }
            this.nav.attr({
                translateX: padding,
                translateY: clipHeight + this.padding + 7 + this.titleHeight,
                visibility: 'inherit'
            });
            [this.up, this.upTracker].forEach(function (elem) {
                elem.attr({
                    'class': currentPage === 1 ?
                        'highcharts-legend-nav-inactive' :
                        'highcharts-legend-nav-active'
                });
            });
            pager.attr({
                text: currentPage + '/' + pageCount
            });
            [this.down, this.downTracker].forEach(function (elem) {
                elem.attr({
                    // Adjust to text width
                    x: 18 + this.pager.getBBox().width,
                    'class': currentPage === pageCount ?
                        'highcharts-legend-nav-inactive' :
                        'highcharts-legend-nav-active'
                });
            }, this);
            if (!chart.styledMode) {
                this.up
                    .attr({
                    fill: currentPage === 1 ?
                        navOptions.inactiveColor :
                        navOptions.activeColor
                });
                this.upTracker
                    .css({
                    cursor: currentPage === 1 ? 'default' : 'pointer'
                });
                this.down
                    .attr({
                    fill: currentPage === pageCount ?
                        navOptions.inactiveColor :
                        navOptions.activeColor
                });
                this.downTracker
                    .css({
                    cursor: currentPage === pageCount ?
                        'default' :
                        'pointer'
                });
            }
            this.scrollOffset = -pages[currentPage - 1] + this.initialItemY;
            this.scrollGroup.animate({
                translateY: this.scrollOffset
            });
            this.currentPage = currentPage;
            this.positionCheckboxes();
            // Fire event after scroll animation is complete
            var animOptions = animObject(pick(animation, chart.renderer.globalAnimation, true));
            syncTimeout(function () {
                fireEvent(_this, 'afterScroll', { currentPage: currentPage });
            }, animOptions.duration);
        }
    };
    /**
     * @private
     * @function Highcharts.Legend#setItemEvents
     * @param {Highcharts.BubbleLegendItem|Point|Highcharts.Series} item
     * @param {Highcharts.SVGElement} legendLabel
     * @param {boolean} [useHTML=false]
     * @emits Highcharts.Legend#event:itemClick
     */
    Legend.prototype.setItemEvents = function (item, legendLabel, useHTML) {
        var legend = this, legendItem = item.legendItem || {}, boxWrapper = legend.chart.renderer.boxWrapper, isPoint = item instanceof Point, isSeries = item instanceof Series, activeClass = 'highcharts-legend-' +
            (isPoint ? 'point' : 'series') + '-active', styledMode = legend.chart.styledMode, 
        // When `useHTML`, the symbol is rendered in other group, so
        // we need to apply events listeners to both places
        legendElements = useHTML ?
            [legendLabel, legendItem.symbol] :
            [legendItem.group];
        var setOtherItemsState = function (state) {
            legend.allItems.forEach(function (otherItem) {
                if (item !== otherItem) {
                    [otherItem]
                        .concat(otherItem.linkedSeries || [])
                        .forEach(function (otherItem) {
                        otherItem.setState(state, !isPoint);
                    });
                }
            });
        };
        // Set the events on the item group, or in case of useHTML, the item
        // itself (#1249)
        for (var _i = 0, legendElements_1 = legendElements; _i < legendElements_1.length; _i++) {
            var element = legendElements_1[_i];
            if (element) {
                element
                    .on('mouseover', function () {
                    if (item.visible) {
                        setOtherItemsState('inactive');
                    }
                    item.setState('hover');
                    // A CSS class to dim or hide other than the hovered
                    // series.
                    // Works only if hovered series is visible (#10071).
                    if (item.visible) {
                        boxWrapper.addClass(activeClass);
                    }
                    if (!styledMode) {
                        legendLabel.css(legend.options.itemHoverStyle);
                    }
                })
                    .on('mouseout', function () {
                    if (!legend.chart.styledMode) {
                        legendLabel.css(merge(item.visible ?
                            legend.itemStyle :
                            legend.itemHiddenStyle));
                    }
                    setOtherItemsState('');
                    // A CSS class to dim or hide other than the hovered
                    // series.
                    boxWrapper.removeClass(activeClass);
                    item.setState();
                })
                    .on('click', function (event) {
                    var defaultItemClick = function () {
                        if (item.setVisible) {
                            item.setVisible();
                        }
                        // Reset inactive state
                        setOtherItemsState(item.visible ? 'inactive' : '');
                    };
                    // A CSS class to dim or hide other than the hovered
                    // series. Event handling in iOS causes the activeClass
                    // to be added prior to click in some cases (#7418).
                    boxWrapper.removeClass(activeClass);
                    fireEvent(legend, 'itemClick', {
                        // Pass over the click/touch event. #4.
                        browserEvent: event,
                        legendItem: item
                    }, defaultItemClick);
                    // Deprecated logic
                    // Click the name or symbol
                    if (isPoint) {
                        item.firePointEvent('legendItemClick', {
                            browserEvent: event
                        });
                    }
                    else if (isSeries) {
                        fireEvent(item, 'legendItemClick', {
                            browserEvent: event
                        });
                    }
                });
            }
        }
    };
    /**
     * @private
     * @function Highcharts.Legend#createCheckboxForItem
     * @param {Highcharts.BubbleLegendItem|Point|Highcharts.Series} item
     * @emits Highcharts.Series#event:checkboxClick
     */
    Legend.prototype.createCheckboxForItem = function (item) {
        var legend = this;
        item.checkbox = createElement('input', {
            type: 'checkbox',
            className: 'highcharts-legend-checkbox',
            checked: item.selected,
            defaultChecked: item.selected // Required by IE7
        }, legend.options.itemCheckboxStyle, legend.chart.container);
        addEvent(item.checkbox, 'click', function (event) {
            var target = event.target;
            fireEvent(item.series || item, 'checkboxClick', {
                checked: target.checked,
                item: item
            }, function () {
                item.select();
            });
        });
    };
    return Legend;
}());
/* *
 *
 *  Class Namespace
 *
 * */
(function (Legend) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    function compose(ChartClass) {
        if (pushUnique(composed, 'Core.Legend')) {
            addEvent(ChartClass, 'beforeMargins', function () {
                /**
                 * The legend contains an interactive overview over chart items,
                 * usually individual series or points depending on the series
                 * type. The color axis and bubble legend are also rendered in
                 * the chart legend.
                 *
                 * @name Highcharts.Chart#legend
                 * @type {Highcharts.Legend}
                 */
                this.legend = new Legend(this, this.options.legend);
            });
        }
    }
    Legend.compose = compose;
})(Legend || (Legend = {}));
/* *
 *
 *  Default Export
 *
 * */
export default Legend;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * @interface Highcharts.LegendItemObject
 */ /**
* @name Highcharts.LegendItemObject#item
* @type {Highcharts.SVGElement|undefined}
*/ /**
* @name Highcharts.LegendItemObject#line
* @type {Highcharts.SVGElement|undefined}
*/ /**
* @name Highcharts.LegendItemObject#symbol
* @type {Highcharts.SVGElement|undefined}
*/
/**
 * Gets fired when the legend item is clicked. The default
 * action is to toggle the visibility of the series or point. This can be
 * prevented by returning `false` or calling `event.preventDefault()`.
 *
 * @callback Highcharts.LegendItemClickCallbackFunction
 *
 * @param {Highcharts.Legend} this
 *        The legend on which the event occurred.
 *
 * @param {Highcharts.LegendItemClickEventObject} event
 *        The event that occurred.
 */
/**
 * Information about the legend click event.
 *
 * @interface Highcharts.LegendItemClickEventObject
 */ /**
* Related browser event.
* @name Highcharts.LegendItemClickEventObject#browserEvent
* @type {Highcharts.PointerEvent}
*/ /**
* Prevent the default action of toggle the visibility of the series or point.
* @name Highcharts.LegendItemClickEventObject#preventDefault
* @type {Function}
* */ /**
* Related legend item, it can be series, point, color axis or data class from
* color axis.
* @name Highcharts.LegendItemClickEventObject#legendItem
* @type {Highcharts.Series|Highcharts.Point|Highcharts.LegendItemObject}
* */ /**
* Related legend.
* @name Highcharts.LegendItemClickEventObject#target
* @type {Highcharts.Legend}
*/ /**
* Event type.
* @name Highcharts.LegendItemClickEventObject#type
* @type {"itemClick"}
*/
/**
 * Gets fired when the legend item belonging to a point is clicked. The default
 * action is to toggle the visibility of the point. This can be prevented by
 * returning `false` or calling `event.preventDefault()`.
 *
 * **Note:** This option is deprecated in favor of
 * Highcharts.LegendItemClickCallbackFunction.
 *
 * @deprecated 11.4.4
 * @callback Highcharts.PointLegendItemClickCallbackFunction
 *
 * @param {Highcharts.Point} this
 *        The point on which the event occurred.
 *
 * @param {Highcharts.PointLegendItemClickEventObject} event
 *        The event that occurred.
 */
/**
 * Information about the legend click event.
 *
 * **Note:** This option is deprecated in favor of
 * Highcharts.LegendItemClickEventObject.
 *
 * @deprecated 11.4.4
 * @interface Highcharts.PointLegendItemClickEventObject
 */ /**
* Related browser event.
* @name Highcharts.PointLegendItemClickEventObject#browserEvent
* @type {Highcharts.PointerEvent}
*/ /**
* Prevent the default action of toggle the visibility of the point.
* @name Highcharts.PointLegendItemClickEventObject#preventDefault
* @type {Function}
*/ /**
* Related point.
* @name Highcharts.PointLegendItemClickEventObject#target
* @type {Highcharts.Point}
*/ /**
* Event type.
* @name Highcharts.PointLegendItemClickEventObject#type
* @type {"legendItemClick"}
*/
/**
 * Series color as used by the legend and some series types.
 * @name Highcharts.Series#color
 * @type {Highcharts.ColorType|undefined}
 */ /**
* Legend data for the series.
* @name Highcharts.Series#legendItem
* @type {Highcharts.LegendItemObject|undefined}
* @since 10.3.0
*/
/**
 * Gets fired when the legend item belonging to a series is clicked. The default
 * action is to toggle the visibility of the series. This can be prevented by
 * returning `false` or calling `event.preventDefault()`.
 *
 * **Note:** This option is deprecated in favor of
 * Highcharts.LegendItemClickCallbackFunction.
 *
 * @deprecated 11.4.4
 * @callback Highcharts.SeriesLegendItemClickCallbackFunction
 *
 * @param {Highcharts.Series} this
 *        The series where the event occurred.
 *
 * @param {Highcharts.SeriesLegendItemClickEventObject} event
 *        The event that occurred.
 */
/**
 * Information about the legend click event.
 *
 * **Note:** This option is deprecated in favor of
 * Highcharts.LegendItemClickEventObject.
 *
 * @deprecated 11.4.4
 * @interface Highcharts.SeriesLegendItemClickEventObject
 */ /**
* Related browser event.
* @name Highcharts.SeriesLegendItemClickEventObject#browserEvent
* @type {Highcharts.PointerEvent}
*/ /**
* Prevent the default action of toggle the visibility of the series.
* @name Highcharts.SeriesLegendItemClickEventObject#preventDefault
* @type {Function}
*/ /**
* Related series.
* @name Highcharts.SeriesLegendItemClickEventObject#target
* @type {Highcharts.Series}
*/ /**
* Event type.
* @name Highcharts.SeriesLegendItemClickEventObject#type
* @type {"legendItemClick"}
*/
(''); // Keeps doclets above in JS file
