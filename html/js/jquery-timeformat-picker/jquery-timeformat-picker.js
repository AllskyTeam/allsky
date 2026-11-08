(function (jQuery) {
    'use strict';

    // Presets provide a starting pattern. The text field remains authoritative
    // because a saved strftime pattern need not match any preset combination.
    const dates = [
        ['%Y%m%d', 'YYYYMMDD · compact'],
        ['%d/%m/%Y', 'DD/MM/YYYY · UK'],
        ['%Y-%m-%d', 'YYYY-MM-DD · ISO'],
        ['%d %b %Y', 'Day short-month year'],
        ['%A, %d %B %Y', 'Weekday, day month year'],
        ['%m/%d/%Y', 'MM/DD/YYYY · US']
    ];
    const times = [
        ['%H:%M:%S', '24-hour with seconds'],
        ['%H:%M', '24-hour'],
        ['%I:%M:%S %p', '12-hour with seconds'],
        ['%I:%M %p', '12-hour'],
        ['%H%M', 'Compact']
    ];
    // This is a reference for composing patterns; the preview is produced by
    // the server so it uses the same strftime implementation as Allsky.
    const codes = {
        Date: [
            ['%Y', 'Year, four digits'], ['%y', 'Year, two digits'], ['%C', 'Century'],
            ['%m', 'Month number'], ['%B', 'Month name'], ['%b', 'Short month'],
            ['%h', 'Short month (alias)'], ['%d', 'Day, zero padded'], ['%e', 'Day, space padded'],
            ['%a', 'Short weekday'], ['%A', 'Weekday name'], ['%j', 'Day of year'],
            ['%F', 'ISO date'], ['%D', 'US date'], ['%x', 'Locale date']
        ],
        Time: [
            ['%H', 'Hour, 24-hour'], ['%I', 'Hour, 12-hour'], ['%k', 'Hour, space padded'],
            ['%l', '12-hour, space padded'], ['%M', 'Minute'], ['%S', 'Second'],
            ['%p', 'AM or PM'], ['%P', 'am or pm'], ['%R', '24-hour time'],
            ['%T', 'Time with seconds'], ['%r', '12-hour time'], ['%X', 'Locale time'],
            ['%z', 'UTC offset'], ['%Z', 'Time zone'], ['%s', 'Unix seconds']
        ],
        'Week and other': [
            ['%u', 'Weekday, Mon = 1'], ['%w', 'Weekday, Sun = 0'],
            ['%V', 'ISO week'], ['%G', 'ISO week-year'], ['%g', 'Short ISO week-year'],
            ['%U', 'Week, Sunday first'], ['%W', 'Week, Monday first'],
            ['%c', 'Locale date and time'], ['%%', 'Percent sign'],
            ['%n', 'New line'], ['%t', 'Tab']
        ]
    };
    let nextModalId = 0;

    /** Edit a strftime pattern and preview it before updating the settings form. */
    class TimeFormatPicker {
        constructor(element) {
            this.container = jQuery(element);
            this.input = this.container.find('.js-timeformat-input');
            this.button = this.container.find('.js-timeformat-open');
            this.modal = null;
            // Debounce preview requests and prevent an older reply from
            // replacing the preview of a newer pattern.
            this.previewTimer = null;
            this.previewRequest = null;
            this.previewNumber = 0;
            this.openedWithKeyboard = false;
            this.button.on('click.timeFormatPicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            // Each modal needs its own title and help IDs for screen readers.
            const modalId = `settings-timeformat-modal-${++nextModalId}`;
            this.modal = jQuery(
                `<div class="modal fade settings-timeformat-modal" tabindex="-1" role="dialog" aria-labelledby="${modalId}-title" aria-hidden="true">` +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            `<h4 class="modal-title" id="${modalId}-title"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i> Date and time format</h4>` +
                            '<p class="settings-timeformat-intro">Choose a style or edit the format directly. Check the result before applying it.</p></div>' +
                        '<div class="modal-body">' +
                            '<section class="settings-timeformat-section" aria-label="Quick format">' +
                                '<div class="settings-timeformat-section-heading"><h5>Quick format</h5><p>Pick a date and time style to start with.</p></div>' +
                                '<div class="settings-timeformat-presets">' +
                                    '<label>Date style<select class="form-control js-timeformat-date"></select></label>' +
                                    '<label>Time style<select class="form-control js-timeformat-time"></select></label>' +
                                    '<button class="btn btn-default js-timeformat-use-presets" type="button">Fill pattern</button>' +
                                '</div>' +
                            '</section>' +
                            '<section class="settings-timeformat-section" aria-label="Custom format">' +
                                '<div class="settings-timeformat-section-heading"><h5>Custom format</h5><p>Edit the pattern below. Use codes such as <code>%Y</code> for the year and <code>%H</code> for the hour.</p></div>' +
                                '<label class="settings-timeformat-label">Format pattern' +
                                    '<input class="form-control js-timeformat-value" type="text" spellcheck="false" autocomplete="off" maxlength="200" aria-describedby="' + modalId + '-help"></label>' +
                                '<p class="settings-timeformat-help" id="' + modalId + '-help">Changes here update the preview automatically.</p>' +
                                '<p class="settings-timeformat-error text-danger" role="alert" hidden></p>' +
                                '<div class="settings-timeformat-preview" aria-live="polite"><span>Live preview</span><strong class="js-timeformat-preview"></strong></div>' +
                            '</section>' +
                            '<div class="settings-timeformat-reference">' +
                                '<details><summary>Format code reference <span>Insert codes at the cursor</span></summary>' +
                                    '<div class="settings-timeformat-reference-body">' +
                                        '<div class="settings-timeformat-reference-tools">' +
                                            '<label>Category<select class="form-control js-timeformat-code-category">' +
                                                '<option value="Date">Date</option><option value="Time">Time</option>' +
                                                '<option value="Week and other">Week and other</option><option value="all">All codes</option>' +
                                            '</select></label>' +
                                            '<label>Find a code<input class="form-control js-timeformat-code-search" type="search" placeholder="e.g. month or %M" autocomplete="off"></label>' +
                                        '</div>' +
                                        '<div class="settings-timeformat-codes"></div>' +
                                        '<p class="settings-timeformat-no-codes" hidden>No matching codes.</p>' +
                                    '</div>' +
                                '</details>' +
                            '</div>' +
                        '</div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                            '<button type="button" class="btn btn-primary js-timeformat-apply">Use format</button></div>' +
                    '</div></div></div>'
            );

            this.addOptions('.js-timeformat-date', dates);
            this.addOptions('.js-timeformat-time', times);
            const list = this.modal.find('.settings-timeformat-codes');
            Object.entries(codes).forEach(([group, options]) => {
                const section = jQuery('<div class="settings-timeformat-code-group"></div>').attr('data-group', group);
                section.append(jQuery('<h6></h6>').text(group));
                const grid = jQuery('<div class="settings-timeformat-code-grid"></div>');
                options.forEach(([code, description]) => {
                    const button = jQuery('<button class="settings-timeformat-code" type="button"></button>');
                    button.append(jQuery('<code></code>').text(code));
                    button.append(jQuery('<span></span>').text(description));
                    button.attr('data-code', code);
                    button.attr('data-search', (code + ' ' + description).toLowerCase());
                    button.on('click.timeFormatPicker', () => this.insertCode(code));
                    grid.append(button);
                });
                section.append(grid);
                list.append(section);
            });
            this.modal.find('.js-timeformat-code-category')
                .on('change.timeFormatPicker', () => this.filterCodes());
            this.modal.find('.js-timeformat-code-search').on('input.timeFormatPicker', event => {
                if (event.target.value.trim()) this.modal.find('.js-timeformat-code-category').val('all');
                this.filterCodes();
            });
            this.filterCodes();

            this.modal.find('.js-timeformat-value').on('input.timeFormatPicker', () => this.updatePreview());
            this.modal.find('.js-timeformat-use-presets').on('click.timeFormatPicker', () => {
                const date = this.modal.find('.js-timeformat-date').val();
                const time = this.modal.find('.js-timeformat-time').val();
                this.modal.find('.js-timeformat-value').val(date + ' ' + time).trigger('input');
            });
            this.modal.find('.js-timeformat-apply').on('click.timeFormatPicker', () => this.apply());
            this.modal.on('shown.bs.modal', () => this.modal.find('.js-timeformat-value').trigger('focus'));
            this.modal.on('hidden.bs.modal', () => {
                this.cancelPreview();
                if (this.openedWithKeyboard) this.button.trigger('focus');
            });
            jQuery('body').append(this.modal);
        }

        addOptions(selector, options) {
            const select = this.modal.find(selector);
            options.forEach(([format, label]) => {
                select.append(jQuery('<option></option>').val(format).text(label));
            });
        }

        filterCodes() {
            const category = this.modal.find('.js-timeformat-code-category').val();
            const query = String(this.modal.find('.js-timeformat-code-search').val() || '').trim();
            let matches = 0;
            this.modal.find('.settings-timeformat-code-group').each(function () {
                const group = jQuery(this);
                const inCategory = category === 'all' || group.attr('data-group') === category;
                let groupMatches = 0;
                group.find('.settings-timeformat-code').each(function () {
                    // A leading % searches code prefixes; other text searches
                    // the code and its description together.
                    const matchesQuery = !query || (query.startsWith('%')
                        ? jQuery(this).attr('data-code').startsWith(query)
                        : jQuery(this).attr('data-search').includes(query.toLowerCase()));
                    const visible = inCategory && matchesQuery;
                    jQuery(this).toggle(visible);
                    if (visible) groupMatches++;
                });
                group.toggle(groupMatches > 0);
                matches += groupMatches;
            });
            this.modal.find('.settings-timeformat-no-codes').prop('hidden', matches > 0);
        }

        open() {
            if (!this.modal) this.buildModal();
            const current = String(this.input.val() || '');
            this.modal.find('.js-timeformat-value').val(current);
            // Only select matching presets when the stored pattern is exactly
            // one of their combinations. Custom patterns remain untouched.
            const match = dates.flatMap(([date]) => times.map(([time]) => [date, time]))
                .find(([date, time]) => current === date + ' ' + time);
            if (match) {
                this.modal.find('.js-timeformat-date').val(match[0]);
                this.modal.find('.js-timeformat-time').val(match[1]);
            }
            this.modal.modal('show');
            this.updatePreview();
        }

        insertCode(code) {
            // Replace the selected text, or insert at the caret, so reference
            // buttons work while a user is editing the pattern directly.
            const field = this.modal.find('.js-timeformat-value')[0];
            const start = field.selectionStart ?? field.value.length;
            const end = field.selectionEnd ?? field.value.length;
            field.setRangeText(code, start, end, 'end');
            jQuery(field).trigger('input').trigger('focus');
        }

        cancelPreview() {
            // Closing the modal and changing the pattern both invalidate any
            // pending preview, including a reply already on its way back.
            clearTimeout(this.previewTimer);
            if (this.previewRequest) this.previewRequest.abort();
            this.previewRequest = null;
            this.previewNumber++;
        }

        updatePreview() {
            this.cancelPreview();
            const format = String(this.modal.find('.js-timeformat-value').val() || '');
            const error = !format.trim() ? 'Enter a date and time format.'
                : format.length > 200 ? 'Use no more than 200 characters.' : '';
            this.modal.find('.settings-timeformat-error').text(error).prop('hidden', !error);
            this.modal.find('.js-timeformat-apply').prop('disabled', !!error);
            const preview = this.modal.find('.js-timeformat-preview');
            if (error) {
                preview.text('');
                return;
            }
            preview.text('Updating…');
            const requestNumber = this.previewNumber;
            // Wait briefly while the user types. Rendering on the server keeps
            // locale-specific codes consistent with the saved format.
            this.previewTimer = setTimeout(() => {
                this.previewRequest = jQuery.ajax({
                    url: '/includes/uiutil.php?request=TimeFormatPreview',
                    method: 'GET', data: { format }, dataType: 'json', cache: false,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                }).done(response => {
                    if (requestNumber !== this.previewNumber) return;
                    preview.text(response && response.ok ? response.preview
                        : ((response && response.error) || 'Preview unavailable.'));
                }).fail((_, status) => {
                    if (requestNumber === this.previewNumber && status !== 'abort') preview.text('Preview unavailable.');
                });
            }, 180);
        }

        apply() {
            // A preview failure does not block a valid pattern; the user may
            // still apply it, and Cancel leaves the original field unchanged.
            const value = String(this.modal.find('.js-timeformat-value').val() || '');
            if (!value.trim() || value.length > 200) {
                this.updatePreview();
                return;
            }
            this.input.val(value).trigger('input').trigger('change');
            this.modal.modal('hide');
        }
    }

    jQuery.fn.allskyTimeFormatPicker = function () {
        return this.each(function () { new TimeFormatPicker(this); });
    };
})(jQuery);
