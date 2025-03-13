/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Sophie Bremer
 *
 * */
'use strict';
import DataConnector from './Connectors/DataConnector.js';
import DataPoolDefaults from './DataPoolDefaults.js';
import U from '../Core/Utilities.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Data pool to load connectors on-demand.
 *
 * @class
 * @name Data.DataPool
 *
 * @param {Data.DataPoolOptions} options
 * Pool options with all connectors.
 */
var DataPool = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function DataPool(options) {
        if (options === void 0) { options = DataPoolDefaults; }
        options.connectors = (options.connectors || []);
        this.connectors = {};
        this.options = options;
        this.waiting = {};
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Emits an event on this data pool to all registered callbacks of the given
     * event.
     * @private
     *
     * @param {DataTable.Event} e
     * Event object with event information.
     */
    DataPool.prototype.emit = function (e) {
        U.fireEvent(this, e.type, e);
    };
    /**
     * Loads the connector.
     *
     * @function Data.DataPool#getConnector
     *
     * @param {string} connectorId
     * ID of the connector.
     *
     * @return {Promise<Data.DataConnector>}
     * Returns the connector.
     */
    DataPool.prototype.getConnector = function (connectorId) {
        var _this = this;
        var connector = this.connectors[connectorId];
        // Already loaded
        if (connector) {
            return Promise.resolve(connector);
        }
        var waitingList = this.waiting[connectorId];
        // Start loading
        if (!waitingList) {
            waitingList = this.waiting[connectorId] = [];
            var connectorOptions = this.getConnectorOptions(connectorId);
            if (!connectorOptions) {
                throw new Error("Connector '".concat(connectorId, "' not found."));
            }
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this
                .loadConnector(connectorOptions)
                .then(function (connector) {
                delete _this.waiting[connectorId];
                for (var i = 0, iEnd = waitingList.length; i < iEnd; ++i) {
                    waitingList[i][0](connector);
                }
            })['catch'](function (error) {
                delete _this.waiting[connectorId];
                for (var i = 0, iEnd = waitingList.length; i < iEnd; ++i) {
                    waitingList[i][1](error);
                }
            });
        }
        // Add request to waiting list
        return new Promise(function (resolve, reject) {
            waitingList.push([resolve, reject]);
        });
    };
    /**
     * Returns the IDs of all connectors.
     *
     * @private
     *
     * @return {Array<string>}
     * Names of all connectors.
     */
    DataPool.prototype.getConnectorIds = function () {
        var connectors = this.options.connectors, connectorIds = [];
        for (var i = 0, iEnd = connectors.length; i < iEnd; ++i) {
            connectorIds.push(connectors[i].id);
        }
        return connectorIds;
    };
    /**
     * Loads the options of the connector.
     *
     * @private
     *
     * @param {string} connectorId
     * ID of the connector.
     *
     * @return {DataPoolConnectorOptions|undefined}
     * Returns the options of the connector, or `undefined` if not found.
     */
    DataPool.prototype.getConnectorOptions = function (connectorId) {
        var connectors = this.options.connectors;
        for (var i = 0, iEnd = connectors.length; i < iEnd; ++i) {
            if (connectors[i].id === connectorId) {
                return connectors[i];
            }
        }
    };
    /**
     * Loads the connector table.
     *
     * @function Data.DataPool#getConnectorTable
     *
     * @param {string} connectorId
     * ID of the connector.
     *
     * @return {Promise<Data.DataTable>}
     * Returns the connector table.
     */
    DataPool.prototype.getConnectorTable = function (connectorId) {
        return this
            .getConnector(connectorId)
            .then(function (connector) { return connector.table; });
    };
    /**
     * Tests whether the connector has never been requested.
     *
     * @param {string} connectorId
     * Name of the connector.
     *
     * @return {boolean}
     * Returns `true`, if the connector has never been requested, otherwise
     * `false`.
     */
    DataPool.prototype.isNewConnector = function (connectorId) {
        return !this.connectors[connectorId];
    };
    /**
     * Creates and loads the connector.
     *
     * @private
     *
     * @param {Data.DataPoolConnectorOptions} options
     * Options of connector.
     *
     * @return {Promise<Data.DataConnector>}
     * Returns the connector.
     */
    DataPool.prototype.loadConnector = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.emit({
                type: 'load',
                options: options
            });
            var ConnectorClass = DataConnector.types[options.type];
            if (!ConnectorClass) {
                throw new Error("Connector type not found. (".concat(options.type, ")"));
            }
            var connector = new ConnectorClass(options.options);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            connector
                .load()
                .then(function (connector) {
                _this.connectors[options.id] = connector;
                _this.emit({
                    type: 'afterLoad',
                    options: options
                });
                resolve(connector);
            })['catch'](reject);
        });
    };
    /**
     * Registers a callback for a specific event.
     *
     * @function Highcharts.DataPool#on
     *
     * @param {string} type
     * Event type as a string.
     *
     * @param {Highcharts.EventCallbackFunction<Highcharts.DataPool>} callback
     * Function to register for an event callback.
     *
     * @return {Function}
     * Function to unregister callback from the event.
     */
    DataPool.prototype.on = function (type, callback) {
        return U.addEvent(this, type, callback);
    };
    /**
     * Sets connector options under the specified `options.id`.
     *
     * @param {Data.DataPoolConnectorOptions} options
     * Connector options to set.
     */
    DataPool.prototype.setConnectorOptions = function (options) {
        var connectors = this.options.connectors, instances = this.connectors;
        this.emit({
            type: 'setConnectorOptions',
            options: options
        });
        for (var i = 0, iEnd = connectors.length; i < iEnd; ++i) {
            if (connectors[i].id === options.id) {
                connectors.splice(i, 1);
                break;
            }
        }
        if (instances[options.id]) {
            instances[options.id].stopPolling();
            delete instances[options.id];
        }
        connectors.push(options);
        this.emit({
            type: 'afterSetConnectorOptions',
            options: options
        });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Semantic version string of the DataPool class.
     * @internal
     */
    DataPool.version = '1.0.0';
    return DataPool;
}());
/* *
 *
 *  Default Export
 *
 * */
export default DataPool;
