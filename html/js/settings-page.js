(function (jQuery) {
    'use strict';

    const levelRank = { beginner: 0, intermediate: 1, advanced: 2 };

    class SettingsPage {
        constructor(panel) {
            this.panel = panel;
            this.content = panel.closest('.content');
            this.search = panel.find('#settingsSearch');
            this.level = panel.attr('data-settings-level') in levelRank
                ? panel.attr('data-settings-level') : 'advanced';
            this.searchResults = panel.find('#settingsSearchResults');
            this.errorSummary = panel.find('#settingsErrorSummary');
            this.rows = panel.find('.setting-row[data-setting-name]');
            this.dependentRows = this.rows.filter((_, element) => {
                var row = jQuery(element);
                return !!(row.attr('data-bool-depends-on') || row.attr('data-bool-depends-off') || row.attr('data-value-depends-on'));
            });
            this.reviewList = panel.find('.settings-review-list');
            this.form = panel.find('form');
            this.changesButton = panel.find('#settingsReviewChanges');
            this.saveImpact = panel.find('#settingsSaveImpact');
            this.changesModal = null;
            this.topButton = panel.find('#backToTopBtn');
            this.help = panel.find('.settings-help');
            try {
                this.dependencyData = JSON.parse(panel.attr('data-dependency-data') || '{}');
            } catch (error) {
                this.dependencyData = {};
            }
            panel.find('.settings-ffmpeg-picker').allskyFfmpegPicker();
            panel.find('.settings-time-picker').allskyTimePicker();
            panel.find('.settings-sunangle-picker').allskySunAnglePicker();
            panel.find('.settings-daystokeep-picker').allskyDaysToKeepPicker();
            panel.find('.settings-timeformat-picker').allskyTimeFormatPicker();
            panel.find('.settings-cameratype-picker').allskyCameraTypePicker();
            panel.find('.js-systemadditions-open').systemPageButtons();
            panel.find('.settings-position-picker .allsky-position').allskyPOSITION();
            panel.find('.settings-locale-picker').allskyLocalePicker();
            this.dirtyCount = 0;
            this.submitting = false;
            this.allMode = false;
            this.issuesOnly = false;

            jQuery('body').addClass('settings-page');
            this.content.addClass('settings-content-locked');
            if (panel.attr('data-open-error-on-mobile') === 'true') {
                panel.addClass('settings-show-detail');
            }

            this.bindEvents();
            this.restoreSelection();
            if (panel.attr('data-start-all-mode') === 'true') this.setAllMode(true, false);
            this.setupPopovers();
            this.updateDependencies();
            this.updatePickerButtons();
            this.updateGroups();
            this.updateLevel();
            this.updateDirty();
            if (panel.attr('data-open-error-on-mobile') === 'true' && !this.errorSummary.prop('hidden')) {
                window.requestAnimationFrame(() => this.errorSummary.trigger('focus'));
            }
        }

        byId(id) {
            return id ? jQuery('#' + jQuery.escapeSelector(id)) : jQuery();
        }

        captureSelection() {
            var category = this.panel.find('.settings-category-nav [aria-selected="true"]').first();
            var group = this.byId(category.attr('aria-controls'));
            var section = group.find('.settings-subtabs [aria-selected="true"]').first();
            this.form.find('#settingsActiveCategory').val(category.attr('id') || '');
            this.form.find('#settingsActiveSection').val(section.attr('id') || '');
            this.form.find('#settingsMobileDetail').val(this.panel.hasClass('settings-show-detail') ? '1' : '0');
        }

        restoreSelection() {
            var category = this.byId(this.panel.attr('data-restore-category'));
            if (!category.closest('.settings-category-nav').length) return;
            this.activate(category, false);
            var group = this.byId(category.attr('aria-controls'));
            var section = this.byId(this.panel.attr('data-restore-section'));
            if (section.closest('.settings-top-panel')[0] === group[0]) this.activate(section, false);
            if (this.panel.attr('data-restore-detail') === 'true') this.panel.addClass('settings-show-detail');
        }

        bindEvents() {
            this.panel.on('click.settingsPage', event => this.onPanelClick(event));
            this.panel.on('keydown.settingsPage', event => this.onTabKeydown(event));
            this.panel.on('click.settingsPage', '.settings-reset', event => {
                if (!window.confirm('Reset all settings to their defaults?')) event.preventDefault();
            });
            this.changesButton.on('click.settingsPage', () => this.showChanges());

            if (this.search.length && this.searchResults.length) {
                this.search.on('input.settingsPage', () => this.updateSearch());
            }
            if (this.reviewList.length) {
                this.reviewList.on('scroll.settingsPage', () => this.updateReviewCurrent());
            }
            if (this.topButton.length) {
                this.topButton.on('click.settingsPage', () => this.scrollToTop());
                this.panel.find('.settings-sections, .settings-review-list, .settings-sub-panel, .settings-top-panel')
                    .on('scroll.settingsPage', event => {
                        this.topButton.css('visibility', event.currentTarget.scrollTop > 100 ? 'visible' : 'hidden');
                    });
            }
            if (!this.form.length) return;

            this.form.on('input.settingsPage change.settingsPage', '.js-colour-value', event => {
                var value = String(jQuery(event.currentTarget).val() || '');
                var expanded = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(value);
                if (expanded) value = '#' + expanded.slice(1).map(character => character + character).join('');
                if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                    jQuery(event.currentTarget).siblings('.js-colour-picker').val(value);
                }
            });
            this.form.on('input.settingsPage change.settingsPage', '.js-colour-picker', event => {
                var value = jQuery(event.currentTarget).val();
                var text = jQuery(event.currentTarget).siblings('.js-colour-value');
                if (text.val() !== value) text.val(value).trigger('input');
            });

            this.form.on('input.settingsPage change.settingsPage', event => {
                if (event.target.name === 'settingsdependencies' || this.dependencyData[event.target.name]) this.updateDependencies();
                if (event.target.name === 'settingspopupbuttons') this.updatePickerButtons();
                if (event.target.name === 'settingsgroups') { this.updateGroups(); this.updateLevel(); }
                if (event.target.name === 'settingslevel' && !this.panel.hasClass('settings-review-mode')) {
                    this.rows.removeClass('settings-level-revealed');
                    this.level = event.target.value;
                    this.updateLevel();
                }
                if (event.target.name === 'settingsshowallbydefault') {
                    this.setAllMode(this.dependencyTruthy('settingsshowallbydefault'));
                }
                this.updateDirty();
            });
            this.form.on('focusout.settingsPage', 'input, select, textarea', event => {
                var row = jQuery(event.target).closest('.setting-row[data-setting-name]');
                if (row.length) this.validateRow(row);
            });
            this.form.on('input.settingsPage change.settingsPage', event => {
                var row = jQuery(event.target).closest('.setting-row[data-setting-name]');
                if (event.type === 'input' && this.issuesOnly) return;
                if (row.attr('data-validated') === 'true' || row.attr('data-defaulted') === 'true') {
                    this.validateRow(row);
                }
            });
            this.form.on('submit.settingsPage', () => {
                this.captureSelection();
                this.submitting = true;
            });
            jQuery(window).on('pageshow.settingsPage', () => {
                this.updateDependencies();
                this.updateDirty();
            });
            jQuery(window).on('beforeunload.settingsPage', event => {
                if (!this.dirtyCount || this.submitting) return;
                event.preventDefault();
                if (event.originalEvent) event.originalEvent.returnValue = '';
                return '';
            });
        }

        activate(tab, focus) {
            if (!tab.length) return;
            var list = tab.closest('[data-settings-tabs]');
            if (!list.length) return;
            list.find('[role="tab"]').each((_, element) => {
                var current = jQuery(element);
                var selected = element === tab[0];
                current.attr('aria-selected', selected ? 'true' : 'false').prop('tabIndex', selected ? 0 : -1);
                this.byId(current.attr('aria-controls')).prop('hidden', !selected);
            });
            if (focus) tab.trigger('focus');
            this.byId(tab.attr('aria-controls')).scrollTop(0);
            this.topButton.css('visibility', 'hidden');
            if (this.content.length && window.matchMedia('(max-width: 700px)').matches) {
                this.content.scrollTop(0);
            }
        }

        setAllMode(enabled, updateHistory = true) {
            if (!this.panel.find('[data-settings-toggle-all]').length) return;
            this.allMode = enabled;
            this.panel.toggleClass('settings-all-mode', enabled)
                .toggleClass('settings-show-detail', enabled);
            this.panel.find('.settings-top-panel, .settings-sub-panel').each((_, element) => {
                var panel = jQuery(element);
                var selected = this.byId(panel.attr('aria-labelledby')).attr('aria-selected') === 'true';
                panel.prop('hidden', enabled ? false : !selected);
            });
            this.panel.find('[data-settings-toggle-all]')
                .attr('aria-pressed', enabled ? 'true' : 'false')
                .text(enabled ? 'Show categories' : 'Show all settings');
            this.search.val('');
            this.updateSearch();
            if (this.form.length) {
                var action = new URL(this.form.attr('action'), window.location.href);
                if (enabled) action.searchParams.set('review', '1');
                else action.searchParams.delete('review');
                this.form.attr('action', action.toString());
            }
            if (updateHistory) {
                var location = new URL(window.location.href);
                if (enabled) location.searchParams.set('review', '1');
                else location.searchParams.delete('review');
                window.history.replaceState(window.history.state, '', location.toString());
            }
            this.panel.find('.settings-sections').scrollTop(0);
            if (this.content.length) this.content.scrollTop(0);
            this.topButton.css('visibility', 'hidden');
            this.updateLevel();
        }

        setIssuesOnly(enabled) {
            if (this.issuesOnly === enabled) return;
            const reviewMode = this.panel.hasClass('settings-review-mode');
            if (enabled && !reviewMode) this.setAllMode(true);
            this.issuesOnly = enabled;
            this.panel.toggleClass('settings-issues-only', enabled);
            this.errorSummary.find('[data-settings-toggle-issues]')
                .attr('aria-pressed', enabled ? 'true' : 'false')
                .text(enabled ? 'Show full settings list' : 'Show affected fields');
            this.panel.find('[data-settings-toggle-all]').prop('hidden', enabled);
            this.updateLevel();
            this.panel.find('.settings-sections, .settings-review-list').scrollTop(0);
        }

        updateLevel() {
            const selected = this.level in levelRank ? this.level : 'advanced';
            this.level = selected;
            this.panel.attr('data-settings-level', selected);
            this.rows.each((_, element) => {
                const row = jQuery(element);
                const fieldLevel = row.attr('data-setting-level') || 'advanced';
                const rank = fieldLevel in levelRank ? levelRank[fieldLevel] : levelRank.advanced;
                row.toggleClass('settings-level-hidden', rank > levelRank[selected]
                    && !row.hasClass('alert-danger') && !row.hasClass('settings-issue-row')
                    && !row.hasClass('settings-level-revealed'));
            });

            const issueSelector = this.issuesOnly ? '.settings-issue-row' : '';
            const available = target => target.find('.setting-row:not([hidden]):not(.settings-level-hidden)' + issueSelector).length > 0;
            this.panel.find('.settings-field-group').each((_, element) => {
                jQuery(element).prop('hidden', !available(jQuery(element)));
            });
            this.panel.find('.settings-sub-panel, .settings-review-section').each((_, element) => {
                jQuery(element).toggleClass('settings-level-empty', !available(jQuery(element)));
            });
            this.panel.find('.settings-top-panel, .settings-review-group').each((_, element) => {
                jQuery(element).toggleClass('settings-level-empty', !available(jQuery(element)));
            });
            this.panel.find('.settings-category-nav [role="tab"], .settings-subtabs [role="tab"]').each((_, element) => {
                const tab = jQuery(element);
                const empty = this.byId(tab.attr('aria-controls')).hasClass('settings-level-empty');
                tab.closest('li').prop('hidden', empty);
                this.panel.find('[data-settings-open="' + tab.attr('id') + '"]').prop('hidden', empty);
            });
            this.panel.find('.settings-review-nav [data-settings-review-open]').each((_, element) => {
                const button = jQuery(element);
                button.closest('li').prop('hidden', this.byId(button.attr('data-settings-review-open')).hasClass('settings-level-empty'));
            });
            if (!this.allMode) {
                const selectedCategory = this.panel.find('.settings-category-nav [aria-selected="true"]').first();
                if (selectedCategory.closest('li').prop('hidden')) {
                    this.activate(this.panel.find('.settings-category-nav li:not([hidden]) [role="tab"]').first(), false);
                }
                this.panel.find('.settings-top-panel:not(.settings-level-empty)').each((_, element) => {
                    const tabs = jQuery(element).find('.settings-subtabs');
                    const active = tabs.find('[aria-selected="true"]').first();
                    if (active.length && active.closest('li').prop('hidden')) {
                        this.activate(tabs.find('li:not([hidden]) [role="tab"]').first(), false);
                    }
                });
            }
            if (this.search.val()) this.updateSearch();
        }

        settingLocation(row) {
            var reviewGroup = row.closest('.settings-review-group');
            if (reviewGroup.length) {
                var reviewSection = row.closest('.settings-review-section');
                return [reviewGroup.attr('data-label') || '', reviewSection.attr('data-label') || ''];
            }
            var topPanel = row.closest('.settings-top-panel');
            var subPanel = row.closest('.settings-sub-panel');
            var topTab = this.byId(topPanel.attr('aria-labelledby'));
            var subTab = this.byId(subPanel.attr('aria-labelledby'));
            return [topTab.attr('data-label') || '', subTab.attr('data-label') || ''];
        }

        setReviewCurrent(groupId) {
            this.panel.find('.settings-review-nav [data-settings-review-open]').each((_, element) => {
                var button = jQuery(element);
                if (button.attr('data-settings-review-open') === groupId) {
                    button.attr('aria-current', 'location');
                } else {
                    button.removeAttr('aria-current');
                }
            });
        }

        updateReviewCurrent() {
            var top = this.reviewList.offset().top + 40;
            var current = null;
            this.reviewList.find('.settings-review-group').each((_, element) => {
                if (jQuery(element).offset().top <= top) current = element;
            });
            if (current) this.setReviewCurrent(current.id);
        }

        jumpToSetting(name) {
            var row = this.byId('setting-row-' + name);
            if (!row.length || row.prop('hidden')) return;
            if (row.hasClass('settings-level-hidden')) {
                row.addClass('settings-level-revealed');
                this.updateLevel();
            }
            var topPanel = row.closest('.settings-top-panel');
            var subPanel = row.closest('.settings-sub-panel');
            if (!this.allMode) {
                if (topPanel.length) this.activate(this.byId(topPanel.attr('aria-labelledby')), false);
                if (subPanel.length) this.activate(this.byId(subPanel.attr('aria-labelledby')), false);
            }
            var reviewGroup = row.closest('.settings-review-group');
            if (reviewGroup.length) this.setReviewCurrent(reviewGroup.attr('id'));
            this.panel.addClass('settings-show-detail').removeClass('settings-searching');
            this.search.val('');
            this.searchResults.prop('hidden', true);
            window.requestAnimationFrame(() => {
                row[0].scrollIntoView({ block: 'center' });
                var control = this.activeControl(row);
                if (control.length) control[0].focus({ preventScroll: true });
                else row.attr('tabindex', '-1')[0].focus({ preventScroll: true });
            });
        }

        updateSearch() {
            var query = String(this.search.val() || '').trim().toLocaleLowerCase();
            this.panel.toggleClass('settings-searching', query !== '');
            this.searchResults.prop('hidden', query === '').empty();
            if (!query) return;

            var terms = query.split(/\s+/);
            var matches = this.rows.filter((_, element) => {
                var row = jQuery(element);
                if (row.prop('hidden') || (this.issuesOnly && !row.hasClass('settings-issue-row'))) return false;
                var location = this.settingLocation(row);
                var text = [row.find('.setting-label label').text(), row.attr('data-search-text') || '',
                    location[0], location[1]].join(' ').toLocaleLowerCase();
                return terms.every(term => text.indexOf(term) !== -1);
            });
            jQuery('<p class="settings-search-count"></p>')
                .text(matches.length + (matches.length === 1 ? ' setting found' : ' settings found'))
                .appendTo(this.searchResults);
            matches.slice(0, 50).each((_, element) => {
                var row = jQuery(element);
                var location = this.settingLocation(row).filter(Boolean).join(' › ');
                var button = jQuery('<button type="button" class="settings-search-result"></button>')
                    .attr('data-settings-jump', row.attr('data-setting-name'));
                button.append(jQuery('<strong></strong>').text(row.find('.setting-label label').text()));
                button.append(jQuery('<small></small>').text(location));
                if (row.hasClass('settings-level-hidden')) {
                    button.append(jQuery('<span class="settings-search-level"></span>')
                        .text((row.attr('data-setting-level') || 'advanced') + ' · show setting'));
                }
                this.searchResults.append(button);
            });
            if (matches.length > 50) {
                jQuery('<p class="settings-search-count"></p>')
                    .text('Showing the first 50 matches. Add another word to narrow the search.')
                    .appendTo(this.searchResults);
            }
        }

        activeControl(row) {
            var toggle = row.find('.settingInputBoolean .vc-switch-input').first();
            if (toggle.length) return toggle.prop('disabled') ? jQuery() : toggle;
            return row.find('input:checked:not(:disabled), input:not([type="radio"]):not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)').first();
        }

        controlValue(control) {
            if (control.is('.settingInputBoolean .vc-switch-input')) {
                return control.prop('checked') ? 'true' : 'false';
            }
            return String(control.val() || '');
        }

        valuesDiffer(row, current, saved) {
            const type = row.attr('data-validation-type');
            if ((type === 'integer' || type === 'float') && current !== '' && saved !== ''
                && Number.isFinite(Number(current)) && Number.isFinite(Number(saved))) {
                return Number(current) !== Number(saved);
            }
            return current !== saved;
        }

        dependencyRule(name) {
            var row = this.byId('setting-row-' + name);
            if (row.length) return {
                on: row.attr('data-bool-depends-on') || '',
                off: row.attr('data-bool-depends-off') || '',
                match: row.attr('data-value-depends-on') || ''
            };
            return this.dependencyData[name] || null;
        }

        dependencyValue(name) {
            var row = this.byId('setting-row-' + name);
            if (row.length) {
                var toggle = row.find('.settingInputBoolean .vc-switch-input').first();
                if (toggle.length) return this.controlValue(toggle);
                var checked = row.find('input[type="radio"]:checked').first();
                var control = checked.length ? checked : row.find('.setting-control input[name], .setting-control select[name], .setting-control textarea[name]').first();
                if (control.length) return String(control.val() || '');
            }
            return String((this.dependencyData[name] || {}).value || '');
        }

        dependencyTruthy(name) {
            var value = this.dependencyValue(name).trim().toLowerCase();
            if (['', 'false', 'no', 'off'].indexOf(value) !== -1) return false;
            return !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || Number(value) !== 0;
        }

        boolExpressionAllows(expression, self, wantOn) {
            if (!expression.trim()) return true;
            var hasGroup = false;
            var matches = expression.trim().split(/\s+OR\s+/i).some(group => {
                var names = group.trim().split(/\s+AND\s+/i).filter(name => name && name !== self);
                if (!names.length) return false;
                hasGroup = true;
                return names.every(name => this.dependencyTruthy(name) === wantOn);
            });
            return matches || !hasGroup;
        }

        valuePatternMatches(pattern, value) {
            var regex = '';
            for (var index = 0; index < pattern.length; index++) {
                var character = pattern[index];
                if (character === '*') regex += '.*';
                else if (character === '|') regex += '|';
                else if (character === '[' && pattern.indexOf(']', index + 1) !== -1) {
                    var end = pattern.indexOf(']', index + 1);
                    regex += pattern.slice(index, end + 1);
                    index = end;
                } else regex += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
            try { return new RegExp('^(?:' + regex + ')$', 'i').test(value); }
            catch (error) { return false; }
        }

        boolDependencyAllowed(name) {
            var rule = this.dependencyRule(name);
            if (!rule) return false;
            if (!this.boolExpressionAllows(rule.on || '', name, true)
                || !this.boolExpressionAllows(rule.off || '', name, false)) return false;
            return true;
        }

        valueDependencyAllowed(name) {
            var rule = this.dependencyRule(name);
            if (!rule) return false;
            if (rule.match) {
                var parts = rule.match.split('=');
                if (parts.length !== 2 || parts[0] === name
                    || !this.valuePatternMatches(parts[1], this.dependencyValue(parts[0]))) return false;
            }
            return true;
        }

        dependencyAllowed(name) {
            return this.boolDependencyAllowed(name) && this.valueDependencyAllowed(name);
        }

        dependencyLabel(name) {
            const row = this.byId('setting-row-' + name);
            if (!row.length) return name;
            const section = this.settingLocation(row)[1];
            const label = row.find('.setting-label label').first().text().trim();
            return [section, label].filter(Boolean).join(' ');
        }

        disabledReason(name) {
            const rule = this.dependencyRule(name);
            if (!rule) return '';
            for (const [expression, required, verb] of [
                [rule.on || '', true, 'Enable'], [rule.off || '', false, 'Turn off']
            ]) {
                if (this.boolExpressionAllows(expression, name, required)) continue;
                const groups = expression.split(/\s+OR\s+/i).map(group => group.split(/\s+AND\s+/i)
                    .filter(field => field && field !== name && this.dependencyTruthy(field) !== required));
                groups.sort((a, b) => a.length - b.length);
                if (groups[0] && groups[0].length) {
                    return verb + ' ' + groups[0].map(field => this.dependencyLabel(field)).join(' and ') + ' to change this.';
                }
            }
            if (rule.match && !this.valueDependencyAllowed(name)) {
                const controller = rule.match.split('=')[0];
                return 'Change ' + this.dependencyLabel(controller) + ' to make this available.';
            }
            return 'Change a related setting to make this available.';
        }

        updateDependencies() {
            var useDependencies = this.dependencyTruthy('settingsdependencies');
            this.dependentRows.each((_, element) => {
                var row = jQuery(element);
                var name = row.attr('data-setting-name');
                var baseDisabled = row.attr('data-base-disabled') === 'true';
                var dependencyAllowed = !useDependencies || this.dependencyAllowed(name);
                var enabled = !baseDisabled && dependencyAllowed;
                var controls = row.find('.setting-control :input');
                var wasDisabled = controls.first().prop('disabled');
                controls.prop('disabled', !enabled);
                row.prop('hidden', !dependencyAllowed);
                row.toggleClass('settings-row-disabled', !enabled && !baseDisabled);
                row.attr('aria-disabled', enabled ? 'false' : 'true');
                const explanation = !enabled && !baseDisabled && useDependencies ? this.disabledReason(name) : '';
                const helpButton = row.find('.settings-help');
                if (helpButton.attr('data-dependency-reason') !== explanation) {
                    helpButton.attr('data-dependency-reason', explanation);
                    if (this.openHelp && this.openHelp[0] === helpButton[0]) {
                        this.openHelp.popover('hide');
                        this.openHelp = null;
                        this.pinnedHelp = false;
                    }
                }
                if (!enabled && !wasDisabled && row.attr('data-validated') === 'true') {
                    row.removeClass('alert-danger');
                    row.find('.setting-feedback').remove();
                    controls.removeAttr('aria-invalid');
                } else if (enabled && wasDisabled && row.attr('data-validated') === 'true') {
                    this.validateRow(row);
                }
            });
            this.panel.find('.settings-field-group').each((_, element) => {
                const group = jQuery(element);
                group.prop('hidden', !group.find('.setting-row:not([hidden]):not(.settings-level-hidden)').length);
            });
            this.updateErrorIndicators();
            this.updateLevel();
            if (this.search.val()) this.updateSearch();
        }

        updatePickerButtons() {
            this.panel.toggleClass('settings-popup-buttons-off', !this.dependencyTruthy('settingspopupbuttons'));
        }

        updateGroups() {
            var enabled = !this.byId('setting-row-settingsgroups').length || this.dependencyTruthy('settingsgroups');
            var focused = document.activeElement;
            var parents = [...new Set(this.panel.find('.settings-field-group').map((_, element) => element.parentElement).get())];
            parents.forEach(element => {
                var parent = jQuery(element);
                var groups = parent.children('.settings-field-group');
                if (enabled) {
                    groups.each((_, groupElement) => {
                        var group = jQuery(groupElement);
                        var id = group.attr('data-settings-group-id');
                        parent.children('.setting-row[data-settings-group-id="' + id + '"]').appendTo(group);
                        group.prop('hidden', !group.find('.setting-row:not([hidden])').length);
                        group.attr('role', 'group').attr('aria-label', group.find('.settings-field-group-label').first().text());
                    });
                } else {
                    groups.each((_, groupElement) => {
                        var group = jQuery(groupElement);
                        group.children('.setting-row').insertBefore(group);
                        group.removeAttr('role aria-label');
                    });
                }
                var rows = parent.children('[data-settings-order]')
                    .filter((_, row) => enabled || !jQuery(row).hasClass('settings-field-group'))
                    .get().sort((a, b) => Number(a.dataset.settingsOrder) - Number(b.dataset.settingsOrder));
                parent.append(rows);
            });
            this.panel.toggleClass('settings-groups-off', !enabled);
            if (focused && this.panel[0].contains(focused)) focused.focus({ preventScroll: true });
        }

        updateDirty() {
            if (!this.form.length) return;
            this.dirtyCount = 0;
            const changedRows = [];
            var topCounts = Object.create(null);
            var subCounts = Object.create(null);
            this.rows.each((_, element) => {
                var row = jQuery(element);
                var control = this.activeControl(row);
                var changed = !!control.length && this.valuesDiffer(row, this.controlValue(control), row.attr('data-saved-value'));
                row.toggleClass('settings-row-changed', changed);
                if (!changed) return;
                this.dirtyCount++;
                changedRows.push(row);
                var topPanel = row.closest('.settings-top-panel');
                var subPanel = row.closest('.settings-sub-panel');
                var reviewGroup = row.closest('.settings-review-group');
                if (topPanel.length) topCounts[topPanel.attr('id')] = (topCounts[topPanel.attr('id')] || 0) + 1;
                if (subPanel.length) subCounts[subPanel.attr('id')] = (subCounts[subPanel.attr('id')] || 0) + 1;
                if (reviewGroup.length) topCounts[reviewGroup.attr('id')] = (topCounts[reviewGroup.attr('id')] || 0) + 1;
            });
            this.panel.find('.settings-category-nav [role="tab"], .settings-subtabs [role="tab"]').each((_, element) => {
                var tab = jQuery(element);
                var count = (tab.closest('.settings-category-nav').length ? topCounts : subCounts)[tab.attr('aria-controls')] || 0;
                var marker = tab.find('.settings-change-count');
                tab.toggleClass('has-changes', count > 0);
                marker.prop('hidden', count === 0).text(count ? String(count) : '');
                if (tab.closest('.settings-category-nav').length) {
                    var mobile = this.panel.find('[data-settings-open="' + tab.attr('id') + '"] .settings-change-count');
                    mobile.prop('hidden', count === 0).text(count ? count + ' unsaved change' + (count === 1 ? '' : 's') : '');
                }
            });
            this.panel.find('.settings-review-nav [data-settings-review-open]').each((_, element) => {
                var button = jQuery(element);
                var count = topCounts[button.attr('data-settings-review-open')] || 0;
                button.toggleClass('has-changes', count > 0);
                button.find('.settings-change-count').prop('hidden', count === 0).text(count ? String(count) : '');
            });
            this.changesButton.prop('disabled', this.dirtyCount === 0)
                .toggleClass('is-empty', this.dirtyCount === 0);
            this.changesButton.find('.settings-review-long')
                .text(this.dirtyCount ? 'Review ' + this.dirtyCount + ' change' + (this.dirtyCount === 1 ? '' : 's') : 'Review changes');
            this.changesButton.find('.settings-review-short')
                .text(this.dirtyCount ? 'Review (' + this.dirtyCount + ')' : 'Review');
            const actions = changedRows.map(row => row.attr('data-setting-action'));
            const initialConfiguration = this.form.find('input[name="fromConfiguration"]').length > 0;
            const restart = initialConfiguration || actions.some(action => action === 'reload' || action === 'restart');
            const stop = actions.includes('stop');
            const restartNow = this.form.find('input[name="restart"]').prop('checked');
            const impact = !this.dirtyCount && !initialConfiguration ? '' : restart && restartNow
                ? 'Saving will restart Allsky.' : stop
                    ? 'Saving will stop Allsky. Start it again when ready.' : restart
                        ? 'Save now; restart Allsky later to apply these changes.'
                        : 'Saving will apply these changes without restarting Allsky.';
            this.saveImpact.text(impact).prop('hidden', !impact);
            if (this.changesModal && this.changesModal.hasClass('in')) this.renderChanges();
        }

        displayValue(row, value) {
            if (row.find('input[type="password"]').length) return value ? '••••••' : '(empty)';
            if (row.attr('data-control-type') === 'boolean') return value === 'true' || value === '1' ? 'Yes' : 'No';
            const select = row.find('select[name]').first();
            if (select.length) {
                const option = select.find('option').filter((_, element) => element.value === value).first();
                if (option.length) return option.text().trim();
            }
            return value || '(empty)';
        }

        showChanges() {
            if (!this.dirtyCount) return;
            if (!this.changesModal) {
                this.changesModal = jQuery(
                    '<div class="modal fade settings-changes-modal" tabindex="-1" role="dialog" aria-labelledby="settingsChangesTitle" aria-hidden="true">' +
                        '<div class="modal-dialog" role="document"><div class="modal-content">' +
                            '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                                '<h4 class="modal-title" id="settingsChangesTitle" tabindex="-1">Review changes</h4></div>' +
                            '<div class="modal-body"><div class="js-settings-changes-list"></div>' +
                                '<p class="js-settings-changes-impact"></p></div>' +
                            '<div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Keep editing</button>' +
                                '<button type="button" class="btn btn-primary js-settings-save-reviewed">Save changes</button></div>' +
                        '</div></div></div>'
                ).appendTo('body');
                this.changesModal.on('shown.bs.modal', () => this.changesModal.find('.modal-title').trigger('focus'));
                this.changesModal.on('hidden.bs.modal', () => {
                    (this.dirtyCount ? this.changesButton : this.form.find('#save_settings')).trigger('focus');
                });
                this.changesModal.on('click.settingsPage', '[data-settings-jump]', event => {
                    const name = jQuery(event.currentTarget).attr('data-settings-jump');
                    this.changesModal.one('hidden.bs.modal', () => this.jumpToSetting(name));
                    this.changesModal.modal('hide');
                });
                this.changesModal.find('.js-settings-save-reviewed').on('click.settingsPage', () => {
                    this.changesModal.modal('hide');
                    this.form.find('#save_settings').trigger('click');
                });
                this.changesModal.on('click.settingsPage', '[data-settings-revert]', event => {
                    const position = this.changesModal.find('[data-settings-revert]').index(event.currentTarget);
                    this.revertSetting(jQuery(event.currentTarget).attr('data-settings-revert'), position);
                });
            }
            this.renderChanges();
            this.changesModal.modal('show');
        }

        renderChanges() {
            const list = this.changesModal.find('.js-settings-changes-list').empty();
            const table = jQuery('<table class="settings-changes-table"><thead><tr><th scope="col">Setting</th><th scope="col">Current</th><th scope="col">New</th><th scope="col">Action</th></tr></thead></table>');
            const groups = new Map();
            this.rows.filter('.settings-row-changed').each((_, element) => {
                const row = jQuery(element);
                const control = this.activeControl(row);
                if (!control.length) return;
                const name = row.attr('data-setting-name');
                const location = this.settingLocation(row).filter(Boolean).join(' › ') || 'Settings';
                if (!groups.has(location)) groups.set(location, []);
                groups.get(location).push({ row, control, name });
            });
            groups.forEach((changes, location) => {
                const body = jQuery('<tbody></tbody>');
                const heading = jQuery('<tr class="settings-change-group"><th scope="rowgroup" colspan="4"></th></tr>');
                heading.find('th').text(location);
                body.append(heading);
                changes.forEach(({ row, control, name }) => {
                    const item = jQuery('<tr class="settings-change-item"></tr>');
                    item.append(jQuery('<th scope="row"></th>').append(jQuery('<button type="button" class="settings-change-link"></button>')
                        .attr('data-settings-jump', name).text(row.find('.setting-label label').first().text().trim())));
                    item.append(jQuery('<td></td>').text(this.displayValue(row, row.attr('data-saved-value') || '')));
                    item.append(jQuery('<td class="settings-change-new"></td>').text(this.displayValue(row, this.controlValue(control))));
                    item.append(jQuery('<td></td>').append(jQuery('<button type="button" class="settings-change-revert"></button>')
                        .attr('data-settings-revert', name)
                        .attr('aria-label', 'Revert ' + location + ' ' + row.find('.setting-label label').first().text().trim())
                        .attr('title', 'Restore the current saved value')
                        .html('<i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>Revert</span>')));
                    body.append(item);
                });
                table.append(body);
            });
            list.append(table);
            this.changesModal.find('.js-settings-changes-impact').text(this.saveImpact.text());
            this.changesModal.find('.js-settings-save-reviewed').prop('disabled', this.dirtyCount === 0);
        }

        revertSetting(name, position) {
            const row = this.byId('setting-row-' + name);
            const control = this.activeControl(row);
            if (!control.length) return;
            const saved = row.attr('data-saved-value') || '';
            if (control.is('.settingInputBoolean .vc-switch-input')) {
                control.prop('checked', saved === 'true' || saved === '1');
            } else {
                control.val(saved);
            }
            control.trigger('input').trigger('change');
            if (!this.dirtyCount) {
                this.changesModal.modal('hide');
            } else {
                const buttons = this.changesModal.find('.settings-change-revert');
                buttons.eq(Math.min(position, buttons.length - 1)).trigger('focus');
            }
        }

        updateErrorIndicators() {
            this.panel.find('.settings-category-nav [role="tab"], .settings-subtabs [role="tab"]').each((_, element) => {
                var tab = jQuery(element);
                var target = this.byId(tab.attr('aria-controls'));
                var hasError = target.find('.setting-row.alert-danger').length > 0;
                tab.toggleClass('has-error', hasError);
                if (tab.closest('.settings-category-nav').length) {
                    var mobile = this.panel.find('[data-settings-open="' + tab.attr('id') + '"]');
                    mobile.toggleClass('has-error', hasError);
                    mobile.find('.settings-category-error').prop('hidden', !hasError);
                }
            });
            this.panel.find('.settings-review-nav [data-settings-review-open]').each((_, element) => {
                var button = jQuery(element);
                var target = this.byId(button.attr('data-settings-review-open'));
                button.toggleClass('has-error', target.find('.setting-row.alert-danger').length > 0);
            });
            this.updateErrorSummary();
        }

        updateErrorSummary() {
            if (!this.errorSummary.length) return;
            const list = this.errorSummary.find('.settings-issues-list').empty();
            let count = 0;
            this.rows.each((_, element) => {
                const row = jQuery(element);
                const hasError = row.hasClass('alert-danger');
                const isDefaulted = row.attr('data-defaulted') === 'true'
                    && row.attr('data-default-resolved') !== 'true';
                const affected = !row.prop('hidden') && (hasError || isDefaulted);
                row.toggleClass('settings-issue-row', affected);
                if (!affected) return;
                const label = row.find('.setting-label label').first().text().trim();
                const [category, section] = this.settingLocation(row);
                const detail = hasError
                    ? (row.find('.setting-feedback .errorMsg').first().text().trim() || 'Check this setting.')
                    : (row.attr('data-default-empty') === 'true' ? 'Enter a value' : 'Using default');
                const field = [category, section, label].filter(Boolean).join(' › ');
                const button = jQuery('<button type="button" data-settings-jump></button>')
                    .attr('data-settings-jump', row.attr('data-setting-name'))
                    .attr('aria-label', [field, detail].filter(Boolean).join(' · '))
                    .append(jQuery('<span class="settings-issue-field"></span>').text(field))
                    .append(jQuery('<small class="settings-issue-detail"></small>').text(detail));
                list.append(jQuery('<li></li>').addClass(hasError ? 'is-error' : 'is-default').append(button));
                count++;
            });
            this.errorSummary.find('.settings-error-heading-text').text(count === 1
                ? '1 setting needs attention' : count + ' settings need attention');
            this.errorSummary.toggleClass('has-errors', list.find('.is-error').length > 0);
            this.errorSummary.prop('hidden', count === 0);
            if (count === 0 && this.issuesOnly) this.setIssuesOnly(false);
            else if (this.issuesOnly) this.updateLevel();
        }

        validateRow(row) {
            var control = this.activeControl(row);
            if (!control.length || control.prop('disabled') || control.prop('readOnly')) return;
            var target = control;
            var value = this.controlValue(control);
            var type = row.attr('data-validation-type');
            var message = '';
            var numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

            if (control[0].validity && control[0].validity.badInput) {
                message = type === 'integer' ? 'Enter a whole number.' : 'Enter a number.';
            } else if (value === '') {
                if (row.attr('data-required') === 'true') message = 'This field cannot be empty.';
            } else if (type === 'integer' && !/^[+-]?[0-9]+$/.test(value)) {
                message = 'Enter a whole number.';
            } else if (type === 'float' && !numeric.test(value)) {
                message = 'Enter a number.';
            } else if (type === 'time' && !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|sunrise|sunset|daytime_start|daytime_end|nighttime_start|nighttime_end)$/.test(value)) {
                message = 'Enter a time in HH:MM format or a listed sun event.';
            } else if (type === 'boolean' && ['true', 'false', '1', '0'].indexOf(value) === -1) {
                message = 'Select Yes or No.';
            } else if (row.attr('data-control-type') === 'select' &&
                !control.find('option').toArray().some(option => option.value === value)) {
                message = 'Select a listed value.';
            } else if (type === 'color' && !/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value)) {
                message = 'Enter a three or six digit hex color.';
            } else if ((type === 'integer' || type === 'float') && numeric.test(value)) {
                if (row.attr('data-minimum') !== undefined && Number(value) < Number(row.attr('data-minimum'))) {
                    message = 'Minimum: ' + row.attr('data-minimum') + '.';
                } else if (row.attr('data-maximum') !== undefined && Number(value) > Number(row.attr('data-maximum'))) {
                    message = 'Maximum: ' + row.attr('data-maximum') + '.';
                }
            }

            var feedbackId = 'setting-feedback-' + row.attr('data-setting-name');
            var feedback = row.find('.setting-feedback').first();
            var describedBy = (target.attr('aria-describedby') || '').split(/\s+/).filter(id => id && id !== feedbackId);
            var defaulted = row.attr('data-defaulted') === 'true';
            var defaultValue = row.attr('data-default-value') || '';
            var defaultUnresolved = defaulted && (value === '' || value === defaultValue);
            if (defaulted) row.attr('data-default-resolved', !message && !defaultUnresolved ? 'true' : 'false');
            if (message) {
                if (!feedback.length) {
                    feedback = jQuery('<div class="setting-feedback"></div>').attr('id', feedbackId)
                        .appendTo(row.find('.setting-control'));
                }
                feedback.empty().append(jQuery('<span class="errorMsg"></span>').text(message));
                row.removeClass('alert-warning').addClass('alert-danger');
                target.attr('aria-invalid', 'true');
                describedBy.push(feedbackId);
                target.attr('aria-describedby', describedBy.join(' '));
            } else if (defaultUnresolved) {
                if (!feedback.length) {
                    feedback = jQuery('<div class="setting-feedback"></div>').attr('id', feedbackId)
                        .appendTo(row.find('.setting-control'));
                }
                const warning = value === '' && defaultValue === ''
                    ? 'Enter a value.' : 'Using the default value.';
                feedback.empty().append(jQuery('<span class="errorMsg"></span>').text(warning));
                row.removeClass('alert-danger').addClass('alert-warning');
                target.removeAttr('aria-invalid');
                describedBy.push(feedbackId);
                target.attr('aria-describedby', describedBy.join(' '));
            } else if (row.hasClass('alert-danger') || defaulted) {
                row.removeClass('alert-danger alert-warning');
                feedback.remove();
                target.removeAttr('aria-invalid');
                if (describedBy.length) target.attr('aria-describedby', describedBy.join(' '));
                else target.removeAttr('aria-describedby');
            }
            row.attr('data-validated', 'true');
            this.updateErrorIndicators();
        }

        onPanelClick(event) {
            var target = jQuery(event.target);
            if (target.closest('[data-settings-toggle-issues]').length) {
                this.setIssuesOnly(!this.issuesOnly);
                return;
            }
            if (target.closest('[data-settings-toggle-all]').length) {
                this.setAllMode(!this.allMode);
                return;
            }
            var jump = target.closest('[data-settings-jump]');
            if (jump.length) { this.jumpToSetting(jump.attr('data-settings-jump')); return; }
            var reviewLink = target.closest('[data-settings-review-open]');
            if (reviewLink.length) {
                var reviewTarget = this.byId(reviewLink.attr('data-settings-review-open'));
                if (reviewTarget.length) {
                    this.setReviewCurrent(reviewTarget.attr('id'));
                    reviewTarget[0].scrollIntoView({ block: 'start' });
                    reviewTarget.find('h2').first()[0].focus({ preventScroll: true });
                }
                return;
            }
            var category = target.closest('[data-settings-open]');
            if (category.length) {
                this.activate(this.byId(category.attr('data-settings-open')), false);
                this.panel.addClass('settings-show-detail');
                this.panel.find('.settings-top-panel:not([hidden]) .settings-mobile-detail-heading h2').first().trigger('focus');
                return;
            }
            if (target.closest('.settings-mobile-back').length) {
                var selected = this.panel.find('.settings-category-nav [aria-selected="true"]');
                this.panel.removeClass('settings-show-detail');
                this.content.scrollTop(0);
                this.panel.find('[data-settings-open="' + selected.attr('id') + '"]').trigger('focus');
                return;
            }
            var tab = target.closest('[role="tab"]');
            if (tab.length) this.activate(tab, false);
        }

        onTabKeydown(event) {
            var tab = jQuery(event.target).closest('[role="tab"]');
            if (!tab.length) return;
            var list = tab.closest('[data-settings-tabs]');
            if (!list.length) return;
            var tabs = list.find('[role="tab"]');
            var index = tabs.index(tab);
            var next = index;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault();
            this.activate(jQuery(tabs.get(next)), true);
        }

        scrollToTop() {
            var active = this.allMode ? this.panel.find('.settings-sections') : this.reviewList.length ? this.reviewList
                : this.panel.find('.settings-sub-panel:not([hidden]), .settings-top-panel:not([hidden])').first();
            if (active.length) active.stop().animate({ scrollTop: 0 }, 250);
            if (this.content.length) this.content.stop().animate({ scrollTop: 0 }, 250);
        }

        setupPopovers() {
            if (!jQuery.fn.popover) return;
            this.openHelp = null;
            this.pinnedHelp = false;
            this.helpShowTimer = null;
            this.helpHideTimer = null;
            const helpContent = button => {
                const description = button.attr('data-help-html') || '';
                const reason = button.attr('data-dependency-reason') || '';
                if (!reason) return description;
                const escaped = jQuery('<span></span>').text(reason).html();
                return '<p class="settings-dependency-help">' + escaped + '</p>' + description;
            };
            this.help.popover({
                container: 'body', html: true, sanitize: true, trigger: 'manual', placement: 'auto',
                content: function () { return helpContent(jQuery(this)); },
                template: '<div class="popover settings-field-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
            });
            const cancelShow = () => {
                clearTimeout(this.helpShowTimer);
                this.helpShowTimer = null;
            };
            const cancelHide = () => {
                clearTimeout(this.helpHideTimer);
                this.helpHideTimer = null;
            };
            const hideHelp = (force = false) => {
                cancelShow();
                cancelHide();
                if (!this.openHelp || (this.pinnedHelp && !force)) return;
                this.openHelp.popover('hide');
                this.openHelp = null;
                this.pinnedHelp = false;
            };
            const showHelp = (button, pinned) => {
                cancelShow();
                cancelHide();
                if (this.openHelp && this.openHelp[0] !== button[0]) hideHelp(true);
                this.openHelp = button;
                this.pinnedHelp = pinned;
                button.popover('show');
            };
            const scheduleHide = () => {
                cancelShow();
                cancelHide();
                if (!this.pinnedHelp) this.helpHideTimer = setTimeout(() => hideHelp(), 180);
            };
            this.help.on('mouseenter.settingsPage', event => {
                cancelHide();
                if (this.pinnedHelp) return;
                const delay = Number(this.dependencyValue('fieldhelpdelay'));
                if (!Number.isFinite(delay) || delay <= 0) return;
                const button = jQuery(event.currentTarget);
                cancelShow();
                this.helpShowTimer = setTimeout(() => showHelp(button, false), delay);
            });
            this.help.on('mouseleave.settingsPage', scheduleHide);
            this.help.on('click.settingsPage', event => {
                event.preventDefault();
                const button = jQuery(event.currentTarget);
                if (this.openHelp && this.openHelp[0] === button[0] && this.pinnedHelp) hideHelp(true);
                else showHelp(button, true);
            });
            this.help.on('shown.bs.popover', event => {
                var tip = jQuery(event.currentTarget).data('bs.popover').tip();
                jQuery(tip).find('a').attr({ target: '_blank', rel: 'noopener noreferrer' });
            });
            jQuery(document).on('mouseenter.settingsPage', '.settings-field-popover', cancelHide);
            jQuery(document).on('mouseleave.settingsPage', '.settings-field-popover', scheduleHide);
            jQuery(document).on('click.settingsPage', event => {
                if (!jQuery(event.target).closest('.settings-help, .settings-field-popover').length) hideHelp(true);
            });
            jQuery(document).on('keydown.settingsPage', event => {
                if (event.key !== 'Escape') return;
                hideHelp(true);
                var focused = jQuery(document.activeElement);
                if (focused.hasClass('settings-help')) focused.trigger('blur');
            });
        }
    }

    jQuery(function () {
        var panel = jQuery('#settingsPanel');
        if (panel.length) new SettingsPage(panel);
    });
}(window.jQuery));
