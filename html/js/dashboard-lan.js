"use strict";

class DASHBOARDLAN {
    #tabStorageKey = "as-lan-selected-tab";
    #pendingStopAction = null;
    #configInterface = "";

    init() {
        $("#as-lan-confirm-modal").appendTo("body");
        $("#as-lan-config-modal").appendTo("body");
        this.#bindActions();
        this.#bindTabPersistence();
        this.#bindConfirmModal();
        this.#bindConfigModal();
    }

    #bindActions() {
        $(document).on("click", ".as-lan-refresh", (event) => {
            event.preventDefault();
            this.refreshLanPanel();
        });

        $(document).on("click", ".as-lan-interface-action", (event) => {
            event.preventDefault();
            const $button = $(event.currentTarget);
            const $container = $button.closest(".as-lan-actions");
            const interfaceName = String($container.data("interface") || "");
            const action = String($button.data("action") || "").toLowerCase();

            if (!interfaceName || !["start", "stop"].includes(action)) {
                return;
            }

            if (action === "stop") {
                this.#confirmStop(interfaceName);
                return;
            }

            this.#runInterfaceAction(interfaceName, action);
        });

        $(document).on("click", ".as-lan-config", (event) => {
            event.preventDefault();
            const interfaceName = String($(event.currentTarget).closest(".as-lan-actions").data("interface") || "");
            if (interfaceName === "") {
                return;
            }

            this.#openConfig(interfaceName);
        });
    }

    #bindConfirmModal() {
        $(document).on("click", "#as-lan-confirm-accept", () => {
            const pending = this.#pendingStopAction;
            this.#pendingStopAction = null;
            $("#as-lan-confirm-modal").modal("hide");

            if (!pending) {
                return;
            }

            this.#runInterfaceAction(pending.interfaceName, "stop");
        });
    }

    #bindConfigModal() {
        $(document).on("change", 'input[name="as-lan-config-mode"]', () => {
            this.#updateConfigMode();
        });

        $(document).on("click", "#as-lan-config-save", () => {
            this.#saveConfig();
        });

        $("#as-lan-config-modal").on("hidden.bs.modal", () => {
            this.#configInterface = "";
            this.#showConfigAlert("", "");
            $("#as-lan-config-interface").text("");
            $("#as-lan-config-address").val("");
            $("#as-lan-config-netmask").val("");
            $("#as-lan-config-gateway").val("");
            $("#as-lan-config-dns").val("");
            $('input[name="as-lan-config-mode"][value="dhcp"]').prop("checked", true);
            this.#updateConfigMode();
            $("#as-lan-config-save").prop("disabled", false);
        });
    }

    #bindTabPersistence() {
        $(document).on("shown.bs.tab", '#as-lan-panel a[data-toggle="tab"]', (event) => {
            const href = $(event.target).attr("href");
            if (href) {
                sessionStorage.setItem(this.#tabStorageKey, href);
            }
        });
    }

    #restoreActiveTab() {
        const storedTab = sessionStorage.getItem(this.#tabStorageKey);
        if (!storedTab) {
            return;
        }

        const $tab = $('#as-lan-panel a[data-toggle="tab"][href="' + storedTab + '"]');
        if ($tab.length > 0) {
            $tab.tab("show");
        }
    }

    #confirmStop(interfaceName) {
        this.#pendingStopAction = { interfaceName: interfaceName };
        $("#as-lan-confirm-message").text(
            "This will stop the " + interfaceName + " network interface. Any active connection on that interface will be interrupted."
        );
        $("#as-lan-confirm-modal").modal("show");
    }

    #openConfig(interfaceName) {
        this.#configInterface = interfaceName;
        $("#as-lan-config-interface").text(interfaceName);
        this.#showConfigAlert("", "");
        $("#as-lan-config-save").prop("disabled", true);
        $("#as-lan-config-modal").modal("show");

        $.LoadingOverlay("show", {
            text: "Loading " + interfaceName + " configuration..."
        });

        $.ajax({
            url: "includes/lanutil.php?request=GetConfig",
            method: "GET",
            dataType: "json",
            data: { interface: interfaceName },
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        }).done((result) => {
            const config = result && result.config ? result.config : {};
            const mode = String(config.mode || "dhcp").toLowerCase() === "manual" ? "manual" : "dhcp";
            $('input[name="as-lan-config-mode"][value="' + mode + '"]').prop("checked", true);
            $("#as-lan-config-address").val(config.address || "");
            $("#as-lan-config-netmask").val(config.netmask || "");
            $("#as-lan-config-gateway").val(config.gateway || "");
            $("#as-lan-config-dns").val(config.dns || "");
            this.#updateConfigMode();
        }).fail((xhr) => {
            const message = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : "Unable to load the current interface configuration.";
            this.#showConfigAlert("danger", message);
        }).always(() => {
            $("#as-lan-config-save").prop("disabled", false);
            $.LoadingOverlay("hide");
        });
    }

    #saveConfig() {
        if (this.#configInterface === "") {
            return;
        }

        const payload = {
            interface: this.#configInterface,
            mode: String($('input[name="as-lan-config-mode"]:checked').val() || "dhcp"),
            address: $("#as-lan-config-address").val(),
            netmask: $("#as-lan-config-netmask").val(),
            gateway: $("#as-lan-config-gateway").val(),
            dns: $("#as-lan-config-dns").val()
        };

        $("#as-lan-config-save").prop("disabled", true);
        this.#showConfigAlert("", "");
        $.LoadingOverlay("show", {
            text: "Applying network configuration for " + this.#configInterface + "..."
        });

        $.ajax({
            url: "includes/lanutil.php?request=SetConfig",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-Token": $("#csrf_token").val() || ""
            },
            data: JSON.stringify(payload)
        }).done((result) => {
            const ok = !!(result && result.ok);
            const message = (result && result.message)
                ? result.message
                : (ok ? "Configuration saved." : "Unable to save the interface configuration.");

            if (!ok) {
                this.#showConfigAlert("danger", message);
                return;
            }

            $("#as-lan-config-modal").modal("hide");
            this.refreshLanPanel();
        }).fail((xhr) => {
            const message = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : "Unable to save the interface configuration.";
            this.#showConfigAlert("danger", message);
        }).always(() => {
            $("#as-lan-config-save").prop("disabled", false);
            $.LoadingOverlay("hide");
        });
    }

    #updateConfigMode() {
        const mode = String($('input[name="as-lan-config-mode"]:checked').val() || "dhcp");
        $("#as-lan-manual-fields").toggleClass("hidden", mode !== "manual");
    }

    #showConfigAlert(type, message) {
        const $alerts = $("#as-lan-config-alerts");
        if (!type || !message) {
            $alerts.empty();
            return;
        }

        $alerts.html(
            '<div class="alert alert-' + this.#escapeAttribute(type) + '">' +
                this.#escapeHtml(message) +
            "</div>"
        );
    }

    refreshLanPanel(done) {
        $.ajax({
            url: window.location.href,
            method: "GET",
            dataType: "html",
            cache: false
        }).done((html) => {
            const $page = $("<div>").append($.parseHTML(html, document, true));
            const $newPanel = $page.find("#as-lan-panel");
            if ($newPanel.length === 0) {
                return;
            }

            $("#as-lan-panel").replaceWith($newPanel);
            this.#restoreActiveTab();
        }).always(() => {
            if (typeof done === "function") {
                done();
            }
        });
    }

    #runInterfaceAction(interfaceName, action) {
        const $allButtons = $('.as-lan-actions[data-interface="' + interfaceName + '"] .btn');
        const oldDisabled = [];
        $allButtons.each(function () {
            oldDisabled.push($(this).prop("disabled"));
            $(this).prop("disabled", true);
        });

        $.LoadingOverlay("show", {
            text: (action === "start" ? "Starting " : "Stopping ") + interfaceName + "..."
        });

        $.ajax({
            url: "includes/lanutil.php?request=Control",
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-Token": $("#csrf_token").val() || ""
            },
            data: JSON.stringify({
                interface: interfaceName,
                action: action
            })
        }).always(() => {
            this.refreshLanPanel(() => {
                $allButtons.each(function (index) {
                    $(this).prop("disabled", oldDisabled[index]);
                });
                $.LoadingOverlay("hide");
            });
        });
    }

    #escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    #escapeAttribute(value) {
        return this.#escapeHtml(String(value)).replace(/"/g, "&quot;");
    }
}

$(document).ready(function () {
    const dashboardLan = new DASHBOARDLAN();
    dashboardLan.init();
});
