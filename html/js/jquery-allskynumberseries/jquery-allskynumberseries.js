"use strict";

(function(jQuery) {
    const pluginName = "allskyNumberSeries";
    const defaults = {
        numberType: "float",
        step: 1,
        count: 5,
        decimals: null,
        separator: "  ",
        min: null,
        max: null
    };

    class AllskyNumberSeries {
        constructor(element, options) {
            this.containerElement = jQuery(element);
            this.options = jQuery.extend({}, defaults, this.dataOptions(), options || {});
            this.inputElement = this.containerElement.find(".js-allsky-number-series-input");
            this.buttonElement = this.containerElement.find(".js-allsky-number-series-button");
            this.modalElement = null;
            this.startElement = null;
            this.stepElement = null;
            this.countElement = null;
            this.previewElement = null;
        }

        dataOptions() {
            return {
                numberType: this.containerElement.attr("data-number-type") || defaults.numberType,
                step: this.numberOrDefault(this.containerElement.attr("data-step"), defaults.step),
                count: Math.max(1, parseInt(this.containerElement.attr("data-count") || defaults.count, 10) || defaults.count),
                decimals: this.optionalInteger(this.containerElement.attr("data-decimals")),
                separator: this.containerElement.attr("data-separator") || defaults.separator,
                min: this.optionalNumber(this.containerElement.attr("data-min")),
                max: this.optionalNumber(this.containerElement.attr("data-max"))
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
            const modalId = "allsky-number-series-" + Math.random().toString(36).slice(2);
            this.modalElement = jQuery(
                "<div class='modal fade allsky-number-series-modal' tabindex='-1' role='dialog' aria-hidden='true'>" +
                    "<div class='modal-dialog' role='document'>" +
                        "<div class='modal-content'>" +
                            "<div class='modal-header'>" +
                                "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                                "<h4 class='modal-title'>Build Number Series</h4>" +
                            "</div>" +
                            "<div class='modal-body'>" +
                                "<div class='allsky-number-series-controls'>" +
                                    "<label><span>Start</span><input type='number' class='form-control js-allsky-number-series-start'></label>" +
                                    "<label><span>Step</span><input type='number' class='form-control js-allsky-number-series-step'></label>" +
                                    "<label><span>Count</span><input type='number' class='form-control js-allsky-number-series-count' min='1' step='1'></label>" +
                                "</div>" +
                                "<label class='allsky-number-series-preview-label'>Preview</label>" +
                                "<textarea class='form-control allsky-number-series-preview js-allsky-number-series-preview' rows='4'></textarea>" +
                            "</div>" +
                            "<div class='modal-footer'>" +
                                "<button type='button' class='btn btn-default js-allsky-number-series-normalize'>Normalize Existing</button>" +
                                "<button type='button' class='btn btn-default' data-dismiss='modal'>Cancel</button>" +
                                "<button type='button' class='btn btn-primary js-allsky-number-series-apply'>Apply</button>" +
                            "</div>" +
                        "</div>" +
                    "</div>" +
                "</div>"
            );
            this.modalElement.attr("id", modalId);

            this.startElement = this.modalElement.find(".js-allsky-number-series-start");
            this.stepElement = this.modalElement.find(".js-allsky-number-series-step");
            this.countElement = this.modalElement.find(".js-allsky-number-series-count");
            this.previewElement = this.modalElement.find(".js-allsky-number-series-preview");

            const numericStep = this.isIntegerMode() ? 1 : "any";
            this.startElement.attr("step", numericStep);
            this.stepElement.attr("step", numericStep);

            if (this.options.min !== null) {
                this.startElement.attr("min", this.options.min);
            }
            if (this.options.max !== null) {
                this.startElement.attr("max", this.options.max);
            }

            this.startElement.add(this.stepElement).add(this.countElement).on("input change", () => {
                this.updatePreview();
            });
            this.modalElement.find(".js-allsky-number-series-normalize").on("click", () => {
                this.previewElement.val(this.normalizedInputValue());
            });
            this.modalElement.find(".js-allsky-number-series-apply").on("click", () => {
                this.applyPreview();
            });

            jQuery("body").append(this.modalElement);
        }

        open() {
            this.syncControlsFromInput();
            this.updatePreview();
            this.modalElement.modal("show");
        }

        syncControlsFromInput() {
            const numbers = this.parseNumbers(this.inputElement.val());
            const start = numbers.length > 0 ? numbers[0] : 0;
            const step = numbers.length > 1 ? numbers[1] - numbers[0] : this.options.step;
            const count = numbers.length > 0 ? numbers.length : this.options.count;

            this.startElement.val(this.formatNumber(start));
            this.stepElement.val(this.formatNumber(step));
            this.countElement.val(count);
        }

        updatePreview() {
            this.previewElement.val(this.generatedSeriesValue());
        }

        generatedSeriesValue() {
            const start = this.numberOrDefault(this.startElement.val(), 0);
            const step = this.numberOrDefault(this.stepElement.val(), this.options.step);
            const count = Math.max(1, parseInt(this.countElement.val(), 10) || this.options.count);
            const values = [];

            for (let index = 0; index < count; index += 1) {
                const value = this.clamp(start + (step * index));
                values.push(this.formatNumber(value));
            }

            return values.join(this.options.separator);
        }

        normalizedInputValue() {
            const values = this.parseNumbers(this.inputElement.val()).map((value) => this.formatNumber(this.clamp(value)));
            return values.join(this.options.separator);
        }

        applyPreview() {
            this.inputElement.val(this.previewElement.val()).trigger("change");
            this.modalElement.modal("hide");
        }

        parseNumbers(value) {
            return String(value || "")
                .split(/[\s,;]+/)
                .map((item) => this.optionalNumber(item))
                .filter((item) => item !== null);
        }

        formatNumber(value) {
            let number = Number(value) || 0;
            if (this.isIntegerMode()) {
                return String(Math.round(number));
            }

            const decimals = this.options.decimals !== null ? this.options.decimals : this.inferDecimals(number);
            const formatted = number.toFixed(decimals);
            return formatted.indexOf(".") === -1 ? formatted : formatted.replace(/0+$/g, "").replace(/\.$/g, "");
        }

        inferDecimals(value) {
            const text = String(value);
            if (text.indexOf("e-") !== -1) {
                return Math.min(10, parseInt(text.split("e-")[1], 10) || 0);
            }
            const dotIndex = text.indexOf(".");
            return dotIndex === -1 ? 0 : Math.min(10, text.length - dotIndex - 1);
        }

        clamp(value) {
            let number = Number(value) || 0;
            if (this.options.min !== null) {
                number = Math.max(this.options.min, number);
            }
            if (this.options.max !== null) {
                number = Math.min(this.options.max, number);
            }
            return number;
        }

        optionalInteger(value) {
            if (value === undefined || value === null || value === "") {
                return null;
            }
            const parsed = parseInt(value, 10);
            return Number.isNaN(parsed) ? null : Math.max(0, parsed);
        }

        optionalNumber(value) {
            if (value === undefined || value === null || value === "") {
                return null;
            }
            const parsed = Number(value);
            return Number.isNaN(parsed) ? null : parsed;
        }

        numberOrDefault(value, fallback) {
            const parsed = this.optionalNumber(value);
            return parsed === null ? fallback : parsed;
        }

        isIntegerMode() {
            return this.options.numberType === "integer" || this.options.numberType === "int";
        }
    }

    jQuery.fn[pluginName] = function(options) {
        return this.each(function() {
            const element = jQuery(this);
            let instance = element.data(pluginName);
            if (!instance) {
                instance = new AllskyNumberSeries(this, options);
                element.data(pluginName, instance);
                instance.init();
            }
        });
    };

    jQuery(function() {
        jQuery(".js-allsky-number-series").allskyNumberSeries();
    });
})(jQuery);
