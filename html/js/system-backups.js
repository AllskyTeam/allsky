"use strict";

class ALLSKYCONFIGBACKUPS {
    constructor() {
        this.$alert = $('#as-config-backup-alert');
        this.$table = $('#as-config-backup-table');
        this.$tableWrapper = $('#as-config-backup-table-wrapper');
        this.$createButton = $('#as-config-backup-create');
        this.$uploadButton = $('#as-config-backup-upload');
        this.$uploadInput = $('#as-config-backup-upload-input');
        this.$restoreModal = $('#as-config-backup-restore-modal');
        this.$restoreModalDetails = $('#as-config-backup-restore-details');
        this.$restoreConfirm = $('#as-config-backup-restore-confirm');
        this.messageTimer = null;
        this.pendingRestoreFile = '';

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

    moveRestoreModalToBody() {
        if (this.$restoreModal.length === 0) {
            return;
        }
        if (this.$restoreModal.parent().get(0) !== document.body) {
            this.$restoreModal.detach().appendTo(document.body);
        }
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
                '<td colspan="7" class="text-center text-muted" style="padding:24px 10px;">' +
                '<i class="fa fa-archive" style="margin-right:8px;"></i>' +
                '<strong>No backups found.</strong> Create one using the button above.' +
                '</td>' +
                '</tr>'
            );
            return;
        }

        backups.forEach((backup) => {
            const name = backup.name || '';
            const created = backup.created || 'Unknown';
            const version = backup.version || 'unknown';
            const cameraType = backup.cameratype || 'unknown';
            const cameraModel = backup.cameramodel || 'unknown';
            const size = this.formatBytes(backup.sizeBytes);

            this.$table.append(
                '<tr data-backup-file="' + this.escapeHtml(name) + '">' +
                '<td>' + this.escapeHtml(name) + '</td>' +
                '<td>' + this.escapeHtml(version) + '</td>' +
                '<td>' + this.escapeHtml(cameraType) + '</td>' +
                '<td>' + this.escapeHtml(cameraModel) + '</td>' +
                '<td>' + this.escapeHtml(created) + '</td>' +
                '<td class="text-right">' + this.escapeHtml(size) + '</td>' +
                '<td class="text-right">' +
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
                order: [[4, 'desc']],
                pageLength: 10,
                lengthChange: false,
                autoWidth: false,
                columnDefs: [
                    { width: '20%', targets: 0 }, // Filename
                    { width: '10%', targets: 1 }, // Version
                    { width: '10%', targets: 2 }, // Camera Type
                    { width: '12%', targets: 3 }, // Camera Model
                    { width: '20%', targets: 4 }, // Created
                    { width: '8%', className: 'text-right', targets: 5 }, // Size
                    { width: '20%', className: 'text-right', orderable: false, targets: 6 } // Actions
                ],
                destroy: true
            });
        }
    }

    loadStatus() {
        $.ajax({
            url: 'includes/configbackuputil.php?request=Status',
            method: 'GET',
            cache: false,
            dataType: 'json'
        }).done((data) => {
            this.renderStatus(data || {});
        }).fail((xhr) => {
            let msg = 'Unable to load backup status.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.showMessage('danger', msg);
        });
    }

    createBackup() {
        this.hideMessage();
        this.$createButton.prop('disabled', true);
        $.LoadingOverlay('show', { text: 'Creating backup' });

        $.ajax({
            url: 'includes/configbackuputil.php?request=Create',
            method: 'POST',
            dataType: 'json'
        }).done((result) => {
            this.renderStatus((result && result.status) ? result.status : {});
            let msg = (result && result.message) ? result.message : 'Backup created.';
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg, 5000);
        }).fail((xhr) => {
            let msg = 'Backup failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.showMessage('danger', msg);
        }).always(() => {
            this.$createButton.prop('disabled', false);
            $.LoadingOverlay('hide');
        });
    }

    showRestoreModal(file) {
        const selectedFile = file || '';
        if (!selectedFile) {
            this.showMessage('warning', 'Select a backup to restore.');
            return;
        }

        if (!this.ensureRestoreModal()) {
            this.showMessage('danger', 'Restore dialog is unavailable.');
            return;
        }
        this.moveRestoreModalToBody();

        this.pendingRestoreFile = selectedFile;
        this.$restoreModalDetails.html('<p class="text-muted">Loading restore information...</p>');
        this.$restoreConfirm
            .removeClass('btn-success btn-danger')
            .addClass('btn-warning')
            .prop('disabled', true);
        this.$restoreModal.modal('show');

        $.ajax({
            url: 'includes/configbackuputil.php?request=RestoreInfo',
            method: 'POST',
            dataType: 'json',
            data: {
                file: selectedFile
            }
        }).done((result) => {
            const backup = result && result.backup ? result.backup : {};
            const requiredModules = Array.isArray(result.requiredModules) ? result.requiredModules : [];
            const coreModules = Array.isArray(result.coreModules) ? result.coreModules : [];
            const userModules = Array.isArray(result.userModules) ? result.userModules : [];
            const missingModules = Array.isArray(result.missingModules) ? result.missingModules : [];
            const restoreChecks = Array.isArray(result.restoreChecks) ? result.restoreChecks : [];
            const errors = Array.isArray(result.errors) ? result.errors : [];
            const canRestore = !!(result && result.canRestore);

            const metadataRows = [
                ['Backup File', backup.file || selectedFile],
                ['Created', backup.created || 'Unknown'],
                ['Version', backup.version || 'unknown'],
                ['Backup Camera', (backup.cameratype || 'unknown') + ' / ' + (backup.cameramodel || 'unknown')],
                ['Current Camera', ((result.currentCamera && result.currentCamera.cameratype) || 'unknown') + ' / ' + ((result.currentCamera && result.currentCamera.cameramodel) || 'unknown')],
                ['Settings File', backup.settingsfile || '(not set)'],
                ['CC File', backup.ccfile || '(not set)']
            ];

            const metadataTable = metadataRows.map((row) =>
                '<tr>' +
                '<th style="width:38%; color:#666; font-weight:600;">' + this.escapeHtml(row[0]) + '</th>' +
                '<td style="font-family:monospace;">' + this.escapeHtml(row[1]) + '</td>' +
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

            const moduleList = requiredModules.length
                ? '<div style="max-height:430px; overflow:auto;">' +
                  renderModuleSection('Core Modules', coreModules, '') +
                  renderModuleSection('User Modules', userModules, '') +
                  renderModuleSection('Missing Modules', missingModules, '') +
                  '</div>'
                : '<div class="well well-sm text-muted" style="margin-bottom:0;">No module entries found in postprocessing files.</div>';

            let checksHtml = '';
            if (restoreChecks.length) {
                const half = Math.ceil(restoreChecks.length / 2);
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

                checksHtml = [
                    '<div class="panel panel-default" style="margin-bottom:12px;">',
                    '<div class="panel-heading" style="padding:8px 12px;"><strong>Pre-Restore Checks</strong></div>',
                    '<div class="panel-body" style="padding:8px 12px;">',
                    '<div class="row">',
                    '<div class="col-sm-6">' + renderChecksCol(restoreChecks.slice(0, half)) + '</div>',
                    '<div class="col-sm-6">' + renderChecksCol(restoreChecks.slice(half)) + '</div>',
                    '</div>',
                    '</div>',
                    '</div>'
                ].join('');
            }

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
                '<strong>Required Modules</strong> <span class="badge">' + requiredModules.length + '</span>',
                '</div>',
                '<div class="panel-body" style="padding:8px 12px;">',
                moduleList,
                '</div>',
                '</div>',
                '</div>',
                '</div>'
            ].join('');
            this.$restoreModalDetails.html(detailsHtml);

            if (canRestore) {
                this.$restoreConfirm
                    .removeClass('btn-warning btn-danger')
                    .addClass('btn-success')
                    .prop('disabled', false);
                this.showMessage('success', 'Restore checks passed. Confirm restore to continue.', 5000);
            } else {
                let msg = 'Restore is blocked.';
                if (errors.length) {
                    msg += ' ' + errors.join(' ');
                }
                if (missingModules.length) {
                    msg += ' Missing modules: ' + missingModules.join(', ');
                }
                this.$restoreConfirm
                    .removeClass('btn-warning btn-success')
                    .addClass('btn-danger')
                    .prop('disabled', true);
            }
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
            this.showMessage('danger', msg);
        });
    }

    confirmRestore() {
        const selectedFile = this.pendingRestoreFile || '';
        if (!selectedFile) {
            this.showMessage('danger', 'No backup selected for restore.');
            return;
        }

        this.$restoreConfirm.prop('disabled', true);
        $.ajax({
            url: 'includes/configbackuputil.php?request=Restore',
            method: 'POST',
            dataType: 'json',
            data: { file: selectedFile }
        }).done((result) => {
            this.renderStatus((result && result.status) ? result.status : {});
            let msg = (result && result.message) ? result.message : 'Backup restored. Restart Allsky if needed.';
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg);
            this.$restoreModal.modal('hide');
        }).fail((xhr) => {
            let msg = 'Restore failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            this.$restoreModalDetails.prepend('<div class="alert alert-danger" style="margin-bottom:10px;">' + this.escapeHtml(msg) + '</div>');
            this.showMessage('danger', msg);
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

        this.$createButton.on('click', () => this.createBackup());
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
