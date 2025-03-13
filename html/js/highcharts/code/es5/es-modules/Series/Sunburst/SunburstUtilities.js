/* *
 *
 *  This module implements sunburst charts in Highcharts.
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var TreemapSeries = SeriesRegistry.seriesTypes.treemap;
import U from '../../Core/Utilities.js';
var isNumber = U.isNumber, isObject = U.isObject, merge = U.merge;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 * @function calculateLevelSizes
 *
 * @param {Object} levelOptions
 * Map of level to its options.
 *
 * @param {Highcharts.Dictionary<number>} params
 * Object containing number parameters `innerRadius` and `outerRadius`.
 *
 * @return {Highcharts.SunburstSeriesLevelsOptions|undefined}
 * Returns the modified options, or undefined.
 */
function calculateLevelSizes(levelOptions, params) {
    var p = isObject(params) ? params : {};
    var result, totalWeight = 0, diffRadius, levels, levelsNotIncluded, remainingSize, from, to;
    if (isObject(levelOptions)) {
        result = merge({}, levelOptions);
        from = isNumber(p.from) ? p.from : 0;
        to = isNumber(p.to) ? p.to : 0;
        levels = range(from, to);
        levelsNotIncluded = Object.keys(result).filter(function (key) { return (levels.indexOf(+key) === -1); });
        diffRadius = remainingSize = isNumber(p.diffRadius) ?
            p.diffRadius : 0;
        // Convert percentage to pixels.
        // Calculate the remaining size to divide between "weight" levels.
        // Calculate total weight to use in conversion from weight to
        // pixels.
        for (var _i = 0, levels_1 = levels; _i < levels_1.length; _i++) {
            var level = levels_1[_i];
            var options = result[level], unit = options.levelSize.unit, value = options.levelSize.value;
            if (unit === 'weight') {
                totalWeight += value;
            }
            else if (unit === 'percentage') {
                options.levelSize = {
                    unit: 'pixels',
                    value: (value / 100) * diffRadius
                };
                remainingSize -= options.levelSize.value;
            }
            else if (unit === 'pixels') {
                remainingSize -= value;
            }
        }
        // Convert weight to pixels.
        for (var _a = 0, levels_2 = levels; _a < levels_2.length; _a++) {
            var level = levels_2[_a];
            var options = result[level];
            if (options.levelSize.unit === 'weight') {
                var weight = options.levelSize.value;
                result[level].levelSize = {
                    unit: 'pixels',
                    value: (weight / totalWeight) * remainingSize
                };
            }
        }
        // Set all levels not included in interval [from,to] to have 0
        // pixels.
        for (var _b = 0, levelsNotIncluded_1 = levelsNotIncluded; _b < levelsNotIncluded_1.length; _b++) {
            var level = levelsNotIncluded_1[_b];
            result[level].levelSize = {
                value: 0,
                unit: 'pixels'
            };
        }
    }
    return result;
}
/**
 * @private
 */
function getLevelFromAndTo(_a) {
    var level = _a.level, height = _a.height;
    //  Never displays level below 1
    var from = level > 0 ? level : 1;
    var to = level + height;
    return { from: from, to: to };
}
/**
 * TODO introduce step, which should default to 1.
 * @private
 */
function range(from, to) {
    var result = [];
    if (isNumber(from) && isNumber(to) && from <= to) {
        for (var i = from; i <= to; i++) {
            result.push(i);
        }
    }
    return result;
}
/* *
 *
 *  Default Export
 *
 * */
var SunburstUtilities = {
    calculateLevelSizes: calculateLevelSizes,
    getLevelFromAndTo: getLevelFromAndTo,
    range: range,
    recursive: TreemapSeries.prototype.utils.recursive
};
export default SunburstUtilities;
