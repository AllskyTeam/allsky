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
 *  - Wojciech Chmiel
 *  - Gøran Slettemark
 *
 * */
'use strict';
import DataModifier from '../Modifiers/DataModifier.js';
import DataTable from '../DataTable.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, fireEvent = U.fireEvent, merge = U.merge, pick = U.pick;
/* *
 *
 *  Class
 *
 * */
/**
 * Abstract class providing an interface for managing a DataConnector.
 *
 * @private
 */
var DataConnector = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructor for the connector class.
     *
     * @param {DataConnector.UserOptions} [options]
     * Options to use in the connector.
     */
    function DataConnector(options) {
        if (options === void 0) { options = {}; }
        this.table = new DataTable(options.dataTable);
        this.metadata = options.metadata || { columns: {} };
    }
    Object.defineProperty(DataConnector.prototype, "polling", {
        /**
         * Poll timer ID, if active.
         */
        get: function () {
            return !!this.polling;
        },
        enumerable: false,
        configurable: true
    });
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Method for adding metadata for a single column.
     *
     * @param {string} name
     * The name of the column to be described.
     *
     * @param {DataConnector.MetaColumn} columnMeta
     * The metadata to apply to the column.
     */
    DataConnector.prototype.describeColumn = function (name, columnMeta) {
        var connector = this, columns = connector.metadata.columns;
        columns[name] = merge(columns[name] || {}, columnMeta);
    };
    /**
     * Method for applying columns meta information to the whole DataConnector.
     *
     * @param {Highcharts.Dictionary<DataConnector.MetaColumn>} columns
     * Pairs of column names and MetaColumn objects.
     */
    DataConnector.prototype.describeColumns = function (columns) {
        var connector = this, columnNames = Object.keys(columns);
        var columnName;
        while (typeof (columnName = columnNames.pop()) === 'string') {
            connector.describeColumn(columnName, columns[columnName]);
        }
    };
    /**
     * Emits an event on the connector to all registered callbacks of this
     * event.
     *
     * @param {DataConnector.Event} [e]
     * Event object containing additional event information.
     */
    DataConnector.prototype.emit = function (e) {
        fireEvent(this, e.type, e);
    };
    /**
     * Returns the order of columns.
     *
     * @param {boolean} [usePresentationState]
     * Whether to use the column order of the presentation state of the table.
     *
     * @return {Array<string>|undefined}
     * Order of columns.
     */
    DataConnector.prototype.getColumnOrder = function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    usePresentationState) {
        var connector = this, columns = connector.metadata.columns, names = Object.keys(columns || {});
        if (names.length) {
            return names.sort(function (a, b) { return (pick(columns[a].index, 0) - pick(columns[b].index, 0)); });
        }
    };
    /**
     * Retrieves the columns of the dataTable,
     * applies column order from meta.
     *
     * @param {boolean} [usePresentationOrder]
     * Whether to use the column order of the presentation state of the table.
     *
     * @return {Highcharts.DataTableColumnCollection}
     * An object with the properties `columnNames` and `columnValues`
     */
    DataConnector.prototype.getSortedColumns = function (usePresentationOrder) {
        return this.table.getColumns(this.getColumnOrder(usePresentationOrder));
    };
    /**
     * The default load method, which fires the `afterLoad` event
     *
     * @return {Promise<DataConnector>}
     * The loaded connector.
     *
     * @emits DataConnector#afterLoad
     */
    DataConnector.prototype.load = function () {
        fireEvent(this, 'afterLoad', { table: this.table });
        return Promise.resolve(this);
    };
    /**
     * Registers a callback for a specific connector event.
     *
     * @param {string} type
     * Event type as a string.
     *
     * @param {DataEventEmitter.Callback} callback
     * Function to register for the connector callback.
     *
     * @return {Function}
     * Function to unregister callback from the connector event.
     */
    DataConnector.prototype.on = function (type, callback) {
        return addEvent(this, type, callback);
    };
    /**
     * The default save method, which fires the `afterSave` event.
     *
     * @return {Promise<DataConnector>}
     * The saved connector.
     *
     * @emits DataConnector#afterSave
     * @emits DataConnector#saveError
     */
    DataConnector.prototype.save = function () {
        fireEvent(this, 'saveError', { table: this.table });
        return Promise.reject(new Error('Not implemented'));
    };
    /**
     * Sets the index and order of columns.
     *
     * @param {Array<string>} columnNames
     * Order of columns.
     */
    DataConnector.prototype.setColumnOrder = function (columnNames) {
        var connector = this;
        for (var i = 0, iEnd = columnNames.length; i < iEnd; ++i) {
            connector.describeColumn(columnNames[i], { index: i });
        }
    };
    DataConnector.prototype.setModifierOptions = function (modifierOptions) {
        var _this = this;
        var ModifierClass = (modifierOptions &&
            DataModifier.types[modifierOptions.type]);
        return this.table
            .setModifier(ModifierClass ?
            new ModifierClass(modifierOptions) :
            void 0)
            .then(function () { return _this; });
    };
    /**
     * Starts polling new data after the specific time span in milliseconds.
     *
     * @param {number} refreshTime
     * Refresh time in milliseconds between polls.
     */
    DataConnector.prototype.startPolling = function (refreshTime) {
        if (refreshTime === void 0) { refreshTime = 1000; }
        var connector = this;
        window.clearTimeout(connector._polling);
        connector._polling = window.setTimeout(function () { return connector
            .load()['catch'](function (error) { return connector.emit({
            type: 'loadError',
            error: error,
            table: connector.table
        }); })
            .then(function () {
            if (connector._polling) {
                connector.startPolling(refreshTime);
            }
        }); }, refreshTime);
    };
    /**
     * Stops polling data.
     */
    DataConnector.prototype.stopPolling = function () {
        var connector = this;
        window.clearTimeout(connector._polling);
        delete connector._polling;
    };
    /**
     * Retrieves metadata from a single column.
     *
     * @param {string} name
     * The identifier for the column that should be described
     *
     * @return {DataConnector.MetaColumn|undefined}
     * Returns a MetaColumn object if found.
     */
    DataConnector.prototype.whatIs = function (name) {
        return this.metadata.columns[name];
    };
    return DataConnector;
}());
/* *
 *
 *  Class Namespace
 *
 * */
(function (DataConnector) {
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
    /**
     * Registry as a record object with connector names and their class.
     */
    DataConnector.types = {};
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Adds a connector class to the registry. The connector has to provide the
     * `DataConnector.options` property and the `DataConnector.load` method to
     * modify the table.
     *
     * @private
     *
     * @param {string} key
     * Registry key of the connector class.
     *
     * @param {DataConnectorType} DataConnectorClass
     * Connector class (aka class constructor) to register.
     *
     * @return {boolean}
     * Returns true, if the registration was successful. False is returned, if
     * their is already a connector registered with this key.
     */
    function registerType(key, DataConnectorClass) {
        return (!!key &&
            !DataConnector.types[key] &&
            !!(DataConnector.types[key] = DataConnectorClass));
    }
    DataConnector.registerType = registerType;
})(DataConnector || (DataConnector = {}));
/* *
 *
 *  Default Export
 *
 * */
export default DataConnector;
