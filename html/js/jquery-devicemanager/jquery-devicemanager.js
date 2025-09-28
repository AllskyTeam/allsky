(function ($) {
    $.devicemanager = function (options) {
        var settings = $.extend({
            url: 'includes/i2cutil.php?request=DeviceManager'
        }, options);

        if (!$('#deviceManagerModal').length) {
            $('body').append(`
                <div id="deviceManagerModal" class="modal fade" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal">&times;</button>
                                <h4 class="modal-title">Connected Devices</h4>
                            </div>
                            <div class="modal-body">
                                <ul class="nav nav-tabs" role="tablist">
                                    <li class="active"><a href="#dm-tab-i2c" role="tab" data-toggle="tab">I2C Devices</a></li>
                                    <li><a href="#dm-tab-1wire" role="tab" data-toggle="tab">1-Wire Devices</a></li>
                                    <li><a href="#dm-tab-serial" role="tab" data-toggle="tab">Serial Devices</a></li>
                                    <li><a href="#dm-tab-gpio" role="tab" data-toggle="tab">GPIO Status</a></li>
                                </ul>
                                <div class="tab-content" style="margin-top:15px;">
                                <div class="tab-pane active" id="dm-tab-i2c">Loading I2C devices...</div>
                                <div class="tab-pane" id="dm-tab-1wire">Loading 1-Wire devices...</div>
                                <div class="tab-pane" id="dm-tab-serial">Loading Serial devices...</div>
                                <div class="tab-pane" id="dm-tab-gpio">Loading GPIO status...</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }

        $('#deviceManagerModal')
            .off('shown.bs.modal')
            .on('shown.bs.modal', function () {
                $('#dm-tab-i2c').html('Loading...');
                $('#dm-tab-1wire').html('Loading...');
                $('#dm-tab-serial').html('Loading...');
                $('#dm-tab-gpio').html('Loading...');
                let loadingTimer = setTimeout(() => {
                    $.LoadingOverlay('show', {
                        text: 'Loading Device Manager ...'
                    });
                }, 50);

                $.getJSON(settings.url, function (data) {
                    clearTimeout(loadingTimer);
                    $.LoadingOverlay('hide');

                    updateTabFormatted('#dm-tab-i2c', data.i2c || [], function (item) {
                        let html = `<div class="panel panel-default panel-shadow">
                                <div class="panel-heading">
                                    <h4>${item.bus} ${item.address}</h4>
                                </div>
                                <div class="panel-body">`;

                        if (Array.isArray(item.devices) && item.devices.length > 0) {
                            const mid = Math.ceil(item.devices.length / 2);
                            const col1 = item.devices.slice(0, mid);
                            const col2 = item.devices.slice(mid);

                            html += '<div class="row">';
                            [col1, col2].forEach(function (col) {
                                html += '<div class="i2c-device-col">';
                                col.forEach(function (dev) {
                                    let devName = dev.device || "Unnamed device";
                                    let url = dev.url ? `<a href="${dev.url}" target="_blank">${devName}</a>` : devName;
                                    let range = dev.addresses ? ` <small>(${dev.addresses})</small>` : "";
                                    html += `• ${url}<br>`;
                                });
                                html += '</div>';
                            });
                            html += '</div></div>';
                        } else {
                            html += `<div class="i2c-device text-muted">• No known devices</div>`;
                        }

                        html += `</div>`;
                        return html;
                    });

                    updateTabFormatted('#dm-tab-1wire', data.onewire || [], function (item) {

                        let type = item.type || "Unknown";
                        let id = item.id || "???";
                        let devs = Array.isArray(item.devices) && item.devices.length > 0
                            ? ` (${item.devices.join(", ")})`
                            : "";

                        let icon = '<i class="fa-solid fa-question fa-4x"></i>';
                        if (/temperature/i.test(type)) {
                            icon = '<i class="fa-solid fa-thermometer-half fa-4x"></i>';
                        }

                        let html = `
                            <div class="panel panel-default panel-shadow">
                                <div class="panel-heading">
                                    <h4>${id}</h4>
                                </div>
                                <div class="panel-body">
                                    <div class="dm-ow-wrapper">
                                        <div class="dm-ow-row">
                                            <div class="dm-ow-left">
                                                ${icon}
                                            </div>
                                            <div class="dm-ow-right">
                                                <div class="dm-ow-top-bar">
                                                    <h2><strong>${type}</strong></h2>
                                                </div>
                                                <div class="dm-ow-main-content">
                                                    <h3><small>${devs}</small></h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>`;

                        return html;
                    });

                    updateTabFormatted('#dm-tab-serial', data.serial || [], function (item) {
                        let html = `
                            <div class="panel panel-default panel-shadow">
                                <div class="panel-heading">
                                    <h4>${item.device} @ ${item.baud || "unknown"}</h4>
                                </div>
                                <div class="panel-body">
                                    <pre>${item.data.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                                </div>
                            </div>`;



                        return html;
                    });

                    updateTabFormatted('#dm-tab-gpio', data.gpio, function (items) {

                        if (items === false) {
                            return '<div class="alert alert-danger">GPIO status not available. The GPIO server is not running. Please check the Allsky documentation</div>';
                        } else {
                            const grid = $('<div>');

                            const header = $('<div class="row">')
                                .append('<div class="col-xs-2"><strong>Pin</strong></div>')
                                .append('<div class="col-xs-2"><strong>Type</strong></div>')
                                .append('<div class="col-xs-2"><strong>State</strong></div>')
                                .append('<div class="col-xs-3"><strong>Duty Cycle</strong></div>')
                                .append('<div class="col-xs-3"><strong>Frequency</strong></div>');
                            grid.append(header);

                            $.each(items, function (pin, cfg) {
                                if (!cfg.mode || cfg.mode === "unused") return;

                                const type = cfg.mode.toLowerCase().includes("pwm") ? "PWM" : "Digital I/O";
                                const state = (type === "Digital I/O") ? (cfg.value || "") : "-";
                                const duty = (type === "PWM") ? (cfg.duty || "") : "-";
                                const freq = (type === "PWM") ? (cfg.frequency || "") : "-";

                                const row = $('<div class="row" style="padding:8px 0;">')
                                    .append(`<div class="col-xs-2">${pin}</div>`)
                                    .append(`<div class="col-xs-2">${type}</div>`)
                                    .append(`<div class="col-xs-2">${state}</div>`)
                                    .append(`<div class="col-xs-3">${duty}</div>`)
                                    .append(`<div class="col-xs-3">${freq}</div>`);

                                grid.append(row);
                            });
                            return grid.html();                            
                        }
                    });

                }).fail(function (xhr, status, error) {
                    clearTimeout(loadingTimer);
                    $.LoadingOverlay('hide');

                    $('#dm-tab-i2c, #dm-tab-1wire, #dm-tab-serial').html(
                        '<div class="alert alert-danger">Failed to load device data.</div>'
                    );
                    console.error('devicemanager AJAX error:', error);
                });
            });

        $('#deviceManagerModal').modal('show');

        function sizeOf(value) {
            if (Array.isArray(value)) {
                return value.length;
            } else if (typeof value === "string") {
                return value.length;
            } else if (value !== null && typeof value === "object") {
                return Object.keys(value).length;
            } else {
                return 0;
            }
        }

        function updateTabFormatted(selector, items, formatter) {
            let html = '';
            if (sizeOf(items) > 0 || items === false) {
                if (selector === '#dm-tab-gpio') {
                    html += formatter(items);
                } else {
                    if (selector === '#dm-tab-i2c') {
                        items.forEach(function (item) {
                            html += formatter(item);
                        });
                    } else {
                        items.forEach(function (item) {
                            html += formatter(item);
                        });
                    }
                }
            } else {
                html = '<p>No devices found.</p>';
            }
            $(selector).html(html);
        }
    };
})(jQuery);