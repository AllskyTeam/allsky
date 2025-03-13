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
/* *
 *
 *  Namespace
 *
 * */
/**
 * Shared Highcharts properties.
 * @private
 */
var Globals;
(function (Globals) {
    /* *
     *
     *  Constants
     *
     * */
    Globals.SVG_NS = 'http://www.w3.org/2000/svg', Globals.product = 'Highcharts', Globals.version = '@product.version@', Globals.win = (typeof window !== 'undefined' ?
        window :
        {}), // eslint-disable-line node/no-unsupported-features/es-builtins
    Globals.doc = Globals.win.document, Globals.svg = (Globals.doc &&
        Globals.doc.createElementNS &&
        !!Globals.doc.createElementNS(Globals.SVG_NS, 'svg').createSVGRect), Globals.pageLang = Globals.doc?.documentElement?.closest('[lang]')?.lang, Globals.userAgent = (Globals.win.navigator && Globals.win.navigator.userAgent) || '', Globals.isChrome = Globals.win.chrome, Globals.isFirefox = Globals.userAgent.indexOf('Firefox') !== -1, Globals.isMS = /(edge|msie|trident)/i.test(Globals.userAgent) && !Globals.win.opera, Globals.isSafari = !Globals.isChrome && Globals.userAgent.indexOf('Safari') !== -1, Globals.isTouchDevice = /(Mobile|Android|Windows Phone)/.test(Globals.userAgent), Globals.isWebKit = Globals.userAgent.indexOf('AppleWebKit') !== -1, Globals.deg2rad = Math.PI * 2 / 360, Globals.marginNames = [
        'plotTop',
        'marginRight',
        'marginBottom',
        'plotLeft'
    ], Globals.noop = function () { }, Globals.supportsPassiveEvents = (function () {
        // Checks whether the browser supports passive events, (#11353).
        let supportsPassive = false;
        // Object.defineProperty doesn't work on IE as well as passive
        // events - instead of using polyfill, we can exclude IE totally.
        if (!Globals.isMS) {
            const opts = Object.defineProperty({}, 'passive', {
                get: function () {
                    supportsPassive = true;
                }
            });
            if (Globals.win.addEventListener && Globals.win.removeEventListener) {
                Globals.win.addEventListener('testPassive', Globals.noop, opts);
                Globals.win.removeEventListener('testPassive', Globals.noop, opts);
            }
        }
        return supportsPassive;
    }());
    /**
     * An array containing the current chart objects in the page. A chart's
     * position in the array is preserved throughout the page's lifetime. When
     * a chart is destroyed, the array item becomes `undefined`.
     *
     * @name Highcharts.charts
     * @type {Array<Highcharts.Chart|undefined>}
     */
    Globals.charts = [];
    /**
     * A shared registry between all bundles to keep track of applied
     * compositions.
     * @private
     */
    Globals.composed = [];
    /**
     * A hook for defining additional date format specifiers. New
     * specifiers are defined as key-value pairs by using the
     * specifier as key, and a function which takes the timestamp as
     * value. This function returns the formatted portion of the
     * date.
     *
     * Using `dateFormats` is also a convenient way to define new keys for
     * complex locale-aware date formats compatible with the
     * [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
     * browser API, whenever the built-in formats are not sufficient.
     *
     * @sample highcharts/global/dateformats/
     *         Adding support for week number
     * @sample highcharts/global/dateformats-object/
     *         A locale-aware date format using `Intl.DateTimeFormat`
     *
     * @name Highcharts.dateFormats
     * @type {Record<string, Highcharts.TimeFormatCallbackFunction>}
     */
    Globals.dateFormats = {};
    /**
     * @private
     * @deprecated
     * @todo Use only `Core/Series/SeriesRegistry.seriesTypes`
     */
    Globals.seriesTypes = {};
    /**
     * @private
     */
    Globals.symbolSizes = {};
    /* *
     *
     *  Properties
     *
     * */
    // eslint-disable-next-line prefer-const
    Globals.chartCount = 0;
})(Globals || (Globals = {}));
/* *
 *
 *  Default Export
 *
 * */
export default Globals;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Theme options that should get applied to the chart. In module mode it
 * might not be possible to change this property because of read-only
 * restrictions, instead use {@link Highcharts.setOptions}.
 *
 * @deprecated
 * @name Highcharts.theme
 * @type {Highcharts.Options}
 */
(''); // Keeps doclets above in JS file
