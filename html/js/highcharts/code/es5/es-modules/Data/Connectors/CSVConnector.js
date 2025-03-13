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
 *  - Christer Vasseng
 *  - Gøran Slettemark
 *  - Sophie Bremer
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
import CSVConverter from '../Converters/CSVConverter.js';
import DataConnector from './DataConnector.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Class that handles creating a DataConnector from CSV
 *
 * @private
 */
var CSVConnector = /** @class */ (function (_super) {
    __extends(CSVConnector, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of CSVConnector.
     *
     * @param {CSVConnector.UserOptions} [options]
     * Options for the connector and converter.
     */
    function CSVConnector(options) {
        var _this = this;
        var mergedOptions = merge(CSVConnector.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        _this.converter = new CSVConverter(mergedOptions);
        _this.options = mergedOptions;
        if (mergedOptions.enablePolling) {
            _this.startPolling(Math.max(mergedOptions.dataRefreshRate || 0, 1) * 1000);
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Initiates the loading of the CSV source to the connector
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits CSVConnector#load
     * @emits CSVConnector#afterLoad
     */
    CSVConnector.prototype.load = function (eventDetail) {
        var connector = this, converter = connector.converter, table = connector.table, _a = connector.options, csv = _a.csv, csvURL = _a.csvURL, dataModifier = _a.dataModifier;
        connector.emit({
            type: 'load',
            csv: csv,
            detail: eventDetail,
            table: table
        });
        return Promise
            .resolve(csvURL ?
            fetch(csvURL).then(function (response) { return response.text(); }) :
            csv || '')
            .then(function (csv) {
            if (csv) {
                // If already loaded, clear the current rows
                table.deleteColumns();
                converter.parse({ csv: csv });
                table.setColumns(converter.getTable().getColumns());
            }
            return connector
                .setModifierOptions(dataModifier)
                .then(function () { return csv; });
        })
            .then(function (csv) {
            connector.emit({
                type: 'afterLoad',
                csv: csv,
                detail: eventDetail,
                table: table
            });
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
    CSVConnector.defaultOptions = {
        csv: '',
        csvURL: '',
        enablePolling: false,
        dataRefreshRate: 1,
        firstRowAsNames: true
    };
    return CSVConnector;
}(DataConnector));
DataConnector.registerType('CSV', CSVConnector);
/* *
 *
 *  Default Export
 *
 * */
export default CSVConnector;
