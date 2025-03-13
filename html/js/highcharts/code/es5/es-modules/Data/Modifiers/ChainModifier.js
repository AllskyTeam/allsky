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
 *  - Dawid Dragula
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
import DataModifier from './DataModifier.js';
import U from '../../Core/Utilities.js';
var merge = U.merge;
/* *
 *
 *  Class
 *
 * */
/**
 * Modifies a table with the help of modifiers in an ordered chain.
 *
 */
var ChainModifier = /** @class */ (function (_super) {
    __extends(ChainModifier, _super);
    /* *
     *
     *  Constructor
     *
     * */
    /**
     * Constructs an instance of the modifier chain.
     *
     * @param {Partial<ChainModifier.Options>} [options]
     * Options to configure the modifier chain.
     *
     * @param {...DataModifier} [chain]
     * Ordered chain of modifiers.
     */
    function ChainModifier(options) {
        var chain = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            chain[_i - 1] = arguments[_i];
        }
        var _this = _super.call(this) || this;
        _this.chain = chain;
        _this.options = merge(ChainModifier.defaultOptions, options);
        var optionsChain = _this.options.chain || [];
        for (var i = 0, iEnd = optionsChain.length, modifierOptions = void 0, ModifierClass = void 0; i < iEnd; ++i) {
            modifierOptions = optionsChain[i];
            if (!modifierOptions.type) {
                continue;
            }
            ModifierClass = DataModifier.types[modifierOptions.type];
            if (ModifierClass) {
                chain.push(new ModifierClass(modifierOptions));
            }
        }
        return _this;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Adds a configured modifier to the end of the modifier chain. Please note,
     * that the modifier can be added multiple times.
     *
     * @param {DataModifier} modifier
     * Configured modifier to add.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     */
    ChainModifier.prototype.add = function (modifier, eventDetail) {
        this.emit({
            type: 'addModifier',
            detail: eventDetail,
            modifier: modifier
        });
        this.chain.push(modifier);
        this.emit({
            type: 'addModifier',
            detail: eventDetail,
            modifier: modifier
        });
    };
    /**
     * Clears all modifiers from the chain.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     */
    ChainModifier.prototype.clear = function (eventDetail) {
        this.emit({
            type: 'clearChain',
            detail: eventDetail
        });
        this.chain.length = 0;
        this.emit({
            type: 'afterClearChain',
            detail: eventDetail
        });
    };
    /**
     * Applies several modifications to the table and returns a modified copy of
     * the given table.
     *
     * @param {Highcharts.DataTable} table
     * Table to modify.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Promise<Highcharts.DataTable>}
     * Table with `modified` property as a reference.
     */
    ChainModifier.prototype.modify = function (table, eventDetail) {
        return __awaiter(this, void 0, void 0, function () {
            var modifiers, modified, i, iEnd, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        modifiers = (this.options.reverse ?
                            this.chain.slice().reverse() :
                            this.chain.slice());
                        if (table.modified === table) {
                            table.modified = table.clone(false, eventDetail);
                        }
                        modified = table;
                        i = 0, iEnd = modifiers.length;
                        _a.label = 1;
                    case 1:
                        if (!(i < iEnd)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, modifiers[i].modify(modified, eventDetail)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        this.emit({
                            type: 'error',
                            detail: eventDetail,
                            table: table
                        });
                        throw error_1;
                    case 5:
                        modified = modified.modified;
                        _a.label = 6;
                    case 6:
                        ++i;
                        return [3 /*break*/, 1];
                    case 7:
                        table.modified = modified;
                        return [2 /*return*/, table];
                }
            });
        });
    };
    /**
     * Applies partial modifications of a cell change to the property `modified`
     * of the given modified table.
     *
     * *Note:* The `modified` property of the table gets replaced.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {string} columnName
     * Column name of changed cell.
     *
     * @param {number|undefined} rowIndex
     * Row index of changed cell.
     *
     * @param {Highcharts.DataTableCellType} cellValue
     * Changed cell value.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    ChainModifier.prototype.modifyCell = function (table, columnName, rowIndex, cellValue, eventDetail) {
        var modifiers = (this.options.reverse ?
            this.chain.reverse() :
            this.chain);
        if (modifiers.length) {
            var clone = table.clone();
            for (var i = 0, iEnd = modifiers.length; i < iEnd; ++i) {
                modifiers[i].modifyCell(clone, columnName, rowIndex, cellValue, eventDetail);
                clone = clone.modified;
            }
            table.modified = clone;
        }
        return table;
    };
    /**
     * Applies partial modifications of column changes to the property
     * `modified` of the given table.
     *
     * *Note:* The `modified` property of the table gets replaced.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Highcharts.DataTableColumnCollection} columns
     * Changed columns as a collection, where the keys are the column names.
     *
     * @param {number} [rowIndex=0]
     * Index of the first changed row.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    ChainModifier.prototype.modifyColumns = function (table, columns, rowIndex, eventDetail) {
        var modifiers = (this.options.reverse ?
            this.chain.reverse() :
            this.chain.slice());
        if (modifiers.length) {
            var clone = table.clone();
            for (var i = 0, iEnd = modifiers.length; i < iEnd; ++i) {
                modifiers[i].modifyColumns(clone, columns, rowIndex, eventDetail);
                clone = clone.modified;
            }
            table.modified = clone;
        }
        return table;
    };
    /**
     * Applies partial modifications of row changes to the property `modified`
     * of the given table.
     *
     * *Note:* The `modified` property of the table gets replaced.
     *
     * @param {Highcharts.DataTable} table
     * Modified table.
     *
     * @param {Array<(Highcharts.DataTableRow|Highcharts.DataTableRowObject)>} rows
     * Changed rows.
     *
     * @param {number} [rowIndex]
     * Index of the first changed row.
     *
     * @param {Highcharts.DataTableEventDetail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {Highcharts.DataTable}
     * Table with `modified` property as a reference.
     */
    ChainModifier.prototype.modifyRows = function (table, rows, rowIndex, eventDetail) {
        var modifiers = (this.options.reverse ?
            this.chain.reverse() :
            this.chain.slice());
        if (modifiers.length) {
            var clone = table.clone();
            for (var i = 0, iEnd = modifiers.length; i < iEnd; ++i) {
                modifiers[i].modifyRows(clone, rows, rowIndex, eventDetail);
                clone = clone.modified;
            }
            table.modified = clone;
        }
        return table;
    };
    /**
     * Applies several modifications to the table.
     *
     * *Note:* The `modified` property of the table gets replaced.
     *
     * @param {DataTable} table
     * Table to modify.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     *
     * @return {DataTable}
     * Table as a reference.
     *
     * @emits ChainDataModifier#execute
     * @emits ChainDataModifier#afterExecute
     */
    ChainModifier.prototype.modifyTable = function (table, eventDetail) {
        var chain = this;
        chain.emit({
            type: 'modify',
            detail: eventDetail,
            table: table
        });
        var modifiers = (chain.options.reverse ?
            chain.chain.reverse() :
            chain.chain.slice());
        var modified = table.modified;
        for (var i = 0, iEnd = modifiers.length, modifier = void 0; i < iEnd; ++i) {
            modifier = modifiers[i];
            modified = modifier.modifyTable(modified, eventDetail).modified;
        }
        table.modified = modified;
        chain.emit({
            type: 'afterModify',
            detail: eventDetail,
            table: table
        });
        return table;
    };
    /**
     * Removes a configured modifier from all positions in the modifier chain.
     *
     * @param {DataModifier} modifier
     * Configured modifier to remove.
     *
     * @param {DataEvent.Detail} [eventDetail]
     * Custom information for pending events.
     */
    ChainModifier.prototype.remove = function (modifier, eventDetail) {
        var modifiers = this.chain;
        this.emit({
            type: 'removeModifier',
            detail: eventDetail,
            modifier: modifier
        });
        modifiers.splice(modifiers.indexOf(modifier), 1);
        this.emit({
            type: 'afterRemoveModifier',
            detail: eventDetail,
            modifier: modifier
        });
    };
    /* *
     *
     *  Static Properties
     *
     * */
    /**
     * Default option for the ordered modifier chain.
     */
    ChainModifier.defaultOptions = {
        type: 'Chain'
    };
    return ChainModifier;
}(DataModifier));
DataModifier.registerType('Chain', ChainModifier);
/* *
 *
 *  Default Export
 *
 * */
export default ChainModifier;
