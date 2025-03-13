/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Torstein Hønsi
 *  - Gøran Slettemark
 *  - Wojciech Chmiel
 *  - Sophie Bremer
 *  - Jomar Hønsi
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
import DataConnector from './DataConnector.js';
import GoogleSheetsConverter from '../Converters/GoogleSheetsConverter.js';
import U from '../../Core/Utilities.js';
var merge = U.merge, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Tests Google's response for error.
 * @private
 */
function isGoogleError(json) {
    return (typeof json === 'object' && json &&
        typeof json.error === 'object' && json.error &&
        typeof json.error.code === 'number' &&
        typeof json.error.message === 'string' &&
        typeof json.error.status === 'string');
}
/* *
 *
 *  Class
 *
 * */
/**
 * @private
 * @todo implement save, requires oauth2
 */
var GoogleSheetsConnector = /** @class */ (function (_super) {
    __extends(GoogleSheetsConnector, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of GoogleSheetsConnector
     *
     * @param {GoogleSheetsConnector.UserOptions} [options]
     * Options for the connector and converter.
     */
    function GoogleSheetsConnector(options) {
        var _this = this;
        var mergedOptions = merge(GoogleSheetsConnector.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        _this.converter = new GoogleSheetsConverter(mergedOptions);
        _this.options = mergedOptions;
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Loads data from a Google Spreadsheet.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Promise<this>}
     * Same connector instance with modified table.
     */
    GoogleSheetsConnector.prototype.load = function (eventDetail) {
        var connector = this, converter = connector.converter, table = connector.table, _a = connector.options, dataModifier = _a.dataModifier, dataRefreshRate = _a.dataRefreshRate, enablePolling = _a.enablePolling, firstRowAsNames = _a.firstRowAsNames, googleAPIKey = _a.googleAPIKey, googleSpreadsheetKey = _a.googleSpreadsheetKey, url = GoogleSheetsConnector.buildFetchURL(googleAPIKey, googleSpreadsheetKey, connector.options);
        connector.emit({
            type: 'load',
            detail: eventDetail,
            table: table,
            url: url
        });
        if (!URL.canParse(url)) {
            throw new Error('Invalid URL: ' + url);
        }
        return fetch(url)
            .then(function (response) { return (response.json()); })
            .then(function (json) {
            if (isGoogleError(json)) {
                throw new Error(json.error.message);
            }
            converter.parse({
                firstRowAsNames: firstRowAsNames,
                json: json
            });
            // If already loaded, clear the current table
            table.deleteColumns();
            table.setColumns(converter.getTable().getColumns());
            return connector.setModifierOptions(dataModifier);
        })
            .then(function () {
            connector.emit({
                type: 'afterLoad',
                detail: eventDetail,
                table: table,
                url: url
            });
            // Polling
            if (enablePolling) {
                setTimeout(function () { return connector.load(); }, Math.max(dataRefreshRate || 0, 1) * 1000);
            }
            return connector;
        })['catch'](function (error) {
            connector.emit({
                type: 'loadError',
                detail: eventDetail,
                error: error,
                table: table
            });
            throw error;
        });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    GoogleSheetsConnector.defaultOptions = {
        googleAPIKey: '',
        googleSpreadsheetKey: '',
        enablePolling: false,
        dataRefreshRate: 2,
        firstRowAsNames: true
    };
    return GoogleSheetsConnector;
}(DataConnector));
/* *
 *
 *  Class Namespace
 *
 * */
(function (GoogleSheetsConnector) {
    /* *
     *
     *  Declarations
     *
     * */
    /* *
     *
     *  Constants
     *
     * */
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Creates GoogleSheets API v4 URL.
     * @private
     */
    function buildFetchURL(apiKey, sheetKey, options) {
        if (options === void 0) { options = {}; }
        var url = new URL("https://sheets.googleapis.com/v4/spreadsheets/".concat(sheetKey, "/values/"));
        var range = options.onlyColumnNames ?
            'A1:Z1' : buildQueryRange(options);
        url.pathname += range;
        var searchParams = url.searchParams;
        searchParams.set('alt', 'json');
        if (!options.onlyColumnNames) {
            searchParams.set('dateTimeRenderOption', 'FORMATTED_STRING');
            searchParams.set('majorDimension', 'COLUMNS');
            searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
        }
        searchParams.set('prettyPrint', 'false');
        searchParams.set('key', apiKey);
        return url.href;
    }
    GoogleSheetsConnector.buildFetchURL = buildFetchURL;
    /**
     * Creates sheets range.
     * @private
     */
    function buildQueryRange(options) {
        if (options === void 0) { options = {}; }
        var endColumn = options.endColumn, endRow = options.endRow, googleSpreadsheetRange = options.googleSpreadsheetRange, startColumn = options.startColumn, startRow = options.startRow;
        return googleSpreadsheetRange || ((alphabet[startColumn || 0] || 'A') +
            (Math.max((startRow || 0), 0) + 1) +
            ':' +
            (alphabet[pick(endColumn, 25)] || 'Z') +
            (endRow ?
                Math.max(endRow, 0) :
                'Z'));
    }
    GoogleSheetsConnector.buildQueryRange = buildQueryRange;
})(GoogleSheetsConnector || (GoogleSheetsConnector = {}));
DataConnector.registerType('GoogleSheets', GoogleSheetsConnector);
/* *
 *
 *  Default Export
 *
 * */
export default GoogleSheetsConnector;
