<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function renderDashboardLanInfoRow($label, $value)
{
    echo "<div class='row system-info-row'>";
    echo "<div class='col-sm-4 system-info-label'><strong>$label</strong></div>";
    echo "<div class='col-sm-8 system-info-value'>$value</div>";
    echo "</div>\n";
}

function formatDashboardLanNumber($value)
{
    if (!is_scalar($value)) {
        return $value;
    }

    $stringValue = trim((string) $value);
    if ($stringValue === '' || !preg_match('/^-?\d+$/', $stringValue)) {
        return $value;
    }

    $locale = localeconv();
    $thousandsSep = $locale['thousands_sep'] ?? ',';
    if ($thousandsSep === '') {
        $thousandsSep = ',';
    }

    return number_format((float) $stringValue, 0, '', $thousandsSep);
}

function formatDashboardLanByteValue($value)
{
    if (!is_scalar($value)) {
        return $value;
    }

    $stringValue = trim((string) $value);
    if ($stringValue === '') {
        return $value;
    }

    if (preg_match('/^(-?\d+)(\s*\(.*\))$/', $stringValue, $matches)) {
        return formatDashboardLanNumber($matches[1]) . $matches[2];
    }

    return formatDashboardLanNumber($stringValue);
}

function getDashboardLanSingleValue($command, $pattern, $default = '[not set]')
{
    exec($command, $output, $retval);
    if ($retval !== 0) {
        return $default;
    }

    $text = implode("\n", $output);
    if (preg_match($pattern, $text, $matches)) {
        return trim($matches[1]);
    }

    return $default;
}

function getDashboardLanDnsServers()
{
    $servers = [];
    if (!is_readable('/etc/resolv.conf')) {
        return '[not set]';
    }

    $lines = @file('/etc/resolv.conf', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return '[not set]';
    }

    foreach ($lines as $line) {
        if (preg_match('/^\s*nameserver\s+(\S+)/i', $line, $matches)) {
            $servers[] = $matches[1];
        }
    }

    if (count($servers) === 0) {
        return '[not set]';
    }

    return implode(', ', $servers);
}

function getDashboardLanDefaultGateway($interface)
{
    $safeInterface = escapeshellarg($interface);
    $gateway = getDashboardLanSingleValue(
        "/usr/sbin/ip route show default dev {$safeInterface}",
        '/default via (\S+)/',
        '[not set]'
    );

    return $gateway;
}

function getDashboardLanIpv6Addresses($interface)
{
    $safeInterface = escapeshellarg($interface);
    exec("/usr/sbin/ip -6 addr show dev {$safeInterface}", $output, $retval);
    if ($retval !== 0) {
        return '[not set]';
    }

    $addresses = [];
    foreach ($output as $line) {
        if (preg_match('/\s+inet6\s+([0-9a-f:]+\/\d+)/i', $line, $matches)) {
            $addresses[] = $matches[1];
        }
    }

    if (count($addresses) === 0) {
        return '[not set]';
    }

    return implode('<br>', array_map('htmlspecialchars', $addresses));
}

function getDashboardLanLinkDetails($interface)
{
    $safeInterface = escapeshellarg($interface);
    exec("/usr/sbin/ethtool {$safeInterface} 2>/dev/null", $output, $retval);
    if ($retval !== 0) {
        return [
            'linkState' => '[not set]',
            'speed' => '[not set]',
            'duplex' => '[not set]',
            'autoNegotiation' => '[not set]',
        ];
    }

    $text = implode("\n", $output);
    $details = [
        'linkState' => '[not set]',
        'speed' => '[not set]',
        'duplex' => '[not set]',
        'autoNegotiation' => '[not set]',
    ];

    if (preg_match('/Link detected:\s*(.+)$/mi', $text, $matches)) {
        $details['linkState'] = strcasecmp(trim($matches[1]), 'yes') === 0 ? 'Connected' : 'Disconnected';
    }
    if (preg_match('/Speed:\s*(.+)$/mi', $text, $matches)) {
        $details['speed'] = trim($matches[1]);
    }
    if (preg_match('/Duplex:\s*(.+)$/mi', $text, $matches)) {
        $details['duplex'] = trim($matches[1]);
    }
    if (preg_match('/Auto-negotiation:\s*(.+)$/mi', $text, $matches)) {
        $details['autoNegotiation'] = trim($matches[1]);
    }

    return $details;
}

function getDashboardLanPacketStats($interface)
{
    $safeInterface = escapeshellarg($interface);
    exec("/usr/sbin/ip -s link show dev {$safeInterface}", $output, $retval);
    if ($retval !== 0) {
        return [
            'rxErrors' => '[not set]',
            'rxDropped' => '[not set]',
            'txErrors' => '[not set]',
            'txDropped' => '[not set]',
        ];
    }

    $text = implode("\n", $output);
    $stats = [
        'rxErrors' => '[not set]',
        'rxDropped' => '[not set]',
        'txErrors' => '[not set]',
        'txDropped' => '[not set]',
    ];

    if (preg_match('/RX:\s+bytes\s+packets\s+errors\s+dropped.*\n\s*\d+\s+\d+\s+(\d+)\s+(\d+)/mi', $text, $matches)) {
        $stats['rxErrors'] = $matches[1];
        $stats['rxDropped'] = $matches[2];
    }

    if (preg_match('/TX:\s+bytes\s+packets\s+errors\s+dropped.*\n\s*\d+\s+\d+\s+(\d+)\s+(\d+)/mi', $text, $matches)) {
        $stats['txErrors'] = $matches[1];
        $stats['txDropped'] = $matches[2];
    }

    return $stats;
}

function DisplayDashboard_LAN()
{
	global $pageHeaderTitle, $pageIcon, $pageHelp;
?>
	<div class="panel panel-allsky" id="as-lan-panel">
		<div class="panel-heading clearfix">
            <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
			<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
        </div>
<?php
	$interfaces = array();

	$dq = '"';		// double quote
	$cmd = "hwinfo --network --short | gawk '{ if ($2 == {$dq}Ethernet{$dq}) print $1; }' ";
	if (exec($cmd, $output, $retval) === false || $retval !== 0) {
		echo "<div class='errorMsgBig'>Unable to get list of network devices</div>";
		return;
	}

	// Collect all interfaces
	foreach($output as $interface) {
		if ($interface === "") continue;
		$interfaces[] = $interface;
	}

	if (count($interfaces) === 0) {
		return;
	}

	echo "<div class='panel-body'>\n";
	echo "<ul class='nav nav-tabs as-lan-tabs' role='tablist'>\n";
	foreach ($interfaces as $index => $interface) {
		$active = ($index === 0) ? ' active' : '';
		$tabId = 'tab_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $interface);
		echo "<li role='presentation' class='{$active}'><a href='#{$tabId}' aria-controls='{$tabId}' role='tab' data-toggle='tab'>" . htmlspecialchars($interface) . "</a></li>\n";
	}
	echo "</ul>\n";

	echo "<div class='tab-content' style='margin-top:15px;'>\n";
	foreach ($interfaces as $index => $interface) {
		$active = ($index === 0) ? ' active' : '';
		$tabId = 'tab_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $interface);
		echo "<div role='tabpanel' class='tab-pane{$active}' id='{$tabId}'>\n";
		process_LAN_data($interface);
		echo "</div>\n";
	}
	echo "</div>\n";
	echo "</div>\n";
?>
	</div><!-- /.panel-primary -->
    <div class="modal fade" id="as-lan-confirm-modal" tabindex="-1" role="dialog" aria-labelledby="as-lan-confirm-title">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title" id="as-lan-confirm-title">Stop Interface</h4>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Are you sure?</div>
                        <div id="as-lan-confirm-message">This will stop the selected network interface.</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="as-lan-confirm-accept">Stop Interface</button>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" id="as-lan-config-modal" tabindex="-1" role="dialog" aria-labelledby="as-lan-config-title">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title" id="as-lan-config-title">Configure Interface</h4>
                </div>
                <div class="modal-body">
                    <div id="as-lan-config-alerts"></div>
                    <div class="row system-info-row">
                        <div class="col-sm-4 system-info-label"><strong>Interface</strong></div>
                        <div class="col-sm-8 system-info-value" id="as-lan-config-interface"></div>
                    </div>
                    <div class="form-group">
                        <label>Configuration Mode</label>
                        <div class="radio">
                            <label><input type="radio" name="as-lan-config-mode" value="dhcp" checked> DHCP</label>
                        </div>
                        <div class="radio">
                            <label><input type="radio" name="as-lan-config-mode" value="manual"> Manual</label>
                        </div>
                    </div>
                    <div id="as-lan-manual-fields" class="hidden">
                        <div class="form-group">
                            <label for="as-lan-config-address">IP Address</label>
                            <input type="text" class="form-control" id="as-lan-config-address" placeholder="192.168.1.10">
                        </div>
                        <div class="form-group">
                            <label for="as-lan-config-netmask">Netmask</label>
                            <input type="text" class="form-control" id="as-lan-config-netmask" placeholder="255.255.255.0">
                        </div>
                        <div class="form-group">
                            <label for="as-lan-config-gateway">Gateway</label>
                            <input type="text" class="form-control" id="as-lan-config-gateway" placeholder="192.168.1.1">
                        </div>
                        <div class="form-group">
                            <label for="as-lan-config-dns">DNS Servers</label>
                            <input type="text" class="form-control" id="as-lan-config-dns" placeholder="1.1.1.1, 8.8.8.8">
                            <p class="help-block">Separate multiple DNS servers with commas.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="as-lan-config-save">Save</button>
                </div>
            </div>
        </div>
    </div>
<?php
echo addAsset('/js/dashboard-lan.js');
}

function process_LAN_data($interface)
{
	global $page;
	$myStatus = new StatusMessages();

	// Unlike with WLAN where when it's UP it's also RUNNING,
	// with the LAN, the port can be up but nothing connected, i.e., not "RUNNING".

	$interface_output = get_interface_status("ifconfig $interface");

	// $interface_output is sent and the other variables are returned.
	parse_ifconfig($interface_output, $strHWAddress, $strIPAddress, $strNetMask, $strRxPackets, $strTxPackets, $strRxBytes, $strTxBytes);

    $linkDetails = getDashboardLanLinkDetails($interface);
    $packetStats = getDashboardLanPacketStats($interface);
    $defaultGateway = getDashboardLanDefaultGateway($interface);
    $dnsServers = getDashboardLanDnsServers();
    $ipv6Addresses = getDashboardLanIpv6Addresses($interface);
    $mtu = getDashboardLanSingleValue(
        "/usr/sbin/ip link show dev " . escapeshellarg($interface),
        '/mtu\s+(\d+)/',
        '[not set]'
    );

	// $interface and $interface_output are sent, $myStatus is returned.
	$interface_up = handle_interface_POST_and_status($interface, $interface_output, $myStatus);
    if (! $interface_up) {
        $strIPAddress = '[not set]';
        $strNetMask = '[not set]';
        $defaultGateway = '[not set]';
        $ipv6Addresses = '[not set]';
        $linkDetails['linkState'] = 'Disconnected';
        $linkDetails['speed'] = '[not set]';
        $linkDetails['duplex'] = '[not set]';
        $linkDetails['autoNegotiation'] = '[not set]';
    }
?>

            <nav class="navbar navbar-default system-action-navbar as-lan-toolbar">
                <div class="container-fluid">
                    <div class="navbar-left navbar-form as-lan-actions" data-interface="<?php echo htmlspecialchars($interface) ?>">
                        <button
                            type="button"
                            class="btn btn-success as-lan-interface-action"
                            data-action="start"
                            title="Start <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Start <?php echo htmlspecialchars($interface) ?>"
                            <?php echo $interface_up ? 'disabled' : '' ?>
                        >
                            <i class="fa fa-play"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-warning as-lan-interface-action"
                            data-action="stop"
                            title="Stop <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Stop <?php echo htmlspecialchars($interface) ?>"
                            <?php echo $interface_up ? '' : 'disabled' ?>
                        >
                            <i class="fa fa-stop"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-primary as-lan-refresh"
                            title="Refresh <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Refresh <?php echo htmlspecialchars($interface) ?>"
                        >
                            <i class="fa fa-refresh"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-default as-lan-config"
                            title="Configure <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Configure <?php echo htmlspecialchars($interface) ?>"
                        >
                            <i class="fa fa-cog"></i>
                        </button>
                    </div>
                </div>
            </nav>
			<div class="row">
				<div class="panel panel-success">
					<div class="panel-body">
                        <div class="row">
                            <div class="col-md-12">
                                <div class="well well-sm system-summary-card">
                                    <h4>Interface Information</h4>
                                    <?php
                                        renderDashboardLanInfoRow('Status', $interface_up ? 'Up' : 'Down');
                                        renderDashboardLanInfoRow('Interface Name', htmlspecialchars($interface));
                                        renderDashboardLanInfoRow('Link State', htmlspecialchars($linkDetails['linkState']));
                                        renderDashboardLanInfoRow('Speed', htmlspecialchars($linkDetails['speed']));
                                        renderDashboardLanInfoRow('Duplex', htmlspecialchars($linkDetails['duplex']));
                                        renderDashboardLanInfoRow('Auto Negotiation', htmlspecialchars($linkDetails['autoNegotiation']));
                                        renderDashboardLanInfoRow('IP Address', htmlspecialchars($strIPAddress));
                                        renderDashboardLanInfoRow('IPv6 Address', $ipv6Addresses);
                                        renderDashboardLanInfoRow('Subnet Mask', htmlspecialchars($strNetMask));
                                        renderDashboardLanInfoRow('Default Gateway', htmlspecialchars($defaultGateway));
                                        renderDashboardLanInfoRow('DNS Servers', htmlspecialchars($dnsServers));
                                        renderDashboardLanInfoRow('MTU', htmlspecialchars((string) formatDashboardLanNumber($mtu)));
                                        renderDashboardLanInfoRow('MAC Address', htmlspecialchars($strHWAddress));
                                    ?>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <div class="well well-sm system-summary-card">
                                    <h4>Interface Statistics</h4>
                                    <?php
                                        renderDashboardLanInfoRow('Received Packets', htmlspecialchars((string) formatDashboardLanNumber($strRxPackets)));
                                        renderDashboardLanInfoRow('Received Bytes', htmlspecialchars((string) formatDashboardLanByteValue($strRxBytes)));
                                        renderDashboardLanInfoRow('RX Errors', htmlspecialchars((string) formatDashboardLanNumber($packetStats['rxErrors'])));
                                        renderDashboardLanInfoRow('RX Dropped', htmlspecialchars((string) formatDashboardLanNumber($packetStats['rxDropped'])));
                                        renderDashboardLanInfoRow('Transferred Packets', htmlspecialchars((string) formatDashboardLanNumber($strTxPackets)));
                                        renderDashboardLanInfoRow('Transferred Bytes', htmlspecialchars((string) formatDashboardLanByteValue($strTxBytes)));
                                        renderDashboardLanInfoRow('TX Errors', htmlspecialchars((string) formatDashboardLanNumber($packetStats['txErrors'])));
                                        renderDashboardLanInfoRow('TX Dropped', htmlspecialchars((string) formatDashboardLanNumber($packetStats['txDropped'])));
                                    ?>
                                </div>
                            </div>
                        </div>
					</div><!-- /.panel-body -->
				</div><!-- /.panel-default -->
			</div><!-- /.row -->
<?php 
}
?>
