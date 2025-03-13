/* *
 *
 *  DataGrid Sorting Controller class
 *
 *  (c) 2020-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *
 * */
'use strict';
import SortModifier from '../../Data/Modifiers/SortModifier.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Class that manages one of the data grid querying types - sorting.
 */
var SortingController = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs the SortingController instance.
     *
     * @param dataGrid
     * The data grid instance.
     */
    function SortingController(dataGrid) {
        /**
         * The flag that indicates if the data should be updated because of the
         * change in the sorting options.
         */
        this.shouldBeUpdated = false;
        this.dataGrid = dataGrid;
    }
    /* *
    *
    *  Functions
    *
    * */
    /**
     * Sets the sorting state. If the new sorting state is different than the
     * current one, the `shouldBeUpdated` flag is set to `true`. If the
     * same, the flag is set to `false`.
     *
     * @param order
     * The sorting order.
     *
     * @param columnId
     * The column ID to sort by.
     */
    SortingController.prototype.setSorting = function (order, columnId) {
        var _a, _b;
        if (((_a = this.currentSorting) === null || _a === void 0 ? void 0 : _a.columnId) !== columnId ||
            ((_b = this.currentSorting) === null || _b === void 0 ? void 0 : _b.order) !== order) {
            this.shouldBeUpdated = true;
            this.currentSorting = {
                columnId: columnId,
                order: order
            };
        }
        this.modifier = this.createModifier();
    };
    /**
     * Returns the sorting options from the data grid options.
     */
    SortingController.prototype.getSortingOptions = function () {
        var _a;
        var dataGrid = this.dataGrid, columnOptionsMap = dataGrid.columnOptionsMap;
        if (!columnOptionsMap) {
            return { order: null };
        }
        var columnIDs = Object.keys(columnOptionsMap);
        var foundOrder = null;
        var foundColumnId;
        for (var i = columnIDs.length - 1; i > -1; --i) {
            var columnId = columnIDs[i];
            var columnOptions = columnOptionsMap[columnId];
            var order = (_a = columnOptions.sorting) === null || _a === void 0 ? void 0 : _a.order;
            if (order) {
                if (foundColumnId) {
                    // eslint-disable-next-line no-console
                    console.warn('DataGrid: Only one column can be sorted at a time. ' +
                        'Data will be sorted only by the last found column ' +
                        "with the sorting order defined in the options: \"".concat(foundColumnId, "\"."));
                    break;
                }
                foundOrder = order;
                foundColumnId = columnId;
            }
        }
        return {
            columnId: foundColumnId,
            order: foundOrder
        };
    };
    /**
     * Loads sorting options from the data grid options.
     */
    SortingController.prototype.loadOptions = function () {
        var _a, _b;
        var stateFromOptions = this.getSortingOptions();
        if (stateFromOptions.columnId !== ((_a = this.initialSorting) === null || _a === void 0 ? void 0 : _a.columnId) ||
            stateFromOptions.order !== ((_b = this.initialSorting) === null || _b === void 0 ? void 0 : _b.order)) {
            this.initialSorting = stateFromOptions;
            this.setSorting(stateFromOptions.order, stateFromOptions.columnId);
        }
    };
    /**
     * Returns the sorting modifier based on the loaded sorting options.
     */
    SortingController.prototype.createModifier = function () {
        if (!this.currentSorting) {
            return;
        }
        var _a = this.currentSorting, columnId = _a.columnId, order = _a.order;
        if (!order) {
            return;
        }
        return new SortModifier({
            orderByColumn: columnId,
            direction: order
        });
    };
    return SortingController;
}());
/* *
 *
 *  Default Export
 *
 * */
export default SortingController;
