(function (jQuery) {
    'use strict';

    // Both fields use the same modal; only the endpoint and response list differ.
    // Each list entry has a command-line name and a human-readable description.
    const pickerTypes = {
        vcodec: {
            request: 'VideoEncoders', responseKey: 'encoders',
            title: 'Choose a video encoder', plural: 'video encoders'
        },
        pixfmt: {
            request: 'PixelFormats', responseKey: 'formats',
            title: 'Choose a pixel format', plural: 'pixel formats'
        }
    };

    /** Offer values reported by FFmpeg for one editable settings field. */
    class FfmpegPicker {
        constructor(element) {
            this.container = jQuery(element);
            this.options = pickerTypes[this.container.attr('data-picker')];
            this.input = this.container.find('.js-ffmpeg-input');
            this.openButton = this.container.find('.js-ffmpeg-open');
            this.modal = null;
            this.items = [];
        }

        init() {
            if (!this.options || !this.input.length || !this.openButton.length) return;
            this.openButton.on('click.ffmpegPicker', () => this.open());
        }

        buildModal() {
            // Build once per field. Delegating the choice click keeps the handler
            // in place when a search replaces the list contents.
            this.modal = jQuery(
                '<div class="modal fade settings-ffmpeg-modal" tabindex="-1" role="dialog" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title"></h4></div>' +
                        '<div class="modal-body"><input class="form-control js-ffmpeg-search" type="search">' +
                            '<p class="settings-ffmpeg-status" role="status"></p><div class="settings-ffmpeg-list"></div></div>' +
                        '<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div>' +
                    '</div></div></div>'
            );
            this.modal.attr('aria-label', this.options.title);
            this.modal.find('.modal-title').text(this.options.title);
            this.search = this.modal.find('.js-ffmpeg-search')
                .attr('placeholder', 'Filter ' + this.options.plural)
                .attr('aria-label', 'Filter ' + this.options.plural);
            this.list = this.modal.find('.settings-ffmpeg-list');
            this.status = this.modal.find('.settings-ffmpeg-status');
            this.search.on('input.ffmpegPicker', () => this.render());
            this.list.on('click.ffmpegPicker', 'button[data-value]', event => {
                // A choice is committed immediately; closing the modal alone
                // leaves the field unchanged, and manual entry remains possible.
                this.input.val(jQuery(event.currentTarget).attr('data-value'))
                    .trigger('input').trigger('change');
                this.modal.modal('hide');
                this.input.trigger('focus');
            });
            this.modal.on('shown.bs.modal', () => this.search.trigger('focus'));
            jQuery('body').append(this.modal);
        }

        open() {
            if (!this.modal) this.buildModal();
            this.search.val('');
            this.items = [];
            this.list.empty();
            this.status.text('Loading ' + this.options.plural + '…');
            this.modal.modal('show');
            // Query on each opening so newly installed FFmpeg capabilities can
            // appear without reloading the settings page.
            jQuery.ajax({
                url: '/includes/uiutil.php?request=' + this.options.request,
                method: 'GET',
                dataType: 'json',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            }).done(response => {
                if (!response || !response.ok || !Array.isArray(response[this.options.responseKey])) {
                    this.status.text('Unable to load ' + this.options.plural + '.');
                    return;
                }
                this.items = response[this.options.responseKey];
                this.render();
            }).fail(() => {
                this.status.text('Unable to load ' + this.options.plural + '. You can still type one manually.');
            });
        }

        render() {
            // Search both the exact FFmpeg name and its explanatory text.
            const query = this.search.val().trim().toLocaleLowerCase();
            const matches = this.items.filter(item =>
                (item.name + ' ' + item.description).toLocaleLowerCase().includes(query));
            this.list.empty();
            this.status.text(matches.length ? matches.length + ' ' + this.options.plural : 'No matching ' + this.options.plural + '.');
            const current = this.input.val();
            matches.forEach(item => {
                const button = jQuery('<button type="button" class="settings-ffmpeg-option"></button>')
                    .attr('data-value', item.name);
                if (item.name === current) button.attr('aria-current', 'true');
                button.append(jQuery('<strong></strong>').text(item.name));
                button.append(jQuery('<span></span>').text(item.description));
                this.list.append(button);
            });
        }
    }

    jQuery.fn.allskyFfmpegPicker = function () {
        return this.each(function () {
            // Settings panels may be initialised again after navigation.
            if (jQuery.data(this, 'allskyFfmpegPicker')) return;
            const picker = new FfmpegPicker(this);
            jQuery.data(this, 'allskyFfmpegPicker', picker);
            picker.init();
        });
    };
})(jQuery);
