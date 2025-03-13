/* *
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import Chart from '../../../Core/Chart/Chart.js';
import SeriesRegistry from '../../../Core/Series/SeriesRegistry.js';
const { line: LineSeries } = SeriesRegistry.seriesTypes;
import U from '../../../Core/Utilities.js';
const { addEvent, fireEvent, error, extend, isArray, merge, pick } = U;
/**
 *
 * Return the parent series values in the legacy two-dimensional yData
 * format
 * @private
 */
const tableToMultiYData = (series, processed) => {
    const yData = [], pointArrayMap = series.pointArrayMap, table = processed && series.dataTable.modified || series.dataTable;
    if (!pointArrayMap) {
        return series.getColumn('y', processed);
    }
    const columns = pointArrayMap.map((key) => series.getColumn(key, processed));
    for (let i = 0; i < table.rowCount; i++) {
        const values = pointArrayMap.map((key, colIndex) => columns[colIndex]?.[i] || 0);
        yData.push(values);
    }
    return yData;
};
/* *
 *
 *  Class
 *
 * */
/**
 * The SMA series type.
 *
 * @private
 */
class SMAIndicator extends LineSeries {
    /* *
     *
     *  Functions
     *
     * */
    /**
     * @private
     */
    destroy() {
        this.dataEventsToUnbind.forEach(function (unbinder) {
            unbinder();
        });
        super.destroy.apply(this, arguments);
    }
    /**
     * @private
     */
    getName() {
        const params = [];
        let name = this.name;
        if (!name) {
            (this.nameComponents || []).forEach(function (component, index) {
                params.push(this.options.params[component] +
                    pick(this.nameSuffixes[index], ''));
            }, this);
            name = (this.nameBase || this.type.toUpperCase()) +
                (this.nameComponents ? ' (' + params.join(', ') + ')' : '');
        }
        return name;
    }
    /**
     * @private
     */
    getValues(series, params) {
        const period = params.period, xVal = series.xData || [], yVal = series.yData, yValLen = yVal.length, SMA = [], xData = [], yData = [];
        let i, index = -1, range = 0, SMAPoint, sum = 0;
        if (xVal.length < period) {
            return;
        }
        // Switch index for OHLC / Candlestick / Arearange
        if (isArray(yVal[0])) {
            index = params.index ? params.index : 0;
        }
        // Accumulate first N-points
        while (range < period - 1) {
            sum += index < 0 ? yVal[range] : yVal[range][index];
            range++;
        }
        // Calculate value one-by-one for each period in visible data
        for (i = range; i < yValLen; i++) {
            sum += index < 0 ? yVal[i] : yVal[i][index];
            SMAPoint = [xVal[i], sum / period];
            SMA.push(SMAPoint);
            xData.push(SMAPoint[0]);
            yData.push(SMAPoint[1]);
            sum -= (index < 0 ?
                yVal[i - range] :
                yVal[i - range][index]);
        }
        return {
            values: SMA,
            xData: xData,
            yData: yData
        };
    }
    /**
     * @private
     */
    init(chart, options) {
        const indicator = this;
        super.init.call(indicator, chart, options);
        // Only after series are linked indicator can be processed.
        const linkedSeriesUnbiner = addEvent(Chart, 'afterLinkSeries', function ({ isUpdating }) {
            // #18643 indicator shouldn't recalculate
            // values while series updating.
            if (isUpdating) {
                return;
            }
            const hasEvents = !!indicator.dataEventsToUnbind.length;
            if (indicator.linkedParent) {
                if (!hasEvents) {
                    // No matter which indicator, always recalculate after
                    // updating the data.
                    indicator.dataEventsToUnbind.push(addEvent(indicator.linkedParent, 'updatedData', function () {
                        indicator.recalculateValues();
                    }));
                    // Some indicators (like VBP) requires an additional
                    // event (afterSetExtremes) to properly show the data.
                    if (indicator.calculateOn.xAxis) {
                        indicator.dataEventsToUnbind.push(addEvent(indicator.linkedParent.xAxis, indicator.calculateOn.xAxis, function () {
                            indicator.recalculateValues();
                        }));
                    }
                }
                // Most indicators are being calculated on chart's init.
                if (indicator.calculateOn.chart === 'init') {
                    // When closestPointRange is set, it is an indication
                    // that `Series.processData` has run. If it hasn't we
                    // need to `recalculateValues`.
                    if (!indicator.closestPointRange) {
                        indicator.recalculateValues();
                    }
                }
                else if (!hasEvents) {
                    // Some indicators (like VBP) has to recalculate their
                    // values after other chart's events (render).
                    const unbinder = addEvent(indicator.chart, indicator.calculateOn.chart, function () {
                        indicator.recalculateValues();
                        // Call this just once.
                        unbinder();
                    });
                }
            }
            else {
                return error('Series ' +
                    indicator.options.linkedTo +
                    ' not found! Check `linkedTo`.', false, chart);
            }
        }, {
            order: 0
        });
        // Make sure we find series which is a base for an indicator
        // chart.linkSeries();
        indicator.dataEventsToUnbind = [];
        indicator.eventsToUnbind.push(linkedSeriesUnbiner);
    }
    /**
     * @private
     */
    recalculateValues() {
        const croppedDataValues = [], indicator = this, table = this.dataTable, oldData = indicator.points || [], oldDataLength = indicator.dataTable.rowCount, emptySet = {
            values: [],
            xData: [],
            yData: []
        };
        let overwriteData = true, oldFirstPointIndex, oldLastPointIndex, min, max;
        // For the newer data table, temporarily set the parent series `yData`
        // to the legacy format that is documented for custom indicators, and
        // get the xData from the data table
        const yData = indicator.linkedParent.yData, processedYData = indicator.linkedParent.processedYData;
        indicator.linkedParent.xData = indicator.linkedParent
            .getColumn('x');
        indicator.linkedParent.yData = tableToMultiYData(indicator.linkedParent);
        indicator.linkedParent.processedYData = tableToMultiYData(indicator.linkedParent, true);
        // Updating an indicator with redraw=false may destroy data.
        // If there will be a following update for the parent series,
        // we will try to access Series object without any properties
        // (except for prototyped ones). This is what happens
        // for example when using Axis.setDataGrouping(). See #16670
        const processedData = indicator.linkedParent.options &&
            // #18176, #18177 indicators should work with empty dataset
            indicator.linkedParent.dataTable.rowCount ?
            (indicator.getValues(indicator.linkedParent, indicator.options.params) || emptySet) : emptySet;
        // Reset
        delete indicator.linkedParent.xData;
        indicator.linkedParent.yData = yData;
        indicator.linkedParent.processedYData = processedYData;
        const pointArrayMap = indicator.pointArrayMap || ['y'], valueColumns = {};
        // Split legacy twodimensional values into value columns
        processedData.yData
            .forEach((values) => {
            pointArrayMap.forEach((key, index) => {
                const column = valueColumns[key] || [];
                column.push(isArray(values) ? values[index] : values);
                if (!valueColumns[key]) {
                    valueColumns[key] = column;
                }
            });
        });
        // We need to update points to reflect changes in all,
        // x and y's, values. However, do it only for non-grouped
        // data - grouping does it for us (#8572)
        if (oldDataLength &&
            !indicator.hasGroupedData &&
            indicator.visible &&
            indicator.points) {
            // When data is cropped update only avaliable points (#9493)
            if (indicator.cropped) {
                if (indicator.xAxis) {
                    min = indicator.xAxis.min;
                    max = indicator.xAxis.max;
                }
                const croppedData = indicator.cropData(table, min, max);
                const keys = ['x', ...(indicator.pointArrayMap || ['y'])];
                for (let i = 0; i < (croppedData.modified?.rowCount || 0); i++) {
                    const values = keys.map((key) => this.getColumn(key)[i] || 0);
                    croppedDataValues.push(values);
                }
                const indicatorXData = indicator.getColumn('x');
                oldFirstPointIndex = processedData.xData.indexOf(indicatorXData[0]);
                oldLastPointIndex = processedData.xData.indexOf(indicatorXData[indicatorXData.length - 1]);
                // Check if indicator points should be shifted (#8572)
                if (oldFirstPointIndex === -1 &&
                    oldLastPointIndex === processedData.xData.length - 2) {
                    if (croppedDataValues[0][0] === oldData[0].x) {
                        croppedDataValues.shift();
                    }
                }
                indicator.updateData(croppedDataValues);
            }
            else if (indicator.updateAllPoints || // #18710
                // Omit addPoint() and removePoint() cases
                processedData.xData.length !== oldDataLength - 1 &&
                    processedData.xData.length !== oldDataLength + 1) {
                overwriteData = false;
                indicator.updateData(processedData.values);
            }
        }
        if (overwriteData) {
            table.setColumns({
                ...valueColumns,
                x: processedData.xData
            });
            indicator.options.data = processedData.values;
        }
        if (indicator.calculateOn.xAxis &&
            indicator.getColumn('x', true).length) {
            indicator.isDirty = true;
            indicator.redraw();
        }
        indicator.isDirtyData = !!indicator.linkedSeries.length;
        fireEvent(indicator, 'updatedData'); // #18689
    }
    /**
     * @private
     */
    processData() {
        const series = this, compareToMain = series.options.compareToMain, linkedParent = series.linkedParent;
        super.processData.apply(series, arguments);
        if (series.dataModify &&
            linkedParent &&
            linkedParent.dataModify &&
            linkedParent.dataModify.compareValue &&
            compareToMain) {
            series.dataModify.compareValue =
                linkedParent.dataModify.compareValue;
        }
        return;
    }
}
/* *
 *
 *  Static Properties
 *
 * */
/**
 * The parameter allows setting line series type and use OHLC indicators.
 * Data in OHLC format is required.
 *
 * @sample {highstock} stock/indicators/use-ohlc-data
 *         Use OHLC data format to plot line chart
 *
 * @type      {boolean}
 * @product   highstock
 * @apioption plotOptions.line.useOhlcData
 */
/**
 * Simple moving average indicator (SMA). This series requires `linkedTo`
 * option to be set.
 *
 * @sample stock/indicators/sma
 *         Simple moving average indicator
 *
 * @extends      plotOptions.line
 * @since        6.0.0
 * @excluding    allAreas, colorAxis, dragDrop, joinBy, keys,
 *               navigatorOptions, pointInterval, pointIntervalUnit,
 *               pointPlacement, pointRange, pointStart, showInNavigator,
 *               stacking, useOhlcData
 * @product      highstock
 * @requires     stock/indicators/indicators
 * @optionparent plotOptions.sma
 */
SMAIndicator.defaultOptions = merge(LineSeries.defaultOptions, {
    /**
     * The name of the series as shown in the legend, tooltip etc. If not
     * set, it will be based on a technical indicator type and default
     * params.
     *
     * @type {string}
     */
    name: void 0,
    tooltip: {
        /**
         * Number of decimals in indicator series.
         */
        valueDecimals: 4
    },
    /**
     * The main series ID that indicator will be based on. Required for this
     * indicator.
     *
     * @type {string}
     */
    linkedTo: void 0,
    /**
     * Whether to compare indicator to the main series values
     * or indicator values.
     *
     * @sample {highstock} stock/plotoptions/series-comparetomain/
     *         Difference between comparing SMA values to the main series
     *         and its own values.
     *
     * @type {boolean}
     */
    compareToMain: false,
    /**
     * Parameters used in calculation of regression series' points.
     */
    params: {
        /**
         * The point index which indicator calculations will base. For
         * example using OHLC data, index=2 means the indicator will be
         * calculated using Low values.
         */
        index: 3,
        /**
         * The base period for indicator calculations. This is the number of
         * data points which are taken into account for the indicator
         * calculations.
         */
        period: 14
    }
});
extend(SMAIndicator.prototype, {
    calculateOn: {
        chart: 'init'
    },
    hasDerivedData: true,
    nameComponents: ['period'],
    nameSuffixes: [], // E.g. Zig Zag uses extra '%'' in the legend name
    useCommonDataGrouping: true
});
SeriesRegistry.registerSeriesType('sma', SMAIndicator);
/* *
 *
 *  Default Export
 *
 * */
export default SMAIndicator;
/* *
 *
 *  API Options
 *
 * */
/**
 * A `SMA` series. If the [type](#series.sma.type) option is not specified, it
 * is inherited from [chart.type](#chart.type).
 *
 * @extends   series,plotOptions.sma
 * @since     6.0.0
 * @product   highstock
 * @excluding dataParser, dataURL, useOhlcData
 * @requires  stock/indicators/indicators
 * @apioption series.sma
 */
(''); // Adds doclet above to the transpiled file
