/* Solar elevation follows NOAA's General Solar Position Calculations.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * These are geometric centre-of-Sun angles; no atmospheric refraction is added.
 */
(function (root) {
    'use strict';

    const minute = 60000;
    const day = 86400000;
    const radians = Math.PI / 180;
    const degrees = 180 / Math.PI;

    /**
     * Return the Sun's geometric altitude in degrees at a UTC instant.
     * The fractional year drives NOAA's equation of time and declination;
     * longitude is positive east of Greenwich. Clamp the cosine to absorb
     * floating-point rounding at the poles and at the zenith.
     */
    function solarAltitude(timestamp, latitude, longitude) {
        const date = new Date(timestamp);
        const year = date.getUTCFullYear();
        const yearLength = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / day;
        const dayOfYear = (Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 1)) / day + 1;
        const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        const gamma = 2 * Math.PI / yearLength * (dayOfYear - 1 + (hour - 12) / 24);
        const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma)
            - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma)
            - 0.040849 * Math.sin(2 * gamma));
        const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
            - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
            - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
        const hourAngle = (hour * 60 + equation + 4 * longitude) / 4 * radians - Math.PI;
        const lat = latitude * radians;
        const cosineZenith = Math.sin(lat) * Math.sin(declination)
            + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
        return 90 - Math.acos(Math.max(-1, Math.min(1, cosineZenith))) * degrees;
    }

    function dateFormatter(timezone) {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
        });
    }

    function dateKey(formatter, timestamp) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
            .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
        return parts.year + '-' + parts.month + '-' + parts.day;
    }

    function today(timezone, now) {
        // Date.now() is an instant, but "today" must follow the camera's zone.
        return dateKey(dateFormatter(timezone), now);
    }

    // Find both local midnights by searching UTC instants. Adding 24 hours to
    // the first midnight would miss a shortened or lengthened daylight-saving day.
    function dayBounds(timezone, key) {
        const formatter = dateFormatter(timezone);
        const [year, month, date] = key.split('-').map(Number);
        const base = Date.UTC(year, month - 1, date);
        const firstAtOrAfter = target => {
            // Hourly steps locate the boundary; binary search then narrows it
            // to one second without assuming the zone's UTC offset.
            let previous = base - 24 * 60 * minute;
            for (let next = previous + 60 * minute; next <= base + 48 * 60 * minute; next += 60 * minute) {
                if (dateKey(formatter, next) >= target) {
                    let low = previous;
                    let high = next;
                    while (high - low > 1000) {
                        const middle = Math.floor((high + low) / 2);
                        if (dateKey(formatter, middle) >= target) high = middle;
                        else low = middle;
                    }
                    return high;
                }
                previous = next;
            }
            throw new Error('Unable to find the camera date.');
        };
        const nextDay = new Date(base + day);
        const nextKey = nextDay.toISOString().slice(0, 10);
        return [firstAtOrAfter(key), firstAtOrAfter(nextKey)];
    }

    function samples(timezone, key, latitude, longitude) {
        // Five-minute points give the chart its shape and bracket threshold
        // crossings; include the next midnight as the final endpoint.
        const [start, end] = dayBounds(timezone, key);
        const points = [];
        for (let time = start; time < end; time += 5 * minute) {
            points.push({ time, altitude: solarAltitude(time, latitude, longitude) });
        }
        points.push({ time: end, altitude: solarAltitude(end, latitude, longitude) });
        return points;
    }

    function crossings(points, angle) {
        // Interpolate within each five-minute interval rather than reporting
        // the sample time. A polar day or night can have no crossings.
        const rising = [];
        const setting = [];
        for (let index = 1; index < points.length; index++) {
            const before = points[index - 1];
            const after = points[index];
            const upward = before.altitude < angle && after.altitude >= angle;
            const downward = before.altitude >= angle && after.altitude < angle;
            if (!upward && !downward) continue;
            const fraction = (angle - before.altitude) / (after.altitude - before.altitude);
            const time = before.time + fraction * (after.time - before.time);
            (upward ? rising : setting).push(time);
        }
        return { rising, setting };
    }

    const api = { solarAltitude, today, dayBounds, samples, crossings };
    root.AllskySolar = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
