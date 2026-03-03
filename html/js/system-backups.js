"use strict";

class ALLSKYCONFIGBACKUPS {
    constructor() {
        this.$alert = $('#as-config-backup-alert');
        this.$table = $('#as-config-backup-table');
        this.$tableWrapper = $('#as-config-backup-table-wrapper');
        this.$tableContainer = $('#as-config-backup-table-container');
        this.$createButton = $('#as-config-backup-create');
        this.$uploadButton = $('#as-config-backup-upload');
        this.$uploadInput = $('#as-config-backup-upload-input');
        this.$createModal = $('#as-config-backup-create-modal');
        this.$createModalDetails = $('#as-config-backup-create-details');
        this.$createConfirm = $('#as-config-backup-create-confirm');
        this.$infoModal = $('#as-config-backup-info-modal');
        this.$infoModalDetails = $('#as-config-backup-info-details');
        this.$restoreModal = $('#as-config-backup-restore-modal');
        this.$restoreModalDetails = $('#as-config-backup-restore-details');
        this.$restoreConfirm = $('#as-config-backup-restore-confirm');
        this.messageTimer = null;
        this.pendingRestoreFile = '';
        this.selectedRestoreSections = [];
        this.lastStatus = null;

        this.loadStatus = this.loadStatus.bind(this);
    }

    ensureRestoreModal() {
        if (
            this.$restoreModal.length > 0 &&
            this.$restoreModalDetails.length > 0 &&
            this.$restoreConfirm.length > 0
        ) {
            return true;
        }

        if ($('#as-config-backup-restore-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-restore-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-restore-title">' +
                '<div class="modal-dialog modal-lg" role="document" style="width:90%; max-width:1200px;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                '<h4 class="modal-title" id="as-config-backup-restore-title">Restore Backup</h4>' +
                '</div>' +
                '<div class="modal-body" style="min-height:560px;">' +
                '<div id="as-config-backup-restore-details"></div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                '<button type="button" class="btn btn-warning" id="as-config-backup-restore-confirm">Confirm Restore</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        this.$restoreModal = $('#as-config-backup-restore-modal');
        this.$restoreModalDetails = $('#as-config-backup-restore-details');
        this.$restoreConfirm = $('#as-config-backup-restore-confirm');
        this.moveRestoreModalToBody();

        return (
            this.$restoreModal.length > 0 &&
            this.$restoreModalDetails.length > 0 &&
            this.$restoreConfirm.length > 0
        );
    }

    ensureCreateModal() {
        if (
            this.$createModal.length > 0 &&
            this.$createModalDetails.length > 0 &&
            this.$createConfirm.length > 0
        ) {
            return true;
        }

        if ($('#as-config-backup-create-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-create-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-create-title">' +
                '<div class="modal-dialog modal-lg" role="document" style="width:80%; max-width:1000px;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                '<h4 class="modal-title" id="as-config-backup-create-title">Create Backup</h4>' +
                '</div>' +
                '<div class="modal-body">' +
                '<div id="as-config-backup-create-details"></div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
                '<button type="button" class="btn btn-primary" id="as-config-backup-create-confirm">Create Backup</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        if ($('#as-config-backup-create-type-style').length === 0) {
            $('head').append(
                '<style id="as-config-backup-create-type-style">' +
                '#as-config-backup-create-modal .as-backup-type-group .btn {' +
                'border:1px solid #d7d7d7; box-shadow:none; transition:all .15s ease-in-out;' +
                '}' +
                '#as-config-backup-create-modal .as-backup-type-group .btn.active {' +
                'background:#e8f3ff; border-color:#2e6da4; color:#1f4f78; box-shadow:inset 0 0 0 1px #2e6da4;' +
                '}' +
                '#as-config-backup-create-modal .as-backup-type-group .btn.active .text-muted {' +
                'color:#1f4f78;' +
                '}' +
                '#as-config-backup-create-modal .as-backup-type-group .btn.active strong {' +
                'color:#1f4f78;' +
                '}' +
                'body.dark #as-config-backup-create-modal .as-backup-type-group .btn, .dark #as-config-backup-create-modal .as-backup-type-group .btn {' +
                'background:#2b2b2b; border-color:#4a4a4a; color:#d8d8d8;' +
                '}' +
                'body.dark #as-config-backup-create-modal .as-backup-type-group .btn .text-muted, .dark #as-config-backup-create-modal .as-backup-type-group .btn .text-muted {' +
                'color:#a9a9a9;' +
                '}' +
                'body.dark #as-config-backup-create-modal .as-backup-type-group .btn.active, .dark #as-config-backup-create-modal .as-backup-type-group .btn.active {' +
                'background:#113249; border-color:#5fa8dd; color:#e9f5ff; box-shadow:inset 0 0 0 1px #5fa8dd;' +
                '}' +
                'body.dark #as-config-backup-create-modal .as-backup-type-group .btn.active .text-muted, .dark #as-config-backup-create-modal .as-backup-type-group .btn.active .text-muted {' +
                'color:#cbe9ff;' +
                '}' +
                'body.dark #as-config-backup-create-modal .as-backup-type-group .btn.active strong, .dark #as-config-backup-create-modal .as-backup-type-group .btn.active strong {' +
                'color:#e9f5ff;' +
                '}' +
                '</style>'
            );
        }

        this.$createModal = $('#as-config-backup-create-modal');
        this.$createModalDetails = $('#as-config-backup-create-details');
        this.$createConfirm = $('#as-config-backup-create-confirm');

        if (this.$createModal.length > 0 && this.$createModal.parent().get(0) !== document.body) {
            this.$createModal.detach().appendTo(document.body);
        }

        return (
            this.$createModal.length > 0 &&
            this.$createModalDetails.length > 0 &&
            this.$createConfirm.length > 0
        );
    }

    moveRestoreModalToBody() {
        if (this.$restoreModal.length === 0) {
            return;
        }
        if (this.$restoreModal.parent().get(0) !== document.body) {
            this.$restoreModal.detach().appendTo(document.body);
        }
    }

    ensureInfoModal() {
        if (this.$infoModal.length > 0 && this.$infoModalDetails.length > 0) {
            return true;
        }

        if ($('#as-config-backup-info-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-info-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-info-title">' +
                '<div class="modal-dialog modal-lg" role="document" style="width:90%; max-width:1200px;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                '<h4 class="modal-title" id="as-config-backup-info-title">Backup Information</h4>' +
                '</div>' +
                '<div class="modal-body" style="min-height:520px;">' +
                '<div id="as-config-backup-info-details"></div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        this.$infoModal = $('#as-config-backup-info-modal');
        this.$infoModalDetails = $('#as-config-backup-info-details');
        if (this.$infoModal.length > 0 && this.$infoModal.parent().get(0) !== document.body) {
            this.$infoModal.detach().appendTo(document.body);
        }

        return this.$infoModal.length > 0 && this.$infoModalDetails.length > 0;
    }

    escapeHtml(value) {
        return $('<div/>').text(value == null ? '' : String(value)).html();
    }

    showMessage(type, text, autoHideMs) {
        const safeType = type || 'info';
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }

        this.$alert
            .removeClass('alert-success alert-info alert-warning alert-danger alert-dismissible')
            .addClass('alert alert-' + safeType + ' alert-dismissible')
            .html(
                '<button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\">' +
                '<span aria-hidden=\"true\">&times;</span>' +
                '</button>' +
                this.escapeHtml(text)
            )
            .show();

        if (autoHideMs && Number(autoHideMs) > 0) {
            this.messageTimer = setTimeout(() => {
                this.hideMessage();
            }, Number(autoHideMs));
        }
    }

    hideMessage() {
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }
        this.$alert.hide().removeClass('alert alert-success alert-info alert-warning alert-danger').text('');
    }

    formatBytes(bytes) {
        let value = Number(bytes) || 0;
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;

        while (value >= 1024 && i < units.length - 1) {
            value /= 1024;
            i += 1;
        }

        return value.toFixed(1) + ' ' + units[i];
    }

    renderStatus(data) {
        const backups = Array.isArray(data.backups) ? data.backups : [];

        if ($.fn.DataTable && $.fn.DataTable.isDataTable(this.$tableWrapper[0])) {
            const dt = this.$tableWrapper.DataTable();
            dt.clear();
            dt.destroy();
        }
        this.$tableWrapper.find('tbody').empty();

        if (backups.length === 0) {
            this.$table.append(
                '<tr>' +
                '<td colspan="8" class="text-center text-muted" style="padding:24px 10px;">' +
                '<i class="fa fa-archive" style="margin-right:8px;"></i>' +
                '<strong>No backups found.</strong> Create one using the button above.' +
                '</td>' +
                '</tr>'
            );
            return;
        }

        backups.forEach((backup) => {
            const name = backup.name || '';
            const backupType = (backup.backupType || 'config').toLowerCase();
            const typeLabel = backupType === 'images' ? 'Images' : 'Config';
            const created = backup.created || 'Unknown';
            const version = backup.version || 'unknown';
            const cameraType = backup.cameratype || 'unknown';
            const cameraModel = backup.cameramodel || 'unknown';
            const size = this.formatBytes(backup.sizeBytes);

            this.$table.append(
                '<tr data-backup-file="' + this.escapeHtml(name) + '">' +
                '<td>' + this.escapeHtml(name) + '</td>' +
                '<td>' + this.escapeHtml(typeLabel) + '</td>' +
                '<td>' + this.escapeHtml(version) + '</td>' +
                '<td>' + this.escapeHtml(cameraType) + '</td>' +
                '<td>' + this.escapeHtml(cameraModel) + '</td>' +
                '<td>' + this.escapeHtml(created) + '</td>' +
                '<td class="text-right">' + this.escapeHtml(size) + '</td>' +
                '<td class="text-right">' +
                '<button type="button" class="btn btn-default as-config-backup-info-row" data-file="' + this.escapeHtml(name) + '">' +
                '<i class="fa fa-info-circle"></i> Info</button> ' +
                '<button type="button" class="btn btn-info as-config-backup-download-row" data-file="' + this.escapeHtml(name) + '">' +
                '<i class="fa fa-download"></i> Download</button> ' +
                '<button type="button" class="btn btn-warning as-config-backup-restore-row" data-file="' + this.escapeHtml(name) + '">' +
                '<i class="fa fa-upload"></i> Restore</button> ' +
                '<button type="button" class="btn btn-danger as-config-backup-delete-row" data-file="' + this.escapeHtml(name) + '">' +
                '<i class="fa fa-trash"></i> Delete</button>' +
                '</td>' +
                '</tr>'
            );
        });

        if ($.fn.DataTable) {
            this.$tableWrapper.DataTable({
                order: [[1, 'asc'], [5, 'desc']],
                pageLength: 10,
                lengthChange: false,
                autoWidth: false,
                columnDefs: [
                    { width: '18%', targets: 0 }, // Filename
                    { width: '8%', targets: 1 }, // Type
                    { width: '10%', targets: 2 }, // Version
                    { width: '10%', targets: 3 }, // Camera Type
                    { width: '12%', targets: 4 }, // Camera Model
                    { width: '16%', targets: 5 }, // Created
                    { width: '8%', className: 'text-right', targets: 6 }, // Size
                    { width: '18%', className: 'text-right', orderable: false, targets: 7 } // Actions
                ],
                destroy: true
            });
        }
    }

    loadStatus() {
        const $overlayTarget = (this.$tableContainer.length > 0) ? this.$tableContainer : this.$tableWrapper;

        if ($.fn.DataTable && $.fn.DataTable.isDataTable(this.$tableWrapper[0])) {
            const dt = this.$tableWrapper.DataTable();
            dt.clear();
            dt.destroy();
        }
        this.$tableWrapper.find('tbody').empty();
        $overlayTarget.LoadingOverlay('show', {
            text: 'Loading backup files',
            image: '',
            fontawesome: 'fa fa-spinner fa-spin'
        });

        $.ajax({
            url: 'includes/configbackuputil.php?request=Status',
            method: 'GET',
            cache: false,
            dataType: 'json'
        }).done((data) => {
            this.lastStatus = data || {};
            this.renderStatus(data || {});
        }).fail((xhr) => {
            let msg = 'Unable to load backup status.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.showMessage('danger', msg);
        }).always(() => {
            $overlayTarget.LoadingOverlay('hide');
        });
    }

    openCreateModal() {
        if (!this.ensureCreateModal()) {
            this.showMessage('danger', 'Create-backup dialog is unavailable.');
            return;
        }

        const status = this.lastStatus || {};
        const fallbackOptionalTargets = {
            modules: {
                description: 'Include the modules directory which contains the installed modules. This can be a large directory but will allow you to restore your modules if needed.',
                shortdescription: 'User Modules'
            },
            databases: {
                description: 'Include the databases directory which contains the allsky.db file. This can be a large directory but will allow you to restore your database if needed.',
                shortdescription: 'Allsky Databases'
            }
        };
        const optionalTargets = (status && status.optionalTargets && typeof status.optionalTargets === 'object' && Object.keys(status.optionalTargets).length > 0)
            ? status.optionalTargets
            : fallbackOptionalTargets;
        const optionalKeys = Object.keys(optionalTargets);
        const imageFolders = (status && Array.isArray(status.imagesFolders)) ? status.imagesFolders : [];

        const typeSelector = [
            '<div class="row" style="margin:0; padding:0 0 10px 0;">',
            '<div class="col-xs-12" style="padding-left:0; padding-right:0;">',
            '<div class="panel panel-default" style="margin-bottom:10px;">',
            '<div class="panel-heading" style="padding:8px 12px;"><strong>Backup Type</strong></div>',
            '<div class="panel-body" style="padding:8px 12px;">',
            '<div class="btn-group btn-group-justified as-backup-type-group" data-toggle="buttons" style="width:100%;">',
            '<label class="btn btn-default active" style="text-align:left; white-space:normal; padding:10px 12px;">',
            '<input type="radio" name="as-config-backup-type" value="config" checked autocomplete="off">',
            '<div><i class="fa fa-cogs" style="margin-right:6px;"></i><strong>Config Backup</strong></div>',
            '<div class="text-muted" style="font-size:12px; margin-top:4px;">Back up configuration, overlay, modules config, env, and optional selected sections.</div>',
            '</label>',
            '<label class="btn btn-default" style="text-align:left; white-space:normal; padding:10px 12px;">',
            '<input type="radio" name="as-config-backup-type" value="images" autocomplete="off">',
            '<div><i class="fa fa-image" style="margin-right:6px;"></i><strong>Images Backup</strong></div>',
            '<div class="text-muted" style="font-size:12px; margin-top:4px;">Back up only the images folder.</div>',
            '</label>',
            '</div>',
            '</div>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');

        const coreRow = [
            '<div class="row" style="margin:0; padding:8px 0;">',
            '<div class="col-xs-9">',
            '<strong>Core Files</strong>',
            '<div class="text-muted" style="margin-top:4px;">Required configuration files. This is always included.</div>',
            '</div>',
            '<div class="col-xs-3 text-right">',
            '<div class="checkbox" style="margin:0;">',
            '<label class="el-switch el-switch-sm el-switch-green" style="margin-top:8px;">',
            '<input type="checkbox" checked disabled>',
            '<span class="el-switch-style"></span>',
            '</label>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');

        const optionalRows = optionalKeys.map((key) => {
            const item = optionalTargets[key] || {};
            const description = item.description || '';
            const shortDescription = item.shortdescription || key;
            const inputId = 'as-config-backup-option-' + key.replace(/[^a-zA-Z0-9_-]/g, '_');
            return [
                '<div class="row" style="margin:0; padding:8px 0;">',
                '<div class="col-xs-9">',
                '<strong>' + this.escapeHtml(shortDescription) + '</strong>',
                '<div class="text-muted" style="margin-top:4px;">' + this.escapeHtml(description) + '</div>',
                '</div>',
                '<div class="col-xs-3 text-right">',
                '<div class="checkbox" style="margin:0;">',
                '<label class="el-switch el-switch-sm el-switch-green" style="margin-top:8px;">',
                '<input type="checkbox" id="' + this.escapeHtml(inputId) + '" class="as-config-backup-optional-target" data-target-key="' + this.escapeHtml(key) + '">',
                '<span class="el-switch-style"></span>',
                '</label>',
                '</div>',
                '</div>',
                '</div>'
            ].join('');
        }).join('');

        this.$createModalDetails.html(
            '<div style="max-height:420px; overflow:auto;">' +
            typeSelector +
            '<div id="as-config-backup-options-config">' +
            coreRow +
            optionalRows +
            '</div>' +
            '<div id="as-config-backup-options-images" style="display:none;">' +
            '<div class="panel panel-default" style="margin-bottom:10px;">' +
            '<div class="panel-heading" style="padding:8px 12px;"><strong>Images Selection</strong></div>' +
            '<div class="panel-body" style="padding:10px 12px;">' +
            '<div class="row" style="margin:0 0 10px 0;">' +
            '<div class="col-xs-9" style="padding-left:0; padding-right:0;">' +
            '<strong>Backup all folders</strong>' +
            '</div>' +
            '<div class="col-xs-3 text-right" style="padding-left:0; padding-right:0;">' +
            '<div class="checkbox" style="margin:0;">' +
            '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
            '<input type="checkbox" id="as-images-backup-all" checked autocomplete="off">' +
            '<span class="el-switch-style"></span>' +
            '</label>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div id="as-images-folder-list-wrapper">' +
            (imageFolders.length
                ? ('<div class="row" style="margin:0;">' + imageFolders.map((folder) =>
                    '<div class="col-sm-6" style="padding:0 8px 8px 0;">' +
                    '<div class="row" style="margin:0;">' +
                    '<div class="col-sm-3" style="padding-left:0; padding-right:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + this.escapeHtml(folder) + '</div>' +
                    '<div class="col-sm-2" style="padding-left:0; padding-right:0;">' +
                    '<div class="checkbox" style="margin:0;">' +
                    '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
                    '<input type="checkbox" class="as-images-folder" data-folder="' + this.escapeHtml(folder) + '" disabled autocomplete="off">' +
                    '<span class="el-switch-style"></span>' +
                    '</label>' +
                    '</div>' +
                    '</div>' +
                    '<div class="col-sm-7"></div>' +
                    '</div>' +
                    '</div>'
                ).join('') + '</div>')
                : '<div class="text-muted">No image subfolders found.</div>') +
            '</div>' +
            '<div class="text-muted" style="margin-top:8px;">Select specific folders, or keep "Backup all folders" enabled.</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
        this.$createModalDetails.off('change.backuptype').on('change.backuptype', 'input[name="as-config-backup-type"]', (e) => {
            const type = String($(e.currentTarget).val() || 'config');
            if (type === 'images') {
                $('#as-config-backup-options-config').hide();
                $('#as-config-backup-options-images').show();
            } else {
                $('#as-config-backup-options-config').show();
                $('#as-config-backup-options-images').hide();
            }
        });
        this.$createModalDetails.off('change.imagesall').on('change.imagesall', '#as-images-backup-all', () => {
            const allChecked = !!$('#as-images-backup-all').prop('checked');
            this.$createModalDetails.find('.as-images-folder').prop('disabled', allChecked).prop('checked', false);
        });
        this.$createModalDetails.find('#as-images-backup-all').trigger('change');
        this.$createConfirm.prop('disabled', false);
        this.$createModal.modal('show');
    }

    createBackup(backupType, optionalTargetKeys, backupAllImages, selectedImageFolders) {
        this.hideMessage();
        this.$createButton.prop('disabled', true);
        if (this.$createConfirm.length > 0) {
            this.$createConfirm.prop('disabled', true);
        }
        $.LoadingOverlay('show', { text: 'Creating backup' });

        $.ajax({
            url: 'includes/configbackuputil.php?request=Create',
            method: 'POST',
            data: {
                backupType: backupType || 'config',
                optionalTargets: Array.isArray(optionalTargetKeys) ? optionalTargetKeys : [],
                backupAllImages: backupAllImages ? '1' : '0',
                imageFolders: Array.isArray(selectedImageFolders) ? selectedImageFolders : []
            },
            dataType: 'json'
        }).done((result) => {
            if (this.$createModal.length > 0) {
                this.$createModal.modal('hide');
            }
            this.loadStatus();
            let msg = (result && result.message) ? result.message : 'Backup created.';
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg, 5000);
        }).fail((xhr) => {
            let msg = 'Backup failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            } else if (xhr && xhr.responseText) {
                const text = String(xhr.responseText).trim();
                if (text !== '') {
                    msg = text;
                }
            }
            this.showMessage('danger', msg);
        }).always(() => {
            this.$createButton.prop('disabled', false);
            if (this.$createConfirm.length > 0) {
                this.$createConfirm.prop('disabled', false);
            }
            $.LoadingOverlay('hide');
        });
    }

    showRestoreModal(file) {
        const selectedFile = file || '';
        if (!selectedFile) {
            return;
        }

        if (!this.ensureRestoreModal()) {
            return;
        }
        this.moveRestoreModalToBody();

        this.pendingRestoreFile = selectedFile;
        this.$restoreModalDetails.empty();
        this.$restoreConfirm
            .removeClass('btn-success btn-danger')
            .addClass('btn-warning')
            .prop('disabled', true);
        this.$restoreModal.modal('show');
        this.$restoreModal.find('.modal-content').LoadingOverlay('show', {
            text: 'Loading restore details',
            image: '',
            fontawesome: 'fa fa-spinner fa-spin'
        });

        $.ajax({
            url: 'includes/configbackuputil.php?request=RestoreInfo',
            method: 'POST',
            dataType: 'json',
            data: {
                file: selectedFile
            }
        }).done((result) => {
            const backup = result && result.backup ? result.backup : {};
            const backupType = String(backup.backupType || 'config').toLowerCase();
            const imageFolders = Array.isArray(backup.imageFolders) ? backup.imageFolders : [];
            const imageBackupAll = !!backup.imageBackupAll;
            const requiredModules = Array.isArray(result.requiredModules) ? result.requiredModules : [];
            const coreModules = Array.isArray(result.coreModules) ? result.coreModules : [];
            const userModules = Array.isArray(result.userModules) ? result.userModules : [];
            const missingModules = Array.isArray(result.missingModules) ? result.missingModules : [];
            const backupHasModules = !!(result && result.backupHasModules);
            const backupModules = Array.isArray(result.backupModules) ? result.backupModules : [];
            const restoreChecks = Array.isArray(result.restoreChecks) ? result.restoreChecks : [];
            const includedSections = (result && result.sections && Array.isArray(result.sections.included))
                ? result.sections.included
                : (Array.isArray(backup.includedSections) ? backup.includedSections : []);
            const defaultSelectedSections = (result && result.sections && Array.isArray(result.sections.defaultSelected))
                ? result.sections.defaultSelected
                : includedSections.map((s) => (s && typeof s === 'object') ? (s.key || '') : '').filter((v) => v);

            const includedSectionsHtml = (includedSections.length ? includedSections : [{ key: 'core', shortdescription: 'Core Files', description: 'Core Files' }]).map((section, idx) => {
                const key = (section && typeof section === 'object' && section.key) ? String(section.key) : ('section_' + idx);
                const label = (section && typeof section === 'object')
                    ? (section.shortdescription || section.description || section.key || key)
                    : key;
                const checked = defaultSelectedSections.indexOf(key) !== -1 ? ' checked' : '';
                const disabled = (section && typeof section === 'object' && section.required) ? ' disabled' : '';
                return [
                    '<div class="row" style="margin:0 0 6px 0;">',
                    '<div class="col-xs-9" style="padding-left:0; padding-right:0;">',
                    this.escapeHtml(label),
                    '</div>',
                    '<div class="col-xs-3 text-right" style="padding-left:0; padding-right:0;">',
                    '<div class="checkbox" style="margin:0;">',
                    '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">',
                    '<input type="checkbox" class="as-restore-section" data-section-key="' + this.escapeHtml(key) + '"' + checked + disabled + '>',
                    '<span class="el-switch-style"></span>',
                    '</label>',
                    '</div>',
                    '</div>',
                    '</div>'
                ].join('');
            }).join('');

            const metadataRows = [
                ['Backup File', backup.file || selectedFile],
                ['Type', backupType === 'images' ? 'Images' : 'Config'],
                ['Created', backup.created || 'Unknown'],
                ['Version', backup.version || 'unknown'],
                ['Included Sections', includedSectionsHtml, true]
            ];
            if (backupType === 'config') {
                metadataRows.splice(4, 0,
                    ['Backup Camera', (backup.cameratype || 'unknown') + ' / ' + (backup.cameramodel || 'unknown')],
                    ['Current Camera', ((result.currentCamera && result.currentCamera.cameratype) || 'unknown') + ' / ' + ((result.currentCamera && result.currentCamera.cameramodel) || 'unknown')],
                    ['Settings File', backup.settingsfile || '(not set)'],
                    ['CC File', backup.ccfile || '(not set)']
                );
            } else if (backupType === 'images') {
                const foldersHtml = imageBackupAll
                    ? '<div>All folders</div>'
                    : (imageFolders.length
                        ? imageFolders.map((f) => '<div style="margin-bottom:4px;">' + this.escapeHtml(f) + '</div>').join('')
                        : '<div class="text-muted">No folder list recorded.</div>');
                metadataRows.splice(4, 0, ['Image Folders', foldersHtml, true]);
            }

            const metadataTable = metadataRows.map((row) =>
                '<tr>' +
                '<th style="width:38%; color:#666; font-weight:600;">' + this.escapeHtml(row[0]) + '</th>' +
                '<td style="' + (row[2] ? '' : 'font-family:monospace;') + '">' + (row[2] ? row[1] : this.escapeHtml(row[1])) + '</td>' +
                '</tr>'
            ).join('');

            const renderModuleSection = (title, modules, badgeClass) => {
                if (!modules.length) {
                    return '<div class="text-muted" style="margin-bottom:10px;"><strong>' + this.escapeHtml(title) + ':</strong> none</div>';
                }
                return [
                    '<div style="margin-bottom:10px;">',
                    '<div style="margin-bottom:6px;">',
                    '<strong>' + this.escapeHtml(title) + '</strong> ',
                    '<span class="badge ' + this.escapeHtml(badgeClass) + '">' + modules.length + '</span>',
                    '</div>',
                    '<ul class="list-group" style="margin-bottom:0;">',
                    modules.map((m) => '<li class="list-group-item" style="font-family:monospace;">' + this.escapeHtml(m) + '</li>').join(''),
                    '</ul>',
                    '</div>'
                ].join('');
            };

            const checksHtml = [
                '<div class="panel panel-default" style="margin-bottom:12px;">',
                '<div class="panel-heading" style="padding:8px 12px;"><strong>Pre-Restore Checks</strong></div>',
                '<div class="panel-body" style="padding:8px 12px;">',
                '<div id="as-config-backup-restore-checks"></div>',
                '</div>',
                '</div>'
            ].join('');

            const detailsHtml = [
                checksHtml,
                '<div class="row">',
                '<div class="col-sm-6" style="margin-bottom:12px;">',
                '<div class="panel panel-default" style="margin-bottom:0;">',
                '<div class="panel-heading" style="padding:8px 12px;"><strong>Backup Metadata</strong></div>',
                '<div class="panel-body" style="padding:8px 12px;">',
                '<table class="table table-condensed" style="margin-bottom:0;">',
                metadataTable,
                '</table>',
                '</div>',
                '</div>',
                '</div>',
                '<div class="col-sm-6">',
                '<div class="panel panel-default" style="margin-bottom:0;">',
                '<div class="panel-heading" style="padding:8px 12px;">',
                '<strong id="as-config-backup-module-panel-title">Required Modules</strong> <span class="badge" id="as-config-backup-module-panel-count">0</span>',
                '</div>',
                '<div class="panel-body" style="padding:8px 12px;" id="as-config-backup-module-panel-body">',
                '</div>',
                '</div>',
                '</div>',
                '</div>'
            ].join('');
            this.$restoreModalDetails.html(detailsHtml);

            const findCheck = (name) => {
                for (let i = 0; i < restoreChecks.length; i += 1) {
                    const c = restoreChecks[i] || {};
                    if ((c.name || '') === name) return c;
                }
                return { name: name, passed: true, detail: '' };
            };
            const coreCheckNames = [
                'Backup camera metadata present',
                'Backup camera matches current camera',
                'Camera settings file detected',
                'CC file detected'
            ];
            const coreChecks = coreCheckNames.map((n) => findCheck(n));
            const imagesPresentCheck = findCheck('Images folder present in backup');

            const renderChecks = (checks) => {
                if (!checks.length) {
                    $('#as-config-backup-restore-checks').html('<div class="text-muted">No checks required for selected sections.</div>');
                    return;
                }
                const half = Math.ceil(checks.length / 2);
                const renderChecksCol = (items) =>
                    '<ul class="list-group" style="margin-bottom:0;">' +
                    items.map((c) => {
                        const passed = !!c.passed;
                        const icon = passed
                            ? '<i class="fa fa-check text-success" style="margin-right:8px;"></i>'
                            : '<i class="fa fa-times text-danger" style="margin-right:8px;"></i>';
                        const detail = c.detail ? '<div class="text-muted" style="font-size:12px; margin-top:2px;">' + this.escapeHtml(c.detail) + '</div>' : '';
                        return '<li class="list-group-item">' + icon + '<strong>' + this.escapeHtml(c.name || 'Check') + '</strong>' + detail + '</li>';
                    }).join('') +
                    '</ul>';
                $('#as-config-backup-restore-checks').html(
                    '<div class="row">' +
                    '<div class="col-sm-6">' + renderChecksCol(checks.slice(0, half)) + '</div>' +
                    '<div class="col-sm-6">' + renderChecksCol(checks.slice(half)) + '</div>' +
                    '</div>'
                );
            };

            const renderRequiredModules = () => {
                if (!requiredModules.length) {
                    return '<div class="well well-sm text-muted" style="margin-bottom:0;">No module entries found in postprocessing files.</div>';
                }
                return '<div style="max-height:430px; overflow:auto;">' +
                    renderModuleSection('Core Modules', coreModules, '') +
                    renderModuleSection('User Modules', userModules, '') +
                    renderModuleSection('Missing Modules', missingModules, '') +
                    '</div>';
            };

            const renderBackupModules = () => {
                if (!backupModules.length) {
                    return '<div class="well well-sm text-muted" style="margin-bottom:0;">Modules section is included in backup.</div>';
                }
                return '<div style="max-height:430px; overflow:auto;">' +
                    renderModuleSection('Modules Included In Backup', backupModules, '') +
                    '</div>';
            };

            const updateForSelection = () => {
                const selectedKeys = [];
                this.$restoreModalDetails.find('.as-restore-section:checked').each((_, el) => {
                    selectedKeys.push($(el).data('section-key'));
                });
                this.selectedRestoreSections = selectedKeys;

                if (backupType === 'images') {
                    const imagesSelected = selectedKeys.indexOf('images') !== -1;
                    const checks = [
                        imagesPresentCheck,
                        {
                            name: 'Images section selected for restore',
                            passed: imagesSelected,
                            detail: imagesSelected ? 'Images will be restored.' : 'Select Images Folder to continue.',
                        }
                    ];
                    const canRestoreNow = !!imagesPresentCheck.passed && imagesSelected;
                    renderChecks(checks);
                    $('#as-config-backup-module-panel-title').text('Images Restore');
                    const folderListHtml = imageBackupAll
                        ? (imageFolders.length
                            ? imageFolders.map((f) => '<li class="list-group-item">' + this.escapeHtml(f) + '</li>').join('')
                            : '<li class="list-group-item text-muted">All folders in images</li>')
                        : (imageFolders.length
                            ? imageFolders.map((f) => '<li class="list-group-item">' + this.escapeHtml(f) + '</li>').join('')
                            : '<li class="list-group-item text-muted">No folder list recorded.</li>');
                    $('#as-config-backup-module-panel-count').text(String(imageFolders.length || 0));
                    $('#as-config-backup-module-panel-body').html(
                        '<div class="text-muted" style="margin-bottom:8px;">Folders that would be restored:</div>' +
                        '<div style="max-height:340px; overflow:auto;">' +
                        '<ul class="list-group" style="margin-bottom:0;">' + folderListHtml + '</ul>' +
                        '</div>'
                    );
                    if (canRestoreNow) {
                        this.$restoreConfirm
                            .removeClass('btn-warning btn-danger')
                            .addClass('btn-success')
                            .prop('disabled', false);
                    } else {
                        this.$restoreConfirm
                            .removeClass('btn-warning btn-success')
                            .addClass('btn-danger')
                            .prop('disabled', true);
                    }
                    return;
                }

                const coreSelected = selectedKeys.indexOf('core') !== -1;
                const modulesSelected = selectedKeys.indexOf('modules') !== -1;
                const doRequiredModuleCheck = (!backupHasModules) || (!modulesSelected);

                const checks = [];
                let canRestoreNow = selectedKeys.length > 0;
                if (coreSelected) {
                    coreChecks.forEach((c) => {
                        checks.push(c);
                        if (!c.passed) {
                            canRestoreNow = false;
                        }
                    });
                }

                const moduleCheck = doRequiredModuleCheck
                    ? {
                        name: 'All required modules available',
                        passed: missingModules.length === 0,
                        detail: (missingModules.length === 0)
                            ? (requiredModules.length + ' required modules found locally')
                            : ('Missing: ' + missingModules.join(', '))
                    }
                    : {
                        name: 'Module files included in backup',
                        passed: true,
                        detail: backupModules.length + ' module files included in backup archive'
                    };
                checks.push(moduleCheck);
                if (!moduleCheck.passed) {
                    canRestoreNow = false;
                }

                if (backupHasModules && modulesSelected) {
                    $('#as-config-backup-module-panel-title').text('Modules In Backup');
                    $('#as-config-backup-module-panel-count').text(String(backupModules.length));
                    $('#as-config-backup-module-panel-body').html(renderBackupModules());
                } else {
                    $('#as-config-backup-module-panel-title').text('Required Modules');
                    $('#as-config-backup-module-panel-count').text(String(requiredModules.length));
                    $('#as-config-backup-module-panel-body').html(renderRequiredModules());
                }

                renderChecks(checks);
                if (canRestoreNow) {
                    this.$restoreConfirm
                        .removeClass('btn-warning btn-danger')
                        .addClass('btn-success')
                        .prop('disabled', false);
                } else {
                    this.$restoreConfirm
                        .removeClass('btn-warning btn-success')
                        .addClass('btn-danger')
                        .prop('disabled', true);
                }
            };

            this.$restoreModalDetails.off('change.restoreSections').on('change.restoreSections', '.as-restore-section', () => {
                updateForSelection();
            });
            updateForSelection();
        }).fail((xhr) => {
            let msg = 'Unable to load restore details.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.$restoreModalDetails.html('<p class="text-danger">' + this.escapeHtml(msg) + '</p>');
            this.$restoreConfirm
                .removeClass('btn-warning btn-success')
                .addClass('btn-danger')
                .prop('disabled', true);
        }).always(() => {
            this.$restoreModal.find('.modal-content').LoadingOverlay('hide');
        });
    }

    showBackupInfoModal(file) {
        const selectedFile = file || '';
        if (!selectedFile) {
            return;
        }
        if (!this.ensureInfoModal()) {
            return;
        }

        this.$infoModalDetails.empty();
        this.$infoModal.modal('show');
        this.$infoModal.find('.modal-content').LoadingOverlay('show', {
            text: 'Loading backup information',
            image: '',
            fontawesome: 'fa fa-spinner fa-spin'
        });

        $.ajax({
            url: 'includes/configbackuputil.php?request=RestoreInfo',
            method: 'POST',
            dataType: 'json',
            data: { file: selectedFile }
        }).done((result) => {
            const backup = result && result.backup ? result.backup : {};
            const backupType = String(backup.backupType || 'config').toLowerCase();
            const requiredModules = Array.isArray(result.requiredModules) ? result.requiredModules : [];
            const coreModules = Array.isArray(result.coreModules) ? result.coreModules : [];
            const userModules = Array.isArray(result.userModules) ? result.userModules : [];
            const backupHasModules = !!(result && result.backupHasModules);
            const backupModules = Array.isArray(result.backupModules) ? result.backupModules : [];
            const imageFolders = Array.isArray(backup.imageFolders) ? backup.imageFolders : [];
            const imageBackupAll = !!backup.imageBackupAll;
            const includedSections = Array.isArray(backup.includedSections) ? backup.includedSections : [];

            const includedSectionsHtml = (includedSections.length ? includedSections : [{ key: 'core', shortdescription: 'Core Files', description: 'Core Files' }]).map((section) => {
                const label = (section && typeof section === 'object')
                    ? (section.shortdescription || section.description || section.key || '')
                    : '';
                return '<div style="margin-bottom:4px;">' + this.escapeHtml(label) + '</div>';
            }).join('');

            const metadataRows = [
                ['Backup File', backup.file || selectedFile],
                ['Type', backupType === 'images' ? 'Images' : 'Config'],
                ['Created', backup.created || 'Unknown'],
                ['Version', backup.version || 'unknown'],
                ['Included Sections', includedSectionsHtml, true]
            ];
            if (backupType === 'config') {
                metadataRows.splice(4, 0,
                    ['Backup Camera', (backup.cameratype || 'unknown') + ' / ' + (backup.cameramodel || 'unknown')],
                    ['Settings File', backup.settingsfile || '(not set)'],
                    ['CC File', backup.ccfile || '(not set)']
                );
            } else {
                const foldersHtml = imageBackupAll
                    ? '<div>All folders</div>'
                    : (imageFolders.length
                        ? imageFolders.map((f) => '<div style="margin-bottom:4px;">' + this.escapeHtml(f) + '</div>').join('')
                        : '<div class="text-muted">No folder list recorded.</div>');
                metadataRows.splice(4, 0, ['Image Folders', foldersHtml, true]);
            }

            const metadataTable = metadataRows.map((row) =>
                '<tr>' +
                '<th style="width:38%; color:#666; font-weight:600;">' + this.escapeHtml(row[0]) + '</th>' +
                '<td style="' + (row[2] ? '' : 'font-family:monospace;') + '">' + (row[2] ? row[1] : this.escapeHtml(row[1])) + '</td>' +
                '</tr>'
            ).join('');

            const renderModuleSection = (title, modules) => {
                if (!modules.length) {
                    return '<div class="text-muted" style="margin-bottom:10px;"><strong>' + this.escapeHtml(title) + ':</strong> none</div>';
                }
                return [
                    '<div style="margin-bottom:10px;">',
                    '<div style="margin-bottom:6px;"><strong>' + this.escapeHtml(title) + '</strong> <span class="badge">' + modules.length + '</span></div>',
                    '<ul class="list-group" style="margin-bottom:0;">',
                    modules.map((m) => '<li class="list-group-item" style="font-family:monospace;">' + this.escapeHtml(m) + '</li>').join(''),
                    '</ul>',
                    '</div>'
                ].join('');
            };

            let rightTitle = 'Backup Contents';
            let rightCount = 0;
            let rightBody = '<div class="text-muted">No additional details available.</div>';
            if (backupType === 'images') {
                rightTitle = 'Images Folders';
                rightCount = imageFolders.length;
                rightBody = imageBackupAll
                    ? '<div class="well well-sm text-muted" style="margin-bottom:0;">All folders in images are included.</div>'
                    : ('<div style="max-height:430px; overflow:auto;"><ul class="list-group" style="margin-bottom:0;">' +
                        (imageFolders.length
                            ? imageFolders.map((f) => '<li class="list-group-item">' + this.escapeHtml(f) + '</li>').join('')
                            : '<li class="list-group-item text-muted">No folder list recorded.</li>') +
                        '</ul></div>');
            } else if (backupHasModules) {
                rightTitle = 'Modules In Backup';
                rightCount = backupModules.length;
                rightBody = '<div style="max-height:430px; overflow:auto;">' + renderModuleSection('Modules Included In Backup', backupModules) + '</div>';
            } else {
                rightTitle = 'Required Modules';
                rightCount = requiredModules.length;
                rightBody = '<div style="max-height:430px; overflow:auto;">' +
                    renderModuleSection('Core Modules', coreModules) +
                    renderModuleSection('User Modules', userModules) +
                    '</div>';
            }

            const html = [
                '<div class="row">',
                '<div class="col-sm-6" style="margin-bottom:12px;">',
                '<div class="panel panel-default" style="margin-bottom:0;">',
                '<div class="panel-heading" style="padding:8px 12px;"><strong>Backup Metadata</strong></div>',
                '<div class="panel-body" style="padding:8px 12px;">',
                '<table class="table table-condensed" style="margin-bottom:0;">', metadataTable, '</table>',
                '</div></div></div>',
                '<div class="col-sm-6">',
                '<div class="panel panel-default" style="margin-bottom:0;">',
                '<div class="panel-heading" style="padding:8px 12px;"><strong>' + this.escapeHtml(rightTitle) + '</strong> <span class="badge">' + rightCount + '</span></div>',
                '<div class="panel-body" style="padding:8px 12px;">', rightBody, '</div>',
                '</div></div>',
                '</div>'
            ].join('');
            this.$infoModalDetails.html(html);
        }).fail((xhr) => {
            let msg = 'Unable to load backup information.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.$infoModalDetails.html('<p class="text-danger">' + this.escapeHtml(msg) + '</p>');
        }).always(() => {
            this.$infoModal.find('.modal-content').LoadingOverlay('hide');
        });
    }

    confirmRestore() {
        const selectedFile = this.pendingRestoreFile || '';
        if (!selectedFile) {
            return;
        }

        this.$restoreConfirm.prop('disabled', true);
        $.ajax({
            url: 'includes/configbackuputil.php?request=Restore',
            method: 'POST',
            dataType: 'json',
            data: {
                file: selectedFile,
                selectedSections: Array.isArray(this.selectedRestoreSections) ? this.selectedRestoreSections : []
            }
        }).done((result) => {
            this.renderStatus((result && result.status) ? result.status : {});
            this.$restoreModal.modal('hide');
        }).fail((xhr) => {
            let msg = 'Restore failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.$restoreModalDetails.prepend('<div class="alert alert-danger" style="margin-bottom:10px;">' + this.escapeHtml(msg) + '</div>');
        }).always(() => {
            this.$restoreConfirm.prop('disabled', false);
        });
    }

    deleteBackup(file) {
        const selectedFile = file || '';
        if (!selectedFile) {
            this.showMessage('warning', 'Select a backup to delete.');
            return;
        }
        if (!window.confirm('Delete backup "' + selectedFile + '"?')) {
            return;
        }

        this.hideMessage();
        $.LoadingOverlay('show', { text: 'Deleting backup' });

        $.ajax({
            url: 'includes/configbackuputil.php?request=Delete',
            method: 'POST',
            dataType: 'json',
            data: {
                file: selectedFile
            }
        }).done((result) => {
            this.loadStatus();
            let msg = (result && result.message) ? result.message : 'Backup deleted.';
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg);
        }).fail((xhr) => {
            let msg = 'Delete failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            } else if (xhr && xhr.responseText) {
                const text = String(xhr.responseText).trim();
                if (text !== '') {
                    msg = text;
                }
            }
            this.showMessage('danger', msg);
        }).always(() => {
            $.LoadingOverlay('hide');
        });
    }

    downloadBackup(file) {
        const selectedFile = file || '';
        if (!selectedFile) {
            this.showMessage('warning', 'Select a backup to download.');
            return;
        }
        window.location.href = 'includes/configbackuputil.php?request=Download&file=' + encodeURIComponent(selectedFile);
    }

    uploadBackup(file) {
        if (!file) {
            return;
        }

        if (!/\.tar\.gz$/i.test(file.name || '')) {
            this.showMessage('warning', 'Please select a .tar.gz backup archive.');
            return;
        }

        const formData = new FormData();
        formData.append('backupFile', file);

        this.hideMessage();
        this.$uploadButton.prop('disabled', true);
        $.LoadingOverlay('show', { text: 'Uploading backup' });

        $.ajax({
            url: 'includes/configbackuputil.php?request=Upload',
            method: 'POST',
            dataType: 'json',
            data: formData,
            processData: false,
            contentType: false
        }).done((result) => {
            this.renderStatus((result && result.status) ? result.status : {});
            let msg = (result && result.message) ? result.message : 'Backup uploaded.';
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg);
        }).fail((xhr) => {
            let msg = 'Upload failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.showMessage('danger', msg);
        }).always(() => {
            this.$uploadButton.prop('disabled', false);
            this.$uploadInput.val('');
            $.LoadingOverlay('hide');
        });
    }

    run() {
        this.ensureCreateModal();
        this.ensureInfoModal();
        this.ensureRestoreModal();

        if (
            this.$createButton.length === 0 ||
            this.$table.length === 0 ||
            this.$tableWrapper.length === 0
        ) {
            return;
        }

        $('a[href="#as-system-backups"]').on('shown.bs.tab', () => {
            this.loadStatus();
        });

        this.$createButton.on('click', () => this.openCreateModal());
        if (
            this.$createModal.length > 0 &&
            this.$createModalDetails.length > 0 &&
            this.$createConfirm.length > 0
        ) {
            this.$createConfirm.on('click', () => {
                const selectedKeys = [];
                const backupType = String(this.$createModalDetails.find('input[name="as-config-backup-type"]:checked').val() || 'config');
                let backupAllImages = true;
                const selectedImageFolders = [];
                if (backupType === 'config') {
                    this.$createModalDetails.find('.as-config-backup-optional-target:checked').each((_, el) => {
                        selectedKeys.push($(el).data('target-key'));
                    });
                } else {
                    backupAllImages = !!this.$createModalDetails.find('#as-images-backup-all').prop('checked');
                    if (!backupAllImages) {
                        this.$createModalDetails.find('.as-images-folder:checked').each((_, el) => {
                            selectedImageFolders.push($(el).data('folder'));
                        });
                        if (selectedImageFolders.length === 0) {
                            this.showMessage('warning', 'Select at least one images folder or choose "Backup all folders".');
                            return;
                        }
                    }
                }
                this.createBackup(backupType, selectedKeys, backupAllImages, selectedImageFolders);
            });
            this.$createModal.on('hidden.bs.modal', () => {
                this.$createModalDetails.empty();
            });
        }
        if (this.$uploadButton.length > 0 && this.$uploadInput.length > 0) {
            this.$uploadButton.on('click', () => this.$uploadInput.trigger('click'));
            this.$uploadInput.on('change', (e) => {
                const file = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
                this.uploadBackup(file);
            });
        }
        $(document).on('click', '.as-config-backup-download-row', (e) => {
            const file = $(e.currentTarget).data('file') || '';
            this.downloadBackup(file);
        });
        $(document).on('click', '.as-config-backup-info-row', (e) => {
            const file = $(e.currentTarget).data('file') || '';
            this.showBackupInfoModal(file);
        });
        $(document).on('click', '.as-config-backup-restore-row', (e) => {
            const file = $(e.currentTarget).data('file') || '';
            this.showRestoreModal(file);
        });
        $(document).on('click', '.as-config-backup-delete-row', (e) => {
            const file = $(e.currentTarget).data('file') || '';
            this.deleteBackup(file);
        });
        if (
            this.$restoreModal.length > 0 &&
            this.$restoreModalDetails.length > 0 &&
            this.$restoreConfirm.length > 0
        ) {
            this.$restoreConfirm.on('click', () => this.confirmRestore());
            this.$restoreModal.on('hidden.bs.modal', () => {
                this.pendingRestoreFile = '';
                this.selectedRestoreSections = [];
                this.$restoreModalDetails.empty();
            });
        }

        // Load immediately when this page opens with Backups already active.
        if ($('#as-system-backups').hasClass('active') || $('#as-system-backups').hasClass('in')) {
            this.loadStatus();
        }
    }
}

let allskyConfigBackups = null;

function initAllskyConfigBackups() {
    if (allskyConfigBackups !== null) {
        return;
    }
    allskyConfigBackups = new ALLSKYCONFIGBACKUPS();
    allskyConfigBackups.run();
}

$(document).ready(() => {
    // Start only when Backups tab is selected.
    $('a[href="#as-system-backups"]').one('shown.bs.tab', () => {
        initAllskyConfigBackups();
    });

    // If page loads with Backups already active, initialize immediately.
    if ($('#as-system-backups').hasClass('active') || $('#as-system-backups').hasClass('in')) {
        initAllskyConfigBackups();
    }
});
