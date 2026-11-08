(function (jQuery) {
    'use strict';

    // Settings accept either HH:MM or one of these event names. Keep the
    // stored names separate from the labels shown in the picker.
    const sunEvents = [
        ['sunrise', 'Sunrise'], ['sunset', 'Sunset'],
        ['daytime_start', 'Daytime start'], ['daytime_end', 'Daytime end'],
        ['nighttime_start', 'Nighttime start'], ['nighttime_end', 'Nighttime end']
    ];
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const pad = number => String(number).padStart(2, '0');

    /** Edit one time field, or its start/end partner, in a single modal. */
    class TimePicker {
        constructor(element) {
            this.container = jQuery(element);
            this.input = this.container.find('.js-time-input');
            this.button = this.container.find('.js-time-open');
            this.modal = null;
            this.fields = [];
            this.active = 0;
            this.openedWithKeyboard = false;
        }

        init() {
            this.button.on('click.timePicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            this.modal = jQuery(
                '<div class="modal fade settings-time-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title" tabindex="-1">Choose a time</h4></div>' +
                        '<div class="settings-time-tabs" role="tablist" aria-label="Time fields"></div>' +
                        '<div class="modal-body"><div class="settings-time-views" role="group" aria-label="Time entry"></div>' +
                            '<p class="settings-time-error text-danger" role="alert" hidden></p></div>' +
                        '<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                            '<button type="button" class="btn btn-primary js-time-apply">Apply</button></div>' +
                    '</div></div></div>'
            );
            this.modal.find('.settings-time-tabs').on('click.timePicker', '[role="tab"]', event => {
                this.active = Number(jQuery(event.currentTarget).attr('data-index'));
                this.render();
                if (event.originalEvent && event.originalEvent.detail === 0) {
                    this.modal.find('[role="tab"][data-index="' + this.active + '"]').trigger('focus');
                }
            }).on('keydown.timePicker', '[role="tab"]', event => {
                // One tab per field; arrow keys move focus between a paired
                // start and end value without committing either value.
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                this.active = (this.active + 1) % this.fields.length;
                this.render();
                this.modal.find('[role="tab"][data-index="' + this.active + '"]').trigger('focus');
            });
            this.modal.find('.js-time-apply').on('click.timePicker', () => this.apply());
            this.modal.on('shown.bs.modal', () => this.modal.find('.modal-title').trigger('focus'));
            this.modal.on('hidden.bs.modal', () => {
                if (this.openedWithKeyboard) this.button.trigger('focus');
            });
            this.modal.on('pointerdown.timePicker', () => this.modal.addClass('settings-time-pointer-input'));
            this.modal.on('keydown.timePicker', () => this.modal.removeClass('settings-time-pointer-input'));
            jQuery('body').append(this.modal);
        }

        makeField(input) {
            // Draft values live in these field objects until Apply. An event
            // keeps its stored name; a clock value is parsed into 12-hour UI
            // parts while remaining HH:MM in the settings file.
            const value = String(input.val() || '');
            const match = timePattern.test(value) ? value.split(':').map(Number) : null;
            const hour24 = match ? match[0] : 12;
            return {
                input,
                label: input.closest('.setting-row').find('.setting-label label').first().text().trim(),
                value,
                hour: hour24 % 12 || 12,
                minute: match ? match[1] : 0,
                period: hour24 >= 12 ? 'PM' : 'AM',
                view: sunEvents.some(([key]) => key === value) ? 'events' : 'clock',
                entry: 'dial',
                phase: 'hour',
                hourText: String(hour24 % 12 || 12),
                minuteText: pad(match ? match[1] : 0),
                keyboardError: false
            };
        }

        clockValue(field) {
            // Convert the dial's 12-hour state back to the stored 24-hour form.
            const hour24 = (field.hour % 12) + (field.period === 'PM' ? 12 : 0);
            return pad(hour24) + ':' + pad(field.minute);
        }

        summary(field) {
            const event = sunEvents.find(([key]) => key === field.value);
            return event ? event[1] : (field.value || 'No limit');
        }

        open() {
            if (!this.modal) this.buildModal();
            // A related field is included only when it can be edited. The
            // position attribute puts start before end regardless of which
            // field's button opened the modal.
            const relatedName = this.container.attr('data-related-field');
            const related = relatedName ? jQuery('#setting-' + jQuery.escapeSelector(relatedName)) : jQuery();
            const paired = related.length && related.hasClass('js-time-input') &&
                !related.prop('disabled') && !related.prop('readOnly');
            const inputs = paired ? [this.input, related] : [this.input];
            inputs.sort((a, b) => {
                const position = input => input.closest('.settings-time-picker').attr('data-time-position');
                return (position(a) === 'end' ? 1 : 0) - (position(b) === 'end' ? 1 : 0);
            });
            this.fields = inputs.map(input => this.makeField(input));
            this.active = this.fields.findIndex(field => field.input[0] === this.input[0]);
            this.modal.toggleClass('settings-time-paired', !!paired);
            this.modal.find('.modal-title').text(paired ? 'Choose times' : 'Choose a time');
            this.modal.attr('aria-label', paired ? 'Choose start and end times' : 'Choose a time');
            this.modal.find('.settings-time-error').text('').prop('hidden', true);
            this.render();
            this.modal.modal('show');
        }

        renderTabs() {
            const tabs = this.modal.find('.settings-time-tabs').empty();
            tabs.prop('hidden', this.fields.length === 1);
            this.fields.forEach((field, index) => {
                const button = jQuery('<button type="button" role="tab" class="settings-time-tab"></button>')
                    .attr('data-index', index)
                    .attr('aria-selected', index === this.active ? 'true' : 'false')
                    .attr('tabindex', index === this.active ? '0' : '-1');
                button.append(jQuery('<span class="settings-time-tab-label"></span>').text(field.label));
                button.append(jQuery('<small class="settings-time-tab-value"></small>').text(this.summary(field)));
                tabs.append(button);
            });
        }

        render() {
            this.renderTabs();
            const field = this.fields[this.active];
            const view = this.modal.find('.settings-time-views').empty();
            const mode = jQuery('<div class="settings-time-mode" role="group" aria-label="Time type"></div>');
            [['clock', 'Clock time'], ['events', 'Sun event']].forEach(([key, label]) => {
                const button = jQuery('<button type="button"></button>').text(label)
                    .attr('aria-pressed', field.view === key ? 'true' : 'false')
                    .toggleClass('is-active', field.view === key);
                button.on('click.timePicker', () => {
                    field.view = key;
                    this.render();
                });
                mode.append(button);
            });
            view.append(mode);
            if (field.view === 'events') this.renderEvents(field, view);
            else this.renderClock(field, view);
            this.modal.find('.settings-time-error').text('').prop('hidden', true);
        }

        addClear(field, footer) {
            // Required fields cannot be cleared, including in a paired modal.
            if (field.input.closest('.setting-row').attr('data-required') === 'true') return;
            const clear = jQuery('<button type="button" class="settings-time-clear">Clear time</button>');
            clear.on('click.timePicker', () => {
                field.value = '';
                this.render();
            });
            footer.append(clear);
        }

        renderEvents(field, view) {
            const events = jQuery('<div class="settings-time-events" role="group" aria-label="Sun events"></div>');
            sunEvents.forEach(([key, label]) => {
                const selected = field.value === key;
                const button = jQuery('<button type="button" class="settings-time-event"></button>')
                    .text(label).toggleClass('is-selected', selected)
                    .attr('aria-pressed', selected ? 'true' : 'false');
                button.on('click.timePicker', () => {
                    field.value = key;
                    this.render();
                });
                events.append(button);
            });
            const footer = jQuery('<div class="settings-time-clock-footer"></div>');
            this.addClear(field, footer);
            view.append(jQuery('<p class="settings-time-hint">Choose when this period begins or ends.</p>'), events, footer);
        }

        renderClock(field, view) {
            const display = jQuery('<div class="settings-time-display"></div>');
            const digits = jQuery('<div class="settings-time-digits"></div>');
            [['hour', pad(field.hour)], ['minute', pad(field.minute)]].forEach(([phase, value], index) => {
                if (index) digits.append(jQuery('<span class="settings-time-colon">:</span>'));
                const button = jQuery('<button type="button" class="settings-time-digit"></button>')
                    .text(value).toggleClass('is-active', field.phase === phase && field.entry === 'dial')
                    .attr('aria-label', phase === 'hour' ? 'Choose hour' : 'Choose minute');
                button.on('click.timePicker', () => {
                    field.phase = phase;
                    field.entry = 'dial';
                    this.render();
                });
                digits.append(button);
            });
            const periods = jQuery('<div class="settings-time-period" role="group" aria-label="AM or PM"></div>');
            ['AM', 'PM'].forEach(period => {
                const button = jQuery('<button type="button"></button>').text(period)
                    .toggleClass('is-active', field.period === period)
                    .attr('aria-pressed', field.period === period ? 'true' : 'false');
                button.on('click.timePicker', () => {
                    field.period = period;
                    field.value = this.clockValue(field);
                    this.render();
                });
                periods.append(button);
            });
            display.append(digits, periods);
            view.append(display);
            if (field.entry === 'keyboard') this.renderKeyboard(field, view);
            else this.renderDial(field, view);
            const footer = jQuery('<div class="settings-time-clock-footer"></div>');
            const toggle = jQuery('<button type="button" class="settings-time-entry-toggle"></button>');
            toggle.append(jQuery('<i aria-hidden="true"></i>')
                .addClass(field.entry === 'dial' ? 'fa-solid fa-keyboard' : 'fa-regular fa-clock'));
            toggle.append(jQuery('<span></span>').text(field.entry === 'dial' ? 'Type a time' : 'Use clock dial'));
            toggle.on('click.timePicker', () => {
                field.entry = field.entry === 'dial' ? 'keyboard' : 'dial';
                this.render();
            });
            footer.append(toggle);
            this.addClear(field, footer);
            view.append(footer);
        }

        renderDial(field, view) {
            const dial = jQuery('<div class="settings-time-dial" role="group"></div>')
                .attr('aria-label', field.phase === 'hour' ? 'Choose an hour' : 'Choose minutes');
            const hand = jQuery('<svg class="settings-time-hand" viewBox="0 0 208 208" aria-hidden="true"><line x1="104" y1="104" x2="104" y2="24"></line><circle cx="104" cy="104" r="4"></circle><circle class="settings-time-hand-tip" cx="104" cy="24" r="18"></circle></svg>');
            dial.append(hand);
            // The twelve visible minute labels use five-minute steps; dragging
            // the hand can still select any individual minute.
            const step = field.phase === 'hour' ? 1 : 5;
            const count = 12;
            for (let index = 0; index < count; index++) {
                const number = field.phase === 'hour' ? (index || 12) : index * step;
                const angle = index * Math.PI / 6;
                const x = 104 + Math.sin(angle) * 80;
                const y = 104 - Math.cos(angle) * 80;
                const selected = field.phase === 'hour' ? field.hour === number : field.minute === number;
                const button = jQuery('<button type="button" class="settings-time-dial-number"></button>')
                    .text(field.phase === 'hour' ? String(number) : pad(number))
                    .css({ left: x + 'px', top: y + 'px' })
                    .toggleClass('is-selected', selected)
                    .attr('aria-label', field.phase === 'hour' ? number + ' o’clock' : number + ' minutes');
                button.on('click.timePicker', () => this.chooseDial(field, number));
                dial.append(button);
            }
            this.pointHand(hand, field.phase === 'hour' ? field.hour % 12 * 30 : field.minute * 6);
            let dragging = false;
            // Pointer capture keeps a touch or mouse drag active as it moves
            // away from the dial. Release commits the nearest minute or hour.
            dial.on('pointerdown.timePicker', event => {
                if (jQuery(event.target).closest('button').length) return;
                dragging = true;
                dial[0].setPointerCapture(event.originalEvent.pointerId);
                this.pointHand(hand, this.pointerAngle(dial, event.originalEvent));
                event.preventDefault();
            }).on('pointermove.timePicker', event => {
                if (dragging) this.pointHand(hand, this.pointerAngle(dial, event.originalEvent));
            }).on('pointerup.timePicker', event => {
                if (!dragging) return;
                dragging = false;
                const angle = this.pointerAngle(dial, event.originalEvent);
                const number = field.phase === 'hour'
                    ? (Math.round(angle / 30) % 12 || 12)
                    : Math.round(angle / 6) % 60;
                this.chooseDial(field, number);
            }).on('pointercancel.timePicker', () => {
                dragging = false;
                this.render();
            });
            view.append(dial);
        }

        pointerAngle(dial, event) {
            // The dial starts at twelve o'clock and increases clockwise.
            const bounds = dial[0].getBoundingClientRect();
            const x = event.clientX - bounds.left - bounds.width / 2;
            const y = event.clientY - bounds.top - bounds.height / 2;
            return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
        }

        pointHand(hand, degrees) {
            const angle = degrees * Math.PI / 180;
            const x = 104 + Math.sin(angle) * 80;
            const y = 104 - Math.cos(angle) * 80;
            hand.find('line').attr({ x2: x, y2: y });
            hand.find('.settings-time-hand-tip').attr({ cx: x, cy: y });
        }

        chooseDial(field, number) {
            // Choosing an hour advances to minutes. Both choices update the
            // draft value, which the user can still cancel.
            if (field.phase === 'hour') {
                field.hour = number;
                field.phase = 'minute';
            } else {
                field.minute = number;
            }
            field.hourText = String(field.hour);
            field.minuteText = pad(field.minute);
            field.value = this.clockValue(field);
            this.render();
        }

        renderKeyboard(field, view) {
            const keyboard = jQuery('<div class="settings-time-keyboard"></div>');
            [['hour', 'Hour', 1, 12], ['minute', 'Minute', 0, 59]].forEach(([key, label, min, max]) => {
                const wrapper = jQuery('<label></label>').text(label);
                const input = jQuery('<input type="number" class="form-control" inputmode="numeric">')
                    .attr({ min, max, 'aria-label': label })
                    .val(key === 'hour' ? field.hourText : field.minuteText);
                input.on('input.timePicker change.timePicker', () => {
                    // Preserve incomplete text while typing. Only a complete,
                    // valid pair changes the draft HH:MM value.
                    if (key === 'hour') field.hourText = String(input.val());
                    else field.minuteText = String(input.val());
                    const hour = Number(field.hourText);
                    const minute = Number(field.minuteText);
                    if (/^\d{1,2}$/.test(field.hourText) && hour >= 1 && hour <= 12 &&
                        /^\d{1,2}$/.test(field.minuteText) && minute >= 0 && minute <= 59) {
                        field.hour = hour;
                        field.minute = minute;
                        field.value = this.clockValue(field);
                        field.keyboardError = false;
                        this.renderTabs();
                        const digits = this.modal.find('.settings-time-digit');
                        digits.eq(0).text(pad(hour));
                        digits.eq(1).text(pad(minute));
                        this.modal.find('.settings-time-error').text('').prop('hidden', true);
                    } else {
                        field.keyboardError = true;
                    }
                });
                wrapper.append(input);
                keyboard.append(wrapper);
            });
            view.append(keyboard);
        }

        apply() {
            // Validate every draft before writing either field, so a paired
            // edit cannot leave the form with only one changed value.
            const invalidKeyboard = this.fields.find(field => field.view === 'clock' &&
                field.entry === 'keyboard' && field.keyboardError);
            const invalid = invalidKeyboard || this.fields.find(field => field.value !== '' &&
                !timePattern.test(field.value) && !sunEvents.some(([key]) => key === field.value));
            if (invalid) {
                this.active = this.fields.indexOf(invalid);
                this.render();
                this.modal.find('.settings-time-error')
                    .text(invalidKeyboard ? 'Enter an hour from 1 to 12 and minutes from 0 to 59.' :
                        'Choose a clock time or sun event.').prop('hidden', false);
                return;
            }
            this.fields.forEach(field => field.input.val(field.value).trigger('input').trigger('change'));
            this.modal.modal('hide');
        }
    }

    jQuery.fn.allskyTimePicker = function () {
        return this.each(function () {
            if (jQuery.data(this, 'allskyTimePicker')) return;
            const picker = new TimePicker(this);
            jQuery.data(this, 'allskyTimePicker', picker);
            picker.init();
        });
    };
})(jQuery);
