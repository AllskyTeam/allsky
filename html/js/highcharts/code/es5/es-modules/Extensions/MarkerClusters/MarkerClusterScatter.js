/* *
 *
 *  Marker clusters module.
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  Author: Wojciech Chmiel
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import A from '../../Core/Animation/AnimationUtilities.js';
var animObject = A.animObject;
import DataTableCore from '../../Data/DataTableCore.js';
import MarkerClusterDefaults from './MarkerClusterDefaults.js';
var clusterDefaults = MarkerClusterDefaults.cluster;
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent, defined = U.defined, error = U.error, isArray = U.isArray, isFunction = U.isFunction, isObject = U.isObject, isNumber = U.isNumber, merge = U.merge, objectEach = U.objectEach, relativeLength = U.relativeLength, syncTimeout = U.syncTimeout;
/* *
 *
 *  Constants
 *
 * */
var markerClusterAlgorithms = {
    grid: function (dataX, dataY, dataIndexes, options) {
        var _a;
        var series = this, grid = {}, gridOffset = series.getGridOffset(), scaledGridSize = series.getScaledGridSize(options);
        var x, y, gridX, gridY, key, i;
        for (i = 0; i < dataX.length; i++) {
            var p = valuesToPixels(series, { x: dataX[i], y: dataY[i] });
            x = p.x - gridOffset.plotLeft;
            y = p.y - gridOffset.plotTop;
            gridX = Math.floor(x / scaledGridSize);
            gridY = Math.floor(y / scaledGridSize);
            key = gridY + ':' + gridX;
            (_a = grid[key]) !== null && _a !== void 0 ? _a : (grid[key] = []);
            grid[key].push({
                dataIndex: dataIndexes[i],
                x: dataX[i],
                y: dataY[i]
            });
        }
        return grid;
    },
    kmeans: function (dataX, dataY, dataIndexes, options) {
        var series = this, clusters = [], noise = [], group = {}, pointMaxDistance = options.processedDistance ||
            clusterDefaults.layoutAlgorithm.distance, iterations = options.iterations, 
        // Max pixel difference beetwen new and old cluster position.
        maxClusterShift = 1;
        var currentIteration = 0, repeat = true, pointX = 0, pointY = 0, tempPos, pointClusterDistance = [];
        options.processedGridSize = options.processedDistance;
        // Use grid method to get groupedData object.
        var groupedData = series.markerClusterAlgorithms ?
            series.markerClusterAlgorithms.grid.call(series, dataX, dataY, dataIndexes, options) : {};
        // Find clusters amount and its start positions
        // based on grid grouped data.
        for (var key in groupedData) {
            if (groupedData[key].length > 1) {
                tempPos = getClusterPosition(groupedData[key]);
                clusters.push({
                    posX: tempPos.x,
                    posY: tempPos.y,
                    oldX: 0,
                    oldY: 0,
                    startPointsLen: groupedData[key].length,
                    points: []
                });
            }
        }
        // Start kmeans iteration process.
        while (repeat) {
            for (var _i = 0, clusters_1 = clusters; _i < clusters_1.length; _i++) {
                var c = clusters_1[_i];
                c.points.length = 0;
            }
            noise.length = 0;
            for (var i = 0; i < dataX.length; i++) {
                pointX = dataX[i];
                pointY = dataY[i];
                pointClusterDistance = series.getClusterDistancesFromPoint(clusters, pointX, pointY);
                if (pointClusterDistance.length &&
                    pointClusterDistance[0].distance < pointMaxDistance) {
                    clusters[pointClusterDistance[0].clusterIndex].points.push({
                        x: pointX,
                        y: pointY,
                        dataIndex: dataIndexes[i]
                    });
                }
                else {
                    noise.push({
                        x: pointX,
                        y: pointY,
                        dataIndex: dataIndexes[i]
                    });
                }
            }
            // When cluster points array has only one point the
            // point should be classified again.
            for (var i = 0; i < clusters.length; i++) {
                if (clusters[i].points.length === 1) {
                    pointClusterDistance = series.getClusterDistancesFromPoint(clusters, clusters[i].points[0].x, clusters[i].points[0].y);
                    if (pointClusterDistance[1].distance < pointMaxDistance) {
                        // Add point to the next closest cluster.
                        clusters[pointClusterDistance[1].clusterIndex].points
                            .push(clusters[i].points[0]);
                        // Clear points array.
                        clusters[pointClusterDistance[0].clusterIndex]
                            .points.length = 0;
                    }
                }
            }
            // Compute a new clusters position and check if it
            // is different than the old one.
            repeat = false;
            for (var i = 0; i < clusters.length; i++) {
                tempPos = getClusterPosition(clusters[i].points);
                clusters[i].oldX = clusters[i].posX;
                clusters[i].oldY = clusters[i].posY;
                clusters[i].posX = tempPos.x;
                clusters[i].posY = tempPos.y;
                // Repeat the algorithm if at least one cluster
                // is shifted more than maxClusterShift property.
                if (clusters[i].posX > clusters[i].oldX + maxClusterShift ||
                    clusters[i].posX < clusters[i].oldX - maxClusterShift ||
                    clusters[i].posY > clusters[i].oldY + maxClusterShift ||
                    clusters[i].posY < clusters[i].oldY - maxClusterShift) {
                    repeat = true;
                }
            }
            // If iterations property is set repeat the algorithm
            // specified amount of times.
            if (iterations) {
                repeat = currentIteration < iterations - 1;
            }
            currentIteration++;
        }
        for (var i = 0, iEnd = clusters.length; i < iEnd; ++i) {
            group['cluster' + i] = clusters[i].points;
        }
        for (var i = 0, iEnd = noise.length; i < iEnd; ++i) {
            group['noise' + i] = [noise[i]];
        }
        return group;
    },
    optimizedKmeans: function (processedXData, processedYData, dataIndexes, options) {
        var _a, _b, _c;
        var series = this, pointMaxDistance = options.processedDistance ||
            clusterDefaults.layoutAlgorithm.gridSize, extremes = series.getRealExtremes(), clusterMarkerOptions = (series.options.cluster || {}).marker;
        var distance, group = {}, offset, radius;
        if (!series.markerClusterInfo || (series.initMaxX && series.initMaxX < extremes.maxX ||
            series.initMinX && series.initMinX > extremes.minX ||
            series.initMaxY && series.initMaxY < extremes.maxY ||
            series.initMinY && series.initMinY > extremes.minY)) {
            series.initMaxX = extremes.maxX;
            series.initMinX = extremes.minX;
            series.initMaxY = extremes.maxY;
            series.initMinY = extremes.minY;
            group = series.markerClusterAlgorithms ?
                series.markerClusterAlgorithms.kmeans.call(series, processedXData, processedYData, dataIndexes, options) : {};
            series.baseClusters = null;
        }
        else {
            (_a = series.baseClusters) !== null && _a !== void 0 ? _a : (series.baseClusters = {
                clusters: series.markerClusterInfo.clusters,
                noise: series.markerClusterInfo.noise
            });
            for (var _i = 0, _d = series.baseClusters.clusters; _i < _d.length; _i++) {
                var cluster = _d[_i];
                cluster.pointsOutside = [];
                cluster.pointsInside = [];
                for (var _e = 0, _f = cluster.data; _e < _f.length; _e++) {
                    var dataPoint = _f[_e];
                    var dataPointPx = valuesToPixels(series, dataPoint), clusterPx = valuesToPixels(series, cluster);
                    distance = Math.sqrt(Math.pow(dataPointPx.x - clusterPx.x, 2) +
                        Math.pow(dataPointPx.y - clusterPx.y, 2));
                    if ((_c = (_b = cluster.clusterZone) === null || _b === void 0 ? void 0 : _b.marker) === null || _c === void 0 ? void 0 : _c.radius) {
                        radius = cluster.clusterZone.marker.radius;
                    }
                    else if (clusterMarkerOptions === null || clusterMarkerOptions === void 0 ? void 0 : clusterMarkerOptions.radius) {
                        radius = clusterMarkerOptions.radius;
                    }
                    else {
                        radius = clusterDefaults.marker.radius;
                    }
                    offset = pointMaxDistance - radius >= 0 ?
                        pointMaxDistance - radius : radius;
                    if (distance > radius + offset &&
                        defined(cluster.pointsOutside)) {
                        cluster.pointsOutside.push(dataPoint);
                    }
                    else if (defined(cluster.pointsInside)) {
                        cluster.pointsInside.push(dataPoint);
                    }
                }
                if (cluster.pointsInside.length) {
                    group[cluster.id] = cluster.pointsInside;
                }
                var i = 0;
                for (var _g = 0, _h = cluster.pointsOutside; _g < _h.length; _g++) {
                    var p = _h[_g];
                    group[cluster.id + '_noise' + i++] = [p];
                }
            }
            for (var _j = 0, _k = series.baseClusters.noise; _j < _k.length; _j++) {
                var noise = _k[_j];
                group[noise.id] = noise.data;
            }
        }
        return group;
    }
};
/* *
 *
 *  Variables
 *
 * */
var baseGeneratePoints, 
/**
 * Points that ids are included in the oldPointsStateId array are hidden
 * before animation. Other ones are destroyed.
 * @private
 */
oldPointsStateId = [], stateIdCounter = 0;
/* *
 *
 *  Functions
 *
 * */
/** @private */
function compose(highchartsDefaultOptions, ScatterSeriesClass) {
    var scatterProto = ScatterSeriesClass.prototype;
    if (!scatterProto.markerClusterAlgorithms) {
        baseGeneratePoints = scatterProto.generatePoints;
        scatterProto.markerClusterAlgorithms = markerClusterAlgorithms;
        scatterProto.animateClusterPoint = seriesAnimateClusterPoint;
        scatterProto.destroyClusteredData = seriesDestroyClusteredData;
        scatterProto.generatePoints = seriesGeneratePoints;
        scatterProto.getClusterDistancesFromPoint =
            seriesGetClusterDistancesFromPoint;
        scatterProto.getClusteredData = seriesGetClusteredData;
        scatterProto.getGridOffset = seriesGetGridOffset;
        scatterProto.getPointsState = seriesGetPointsState;
        scatterProto.getRealExtremes = seriesGetRealExtremes;
        scatterProto.getScaledGridSize = seriesGetScaledGridSize;
        scatterProto.hideClusteredData = seriesHideClusteredData;
        scatterProto.isValidGroupedDataObject = seriesIsValidGroupedDataObject;
        scatterProto.preventClusterCollisions = seriesPreventClusterCollisions;
        // Destroy grouped data on series destroy.
        addEvent(ScatterSeriesClass, 'destroy', scatterProto.destroyClusteredData);
        if (highchartsDefaultOptions.plotOptions) {
            highchartsDefaultOptions.plotOptions.series = merge(highchartsDefaultOptions.plotOptions.series, MarkerClusterDefaults);
        }
    }
}
/**
 * Util function.
 * @private
 */
function destroyOldPoints(oldState) {
    var _a, _b;
    for (var _i = 0, _c = Object.keys(oldState); _i < _c.length; _i++) {
        var key = _c[_i];
        (_b = (_a = oldState[key].point) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
}
/**
 * Util function.
 * @private
 */
function fadeInElement(elem, opacity, animation) {
    elem.attr({ opacity: opacity }).animate({ opacity: 1 }, animation);
}
/**
 * Util function.
 * @private
 */
function fadeInNewPointAndDestoryOld(newPointObj, oldPoints, animation, opacity) {
    var _a, _b;
    // Fade in new point.
    fadeInStatePoint(newPointObj, opacity, animation, true, true);
    // Destroy old animated points.
    for (var _i = 0, oldPoints_1 = oldPoints; _i < oldPoints_1.length; _i++) {
        var p = oldPoints_1[_i];
        (_b = (_a = p.point) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
}
/**
 * Util function.
 * @private
 */
function fadeInStatePoint(stateObj, opacity, animation, fadeinGraphic, fadeinDataLabel) {
    if (stateObj.point) {
        if (fadeinGraphic && stateObj.point.graphic) {
            stateObj.point.graphic.show();
            fadeInElement(stateObj.point.graphic, opacity, animation);
        }
        if (fadeinDataLabel && stateObj.point.dataLabel) {
            stateObj.point.dataLabel.show();
            fadeInElement(stateObj.point.dataLabel, opacity, animation);
        }
    }
}
/**
 * Util function.
 * @private
 */
function getClusterPosition(points) {
    var pointsLen = points.length;
    var sumX = 0, sumY = 0;
    for (var i = 0; i < pointsLen; i++) {
        sumX += points[i].x;
        sumY += points[i].y;
    }
    return {
        x: sumX / pointsLen,
        y: sumY / pointsLen
    };
}
/**
 * Util function.Prepare array with sorted data objects to be compared in
 * getPointsState method.
 * @private
 */
function getDataState(clusteredData, stateDataLen) {
    var state = [];
    state.length = stateDataLen;
    clusteredData.clusters.forEach(function (cluster) {
        cluster.data.forEach(function (elem) {
            state[elem.dataIndex] = elem;
        });
    });
    clusteredData.noise.forEach(function (noise) {
        state[noise.data[0].dataIndex] = noise.data[0];
    });
    return state;
}
/**
 * Util function. Generate unique stateId for a state element.
 * @private
 */
function getStateId() {
    return Math.random().toString(36).substring(2, 7) + '-' + stateIdCounter++;
}
/**
 * Util function.
 * @private
 */
function hideStatePoint(stateObj, hideGraphic, hideDataLabel) {
    if (stateObj.point) {
        if (hideGraphic && stateObj.point.graphic) {
            stateObj.point.graphic.hide();
        }
        if (hideDataLabel && stateObj.point.dataLabel) {
            stateObj.point.dataLabel.hide();
        }
    }
}
/** @private */
function onPointDrillToCluster(event) {
    var point = event.point || event.target;
    point.firePointEvent('drillToCluster', event, function (e) {
        var _a, _b, _c;
        var _d;
        var point = e.point || e.target, series = point.series, xAxis = series.xAxis, yAxis = series.yAxis, chart = series.chart, inverted = chart.inverted, mapView = chart.mapView, pointer = chart.pointer, drillToCluster = (_d = series.options.cluster) === null || _d === void 0 ? void 0 : _d.drillToCluster;
        if (drillToCluster && point.clusteredData) {
            var sortedDataX = point.clusteredData
                .map(function (data) { return data.x; })
                .sort(function (a, b) { return a - b; }), sortedDataY = point.clusteredData
                .map(function (data) { return data.y; })
                .sort(function (a, b) { return a - b; }), minX = sortedDataX[0], maxX = sortedDataX[sortedDataX.length - 1], minY = sortedDataY[0], maxY = sortedDataY[sortedDataY.length - 1], offsetX = Math.abs((maxX - minX) * 0.1), offsetY = Math.abs((maxY - minY) * 0.1), x1 = Math.min(minX, maxX) - offsetX, x2 = Math.max(minX, maxX) + offsetX, y1 = Math.min(minY, maxY) - offsetY, y2 = Math.max(minY, maxY) + offsetY;
            if (mapView) {
                mapView.fitToBounds({ x1: x1, x2: x2, y1: y1, y2: y2 });
            }
            else if (xAxis && yAxis) {
                var x1Px = xAxis.toPixels(x1), x2Px = xAxis.toPixels(x2), y1Px = yAxis.toPixels(y1), y2Px = yAxis.toPixels(y2);
                if (inverted) {
                    _a = [y1Px, y2Px, x1Px, x2Px], x1Px = _a[0], x2Px = _a[1], y1Px = _a[2], y2Px = _a[3];
                }
                if (x1Px > x2Px) {
                    _b = [x2Px, x1Px], x1Px = _b[0], x2Px = _b[1];
                }
                if (y1Px > y2Px) {
                    _c = [y2Px, y1Px], y1Px = _c[0], y2Px = _c[1];
                }
                if (pointer) {
                    pointer.zoomX = true;
                    pointer.zoomY = true;
                }
                chart.transform({
                    from: {
                        x: x1Px,
                        y: y1Px,
                        width: x2Px - x1Px,
                        height: y2Px - y1Px
                    }
                });
            }
        }
    });
}
/**
 * Util function.
 * @private
 */
function pixelsToValues(series, pos) {
    var chart = series.chart, xAxis = series.xAxis, yAxis = series.yAxis;
    if (chart.mapView) {
        return chart.mapView.pixelsToProjectedUnits(pos);
    }
    return {
        x: xAxis ? xAxis.toValue(pos.x) : 0,
        y: yAxis ? yAxis.toValue(pos.y) : 0
    };
}
/** @private */
function seriesAnimateClusterPoint(clusterObj) {
    var _a, _b, _c, _d, _e, _f, _g;
    var series = this, chart = series.chart, mapView = chart.mapView, animation = animObject((_a = series.options.cluster) === null || _a === void 0 ? void 0 : _a.animation), animDuration = animation.duration || 500, pointsState = (_b = series.markerClusterInfo) === null || _b === void 0 ? void 0 : _b.pointsState, newState = pointsState === null || pointsState === void 0 ? void 0 : pointsState.newState, oldState = pointsState === null || pointsState === void 0 ? void 0 : pointsState.oldState, oldPoints = [];
    var parentId, oldPointObj, newPointObj, newPointBBox, offset = 0, newX = 0, newY = 0, isOldPointGrahic = false, isCbHandled = false;
    if (oldState && newState) {
        newPointObj = newState[clusterObj.stateId];
        var newPos = valuesToPixels(series, newPointObj);
        newX = newPos.x - (mapView ? 0 : chart.plotLeft);
        newY = newPos.y - (mapView ? 0 : chart.plotTop);
        // Point has one ancestor.
        if (newPointObj.parentsId.length === 1) {
            parentId = newState === null || newState === void 0 ? void 0 : newState[clusterObj.stateId].parentsId[0];
            oldPointObj = oldState[parentId];
            // If old and new positions are the same do not animate.
            if (((_c = newPointObj.point) === null || _c === void 0 ? void 0 : _c.graphic) &&
                ((_d = oldPointObj.point) === null || _d === void 0 ? void 0 : _d.plotX) &&
                oldPointObj.point.plotY &&
                (oldPointObj.point.plotX !== newPointObj.point.plotX ||
                    oldPointObj.point.plotY !== newPointObj.point.plotY)) {
                newPointBBox = newPointObj.point.graphic.getBBox();
                // Marker image does not have the offset (#14342).
                offset = ((_e = newPointObj.point.graphic) === null || _e === void 0 ? void 0 : _e.isImg) ?
                    0 : newPointBBox.width / 2;
                newPointObj.point.graphic.attr({
                    x: oldPointObj.point.plotX - offset,
                    y: oldPointObj.point.plotY - offset
                });
                newPointObj.point.graphic.animate({
                    x: newX - (newPointObj.point.graphic.radius || 0),
                    y: newY - (newPointObj.point.graphic.radius || 0)
                }, animation, function () {
                    var _a, _b;
                    isCbHandled = true;
                    // Destroy old point.
                    (_b = (_a = oldPointObj.point) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a);
                });
                // Data label animation.
                if (((_f = newPointObj.point.dataLabel) === null || _f === void 0 ? void 0 : _f.alignAttr) &&
                    ((_g = oldPointObj.point.dataLabel) === null || _g === void 0 ? void 0 : _g.alignAttr)) {
                    newPointObj.point.dataLabel.attr({
                        x: oldPointObj.point.dataLabel.alignAttr.x,
                        y: oldPointObj.point.dataLabel.alignAttr.y
                    });
                    newPointObj.point.dataLabel.animate({
                        x: newPointObj.point.dataLabel.alignAttr.x,
                        y: newPointObj.point.dataLabel.alignAttr.y
                    }, animation);
                }
            }
        }
        else if (newPointObj.parentsId.length === 0) {
            // Point has no ancestors - new point.
            // Hide new point.
            hideStatePoint(newPointObj, true, true);
            syncTimeout(function () {
                // Fade in new point.
                fadeInStatePoint(newPointObj, 0.1, animation, true, true);
            }, animDuration / 2);
        }
        else {
            // Point has many ancestors.
            // Hide new point before animation.
            hideStatePoint(newPointObj, true, true);
            newPointObj.parentsId.forEach(function (elem) {
                var _a, _b, _c;
                if (oldState === null || oldState === void 0 ? void 0 : oldState[elem]) {
                    oldPointObj = oldState[elem];
                    oldPoints.push(oldPointObj);
                    if ((_a = oldPointObj.point) === null || _a === void 0 ? void 0 : _a.graphic) {
                        isOldPointGrahic = true;
                        oldPointObj.point.graphic.show();
                        oldPointObj.point.graphic.animate({
                            x: newX - (oldPointObj.point.graphic.radius || 0),
                            y: newY - (oldPointObj.point.graphic.radius || 0),
                            opacity: 0.4
                        }, animation, function () {
                            isCbHandled = true;
                            fadeInNewPointAndDestoryOld(newPointObj, oldPoints, animation, 0.7);
                        });
                        if (oldPointObj.point.dataLabel &&
                            oldPointObj.point.dataLabel.y !== -9999 &&
                            ((_c = (_b = newPointObj.point) === null || _b === void 0 ? void 0 : _b.dataLabel) === null || _c === void 0 ? void 0 : _c.alignAttr)) {
                            oldPointObj.point.dataLabel.show();
                            oldPointObj.point.dataLabel.animate({
                                x: newPointObj.point.dataLabel.alignAttr.x,
                                y: newPointObj.point.dataLabel.alignAttr.y,
                                opacity: 0.4
                            }, animation);
                        }
                    }
                }
            });
            // Make sure point is faded in.
            syncTimeout(function () {
                if (!isCbHandled) {
                    fadeInNewPointAndDestoryOld(newPointObj, oldPoints, animation, 0.85);
                }
            }, animDuration);
            if (!isOldPointGrahic) {
                syncTimeout(function () {
                    fadeInNewPointAndDestoryOld(newPointObj, oldPoints, animation, 0.1);
                }, animDuration / 2);
            }
        }
    }
}
/**
 * Destroy clustered data points.
 * @private
 */
function seriesDestroyClusteredData() {
    var _a;
    // Clear previous groups.
    (_a = this.markerClusterSeriesData) === null || _a === void 0 ? void 0 : _a.forEach(function (point) {
        var _a;
        (_a = point === null || point === void 0 ? void 0 : point.destroy) === null || _a === void 0 ? void 0 : _a.call(point);
    });
    this.markerClusterSeriesData = null;
}
/**
 * Override the generatePoints method by adding a reference to grouped data.
 * @private
 */
function seriesGeneratePoints() {
    var _a, _b, _c, _d, _e;
    var series = this, chart = series.chart, mapView = chart.mapView, xData = series.getColumn('x'), yData = series.getColumn('y'), clusterOptions = series.options.cluster, realExtremes = series.getRealExtremes(), visibleXData = [], visibleYData = [], visibleDataIndexes = [];
    var oldPointsState, oldDataLen, oldMarkerClusterInfo, kmeansThreshold, cropDataOffsetX, cropDataOffsetY, seriesMinX, seriesMaxX, seriesMinY, seriesMaxY, type, algorithm, clusteredData, groupedData, layoutAlgOptions, point;
    // For map point series, we need to resolve lon, lat and geometry options
    // and project them on the plane in order to get x and y. In the regular
    // series flow, this is not done until the `translate` method because the
    // resulting [x, y] position depends on inset positions in the MapView.
    if (mapView && series.is('mappoint') && xData && yData) {
        (_a = series.options.data) === null || _a === void 0 ? void 0 : _a.forEach(function (p, i) {
            var xy = series.projectPoint(p);
            if (xy) {
                xData[i] = xy.x;
                yData[i] = xy.y;
            }
        });
    }
    if ((clusterOptions === null || clusterOptions === void 0 ? void 0 : clusterOptions.enabled) &&
        (xData === null || xData === void 0 ? void 0 : xData.length) &&
        (yData === null || yData === void 0 ? void 0 : yData.length) &&
        !chart.polar) {
        type = clusterOptions.layoutAlgorithm.type;
        layoutAlgOptions = clusterOptions.layoutAlgorithm;
        // Get processed algorithm properties.
        layoutAlgOptions.processedGridSize = relativeLength(layoutAlgOptions.gridSize ||
            clusterDefaults.layoutAlgorithm.gridSize, chart.plotWidth);
        layoutAlgOptions.processedDistance = relativeLength(layoutAlgOptions.distance ||
            clusterDefaults.layoutAlgorithm.distance, chart.plotWidth);
        kmeansThreshold = layoutAlgOptions.kmeansThreshold ||
            clusterDefaults.layoutAlgorithm.kmeansThreshold;
        // Offset to prevent cluster size changes.
        var halfGrid = layoutAlgOptions.processedGridSize / 2, p1 = pixelsToValues(series, { x: 0, y: 0 }), p2 = pixelsToValues(series, { x: halfGrid, y: halfGrid });
        cropDataOffsetX = Math.abs(p1.x - p2.x);
        cropDataOffsetY = Math.abs(p1.y - p2.y);
        // Get only visible data.
        for (var i = 0; i < xData.length; i++) {
            if (!series.dataMaxX) {
                if (!defined(seriesMaxX) ||
                    !defined(seriesMinX) ||
                    !defined(seriesMaxY) ||
                    !defined(seriesMinY)) {
                    seriesMaxX = seriesMinX = xData[i];
                    seriesMaxY = seriesMinY = yData[i];
                }
                else if (isNumber(yData[i]) &&
                    isNumber(seriesMaxY) &&
                    isNumber(seriesMinY)) {
                    seriesMaxX = Math.max(xData[i], seriesMaxX);
                    seriesMinX = Math.min(xData[i], seriesMinX);
                    seriesMaxY = Math.max(yData[i] || seriesMaxY, seriesMaxY);
                    seriesMinY = Math.min(yData[i] || seriesMinY, seriesMinY);
                }
            }
            // Crop data to visible ones with appropriate offset to prevent
            // cluster size changes on the edge of the plot area.
            if (xData[i] >= (realExtremes.minX - cropDataOffsetX) &&
                xData[i] <= (realExtremes.maxX + cropDataOffsetX) &&
                (yData[i] || realExtremes.minY) >=
                    (realExtremes.minY - cropDataOffsetY) &&
                (yData[i] || realExtremes.maxY) <=
                    (realExtremes.maxY + cropDataOffsetY)) {
                visibleXData.push(xData[i]);
                visibleYData.push(yData[i]);
                visibleDataIndexes.push(i);
            }
        }
        // Save data max values.
        if (defined(seriesMaxX) && defined(seriesMinX) &&
            isNumber(seriesMaxY) && isNumber(seriesMinY)) {
            series.dataMaxX = seriesMaxX;
            series.dataMinX = seriesMinX;
            series.dataMaxY = seriesMaxY;
            series.dataMinY = seriesMinY;
        }
        if (isFunction(type)) {
            algorithm = type;
        }
        else if (series.markerClusterAlgorithms) {
            if (type && series.markerClusterAlgorithms[type]) {
                algorithm = series.markerClusterAlgorithms[type];
            }
            else {
                algorithm = visibleXData.length < kmeansThreshold ?
                    series.markerClusterAlgorithms.kmeans :
                    series.markerClusterAlgorithms.grid;
            }
        }
        else {
            algorithm = function () { return false; };
        }
        groupedData = algorithm.call(this, visibleXData, visibleYData, visibleDataIndexes, layoutAlgOptions);
        clusteredData = groupedData ? series.getClusteredData(groupedData, clusterOptions) : groupedData;
        // When animation is enabled get old points state.
        if (clusterOptions.animation &&
            ((_c = (_b = series.markerClusterInfo) === null || _b === void 0 ? void 0 : _b.pointsState) === null || _c === void 0 ? void 0 : _c.oldState)) {
            // Destroy old points.
            destroyOldPoints(series.markerClusterInfo.pointsState.oldState);
            oldPointsState = series.markerClusterInfo.pointsState.newState;
        }
        else {
            oldPointsState = {};
        }
        // Save points old state info.
        oldDataLen = xData.length;
        oldMarkerClusterInfo = series.markerClusterInfo;
        if (clusteredData) {
            series.dataTable.modified = new DataTableCore({
                columns: {
                    x: clusteredData.groupedXData,
                    y: clusteredData.groupedYData
                }
            });
            series.hasGroupedData = true;
            series.markerClusterInfo = clusteredData;
            series.groupMap = clusteredData.groupMap;
        }
        baseGeneratePoints.apply(this);
        if (clusteredData && series.markerClusterInfo) {
            // Mark cluster points. Safe point reference in the cluster object.
            (_d = series.markerClusterInfo.clusters) === null || _d === void 0 ? void 0 : _d.forEach(function (cluster) {
                point = series.points[cluster.index];
                point.isCluster = true;
                point.clusteredData = cluster.data;
                point.clusterPointsAmount = cluster.data.length;
                cluster.point = point;
                // Add zoom to cluster range.
                addEvent(point, 'click', onPointDrillToCluster);
            });
            // Safe point reference in the noise object.
            (_e = series.markerClusterInfo.noise) === null || _e === void 0 ? void 0 : _e.forEach(function (noise) {
                noise.point = series.points[noise.index];
            });
            // When animation is enabled save points state.
            if (clusterOptions.animation &&
                series.markerClusterInfo) {
                series.markerClusterInfo.pointsState = {
                    oldState: oldPointsState,
                    newState: series.getPointsState(clusteredData, oldMarkerClusterInfo, oldDataLen)
                };
            }
            // Record grouped data in order to let it be destroyed the next time
            // processData runs.
            if (!clusterOptions.animation) {
                this.destroyClusteredData();
            }
            else {
                this.hideClusteredData();
            }
            this.markerClusterSeriesData =
                this.hasGroupedData ? this.points : null;
        }
    }
    else {
        baseGeneratePoints.apply(this);
    }
}
/** @private */
function seriesGetClusterDistancesFromPoint(clusters, pointX, pointY) {
    var pointClusterDistance = [];
    for (var clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
        var p1 = valuesToPixels(this, { x: pointX, y: pointY }), p2 = valuesToPixels(this, {
            x: clusters[clusterIndex].posX,
            y: clusters[clusterIndex].posY
        }), distance = Math.sqrt(Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2));
        pointClusterDistance.push({ clusterIndex: clusterIndex, distance: distance });
    }
    return pointClusterDistance.sort(function (a, b) { return a.distance - b.distance; });
}
/** @private */
function seriesGetClusteredData(groupedData, options) {
    var series = this, data = series.options.data, groupedXData = [], groupedYData = [], clusters = [], // Container for clusters.
    noise = [], // Container for points not belonging to any cluster.
    groupMap = [], 
    // Prevent minimumClusterSize lower than 2.
    minimumClusterSize = Math.max(2, options.minimumClusterSize || 2);
    var index = 0, stateId, point, points, pointUserOptions, pointsLen, marker, clusterPos, pointOptions, clusterTempPos, zoneOptions, clusterZone, clusterZoneClassName;
    // Check if groupedData is valid when user uses a custom algorithm.
    if (isFunction(options.layoutAlgorithm.type) &&
        !series.isValidGroupedDataObject(groupedData)) {
        error('Highcharts marker-clusters module: ' +
            'The custom algorithm result is not valid!', false, series.chart);
        return false;
    }
    for (var k in groupedData) {
        if (groupedData[k].length >= minimumClusterSize) {
            points = groupedData[k];
            stateId = getStateId();
            pointsLen = points.length;
            // Get zone options for cluster.
            if (options.zones) {
                for (var i = 0; i < options.zones.length; i++) {
                    if (pointsLen >= options.zones[i].from &&
                        pointsLen <= options.zones[i].to) {
                        clusterZone = options.zones[i];
                        clusterZone.zoneIndex = i;
                        zoneOptions = options.zones[i].marker;
                        clusterZoneClassName = options.zones[i].className;
                    }
                }
            }
            clusterTempPos = getClusterPosition(points);
            if (options.layoutAlgorithm.type === 'grid' &&
                !options.allowOverlap) {
                marker = series.options.marker || {};
                clusterPos = series.preventClusterCollisions({
                    x: clusterTempPos.x,
                    y: clusterTempPos.y,
                    key: k,
                    groupedData: groupedData,
                    gridSize: series.getScaledGridSize(options.layoutAlgorithm),
                    defaultRadius: marker.radius || 3 + (marker.lineWidth || 0),
                    clusterRadius: (zoneOptions && zoneOptions.radius) ?
                        zoneOptions.radius :
                        (options.marker || {}).radius ||
                            clusterDefaults.marker.radius
                });
            }
            else {
                clusterPos = {
                    x: clusterTempPos.x,
                    y: clusterTempPos.y
                };
            }
            for (var i = 0; i < pointsLen; i++) {
                points[i].parentStateId = stateId;
            }
            clusters.push({
                x: clusterPos.x,
                y: clusterPos.y,
                id: k,
                stateId: stateId,
                index: index,
                data: points,
                clusterZone: clusterZone,
                clusterZoneClassName: clusterZoneClassName
            });
            groupedXData.push(clusterPos.x);
            groupedYData.push(clusterPos.y);
            groupMap.push({
                options: {
                    formatPrefix: 'cluster',
                    dataLabels: options.dataLabels,
                    marker: merge(options.marker, {
                        states: options.states
                    }, zoneOptions || {})
                }
            });
            // Save cluster data points options.
            if (data === null || data === void 0 ? void 0 : data.length) {
                for (var i = 0; i < pointsLen; i++) {
                    if (isObject(data[points[i].dataIndex])) {
                        points[i].options = data[points[i].dataIndex];
                    }
                }
            }
            index++;
            zoneOptions = null;
        }
        else {
            for (var i = 0; i < groupedData[k].length; i++) {
                // Points not belonging to any cluster.
                point = groupedData[k][i];
                stateId = getStateId();
                pointOptions = null;
                pointUserOptions = data === null || data === void 0 ? void 0 : data[point.dataIndex];
                groupedXData.push(point.x);
                groupedYData.push(point.y);
                point.parentStateId = stateId;
                noise.push({
                    x: point.x,
                    y: point.y,
                    id: k,
                    stateId: stateId,
                    index: index,
                    data: groupedData[k]
                });
                if (pointUserOptions &&
                    typeof pointUserOptions === 'object' &&
                    !isArray(pointUserOptions)) {
                    pointOptions = merge(pointUserOptions, { x: point.x, y: point.y });
                }
                else {
                    pointOptions = {
                        userOptions: pointUserOptions,
                        x: point.x,
                        y: point.y
                    };
                }
                groupMap.push({ options: pointOptions });
                index++;
            }
        }
    }
    return {
        clusters: clusters,
        noise: noise,
        groupedXData: groupedXData,
        groupedYData: groupedYData,
        groupMap: groupMap
    };
}
/** @private */
function seriesGetGridOffset() {
    var series = this, chart = series.chart, xAxis = series.xAxis, yAxis = series.yAxis;
    var plotLeft = 0, plotTop = 0;
    if (xAxis && series.dataMinX && series.dataMaxX) {
        plotLeft = xAxis.reversed ?
            xAxis.toPixels(series.dataMaxX) : xAxis.toPixels(series.dataMinX);
    }
    else {
        plotLeft = chart.plotLeft;
    }
    if (yAxis && series.dataMinY && series.dataMaxY) {
        plotTop = yAxis.reversed ?
            yAxis.toPixels(series.dataMinY) : yAxis.toPixels(series.dataMaxY);
    }
    else {
        plotTop = chart.plotTop;
    }
    return { plotLeft: plotLeft, plotTop: plotTop };
}
/**
 * Point state used when animation is enabled to compare and bind old points
 * with new ones.
 * @private
 */
function seriesGetPointsState(clusteredData, oldMarkerClusterInfo, dataLength) {
    var _a;
    var oldDataStateArr = oldMarkerClusterInfo ?
        getDataState(oldMarkerClusterInfo, dataLength) : [], newDataStateArr = getDataState(clusteredData, dataLength), state = {};
    // Clear global array before populate with new ids.
    oldPointsStateId = [];
    // Build points state structure.
    clusteredData.clusters.forEach(function (cluster) {
        state[cluster.stateId] = {
            x: cluster.x,
            y: cluster.y,
            id: cluster.stateId,
            point: cluster.point,
            parentsId: []
        };
    });
    clusteredData.noise.forEach(function (noise) {
        state[noise.stateId] = {
            x: noise.x,
            y: noise.y,
            id: noise.stateId,
            point: noise.point,
            parentsId: []
        };
    });
    var newState, oldState;
    // Bind new and old state.
    for (var i = 0; i < newDataStateArr.length; i++) {
        newState = newDataStateArr[i];
        oldState = oldDataStateArr[i];
        if ((newState === null || newState === void 0 ? void 0 : newState.parentStateId) &&
            (oldState === null || oldState === void 0 ? void 0 : oldState.parentStateId) &&
            ((_a = state[newState.parentStateId]) === null || _a === void 0 ? void 0 : _a.parentsId.indexOf(oldState.parentStateId)) === -1) {
            state[newState.parentStateId].parentsId.push(oldState.parentStateId);
            if (oldPointsStateId.indexOf(oldState.parentStateId) === -1) {
                oldPointsStateId.push(oldState.parentStateId);
            }
        }
    }
    return state;
}
/** @private */
function seriesGetRealExtremes() {
    var chart = this.chart, x = chart.mapView ? 0 : chart.plotLeft, y = chart.mapView ? 0 : chart.plotTop, p1 = pixelsToValues(this, {
        x: x,
        y: y
    }), p2 = pixelsToValues(this, {
        x: x + chart.plotWidth,
        y: x + chart.plotHeight
    }), realMinX = p1.x, realMaxX = p2.x, realMinY = p1.y, realMaxY = p2.y;
    return {
        minX: Math.min(realMinX, realMaxX),
        maxX: Math.max(realMinX, realMaxX),
        minY: Math.min(realMinY, realMaxY),
        maxY: Math.max(realMinY, realMaxY)
    };
}
/** @private */
function seriesGetScaledGridSize(options) {
    var series = this, xAxis = series.xAxis, mapView = series.chart.mapView, processedGridSize = options.processedGridSize ||
        clusterDefaults.layoutAlgorithm.gridSize;
    var search = true, k = 1, divider = 1;
    if (!series.gridValueSize) {
        if (mapView) {
            series.gridValueSize = processedGridSize / mapView.getScale();
        }
        else {
            series.gridValueSize = Math.abs(xAxis.toValue(processedGridSize) - xAxis.toValue(0));
        }
    }
    var gridSize = mapView ?
        series.gridValueSize * mapView.getScale() :
        xAxis.toPixels(series.gridValueSize) - xAxis.toPixels(0);
    var scale = +(processedGridSize / gridSize).toFixed(14);
    // Find the level and its divider.
    while (search && scale !== 1) {
        var level = Math.pow(2, k);
        if (scale > 0.75 && scale < 1.25) {
            search = false;
        }
        else if (scale >= (1 / level) && scale < 2 * (1 / level)) {
            search = false;
            divider = level;
        }
        else if (scale <= level && scale > level / 2) {
            search = false;
            divider = 1 / level;
        }
        k++;
    }
    return (processedGridSize / divider) / scale;
}
/**
 * Hide clustered data points.
 * @private
 */
function seriesHideClusteredData() {
    var _a, _b;
    var clusteredSeriesData = this.markerClusterSeriesData, oldState = (_b = (_a = this.markerClusterInfo) === null || _a === void 0 ? void 0 : _a.pointsState) === null || _b === void 0 ? void 0 : _b.oldState, oldPointsId = oldPointsStateId.map(function (elem) { var _a; return ((_a = oldState === null || oldState === void 0 ? void 0 : oldState[elem].point) === null || _a === void 0 ? void 0 : _a.id) || ''; });
    clusteredSeriesData === null || clusteredSeriesData === void 0 ? void 0 : clusteredSeriesData.forEach(function (point) {
        var _a;
        // If an old point is used in animation hide it, otherwise destroy.
        if (point &&
            oldPointsId.indexOf(point.id) !== -1) {
            if (point.graphic) {
                point.graphic.hide();
            }
            if (point.dataLabel) {
                point.dataLabel.hide();
            }
        }
        else {
            (_a = point === null || point === void 0 ? void 0 : point.destroy) === null || _a === void 0 ? void 0 : _a.call(point);
        }
    });
}
/**
 * Check if user algorithm result is valid groupedDataObject.
 * @private
 */
function seriesIsValidGroupedDataObject(groupedData) {
    var result = false;
    if (!isObject(groupedData)) {
        return false;
    }
    objectEach(groupedData, function (elem) {
        result = true;
        if (!isArray(elem) || !elem.length) {
            result = false;
            return;
        }
        for (var i = 0; i < elem.length; i++) {
            if (!isObject(elem[i]) || (!elem[i].x || !elem[i].y)) {
                result = false;
                return;
            }
        }
    });
    return result;
}
/** @private */
function seriesPreventClusterCollisions(props) {
    var _a;
    var _b, _c, _d;
    var series = this, _e = props.key.split(':').map(parseFloat), gridY = _e[0], gridX = _e[1], gridSize = props.gridSize, groupedData = props.groupedData, defaultRadius = props.defaultRadius, clusterRadius = props.clusterRadius, gridXPx = gridX * gridSize, gridYPx = gridY * gridSize, propsPx = valuesToPixels(series, props), gridsToCheckCollision = [], clusterMarkerOptions = (_b = series.options.cluster) === null || _b === void 0 ? void 0 : _b.marker, zoneOptions = (_c = series.options.cluster) === null || _c === void 0 ? void 0 : _c.zones, gridOffset = series.getGridOffset();
    var xPixel = propsPx.x, yPixel = propsPx.y, pointsLen = 0, radius = 0, nextXPixel, nextYPixel, signX, signY, cornerGridX, cornerGridY, j, itemX, itemY, nextClusterPos, maxDist, keys;
    // Distance to the grid start.
    xPixel -= gridOffset.plotLeft;
    yPixel -= gridOffset.plotTop;
    for (var i = 1; i < 5; i++) {
        signX = i % 2 ? -1 : 1;
        signY = i < 3 ? -1 : 1;
        cornerGridX = Math.floor((xPixel + signX * clusterRadius) / gridSize);
        cornerGridY = Math.floor((yPixel + signY * clusterRadius) / gridSize);
        keys = [
            cornerGridY + ':' + cornerGridX,
            cornerGridY + ':' + gridX,
            gridY + ':' + cornerGridX
        ];
        for (j = 0; j < keys.length; j++) {
            if (gridsToCheckCollision.indexOf(keys[j]) === -1 &&
                keys[j] !== props.key) {
                gridsToCheckCollision.push(keys[j]);
            }
        }
    }
    for (var _i = 0, gridsToCheckCollision_1 = gridsToCheckCollision; _i < gridsToCheckCollision_1.length; _i++) {
        var item = gridsToCheckCollision_1[_i];
        if (groupedData[item]) {
            // Cluster or noise position is already computed.
            if (!groupedData[item].posX) {
                nextClusterPos = getClusterPosition(groupedData[item]);
                groupedData[item].posX = nextClusterPos.x;
                groupedData[item].posY = nextClusterPos.y;
            }
            var pos_1 = valuesToPixels(series, {
                x: groupedData[item].posX || 0,
                y: groupedData[item].posY || 0
            });
            nextXPixel = pos_1.x - gridOffset.plotLeft;
            nextYPixel = pos_1.y - gridOffset.plotTop;
            _a = item.split(':').map(parseFloat), itemY = _a[0], itemX = _a[1];
            if (zoneOptions) {
                pointsLen = groupedData[item].length;
                for (var i = 0; i < zoneOptions.length; i++) {
                    if (pointsLen >= zoneOptions[i].from &&
                        pointsLen <= zoneOptions[i].to) {
                        if (defined((_d = zoneOptions[i].marker) === null || _d === void 0 ? void 0 : _d.radius)) {
                            radius = zoneOptions[i].marker.radius || 0;
                        }
                        else if (clusterMarkerOptions === null || clusterMarkerOptions === void 0 ? void 0 : clusterMarkerOptions.radius) {
                            radius = clusterMarkerOptions.radius;
                        }
                        else {
                            radius = clusterDefaults.marker.radius;
                        }
                    }
                }
            }
            if (groupedData[item].length > 1 &&
                radius === 0 &&
                (clusterMarkerOptions === null || clusterMarkerOptions === void 0 ? void 0 : clusterMarkerOptions.radius)) {
                radius = clusterMarkerOptions.radius;
            }
            else if (groupedData[item].length === 1) {
                radius = defaultRadius;
            }
            maxDist = clusterRadius + radius;
            radius = 0;
            if (itemX !== gridX &&
                Math.abs(xPixel - nextXPixel) < maxDist) {
                xPixel = itemX - gridX < 0 ? gridXPx + clusterRadius :
                    gridXPx + gridSize - clusterRadius;
            }
            if (itemY !== gridY &&
                Math.abs(yPixel - nextYPixel) < maxDist) {
                yPixel = itemY - gridY < 0 ? gridYPx + clusterRadius :
                    gridYPx + gridSize - clusterRadius;
            }
        }
    }
    var pos = pixelsToValues(series, {
        x: xPixel + gridOffset.plotLeft,
        y: yPixel + gridOffset.plotTop
    });
    groupedData[props.key].posX = pos.x;
    groupedData[props.key].posY = pos.y;
    return pos;
}
/**
 * Util function.
 * @private
 */
function valuesToPixels(series, pos) {
    var chart = series.chart, xAxis = series.xAxis, yAxis = series.yAxis;
    if (chart.mapView) {
        return chart.mapView.projectedUnitsToPixels(pos);
    }
    return {
        x: xAxis ? xAxis.toPixels(pos.x) : 0,
        y: yAxis ? yAxis.toPixels(pos.y) : 0
    };
}
/* *
 *
 *  Default Export
 *
 * */
var MarkerClusterScatter = {
    compose: compose
};
export default MarkerClusterScatter;
