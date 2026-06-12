"use strict";

class SYSTEM {
    #tabStorageKey = "as-system-selected-tab";
    #tabSelector = '.nav-tabs a[data-toggle="tab"][href^="#as-system-"]';
    #pendingAction = null;

    init() {
        $("#as-system-buttons-editor-open").systemPageButtons();
        $("#as-system-user-button-result-modal").appendTo("body");
        $("#as-system-confirm-modal").appendTo("body");

        this.#bindAllskyActions();
        this.#bindPowerActions();
        this.#bindConfirmModal();
        this.#bindUserButtonActions();
        this.#bindTabPersistence();

        window.asSystemRefresh = (done) => {
            this.refreshSystemTab(done);
        };
    }

    refreshSystemTab(done) {
        $.ajax({
            url: window.location.href,
            method: "GET",
            dataType: "html",
            cache: false
        }).done((html) => {
            const $page = $("<div>").append($.parseHTML(html, document, true));
            const $newSystemTab = $page.find("#as-system-system");
            if ($newSystemTab.length === 0) {
                return;
            }

            $("#as-system-system").html($newSystemTab.html());
            $("#as-system-buttons-editor-open").systemPageButtons();
            this.#refreshHeaderStatus();
        }).always(() => {
            if (typeof done === "function") {
                done();
            }
        });
    }

    #bindAllskyActions() {
        $(document).on("click", ".as-system-allsky-action", (event) => {
            event.preventDefault();
            const $button = $(event.currentTarget);
            const action = String($button.data("action") || "").toLowerCase();
            if (!["start", "stop"].includes(action)) {
                this.#showUserButtonResult("Allsky Control", "Unknown Allsky action.", false);
                return;
            }
            this.#confirmAction({
                type: "allsky",
                action: action,
                message: action === "start"
                    ? "This will start Allsky."
                    : "This will stop Allsky."
            });
        });
    }

    #bindPowerActions() {
        $(document).on("click", ".as-system-power-action", (event) => {
            event.preventDefault();
            const action = String($(event.currentTarget).data("action") || "").toLowerCase();
            if (!["reboot", "shutdown"].includes(action)) {
                return;
            }

            this.#confirmAction({
                type: "power",
                action: action,
                message: action === "reboot"
                    ? "This will reboot the Raspberry Pi immediately."
                    : "This will shut down the Raspberry Pi immediately."
            });
        });
    }

    #bindConfirmModal() {
        $(document).on("click", "#as-system-confirm-accept", () => {
            const pending = this.#pendingAction;
            this.#pendingAction = null;
            $("#as-system-confirm-modal").modal("hide");

            if (!pending) {
                return;
            }

            if (pending.type === "allsky") {
                this.#runAllskyAction(pending.action);
                return;
            }

            if (pending.type === "power") {
                this.#submitPowerAction(pending.action);
            }
        });
    }

    #confirmAction(config) {
        this.#pendingAction = config;
        $("#as-system-confirm-title").text(this.#getConfirmTitle(config));
        $("#as-system-confirm-message").text(config.message || "Are you sure you want to continue?");
        $("#as-system-confirm-accept")
            .removeClass("btn-success btn-danger btn-warning")
            .addClass(this.#getConfirmButtonClass(config))
            .text(this.#getConfirmButtonText(config));
        $("#as-system-confirm-modal").modal("show");
    }

    #getConfirmTitle(config) {
        if (config.type === "allsky") {
            return config.action === "start" ? "Start Allsky" : "Stop Allsky";
        }

        return config.action === "reboot" ? "Reboot Pi" : "Shutdown Pi";
    }

    #getConfirmButtonText(config) {
        if (config.type === "allsky") {
            return config.action === "start" ? "Start Allsky" : "Stop Allsky";
        }

        return config.action === "reboot" ? "Reboot Pi" : "Shutdown Pi";
    }

    #getConfirmButtonClass(config) {
        if (config.type === "allsky") {
            return config.action === "start" ? "btn-success" : "btn-danger";
        }

        return config.action === "reboot" ? "btn-warning" : "btn-danger";
    }

    #runAllskyAction(action) {
        const $button = $('.as-system-allsky-action[data-action="' + action + '"]');
        const originalDisabled = $button.prop("disabled");
        $button.prop("disabled", true);
        $.LoadingOverlay("show", { text: (action === "start" ? "Starting" : "Stopping") + " Allsky..." });

        $.ajax({
            url: "includes/uiutil.php?request=AllskyControl",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-Token": $("#csrf_token").val() || ""
            },
            data: JSON.stringify({ action: action })
        }).done((result) => {
            const ok = !!(result && result.ok);
            const title = "Allsky " + action.charAt(0).toUpperCase() + action.slice(1);
            const message = (result && result.message) ? result.message : ("Allsky " + action + " request completed.");
            this.#showUserButtonResult(title, message, ok);
            this.refreshSystemTab();
        }).fail((xhr) => {
            const message = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : ("Unable to " + action + " Allsky.");
            this.#showUserButtonResult("Allsky Control", message, false);
        }).always(() => {
            $button.prop("disabled", originalDisabled);
            $.LoadingOverlay("hide");
        });
    }

    #submitPowerAction(action) {
        const fieldName = action === "reboot" ? "system_reboot" : "system_shutdown";
        const $form = $('<form method="POST" action="?page=system"></form>');
        $form.append($('<input type="hidden" name="' + fieldName + '" value="1">'));
        const csrfToken = $("#csrf_token").val() || "";
        if (csrfToken !== "") {
            $form.append($('<input type="hidden" name="csrf_token" value="' + this.#escapeHtml(csrfToken) + '">'));
        }
        $("body").append($form);
        $form.trigger("submit");
    }

    #bindUserButtonActions() {
        $(document).on("click", ".as-system-user-button", (event) => {
            event.preventDefault();
            const $button = $(event.currentTarget);
            const path = $button.attr("data-file") || "";
            const buttonIndex = Number($button.attr("data-button-index"));

            if (!path || Number.isNaN(buttonIndex)) {
                this.#showUserButtonResult("Action Result", "Unable to determine which button to run.", false);
                return;
            }

            $.LoadingOverlay("show", { text: "Running action..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=RunButton",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    path: path,
                    buttonIndex: buttonIndex
                })
            }).done((result) => {
                this.#showUserButtonResult(result.title || "Action Result", result.message || "", !!result.ok);
            }).fail((xhr) => {
                const message = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : "Unable to run the selected action.";
                this.#showUserButtonResult("Action Result", message, false);
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        });
    }

    #bindTabPersistence() {
        const $systemTabs = $(this.#tabSelector);

        $systemTabs.on("shown.bs.tab", (event) => {
            const href = $(event.target).attr("href");
            if (href) {
                sessionStorage.setItem(this.#tabStorageKey, href);
            }
        });

        const storedTab = sessionStorage.getItem(this.#tabStorageKey);
        if (storedTab) {
            const $storedTab = $(this.#tabSelector + '[href="' + storedTab + '"]');
            if ($storedTab.length > 0) {
                $storedTab.tab("show");
            }
        }
    }

    #showUserButtonResult(title, message, ok) {
        $("#as-system-user-button-result-title").text(title || "Action Result");
        $("#as-system-user-button-result-status")
            .removeClass("alert-success alert-danger")
            .addClass(ok ? "alert-success" : "alert-danger")
            .text(ok ? "Command completed." : "Command failed.");
        $("#as-system-user-button-result-message").html(this.#formatCommandResultMessage(message));
        $("#as-system-user-button-result-modal").modal("show");
    }

    #refreshHeaderStatus() {
        $.ajax({
            url: "includes/uiutil.php?request=AllskyStatus",
            method: "GET",
            dataType: "html",
            cache: false
        }).done((response) => {
            $("#allskyStatus").html(response);
        });
    }

    #formatCommandResultMessage(message) {
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
                html.push('<pre class="allow-select" style="margin: 6px 0; white-space: pre-wrap;"><code>' + this.#escapeHtml(trimmed) + "</code></pre>");
                return;
            }

            html.push("<div>" + this.#escapeHtml(line) + "</div>");
        });

        return html.join("");
    }

    #escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

$(document).ready(function () {
    const system = new SYSTEM();
    system.init();
});
