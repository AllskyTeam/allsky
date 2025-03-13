/* *
 *
 *  Timeline Series.
 *
 *  (c) 2010-2024 Highsoft AS
 *
 *  Author: Daniel Studencki
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import Point from '../../Core/Series/Point.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
const { line: { prototype: { pointClass: LinePoint } }, pie: { prototype: { pointClass: PiePoint } } } = SeriesRegistry.seriesTypes;
import U from '../../Core/Utilities.js';
const { defined, isNumber, merge, objectEach, pick } = U;
/* *
 *
 *  Class
 *
 * */
class TimelinePoint extends LinePoint {
    /* *
     *
     *  Functions
     *
     * */
    alignConnector() {
        const point = this, series = point.series, dataLabel = point.dataLabel, connector = dataLabel.connector, dlOptions = (dataLabel.options || {}), connectorWidth = dlOptions.connectorWidth || 0, chart = point.series.chart, bBox = connector.getBBox(), plotPos = {
            x: bBox.x + (dataLabel.translateX || 0),
            y: bBox.y + (dataLabel.translateY || 0)
        };
        // Include a half of connector width in order to run animation,
        // when connectors are aligned to the plot area edge.
        if (chart.inverted) {
            plotPos.y -= connectorWidth / 2;
        }
        else {
            plotPos.x += connectorWidth / 2;
        }
        const isVisible = chart.isInsidePlot(plotPos.x, plotPos.y);
        connector[isVisible ? 'animate' : 'attr']({
            d: point.getConnectorPath()
        });
        connector.addClass('highcharts-color-' + point.colorIndex);
        if (!series.chart.styledMode) {
            connector.attr({
                stroke: dlOptions.connectorColor || point.color,
                'stroke-width': dlOptions.connectorWidth,
                opacity: dataLabel[defined(dataLabel.newOpacity) ? 'newOpacity' : 'opacity']
            });
        }
    }
    drawConnector() {
        const point = this, { dataLabel, series } = point;
        if (dataLabel) {
            if (!dataLabel.connector) {
                dataLabel.connector = series.chart.renderer
                    .path(point.getConnectorPath())
                    .attr({
                    zIndex: -1
                })
                    .add(dataLabel);
            }
            if (point.series.chart.isInsidePlot(// #10507
            dataLabel.x || 0, dataLabel.y || 0)) {
                point.alignConnector();
            }
        }
    }
    getConnectorPath() {
        const { plotX = 0, plotY = 0, series, dataLabel } = this, chart = series.chart, xAxisLen = series.xAxis.len, inverted = chart.inverted, direction = inverted ? 'x2' : 'y2';
        if (dataLabel) {
            const targetDLPos = dataLabel.targetPosition, negativeDistance = ((dataLabel.alignAttr || dataLabel)[direction[0]] <
                series.yAxis.len / 2);
            let coords = {
                x1: plotX,
                y1: plotY,
                x2: plotX,
                y2: isNumber(targetDLPos.y) ? targetDLPos.y : dataLabel.y
            };
            // Recalculate coords when the chart is inverted.
            if (inverted) {
                coords = {
                    x1: plotY,
                    y1: xAxisLen - plotX,
                    x2: targetDLPos.x || dataLabel.x,
                    y2: xAxisLen - plotX
                };
            }
            // Subtract data label width or height from expected coordinate so
            // that the connector would start from the appropriate edge.
            if (negativeDistance) {
                coords[direction] += dataLabel[inverted ? 'width' : 'height'] || 0;
            }
            // Change coordinates so that they will be relative to data label.
            objectEach(coords, (_coord, i) => {
                coords[i] -= (dataLabel.alignAttr || dataLabel)[i[0]];
            });
            return chart.renderer.crispLine([
                ['M', coords.x1, coords.y1],
                ['L', coords.x2, coords.y2]
            ], dataLabel.options?.connectorWidth || 0);
        }
        return [];
    }
    constructor(series, options) {
        super(series, options);
        this.name ?? (this.name = 'Event');
        this.y = 1;
    }
    isValid() {
        return this.options.y !== null;
    }
    setState() {
        const proceed = super.setState;
        // Prevent triggering the setState method on null points.
        if (!this.isNull) {
            proceed.apply(this, arguments);
        }
    }
    setVisible(visible, redraw) {
        const point = this, series = point.series;
        redraw = pick(redraw, series.options.ignoreHiddenPoint);
        PiePoint.prototype.setVisible.call(point, visible, false);
        // Process new data
        series.processData();
        if (redraw) {
            series.chart.redraw();
        }
    }
    applyOptions(options, x) {
        options = Point.prototype.optionsToObject.call(this, options);
        this.userDLOptions = merge(this.userDLOptions, options.dataLabels);
        return super.applyOptions(options, x);
    }
}
/* *
 *
 *  Default Export
 *
 * */
export default TimelinePoint;
