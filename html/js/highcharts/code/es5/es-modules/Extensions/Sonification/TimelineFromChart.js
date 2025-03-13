/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Build a timeline from a chart.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import SonificationTimeline from './SonificationTimeline.js';
import SonificationInstrument from './SonificationInstrument.js';
import SonificationSpeaker from './SonificationSpeaker.js';
import U from '../../Core/Utilities.js';
var clamp = U.clamp, defined = U.defined, extend = U.extend, getNestedProperty = U.getNestedProperty, merge = U.merge, pick = U.pick;
import T from '../../Core/Templating.js';
var format = T.format;
var isNoteDefinition = function (str) {
    return (/^([a-g][#b]?)[0-8]$/i).test(str);
};
/**
 * Get the value of a point property from string.
 * @private
 */
function getPointPropValue(point, prop) {
    var ret;
    if (prop) {
        ret = point[prop];
        if (typeof ret === 'number') {
            return ret;
        }
        ret = getNestedProperty(prop, point);
    }
    return typeof ret === 'number' ? ret : void 0;
}
/**
 * Get chart wide min/max for a set of props, as well as per
 * series min/max for selected props.
 * @private
 */
function getChartExtremesForProps(chart, props, perSeriesProps) {
    var series = chart.series, numProps = props.length, numSeriesProps = perSeriesProps.length, initCache = function (propList) {
        return propList.reduce(function (cache, prop) {
            ((cache[prop] = { min: Infinity, max: -Infinity }), cache);
            return cache;
        }, {});
    }, updateCache = function (cache, point, prop) {
        var val = point[prop];
        if (val === void 0) {
            val = getNestedProperty(prop, point);
        }
        if (typeof val === 'number') {
            cache[prop].min = Math.min(cache[prop].min, val);
            cache[prop].max = Math.max(cache[prop].max, val);
        }
    }, globalExtremes = initCache(props);
    var i = series.length;
    var allSeriesExtremes = new Array(i);
    while (i--) {
        var seriesExtremes = initCache(perSeriesProps);
        var opts = series[i].options;
        if (!series[i].visible ||
            opts && opts.sonification && opts.sonification.enabled === false) {
            continue;
        }
        var points = series[i].points || [];
        var j = points.length;
        while (j--) {
            var k = numProps;
            while (k--) {
                updateCache(globalExtremes, points[j], props[k]);
            }
            k = numSeriesProps;
            while (k--) {
                updateCache(seriesExtremes, points[j], perSeriesProps[k]);
            }
        }
        allSeriesExtremes[i] = seriesExtremes;
    }
    return {
        globalExtremes: globalExtremes,
        seriesExtremes: allSeriesExtremes
    };
}
/**
 * Build a cache of prop extremes for the chart. Goes through
 * options to find out which props are needed.
 * @private
 */
function getPropMetrics(chart) {
    var globalOpts = chart.options.sonification ||
        {}, defaultInstrMapping = (globalOpts.defaultInstrumentOptions || {})
        .mapping || { time: 'x', pitch: 'y' }, defaultSpeechMapping = globalOpts.defaultSpeechOptions &&
        globalOpts.defaultSpeechOptions.mapping || {}, seriesTimeProps = [], commonTimeProps = {}, addTimeProp = function (prop, seriesIx) {
        if (seriesIx !== null) {
            seriesTimeProps[seriesIx] =
                seriesTimeProps[seriesIx] || {};
            seriesTimeProps[seriesIx][prop] = true;
        }
        else {
            commonTimeProps[prop] = true;
        }
    }, props = {}, perSeriesProps = {}, addPropFromMappingParam = function (param, val, seriesIx) {
        var removeInvertedFlag = function (s) { return (s.charAt(0) === '-' ? s.slice(1) : s); };
        if (typeof val === 'string' && param !== 'text') {
            if (param === 'pitch' && isNoteDefinition(val)) {
                return;
            }
            if (param === 'time') {
                perSeriesProps[val] = true;
                addTimeProp(val, seriesIx);
            }
            props[removeInvertedFlag(val)] = true;
            return;
        }
        var paramOpts = val;
        if (paramOpts && paramOpts.mapTo &&
            typeof paramOpts.mapTo === 'string') {
            var mapTo = removeInvertedFlag(paramOpts.mapTo);
            if (param === 'time') {
                addTimeProp(mapTo, seriesIx);
            }
            if (param === 'time' || paramOpts.within === 'series') {
                perSeriesProps[mapTo] = true;
            }
            props[mapTo] = true;
            return;
        }
        if (['tremolo', 'lowpass', 'highpass'].indexOf(param) > -1 &&
            typeof val === 'object') {
            Object.keys(val).forEach(function (subParam) {
                return addPropFromMappingParam(subParam, val[subParam], seriesIx);
            });
        }
    }, addPropsFromMappingOptions = function (mapping, seriesIx) {
        (Object.keys(mapping)).forEach(function (param) {
            return addPropFromMappingParam(param, mapping[param], seriesIx);
        });
    }, addPropsFromContextTracks = function (tracks) { return tracks.forEach(function (track) {
        props[track.valueProp || 'x'] =
            perSeriesProps[track.valueProp || 'x'] = true;
    }); };
    addPropsFromMappingOptions(defaultInstrMapping, null);
    addPropsFromMappingOptions(defaultSpeechMapping, null);
    addPropsFromContextTracks(globalOpts.globalContextTracks || []);
    var hasCommonTimeProps = Object.keys(commonTimeProps).length;
    chart.series.forEach(function (series) {
        var sOpts = series.options.sonification;
        if (series.visible && !(sOpts && sOpts.enabled === false)) {
            if (hasCommonTimeProps) {
                seriesTimeProps[series.index] = merge(commonTimeProps);
            }
            if (sOpts) {
                var defaultInstrMapping_1 = (sOpts.defaultInstrumentOptions || {}).mapping, defaultSpeechMapping_1 = (sOpts.defaultSpeechOptions || {}).mapping;
                if (defaultInstrMapping_1) {
                    addPropsFromMappingOptions(defaultInstrMapping_1, series.index);
                }
                if (defaultSpeechMapping_1) {
                    addPropsFromMappingOptions(defaultSpeechMapping_1, series.index);
                }
                addPropsFromContextTracks(sOpts.contextTracks || []);
                (sOpts.tracks || [])
                    .concat(sOpts.contextTracks || [])
                    .forEach(function (trackOpts) {
                    if (trackOpts.mapping) {
                        addPropsFromMappingOptions(trackOpts.mapping, series.index);
                    }
                });
            }
        }
    });
    return __assign({ seriesTimeProps: seriesTimeProps }, getChartExtremesForProps(chart, Object.keys(props), Object.keys(perSeriesProps)));
}
/**
 * Map a relative value onto a virtual axis.
 * @private
 */
function mapToVirtualAxis(value, valueExtremes, virtualAxisExtremes, invert, logarithmic // Virtual axis is logarithmic
) {
    var lenValueAxis = valueExtremes.max - valueExtremes.min;
    if (lenValueAxis <= 0) {
        return virtualAxisExtremes.min;
    }
    var lenVirtualAxis = virtualAxisExtremes.max - virtualAxisExtremes.min, valueDelta = value - valueExtremes.min;
    var virtualValueDelta = lenVirtualAxis * valueDelta / lenValueAxis;
    if (logarithmic) {
        var log = valueExtremes.min > 0 ?
            // Normal log formula
            function (x) { return Math.log(x) / Math.LOG10E; } :
            // Negative logarithmic support needed
            function (x) {
                var adjustedNum = Math.abs(x);
                if (adjustedNum < 10) {
                    adjustedNum += (10 - adjustedNum) / 10;
                }
                var res = Math.log(adjustedNum) / Math.LN10;
                return x < 0 ? -res : res;
            };
        var logValMin = log(valueExtremes.min);
        virtualValueDelta = lenVirtualAxis *
            (log(value) - logValMin) /
            (log(valueExtremes.max) - logValMin);
    }
    var val = invert ?
        virtualAxisExtremes.max - virtualValueDelta :
        virtualAxisExtremes.min + virtualValueDelta;
    return clamp(val, virtualAxisExtremes.min, virtualAxisExtremes.max);
}
/**
 * Get the value of a mapped parameter for a point.
 * @private
 */
function getMappingParameterValue(context, propMetrics, useSeriesExtremes, defaultMapping, mappingOptions, contextValueProp) {
    if (typeof mappingOptions === 'number') {
        return mappingOptions;
    }
    if (typeof mappingOptions === 'function') {
        return mappingOptions(extend({ time: 0 }, context));
    }
    var mapTo = mappingOptions, mapFunc = defaultMapping.mapFunction, min = defaultMapping.min, max = defaultMapping.max, within = defaultMapping.within, scale;
    if (typeof mappingOptions === 'object') {
        mapTo = mappingOptions.mapTo;
        mapFunc = mappingOptions.mapFunction || mapFunc;
        min = pick(mappingOptions.min, min);
        max = pick(mappingOptions.max, max);
        within = mappingOptions.within || defaultMapping.within;
        scale = mappingOptions.scale;
    }
    if (!mapTo) {
        return null;
    }
    var isInverted = mapTo.charAt(0) === '-';
    if (isInverted) {
        mapTo = mapTo.slice(1);
    }
    var value = context.value;
    var useContextValue = mapTo === 'value' && value !== void 0 &&
        contextValueProp;
    if (!useContextValue) {
        var fixedValue = mappingOptions.value;
        if (fixedValue !== void 0) {
            value = fixedValue;
        }
        else {
            if (!context.point) {
                return null;
            }
            value = context.point[mapTo];
        }
        if (value === void 0) {
            value = getNestedProperty(mapTo, context.point);
        }
    }
    if (typeof value !== 'number' || value === null) {
        return null;
    }
    // Figure out extremes for this mapping
    var extremes = null;
    if (context.point) {
        if (within === 'xAxis' || within === 'yAxis') {
            var axis = context.point.series[within];
            if (axis && defined(axis.dataMin) && defined(axis.dataMax)) {
                extremes = {
                    min: axis.dataMin,
                    max: axis.dataMax
                };
            }
        }
        else if ((within === 'series' || useSeriesExtremes) &&
            context.point.series) {
            extremes = propMetrics.seriesExtremes[context.point.series.index][useContextValue ? contextValueProp : mapTo];
        }
    }
    if (!extremes) { // Chart extremes
        extremes = propMetrics.globalExtremes[useContextValue ? contextValueProp : mapTo];
    }
    if (scale) {
        // Build a musical scale from array
        var scaleAxis = [], minOctave = Math.floor(min / 12), maxOctave = Math.ceil(max / 12) + 1, lenScale = scale.length;
        for (var octave = minOctave; octave < maxOctave; ++octave) {
            for (var scaleIx = 0; scaleIx < lenScale; ++scaleIx) {
                var note = 12 * octave + scale[scaleIx];
                if (note >= min && note <= max) {
                    scaleAxis.push(note);
                }
            }
        }
        // Map to the scale
        var noteNum = mapToVirtualAxis(value, extremes, { min: 0, max: scaleAxis.length - 1 }, isInverted, mapFunc === 'logarithmic');
        return scaleAxis[Math.round(noteNum)];
    }
    return mapToVirtualAxis(value, extremes, { min: min, max: max }, isInverted, mapFunc === 'logarithmic');
}
/**
 * Get mapping parameter value with defined fallback and defaults.
 * @private
 */
function getParamValWithDefault(context, propMetrics, useSeriesExtremes, mappingParamOptions, fallback, defaults, contextValueProp) {
    return pick(getMappingParameterValue(context, propMetrics, useSeriesExtremes, extend({
        min: 0, max: 1, mapTo: 'y', mapFunction: 'linear', within: 'chart'
    }, (defaults || {})), mappingParamOptions, contextValueProp), fallback);
}
/**
 * Get time value for a point event.
 * @private
 */
function getPointTime(point, startTime, duration, timeMappingOptions, propMetrics, useSeriesExtremes) {
    var time = getParamValWithDefault({ point: point, time: 0 }, propMetrics, useSeriesExtremes, timeMappingOptions, 0, { min: 0, max: duration, mapTo: 'x' });
    return time + startTime;
}
/**
 * Get duration for a series
 * @private
 */
function getAvailableDurationForSeries(series, totalDuration, propMetrics, afterSeriesWait) {
    var timeProp, seriesDuration;
    var availableDuration = totalDuration -
        (series.chart.series.length - 1) * afterSeriesWait, hasGlobalTimeProp = propMetrics.seriesTimeProps.every(function (timeProps) {
        var props = Object.keys(timeProps);
        if (props.length > 1) {
            return false;
        }
        if (!timeProp) {
            timeProp = props[0];
        }
        return timeProp === props[0];
    });
    if (hasGlobalTimeProp) {
        // Chart-wide single time prop, use time prop extremes
        var seriesExtremes = propMetrics
            .seriesExtremes[series.index][timeProp], seriesTimeLen = seriesExtremes.max - seriesExtremes.min, totalTimeLen = propMetrics.seriesExtremes.reduce(function (sum, s) { return (s[timeProp] ?
            sum + s[timeProp].max - s[timeProp].min :
            sum); }, 0);
        seriesDuration = Math.round(seriesTimeLen / totalTimeLen * availableDuration);
    }
    else {
        // No common time prop, so use percent of total points
        var totalPoints = series.chart.series.reduce(function (sum, s) { return sum + s.points.length; }, 0);
        seriesDuration = Math.round((series.points || []).length / totalPoints * availableDuration);
    }
    return Math.max(50, seriesDuration);
}
/**
 * Build and add a track to the timeline.
 * @private
 */
function addTimelineChannelFromTrack(timeline, audioContext, destinationNode, options) {
    var speechOpts = options, instrMappingOpts = (options.mapping || {}), engine = options.type === 'speech' ?
        new SonificationSpeaker({
            language: speechOpts.language,
            name: speechOpts.preferredVoice
        }) :
        new SonificationInstrument(audioContext, destinationNode, {
            capabilities: {
                pan: !!instrMappingOpts.pan,
                tremolo: !!instrMappingOpts.tremolo,
                filters: !!(instrMappingOpts.highpass ||
                    instrMappingOpts.lowpass)
            },
            synthPatch: options.instrument,
            midiTrackName: options.midiName
        });
    return timeline.addChannel(options.type || 'instrument', engine, pick(options.showPlayMarker, true));
}
/**
 * Add event from a point to a mapped instrument track.
 * @private
 */
function addMappedInstrumentEvent(context, channel, mappingOptions, propMetrics, roundToMusicalNotes, contextValueProp) {
    var getParam = function (param, fallback, defaults, parent) { return getParamValWithDefault(context, propMetrics, false, (parent || mappingOptions)[param], fallback, defaults, contextValueProp); };
    var eventsAdded = [], eventOpts = {
        noteDuration: getParam('noteDuration', 200, { min: 40, max: 1000 }),
        pan: getParam('pan', 0, { min: -1, max: 1 }),
        volume: getParam('volume', 1, { min: 0.1, max: 1 })
    };
    if (mappingOptions.frequency) {
        eventOpts.frequency = getParam('frequency', 440, { min: 50, max: 6000 });
    }
    if (mappingOptions.lowpass) {
        eventOpts.lowpassFreq = getParam('frequency', 20000, { min: 0, max: 20000 }, mappingOptions.lowpass);
        eventOpts.lowpassResonance = getParam('resonance', 0, { min: -6, max: 12 }, mappingOptions.lowpass);
    }
    if (mappingOptions.highpass) {
        eventOpts.highpassFreq = getParam('frequency', 20000, { min: 0, max: 20000 }, mappingOptions.highpass);
        eventOpts.highpassResonance = getParam('resonance', 0, { min: -6, max: 12 }, mappingOptions.highpass);
    }
    if (mappingOptions.tremolo) {
        eventOpts.tremoloDepth = getParam('depth', 0, { min: 0, max: 0.8 }, mappingOptions.tremolo);
        eventOpts.tremoloSpeed = getParam('speed', 0, { min: 0, max: 0.8 }, mappingOptions.tremolo);
    }
    var gapBetweenNotes = getParam('gapBetweenNotes', 150, { min: 50, max: 1000 }), playDelay = getParam('playDelay', 0, { max: 200 });
    var addNoteEvent = function (noteDef, ix) {
        if (ix === void 0) { ix = 0; }
        var opts = noteDef;
        if (noteDef.mapTo) {
            // Transform the pitch mapping options to normal mapping options
            if (typeof noteDef.min === 'string') {
                opts.min = SonificationInstrument
                    .noteStringToC0Distance(noteDef.min);
            }
            if (typeof noteDef.max === 'string') {
                opts.max = SonificationInstrument
                    .noteStringToC0Distance(noteDef.max);
            }
        }
        else if (typeof noteDef === 'string' && isNoteDefinition(noteDef)) {
            opts = SonificationInstrument.noteStringToC0Distance(noteDef);
        }
        eventOpts.note = getParamValWithDefault(context, propMetrics, false, opts, -1, { min: 0, max: 107 }, contextValueProp);
        if (eventOpts.note > -1) {
            if (roundToMusicalNotes) {
                eventOpts.note = Math.round(eventOpts.note);
            }
            eventsAdded.push(channel.addEvent({
                time: context.time + playDelay + gapBetweenNotes * ix,
                relatedPoint: context.point,
                instrumentEventOptions: ix !== void 0 ?
                    extend({}, eventOpts) : eventOpts
            }));
        }
    };
    if (mappingOptions.pitch &&
        mappingOptions.pitch.constructor === Array) {
        mappingOptions.pitch.forEach(addNoteEvent);
    }
    else if (mappingOptions.pitch) {
        addNoteEvent(mappingOptions.pitch);
    }
    else if (mappingOptions.frequency) {
        eventsAdded.push(channel.addEvent({
            time: context.time + playDelay,
            relatedPoint: context.point,
            instrumentEventOptions: eventOpts
        }));
    }
    return eventsAdded;
}
/**
 * Get the message value to speak for a point.
 * @private
 */
function getSpeechMessageValue(context, messageParam) {
    return format(typeof messageParam === 'function' ?
        messageParam(context) :
        messageParam, context, context.point && context.point.series.chart);
}
/**
 * Add an event from a point to a mapped speech track.
 * @private
 */
function addMappedSpeechEvent(context, channel, mappingOptions, propMetrics, contextValueProp) {
    var getParam = function (param, fallback, defaults) { return getParamValWithDefault(context, propMetrics, false, mappingOptions[param], fallback, defaults, contextValueProp); };
    var playDelay = getParam('playDelay', 0, { max: 200 }), pitch = getParam('pitch', 1, { min: 0.3, max: 2 }), rate = getParam('rate', 1, { min: 0.4, max: 4 }), volume = getParam('volume', 1, { min: 0.1 }), message = getSpeechMessageValue(context, mappingOptions.text);
    if (message) {
        return channel.addEvent({
            time: context.time + playDelay,
            relatedPoint: context.point,
            speechOptions: {
                pitch: pitch,
                rate: rate,
                volume: volume
            },
            message: message
        });
    }
}
/**
 * Add events to a channel for a point&track combo.
 * @private
 */
function addMappedEventForPoint(context, channel, trackOptions, propMetrics) {
    var eventsAdded = [];
    if (trackOptions.type === 'speech' && trackOptions.mapping) {
        var eventAdded = addMappedSpeechEvent(context, channel, trackOptions.mapping, propMetrics);
        if (eventAdded) {
            eventsAdded = [eventAdded];
        }
    }
    else if (trackOptions.mapping) {
        eventsAdded = addMappedInstrumentEvent(context, channel, trackOptions.mapping, propMetrics, pick(trackOptions
            .roundToMusicalNotes, true));
    }
    return eventsAdded;
}
/**
 * Get a reduced set of points from a list, depending on grouping opts.
 * @private
 */
function getGroupedPoints(pointGroupOpts, points) {
    var alg = pointGroupOpts.algorithm || 'minmax', r = function (ix) { return (points[ix] ? [points[ix].point] : []); };
    if (alg === 'first') {
        return r(0);
    }
    if (alg === 'last') {
        return r(points.length - 1);
    }
    if (alg === 'middle') {
        return r(points.length >> 1);
    }
    if (alg === 'firstlast') {
        return r(0).concat(r(points.length - 1));
    }
    if (alg === 'minmax') {
        var prop_1 = pointGroupOpts.prop || 'y';
        var min_1, max_1, minVal_1, maxVal_1;
        points.forEach(function (p) {
            var val = getPointPropValue(p.point, prop_1);
            if (val === void 0) {
                return;
            }
            if (!min_1 || val < minVal_1) {
                min_1 = p;
                minVal_1 = val;
            }
            if (!max_1 || val > maxVal_1) {
                max_1 = p;
                maxVal_1 = val;
            }
        });
        if (min_1 && max_1) {
            if (min_1.point === max_1.point) {
                return [min_1.point];
            }
            return min_1.time > max_1.time ?
                [max_1.point, min_1.point] :
                [min_1.point, max_1.point];
        }
    }
    return [];
}
/**
 * Should a track be active for this event?
 * @private
 */
function isActive(context, activeWhen, lastPropValue) {
    if (typeof activeWhen === 'function') {
        return activeWhen(context);
    }
    if (typeof activeWhen === 'object') {
        var prop = activeWhen.prop, val = pick(context.value, context.point && getPointPropValue(context.point, prop));
        if (typeof val !== 'number') {
            return false;
        }
        var crossingOk = true;
        var crossingUp = activeWhen.crossingUp, crossingDown = activeWhen.crossingDown, hasLastValue = typeof lastPropValue === 'number';
        if (crossingUp && crossingDown) {
            crossingOk = hasLastValue && (lastPropValue < crossingUp && val >= crossingUp ||
                lastPropValue > crossingDown && val <= crossingDown);
        }
        else {
            crossingOk = (crossingUp === void 0 ||
                hasLastValue && lastPropValue < crossingUp &&
                    val >= crossingUp) && (crossingDown === void 0 ||
                hasLastValue && lastPropValue > crossingDown &&
                    val <= crossingDown);
        }
        var max = pick(activeWhen.max, Infinity), min = pick(activeWhen.min, -Infinity);
        return val <= max && val >= min && crossingOk;
    }
    return true;
}
/**
 * Build a new timeline object from a chart.
 * @private
 */
function timelineFromChart(audioContext, destinationNode, chart) {
    var options = chart.options.sonification ||
        {}, defaultInstrOpts = options.defaultInstrumentOptions, defaultSpeechOpts = options.defaultSpeechOptions, defaultPointGroupOpts = merge({
        enabled: true,
        groupTimespan: 15,
        algorithm: 'minmax',
        prop: 'y'
    }, options.pointGrouping), globalTracks = options.globalTracks || [], globalContextTracks = options.globalContextTracks || [], isSequential = options.order === 'sequential', 
    // Slight margin for note end
    totalDuration = Math.max(50, options.duration - 300), afterSeriesWait = options.afterSeriesWait, eventOptions = options.events || {}, propMetrics = getPropMetrics(chart), timeline = new SonificationTimeline({
        onPlay: eventOptions.onPlay,
        onEnd: eventOptions.onEnd,
        onStop: eventOptions.onStop,
        showCrosshair: options.showCrosshair,
        showTooltip: options.showTooltip
    }, chart);
    // Expose PropMetrics for tests
    if (chart.sonification) {
        chart.sonification.propMetrics = propMetrics;
    }
    var startTime = 0;
    chart.series.forEach(function (series, seriesIx) {
        var sOptions = series.options.sonification ||
            {};
        if (series.visible && sOptions.enabled !== false) {
            var seriesDuration_1 = isSequential ? getAvailableDurationForSeries(series, totalDuration, propMetrics, afterSeriesWait) : totalDuration, seriesDefaultInstrOpts_1 = merge(defaultInstrOpts, sOptions.defaultInstrumentOptions), seriesDefaultSpeechOpts_1 = merge(defaultSpeechOpts, sOptions.defaultSpeechOptions), seriesPointGroupOpts_1 = merge(defaultPointGroupOpts, sOptions.pointGrouping), mainTracks = (sOptions.tracks || [seriesDefaultInstrOpts_1])
                .concat(globalTracks), hasAddedSeries = !!timeline.channels.length, contextTracks = hasAddedSeries && !isSequential ?
                sOptions.contextTracks || [] :
                (sOptions.contextTracks || []).concat(globalContextTracks), eventsAdded_1 = [];
            // For crossing threshold notifications
            var lastPropValue_1;
            // Add events for the mapped tracks
            mainTracks.forEach(function (trackOpts) {
                var mergedOpts = merge({
                    pointGrouping: seriesPointGroupOpts_1,
                    midiName: trackOpts.midiName || series.name
                }, trackOpts.type === 'speech' ?
                    seriesDefaultSpeechOpts_1 : seriesDefaultInstrOpts_1, trackOpts), pointGroupOpts = mergedOpts.pointGrouping, activeWhen = mergedOpts.activeWhen, updateLastPropValue = function (point) {
                    if (typeof activeWhen === 'object' &&
                        activeWhen.prop) {
                        lastPropValue_1 = getPointPropValue(point, activeWhen.prop);
                    }
                };
                var channel = addTimelineChannelFromTrack(timeline, audioContext, destinationNode, mergedOpts), add = function (c) { return eventsAdded_1.push.apply(eventsAdded_1, addMappedEventForPoint(c, channel, mergedOpts, propMetrics)); };
                // Go through the points and add events to channel
                var pointGroup = [], pointGroupTime = 0;
                var addCurrentPointGroup = function (groupSpanTime) {
                    if (pointGroup.length === 1) {
                        add({
                            point: pointGroup[0].point,
                            time: pointGroupTime + groupSpanTime / 2
                        });
                    }
                    else {
                        var points = getGroupedPoints(pointGroupOpts, pointGroup), t_1 = groupSpanTime / points.length;
                        points.forEach(function (p, ix) { return add({
                            point: p,
                            time: pointGroupTime + t_1 / 2 + t_1 * ix
                        }); });
                    }
                    pointGroup = [];
                };
                (series.points || []).forEach(function (point, pointIx) {
                    var isLastPoint = pointIx === series.points.length - 1;
                    var time = getPointTime(point, startTime, seriesDuration_1, mergedOpts.mapping && mergedOpts.mapping.time || 0, propMetrics, isSequential);
                    var context = { point: point, time: time };
                    // Is this point active?
                    if (!mergedOpts.mapping ||
                        !isActive(context, activeWhen, lastPropValue_1)) {
                        updateLastPropValue(point);
                        // Remaining points in group
                        if (isLastPoint && pointGroup.length) {
                            addCurrentPointGroup(pointGroup[pointGroup.length - 1].time -
                                pointGroup[0].time);
                        }
                        return;
                    }
                    updateLastPropValue(point);
                    // Add the events
                    if (!pointGroupOpts.enabled) {
                        add(context);
                    }
                    else {
                        var dT = time - pointGroupTime, groupSpan = pointGroupOpts.groupTimespan, spanTime = isLastPoint &&
                            dT <= groupSpan ? dT : groupSpan;
                        if (isLastPoint || dT > groupSpan) {
                            if (dT <= groupSpan) {
                                // Only happens if last point is within group
                                pointGroup.push(context);
                            }
                            addCurrentPointGroup(spanTime);
                            pointGroupTime = Math.floor(time / groupSpan) *
                                groupSpan;
                            if (isLastPoint && dT > groupSpan) {
                                add({
                                    point: context.point,
                                    time: pointGroupTime + spanTime / 2
                                });
                            }
                            else {
                                pointGroup = [context];
                            }
                        }
                        else {
                            pointGroup.push(context);
                        }
                    }
                });
            });
            // Add callbacks to first/last events
            var firstEvent = eventsAdded_1.reduce(function (first, e) { return (e.time < first.time ? e : first); }, { time: Infinity });
            var lastEvent = eventsAdded_1.reduce(function (last, e) { return (e.time > last.time ? e : last); }, { time: -Infinity });
            firstEvent.callback = eventOptions.onSeriesStart ?
                eventOptions.onSeriesStart.bind(null, { series: series, timeline: timeline }) :
                void 0;
            lastEvent.callback = eventOptions.onSeriesEnd ?
                eventOptions.onSeriesEnd.bind(null, { series: series, timeline: timeline }) :
                void 0;
            // Add the context tracks that are not related to points
            contextTracks.forEach(function (trackOpts) {
                var mergedOpts = trackOpts.type === 'speech' ?
                    merge(defaultSpeechOpts, trackOpts) :
                    merge(defaultInstrOpts, {
                        mapping: { pitch: { mapTo: 'value' } }
                    }, trackOpts);
                var contextChannel = addTimelineChannelFromTrack(timeline, audioContext, destinationNode, mergedOpts);
                lastPropValue_1 = void 0;
                var timeInterval = mergedOpts.timeInterval, valueInterval = mergedOpts.valueInterval, valueProp = mergedOpts.valueProp || 'x', activeWhen = mergedOpts.activeWhen, contextExtremes = propMetrics
                    .seriesExtremes[seriesIx][valueProp], addContextEvent = function (time, value) {
                    if (!mergedOpts.mapping ||
                        !isActive({ time: time, value: value }, typeof activeWhen === 'object' ?
                            extend({ prop: valueProp }, activeWhen) :
                            activeWhen, lastPropValue_1)) {
                        lastPropValue_1 = value;
                        return;
                    }
                    lastPropValue_1 = value;
                    if (mergedOpts.type === 'speech') {
                        addMappedSpeechEvent({ time: time, value: value }, contextChannel, mergedOpts.mapping, propMetrics, valueProp);
                    }
                    else {
                        addMappedInstrumentEvent({ time: time, value: value }, contextChannel, mergedOpts.mapping, propMetrics, pick(mergedOpts.roundToMusicalNotes, true), valueProp);
                    }
                };
                if (timeInterval) {
                    var time = 0;
                    while (time <= seriesDuration_1) {
                        var val = mapToVirtualAxis(time, { min: 0, max: seriesDuration_1 }, contextExtremes);
                        addContextEvent(time + startTime, val);
                        time += timeInterval;
                    }
                }
                if (valueInterval) {
                    var val = contextExtremes.min;
                    while (val <= contextExtremes.max) {
                        var time = mapToVirtualAxis(val, contextExtremes, { min: 0, max: seriesDuration_1 }, false, mergedOpts.valueMapFunction === 'logarithmic');
                        addContextEvent(time + startTime, val);
                        val += valueInterval;
                    }
                }
            });
            if (isSequential) {
                startTime += seriesDuration_1 + afterSeriesWait;
            }
        }
    });
    return timeline;
}
/* *
 *
 *  Default Export
 *
 * */
export default timelineFromChart;
