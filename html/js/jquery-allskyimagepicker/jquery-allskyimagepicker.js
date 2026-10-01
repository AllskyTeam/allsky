"use strict";

(function(jQuery) {
    const pluginName = "allskyImagePicker";
    const defaults = {
        endpoint: "includes/helperutils.php?request=ImagePickerList",
        title: "Select Image",
        topLevelFoldersOnly: false,
        excludeTestFolders: false,
        showDefaultImage: false
    };

    class AllskyImagePicker {
        constructor(element, options) {
            this.containerElement = jQuery(element);
            this.options = jQuery.extend({}, defaults, this.dataOptions(), options || {});
            this.inputElement = this.containerElement.find(".js-allsky-image-picker-input");
            this.buttonElement = this.containerElement.find(".js-allsky-image-picker-button");
            this.modalElement = null;
            this.treeElement = null;
            this.previewImageElement = null;
            this.previewDetailsElement = null;
            this.expandButtonElement = null;
            this.selectButtonElement = null;
            this.selectedFile = null;
            this.loadedDirectories = {};
        }

        dataOptions() {
            return {
                topLevelFoldersOnly: this.containerElement.attr("data-top-level-folders-only") === "true",
                excludeTestFolders: this.containerElement.attr("data-exclude-test-folders") === "true",
                showDefaultImage: this.containerElement.attr("data-show-default-image") === "true"
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
            const modalId = "allsky-image-picker-" + Math.random().toString(36).slice(2);
            this.modalElement = jQuery(
                "<div class='modal fade allsky-image-picker-modal' tabindex='-1' role='dialog' aria-hidden='true'>" +
                    "<div class='modal-dialog modal-lg' role='document'>" +
                        "<div class='modal-content'>" +
                            "<div class='modal-header'>" +
                                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                                "<h4 class='modal-title'></h4>" +
                            "</div>" +
                            "<div class='modal-body'>" +
                                "<div class='allsky-image-picker'>" +
                                    "<div class='allsky-image-picker-tree' role='tree'></div>" +
                                    "<div class='allsky-image-picker-preview'>" +
                                        "<div class='allsky-image-picker-preview-image'>" +
                                            "<button type='button' class='btn btn-default allsky-image-picker-expand js-allsky-image-picker-expand' disabled title='Expand image'>" +
                                                "<i class='fa fa-search-plus' aria-hidden='true'></i>" +
                                            "</button>" +
                                            "<div class='allsky-image-picker-placeholder'>Select an image to preview it.</div>" +
                                        "</div>" +
                                        "<div class='allsky-image-picker-details'></div>" +
                                    "</div>" +
                                "</div>" +
                            "</div>" +
                            "<div class='modal-footer'>" +
                                "<button type='button' class='btn btn-default' data-dismiss='modal'>Cancel</button>" +
                                "<button type='button' class='btn btn-primary js-allsky-image-picker-select' disabled>Select</button>" +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                "</div>"
            );
            this.modalElement.attr("id", modalId);
            this.modalElement.find(".modal-title").text(this.options.title);
            this.treeElement = this.modalElement.find(".allsky-image-picker-tree");
            this.previewImageElement = this.modalElement.find(".allsky-image-picker-preview-image");
            this.previewDetailsElement = this.modalElement.find(".allsky-image-picker-details");
            this.expandButtonElement = this.modalElement.find(".js-allsky-image-picker-expand");
            this.selectButtonElement = this.modalElement.find(".js-allsky-image-picker-select");

            this.selectButtonElement.on("click", () => {
                this.applySelection();
            });
            this.expandButtonElement.on("click", () => {
                this.expandSelectedImage();
            });

            jQuery("body").append(this.modalElement);
        }

        open() {
            this.selectedFile = null;
            this.selectButtonElement.prop("disabled", true);
            this.clearPreview();

            if (!this.loadedDirectories[""]) {
                this.treeElement.html("<div class='allsky-image-picker-placeholder'>Loading images...</div>");
                this.loadDirectory("", null);
            }

            this.modalElement.modal("show");
        }

        loadDirectory(path, childrenElement) {
            jQuery.ajax({
                url: this.options.endpoint,
                type: "GET",
                dataType: "json",
                data: { path: path },
                headers: { "X-Requested-With": "XMLHttpRequest" }
            }).done((response) => {
                if (!response || !response.ok) {
                    this.showTreeError("Unable to load images.");
                    return;
                }

                this.loadedDirectories[path] = true;
                const currentPath = this.normalizePath(response.path || path);
                const listElement = this.renderDirectory(
                    this.visibleDirectories(currentPath, response.directories || []),
                    this.visibleFiles(currentPath, response.files || []),
                    currentPath
                );
                if (childrenElement) {
                    childrenElement.empty().append(listElement).addClass("is-open");
                } else {
                    this.treeElement.empty().append(listElement);
                }
            }).fail((xhr) => {
                this.showTreeError(this.getAjaxError(xhr));
            });
        }

        visibleDirectories(path, directories) {
            if (this.options.topLevelFoldersOnly && path !== "") {
                return [];
            }
            if (!this.options.excludeTestFolders) {
                return directories;
            }
            return directories.filter((directory) => !this.isTestFolder(directory));
        }

        visibleFiles(path, files) {
            if (this.options.topLevelFoldersOnly && path === "") {
                return [];
            }
            return files;
        }

        normalizePath(path) {
            return String(path || "").replace(/^\/+|\/+$/g, "");
        }

        isTestFolder(directory) {
            return String(directory.name || "").indexOf("test_") === 0;
        }

        renderDirectory(directories, files, path) {
            const listElement = jQuery("<ul></ul>");
            const defaultImage = path === "" ? this.defaultImage() : null;

            if (defaultImage) {
                listElement.append(this.renderFile(defaultImage, true));
            }

            directories.forEach((directory) => {
                const itemElement = jQuery("<li></li>");
                const nodeElement = jQuery(
                    "<button type='button' class='allsky-image-picker-node allsky-image-picker-directory' aria-expanded='false'>" +
                        "<i class='fa fa-caret-right allsky-image-picker-folder-state' aria-hidden='true'></i>" +
                        "<i class='fa fa-folder allsky-image-picker-folder-icon' aria-hidden='true'></i>" +
                        "<span class='allsky-image-picker-node-name'></span>" +
                    "</button>"
                );
                const childrenElement = jQuery("<div class='allsky-image-picker-children'></div>");
                nodeElement.find(".allsky-image-picker-node-name").text(directory.name);
                nodeElement.attr("title", directory.path || directory.name);
                nodeElement.on("click", () => {
                    this.toggleDirectory(directory, nodeElement, childrenElement);
                });
                itemElement.append(nodeElement, childrenElement);
                listElement.append(itemElement);
            });

            files.forEach((file) => {
                listElement.append(this.renderFile(file, false));
            });

            if (!defaultImage && directories.length === 0 && files.length === 0) {
                listElement.append(jQuery("<li></li>").append(
                    jQuery("<div class='allsky-image-picker-placeholder'></div>").text(this.emptyMessage(path))
                ));
            }

            return listElement;
        }

        renderFile(file, isDefault) {
            const itemElement = jQuery("<li></li>");
            const nodeElement = jQuery(
                "<button type='button' class='allsky-image-picker-node allsky-image-picker-file'>" +
                    "<i class='fa fa-image'></i>" +
                    "<span class='allsky-image-picker-node-name'></span>" +
                "</button>"
            );
            nodeElement.find(".allsky-image-picker-node-name").text(isDefault ? "Default image - " + file.name : file.name);
            nodeElement.attr("title", file.fullPath || file.name);
            if (isDefault) {
                nodeElement.addClass("allsky-image-picker-default-file");
            }
            nodeElement.on("click", () => {
                this.previewFile(file, nodeElement);
            });
            nodeElement.on("dblclick", () => {
                this.previewFile(file, nodeElement);
                this.applySelection();
            });
            itemElement.append(nodeElement);
            return itemElement;
        }

        defaultImage() {
            if (!this.options.showDefaultImage) {
                return null;
            }
            const fullPath = this.containerElement.attr("data-default-image-path") || "";
            const url = this.containerElement.attr("data-default-image-url") || "";
            if (fullPath === "" || url === "") {
                return null;
            }

            return {
                name: this.containerElement.attr("data-default-image-name") || this.fileName(fullPath),
                path: "",
                fullPath: fullPath,
                url: url,
                size: Number(this.containerElement.attr("data-default-image-size")) || 0,
                modified: Number(this.containerElement.attr("data-default-image-modified")) || 0
            };
        }

        emptyMessage(path) {
            if (this.options.topLevelFoldersOnly && path === "") {
                return "No folders found.";
            }
            return "No images in this folder.";
        }

        toggleDirectory(directory, nodeElement, childrenElement) {
            const isOpen = childrenElement.hasClass("is-open");
            if (isOpen) {
                childrenElement.removeClass("is-open");
                this.setDirectoryOpen(nodeElement, false);
                return;
            }

            this.setDirectoryOpen(nodeElement, true);
            if (this.loadedDirectories[directory.path]) {
                childrenElement.addClass("is-open");
                return;
            }

            childrenElement.html("<div class='allsky-image-picker-placeholder'>Loading...</div>").addClass("is-open");
            this.loadDirectory(directory.path || "", childrenElement);
        }

        setDirectoryOpen(nodeElement, isOpen) {
            nodeElement.toggleClass("is-open", isOpen);
            nodeElement.attr("aria-expanded", isOpen ? "true" : "false");
            nodeElement
                .find(".allsky-image-picker-folder-state")
                .toggleClass("fa-caret-right", !isOpen)
                .toggleClass("fa-caret-down", isOpen);
            nodeElement
                .find(".allsky-image-picker-folder-icon")
                .toggleClass("fa-folder", !isOpen)
                .toggleClass("fa-folder-open", isOpen);
        }

        previewFile(file, nodeElement) {
            this.selectedFile = file;
            this.treeElement.find(".allsky-image-picker-node").removeClass("is-selected");
            nodeElement.addClass("is-selected");
            this.selectButtonElement.prop("disabled", false);
            this.expandButtonElement.prop("disabled", false);

            const imageElement = jQuery("<img alt='Selected image preview'>");
            imageElement.attr("src", file.url);
            this.previewImageElement.find("img, .allsky-image-picker-placeholder").remove();
            this.previewImageElement.append(imageElement);
            this.previewDetailsElement.html(
                "<div><span>Name</span><strong></strong></div>" +
                "<div><span>Path</span><code></code></div>" +
                "<div><span>Size</span><span class='js-image-size'></span></div>" +
                "<div><span>Modified</span><span class='js-image-modified'></span></div>"
            );
            this.previewDetailsElement.find("strong").text(file.name || "");
            this.previewDetailsElement.find("code").text(file.fullPath || "");
            this.previewDetailsElement.find(".js-image-size").text(this.formatBytes(file.size || 0));
            this.previewDetailsElement.find(".js-image-modified").text(this.formatDate(file.modified || 0));
        }

        expandSelectedImage() {
            if (!this.selectedFile || !this.selectedFile.url || typeof lightGallery !== "function") {
                return;
            }

            const galleryElement = document.createElement("div");
            const plugins = [];
            if (typeof lgZoom !== "undefined") {
                plugins.push(lgZoom);
            }

            const gallery = lightGallery(galleryElement, {
                dynamic: true,
                dynamicEl: [{
                    src: this.selectedFile.url,
                    thumb: this.selectedFile.url,
                    subHtml: this.selectedFile.fullPath || this.selectedFile.name || ""
                }],
                plugins: plugins,
                download: false
            });
            gallery.openGallery(0);
        }

        applySelection() {
            if (!this.selectedFile || !this.selectedFile.fullPath) {
                return;
            }

            this.inputElement.val(this.selectedFile.fullPath).trigger("change");
            this.modalElement.modal("hide");
        }

        clearPreview() {
            this.previewImageElement.find("img, .allsky-image-picker-placeholder").remove();
            this.previewImageElement.append("<div class='allsky-image-picker-placeholder'>Select an image to preview it.</div>");
            this.previewDetailsElement.empty();
            this.expandButtonElement.prop("disabled", true);
        }

        showTreeError(message) {
            this.treeElement.html(jQuery("<div class='allsky-image-picker-placeholder'></div>").text(message));
        }

        getAjaxError(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.message) {
                return xhr.responseJSON.message;
            }
            return "Unable to load images.";
        }

        formatBytes(bytes) {
            const units = ["B", "KB", "MB", "GB"];
            let value = Number(bytes) || 0;
            let index = 0;
            while (value >= 1024 && index < units.length - 1) {
                value = value / 1024;
                index += 1;
            }
            return (index === 0 ? String(value) : value.toFixed(1)) + " " + units[index];
        }

        formatDate(timestamp) {
            const value = Number(timestamp) || 0;
            if (value <= 0) {
                return "";
            }
            return new Date(value * 1000).toLocaleString();
        }

        fileName(path) {
            const parts = String(path || "").split("/");
            return parts[parts.length - 1] || "";
        }
    }

    jQuery.fn[pluginName] = function(options) {
        return this.each(function() {
            const element = jQuery(this);
            let instance = element.data(pluginName);
            if (!instance) {
                instance = new AllskyImagePicker(this, options);
                element.data(pluginName, instance);
                instance.init();
            }
        });
    };

    jQuery(function() {
        jQuery(".js-allsky-image-picker").allskyImagePicker();
    });
})(jQuery);
