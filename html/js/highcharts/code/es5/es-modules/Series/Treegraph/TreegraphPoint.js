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
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var TreemapPoint = SeriesRegistry.seriesTypes.treemap.prototype.pointClass;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, fireEvent = U.fireEvent, merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @class
 */
var TreegraphPoint = /** @class */ (function (_super) {
    __extends(TreegraphPoint, _super);
    function TreegraphPoint() {
        /* *
         *
         *  Properties
         *
         * */
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.dataLabelOnHidden = true;
        _this.isLink = false;
        _this.setState = Point.prototype.setState;
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    TreegraphPoint.prototype.draw = function () {
        _super.prototype.draw.apply(this, arguments);
        // Run animation of hiding/showing of the point.
        var graphic = this.graphic;
        if (graphic) {
            graphic.animate({
                visibility: this.visible ? 'inherit' : 'hidden'
            });
        }
        this.renderCollapseButton();
    };
    TreegraphPoint.prototype.renderCollapseButton = function () {
        var point = this, series = point.series, parentGroup = point.graphic && point.graphic.parentGroup, levelOptions = series.mapOptionsToLevel[point.node.level || 0] || {}, btnOptions = merge(series.options.collapseButton, levelOptions.collapseButton, point.options.collapseButton), width = btnOptions.width, height = btnOptions.height, shape = btnOptions.shape, style = btnOptions.style, padding = 2, chart = this.series.chart, calculatedOpacity = (point.visible &&
            (point.collapsed ||
                !btnOptions.onlyOnHover ||
                point.state === 'hover')) ? 1 : 0;
        if (!point.shapeArgs) {
            return;
        }
        this.collapseButtonOptions = btnOptions;
        if (!point.collapseButton) {
            if (!point.node.children.length || !btnOptions.enabled) {
                return;
            }
            var _a = this.getCollapseBtnPosition(btnOptions), x = _a.x, y = _a.y, fill = (btnOptions.fillColor ||
                point.color ||
                "#cccccc" /* Palette.neutralColor20 */);
            point.collapseButton = chart.renderer
                .label(point.collapsed ? '+' : '-', x, y, shape)
                .attr({
                height: height - 2 * padding,
                width: width - 2 * padding,
                padding: padding,
                fill: fill,
                rotation: chart.inverted ? 90 : 0,
                rotationOriginX: width / 2,
                rotationOriginY: height / 2,
                stroke: btnOptions.lineColor || "#ffffff" /* Palette.backgroundColor */,
                'stroke-width': btnOptions.lineWidth,
                'text-align': 'center',
                align: 'center',
                zIndex: 1,
                opacity: calculatedOpacity,
                visibility: point.visible ? 'inherit' : 'hidden'
            })
                .addClass('highcharts-tracker')
                .addClass('highcharts-collapse-button')
                .removeClass('highcharts-no-tooltip')
                .css(merge({
                color: typeof fill === 'string' ?
                    chart.renderer.getContrast(fill) :
                    "#333333" /* Palette.neutralColor80 */
            }, style))
                .add(parentGroup);
            point.collapseButton.element.point = point;
        }
        else {
            if (!point.node.children.length || !btnOptions.enabled) {
                point.collapseButton.destroy();
                delete point.collapseButton;
            }
            else {
                var _b = this.getCollapseBtnPosition(btnOptions), x = _b.x, y = _b.y;
                point.collapseButton
                    .attr({
                    text: point.collapsed ? '+' : '-',
                    rotation: chart.inverted ? 90 : 0,
                    rotationOriginX: width / 2,
                    rotationOriginY: height / 2,
                    visibility: point.visible ? 'inherit' : 'hidden'
                })
                    .animate({
                    x: x,
                    y: y,
                    opacity: calculatedOpacity
                });
            }
        }
    };
    TreegraphPoint.prototype.toggleCollapse = function (state) {
        var series = this.series;
        this.update({
            collapsed: state !== null && state !== void 0 ? state : !this.collapsed
        }, false, void 0, false);
        fireEvent(series, 'toggleCollapse');
        series.redraw();
    };
    TreegraphPoint.prototype.destroy = function () {
        if (this.collapseButton) {
            this.collapseButton.destroy();
            delete this.collapseButton;
            this.collapseButton = void 0;
        }
        if (this.linkToParent) {
            this.linkToParent.destroy();
            delete this.linkToParent;
        }
        _super.prototype.destroy.apply(this, arguments);
    };
    TreegraphPoint.prototype.getCollapseBtnPosition = function (btnOptions) {
        var point = this, chart = point.series.chart, inverted = chart.inverted, btnWidth = btnOptions.width, btnHeight = btnOptions.height, _a = point.shapeArgs || {}, _b = _a.x, x = _b === void 0 ? 0 : _b, _c = _a.y, y = _c === void 0 ? 0 : _c, _d = _a.width, width = _d === void 0 ? 0 : _d, _e = _a.height, height = _e === void 0 ? 0 : _e;
        return {
            x: x +
                btnOptions.x +
                (inverted ? -btnHeight * 0.3 : width + btnWidth * -0.3),
            y: y + height / 2 - btnHeight / 2 + btnOptions.y
        };
    };
    return TreegraphPoint;
}(TreemapPoint));
addEvent(TreegraphPoint, 'mouseOut', function () {
    var btn = this.collapseButton, btnOptions = this.collapseButtonOptions;
    if (btn && (btnOptions === null || btnOptions === void 0 ? void 0 : btnOptions.onlyOnHover) && !this.collapsed) {
        btn.animate({ opacity: 0 });
    }
});
addEvent(TreegraphPoint, 'mouseOver', function () {
    var _a, _b;
    if (this.collapseButton && this.visible) {
        this.collapseButton.animate({ opacity: 1 }, (_b = (_a = this.series.options.states) === null || _a === void 0 ? void 0 : _a.hover) === null || _b === void 0 ? void 0 : _b.animation);
    }
});
// Handle showing and hiding of the points
addEvent(TreegraphPoint, 'click', function () {
    this.toggleCollapse();
});
/* *
 *
 *  Export Default
 *
 * */
export default TreegraphPoint;
