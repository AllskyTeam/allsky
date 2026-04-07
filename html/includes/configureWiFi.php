<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function getWifiConfigInterfaces()
{
    $interfaces = [];

    $iwOutput = @shell_exec('/usr/sbin/iw dev 2>/dev/null');
    if (is_string($iwOutput) && trim($iwOutput) !== '') {
        foreach (preg_split('/\r?\n/', $iwOutput) as $line) {
            if (preg_match('/^\s*Interface\s+(\S+)/', $line, $matches)) {
                $interfaces[] = trim($matches[1]);
            }
        }
    }

    if (count($interfaces) === 0) {
        $nmcliOutput = @shell_exec('/usr/bin/nmcli -t -f DEVICE,TYPE device status 2>/dev/null');
        if (is_string($nmcliOutput) && trim($nmcliOutput) !== '') {
            foreach (preg_split('/\r?\n/', $nmcliOutput) as $line) {
                if ($line === '') {
                    continue;
                }

                $parts = explode(':', $line);
                if (($parts[1] ?? '') === 'wifi' && trim((string) ($parts[0] ?? '')) !== '') {
                    $interfaces[] = trim($parts[0]);
                }
            }
        }
    }

    $interfaces = array_values(array_unique(array_filter($interfaces)));
    sort($interfaces);

    return $interfaces;
}

function DisplayWPAConfig()
{
    global $pageHeaderTitle, $pageIcon;
    $interfaces = getWifiConfigInterfaces();
?>
    <div class="panel panel-allsky" id="as-wifi-panel">
        <div class="panel-heading">
            <i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?>
        </div>
        <div class="panel-body">
            <?php CSRFToken() ?>
<?php if (count($interfaces) === 0) { ?>
            <div class="alert alert-warning">
                No Wi-Fi adapters were found.
            </div>
<?php } else { ?>
            <ul class="nav nav-tabs as-wifi-tabs" role="tablist">
<?php foreach ($interfaces as $index => $interface) {
    $active = ($index === 0) ? ' active' : '';
    $tabId = 'as_wifi_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $interface);
?>
                <li role="presentation" class="<?php echo $active ?>">
                    <a href="#<?php echo $tabId ?>" aria-controls="<?php echo $tabId ?>" role="tab" data-toggle="tab">
                        <?php echo htmlspecialchars($interface) ?>
                    </a>
                </li>
<?php } ?>
            </ul>

            <div class="tab-content as-wifi-tab-content" style="margin-top:15px;">
<?php foreach ($interfaces as $index => $interface) {
    $active = ($index === 0) ? ' active' : '';
    $tabId = 'as_wifi_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $interface);
?>
                <div
                    role="tabpanel"
                    class="tab-pane<?php echo $active ?>"
                    id="<?php echo $tabId ?>"
                    data-interface="<?php echo htmlspecialchars($interface) ?>"
                >
                    <nav class="navbar navbar-default system-action-navbar as-wifi-toolbar">
                        <div class="container-fluid">
                            <div class="navbar-left navbar-form">
                                <button
                                    type="button"
                                    class="btn btn-primary as-wifi-refresh"
                                    title="Refresh available Wi-Fi networks for <?php echo htmlspecialchars($interface) ?>"
                                    aria-label="Refresh available Wi-Fi networks for <?php echo htmlspecialchars($interface) ?>"
                                >
                                    <i class="fa fa-refresh"></i>
                                </button>
                            </div>
                        </div>
                    </nav>

                    <div class="well well-sm system-summary-card as-wifi-summary">
                        <div class="row">
                            <div class="col-sm-4">
                                <div class="as-wifi-summary-label">Connected Network</div>
                                <div class="as-wifi-summary-value as-wifi-current-ssid">Scanning...</div>
                            </div>
                            <div class="col-sm-4">
                                <div class="as-wifi-summary-label">Security</div>
                                <div class="as-wifi-summary-value as-wifi-current-security">-</div>
                            </div>
                            <div class="col-sm-4">
                                <div class="as-wifi-summary-label">Channel / Band</div>
                                <div class="as-wifi-summary-value as-wifi-current-channel-band">-</div>
                            </div>
                        </div>
                    </div>

                    <div class="as-wifi-results-header">
                        <div class="as-wifi-results-title">Available Networks</div>
                        <div class="as-wifi-results-subtitle">
                            Scan nearby Wi-Fi networks for this adapter and connect to the one you want to use.
                        </div>
                    </div>

                    <div class="as-wifi-empty-state alert alert-info hidden">
                        No Wi-Fi networks were found.
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover table-condensed as-wifi-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>SSID</th>
                                    <th>Channel</th>
                                    <th>Band</th>
                                    <th>Signal</th>
                                    <th>Security</th>
                                    <th class="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody class="as-wifi-network-list">
                                <tr class="as-wifi-placeholder-row">
                                    <td colspan="7">
                                        <div class="as-wifi-placeholder">
                                            <div class="as-wifi-placeholder-icon"><i class="fa fa-spinner fa-spin"></i></div>
                                            <div class="as-wifi-placeholder-title as-wifi-placeholder-title-lg">Scanning for available Wi-Fi networks...</div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
<?php } ?>
            </div>
<?php } ?>
        </div>
    </div>

    <div class="modal fade" id="as-wifi-connect-modal" tabindex="-1" role="dialog" aria-labelledby="as-wifi-connect-title">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title" id="as-wifi-connect-title">Connect to Wi-Fi Network</h4>
                </div>
                <div class="modal-body">
                    <div class="row system-info-row">
                        <div class="col-sm-4 system-info-label"><strong>Adapter</strong></div>
                        <div class="col-sm-8 system-info-value" id="as-wifi-connect-interface"></div>
                    </div>
                    <div class="row system-info-row">
                        <div class="col-sm-4 system-info-label"><strong>SSID</strong></div>
                        <div class="col-sm-8 system-info-value" id="as-wifi-connect-ssid"></div>
                    </div>
                    <div class="row system-info-row">
                        <div class="col-sm-4 system-info-label"><strong>Security</strong></div>
                        <div class="col-sm-8 system-info-value" id="as-wifi-connect-security"></div>
                    </div>
                    <div class="row system-info-row">
                        <div class="col-sm-4 system-info-label"><strong>Channel</strong></div>
                        <div class="col-sm-8 system-info-value" id="as-wifi-connect-channel-band"></div>
                    </div>

                    <div class="form-group" id="as-wifi-password-group">
                        <label for="as-wifi-password">Password</label>
                        <input type="password" class="form-control" id="as-wifi-password" autocomplete="new-password">
                        <p class="help-block">This network is secured and requires a password.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="as-wifi-connect-submit">Connect</button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/configurewifi.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<?php
}
?>
