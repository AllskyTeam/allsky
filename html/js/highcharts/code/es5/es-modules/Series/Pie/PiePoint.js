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
import A from '../../Core/Animation/AnimationUtilities.js';
var setAnimation = A.setAnimation;
import Point from '../../Core/Series/Point.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, extend = U.extend, isNumber = U.isNumber, pick = U.pick, relativeLength = U.relativeLength;
/* *
 *
 *  Class
 *
 * */
var PiePoint = /** @class */ (function (_super) {
    __extends(PiePoint, _super);
    /**
     * Initialize the pie slice.
     * @private
     */
    function PiePoint(series, options, x) {
        var _a;
        var _this = _super.call(this, series, options, x) || this;
        _this.half = 0;
        (_a = _this.name) !== null && _a !== void 0 ? _a : (_this.name = 'Slice');
        // Add event listener for select
        var toggleSlice = function (e) {
            _this.slice(e.type === 'select');
        };
        addEvent(_this, 'select', toggleSlice);
        addEvent(_this, 'unselect', toggleSlice);
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /* eslint-disable valid-jsdoc */
    /**
     * Extendable method for getting the path of the connector between the
     * data label and the pie slice.
     * @private
     */
    PiePoint.prototype.getConnectorPath = function (dataLabel) {
        var labelPosition = dataLabel.dataLabelPosition, options = (dataLabel.options || {}), connectorShape = options.connectorShape, shapeFunc = (this.connectorShapes[connectorShape] || connectorShape);
        return labelPosition && shapeFunc.call(this, __assign(__assign({}, labelPosition.computed), { alignment: labelPosition.alignment }), labelPosition.connectorPosition, options) || [];
    };
    /**
     * @private
     */
    PiePoint.prototype.getTranslate = function () {
        return this.sliced && this.slicedTranslation || {
            translateX: 0,
            translateY: 0
        };
    };
    /**
     * @private
     */
    PiePoint.prototype.haloPath = function (size) {
        var shapeArgs = this.shapeArgs;
        return this.sliced || !this.visible ?
            [] :
            this.series.chart.renderer.symbols.arc(shapeArgs.x, shapeArgs.y, shapeArgs.r + size, shapeArgs.r + size, {
                // Substract 1px to ensure the background is not bleeding
                // through between the halo and the slice (#7495).
                innerR: shapeArgs.r - 1,
                start: shapeArgs.start,
                end: shapeArgs.end,
                borderRadius: shapeArgs.borderRadius
            });
    };
    /**
     * Negative points are not valid (#1530, #3623, #5322)
     * @private
     */
    PiePoint.prototype.isValid = function () {
        return isNumber(this.y) && this.y >= 0;
    };
    /**
     * Toggle the visibility of a pie slice or other data point. Note that this
     * method is available only for some series, like pie, treemap and sunburst.
     *
     * @function Highcharts.Point#setVisible
     *
     * @param {boolean} [vis]
     * True to show the pie slice or other data point, false to hide. If
     * undefined, the visibility is toggled.
     *
     * @param {boolean} [redraw] Whether to redraw the chart after the point is
     * altered. If doing more operations on the chart, it is a good idea to set
     * redraw to false and call {@link Chart#redraw|chart.redraw()} after.
     *
     */
    PiePoint.prototype.setVisible = function (vis, redraw) {
        if (redraw === void 0) { redraw = true; }
        if (vis !== this.visible) {
            // If called without an argument, toggle visibility
            this.update({
                visible: vis !== null && vis !== void 0 ? vis : !this.visible
            }, redraw, void 0, false);
        }
    };
    /**
     * Set or toggle whether the slice is cut out from the pie.
     * @private
     *
     * @param {boolean} sliced
     * When undefined, the slice state is toggled.
     *
     * @param {boolean} [redraw]
     * Whether to redraw the chart. True by default.
     *
     * @param {boolean|Partial<Highcharts.AnimationOptionsObject>} [animation]
     * Animation options.
     */
    PiePoint.prototype.slice = function (sliced, redraw, animation) {
        var series = this.series, chart = series.chart;
        setAnimation(animation, chart);
        // Redraw is true by default
        redraw = pick(redraw, true);
        /**
         * Pie series only. Whether to display a slice offset from the
         * center.
         * @name Highcharts.Point#sliced
         * @type {boolean|undefined}
         */
        // if called without an argument, toggle
        this.sliced = this.options.sliced = sliced =
            defined(sliced) ? sliced : !this.sliced;
        // Update userOptions.data
        series.options.data[series.data.indexOf(this)] =
            this.options;
        if (this.graphic) {
            this.graphic.animate(this.getTranslate());
        }
    };
    return PiePoint;
}(Point));
extend(PiePoint.prototype, {
    connectorShapes: {
        // Only one available before v7.0.0
        fixedOffset: function (labelPosition, connectorPosition, options) {
            var breakAt = connectorPosition.breakAt, touchingSliceAt = connectorPosition.touchingSliceAt, lineSegment = options.softConnector ? [
                'C', // Soft break
                // 1st control point (of the curve)
                labelPosition.x +
                    // 5 gives the connector a little horizontal bend
                    (labelPosition.alignment === 'left' ? -5 : 5),
                labelPosition.y, //
                2 * breakAt.x - touchingSliceAt.x, // 2nd control point
                2 * breakAt.y - touchingSliceAt.y, //
                breakAt.x, // End of the curve
                breakAt.y //
            ] : [
                'L', // Pointy break
                breakAt.x,
                breakAt.y
            ];
            // Assemble the path
            return ([
                ['M', labelPosition.x, labelPosition.y],
                lineSegment,
                ['L', touchingSliceAt.x, touchingSliceAt.y]
            ]);
        },
        straight: function (labelPosition, connectorPosition) {
            var touchingSliceAt = connectorPosition.touchingSliceAt;
            // Direct line to the slice
            return [
                ['M', labelPosition.x, labelPosition.y],
                ['L', touchingSliceAt.x, touchingSliceAt.y]
            ];
        },
        crookedLine: function (labelPosition, connectorPosition, options) {
            var _a = connectorPosition.angle, angle = _a === void 0 ? this.angle || 0 : _a, breakAt = connectorPosition.breakAt, touchingSliceAt = connectorPosition.touchingSliceAt, series = this.series, _b = series.center, cx = _b[0], cy = _b[1], diameter = _b[2], r = diameter / 2, _c = series.chart, plotLeft = _c.plotLeft, plotWidth = _c.plotWidth, leftAligned = labelPosition.alignment === 'left', x = labelPosition.x, y = labelPosition.y;
            var crookX = breakAt.x;
            if (options.crookDistance) {
                var crookDistance = relativeLength(// % to fraction
                options.crookDistance, 1);
                crookX = leftAligned ?
                    cx +
                        r +
                        (plotWidth + plotLeft - cx - r) * (1 - crookDistance) :
                    plotLeft + (cx - r) * crookDistance;
                // When the crookDistance option is undefined, make the bend in the
                // intersection between the radial line in the middle of the slice,
                // and the extension of the label position.
            }
            else {
                crookX = cx + (cy - y) * Math.tan(angle - Math.PI / 2);
            }
            var path = [['M', x, y]];
            // The crookedLine formula doesn't make sense if the path overlaps
            // the label - use straight line instead in that case
            if (leftAligned ?
                (crookX <= x && crookX >= breakAt.x) :
                (crookX >= x && crookX <= breakAt.x)) {
                path.push(['L', crookX, y]);
            }
            path.push(['L', breakAt.x, breakAt.y], ['L', touchingSliceAt.x, touchingSliceAt.y]);
            return path;
        }
    }
});
/* *
 *
 *  Default Export
 *
 * */
export default PiePoint;
