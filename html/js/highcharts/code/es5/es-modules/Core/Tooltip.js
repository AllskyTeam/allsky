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
import A from './Animation/AnimationUtilities.js';
var animObject = A.animObject;
import F from './Templating.js';
var format = F.format;
import H from './Globals.js';
var composed = H.composed, dateFormats = H.dateFormats, doc = H.doc, isSafari = H.isSafari;
import R from './Renderer/RendererUtilities.js';
var distribute = R.distribute;
import RendererRegistry from './Renderer/RendererRegistry.js';
import U from './Utilities.js';
var addEvent = U.addEvent, clamp = U.clamp, css = U.css, discardElement = U.discardElement, extend = U.extend, fireEvent = U.fireEvent, isArray = U.isArray, isNumber = U.isNumber, isObject = U.isObject, isString = U.isString, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique, splat = U.splat, syncTimeout = U.syncTimeout;
/* *
 *
 *  Class
 *
 * */
/* eslint-disable no-invalid-this, valid-jsdoc */
/**
 * Tooltip of a chart.
 *
 * @class
 * @name Highcharts.Tooltip
 *
 * @param {Highcharts.Chart} chart
 * The chart instance.
 *
 * @param {Highcharts.TooltipOptions} options
 * Tooltip options.
 *
 * @param {Highcharts.Pointer} pointer
 * The pointer instance.
 */
var Tooltip = /** @class */ (function () {
    /* *
     *
     *  Constructors
     *
     * */
    function Tooltip(chart, options, pointer) {
        /* *
         *
         *  Properties
         *
         * */
        this.allowShared = true;
        this.crosshairs = [];
        this.distance = 0;
        this.isHidden = true;
        this.isSticky = false;
        this.options = {};
        this.outside = false;
        this.chart = chart;
        this.init(chart, options);
        this.pointer = pointer;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Build the body (lines) of the tooltip by iterating over the items and
     * returning one entry for each item, abstracting this functionality allows
     * to easily overwrite and extend it.
     *
     * @private
     * @function Highcharts.Tooltip#bodyFormatter
     */
    Tooltip.prototype.bodyFormatter = function (points) {
        return points.map(function (point) {
            var tooltipOptions = point.series.tooltipOptions, formatPrefix = point.formatPrefix || 'point';
            return (tooltipOptions[formatPrefix + 'Formatter'] ||
                point.tooltipFormatter).call(point, tooltipOptions[formatPrefix + 'Format'] || '');
        });
    };
    /**
     * Destroy the single tooltips in a split tooltip.
     * If the tooltip is active then it is not destroyed, unless forced to.
     *
     * @private
     * @function Highcharts.Tooltip#cleanSplit
     *
     * @param {boolean} [force]
     * Force destroy all tooltips.
     */
    Tooltip.prototype.cleanSplit = function (force) {
        this.chart.series.forEach(function (series) {
            var tt = series && series.tt;
            if (tt) {
                if (!tt.isActive || force) {
                    series.tt = tt.destroy();
                }
                else {
                    tt.isActive = false;
                }
            }
        });
    };
    /**
     * In case no user defined formatter is given, this will be used. Note that
     * the context here is an object holding point, series, x, y etc.
     *
     * @function Highcharts.Tooltip#defaultFormatter
     *
     * @param {Highcharts.Tooltip} tooltip
     *
     * @return {string|Array<string>}
     * Returns a string (single tooltip and shared)
     * or an array of strings (split tooltip)
     */
    Tooltip.prototype.defaultFormatter = function (tooltip) {
        var hoverPoints = this.points || splat(this);
        var s;
        // Build the header
        s = [tooltip.headerFooterFormatter(hoverPoints[0])];
        // Build the values
        s = s.concat(tooltip.bodyFormatter(hoverPoints));
        // Footer
        s.push(tooltip.headerFooterFormatter(hoverPoints[0], true));
        return s;
    };
    /**
     * Removes and destroys the tooltip and its elements.
     *
     * @function Highcharts.Tooltip#destroy
     */
    Tooltip.prototype.destroy = function () {
        // Destroy and clear local variables
        if (this.label) {
            this.label = this.label.destroy();
        }
        if (this.split) {
            this.cleanSplit(true);
            if (this.tt) {
                this.tt = this.tt.destroy();
            }
        }
        if (this.renderer) {
            this.renderer = this.renderer.destroy();
            discardElement(this.container);
        }
        U.clearTimeout(this.hideTimer);
    };
    /**
     * Extendable method to get the anchor position of the tooltip
     * from a point or set of points
     *
     * @private
     * @function Highcharts.Tooltip#getAnchor
     */
    Tooltip.prototype.getAnchor = function (points, mouseEvent) {
        var _a = this, chart = _a.chart, pointer = _a.pointer, inverted = chart.inverted, plotTop = chart.plotTop, plotLeft = chart.plotLeft;
        var ret;
        points = splat(points);
        // If reversedStacks are false the tooltip position should be taken from
        // the last point (#17948)
        if (points[0].series &&
            points[0].series.yAxis &&
            !points[0].series.yAxis.options.reversedStacks) {
            points = points.slice().reverse();
        }
        // When tooltip follows mouse, relate the position to the mouse
        if (this.followPointer && mouseEvent) {
            if (typeof mouseEvent.chartX === 'undefined') {
                mouseEvent = pointer.normalize(mouseEvent);
            }
            ret = [
                mouseEvent.chartX - plotLeft,
                mouseEvent.chartY - plotTop
            ];
            // Some series types use a specificly calculated tooltip position for
            // each point
        }
        else if (points[0].tooltipPos) {
            ret = points[0].tooltipPos;
            // Calculate the average position and adjust for axis positions
        }
        else {
            var chartX_1 = 0, chartY_1 = 0;
            points.forEach(function (point) {
                var pos = point.pos(true);
                if (pos) {
                    chartX_1 += pos[0];
                    chartY_1 += pos[1];
                }
            });
            chartX_1 /= points.length;
            chartY_1 /= points.length;
            // When shared, place the tooltip next to the mouse (#424)
            if (this.shared && points.length > 1 && mouseEvent) {
                if (inverted) {
                    chartX_1 = mouseEvent.chartX;
                }
                else {
                    chartY_1 = mouseEvent.chartY;
                }
            }
            // Use the average position for multiple points
            ret = [chartX_1 - plotLeft, chartY_1 - plotTop];
        }
        return ret.map(Math.round);
    };
    /**
     * Get the CSS class names for the tooltip's label. Styles the label
     * by `colorIndex` or user-defined CSS.
     *
     * @function Highcharts.Tooltip#getClassName
     *
     * @return {string}
     *         The class names.
     */
    Tooltip.prototype.getClassName = function (point, isSplit, isHeader) {
        var options = this.options, series = point.series, seriesOptions = series.options;
        return [
            options.className,
            'highcharts-label',
            isHeader && 'highcharts-tooltip-header',
            isSplit ? 'highcharts-tooltip-box' : 'highcharts-tooltip',
            !isHeader && 'highcharts-color-' + pick(point.colorIndex, series.colorIndex),
            (seriesOptions && seriesOptions.className)
        ].filter(isString).join(' ');
    };
    /**
     * Creates the Tooltip label element if it does not exist, then returns it.
     *
     * @function Highcharts.Tooltip#getLabel
     *
     * @return {Highcharts.SVGElement}
     * Tooltip label
     */
    Tooltip.prototype.getLabel = function (_a) {
        var _b = _a === void 0 ? { anchorX: 0, anchorY: 0 } : _a, anchorX = _b.anchorX, anchorY = _b.anchorY;
        var tooltip = this, styledMode = this.chart.styledMode, options = this.options, doSplit = this.split && this.allowShared;
        var container = this.container, renderer = this.chart.renderer;
        // If changing from a split tooltip to a non-split tooltip, we must
        // destroy it in order to get the SVG right. #13868.
        if (this.label) {
            var wasSplit = !this.label.hasClass('highcharts-label');
            if ((!doSplit && wasSplit) || (doSplit && !wasSplit)) {
                this.destroy();
            }
        }
        if (!this.label) {
            if (this.outside) {
                var chart = this.chart, chartStyle = chart.options.chart.style, Renderer = RendererRegistry.getRendererType();
                /**
                 * Reference to the tooltip's container, when
                 * [Highcharts.Tooltip#outside] is set to true, otherwise
                 * it's undefined.
                 *
                 * @name Highcharts.Tooltip#container
                 * @type {Highcharts.HTMLDOMElement|undefined}
                 */
                this.container = container = H.doc.createElement('div');
                container.className = ('highcharts-tooltip-container ' +
                    (chart.renderTo.className.match(/(highcharts[a-zA-Z0-9-]+)\s?/gm) || [].join(' ')));
                // We need to set pointerEvents = 'none' as otherwise it makes
                // the area under the tooltip non-hoverable even after the
                // tooltip disappears, #19035.
                css(container, {
                    position: 'absolute',
                    top: '1px',
                    pointerEvents: 'none',
                    zIndex: Math.max(this.options.style.zIndex || 0, (chartStyle && chartStyle.zIndex || 0) + 3)
                });
                /**
                 * Reference to the tooltip's renderer, when
                 * [Highcharts.Tooltip#outside] is set to true, otherwise
                 * it's undefined.
                 *
                 * @name Highcharts.Tooltip#renderer
                 * @type {Highcharts.SVGRenderer|undefined}
                 */
                this.renderer = renderer = new Renderer(container, 0, 0, chartStyle, void 0, void 0, renderer.styledMode);
            }
            // Create the label
            if (doSplit) {
                this.label = renderer.g('tooltip');
            }
            else {
                this.label = renderer
                    .label('', anchorX, anchorY, options.shape, void 0, void 0, options.useHTML, void 0, 'tooltip')
                    .attr({
                    padding: options.padding,
                    r: options.borderRadius
                });
                if (!styledMode) {
                    this.label
                        .attr({
                        fill: options.backgroundColor,
                        'stroke-width': options.borderWidth || 0
                    })
                        // #2301, #2657
                        .css(options.style)
                        .css({
                        pointerEvents: (options.style.pointerEvents ||
                            (this.shouldStickOnContact() ? 'auto' : 'none'))
                    });
                }
            }
            // Split tooltip use updateTooltipContainer to position the tooltip
            // container.
            if (tooltip.outside) {
                var label_1 = this.label;
                [label_1.xSetter, label_1.ySetter].forEach(function (setter, i) {
                    label_1[i ? 'ySetter' : 'xSetter'] = function (value) {
                        setter.call(label_1, tooltip.distance);
                        label_1[i ? 'y' : 'x'] = value;
                        if (container) {
                            container.style[i ? 'top' : 'left'] = "".concat(value, "px");
                        }
                    };
                });
            }
            this.label
                .attr({ zIndex: 8 })
                .shadow(options.shadow)
                .add();
        }
        if (container && !container.parentElement) {
            H.doc.body.appendChild(container);
        }
        return this.label;
    };
    /**
     * Get the total area available area to place the tooltip
     *
     * @private
     */
    Tooltip.prototype.getPlayingField = function () {
        var body = doc.body, documentElement = doc.documentElement, _a = this, chart = _a.chart, distance = _a.distance, outside = _a.outside;
        return {
            width: outside ?
                // Subtract distance to prevent scrollbars
                Math.max(body.scrollWidth, documentElement.scrollWidth, body.offsetWidth, documentElement.offsetWidth, documentElement.clientWidth) - (2 * distance) - 2 :
                chart.chartWidth,
            height: outside ?
                Math.max(body.scrollHeight, documentElement.scrollHeight, body.offsetHeight, documentElement.offsetHeight, documentElement.clientHeight) :
                chart.chartHeight
        };
    };
    /**
     * Place the tooltip in a chart without spilling over and not covering the
     * point itself.
     *
     * @function Highcharts.Tooltip#getPosition
     *
     * @param {number} boxWidth
     *        Width of the tooltip box.
     *
     * @param {number} boxHeight
     *        Height of the tooltip box.
     *
     * @param {Highcharts.Point} point
     *        Tooltip related point.
     *
     * @return {Highcharts.PositionObject}
     *         Recommended position of the tooltip.
     */
    Tooltip.prototype.getPosition = function (boxWidth, boxHeight, point) {
        var _a, _b;
        var _c = this, distance = _c.distance, chart = _c.chart, outside = _c.outside, pointer = _c.pointer, inverted = chart.inverted, plotLeft = chart.plotLeft, plotTop = chart.plotTop, polar = chart.polar, _d = point.plotX, plotX = _d === void 0 ? 0 : _d, _e = point.plotY, plotY = _e === void 0 ? 0 : _e, ret = {}, 
        // Don't use h if chart isn't inverted (#7242) ???
        h = (inverted && point.h) || 0, // #4117 ???
        _f = this.getPlayingField(), outerHeight = _f.height, outerWidth = _f.width, chartPosition = pointer.getChartPosition(), scaleX = function (val) { return (val * chartPosition.scaleX); }, scaleY = function (val) { return (val * chartPosition.scaleY); }, 
        // Build parameter arrays for firstDimension()/secondDimension()
        buildDimensionArray = function (dim) {
            var isX = dim === 'x';
            return [
                dim, // Dimension - x or y
                isX ? outerWidth : outerHeight,
                isX ? boxWidth : boxHeight
            ].concat(outside ? [
                // If we are using tooltip.outside, we need to scale the
                // position to match scaling of the container in case there
                // is a transform/zoom on the container. #11329
                isX ? scaleX(boxWidth) : scaleY(boxHeight),
                isX ? chartPosition.left - distance +
                    scaleX(plotX + plotLeft) :
                    chartPosition.top - distance +
                        scaleY(plotY + plotTop),
                0,
                isX ? outerWidth : outerHeight
            ] : [
                // Not outside, no scaling is needed
                isX ? boxWidth : boxHeight,
                isX ? plotX + plotLeft : plotY + plotTop,
                isX ? plotLeft : plotTop,
                isX ? plotLeft + chart.plotWidth :
                    plotTop + chart.plotHeight
            ]);
        };
        var first = buildDimensionArray('y'), second = buildDimensionArray('x'), swapped;
        // Handle negative points or reversed axis (#13780)
        var flipped = !!point.negative;
        if (!polar &&
            ((_b = (_a = chart.hoverSeries) === null || _a === void 0 ? void 0 : _a.yAxis) === null || _b === void 0 ? void 0 : _b.reversed)) {
            flipped = !flipped;
        }
        // The far side is right or bottom
        var preferFarSide = !this.followPointer &&
            pick(point.ttBelow, polar ? false : !inverted === flipped), // #4984
        /*
         * Handle the preferred dimension. When the preferred dimension is
         * tooltip on top or bottom of the point, it will look for space
         * there.
         *
         * @private
         */
        firstDimension = function (dim, outerSize, innerSize, scaledInnerSize, // #11329
        point, min, max) {
            var scaledDist = outside ?
                (dim === 'y' ? scaleY(distance) : scaleX(distance)) :
                distance, scaleDiff = (innerSize - scaledInnerSize) / 2, roomLeft = scaledInnerSize < point - distance, roomRight = point + distance + scaledInnerSize < outerSize, alignedLeft = point - scaledDist - innerSize + scaleDiff, alignedRight = point + scaledDist - scaleDiff;
            if (preferFarSide && roomRight) {
                ret[dim] = alignedRight;
            }
            else if (!preferFarSide && roomLeft) {
                ret[dim] = alignedLeft;
            }
            else if (roomLeft) {
                ret[dim] = Math.min(max - scaledInnerSize, alignedLeft - h < 0 ? alignedLeft : alignedLeft - h);
            }
            else if (roomRight) {
                ret[dim] = Math.max(min, alignedRight + h + innerSize > outerSize ?
                    alignedRight :
                    alignedRight + h);
            }
            else {
                return false;
            }
        }, 
        /*
         * Handle the secondary dimension. If the preferred dimension is
         * tooltip on top or bottom of the point, the second dimension is to
         * align the tooltip above the point, trying to align center but
         * allowing left or right align within the chart box.
         *
         * @private
         */
        secondDimension = function (dim, outerSize, innerSize, scaledInnerSize, // #11329
        point) {
            // Too close to the edge, return false and swap dimensions
            if (point < distance || point > outerSize - distance) {
                return false;
            }
            // Align left/top
            if (point < innerSize / 2) {
                ret[dim] = 1;
                // Align right/bottom
            }
            else if (point > outerSize - scaledInnerSize / 2) {
                ret[dim] = outerSize - scaledInnerSize - 2;
                // Align center
            }
            else {
                ret[dim] = point - innerSize / 2;
            }
        }, 
        /*
         * Swap the dimensions
         */
        swap = function (count) {
            var _a;
            _a = [second, first], first = _a[0], second = _a[1];
            swapped = count;
        }, run = function () {
            if (firstDimension.apply(0, first) !== false) {
                if (secondDimension.apply(0, second) === false &&
                    !swapped) {
                    swap(true);
                    run();
                }
            }
            else if (!swapped) {
                swap(true);
                run();
            }
            else {
                ret.x = ret.y = 0;
            }
        };
        // Under these conditions, prefer the tooltip on the side of the point
        if ((inverted && !polar) || this.len > 1) {
            swap();
        }
        run();
        return ret;
    };
    /**
     * Hides the tooltip with a fade out animation.
     *
     * @function Highcharts.Tooltip#hide
     *
     * @param {number} [delay]
     *        The fade out in milliseconds. If no value is provided the value
     *        of the tooltip.hideDelay option is used. A value of 0 disables
     *        the fade out animation.
     */
    Tooltip.prototype.hide = function (delay) {
        var tooltip = this;
        // Disallow duplicate timers (#1728, #1766)
        U.clearTimeout(this.hideTimer);
        delay = pick(delay, this.options.hideDelay);
        if (!this.isHidden) {
            this.hideTimer = syncTimeout(function () {
                var label = tooltip.getLabel();
                // If there is a delay, fade out with the default duration. If
                // the hideDelay is 0, we assume no animation is wanted, so we
                // pass 0 duration. #12994.
                tooltip.getLabel().animate({
                    opacity: 0
                }, {
                    duration: delay ? 150 : delay,
                    complete: function () {
                        // #3088, assuming we're only using this for tooltips
                        label.hide();
                        // Clear the container for outside tooltip (#18490)
                        if (tooltip.container) {
                            tooltip.container.remove();
                        }
                    }
                });
                tooltip.isHidden = true;
            }, delay);
        }
    };
    /**
     * Initialize tooltip.
     *
     * @private
     * @function Highcharts.Tooltip#init
     *
     * @param {Highcharts.Chart} chart
     *        The chart instance.
     *
     * @param {Highcharts.TooltipOptions} options
     *        Tooltip options.
     */
    Tooltip.prototype.init = function (chart, options) {
        /**
         * Chart of the tooltip.
         *
         * @readonly
         * @name Highcharts.Tooltip#chart
         * @type {Highcharts.Chart}
         */
        this.chart = chart;
        /**
         * Used tooltip options.
         *
         * @readonly
         * @name Highcharts.Tooltip#options
         * @type {Highcharts.TooltipOptions}
         */
        this.options = options;
        /**
         * List of crosshairs.
         *
         * @private
         * @readonly
         * @name Highcharts.Tooltip#crosshairs
         * @type {Array<null>}
         */
        this.crosshairs = [];
        /**
         * Tooltips are initially hidden.
         *
         * @private
         * @readonly
         * @name Highcharts.Tooltip#isHidden
         * @type {boolean}
         */
        this.isHidden = true;
        /**
         * True, if the tooltip is split into one label per series, with the
         * header close to the axis.
         *
         * @readonly
         * @name Highcharts.Tooltip#split
         * @type {boolean|undefined}
         */
        this.split = options.split && !chart.inverted && !chart.polar;
        /**
         * When the tooltip is shared, the entire plot area will capture mouse
         * movement or touch events.
         *
         * @readonly
         * @name Highcharts.Tooltip#shared
         * @type {boolean|undefined}
         */
        this.shared = options.shared || this.split;
        /**
         * Whether to allow the tooltip to render outside the chart's SVG
         * element box. By default (false), the tooltip is rendered within the
         * chart's SVG element, which results in the tooltip being aligned
         * inside the chart area.
         *
         * @readonly
         * @name Highcharts.Tooltip#outside
         * @type {boolean}
         *
         * @todo
         * Split tooltip does not support outside in the first iteration. Should
         * not be too complicated to implement.
         */
        this.outside = pick(options.outside, Boolean(chart.scrollablePixelsX || chart.scrollablePixelsY));
    };
    Tooltip.prototype.shouldStickOnContact = function (pointerEvent) {
        return !!(!this.followPointer &&
            this.options.stickOnContact &&
            (!pointerEvent || this.pointer.inClass(pointerEvent.target, 'highcharts-tooltip')));
    };
    /**
     * Moves the tooltip with a soft animation to a new position.
     *
     * @private
     * @function Highcharts.Tooltip#move
     *
     * @param {number} x
     *
     * @param {number} y
     *
     * @param {number} anchorX
     *
     * @param {number} anchorY
     */
    Tooltip.prototype.move = function (x, y, anchorX, anchorY) {
        var tooltip = this, animation = animObject(!tooltip.isHidden && tooltip.options.animation), skipAnchor = tooltip.followPointer || (tooltip.len || 0) > 1, attr = { x: x, y: y };
        if (!skipAnchor) {
            attr.anchorX = anchorX;
            attr.anchorY = anchorY;
        }
        animation.step = function () { return tooltip.drawTracker(); };
        tooltip.getLabel().animate(attr, animation);
    };
    /**
     * Refresh the tooltip's text and position.
     *
     * @function Highcharts.Tooltip#refresh
     *
     * @param {Highcharts.Point|Array<Highcharts.Point>} pointOrPoints
     *        Either a point or an array of points.
     *
     * @param {Highcharts.PointerEventObject} [mouseEvent]
     *        Mouse event, that is responsible for the refresh and should be
     *        used for the tooltip update.
     */
    Tooltip.prototype.refresh = function (pointOrPoints, mouseEvent) {
        var tooltip = this, _a = this, chart = _a.chart, options = _a.options, pointer = _a.pointer, shared = _a.shared, points = splat(pointOrPoints), point = points[0], formatString = options.format, formatter = options.formatter || tooltip.defaultFormatter, styledMode = chart.styledMode;
        var wasShared = tooltip.allowShared;
        if (!options.enabled || !point.series) { // #16820
            return;
        }
        U.clearTimeout(this.hideTimer);
        // A switch saying if this specific tooltip configuration allows shared
        // or split modes
        tooltip.allowShared = !(!isArray(pointOrPoints) &&
            pointOrPoints.series &&
            pointOrPoints.series.noSharedTooltip);
        wasShared = wasShared && !tooltip.allowShared;
        // Get the reference point coordinates (pie charts use tooltipPos)
        tooltip.followPointer = (!tooltip.split && point.series.tooltipOptions.followPointer);
        var anchor = tooltip.getAnchor(pointOrPoints, mouseEvent), x = anchor[0], y = anchor[1];
        // Shared tooltip, array is sent over
        if (shared && tooltip.allowShared) {
            pointer.applyInactiveState(points);
            // Now set hover state for the chosen ones:
            points.forEach(function (item) { return item.setState('hover'); });
            point.points = points;
        }
        this.len = points.length; // #6128
        var text = isString(formatString) ?
            format(formatString, point, chart) :
            formatter.call(point, tooltip);
        // Reset the preliminary circular references
        point.points = void 0;
        // Register the current series
        var currentSeries = point.series;
        this.distance = pick(currentSeries.tooltipOptions.distance, 16);
        // Update the inner HTML
        if (text === false) {
            this.hide();
        }
        else {
            // Update text
            if (tooltip.split && tooltip.allowShared) { // #13868
                this.renderSplit(text, points);
            }
            else {
                var checkX_1 = x;
                var checkY_1 = y;
                if (mouseEvent && pointer.isDirectTouch) {
                    checkX_1 = mouseEvent.chartX - chart.plotLeft;
                    checkY_1 = mouseEvent.chartY - chart.plotTop;
                }
                // #11493, #13095
                if (chart.polar ||
                    currentSeries.options.clip === false ||
                    points.some(function (p) {
                        return pointer.isDirectTouch || // ##17929
                            p.series.shouldShowTooltip(checkX_1, checkY_1);
                    })) {
                    var label = tooltip.getLabel(wasShared && tooltip.tt || {});
                    // Prevent the tooltip from flowing over the chart box
                    // (#6659)
                    if (!options.style.width || styledMode) {
                        label.css({
                            width: (this.outside ?
                                this.getPlayingField() :
                                chart.spacingBox).width + 'px'
                        });
                    }
                    label.attr({
                        // Add class before the label BBox calculation (#21035)
                        'class': tooltip.getClassName(point),
                        text: text && text.join ?
                            text.join('') :
                            text
                    });
                    // When the length of the label has increased, immediately
                    // update the x position to prevent tooltip from flowing
                    // outside the viewport during animation (#21371)
                    if (this.outside) {
                        label.attr({
                            x: clamp(label.x || 0, 0, this.getPlayingField().width -
                                (label.width || 0) -
                                1)
                        });
                    }
                    if (!styledMode) {
                        label.attr({
                            stroke: (options.borderColor ||
                                point.color ||
                                currentSeries.color ||
                                "#666666" /* Palette.neutralColor60 */)
                        });
                    }
                    tooltip.updatePosition({
                        plotX: x,
                        plotY: y,
                        negative: point.negative,
                        ttBelow: point.ttBelow,
                        h: anchor[2] || 0
                    });
                }
                else {
                    tooltip.hide();
                    return;
                }
            }
            // Show it
            if (tooltip.isHidden && tooltip.label) {
                tooltip.label.attr({
                    opacity: 1
                }).show();
            }
            tooltip.isHidden = false;
        }
        fireEvent(this, 'refresh');
    };
    /**
     * Render the split tooltip. Loops over each point's text and adds
     * a label next to the point, then uses the distribute function to
     * find best non-overlapping positions.
     *
     * @private
     * @function Highcharts.Tooltip#renderSplit
     *
     * @param {string|Array<(boolean|string)>} labels
     *
     * @param {Array<Highcharts.Point>} points
     */
    Tooltip.prototype.renderSplit = function (labels, points) {
        var _a;
        var tooltip = this;
        var chart = tooltip.chart, _b = tooltip.chart, chartWidth = _b.chartWidth, chartHeight = _b.chartHeight, plotHeight = _b.plotHeight, plotLeft = _b.plotLeft, plotTop = _b.plotTop, _c = _b.scrollablePixelsY, scrollablePixelsY = _c === void 0 ? 0 : _c, scrollablePixelsX = _b.scrollablePixelsX, styledMode = _b.styledMode, distance = tooltip.distance, options = tooltip.options, positioner = tooltip.options.positioner, pointer = tooltip.pointer;
        var _d = ((_a = chart.scrollablePlotArea) === null || _a === void 0 ? void 0 : _a.scrollingContainer) || {}, _e = _d.scrollLeft, scrollLeft = _e === void 0 ? 0 : _e, _f = _d.scrollTop, scrollTop = _f === void 0 ? 0 : _f;
        // The area which the tooltip should be limited to. Limit to scrollable
        // plot area if enabled, otherwise limit to the chart container. If
        // outside is true it should be the whole viewport
        var bounds = (tooltip.outside &&
            typeof scrollablePixelsX !== 'number') ?
            doc.documentElement.getBoundingClientRect() : {
            left: scrollLeft,
            right: scrollLeft + chartWidth,
            top: scrollTop,
            bottom: scrollTop + chartHeight
        };
        var tooltipLabel = tooltip.getLabel();
        var ren = this.renderer || chart.renderer;
        var headerTop = Boolean(chart.xAxis[0] && chart.xAxis[0].opposite);
        var _g = pointer.getChartPosition(), chartLeft = _g.left, chartTop = _g.top;
        var distributionBoxTop = plotTop + scrollTop;
        var headerHeight = 0;
        var adjustedPlotHeight = plotHeight - scrollablePixelsY;
        /**
         * Calculates the anchor position for the partial tooltip
         *
         * @private
         * @param {Highcharts.Point} point The point related to the tooltip
         * @return {Object} Returns an object with anchorX and anchorY
         */
        function getAnchor(point) {
            var isHeader = point.isHeader, _a = point.plotX, plotX = _a === void 0 ? 0 : _a, _b = point.plotY, plotY = _b === void 0 ? 0 : _b, series = point.series;
            var anchorX;
            var anchorY;
            if (isHeader) {
                // Set anchorX to plotX
                anchorX = Math.max(plotLeft + plotX, plotLeft);
                // Set anchorY to center of visible plot area.
                anchorY = plotTop + plotHeight / 2;
            }
            else {
                var xAxis = series.xAxis, yAxis = series.yAxis;
                // Set anchorX to plotX. Limit to within xAxis.
                anchorX = xAxis.pos + clamp(plotX, -distance, xAxis.len + distance);
                // Set anchorY, limit to the scrollable plot area
                if (series.shouldShowTooltip(0, yAxis.pos - plotTop + plotY, {
                    ignoreX: true
                })) {
                    anchorY = yAxis.pos + plotY;
                }
            }
            // Limit values to plot area
            anchorX = clamp(anchorX, bounds.left - distance, bounds.right + distance);
            return { anchorX: anchorX, anchorY: anchorY };
        }
        /**
         * Calculates the position of the partial tooltip
         *
         * @private
         * @param {number} anchorX
         * The partial tooltip anchor x position
         *
         * @param {number} anchorY
         * The partial tooltip anchor y position
         *
         * @param {boolean|undefined} isHeader
         * Whether the partial tooltip is a header
         *
         * @param {number} boxWidth
         * Width of the partial tooltip
         *
         * @return {Highcharts.PositionObject}
         * Returns the partial tooltip x and y position
         */
        function defaultPositioner(anchorX, anchorY, isHeader, boxWidth, alignedLeft) {
            if (alignedLeft === void 0) { alignedLeft = true; }
            var y;
            var x;
            if (isHeader) {
                y = headerTop ? 0 : adjustedPlotHeight;
                x = clamp(anchorX - (boxWidth / 2), bounds.left, bounds.right - boxWidth - (tooltip.outside ? chartLeft : 0));
            }
            else {
                y = anchorY - distributionBoxTop;
                x = alignedLeft ?
                    anchorX - boxWidth - distance :
                    anchorX + distance;
                x = clamp(x, alignedLeft ? x : bounds.left, bounds.right);
            }
            // NOTE: y is relative to distributionBoxTop
            return { x: x, y: y };
        }
        /**
         * Updates the attributes and styling of the partial tooltip. Creates a
         * new partial tooltip if it does not exists.
         *
         * @private
         * @param {Highcharts.SVGElement|undefined} partialTooltip
         *  The partial tooltip to update
         * @param {Highcharts.Point} point
         *  The point related to the partial tooltip
         * @param {boolean|string} str The text for the partial tooltip
         * @return {Highcharts.SVGElement} Returns the updated partial tooltip
         */
        function updatePartialTooltip(partialTooltip, point, str) {
            var _a;
            var tt = partialTooltip;
            var isHeader = point.isHeader, series = point.series;
            if (!tt) {
                var attribs = {
                    padding: options.padding,
                    r: options.borderRadius
                };
                if (!styledMode) {
                    attribs.fill = options.backgroundColor;
                    attribs['stroke-width'] = (_a = options.borderWidth) !== null && _a !== void 0 ? _a : 1;
                }
                tt = ren
                    .label('', 0, 0, (options[isHeader ? 'headerShape' : 'shape']), void 0, void 0, options.useHTML)
                    .addClass(tooltip.getClassName(point, true, isHeader))
                    .attr(attribs)
                    .add(tooltipLabel);
            }
            tt.isActive = true;
            tt.attr({
                text: str
            });
            if (!styledMode) {
                tt.css(options.style)
                    .attr({
                    stroke: (options.borderColor ||
                        point.color ||
                        series.color ||
                        "#333333" /* Palette.neutralColor80 */)
                });
            }
            return tt;
        }
        // Graceful degradation for legacy formatters
        if (isString(labels)) {
            labels = [false, labels];
        }
        // Create the individual labels for header and points, ignore footer
        var boxes = labels.slice(0, points.length + 1).reduce(function (boxes, str, i) {
            if (str !== false && str !== '') {
                var point = (points[i - 1] ||
                    {
                        // Item 0 is the header. Instead of this, we could also
                        // use the crosshair label
                        isHeader: true,
                        plotX: points[0].plotX,
                        plotY: plotHeight,
                        series: {}
                    });
                var isHeader = point.isHeader;
                // Store the tooltip label reference on the series
                var owner = isHeader ? tooltip : point.series;
                var tt = owner.tt = updatePartialTooltip(owner.tt, point, str.toString());
                // Get X position now, so we can move all to the other side in
                // case of overflow
                var bBox = tt.getBBox();
                var boxWidth = bBox.width + tt.strokeWidth();
                if (isHeader) {
                    headerHeight = bBox.height;
                    adjustedPlotHeight += headerHeight;
                    if (headerTop) {
                        distributionBoxTop -= headerHeight;
                    }
                }
                var _a = getAnchor(point), anchorX = _a.anchorX, anchorY = _a.anchorY;
                if (typeof anchorY === 'number') {
                    var size = bBox.height + 1;
                    var boxPosition = (positioner ?
                        positioner.call(tooltip, boxWidth, size, point) :
                        defaultPositioner(anchorX, anchorY, isHeader, boxWidth));
                    boxes.push({
                        // 0-align to the top, 1-align to the bottom
                        align: positioner ? 0 : void 0,
                        anchorX: anchorX,
                        anchorY: anchorY,
                        boxWidth: boxWidth,
                        point: point,
                        rank: pick(boxPosition.rank, isHeader ? 1 : 0),
                        size: size,
                        target: boxPosition.y,
                        tt: tt,
                        x: boxPosition.x
                    });
                }
                else {
                    // Hide tooltips which anchorY is outside the visible plot
                    // area
                    tt.isActive = false;
                }
            }
            return boxes;
        }, []);
        // Realign the tooltips towards the right if there is not enough space
        // to the left and there is space to the right
        if (!positioner && boxes.some(function (box) {
            // Always realign if the beginning of a label is outside bounds
            var outside = tooltip.outside;
            var boxStart = (outside ? chartLeft : 0) + box.anchorX;
            if (boxStart < bounds.left &&
                boxStart + box.boxWidth < bounds.right) {
                return true;
            }
            // Otherwise, check if there is more space available to the right
            return boxStart < (chartLeft - bounds.left) + box.boxWidth &&
                bounds.right - boxStart > boxStart;
        })) {
            boxes = boxes.map(function (box) {
                var _a = defaultPositioner(box.anchorX, box.anchorY, box.point.isHeader, box.boxWidth, false), x = _a.x, y = _a.y;
                return extend(box, {
                    target: y,
                    x: x
                });
            });
        }
        // Clean previous run (for missing points)
        tooltip.cleanSplit();
        // Distribute and put in place
        distribute(boxes, adjustedPlotHeight);
        var boxExtremes = {
            left: chartLeft,
            right: chartLeft
        };
        // Get the extremes from series tooltips
        boxes.forEach(function (box) {
            var x = box.x, boxWidth = box.boxWidth, isHeader = box.isHeader;
            if (!isHeader) {
                if (tooltip.outside && chartLeft + x < boxExtremes.left) {
                    boxExtremes.left = chartLeft + x;
                }
                if (!isHeader &&
                    tooltip.outside &&
                    boxExtremes.left + boxWidth > boxExtremes.right) {
                    boxExtremes.right = chartLeft + x;
                }
            }
        });
        boxes.forEach(function (box) {
            var x = box.x, anchorX = box.anchorX, anchorY = box.anchorY, pos = box.pos, isHeader = box.point.isHeader;
            var attributes = {
                visibility: typeof pos === 'undefined' ? 'hidden' : 'inherit',
                x: x,
                /* NOTE: y should equal pos to be consistent with !split
                 * tooltip, but is currently relative to plotTop. Is left as is
                 * to avoid breaking change. Remove distributionBoxTop to make
                 * it consistent.
                 */
                y: (pos || 0) + distributionBoxTop,
                anchorX: anchorX,
                anchorY: anchorY
            };
            // Handle left-aligned tooltips overflowing the chart area
            if (tooltip.outside && x < anchorX) {
                var offset = chartLeft - boxExtremes.left;
                // Skip this if there is no overflow
                if (offset > 0) {
                    if (!isHeader) {
                        attributes.x = x + offset;
                        attributes.anchorX = anchorX + offset;
                    }
                    if (isHeader) {
                        attributes.x = (boxExtremes.right - boxExtremes.left) / 2;
                        attributes.anchorX = anchorX + offset;
                    }
                }
            }
            // Put the label in place
            box.tt.attr(attributes);
        });
        /* If we have a separate tooltip container, then update the necessary
         * container properties.
         * Test that tooltip has its own container and renderer before executing
         * the operation.
         */
        var container = tooltip.container, outside = tooltip.outside, renderer = tooltip.renderer;
        if (outside && container && renderer) {
            // Set container size to fit the bounds
            var _h = tooltipLabel.getBBox(), width = _h.width, height = _h.height, x = _h.x, y = _h.y;
            renderer.setSize(width + x, height + y, false);
            // Position the tooltip container to the chart container
            container.style.left = boxExtremes.left + 'px';
            container.style.top = chartTop + 'px';
        }
        // Workaround for #18927, artefacts left by the shadows of split
        // tooltips in Safari v16 (2023). Check again with later versions if we
        // can remove this.
        if (isSafari) {
            tooltipLabel.attr({
                // Force a redraw of the whole group by chaining the opacity
                // slightly
                opacity: tooltipLabel.opacity === 1 ? 0.999 : 1
            });
        }
    };
    /**
     * If the `stickOnContact` option is active, this will add a tracker shape.
     *
     * @private
     * @function Highcharts.Tooltip#drawTracker
     */
    Tooltip.prototype.drawTracker = function () {
        var tooltip = this;
        if (!this.shouldStickOnContact()) {
            if (tooltip.tracker) {
                tooltip.tracker = tooltip.tracker.destroy();
            }
            return;
        }
        var chart = tooltip.chart;
        var label = tooltip.label;
        var points = tooltip.shared ? chart.hoverPoints : chart.hoverPoint;
        if (!label || !points) {
            return;
        }
        var box = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        // Combine anchor and tooltip
        var anchorPos = this.getAnchor(points);
        var labelBBox = label.getBBox();
        anchorPos[0] += chart.plotLeft - (label.translateX || 0);
        anchorPos[1] += chart.plotTop - (label.translateY || 0);
        // When the mouse pointer is between the anchor point and the label,
        // the label should stick.
        box.x = Math.min(0, anchorPos[0]);
        box.y = Math.min(0, anchorPos[1]);
        box.width = (anchorPos[0] < 0 ?
            Math.max(Math.abs(anchorPos[0]), labelBBox.width - anchorPos[0]) :
            Math.max(Math.abs(anchorPos[0]), labelBBox.width));
        box.height = (anchorPos[1] < 0 ?
            Math.max(Math.abs(anchorPos[1]), labelBBox.height - Math.abs(anchorPos[1])) :
            Math.max(Math.abs(anchorPos[1]), labelBBox.height));
        if (tooltip.tracker) {
            tooltip.tracker.attr(box);
        }
        else {
            tooltip.tracker = label.renderer
                .rect(box)
                .addClass('highcharts-tracker')
                .add(label);
            if (!chart.styledMode) {
                tooltip.tracker.attr({
                    fill: 'rgba(0,0,0,0)'
                });
            }
        }
    };
    /**
     * @private
     */
    Tooltip.prototype.styledModeFormat = function (formatString) {
        return formatString
            .replace('style="font-size: 0.8em"', 'class="highcharts-header"')
            .replace(/style="color:{(point|series)\.color}"/g, 'class="highcharts-color-{$1.colorIndex} ' +
            '{series.options.className} ' +
            '{point.options.className}"');
    };
    /**
     * Format the footer/header of the tooltip
     * #3397: abstraction to enable formatting of footer and header
     *
     * @private
     * @function Highcharts.Tooltip#headerFooterFormatter
     */
    Tooltip.prototype.headerFooterFormatter = function (point, isFooter) {
        var series = point.series, tooltipOptions = series.tooltipOptions, xAxis = series.xAxis, dateTime = xAxis && xAxis.dateTime, e = {
            isFooter: isFooter,
            point: point
        };
        var xDateFormat = tooltipOptions.xDateFormat || '', formatString = tooltipOptions[isFooter ? 'footerFormat' : 'headerFormat'];
        fireEvent(this, 'headerFormatter', e, function (e) {
            // Guess the best date format based on the closest point distance
            // (#568, #3418)
            if (dateTime && !xDateFormat && isNumber(point.key)) {
                xDateFormat = dateTime.getXDateFormat(point.key, tooltipOptions.dateTimeLabelFormats);
            }
            // Insert the footer date format if any
            if (dateTime && xDateFormat) {
                if (isObject(xDateFormat)) {
                    var format_1 = xDateFormat;
                    dateFormats[0] = function (timestamp) {
                        return series.chart.time.dateFormat(format_1, timestamp);
                    };
                    xDateFormat = '%0';
                }
                (point.tooltipDateKeys || ['key']).forEach(function (key) {
                    formatString = formatString.replace(new RegExp('point\\.' + key + '([ \\)}])', ''), "(point.".concat(key, ":").concat(xDateFormat, ")$1"));
                });
            }
            // Replace default header style with class name
            if (series.chart.styledMode) {
                formatString = this.styledModeFormat(formatString);
            }
            e.text = format(formatString, point, this.chart);
        });
        return e.text || '';
    };
    /**
     * Updates the tooltip with the provided tooltip options.
     *
     * @function Highcharts.Tooltip#update
     *
     * @param {Highcharts.TooltipOptions} options
     *        The tooltip options to update.
     */
    Tooltip.prototype.update = function (options) {
        this.destroy();
        this.init(this.chart, merge(true, this.options, options));
    };
    /**
     * Find the new position and perform the move
     *
     * @private
     * @function Highcharts.Tooltip#updatePosition
     *
     * @param {Highcharts.Point} point
     */
    Tooltip.prototype.updatePosition = function (point) {
        var _a = this, chart = _a.chart, container = _a.container, distance = _a.distance, options = _a.options, pointer = _a.pointer, renderer = _a.renderer, _b = this.getLabel(), _c = _b.height, height = _c === void 0 ? 0 : _c, _d = _b.width, width = _d === void 0 ? 0 : _d, 
        // Needed for outside: true (#11688)
        _e = pointer.getChartPosition(), left = _e.left, top = _e.top, scaleX = _e.scaleX, scaleY = _e.scaleY, pos = (options.positioner || this.getPosition).call(this, width, height, point), doc = H.doc;
        var anchorX = (point.plotX || 0) + chart.plotLeft, anchorY = (point.plotY || 0) + chart.plotTop, pad;
        // Set the renderer size dynamically to prevent document size to change.
        // Renderer only exists when tooltip is outside.
        if (renderer && container) {
            // Corrects positions, occurs with tooltip positioner (#16944)
            if (options.positioner) {
                pos.x += left - distance;
                pos.y += top - distance;
            }
            // Pad it by the border width and distance. Add 2 to make room for
            // the default shadow (#19314).
            pad = (options.borderWidth || 0) + 2 * distance + 2;
            renderer.setSize(
            // Clamp width to keep tooltip in viewport (#21698)
            // and subtract one since tooltip container has 'left: 1px;'
            clamp(width + pad, 0, doc.documentElement.clientWidth) - 1, height + pad, false);
            // Anchor and tooltip container need scaling if chart container has
            // scale transform/css zoom. #11329.
            if (scaleX !== 1 || scaleY !== 1) {
                css(container, {
                    transform: "scale(".concat(scaleX, ", ").concat(scaleY, ")")
                });
                anchorX *= scaleX;
                anchorY *= scaleY;
            }
            anchorX += left - pos.x;
            anchorY += top - pos.y;
        }
        // Do the move
        this.move(Math.round(pos.x), Math.round(pos.y || 0), // Can be undefined (#3977)
        anchorX, anchorY);
    };
    return Tooltip;
}());
/* *
 *
 *  Class namespace
 *
 * */
(function (Tooltip) {
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
    function compose(PointerClass) {
        if (pushUnique(composed, 'Core.Tooltip')) {
            addEvent(PointerClass, 'afterInit', function () {
                var chart = this.chart;
                if (chart.options.tooltip) {
                    /**
                     * Tooltip object for points of series.
                     *
                     * @name Highcharts.Chart#tooltip
                     * @type {Highcharts.Tooltip}
                     */
                    chart.tooltip = new Tooltip(chart, chart.options.tooltip, this);
                }
            });
        }
    }
    Tooltip.compose = compose;
})(Tooltip || (Tooltip = {}));
/* *
 *
 *  Default export
 *
 * */
export default Tooltip;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Callback function to format the text of the tooltip from scratch.
 *
 * In case of single or shared tooltips, a string should be returned. In case
 * of split tooltips, it should return an array where the first item is the
 * header, and subsequent items are mapped to the points. Return `false` to
 * disable tooltip for a specific point on series.
 *
 * @callback Highcharts.TooltipFormatterCallbackFunction
 *
 * @param {Highcharts.Point} this
 * The formatter's context is the hovered `Point` instance. In case of shared or
 * split tooltips, all points are available in `this.points`.
 *
 * @param {Highcharts.Tooltip} tooltip
 * The tooltip instance
 *
 * @return {false|string|Array<(string|null|undefined)>|null|undefined}
 * Formatted text or false
 */
/**
 * A callback function to place the tooltip in a specific position.
 *
 * @callback Highcharts.TooltipPositionerCallbackFunction
 *
 * @param {Highcharts.Tooltip} this
 * Tooltip context of the callback.
 *
 * @param {number} labelWidth
 * Width of the tooltip.
 *
 * @param {number} labelHeight
 * Height of the tooltip.
 *
 * @param {Highcharts.TooltipPositionerPointObject} point
 * Point information for positioning a tooltip.
 *
 * @return {Highcharts.PositionObject}
 * New position for the tooltip.
 */
/**
 * Point information for positioning a tooltip.
 *
 * @interface Highcharts.TooltipPositionerPointObject
 * @extends Highcharts.Point
 */ /**
* If `tooltip.split` option is enabled and positioner is called for each of the
* boxes separately, this property indicates the call on the xAxis header, which
* is not a point itself.
* @name Highcharts.TooltipPositionerPointObject#isHeader
* @type {boolean}
*/ /**
* The reference point relative to the plot area. Add chart.plotLeft to get the
* full coordinates.
* @name Highcharts.TooltipPositionerPointObject#plotX
* @type {number}
*/ /**
* The reference point relative to the plot area. Add chart.plotTop to get the
* full coordinates.
* @name Highcharts.TooltipPositionerPointObject#plotY
* @type {number}
*/
/**
 * @typedef {"callout"|"circle"|"rect"} Highcharts.TooltipShapeValue
 */
''; // Keeps doclets above in JS file
