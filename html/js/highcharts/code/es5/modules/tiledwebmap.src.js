/**
 * @license Highcharts JS v12.1.2 (2025-01-09)
 * @module highcharts/modules/tiledwebmap
 * @requires highcharts
 *
 * (c) 2009-2024
 *
 * License: www.highcharts.com/license
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else if(typeof define === 'function' && define.amd)
		define("highcharts/modules/tiledwebmap", [["highcharts/highcharts"], ["highcharts/highcharts","SeriesRegistry"]], factory);
	else if(typeof exports === 'object')
		exports["highcharts/modules/tiledwebmap"] = factory(require("highcharts"), require("highcharts")["SeriesRegistry"]);
	else
		root["Highcharts"] = factory(root["Highcharts"], root["Highcharts"]["SeriesRegistry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__944__, __WEBPACK_EXTERNAL_MODULE__512__) {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 512:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__512__;

/***/ }),

/***/ 944:
/***/ (function(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__944__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ tiledwebmap_src; }
});

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts"],"commonjs":["highcharts"],"commonjs2":["highcharts"],"root":["Highcharts"]}
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_ = __webpack_require__(944);
var highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default = /*#__PURE__*/__webpack_require__.n(highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_);
;// ./code/es5/es-modules/Maps/TilesProviders/OpenStreetMap.js
/* *
 * OpenStreetMap provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var OpenStreetMap = /** @class */ (function () {
    function OpenStreetMap() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Map data &copy2023' +
            ' <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
        this.initialProjectionName = 'WebMercator';
        this.subdomains = ['a', 'b', 'c'];
        this.themes = {
            Standard: {
                url: 'https://tile.openstreetmap.org/{zoom}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 19
            },
            Hot: {
                url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 19
            },
            OpenTopoMap: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 17,
                credits: "Map data: &copy; <a href=\"https://www.openstreetmap.org/copyright\">\n                OpenStreetMap</a> contributors, <a href=\"https://viewfinderpanoramas.org\">SRTM</a> \n                | Map style: &copy; <a href=\"https://opentopomap.org\">OpenTopoMap</a> \n                (<a href=\"https://creativecommons.org/licenses/by-sa/3.0/\">CC-BY-SA</a>)"
            }
        };
    }
    return OpenStreetMap;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_OpenStreetMap = (OpenStreetMap);

;// ./code/es5/es-modules/Maps/TilesProviders/Stamen.js
/* *
 * Stamen provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var Stamen = /** @class */ (function () {
    function Stamen() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('&copy; Map tiles by <a href="https://stamen.com">Stamen Design</a>,' +
            ' under <a href="https://creativecommons.org/licenses/by/3.0">CC BY' +
            ' 3.0</a>. Data by <a href="https://openstreetmap.org">OpenStreetMap' +
            '</a>, under <a href="https://www.openstreetmap.org/copyright">ODbL</a>');
        this.initialProjectionName = 'WebMercator';
        this.subdomains = ['a', 'b', 'c', 'd'];
        this.themes = {
            Toner: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 20
            },
            TonerBackground: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 20
            },
            TonerLite: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 20
            },
            Terrain: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 18
            },
            TerrainBackground: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}.png',
                minZoom: 0,
                maxZoom: 18
            },
            Watercolor: {
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png',
                minZoom: 1,
                maxZoom: 16,
                credits: ('&copy Map tiles by <a href="https://stamen.com">Stamen' +
                    ' Design</a>, under <a href="https://creativecommons.org/' +
                    'licenses/by/3.0">CC BY 3.0</a>. Data by <a href="https://' +
                    'openstreetmap.org">OpenStreetMap</a>, under <a href=' +
                    '"https://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>')
            }
        };
    }
    return Stamen;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_Stamen = (Stamen);

;// ./code/es5/es-modules/Maps/TilesProviders/LimaLabs.js
/* *
 * LimaLabs provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var LimaLabs = /** @class */ (function () {
    function LimaLabs() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Map data &copy;2023' +
            ' <a href="https://maps.lima-labs.com/">LimaLabs</a>');
        this.initialProjectionName = 'WebMercator';
        this.requiresApiKey = true;
        this.themes = {
            Standard: {
                url: 'https://cdn.lima-labs.com/{zoom}/{x}/{y}.png?api={apikey}',
                minZoom: 0,
                maxZoom: 20
            }
        };
    }
    return LimaLabs;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_LimaLabs = (LimaLabs);

;// ./code/es5/es-modules/Maps/TilesProviders/Thunderforest.js
/* *
 * Thunderforest provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var Thunderforest = /** @class */ (function () {
    function Thunderforest() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Maps &copy <a href="https://www.thunderforest.com">Thunderforest</a>' +
            ', Data &copy; <a href="https://www.openstreetmap.org/copyright">' +
            'OpenStreetMap contributors</a>');
        this.initialProjectionName = 'WebMercator';
        this.requiresApiKey = true;
        this.subdomains = ['a', 'b', 'c'];
        this.themes = {
            OpenCycleMap: {
                url: 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Transport: {
                url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            TransportDark: {
                url: 'https://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            SpinalMap: {
                url: 'https://{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Landscape: {
                url: 'https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Outdoors: {
                url: 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Pioneer: {
                url: 'https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            MobileAtlas: {
                url: 'https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Neighbourhood: {
                url: 'https://{s}.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            }
        };
    }
    return Thunderforest;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_Thunderforest = (Thunderforest);

;// ./code/es5/es-modules/Maps/TilesProviders/Esri.js
/* *
 * Esri provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var Esri = /** @class */ (function () {
    function Esri() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, ' +
            ' Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong),' +
            ' Esri (Thailand), TomTom, 2012');
        this.initialProjectionName = 'WebMercator';
        this.themes = {
            WorldStreetMap: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20
            },
            DeLorme: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Specialty/DeLorme_World_Base_Map/MapServer/tile/{z}/{y}/{x}',
                minZoom: 1,
                maxZoom: 11,
                credits: 'Tiles &copy; Esri &mdash; Copyright: &copy;2012 DeLorme'
            },
            WorldTopoMap: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20,
                credits: ('Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom,' +
                    ' Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL,' +
                    ' Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong),' +
                    ' and the GIS User Community')
            },
            WorldImagery: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20,
                credits: ('Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS,' +
                    ' AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP,' +
                    ' and the GIS User Community')
            },
            WorldTerrain: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 13,
                credits: ('Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme,' +
                    ' and NPS')
            },
            WorldShadedRelief: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 13,
                credits: 'Tiles &copy; Esri &mdash; Source: Esri'
            },
            WorldPhysical: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 8,
                credits: 'Tiles &copy; Esri &mdash; Source: US National Park Service'
            },
            NatGeoWorldMap: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 16,
                credits: ('Tiles &copy; Esri &mdash; National Geographic, Esri,' +
                    ' DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN,' +
                    ' GEBCO, NOAA, iPC')
            },
            WorldGrayCanvas: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 16,
                credits: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
            }
        };
    }
    return Esri;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_Esri = (Esri);

;// ./code/es5/es-modules/Maps/TilesProviders/USGS.js
/* *
 * USGS provider, used for tile map services
 * */

/* *
 *
 *  Class
 *
 * */
var USGS = /** @class */ (function () {
    function USGS() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological' +
            'Survey</a>');
        this.initialProjectionName = 'WebMercator';
        this.themes = {
            USTopo: {
                url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20
            },
            USImagery: {
                url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20
            },
            USImageryTopo: {
                url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
                minZoom: 0,
                maxZoom: 20
            }
        };
    }
    return USGS;
}());
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviders_USGS = (USGS);

;// ./code/es5/es-modules/Maps/TilesProviders/TilesProviderRegistry.js
/* *
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  Imports
 *
 * */






/* *
 *
 *  Constants
 *
 * */
var tilesProviderRegistry = {
    Esri: TilesProviders_Esri,
    LimaLabs: TilesProviders_LimaLabs,
    OpenStreetMap: TilesProviders_OpenStreetMap,
    Stamen: TilesProviders_Stamen,
    Thunderforest: TilesProviders_Thunderforest,
    USGS: TilesProviders_USGS
};
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TilesProviderRegistry = (tilesProviderRegistry);

// EXTERNAL MODULE: external {"amd":["highcharts/highcharts","SeriesRegistry"],"commonjs":["highcharts","SeriesRegistry"],"commonjs2":["highcharts","SeriesRegistry"],"root":["Highcharts","SeriesRegistry"]}
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_ = __webpack_require__(512);
var highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default = /*#__PURE__*/__webpack_require__.n(highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_);
;// ./code/es5/es-modules/Series/TiledWebMap/TiledWebMapSeriesDefaults.js
/* *
 *
 *  (c) 2010-2024 Hubert Kozik, Kamil Musiałowski
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

/* *
 *
 *  API Options
 *
 * */
/**
 * A tiledwebmap series allows user to display dynamically joined individual
 * images (tiles) and join them together to create a map.
 *
 * @sample maps/series-tiledwebmap/simple-demo-norway
 *         Simple demo of data for Norway on TiledWebMap
 * @sample maps/series-tiledwebmap/only-twm
 *         OpenStreetMap demo
 *
 * @extends      plotOptions.map
 * @excluding    affectsMapView, allAreas, allowPointSelect, animation,
 * animationLimit, boostBlending, boostThreshold, borderColor, borderWidth,
 * clip, color, colorAxis, colorByPoint, colorIndex, colorKey, colors,
 * cursor, dashStyle, dataLabels, dataParser, dataURL, dragDrop,
 * enableMouseTracking, findNearestPointBy, joinBy, keys, marker,
 * negativeColor, nullColor, nullInteraction, onPoint, point,
 * pointDescriptionFormatter, selected, shadow, showCheckbox,
 * sonification, stickyTracking, tooltip, type
 * @product      highmaps
 * @optionparent plotOptions.tiledwebmap
 */
var TiledWebMapSeriesDefaults = {
    states: {
        inactive: {
            enabled: false
        }
    }
};
/* *
 *
 *  API options
 *
 * */
/**
 * A `tiledwebmap` series. The [type](#series.tiledwebmap.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @sample maps/series-tiledwebmap/simple-demo-norway
 *         Simple demo of data for Norway on TiledWebMap
 * @sample maps/series-tiledwebmap/only-twm
 *         OpenStreetMap demo
 *
 * @extends   series,plotOptions.tiledwebmap
 * @excluding affectsMapView, allAreas, allowPointSelect, animation,
 * animationLimit, boostBlending, boostThreshold, borderColor, borderWidth,
 * clip, color, colorAxis, colorByPoint, colorIndex, colorKey, colors, cursor,
 * dashStyle, dataLabels, dataParser, dataURL, dragDrop, enableMouseTracking,
 * findNearestPointBy, joinBy, keys, marker, negativeColor, nullColor,
 * nullInteraction, onPoint, point, pointDescriptionFormatter, selected, shadow,
 * showCheckbox, stickyTracking, tooltip, type
 * @product   highmaps
 * @apioption series.tiledwebmap
 */
/**
 * Provider options for the series.
 *
 * @sample maps/series-tiledwebmap/human-anatomy
 *         Human Anatomy Explorer - Custom TiledWebMap Provider
 *
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider
 */
/**
 * Provider type to pull data (tiles) from.
 *
 * @sample maps/series-tiledwebmap/basic-configuration
 *         Basic configuration for TiledWebMap
 *
 * @type      {string}
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider.type
 */
/**
 * Set a tiles theme. Check the [providers documentation](https://www.highcharts.com/docs/maps/tiledwebmap)
 * for official list of available themes.
 *
 * @sample maps/series-tiledwebmap/europe-timezones
 *         Imagery basemap for Europe
 * @sample maps/series-tiledwebmap/hiking-trail
 *         Topo basemap and MapLine
 *
 * @type      {string}
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider.theme
 */
/**
 * Subdomain required by each provider. Check the [providers documentation](https://www.highcharts.com/docs/maps/tiledwebmap)
 * for available subdomains.
 *
 * @sample maps/series-tiledwebmap/basic-configuration
 *         Basic configuration for TiledWebMap
 *
 * @type      {string}
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider.subdomain
 */
/**
 * API key for providers that require using one.
 *
 * @type      {string}
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider.apiKey
 */
/**
 * Custom URL for providers not specified in [providers type](#series.
 * tiledwebmap.provider.type). Available variables to use in URL are: `{x}`,
 * `{y}`, `{z}` or `{zoom}`. Remember to always specify a projection, when
 * using a custom URL.
 *
 * @sample maps/series-tiledwebmap/custom-url
 *         Custom URL with projection in TiledWebMap configuration
 *
 * @type      {string}
 * @since 11.1.0
 * @product   highmaps
 * @apioption plotOptions.tiledwebmap.provider.url
 */
''; // Keeps doclets above detached
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TiledWebMap_TiledWebMapSeriesDefaults = (TiledWebMapSeriesDefaults);

;// ./code/es5/es-modules/Series/TiledWebMap/TiledWebMapSeries.js
/* *
 *
 *  (c) 2010-2024 Hubert Kozik, Kamil Musiałowski
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d,
        b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d,
        b) { d.__proto__ = b; }) ||
                function (d,
        b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var composed = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).composed;

var MapSeries = (highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default()).seriesTypes.map;



var addEvent = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).addEvent, defined = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).defined, error = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).error, merge = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).merge, pick = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pick, pushUnique = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()).pushUnique;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function onRecommendMapView(e) {
    var geoBounds = e.geoBounds,
        chart = e.chart,
        twm = (chart.options.series || []).filter(function (s) { return s.type === 'tiledwebmap'; })[0];
    if (twm && twm.provider && twm.provider.type && !twm.provider.url) {
        var ProviderDefinition = TilesProviderRegistry[twm.provider.type];
        if (!defined(ProviderDefinition)) {
            error('Highcharts warning: Tiles Provider not defined in the ' +
                'Provider Registry.', false);
        }
        else {
            var def = new ProviderDefinition(),
                providerProjectionName = def.initialProjectionName;
            if (geoBounds) {
                var x1 = geoBounds.x1,
                    y1 = geoBounds.y1,
                    x2 = geoBounds.x2,
                    y2 = geoBounds.y2;
                this.recommendedMapView = {
                    projection: {
                        name: providerProjectionName,
                        parallels: [y1, y2],
                        rotation: [-(x1 + x2) / 2]
                    }
                };
            }
            else {
                this.recommendedMapView = {
                    projection: {
                        name: providerProjectionName
                    },
                    minZoom: 0
                };
            }
            return false;
        }
    }
    return true;
}
/* *
 *
 *  Class
 *
 * */
/**
 * The series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.tiledwebmap
 *
 * @augments Highcharts.Series
 */
var TiledWebMapSeries = /** @class */ (function (_super) {
    __extends(TiledWebMapSeries, _super);
    function TiledWebMapSeries() {
        /* *
         *
         *  Static Properties
         *
         * */
        var _this = _super !== null && _super.apply(this,
            arguments) || this;
        _this.redrawTiles = false;
        _this.isAnimating = false;
        return _this;
    }
    /* *
     *
     *  Static Functions
     *
     * */
    TiledWebMapSeries.compose = function (MapViewClass) {
        if (pushUnique(composed, 'TiledWebMapSeries')) {
            addEvent(MapViewClass, 'onRecommendMapView', onRecommendMapView);
        }
    };
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Convert map coordinates in longitude/latitude to tile
     * @private
     * @param  {Highcharts.MapLonLatObject} lonLat
     *         The map coordinates
     * @return {Highcharts.PositionObject}
     *         Array of x and y positions of the tile
     */
    TiledWebMapSeries.prototype.lonLatToTile = function (lonLat, zoom) {
        var lon = lonLat.lon, lat = lonLat.lat, xTile = Math.floor((lon + 180) / 360 * Math.pow(2, zoom)), yTile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) +
                1 / Math.cos(lat * Math.PI / 180)) / Math.PI) /
                2 * Math.pow(2, zoom));
        return { x: xTile, y: yTile };
    };
    /**
     * Convert tile to map coordinates in longitude/latitude
     * @private
     * @param  xTile
     *         Position x of the tile
     * @param  yTile
     *         Position y of the tile
     * @param  zTile
     *         Zoom of the tile
     * @return {Highcharts.MapLonLatObject}
     *         The map coordinates
     */
    TiledWebMapSeries.prototype.tileToLonLat = function (xTile, yTile, zTile) {
        var lon = xTile / Math.pow(2, zTile) * 360 - 180, n = Math.PI - 2 * Math.PI * yTile / Math.pow(2, zTile), lat = (180 /
                Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
        return { lon: lon, lat: lat };
    };
    TiledWebMapSeries.prototype.drawPoints = function () {
        var _a;
        var chart = this.chart,
            mapView = chart.mapView;
        if (!mapView) {
            return;
        }
        var tiles = (this.tiles = this.tiles || {}),
            transformGroups = (this.transformGroups = this.transformGroups || []),
            series = this,
            options = this.options,
            provider = options.provider,
            zoom = mapView.zoom,
            lambda = pick((mapView.projection.options.rotation &&
                mapView.projection.options.rotation[0]), 0),
            worldSize = 400.979322,
            tileSize = 256,
            duration = chart.renderer.forExport ? 0 : 200,
            animateTiles = function (duration) {
                var _loop_2 = function (zoomKey) {
                    if ((parseFloat(zoomKey) === (mapView.zoom < 0 ? 0 :
                        Math.floor(mapView.zoom))) ||
                        (series.minZoom &&
                            (mapView.zoom < 0 ? 0 :
                                Math.floor(mapView.zoom)) < series.minZoom &&
                            parseFloat(zoomKey) === series.minZoom) ||
                        (series.maxZoom &&
                            (mapView.zoom < 0 ? 0 :
                                Math.floor(mapView.zoom)) > series.maxZoom &&
                            parseFloat(zoomKey) === series.maxZoom)) {
                        Object
                            .keys(tiles[zoomKey].tiles)
                            .forEach(function (key,
            i) {
                            tiles[zoomKey].tiles[key].animate({
                                opacity: 1
                            }, {
                                duration: duration
                            },
            function () {
                                if (i === Object.keys(tiles[zoomKey].tiles)
                                    .length - 1) {
                                    tiles[zoomKey].isActive = true;
                            }
                        });
                    });
                }
                else {
                    Object
                        .keys(tiles[zoomKey].tiles)
                        .forEach(function (key, i) {
                        tiles[zoomKey].tiles[key].animate({
                            opacity: 0
                        }, {
                            duration: duration,
                            defer: duration / 2
                        }, function () {
                            tiles[zoomKey].tiles[key].destroy();
                            delete tiles[zoomKey].tiles[key];
                            if (i === Object.keys(tiles[zoomKey].tiles)
                                .length - 1) {
                                tiles[zoomKey].isActive = false;
                                tiles[zoomKey].loaded = false;
                            }
                        });
                    });
                }
            };
            for (var _i = 0, _a = Object.keys(tiles); _i < _a.length; _i++) {
                var zoomKey = _a[_i];
                _loop_2(zoomKey);
            }
        };
        var zoomFloor = zoom < 0 ? 0 : Math.floor(zoom), maxTile = Math.pow(2, zoomFloor), scale = ((tileSize / worldSize) * Math.pow(2, zoom)) /
                ((tileSize / worldSize) * Math.pow(2, zoomFloor)), scaledTileSize = scale * 256;
        if (provider && (provider.type || provider.url)) {
            if (provider.type && !provider.url) {
                var ProviderDefinition = TilesProviderRegistry[provider.type];
                if (!defined(ProviderDefinition)) {
                    error('Highcharts warning: Tiles Provider \'' +
                        provider.type + '\' not defined in the Provider' +
                        'Registry.', false);
                    return;
                }
                var def = new ProviderDefinition(),
                    providerProjection = def.initialProjectionName;
                var theme = void 0,
                    subdomain = '';
                if (provider.theme && defined(def.themes[provider.theme])) {
                    theme = def.themes[provider.theme];
                }
                else {
                    // If nothing set take first theme
                    var firstTheme = Object.keys(def.themes)[0];
                    theme = def.themes[firstTheme];
                    error('Highcharts warning: The Tiles Provider\'s Theme \'' +
                        provider.theme + '\' is not defined in the Provider ' +
                        'definition - falling back to \'' + firstTheme + '\'.', false);
                }
                if (provider.subdomain &&
                    def.subdomains &&
                    def.subdomains.indexOf(provider.subdomain) !== -1) {
                    subdomain = provider.subdomain;
                }
                else if (defined(def.subdomains) &&
                    // Do not show warning if no subdomain in URL
                    theme.url.indexOf('{s}') !== -1) {
                    subdomain = pick(def.subdomains && def.subdomains[0], '');
                    error('Highcharts warning: The Tiles Provider\'s Subdomain ' +
                        '\'' + provider.subdomain + '\' is not defined in ' +
                        'the Provider definition - falling back to \'' +
                        subdomain + '\'.', false);
                }
                if (def.requiresApiKey) {
                    if (provider.apiKey) {
                        theme.url =
                            theme.url.replace('{apikey}', provider.apiKey);
                    }
                    else {
                        error('Highcharts warning: The Tiles Provider requires ' +
                            'API Key to use tiles, use provider.apiKey to ' +
                            'provide a token.', false);
                        theme.url = theme.url.replace('?apikey={apikey}', '');
                    }
                }
                provider.url = theme.url
                    .replace('{s}', subdomain);
                this.minZoom = theme.minZoom;
                this.maxZoom = theme.maxZoom;
                // Add as credits.text, to prevent changing the default mapText
                var creditsText = pick(chart.userOptions.credits && chart.userOptions.credits.text, 'Highcharts.com ' + pick(theme.credits,
                    def.defaultCredits));
                if (chart.credits) {
                    chart.credits.update({
                        text: creditsText
                    });
                }
                else {
                    chart.addCredits({
                        text: creditsText,
                        style: pick((_a = chart.options.credits) === null || _a === void 0 ? void 0 : _a.style, {})
                    });
                }
                if (mapView.projection.options.name !== providerProjection) {
                    error('Highcharts warning: The set projection is different ' +
                        'than supported by Tiles Provider.', false);
                }
            }
            else {
                if (!mapView.projection.options.name) {
                    error('Highcharts warning: The set projection is different ' +
                        'than supported by Tiles Provider.', false);
                }
            }
            // If zoom is smaller/higher than supported by provider
            if (defined(this.minZoom) && zoomFloor < this.minZoom) {
                zoomFloor = this.minZoom;
                maxTile = Math.pow(2, zoomFloor);
                scale = ((tileSize / worldSize) * Math.pow(2, zoom)) /
                    ((tileSize / worldSize) * Math.pow(2, zoomFloor));
                scaledTileSize = scale * 256;
            }
            else if (defined(this.maxZoom) && zoomFloor > this.maxZoom) {
                zoomFloor = this.maxZoom;
                maxTile = Math.pow(2, zoomFloor);
                scale = ((tileSize / worldSize) * Math.pow(2, zoom)) /
                    ((tileSize / worldSize) * Math.pow(2, zoomFloor));
                scaledTileSize = scale * 256;
            }
            if (mapView.projection && mapView.projection.def) {
                // Always true for tile maps
                mapView.projection.hasCoordinates = true;
                if (!transformGroups[zoomFloor]) {
                    transformGroups[zoomFloor] =
                        chart.renderer.g().add(this.group);
                }
                var replaceVariables_1 = function (url,
                    x,
                    y,
                    zoom) { return url
                        .replace('{x}',
                    x.toString())
                        .replace('{y}',
                    y.toString())
                        .replace('{zoom}',
                    zoom.toString())
                        .replace('{z}',
                    zoom.toString()); };
                var addTile = function (x,
                    y,
                    givenZoom,
                    translateX,
                    translateY) {
                        var modX = x % maxTile,
                    modY = y % maxTile,
                    tileX = modX < 0 ? modX + maxTile : modX,
                    tileY = modY < 0 ? modY + maxTile : modY;
                    if (!tiles["".concat(givenZoom)].tiles["" + x + ",".concat(y)]) {
                        if (provider.url) {
                            var url = replaceVariables_1(provider.url,
                                tileX,
                                tileY,
                                givenZoom);
                            tiles[givenZoom].loaded = false;
                            tiles["".concat(givenZoom)].tiles["" + x + ",".concat(y)] =
                                chart.renderer.image(url, (x * scaledTileSize) - translateX, (y * scaledTileSize) - translateY, scaledTileSize, scaledTileSize)
                                    .attr({
                                    zIndex: 2,
                                    opacity: 0
                                })
                                    .on('load', function () {
                                    if (provider.onload) {
                                        provider.onload.apply(this);
                                    }
                                    if ((givenZoom ===
                                        (mapView.zoom < 0 ? 0 :
                                            Math.floor(mapView.zoom))) ||
                                        givenZoom === series.minZoom) {
                                        tiles["".concat(givenZoom)]
                                            .actualTilesCount++;
                                        // If last tile
                                        if (tiles["".concat(givenZoom)]
                                            .howManyTiles ===
                                            tiles["".concat(givenZoom)]
                                                .actualTilesCount) {
                                            tiles[givenZoom].loaded = true;
                                            // Fade-in new tiles if there is
                                            // no other animation
                                            if (!series.isAnimating) {
                                                series.redrawTiles = false;
                                                animateTiles(duration);
                                            }
                                            else {
                                                series.redrawTiles = true;
                                            }
                                            tiles["".concat(givenZoom)]
                                                .actualTilesCount = 0;
                                        }
                                    }
                                })
                                    .add(transformGroups[givenZoom]);
                            tiles["".concat(givenZoom)].tiles["" + x + ",".concat(y)].posX = x;
                            tiles["".concat(givenZoom)].tiles["" + x + ",".concat(y)].posY = y;
                            tiles["".concat(givenZoom)].tiles["" + x + ",".concat(y)]
                                .originalURL = url;
                        }
                    }
                };
                // Calculate topLeft and bottomRight corners without normalize
                var topLeftUnits = mapView.pixelsToProjectedUnits({
                        x: 0,
                        y: 0
                    }),
                    topLeftArr = mapView.projection.def.inverse([topLeftUnits.x,
                    topLeftUnits.y]),
                    topLeft = {
                        lon: topLeftArr[0] - lambda,
                        lat: topLeftArr[1]
                    },
                    bottomRightUnits = mapView.pixelsToProjectedUnits({
                        x: chart.plotWidth,
                        y: chart.plotHeight
                    }),
                    bottomRightArr = mapView.projection.def.inverse([bottomRightUnits.x,
                    bottomRightUnits.y]),
                    bottomRight = {
                        lon: bottomRightArr[0] - lambda,
                        lat: bottomRightArr[1]
                    };
                // Do not support vertical looping
                if (topLeft.lat > mapView.projection.maxLatitude ||
                    bottomRight.lat < -1 * mapView.projection.maxLatitude) {
                    topLeft.lat = mapView.projection.maxLatitude;
                    bottomRight.lat = -1 * mapView.projection.maxLatitude;
                }
                var startPos = this.lonLatToTile(topLeft,
                    zoomFloor),
                    endPos = this.lonLatToTile(bottomRight,
                    zoomFloor);
                // Calculate group translations based on first loaded tile
                var firstTileLonLat = this.tileToLonLat(startPos.x,
                    startPos.y,
                    zoomFloor),
                    units = mapView.projection.def.forward([
                        firstTileLonLat.lon + lambda,
                        firstTileLonLat.lat
                    ]),
                    firstTilePx = mapView.projectedUnitsToPixels({
                        x: units[0],
                    y: units[1]
                    }),
                    translateX = (startPos.x * scaledTileSize - firstTilePx.x),
                    translateY = (startPos.y * scaledTileSize - firstTilePx.y);
                if (!tiles["".concat(zoomFloor)]) {
                    tiles["".concat(zoomFloor)] = {
                        tiles: {},
                        isActive: false,
                        howManyTiles: 0,
                        actualTilesCount: 0,
                        loaded: false
                    };
                }
                tiles["".concat(zoomFloor)].howManyTiles =
                    (endPos.x - startPos.x + 1) * (endPos.y - startPos.y + 1);
                tiles["".concat(zoomFloor)].actualTilesCount = 0;
                for (var x = startPos.x; x <= endPos.x; x++) {
                    for (var y = startPos.y; y <= endPos.y; y++) {
                        addTile(x, y, zoomFloor, translateX, translateY);
                    }
                }
            }
            var _loop_1 = function (zoomKey) {
                    var _loop_3 = function (key) {
                        if (mapView.projection && mapView.projection.def) {
                            // Calculate group translations based on first loaded
                            // tile
                            var scale_1 = ((tileSize / worldSize) *
                                Math.pow(2, zoom)) / ((tileSize / worldSize) *
                                Math.pow(2, parseFloat(zoomKey))), scaledTileSize_1 = scale_1 * 256, firstTile = tiles[zoomKey].tiles[Object.keys(tiles[zoomKey].tiles)[0]], _e = tiles[zoomKey].tiles[key], posX_1 = _e.posX, posY_1 = _e.posY;
                        if (defined(posX_1) &&
                            defined(posY_1) &&
                            defined(firstTile.posX) &&
                            defined(firstTile.posY)) {
                            var firstTileLonLat = this_1.tileToLonLat(firstTile.posX,
                                firstTile.posY,
                                parseFloat(zoomKey)),
                                units = mapView.projection.def.forward([
                                    firstTileLonLat.lon + lambda,
                                    firstTileLonLat.lat
                                ]),
                                firstTilePx = mapView.projectedUnitsToPixels({
                                    x: units[0],
                                y: units[1]
                                }),
                                tilesOffsetX_1 = (firstTile.posX * scaledTileSize_1) -
                                    firstTilePx.x,
                                tilesOffsetY_1 = (firstTile.posY * scaledTileSize_1) -
                                    firstTilePx.y;
                            if (chart.renderer.globalAnimation &&
                                chart.hasRendered) {
                                var startX_1 = Number(tiles[zoomKey].tiles[key].attr('x')), startY_1 = Number(tiles[zoomKey].tiles[key].attr('y')), startWidth_1 = Number(tiles[zoomKey].tiles[key].attr('width')), startHeight_1 = Number(tiles[zoomKey].tiles[key].attr('height'));
                                var step = function (now,
                                    fx) {
                                        tiles[zoomKey].tiles[key].attr({
                                            x: (startX_1 + (((posX_1 * scaledTileSize_1) -
                                                tilesOffsetX_1 - startX_1) * fx.pos)),
                                            y: (startY_1 + (((posY_1 * scaledTileSize_1) -
                                                tilesOffsetY_1 - startY_1) * fx.pos)),
                                            width: (startWidth_1 + ((Math.ceil(scaledTileSize_1) + 1 -
                                                startWidth_1) * fx.pos)),
                                            height: (startHeight_1 + ((Math.ceil(scaledTileSize_1) + 1 -
                                                startHeight_1) * fx.pos))
                                        });
                                };
                                series.isAnimating = true;
                                tiles[zoomKey].tiles[key]
                                    .attr({ animator: 0 })
                                    .animate({ animator: 1 }, { step: step }, function () {
                                    series.isAnimating = false;
                                    // If animate ended after loading
                                    // the tiles
                                    if (series.redrawTiles) {
                                        series.redrawTiles = false;
                                        animateTiles(duration);
                                    }
                                });
                                // When dragging or first rendering,
                                // animation is off
                            }
                            else {
                                // Animate tiles if something broke
                                if (series.redrawTiles ||
                                    parseFloat(zoomKey) !== zoomFloor ||
                                    ((tiles[zoomKey].isActive ||
                                        parseFloat(zoomKey) === zoomFloor) &&
                                        Object.keys(tiles[zoomKey].tiles)
                                            .map(function (key) {
                                            return tiles[zoomKey].tiles[key];
                                        })
                                            .some(function (tile) {
                                            return tile.opacity === 0;
                                        }))) {
                                    series.redrawTiles = false;
                                    animateTiles(duration);
                                }
                                tiles[zoomKey].tiles[key].attr({
                                    x: (posX_1 * scaledTileSize_1) - tilesOffsetX_1,
                                    y: (posY_1 * scaledTileSize_1) - tilesOffsetY_1,
                                    width: Math.ceil(scaledTileSize_1) + 1,
                                    height: Math.ceil(scaledTileSize_1) + 1
                                });
                            }
                        }
                    }
                };
                for (var _c = 0, _d = Object.keys(tiles[zoomKey].tiles); _c < _d.length; _c++) {
                    var key = _d[_c];
                    _loop_3(key);
                }
            };
            var this_1 = this;
            for (var _i = 0, _b = Object.keys(tiles); _i < _b.length; _i++) {
                var zoomKey = _b[_i];
                _loop_1(zoomKey);
            }
        }
        else {
            error('Highcharts warning: Tiles Provider not defined in the ' +
                'Provider Registry.', false);
        }
    };
    TiledWebMapSeries.prototype.update = function () {
        var _a;
        var series = this,
            transformGroups = series.transformGroups,
            chart = this.chart,
            mapView = chart.mapView,
            options = arguments[0],
            provider = options.provider;
        if (transformGroups) {
            transformGroups.forEach(function (group) {
                if (Object.keys(group).length !== 0) {
                    group.destroy();
                }
            });
            this.transformGroups = [];
        }
        if (mapView &&
            !defined((_a = chart.userOptions.mapView) === null || _a === void 0 ? void 0 : _a.projection) &&
            provider &&
            provider.type) {
            var ProviderDefinition = TilesProviderRegistry[provider.type];
            if (ProviderDefinition) {
                var def = new ProviderDefinition(),
                    providerProjectionName = def.initialProjectionName;
                mapView.update({
                    projection: {
                        name: providerProjectionName
                    }
                });
            }
        }
        _super.prototype.update.apply(series, arguments);
    };
    TiledWebMapSeries.defaultOptions = merge(MapSeries.defaultOptions, TiledWebMap_TiledWebMapSeriesDefaults);
    return TiledWebMapSeries;
}(MapSeries));
highcharts_SeriesRegistry_commonjs_highcharts_SeriesRegistry_commonjs2_highcharts_SeriesRegistry_root_Highcharts_SeriesRegistry_default().registerSeriesType('tiledwebmap', TiledWebMapSeries);
/* *
 *
 *  Default Export
 *
 * */
/* harmony default export */ var TiledWebMap_TiledWebMapSeries = (TiledWebMapSeries);

;// ./code/es5/es-modules/masters/modules/tiledwebmap.src.js





var G = (highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default());
G.TilesProviderRegistry = G.TilesProviderRegistry || TilesProviderRegistry;
TiledWebMap_TiledWebMapSeries.compose(G.MapView);
/* harmony default export */ var tiledwebmap_src = ((highcharts_commonjs_highcharts_commonjs2_highcharts_root_Highcharts_default()));

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});