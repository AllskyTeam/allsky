"use strict";

class DASHBOARDWLAN {
    #tabStorageKey = "as-wlan-selected-tab";
    #pendingStopAction = null;

    init() {
        $("#as-wlan-confirm-modal").appendTo("body");
        this.#bindActions();
        this.#bindTabPersistence();
        this.#bindConfirmModal();
    }

    #bindActions() {
        $(document).on("click", ".as-wlan-refresh", (event) => {
            event.preventDefault();
            this.refreshWlanPanel();
        });

        $(document).on("click", ".as-wlan-interface-action", (event) => {
            event.preventDefault();
            const $button = $(event.currentTarget);
            const $container = $button.closest(".as-wlan-actions");
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
    }

    #bindConfirmModal() {
        $(document).on("click", "#as-wlan-confirm-accept", () => {
            const pending = this.#pendingStopAction;
            this.#pendingStopAction = null;
            $("#as-wlan-confirm-modal").modal("hide");

            if (!pending) {
                return;
            }

            this.#runInterfaceAction(pending.interfaceName, "stop");
        });
    }

    #bindTabPersistence() {
        $(document).on("shown.bs.tab", '#as-wlan-panel a[data-toggle="tab"]', (event) => {
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

        const $tab = $('#as-wlan-panel a[data-toggle="tab"][href="' + storedTab + '"]');
        if ($tab.length > 0) {
            $tab.tab("show");
        }
    }

    #confirmStop(interfaceName) {
        this.#pendingStopAction = { interfaceName: interfaceName };
        $("#as-wlan-confirm-message").text(
            "This will stop the " + interfaceName + " wireless interface. Any active connection on that interface will be interrupted."
        );
        $("#as-wlan-confirm-modal").modal("show");
    }

    refreshWlanPanel(done) {
        $.ajax({
            url: window.location.href,
            method: "GET",
            dataType: "html",
            cache: false
        }).done((html) => {
            const $page = $("<div>").append($.parseHTML(html, document, true));
            const $newPanel = $page.find("#as-wlan-panel");
            if ($newPanel.length === 0) {
                return;
            }

            $("#as-wlan-panel").replaceWith($newPanel);
            this.#restoreActiveTab();
        }).always(() => {
            if (typeof done === "function") {
                done();
            }
        });
    }

    #runInterfaceAction(interfaceName, action) {
        const $allButtons = $('.as-wlan-actions[data-interface="' + interfaceName + '"] .btn');
        const oldDisabled = [];
        $allButtons.each(function () {
            oldDisabled.push($(this).prop("disabled"));
            $(this).prop("disabled", true);
        });

        $.LoadingOverlay("show", {
            text: (action === "start" ? "Starting " : "Stopping ") + interfaceName + "..."
        });

        $.ajax({
            url: "includes/wlanutil.php?request=Control",
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
            this.refreshWlanPanel(() => {
                $allButtons.each(function (index) {
                    $(this).prop("disabled", oldDisabled[index]);
                });
                $.LoadingOverlay("hide");
            });
        });
    }
}

$(document).ready(function () {
    const dashboardWlan = new DASHBOARDWLAN();
    dashboardWlan.init();
});
