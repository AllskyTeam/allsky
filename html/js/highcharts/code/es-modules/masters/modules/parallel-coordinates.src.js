/**
 * @license Highcharts JS v@product.version@ (@product.date@)
 * @module highcharts/modules/parallel-coordinates
 * @requires highcharts
 *
 * Support for parallel coordinates in Highcharts
 *
 * (c) 2010-2024 Pawel Fus
 *
 * License: www.highcharts.com/license
 */
'use strict';
import Highcharts from '../../Core/Globals.js';
import ParallelCoordinates from '../../Extensions/ParallelCoordinates/ParallelCoordinates.js';
const G = Highcharts;
ParallelCoordinates.compose(G.Axis, G.Chart, G.defaultOptions, G.Series);
export default Highcharts;
