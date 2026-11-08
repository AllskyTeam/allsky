(function (jQuery, estimate) {
    'use strict';

    // Zero is an unlimited retention period in the settings file.
    const presets = [0, 7, 14, 30, 60, 90];
    const countText = count => count.toLocaleString('en-GB') + (count === 1 ? ' day' : ' days');

    function bytesText(value) {
        const bytes = Math.abs(Number(value));
        if (!Number.isFinite(bytes)) return 'Unavailable';
        const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        let size = bytes;
        let unit = 0;
        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit++;
        }
        const digits = unit === 0 ? 0 : (size < 10 ? 1 : 0);
        return (value < 0 ? '−' : '') + size.toLocaleString('en-GB', {
            minimumFractionDigits: digits, maximumFractionDigits: digits
        }) + ' ' + units[unit];
    }

    function dayValue(value) {
        // Validate the text as well as the number: Number('') and Number('1.5')
        // would otherwise accept an empty field or a fractional day.
        const text = String(value).trim();
        if (!/^\d{1,4}$/.test(text)) return null;
        const days = Number(text);
        return days <= 9999 ? days : null;
    }

    /**
     * Own one field's modal. Edits stay inside the modal until Apply, so Cancel
     * leaves the settings form untouched. The modal is built on first use.
     */
    class DaysToKeepPicker {
        constructor(element) {
            this.container = jQuery(element);
            this.input = this.container.find('.js-daystokeep-input');
            this.button = this.container.find('.js-daystokeep-open');
            this.modal = null;
            this.storage = null;
            // A later opening must not be overwritten by an older AJAX reply.
            this.requestNumber = 0;
            this.openedWithKeyboard = false;
            this.button.on('click.daysToKeepPicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            this.modal = jQuery(
                '<div class="modal fade settings-daystokeep-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title" tabindex="-1">Choose days to keep</h4></div>' +
                        '<div class="modal-body">' +
                            '<p class="settings-daystokeep-status" role="status"></p>' +
                            '<div class="settings-daystokeep-storage" hidden>' +
                                '<div class="settings-daystokeep-metrics">' +
                                    '<div><span>Images directory</span><strong class="js-days-images-size"></strong></div>' +
                                    '<div><span>Free on images disk</span><strong class="js-days-free-size"></strong></div>' +
                                '</div>' +
                                '<div class="settings-daystokeep-disk" role="progressbar" aria-label="Disk space used" aria-valuemin="0" aria-valuemax="100"><span class="js-days-disk-used"></span></div>' +
                                '<p class="settings-daystokeep-sample"></p>' +
                            '</div>' +
                            '<label class="settings-daystokeep-count">Days to keep<input class="form-control js-days-number" type="number" min="0" max="9999" step="1" inputmode="numeric"></label>' +
                            '<div class="settings-daystokeep-presets" role="group" aria-label="Common retention periods"></div>' +
                            '<div class="settings-daystokeep-estimate" aria-live="polite"></div>' +
                            '<p class="settings-daystokeep-error text-danger" role="alert" hidden></p>' +
                        '</div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                            '<button type="button" class="btn btn-primary js-days-apply">Apply</button></div>' +
                    '</div></div></div>'
            );
            const presetBox = this.modal.find('.settings-daystokeep-presets');
            presets.forEach(days => {
                const label = days === 0 ? 'Keep all' : countText(days);
                const button = jQuery('<button type="button" class="settings-daystokeep-preset"></button>').text(label);
                button.on('click.daysToKeepPicker', () => {
                    this.modal.find('.js-days-number').val(days);
                    this.renderEstimate();
                });
                presetBox.append(button);
            });
            this.modal.find('.js-days-number').on('input.daysToKeepPicker', () => this.renderEstimate());
            this.modal.find('.js-days-apply').on('click.daysToKeepPicker', () => this.apply());
            this.modal.on('shown.bs.modal', () => this.modal.find('.modal-title').trigger('focus'));
            this.modal.on('hidden.bs.modal', () => {
                if (this.openedWithKeyboard) this.button.trigger('focus');
            });
            jQuery('body').append(this.modal);
        }

        open() {
            if (!this.modal) this.buildModal();
            this.storage = null;
            this.modal.find('.js-days-number').val(this.input.val());
            this.modal.find('.settings-daystokeep-storage').prop('hidden', true);
            this.modal.find('.settings-daystokeep-status').text('Measuring image storage…');
            this.renderEstimate();
            this.modal.modal('show');
            // Each opening takes a fresh measurement; disk usage may have
            // changed since the previous visit to this field.
            const requestNumber = ++this.requestNumber;
            jQuery.ajax({
                url: '/includes/uiutil.php?request=ImageStorage',
                method: 'GET',
                dataType: 'json',
                cache: false,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            }).done(response => {
                if (requestNumber !== this.requestNumber) return;
                if (!response || !response.ok || !response.storage) {
                    this.modal.find('.settings-daystokeep-status').text('Unable to read image storage. You can still enter a number of days.');
                    return;
                }
                this.storage = response.storage;
                this.renderStorage();
                this.renderEstimate();
            }).fail(() => {
                if (requestNumber !== this.requestNumber) return;
                this.modal.find('.settings-daystokeep-status').text('Unable to read image storage. You can still enter a number of days.');
            });
        }

        renderStorage() {
            const storage = this.storage;
            this.modal.find('.settings-daystokeep-status').text('');
            this.modal.find('.settings-daystokeep-storage').prop('hidden', false);
            this.modal.find('.js-days-images-size').text(bytesText(storage.images_bytes));
            this.modal.find('.js-days-free-size').text(bytesText(storage.free_bytes));
            // The bar describes the whole images disk, not just this directory.
            const usedPercent = Math.max(0, Math.min(100,
                Math.round((1 - storage.free_bytes / storage.disk_total_bytes) * 100)));
            this.modal.find('.settings-daystokeep-disk').attr({
                'aria-valuenow': usedPercent,
                'aria-valuetext': usedPercent + '% of the images disk is used'
            });
            this.modal.find('.js-days-disk-used').css('width', usedPercent + '%');
            const sampled = storage.sample_count;
            this.modal.find('.settings-daystokeep-sample').text(sampled
                ? 'Average from ' + countText(sampled) + ': ' + bytesText(storage.average_day_bytes) + ' per day.'
                : 'No completed day folders are available for an estimate yet.');
        }

        renderEstimate() {
            // A valid retention period can still be applied when storage
            // measurements or a completed-day average are unavailable.
            const days = dayValue(this.modal.find('.js-days-number').val());
            const error = days === null ? 'Enter a whole number from 0 to 9999.' : '';
            this.modal.find('.settings-daystokeep-error').text(error).prop('hidden', !error);
            this.modal.find('.js-days-apply').prop('disabled', !!error);
            this.modal.find('.settings-daystokeep-preset').each((index, element) => {
                jQuery(element).attr('aria-pressed', days === presets[index] ? 'true' : 'false');
            });
            const box = this.modal.find('.settings-daystokeep-estimate').empty();
            if (days === null || !this.storage) return;
            const projection = estimate(this.storage, days);
            if (!projection) return;

            const heading = jQuery('<strong></strong>').text(days === 0
                ? 'No retention limit' : 'Estimate for ' + countText(days));
            box.append(heading);
            if (days === 0) {
                box.append(jQuery('<p></p>').text('All existing day folders are kept. At the recent rate, the current free space could hold about '
                    + countText(projection.additionalDays) + ' more.'));
            } else {
                const free = projection.estimatedFreeBytes;
                box.append(jQuery('<p></p>').text('Estimated images storage: ' + bytesText(projection.estimatedImagesBytes) + '.'));
                // Negative projected free space is a shortfall and needs the
                // warning colour rather than the normal estimate style.
                box.append(jQuery('<p></p>').toggleClass('settings-daystokeep-shortfall', free < 0).text(free >= 0
                    ? 'Estimated free space: ' + bytesText(free) + '.'
                    : 'Estimated space shortfall: ' + bytesText(-free) + '.'));
                if (projection.releasedBytes > 0) {
                    box.append(jQuery('<p></p>').text(bytesText(projection.releasedBytes)
                        + ' freed at the next clean-up.'));
                }
            }
            box.append(jQuery('<small></small>').text('The disk could hold about ' + countText(projection.capacityDays)
                + ' at the measured daily rate. Actual day sizes can vary.'));
        }

        apply() {
            const days = dayValue(this.modal.find('.js-days-number').val());
            if (days === null) {
                this.renderEstimate();
                return;
            }
            // Trigger both events so the settings page updates its unsaved
            // changes state exactly as it does for direct field edits.
            this.input.val(String(days)).trigger('input').trigger('change');
            this.modal.modal('hide');
        }
    }

    jQuery.fn.allskyDaysToKeepPicker = function () {
        return this.each(function () { new DaysToKeepPicker(this); });
    };
})(jQuery, window.AllskyRetentionEstimate);
