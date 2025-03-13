/* *
 *
 *  (c) 2010-2024 Pawel Lysy Grzegorz Blachlinski
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
import Point from '../../Core/Series/Point.js';
import U from '../../Core/Utilities.js';
var pick = U.pick, extend = U.extend;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var ColumnPoint = SeriesRegistry.seriesTypes.column.prototype.pointClass;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 */
var LinkPoint = /** @class */ (function (_super) {
    __extends(LinkPoint, _super);
    /* *
     *
     *  Constructor
     *
     * */
    function LinkPoint(series, options, x, point) {
        var _this = _super.call(this, series, options, x) || this;
        /* *
         *
         *  Properties
         *
         * */
        _this.dataLabelOnNull = true;
        _this.formatPrefix = 'link';
        _this.isLink = true;
        _this.node = {};
        _this.formatPrefix = 'link';
        _this.dataLabelOnNull = true;
        if (point) {
            _this.fromNode = point.node.parentNode.point;
            _this.visible = point.visible;
            _this.toNode = point;
            _this.id = _this.toNode.id + '-' + _this.fromNode.id;
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    LinkPoint.prototype.update = function (options, redraw, animation, runEvent) {
        var oldOptions = {
            id: this.id,
            formatPrefix: this.formatPrefix
        };
        Point.prototype.update.call(this, options, this.isLink ? false : redraw, // Hold the redraw for nodes
        animation, runEvent);
        this.visible = this.toNode.visible;
        extend(this, oldOptions);
        if (pick(redraw, true)) {
            this.series.chart.redraw(animation);
        }
    };
    return LinkPoint;
}(ColumnPoint));
/* *
 *
 *  Export Default
 *
 * */
export default LinkPoint;
