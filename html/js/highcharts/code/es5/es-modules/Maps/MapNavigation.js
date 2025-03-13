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
import D from '../Core/Defaults.js';
var setOptions = D.setOptions;
import H from '../Core/Globals.js';
var composed = H.composed;
import MapNavigationDefaults from './MapNavigationDefaults.js';
import MapPointer from './MapPointer.js';
import MapSymbols from './MapSymbols.js';
import U from '../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, merge = U.merge, objectEach = U.objectEach, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function stopEvent(e) {
    var _a, _b;
    if (e) {
        (_a = e.preventDefault) === null || _a === void 0 ? void 0 : _a.call(e);
        (_b = e.stopPropagation) === null || _b === void 0 ? void 0 : _b.call(e);
        e.cancelBubble = true;
    }
}
/* *
 *
 *  Class
 *
 * */
/**
 * The MapNavigation handles buttons for navigation in addition to mousewheel
 * and doubleclick handlers for chart zooming.
 *
 * @private
 * @class
 * @name MapNavigation
 *
 * @param {Highcharts.Chart} chart
 *        The Chart instance.
 */
var MapNavigation = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function MapNavigation(chart) {
        this.chart = chart;
        this.navButtons = [];
    }
    /* *
     *
     *  Static Functions
     *
     * */
    MapNavigation.compose = function (MapChartClass, PointerClass, SVGRendererClass) {
        MapPointer.compose(PointerClass);
        MapSymbols.compose(SVGRendererClass);
        if (pushUnique(composed, 'Map.Navigation')) {
            // Extend the Chart.render method to add zooming and panning
            addEvent(MapChartClass, 'beforeRender', function () {
                // Render the plus and minus buttons. Doing this before the
                // shapes makes getBBox much quicker, at least in Chrome.
                this.mapNavigation = new MapNavigation(this);
                this.mapNavigation.update();
            });
            setOptions(MapNavigationDefaults);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Update the map navigation with new options. Calling this is the same as
     * calling `chart.update({ mapNavigation: {} })`.
     *
     * @function MapNavigation#update
     *
     * @param {Partial<Highcharts.MapNavigationOptions>} [options]
     *        New options for the map navigation.
     */
    MapNavigation.prototype.update = function (options) {
        var _a;
        var mapNav = this, chart = mapNav.chart, navButtons = mapNav.navButtons, outerHandler = function (e) {
            this.handler.call(chart, e);
            stopEvent(e); // Stop default click event (#4444)
        };
        var navOptions = chart.options.mapNavigation;
        // Merge in new options in case of update, and register back to chart
        // options.
        if (options) {
            navOptions = chart.options.mapNavigation =
                merge(chart.options.mapNavigation, options);
        }
        // Destroy buttons in case of dynamic update
        while (navButtons.length) {
            (_a = navButtons.pop()) === null || _a === void 0 ? void 0 : _a.destroy();
        }
        if (!chart.renderer.forExport &&
            pick(navOptions.enableButtons, navOptions.enabled)) {
            if (!mapNav.navButtonsGroup) {
                mapNav.navButtonsGroup = chart.renderer.g()
                    .attr({
                    zIndex: 7 // #4955, #8392, #20476
                })
                    .add();
            }
            objectEach(navOptions.buttons, function (buttonOptions, n) {
                var _a;
                buttonOptions = merge(navOptions.buttonOptions, buttonOptions);
                var attr = {
                    padding: buttonOptions.padding
                };
                // Presentational
                if (!chart.styledMode && buttonOptions.theme) {
                    extend(attr, buttonOptions.theme);
                    attr.style = merge(buttonOptions.theme.style, buttonOptions.style // #3203
                    );
                }
                var text = buttonOptions.text, _b = buttonOptions.width, width = _b === void 0 ? 0 : _b, _c = buttonOptions.height, height = _c === void 0 ? 0 : _c, _d = buttonOptions.padding, padding = _d === void 0 ? 0 : _d;
                var button = chart.renderer
                    .button(
                // Display the text from options only if it is not plus
                // or minus
                (text !== '+' && text !== '-' && text) || '', 0, 0, outerHandler, attr, void 0, void 0, void 0, n === 'zoomIn' ? 'topbutton' : 'bottombutton')
                    .addClass('highcharts-map-navigation highcharts-' + {
                    zoomIn: 'zoom-in',
                    zoomOut: 'zoom-out'
                }[n])
                    .attr({
                    width: width,
                    height: height,
                    title: chart.options.lang[n],
                    zIndex: 5
                })
                    .add(mapNav.navButtonsGroup);
                // Add SVG paths for the default symbols, because the text
                // representation of + and - is not sharp and position is not
                // easy to control.
                if (text === '+' || text === '-') {
                    // Mysterious +1 to achieve centering
                    var w = width + 1, d = [
                        ['M', padding + 3, padding + height / 2],
                        ['L', padding + w - 3, padding + height / 2]
                    ];
                    if (text === '+') {
                        d.push(['M', padding + w / 2, padding + 3], ['L', padding + w / 2, padding + height - 3]);
                    }
                    chart.renderer
                        .path(d)
                        .addClass('highcharts-button-symbol')
                        .attr(chart.styledMode ? {} : {
                        stroke: (_a = buttonOptions.style) === null || _a === void 0 ? void 0 : _a.color,
                        'stroke-width': 3,
                        'stroke-linecap': 'round'
                    })
                        .add(button);
                }
                button.handler = buttonOptions.onclick;
                // Stop double click event (#4444)
                addEvent(button.element, 'dblclick', stopEvent);
                navButtons.push(button);
                extend(buttonOptions, {
                    width: button.width,
                    height: 2 * (button.height || 0)
                });
                if (!chart.hasLoaded) {
                    // Align it after the plotBox is known (#12776)
                    var unbind_1 = addEvent(chart, 'load', function () {
                        // #15406: Make sure button hasnt been destroyed
                        if (button.element) {
                            button.align(buttonOptions, false, buttonOptions.alignTo);
                        }
                        unbind_1();
                    });
                }
                else {
                    button.align(buttonOptions, false, buttonOptions.alignTo);
                }
            });
            // Borrowed from overlapping-datalabels. Consider a shared module.
            var isIntersectRect_1 = function (box1, box2) { return !(box2.x >= box1.x + box1.width ||
                box2.x + box2.width <= box1.x ||
                box2.y >= box1.y + box1.height ||
                box2.y + box2.height <= box1.y); };
            // Check the mapNavigation buttons collision with exporting button
            // and translate the mapNavigation button if they overlap.
            var adjustMapNavBtn = function () {
                var _a;
                var expBtnBBox = (_a = chart.exportingGroup) === null || _a === void 0 ? void 0 : _a.getBBox();
                if (expBtnBBox) {
                    var navBtnsBBox = mapNav.navButtonsGroup.getBBox();
                    // If buttons overlap
                    if (isIntersectRect_1(expBtnBBox, navBtnsBBox)) {
                        // Adjust the mapNav buttons' position by translating
                        // them above or below the exporting button
                        var aboveExpBtn = -navBtnsBBox.y -
                            navBtnsBBox.height + expBtnBBox.y - 5, belowExpBtn = expBtnBBox.y + expBtnBBox.height -
                            navBtnsBBox.y + 5, mapNavVerticalAlign = (navOptions.buttonOptions &&
                            navOptions.buttonOptions.verticalAlign);
                        // If bottom aligned and adjusting the mapNav button
                        // would translate it out of the plotBox, translate it
                        // up instead of down
                        mapNav.navButtonsGroup.attr({
                            translateY: mapNavVerticalAlign === 'bottom' ?
                                aboveExpBtn :
                                belowExpBtn
                        });
                    }
                }
            };
            if (!chart.hasLoaded) {
                // Align it after the plotBox is known (#12776) and after the
                // hamburger button's position is known so they don't overlap
                // (#15782)
                addEvent(chart, 'render', adjustMapNavBtn);
            }
        }
        this.updateEvents(navOptions);
    };
    /**
     * Update events, called internally from the update function. Add new event
     * handlers, or unbinds events if disabled.
     *
     * @function MapNavigation#updateEvents
     *
     * @param {Partial<Highcharts.MapNavigationOptions>} options
     *        Options for map navigation.
     */
    MapNavigation.prototype.updateEvents = function (options) {
        var chart = this.chart;
        // Add the double click event
        if (pick(options.enableDoubleClickZoom, options.enabled) ||
            options.enableDoubleClickZoomTo) {
            this.unbindDblClick = this.unbindDblClick || addEvent(chart.container, 'dblclick', function (e) {
                chart.pointer.onContainerDblClick(e);
            });
        }
        else if (this.unbindDblClick) {
            // Unbind and set unbinder to undefined
            this.unbindDblClick = this.unbindDblClick();
        }
        // Add the mousewheel event
        if (pick(options.enableMouseWheelZoom, options.enabled)) {
            this.unbindMouseWheel = this.unbindMouseWheel || addEvent(chart.container, 'wheel', function (e) {
                var _a, _b;
                // Prevent scrolling when the pointer is over the element
                // with that class, for example anotation popup #12100.
                if (!chart.pointer.inClass(e.target, 'highcharts-no-mousewheel')) {
                    var initialZoom = (_a = chart.mapView) === null || _a === void 0 ? void 0 : _a.zoom;
                    chart.pointer.onContainerMouseWheel(e);
                    // If the zoom level changed, prevent the default action
                    // which is to scroll the page
                    if (initialZoom !== ((_b = chart.mapView) === null || _b === void 0 ? void 0 : _b.zoom)) {
                        stopEvent(e);
                    }
                }
                return false;
            });
        }
        else if (this.unbindMouseWheel) {
            // Unbind and set unbinder to undefined
            this.unbindMouseWheel = this.unbindMouseWheel();
        }
    };
    return MapNavigation;
}());
/* *
 *
 *  Default Export
 *
 * */
export default MapNavigation;
