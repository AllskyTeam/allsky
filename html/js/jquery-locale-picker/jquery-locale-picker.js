(function (jQuery) {
    'use strict';

    /** Select a system locale while leaving the text field available for manual entry. */
    class LocalePicker {
        constructor(element) {
            this.container = jQuery(element);
            this.input = this.container.find('.js-locale-input');
            this.openButton = this.container.find('.js-locale-open');
            this.notice = this.container.find('.js-locale-notice');
            this.modal = null;
            this.locales = [];
            this.loading = false;
            this.openedWithKeyboard = false;
        }

        init() {
            if (!this.input.length || !this.openButton.length) return;
            this.openButton.on('click.localePicker', event => {
                this.openedWithKeyboard = !!(event.originalEvent && event.originalEvent.detail === 0);
                this.open();
            });
        }

        buildModal() {
            // Link the search label to this modal's search input, including when the
            // settings page contains more than one locale picker.
            this.modal = jQuery(
                '<div class="modal fade settings-locale-modal" tabindex="-1" role="dialog" aria-label="Choose a locale" aria-hidden="true">' +
                    '<div class="modal-dialog" role="document"><div class="modal-content">' +
                        '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title" tabindex="-1">Choose a locale</h4></div>' +
                        '<div class="modal-body"><label class="settings-locale-search-label">Find a locale</label>' +
                            '<input class="form-control js-locale-search" type="search" autocomplete="off" placeholder="Search available locales">' +
                            '<p class="settings-locale-status" role="status"></p><div class="settings-locale-list"></div></div>' +
                        '<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div>' +
                    '</div></div></div>'
            );
            this.search = this.modal.find('.js-locale-search');
            const searchId = 'settings-locale-search-' + this.input.attr('name');
            this.search.attr('id', searchId);
            this.modal.find('.settings-locale-search-label').attr('for', searchId);
            this.list = this.modal.find('.settings-locale-list');
            this.status = this.modal.find('.settings-locale-status');
            this.search.on('input.localePicker', () => this.render());
            this.list.on('click.localePicker', '.settings-locale-option', event => {
                const option = jQuery(event.currentTarget);
                // A listed locale may be available to enable rather than
                // installed already. The notice describes that next step.
                this.input.val(option.attr('data-value'))
                    .trigger('input').trigger('change');
                this.updateNotice(option.attr('data-installed') === 'false');
                this.modal.modal('hide');
            });
            this.modal.on('shown.bs.modal', () => {
                // On a narrow screen, focusing search would bring up the
                // keyboard before the user has seen the available choices.
                if (window.matchMedia('(max-width: 700px)').matches) this.modal.find('.modal-title').trigger('focus');
                else this.search.trigger('focus');
            });
            this.modal.on('hidden.bs.modal', () => {
                if (this.openedWithKeyboard) this.openButton.trigger('focus');
            });
            jQuery('body').append(this.modal);
        }

        open() {
            if (!this.modal) this.buildModal();
            this.search.val('');
            this.locales = [];
            this.loading = true;
            this.render();
            this.modal.modal('show');
            // Refresh the list each time: installed locales may have changed
            // since the previous opening of this picker.
            jQuery.ajax({
                url: '/includes/uiutil.php?request=AvailableLocales',
                method: 'GET',
                dataType: 'json',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            }).done(response => {
                this.loading = false;
                if (!response || !response.ok || !Array.isArray(response.locales)) {
                    this.status.text('Unable to load available locales. You can still type one manually.');
                    return;
                }
                this.locales = response.locales;
                this.render();
            }).fail(() => {
                this.loading = false;
                this.status.text('Unable to load available locales. You can still type one manually.');
            });
        }

        render() {
            const query = String(this.search.val() || '').trim().toLocaleLowerCase();
            const matches = this.locales.filter(locale => locale.name.toLocaleLowerCase().includes(query));
            // The empty setting means use the system default; it is a choice
            // even though the server's locale list has no corresponding row.
            const showDefault = !query || 'system default'.includes(query);
            const current = String(this.input.val() || '');
            this.list.empty();
            if (showDefault) this.addOption('', 'System default', current === '', true);
            matches.forEach(locale => this.addOption(locale.name, locale.name,
                current.toLocaleLowerCase() === locale.name.toLocaleLowerCase(), locale.installed));
            if (this.loading) this.status.text('Loading available locales…');
            else if (showDefault || matches.length) {
                this.status.text(matches.length + (matches.length === 1 ? ' available locale' : ' available locales'));
            } else this.status.text('No matching locales.');
        }

        addOption(value, label, selected, installed) {
            const button = jQuery('<button type="button" class="settings-locale-option"></button>')
                .attr('data-value', value).attr('data-installed', String(installed));
            button.append(jQuery('<span></span>').text(label));
            if (value || selected) button.append(jQuery('<small></small>').text(selected ? 'Active' : installed ? 'Installed' : 'Available to enable'));
            if (selected) button.attr('aria-current', 'true');
            this.list.append(button);
        }

        updateNotice(needsInstall) {
            // This message belongs beside the field after the modal closes.
            this.notice.text(needsInstall ?
                'This locale will be enabled when you save. Reboot the Pi afterwards.' : '');
        }
    }

    jQuery.fn.allskyLocalePicker = function () {
        return this.each(function () {
            if (jQuery.data(this, 'allskyLocalePicker')) return;
            const picker = new LocalePicker(this);
            jQuery.data(this, 'allskyLocalePicker', picker);
            picker.init();
        });
    };
})(jQuery);
