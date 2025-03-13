/* *
 *
 *  (c) 2010-2024 Hubert Kozik, Kamil Musiałowski
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import H from '../../Core/Globals.js';
var composed = H.composed;
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var MapSeries = SeriesRegistry.seriesTypes.map;
import TilesProvidersRegistry from '../../Maps/TilesProviders/TilesProviderRegistry.js';
import TiledWebMapSeriesDefaults from './TiledWebMapSeriesDefaults.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, error = U.error, merge = U.merge, pick = U.pick, pushUnique = U.pushUnique;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function onRecommendMapView(e) {
    var geoBounds = e.geoBounds, chart = e.chart, twm = (chart.options.series || []).filter(function (s) { return s.type === 'tiledwebmap'; })[0];
    if (twm && twm.provider && twm.provider.type && !twm.provider.url) {
        var ProviderDefinition = TilesProvidersRegistry[twm.provider.type];
        if (!defined(ProviderDefinition)) {
            error('Highcharts warning: Tiles Provider not defined in the ' +
                'Provider Registry.', false);
        }
        else {
            var def = new ProviderDefinition(), providerProjectionName = def.initialProjectionName;
            if (geoBounds) {
                var x1 = geoBounds.x1, y1 = geoBounds.y1, x2 = geoBounds.x2, y2 = geoBounds.y2;
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
        var _this = _super !== null && _super.apply(this, arguments) || this;
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
        var chart = this.chart, mapView = chart.mapView;
        if (!mapView) {
            return;
        }
        var tiles = (this.tiles = this.tiles || {}), transformGroups = (this.transformGroups = this.transformGroups || []), series = this, options = this.options, provider = options.provider, zoom = mapView.zoom, lambda = pick((mapView.projection.options.rotation &&
            mapView.projection.options.rotation[0]), 0), worldSize = 400.979322, tileSize = 256, duration = chart.renderer.forExport ? 0 : 200, animateTiles = function (duration) {
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
                        .forEach(function (key, i) {
                        tiles[zoomKey].tiles[key].animate({
                            opacity: 1
                        }, {
                            duration: duration
                        }, function () {
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
                var ProviderDefinition = TilesProvidersRegistry[provider.type];
                if (!defined(ProviderDefinition)) {
                    error('Highcharts warning: Tiles Provider \'' +
                        provider.type + '\' not defined in the Provider' +
                        'Registry.', false);
                    return;
                }
                var def = new ProviderDefinition(), providerProjection = def.initialProjectionName;
                var theme = void 0, subdomain = '';
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
                var creditsText = pick(chart.userOptions.credits && chart.userOptions.credits.text, 'Highcharts.com ' + pick(theme.credits, def.defaultCredits));
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
                var replaceVariables_1 = function (url, x, y, zoom) { return url
                    .replace('{x}', x.toString())
                    .replace('{y}', y.toString())
                    .replace('{zoom}', zoom.toString())
                    .replace('{z}', zoom.toString()); };
                var addTile = function (x, y, givenZoom, translateX, translateY) {
                    var modX = x % maxTile, modY = y % maxTile, tileX = modX < 0 ? modX + maxTile : modX, tileY = modY < 0 ? modY + maxTile : modY;
                    if (!tiles["".concat(givenZoom)].tiles["".concat(x, ",").concat(y)]) {
                        if (provider.url) {
                            var url = replaceVariables_1(provider.url, tileX, tileY, givenZoom);
                            tiles[givenZoom].loaded = false;
                            tiles["".concat(givenZoom)].tiles["".concat(x, ",").concat(y)] =
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
                            tiles["".concat(givenZoom)].tiles["".concat(x, ",").concat(y)].posX = x;
                            tiles["".concat(givenZoom)].tiles["".concat(x, ",").concat(y)].posY = y;
                            tiles["".concat(givenZoom)].tiles["".concat(x, ",").concat(y)]
                                .originalURL = url;
                        }
                    }
                };
                // Calculate topLeft and bottomRight corners without normalize
                var topLeftUnits = mapView.pixelsToProjectedUnits({
                    x: 0,
                    y: 0
                }), topLeftArr = mapView.projection.def.inverse([topLeftUnits.x, topLeftUnits.y]), topLeft = {
                    lon: topLeftArr[0] - lambda,
                    lat: topLeftArr[1]
                }, bottomRightUnits = mapView.pixelsToProjectedUnits({
                    x: chart.plotWidth,
                    y: chart.plotHeight
                }), bottomRightArr = mapView.projection.def.inverse([bottomRightUnits.x, bottomRightUnits.y]), bottomRight = {
                    lon: bottomRightArr[0] - lambda,
                    lat: bottomRightArr[1]
                };
                // Do not support vertical looping
                if (topLeft.lat > mapView.projection.maxLatitude ||
                    bottomRight.lat < -1 * mapView.projection.maxLatitude) {
                    topLeft.lat = mapView.projection.maxLatitude;
                    bottomRight.lat = -1 * mapView.projection.maxLatitude;
                }
                var startPos = this.lonLatToTile(topLeft, zoomFloor), endPos = this.lonLatToTile(bottomRight, zoomFloor);
                // Calculate group translations based on first loaded tile
                var firstTileLonLat = this.tileToLonLat(startPos.x, startPos.y, zoomFloor), units = mapView.projection.def.forward([
                    firstTileLonLat.lon + lambda,
                    firstTileLonLat.lat
                ]), firstTilePx = mapView.projectedUnitsToPixels({
                    x: units[0], y: units[1]
                }), translateX = (startPos.x * scaledTileSize - firstTilePx.x), translateY = (startPos.y * scaledTileSize - firstTilePx.y);
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
                            var firstTileLonLat = this_1.tileToLonLat(firstTile.posX, firstTile.posY, parseFloat(zoomKey)), units = mapView.projection.def.forward([
                                firstTileLonLat.lon + lambda,
                                firstTileLonLat.lat
                            ]), firstTilePx = mapView.projectedUnitsToPixels({
                                x: units[0], y: units[1]
                            }), tilesOffsetX_1 = (firstTile.posX * scaledTileSize_1) -
                                firstTilePx.x, tilesOffsetY_1 = (firstTile.posY * scaledTileSize_1) -
                                firstTilePx.y;
                            if (chart.renderer.globalAnimation &&
                                chart.hasRendered) {
                                var startX_1 = Number(tiles[zoomKey].tiles[key].attr('x')), startY_1 = Number(tiles[zoomKey].tiles[key].attr('y')), startWidth_1 = Number(tiles[zoomKey].tiles[key].attr('width')), startHeight_1 = Number(tiles[zoomKey].tiles[key].attr('height'));
                                var step = function (now, fx) {
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
        var series = this, transformGroups = series.transformGroups, chart = this.chart, mapView = chart.mapView, options = arguments[0], provider = options.provider;
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
            var ProviderDefinition = TilesProvidersRegistry[provider.type];
            if (ProviderDefinition) {
                var def = new ProviderDefinition(), providerProjectionName = def.initialProjectionName;
                mapView.update({
                    projection: {
                        name: providerProjectionName
                    }
                });
            }
        }
        _super.prototype.update.apply(series, arguments);
    };
    TiledWebMapSeries.defaultOptions = merge(MapSeries.defaultOptions, TiledWebMapSeriesDefaults);
    return TiledWebMapSeries;
}(MapSeries));
SeriesRegistry.registerSeriesType('tiledwebmap', TiledWebMapSeries);
/* *
 *
 *  Default Export
 *
 * */
export default TiledWebMapSeries;
