/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Class representing a Timeline with sonification events to play.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import TimelineChannel from './TimelineChannel.js';
import toMIDI from './MIDI.js';
import DU from '../DownloadURL.js';
var downloadURL = DU.downloadURL;
import U from '../../Core/Utilities.js';
var defined = U.defined, find = U.find, merge = U.merge;
/**
 * Get filtered channels. Timestamps are compensated, so that the first
 * event starts immediately.
 * @private
 */
function filterChannels(filter, channels) {
    var filtered = channels.map(function (channel) {
        channel.cancel();
        return {
            channel: channel,
            filteredEvents: channel.muted ?
                [] : channel.events.filter(filter)
        };
    }), minTime = filtered.reduce(function (acc, cur) {
        return Math.min(acc, cur.filteredEvents.length ?
            cur.filteredEvents[0].time : Infinity);
    }, Infinity);
    return filtered.map(function (c) { return (new TimelineChannel(c.channel.type, c.channel.engine, c.channel.showPlayMarker, c.filteredEvents.map(function (e) {
        return merge(e, { time: e.time - minTime });
    }), c.channel.muted)); });
}
/**
 * The SonificationTimeline class. This class represents a timeline of
 * audio events scheduled to play. It provides functionality for manipulating
 * and navigating the timeline.
 * @private
 */
var SonificationTimeline = /** @class */ (function () {
    function SonificationTimeline(options, chart) {
        this.chart = chart;
        this.isPaused = false;
        this.isPlaying = false;
        this.channels = [];
        this.scheduledCallbacks = [];
        this.playTimestamp = 0;
        this.resumeFromTime = 0;
        this.options = options || {};
    }
    // Add a channel, optionally with events, to be played.
    // Note: Only one speech channel is supported at a time.
    SonificationTimeline.prototype.addChannel = function (type, engine, showPlayMarker, events) {
        if (showPlayMarker === void 0) { showPlayMarker = false; }
        if (type === 'instrument' &&
            !engine.scheduleEventAtTime ||
            type === 'speech' &&
                !engine.sayAtTime) {
            throw new Error('Highcharts Sonification: Invalid channel engine.');
        }
        var channel = new TimelineChannel(type, engine, showPlayMarker, events);
        this.channels.push(channel);
        return channel;
    };
    // Play timeline, optionally filtering out only some of the events to play.
    // Note that if not all instrument parameters are updated on each event,
    // parameters may update differently depending on the events filtered out,
    // since some of the events that update parameters can be filtered out too.
    // The filterPersists argument determines whether or not the filter persists
    // after e.g. pausing and resuming. Usually this should be true.
    SonificationTimeline.prototype.play = function (filter, filterPersists, resetAfter, onEnd) {
        var _this = this;
        if (filterPersists === void 0) { filterPersists = true; }
        if (resetAfter === void 0) { resetAfter = true; }
        if (this.isPlaying) {
            this.cancel();
        }
        else {
            this.clearScheduledCallbacks();
        }
        this.onEndArgument = onEnd;
        this.playTimestamp = Date.now();
        this.resumeFromTime = 0;
        this.isPaused = false;
        this.isPlaying = true;
        var skipThreshold = this.options.skipThreshold || 2, onPlay = this.options.onPlay, showTooltip = this.options.showTooltip, showCrosshair = this.options.showCrosshair, channels = filter ?
            filterChannels(filter, this.playingChannels || this.channels) :
            this.channels, getEventKeysSignature = function (e) {
            return Object.keys(e.speechOptions || {})
                .concat(Object.keys(e.instrumentEventOptions || {}))
                .join();
        }, pointsPlayed = [];
        if (filterPersists) {
            this.playingChannels = channels;
        }
        if (onPlay) {
            onPlay({ chart: this.chart, timeline: this });
        }
        var maxTime = 0;
        channels.forEach(function (channel) {
            if (channel.muted) {
                return;
            }
            var numEvents = channel.events.length;
            var lastCallbackTime = -Infinity, lastEventTime = -Infinity, lastEventKeys = '';
            maxTime = Math.max(channel.events[numEvents - 1] &&
                channel.events[numEvents - 1].time || 0, maxTime);
            var _loop_1 = function (i) {
                var e = channel.events[i], keysSig = getEventKeysSignature(e);
                // Optimize by skipping extremely close events (<2ms apart by
                // default), as long as they don't introduce new event options
                if (keysSig === lastEventKeys &&
                    e.time - lastEventTime < skipThreshold) {
                    return "continue";
                }
                lastEventKeys = keysSig;
                lastEventTime = e.time;
                if (channel.type === 'instrument') {
                    channel.engine
                        .scheduleEventAtTime(e.time / 1000, e.instrumentEventOptions || {});
                }
                else {
                    channel.engine.sayAtTime(e.time, e.message || '', e.speechOptions || {});
                }
                var point = e.relatedPoint, chart = point && point.series && point.series.chart, needsCallback = e.callback ||
                    point && (showTooltip || showCrosshair) &&
                        channel.showPlayMarker !== false &&
                        (e.time - lastCallbackTime > 50 || i === numEvents - 1);
                if (point) {
                    pointsPlayed.push(point);
                }
                if (needsCallback) {
                    _this.scheduledCallbacks.push(setTimeout(function () {
                        if (e.callback) {
                            e.callback();
                        }
                        if (point) {
                            if (showCrosshair) {
                                var s = point.series;
                                if (s && s.xAxis && s.xAxis.crosshair) {
                                    s.xAxis.drawCrosshair(void 0, point);
                                }
                                if (s && s.yAxis && s.yAxis.crosshair) {
                                    s.yAxis.drawCrosshair(void 0, point);
                                }
                            }
                            if (showTooltip && !(
                            // Don't re-hover if shared tooltip
                            chart && chart.hoverPoints &&
                                chart.hoverPoints.length > 1 &&
                                find(chart.hoverPoints, function (p) { return p === point; }) &&
                                // Stock issue w/Navigator
                                point.onMouseOver)) {
                                point.onMouseOver();
                            }
                        }
                    }, e.time));
                    lastCallbackTime = e.time;
                }
            };
            for (var i = 0; i < numEvents; ++i) {
                _loop_1(i);
            }
        });
        var onEndOpt = this.options.onEnd, onStop = this.options.onStop;
        this.scheduledCallbacks.push(setTimeout(function () {
            var chart = _this.chart, context = { chart: chart, timeline: _this, pointsPlayed: pointsPlayed };
            _this.isPlaying = false;
            if (resetAfter) {
                _this.resetPlayState();
            }
            if (onStop) {
                onStop(context);
            }
            if (onEndOpt) {
                onEndOpt(context);
            }
            if (onEnd) {
                onEnd(context);
            }
            if (chart) {
                if (chart.tooltip) {
                    chart.tooltip.hide(0);
                }
                if (chart.hoverSeries) {
                    chart.hoverSeries.onMouseOut();
                }
                chart.axes.forEach(function (a) { return a.hideCrosshair(); });
            }
        }, maxTime + 250));
        this.resumeFromTime = filterPersists ? maxTime : this.getLength();
    };
    // Pause for later resuming. Returns current timestamp to resume from.
    SonificationTimeline.prototype.pause = function () {
        this.isPaused = true;
        this.cancel();
        this.resumeFromTime = Date.now() - this.playTimestamp - 10;
        return this.resumeFromTime;
    };
    // Get current time
    SonificationTimeline.prototype.getCurrentTime = function () {
        return this.isPlaying ?
            Date.now() - this.playTimestamp :
            this.resumeFromTime;
    };
    // Get length of timeline in milliseconds
    SonificationTimeline.prototype.getLength = function () {
        return this.channels.reduce(function (maxTime, channel) {
            var lastEvent = channel.events[channel.events.length - 1];
            return lastEvent ? Math.max(lastEvent.time, maxTime) : maxTime;
        }, 0);
    };
    // Resume from paused
    SonificationTimeline.prototype.resume = function () {
        if (this.playingChannels) {
            var resumeFrom_1 = this.resumeFromTime - 50;
            this.play(function (e) { return e.time > resumeFrom_1; }, false, false, this.onEndArgument);
            this.playTimestamp -= resumeFrom_1;
        }
        else {
            this.play(void 0, false, false, this.onEndArgument);
        }
    };
    // Play a short moment, then pause, setting the cursor to the final
    // event's time.
    SonificationTimeline.prototype.anchorPlayMoment = function (eventFilter, onEnd) {
        if (this.isPlaying) {
            this.pause();
        }
        var finalEventTime = 0;
        this.play(function (e, ix, arr) {
            // We have to keep track of final event time ourselves, since
            // play() messes with the time internally upon filtering.
            var res = eventFilter(e, ix, arr);
            if (res && e.time > finalEventTime) {
                finalEventTime = e.time;
            }
            return res;
        }, false, false, onEnd);
        this.playingChannels = this.playingChannels || this.channels;
        this.isPaused = true;
        this.isPlaying = false;
        this.resumeFromTime = finalEventTime;
    };
    // Play event(s) occurring next/prev from paused state.
    SonificationTimeline.prototype.playAdjacent = function (next, onEnd, onBoundaryHit, eventFilter) {
        if (this.isPlaying) {
            this.pause();
        }
        var fromTime = this.resumeFromTime, closestTime = this.channels.reduce(function (time, channel) {
            // Adapted binary search since events are sorted by time
            var events = eventFilter ?
                channel.events.filter(eventFilter) : channel.events;
            var s = 0, e = events.length, lastValidTime = time;
            while (s < e) {
                var mid = (s + e) >> 1, t = events[mid].time, cmp = t - fromTime;
                if (cmp > 0) { // Ahead
                    if (next && t < lastValidTime) {
                        lastValidTime = t;
                    }
                    e = mid;
                }
                else if (cmp < 0) { // Behind
                    if (!next && t > lastValidTime) {
                        lastValidTime = t;
                    }
                    s = mid + 1;
                }
                else { // Same as from time
                    if (next) {
                        s = mid + 1;
                    }
                    else {
                        e = mid;
                    }
                }
            }
            return lastValidTime;
        }, next ? Infinity : -Infinity), margin = 0.02;
        if (closestTime === Infinity || closestTime === -Infinity) {
            if (onBoundaryHit) {
                onBoundaryHit({
                    chart: this.chart, timeline: this, attemptedNext: next
                });
            }
            return;
        }
        this.anchorPlayMoment(function (e, ix, arr) {
            var withinTime = next ?
                e.time > fromTime && e.time <= closestTime + margin :
                e.time < fromTime && e.time >= closestTime - margin;
            return eventFilter ? withinTime && eventFilter(e, ix, arr) :
                withinTime;
        }, onEnd);
    };
    // Play event with related point, where the value of a prop on the
    // related point is closest to a target value.
    // Note: not very efficient.
    SonificationTimeline.prototype.playClosestToPropValue = function (prop, targetVal, onEnd, onBoundaryHit, eventFilter) {
        var filter = function (e, ix, arr) { return !!(eventFilter ?
            eventFilter(e, ix, arr) && e.relatedPoint :
            e.relatedPoint); };
        var closestValDiff = Infinity, closestEvent = null;
        (this.playingChannels || this.channels).forEach(function (channel) {
            var events = channel.events;
            var i = events.length;
            while (i--) {
                if (!filter(events[i], i, events)) {
                    continue;
                }
                var val = events[i].relatedPoint[prop], diff = defined(val) && Math.abs(targetVal - val);
                if (diff !== false && diff < closestValDiff) {
                    closestValDiff = diff;
                    closestEvent = events[i];
                }
            }
        });
        if (closestEvent) {
            this.play(function (e) { return !!(closestEvent &&
                e.time < closestEvent.time + 1 &&
                e.time > closestEvent.time - 1 &&
                e.relatedPoint === closestEvent.relatedPoint); }, false, false, onEnd);
            this.playingChannels = this.playingChannels || this.channels;
            this.isPaused = true;
            this.isPlaying = false;
            this.resumeFromTime = closestEvent.time;
        }
        else if (onBoundaryHit) {
            onBoundaryHit({ chart: this.chart, timeline: this });
        }
    };
    // Get timeline events that are related to a certain point.
    // Note: Point grouping may cause some points not to have a
    //  related point in the timeline.
    SonificationTimeline.prototype.getEventsForPoint = function (point) {
        return this.channels.reduce(function (events, channel) {
            var pointEvents = channel.events
                .filter(function (e) { return e.relatedPoint === point; });
            return events.concat(pointEvents);
        }, []);
    };
    // Divide timeline into 100 parts of equal time, and play one of them.
    // Used for scrubbing.
    // Note: Should be optimized?
    SonificationTimeline.prototype.playSegment = function (segment, onEnd) {
        var numSegments = 100;
        var eventTimes = {
            first: Infinity,
            last: -Infinity
        };
        this.channels.forEach(function (c) {
            if (c.events.length) {
                eventTimes.first = Math.min(c.events[0].time, eventTimes.first);
                eventTimes.last = Math.max(c.events[c.events.length - 1].time, eventTimes.last);
            }
        });
        if (eventTimes.first < Infinity) {
            var segmentSize = (eventTimes.last - eventTimes.first) / numSegments, fromTime_1 = eventTimes.first + segment * segmentSize, toTime_1 = fromTime_1 + segmentSize;
            // Binary search, do we have any events within time range?
            if (!this.channels.some(function (c) {
                var events = c.events;
                var s = 0, e = events.length;
                while (s < e) {
                    var mid = (s + e) >> 1, t = events[mid].time;
                    if (t < fromTime_1) { // Behind
                        s = mid + 1;
                    }
                    else if (t > toTime_1) { // Ahead
                        e = mid;
                    }
                    else {
                        return true;
                    }
                }
                return false;
            })) {
                return; // If not, don't play - avoid cancelling current play
            }
            this.play(function (e) { return e.time >= fromTime_1 && e.time <= toTime_1; }, false, false, onEnd);
            this.playingChannels = this.playingChannels || this.channels;
            this.isPaused = true;
            this.isPlaying = false;
            this.resumeFromTime = toTime_1;
        }
    };
    // Get last played / current point
    // Since events are scheduled we can't just store points as we play them
    SonificationTimeline.prototype.getLastPlayedPoint = function (filter) {
        var curTime = this.getCurrentTime(), channels = this.playingChannels || this.channels;
        var closestDiff = Infinity, closestPoint = null;
        channels.forEach(function (c) {
            var events = c.events.filter(function (e, ix, arr) { return !!(e.relatedPoint && e.time <= curTime &&
                (!filter || filter(e, ix, arr))); }), closestEvent = events[events.length - 1];
            if (closestEvent) {
                var closestTime = closestEvent.time, diff = Math.abs(closestTime - curTime);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestPoint = closestEvent.relatedPoint;
                }
            }
        });
        return closestPoint;
    };
    // Reset play/pause state so that a later call to resume() will start over
    SonificationTimeline.prototype.reset = function () {
        if (this.isPlaying) {
            this.cancel();
        }
        this.resetPlayState();
    };
    SonificationTimeline.prototype.cancel = function () {
        var onStop = this.options.onStop;
        if (onStop) {
            onStop({ chart: this.chart, timeline: this });
        }
        this.isPlaying = false;
        this.channels.forEach(function (c) { return c.cancel(); });
        if (this.playingChannels && this.playingChannels !== this.channels) {
            this.playingChannels.forEach(function (c) { return c.cancel(); });
        }
        this.clearScheduledCallbacks();
        this.resumeFromTime = 0;
    };
    SonificationTimeline.prototype.destroy = function () {
        this.cancel();
        if (this.playingChannels && this.playingChannels !== this.channels) {
            this.playingChannels.forEach(function (c) { return c.destroy(); });
        }
        this.channels.forEach(function (c) { return c.destroy(); });
    };
    SonificationTimeline.prototype.setMasterVolume = function (vol) {
        this.channels.forEach(function (c) { return c.engine.setMasterVolume(vol); });
    };
    SonificationTimeline.prototype.getMIDIData = function () {
        return toMIDI(this.channels.filter(function (c) { return c.type === 'instrument'; }));
    };
    SonificationTimeline.prototype.downloadMIDI = function (filename) {
        var data = this.getMIDIData(), name = (filename ||
            this.chart &&
                this.chart.options.title &&
                this.chart.options.title.text ||
            'chart') + '.mid', blob = new Blob([data], { type: 'application/octet-stream' }), url = window.URL.createObjectURL(blob);
        downloadURL(url, name);
        window.URL.revokeObjectURL(url);
    };
    SonificationTimeline.prototype.resetPlayState = function () {
        delete this.playingChannels;
        delete this.onEndArgument;
        this.playTimestamp = this.resumeFromTime = 0;
        this.isPaused = false;
    };
    SonificationTimeline.prototype.clearScheduledCallbacks = function () {
        this.scheduledCallbacks.forEach(clearTimeout);
        this.scheduledCallbacks = [];
    };
    return SonificationTimeline;
}());
/* *
 *
 *  Default Export
 *
 * */
export default SonificationTimeline;
/* *
 *
 *  API declarations
 *
 * */
/**
 * Filter callback for filtering timeline events on a SonificationTimeline.
 *
 * @callback Highcharts.SonificationTimelineFilterCallback
 *
 * @param {Highcharts.SonificationTimelineEvent} e TimelineEvent being filtered
 *
 * @param {number} ix Index of TimelineEvent in current event array
 *
 * @param {Array<Highcharts.SonificationTimelineEvent>} arr The current event array
 *
 * @return {boolean}
 * The function should return true if the TimelineEvent should be included,
 * false otherwise.
 */
(''); // Keep above doclets in JS file
