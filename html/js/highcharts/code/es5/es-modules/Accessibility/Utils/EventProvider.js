/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Class that can keep track of events added, and clean them up on destroy.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import H from '../../Core/Globals.js';
import U from '../../Core/Utilities.js';
var addEvent = U.addEvent;
/**
 * @private
 */
var EventProvider = /** @class */ (function () {
    /* *
     *
     *  Constructor
     *
     * */
    function EventProvider() {
        this.eventRemovers = [];
    }
    /**
     * Add an event to an element and keep track of it for later removal.
     * Same args as Highcharts.addEvent.
     * @private
     */
    EventProvider.prototype.addEvent = function () {
        var remover = addEvent.apply(H, arguments);
        this.eventRemovers.push({
            element: arguments[0], // HTML element
            remover: remover
        });
        return remover;
    };
    /**
     * Remove added event.
     * @private
     */
    EventProvider.prototype.removeEvent = function (event) {
        var pos = this.eventRemovers.map(function (e) { return e.remover; }).indexOf(event);
        this.eventRemovers[pos].remover();
        this.eventRemovers.splice(pos, 1);
    };
    /**
     * Remove all added events.
     * @private
     */
    EventProvider.prototype.removeAddedEvents = function () {
        this.eventRemovers.map(function (e) { return e.remover; })
            .forEach(function (remover) { return remover(); });
        this.eventRemovers = [];
    };
    return EventProvider;
}());
/* *
 *
 *  Default Export
 *
 * */
export default EventProvider;
