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
        this.$backupProgressModal = $('#as-config-backup-progress-modal');
        this.$backupProgressBar = $('#as-config-backup-progress-bar');
        this.$backupProgressStatus = $('#as-config-backup-progress-status');
        this.$backupProgressSteps = $('#as-config-backup-progress-steps');
        this.$backupProgressClose = $('#as-config-backup-progress-close');
        this.$backupProgressError = $('#as-config-backup-progress-error');
        this.$backupProgressWarning = $('#as-config-backup-progress-warning');
        this.progressTimer = null;
        this.progressPercent = 0;
        this.$infoModal = $('#as-config-backup-info-modal');
        this.$infoModalDetails = $('#as-config-backup-info-details');
        this.$restoreModal = $('#as-config-backup-restore-modal');
        this.$restoreModalDetails = $('#as-config-backup-restore-details');
        this.$restoreConfirm = $('#as-config-backup-restore-confirm');
        this.$restoreProgressModal = $('#as-config-backup-restore-progress-modal');
        this.$restoreProgressBar = $('#as-config-backup-restore-progress-bar');
        this.$restoreProgressStatus = $('#as-config-backup-restore-progress-status');
        this.$restoreProgressSteps = $('#as-config-backup-restore-progress-steps');
        this.$restoreProgressClose = $('#as-config-backup-restore-progress-close');
        this.$restoreProgressError = $('#as-config-backup-restore-progress-error');
        this.$restoreSummaryModal = $('#as-config-backup-restore-summary-modal');
        this.$restoreSummaryDetails = $('#as-config-backup-restore-summary-details');
        this.restoreProgressTimer = null;
        this.restoreProgressPercent = 0;
        this.messageTimer = null;
        this.pendingRestoreFile = '';
        this.pendingRestoreType = 'config';
        this.selectedRestoreSections = [];
        this.selectedRestoreImageFolders = [];
        this.selectedRestoreFiles = [];
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
                'body.dark #as-config-backup-create-modal #as-images-size-summary, .dark #as-config-backup-create-modal #as-images-size-summary {' +
                'background:#2f3438; border-color:#4a535a; color:#d9e3ea;' +
                '}' +
                'body.dark #as-config-backup-create-modal #as-images-size-summary .text-muted, .dark #as-config-backup-create-modal #as-images-size-summary .text-muted {' +
                'color:#b7c4ce;' +
                '}' +
                '#as-restore-advanced-files .as-restore-tree-level > li:nth-child(even) {' +
                'background:rgba(0,0,0,0.025); border-radius:3px;' +
                '}' +
                'body.dark #as-restore-advanced-files .as-restore-tree-level > li:nth-child(even), .dark #as-restore-advanced-files .as-restore-tree-level > li:nth-child(even) {' +
                'background:rgba(255,255,255,0.045);' +
                '}' +
                '#as-config-backup-table-wrapper_wrapper .dataTables_info, #as-config-backup-table-wrapper_wrapper .dataTables_paginate {' +
                'margin-top:10px;' +
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

    ensureRestoreSummaryModal() {
        if (this.$restoreSummaryModal.length > 0 && this.$restoreSummaryDetails.length > 0) {
            return true;
        }

        if ($('#as-config-backup-restore-summary-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-restore-summary-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-restore-summary-title">' +
                '<div class="modal-dialog modal-lg" role="document" style="max-width:900px; width:90%;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                '<h4 class="modal-title" id="as-config-backup-restore-summary-title"><i class="fa fa-check-circle text-success" style="margin-right:8px;"></i>Restore Completed</h4>' +
                '</div>' +
                '<div class="modal-body" id="as-config-backup-restore-summary-details"></div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-primary" data-dismiss="modal">Done</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        this.$restoreSummaryModal = $('#as-config-backup-restore-summary-modal');
        this.$restoreSummaryDetails = $('#as-config-backup-restore-summary-details');
        if (this.$restoreSummaryModal.length > 0 && this.$restoreSummaryModal.parent().get(0) !== document.body) {
            this.$restoreSummaryModal.detach().appendTo(document.body);
        }

        return this.$restoreSummaryModal.length > 0 && this.$restoreSummaryDetails.length > 0;
    }

    showRestoreSummaryModal(result) {
        if (!this.ensureRestoreSummaryModal()) {
            return;
        }
        const summary = (result && result.restoreSummary && typeof result.restoreSummary === 'object')
            ? result.restoreSummary
            : {};
        const backupType = String(summary.backupType || this.pendingRestoreType || 'config').toLowerCase();
        const mode = String(summary.mode || 'normal');
        const selectedSections = Array.isArray(summary.selectedSections) ? summary.selectedSections : [];
        const selectedImageFolders = Array.isArray(summary.selectedImageFolders) ? summary.selectedImageFolders : [];
        const selectedFiles = Array.isArray(summary.selectedFiles) ? summary.selectedFiles : [];
        const targetsRestored = Array.isArray(summary.targetsRestored) ? summary.targetsRestored : [];
        const warningText = String(summary.warning || result.warning || '').trim();
        const messageText = String((result && result.message) || 'Restore completed successfully.');
        const modeLabel = mode === 'advanced' ? 'Advanced' : 'Normal';
        const typeLabel = backupType === 'images' ? 'Images' : 'Config';
        const sectionItems = selectedSections.length
            ? selectedSections.map((item) => '<li class="list-group-item" style="padding:6px 10px;">' + this.escapeHtml(this.getSectionLabel(item)) + '</li>').join('')
            : '<li class="list-group-item text-muted" style="padding:6px 10px;">None recorded</li>';
        const folderItems = selectedImageFolders.length
            ? selectedImageFolders.map((item) => '<li class="list-group-item" style="padding:6px 10px;">' + this.escapeHtml(String(item)) + '</li>').join('')
            : '<li class="list-group-item text-muted" style="padding:6px 10px;">None selected</li>';
        const restoredFileItems = targetsRestored.length
            ? targetsRestored.map((item) => '<li class="list-group-item" style="padding:6px 10px; font-family:monospace;">' + this.escapeHtml(String(item)) + '</li>').join('')
            : '<li class="list-group-item text-muted" style="padding:6px 10px;">No files recorded.</li>';
        const imageFolderTargets = targetsRestored.filter((item) => /^images\/[^/]+$/.test(String(item || '')));
        const allImageTargetsAreFolders = targetsRestored.length > 0 && imageFolderTargets.length === targetsRestored.length;

        const metadataRows = [
            ['Backup File', String(summary.file || this.pendingRestoreFile || '')],
            ['Backup Type', typeLabel],
            ['Restore Mode', modeLabel],
            ['Version From', String(summary.backupVersionFrom || 'unknown')],
            ['Version To', String(summary.restoreVersionTo || 'unknown')],
            ['Targets Restored', String(targetsRestored.length)],
            ['Advanced Files Selected', String(selectedFiles.length)],
        ];

        if (backupType === 'config') {
            metadataRows.splice(5, 0,
                ['Camera From', String(summary.cameraFrom || 'unknown')],
                ['Camera To', String(summary.cameraTo || 'unknown')]
            );
        } else {
            metadataRows.splice(5, 0, ['Folders Restored', String(selectedImageFolders.length)]);
        }

        const metadataTable = metadataRows.map((row) => (
            '<tr>' +
            '<th style="width:36%; color:#666; font-weight:600;">' + this.escapeHtml(row[0]) + '</th>' +
            '<td>' + this.escapeHtml(row[1]) + '</td>' +
            '</tr>'
        )).join('');

        const logPath = String(summary.logPath || '');
        const logBlock = logPath !== ''
            ? '<div class="alert alert-info" style="margin-bottom:12px;"><strong>Restore log:</strong> ' + this.escapeHtml(logPath) + '</div>'
            : '';
        const warningBlock = warningText !== ''
            ? '<div class="alert alert-warning" style="margin-bottom:12px;"><strong>Warning:</strong> ' + this.escapeHtml(warningText) + '</div>'
            : '';

        let rightPanelTitle = 'Sections Restored';
        let rightPanelBody = '<ul class="list-group" style="margin-bottom:10px;">' + sectionItems + '</ul>' +
            '<div style="margin-bottom:6px; font-weight:600;">Files Restored <span class="badge">' + targetsRestored.length + '</span></div>' +
            '<div style="max-height:220px; overflow:auto;"><ul class="list-group" style="margin-bottom:0;">' + restoredFileItems + '</ul></div>';
        if (backupType === 'images') {
            if (allImageTargetsAreFolders) {
                rightPanelTitle = 'Image Folders Restored';
                rightPanelBody = '<div style="max-height:320px; overflow:auto;"><ul class="list-group" style="margin-bottom:0;">' +
                    imageFolderTargets.map((item) => '<li class="list-group-item" style="padding:6px 10px;">' + this.escapeHtml(String(item).replace(/^images\//, '')) + '</li>').join('') +
                    '</ul></div>';
            } else {
                rightPanelTitle = 'Image Files Restored';
                rightPanelBody = '<div style="max-height:340px; overflow:auto;"><ul class="list-group" style="margin-bottom:0;">' + restoredFileItems + '</ul></div>';
            }
        }

        this.$restoreSummaryDetails.html(
            '<div class="alert alert-success" style="margin-bottom:12px; font-size:14px;">' +
            '<strong>Restore finished successfully.</strong> ' + this.escapeHtml(messageText) +
            '</div>' +
            warningBlock +
            logBlock +
            '<div class="row">' +
            '<div class="col-sm-6" style="margin-bottom:12px;">' +
            '<div class="panel panel-default" style="margin-bottom:0;">' +
            '<div class="panel-heading" style="padding:8px 12px;"><strong>Restore Summary</strong></div>' +
            '<div class="panel-body" style="padding:8px 12px;">' +
            '<table class="table table-condensed" style="margin-bottom:0;">' + metadataTable + '</table>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="col-sm-6">' +
            '<div class="panel panel-default" style="margin-bottom:0;">' +
            '<div class="panel-heading" style="padding:8px 12px;"><strong>' + this.escapeHtml(rightPanelTitle) + '</strong></div>' +
            '<div class="panel-body" style="padding:8px 12px;">' + rightPanelBody + '</div>' +
            '</div>' +
            '</div>' +
            '</div>'
        );

        this.$restoreSummaryModal.modal('show');
    }

    ensureBackupProgressModal() {
        if (
            this.$backupProgressModal.length > 0 &&
            this.$backupProgressBar.length > 0 &&
            this.$backupProgressStatus.length > 0 &&
            this.$backupProgressSteps.length > 0 &&
            this.$backupProgressClose.length > 0 &&
            this.$backupProgressError.length > 0 &&
            this.$backupProgressWarning.length > 0
        ) {
            return true;
        }

        if ($('#as-config-backup-progress-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-progress-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-progress-title" data-backdrop="static" data-keyboard="false">' +
                '<div class="modal-dialog" role="document" style="max-width:680px; width:90%;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h4 class="modal-title" id="as-config-backup-progress-title">Creating Backup</h4>' +
                '</div>' +
                '<div class="modal-body">' +
                '<div id="as-config-backup-progress-status" style="margin-bottom:8px; font-weight:600;">Preparing...</div>' +
                '<div id="as-config-backup-progress-warning" class="alert alert-warning" style="display:none; margin-bottom:10px;">' +
                'Image backups can be slow because large image archives take longer to create.' +
                '</div>' +
                '<div class="progress" style="height:22px; margin-bottom:10px;">' +
                '<div id="as-config-backup-progress-bar" class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" style="width:0%;">0%</div>' +
                '</div>' +
                '<div id="as-config-backup-progress-error" class="alert alert-danger" style="display:none; margin-bottom:10px;"></div>' +
                '<ul id="as-config-backup-progress-steps" class="list-group" style="margin-bottom:0;"></ul>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" id="as-config-backup-progress-close" data-dismiss="modal" disabled>Close</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        this.$backupProgressModal = $('#as-config-backup-progress-modal');
        this.$backupProgressBar = $('#as-config-backup-progress-bar');
        this.$backupProgressStatus = $('#as-config-backup-progress-status');
        this.$backupProgressSteps = $('#as-config-backup-progress-steps');
        this.$backupProgressClose = $('#as-config-backup-progress-close');
        this.$backupProgressError = $('#as-config-backup-progress-error');
        this.$backupProgressWarning = $('#as-config-backup-progress-warning');

        if (this.$backupProgressModal.length > 0 && this.$backupProgressModal.parent().get(0) !== document.body) {
            this.$backupProgressModal.detach().appendTo(document.body);
        }

        return (
            this.$backupProgressModal.length > 0 &&
            this.$backupProgressBar.length > 0 &&
            this.$backupProgressStatus.length > 0 &&
            this.$backupProgressSteps.length > 0 &&
            this.$backupProgressClose.length > 0 &&
            this.$backupProgressError.length > 0 &&
            this.$backupProgressWarning.length > 0
        );
    }

    ensureRestoreProgressModal() {
        if (
            this.$restoreProgressModal.length > 0 &&
            this.$restoreProgressBar.length > 0 &&
            this.$restoreProgressStatus.length > 0 &&
            this.$restoreProgressSteps.length > 0 &&
            this.$restoreProgressClose.length > 0 &&
            this.$restoreProgressError.length > 0
        ) {
            return true;
        }

        if ($('#as-config-backup-restore-progress-modal').length === 0) {
            $('body').append(
                '<div class="modal fade" id="as-config-backup-restore-progress-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-restore-progress-title" data-backdrop="static" data-keyboard="false">' +
                '<div class="modal-dialog" role="document" style="max-width:680px; width:90%;">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h4 class="modal-title" id="as-config-backup-restore-progress-title">Restoring Backup</h4>' +
                '</div>' +
                '<div class="modal-body">' +
                '<div id="as-config-backup-restore-progress-status" style="margin-bottom:8px; font-weight:600;">Preparing...</div>' +
                '<div class="progress" style="height:22px; margin-bottom:10px;">' +
                '<div id="as-config-backup-restore-progress-bar" class="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" style="width:0%;">0%</div>' +
                '</div>' +
                '<div id="as-config-backup-restore-progress-error" class="alert alert-danger" style="display:none; margin-bottom:10px;"></div>' +
                '<ul id="as-config-backup-restore-progress-steps" class="list-group" style="margin-bottom:0;"></ul>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-default" id="as-config-backup-restore-progress-close" data-dismiss="modal" disabled>Close</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            );
        }

        this.$restoreProgressModal = $('#as-config-backup-restore-progress-modal');
        this.$restoreProgressBar = $('#as-config-backup-restore-progress-bar');
        this.$restoreProgressStatus = $('#as-config-backup-restore-progress-status');
        this.$restoreProgressSteps = $('#as-config-backup-restore-progress-steps');
        this.$restoreProgressClose = $('#as-config-backup-restore-progress-close');
        this.$restoreProgressError = $('#as-config-backup-restore-progress-error');

        if (this.$restoreProgressModal.length > 0 && this.$restoreProgressModal.parent().get(0) !== document.body) {
            this.$restoreProgressModal.detach().appendTo(document.body);
        }

        return (
            this.$restoreProgressModal.length > 0 &&
            this.$restoreProgressBar.length > 0 &&
            this.$restoreProgressStatus.length > 0 &&
            this.$restoreProgressSteps.length > 0 &&
            this.$restoreProgressClose.length > 0 &&
            this.$restoreProgressError.length > 0
        );
    }

    getRestoreProgressStepLabels(backupType) {
        const type = String(backupType || 'config').toLowerCase();
        if (type === 'images') {
            return ['Validating restore options', 'Extracting selected folders', 'Applying file ownership and permissions', 'Finalising restore'];
        }
        return ['Validating restore options', 'Restoring configuration files', 'Applying file ownership and permissions', 'Finalising restore'];
    }

    renderRestoreProgressSteps(stepLabels) {
        this.$restoreProgressSteps.html(
            (stepLabels || []).map((label, idx) =>
                '<li class="list-group-item" data-step-index="' + idx + '">' +
                '<i class="fa fa-circle-o text-muted" style="display:inline-block; width:18px; text-align:center; margin-right:8px;"></i>' +
                this.escapeHtml(label) +
                '</li>'
            ).join('')
        );
    }

    updateRestoreProgress(percent, currentStepIdx, statusText) {
        const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        const safeStep = Math.max(0, Number(currentStepIdx) || 0);
        this.restoreProgressPercent = safePercent;
        this.$restoreProgressBar.css('width', safePercent + '%').text(safePercent + '%');
        this.$restoreProgressStatus.text(statusText || 'Restoring backup...');

        this.$restoreProgressSteps.find('li').each((_, el) => {
            const $row = $(el);
            const idx = Number($row.data('step-index'));
            const $icon = $row.find('i.fa');
            $row.removeClass('list-group-item-success list-group-item-info');
            $icon.removeClass('fa-check-circle text-success fa-spinner fa-spin text-info fa-circle-o text-muted');
            if (idx < safeStep) {
                $row.addClass('list-group-item-success');
                $icon.addClass('fa-check-circle text-success');
            } else if (idx === safeStep) {
                $row.addClass('list-group-item-info');
                $icon.addClass('fa-spinner fa-spin text-info');
            } else {
                $icon.addClass('fa-circle-o text-muted');
            }
        });
    }

    startRestoreProgressSimulation(backupType) {
        this.stopRestoreProgressSimulation();
        const steps = this.getRestoreProgressStepLabels(backupType);
        const type = String(backupType || 'config').toLowerCase();
        if (type === 'images') {
            this.updateRestoreProgress(15, 0, steps[0] + '...');
            this.restoreProgressTimer = setTimeout(() => {
                this.updateRestoreProgress(55, 1, steps[1] + '...');
            }, 800);
            return;
        }
        this.updateRestoreProgress(20, 0, steps[0] + '...');
    }

    stopRestoreProgressSimulation() {
        if (this.restoreProgressTimer) {
            clearTimeout(this.restoreProgressTimer);
            this.restoreProgressTimer = null;
        }
    }

    showRestoreProgressModal(backupType) {
        if (!this.ensureRestoreProgressModal()) {
            return false;
        }
        const steps = this.getRestoreProgressStepLabels(backupType);
        this.renderRestoreProgressSteps(steps);
        this.$restoreProgressError.hide().text('');
        this.$restoreProgressClose.prop('disabled', true);
        this.$restoreProgressBar
            .removeClass('progress-bar-danger progress-bar-success')
            .addClass('progress-bar-info progress-bar-striped active');
        this.$restoreProgressModal.modal('show');
        this.startRestoreProgressSimulation(backupType);
        return true;
    }

    getBackupProgressStepLabels(willStopAllskyService) {
        if (willStopAllskyService) {
            return ['Stopping Allsky service', 'Creating backup archive', 'Starting Allsky service', 'Finalising backup'];
        }
        return ['Creating backup archive', 'Finalising backup'];
    }

    renderBackupProgressSteps(stepLabels) {
        this.$backupProgressSteps.html(
            (stepLabels || []).map((label, idx) =>
                '<li class="list-group-item" data-step-index="' + idx + '">' +
                '<i class="fa fa-circle-o text-muted" style="margin-right:8px;"></i>' +
                this.escapeHtml(label) +
                '</li>'
            ).join('')
        );
    }

    updateBackupProgress(percent, currentStepIdx, statusText) {
        const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        const safeStep = Math.max(0, Number(currentStepIdx) || 0);
        this.progressPercent = safePercent;
        this.$backupProgressBar.css('width', safePercent + '%').text(safePercent + '%');
        this.$backupProgressStatus.text(statusText || 'Creating backup...');

        this.$backupProgressSteps.find('li').each((_, el) => {
            const $row = $(el);
            const idx = Number($row.data('step-index'));
            const $icon = $row.find('i.fa');
            $row.removeClass('list-group-item-success list-group-item-info');
            $icon.removeClass('fa-check-circle text-success fa-spinner fa-spin text-info fa-circle-o text-muted');
            if (idx < safeStep) {
                $row.addClass('list-group-item-success');
                $icon.addClass('fa-check-circle text-success');
            } else if (idx === safeStep) {
                $row.addClass('list-group-item-info');
                $icon.addClass('fa-spinner fa-spin text-info');
            } else {
                $icon.addClass('fa-circle-o text-muted');
            }
        });
    }

    startBackupProgressSimulation(willStopAllskyService, backupType) {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        const stepLabels = this.getBackupProgressStepLabels(willStopAllskyService);
        const stepCount = Math.max(1, stepLabels.length);
        const type = String(backupType || 'config').toLowerCase();

        // For image backups, keep progress on archive creation until completion.
        if (type === 'images') {
            this.updateBackupProgress(50, 0, stepLabels[0] + '...');
            return;
        }

        let currentStep = 0;
        const stepPercent = Math.max(1, Math.floor(100 / stepCount));

        this.updateBackupProgress(stepPercent, currentStep, stepLabels[currentStep] + '...');
        this.progressTimer = setInterval(() => {
            if (currentStep >= stepCount - 1) {
                return;
            }
            currentStep += 1;
            const percent = Math.min(95, (currentStep + 1) * stepPercent);
            this.updateBackupProgress(percent, currentStep, stepLabels[currentStep] + '...');
        }, 1200);
    }

    stopBackupProgressSimulation() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
    }

    showBackupProgressModal(willStopAllskyService, backupType) {
        if (!this.ensureBackupProgressModal()) {
            return false;
        }
        const type = String(backupType || 'config').toLowerCase();
        const steps = this.getBackupProgressStepLabels(willStopAllskyService);
        this.renderBackupProgressSteps(steps);
        this.$backupProgressError.hide().text('');
        if (type === 'images') {
            this.$backupProgressWarning.show();
        } else {
            this.$backupProgressWarning.hide();
        }
        this.$backupProgressClose.prop('disabled', true);
        this.$backupProgressBar
            .removeClass('progress-bar-danger progress-bar-success')
            .addClass('progress-bar-info progress-bar-striped active');
        this.$backupProgressModal.modal('show');
        this.startBackupProgressSimulation(willStopAllskyService, backupType);
        return true;
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

    getSectionLabel(sectionKey) {
        const key = String(sectionKey || '').trim();
        if (key === '') {
            return '';
        }
        if (key === 'core') {
            return 'Core Files';
        }
        if (key === 'images') {
            return 'Images Folder';
        }

        const optionalTargets = (this.lastStatus && this.lastStatus.optionalTargets && typeof this.lastStatus.optionalTargets === 'object')
            ? this.lastStatus.optionalTargets
            : {};
        const optionalMeta = optionalTargets[key];
        if (optionalMeta && typeof optionalMeta === 'object') {
            const shortDescription = String(optionalMeta.shortdescription || '').trim();
            if (shortDescription !== '') {
                return shortDescription;
            }
            const description = String(optionalMeta.description || '').trim();
            if (description !== '') {
                return description;
            }
        }

        return key.charAt(0).toUpperCase() + key.slice(1);
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
            const backupType = (backup.backupType || 'config').toLowerCase();
            const typeLabel = backupType === 'images' ? 'Images' : 'Config';
            const created = backup.created || 'Unknown';
            const version = backup.version || 'unknown';
            const cameraType = backupType === 'images' ? 'N/A' : (backup.cameratype || 'unknown');
            const cameraModel = backupType === 'images' ? 'N/A' : (backup.cameramodel || 'unknown');
            const size = this.formatBytes(backup.sizeBytes);

            this.$table.append(
                '<tr data-backup-file="' + this.escapeHtml(name) + '">' +
                '<td class="text-left">' + this.escapeHtml(created) + '</td>' +
                '<td>' + this.escapeHtml(typeLabel) + '</td>' +
                '<td>' + this.escapeHtml(version) + '</td>' +
                '<td>' + this.escapeHtml(cameraType) + '</td>' +
                '<td>' + this.escapeHtml(cameraModel) + '</td>' +
                '<td class="text-right">' + this.escapeHtml(size) + '</td>' +
                '<td class="text-right">' +
                '<button type="button" class="btn btn-default as-config-backup-info-row" data-file="' + this.escapeHtml(name) + '" title="Info" aria-label="Info">' +
                '<i class="fa fa-info-circle"></i></button> ' +
                '<button type="button" class="btn btn-info as-config-backup-download-row" data-file="' + this.escapeHtml(name) + '" title="Download" aria-label="Download">' +
                '<i class="fa fa-download"></i></button> ' +
                '<button type="button" class="btn btn-warning as-config-backup-restore-row" data-file="' + this.escapeHtml(name) + '" title="Restore" aria-label="Restore">' +
                '<i class="fa fa-upload"></i></button> ' +
                '<button type="button" class="btn btn-danger as-config-backup-delete-row" data-file="' + this.escapeHtml(name) + '" title="Delete" aria-label="Delete">' +
                '<i class="fa fa-trash"></i></button>' +
                '</td>' +
                '</tr>'
            );
        });

        if ($.fn.DataTable) {
            const dataTableOptions = {
                order: [[1, 'asc'], [0, 'desc']],
                pageLength: 10,
                lengthChange: false,
                autoWidth: false,
                dom: "<'row'<'col-sm-12'tr>><'as-backups-table-gap'><'row'<'col-sm-5'i><'col-sm-7 text-right'p>>",
                searching: false,
                bFilter: false,
                columnDefs: [
                    { width: '20%', className: 'dt-left', type: 'string', targets: 0 }, // Backup Date/Time
                    { width: '8%', targets: 1 }, // Type
                    { width: '10%', targets: 2 }, // Version
                    { width: '10%', targets: 3 }, // Camera Type
                    { width: '14%', targets: 4 }, // Camera Model
                    { width: '10%', className: 'text-right', targets: 5 }, // Size
                    { width: '18%', className: 'text-right', orderable: false, targets: 6 } // Actions
                ],
                destroy: true
            };

            if ($.fn.dataTable && $.fn.dataTable.RowGroup) {
                dataTableOptions.rowGroup = {
                    dataSrc: 1,
                    startRender: function (rows, group) {
                        return $('<span/>')
                            .addClass('text-primary')
                            .css('font-weight', '600')
                            .text(group + ' Backups (' + rows.count() + ')');
                    }
                };
            }

            this.$tableWrapper.DataTable(dataTableOptions);
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
        const configSectionStats = (status && status.configSectionStats && typeof status.configSectionStats === 'object')
            ? status.configSectionStats
            : {};
        const coreConfigStats = (configSectionStats && configSectionStats.core && typeof configSectionStats.core === 'object')
            ? configSectionStats.core
            : { sizeBytes: 0, estimatedCompressedBytes: 0 };
        const optionalConfigStats = (configSectionStats && configSectionStats.optional && typeof configSectionStats.optional === 'object')
            ? configSectionStats.optional
            : {};
        const optionalKeys = Object.keys(optionalTargets);
        let imageFolders = (status && Array.isArray(status.imagesFolders)) ? status.imagesFolders : [];
        const imageFolderStats = (status && Array.isArray(status.imagesFolderStats)) ? status.imagesFolderStats : [];
        const imagesTotalSizeBytes = Number(status.imagesTotalSizeBytes || 0);
        const imagesTotalEstimatedCompressedBytes = Number(status.imagesTotalEstimatedCompressedBytes || 0);
        const folderStatsByName = {};
        imageFolderStats.forEach((item) => {
            const name = String((item && item.name) || '').trim();
            if (name === '') {
                return;
            }
            folderStatsByName[name] = {
                sizeBytes: Number(item.sizeBytes || 0),
                estimatedCompressedBytes: Number(item.estimatedCompressedBytes || 0)
            };
        });
        if (imageFolders.length === 0 && imageFolderStats.length > 0) {
            imageFolders = imageFolderStats.map((item) => String((item && item.name) || '').trim()).filter((name) => name !== '');
        }

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
            '<div class="text-muted" style="margin-top:2px; font-size:12px;">' +
            this.escapeHtml(this.formatBytes(Number(coreConfigStats.sizeBytes || 0))) +
            ' (est. ' + this.escapeHtml(this.formatBytes(Number(coreConfigStats.estimatedCompressedBytes || 0))) + ')' +
            '</div>',
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
            const keyStats = (optionalConfigStats && optionalConfigStats[key] && typeof optionalConfigStats[key] === 'object')
                ? optionalConfigStats[key]
                : { sizeBytes: 0, estimatedCompressedBytes: 0 };
            const inputId = 'as-config-backup-option-' + key.replace(/[^a-zA-Z0-9_-]/g, '_');
            return [
                '<div class="row" style="margin:0; padding:8px 0;">',
                '<div class="col-xs-9">',
                '<strong>' + this.escapeHtml(shortDescription) + '</strong>',
                '<div class="text-muted" style="margin-top:4px;">' + this.escapeHtml(description) + '</div>',
                '<div class="text-muted" style="margin-top:2px; font-size:12px;">' +
                this.escapeHtml(this.formatBytes(Number(keyStats.sizeBytes || 0))) +
                ' (est. ' + this.escapeHtml(this.formatBytes(Number(keyStats.estimatedCompressedBytes || 0))) + ')' +
                '</div>',
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
            '<div>' +
            typeSelector +
            '<div id="as-config-backup-options-config">' +
            coreRow +
            optionalRows +
            '</div>' +
            '<div id="as-config-backup-options-images" style="display:none;">' +
            '<div class="panel panel-default" style="margin-bottom:10px;">' +
            '<div class="panel-heading" style="padding:8px 12px;"><strong>Images Selection</strong></div>' +
            '<div class="panel-body" style="padding:10px 12px;">' +
            '<div id="as-images-size-summary" class="well well-sm" style="margin-top:0; margin-bottom:10px;">' +
            '<strong>Total Selected:</strong> <span id="as-images-size-total">0 B</span>' +
            '<span class="text-muted"> (estimated compressed: <span id="as-images-size-estimate">0 B</span>)</span>' +
            '</div>' +
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
                    (() => {
                        const stat = folderStatsByName[folder] || { sizeBytes: 0, estimatedCompressedBytes: 0 };
                        const sizeLabel = this.formatBytes(stat.sizeBytes);
                        const estimateLabel = this.formatBytes(stat.estimatedCompressedBytes);
                        return (
                    '<div class="col-sm-6" style="padding:0 8px 8px 0;">' +
                    '<div class="row" style="margin:0;">' +
                    '<div class="col-sm-8" style="padding-left:0; padding-right:4px;">' +
                    '<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + this.escapeHtml(folder) + '</div>' +
                    '<div class="text-muted" style="font-size:12px;">' + this.escapeHtml(sizeLabel) + ' (est. ' + this.escapeHtml(estimateLabel) + ')</div>' +
                    '</div>' +
                    '<div class="col-sm-2" style="padding-left:0; padding-right:0;">' +
                    '<div class="checkbox" style="margin:0;">' +
                    '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
                    '<input type="checkbox" class="as-images-folder" data-folder="' + this.escapeHtml(folder) + '" autocomplete="off">' +
                    '<span class="el-switch-style"></span>' +
                    '</label>' +
                    '</div>' +
                    '</div>' +
                    '<div class="col-sm-7"></div>' +
                    '</div>' +
                    '</div>'
                        );
                    })()
                ).join('') + '</div>')
                : '<div class="text-muted">No image subfolders found.</div>') +
            '</div>' +
            '<div class="text-muted" style="margin-top:8px;">Select specific folders, or keep "Backup all folders" enabled.</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
        const updateImagesSizeSummary = () => {
            const allChecked = !!this.$createModalDetails.find('#as-images-backup-all').prop('checked');
            let totalRaw = 0;
            let totalEstimated = 0;

            if (allChecked) {
                totalRaw = imagesTotalSizeBytes;
                totalEstimated = imagesTotalEstimatedCompressedBytes;
            } else {
                this.$createModalDetails.find('.as-images-folder:checked').each((_, el) => {
                    const name = String($(el).data('folder') || '');
                    const stat = folderStatsByName[name] || { sizeBytes: 0, estimatedCompressedBytes: 0 };
                    totalRaw += Number(stat.sizeBytes || 0);
                    totalEstimated += Number(stat.estimatedCompressedBytes || 0);
                });
            }

            this.$createModalDetails.find('#as-images-size-total').text(this.formatBytes(totalRaw));
            this.$createModalDetails.find('#as-images-size-estimate').text(this.formatBytes(totalEstimated));
        };

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
            if (allChecked) {
                this.$createModalDetails.find('.as-images-folder').prop('checked', false);
            }
            updateImagesSizeSummary();
        });
        this.$createModalDetails.off('change.imagesfolder').on('change.imagesfolder', '.as-images-folder', () => {
            const anyFolderChecked = this.$createModalDetails.find('.as-images-folder:checked').length > 0;
            if (anyFolderChecked) {
                this.$createModalDetails.find('#as-images-backup-all').prop('checked', false);
            }
            updateImagesSizeSummary();
        });
        this.$createModalDetails.find('#as-images-backup-all').trigger('change');
        updateImagesSizeSummary();
        this.$createConfirm.prop('disabled', false);
        this.$createModal.modal('show');
    }

    createBackup(backupType, optionalTargetKeys, backupAllImages, selectedImageFolders, willStopAllskyService) {
        this.hideMessage();
        this.$createButton.prop('disabled', true);
        if (this.$createConfirm.length > 0) {
            this.$createConfirm.prop('disabled', true);
        }
        const stopFlow = !!willStopAllskyService;
        if (this.$createModal.length > 0) {
            this.$createModal.modal('hide');
        }
        this.showBackupProgressModal(stopFlow, backupType);

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
            this.stopBackupProgressSimulation();
            this.$backupProgressBar
                .removeClass('progress-bar-info progress-bar-danger progress-bar-striped active')
                .addClass('progress-bar-success');
            const doneStepIdx = Math.max(0, this.$backupProgressSteps.find('li').length - 1);
            this.updateBackupProgress(100, doneStepIdx, 'Backup complete.');
            this.$backupProgressSteps.find('li').each((_, el) => {
                const $row = $(el);
                const $icon = $row.find('i.fa');
                $row.removeClass('list-group-item-info').addClass('list-group-item-success');
                $icon.removeClass('fa-spinner fa-spin text-info fa-circle-o text-muted').addClass('fa-check-circle text-success');
            });
            this.$backupProgressClose.prop('disabled', false);

            if (this.$createModal.length > 0) {
                this.$createModal.modal('hide');
            }
            this.loadStatus();
            let msg = (result && result.message) ? result.message : 'Backup created.';
            if (result && Array.isArray(result.steps) && result.steps.length > 0) {
                msg += ' Steps: ' + result.steps.join(' -> ') + '.';
            }
            if (result && result.warning) msg += ' ' + result.warning;
            this.showMessage((result && result.warning) ? 'warning' : 'success', msg, 5000);
            setTimeout(() => {
                if (this.$backupProgressModal.length > 0) {
                    this.$backupProgressModal.modal('hide');
                }
            }, 800);
        }).fail((xhr) => {
            this.stopBackupProgressSimulation();
            this.$backupProgressBar
                .removeClass('progress-bar-info progress-bar-success progress-bar-striped active')
                .addClass('progress-bar-danger');
            const failStepIdx = Math.max(0, this.$backupProgressSteps.find('li.list-group-item-info').data('step-index') || 0);
            this.updateBackupProgress(this.progressPercent || 5, failStepIdx, 'Backup failed.');
            this.$backupProgressClose.prop('disabled', false);

            let msg = 'Backup failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            } else if (xhr && xhr.responseText) {
                const text = String(xhr.responseText).trim();
                if (text !== '') {
                    msg = text;
                }
            }
            if (this.$backupProgressError.length > 0) {
                this.$backupProgressError.text(msg).show();
            }
            this.showMessage('danger', msg);
        }).always(() => {
            this.$createButton.prop('disabled', false);
            if (this.$createConfirm.length > 0) {
                this.$createConfirm.prop('disabled', false);
            }
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
        this.pendingRestoreType = 'config';
        this.selectedRestoreImageFolders = [];
        this.selectedRestoreFiles = [];
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
            this.pendingRestoreType = backupType;
            const imageFolders = Array.isArray(backup.imageFolders) ? backup.imageFolders : [];
            const imageBackupAll = !!backup.imageBackupAll;
            const requiredModules = Array.isArray(result.requiredModules) ? result.requiredModules : [];
            const coreModules = Array.isArray(result.coreModules) ? result.coreModules : [];
            const userModules = Array.isArray(result.userModules) ? result.userModules : [];
            const missingModules = Array.isArray(result.missingModules) ? result.missingModules : [];
            const backupHasModules = !!(result && result.backupHasModules);
            const backupModules = Array.isArray(result.backupModules) ? result.backupModules : [];
            const backupFiles = Array.isArray(result.backupFiles) ? result.backupFiles : [];
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

                if (backupType === 'images') {
                    return '<div style="margin-bottom:4px;">' + this.escapeHtml(label) + '</div>';
                }

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
                '<ul class="nav nav-tabs" style="margin-bottom:12px;">',
                '<li class="active"><a href="#as-restore-tab-normal" data-toggle="tab">Normal</a></li>',
                '<li><a href="#as-restore-tab-advanced" data-toggle="tab">Advanced</a></li>',
                '</ul>',
                '<div class="tab-content">',
                '<div class="tab-pane fade in active" id="as-restore-tab-normal">',
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
                '</div>',
                '</div>',
                '<div class="tab-pane fade" id="as-restore-tab-advanced">',
                '<div class="panel panel-default" style="margin-bottom:0;">',
                '<div class="panel-heading" style="padding:8px 12px;">',
                '<strong>Advanced File Restore</strong>',
                '</div>',
                '<div class="panel-body" style="padding:8px 12px;">',
                '<div class="row" style="margin-bottom:8px;">' +
                '<div class="col-xs-12 col-sm-7 text-muted" style="padding-top:6px;">Select individual files to restore.</div>' +
                '<div class="col-xs-12 col-sm-5 text-right" style="margin-top:6px;">' +
                '<button type="button" class="btn btn-default btn-sm" id="as-restore-files-all">Select all</button> ' +
                '<button type="button" class="btn btn-default btn-sm" id="as-restore-files-none">Select none</button>' +
                '</div>' +
                '</div>',
                '<div style="margin-bottom:8px;">' +
                '<input type="text" class="form-control input-sm" id="as-restore-file-search" placeholder="Search files and folders...">' +
                '</div>',
                '<div id="as-restore-advanced-files"></div>',
                '</div>',
                '</div>',
                '</div>',
                '</div>'
            ].join('');
            this.$restoreModalDetails.html(detailsHtml);

            const renderAdvancedFilesTree = (paths) => {
                const safePaths = (Array.isArray(paths) ? paths : []).map((p) => String(p || '').replace(/^\/+/, '')).filter((p) => p !== '');
                if (!safePaths.length) {
                    return '<div class="text-muted">No file list available in backup metadata.</div>';
                }

                const root = { dirs: {}, files: [] };
                safePaths.forEach((path) => {
                    const parts = path.split('/').filter((p) => p !== '');
                    if (!parts.length) return;
                    let node = root;
                    for (let i = 0; i < parts.length - 1; i += 1) {
                        const d = parts[i];
                        if (!node.dirs[d]) {
                            node.dirs[d] = { dirs: {}, files: [] };
                        }
                        node = node.dirs[d];
                    }
                    node.files.push(parts[parts.length - 1]);
                });

                let nodeCounter = 0;
                const renderNode = (node, prefix, level, rootLevel) => {
                    const dirNames = Object.keys(node.dirs).sort((a, b) => a.localeCompare(b));
                    const files = node.files.slice().sort((a, b) => a.localeCompare(b));
                    let html = '<ul class="list-unstyled as-restore-tree-level" style="margin-bottom:0;' + (rootLevel ? '' : ' margin-left:18px;') + '">';

                    dirNames.forEach((dirName) => {
                        const nextPrefix = prefix ? (prefix + '/' + dirName) : dirName;
                        const nodeId = 'as-restore-dir-' + (nodeCounter++);
                        const isExpanded = (level === 0);
                        html += '<li class="as-restore-dir-item" data-node-id="' + this.escapeHtml(nodeId) + '" data-dir-path="' + this.escapeHtml(nextPrefix) + '" style="margin:2px 0;">' +
                            '<div class="as-restore-dir-header" style="display:flex; align-items:center; min-height:28px; justify-content:space-between; width:100%;">' +
                            '<div style="min-width:0; padding-right:8px;">' +
                            '<a href="#" class="as-restore-dir-toggle text-muted" data-node-id="' + this.escapeHtml(nodeId) + '" style="display:inline-block; width:14px; text-align:center; margin-right:4px;"><i class="fa ' + (isExpanded ? 'fa-caret-down' : 'fa-caret-right') + '"></i></a>' +
                            '<i class="fa fa-folder-o text-muted" style="width:18px; text-align:center; margin-right:6px;"></i><strong>' + this.escapeHtml(dirName) + '</strong>' +
                            '</div>' +
                            '<div>' +
                            '<div class="checkbox" style="margin:0;">' +
                            '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
                            '<input type="checkbox" class="as-restore-folder" data-node-id="' + this.escapeHtml(nodeId) + '" checked>' +
                            '<span class="el-switch-style"></span>' +
                            '</label>' +
                            '</div>' +
                            '</div>' +
                            '</div>' +
                            '<div class="as-restore-dir-children" data-node-id="' + this.escapeHtml(nodeId) + '" style="display:' + (isExpanded ? 'block' : 'none') + ';">' +
                            renderNode(node.dirs[dirName], nextPrefix, level + 1, false) +
                            '</div>' +
                            '</li>';
                    });

                    files.forEach((fileName) => {
                        const fullPath = prefix ? (prefix + '/' + fileName) : fileName;
                        html += '<li class="as-restore-file-item" data-file-path="' + this.escapeHtml(fullPath) + '" style="margin:2px 0;">' +
                            '<div style="display:flex; align-items:center; min-height:28px; justify-content:space-between; width:100%;">' +
                            '<div style="min-width:0; padding-right:8px;">' +
                            '<i class="fa fa-file-o text-muted" style="width:18px; text-align:center; margin-right:6px;"></i>' +
                            '<span class="as-restore-file-name" data-file-name="' + this.escapeHtml(fileName) + '">' + this.escapeHtml(fileName) + '</span>' +
                            '</div>' +
                            '<div>' +
                            '<div class="checkbox" style="margin:0;">' +
                            '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
                            '<input type="checkbox" class="as-restore-file" data-file="' + this.escapeHtml(fullPath) + '" checked>' +
                            '<span class="el-switch-style"></span>' +
                            '</label>' +
                            '</div>' +
                            '</div>' +
                            '</div>' +
                            '</li>';
                    });

                    html += '</ul>';
                    return html;
                };

                return '<div style="max-height:420px; overflow:auto;">' + renderNode(root, '', 0, true) + '</div>';
            };
            $('#as-restore-advanced-files').html(renderAdvancedFilesTree(backupFiles));

            const setDirExpanded = (nodeId, expanded) => {
                const $toggle = this.$restoreModalDetails.find('.as-restore-dir-toggle[data-node-id="' + nodeId + '"]');
                const $children = this.$restoreModalDetails.find('.as-restore-dir-children[data-node-id="' + nodeId + '"]');
                if ($toggle.length === 0 || $children.length === 0) {
                    return;
                }
                $children.toggle(!!expanded);
                const $icon = $toggle.find('i.fa');
                if (expanded) {
                    $icon.removeClass('fa-caret-right').addClass('fa-caret-down');
                } else {
                    $icon.removeClass('fa-caret-down').addClass('fa-caret-right');
                }
            };

            const updateFolderCheckedFromChildren = ($dirItem) => {
                if ($dirItem.length === 0) {
                    return;
                }
                const $childrenContainer = $dirItem.children('.as-restore-dir-children');
                const $folderCheckbox = $dirItem.find('> .as-restore-dir-header .as-restore-folder');
                if ($childrenContainer.length === 0 || $folderCheckbox.length === 0) {
                    return;
                }
                const hasUncheckedChild = $childrenContainer.find('.as-restore-file:not(:checked), .as-restore-folder:not(:checked)').length > 0;
                $folderCheckbox.prop('checked', !hasUncheckedChild);
            };

            const updateAncestorFolderStates = ($fromDirItem) => {
                updateFolderCheckedFromChildren($fromDirItem);
                let $parentDir = $fromDirItem.parents('.as-restore-dir-item').first();
                while ($parentDir.length > 0) {
                    updateFolderCheckedFromChildren($parentDir);
                    $parentDir = $parentDir.parents('.as-restore-dir-item').first();
                }
            };

            const refreshAllFolderStates = () => {
                const $items = this.$restoreModalDetails.find('.as-restore-dir-item').get().reverse();
                $items.forEach((el) => {
                    updateFolderCheckedFromChildren($(el));
                });
            };

            const applyAdvancedSearch = () => {
                const term = String(this.$restoreModalDetails.find('#as-restore-file-search').val() || '').toLowerCase().trim();
                const $fileItems = this.$restoreModalDetails.find('.as-restore-file-item');
                const $dirItems = this.$restoreModalDetails.find('.as-restore-dir-item');
                const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const highlightName = ($item, rawName, query) => {
                    const $name = $item.find('.as-restore-file-name');
                    if ($name.length === 0) return;
                    if (!query) {
                        $name.text(rawName);
                        return;
                    }
                    const re = new RegExp('(' + escapeRegExp(query) + ')', 'ig');
                    const safeHtml = this.escapeHtml(rawName);
                    const highlighted = safeHtml.replace(re, '<mark style="padding:0 2px; background:#f9e79f; color:#222;">$1</mark>');
                    $name.html(highlighted);
                };

                $fileItems.show();
                $dirItems.show();
                $fileItems.each((_, el) => {
                    const $file = $(el);
                    const rawName = String($file.find('.as-restore-file-name').data('file-name') || '');
                    highlightName($file, rawName, '');
                });

                if (term === '') {
                    return;
                }

                $fileItems.hide();
                $dirItems.hide();
                this.$restoreModalDetails.find('.as-restore-dir-children').hide();
                this.$restoreModalDetails.find('.as-restore-dir-toggle i.fa').removeClass('fa-caret-down').addClass('fa-caret-right');

                $fileItems.each((_, el) => {
                    const $file = $(el);
                    const path = String($file.data('file-path') || '').toLowerCase();
                    const rawName = String($file.find('.as-restore-file-name').data('file-name') || '');
                    if (path.indexOf(term) === -1) {
                        highlightName($file, rawName, '');
                        return;
                    }
                    highlightName($file, rawName, term);
                    $file.show();
                    $file.parents('.as-restore-dir-item').each((__, dirEl) => {
                        const $dir = $(dirEl);
                        $dir.show();
                        const nodeId = String($dir.data('node-id') || '');
                        if (nodeId !== '') {
                            setDirExpanded(nodeId, true);
                        }
                    });
                });
            };

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
                const advancedActive = this.$restoreModalDetails.find('a[href="#as-restore-tab-advanced"]').parent().hasClass('active');
                if (advancedActive) {
                    const selectedFiles = [];
                    this.$restoreModalDetails.find('.as-restore-file:checked').each((_, el) => {
                        selectedFiles.push(String($(el).data('file') || ''));
                    });
                    this.selectedRestoreFiles = selectedFiles;
                    this.selectedRestoreSections = [];
                    this.selectedRestoreImageFolders = [];

                    if (selectedFiles.length > 0) {
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

                this.selectedRestoreFiles = [];
                const selectedKeys = (backupType === 'images')
                    ? ['images']
                    : [];
                if (backupType !== 'images') {
                    this.$restoreModalDetails.find('.as-restore-section:checked').each((_, el) => {
                        selectedKeys.push($(el).data('section-key'));
                    });
                }
                this.selectedRestoreSections = selectedKeys;

                if (backupType === 'images') {
                    const selectedFolders = [];
                    this.$restoreModalDetails.find('.as-restore-image-folder:checked').each((_, el) => {
                        selectedFolders.push(String($(el).data('folder') || ''));
                    });
                    const hasExistingFolderInputs = this.$restoreModalDetails.find('.as-restore-image-folder').length > 0;
                    const effectiveSelectedFolders = (!hasExistingFolderInputs && imageFolders.length > 0)
                        ? imageFolders.slice()
                        : selectedFolders;
                    this.selectedRestoreImageFolders = effectiveSelectedFolders;
                    const hasFolderSelection = imageFolders.length === 0 ? true : effectiveSelectedFolders.length > 0;
                    const checks = [
                        imagesPresentCheck,
                        {
                            name: 'Image folders selected',
                            passed: hasFolderSelection,
                            detail: hasFolderSelection
                                ? (imageFolders.length ? (effectiveSelectedFolders.length + ' folder(s) selected.') : 'No folder list recorded; all images content will be restored.')
                                : 'Select at least one folder to restore.',
                        },
                    ];
                    const canRestoreNow = !!imagesPresentCheck.passed && hasFolderSelection;
                    renderChecks(checks);
                    $('#as-config-backup-module-panel-title').text('Images Restore');
                    const folderListHtml = imageFolders.length
                        ? imageFolders.map((f) => (
                            '<li class="list-group-item">' +
                            '<div class="row">' +
                            '<div class="col-xs-9" style="padding-top:4px;">' + this.escapeHtml(f) + '</div>' +
                            '<div class="col-xs-3 text-right">' +
                            '<div class="checkbox" style="margin:0;">' +
                            '<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">' +
                            '<input type="checkbox" class="as-restore-image-folder" data-folder="' + this.escapeHtml(f) + '"' + (effectiveSelectedFolders.indexOf(f) !== -1 ? ' checked' : '') + '>' +
                            '<span class="el-switch-style"></span>' +
                            '</label>' +
                            '</div>' +
                            '</div>' +
                            '</div>' +
                            '</li>'
                        )).join('')
                        : '<li class="list-group-item text-muted">No folder list recorded.</li>';
                    $('#as-config-backup-module-panel-count').text(String(imageFolders.length || 0));
                    $('#as-config-backup-module-panel-body').html(
                        '<div class="text-muted" style="margin-bottom:8px;">Select folders to restore:</div>' +
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
            this.$restoreModalDetails.off('change.restoreFolders').on('change.restoreFolders', '.as-restore-image-folder', () => {
                updateForSelection();
            });
            this.$restoreModalDetails.off('change.restoreFiles').on('change.restoreFiles', '.as-restore-file', (e) => {
                const $dir = $(e.currentTarget).closest('.as-restore-dir-item');
                if ($dir.length > 0) {
                    updateAncestorFolderStates($dir);
                } else {
                    refreshAllFolderStates();
                }
                updateForSelection();
            });
            this.$restoreModalDetails.off('change.restoreFolders').on('change.restoreFolders', '.as-restore-folder', (e) => {
                const $folder = $(e.currentTarget);
                const checked = !!$folder.prop('checked');
                const $dir = $folder.closest('.as-restore-dir-item');
                if ($dir.length > 0) {
                    const $childrenContainer = $dir.children('.as-restore-dir-children');
                    $childrenContainer.find('.as-restore-file, .as-restore-folder').prop('checked', checked);
                    updateAncestorFolderStates($dir);
                } else {
                    refreshAllFolderStates();
                }
                updateForSelection();
            });
            this.$restoreModalDetails.off('click.restoreDirToggle').on('click.restoreDirToggle', '.as-restore-dir-toggle', (e) => {
                e.preventDefault();
                const nodeId = String($(e.currentTarget).data('node-id') || '');
                if (nodeId === '') return;
                const $children = this.$restoreModalDetails.find('.as-restore-dir-children[data-node-id="' + nodeId + '"]');
                const expand = !$children.is(':visible');
                setDirExpanded(nodeId, expand);
            });
            this.$restoreModalDetails.off('input.restoreFileSearch').on('input.restoreFileSearch', '#as-restore-file-search', () => {
                applyAdvancedSearch();
            });
            this.$restoreModalDetails.off('click.restoreFilesAll').on('click.restoreFilesAll', '#as-restore-files-all', () => {
                this.$restoreModalDetails.find('.as-restore-file, .as-restore-folder').prop('checked', true);
                refreshAllFolderStates();
                updateForSelection();
            });
            this.$restoreModalDetails.off('click.restoreFilesNone').on('click.restoreFilesNone', '#as-restore-files-none', () => {
                this.$restoreModalDetails.find('.as-restore-file, .as-restore-folder').prop('checked', false);
                refreshAllFolderStates();
                updateForSelection();
            });
            this.$restoreModalDetails.off('shown.bs.tab.restoreTabs').on('shown.bs.tab.restoreTabs', 'a[data-toggle="tab"]', () => {
                updateForSelection();
            });
            refreshAllFolderStates();
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
                rightBody = '<div style="max-height:430px; overflow:auto;"><ul class="list-group" style="margin-bottom:0;">' +
                    (imageFolders.length
                        ? imageFolders.map((f) => '<li class="list-group-item">' + this.escapeHtml(f) + '</li>').join('')
                        : '<li class="list-group-item text-muted">No folder list recorded.</li>') +
                    '</ul></div>';
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
        const restoreType = String(this.pendingRestoreType || 'config').toLowerCase();
        const showProgress = true;

        this.$restoreConfirm.prop('disabled', true);
        if (showProgress) {
            this.$restoreModal.modal('hide');
            this.showRestoreProgressModal(restoreType);
        }
        $.ajax({
            url: 'includes/configbackuputil.php?request=Restore',
            method: 'POST',
            dataType: 'json',
            data: {
                file: selectedFile,
                selectedSections: Array.isArray(this.selectedRestoreSections) ? this.selectedRestoreSections : [],
                selectedImageFolders: Array.isArray(this.selectedRestoreImageFolders) ? this.selectedRestoreImageFolders : [],
                selectedFiles: Array.isArray(this.selectedRestoreFiles) ? this.selectedRestoreFiles : []
            }
        }).done((result) => {
            this.renderStatus((result && result.status) ? result.status : {});
            if (showProgress) {
                this.stopRestoreProgressSimulation();
                this.$restoreProgressBar
                    .removeClass('progress-bar-info progress-bar-danger progress-bar-striped active')
                    .addClass('progress-bar-success');
                const stepLabels = (result && Array.isArray(result.steps) && result.steps.length > 0)
                    ? result.steps
                    : this.getRestoreProgressStepLabels(restoreType);
                this.renderRestoreProgressSteps(stepLabels);
                const lastIdx = Math.max(0, stepLabels.length - 1);
                this.updateRestoreProgress(100, lastIdx, 'Restore complete.');
                this.$restoreProgressSteps.find('li').each((_, el) => {
                    const $row = $(el);
                    const $icon = $row.find('i.fa');
                    $row.removeClass('list-group-item-info').addClass('list-group-item-success');
                    $icon.removeClass('fa-spinner fa-spin text-info fa-circle-o text-muted').addClass('fa-check-circle text-success');
                });
                this.$restoreProgressClose.prop('disabled', false);
                setTimeout(() => {
                    if (this.$restoreProgressModal.length > 0 && this.$restoreProgressModal.hasClass('in')) {
                        this.$restoreProgressModal.one('hidden.bs.modal', () => {
                            this.showRestoreSummaryModal(result || {});
                        });
                        this.$restoreProgressModal.modal('hide');
                    } else {
                        this.showRestoreSummaryModal(result || {});
                    }
                }, 500);
            } else {
                this.$restoreModal.modal('hide');
                this.showRestoreSummaryModal(result || {});
            }
        }).fail((xhr) => {
            let msg = 'Restore failed.';
            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
            }
            if (showProgress) {
                this.stopRestoreProgressSimulation();
                this.$restoreProgressBar
                    .removeClass('progress-bar-info progress-bar-success progress-bar-striped active')
                    .addClass('progress-bar-danger');
                this.updateRestoreProgress(this.restoreProgressPercent || 10, 1, 'Restore failed.');
                this.$restoreProgressError.text(msg).show();
                this.$restoreProgressClose.prop('disabled', false);
            } else {
                this.$restoreModalDetails.prepend('<div class="alert alert-danger" style="margin-bottom:10px;">' + this.escapeHtml(msg) + '</div>');
            }
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
        this.ensureBackupProgressModal();
        this.ensureRestoreProgressModal();
        this.ensureRestoreSummaryModal();
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
                const willStopAllskyService = (backupType === 'config' && selectedKeys.indexOf('databases') !== -1);
                this.createBackup(backupType, selectedKeys, backupAllImages, selectedImageFolders, willStopAllskyService);
            });
            this.$createModal.on('hidden.bs.modal', () => {
                this.$createModalDetails.empty();
            });
        }
        if (this.$backupProgressModal.length > 0) {
            this.$backupProgressModal.on('hidden.bs.modal', () => {
                this.stopBackupProgressSimulation();
            });
        }
        if (this.$restoreProgressModal.length > 0) {
            this.$restoreProgressModal.on('hidden.bs.modal', () => {
                this.stopRestoreProgressSimulation();
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
                this.pendingRestoreType = 'config';
                this.selectedRestoreSections = [];
                this.selectedRestoreImageFolders = [];
                this.selectedRestoreFiles = [];
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
