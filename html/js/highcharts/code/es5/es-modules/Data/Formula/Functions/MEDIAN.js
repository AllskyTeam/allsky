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
import FormulaProcessor from '../FormulaProcessor.js';
/* *
 *
 *  Functions
 *
 * */
/**
 * Processor for the `MEDIAN(...values)` implementation. Calculates the median
 * average of the given values.
 *
 * @private
 * @function Formula.processorFunctions.MEDIAN
 *
 * @param {Highcharts.FormulaArguments} args
 * Arguments to process.
 *
 * @param {Highcharts.DataTable} [table]
 * Table to process.
 *
 * @return {number}
 * Result value of the process.
 */
function MEDIAN(args, table) {
    var median = [], values = FormulaProcessor.getArgumentsValues(args, table);
    for (var i = 0, iEnd = values.length, value = void 0; i < iEnd; ++i) {
        value = values[i];
        switch (typeof value) {
            case 'number':
                if (!isNaN(value)) {
                    median.push(value);
                }
                break;
            case 'object':
                for (var j = 0, jEnd = value.length, value2 = void 0; j < jEnd; ++j) {
                    value2 = value[j];
                    if (typeof value2 === 'number' &&
                        !isNaN(value2)) {
                        median.push(value2);
                    }
                }
                break;
        }
    }
    var count = median.length;
    if (!count) {
        return NaN;
    }
    var half = Math.floor(count / 2); // Floor because index starts at 0
    return (count % 2 ?
        median[half] : // Odd
        (median[half - 1] + median[half]) / 2 // Even
    );
}
/* *
 *
 *  Registry
 *
 * */
FormulaProcessor.registerProcessorFunction('MEDIAN', MEDIAN);
/* *
 *
 *  Default Export
 *
 * */
export default MEDIAN;
