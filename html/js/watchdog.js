"use strict";

class ALLSKYWATCHDOG {
    constructor() {
        this.timer = null;
        this.fetchData = this.fetchData.bind(this);

        // We add this rather than in the HTML to ensure the z-index is correct.
        $('body').append(
        `
            <div class="modal fade as-system-error-modal" id="as-system-error-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-err-title">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header as-system-error-modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title as-system-err-title" id="as-system-err-title">Service Error</h4>
                        </div>
                        <div class="modal-body as-system-error-modal-body">
                            <div class="alert alert-danger as-system-alert" role="alert">
                                <p id="as-system-err-summary" class="as-system-err-summary"></p>
                            </div>
                            <div class="as-system-err-section">
                                <h5 style="margin-top:10px;">Command Output</h5>
                                <pre id="as-system-err-exec" class="as-system-err-exec" style="white-space:pre-wrap;"></pre>
                            </div>
                            <div class="as-system-err-section">
                                <h5 style="margin-top:10px;">systemctl status</h5>
                                <pre id="as-system-err-status" class="as-system-err-status" style="white-space:pre-wrap;"></pre>
                            </div>
                            <div class="as-system-err-section">
                                <h5 style="margin-top:10px;">journalctl (recent)</h5>
                                <pre id="as-system-err-journal" class="as-system-err-journal" style="white-space:pre-wrap;"></pre>
                            </div>
                        </div>
                        <div class="modal-footer as-system-error-modal-footer">
                            <button type="button" class="btn btn-default as-system-btn-close" data-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `
        );
    }

    fetchData() {
        $.ajax({
            url: 'includes/moduleutil.php?request=WatchdogStatus',
            method: 'GET',
            cache: false,
            dataType: 'json'
        }).done((data) => {
            $('#as-system-watchdog-results').html('');
            $.each(data, function(_, svc) {
                const isActive = svc.active === 'active';
                const pid = svc.pid ? svc.pid : '—';

                const row = $('<div class="row mt-2"></div>');
                row.append(`<div class="col-xs-3 col watchdogRow">${svc.service}</div>`);
                row.append(`<div class="col-xs-3 col watchdogRow ${isActive ? 'text-success' : 'text-danger'}">${svc.active}</div>`);
                row.append(`<div class="col-xs-2 col watchdogRow">${pid}</div>`);

                const actions = $('<div class="col-xs-4 col watchdogRow"></div>');
                const startBtn = $(`<button class="btn btn btn-success as-system-watchdog-button mr-3" data-action="start" data-service="${svc.service}">Start</button>`);
                const stopBtn  = $(`<button class="btn btn btn-danger as-system-watchdog-button" data-action="stop" data-service="${svc.service}">Stop</button>`);

                if (isActive) startBtn.prop('disabled', true);
                else stopBtn.prop('disabled', true);

                actions.append(startBtn, stopBtn);
                row.append(actions);
                $('#as-system-watchdog-results').append(row);
            });
        }).fail((xhr, status, error) => {
            $('#as-system-watchdog-results').html('<div style="color:red;">Error: ' + error + '</div>');
        });
    }

    run() {
        $(document).on('click', '.as-system-watchdog-button', (e) => {
            let service = $(e.currentTarget).data('service');
            let action = $(e.currentTarget).data('action');
            let loadingText = (action === 'start') ? `Starting ${service}` : `Stopping ${service}`;

            $.LoadingOverlay('show', { text: loadingText });

            $.ajax({
                url: `includes/moduleutil.php?request=WatchdogManageService&service=${service}&action=${action}`,
                method: 'GET',
                cache: false,
                dataType: 'json',
                context: this
            }).done((result) => {
                if (result.ok) {
                    this.fetchData();
                } else {
                    var title = 'Error: ' + action.toUpperCase() + ' ' + service;
                    var bits = [];
                    if (result && typeof result === 'object') {
                        if (result.error) bits.push(result.error);
                        if (result.active) bits.push('ActiveState: ' + result.active);
                        if (result.failed) bits.push('FailedState: ' + result.failed);
                        if (typeof result.pid !== 'undefined' && result.pid !== null) bits.push('PID: ' + result.pid);
                    } else {
                        bits.push('Unknown error.');
                    }
                    bits.push('<br>The following output may help. Please contact Allsky support if the problem persists');
                    $('#as-system-err-title').text(title);
                    $('#as-system-err-summary').html(bits.join(' — '));

                    $('#as-system-err-exec').text((result && result.exec_output) ? String(result.exec_output) : '(no exec output)');
                    var diag = result && result.diagnostics ? result.diagnostics : {};
                    $('#as-system-err-status').text(diag && diag.systemctl_status ? String(diag.systemctl_status) : '(no systemctl status)');
                    $('#as-system-err-journal').text(diag && diag.journal ? String(diag.journal) : '(no journal output)');

                    $('#as-system-error-modal').modal('show');
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
             
            }).always(() => {
                $.LoadingOverlay('hide');
            });
        });

        this.fetchData();
        this.timer = setInterval(() => this.fetchData(), 5000);
    }
}

let watchdog = new ALLSKYWATCHDOG();
watchdog.run();
