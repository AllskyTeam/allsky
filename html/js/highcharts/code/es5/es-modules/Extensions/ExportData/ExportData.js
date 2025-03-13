/* *
 *
 *  Experimental data export module for Highcharts
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
// @todo
// - Set up systematic tests for all series types, paired with tests of the data
//   module importing the same data.
'use strict';
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import AST from '../../Core/Renderer/HTML/AST.js';
import D from '../../Core/Defaults.js';
var getOptions = D.getOptions, setOptions = D.setOptions;
import DownloadURL from '../DownloadURL.js';
var downloadURL = DownloadURL.downloadURL;
import ExportDataDefaults from './ExportDataDefaults.js';
import H from '../../Core/Globals.js';
var doc = H.doc, win = H.win;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, extend = U.extend, find = U.find, fireEvent = U.fireEvent, isNumber = U.isNumber, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Wrapper function for the download functions, which handles showing and hiding
 * the loading message
 *
 * @private
 *
 */
function wrapLoading(fn) {
    var _this = this;
    var _a;
    var showMessage = Boolean((_a = this.options.exporting) === null || _a === void 0 ? void 0 : _a.showExportInProgress);
    // Prefer requestAnimationFrame if available
    var timeoutFn = win.requestAnimationFrame || setTimeout;
    // Outer timeout avoids menu freezing on click
    timeoutFn(function () {
        showMessage && _this.showLoading(_this.options.lang.exportInProgress);
        timeoutFn(function () {
            try {
                fn.call(_this);
            }
            finally {
                showMessage && _this.hideLoading();
            }
        });
    });
}
/**
 * Generates a data URL of CSV for local download in the browser. This is the
 * default action for a click on the 'Download CSV' button.
 *
 * See {@link Highcharts.Chart#getCSV} to get the CSV data itself.
 *
 * @function Highcharts.Chart#downloadCSV
 *
 * @requires modules/exporting
 */
function chartDownloadCSV() {
    var _this = this;
    wrapLoading.call(this, function () {
        var csv = _this.getCSV(true);
        downloadURL(getBlobFromContent(csv, 'text/csv') ||
            'data:text/csv,\uFEFF' + encodeURIComponent(csv), _this.getFilename() + '.csv');
    });
}
/**
 * Generates a data URL of an XLS document for local download in the browser.
 * This is the default action for a click on the 'Download XLS' button.
 *
 * See {@link Highcharts.Chart#getTable} to get the table data itself.
 *
 * @function Highcharts.Chart#downloadXLS
 *
 * @requires modules/exporting
 */
function chartDownloadXLS() {
    var _this = this;
    wrapLoading.call(this, function () {
        var uri = 'data:application/vnd.ms-excel;base64,', template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
            'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
            'xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook>' +
            '<x:ExcelWorksheets><x:ExcelWorksheet>' +
            '<x:Name>Ark1</x:Name>' +
            '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
            '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>' +
            '</xml><![endif]-->' +
            '<style>td{border:none;font-family: Calibri, sans-serif;} ' +
            '.number{mso-number-format:"0.00";} ' +
            '.text{ mso-number-format:"\@";}</style>' +
            '<meta name=ProgId content=Excel.Sheet>' +
            '<meta charset=UTF-8>' +
            '</head><body>' +
            _this.getTable(true) +
            '</body></html>', base64 = function (s) {
            return win.btoa(unescape(encodeURIComponent(s))); // #50
        };
        downloadURL(getBlobFromContent(template, 'application/vnd.ms-excel') ||
            uri + base64(template), _this.getFilename() + '.xls');
    });
}
/**
 * Export-data module required. Returns the current chart data as a CSV string.
 *
 * @function Highcharts.Chart#getCSV
 *
 * @param {boolean} [useLocalDecimalPoint]
 *        Whether to use the local decimal point as detected from the browser.
 *        This makes it easier to export data to Excel in the same locale as the
 *        user is.
 *
 * @return {string}
 *         CSV representation of the data
 */
function chartGetCSV(useLocalDecimalPoint) {
    var csv = '';
    var rows = this.getDataRows(), csvOptions = this.options.exporting.csv, decimalPoint = pick(csvOptions.decimalPoint, csvOptions.itemDelimiter !== ',' && useLocalDecimalPoint ?
        (1.1).toLocaleString()[1] :
        '.'), 
    // Use ';' for direct to Excel
    itemDelimiter = pick(csvOptions.itemDelimiter, decimalPoint === ',' ? ';' : ','), 
    // '\n' isn't working with the js csv data extraction
    lineDelimiter = csvOptions.lineDelimiter;
    // Transform the rows to CSV
    rows.forEach(function (row, i) {
        var val = '', j = row.length;
        while (j--) {
            val = row[j];
            if (typeof val === 'string') {
                val = "\"".concat(val, "\"");
            }
            if (typeof val === 'number') {
                if (decimalPoint !== '.') {
                    val = val.toString().replace('.', decimalPoint);
                }
            }
            row[j] = val;
        }
        // The first row is the header - it defines the number of columns.
        // Empty columns between not-empty cells are covered in the getDataRows
        // method.
        // Now add empty values only to the end of the row so all rows have
        // the same number of columns, #17186
        row.length = rows.length ? rows[0].length : 0;
        // Add the values
        csv += row.join(itemDelimiter);
        // Add the line delimiter
        if (i < rows.length - 1) {
            csv += lineDelimiter;
        }
    });
    return csv;
}
/**
 * Export-data module required. Returns a two-dimensional array containing the
 * current chart data.
 *
 * @function Highcharts.Chart#getDataRows
 *
 * @param {boolean} [multiLevelHeaders]
 *        Use multilevel headers for the rows by default. Adds an extra row with
 *        top level headers. If a custom columnHeaderFormatter is defined, this
 *        can override the behavior.
 *
 * @return {Array<Array<(number|string)>>}
 *         The current chart data
 *
 * @emits Highcharts.Chart#event:exportData
 */
function chartGetDataRows(multiLevelHeaders) {
    var hasParallelCoords = this.hasParallelCoordinates, time = this.time, csvOptions = ((this.options.exporting && this.options.exporting.csv) || {}), xAxes = this.xAxis, rows = {}, rowArr = [], topLevelColumnTitles = [], columnTitles = [], langOptions = this.options.lang, exportDataOptions = langOptions.exportData, categoryHeader = exportDataOptions.categoryHeader, categoryDatetimeHeader = exportDataOptions.categoryDatetimeHeader, 
    // Options
    columnHeaderFormatter = function (item, key, keyLength) {
        if (csvOptions.columnHeaderFormatter) {
            var s = csvOptions.columnHeaderFormatter(item, key, keyLength);
            if (s !== false) {
                return s;
            }
        }
        if (!item) {
            return categoryHeader;
        }
        if (!item.bindAxes) {
            return (item.options.title &&
                item.options.title.text) || (item.dateTime ?
                categoryDatetimeHeader :
                categoryHeader);
        }
        if (multiLevelHeaders) {
            return {
                columnTitle: keyLength > 1 ?
                    key :
                    item.name,
                topLevelColumnTitle: item.name
            };
        }
        return item.name + (keyLength > 1 ? ' (' + key + ')' : '');
    }, 
    // Map the categories for value axes
    getCategoryAndDateTimeMap = function (series, pointArrayMap, pIdx) {
        var categoryMap = {}, dateTimeValueAxisMap = {};
        pointArrayMap.forEach(function (prop) {
            var axisName = ((series.keyToAxis && series.keyToAxis[prop]) ||
                prop) + 'Axis', 
            // Points in parallel coordinates refers to all yAxis
            // not only `series.yAxis`
            axis = isNumber(pIdx) ?
                series.chart[axisName][pIdx] :
                series[axisName];
            categoryMap[prop] = (axis && axis.categories) || [];
            dateTimeValueAxisMap[prop] = (axis && axis.dateTime);
        });
        return {
            categoryMap: categoryMap,
            dateTimeValueAxisMap: dateTimeValueAxisMap
        };
    }, 
    // Create point array depends if xAxis is category
    // or point.name is defined #13293
    getPointArray = function (series, xAxis) {
        var pointArrayMap = series.pointArrayMap || ['y'], namedPoints = series.data.some(function (d) {
            return (typeof d.y !== 'undefined') && d.name;
        });
        // If there are points with a name, we also want the x value in the
        // table
        if (namedPoints &&
            xAxis &&
            !xAxis.categories &&
            series.exportKey !== 'name') {
            return __spreadArray(['x'], pointArrayMap, true);
        }
        return pointArrayMap;
    }, xAxisIndices = [];
    var xAxis, dataRows, columnTitleObj, i = 0, // Loop the series and index values
    x, xTitle;
    this.series.forEach(function (series) {
        var keys = series.options.keys, xAxis = series.xAxis, pointArrayMap = keys || getPointArray(series, xAxis), valueCount = pointArrayMap.length, xTaken = !series.requireSorting && {}, xAxisIndex = xAxes.indexOf(xAxis);
        var categoryAndDatetimeMap = getCategoryAndDateTimeMap(series, pointArrayMap), mockSeries, j;
        if (series.options.includeInDataExport !== false &&
            !series.options.isInternal &&
            series.visible !== false // #55
        ) {
            // Build a lookup for X axis index and the position of the first
            // series that belongs to that X axis. Includes -1 for non-axis
            // series types like pies.
            if (!find(xAxisIndices, function (index) {
                return index[0] === xAxisIndex;
            })) {
                xAxisIndices.push([xAxisIndex, i]);
            }
            // Compute the column headers and top level headers, usually the
            // same as series names
            j = 0;
            while (j < valueCount) {
                columnTitleObj = columnHeaderFormatter(series, pointArrayMap[j], pointArrayMap.length);
                columnTitles.push(columnTitleObj.columnTitle || columnTitleObj);
                if (multiLevelHeaders) {
                    topLevelColumnTitles.push(columnTitleObj.topLevelColumnTitle ||
                        columnTitleObj);
                }
                j++;
            }
            mockSeries = {
                chart: series.chart,
                autoIncrement: series.autoIncrement,
                options: series.options,
                pointArrayMap: series.pointArrayMap,
                index: series.index
            };
            // Export directly from options.data because we need the uncropped
            // data (#7913), and we need to support Boost (#7026).
            series.options.data.forEach(function eachData(options, pIdx) {
                var _a;
                var mockPoint = { series: mockSeries };
                var key, prop, val;
                // In parallel coordinates chart, each data point is connected
                // to a separate yAxis, conform this
                if (hasParallelCoords) {
                    categoryAndDatetimeMap = getCategoryAndDateTimeMap(series, pointArrayMap, pIdx);
                }
                series.pointClass.prototype.applyOptions.apply(mockPoint, [options]);
                var name = series.data[pIdx] && series.data[pIdx].name;
                key = ((_a = mockPoint.x) !== null && _a !== void 0 ? _a : '') + ',' + name;
                j = 0;
                // Pies, funnels, geo maps etc. use point name in X row
                if (!xAxis ||
                    series.exportKey === 'name' ||
                    (!hasParallelCoords && xAxis && xAxis.hasNames) && name) {
                    key = name;
                }
                if (xTaken) {
                    if (xTaken[key]) {
                        key += '|' + pIdx;
                    }
                    xTaken[key] = true;
                }
                if (!rows[key]) {
                    rows[key] = [];
                    rows[key].xValues = [];
                    // ES5 replacement for Array.from / fill.
                    var arr = [];
                    for (var i_1 = 0; i_1 < series.chart.series.length; i_1++) {
                        arr[i_1] = 0;
                    }
                    // Create pointers array, holding information how many
                    // duplicates of specific x occurs in each series.
                    // Used for creating rows with duplicates.
                    rows[key].pointers = arr;
                    rows[key].pointers[series.index] = 1;
                }
                else {
                    // Handle duplicates (points with the same x), by creating
                    // extra rows based on pointers for better performance.
                    var modifiedKey = "".concat(key, ",").concat(rows[key].pointers[series.index]), originalKey = key;
                    if (rows[key].pointers[series.index]) {
                        if (!rows[modifiedKey]) {
                            rows[modifiedKey] = [];
                            rows[modifiedKey].xValues = [];
                            rows[modifiedKey].pointers = [];
                        }
                        key = modifiedKey;
                    }
                    rows[originalKey].pointers[series.index] += 1;
                }
                rows[key].x = mockPoint.x;
                rows[key].name = name;
                rows[key].xValues[xAxisIndex] = mockPoint.x;
                while (j < valueCount) {
                    prop = pointArrayMap[j]; // `y`, `z` etc
                    val = series.pointClass.prototype.getNestedProperty.apply(mockPoint, [prop]); // Allow values from nested properties (#20470)
                    rows[key][i + j] = pick(
                    // Y axis category if present
                    categoryAndDatetimeMap.categoryMap[prop][val], 
                    // Datetime yAxis
                    categoryAndDatetimeMap.dateTimeValueAxisMap[prop] ?
                        time.dateFormat(csvOptions.dateFormat, val) :
                        null, 
                    // Linear/log yAxis
                    val);
                    j++;
                }
            });
            i = i + j;
        }
    });
    // Make a sortable array
    for (x in rows) {
        if (Object.hasOwnProperty.call(rows, x)) {
            rowArr.push(rows[x]);
        }
    }
    var xAxisIndex, column;
    // Add computed column headers and top level headers to final row set
    dataRows = multiLevelHeaders ? [topLevelColumnTitles, columnTitles] :
        [columnTitles];
    i = xAxisIndices.length;
    while (i--) { // Start from end to splice in
        xAxisIndex = xAxisIndices[i][0];
        column = xAxisIndices[i][1];
        xAxis = xAxes[xAxisIndex];
        // Sort it by X values
        rowArr.sort(function (// eslint-disable-line no-loop-func
        a, b) {
            return a.xValues[xAxisIndex] - b.xValues[xAxisIndex];
        });
        // Add header row
        xTitle = columnHeaderFormatter(xAxis);
        dataRows[0].splice(column, 0, xTitle);
        if (multiLevelHeaders && dataRows[1]) {
            // If using multi level headers, we just added top level header.
            // Also add for sub level
            dataRows[1].splice(column, 0, xTitle);
        }
        // Add the category column
        rowArr.forEach(function (// eslint-disable-line no-loop-func
        row) {
            var category = row.name;
            if (xAxis && !defined(category)) {
                if (xAxis.dateTime) {
                    if (row.x instanceof Date) {
                        row.x = row.x.getTime();
                    }
                    category = time.dateFormat(csvOptions.dateFormat, row.x);
                }
                else if (xAxis.categories) {
                    category = pick(xAxis.names[row.x], xAxis.categories[row.x], row.x);
                }
                else {
                    category = row.x;
                }
            }
            // Add the X/date/category
            row.splice(column, 0, category);
        });
    }
    dataRows = dataRows.concat(rowArr);
    fireEvent(this, 'exportData', { dataRows: dataRows });
    return dataRows;
}
/**
 * Export-data module required. Build a HTML table with the chart's current
 * data.
 *
 * @sample highcharts/export-data/viewdata/
 *         View the data from the export menu
 *
 * @function Highcharts.Chart#getTable
 *
 * @param {boolean} [useLocalDecimalPoint]
 *        Whether to use the local decimal point as detected from the browser.
 *        This makes it easier to export data to Excel in the same locale as the
 *        user is.
 *
 * @return {string}
 *         HTML representation of the data.
 *
 * @emits Highcharts.Chart#event:afterGetTable
 */
function chartGetTable(useLocalDecimalPoint) {
    var serialize = function (node) {
        if (!node.tagName || node.tagName === '#text') {
            // Text node
            return node.textContent || '';
        }
        var attributes = node.attributes;
        var html = "<".concat(node.tagName);
        if (attributes) {
            Object.keys(attributes)
                .forEach(function (key) {
                var value = attributes[key];
                html += " ".concat(key, "=\"").concat(value, "\"");
            });
        }
        html += '>';
        html += node.textContent || '';
        (node.children || []).forEach(function (child) {
            html += serialize(child);
        });
        html += "</".concat(node.tagName, ">");
        return html;
    };
    var tree = this.getTableAST(useLocalDecimalPoint);
    return serialize(tree);
}
/**
 * Get the AST of a HTML table representing the chart data.
 *
 * @private
 *
 * @function Highcharts.Chart#getTableAST
 *
 * @param {boolean} [useLocalDecimalPoint]
 *        Whether to use the local decimal point as detected from the browser.
 *        This makes it easier to export data to Excel in the same locale as the
 *        user is.
 *
 * @return {Highcharts.ASTNode}
 *         The abstract syntax tree
 */
function chartGetTableAST(useLocalDecimalPoint) {
    var rowLength = 0;
    var treeChildren = [];
    var options = this.options, decimalPoint = useLocalDecimalPoint ? (1.1).toLocaleString()[1] : '.', useMultiLevelHeaders = pick(options.exporting.useMultiLevelHeaders, true), rows = this.getDataRows(useMultiLevelHeaders), topHeaders = useMultiLevelHeaders ? rows.shift() : null, subHeaders = rows.shift(), 
    // Compare two rows for equality
    isRowEqual = function (row1, row2) {
        var i = row1.length;
        if (row2.length === i) {
            while (i--) {
                if (row1[i] !== row2[i]) {
                    return false;
                }
            }
        }
        else {
            return false;
        }
        return true;
    }, 
    // Get table cell HTML from value
    getCellHTMLFromValue = function (tagName, classes, attributes, value) {
        var textContent = pick(value, ''), className = 'highcharts-text' + (classes ? ' ' + classes : '');
        // Convert to string if number
        if (typeof textContent === 'number') {
            textContent = textContent.toString();
            if (decimalPoint === ',') {
                textContent = textContent.replace('.', decimalPoint);
            }
            className = 'highcharts-number';
        }
        else if (!value) {
            className = 'highcharts-empty';
        }
        attributes = extend({ 'class': className }, attributes);
        return {
            tagName: tagName,
            attributes: attributes,
            textContent: textContent
        };
    }, 
    // Get table header markup from row data
    getTableHeaderHTML = function (topheaders, subheaders, rowLength) {
        var theadChildren = [];
        var i = 0, len = rowLength || subheaders && subheaders.length, next, cur, curColspan = 0, rowspan;
        // Clean up multiple table headers. Chart.getDataRows() returns two
        // levels of headers when using multilevel, not merged. We need to
        // merge identical headers, remove redundant headers, and keep it
        // all marked up nicely.
        if (useMultiLevelHeaders &&
            topheaders &&
            subheaders &&
            !isRowEqual(topheaders, subheaders)) {
            var trChildren = [];
            for (; i < len; ++i) {
                cur = topheaders[i];
                next = topheaders[i + 1];
                if (cur === next) {
                    ++curColspan;
                }
                else if (curColspan) {
                    // Ended colspan
                    // Add cur to HTML with colspan.
                    trChildren.push(getCellHTMLFromValue('th', 'highcharts-table-topheading', {
                        scope: 'col',
                        colspan: curColspan + 1
                    }, cur));
                    curColspan = 0;
                }
                else {
                    // Cur is standalone. If it is same as sublevel,
                    // remove sublevel and add just toplevel.
                    if (cur === subheaders[i]) {
                        if (options.exporting.useRowspanHeaders) {
                            rowspan = 2;
                            delete subheaders[i];
                        }
                        else {
                            rowspan = 1;
                            subheaders[i] = '';
                        }
                    }
                    else {
                        rowspan = 1;
                    }
                    var cell = getCellHTMLFromValue('th', 'highcharts-table-topheading', { scope: 'col' }, cur);
                    if (rowspan > 1 && cell.attributes) {
                        cell.attributes.valign = 'top';
                        cell.attributes.rowspan = rowspan;
                    }
                    trChildren.push(cell);
                }
            }
            theadChildren.push({
                tagName: 'tr',
                children: trChildren
            });
        }
        // Add the subheaders (the only headers if not using multilevels)
        if (subheaders) {
            var trChildren = [];
            for (i = 0, len = subheaders.length; i < len; ++i) {
                if (typeof subheaders[i] !== 'undefined') {
                    trChildren.push(getCellHTMLFromValue('th', null, { scope: 'col' }, subheaders[i]));
                }
            }
            theadChildren.push({
                tagName: 'tr',
                children: trChildren
            });
        }
        return {
            tagName: 'thead',
            children: theadChildren
        };
    };
    // Add table caption
    if (options.exporting.tableCaption !== false) {
        treeChildren.push({
            tagName: 'caption',
            attributes: {
                'class': 'highcharts-table-caption'
            },
            textContent: pick(options.exporting.tableCaption, (options.title.text ?
                options.title.text :
                'Chart'))
        });
    }
    // Find longest row
    for (var i = 0, len = rows.length; i < len; ++i) {
        if (rows[i].length > rowLength) {
            rowLength = rows[i].length;
        }
    }
    // Add header
    treeChildren.push(getTableHeaderHTML(topHeaders, subHeaders, Math.max(rowLength, subHeaders.length)));
    // Transform the rows to HTML
    var trs = [];
    rows.forEach(function (row) {
        var trChildren = [];
        for (var j = 0; j < rowLength; j++) {
            // Make first column a header too. Especially important for
            // category axes, but also might make sense for datetime? Should
            // await user feedback on this.
            trChildren.push(getCellHTMLFromValue(j ? 'td' : 'th', null, j ? {} : { scope: 'row' }, row[j]));
        }
        trs.push({
            tagName: 'tr',
            children: trChildren
        });
    });
    treeChildren.push({
        tagName: 'tbody',
        children: trs
    });
    var e = {
        tree: {
            tagName: 'table',
            id: "highcharts-data-table-".concat(this.index),
            children: treeChildren
        }
    };
    fireEvent(this, 'aftergetTableAST', e);
    return e.tree;
}
/**
 * Export-data module required. Hide the data table when visible.
 *
 * @function Highcharts.Chart#hideData
 */
function chartHideData() {
    this.toggleDataTable(false);
}
/**
 * @private
 */
function chartToggleDataTable(show) {
    show = pick(show, !this.isDataTableVisible);
    // Create the div
    var createContainer = show && !this.dataTableDiv;
    if (createContainer) {
        this.dataTableDiv = doc.createElement('div');
        this.dataTableDiv.className = 'highcharts-data-table';
        // Insert after the chart container
        this.renderTo.parentNode.insertBefore(this.dataTableDiv, this.renderTo.nextSibling);
    }
    // Toggle the visibility
    if (this.dataTableDiv) {
        var style = this.dataTableDiv.style, oldDisplay = style.display;
        style.display = show ? 'block' : 'none';
        // Generate the data table
        if (show) {
            this.dataTableDiv.innerHTML = AST.emptyHTML;
            var ast = new AST([this.getTableAST()]);
            ast.addToDOM(this.dataTableDiv);
            fireEvent(this, 'afterViewData', {
                element: this.dataTableDiv,
                wasHidden: createContainer || oldDisplay !== style.display
            });
        }
        else {
            fireEvent(this, 'afterHideData');
        }
    }
    // Set the flag
    this.isDataTableVisible = show;
    // Change the menu item text
    var exportDivElements = this.exportDivElements, options = this.options.exporting, menuItems = options &&
        options.buttons &&
        options.buttons.contextButton.menuItems, lang = this.options.lang;
    if (options &&
        options.menuItemDefinitions &&
        lang &&
        lang.viewData &&
        lang.hideData &&
        menuItems &&
        exportDivElements) {
        var exportDivElement = exportDivElements[menuItems.indexOf('viewData')];
        if (exportDivElement) {
            AST.setElementHTML(exportDivElement, this.isDataTableVisible ? lang.hideData : lang.viewData);
        }
    }
}
/**
 * Export-data module required. View the data in a table below the chart.
 *
 * @function Highcharts.Chart#viewData
 *
 * @emits Highcharts.Chart#event:afterViewData
 */
function chartViewData() {
    this.toggleDataTable(true);
}
/**
 * @private
 */
function compose(ChartClass, SeriesClass) {
    var chartProto = ChartClass.prototype;
    if (!chartProto.getCSV) {
        var exportingOptions = getOptions().exporting;
        // Add an event listener to handle the showTable option
        addEvent(ChartClass, 'afterViewData', onChartAfterViewData);
        addEvent(ChartClass, 'render', onChartRenderer);
        addEvent(ChartClass, 'destroy', onChartDestroy);
        chartProto.downloadCSV = chartDownloadCSV;
        chartProto.downloadXLS = chartDownloadXLS;
        chartProto.getCSV = chartGetCSV;
        chartProto.getDataRows = chartGetDataRows;
        chartProto.getTable = chartGetTable;
        chartProto.getTableAST = chartGetTableAST;
        chartProto.hideData = chartHideData;
        chartProto.toggleDataTable = chartToggleDataTable;
        chartProto.viewData = chartViewData;
        // Add "Download CSV" to the exporting menu.
        // @todo consider move to defaults
        if (exportingOptions) {
            extend(exportingOptions.menuItemDefinitions, {
                downloadCSV: {
                    textKey: 'downloadCSV',
                    onclick: function () {
                        this.downloadCSV();
                    }
                },
                downloadXLS: {
                    textKey: 'downloadXLS',
                    onclick: function () {
                        this.downloadXLS();
                    }
                },
                viewData: {
                    textKey: 'viewData',
                    onclick: function () {
                        wrapLoading.call(this, this.toggleDataTable);
                    }
                }
            });
            if (exportingOptions.buttons &&
                exportingOptions.buttons.contextButton.menuItems) {
                exportingOptions.buttons.contextButton.menuItems.push('separator', 'downloadCSV', 'downloadXLS', 'viewData');
            }
        }
        setOptions(ExportDataDefaults);
        var _a = SeriesClass.types, AreaRangeSeries = _a.arearange, GanttSeries = _a.gantt, MapSeries = _a.map, MapBubbleSeries = _a.mapbubble, TreemapSeries = _a.treemap, XRangeSeries = _a.xrange;
        if (AreaRangeSeries) {
            AreaRangeSeries.prototype.keyToAxis = {
                low: 'y',
                high: 'y'
            };
        }
        if (GanttSeries) {
            GanttSeries.prototype.exportKey = 'name';
            GanttSeries.prototype.keyToAxis = {
                start: 'x',
                end: 'x'
            };
        }
        if (MapSeries) {
            MapSeries.prototype.exportKey = 'name';
        }
        if (MapBubbleSeries) {
            MapBubbleSeries.prototype.exportKey = 'name';
        }
        if (TreemapSeries) {
            TreemapSeries.prototype.exportKey = 'name';
        }
        if (XRangeSeries) {
            XRangeSeries.prototype.keyToAxis = {
                x2: 'x'
            };
        }
    }
}
/**
 * Get a blob object from content, if blob is supported
 *
 * @private
 * @param {string} content
 *        The content to create the blob from.
 * @param {string} type
 *        The type of the content.
 * @return {string|undefined}
 *         The blob object, or undefined if not supported.
 */
function getBlobFromContent(content, type) {
    var nav = win.navigator, domurl = win.URL || win.webkitURL || win;
    try {
        // MS specific
        if ((nav.msSaveOrOpenBlob) && win.MSBlobBuilder) {
            var blob = new win.MSBlobBuilder();
            blob.append(content);
            return blob.getBlob('image/svg+xml');
        }
        return domurl.createObjectURL(new win.Blob(['\uFEFF' + content], // #7084
        { type: type }));
    }
    catch (e) {
        // Ignore
    }
}
/**
 * @private
 */
function onChartAfterViewData() {
    var chart = this, dataTableDiv = chart.dataTableDiv, getCellValue = function (tr, index) {
        return tr.children[index].textContent;
    }, comparer = function (index, ascending) {
        return function (a, b) {
            var sort = function (v1, v2) { return (v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ?
                v1 - v2 :
                v1.toString().localeCompare(v2)); };
            return sort(getCellValue(ascending ? a : b, index), getCellValue(ascending ? b : a, index));
        };
    };
    if (dataTableDiv &&
        chart.options.exporting &&
        chart.options.exporting.allowTableSorting) {
        var row = dataTableDiv.querySelector('thead tr');
        if (row) {
            row.childNodes.forEach(function (th) {
                var table = th.closest('table');
                th.addEventListener('click', function () {
                    var rows = __spreadArray([], dataTableDiv.querySelectorAll('tr:not(thead tr)'), true), headers = __spreadArray([], th.parentNode.children, true);
                    rows.sort(comparer(headers.indexOf(th), chart.ascendingOrderInTable =
                        !chart.ascendingOrderInTable)).forEach(function (tr) {
                        table.appendChild(tr);
                    });
                    headers.forEach(function (th) {
                        [
                            'highcharts-sort-ascending',
                            'highcharts-sort-descending'
                        ].forEach(function (className) {
                            if (th.classList.contains(className)) {
                                th.classList.remove(className);
                            }
                        });
                    });
                    th.classList.add(chart.ascendingOrderInTable ?
                        'highcharts-sort-ascending' :
                        'highcharts-sort-descending');
                });
            });
        }
    }
}
/**
 * Handle the showTable option
 * @private
 */
function onChartRenderer() {
    if (this.options &&
        this.options.exporting &&
        this.options.exporting.showTable &&
        !this.options.chart.forExport) {
        this.viewData();
    }
}
/**
 * Clean up
 * @private
 */
function onChartDestroy() {
    var _a;
    (_a = this.dataTableDiv) === null || _a === void 0 ? void 0 : _a.remove();
}
/* *
 *
 *  Default Export
 *
 * */
var ExportData = {
    compose: compose
};
export default ExportData;
/* *
 *
 *  API Declarations
 *
 * */
/**
 * Function callback to execute while data rows are processed for exporting.
 * This allows the modification of data rows before processed into the final
 * format.
 *
 * @callback Highcharts.ExportDataCallbackFunction
 * @extends Highcharts.EventCallbackFunction<Highcharts.Chart>
 *
 * @param {Highcharts.Chart} this
 * Chart context where the event occurred.
 *
 * @param {Highcharts.ExportDataEventObject} event
 * Event object with data rows that can be modified.
 */
/**
 * Contains information about the export data event.
 *
 * @interface Highcharts.ExportDataEventObject
 */ /**
* Contains the data rows for the current export task and can be modified.
* @name Highcharts.ExportDataEventObject#dataRows
* @type {Array<Array<string>>}
*/
(''); // Keeps doclets above in JS file
