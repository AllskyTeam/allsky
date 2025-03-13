/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import ColorAxisLike from './Color/ColorAxisLike.js';
import U from '../Utilities.js';
var extend = U.extend;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function init(axis) {
    extend(axis, ColorAxisLike);
}
/* *
 *
 *  Default export
 *
 * */
var SolidGaugeAxis = {
    init: init
};
export default SolidGaugeAxis;
