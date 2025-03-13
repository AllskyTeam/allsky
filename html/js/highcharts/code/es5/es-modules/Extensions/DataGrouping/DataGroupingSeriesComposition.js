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
import ApproximationRegistry from './ApproximationRegistry.js';
import DataGroupingDefaults from './DataGroupingDefaults.js';
import DataTableCore from '../../Data/DataTableCore.js';
import DateTimeAxis from '../../Core/Axis/DateTimeAxis.js';
import D from '../../Core/Defaults.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var seriesProto = SeriesRegistry.series.prototype;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, error = U.error, extend = U.extend, isNumber = U.isNumber, merge = U.merge, pick = U.pick, splat = U.splat;
/* *
 *
 *  Constants
 *
 * */
var baseGeneratePoints = seriesProto.generatePoints;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function adjustExtremes(xAxis, groupedXData) {
    // Make sure the X axis extends to show the first group (#2533)
    // But only for visible series (#5493, #6393)
    if (defined(groupedXData[0]) &&
        isNumber(xAxis.min) &&
        isNumber(xAxis.dataMin) &&
        groupedXData[0] < xAxis.min) {
        if ((!defined(xAxis.options.min) &&
            xAxis.min <= xAxis.dataMin) ||
            xAxis.min === xAxis.dataMin) {
            xAxis.min = Math.min(groupedXData[0], xAxis.min);
        }
        xAxis.dataMin = Math.min(groupedXData[0], xAxis.dataMin);
    }
    // When the last anchor set, change the extremes that
    // the last point is visible (#12455).
    if (defined(groupedXData[groupedXData.length - 1]) &&
        isNumber(xAxis.max) &&
        isNumber(xAxis.dataMax) &&
        groupedXData[groupedXData.length - 1] > xAxis.max) {
        if ((!defined(xAxis.options.max) &&
            isNumber(xAxis.dataMax) &&
            xAxis.max >= xAxis.dataMax) || xAxis.max === xAxis.dataMax) {
            xAxis.max = Math.max(groupedXData[groupedXData.length - 1], xAxis.max);
        }
        xAxis.dataMax = Math.max(groupedXData[groupedXData.length - 1], xAxis.dataMax);
    }
}
/**
 * @private
 */
function anchorPoints(series, groupedXData, xMax) {
    var options = series.options, dataGroupingOptions = options.dataGrouping, totalRange = (series.currentDataGrouping && series.currentDataGrouping.gapSize), xData = series.getColumn('x');
    if (!(dataGroupingOptions &&
        xData.length &&
        totalRange &&
        series.groupMap)) {
        return;
    }
    var groupedDataLastIndex = groupedXData.length - 1, anchor = dataGroupingOptions.anchor, firstAnchor = dataGroupingOptions.firstAnchor, lastAnchor = dataGroupingOptions.lastAnchor;
    var anchorIndexIterator = groupedXData.length - 1, anchorFirstIndex = 0;
    // Change the first point position, but only when it is
    // the first point in the data set not in the current zoom.
    if (firstAnchor && xData[0] >= groupedXData[0]) {
        anchorFirstIndex++;
        var groupStart = series.groupMap[0].start, groupLength = series.groupMap[0].length;
        var firstGroupEnd = void 0;
        if (isNumber(groupStart) && isNumber(groupLength)) {
            firstGroupEnd = groupStart + (groupLength - 1);
        }
        groupedXData[0] = {
            start: groupedXData[0],
            middle: groupedXData[0] + 0.5 * totalRange,
            end: groupedXData[0] + totalRange,
            firstPoint: xData[0],
            lastPoint: firstGroupEnd && xData[firstGroupEnd]
        }[firstAnchor];
    }
    // Change the last point position but only when it is
    // the last point in the data set not in the current zoom,
    // or if it is not the 1st point simultaneously.
    if (groupedDataLastIndex > 0 &&
        lastAnchor &&
        totalRange &&
        groupedXData[groupedDataLastIndex] >= xMax - totalRange) {
        anchorIndexIterator--;
        var lastGroupStart = series.groupMap[series.groupMap.length - 1].start;
        groupedXData[groupedDataLastIndex] = {
            start: groupedXData[groupedDataLastIndex],
            middle: groupedXData[groupedDataLastIndex] + 0.5 * totalRange,
            end: groupedXData[groupedDataLastIndex] + totalRange,
            firstPoint: lastGroupStart && xData[lastGroupStart],
            lastPoint: xData[xData.length - 1]
        }[lastAnchor];
    }
    if (anchor && anchor !== 'start') {
        var shiftInterval = (totalRange *
            { middle: 0.5, end: 1 }[anchor]);
        // Anchor the rest of the points apart from the ones, that were
        // previously moved.
        while (anchorIndexIterator >= anchorFirstIndex) {
            groupedXData[anchorIndexIterator] += shiftInterval;
            anchorIndexIterator--;
        }
    }
}
/**
 * For the processed data, calculate the grouped data if needed.
 *
 * @private
 * @function Highcharts.Series#applyGrouping
 */
function applyGrouping(hasExtremesChanged) {
    var series = this, chart = series.chart, options = series.options, dataGroupingOptions = options.dataGrouping, groupingEnabled = series.allowDG !== false && dataGroupingOptions &&
        pick(dataGroupingOptions.enabled, chart.options.isStock), reserveSpace = series.reserveSpace(), lastDataGrouping = this.currentDataGrouping;
    var currentDataGrouping, croppedData, revertRequireSorting = false;
    // Data needs to be sorted for dataGrouping
    if (groupingEnabled && !series.requireSorting) {
        series.requireSorting = revertRequireSorting = true;
    }
    // Skip if skipDataGrouping method returns false or if grouping is disabled
    // (in that order).
    var skip = skipDataGrouping(series, hasExtremesChanged) === false || !groupingEnabled;
    // Revert original requireSorting value if changed
    if (revertRequireSorting) {
        series.requireSorting = false;
    }
    if (skip) {
        return;
    }
    series.destroyGroupedData();
    var table = dataGroupingOptions.groupAll ?
        series.dataTable :
        series.dataTable.modified || series.dataTable, processedXData = series.getColumn('x', !dataGroupingOptions.groupAll), xData = processedXData, plotSizeX = chart.plotSizeX, xAxis = series.xAxis, extremes = xAxis.getExtremes(), ordinal = xAxis.options.ordinal, groupPixelWidth = series.groupPixelWidth;
    var i, hasGroupedData;
    // Execute grouping if the amount of points is greater than the limit
    // defined in groupPixelWidth
    if (groupPixelWidth &&
        xData &&
        table.rowCount &&
        plotSizeX &&
        isNumber(extremes.min)) {
        hasGroupedData = true;
        // Force recreation of point instances in series.translate, #5699
        series.isDirty = true;
        series.points = null; // #6709
        var xMin = extremes.min, xMax = extremes.max, groupIntervalFactor = (ordinal &&
            xAxis.ordinal &&
            xAxis.ordinal.getGroupIntervalFactor(xMin, xMax, series)) || 1, interval = (groupPixelWidth * (xMax - xMin) / plotSizeX) *
            groupIntervalFactor, groupPositions = xAxis.getTimeTicks(DateTimeAxis.Additions.prototype.normalizeTimeTickInterval(interval, dataGroupingOptions.units ||
            DataGroupingDefaults.units), 
        // Processed data may extend beyond axis (#4907)
        Math.min(xMin, xData[0]), Math.max(xMax, xData[xData.length - 1]), xAxis.options.startOfWeek, processedXData, series.closestPointRange), groupedData = seriesProto.groupData.apply(series, [
            table,
            groupPositions,
            dataGroupingOptions.approximation
        ]);
        var modified = groupedData.modified, groupedXData = modified.getColumn('x', true), gapSize = 0;
        // The smoothed option is deprecated, instead, there is a fallback
        // to the new anchoring mechanism. #12455.
        if ((dataGroupingOptions === null || dataGroupingOptions === void 0 ? void 0 : dataGroupingOptions.smoothed) &&
            modified.rowCount) {
            dataGroupingOptions.firstAnchor = 'firstPoint';
            dataGroupingOptions.anchor = 'middle';
            dataGroupingOptions.lastAnchor = 'lastPoint';
            error(32, false, chart, {
                'dataGrouping.smoothed': 'use dataGrouping.anchor'
            });
        }
        // Record what data grouping values were used
        for (i = 1; i < groupPositions.length; i++) {
            // The grouped gapSize needs to be the largest distance between
            // the group to capture varying group sizes like months or DST
            // crossing (#10000). Also check that the gap is not at the
            // start of a segment.
            if (!groupPositions.info.segmentStarts ||
                groupPositions.info.segmentStarts.indexOf(i) === -1) {
                gapSize = Math.max(groupPositions[i] - groupPositions[i - 1], gapSize);
            }
        }
        currentDataGrouping = groupPositions.info;
        currentDataGrouping.gapSize = gapSize;
        series.closestPointRange = groupPositions.info.totalRange;
        series.groupMap = groupedData.groupMap;
        series.currentDataGrouping = currentDataGrouping;
        anchorPoints(series, groupedXData || [], xMax);
        if (reserveSpace && groupedXData) {
            adjustExtremes(xAxis, groupedXData);
        }
        // We calculated all group positions but we should render only the ones
        // within the visible range
        if (dataGroupingOptions.groupAll) {
            // Keep the reference to all grouped points for further calculation,
            // used in Heikin-Ashi and hollow candlestick series.
            series.allGroupedTable = modified;
            croppedData = series.cropData(modified, xAxis.min || 0, xAxis.max || 0);
            modified = croppedData.modified;
            groupedXData = modified.getColumn('x');
            series.cropStart = croppedData.start; // #15005
        }
        // Set the modified table
        series.dataTable.modified = modified;
    }
    else {
        series.groupMap = void 0;
        series.currentDataGrouping = void 0;
    }
    series.hasGroupedData = hasGroupedData;
    series.preventGraphAnimation =
        (lastDataGrouping && lastDataGrouping.totalRange) !==
            (currentDataGrouping && currentDataGrouping.totalRange);
}
/**
 * @private
 */
function compose(SeriesClass) {
    var seriesProto = SeriesClass.prototype;
    if (!seriesProto.applyGrouping) {
        var PointClass = SeriesClass.prototype.pointClass;
        // Override point prototype to throw a warning when trying to update
        // grouped points.
        addEvent(PointClass, 'update', function () {
            if (this.dataGroup) {
                error(24, false, this.series.chart);
                return false;
            }
        });
        addEvent(SeriesClass, 'afterSetOptions', onAfterSetOptions);
        addEvent(SeriesClass, 'destroy', destroyGroupedData);
        extend(seriesProto, {
            applyGrouping: applyGrouping,
            destroyGroupedData: destroyGroupedData,
            generatePoints: generatePoints,
            getDGApproximation: getDGApproximation,
            groupData: groupData
        });
    }
}
/**
 * Destroy the grouped data points. #622, #740
 * @private
 */
function destroyGroupedData() {
    // Clear previous groups
    if (this.groupedData) {
        this.groupedData.forEach(function (point, i) {
            if (point) {
                this.groupedData[i] = point.destroy ?
                    point.destroy() : null;
            }
        }, this);
        // Clears all:
        // - `this.groupedData`
        // - `this.points`
        // - `preserve` object in series.update()
        this.groupedData.length = 0;
        delete this.allGroupedTable;
    }
}
/**
 * Override the generatePoints method by adding a reference to grouped data
 * @private
 */
function generatePoints() {
    baseGeneratePoints.apply(this);
    // Record grouped data in order to let it be destroyed the next time
    // processData runs
    this.destroyGroupedData(); // #622
    this.groupedData = this.hasGroupedData ? this.points : null;
}
/**
 * Set default approximations to the prototypes if present. Properties are
 * inherited down. Can be overridden for individual series types.
 * @private
 */
function getDGApproximation() {
    if (this.is('arearange')) {
        return 'range';
    }
    if (this.is('ohlc')) {
        return 'ohlc';
    }
    if (this.is('hlc')) {
        return 'hlc';
    }
    if (
    // #18974, default approximation for cumulative
    // should be `sum` when `dataGrouping` is enabled
    this.is('column') ||
        this.options.cumulative) {
        return 'sum';
    }
    return 'average';
}
/**
 * Highcharts Stock only. Takes parallel arrays of x and y data and groups the
 * data into intervals defined by groupPositions, a collection of starting x
 * values for each group.
 *
 * @product highstock
 *
 * @function Highcharts.Series#groupData
 * @param {Highcharts.DataTable} table
 *        The series data table.
 * @param {Array<number>} groupPositions
 *        Group positions.
 * @param {string|Function} [approximation]
 *        Approximation to use.
 * @return {Highcharts.DataGroupingResultObject}
 *         Mapped groups.
 */
function groupData(table, groupPositions, approximation) {
    var xData = table.getColumn('x', true) || [], yData = table.getColumn('y', true), series = this, data = series.data, dataOptions = series.options && series.options.data, groupedXData = [], modified = new DataTableCore(), groupMap = [], dataLength = table.rowCount, 
    // When grouping the fake extended axis for panning, we don't need to
    // consider y
    handleYData = !!yData, values = [], pointArrayMap = series.pointArrayMap, pointArrayMapLength = pointArrayMap && pointArrayMap.length, extendedPointArrayMap = ['x'].concat(pointArrayMap || ['y']), 
    // Data columns to be applied to the modified data table at the end
    valueColumns = (pointArrayMap || ['y']).map(function () { return []; }), groupAll = (this.options.dataGrouping &&
        this.options.dataGrouping.groupAll);
    var pointX, pointY, groupedY, pos = 0, start = 0;
    var approximationFn = (typeof approximation === 'function' ?
        approximation :
        approximation && ApproximationRegistry[approximation] ?
            ApproximationRegistry[approximation] :
            ApproximationRegistry[(series.getDGApproximation && series.getDGApproximation() ||
                'average')]);
    // Calculate values array size from pointArrayMap length
    if (pointArrayMapLength) {
        var len = pointArrayMap.length;
        while (len--) {
            values.push([]);
        }
    }
    else {
        values.push([]);
    }
    var valuesLen = pointArrayMapLength || 1;
    for (var i = 0; i <= dataLength; i++) {
        // Start with the first point within the X axis range (#2696)
        if (xData[i] < groupPositions[0]) {
            continue; // With next point
        }
        // When a new group is entered, summarize and initialize
        // the previous group
        while ((typeof groupPositions[pos + 1] !== 'undefined' &&
            xData[i] >= groupPositions[pos + 1]) ||
            i === dataLength) { // Get the last group
            // get group x and y
            pointX = groupPositions[pos];
            series.dataGroupInfo = {
                start: groupAll ? start : (series.cropStart + start),
                length: values[0].length,
                groupStart: pointX
            };
            groupedY = approximationFn.apply(series, values);
            // By default, let options of the first grouped point be passed over
            // to the grouped point. This allows preserving properties like
            // `name` and `color` or custom properties. Implementers can
            // override this from the approximation function, where they can
            // write custom options to `this.dataGroupInfo.options`.
            if (series.pointClass && !defined(series.dataGroupInfo.options)) {
                // Convert numbers and arrays into objects
                series.dataGroupInfo.options = merge(series.pointClass.prototype
                    .optionsToObject.call({ series: series }, series.options.data[series.cropStart + start]));
                // Make sure the raw data (x, y, open, high etc) is not copied
                // over and overwriting approximated data.
                extendedPointArrayMap.forEach(function (key) {
                    delete series.dataGroupInfo.options[key];
                });
            }
            // Push the grouped data
            if (typeof groupedY !== 'undefined') {
                groupedXData.push(pointX);
                // Push the grouped values to the parallel columns
                var groupedValuesArr = splat(groupedY);
                for (var j = 0; j < groupedValuesArr.length; j++) {
                    valueColumns[j].push(groupedValuesArr[j]);
                }
                groupMap.push(series.dataGroupInfo);
            }
            // Reset the aggregate arrays
            start = i;
            for (var j = 0; j < valuesLen; j++) {
                values[j].length = 0; // Faster than values[j] = []
                values[j].hasNulls = false;
            }
            // Advance on the group positions
            pos += 1;
            // Don't loop beyond the last group
            if (i === dataLength) {
                break;
            }
        }
        // Break out
        if (i === dataLength) {
            break;
        }
        // For each raw data point, push it to an array that contains all values
        // for this specific group
        if (pointArrayMap) {
            var index = groupAll ? i : series.cropStart + i, point = (data && data[index]) ||
                series.pointClass.prototype.applyOptions.apply({
                    series: series
                }, [dataOptions[index]]);
            var val = void 0;
            for (var j = 0; j < pointArrayMapLength; j++) {
                val = point[pointArrayMap[j]];
                if (isNumber(val)) {
                    values[j].push(val);
                }
                else if (val === null) {
                    values[j].hasNulls = true;
                }
            }
        }
        else {
            pointY = handleYData ? yData[i] : null;
            if (isNumber(pointY)) {
                values[0].push(pointY);
            }
            else if (pointY === null) {
                values[0].hasNulls = true;
            }
        }
    }
    var columns = {
        x: groupedXData
    };
    (pointArrayMap || ['y']).forEach(function (key, i) {
        columns[key] = valueColumns[i];
    });
    modified.setColumns(columns);
    return {
        groupMap: groupMap,
        modified: modified
    };
}
/**
 * Handle default options for data grouping. This must be set at runtime because
 * some series types are defined after this.
 * @private
 */
function onAfterSetOptions(e) {
    var options = e.options, type = this.type, plotOptions = this.chart.options.plotOptions, 
    // External series, for example technical indicators should also inherit
    // commonOptions which are not available outside this module
    baseOptions = (this.useCommonDataGrouping &&
        DataGroupingDefaults.common), seriesSpecific = DataGroupingDefaults.seriesSpecific;
    var defaultOptions = D.defaultOptions.plotOptions[type].dataGrouping;
    if (plotOptions && (seriesSpecific[type] || baseOptions)) { // #1284
        var rangeSelector = this.chart.rangeSelector;
        if (!defaultOptions) {
            defaultOptions = merge(DataGroupingDefaults.common, seriesSpecific[type]);
        }
        options.dataGrouping = merge(baseOptions, defaultOptions, plotOptions.series && plotOptions.series.dataGrouping, // #1228
        // Set by the StockChart constructor:
        plotOptions[type].dataGrouping, this.userOptions.dataGrouping, !options.isInternal &&
            rangeSelector &&
            isNumber(rangeSelector.selected) &&
            rangeSelector.buttonOptions[rangeSelector.selected].dataGrouping);
    }
}
/**
 * @private
 */
function skipDataGrouping(series, force) {
    return !(series.isCartesian &&
        !series.isDirty &&
        !series.xAxis.isDirty &&
        !series.yAxis.isDirty &&
        !force);
}
/* *
 *
 *  Default Export
 *
 * */
var DataGroupingSeriesComposition = {
    compose: compose,
    groupData: groupData
};
export default DataGroupingSeriesComposition;
