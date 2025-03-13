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
import DataLabel from '../../Core/Series/DataLabel.js';
import H from '../../Core/Globals.js';
var composed = H.composed, noop = H.noop;
import R from '../../Core/Renderer/RendererUtilities.js';
var distribute = R.distribute;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var Series = SeriesRegistry.series;
import U from '../../Core/Utilities.js';
var arrayMax = U.arrayMax, clamp = U.clamp, defined = U.defined, pick = U.pick, pushUnique = U.pushUnique, relativeLength = U.relativeLength;
/* *
 *
 *  Composition
 *
 * */
var ColumnDataLabel;
(function (ColumnDataLabel) {
    /* *
     *
     *  Constants
     *
     * */
    var dataLabelPositioners = {
        // Based on the value computed in Highcharts' distribute algorithm.
        radialDistributionY: function (point, dataLabel) {
            var _a;
            return (((_a = dataLabel.dataLabelPosition) === null || _a === void 0 ? void 0 : _a.top) || 0) +
                point.distributeBox.pos;
        },
        // Get the x - use the natural x position for labels near the top and
        // bottom, to prevent the top and botton slice connectors from touching
        // each other on either side. Based on the value computed in Highcharts'
        // distribute algorithm.
        radialDistributionX: function (series, point, y, naturalY, dataLabel) {
            var pos = dataLabel.dataLabelPosition;
            return series.getX(y < ((pos === null || pos === void 0 ? void 0 : pos.top) || 0) + 2 || y > ((pos === null || pos === void 0 ? void 0 : pos.bottom) || 0) - 2 ?
                naturalY :
                y, point.half, point, dataLabel);
        },
        // The dataLabels.distance determines the x position of the label
        justify: function (point, dataLabel, radius, seriesCenter) {
            var _a;
            return seriesCenter[0] + (point.half ? -1 : 1) *
                (radius + (((_a = dataLabel.dataLabelPosition) === null || _a === void 0 ? void 0 : _a.distance) || 0));
        },
        // Left edges of the left-half labels touch the left edge of the plot
        // area. Right edges of the right-half labels touch the right edge of
        // the plot area.
        alignToPlotEdges: function (dataLabel, half, plotWidth, plotLeft) {
            var dataLabelWidth = dataLabel.getBBox().width;
            return half ? dataLabelWidth + plotLeft :
                plotWidth - dataLabelWidth - plotLeft;
        },
        // Connectors of each side end in the same x position. Labels are
        // aligned to them. Left edge of the widest left-half label touches the
        // left edge of the plot area. Right edge of the widest right-half label
        // touches the right edge of the plot area.
        alignToConnectors: function (points, half, plotWidth, plotLeft) {
            var maxDataLabelWidth = 0, dataLabelWidth;
            // Find widest data label
            points.forEach(function (point) {
                dataLabelWidth = point.dataLabel.getBBox().width;
                if (dataLabelWidth > maxDataLabelWidth) {
                    maxDataLabelWidth = dataLabelWidth;
                }
            });
            return half ? maxDataLabelWidth + plotLeft :
                plotWidth - maxDataLabelWidth - plotLeft;
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /** @private */
    function compose(PieSeriesClass) {
        DataLabel.compose(Series);
        if (pushUnique(composed, 'PieDataLabel')) {
            var pieProto = PieSeriesClass.prototype;
            pieProto.dataLabelPositioners = dataLabelPositioners;
            pieProto.alignDataLabel = noop;
            pieProto.drawDataLabels = drawDataLabels;
            pieProto.getDataLabelPosition = getDataLabelPosition;
            pieProto.placeDataLabels = placeDataLabels;
            pieProto.verifyDataLabelOverflow = verifyDataLabelOverflow;
        }
    }
    ColumnDataLabel.compose = compose;
    /** @private */
    function getDataLabelPosition(point, distance) {
        var halfPI = Math.PI / 2, _a = point.shapeArgs || {}, _b = _a.start, start = _b === void 0 ? 0 : _b, _c = _a.end, end = _c === void 0 ? 0 : _c;
        var angle = point.angle || 0;
        // If a large slice is crossing the lowest point, prefer rendering it 45
        // degrees out at either lower right or lower left. That's where there's
        // most likely to be space available and avoid text being truncated
        // (#22100). Technically this logic should also apply to the top point,
        // but that is more of an edge case since the default start angle is at
        // the top.
        if (distance > 0 &&
            // Crossing the bottom
            start < halfPI && end > halfPI &&
            // Angle within the bottom quadrant
            angle > halfPI / 2 && angle < halfPI * 1.5) {
            angle = angle <= halfPI ?
                Math.max(halfPI / 2, (start + halfPI) / 2) :
                Math.min(halfPI * 1.5, (halfPI + end) / 2);
        }
        var _d = this, center = _d.center, options = _d.options, r = center[2] / 2, cosAngle = Math.cos(angle), sinAngle = Math.sin(angle), x = center[0] + cosAngle * r, y = center[1] + sinAngle * r, finalConnectorOffset = Math.min((options.slicedOffset || 0) + (options.borderWidth || 0), distance / 5); // #1678
        return {
            natural: {
                // Initial position of the data label - it's utilized for
                // finding the final position for the label
                x: x + cosAngle * distance,
                y: y + sinAngle * distance
            },
            computed: {
            // Used for generating connector path - initialized later in
            // drawDataLabels function x: undefined, y: undefined
            },
            // Left - pie on the left side of the data label
            // Right - pie on the right side of the data label
            // Center - data label overlaps the pie
            alignment: distance < 0 ? 'center' : point.half ? 'right' : 'left',
            connectorPosition: {
                angle: angle,
                breakAt: {
                    x: x + cosAngle * finalConnectorOffset,
                    y: y + sinAngle * finalConnectorOffset
                },
                touchingSliceAt: {
                    x: x,
                    y: y
                }
            },
            distance: distance
        };
    }
    /**
     * Override the base drawDataLabels method by pie specific functionality
     * @private
     */
    function drawDataLabels() {
        var _this = this;
        var _a;
        var series = this, points = series.points, chart = series.chart, plotWidth = chart.plotWidth, plotHeight = chart.plotHeight, plotLeft = chart.plotLeft, maxWidth = Math.round(chart.chartWidth / 3), seriesCenter = series.center, radius = seriesCenter[2] / 2, centerY = seriesCenter[1], halves = [
            [], // Right
            [] // Left
        ], overflow = [0, 0, 0, 0], // Top, right, bottom, left
        dataLabelPositioners = series.dataLabelPositioners;
        var connector, dataLabelWidth, labelHeight, maxLabelDistance = 0;
        // Get out if not enabled
        if (!series.visible || !((_a = series.hasDataLabels) === null || _a === void 0 ? void 0 : _a.call(series))) {
            return;
        }
        // Reset all labels that have been shortened
        points.forEach(function (point) {
            (point.dataLabels || []).forEach(function (dataLabel) {
                if (dataLabel.shortened) {
                    dataLabel
                        .attr({
                        width: 'auto'
                    }).css({
                        width: 'auto',
                        textOverflow: 'clip'
                    });
                    dataLabel.shortened = false;
                }
            });
        });
        // Run parent method
        Series.prototype.drawDataLabels.apply(series);
        points.forEach(function (point) {
            (point.dataLabels || []).forEach(function (dataLabel, i) {
                var _a;
                var r = seriesCenter[2] / 2, dataLabelOptions = dataLabel.options, distance = relativeLength((dataLabelOptions === null || dataLabelOptions === void 0 ? void 0 : dataLabelOptions.distance) || 0, r);
                // Arrange points for collision detection
                if (i === 0) {
                    halves[point.half].push(point);
                }
                // Avoid long labels squeezing the pie size too far down
                if (!defined((_a = dataLabelOptions === null || dataLabelOptions === void 0 ? void 0 : dataLabelOptions.style) === null || _a === void 0 ? void 0 : _a.width)) {
                    if (dataLabel.getBBox().width > maxWidth) {
                        dataLabel.css({
                            // Use a fraction of the maxWidth to avoid wrapping
                            // close to the end of the string.
                            width: Math.round(maxWidth * 0.7) + 'px'
                        });
                        dataLabel.shortened = true;
                    }
                }
                dataLabel.dataLabelPosition = _this.getDataLabelPosition(point, distance);
                maxLabelDistance = Math.max(maxLabelDistance, distance);
            });
        });
        /* Loop over the points in each half, starting from the top and bottom
         * of the pie to detect overlapping labels.
         */
        halves.forEach(function (points, halfIdx) {
            var length = points.length, positions = [];
            var top, bottom, size = 0, distributionLength;
            if (!length) {
                return;
            }
            // Sort by angle
            series.sortByAngle(points, halfIdx - 0.5);
            // Only do anti-collision when we have dataLabels outside the pie
            // and have connectors. (#856)
            if (maxLabelDistance > 0) {
                top = Math.max(0, centerY - radius - maxLabelDistance);
                bottom = Math.min(centerY + radius + maxLabelDistance, chart.plotHeight);
                points.forEach(function (point) {
                    // Check if specific points' label is outside the pie
                    (point.dataLabels || []).forEach(function (dataLabel) {
                        var _a;
                        var labelPosition = dataLabel.dataLabelPosition;
                        if (labelPosition &&
                            labelPosition.distance > 0) {
                            // The point.top depends on point.labelDistance
                            // value. Used for calculation of y value in getX
                            // method
                            labelPosition.top = Math.max(0, centerY - radius - labelPosition.distance);
                            labelPosition.bottom = Math.min(centerY + radius + labelPosition.distance, chart.plotHeight);
                            size = dataLabel.getBBox().height || 21;
                            dataLabel.lineHeight = chart.renderer.fontMetrics(dataLabel.text || dataLabel).h + 2 * dataLabel.padding;
                            point.distributeBox = {
                                target: ((((_a = dataLabel.dataLabelPosition) === null || _a === void 0 ? void 0 : _a.natural.y) || 0) -
                                    labelPosition.top +
                                    dataLabel.lineHeight / 2),
                                size: size,
                                rank: point.y
                            };
                            positions.push(point.distributeBox);
                        }
                    });
                });
                distributionLength = bottom + size - top;
                distribute(positions, distributionLength, distributionLength / 5);
                // Uncomment this to visualize the boxes
                /*
                points.forEach((point): void => {
                    const box = point.distributeBox;
                    point.dlBox?.destroy();
                    if (box?.pos) {
                        point.dlBox = chart.renderer.rect(
                            chart.plotLeft + this.center[0] + (
                                halfIdx ?
                                    -this.center[2] / 2 - 100 :
                                    this.center[2] / 2
                            ),
                            chart.plotTop + box.pos,
                            100,
                            box.size
                        )
                            .attr({
                                stroke: 'silver',
                                'stroke-width': 1
                            })
                            .add();
                    }
                });
                // */
            }
            // Now the used slots are sorted, fill them up sequentially
            points.forEach(function (point) {
                (point.dataLabels || []).forEach(function (dataLabel) {
                    var dataLabelOptions = (dataLabel.options || {}), distributeBox = point.distributeBox, labelPosition = dataLabel.dataLabelPosition, naturalY = (labelPosition === null || labelPosition === void 0 ? void 0 : labelPosition.natural.y) || 0, connectorPadding = dataLabelOptions
                        .connectorPadding || 0, lineHeight = dataLabel.lineHeight || 21, bBox = dataLabel.getBBox(), topOffset = (lineHeight - bBox.height) / 2;
                    var x = 0, y = naturalY, visibility = 'inherit';
                    if (labelPosition) {
                        if (positions &&
                            defined(distributeBox) &&
                            labelPosition.distance > 0) {
                            if (typeof distributeBox.pos === 'undefined') {
                                visibility = 'hidden';
                            }
                            else {
                                labelHeight = distributeBox.size;
                                // Find label's y position
                                y = dataLabelPositioners
                                    .radialDistributionY(point, dataLabel);
                            }
                        }
                        // Find label's x position. The justify option is
                        // undocumented in the API - preserve support for it
                        if (dataLabelOptions.justify) {
                            x = dataLabelPositioners.justify(point, dataLabel, radius, seriesCenter);
                        }
                        else {
                            switch (dataLabelOptions.alignTo) {
                                case 'connectors':
                                    x = dataLabelPositioners.alignToConnectors(points, halfIdx, plotWidth, plotLeft);
                                    break;
                                case 'plotEdges':
                                    x = dataLabelPositioners.alignToPlotEdges(dataLabel, halfIdx, plotWidth, plotLeft);
                                    break;
                                default:
                                    x = dataLabelPositioners.radialDistributionX(series, point, y - topOffset, naturalY, dataLabel);
                            }
                        }
                        // Record the placement and visibility
                        labelPosition.attribs = {
                            visibility: visibility,
                            align: labelPosition.alignment
                        };
                        labelPosition.posAttribs = {
                            x: x +
                                (dataLabelOptions.x || 0) + // (#12985)
                                ({
                                    left: connectorPadding,
                                    right: -connectorPadding
                                }[labelPosition.alignment] || 0),
                            y: y +
                                (dataLabelOptions.y || 0) - // (#12985)
                                // Vertically center
                                lineHeight / 2
                        };
                        labelPosition.computed.x = x;
                        labelPosition.computed.y = y - topOffset;
                        // Detect overflowing data labels
                        if (pick(dataLabelOptions.crop, true)) {
                            dataLabelWidth = dataLabel.getBBox().width;
                            var sideOverflow = void 0;
                            // Overflow left
                            if (x - dataLabelWidth < connectorPadding &&
                                halfIdx === 1 // Left half
                            ) {
                                sideOverflow = Math.round(dataLabelWidth - x + connectorPadding);
                                overflow[3] = Math.max(sideOverflow, overflow[3]);
                                // Overflow right
                            }
                            else if (x + dataLabelWidth >
                                plotWidth - connectorPadding &&
                                halfIdx === 0 // Right half
                            ) {
                                sideOverflow = Math.round(x +
                                    dataLabelWidth -
                                    plotWidth +
                                    connectorPadding);
                                overflow[1] = Math.max(sideOverflow, overflow[1]);
                            }
                            // Overflow top
                            if (y - labelHeight / 2 < 0) {
                                overflow[0] = Math.max(Math.round(-y + labelHeight / 2), overflow[0]);
                                // Overflow left
                            }
                            else if (y + labelHeight / 2 > plotHeight) {
                                overflow[2] = Math.max(Math.round(y + labelHeight / 2 - plotHeight), overflow[2]);
                            }
                            labelPosition.sideOverflow = sideOverflow;
                        }
                    }
                }); // For each data label of the point
            }); // For each point
        }); // For each half
        // Do not apply the final placement and draw the connectors until we
        // have verified that labels are not spilling over.
        if (arrayMax(overflow) === 0 ||
            this.verifyDataLabelOverflow(overflow)) {
            // Place the labels in the final position
            this.placeDataLabels();
            this.points.forEach(function (point) {
                (point.dataLabels || []).forEach(function (dataLabel) {
                    var _a;
                    // #8864: every connector can have individual options
                    var _b = (dataLabel.options || {}), connectorColor = _b.connectorColor, _c = _b.connectorWidth, connectorWidth = _c === void 0 ? 1 : _c, labelPosition = dataLabel.dataLabelPosition;
                    // Draw the connector
                    if (connectorWidth) {
                        var isNew = void 0;
                        connector = dataLabel.connector;
                        if (labelPosition && labelPosition.distance > 0) {
                            isNew = !connector;
                            if (!connector) {
                                dataLabel.connector = connector = chart.renderer
                                    .path()
                                    .addClass('highcharts-data-label-connector ' +
                                    ' highcharts-color-' +
                                    point.colorIndex +
                                    (point.className ?
                                        ' ' + point.className :
                                        ''))
                                    .add(series.dataLabelsGroup);
                            }
                            if (!chart.styledMode) {
                                connector.attr({
                                    'stroke-width': connectorWidth,
                                    'stroke': (connectorColor ||
                                        point.color ||
                                        "#666666" /* Palette.neutralColor60 */)
                                });
                            }
                            connector[isNew ? 'attr' : 'animate']({
                                d: point.getConnectorPath(dataLabel)
                            });
                            connector.attr({
                                visibility: (_a = labelPosition.attribs) === null || _a === void 0 ? void 0 : _a.visibility
                            });
                        }
                        else if (connector) {
                            dataLabel.connector = connector.destroy();
                        }
                    }
                });
            });
        }
    }
    /**
     * Perform the final placement of the data labels after we have verified
     * that they fall within the plot area.
     * @private
     */
    function placeDataLabels() {
        this.points.forEach(function (point) {
            (point.dataLabels || []).forEach(function (dataLabel) {
                var _a;
                var labelPosition = dataLabel.dataLabelPosition;
                if (labelPosition) {
                    // Shorten data labels with ellipsis if they still overflow
                    // after the pie has reached minSize (#223).
                    if (labelPosition.sideOverflow) {
                        dataLabel.css({
                            width: (Math.max(dataLabel.getBBox().width -
                                labelPosition.sideOverflow, 0)) + 'px',
                            textOverflow: ((((_a = dataLabel.options) === null || _a === void 0 ? void 0 : _a.style) || {})
                                .textOverflow ||
                                'ellipsis')
                        });
                        dataLabel.shortened = true;
                    }
                    dataLabel.attr(labelPosition.attribs);
                    dataLabel[dataLabel.moved ? 'animate' : 'attr'](labelPosition.posAttribs);
                    dataLabel.moved = true;
                }
                else if (dataLabel) {
                    dataLabel.attr({ y: -9999 });
                }
            });
            // Clear for update
            delete point.distributeBox;
        }, this);
    }
    /**
     * Verify whether the data labels are allowed to draw, or we should run more
     * translation and data label positioning to keep them inside the plot area.
     * Returns true when data labels are ready to draw.
     * @private
     */
    function verifyDataLabelOverflow(overflow) {
        var center = this.center, options = this.options, centerOption = options.center, minSize = options.minSize || 80;
        var newSize = minSize, 
        // If a size is set, return true and don't try to shrink the pie
        // to fit the labels.
        ret = options.size !== null;
        if (!ret) {
            // Handle horizontal size and center
            if (centerOption[0] !== null) { // Fixed center
                newSize = Math.max(center[2] -
                    Math.max(overflow[1], overflow[3]), minSize);
            }
            else { // Auto center
                newSize = Math.max(
                // Horizontal overflow
                center[2] - overflow[1] - overflow[3], minSize);
                // Horizontal center
                center[0] += (overflow[3] - overflow[1]) / 2;
            }
            // Handle vertical size and center
            if (centerOption[1] !== null) { // Fixed center
                newSize = clamp(newSize, minSize, center[2] - Math.max(overflow[0], overflow[2]));
            }
            else { // Auto center
                newSize = clamp(newSize, minSize, 
                // Vertical overflow
                center[2] - overflow[0] - overflow[2]);
                // Vertical center
                center[1] += (overflow[0] - overflow[2]) / 2;
            }
            // If the size must be decreased, we need to run translate and
            // drawDataLabels again
            if (newSize < center[2]) {
                center[2] = newSize;
                center[3] = Math.min(// #3632
                options.thickness ?
                    Math.max(0, newSize - options.thickness * 2) :
                    Math.max(0, relativeLength(options.innerSize || 0, newSize)), newSize); // #6647
                this.translate(center);
                if (this.drawDataLabels) {
                    this.drawDataLabels();
                }
                // Else, return true to indicate that the pie and its labels is
                // within the plot area
            }
            else {
                ret = true;
            }
        }
        return ret;
    }
})(ColumnDataLabel || (ColumnDataLabel = {}));
/* *
 *
 *  Default Export
 *
 * */
export default ColumnDataLabel;
