/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
/* *
 *
 *  Imports
 *
 * */
import LambertConformalConic from './LambertConformalConic.js';
import EqualEarth from './EqualEarth.js';
import Miller from './Miller.js';
import Orthographic from './Orthographic.js';
import WebMercator from './WebMercator.js';
/* *
 *
 *  Constants
 *
 * */
var projectionRegistry = {
    EqualEarth: EqualEarth,
    LambertConformalConic: LambertConformalConic,
    Miller: Miller,
    Orthographic: Orthographic,
    WebMercator: WebMercator
};
/* *
 *
 *  Default Export
 *
 * */
export default projectionRegistry;
