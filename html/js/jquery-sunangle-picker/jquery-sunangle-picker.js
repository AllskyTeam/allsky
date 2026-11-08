(function (jQuery, solar) {
    'use strict';

    const svgNamespace = 'http://www.w3.org/2000/svg';
    // Long names are available to assistive technology; the short labels fit
    // beside each other on mobile screens.
    const presets = [
        [-18, 'Astronomical', 'Astro'], [-12, 'Nautical', 'Naut.'],
        [-6, 'Civil', 'Civil'], [-0.83, 'Sunrise / sunset', 'Rise/set'],
        [0, 'Horizon', 'Horizon']
    ];

    function coordinate(value, axis) {
        // Settings may contain signed decimal degrees or N/S/E/W notation.
        // Reject a signed value with a direction to avoid conflicting signs.
        const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*([NSEW])?\s*$/i.exec(String(value || ''));
        if (!match) return null;
        const direction = (match[2] || '').toUpperCase();
        if (direction && Number(match[1]) < 0) return null;
        if (axis === 'latitude' && direction && !['N', 'S'].includes(direction)) return null;
        if (axis === 'longitude' && direction && !['E', 'W'].includes(direction)) return null;
        const magnitude = Number(match[1]);
        const number = direction === 'S' || direction === 'W' ? -magnitude : magnitude;
        const limit = axis === 'latitude' ? 90 : 180;
        return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
    }

    function svgElement(name, attributes) {
        const element = document.createElementNS(svgNamespace, name);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
    }

    function angleText(angle) {
        return String(Number(angle.toFixed(2)));
    }

    /** Plot today's solar altitude and choose the threshold used by capture. */
    class SunAnglePicker {
        constructor(element) {
            this.container = jQuery(element);
            this.input = this.container.find('.js-sunangle-input');
            this.button = this.container.find('.js-sunangle-open');
            // The settings page supplies the camera zone; the browser zone is
            // only a fallback for pages without that setting.
            this.timezone = this.container.closest('.settings-grid').attr('data-camera-timezone') ||
                Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            this.modal = null;
            this.points = [];
            this.angle = -6;
            this.dateKey = '';
            this.openedWithKeyboard = false;
            this.button.on('click.sunAnglePicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            this.modal = jQuery(
                '<div class="modal fade settings-sunangle-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title" tabindex="-1">Choose sun angle</h4></div>' +
                        '<div class="modal-body">' +
                            '<p class="settings-sunangle-date"></p>' +
                            '<div class="settings-sunangle-presets" role="group" aria-label="Common sun angles"></div>' +
                            '<div class="settings-sunangle-chart-wrap"><svg class="settings-sunangle-chart" viewBox="0 0 600 240" role="img" aria-label="Sun height through the day. Drag to change the chosen angle."></svg></div>' +
                            '<div class="settings-sunangle-controls"><label>Sun angle <input class="form-control js-sunangle-number" type="number" min="-90" max="90" step="any" inputmode="decimal"></label>' +
                                '<input class="js-sunangle-slider" type="range" min="-24" max="12" step="0.01" aria-label="Sun angle, from minus 24 to plus 12 degrees"><span class="settings-sunangle-unit">°</span></div>' +
                            '<div class="settings-sunangle-times" aria-live="polite"><div><span>Sun rises above angle</span><strong class="js-sunangle-rise"></strong></div>' +
                                '<div><span>Sun falls below angle</span><strong class="js-sunangle-set"></strong></div></div>' +
                            '<p class="settings-sunangle-error text-danger" role="alert" hidden></p>' +
                        '</div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                            '<button type="button" class="btn btn-primary js-sunangle-apply">Apply</button></div>' +
                    '</div></div></div>'
            );
            const presetBox = this.modal.find('.settings-sunangle-presets');
            presets.forEach(([angle, label, shortLabel]) => {
                const button = jQuery('<button type="button" class="settings-sunangle-preset"></button>')
                    .attr({ 'aria-label': label + ', ' + angleText(angle) + ' degrees', title: label });
                button.append(jQuery('<span class="settings-sunangle-preset-angle"></span>').text(angleText(angle) + '°'));
                button.append(jQuery('<small class="settings-sunangle-preset-name"></small>').text(shortLabel));
                button.on('click.sunAnglePicker', () => this.setAngle(angle));
                presetBox.append(button);
            });
            this.modal.find('.js-sunangle-slider').on('input.sunAnglePicker', event => {
                this.setAngle(Number(event.currentTarget.value));
            });
            this.modal.find('.js-sunangle-number').on('input.sunAnglePicker', event => {
                const text = event.currentTarget.value;
                const angle = Number(text);
                if (text === '' || !Number.isFinite(angle) || angle < -90 || angle > 90) {
                    this.showError('Enter an angle between -90° and 90°.');
                    return;
                }
                this.setAngle(angle, false);
            });
            this.modal.find('.js-sunangle-apply').on('click.sunAnglePicker', () => this.apply());
            this.modal.on('shown.bs.modal', () => this.modal.find('.modal-title').trigger('focus'));
            this.modal.on('hidden.bs.modal', () => {
                if (this.openedWithKeyboard) this.button.trigger('focus');
            });
            this.buildChart();
            jQuery('body').append(this.modal);
        }

        buildChart() {
            // The civil line is a fixed reference at −6°. The other horizontal
            // line follows the selected angle and may overlap the reference.
            const chart = this.modal.find('.settings-sunangle-chart');
            chart.append(svgElement('line', { class: 'settings-sunangle-civil', x1: 44, x2: 584 }));
            chart.append(svgElement('path', { class: 'settings-sunangle-curve' }));
            chart.append(svgElement('line', { class: 'settings-sunangle-threshold', x1: 44, x2: 584 }));
            const civilLabel = svgElement('text', {
                class: 'settings-sunangle-civil-label', x: 580, 'text-anchor': 'end'
            });
            civilLabel.textContent = 'Civil −6°';
            chart.append(civilLabel);
            chart.append(svgElement('text', { class: 'settings-sunangle-ylabel', x: 4, y: 18 }));
            chart.append(svgElement('text', { class: 'settings-sunangle-ylabel', x: 4, y: 206 }));
            const axis = svgElement('g', { class: 'settings-sunangle-xlabels' });
            [0, 0.25, 0.5, 0.75, 1].forEach(fraction => {
                axis.appendChild(svgElement('text', {
                    x: 44 + fraction * 540, y: 232,
                    'text-anchor': fraction === 0 ? 'start' : (fraction === 1 ? 'end' : 'middle')
                }));
            });
            chart.append(axis);
            // Pointer events cover mouse, touch and pen without separate drag
            // implementations. Capture keeps the drag active outside the SVG.
            chart.on('pointerdown.sunAnglePicker', event => {
                chart[0].setPointerCapture(event.originalEvent.pointerId);
                this.dragging = true;
                this.chooseFromChart(event.originalEvent);
                event.preventDefault();
            }).on('pointermove.sunAnglePicker', event => {
                if (this.dragging) this.chooseFromChart(event.originalEvent);
            }).on('pointerup.sunAnglePicker pointercancel.sunAnglePicker', () => {
                this.dragging = false;
            });
        }

        open() {
            if (!this.modal) this.buildModal();
            // Read the current location when opened; it may have changed since
            // the settings page first initialised the picker.
            const readCoordinate = axis => {
                const name = this.container.attr('data-' + axis + '-field');
                return coordinate(jQuery('#setting-' + jQuery.escapeSelector(name)).val(), axis);
            };
            this.latitude = readCoordinate('latitude');
            this.longitude = readCoordinate('longitude');
            const value = Number(this.input.val());
            this.angle = Number.isFinite(value) && value >= -90 && value <= 90 ? value : -6;
            this.dateKey = '';
            this.points = [];
            this.refreshDay();
            this.setAngle(this.angle);
            this.modal.modal('show');
        }

        refreshDay() {
            // Recompute only when the date changes in the camera's time zone.
            const key = solar.today(this.timezone, Date.now());
            if (key === this.dateKey) return;
            this.dateKey = key;
            const [start, end] = solar.dayBounds(this.timezone, key);
            const label = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: this.timezone })
                .format(new Date((start + end) / 2));
            this.modal.find('.settings-sunangle-date').text(label + ' · ' + this.timezone);
            if (this.latitude === null || this.longitude === null) {
                this.points = [];
            } else {
                this.points = solar.samples(this.timezone, key, this.latitude, this.longitude);
            }
        }

        setAngle(angle, updateNumber = true) {
            this.angle = angle;
            this.refreshDay();
            if (updateNumber) this.modal.find('.js-sunangle-number').val(angleText(angle));
            // The slider covers common twilight angles; typed values retain
            // the full −90° to 90° range when outside that slider range.
            this.modal.find('.js-sunangle-slider').val(Math.max(-24, Math.min(12, angle)));
            this.modal.find('.settings-sunangle-preset').each((index, element) => {
                const selected = Math.abs(presets[index][0] - angle) < 0.005;
                jQuery(element).attr('aria-pressed', selected ? 'true' : 'false');
            });
            this.showError('');
            this.renderChart();
            this.renderTimes();
        }

        showError(message) {
            this.modal.find('.settings-sunangle-error').text(message).prop('hidden', !message);
            this.modal.find('.js-sunangle-apply').prop('disabled', !!message);
            if (message) {
                this.modal.find('.js-sunangle-rise, .js-sunangle-set').text('—');
            }
        }

        renderTimes() {
            const rise = this.modal.find('.js-sunangle-rise');
            const set = this.modal.find('.js-sunangle-set');
            if (!this.points.length) {
                rise.text('Location needed');
                set.text('Location needed');
                return;
            }
            const events = solar.crossings(this.points, this.angle);
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: this.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
            });
            // Some dates have no crossing at a chosen angle, especially near
            // the poles. Show the first event of each kind within this day.
            rise.text(events.rising.length ? formatter.format(new Date(events.rising[0])) : 'No crossing today');
            set.text(events.setting.length ? formatter.format(new Date(events.setting[0])) : 'No crossing today');
        }

        renderChart() {
            const wrap = this.modal.find('.settings-sunangle-chart-wrap');
            wrap.prop('hidden', !this.points.length);
            if (!this.points.length) return;
            const altitudes = this.points.map(point => point.altitude);
            // Leave room for both the solar curve and an angle entered beyond
            // the slider's usual twilight range.
            const minimum = Math.min(-30, Math.floor(Math.min(...altitudes) / 10) * 10,
                this.angle < -24 ? Math.floor(this.angle / 10) * 10 - 10 : -30);
            const maximum = Math.max(30, Math.ceil(Math.max(...altitudes) / 10) * 10,
                this.angle > 12 ? Math.ceil(this.angle / 10) * 10 + 10 : 30);
            this.chartRange = { minimum, maximum };
            const y = altitude => 202 - (altitude - minimum) / (maximum - minimum) * 188;
            // Use the actual local-day span so daylight-saving changes do not
            // shift the plotted clock labels away from the sampled instants.
            const start = this.points[0].time;
            const span = this.points[this.points.length - 1].time - start;
            const x = time => 44 + (time - start) / span * 540;
            const path = this.points.map((point, index) =>
                (index ? 'L' : 'M') + x(point.time).toFixed(1) + ',' + y(point.altitude).toFixed(1)).join(' ');
            const chart = this.modal.find('.settings-sunangle-chart');
            chart.find('.settings-sunangle-curve').attr('d', path);
            chart.find('.settings-sunangle-civil').attr({ y1: y(-6), y2: y(-6) });
            chart.find('.settings-sunangle-threshold').attr({ y1: y(this.angle), y2: y(this.angle) });
            chart.find('.settings-sunangle-civil-label').attr('y', y(-6) - 6);
            chart.find('.settings-sunangle-ylabel').eq(0).text(maximum + '°');
            chart.find('.settings-sunangle-ylabel').eq(1).text(minimum + '°');
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: this.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
            });
            chart.find('.settings-sunangle-xlabels text').each((index, element) => {
                jQuery(element).text(index === 4 ? '24:00'
                    : formatter.format(new Date(start + span * index / 4)));
            });
        }

        chooseFromChart(event) {
            if (!this.points.length) return;
            // Convert pointer height in the SVG viewBox back to degrees. Chart
            // dragging uses the slider range; the number field permits more.
            const bounds = this.modal.find('.settings-sunangle-chart')[0].getBoundingClientRect();
            const y = (event.clientY - bounds.top) / bounds.height * 240;
            const range = this.chartRange;
            const angle = range.minimum + (202 - y) / 188 * (range.maximum - range.minimum);
            this.setAngle(Math.round(Math.max(-24, Math.min(12, angle)) * 100) / 100);
        }

        apply() {
            // Keep edits local to the modal until Apply, then notify the
            // settings page through the same events as a direct field edit.
            const value = this.modal.find('.js-sunangle-number').val();
            const angle = Number(value);
            if (value === '' || !Number.isFinite(angle) || angle < -90 || angle > 90) {
                this.showError('Enter an angle between -90° and 90°.');
                return;
            }
            this.input.val(angleText(angle)).trigger('input').trigger('change');
            this.modal.modal('hide');
        }
    }

    jQuery.fn.allskySunAnglePicker = function () {
        return this.each(function () { new SunAnglePicker(this); });
    };
})(jQuery, window.AllskySolar);
