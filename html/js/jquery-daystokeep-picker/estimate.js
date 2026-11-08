(function (root) {
    'use strict';

    /**
     * Project image storage after the next clean-up and any days still to come.
     *
     * `days` is the retention setting, where zero means keep every day. The
     * server supplies `days` as newest-first folder sizes and derives the daily
     * average from completed nights. All sizes are allocated bytes, so the
     * projection can be compared with free space on the same filesystem.
     *
     * @param {Object} storage Measurements from the ImageStorage endpoint.
     * @param {number[]} storage.days Newest-first sizes of dated day folders.
     * @param {number} storage.dated_bytes Total size of those folders.
     * @param {number} storage.other_bytes Image-directory data outside them.
     * @param {number} storage.free_bytes Free space on the images disk.
     * @param {number|null} storage.average_day_bytes Average completed day size.
     * @param {number} days Whole days to retain, from 0 to 9999.
     * @returns {Object|null} Projected byte counts, or null without a usable average.
     */
    function estimate(storage, days) {
        const average = Number(storage.average_day_bytes);
        if (!Number.isInteger(days) || days < 0 || days > 9999 || !Number.isFinite(average) || average <= 0) {
            return null;
        }

        const measuredDays = storage.days.map(Number);
        const datedBytes = Number(storage.dated_bytes);
        const freeBytes = Number(storage.free_bytes);
        const otherBytes = Number(storage.other_bytes);
        if (![datedBytes, freeBytes, otherBytes, ...measuredDays].every(Number.isFinite)) {
            return null;
        }

        // Existing folders beyond the limit are released at clean-up. A limit
        // of zero leaves them all in place, rather than retaining zero folders.
        const retainedExisting = days === 0 ? datedBytes
            : measuredDays.slice(0, days).reduce((total, bytes) => total + bytes, 0);
        // If fewer folders exist than requested, budget the missing days using
        // the measured average. Files outside dated folders are never released.
        const extraDays = days === 0 ? 0 : Math.max(0, days - measuredDays.length);
        const futureBytes = extraDays * average;
        const releasedBytes = Math.max(0, datedBytes - retainedExisting);

        return {
            capacityDays: Math.max(0, Math.floor((datedBytes + freeBytes) / average)),
            additionalDays: Math.max(0, Math.floor(freeBytes / average)),
            estimatedImagesBytes: otherBytes + retainedExisting + futureBytes,
            estimatedFreeBytes: freeBytes + releasedBytes - futureBytes,
            releasedBytes,
            futureBytes
        };
    }

    root.AllskyRetentionEstimate = estimate;
    if (typeof module !== 'undefined' && module.exports) module.exports = estimate;
})(typeof window === 'undefined' ? globalThis : window);
