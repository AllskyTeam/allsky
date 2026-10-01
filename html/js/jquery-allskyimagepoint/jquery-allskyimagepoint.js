"use strict";

/*
 * Image point field for the WebUI helper tools.
 *
 * Opens the image chosen in another field (an imagepicker, named by
 * data-image-field) and lets the user click a point on it.  The position is
 * written into the input as "X Y" in the image's own full-resolution pixels, so
 * a helper script can use it directly.  With data-snap the click moves to the
 * brightest spot within that many image pixels - handy for picking a star.
 */
(function(jQuery) {
    const pluginName = "allskyImagePoint";
    const defaults = {
        imageField: "",
        imagesPath: "",
        imagesUrl: "/images",
        snap: 0,
        title: "Pick a Point"
    };

    class AllskyImagePoint {
        constructor(element, options) {
            this.containerElement = jQuery(element);
            this.options = jQuery.extend({}, defaults, this.dataOptions(), options || {});
            this.inputElement = this.containerElement.find(".js-allsky-image-point-input");
            this.buttonElement = this.containerElement.find(".js-allsky-image-point-button");
            this.modalElement = null;
            this.imageElement = null;
            this.markerElement = null;
            this.viewportElement = null;
            this.statusElement = null;
            this.point = null;
            this.pixels = null;
            this.loadedUrl = "";
            this.fullSize = false;
        }

        dataOptions() {
            return {
                imageField: this.containerElement.attr("data-image-field") || defaults.imageField,
                imagesPath: (this.containerElement.attr("data-images-path") || "").replace(/\/+$/, ""),
                imagesUrl: (this.containerElement.attr("data-images-url") || defaults.imagesUrl).replace(/\/+$/, ""),
                snap: Math.max(0, parseInt(this.containerElement.attr("data-snap") || "0", 10) || 0),
                title: this.containerElement.attr("data-title") || defaults.title
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
            this.modalElement = jQuery(
                "<div class='modal fade allsky-image-point-modal' tabindex='-1' role='dialog' aria-hidden='true'>" +
                    "<div class='modal-dialog modal-lg' role='document'>" +
                        "<div class='modal-content'>" +
                            "<div class='modal-header'>" +
                                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                                "<h4 class='modal-title'></h4>" +
                            "</div>" +
                            "<div class='modal-body'>" +
                                "<div class='allsky-image-point-toolbar'>" +
                                    "<span class='allsky-image-point-status js-allsky-image-point-status'></span>" +
                                    "<button type='button' class='btn btn-default btn-sm js-allsky-image-point-zoom'></button>" +
                                "</div>" +
                                "<div class='allsky-image-point-viewport js-allsky-image-point-viewport'>" +
                                    "<div class='allsky-image-point-stage'>" +
                                        "<img class='allsky-image-point-image js-allsky-image-point-image' alt=''>" +
                                        "<div class='allsky-image-point-marker js-allsky-image-point-marker'></div>" +
                                    "</div>" +
                                "</div>" +
                            "</div>" +
                            "<div class='modal-footer'>" +
                                "<button type='button' class='btn btn-default' data-dismiss='modal'>Cancel</button>" +
                                "<button type='button' class='btn btn-primary js-allsky-image-point-apply' disabled>Use This Point</button>" +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                "</div>"
            );
            this.modalElement.find(".modal-title").text(this.options.title);
            this.imageElement = this.modalElement.find(".js-allsky-image-point-image");
            this.markerElement = this.modalElement.find(".js-allsky-image-point-marker");
            this.viewportElement = this.modalElement.find(".js-allsky-image-point-viewport");
            this.statusElement = this.modalElement.find(".js-allsky-image-point-status");
            this.applyElement = this.modalElement.find(".js-allsky-image-point-apply");
            this.zoomElement = this.modalElement.find(".js-allsky-image-point-zoom");

            this.imageElement.on("click", (event) => {
                this.pick(event);
            });
            this.imageElement.on("load", () => {
                this.pixels = null;
                this.showMarker();
                this.scrollToMarker();
            });
            this.imageElement.on("error", () => {
                this.status("Unable to load the image.");
            });
            this.zoomElement.on("click", () => {
                this.setFullSize(!this.fullSize);
            });
            this.applyElement.on("click", () => {
                this.apply();
            });
            this.modalElement.on("shown.bs.modal", () => {
                this.showMarker();
                this.scrollToMarker();
            });

            jQuery("body").append(this.modalElement);
        }

        open() {
            const url = this.imageUrl();
            this.modalElement.find(".allsky-image-point-noimage").remove();
            if (url === "") {
                this.status("");
                this.modalElement.find(".modal-body").prepend(
                    jQuery("<div class='alert alert-warning allsky-image-point-noimage'></div>")
                        .text("Choose an image first.")
                );
                this.modalElement.find(".allsky-image-point-viewport, .allsky-image-point-toolbar").hide();
                this.applyElement.prop("disabled", true);
                this.modalElement.modal("show");
                return;
            }

            this.modalElement.find(".allsky-image-point-viewport, .allsky-image-point-toolbar").show();
            this.point = this.parsePoint(this.inputElement.val());
            this.applyElement.prop("disabled", this.point === null);
            this.setFullSize(false);
            this.status(this.point ? this.describe(this.point) : this.hint());
            if (url !== this.loadedUrl) {
                this.loadedUrl = url;
                this.markerElement.hide();
                this.imageElement.attr("src", url);
            }
            this.modalElement.modal("show");
        }

        imageUrl() {
            const field = this.options.imageField;
            if (field === "") {
                return "";
            }
            const form = this.containerElement.closest("form");
            const source = (form.length ? form : jQuery(document)).find("[name='" + field + "']");
            const path = String(source.val() || "").trim();
            if (path === "") {
                return "";
            }
            if (this.options.imagesPath !== "" && path.indexOf(this.options.imagesPath + "/") === 0) {
                const relative = path.slice(this.options.imagesPath.length + 1);
                return this.options.imagesUrl + "/" + relative.split("/").map(encodeURIComponent).join("/");
            }
            return "";
        }

        pick(event) {
            const img = this.imageElement.get(0);
            const box = img.getBoundingClientRect();
            if (!img.naturalWidth || box.width === 0) {
                return;
            }
            let x = (event.clientX - box.left) * img.naturalWidth / box.width;
            let y = (event.clientY - box.top) * img.naturalHeight / box.height;
            let snapped = false;
            if (this.options.snap > 0) {
                const bright = this.brightestNear(x, y, this.options.snap);
                if (bright !== null) {
                    x = bright.x;
                    y = bright.y;
                    snapped = true;
                }
            }
            this.point = { x: Math.round(x), y: Math.round(y) };
            this.applyElement.prop("disabled", false);
            this.showMarker();
            this.status(this.describe(this.point) + (snapped ? " (moved to the brightest spot nearby)" : ""));
        }

        // Brightness-weighted centre of the brightest spot within `radius` image pixels.
        brightestNear(x, y, radius) {
            const pixels = this.imagePixels();
            if (pixels === null) {
                return null;
            }
            const w = pixels.width;
            const h = pixels.height;
            const data = pixels.data;
            const x0 = Math.max(0, Math.floor(x - radius));
            const x1 = Math.min(w - 1, Math.ceil(x + radius));
            const y0 = Math.max(0, Math.floor(y - radius));
            const y1 = Math.min(h - 1, Math.ceil(y + radius));
            let best = -1;
            let bx = x;
            let by = y;
            let sum = 0;
            let count = 0;
            for (let yy = y0; yy <= y1; yy += 1) {
                for (let xx = x0; xx <= x1; xx += 1) {
                    const i = (yy * w + xx) * 4;
                    const v = data[i] + data[i + 1] + data[i + 2];
                    sum += v;
                    count += 1;
                    if (v > best) {
                        best = v;
                        bx = xx;
                        by = yy;
                    }
                }
            }
            if (count === 0 || best <= sum / count * 1.15) {
                return null;                                // nothing stands out: keep the click
            }
            // centroid of the pixels near the peak that are well above the local mean
            const floor = sum / count + (best - sum / count) * 0.5;
            let sx = 0;
            let sy = 0;
            let sw = 0;
            const r = Math.max(2, Math.round(radius / 3));
            for (let yy = Math.max(0, by - r); yy <= Math.min(h - 1, by + r); yy += 1) {
                for (let xx = Math.max(0, bx - r); xx <= Math.min(w - 1, bx + r); xx += 1) {
                    const i = (yy * w + xx) * 4;
                    const v = data[i] + data[i + 1] + data[i + 2] - floor;
                    if (v > 0) {
                        sx += xx * v;
                        sy += yy * v;
                        sw += v;
                    }
                }
            }
            return sw > 0 ? { x: sx / sw, y: sy / sw } : { x: bx, y: by };
        }

        imagePixels() {
            if (this.pixels !== null) {
                return this.pixels;
            }
            const img = this.imageElement.get(0);
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const context = canvas.getContext("2d");
                context.drawImage(img, 0, 0);
                this.pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            } catch (error) {
                this.pixels = null;
                this.options.snap = 0;                      // e.g. a tainted canvas: just use the click
            }
            return this.pixels;
        }

        showMarker() {
            const img = this.imageElement.get(0);
            if (this.point === null || !img.naturalWidth) {
                this.markerElement.hide();
                return;
            }
            const scale = img.clientWidth / img.naturalWidth;
            this.markerElement.css({
                left: (this.point.x * scale) + "px",
                top: (this.point.y * scale) + "px"
            }).show();
        }

        scrollToMarker() {
            if (!this.fullSize || this.point === null) {
                return;
            }
            const viewport = this.viewportElement.get(0);
            viewport.scrollLeft = this.point.x - viewport.clientWidth / 2;
            viewport.scrollTop = this.point.y - viewport.clientHeight / 2;
        }

        setFullSize(fullSize) {
            this.fullSize = fullSize;
            this.viewportElement.toggleClass("allsky-image-point-full", fullSize);
            this.zoomElement.html(fullSize ? "<i class='fa fa-compress'></i> Fit" : "<i class='fa fa-search-plus'></i> 100%");
            this.showMarker();
            this.scrollToMarker();
        }

        apply() {
            if (this.point === null) {
                return;
            }
            this.inputElement.val(this.point.x + " " + this.point.y).trigger("change");
            this.modalElement.modal("hide");
        }

        parsePoint(value) {
            const parts = String(value || "").trim().split(/[\s,;]+/);
            if (parts.length !== 2) {
                return null;
            }
            const x = Number(parts[0]);
            const y = Number(parts[1]);
            return Number.isFinite(x) && Number.isFinite(y) ? { x: Math.round(x), y: Math.round(y) } : null;
        }

        describe(point) {
            return "x " + point.x + ", y " + point.y;
        }

        hint() {
            return "Click the point in the image." + (this.fullSize ? "" : " Use 100% to zoom in.");
        }

        status(text) {
            this.statusElement.text(text);
        }
    }

    jQuery.fn[pluginName] = function(options) {
        return this.each(function() {
            const element = jQuery(this);
            let instance = element.data(pluginName);
            if (!instance) {
                instance = new AllskyImagePoint(this, options);
                element.data(pluginName, instance);
                instance.init();
            }
        });
    };

    jQuery(function() {
        jQuery(".js-allsky-image-point").allskyImagePoint();
    });
})(jQuery);
