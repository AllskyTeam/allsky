"use strict";

(function ($) {
    class SystemPageEntriesEditor {
        constructor(element) {
            this.$trigger = $(element);
            this.files = [];
            this.configuredFiles = [];
            this.configDir = "";
            this.activePath = "";
            this.editIndex = -1;
            this.$modal = null;
            this.$browserModal = null;
            this.$entryModal = null;
            this.$fileSelect = null;
            this.$newPathInput = null;
            this.$tableBody = null;
            this.$empty = null;
            this.$message = null;
            this.$currentFile = null;
            this.$browserList = null;
            this.$entryType = null;
            this.$errorModal = null;
            this.$resultModal = null;
            this.$iconPickerModal = null;
            this.$commandBrowserModal = null;
            this.fontAwesomeIcons = [];
            this.fontAwesomeIconsLoaded = false;
            this.bindTrigger();
        }

        bindTrigger() {
            this.$trigger.on("click", (event) => {
                event.preventDefault();
                this.ensureModal();
                this.$modal.modal("show");
                this.loadConfiguredFiles();
            });
        }

        ensureModal() {
            if (this.$modal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-editor-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-editor-title">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-editor-title">System Page Additions Editor</h4>
                            </div>
                            <div class="modal-body">
                                <nav class="navbar navbar-default">
                                    <div class="collapse navbar-collapse in">
                                        <div class="navbar-form">
                                            <div class="btn-toolbar" role="toolbar">
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-default" id="as-system-entries-open-action"><i class="fa fa-folder-open fa-fw"></i> Open</button>
                                                    <button type="button" class="btn btn-default" id="as-system-entries-new-action"><i class="fa fa-file fa-fw"></i> New</button>
                                                </div>
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-data"><i class="fa fa-database fa-fw"></i> Add Data</button>
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-progress"><i class="fa fa-tasks fa-fw"></i> Add Progress</button>
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-button"><i class="fa fa-square fa-fw"></i> Add Button</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </nav>
                                <div class="panel panel-default as-system-entries-open-panel">
                                    <div class="panel-heading">
                                        <div class="row">
                                            <div class="col-sm-12">
                                                <strong>Current File</strong>
                                                <div class="help-block" id="as-system-entries-current-file" style="margin-bottom: 0;"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="panel-body">
                                        <div id="as-system-entries-empty" class="alert alert-warning" style="display:none;"></div>
                                        <div class="table-responsive">
                                            <table class="table table-hover table-condensed">
                                                <thead>
                                                    <tr>
                                                        <th style="width: 120px;">Type</th>
                                                        <th style="width: 180px;">Label</th>
                                                        <th>Details</th>
                                                        <th style="width: 120px;" class="text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="as-system-entries-table-body"></tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <span class="pull-left text-muted" id="as-system-entries-message"></span>
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-save"><i class="fa fa-save"></i> Save File</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$modal = $(html);
            $("body").append(this.$modal);
            this.ensureBrowserModal();
            this.ensureEntryModal();
            this.ensureErrorModal();
            this.ensureResultModal();
            this.ensureIconPickerModal();
            this.ensureCommandBrowserModal();

            this.$newPathInput = this.$browserModal.find("#as-system-entries-new-path");
            this.$tableBody = this.$modal.find("#as-system-entries-table-body");
            this.$empty = this.$modal.find("#as-system-entries-empty");
            this.$message = this.$modal.find("#as-system-entries-message");
            this.$currentFile = this.$modal.find("#as-system-entries-current-file");
            this.$entryType = this.$entryModal.find("#as-system-entry-type");

            this.$modal.on("click", "#as-system-entries-open-action", (event) => {
                event.preventDefault();
                this.openBrowser();
            });
            this.$modal.on("click", "#as-system-entries-new-action", (event) => {
                event.preventDefault();
                this.openBrowser("new");
            });
            this.$modal.on("click", "#as-system-entries-add-data", (event) => {
                event.preventDefault();
                this.openEntryEditor("data");
            });
            this.$modal.on("click", "#as-system-entries-add-progress", (event) => {
                event.preventDefault();
                this.openEntryEditor("progress");
            });
            this.$modal.on("click", "#as-system-entries-add-button", (event) => {
                event.preventDefault();
                this.openEntryEditor("button");
            });
            this.$modal.on("click", "#as-system-entries-save", () => this.saveActiveFile());
            this.$modal.on("click", ".as-system-entry-edit", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.openEntryEditor(null, index);
                }
            });
            this.$modal.on("click", ".as-system-entry-delete", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.deleteEntry(index);
                }
            });
            this.$modal.on("click", ".as-system-entry-test", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.testEntry(index);
                }
            });

            this.$entryType.on("change", () => this.updateEntryFieldVisibility());
            this.$entryModal.on("click", "#as-system-entry-save", () => this.saveEntryFromDialog());
            this.$entryModal.on("click", "#as-system-entry-icon-picker", (event) => {
                event.preventDefault();
                this.openIconPicker();
            });
            this.$entryModal.on("input", "#as-system-entry-icon", () => this.updateIconPreview());
            this.$entryModal.on("input", "#as-system-entry-command", () => this.updateEntryTestButtonState());
            this.$entryModal.on("click", "#as-system-entry-command-picker", (event) => {
                event.preventDefault();
                this.openCommandBrowser();
            });
            this.$entryModal.on("click", "#as-system-entry-test-command", (event) => {
                event.preventDefault();
                this.testEntryCommandFromDialog();
            });
        }

        ensureBrowserModal() {
            if (this.$browserModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-browser-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-browser-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-browser-title">Open File</h4>
                            </div>
                            <div class="modal-body">
                                <div class="panel panel-default as-system-entries-open-panel">
                                    <div class="panel-heading">Open Existing File</div>
                                    <div class="panel-body">
                                        <div class="form-group">
                                            <div class="row">
                                                <div class="col-sm-8">
                                                    <label>Browse Files In ~/allsky/config/myFiles</label>
                                                    <div class="help-block" id="as-system-entries-browser-root" style="margin-top: 0; margin-bottom: 0;"></div>
                                                </div>
                                                <div class="col-sm-4 text-right" style="padding-top: 22px;">
                                                    <button type="button" class="btn btn-default" id="as-system-entries-browser-refresh"><i class="fa fa-refresh"></i> Refresh</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="as-system-entries-browser-list" class="list-group as-system-entries-browser-list"></div>
                                        <div class="form-group" style="margin-top: 15px; margin-bottom: 0;">
                                            <label>Selected File</label>
                                            <div class="well well-sm" id="as-system-entries-browser-selected" style="margin-bottom: 0;">No file selected.</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="panel panel-default as-system-entries-new-panel">
                                    <div class="panel-heading">Create New File</div>
                                    <div class="panel-body">
                                        <div class="form-group">
                                            <label for="as-system-entries-new-path">Filename</label>
                                            <div class="input-group">
                                                <span class="input-group-addon" id="as-system-entries-new-prefix">~/allsky/config/myFiles/</span>
                                                <input type="text" id="as-system-entries-new-path" class="form-control" placeholder="my_buttons.txt">
                                            </div>
                                            <div class="help-block" style="margin-bottom: 0;">New additions files are always stored in <code>~/allsky/config/myFiles</code> and saved with a <code>.txt</code> extension.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-browser-open-footer" style="display:none;"><i class="fa fa-folder-open-o"></i> Open</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-browser-create-footer" style="display:none;"><i class="fa fa-file-o"></i> Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$browserModal = $(html);
            $("body").append(this.$browserModal);
            this.$browserList = this.$browserModal.find("#as-system-entries-browser-list");

            this.$browserModal.on("click", "#as-system-entries-browser-open-footer", () => {
                const path = $.trim(this.$browserModal.attr("data-selected-file") || "");
                if (path === "") {
                    this.setMessage("Select a file to open.");
                    return;
                }
                this.openPath(path, "Opening selected file...");
            });
            this.$browserModal.on("click", "#as-system-entries-browser-refresh", () => this.browseDirectory(this.configDir));
            this.$browserModal.on("click", "#as-system-entries-browser-create-footer", () => {
                const fileName = $.trim(this.$browserModal.find("#as-system-entries-new-path").val() || "");
                if (fileName === "") {
                    this.setMessage("Enter the filename you want to create in ~/allsky/config/myFiles.");
                    return;
                }
                const path = this.buildConfigFilePath(fileName);
                this.openPath(path, "Opening new file path...");
            });
            this.$browserModal.on("click", ".as-system-browser-entry", (event) => {
                event.preventDefault();
                const $item = $(event.currentTarget);
                const type = $item.attr("data-type") || "";
                const path = $item.attr("data-path") || "";

                if (type === "directory") {
                    this.browseDirectory(path);
                    return;
                }

                if (type === "file" && path !== "") {
                    this.setSelectedBrowserFile(path);
                }
            });
        }

        ensureEntryModal() {
            if (this.$entryModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entry-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entry-modal-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entry-modal-title">Entry</h4>
                            </div>
                            <div class="modal-body">
                                <form id="as-system-entry-form">
                                    <input type="hidden" id="as-system-entry-index" value="-1">
                                    <div class="alert alert-danger" id="as-system-entry-error" style="display:none;"></div>
                                    <div class="form-group">
                                        <label for="as-system-entry-type">Type</label>
                                        <select id="as-system-entry-type" class="form-control">
                                            <option value="data">data</option>
                                            <option value="progress">progress</option>
                                            <option value="button">button</option>
                                        </select>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-data as-entry-type-progress">
                                        <div class="form-group">
                                            <label for="as-system-entry-timeout">Timeout</label>
                                            <input type="text" class="form-control" id="as-system-entry-timeout" placeholder="0">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-label">Label</label>
                                            <input type="text" class="form-control" id="as-system-entry-label">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-data">Data</label>
                                            <input type="text" class="form-control" id="as-system-entry-data">
                                        </div>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-progress">
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-min">Minimum</label>
                                                    <input type="text" class="form-control" id="as-system-entry-min">
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-current">Current</label>
                                                    <input type="text" class="form-control" id="as-system-entry-current">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-max">Maximum</label>
                                                    <input type="text" class="form-control" id="as-system-entry-max">
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-danger">Danger</label>
                                                    <input type="text" class="form-control" id="as-system-entry-danger">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-warning">Warning</label>
                                            <input type="text" class="form-control" id="as-system-entry-warning">
                                        </div>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-button">
                                        <div class="form-group">
                                            <label for="as-system-entry-button-label">Button Label</label>
                                            <input type="text" class="form-control" id="as-system-entry-button-label">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-command">Command</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="as-system-entry-command">
                                                <span class="input-group-btn">
                                                    <button type="button" class="btn btn-default" id="as-system-entry-command-picker"><i class="fa fa-folder-open"></i> Browse</button>
                                                </span>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-message">Success Message</label>
                                            <input type="text" class="form-control" id="as-system-entry-message" placeholder="-">
                                        </div>
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-color">Button Color</label>
                                                    <select class="form-control" id="as-system-entry-color">
                                                        <option value="green">green</option>
                                                        <option value="red">red</option>
                                                        <option value="blue">blue</option>
                                                        <option value="yellow">yellow</option>
                                                        <option value="cyan">cyan</option>
                                                        <option value="white">white</option>
                                                        <option value="black">black</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-icon">Font Awesome Icon</label>
                                                    <div class="input-group">
                                                        <input type="text" class="form-control" id="as-system-entry-icon" placeholder="-">
                                                        <span class="input-group-btn">
                                                            <button type="button" class="btn btn-default" id="as-system-entry-icon-picker"><i class="fa fa-th-large"></i> Select</button>
                                                        </span>
                                                    </div>
                                                    <div class="help-block" id="as-system-entry-icon-preview" style="margin-bottom: 0;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-info pull-left" id="as-system-entry-test-command" disabled><i class="fa fa-play"></i> Test Script</button>
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entry-save"><i class="fa fa-check"></i> Save Entry</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$entryModal = $(html);
            $("body").append(this.$entryModal);
        }

        ensureErrorModal() {
            if (this.$errorModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-error-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-error-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-error-title">System Page Additions Error</h4>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger" id="as-system-entries-error-text" style="margin-bottom: 0;"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$errorModal = $(html);
            $("body").append(this.$errorModal);
        }

        ensureResultModal() {
            if (this.$resultModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-result-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-result-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-result-title">Command Test Result</h4>
                            </div>
                            <div class="modal-body">
                                <div class="alert" id="as-system-entries-result-status"></div>
                                <div class="panel panel-default" style="margin-bottom: 0;">
                                    <div id="as-system-entries-result-message" class="panel-body allow-select" style="white-space: pre-wrap;"></div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$resultModal = $(html);
            $("body").append(this.$resultModal);
        }

        ensureIconPickerModal() {
            if (this.$iconPickerModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-icon-picker-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-icon-picker-title">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-icon-picker-title">Select Font Awesome Icon</h4>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="as-system-icon-picker-search">Search Icons</label>
                                    <input type="text" class="form-control" id="as-system-icon-picker-search" placeholder="Search by icon name">
                                </div>
                                <div id="as-system-icon-picker-status" class="text-muted" style="margin-bottom: 10px;"></div>
                                <div id="as-system-icon-picker-list" class="row" style="max-height: 420px; overflow-y: auto; overflow-x: hidden;"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$iconPickerModal = $(html);
            $("body").append(this.$iconPickerModal);

            this.$iconPickerModal.on("input", "#as-system-icon-picker-search", () => {
                this.renderIconPickerList(this.$iconPickerModal.find("#as-system-icon-picker-search").val() || "");
            });

            this.$iconPickerModal.on("click", ".as-system-icon-choice", (event) => {
                event.preventDefault();
                const icon = $(event.currentTarget).attr("data-icon") || "-";
                this.$entryModal.find("#as-system-entry-icon").val(icon);
                this.updateIconPreview();
                this.$iconPickerModal.modal("hide");
            });
        }

        ensureCommandBrowserModal() {
            if (this.$commandBrowserModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-command-browser-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-command-browser-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-command-browser-title">Select Command File</h4>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <div class="row">
                                        <div class="col-sm-8">
                                            <label>Browse Filesystem</label>
                                            <div class="help-block" id="as-system-command-browser-root" style="margin-top: 0; margin-bottom: 0;"></div>
                                        </div>
                                        <div class="col-sm-4 text-right" style="padding-top: 22px;">
                                            <button type="button" class="btn btn-default" id="as-system-command-browser-refresh"><i class="fa fa-refresh"></i> Refresh</button>
                                        </div>
                                    </div>
                                </div>
                                <div id="as-system-command-browser-list" class="list-group as-system-entries-browser-list"></div>
                                <div class="form-group" style="margin-top: 15px; margin-bottom: 0;">
                                    <label>Selected File</label>
                                    <div class="well well-sm" id="as-system-command-browser-selected" style="margin-bottom: 0;">No file selected.</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-command-browser-open-footer"><i class="fa fa-check"></i> Use File</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$commandBrowserModal = $(html);
            $("body").append(this.$commandBrowserModal);

            this.$commandBrowserModal.on("click", "#as-system-command-browser-refresh", () => {
                this.browseCommandDirectory(this.$commandBrowserModal.attr("data-current-dir") || "/home/pi");
            });
            this.$commandBrowserModal.on("click", ".as-system-command-browser-entry", (event) => {
                event.preventDefault();
                const $item = $(event.currentTarget);
                const type = $item.attr("data-type") || "";
                const path = $item.attr("data-path") || "";

                if (type === "directory") {
                    this.browseCommandDirectory(path);
                    return;
                }

                if (type === "file" && path !== "") {
                    this.setSelectedCommandFile(path);
                }
            });
            this.$commandBrowserModal.on("click", "#as-system-command-browser-open-footer", () => {
                const path = $.trim(this.$commandBrowserModal.attr("data-selected-file") || "");
                if (path === "") {
                    this.showError("Select a file to use as the button command.");
                    return;
                }
                this.$entryModal.find("#as-system-entry-command").val(path);
                this.$commandBrowserModal.modal("hide");
            });
        }

        loadConfiguredFiles() {
            this.setMessage("Loading configured files...");
            $.ajax({
                url: "includes/systembuttonsutil.php?request=Entries",
                method: "GET",
                dataType: "json",
                cache: false
            }).done((result) => {
                this.files = Array.isArray(result.files) ? result.files : [];
                this.configuredFiles = Array.isArray(result.configuredFiles) ? result.configuredFiles : [];
                this.configDir = $.trim(result.configDir || this.configDir);
                if (this.files.length > 0) {
                    this.activePath = this.files[0].path;
                } else {
                    this.activePath = "";
                }
                this.renderConfiguredFileList();
                this.renderTable();
                this.setMessage(this.files.length === 0 ? "No System Page Additions files are configured yet." : "");
            }).fail((xhr) => {
                this.files = [];
                this.configuredFiles = [];
                this.renderConfiguredFileList();
                this.renderTable();
                this.showError(xhr.responseJSON?.message || "Unable to load configured files.");
            });
        }

        openCommandBrowser() {
            this.ensureCommandBrowserModal();
            const currentCommand = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            let browsePath = "/home/pi";

            if (currentCommand !== "" && currentCommand.charAt(0) === "/") {
                browsePath = currentCommand.replace(/\/[^/]*$/, "") || "/";
            }

            this.setSelectedCommandFile(currentCommand !== "" && currentCommand.charAt(0) === "/" ? currentCommand : "");
            this.$commandBrowserModal.modal("show");
            this.browseCommandDirectory(browsePath);
        }

        browseCommandDirectory(path) {
            const browsePath = $.trim(path || "/home/pi");
            const $list = this.$commandBrowserModal.find("#as-system-command-browser-list");
            $list.html('<div class="list-group-item text-muted">Loading...</div>');

            $.ajax({
                url: "includes/systembuttonsutil.php?request=BrowseCommandFiles",
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: browsePath
                }
            }).done((result) => {
                const currentPath = result.path || browsePath;
                const entries = Array.isArray(result.entries) ? result.entries : [];
                this.$commandBrowserModal.attr("data-current-dir", currentPath);
                this.$commandBrowserModal.find("#as-system-command-browser-root").text(currentPath);
                $list.empty();

                if (entries.length === 0) {
                    $list.html('<div class="list-group-item text-muted">No files or directories found.</div>');
                    return;
                }

                entries.forEach((entry) => {
                    const iconClass = entry.type === "directory" ? "fa-folder-open" : "fa-file-text-o";
                    const actionText = entry.type === "directory" ? "Open" : "Select";
                    $list.append(`
                        <a href="#" class="list-group-item as-system-command-browser-entry" data-type="${this.escapeHtml(entry.type || "")}" data-path="${this.escapeHtml(entry.path || "")}">
                            <span class="badge">${actionText}</span>
                            <i class="fa ${iconClass} fa-fw"></i> ${this.escapeHtml(entry.name || "")}
                        </a>
                    `);
                });
            }).fail((xhr) => {
                $list.html(`<div class="list-group-item text-danger">${this.escapeHtml(xhr.responseJSON?.message || "Unable to browse the selected directory.")}</div>`);
            });
        }

        setSelectedCommandFile(path) {
            const selectedPath = $.trim(path || "");
            const $selected = this.$commandBrowserModal.find("#as-system-command-browser-selected");
            this.$commandBrowserModal.attr("data-selected-file", selectedPath);

            if (selectedPath === "") {
                $selected.text("No file selected.");
                return;
            }

            $selected.text(selectedPath);
        }

        renderConfiguredFileList() {
            if (!this.$fileSelect) {
                return;
            }

            this.$fileSelect.empty();
            if (this.files.length === 0) {
                this.$fileSelect.append(new Option("No configured files", "", false, false));
                return;
            }

            this.files.forEach((file) => {
                this.$fileSelect.append(new Option(file.path, file.path, file.path === this.activePath, file.path === this.activePath));
            });
        }

        browseDirectory(path) {
            const browsePath = $.trim(path || this.configDir || "");
            this.$browserList.html('<div class="list-group-item text-muted">Loading...</div>');

            $.ajax({
                url: "includes/systembuttonsutil.php?request=BrowseFiles",
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: browsePath
                }
            }).done((result) => {
                const currentPath = result.path || browsePath;
                const entries = Array.isArray(result.entries) ? result.entries : [];
                this.configDir = $.trim(result.configDir || this.configDir);
                this.$browserModal.find("#as-system-entries-browser-root").text(currentPath);
                this.$browserModal.find("#as-system-entries-new-prefix").text(this.configDir + "/");
                this.$browserList.empty();

                if (entries.length === 0) {
                    this.$browserList.html('<div class="list-group-item text-muted">No files or directories found.</div>');
                    return;
                }

                entries.forEach((entry) => {
                    const iconClass = entry.type === "directory" ? "fa-folder-open" : "fa-file-text-o";
                    const actionText = entry.type === "directory" ? "Open" : "Select";
                    this.$browserList.append(`
                        <a href="#" class="list-group-item as-system-browser-entry" data-type="${this.escapeHtml(entry.type || "")}" data-path="${this.escapeHtml(entry.path || "")}">
                            <span class="badge">${actionText}</span>
                            <i class="fa ${iconClass} fa-fw"></i> ${this.escapeHtml(entry.name || "")}
                        </a>
                    `);
                });
            }).fail((xhr) => {
                this.$browserList.html(`<div class="list-group-item text-danger">${this.escapeHtml(xhr.responseJSON?.message || "Unable to browse the selected directory.")}</div>`);
            });
        }

        openBrowser(mode) {
            this.ensureBrowserModal();
            this.renderConfiguredFileList();
            const browsePath = this.configDir || "";
            const $openPanel = this.$browserModal.find(".as-system-entries-open-panel");
            const $newPanel = this.$browserModal.find(".as-system-entries-new-panel");
            const $title = this.$browserModal.find("#as-system-entries-browser-title");
            const $createButton = this.$browserModal.find("#as-system-entries-browser-create-footer");
            const $openButton = this.$browserModal.find("#as-system-entries-browser-open-footer");

            if (mode === "new") {
                $title.text("New File");
                $openPanel.hide();
                $newPanel.show();
                $createButton.show();
                $openButton.hide();
            } else {
                $title.text("Open File");
                $openPanel.show();
                $newPanel.hide();
                $createButton.hide();
                $openButton.show();
            }

            this.$browserModal.find("#as-system-entries-browser-root").text(browsePath);
            this.$browserModal.find("#as-system-entries-new-prefix").text(this.configDir + "/");
            this.setSelectedBrowserFile("");
            this.$browserList.empty();
            if (mode === "new") {
                this.$browserModal.find("#as-system-entries-new-path").trigger("focus");
            }
            this.$browserModal.modal("show");
            this.browseDirectory(browsePath);
        }

        setSelectedBrowserFile(path) {
            const selectedPath = $.trim(path || "");
            const $selected = this.$browserModal.find("#as-system-entries-browser-selected");
            this.$browserModal.attr("data-selected-file", selectedPath);

            if (selectedPath === "") {
                $selected.text("No file selected.");
                return;
            }

            $selected.text(selectedPath);
        }

        buildConfigFilePath(fileName) {
            const safeName = fileName.replace(/^\/+/, "").replace(/\.txt$/i, "") + ".txt";
            return `${this.configDir}/${safeName}`;
        }

        openPath(path, overlayText) {
            $.LoadingOverlay("show", { text: overlayText || "Opening file..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=Entries",
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: path
                }
            }).done((result) => {
                if (result.file) {
                    this.upsertFile(result.file);
                    this.activePath = result.file.path;
                    this.editIndex = -1;
                    this.renderConfiguredFileList();
                    this.renderTable();
                    this.$browserModal.modal("hide");
                    this.setMessage(result.file.exists ? "File opened." : "New file path ready. Add rows and save to create it.");
                } else {
                    this.showError("Unable to open the selected file.");
                }
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to open the selected file.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        loadFontAwesomeIcons() {
            if (this.fontAwesomeIconsLoaded) {
                return $.Deferred().resolve(this.fontAwesomeIcons).promise();
            }

            return $.ajax({
                url: "/allsky/font-awesome/css/all.min.css",
                method: "GET",
                dataType: "text",
                cache: true
            }).then((cssText) => {
                const icons = [];
                const seen = {};
                const iconPattern = /((?:\.fa-[a-z0-9-]+,?)+)\{--fa:/g;
                let match = null;

                while ((match = iconPattern.exec(cssText)) !== null) {
                    const names = match[1].match(/\.fa-([a-z0-9-]+)/g) || [];
                    names.forEach((name) => {
                        const icon = name.replace(".fa-", "");
                        if (icon === "" || seen[icon]) {
                            return;
                        }
                        seen[icon] = true;
                        icons.push(icon);
                    });
                }

                this.fontAwesomeIcons = icons.sort((left, right) => left.localeCompare(right));
                this.fontAwesomeIconsLoaded = true;
                return this.fontAwesomeIcons;
            });
        }

        openIconPicker() {
            this.ensureIconPickerModal();
            const $status = this.$iconPickerModal.find("#as-system-icon-picker-status");
            const $search = this.$iconPickerModal.find("#as-system-icon-picker-search");

            $search.val("");
            $status.text("Loading icons...");
            this.$iconPickerModal.modal("show");

            this.loadFontAwesomeIcons().done(() => {
                $status.text(this.fontAwesomeIcons.length + " icons available");
                this.renderIconPickerList("");
            }).fail(() => {
                $status.text("Unable to load Font Awesome icons.");
                this.$iconPickerModal.find("#as-system-icon-picker-list").html("");
            });
        }

        renderIconPickerList(filterText) {
            const $list = this.$iconPickerModal.find("#as-system-icon-picker-list");
            const search = $.trim(String(filterText || "").toLowerCase());
            const filteredIcons = this.fontAwesomeIcons.filter((icon) => search === "" || icon.indexOf(search) !== -1);

            if (filteredIcons.length === 0 && search !== "") {
                $list.html('<div class="col-sm-12"><div class="alert alert-warning" style="margin-bottom: 0;">No icons match your search.</div></div>');
                return;
            }

            const iconsToRender = search === "" ? ["-", ...filteredIcons] : filteredIcons;

            $list.html(iconsToRender.map((icon) => `
                <div class="col-xs-6 col-sm-4 col-md-3" style="margin-bottom: 12px;">
                    <button type="button" class="btn btn-default btn-block as-system-icon-choice" data-icon="${this.escapeHtml(icon)}" title="${icon === "-" ? "No icon" : this.escapeHtml(icon)}" style="height: 72px;">
                        <div>${icon === "-" ? '<span class="text-muted">None</span>' : `<i class="fa fa-${this.escapeHtml(icon)} fa-2x"></i>`}</div>
                        <div style="margin-top: 8px; font-size: 12px; white-space: normal; word-break: break-word;">${icon === "-" ? "No Icon" : this.escapeHtml(icon)}</div>
                    </button>
                </div>
            `).join(""));
        }

        updateIconPreview() {
            if (!this.$entryModal) {
                return;
            }

            const rawIcon = $.trim(this.$entryModal.find("#as-system-entry-icon").val() || "-");
            const icon = rawIcon === "" ? "-" : rawIcon;
            const $preview = this.$entryModal.find("#as-system-entry-icon-preview");

            if (icon === "-" || icon === "") {
                $preview.html('<span class="text-muted">No icon selected.</span>');
                return;
            }

            $preview.html(`
                <span class="label label-default">Preview</span>
                <span style="margin-left: 8px;"><i class="fa fa-${this.escapeHtml(icon)} fa-fw"></i> ${this.escapeHtml(icon)}</span>
            `);
        }

        getActiveFile() {
            return this.files.find((file) => file.path === this.activePath) || null;
        }

        upsertFile(file) {
            if (!file || !file.path) {
                return;
            }

            const index = this.files.findIndex((entry) => entry.path === file.path);
            if (index >= 0) {
                this.files[index] = file;
            } else {
                this.files.push(file);
            }
        }

        renderTable() {
            const file = this.getActiveFile();
            this.$tableBody.empty();
            this.$empty.hide();

            if (!file) {
                this.$currentFile.text("No file open");
                this.$empty.text("Open an existing file or choose a new file path to begin editing.").show();
                return;
            }

            this.$currentFile.text(`${file.path}${file.exists ? "" : " (new file)"}`);

            const entries = Array.isArray(file.entries) ? file.entries : [];
            if (entries.length === 0) {
                this.$empty.text("This file has no entries yet. Use the toolbar above to add the first row.").show();
                return;
            }

            entries.forEach((entry, index) => {
                const actionButtons = [];
                if (entry.type === "button") {
                    actionButtons.push(`<button type="button" class="btn btn-info as-system-entry-test" data-index="${index}" title="Test command"><i class="fa fa-play"></i></button>`);
                }
                actionButtons.push(`<button type="button" class="btn btn-default as-system-entry-edit" data-index="${index}" title="Edit"><i class="fa fa-pencil"></i></button>`);
                actionButtons.push(`<button type="button" class="btn btn-danger as-system-entry-delete" data-index="${index}" title="Delete"><i class="fa fa-trash"></i></button>`);
                this.$tableBody.append(`
                    <tr>
                        <td><span class="label label-default">${this.escapeHtml(entry.type || "")}</span></td>
                        <td>${this.getEntryTitle(entry)}</td>
                        <td>${this.getEntryDetails(entry)}</td>
                        <td class="text-right">
                            <div class="btn-group btn-group-sm" role="group">
                                ${actionButtons.join("")}
                            </div>
                        </td>
                    </tr>
                `);
            });
        }

        getEntryTitle(entry) {
            if (entry.type === "button") {
                return this.escapeHtml(entry.label || "Unnamed Button");
            }
            return this.escapeHtml(entry.label || "Unnamed Entry");
        }

        getEntryDetails(entry) {
            if (entry.type === "button") {
                const parts = [
                    `Command: ${this.escapeHtml(entry.command || "")}`,
                    `Color: ${this.escapeHtml(entry.color || "")}`
                ];
                if (entry.icon && entry.icon !== "-") {
                    parts.push(`Icon: ${this.escapeHtml(entry.icon)}`);
                }
                return parts.join("<br>");
            }

            if (entry.type === "progress") {
                return [
                    `Data: ${this.escapeHtml(entry.data || "")}`,
                    `Range: ${this.escapeHtml(entry.min || "0")} to ${this.escapeHtml(entry.max || "0")}`,
                    `Current: ${this.escapeHtml(entry.current || "0")}`,
                    `Thresholds: warning ${this.escapeHtml(entry.warning || "0")}, danger ${this.escapeHtml(entry.danger || "0")}`
                ].join("<br>");
            }

            return [
                `Data: ${this.escapeHtml(entry.data || "")}`,
                `Timeout: ${this.escapeHtml(entry.timeout || "0")}`
            ].join("<br>");
        }

        openEntryEditor(type, index) {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before adding entries.");
                return;
            }

            this.editIndex = Number.isInteger(index) ? index : -1;
            this.resetEntryForm();

            if (this.editIndex >= 0 && file.entries && file.entries[this.editIndex]) {
                this.populateEntryForm(file.entries[this.editIndex], this.editIndex);
                this.$entryModal.find("#as-system-entry-modal-title").text("Edit Entry");
            } else {
                this.$entryModal.find("#as-system-entry-modal-title").text(`Add ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Entry"}`);
                this.$entryModal.find("#as-system-entry-type").val(type || "data");
            }

            this.updateEntryFieldVisibility();
            this.$entryModal.modal("show");
        }

        resetEntryForm() {
            const form = this.$entryModal.find("#as-system-entry-form")[0];
            if (form) {
                form.reset();
            }

            this.hideEntryError();
            this.$entryModal.find("#as-system-entry-index").val("-1");
            this.$entryModal.find("#as-system-entry-type").val("data");
            this.$entryModal.find("#as-system-entry-timeout").val("0");
            this.$entryModal.find("#as-system-entry-min").val("0");
            this.$entryModal.find("#as-system-entry-current").val("0");
            this.$entryModal.find("#as-system-entry-max").val("100");
            this.$entryModal.find("#as-system-entry-danger").val("0");
            this.$entryModal.find("#as-system-entry-warning").val("0");
            this.$entryModal.find("#as-system-entry-message").val("-");
            this.$entryModal.find("#as-system-entry-icon").val("-");
            this.$entryModal.find("#as-system-entry-color").val("green");
            this.updateIconPreview();
            this.updateEntryTestButtonState();
        }

        populateEntryForm(entry, index) {
            this.hideEntryError();
            this.$entryModal.find("#as-system-entry-index").val(String(index));
            this.$entryModal.find("#as-system-entry-type").val(entry.type || "data");
            this.$entryModal.find("#as-system-entry-timeout").val(entry.timeout || "0");
            this.$entryModal.find("#as-system-entry-label").val(entry.label || "");
            this.$entryModal.find("#as-system-entry-data").val(entry.data || "");
            this.$entryModal.find("#as-system-entry-min").val(entry.min || "0");
            this.$entryModal.find("#as-system-entry-current").val(entry.current || "0");
            this.$entryModal.find("#as-system-entry-max").val(entry.max || "100");
            this.$entryModal.find("#as-system-entry-danger").val(entry.danger || "0");
            this.$entryModal.find("#as-system-entry-warning").val(entry.warning || "0");
            this.$entryModal.find("#as-system-entry-button-label").val(entry.label || "");
            this.$entryModal.find("#as-system-entry-command").val(entry.command || "");
            this.$entryModal.find("#as-system-entry-message").val(entry.message || "-");
            this.$entryModal.find("#as-system-entry-color").val(entry.color || "green");
            this.$entryModal.find("#as-system-entry-icon").val(entry.icon || "-");
            this.updateIconPreview();
            this.updateEntryTestButtonState();
        }

        updateEntryFieldVisibility() {
            const type = this.$entryType.val() || "data";
            this.$entryModal.find(".as-entry-fields").hide();
            this.$entryModal.find(`.as-entry-type-${type}`).show();
        }

        showEntryError(message) {
            this.$entryModal.find("#as-system-entry-error").text(message || "Unable to save this entry.").show();
        }

        hideEntryError() {
            this.$entryModal.find("#as-system-entry-error").hide().text("");
        }

        updateEntryTestButtonState() {
            const command = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            this.$entryModal.find("#as-system-entry-test-command").prop("disabled", command === "");
        }

        buildEntryFromDialog() {
            const type = this.$entryType.val() || "data";
            if (type === "data") {
                return {
                    type: "data",
                    timeout: $.trim(this.$entryModal.find("#as-system-entry-timeout").val() || "0"),
                    label: $.trim(this.$entryModal.find("#as-system-entry-label").val() || ""),
                    data: $.trim(this.$entryModal.find("#as-system-entry-data").val() || "")
                };
            }

            if (type === "progress") {
                return {
                    type: "progress",
                    timeout: $.trim(this.$entryModal.find("#as-system-entry-timeout").val() || "0"),
                    label: $.trim(this.$entryModal.find("#as-system-entry-label").val() || ""),
                    data: $.trim(this.$entryModal.find("#as-system-entry-data").val() || ""),
                    min: $.trim(this.$entryModal.find("#as-system-entry-min").val() || "0"),
                    current: $.trim(this.$entryModal.find("#as-system-entry-current").val() || "0"),
                    max: $.trim(this.$entryModal.find("#as-system-entry-max").val() || "100"),
                    danger: $.trim(this.$entryModal.find("#as-system-entry-danger").val() || "0"),
                    warning: $.trim(this.$entryModal.find("#as-system-entry-warning").val() || "0")
                };
            }

            return {
                type: "button",
                label: $.trim(this.$entryModal.find("#as-system-entry-button-label").val() || ""),
                command: $.trim(this.$entryModal.find("#as-system-entry-command").val() || ""),
                message: $.trim(this.$entryModal.find("#as-system-entry-message").val() || "-") || "-",
                color: $.trim(this.$entryModal.find("#as-system-entry-color").val() || "green"),
                icon: $.trim(this.$entryModal.find("#as-system-entry-icon").val() || "-") || "-"
            };
        }

        validateEntry(entry) {
            if (entry.type === "button") {
                if (entry.label === "" || entry.command === "") {
                    return {
                        ok: false,
                        message: "Complete the required fields for this entry."
                    };
                }

                if (/\s/.test(entry.command)) {
                    return {
                        ok: false,
                        message: "Button commands must be a single command only. Examples: ls, fred.py, fred.sh, fred.php."
                    };
                }

                if (/[;&|<>`$()]/.test(entry.command)) {
                    return {
                        ok: false,
                        message: "Button commands cannot include shell operators. Enter only a single command or script name."
                    };
                }

                return { ok: true, message: "" };
            }

            if (entry.label === "" || entry.data === "") {
                return {
                    ok: false,
                    message: "Complete the required fields for this entry."
                };
            }

            return { ok: true, message: "" };
        }

        saveEntryFromDialog() {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before saving entries.");
                return;
            }

            const entry = this.buildEntryFromDialog();
            const validation = this.validateEntry(entry);
            if (!validation.ok) {
                this.showEntryError(validation.message);
                return;
            }

            this.hideEntryError();
            if (!Array.isArray(file.entries)) {
                file.entries = [];
            }

            const index = Number(this.$entryModal.find("#as-system-entry-index").val());
            if (!Number.isNaN(index) && index >= 0 && file.entries[index]) {
                file.entries[index] = entry;
            } else {
                file.entries.push(entry);
            }

            this.$entryModal.modal("hide");
            this.renderTable();
            this.setMessage("Entry updated. Save the file to apply the changes.");
        }

        deleteEntry(index) {
            const file = this.getActiveFile();
            if (!file || !Array.isArray(file.entries) || !file.entries[index]) {
                this.setMessage("Select a valid entry to delete.");
                return;
            }

            file.entries.splice(index, 1);
            this.renderTable();
            this.setMessage("Entry removed. Save the file to apply the changes.");
        }

        testEntry(index) {
            const file = this.getActiveFile();
            if (!file || !Array.isArray(file.entries) || !file.entries[index]) {
                this.showError("Select a valid button entry to test.");
                return;
            }

            const entry = file.entries[index];
            if ((entry.type || "") !== "button") {
                this.showError("Only button entries can be tested.");
                return;
            }

            const command = $.trim(entry.command || "");
            if (command === "") {
                this.showError("Enter a command before testing this button.");
                return;
            }

            $.LoadingOverlay("show", { text: "Testing command..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=RunCommand",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    command: command,
                    label: $.trim(entry.label || "Test Command")
                })
            }).done((result) => {
                this.showResult(result.title || "Command Test Result", result.message || "", !!result.ok);
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to test the selected command.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        testEntryCommandFromDialog() {
            const command = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            const label = $.trim(this.$entryModal.find("#as-system-entry-button-label").val() || "Test Command");
            const successMessage = $.trim(this.$entryModal.find("#as-system-entry-message").val() || "");

            if (command === "") {
                this.showEntryError("Enter a command before testing this button.");
                return;
            }

            const validation = this.validateEntry({
                type: "button",
                label: label,
                command: command
            });
            if (!validation.ok) {
                this.showEntryError(validation.message);
                return;
            }

            this.hideEntryError();
            $.LoadingOverlay("show", { text: "Testing command..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=RunCommand",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    command: command,
                    label: label
                })
            }).done((result) => {
                this.showResult(result.title || "Command Test Result", result.message || "", !!result.ok, successMessage !== "-" ? successMessage : "");
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to test the selected command.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        saveActiveFile() {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before saving.");
                return;
            }

            $.LoadingOverlay("show", { text: "Saving System page additions..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=SaveEntries",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    path: file.path,
                    entries: file.entries || []
                })
            }).done((result) => {
                const updated = result.file || null;
                if (updated) {
                    this.upsertFile(updated);
                    this.activePath = updated.path;
                }
                this.renderConfiguredFileList();
                this.renderTable();
                this.setMessage("System Page Additions file saved.");
                this.handlePostSaveSettingUpdate(file.path);
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to save the System Page Additions file.");
                $.LoadingOverlay("hide");
            });
        }

        handlePostSaveSettingUpdate(path) {
            const configuredPath = this.configuredFiles.length > 0 ? $.trim(this.configuredFiles[0] || "") : "";
            let shouldUpdateSetting = false;

            if (configuredPath === "") {
                shouldUpdateSetting = true;
            } else if (configuredPath !== path) {
                shouldUpdateSetting = window.confirm("This file is different from the current System Page Additions file in settings.\n\nDo you want to update the setting to use:\n" + path);
            }

            if (shouldUpdateSetting) {
                this.updateWebUiDataFileSetting(path);
                return;
            }

            this.finishSuccessfulSave();
        }

        updateWebUiDataFileSetting(path) {
            $.ajax({
                url: "includes/systembuttonsutil.php?request=UpdateWebUiDataFile",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    path: path
                })
            }).done(() => {
                this.configuredFiles = [path];
                this.finishSuccessfulSave();
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "The file was saved, but the setting could not be updated.");
                $.LoadingOverlay("hide");
            });
        }

        finishSuccessfulSave() {
            this.$modal.modal("hide");
            if (typeof window.asSystemRefresh === "function") {
                window.asSystemRefresh(() => {
                    $.LoadingOverlay("hide");
                });
                return;
            }
            $.LoadingOverlay("hide");
        }

        setMessage(text) {
            this.$message.text(text || "");
        }

        showError(message) {
            this.ensureErrorModal();
            this.$errorModal.find("#as-system-entries-error-text").text(message || "An unexpected error occurred.");
            this.$errorModal.modal("show");
        }

        formatResultMessage(message) {
            const text = String(message || "");
            const lines = text.split("\n");
            const html = [];
            const commandPattern = /^(sudo\s+|ls\s+|head\s+|command\s+|chmod\s+|chown\s+|python[0-9.\-]*\s+|bash\s+|sh\s+|\/)/;

            lines.forEach((line) => {
                const trimmed = $.trim(line);
                if (trimmed === "") {
                    html.push("<div>&nbsp;</div>");
                    return;
                }

                if (commandPattern.test(trimmed)) {
                    html.push(`<pre class="allow-select" style="margin: 6px 0; white-space: pre-wrap;"><code>${this.escapeHtml(trimmed)}</code></pre>`);
                    return;
                }

                html.push(`<div>${this.escapeHtml(line)}</div>`);
            });

            return html.join("");
        }

        showResult(title, message, ok, successText) {
            this.ensureResultModal();
            this.$resultModal.find("#as-system-entries-result-title").text(title || "Command Test Result");
            const statusText = ok ? ($.trim(successText || "") || "Command completed.") : "Command failed.";
            this.$resultModal.find("#as-system-entries-result-status")
                .removeClass("alert-success alert-danger")
                .addClass(ok ? "alert-success" : "alert-danger")
                .text(statusText);
            this.$resultModal.find("#as-system-entries-result-message").html(this.formatResultMessage(message));
            this.$resultModal.modal("show");
        }

        escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    $.fn.systemPageButtons = function () {
        return this.each(function () {
            if (!$.data(this, "systemPageButtons")) {
                $.data(this, "systemPageButtons", new SystemPageEntriesEditor(this));
            }
        });
    };
}(jQuery));
