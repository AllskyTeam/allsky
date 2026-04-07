"use strict";

class CONFIGUREWIFI {
    #selectedNetwork = null;
    #activeInterface = "";
    #lastScanResults = {};

    init() {
        this.$panel = $("#as-wifi-panel");
        if (this.$panel.length === 0) {
            return;
        }

        this.$connectModal = $("#as-wifi-connect-modal");
        this.$passwordGroup = $("#as-wifi-password-group");
        this.$passwordInput = $("#as-wifi-password");
        this.$connectButton = $("#as-wifi-connect-submit");
        this.$tabs = this.$panel.find('.tab-pane[data-interface]');

        this.$connectModal.appendTo("body");

        this.#bindEvents();
        this.#initialRefresh();
    }

    #bindEvents() {
        $(document).on("click", ".as-wifi-refresh", (event) => {
            const $tab = $(event.currentTarget).closest(".tab-pane");
            this.refresh(String($tab.data("interface") || ""));
        });

        $(document).on("click", ".as-wifi-connect-button", (event) => {
            const $button = $(event.currentTarget);
            this.#openConnectModal({
                ssid: String($button.data("ssid") || ""),
                bssid: String($button.data("bssid") || ""),
                security: String($button.data("security") || "Open"),
                channel: String($button.data("channel") || "-"),
                band: String($button.data("band") || "-"),
                interface: String($button.data("interface") || "")
            });
        });

        $(document).on("shown.bs.tab", '#as-wifi-panel a[data-toggle="tab"]', (event) => {
            const href = String($(event.target).attr("href") || "");
            const $tab = href ? $(href) : $();
            const interfaceName = String($tab.data("interface") || "");
            if (interfaceName !== "") {
                this.#activeInterface = interfaceName;
                if (!this.#lastScanResults[interfaceName]) {
                    this.refresh(interfaceName);
                }
            }
        });

        this.$connectButton.on("click", () => {
            this.#connectSelectedNetwork();
        });

        this.$passwordInput.on("keydown", (event) => {
            if (event.key === "Enter" || event.keyCode === 13) {
                event.preventDefault();
                if (!this.$connectButton.prop("disabled")) {
                    this.#connectSelectedNetwork();
                }
            }
        });

        this.$connectModal.on("hidden.bs.modal", () => {
            $(".modal-backdrop.as-wifi-modal-backdrop").removeClass("as-wifi-modal-backdrop");
            this.#selectedNetwork = null;
            this.$passwordInput.val("");
        });

        this.$connectModal.on("shown.bs.modal", () => {
            $(".modal-backdrop").last().addClass("as-wifi-modal-backdrop");
            window.setTimeout(() => {
                if (!this.$passwordGroup.hasClass("hidden")) {
                    this.$passwordInput.trigger("focus").trigger("select");
                }
            }, 150);
        });
    }

    #initialRefresh() {
        this.$tabs.each((_, element) => {
            const interfaceName = String($(element).data("interface") || "");
            if (interfaceName !== "") {
                if (this.#activeInterface === "") {
                    this.#activeInterface = interfaceName;
                }
                this.refresh(interfaceName);
            }
        });
    }

    refresh(interfaceName) {
        const $tab = this.#getTab(interfaceName);
        if ($tab.length === 0) {
            return;
        }

        this.#setLoadingState($tab, true, "Scanning for available Wi-Fi networks...");

        $.ajax({
            url: "includes/wifiutil.php?request=Scan",
            method: "GET",
            dataType: "json",
            data: { interface: interfaceName },
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            },
            cache: false
        }).done((result) => {
            this.#showAlert($tab, "", "");
            this.#lastScanResults[interfaceName] = result || {};
            this.#renderScanResult($tab, result || {});
        }).fail((xhr) => {
            const message = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : "Unable to scan for Wi-Fi networks.";
            this.#renderErrorState($tab, message);
        }).always(() => {
            this.#setLoadingState($tab, false);
        });
    }

    #renderScanResult($tab, result) {
        const networks = Array.isArray(result.networks) ? result.networks : [];
        const current = result.current || {};
        const interfaceName = String(result.interface || $tab.data("interface") || "");
        const $tableBody = $tab.find(".as-wifi-network-list");
        const $emptyState = $tab.find(".as-wifi-empty-state");

        $tab.find(".as-wifi-current-ssid").text(current.ssid || "Not connected");
        $tab.find(".as-wifi-current-security").text(current.security || "-");
        $tab.find(".as-wifi-current-channel-band").text(
            ((current.channel && current.channel !== "-") ? current.channel : "-") +
            " / " +
            ((current.band && current.band !== "-") ? current.band : "-")
        );

        if (networks.length === 0) {
            $tableBody.html('<tr><td colspan="7" class="text-muted">No Wi-Fi networks were found.</td></tr>');
            $emptyState.removeClass("hidden");
            return;
        }

        $emptyState.addClass("hidden");

        const rows = networks.map((network) => {
            const isConnected = !!network.inUse;
            const statusHtml = isConnected
                ? '<span class="label label-success as-wifi-status-label">Connected</span>'
                : '<span class="label label-default as-wifi-status-label">Available</span>';
            const signal = Number(network.signal || 0);
            const signalText = Number.isFinite(signal) ? (signal + "%") : "-";
            const signalBucket = Number.isFinite(signal)
                ? Math.max(1, Math.min(10, Math.ceil(Math.max(4, signal) / 10)))
                : 1;
            const signalClass = signal >= 70 ? "success" : (signal >= 45 ? "warning" : "danger");
            const securityHtml = this.#buildSecurityBadges(network.security || "-");
            const actionHtml = isConnected
                ? '<button type="button" class="btn btn-success btn-sm" disabled>Connected</button>'
                : (
                    '<button type="button" class="btn btn-primary btn-sm as-wifi-connect-button" ' +
                    'data-ssid="' + this.#escapeAttribute(network.ssid) + '" ' +
                    'data-bssid="' + this.#escapeAttribute(network.bssid || "") + '" ' +
                    'data-security="' + this.#escapeAttribute(network.security || "Open") + '" ' +
                    'data-channel="' + this.#escapeAttribute(network.channel || "-") + '" ' +
                    'data-band="' + this.#escapeAttribute(network.band || "-") + '" ' +
                    'data-interface="' + this.#escapeAttribute(interfaceName) + '">' +
                    'Connect</button>'
                );

            return (
                '<tr class="as-wifi-row ' + (isConnected ? "as-wifi-row-connected" : "") + '">' +
                    "<td>" + statusHtml + "</td>" +
                    "<td>" +
                        '<div class="as-wifi-ssid">' + this.#escapeHtml(network.ssid || "") + "</div>" +
                        '<div class="as-wifi-bssid">' + this.#escapeHtml(network.bssid || "") + "</div>" +
                    "</td>" +
                    '<td><span class="as-wifi-chip">' + this.#escapeHtml(network.channel || "-") + "</span></td>" +
                    '<td><span class="as-wifi-chip">' + this.#escapeHtml(network.band || "-") + "</span></td>" +
                    "<td>" +
                        '<div class="as-wifi-signal">' +
                            '<div class="as-wifi-signal-track">' +
                                '<div class="as-wifi-signal-bar as-wifi-signal-' + signalClass + ' as-wifi-signal-w' + signalBucket + '"></div>' +
                            "</div>" +
                            '<span class="as-wifi-signal-text">' + this.#escapeHtml(signalText) + "</span>" +
                        "</div>" +
                    "</td>" +
                    "<td>" + securityHtml + "</td>" +
                    '<td class="text-right">' + actionHtml + "</td>" +
                "</tr>"
            );
        });

        $tableBody.html(rows.join(""));
    }

    #renderErrorState($tab, message) {
        this.#showAlert($tab, "danger", message);
        $tab.find(".as-wifi-empty-state").addClass("hidden");
        $tab.find(".as-wifi-network-list").html(
            '<tr class="as-wifi-placeholder-row">' +
                '<td colspan="7">' +
                    '<div class="as-wifi-placeholder as-wifi-placeholder-error">' +
                        '<div class="as-wifi-placeholder-icon"><i class="fa fa-triangle-exclamation"></i></div>' +
                        '<div class="as-wifi-placeholder-title">Unable to Scan Networks</div>' +
                        '<div class="as-wifi-placeholder-text">' + this.#escapeHtml(message) + "</div>" +
                    '</div>' +
                "</td>" +
            "</tr>"
        );
    }

    #openConnectModal(network) {
        this.#selectedNetwork = network;
        const isOpen = String(network.security || "").toLowerCase() === "open";

        $("#as-wifi-connect-interface").text(network.interface || "");
        $("#as-wifi-connect-ssid").text(network.ssid || "");
        $("#as-wifi-connect-security").text(network.security || "-");
        $("#as-wifi-connect-channel-band").text((network.channel || "-") + " / " + (network.band || "-"));
        this.$passwordGroup.toggleClass("hidden", isOpen);
        this.$passwordInput.val("");
        this.$connectModal.modal("show");
    }

    #connectSelectedNetwork() {
        if (!this.#selectedNetwork) {
            return;
        }

        const payload = {
            ssid: this.#selectedNetwork.ssid,
            bssid: this.#selectedNetwork.bssid,
            security: this.#selectedNetwork.security,
            interface: this.#selectedNetwork.interface || this.#activeInterface,
            password: this.$passwordInput.val()
        };

        const interfaceName = payload.interface;
        const $tab = this.#getTab(interfaceName);

        this.$connectModal.modal("hide");
        this.#setLoadingState($tab, true, "Connecting to Wi-Fi network...");
        this.$connectButton.prop("disabled", true);

        $.ajax({
            url: "includes/wifiutil.php?request=Connect",
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
                : (ok ? "Wi-Fi connection requested." : "Unable to connect to the selected Wi-Fi network.");
            this.#showAlert($tab, ok ? "success" : "danger", message);
            if (ok) {
                window.setTimeout(() => {
                    this.refresh(interfaceName);
                }, 3000);
            }
        }).fail((xhr) => {
            const message = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : "Unable to connect to the selected Wi-Fi network.";
            this.#showAlert($tab, "danger", message);
        }).always(() => {
            this.$connectButton.prop("disabled", false);
            this.#setLoadingState($tab, false);
            if (this.#lastScanResults[interfaceName]) {
                this.#renderScanResult($tab, this.#lastScanResults[interfaceName]);
            }
        });
    }

    #setLoadingState($tab, isLoading, message) {
        const $refreshButton = $tab.find(".as-wifi-refresh");
        const $tableBody = $tab.find(".as-wifi-network-list");

        if (isLoading) {
            $refreshButton.prop("disabled", true);
            $tableBody.html(
                '<tr class="as-wifi-placeholder-row">' +
                    '<td colspan="7">' +
                        '<div class="as-wifi-placeholder">' +
                            '<div class="as-wifi-placeholder-icon"><i class="fa fa-spinner fa-spin"></i></div>' +
                            '<div class="as-wifi-placeholder-title as-wifi-placeholder-title-lg">' + this.#escapeHtml(String(message || "Working...")) + "</div>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );
            return;
        }

        $refreshButton.prop("disabled", false);
    }

    #showAlert($tab, type, message) {
        const $alerts = $tab.find(".as-wifi-alerts");
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

    #getTab(interfaceName) {
        return this.$tabs.filter((_, element) => String($(element).data("interface") || "") === interfaceName).first();
    }

    #buildSecurityBadges(value) {
        const text = String(value || "-");
        if (text === "-" || text === "") {
            return '<span class="label label-default as-wifi-security-label">Unknown</span>';
        }

        return text.split(",").map((part) => {
            const item = part.trim();
            if (item === "") {
                return "";
            }

            const lower = item.toLowerCase();
            let cssClass = "label-default";
            if (lower === "open") {
                cssClass = "label-warning";
            } else if (lower.indexOf("wpa3") !== -1) {
                cssClass = "label-success";
            } else if (lower.indexOf("wpa2") !== -1 || lower.indexOf("wpa") !== -1) {
                cssClass = "label-info";
            } else if (lower.indexOf("wep") !== -1) {
                cssClass = "label-danger";
            }

            return '<span class="label ' + cssClass + ' as-wifi-security-label">' + this.#escapeHtml(item) + "</span>";
        }).join("");
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
    const configureWifi = new CONFIGUREWIFI();
    configureWifi.init();
});
