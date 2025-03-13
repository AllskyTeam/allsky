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
import OpenStreetMap from './OpenStreetMap.js';
import Stamen from './Stamen.js';
import LimaLabs from './LimaLabs.js';
import Thunderforest from './Thunderforest.js';
import Esri from './Esri.js';
import USGS from './USGS.js';
/* *
 *
 *  Constants
 *
 * */
var tilesProviderRegistry = {
    Esri: Esri,
    LimaLabs: LimaLabs,
    OpenStreetMap: OpenStreetMap,
    Stamen: Stamen,
    Thunderforest: Thunderforest,
    USGS: USGS
};
/* *
 *
 *  Default Export
 *
 * */
export default tilesProviderRegistry;
