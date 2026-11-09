(function (jQuery) {
    'use strict';

    class CameraTypePicker {
        constructor(element) {
            this.container = jQuery(element);
            this.select = this.container.find('select');
            this.button = this.container.find('.js-cameratype-open');
            this.modal = null;
            this.choices = [];
            this.requestNumber = 0;
            this.openedWithKeyboard = false;
            this.button.on('click.cameraTypePicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            this.modal = jQuery(
                '<div class="modal fade settings-cameratype-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title" tabindex="-1">Choose camera</h4></div>' +
                        '<div class="modal-body">' +
                            '<p class="settings-cameratype-status" role="status" aria-live="polite"></p>' +
                            '<div class="settings-cameratype-list" role="radiogroup" aria-label="Detected cameras"></div>' +
                            '<button type="button" class="btn btn-default js-cameratype-rescan"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Scan again</button>' +
                        '</div>' +
                        '<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                            '<button type="button" class="btn btn-primary js-cameratype-apply" disabled>Apply</button></div>' +
                    '</div></div></div>'
            );
            this.modal.find('.js-cameratype-rescan').on('click.cameraTypePicker', () => this.scan());
            this.modal.find('.js-cameratype-apply').on('click.cameraTypePicker', () => this.apply());
            this.modal.find('.settings-cameratype-list').on('change.cameraTypePicker', 'input', () => {
                this.modal.find('.js-cameratype-apply').prop('disabled', false);
            });
            this.modal.on('shown.bs.modal', () => this.modal.find('.modal-title').trigger('focus'));
            this.modal.on('hidden.bs.modal', () => {
                if (this.openedWithKeyboard) this.button.trigger('focus');
            });
            jQuery('body').append(this.modal);
        }

        open() {
            if (!this.modal) this.buildModal();
            this.modal.modal('show');
            this.scan();
        }

        scan() {
            const requestNumber = ++this.requestNumber;
            const status = this.modal.find('.settings-cameratype-status');
            status.removeClass('text-danger').text('Scanning for connected cameras…');
            this.modal.find('.settings-cameratype-list').empty();
            this.modal.find('.js-cameratype-rescan, .js-cameratype-apply').prop('disabled', true);
            jQuery.ajax({
                url: '/includes/uiutil.php?request=ScanCameras',
                method: 'POST',
                dataType: 'json',
                data: { csrf_token: this.container.closest('form').find('[name="csrf_token"]').val() || '' },
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            }).done(response => {
                if (requestNumber !== this.requestNumber) return;
                if (!response || !response.ok || !Array.isArray(response.choices)) {
                    this.scanFailed();
                    return;
                }
                this.choices = response.choices.filter(choice => choice &&
                    typeof choice.value === 'string' && typeof choice.label === 'string');
                this.updateSelect();
                this.renderChoices();
            }).fail(() => {
                if (requestNumber === this.requestNumber) this.scanFailed();
            }).always(() => {
                if (requestNumber === this.requestNumber) {
                    this.modal.find('.js-cameratype-rescan').prop('disabled', false);
                }
            });
        }

        scanFailed() {
            this.modal.find('.settings-cameratype-status').addClass('text-danger')
                .text('The camera scan failed. Check the camera connection and try again.');
        }

        updateSelect() {
            const selected = this.select.val();
            this.select.empty();
            this.choices.forEach(choice => {
                this.select.append(jQuery('<option></option>').val(choice.value).text(choice.label));
            });
            if (this.choices.some(choice => choice.value === selected)) {
                this.select.val(selected);
            } else {
                this.select.trigger('change');
            }
        }

        renderChoices() {
            const list = this.modal.find('.settings-cameratype-list').empty();
            const cameras = this.choices;
            const detected = cameras.filter(choice => !choice.label.endsWith('(not connected)'));
            if (!detected.length) {
                this.modal.find('.settings-cameratype-status').text('No cameras were detected.');
            } else {
                this.modal.find('.settings-cameratype-status').text(
                    detected.length === 1 ? '1 camera detected' : detected.length + ' cameras detected'
                );
            }
            cameras.forEach(choice => {
                const item = jQuery('<label class="settings-cameratype-choice"></label>');
                const input = jQuery('<input type="radio" name="camera-picker-choice">')
                    .val(choice.value).prop('checked', choice.value === this.select.val());
                item.append(input, jQuery('<span></span>').text(choice.label));
                list.append(item);
            });
            this.modal.find('.js-cameratype-apply').prop('disabled', !list.find('input:checked').length);
        }

        apply() {
            const chosen = this.modal.find('input[name="camera-picker-choice"]:checked').val();
            if (!chosen) return;
            this.select.val(chosen).trigger('change');
            this.modal.modal('hide');
        }
    }

    jQuery.fn.allskyCameraTypePicker = function () {
        return this.each(function () {
            if (!jQuery.data(this, 'allskyCameraTypePicker')) {
                jQuery.data(this, 'allskyCameraTypePicker', new CameraTypePicker(this));
            }
        });
    };
})(jQuery);
