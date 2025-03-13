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
const { seriesTypes: { treemap: TreemapSeries } } = SeriesRegistry;
import U from '../../Core/Utilities.js';
const { isNumber, isObject, merge } = U;
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
    const p = isObject(params) ? params : {};
    let result, totalWeight = 0, diffRadius, levels, levelsNotIncluded, remainingSize, from, to;
    if (isObject(levelOptions)) {
        result = merge({}, levelOptions);
        from = isNumber(p.from) ? p.from : 0;
        to = isNumber(p.to) ? p.to : 0;
        levels = range(from, to);
        levelsNotIncluded = Object.keys(result).filter((key) => (levels.indexOf(+key) === -1));
        diffRadius = remainingSize = isNumber(p.diffRadius) ?
            p.diffRadius : 0;
        // Convert percentage to pixels.
        // Calculate the remaining size to divide between "weight" levels.
        // Calculate total weight to use in conversion from weight to
        // pixels.
        for (const level of levels) {
            const options = result[level], unit = options.levelSize.unit, value = options.levelSize.value;
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
        for (const level of levels) {
            const options = result[level];
            if (options.levelSize.unit === 'weight') {
                const weight = options.levelSize.value;
                result[level].levelSize = {
                    unit: 'pixels',
                    value: (weight / totalWeight) * remainingSize
                };
            }
        }
        // Set all levels not included in interval [from,to] to have 0
        // pixels.
        for (const level of levelsNotIncluded) {
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
function getLevelFromAndTo({ level, height }) {
    //  Never displays level below 1
    const from = level > 0 ? level : 1;
    const to = level + height;
    return { from, to };
}
/**
 * TODO introduce step, which should default to 1.
 * @private
 */
function range(from, to) {
    const result = [];
    if (isNumber(from) && isNumber(to) && from <= to) {
        for (let i = from; i <= to; i++) {
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
const SunburstUtilities = {
    calculateLevelSizes,
    getLevelFromAndTo,
    range,
    recursive: TreemapSeries.prototype.utils.recursive
};
export default SunburstUtilities;
