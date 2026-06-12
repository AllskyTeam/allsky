"use strict";

/*!
 * timeRangeModal — Bootstrap 3 modal time range picker (no Live mode)
 *
 * This jQuery plugin creates a modal dialog for selecting a time range,
 * either via quick presets (e.g. “Last 24h”, “Last 7d”) or custom date/time inputs.
 *
 * - Designed for Bootstrap 3
 * - Provides a small modal UI to select a range
 * - Emits jQuery events on the triggering element:
 *      • tr.change — fired when user modifies the UI
 *      • tr.apply  — fired when Apply button is pressed
 *      • tr.clear  — fired when Clear button is pressed
 *
 * Example:
 *     $('#timeButton').timeRangeModal()
 *         .on('tr.apply', function(e, range) { console.log('Applied:', range); });
 *
 * Dependencies: jQuery, Bootstrap 3 (Modal)
 */

(function (jQuery) {
    /** @constant {string} The plugin name used as the jQuery function name. */
    var pluginName = 'timeRangeModal';

    /** @constant {string} Key used for storing instance data on elements. */
    var instanceKey = pluginName + '_inst';

    /** @type {number} Counter to generate unique modal IDs. */
    var uniqueId = 0;

    /** @constant {object} Default plugin configuration options. */
    var defaults = {
        range: { mode: 'quick', quick: '24h', from: null, to: null },
        quickOptions: {
            '1h': '1h', '2h': '2h', '3h': '3h', '4h': '4h', '5h': '5h', '6h': '6h',
            '12h': '12h', '24h': '24h', '2d': '2d', '3d': '3d', '4d': '4d',
            '5d': '5d', '6d': '6d', '7d': '7d', '14d': '14d', '30d': '30d'
        },
        modalTitle: 'Time range',
        dialogClass: 'modal-sm'
    };

    /* ------------------------------------------------------------------
     * Utility Functions
     * ------------------------------------------------------------------ */

    /**
     * Converts a local date/time string into a Unix timestamp (seconds).
     * @param {string} localDateTimeStr - e.g. "2025-10-20T15:30"
     * @returns {number|null} Unix time in seconds, or null if invalid
     */
    function toUnix(localDateTimeStr) {
        if (!localDateTimeStr) return null;
        var t = Date.parse(localDateTimeStr);
        return isFinite(t) ? Math.floor(t / 1000) : null;
    }

    /**
     * Converts a Unix timestamp into an HTML datetime-local string.
     * @param {number} unixSeconds
     * @returns {string} e.g. "2025-10-20T15:30"
     */
    function fromUnixLocal(unixSeconds) {
        if (!isFinite(unixSeconds)) return '';
        var d = new Date(unixSeconds * 1000);
        function pad(n) { return ('' + n).length === 1 ? ('0' + n) : ('' + n); }
        return (
            d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
        );
    }

    /**
     * Resolves a quick time key (e.g. “24h”) into an absolute range.
     * @param {string} key - One of the quick option keys
     * @returns {{from:number, to:number}} Unix timestamps
     */
    function resolveQuickRange(key) {
        var now = Math.floor(Date.now() / 1000);
        var map = {
            '1h': now - 1 * 3600, 
            '2h': now - 2 * 3600, 
            '3h': now - 3 * 3600,
            '4h': now - 4 * 3600, 
            '5h': now - 5 * 3600, 
            '6h': now - 6 * 3600,
            '12h': now - 12 * 3600, 
            '24h': now - 24 * 3600,
            '2d': now - 2 * 86400, 
            '3d': now - 3 * 86400, 
            '4d': now - 4 * 86400,
            '5d': now - 5 * 86400, 
            '6d': now - 6 * 86400, 
            '7d': now - 7 * 86400,
            '14d': now - 14 * 86400, 
            '30d': now - 30 * 86400
        };
        var from = map[key] != null ? map[key] : now - 24 * 3600;
        return { from: from, to: now };
    }

    /* ------------------------------------------------------------------
     * UI Builders
     * ------------------------------------------------------------------ */

    /**
     * Builds the HTML markup for the modal dialog.
     * @param {string} id - Unique modal ID
     * @param {object} opts - Plugin options
     * @returns {string} The HTML markup string
     */
    function buildModalHtml(id, opts) {
        var quickOpts = Object.keys(opts.quickOptions).map(function (v) {
            var label = opts.quickOptions[v];
            var sel = v === '24h' ? ' selected' : '';
            return `<option value="${v}"${sel}>${label}</option>`;
        }).join('');

        return `
        <div class="modal fade" id="${id}" tabindex="-1" role="dialog" aria-labelledby="${id}_label">
          <div class="modal-dialog ${opts.dialogClass || ''}" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span>&times;</span>
                </button>
                <h4 class="modal-title" id="${id}_label">
                  <i class="fa-regular fa-clock"></i> ${opts.modalTitle || 'Time range'}
                </h4>
              </div>
              <div class="modal-body">
                <div class="form-inline" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <select class="trm-mode form-control input-sm">
                    <option value="quick">Last…</option>
                    <option value="range">Custom</option>
                  </select>
                  <select class="trm-quick form-control input-sm" style="width:120px;">
                    ${quickOpts}
                  </select>
                  <div class="trm-range" style="display:none;display:flex;gap:6px;align-items:center;">
                    <input type="datetime-local" class="trm-from form-control input-sm" style="width:180px;">
                    <span>–</span>
                    <input type="datetime-local" class="trm-to form-control input-sm" style="width:180px;">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-default btn-sm trm-clear">Clear</button>
                <button type="button" class="btn btn-primary btn-sm trm-apply">Apply</button>
              </div>
            </div>
          </div>
        </div>`;
    }

    /* ------------------------------------------------------------------
     * UI Helpers
     * ------------------------------------------------------------------ */

    /**
     * Updates the modal’s inputs and selects to match the given range.
     * @param {jQuery} modalElement
     * @param {object} range - {mode, quick, from, to}
     */
    function setUiFromRange(modalElement, range) {
        var mode = (range && (range.mode === 'quick' || range.mode === 'range')) ? range.mode : 'quick';
        modalElement.find('.trm-mode').val(mode);
        var showQuick = mode === 'quick';
        var showRange = mode === 'range';
        modalElement.find('.trm-quick').toggle(showQuick).val((range && range.quick) || '24h');
        modalElement.find('.trm-range').toggle(showRange);
        if (showRange) {
            modalElement.find('.trm-from').val(fromUnixLocal(range && range.from));
            modalElement.find('.trm-to').val(fromUnixLocal(range && range.to));
        }
    }

    /**
     * Reads the current values from the modal’s inputs and returns a range object.
     * @param {jQuery} modalElement
     * @returns {{mode:string, quick:string, from:number|null, to:number|null}}
     */
    function readUiRange(modalElement) {
        var mode = String(modalElement.find('.trm-mode').val() || 'quick');
        if (mode === 'quick') {
            var quick = String(modalElement.find('.trm-quick').val() || '24h');
            return { mode: 'quick', quick: quick, from: null, to: null };
        }
        var from = toUnix(modalElement.find('.trm-from').val());
        var to = toUnix(modalElement.find('.trm-to').val());
        // Ensure from <= to
        if (isFinite(from) && isFinite(to) && from > to) { var t = from; from = to; to = t; }
        return { mode: 'range', quick: '24h', from: from, to: to };
    }

    /* ------------------------------------------------------------------
     * Instance Class
     * ------------------------------------------------------------------ */

    /**
     * Represents a single modal instance bound to a button.
     * @constructor
     * @param {jQuery} buttonElement - Element to attach to
     * @param {object} opts - Configuration options
     */
    function Instance(buttonElement, opts) {
        this.buttonElement = buttonElement;
        this.options = jQuery.extend(true, {}, defaults, opts || {});
        this.uid = (++uniqueId);
        this.id = 'trm_' + this.uid;
        this.modalElement = jQuery(buildModalHtml(this.id, this.options)).appendTo(document.body);
        this._open = false;

        // Initialize UI with starting range
        setUiFromRange(this.modalElement, this.options.range);
        var self = this;

        /* ========== Event bindings ========== */

        // Mode (quick/custom) changed
        this.modalElement.on('change', '.trm-mode', function () {
            var r = readUiRange(self.modalElement);
            setUiFromRange(self.modalElement, r);
            self.buttonElement.trigger('tr.change', [r]);
        });

        // Quick/range inputs changed
        this.modalElement.on('change input', '.trm-quick, .trm-from, .trm-to', function () {
            var r = readUiRange(self.modalElement);
            self.buttonElement.trigger('tr.change', [r]);
        });

        // Apply button clicked
        this.modalElement.on('click', '.trm-apply', function () {
            var r = readUiRange(self.modalElement);
            if (r.mode === 'quick') {
                var abs = resolveQuickRange(r.quick || '24h');
                r.from = abs.from; r.to = abs.to;
            }
            self.buttonElement.trigger('tr.apply', [r]);
            self.close();
        });

        // Clear button clicked
        this.modalElement.on('click', '.trm-clear', function () {
            var r = { mode: 'quick', quick: '24h', from: null, to: null };
            setUiFromRange(self.modalElement, r);
            self.buttonElement.trigger('tr.clear');
            self.close();
        });

        // When the user clicks the trigger button
        this.buttonElement.off('.' + pluginName).on('click.' + pluginName, function (e) {
            e.preventDefault();
            self.open();
        });

        // Track modal open/close state
        this.modalElement.on('shown.bs.modal', function () { self._open = true; });
        this.modalElement.on('hidden.bs.modal', function () { self._open = false; });
    }

    /* ------------------------------------------------------------------
     * Instance Methods
     * ------------------------------------------------------------------ */

    /** Opens the modal dialog. */
    Instance.prototype.open = function () { this.modalElement.modal('show'); };

    /** Closes the modal dialog. */
    Instance.prototype.close = function () { this.modalElement.modal('hide'); };

    /**
     * Returns the currently selected (absolute) range.
     * @returns {{mode:string, quick:string, from:number, to:number}}
     */
    Instance.prototype.getRange = function () {
        var r = readUiRange(this.modalElement);
        if (r.mode === 'quick') {
            var abs = (function (key) {
                var now = Math.floor(Date.now() / 1000);
                var map = {
                    '1h': now - 3600, '6h': now - 6 * 3600,
                    '24h': now - 24 * 3600, '7d': now - 7 * 86400, '30d': now - 30 * 86400
                };
                return { from: map[key] != null ? map[key] : (now - 24 * 3600), to: now };
            })(r.quick || '24h');
            r.from = abs.from; r.to = abs.to;
        }
        return r;
    };

    /**
     * Programmatically sets the modal’s selected range.
     * @param {object} range - Partial range object to merge
     */
    Instance.prototype.setRange = function (range) {
        this.options.range = jQuery.extend({}, this.options.range, range || {});
        setUiFromRange(this.modalElement, this.options.range);
    };

    /**
     * Destroys the instance and removes modal from DOM.
     */
    Instance.prototype.destroy = function () {
        try { this.modalElement.modal('hide'); } catch (_) { }
        this.buttonElement.off('.' + pluginName);
        this.modalElement.off().remove();
        this.buttonElement.removeData(instanceKey);
    };

    /* ------------------------------------------------------------------
     * jQuery Plugin Definition
     * ------------------------------------------------------------------ */

    /**
     * jQuery plugin entry point.
     * @param {string|object} option - Method name or options
     * @returns {*} Depending on called method
     */
    jQuery.fn[pluginName] = function (option) {
        var args = Array.prototype.slice.call(arguments, 1);
        var ret;
        this.each(function () {
            var element = jQuery(this);
            var inst = element.data(instanceKey);
            if (!inst) {
                // Create new instance if not existing
                if (typeof option === 'object' || !option) {
                    inst = new Instance(element, option || {});
                    element.data(instanceKey, inst);
                } else {
                    return;
                }
            }
            // If string passed, call corresponding method
            if (typeof option === 'string') {
                if (typeof inst[option] !== 'function')
                    throw new Error(pluginName + ': unknown method ' + option);
                ret = inst[option].apply(inst, args);
            }
        });
        return ret !== undefined ? ret : this;
    };

    /* ------------------------------------------------------------------
     * Theme Styling Injection
     * ------------------------------------------------------------------ */

    // Inject a small dark mode style if not already added
    if (!document.getElementById('trm-style')) {
        jQuery('<style id="trm-style">')
            .text('body.dark .modal-content{background:#272727;border-color:#3a3a3a;color:#fff;} body.dark .modal-header, body.dark .modal-footer{border-color:#3a3a3a;}')
            .appendTo('head');
    }

})(jQuery);