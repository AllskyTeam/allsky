/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Pawel Lysy
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
import U from '../../Core/Utilities.js';
import JSONConverter from '../Converters/JSONConverter.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Class that handles creating a DataConnector from JSON structure
 *
 * @private
 */
var JSONConnector = /** @class */ (function (_super) {
    __extends(JSONConnector, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of JSONConnector.
     *
     * @param {JSONConnector.UserOptions} [options]
     * Options for the connector and converter.
     */
    function JSONConnector(options) {
        var _this = this;
        var mergedOptions = merge(JSONConnector.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        _this.converter = new JSONConverter(mergedOptions);
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
     * Initiates the loading of the JSON source to the connector
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits JSONConnector#load
     * @emits JSONConnector#afterLoad
     */
    JSONConnector.prototype.load = function (eventDetail) {
        var connector = this, converter = connector.converter, table = connector.table, _a = connector.options, data = _a.data, dataUrl = _a.dataUrl, dataModifier = _a.dataModifier;
        connector.emit({
            type: 'load',
            data: data,
            detail: eventDetail,
            table: table
        });
        return Promise
            .resolve(dataUrl ?
            fetch(dataUrl).then(function (json) { return json.json(); }) :
            data || [])
            .then(function (data) {
            if (data) {
                // If already loaded, clear the current rows
                table.deleteColumns();
                converter.parse({ data: data });
                table.setColumns(converter.getTable().getColumns());
            }
            return connector.setModifierOptions(dataModifier).then(function () { return data; });
        })
            .then(function (data) {
            connector.emit({
                type: 'afterLoad',
                data: data,
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
    JSONConnector.defaultOptions = {
        data: [],
        enablePolling: false,
        dataRefreshRate: 0,
        firstRowAsNames: true,
        orientation: 'rows'
    };
    return JSONConnector;
}(DataConnector));
DataConnector.registerType('JSON', JSONConnector);
/* *
 *
 *  Default Export
 *
 * */
export default JSONConnector;
