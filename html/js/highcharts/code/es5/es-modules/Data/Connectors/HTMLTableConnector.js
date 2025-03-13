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
import H from '../../Core/Globals.js';
var win = H.win;
import HTMLTableConverter from '../Converters/HTMLTableConverter.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Class that handles creating a data connector from an HTML table.
 *
 * @private
 */
var HTMLTableConnector = /** @class */ (function (_super) {
    __extends(HTMLTableConnector, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of HTMLTableConnector.
     *
     * @param {HTMLTableConnector.UserOptions} [options]
     * Options for the connector and converter.
     */
    function HTMLTableConnector(options) {
        var _this = this;
        var mergedOptions = merge(HTMLTableConnector.defaultOptions, options);
        _this = _super.call(this, mergedOptions) || this;
        _this.converter = new HTMLTableConverter(mergedOptions);
        _this.options = mergedOptions;
        return _this;
    }
    /**
     * Initiates creating the dataconnector from the HTML table
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @emits HTMLTableConnector#load
     * @emits HTMLTableConnector#afterLoad
     * @emits HTMLTableConnector#loadError
     */
    HTMLTableConnector.prototype.load = function (eventDetail) {
        var connector = this, converter = connector.converter, table = connector.table, _a = connector.options, dataModifier = _a.dataModifier, tableHTML = _a.table;
        connector.emit({
            type: 'load',
            detail: eventDetail,
            table: table,
            tableElement: connector.tableElement
        });
        var tableElement;
        if (typeof tableHTML === 'string') {
            connector.tableID = tableHTML;
            tableElement = win.document.getElementById(tableHTML);
        }
        else {
            tableElement = tableHTML;
            connector.tableID = tableElement.id;
        }
        connector.tableElement = tableElement || void 0;
        if (!connector.tableElement) {
            var error = 'HTML table not provided, or element with ID not found';
            connector.emit({
                type: 'loadError',
                detail: eventDetail,
                error: error,
                table: table
            });
            return Promise.reject(new Error(error));
        }
        converter.parse(merge({ tableElement: connector.tableElement }, connector.options), eventDetail);
        // If already loaded, clear the current rows
        table.deleteColumns();
        table.setColumns(converter.getTable().getColumns());
        return connector
            .setModifierOptions(dataModifier)
            .then(function () {
            connector.emit({
                type: 'afterLoad',
                detail: eventDetail,
                table: table,
                tableElement: connector.tableElement
            });
            return connector;
        });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    HTMLTableConnector.defaultOptions = {
        table: ''
    };
    return HTMLTableConnector;
}(DataConnector));
DataConnector.registerType('HTMLTable', HTMLTableConnector);
/* *
 *
 *  Default Export
 *
 * */
export default HTMLTableConnector;
