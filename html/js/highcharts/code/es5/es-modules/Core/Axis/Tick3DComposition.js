/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Extension for 3d axes
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../Globals.js';
var composed = H.composed;
import U from '../Utilities.js';
var addEvent = U.addEvent, extend = U.extend, pushUnique = U.pushUnique, wrap = U.wrap;
/* *
 *
 *  Functions
 *
 * */
/**
 * @private
 */
function compose(TickClass) {
    if (pushUnique(composed, 'Axis.Tick3D')) {
        addEvent(TickClass, 'afterGetLabelPosition', onTickAfterGetLabelPosition);
        wrap(TickClass.prototype, 'getMarkPath', wrapTickGetMarkPath);
    }
}
/**
 * @private
 */
function onTickAfterGetLabelPosition(e) {
    var axis3D = this.axis.axis3D;
    if (axis3D) {
        extend(e.pos, axis3D.fix3dPosition(e.pos));
    }
}
/**
 * @private
 */
function wrapTickGetMarkPath(proceed) {
    var axis3D = this.axis.axis3D, path = proceed.apply(this, [].slice.call(arguments, 1));
    if (axis3D) {
        var start = path[0];
        var end = path[1];
        if (start[0] === 'M' && end[0] === 'L') {
            var pArr = [
                axis3D.fix3dPosition({ x: start[1], y: start[2], z: 0 }),
                axis3D.fix3dPosition({ x: end[1], y: end[2], z: 0 })
            ];
            return this.axis.chart.renderer.toLineSegments(pArr);
        }
    }
    return path;
}
/* *
 *
 *  Default Export
 *
 * */
var Tick3DAdditions = {
    compose: compose
};
export default Tick3DAdditions;
