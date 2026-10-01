"use strict";

(function(jQuery) {
    const pluginName = "allskyDirectoryBrowser";
    const defaults = {
        endpoint: "/includes/uiutil.php?request=DirectoryBrowserList",
        title: "Select Directory",
        baseFolder: "images",
        maxDepth: null
    };

    class AllskyDirectoryBrowser {
        constructor(element, options) {
            this.containerElement = jQuery(element);
            this.options = jQuery.extend({}, defaults, this.dataOptions(), options || {});
            this.inputElement = this.containerElement.find(".js-allsky-directory-browser-input");
            this.buttonElement = this.containerElement.find(".js-allsky-directory-browser-button");
            this.modalElement = null;
            this.treeElement = null;
            this.selectButtonElement = null;
            this.selectedTextElement = null;
            this.selectedDirectory = null;
            this.loadedDirectories = {};
            this.currentPath = "";
        }

        dataOptions() {
            return {
                baseFolder: this.containerElement.attr("data-base-folder") || defaults.baseFolder,
                maxDepth: this.parseMaxDepth(this.containerElement.attr("data-max-depth"))
            };
        }

        init() {
            if (this.inputElement.length === 0 || this.buttonElement.length === 0) {
                return;
            }

            this.buildModal();
            this.buttonElement.on("click", () => {
                this.open();
            });
        }

        buildModal() {
            const modalId = "allsky-directory-browser-" + Math.random().toString(36).slice(2);
            this.modalElement = jQuery(
                "<div class='modal fade allsky-directory-browser-modal' tabindex='-1' role='dialog' aria-hidden='true'>" +
                    "<div class='modal-dialog modal-lg' role='document'>" +
                        "<div class='modal-content'>" +
                            "<div class='modal-header'>" +
                                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                                "<h4 class='modal-title'></h4>" +
                            "</div>" +
                            "<div class='modal-body'>" +
                                "<div class='allsky-directory-browser' role='tree'></div>" +
                            "</div>" +
                            "<div class='modal-footer'>" +
                                "<span class='allsky-directory-browser-selected js-allsky-directory-browser-selected'></span>" +
                                "<button type='button' class='btn btn-default' data-dismiss='modal'>Cancel</button>" +
                                "<button type='button' class='btn btn-primary js-allsky-directory-browser-select' disabled>Select</button>" +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                "</div>"
            );
            this.modalElement.attr("id", modalId);
            this.modalElement.find(".modal-title").text(this.options.title);
            this.treeElement = this.modalElement.find(".allsky-directory-browser");
            this.selectButtonElement = this.modalElement.find(".js-allsky-directory-browser-select");
            this.selectedTextElement = this.modalElement.find(".js-allsky-directory-browser-selected");

            this.selectButtonElement.on("click", () => {
                this.applySelection();
            });

            jQuery("body").append(this.modalElement);
        }

        open() {
            this.selectedDirectory = null;
            this.currentPath = "";
            this.loadedDirectories = {};
            this.selectButtonElement.prop("disabled", true);
            this.selectedTextElement.text("");

            this.treeElement.html("<div class='allsky-directory-browser-placeholder'>Loading directories...</div>");
            this.loadDirectory("", null);

            this.modalElement.modal("show");
        }

        loadDirectory(path, childrenElement) {
            jQuery.ajax({
                url: this.options.endpoint,
                type: "GET",
                dataType: "json",
                data: {
                    baseFolder: this.options.baseFolder,
                    path: path,
                    currentDirectory: this.inputElement.val() || "",
                    maxDepth: this.options.maxDepth
                },
                headers: { "X-Requested-With": "XMLHttpRequest" }
            }).done((response) => {
                if (!response || !response.ok) {
                    this.showTreeError("Unable to load directories.");
                    return;
                }

                const currentPath = this.normalizePath(response.path || path);
                this.currentPath = this.normalizePath(response.currentPath || this.currentPath);
                this.loadedDirectories[currentPath] = true;
                const listElement = this.renderDirectory(response, response.directories || []);
                if (childrenElement) {
                    childrenElement.empty().append(listElement).addClass("is-open");
                } else {
                    this.treeElement.empty().append(listElement);
                }
            }).fail((xhr) => {
                this.showTreeError(this.getAjaxError(xhr));
            });
        }

        renderDirectory(directory, directories) {
            const listElement = jQuery("<ul></ul>");
            const isTopLevel = this.normalizePath(directory.path || "") === "";

            if (isTopLevel) {
                listElement.append(this.renderRootNode(directory));
            } else {
                listElement.append(this.renderDirectoryNode({
                    name: "Select this folder",
                    path: directory.path || "",
                    fullPath: directory.fullPath || ""
                }, true));
            }

            directories.forEach((child) => {
                listElement.append(this.renderDirectoryNode(child, false));
            });

            if (directories.length === 0) {
                listElement.append(jQuery("<li></li>").append(
                    jQuery("<div class='allsky-directory-browser-placeholder'></div>").text("No folders found.")
                ));
            }

            return listElement;
        }

        renderRootNode(directory) {
            const itemElement = jQuery("<li></li>");
            const nodeElement = jQuery(
                "<div class='allsky-directory-browser-node allsky-directory-browser-root'>" +
                    "<i class='fa fa-folder-open allsky-directory-browser-folder-icon' aria-hidden='true'></i>" +
                    "<span class='allsky-directory-browser-node-name'></span>" +
                "</div>"
            );
            nodeElement.find(".allsky-directory-browser-node-name").text(this.rootName(directory.fullPath));
            nodeElement.attr("title", directory.fullPath || "");
            itemElement.append(nodeElement);
            return itemElement;
        }

        renderDirectoryNode(directory, isCurrent) {
            const itemElement = jQuery("<li></li>");
            const nodeElement = jQuery(
                "<button type='button' class='allsky-directory-browser-node allsky-directory-browser-directory' aria-expanded='false'>" +
                    "<i class='fa fa-caret-right allsky-directory-browser-folder-state' aria-hidden='true'></i>" +
                    "<i class='fa fa-folder allsky-directory-browser-folder-icon' aria-hidden='true'></i>" +
                    "<span class='allsky-directory-browser-node-name'></span>" +
                "</button>"
            );
            const childrenElement = jQuery("<div class='allsky-directory-browser-children'></div>");

            nodeElement.find(".allsky-directory-browser-node-name").text(directory.name);
            nodeElement.attr("title", directory.fullPath || directory.path || directory.name);
            nodeElement.on("click", () => {
                this.selectDirectory(directory, nodeElement);
            });
            nodeElement.on("dblclick", () => {
                this.selectDirectory(directory, nodeElement);
                this.applySelection();
            });

            if (this.canNavigate(directory, isCurrent)) {
                const expandButton = nodeElement.find(".allsky-directory-browser-folder-state");
                expandButton.on("click", (event) => {
                    event.stopPropagation();
                    this.toggleDirectory(directory, nodeElement, childrenElement);
                });
                nodeElement.on("keydown", (event) => {
                    if (event.key === "ArrowRight") {
                        event.preventDefault();
                        this.toggleDirectory(directory, nodeElement, childrenElement);
                    }
                });
            } else {
                if (isCurrent) {
                    nodeElement.find(".allsky-directory-browser-folder-state").removeClass("fa-caret-right").addClass("fa-check");
                } else {
                    nodeElement.find(".allsky-directory-browser-folder-state").css("visibility", "hidden");
                }
            }

            if (this.normalizePath(directory.path || "") === this.currentPath) {
                this.selectDirectory(directory, nodeElement);
            }

            itemElement.append(nodeElement, childrenElement);
            return itemElement;
        }

        selectDirectory(directory, nodeElement) {
            this.selectedDirectory = directory;
            this.treeElement.find(".allsky-directory-browser-node").removeClass("is-selected");
            nodeElement.addClass("is-selected");
            this.selectButtonElement.prop("disabled", false);
            this.selectedTextElement.text(directory.fullPath || "");
        }

        toggleDirectory(directory, nodeElement, childrenElement) {
            const isOpen = childrenElement.hasClass("is-open");
            if (isOpen) {
                childrenElement.removeClass("is-open");
                this.setDirectoryOpen(nodeElement, false);
                return;
            }

            this.setDirectoryOpen(nodeElement, true);
            if (this.loadedDirectories[this.normalizePath(directory.path)]) {
                childrenElement.addClass("is-open");
                return;
            }

            childrenElement.html("<div class='allsky-directory-browser-placeholder'>Loading...</div>").addClass("is-open");
            this.loadDirectory(directory.path || "", childrenElement);
        }

        setDirectoryOpen(nodeElement, isOpen) {
            nodeElement.toggleClass("is-open", isOpen);
            nodeElement.attr("aria-expanded", isOpen ? "true" : "false");
            nodeElement
                .find(".allsky-directory-browser-folder-state")
                .toggleClass("fa-caret-right", !isOpen)
                .toggleClass("fa-caret-down", isOpen);
            nodeElement
                .find(".allsky-directory-browser-folder-icon")
                .toggleClass("fa-folder", !isOpen)
                .toggleClass("fa-folder-open", isOpen);
        }

        applySelection() {
            if (!this.selectedDirectory || !this.selectedDirectory.fullPath) {
                return;
            }

            this.inputElement.val(this.selectedDirectory.fullPath).trigger("change");
            this.modalElement.modal("hide");
        }

        normalizePath(path) {
            return String(path || "").replace(/^\/+|\/+$/g, "");
        }

        parseMaxDepth(value) {
            if (value === undefined || value === null || value === "") {
                return null;
            }

            const depth = parseInt(value, 10);
            if (Number.isNaN(depth)) {
                return null;
            }

            return Math.max(0, depth);
        }

        canNavigate(directory, isCurrent) {
            if (isCurrent || this.options.maxDepth === null) {
                return !isCurrent;
            }

            return this.pathDepth(directory.path || "") < this.options.maxDepth;
        }

        pathDepth(path) {
            const normalized = this.normalizePath(path);
            if (normalized === "") {
                return 0;
            }

            return normalized.split("/").length;
        }

        rootName(path) {
            const name = this.directoryName(path);
            return name === "" ? "Images" : name;
        }

        directoryName(path) {
            const parts = String(path || "").replace(/\/+$/g, "").split("/");
            return parts[parts.length - 1] || "";
        }

        showTreeError(message) {
            this.treeElement.html(jQuery("<div class='allsky-directory-browser-placeholder'></div>").text(message));
        }

        getAjaxError(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.message) {
                return xhr.responseJSON.message;
            }
            return "Unable to load directories.";
        }
    }

    jQuery.fn[pluginName] = function(options) {
        return this.each(function() {
            const element = jQuery(this);
            let instance = element.data(pluginName);
            if (!instance) {
                instance = new AllskyDirectoryBrowser(this, options);
                element.data(pluginName, instance);
                instance.init();
            }
        });
    };

    jQuery(function() {
        jQuery(".js-allsky-directory-browser").allskyDirectoryBrowser();
    });
})(jQuery);
