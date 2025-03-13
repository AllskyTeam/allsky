/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  Accessibility component for the navigator.
 *
 *  Author: Øystein Moseng
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
/* *
 *
 *  Imports
 *
 * */
import AccessibilityComponent from '../AccessibilityComponent.js';
import Announcer from '../Utils/Announcer.js';
import KeyboardNavigationHandler from '../KeyboardNavigationHandler.js';
import Navigator from '../../Stock/Navigator/Navigator.js';
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import T from '../../Core/Templating.js';
var format = T.format;
import U from '../../Core/Utilities.js';
var clamp = U.clamp, pick = U.pick, syncTimeout = U.syncTimeout;
import HU from '../Utils/HTMLUtilities.js';
var getFakeMouseEvent = HU.getFakeMouseEvent;
import CU from '../Utils/ChartUtilities.js';
var getAxisRangeDescription = CU.getAxisRangeDescription, fireEventOnWrappedOrUnwrappedElement = CU.fireEventOnWrappedOrUnwrappedElement;
/**
 * The NavigatorComponent class
 *
 * @private
 * @class
 * @name Highcharts.NavigatorComponent
 */
var NavigatorComponent = /** @class */ (function (_super) {
    __extends(NavigatorComponent, _super);
    function NavigatorComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Init the component
     * @private
     */
    NavigatorComponent.prototype.init = function () {
        var chart = this.chart, component = this;
        this.announcer = new Announcer(chart, 'polite');
        // Update positions after render
        this.addEvent(Navigator, 'afterRender', function () {
            if (this.chart === component.chart &&
                this.chart.renderer) {
                syncTimeout(function () {
                    component.proxyProvider
                        .updateGroupProxyElementPositions('navigator');
                    component.updateHandleValues();
                }, animObject(pick(this.chart.renderer.globalAnimation, true)).duration);
            }
        });
    };
    /**
     * Called on updates
     * @private
     */
    NavigatorComponent.prototype.onChartUpdate = function () {
        var _this = this;
        var _a, _b, _c;
        var chart = this.chart, options = chart.options, navigator = options.navigator;
        if (navigator.enabled && ((_a = navigator.accessibility) === null || _a === void 0 ? void 0 : _a.enabled)) {
            var verbosity = options.accessibility.landmarkVerbosity, groupFormatStr = (_b = options.lang
                .accessibility) === null || _b === void 0 ? void 0 : _b.navigator.groupLabel;
            // We just recreate the group for simplicity. Could consider
            // updating the existing group if the verbosity has not changed.
            this.proxyProvider.removeGroup('navigator');
            this.proxyProvider.addGroup('navigator', 'div', {
                role: verbosity === 'all' ? 'region' : 'group',
                'aria-label': format(groupFormatStr, { chart: chart }, chart)
            });
            var handleFormatStr_1 = (_c = options.lang
                .accessibility) === null || _c === void 0 ? void 0 : _c.navigator.handleLabel;
            [0, 1].forEach(function (n) {
                var handle = _this.getHandleByIx(n);
                if (handle) {
                    var proxyEl = _this.proxyProvider.addProxyElement('navigator', {
                        click: handle
                    }, 'input', {
                        type: 'range',
                        'aria-label': format(handleFormatStr_1, { handleIx: n, chart: chart }, chart)
                    });
                    _this[n ? 'maxHandleProxy' : 'minHandleProxy'] =
                        proxyEl.innerElement;
                    proxyEl.innerElement.style.pointerEvents = 'none';
                    proxyEl.innerElement.oninput =
                        function () { return _this.updateNavigator(); };
                }
            });
            this.updateHandleValues();
        }
        else {
            this.proxyProvider.removeGroup('navigator');
        }
    };
    /**
     * Get navigation for a navigator handle.
     * @private
     * @return {Highcharts.KeyboardNavigationHandler} The module object.
     */
    NavigatorComponent.prototype.getNavigatorHandleNavigation = function (handleIx) {
        var _this = this;
        var component = this, chart = this.chart, proxyEl = handleIx ? this.maxHandleProxy : this.minHandleProxy, keys = this.keyCodes;
        return new KeyboardNavigationHandler(chart, {
            keyCodeMap: [[
                    [keys.left, keys.right, keys.up, keys.down],
                    function (keyCode) {
                        if (proxyEl) {
                            var delta = keyCode === keys.left ||
                                keyCode === keys.up ? -1 : 1;
                            proxyEl.value = '' + clamp(parseFloat(proxyEl.value) + delta, 0, 100);
                            component.updateNavigator(function () {
                                var handle = component.getHandleByIx(handleIx);
                                if (handle) {
                                    chart.setFocusToElement(handle, proxyEl);
                                }
                            });
                        }
                        return this.response.success;
                    }
                ]],
            init: function () {
                chart.setFocusToElement(_this.getHandleByIx(handleIx), proxyEl);
            },
            validate: function () {
                var _a;
                return !!(_this.getHandleByIx(handleIx) && proxyEl &&
                    ((_a = chart.options.navigator.accessibility) === null || _a === void 0 ? void 0 : _a.enabled));
            }
        });
    };
    /**
     * Get keyboard navigation handlers for this component.
     * @return {Array<Highcharts.KeyboardNavigationHandler>}
     *         List of module objects.
     */
    NavigatorComponent.prototype.getKeyboardNavigation = function () {
        return [
            this.getNavigatorHandleNavigation(0),
            this.getNavigatorHandleNavigation(1)
        ];
    };
    /**
     * Remove component traces
     */
    NavigatorComponent.prototype.destroy = function () {
        if (this.updateNavigatorThrottleTimer) {
            clearTimeout(this.updateNavigatorThrottleTimer);
        }
        this.proxyProvider.removeGroup('navigator');
        if (this.announcer) {
            this.announcer.destroy();
        }
    };
    /**
     * Update the value of the handles to match current navigator pos.
     * @private
     */
    NavigatorComponent.prototype.updateHandleValues = function () {
        var navigator = this.chart.navigator;
        if (navigator && this.minHandleProxy && this.maxHandleProxy) {
            var length_1 = navigator.size;
            this.minHandleProxy.value =
                '' + Math.round(navigator.zoomedMin / length_1 * 100);
            this.maxHandleProxy.value =
                '' + Math.round(navigator.zoomedMax / length_1 * 100);
        }
    };
    /**
     * Get a navigator handle by its index
     * @private
     */
    NavigatorComponent.prototype.getHandleByIx = function (ix) {
        var navigator = this.chart.navigator;
        return navigator && navigator.handles &&
            navigator.handles[ix];
    };
    /**
     * Update navigator to match changed proxy values.
     * @private
     */
    NavigatorComponent.prototype.updateNavigator = function (beforeAnnounce) {
        var _this = this;
        var performUpdate = function (beforeAnnounce) {
            var _a;
            var chart = _this.chart, navigator = chart.navigator, pointer = chart.pointer;
            if (navigator &&
                pointer &&
                _this.minHandleProxy &&
                _this.maxHandleProxy) {
                var chartPos_1 = pointer.getChartPosition(), minNewX = parseFloat(_this.minHandleProxy.value) /
                    100 * navigator.size, maxNewX = parseFloat(_this.maxHandleProxy.value) /
                    100 * navigator.size;
                // Fire fake events in order for each handle.
                [
                    [0, 'mousedown', navigator.zoomedMin],
                    [0, 'mousemove', minNewX],
                    [0, 'mouseup', minNewX],
                    [1, 'mousedown', navigator.zoomedMax],
                    [1, 'mousemove', maxNewX],
                    [1, 'mouseup', maxNewX]
                ].forEach(function (_a) {
                    var _b;
                    var handleIx = _a[0], type = _a[1], x = _a[2];
                    var handle = (_b = _this.getHandleByIx(handleIx)) === null || _b === void 0 ? void 0 : _b.element;
                    if (handle) {
                        fireEventOnWrappedOrUnwrappedElement(handle, getFakeMouseEvent(type, {
                            x: chartPos_1.left + navigator.left + x,
                            y: chartPos_1.top + navigator.top
                        }, handle));
                    }
                });
                if (beforeAnnounce) {
                    beforeAnnounce();
                }
                // Announce the update
                var announceFormatStr = (_a = chart.options.lang
                    .accessibility) === null || _a === void 0 ? void 0 : _a.navigator.changeAnnouncement, axisRangeDescription = getAxisRangeDescription(chart.xAxis[0]);
                _this.announcer.announce(format(announceFormatStr, { axisRangeDescription: axisRangeDescription, chart: chart }, chart));
            }
        };
        // Throttle updates so as not to reduce performance with
        // continuous keypress.
        if (this.updateNavigatorThrottleTimer) {
            clearTimeout(this.updateNavigatorThrottleTimer);
        }
        this.updateNavigatorThrottleTimer = setTimeout(performUpdate.bind(this, beforeAnnounce), 20);
    };
    return NavigatorComponent;
}(AccessibilityComponent));
/* *
 *
 *  Export Default
 *
 * */
export default NavigatorComponent;
