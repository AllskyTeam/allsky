/* *
 * Web Mercator projection, used for most online map tile services
 * */
'use strict';
/* *
 *
 *  Constants
 *
 * */
const r = 63.78137, deg2rad = Math.PI / 180;
/* *
 *
 *  Class
 *
 * */
class WebMercator {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        this.bounds = {
            x1: -200.37508342789243,
            x2: 200.37508342789243,
            y1: -200.3750834278071,
            y2: 200.3750834278071
        };
        this.maxLatitude = 85.0511287798; // The latitude that defines a square
    }
    /* *
     *
     *  Functions
     *
     * */
    forward(lonLat) {
        const sinLat = Math.sin(lonLat[1] * deg2rad), xy = [
            r * lonLat[0] * deg2rad,
            r * Math.log((1 + sinLat) / (1 - sinLat)) / 2
        ];
        if (Math.abs(lonLat[1]) > this.maxLatitude) {
            xy.outside = true;
        }
        return xy;
    }
    inverse(xy) {
        return [
            xy[0] / (r * deg2rad),
            (2 * Math.atan(Math.exp(xy[1] / r)) - (Math.PI / 2)) / deg2rad
        ];
    }
}
/* *
 *
 *  Default Export
 *
 * */
export default WebMercator;
