/* *
 *
 *  DataGrid Querying Controller class
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/* *
 *
 *  Imports
 *
 * */
import ChainModifier from '../../Data/Modifiers/ChainModifier.js';
import SortingController from './SortingController.js';
/* *
 *
 *  Class
 *
 * */
/**
 * Class that manage data modification of the visible data in the data grid.
 * It manages the modifiers that are applied to the data table.
 */
var QueryingController = /** @class */ (function () {
    /* *
    *
    *  Constructor
    *
    * */
    function QueryingController(dataGrid) {
        this.dataGrid = dataGrid;
        this.sorting = new SortingController(dataGrid);
        /// this.filtering = new FilteringController(dataGrid);
    }
    /* *
    *
    *  Functions
    *
    * */
    /**
     * Proceeds with the data modification if needed.
     *
     * @param force
     * If the data should be modified even if the significant options are not
     * changed.
     */
    QueryingController.prototype.proceed = function () {
        return __awaiter(this, arguments, void 0, function (force) {
            if (force === void 0) { force = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(force ||
                            this.sorting.shouldBeUpdated) // ||
                        ) return [3 /*break*/, 2]; // ||
                        return [4 /*yield*/, this.modifyData()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Load all options needed to generate the modifiers.
     */
    QueryingController.prototype.loadOptions = function () {
        this.sorting.loadOptions();
    };
    /**
     * Check if the data table does not need to be modified.
     */
    QueryingController.prototype.willNotModify = function () {
        return (!this.sorting.modifier
        // && !this.filtering.modifier
        );
    };
    /**
     * Apply all modifiers to the data table.
     */
    QueryingController.prototype.modifyData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var originalDataTable, modifiers, chainModifier, dataTableCopy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        originalDataTable = this.dataGrid.dataTable;
                        if (!originalDataTable) {
                            return [2 /*return*/];
                        }
                        modifiers = [];
                        // TODO: Implement filtering
                        // if (this.filtering.modifier) {
                        //     modifiers.push(this.filtering.modifier);
                        // }
                        if (this.sorting.modifier) {
                            modifiers.push(this.sorting.modifier);
                        }
                        if (!(modifiers.length > 0)) return [3 /*break*/, 2];
                        chainModifier = new (ChainModifier.bind.apply(ChainModifier, __spreadArray([void 0, {}], modifiers, false)))();
                        dataTableCopy = originalDataTable.clone();
                        return [4 /*yield*/, chainModifier.modify(dataTableCopy.modified)];
                    case 1:
                        _a.sent();
                        this.dataGrid.presentationTable = dataTableCopy.modified;
                        return [3 /*break*/, 3];
                    case 2:
                        this.dataGrid.presentationTable = originalDataTable.modified;
                        _a.label = 3;
                    case 3:
                        this.sorting.shouldBeUpdated = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    return QueryingController;
}());
/* *
 *
 *  Default Export
 *
 * */
export default QueryingController;
