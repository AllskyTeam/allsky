/* *
 * Miller projection
 * */
'use strict';
/* *
 *
 *  Constants
 *
 * */
var quarterPI = Math.PI / 4, deg2rad = Math.PI / 180, scale = 63.78137;
/* *
 *
 *  Class
 *
 * */
var Miller = /** @class */ (function () {
    function Miller() {
        /* *
         *
         *  Properties
         *
         * */
        this.bounds = {
            x1: -200.37508342789243,
            x2: 200.37508342789243,
            y1: -146.91480769173063,
            y2: 146.91480769173063
        };
    }
    /* *
     *
     *  Functions
     *
     * */
    Miller.prototype.forward = function (lonLat) {
        return [
            lonLat[0] * deg2rad * scale,
            1.25 * scale * Math.log(Math.tan(quarterPI + 0.4 * lonLat[1] * deg2rad))
        ];
    };
    Miller.prototype.inverse = function (xy) {
        return [
            (xy[0] / scale) / deg2rad,
            2.5 * (Math.atan(Math.exp(0.8 * (xy[1] / scale))) - quarterPI) / deg2rad
        ];
    };
    return Miller;
}());
/* *
 *
 *  Default Export
 *
 * */
export default Miller;
