/* *
 *
 *  Highcharts Drilldown module
 *
 *  Author: Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, extend = U.extend, fireEvent = U.fireEvent, merge = U.merge, pick = U.pick, syncTimeout = U.syncTimeout;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function applyCursorCSS(element, cursor, addClass, styledMode) {
    element[addClass ? 'addClass' : 'removeClass']('highcharts-drilldown-point');
    if (!styledMode) {
        element.css({ cursor: cursor });
    }
}
/** @private */
function columnAnimateDrilldown(init) {
    var series = this, chart = series.chart, drilldownLevels = chart.drilldownLevels, animationOptions = animObject((chart.options.drilldown || {}).animation), xAxis = this.xAxis, styledMode = chart.styledMode;
    if (!init) {
        var animateFrom_1;
        (drilldownLevels || []).forEach(function (level) {
            if (series.options._ddSeriesId ===
                level.lowerSeriesOptions._ddSeriesId) {
                animateFrom_1 = level.shapeArgs;
                if (!styledMode && animateFrom_1) {
                    // Add the point colors to animate from
                    animateFrom_1.fill = level.color;
                }
            }
        });
        animateFrom_1.x += pick(xAxis.oldPos, xAxis.pos) - xAxis.pos;
        series.points.forEach(function (point) {
            var animateTo = point.shapeArgs;
            if (!styledMode) {
                // Add the point colors to animate to
                animateTo.fill = point.color;
            }
            if (point.graphic) {
                point.graphic
                    .attr(animateFrom_1)
                    .animate(extend(point.shapeArgs, { fill: point.color || series.color }), animationOptions);
            }
        });
        if (chart.drilldown) {
            chart.drilldown.fadeInGroup(this.dataLabelsGroup);
        }
        // Reset to prototype
        delete this.animate;
    }
}
/**
 * When drilling up, pull out the individual point graphics from the lower
 * series and animate them into the origin point in the upper series.
 *
 * @private
 * @function Highcharts.ColumnSeries#animateDrillupFrom
 * @param {Highcharts.DrilldownLevelObject} level
 *        Level container
 * @return {void}
 */
function columnAnimateDrillupFrom(level) {
    var series = this, animationOptions = animObject((series.chart.options.drilldown || {}).animation);
    // Cancel mouse events on the series group (#2787)
    (series.trackerGroups || []).forEach(function (key) {
        // We don't always have dataLabelsGroup
        if (series[key]) {
            series[key].on('mouseover');
        }
    });
    var group = series.group;
    // For 3d column series all columns are added to one group
    // so we should not delete the whole group. #5297
    var removeGroup = group !== series.chart.columnGroup;
    if (removeGroup) {
        delete series.group;
    }
    this.points.forEach(function (point) {
        var graphic = point.graphic, animateTo = level.shapeArgs;
        if (graphic && animateTo) {
            var complete = function () {
                graphic.destroy();
                if (group && removeGroup) {
                    group = group.destroy();
                }
            };
            delete point.graphic;
            if (!series.chart.styledMode) {
                animateTo.fill = level.color;
            }
            if (animationOptions.duration) {
                graphic.animate(animateTo, merge(animationOptions, { complete: complete }));
            }
            else {
                graphic.attr(animateTo);
                complete();
            }
        }
    });
}
/**
 * When drilling up, keep the upper series invisible until the lower series has
 * moved into place.
 *
 * @private
 * @function Highcharts.ColumnSeries#animateDrillupTo
 * @param {boolean} [init=false]
 * Whether to initialize animation
 */
function columnAnimateDrillupTo(init) {
    var series = this, level = series.drilldownLevel;
    if (!init) {
        // First hide all items before animating in again
        series.points.forEach(function (point) {
            var _a;
            var dataLabel = point.dataLabel;
            if (point.graphic) { // #3407
                point.graphic.hide();
            }
            if (dataLabel) {
                // The data label is initially hidden, make sure it is not faded
                // in (#6127)
                dataLabel.hidden = dataLabel.attr('visibility') === 'hidden';
                if (!dataLabel.hidden) {
                    dataLabel.hide();
                    (_a = dataLabel.connector) === null || _a === void 0 ? void 0 : _a.hide();
                }
            }
        });
        // Do dummy animation on first point to get to complete
        syncTimeout(function () {
            if (series.points) { // May be destroyed in the meantime, #3389
                // Unable to drillup with nodes, #13711
                var pointsWithNodes_1 = [];
                series.data.forEach(function (el) {
                    pointsWithNodes_1.push(el);
                });
                if (series.nodes) {
                    pointsWithNodes_1 = pointsWithNodes_1.concat(series.nodes);
                }
                pointsWithNodes_1.forEach(function (point, i) {
                    var _a;
                    // Fade in other points
                    var verb = i === (level && level.pointIndex) ? 'show' : 'fadeIn', inherit = verb === 'show' ? true : void 0, dataLabel = point.dataLabel;
                    if (point.graphic && // #3407
                        point.visible // Don't show if invisible (#18303)
                    ) {
                        point.graphic[verb](inherit);
                    }
                    if (dataLabel && !dataLabel.hidden) { // #6127
                        dataLabel.fadeIn(); // #7384
                        (_a = dataLabel.connector) === null || _a === void 0 ? void 0 : _a.fadeIn();
                    }
                });
            }
        }, Math.max(series.chart.options.drilldown.animation.duration - 50, 0));
        // Reset to prototype
        delete this.animate;
    }
}
/** @private */
function compose(SeriesClass, seriesTypes) {
    var PointClass = SeriesClass.prototype.pointClass, pointProto = PointClass.prototype;
    if (!pointProto.doDrilldown) {
        var ColumnSeriesClass = seriesTypes.column, MapSeriesClass = seriesTypes.map, PieSeriesClass = seriesTypes.pie;
        addEvent(PointClass, 'afterInit', onPointAfterInit);
        addEvent(PointClass, 'afterSetState', onPointAfterSetState);
        addEvent(PointClass, 'update', onPointUpdate);
        pointProto.doDrilldown = pointDoDrilldown;
        pointProto.runDrilldown = pointRunDrilldown;
        addEvent(SeriesClass, 'afterDrawDataLabels', onSeriesAfterDrawDataLabels);
        addEvent(SeriesClass, 'afterDrawTracker', onSeriesAfterDrawTracker);
        if (ColumnSeriesClass) {
            var columnProto = ColumnSeriesClass.prototype;
            columnProto.animateDrilldown = columnAnimateDrilldown;
            columnProto.animateDrillupFrom = columnAnimateDrillupFrom;
            columnProto.animateDrillupTo = columnAnimateDrillupTo;
        }
        if (MapSeriesClass) {
            var mapProto = MapSeriesClass.prototype;
            mapProto.animateDrilldown = mapAnimateDrilldown;
            mapProto.animateDrillupFrom = mapAnimateDrillupFrom;
            mapProto.animateDrillupTo = mapAnimateDrillupTo;
        }
        if (PieSeriesClass) {
            var pieProto = PieSeriesClass.prototype;
            pieProto.animateDrilldown = pieAnimateDrilldown;
            pieProto.animateDrillupFrom = columnAnimateDrillupFrom;
            pieProto.animateDrillupTo = columnAnimateDrillupTo;
        }
    }
}
/**
 * Animate in the new series.
 * @private
 */
function mapAnimateDrilldown(init) {
    var series = this, chart = series.chart, group = series.group;
    if (chart &&
        group &&
        series.options &&
        chart.options.drilldown &&
        chart.options.drilldown.animation) {
        // Initialize the animation
        if (init && chart.mapView) {
            group.attr({
                opacity: 0.01
            });
            chart.mapView.allowTransformAnimation = false;
            // Stop duplicating and overriding animations
            series.options.inactiveOtherPoints = true;
            series.options.enableMouseTracking = false;
            // Run the animation
        }
        else {
            group.animate({
                opacity: 1
            }, chart.options.drilldown.animation, function () {
                if (series.options) {
                    series.options.inactiveOtherPoints = false;
                    series.options.enableMouseTracking =
                        pick((series.userOptions &&
                            series.userOptions.enableMouseTracking), true);
                }
            });
            if (chart.drilldown) {
                chart.drilldown.fadeInGroup(this.dataLabelsGroup);
            }
        }
    }
}
/**
 * When drilling up, pull out the individual point graphics from the
 * lower series and animate them into the origin point in the upper
 * series.
 * @private
 */
function mapAnimateDrillupFrom() {
    var series = this, chart = series.chart;
    if (chart && chart.mapView) {
        chart.mapView.allowTransformAnimation = false;
    }
    // Stop duplicating and overriding animations
    if (series.options) {
        series.options.inactiveOtherPoints = true;
    }
}
/**
 * When drilling up, keep the upper series invisible until the lower
 * series has moved into place.
 * @private
 */
function mapAnimateDrillupTo(init) {
    var series = this, chart = series.chart, group = series.group;
    if (chart && group) {
        // Initialize the animation
        if (init) {
            group.attr({
                opacity: 0.01
            });
            // Stop duplicating and overriding animations
            if (series.options) {
                series.options.inactiveOtherPoints = true;
            }
            // Run the animation
        }
        else {
            group.animate({ opacity: 1 }, (chart.options.drilldown || {}).animation);
            if (chart.drilldown) {
                chart.drilldown.fadeInGroup(series.dataLabelsGroup);
            }
        }
    }
}
/**
 * On initialization of each point, identify its label and make it clickable.
 * Also, provide a list of points associated to that label.
 * @private
 */
function onPointAfterInit() {
    var point = this;
    if (point.drilldown && !point.unbindDrilldownClick) {
        // Add the click event to the point
        point.unbindDrilldownClick = addEvent(point, 'click', onPointClick);
    }
    return point;
}
/** @private */
function onPointAfterSetState() {
    var point = this, series = point.series, styledMode = series.chart.styledMode;
    if (point.drilldown && series.halo && point.state === 'hover') {
        applyCursorCSS(series.halo, 'pointer', true, styledMode);
    }
    else if (series.halo) {
        applyCursorCSS(series.halo, 'auto', false, styledMode);
    }
}
/** @private */
function onPointClick(e) {
    var point = this, series = point.series;
    if (series.xAxis &&
        (series.chart.options.drilldown || {}).allowPointDrilldown ===
            false) {
        // #5822, x changed
        series.xAxis.drilldownCategory(point.x, e);
    }
    else {
        point.runDrilldown(void 0, void 0, e);
    }
}
/** @private */
function onPointUpdate(e) {
    var point = this, options = e.options || {};
    if (options.drilldown && !point.unbindDrilldownClick) {
        // Add the click event to the point
        point.unbindDrilldownClick = addEvent(point, 'click', onPointClick);
    }
    else if (!options.drilldown &&
        options.drilldown !== void 0 &&
        point.unbindDrilldownClick) {
        point.unbindDrilldownClick = point.unbindDrilldownClick();
    }
}
/** @private */
function onSeriesAfterDrawDataLabels() {
    var series = this, chart = series.chart, css = chart.options.drilldown.activeDataLabelStyle, renderer = chart.renderer, styledMode = chart.styledMode;
    for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
        var point = _a[_i];
        var dataLabelsOptions = point.options.dataLabels, pointCSS = pick(point.dlOptions, dataLabelsOptions && dataLabelsOptions.style, {});
        if (point.drilldown && point.dataLabel) {
            if (css.color === 'contrast' && !styledMode) {
                pointCSS.color = renderer.getContrast(point.color || series.color);
            }
            if (dataLabelsOptions && dataLabelsOptions.color) {
                pointCSS.color = dataLabelsOptions.color;
            }
            point.dataLabel
                .addClass('highcharts-drilldown-data-label');
            if (!styledMode) {
                point.dataLabel
                    .css(css)
                    .css(pointCSS);
            }
        }
    }
}
/**
 * Mark the trackers with a pointer.
 * @private
 */
function onSeriesAfterDrawTracker() {
    var series = this, styledMode = series.chart.styledMode;
    for (var _i = 0, _a = series.points; _i < _a.length; _i++) {
        var point = _a[_i];
        if (point.drilldown && point.graphic) {
            applyCursorCSS(point.graphic, 'pointer', true, styledMode);
        }
    }
}
/** @private */
function pieAnimateDrilldown(init) {
    var series = this, chart = series.chart, points = series.points, level = chart.drilldownLevels[chart.drilldownLevels.length - 1], animationOptions = chart.options.drilldown.animation;
    if (series.is('item')) {
        animationOptions.duration = 0;
    }
    // Unable to drill down in the horizontal item series #13372
    if (series.center) {
        var animateFrom = level.shapeArgs, start = animateFrom.start, angle = animateFrom.end - start, startAngle = angle / series.points.length, styledMode = chart.styledMode;
        if (!init) {
            var animateTo = void 0, point = void 0;
            for (var i = 0, iEnd = points.length; i < iEnd; ++i) {
                point = points[i];
                animateTo = point.shapeArgs;
                if (!styledMode) {
                    animateFrom.fill = level.color;
                    animateTo.fill = point.color;
                }
                if (point.graphic) {
                    point.graphic.attr(merge(animateFrom, {
                        start: start + i * startAngle,
                        end: start + (i + 1) * startAngle
                    }))[animationOptions ? 'animate' : 'attr'](animateTo, animationOptions);
                }
            }
            if (chart.drilldown) {
                chart.drilldown.fadeInGroup(series.dataLabelsGroup);
            }
            // Reset to prototype
            delete series.animate;
        }
    }
}
/**
 * Perform drilldown on a point instance. The [drilldown](https://api.highcharts.com/highcharts/series.line.data.drilldown)
 * property must be set on the point options.
 *
 * To drill down multiple points in the same category, use
 * `Axis.drilldownCategory` instead.
 *
 * @requires  modules/drilldown
 *
 * @function Highcharts.Point#doDrilldown
 *
 * @sample {highcharts} highcharts/drilldown/programmatic
 *         Programmatic drilldown
 */
function pointDoDrilldown() {
    this.runDrilldown();
}
/** @private */
function pointRunDrilldown(holdRedraw, category, originalEvent) {
    var point = this, series = point.series, chart = series.chart, drilldown = chart.options.drilldown || {};
    var i = (drilldown.series || []).length, seriesOptions;
    if (!chart.ddDupes) {
        chart.ddDupes = [];
    }
    // Reset the color and symbol counters after every drilldown. (#19134)
    chart.colorCounter = chart.symbolCounter = 0;
    while (i-- && !seriesOptions) {
        if (drilldown.series &&
            drilldown.series[i].id === point.drilldown &&
            point.drilldown &&
            chart.ddDupes.indexOf(point.drilldown) === -1) {
            seriesOptions = drilldown.series[i];
            chart.ddDupes.push(point.drilldown);
        }
    }
    // Fire the event. If seriesOptions is undefined, the implementer can check
    // for seriesOptions, and call addSeriesAsDrilldown async if necessary.
    fireEvent(chart, 'drilldown', {
        point: point,
        seriesOptions: seriesOptions,
        category: category,
        originalEvent: originalEvent,
        points: (typeof category !== 'undefined' &&
            series.xAxis.getDDPoints(category).slice(0))
    }, function (e) {
        var chart = e.point.series && e.point.series.chart, seriesOptions = e.seriesOptions;
        if (chart && seriesOptions) {
            if (holdRedraw) {
                chart.addSingleSeriesAsDrilldown(e.point, seriesOptions);
            }
            else {
                chart.addSeriesAsDrilldown(e.point, seriesOptions);
            }
        }
    });
}
/* *
 *
 *  Default Export
 *
 * */
var DrilldownSeries = {
    compose: compose
};
export default DrilldownSeries;
