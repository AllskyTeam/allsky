"use strict";

/**
 * Shared Allsky file browser.
 *
 * The browser displays a Bootstrap modal which lists directories and files returned
 * by a server-side endpoint.  It is intentionally generic: the caller supplies the
 * endpoint, starting directory, optional root directory and selection rules.
 *
 * Expected endpoint:
 *
 * GET {url}?path=/current/path&root=/allowed/root
 *
 * The endpoint must return JSON in this format::
 *
 * {
 *     "path": "/current/path",
 *     "root": "/allowed/root",
 *     "executableOwner": "pi",
 *     "entries": [
 *         {
 *             "type": "directory",
 *             "name": "scripts",
 *             "path": "/current/path/scripts"
 *         },
 *         {
 *             "type": "file",
 *             "name": "run.sh",
 *             "path": "/current/path/run.sh",
 *             "executable": true,
 *             "executableByOwner": true,
 *             "executableAny": true
 *         }
 *     ]
 * }
 *
 * `executable` and `executableByOwner` are treated as equivalent.  `executableAny`
 * means at least one execute bit is set, even if the configured Allsky owner cannot
 * run the file.
 */
(function ($) {
    /**
     * Browser controller for a single modal instance.
     */
    class AllskyFileBrowser {
        /**
         * Create a new browser instance.
         *
         * Options:
         *
         * @param {Object} options
         * @param {string} [options.title="Select Script"]
         *        Modal title.
         * @param {string} options.url
         *        Server endpoint used to list files.  It receives `path` and `root`
         *        query parameters and must return the JSON contract documented above.
         * @param {string} [options.startPath=""]
         *        Directory to open first.  An empty value lets the endpoint choose its
         *        default, normally the configured root directory.
         * @param {string} [options.rootPath=""]
         *        Highest directory the user may browse.  The endpoint enforces this;
         *        the client sends it with every request and stores the normalised value
         *        returned by the endpoint.
         * @param {boolean} [options.myFilesOnly=false]
         *        Ask the endpoint to confine browsing to ALLSKY_MYFILES_DIR.
         * @param {string} [options.selected=""]
         *        Initially selected file path.  This only pre-populates the display; a
         *        selected file still has to pass any executable checks before use.
         * @param {string} [options.selectButtonText="Use File"]
         *        Text shown on the confirmation button.
         * @param {string} [options.emptyText="No files or directories found."]
         *        Message shown when the current directory has no entries.
         * @param {string} [options.errorText="Unable to browse the selected directory."]
         *        Generic message used when the endpoint request fails.
         * @param {string} [options.selectErrorText="Select a file to continue."]
         *        Message shown when the confirmation button is pressed without a
         *        selected file.
         * @param {string} [options.executableRequiredText="Select a script that is executable by the configured Allsky owner."]
         *        Message shown when `requireExecutable` is enabled and a file has no
         *        execute bit at all.
         * @param {boolean} [options.requireExecutable=false]
         *        When true, all files remain visible but only files executable by the
         *        configured owner can be selected.  Files with an execute bit for a
         *        different user/group are highlighted and show a corrective message.
         * @param {string} [options.executableOwner=""]
         *        User account that must be able to execute selected scripts.  The
         *        endpoint normally returns this as `executableOwner`, but callers may
         *        provide a value up front if it is already known.
         * @param {string} [options.errorTitle="Script Cannot Be Used"]
         *        Title shown on the browser's error dialog.
         * @param {Function|null} [options.onSelect=null]
         *        Callback invoked with the selected path when the user confirms.
         */
        constructor(options) {
            this.options = $.extend(true, {
                title: "Select Script",
                url: "",
                startPath: "",
                rootPath: "",
                selected: "",
                selectButtonText: "Use File",
                emptyText: "No files or directories found.",
                errorText: "Unable to browse the selected directory.",
                selectErrorText: "Select a file to continue.",
                executableRequiredText: "Select a script that is executable by the configured Allsky owner.",
                requireExecutable: false,
                myFilesOnly: false,
                executableOwner: "",
                errorTitle: "Script Cannot Be Used",
                onSelect: null
            }, options || {});

            this.$modal = null;
            this.$errorModal = null;
            this.ensureModal();
        }

        /**
         * Create the Bootstrap modal and bind its event handlers.
         *
         * The modal is removed from the DOM when it closes, so each browser instance
         * owns exactly one short-lived modal.
         */
        ensureModal() {
            if (this.$modal) {
                return;
            }

            const html = `
                <div class="modal fade as-file-browser-modal" tabindex="-1" role="dialog" aria-labelledby="as-file-browser-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title as-file-browser-title">Select Script</h4>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <div class="row">
                                        <div class="col-sm-8">
                                            <label>Browse Filesystem</label>
                                            <div class="help-block as-file-browser-root" style="margin-top: 0; margin-bottom: 0;"></div>
                                        </div>
                                        <div class="col-sm-4 text-right" style="padding-top: 22px;">
                                            <button type="button" class="btn btn-default as-file-browser-refresh"><i class="fa fa-refresh"></i> Refresh</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="list-group as-file-browser-list"></div>
                                <div class="form-group" style="margin-top: 15px; margin-bottom: 0;">
                                    <label>Selected File</label>
                                    <div class="well well-sm as-file-browser-selected" style="margin-bottom: 0;">No file selected.</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary as-file-browser-use"><i class="fa fa-check"></i> <span class="as-file-browser-use-text">Use File</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$modal = $(html);
            $("body").append(this.$modal);

            this.$modal.on("click", ".as-file-browser-refresh", () => {
                this.browseDirectory(this.$modal.attr("data-current-dir") || this.options.startPath);
            });

            this.$modal.on("click", ".as-file-browser-entry", (event) => {
                event.preventDefault();
                const $item = $(event.currentTarget);
                const type = $item.attr("data-type") || "";
                const path = $item.attr("data-path") || "";

                if (type === "directory") {
                    this.browseDirectory(path);
                    return;
                }

                if (type === "file" && path !== "") {
                    const executable = this.toBool($item.attr("data-executable"));
                    if (this.options.requireExecutable && !executable) {
                        // A file with an execute bit that the Allsky owner cannot use
                        // needs more helpful guidance than a plain "not executable"
                        // message.
                        if (this.toBool($item.attr("data-executable-any"))) {
                            this.showError(this.buildExecutableOwnerMessage(path));
                            return;
                        }
                        this.showError(this.options.executableRequiredText);
                        return;
                    }
                    this.setSelectedFile(path, executable);
                }
            });

            this.$modal.on("click", ".as-file-browser-use", () => {
                const path = $.trim(this.$modal.attr("data-selected-file") || "");
                const executable = this.toBool(this.$modal.attr("data-selected-executable"));
                if (path === "") {
                    this.showError(this.options.selectErrorText);
                    return;
                }

                if (this.options.requireExecutable && !executable) {
                    this.showError(this.options.executableRequiredText);
                    return;
                }

                if (typeof this.options.onSelect === "function") {
                    this.options.onSelect(path);
                }
                this.$modal.modal("hide");
            });

            this.$modal.on("hidden.bs.modal", () => {
                this.$modal.remove();
                this.$modal = null;
            });
        }

        /**
         * Create a Bootstrap error dialog for file browser validation messages.
         */
        ensureErrorModal() {
            if (this.$errorModal) {
                return;
            }

            const html = `
                <div class="modal fade as-file-browser-error-modal" tabindex="-1" role="dialog" aria-labelledby="as-file-browser-error-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title as-file-browser-error-title" id="as-file-browser-error-title">Script Cannot Be Used</h4>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger as-file-browser-error-text" style="margin-bottom: 0;"></div>
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

            this.$errorModal.on("hidden.bs.modal", () => {
                this.$errorModal.remove();
                this.$errorModal = null;
            });
        }

        /**
         * Open the modal and load the initial directory.
         */
        open() {
            if ($.trim(this.options.url || "") === "") {
                this.showError("No file browser URL was configured.");
                return;
            }

            this.ensureModal();
            this.$modal.find(".as-file-browser-title").text(this.options.title);
            this.$modal.find(".as-file-browser-use-text").text(this.options.selectButtonText);
            this.setSelectedFile(this.options.selected, false);
            this.$modal.modal("show");
            this.browseDirectory(this.options.startPath);
        }

        /**
         * Request a directory listing from the configured endpoint and render it.
         *
         * @param {string} path Directory path to browse.  If omitted, `startPath` is
         *        used and the endpoint may still replace it with its default root.
         */
        browseDirectory(path) {
            const browsePath = $.trim(path || this.options.startPath || "");
            const $list = this.$modal.find(".as-file-browser-list");
            $list.html('<div class="list-group-item text-muted">Loading...</div>');

            $.ajax({
                url: this.options.url,
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: browsePath,
                    root: this.options.rootPath,
                    myFilesOnly: this.options.myFilesOnly ? "true" : "false"
                }
            }).done((result) => {
                const currentPath = result.path || browsePath;
                const entries = Array.isArray(result.entries) ? result.entries : [];
                this.$modal.attr("data-current-dir", currentPath);
                if (result.root) {
                    this.options.rootPath = result.root;
                }
                if (result.executableOwner) {
                    this.options.executableOwner = result.executableOwner;
                }
                this.$modal.find(".as-file-browser-root").text(currentPath);
                $list.empty();

                if (entries.length === 0) {
                    $list.html(`<div class="list-group-item text-muted">${this.escapeHtml(this.options.emptyText)}</div>`);
                    return;
                }

                entries.forEach((entry) => {
                    const iconClass = entry.type === "directory" ? "fa-folder-open" : "fa-file-text-o";
                    const executable = this.toBool(entry.executable || entry.executableByOwner);
                    const executableAny = this.toBool(entry.executableAny);
                    const executableRequired = this.options.requireExecutable && entry.type === "file";
                    let rowClass = "";
                    let actionText = entry.type === "directory" ? "Open" : "Select";

                    // Executable-only mode still shows every file.  The classes and
                    // badge text explain which files can be selected and which need
                    // their ownership or permissions corrected first.
                    if (executableRequired && executable) {
                        rowClass = " as-file-browser-entry-executable";
                    } else if (executableRequired && executableAny) {
                        rowClass = " as-file-browser-entry-wrong-owner";
                        actionText = "Wrong owner";
                    } else if (executableRequired) {
                        rowClass = " as-file-browser-entry-disabled";
                        actionText = "Not executable";
                    }

                    const executableAttr = entry.type === "file" ? ` data-executable="${executable ? "true" : "false"}" data-executable-any="${executableAny ? "true" : "false"}"` : "";
                    $list.append(`
                        <a href="#" class="list-group-item as-file-browser-entry${rowClass}" data-type="${this.escapeHtml(entry.type || "")}" data-path="${this.escapeHtml(entry.path || "")}"${executableAttr}>
                            <span class="badge">${actionText}</span>
                            <i class="fa ${iconClass} fa-fw"></i> ${this.escapeHtml(entry.name || "")}
                        </a>
                    `);
                });
            }).fail((xhr) => {
                $list.html(`<div class="list-group-item text-danger">${this.escapeHtml(xhr.responseJSON?.message || this.options.errorText)}</div>`);
            });
        }

        /**
         * Store and display the currently selected file.
         *
         * @param {string} path Selected file path.
         * @param {boolean} executable Whether the file is executable by the configured
         *        owner.  Used to enable or disable the confirmation button when
         *        executable-only mode is active.
         */
        setSelectedFile(path, executable) {
            const selectedPath = $.trim(path || "");
            const $selected = this.$modal.find(".as-file-browser-selected");
            this.$modal.attr("data-selected-file", selectedPath);
            this.$modal.attr("data-selected-executable", executable ? "true" : "false");
            this.$modal.find(".as-file-browser-use").prop("disabled", this.options.requireExecutable && !executable);

            if (selectedPath === "") {
                $selected.text("No file selected.");
                return;
            }

            $selected.text(selectedPath);
        }

        /**
         * Convert common server-side boolean representations into a real boolean.
         *
         * @param {*} value Value to convert.
         * @returns {boolean}
         */
        toBool(value) {
            if (value === true) {
                return true;
            }
            if (value === false || value === null || value === undefined) {
                return false;
            }
            const normalized = String(value).toLowerCase();
            return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "checked";
        }

        /**
         * Build the user-facing message shown when a script has an execute bit, but
         * cannot be run by the configured Allsky owner.
         *
         * @param {string} path Script path.
         * @returns {{html: boolean, message: string}} Modal-ready message content.
         */
        buildExecutableOwnerMessage(path) {
            const owner = $.trim(this.options.executableOwner || "the Allsky user");
            const quotedPath = this.shellQuote(path || "/path/to/script");

            const commands = [
                `sudo chown ${owner}:${owner} ${quotedPath}`,
                `sudo chmod u+rx ${quotedPath}`
            ].join("\n");

            return {
                html: true,
                message: `
                    <p>Allsky can see this script, but it cannot run it as the <strong>${this.escapeHtml(owner)}</strong> user.</p>
                    <p>The script is probably owned by another user, or its permissions do not allow Allsky to run it.</p>
                    <p>To fix this, run these commands on the Pi:</p>
                    <pre class="allow-select" style="white-space: pre-wrap; margin-bottom: 0;"><code>${this.escapeHtml(commands)}</code></pre>
                `
            };
        }

        /**
         * Quote a string for use in the corrective shell commands shown to the user.
         *
         * @param {string} value Raw shell argument.
         * @returns {string} Single-quoted shell argument.
         */
        shellQuote(value) {
            return "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
        }

        /**
         * Show an error message.
         *
         * Plain strings are escaped before being shown.  Structured messages with
         * `{ html: true, message: "..." }` are trusted because they are generated by
         * this helper and already escape any dynamic values.
         *
         * @param {string|Object} message Error text or structured HTML message.
         */
        showError(message) {
            const html = message && typeof message === "object" && message.html === true;
            const fallback = "An unexpected error occurred.";
            const body = html ? message.message : this.escapeHtml(message || fallback);

            if ($.fn && typeof $.fn.modal === "function") {
                this.ensureErrorModal();
                this.$errorModal.find(".as-file-browser-error-title").text(this.options.errorTitle || "Script Cannot Be Used");
                this.$errorModal.find(".as-file-browser-error-text").html(body);
                this.$errorModal.modal("show");
                return;
            }

            window.alert(html ? $("<div>").html(body).text() : (message || fallback));
        }

        /**
         * Escape text before inserting it into HTML.
         *
         * @param {*} value Value to escape.
         * @returns {string} HTML-safe text.
         */
        escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    /**
     * jQuery entry point.
     *
     * Example:
     *
     * $.allskyFileBrowser({
     *     url: "includes/uiutil.php?request=BrowseCommandFiles",
     *     requireExecutable: true,
     *     onSelect: function (path) {
     *         $("#script").val(path);
     *     }
     * }).open();
     *
     * @param {Object} options Browser options documented on the constructor.
     * @returns {AllskyFileBrowser}
     */
    $.allskyFileBrowser = function (options) {
        return new AllskyFileBrowser(options);
    };
}(jQuery));
