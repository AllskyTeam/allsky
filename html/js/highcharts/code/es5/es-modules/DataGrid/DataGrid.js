/* *
 *
 *  DataGrid class
 *
 *  (c) 2020-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *  - Sebastian Bochan
 *
 * */
'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import Accessibility from './Accessibility/Accessibility.js';
import AST from '../Core/Renderer/HTML/AST.js';
import Credits from './Credits.js';
import Defaults from './Defaults.js';
import DataGridUtils from './Utils.js';
import DataTable from '../Data/DataTable.js';
import Globals from './Globals.js';
import Table from './Table/Table.js';
import U from '../Core/Utilities.js';
import QueryingController from './Querying/QueryingController.js';
var makeHTMLElement = DataGridUtils.makeHTMLElement;
var win = Globals.win;
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Creates a grid structure (table).
 */
var DataGrid = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    /**
     * Constructs a new data grid.
     *
     * @param renderTo
     * The render target (container) of the data grid.
     *
     * @param options
     * The options of the data grid.
     *
     * @param afterLoadCallback
     * The callback that is called after the data grid is loaded.
     */
    function DataGrid(renderTo, options, afterLoadCallback) {
        var _this = this;
        var _a;
        /**
         * The user options declared for the columns as an object of column ID to
         * column options.
         */
        this.columnOptionsMap = {};
        /**
         * The options that were declared by the user when creating the data grid
         * or when updating it.
         */
        this.userOptions = {};
        this.loadUserOptions(options);
        this.querying = new QueryingController(this);
        this.initContainers(renderTo);
        this.initAccessibility();
        this.loadDataTable((_a = this.options) === null || _a === void 0 ? void 0 : _a.dataTable);
        this.querying.loadOptions();
        void this.querying.proceed().then(function () {
            _this.renderViewport();
            afterLoadCallback === null || afterLoadCallback === void 0 ? void 0 : afterLoadCallback(_this);
        });
        DataGrid.dataGrids.push(this);
    }
    // Implementation
    DataGrid.dataGrid = function (renderTo, options, async) {
        if (async) {
            return new Promise(function (resolve) {
                void new DataGrid(renderTo, options, function (dataGrid) {
                    resolve(dataGrid);
                });
            });
        }
        return new DataGrid(renderTo, options);
    };
    /* *
     *
     *  Methods
     *
     * */
    /**
     * Initializes the accessibility controller.
     */
    DataGrid.prototype.initAccessibility = function () {
        var _a, _b;
        if (!((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.accessibility) === null || _b === void 0 ? void 0 : _b.enabled)) {
            return;
        }
        // Can be moved to a separate module in the future (if needed).
        this.accessibility = new Accessibility(this);
    };
    /**
     * Initializes the container of the data grid.
     *
     * @param renderTo
     * The render target (html element or id) of the data grid.
     *
     */
    DataGrid.prototype.initContainers = function (renderTo) {
        var container = (typeof renderTo === 'string') ?
            win.document.getElementById(renderTo) : renderTo;
        // Display an error if the renderTo is wrong
        if (!container) {
            // eslint-disable-next-line no-console
            console.error("\n                Rendering div not found. It is unable to find the HTML element\n                to render the DataGrid in.\n            ");
            return;
        }
        this.container = container;
        this.container.innerHTML = AST.emptyHTML;
        this.contentWrapper = makeHTMLElement('div', {
            className: Globals.classNames.container
        }, this.container);
    };
    /**
     * Loads the new user options to all the important fields (`userOptions`,
     * `options` and `columnOptionsMap`).
     *
     * @param newOptions
     * The options that were declared by the user.
     *
     * @param oneToOne
     * When `false` (default), the existing column options will be merged with
     * the ones that are currently defined in the user options. When `true`,
     * the columns not defined in the new options will be removed.
     */
    DataGrid.prototype.loadUserOptions = function (newOptions, oneToOne) {
        var _a, _b, _c;
        if (oneToOne === void 0) { oneToOne = false; }
        // Operate on a copy of the options argument
        newOptions = merge(newOptions);
        if (newOptions.columns) {
            if (oneToOne) {
                this.loadColumnOptionsOneToOne(newOptions.columns);
            }
            else {
                this.loadColumnOptions(newOptions.columns);
            }
            delete newOptions.columns;
        }
        this.userOptions = merge(this.userOptions, newOptions);
        this.options = merge((_a = this.options) !== null && _a !== void 0 ? _a : Defaults.defaultOptions, this.userOptions);
        var columnOptionsArray = (_b = this.options) === null || _b === void 0 ? void 0 : _b.columns;
        if (!columnOptionsArray) {
            return;
        }
        var columnOptionsObj = {};
        for (var i = 0, iEnd = (_c = columnOptionsArray === null || columnOptionsArray === void 0 ? void 0 : columnOptionsArray.length) !== null && _c !== void 0 ? _c : 0; i < iEnd; ++i) {
            columnOptionsObj[columnOptionsArray[i].id] = columnOptionsArray[i];
        }
        this.columnOptionsMap = columnOptionsObj;
    };
    /**
     * Loads the new column options to the userOptions field.
     *
     * @param newColumnOptions
     * The new column options that should be loaded.
     *
     * @param overwrite
     * Whether to overwrite the existing column options with the new ones.
     * Default is `false`.
     */
    DataGrid.prototype.loadColumnOptions = function (newColumnOptions, overwrite) {
        if (overwrite === void 0) { overwrite = false; }
        if (!this.userOptions.columns) {
            this.userOptions.columns = [];
        }
        var columnOptions = this.userOptions.columns;
        var _loop_1 = function (i, iEnd) {
            var newOptions = newColumnOptions[i];
            var indexInPrevOptions = columnOptions.findIndex(function (prev) { return prev.id === newOptions.id; });
            // If the new column options contain only the id.
            if (Object.keys(newOptions).length < 2) {
                if (overwrite && indexInPrevOptions !== -1) {
                    columnOptions.splice(indexInPrevOptions, 1);
                }
                return "continue";
            }
            if (indexInPrevOptions === -1) {
                columnOptions.push(newOptions);
            }
            else if (overwrite) {
                columnOptions[indexInPrevOptions] = newOptions;
            }
            else {
                columnOptions[indexInPrevOptions] = merge(columnOptions[indexInPrevOptions], newOptions);
            }
        };
        for (var i = 0, iEnd = newColumnOptions.length; i < iEnd; ++i) {
            _loop_1(i, iEnd);
        }
        if (columnOptions.length < 1) {
            delete this.userOptions.columns;
        }
    };
    /**
     * Loads the new column options to the userOptions field in a one-to-one
     * manner. It means that all the columns that are not defined in the new
     * options will be removed.
     *
     * @param newColumnOptions
     * The new column options that should be loaded.
     */
    DataGrid.prototype.loadColumnOptionsOneToOne = function (newColumnOptions) {
        var prevColumnOptions = this.userOptions.columns;
        var columnOptions = [];
        var prevOptions;
        var _loop_2 = function (i, iEnd) {
            var newOptions = newColumnOptions[i];
            var indexInPrevOptions = prevColumnOptions === null || prevColumnOptions === void 0 ? void 0 : prevColumnOptions.findIndex(function (prev) { return prev.id === newOptions.id; });
            if (indexInPrevOptions !== void 0 && indexInPrevOptions !== -1) {
                prevOptions = prevColumnOptions === null || prevColumnOptions === void 0 ? void 0 : prevColumnOptions[indexInPrevOptions];
            }
            var resultOptions = merge(prevOptions !== null && prevOptions !== void 0 ? prevOptions : {}, newOptions);
            if (Object.keys(resultOptions).length > 1) {
                columnOptions.push(resultOptions);
            }
        };
        for (var i = 0, iEnd = newColumnOptions.length; i < iEnd; ++i) {
            _loop_2(i, iEnd);
        }
        this.userOptions.columns = columnOptions;
    };
    /**
     * Updates the data grid with new options.
     *
     * @param options
     * The options of the data grid that should be updated. If not provided,
     * the update will be proceeded based on the `this.userOptions` property.
     * The `column` options are merged using the `id` property as a key.
     *
     * @param render
     * Whether to re-render the data grid after updating the options.
     *
     * @param oneToOne
     * When `false` (default), the existing column options will be merged with
     * the ones that are currently defined in the user options. When `true`,
     * the columns not defined in the new options will be removed.
     */
    DataGrid.prototype.update = function () {
        return __awaiter(this, arguments, void 0, function (options, render, oneToOne) {
            var newDataTable;
            var _a, _b;
            if (options === void 0) { options = {}; }
            if (render === void 0) { render = true; }
            if (oneToOne === void 0) { oneToOne = false; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.loadUserOptions(options, oneToOne);
                        newDataTable = false;
                        if (!this.dataTable || options.dataTable) {
                            this.userOptions.dataTable = options.dataTable;
                            ((_a = this.options) !== null && _a !== void 0 ? _a : {}).dataTable = options.dataTable;
                            this.loadDataTable((_b = this.options) === null || _b === void 0 ? void 0 : _b.dataTable);
                            newDataTable = true;
                        }
                        this.querying.loadOptions();
                        if (!render) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.querying.proceed(newDataTable)];
                    case 1:
                        _c.sent();
                        this.renderViewport();
                        _c.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Updates the column of the data grid with new options.
     *
     * @param columnId
     * The ID of the column that should be updated.
     *
     * @param options
     * The options of the columns that should be updated. If null,
     * column options for this column ID will be removed.
     *
     * @param render
     * Whether to re-render the data grid after updating the columns.
     *
     * @param overwrite
     * If true, the column options will be updated by replacing the existing
     * options with the new ones instead of merging them.
     */
    DataGrid.prototype.updateColumn = function (columnId_1, options_1) {
        return __awaiter(this, arguments, void 0, function (columnId, options, render, overwrite) {
            if (render === void 0) { render = true; }
            if (overwrite === void 0) { overwrite = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.loadColumnOptions([__assign({ id: columnId }, options)], overwrite);
                        return [4 /*yield*/, this.update(void 0, render)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Hovers the row with the provided index. It removes the hover effect from
     * the previously hovered row.
     *
     * @param rowIndex
     * The index of the row.
     */
    DataGrid.prototype.hoverRow = function (rowIndex) {
        var _a, _b, _c, _d, _e, _f;
        var rows = (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.rows;
        if (!rows) {
            return;
        }
        var firstRowIndex = (_d = (_c = (_b = this.viewport) === null || _b === void 0 ? void 0 : _b.rows[0]) === null || _c === void 0 ? void 0 : _c.index) !== null && _d !== void 0 ? _d : 0;
        if (this.hoveredRowIndex !== void 0) {
            (_e = rows[this.hoveredRowIndex - firstRowIndex]) === null || _e === void 0 ? void 0 : _e.setHoveredState(false);
        }
        if (rowIndex !== void 0) {
            (_f = rows[rowIndex - firstRowIndex]) === null || _f === void 0 ? void 0 : _f.setHoveredState(true);
        }
        this.hoveredRowIndex = rowIndex;
    };
    /**
     * Hovers the column with the provided ID. It removes the hover effect from
     * the previously hovered column.
     *
     * @param columnId
     * The ID of the column.
     */
    DataGrid.prototype.hoverColumn = function (columnId) {
        var _a, _b;
        var vp = this.viewport;
        if (!vp) {
            return;
        }
        if (this.hoveredColumnId) {
            (_a = vp.getColumn(this.hoveredColumnId)) === null || _a === void 0 ? void 0 : _a.setHoveredState(false);
        }
        if (columnId) {
            (_b = vp.getColumn(columnId)) === null || _b === void 0 ? void 0 : _b.setHoveredState(true);
        }
        this.hoveredColumnId = columnId;
    };
    /**
     * Renders the viewport of the data grid. If the data grid is already
     * rendered, it will be destroyed and re-rendered with the new data.
     * @internal
     */
    DataGrid.prototype.renderViewport = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var viewportMeta = (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.getStateMeta();
        this.enabledColumns = this.getEnabledColumnIDs();
        (_b = this.credits) === null || _b === void 0 ? void 0 : _b.destroy();
        (_c = this.viewport) === null || _c === void 0 ? void 0 : _c.destroy();
        delete this.viewport;
        if (this.contentWrapper) {
            this.contentWrapper.innerHTML = AST.emptyHTML;
        }
        if (this.enabledColumns.length > 0) {
            this.viewport = this.renderTable();
            if (viewportMeta && this.viewport) {
                this.viewport.applyStateMeta(viewportMeta);
            }
        }
        else {
            this.renderNoData();
        }
        if ((_e = (_d = this.options) === null || _d === void 0 ? void 0 : _d.credits) === null || _e === void 0 ? void 0 : _e.enabled) {
            this.credits = new Credits(this);
        }
        if ((_h = (_g = (_f = this.options) === null || _f === void 0 ? void 0 : _f.rendering) === null || _g === void 0 ? void 0 : _g.rows) === null || _h === void 0 ? void 0 : _h.virtualization) {
            (_j = this.viewport) === null || _j === void 0 ? void 0 : _j.reflow();
        }
    };
    /**
     * Renders the table (viewport) of the data grid.
     *
     * @returns
     * The newly rendered table (viewport) of the data grid.
     */
    DataGrid.prototype.renderTable = function () {
        var _a, _b;
        this.tableElement = makeHTMLElement('table', {
            className: Globals.classNames.tableElement
        }, this.contentWrapper);
        var vp = new Table(this, this.tableElement);
        // Accessibility
        this.tableElement.setAttribute('aria-rowcount', (_b = (_a = this.dataTable) === null || _a === void 0 ? void 0 : _a.getRowCount()) !== null && _b !== void 0 ? _b : 0);
        return vp;
    };
    /**
     * Renders a message that there is no data to display.
     */
    DataGrid.prototype.renderNoData = function () {
        var _a, _b;
        makeHTMLElement('div', {
            className: Globals.classNames.noData,
            innerText: (_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.lang) === null || _b === void 0 ? void 0 : _b.noData
        }, this.contentWrapper);
    };
    /**
     * Returns the array of IDs of columns that should be displayed in the data
     * grid, in the correct order.
     */
    DataGrid.prototype.getEnabledColumnIDs = function () {
        var _a, _b, _c, _d, _e, _f;
        var columnOptionsMap = this.columnOptionsMap;
        var header = (_a = this.options) === null || _a === void 0 ? void 0 : _a.header;
        var headerColumns = this.getColumnIds(header || [], false);
        var columnsIncluded = ((_d = (_c = (_b = this.options) === null || _b === void 0 ? void 0 : _b.rendering) === null || _c === void 0 ? void 0 : _c.columns) === null || _d === void 0 ? void 0 : _d.included) || (headerColumns && headerColumns.length > 0 ?
            headerColumns : (_e = this.dataTable) === null || _e === void 0 ? void 0 : _e.getColumnNames());
        if (!(columnsIncluded === null || columnsIncluded === void 0 ? void 0 : columnsIncluded.length)) {
            return [];
        }
        if (!columnOptionsMap) {
            return columnsIncluded;
        }
        var columnName;
        var result = [];
        for (var i = 0, iEnd = columnsIncluded.length; i < iEnd; ++i) {
            columnName = columnsIncluded[i];
            if (((_f = columnOptionsMap === null || columnOptionsMap === void 0 ? void 0 : columnOptionsMap[columnName]) === null || _f === void 0 ? void 0 : _f.enabled) !== false) {
                result.push(columnName);
            }
        }
        return result;
    };
    DataGrid.prototype.loadDataTable = function (tableOptions) {
        // If the table is passed as a reference, it should be used instead of
        // creating a new one.
        if (tableOptions === null || tableOptions === void 0 ? void 0 : tableOptions.id) {
            this.dataTable = tableOptions;
            this.presentationTable = this.dataTable.modified;
            return;
        }
        this.dataTable = this.presentationTable =
            new DataTable(tableOptions);
    };
    /**
     * Extracts all references to columnIds on all levels below defined level
     * in the settings.header structure.
     *
     * @param columns
     * Structure that we start calculation
     *
     * @param [onlyEnabledColumns=true]
     * Extract all columns from header or columns filtered by enabled param
     * @returns
     */
    DataGrid.prototype.getColumnIds = function (columns, onlyEnabledColumns) {
        if (onlyEnabledColumns === void 0) { onlyEnabledColumns = true; }
        var columnIds = [];
        var enabledColumns = this.enabledColumns;
        for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
            var column = columns_1[_i];
            var columnId = typeof column === 'string' ? column : column.columnId;
            if (columnId &&
                (!onlyEnabledColumns || (enabledColumns === null || enabledColumns === void 0 ? void 0 : enabledColumns.includes(columnId)))) {
                columnIds.push(columnId);
            }
            if (typeof column !== 'string' && column.columns) {
                columnIds = columnIds.concat(this.getColumnIds(column.columns, onlyEnabledColumns));
            }
        }
        return columnIds;
    };
    /**
     * Destroys the data grid.
     */
    DataGrid.prototype.destroy = function () {
        var _this = this;
        var _a;
        var dgIndex = DataGrid.dataGrids.findIndex(function (dg) { return dg === _this; });
        (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.destroy();
        if (this.container) {
            this.container.innerHTML = AST.emptyHTML;
            this.container.classList.remove(Globals.classNames.container);
        }
        // Clear all properties
        Object.keys(this).forEach(function (key) {
            delete _this[key];
        });
        DataGrid.dataGrids.splice(dgIndex, 1);
    };
    /**
     * Returns the current dataGrid data as a JSON string.
     *
     * @return
     * JSON representation of the data
     */
    DataGrid.prototype.getJSON = function () {
        var _a;
        var json = (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.dataTable.modified.columns;
        if (!this.enabledColumns || !json) {
            return '{}';
        }
        for (var _i = 0, _b = Object.keys(json); _i < _b.length; _i++) {
            var key = _b[_i];
            if (this.enabledColumns.indexOf(key) === -1) {
                delete json[key];
            }
        }
        return JSON.stringify(json);
    };
    /**
     * Returns the current DataGrid options as a JSON string.
     *
     * @param onlyUserOptions
     * Whether to return only the user options or all options (user options
     * merged with the default ones). Default is `true`.
     *
     * @returns
     * Options as a JSON string.
     */
    DataGrid.prototype.getOptionsJSON = function (onlyUserOptions) {
        var _a;
        if (onlyUserOptions === void 0) { onlyUserOptions = true; }
        var optionsCopy = onlyUserOptions ? merge(this.userOptions) : merge(this.options);
        if ((_a = optionsCopy.dataTable) === null || _a === void 0 ? void 0 : _a.id) {
            optionsCopy.dataTable = {
                columns: optionsCopy.dataTable.columns
            };
        }
        return JSON.stringify(optionsCopy);
    };
    /* *
    *
    *  Properties
    *
    * */
    /**
     * An array containing the current DataGrid objects in the page.
     */
    DataGrid.dataGrids = [];
    return DataGrid;
}());
/* *
 *
 *  Default Export
 *
 * */
export default DataGrid;
