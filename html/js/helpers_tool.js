"use strict";

class HelperToolPage {
    constructor(rootElement) {
        this.rootElement = $(rootElement);
        this.formElement = this.rootElement.find(".js-helper-form");
        this.overlayElement = $("body");
        this.outputElement = this.rootElement.find(".js-helper-output");
        this.resultsOutputElement = this.rootElement.find(".js-helper-results-output");
        this.imagesContainerElement = this.rootElement.find(".js-helper-images");
        this.runButtonElement = this.rootElement.find(".js-helper-run");
        this.commandButtonElement = this.rootElement.find(".js-helper-show-command");
        this.runCommandButtonElement = this.rootElement.find(".js-helper-run-command");
        this.runCommandModalElement = this.rootElement.find(".js-helper-run-command-modal");
        this.runCommandModalTitleElement = this.rootElement.find(".js-helper-run-command-modal-title");
        this.runCommandOutputElement = this.rootElement.find(".js-helper-run-command-output");
        this.resultsTabsElement = this.rootElement.find(".js-helper-results-tabs");
        this.resultsContentElement = this.rootElement.find(".js-helper-results-content");
        this.settingsTabElement = this.rootElement.find(".js-helper-settings-tab");
        this.resultsTabItemElement = this.rootElement.find(".js-helper-results-tab-item");
        this.imagesTabItemElement = this.rootElement.find(".js-helper-images-tab-item");
        this.outputTabItemElement = this.rootElement.find(".js-helper-output-tab-item");
        this.resultsTabElement = this.rootElement.find(".js-helper-results-tab");
        this.imagesTabElement = this.rootElement.find(".js-helper-images-tab");
        this.outputTabElement = this.rootElement.find(".js-helper-output-tab");
        this.imagesTabLabelElement = this.rootElement.find(".js-helper-images-tab-label");
        this.outputTabLabelElement = this.rootElement.find(".js-helper-output-tab-label");
        this.endpoint = String(this.rootElement.data("endpoint") || "");
        this.request = String(this.rootElement.data("request") || "");
        this.helper = String(this.rootElement.data("helper") || "");
        this.method = String(this.rootElement.data("method") || "POST").toUpperCase();
        this.autoRun = this.rootElement.data("autoRun") === true || String(this.rootElement.data("autoRun") || "") === "true";
        this.outputFormat = String(this.rootElement.data("outputFormat") || "text").toLowerCase();
        this.runningMessage = String(this.rootElement.data("runningMessage") || "Running helper...");
        this.workingMessage = String(this.rootElement.data("workingMessage") || "Working...");
        this.idleButtonLabel = String(this.runButtonElement.val() || "Run");
        this.runningButtonLabel = String(this.rootElement.data("runningButtonLabel") || "Running...");
        this.runCommandRequest = String(this.rootElement.data("runCommandRequest") || "");
    }

    init() {
        if (
            this.formElement.length === 0 ||
            this.outputElement.length === 0 ||
            this.resultsOutputElement.length === 0 ||
            this.imagesContainerElement.length === 0 ||
            this.endpoint === "" ||
            this.request === ""
        ) {
            return;
        }

        this.clearImages();
        this.outputElement.text("");
        this.resultsOutputElement.text("");
        this.updateResultsVisibility();
        this.selectTab(this.settingsTabElement.length > 0 ? this.settingsTabElement : this.imagesTabElement);

        this.formElement.on("submit", (event) => {
            event.preventDefault();
            this.run();
        });

        this.commandButtonElement.on("click", (event) => {
            event.preventDefault();
            this.showCommandPreview();
        });

        this.runCommandButtonElement.on("click", (event) => {
            event.preventDefault();
            this.runCommandButton($(event.currentTarget));
        });

        this.runCommandButtonElement.popover();

        if (this.autoRun) {
            this.run();
        }
    }

    run() {
        this.showOutput(this.runningMessage, false);
        this.clearImages();
        this.selectTab(this.resultsTabElement);
        this.setBusy(true, this.runningButtonLabel);
        this.showWorkingOverlay(this.workingMessage);

        $.ajax({
            url: this.buildUrl(),
            type: this.method,
            dataType: "json",
            data: this.formElement.serialize(),
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).done((response) => {
            this.handleResponse(response).always(() => {
                this.hideWorkingOverlay();
                this.setBusy(false, this.idleButtonLabel);
            });
        }).fail((xhr) => {
            this.showOutput(this.getAjaxError(xhr), true, false);
            this.clearImages();
            this.selectTab(this.resultsTabElement);
            this.hideWorkingOverlay();
            this.setBusy(false, this.idleButtonLabel);
        });
    }

    buildUrl(request) {
        let url = this.endpoint + "?request=" + encodeURIComponent(request || this.request);

        if (this.helper !== "") {
            url += "&helper=" + encodeURIComponent(this.helper);
        }

        return url;
    }

    showCommandPreview() {
        this.commandButtonElement.prop("disabled", true);

        $.ajax({
            url: this.buildUrl("HelperCommand"),
            type: this.method,
            dataType: "json",
            data: this.formElement.serialize(),
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).done((response) => {
            const command = response && response.command ? response.command : "No command returned.";
            this.showCommandModal(command);
        }).fail((xhr) => {
            this.showCommandModal(this.getAjaxError(xhr));
        }).always(() => {
            this.commandButtonElement.prop("disabled", false);
        });
    }

    showCommandModal(command) {
        const modalElement = this.getCommandModal();

        modalElement.find(".js-helper-command-modal-command").text(command);
        modalElement.modal("show");
    }

    getCommandModal() {
        let modalElement = $("#helper-command-modal");

        if (modalElement.length > 0) {
            return modalElement;
        }

        modalElement = $(
            "<div class='modal fade' id='helper-command-modal' tabindex='-1' role='dialog' aria-labelledby='helper-command-modal-title'>" +
                "<div class='modal-dialog modal-lg' role='document'>" +
                    "<div class='modal-content'>" +
                        "<div class='modal-header'>" +
                            "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                            "<h4 class='modal-title' id='helper-command-modal-title'>Command</h4>" +
                        "</div>" +
                        "<div class='modal-body'>" +
                            "<pre class='helper-command-modal-command js-helper-command-modal-command'></pre>" +
                        "</div>" +
                        "<div class='modal-footer'>" +
                            "<button type='button' class='btn btn-default' data-dismiss='modal'>Close</button>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
            "</div>"
        );

        $("body").append(modalElement);
        return modalElement;
    }

    selectTab(tabElement) {
        if (tabElement.length > 0) {
            tabElement.tab("show");
        }
    }

    updateResultsVisibility() {
        const hasImages = $.trim(this.imagesContainerElement.html()) !== "";
        const outputText = $.trim(this.outputElement.text());
        const hasOutput = outputText !== "" && outputText !== "No output returned.";
        const hasResults = hasOutput && !hasImages;

        this.updateResultTabLabels();

        if (this.settingsTabElement.length > 0) {
            this.resultsTabsElement.show();
            this.resultsContentElement.show();
            this.resultsTabItemElement.toggle(hasResults);
            this.imagesTabItemElement.toggle(hasImages);
            this.outputTabItemElement.toggle(hasOutput);

            if (
                this.resultsTabItemElement.is(":visible") &&
                !this.resultsTabItemElement.hasClass("active") &&
                !this.imagesTabItemElement.hasClass("active") &&
                !this.outputTabItemElement.hasClass("active")
            ) {
                this.selectTab(this.resultsTabElement);
            }
            return;
        }

        const hasAnyContent = hasImages || hasOutput;

        this.resultsTabsElement.toggle(hasAnyContent);
        this.resultsContentElement.toggle(hasAnyContent);
        this.resultsTabItemElement.toggle(hasResults);
        this.imagesTabItemElement.toggle(hasImages);
        this.outputTabItemElement.toggle(hasOutput);

        if (!hasAnyContent) {
            return;
        }

        if (
            this.resultsTabItemElement.is(":visible") &&
            !this.resultsTabItemElement.hasClass("active") &&
            !this.imagesTabItemElement.hasClass("active") &&
            !this.outputTabItemElement.hasClass("active")
        ) {
            this.selectTab(this.resultsTabElement);
            return;
        }

        if (
            this.imagesTabItemElement.is(":visible") &&
            !this.imagesTabItemElement.hasClass("active") &&
            !this.outputTabItemElement.hasClass("active")
        ) {
            this.selectTab(this.imagesTabElement);
            return;
        }

        if (
            !this.resultsTabItemElement.is(":visible") &&
            this.resultsTabItemElement.hasClass("active") &&
            this.imagesTabItemElement.is(":visible")
        ) {
            this.selectTab(this.imagesTabElement);
            return;
        }

        if (
            !this.resultsTabItemElement.is(":visible") &&
            this.resultsTabItemElement.hasClass("active") &&
            this.outputTabItemElement.is(":visible")
        ) {
            this.selectTab(this.outputTabElement);
            return;
        }

        if (
            !this.imagesTabItemElement.is(":visible") &&
            this.imagesTabItemElement.hasClass("active") &&
            this.outputTabItemElement.is(":visible")
        ) {
            this.selectTab(this.outputTabElement);
            return;
        }

        if (
            !this.outputTabItemElement.is(":visible") &&
            this.outputTabItemElement.hasClass("active") &&
            this.imagesTabItemElement.is(":visible")
        ) {
            this.selectTab(this.imagesTabElement);
        }
    }

    updateResultTabLabels() {
        if (this.imagesTabLabelElement.length > 0) {
            this.imagesTabLabelElement.text("Images");
        }

        if (this.outputTabLabelElement.length > 0) {
            this.outputTabLabelElement.text("Output");
        }
    }

    clearImages() {
        this.imagesContainerElement.empty();
        this.updateResultsVisibility();
    }

    showOutput(text, isError, renderHtml) {
        const output = text && text !== "" ? text : "No output returned.";

        if (renderHtml) {
            this.outputElement.html(output);
            this.resultsOutputElement.html(output);
        } else {
            this.outputElement.text(output);
            this.resultsOutputElement.text(output);
        }

        this.outputElement.toggleClass("errorMsgBig", !!isError);
        this.resultsOutputElement.toggleClass("errorMsgBig", !!isError);
        this.updateResultsVisibility();
    }

    setBusy(isBusy, buttonText) {
        this.runButtonElement.prop("disabled", isBusy).val(buttonText);
        this.commandButtonElement.prop("disabled", isBusy);
        this.runCommandButtonElement.prop("disabled", isBusy);
    }

    setRunCommandBusy(buttonElement, isBusy, buttonText) {
        this.runCommandButtonElement.prop("disabled", isBusy);
        buttonElement.text(buttonText);
        this.runButtonElement.prop("disabled", isBusy);
        this.commandButtonElement.prop("disabled", isBusy);
    }

    showWorkingOverlay(message) {
        this.overlayElement.LoadingOverlay("show", {
            image: "",
            fontawesome: "fa fa-spinner fa-spin",
            fontawesomeColor: "#ffffff",
            background: "rgba(0, 0, 0, 0.55)",
            text: message,
            textColor: "#ffffff"
        });
    }

    hideWorkingOverlay() {
        this.overlayElement.LoadingOverlay("hide");
    }

    getAjaxError(xhr) {
        if (xhr.responseJSON && xhr.responseJSON.message) {
            return xhr.responseJSON.message;
        }

        if (xhr.responseText) {
            try {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed.message) {
                    return parsed.message;
                }
            } catch (error) {
            }
            return xhr.responseText;
        }

        return "Request failed.";
    }

    stripHtml(rawOutput) {
        return $("<div>").html(rawOutput || "").text();
    }

    showRunCommandOutput(text, isError, renderHtml, modalTitle) {
        const output = text && text !== "" ? text : "No output returned.";

        this.runCommandModalTitleElement.text(modalTitle || "Command Output");

        if (renderHtml) {
            this.runCommandOutputElement.html(output);
        } else {
            this.runCommandOutputElement.text(output);
        }

        this.runCommandOutputElement.toggleClass("errorMsgBig", !!isError);
        this.runCommandModalElement.modal("show");
    }

    runCommandButton(buttonElement) {
        if (
            buttonElement.length === 0 ||
            this.runCommandModalElement.length === 0 ||
            this.runCommandOutputElement.length === 0 ||
            this.runCommandRequest === ""
        ) {
            return;
        }

        const idleButtonLabel = $.trim(buttonElement.text()) || "Run Command";
        const modalTitle = String(buttonElement.data("modalTitle") || "Command Output");
        const workingMessage = String(buttonElement.data("workingMessage") || "Running command...");
        const runningButtonLabel = String(buttonElement.data("runningButtonLabel") || "Running...");
        const outputFormat = String(buttonElement.data("outputFormat") || "text").toLowerCase();
        const commandButtonIndex = String(buttonElement.data("commandButtonIndex") || "0");

        this.showWorkingOverlay(workingMessage);
        this.setRunCommandBusy(buttonElement, true, runningButtonLabel);

        $.ajax({
            url: this.buildUrl(this.runCommandRequest),
            type: "POST",
            dataType: "json",
            data: this.formElement.serialize() + "&command_button_index=" + encodeURIComponent(commandButtonIndex),
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).done((response) => {
            const rawOutput = response && response.output ? response.output : "";
            const renderHtml = outputFormat === "html";
            const output = renderHtml ? rawOutput : this.stripHtml(rawOutput);
            this.showRunCommandOutput(output, !(response && response.ok), renderHtml, modalTitle);
        }).fail((xhr) => {
            this.showRunCommandOutput(this.getAjaxError(xhr), true, false, modalTitle);
        }).always(() => {
            this.hideWorkingOverlay();
            this.setRunCommandBusy(buttonElement, false, idleButtonLabel);
        });
    }

    initialiseLocaleDates() {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const formatDateFromParts = function(year, month, day) {
            if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
                return "";
            }

            return day + " " + monthNames[month - 1] + " " + year;
        };

        this.imagesContainerElement.find(".functions-listfiletype-date").each(function() {
            const element = $(this);
            const rawDate = element.attr("data-listfiletype-date");
            const rawDay = element.attr("data-listfiletype-day");
            let displayDate = "";

            if (rawDate) {
                const matches = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (matches) {
                    displayDate = formatDateFromParts(
                        parseInt(matches[1], 10),
                        parseInt(matches[2], 10),
                        parseInt(matches[3], 10)
                    );
                }
                if (displayDate) {
                    element.text(displayDate);
                }
                return;
            }

            if (!rawDay || !/^\d{8}$/.test(rawDay)) {
                return;
            }

            displayDate = formatDateFromParts(
                parseInt(rawDay.slice(0, 4), 10),
                parseInt(rawDay.slice(4, 6), 10),
                parseInt(rawDay.slice(6, 8), 10)
            );
            if (displayDate) {
                element.text(displayDate);
            }
        });
    }

    initialiseGallery() {
        const galleryElement = this.imagesContainerElement.find(".functions-listfiletype-grid").get(0);

        if (!galleryElement || typeof lightGallery !== "function") {
            return;
        }

        if ($(galleryElement).data("lightGalleryInitialized")) {
            return;
        }

        const plugins = [lgZoom, lgThumbnail];
        if (typeof lgVideo !== "undefined") {
            plugins.push(lgVideo);
        }

        lightGallery(galleryElement, {
            cssEasing: "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
            selector: "a",
            plugins: plugins,
            mode: "lg-slide-circular",
            speed: 400,
            download: false,
            thumbnail: true,
            iframeMaxWidth: "90%",
            iframeMaxHeight: "90%"
        });
        $(galleryElement).data("lightGalleryInitialized", true);
    }

    renderImagesHtml(imagesHtml) {
        if (!imagesHtml) {
            this.clearImages();
            return $.Deferred().resolve().promise();
        }

        this.imagesContainerElement.html(imagesHtml);
        this.initialiseLocaleDates();
        this.initialiseGallery();
        this.updateResultsVisibility();
        return $.Deferred().resolve().promise();
    }

    handleResponse(response) {
        const rawOutput = response && response.output ? response.output : "";
        const renderHtml = this.outputFormat === "html";
        const output = renderHtml ? rawOutput : this.stripHtml(rawOutput);
        const imagesHtml = response && response.imagesHtml ? response.imagesHtml : "";

        this.showOutput(output, !(response && response.ok), renderHtml);
        return this.renderImagesHtml(imagesHtml).always(() => {
            this.selectTab($.trim(imagesHtml) !== "" ? this.imagesTabElement : this.resultsTabElement);
        });
    }
}

$(function() {
    $(".js-helper-tool-page").each(function() {
        const helperToolPage = new HelperToolPage(this);
        helperToolPage.init();
    });
});
