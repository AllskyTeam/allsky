<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function renderDashboardWlanInfoRow($label, $value)
{
    echo "<div class='row system-info-row'>";
    echo "<div class='col-sm-4 system-info-label'><strong>$label</strong></div>";
    echo "<div class='col-sm-8 system-info-value'>$value</div>";
    echo "</div>\n";
}

function renderDashboardWlanProgressRow($label, $content)
{
    echo "<div class='row system-progress-row'>";
    echo "<div class='col-sm-2 system-info-label'><strong>$label</strong></div>";
    echo "<div class='col-sm-10 system-progress-value'>$content</div>";
    echo "</div>\n";
}

function formatDashboardWlanNumber($value)
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

function formatDashboardWlanByteValue($value)
{
    if (!is_scalar($value)) {
        return $value;
    }

    $stringValue = trim((string) $value);
    if ($stringValue === '') {
        return $value;
    }

    if (preg_match('/^(-?\d+)(\s*\(.*\))$/', $stringValue, $matches)) {
        return formatDashboardWlanNumber($matches[1]) . $matches[2];
    }

    return formatDashboardWlanNumber($stringValue);
}

function getDashboardWlanSingleValue($command, $pattern, $default = '[not set]')
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

function getDashboardWlanIpv6Addresses($interface)
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

function getDashboardWlanDnsServers()
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

function getDashboardWlanDefaultGateway($interface)
{
    $safeInterface = escapeshellarg($interface);
    return getDashboardWlanSingleValue(
        "/usr/sbin/ip route show default dev {$safeInterface}",
        '/default via (\S+)/',
        '[not set]'
    );
}

function getDashboardWlanBandFromFrequency($frequency)
{
    $value = trim((string) $frequency);
    if ($value === '' || $value === '[not set]') {
        return '[not set]';
    }

    $numeric = (float) preg_replace('/[^0-9.]/', '', $value);
    if ($numeric >= 5.925) {
        return '6 GHz';
    }
    if ($numeric >= 4.9) {
        return '5 GHz';
    }
    if ($numeric >= 2.4) {
        return '2.4 GHz';
    }

    return '[not set]';
}

function getDashboardWlanChannelFromFrequency($frequency)
{
    $value = trim((string) $frequency);
    if ($value === '' || $value === '[not set]') {
        return '[not set]';
    }

    $ghz = (float) preg_replace('/[^0-9.]/', '', $value);
    if ($ghz <= 0) {
        return '[not set]';
    }

    $mhz = (int) round($ghz * 1000);
    if ($mhz >= 2412 && $mhz <= 2484) {
        if ($mhz === 2484) {
            return '14';
        }
        return (string) round(($mhz - 2407) / 5);
    }

    if ($mhz >= 5000 && $mhz <= 7115) {
        return (string) round(($mhz - 5000) / 5);
    }

    return '[not set]';
}

function getDashboardWlanRegulatoryDomain()
{
    exec('/usr/sbin/iw reg get 2>/dev/null', $output, $retval);
    if ($retval !== 0) {
        return '[not set]';
    }

    $text = implode("\n", $output);
    if (preg_match('/country\s+([A-Z0-9]{2})\s*:/i', $text, $matches)) {
        return strtoupper($matches[1]);
    }

    return '[not set]';
}

function getDashboardWlanRfkillStatus()
{
    exec('/usr/sbin/rfkill list 2>/dev/null', $output, $retval);
    if ($retval !== 0) {
        return [
            'blocked' => false,
            'soft' => false,
            'hard' => false,
        ];
    }

    $blocks = preg_split('/\n(?=\d+:\s)/', trim(implode("\n", $output)));
    $softBlocked = false;
    $hardBlocked = false;

    foreach ($blocks as $block) {
        $isWireless = false;
        if (preg_match('/^\d+:\s+.+:\s+Wireless LAN$/im', $block)) {
            $isWireless = true;
        } elseif (preg_match('/^\s*Type:\s*wlan$/im', $block)) {
            $isWireless = true;
        } elseif (preg_match('/^\s*Type:\s*wireless$/im', $block)) {
            $isWireless = true;
        }

        if (!$isWireless) {
            continue;
        }

        if (preg_match('/Soft blocked:\s*yes/im', $block)) {
            $softBlocked = true;
        }
        if (preg_match('/Hard blocked:\s*yes/im', $block)) {
            $hardBlocked = true;
        }
    }

    return [
        'blocked' => ($softBlocked || $hardBlocked),
        'soft' => $softBlocked,
        'hard' => $hardBlocked,
    ];
}

function DisplayDashboard_WLAN()
{
	global $pageHeaderTitle, $pageIcon, $pageHelp;
    $rfkillStatus = getDashboardWlanRfkillStatus();
?>
	<div class="panel panel-allsky" id="as-wlan-panel">
		<div class="panel-heading clearfix">
            <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
<?php if (!empty($pageHelp)) { ?>
            <a class="pull-right" href="<?php echo $pageHelp; ?>" target="_blank" rel="noopener noreferrer" data-toggle="tooltip" data-container="body" data-placement="left" title="Help">
                <i class="fa-solid fa-circle-question"></i> Help
            </a>
<?php } ?>
        </div>
<?php
    $interfaces = [];

	$dq = '"';
	$cmd = "hwinfo --network --short | gawk '{ if ($2 == {$dq}WLAN{$dq}) print $1; }' ";
	if (exec($cmd, $output, $retval) === false || $retval !== 0) {
		echo "<div class='errorMsgBig'>Unable to get list of network devices</div>";
		return;
	}

    foreach ($output as $interface) {
        if ($interface === '') {
            continue;
        }
        $interfaces[] = $interface;
    }

    if (count($interfaces) === 0) {
        return;
    }

    if ($rfkillStatus['blocked']) {
        echo "<div class='panel-body'>\n";
        echo "    <div class='as-wifi-placeholder as-wifi-placeholder-error' style='min-height: 0; margin-bottom: 0; border-radius: 8px;'>\n";
        echo "        <div class='as-wifi-placeholder-icon'><i class='fa fa-triangle-exclamation'></i></div>\n";
        echo "        <div class='as-wifi-placeholder-title'>Wi-Fi Is Blocked</div>\n";
        echo "        <div class='as-wifi-placeholder-text'>\n";
        if ($rfkillStatus['soft']) {
            echo "            The wireless adapter is soft-blocked. Run <code>sudo rfkill unblock wifi</code> to re-enable it.\n";
        }
        if ($rfkillStatus['hard']) {
            echo "            The wireless adapter is hard-blocked. Check for a hardware wireless switch, BIOS setting, or device-level radio disable.\n";
        }
        echo "        </div>\n";
        echo "    </div>\n";
        echo "</div>\n";
        echo "</div>\n";
?>
    <script src="js/dashboard-wlan.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<?php
        return;
    }

    echo "<div class='panel-body'>\n";
    echo "<ul class='nav nav-tabs as-wlan-tabs' role='tablist'>\n";
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
        process_WLAN_data($interface);
        echo "</div>\n";
    }
    echo "</div>\n";
    echo "</div>\n";
?>
	</div>
    <div class="modal fade" id="as-wlan-confirm-modal" tabindex="-1" role="dialog" aria-labelledby="as-wlan-confirm-title">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title" id="as-wlan-confirm-title">Stop Interface</h4>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Are you sure?</div>
                        <div id="as-wlan-confirm-message">This will stop the selected wireless interface.</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="as-wlan-confirm-accept">Stop Interface</button>
                </div>
            </div>
        </div>
    </div>
    <script src="js/dashboard-wlan.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<?php
}

function process_WLAN_data($interface)
{
    $notSetMsg = '[not set]';
	$interface_output = get_interface_status("ifconfig $interface; iwconfig $interface");

	parse_ifconfig($interface_output, $strHWAddress, $strIPAddress, $strNetMask, $strRxPackets, $strTxPackets, $strRxBytes, $strTxBytes);

	preg_match('/ESSID:\"(.*)\"/i', $interface_output, $result);
	$strSSID = trim((string) getVariableOrDefault($result, 1, $notSetMsg));
    if ($strSSID === '' || strtoupper($strSSID) === 'OFF/ANY') {
        $strSSID = $notSetMsg;
    }

	preg_match('/Access Point:\s*([0-9a-f:]+)/i', $interface_output, $result);
	$strBSSID = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match('/Bit Rate=([0-9\.]+\s*Mb\/s)/i', $interface_output, $result);
	$strBitrate = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match('/Tx-Power=([0-9]+\s*dBm)/i', $interface_output, $result);
	$strTxPower = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match('/Link Quality=([0-9]+)\/([0-9]+)/i', $interface_output, $result);
	$strLinkQualityAbsolute = getVariableOrDefault($result, 1, $notSetMsg);
	$strLinkQualityMax = getVariableOrDefault($result, 2, $strLinkQualityAbsolute);
	if ($strLinkQualityAbsolute !== $notSetMsg && $strLinkQualityMax !== $notSetMsg && (int) $strLinkQualityMax > 0) {
		$strLinkQualityPercent = number_format(((int) $strLinkQualityAbsolute / (int) $strLinkQualityMax) * 100, 0);
		if ($strLinkQualityPercent >= 75) {
			$strLinkQualityStatus = "success";
		} elseif ($strLinkQualityPercent >= 50) {
			$strLinkQualityStatus = "warning";
		} else {
			$strLinkQualityStatus = "danger";
		}
	} else {
		$strLinkQualityPercent = $notSetMsg;
		$strLinkQualityStatus = "info";
	}

	preg_match('/Signal level=(-?[0-9]+\s*dBm)/i', $interface_output, $result);
	$strSignalLevel = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match('/Frequency:([0-9\.]+\s*GHz)/i', $interface_output, $result);
	$strFrequency = getVariableOrDefault($result, 1, $notSetMsg);

    $interface_up = is_interface_up($interface_output);
    $interface_running = is_interface_running($interface_output);
    $ipv6Addresses = getDashboardWlanIpv6Addresses($interface);
    $defaultGateway = getDashboardWlanDefaultGateway($interface);
    $dnsServers = getDashboardWlanDnsServers();
    $regulatoryDomain = getDashboardWlanRegulatoryDomain();
    $band = getDashboardWlanBandFromFrequency($strFrequency);
    $channel = getDashboardWlanChannelFromFrequency($strFrequency);
    $mtu = getDashboardWlanSingleValue(
        "/usr/sbin/ip link show dev " . escapeshellarg($interface),
        '/mtu\s+(\d+)/',
        '[not set]'
    );

    if (! $interface_up) {
        $strIPAddress = $notSetMsg;
        $strNetMask = $notSetMsg;
        $strSSID = $notSetMsg;
        $strBSSID = $notSetMsg;
        $strBitrate = $notSetMsg;
        $strTxPower = $notSetMsg;
        $strSignalLevel = $notSetMsg;
        $strFrequency = $notSetMsg;
        $strLinkQualityPercent = $notSetMsg;
        $ipv6Addresses = $notSetMsg;
        $defaultGateway = $notSetMsg;
        $band = $notSetMsg;
        $channel = $notSetMsg;
    }
?>
            <nav class="navbar navbar-default system-action-navbar as-wlan-toolbar">
                <div class="container-fluid">
                    <div class="navbar-left navbar-form as-wlan-actions" data-interface="<?php echo htmlspecialchars($interface) ?>">
                        <button
                            type="button"
                            class="btn btn-success as-wlan-interface-action"
                            data-action="start"
                            title="Start <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Start <?php echo htmlspecialchars($interface) ?>"
                            <?php echo $interface_up ? 'disabled' : '' ?>
                        >
                            <i class="fa fa-play"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-warning as-wlan-interface-action"
                            data-action="stop"
                            title="Stop <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Stop <?php echo htmlspecialchars($interface) ?>"
                            <?php echo $interface_up ? '' : 'disabled' ?>
                        >
                            <i class="fa fa-stop"></i>
                        </button>
                        <button
                            type="button"
                            class="btn btn-primary as-wlan-refresh"
                            title="Refresh <?php echo htmlspecialchars($interface) ?>"
                            aria-label="Refresh <?php echo htmlspecialchars($interface) ?>"
                        >
                            <i class="fa fa-refresh"></i>
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
                                        renderDashboardWlanInfoRow('Status', $interface_up ? 'Up' : 'Down');
                                        renderDashboardWlanInfoRow('Interface Name', htmlspecialchars($interface));
                                        renderDashboardWlanInfoRow('Connection State', $interface_running ? 'Connected' : ($interface_up ? 'Up, Not Connected' : 'Disconnected'));
                                        renderDashboardWlanInfoRow('IP Address', htmlspecialchars($strIPAddress));
                                        renderDashboardWlanInfoRow('IPv6 Address', $ipv6Addresses);
                                        renderDashboardWlanInfoRow('Subnet Mask', htmlspecialchars($strNetMask));
                                        renderDashboardWlanInfoRow('Default Gateway', htmlspecialchars($defaultGateway));
                                        renderDashboardWlanInfoRow('DNS Servers', htmlspecialchars($dnsServers));
                                        renderDashboardWlanInfoRow('MTU', htmlspecialchars((string) formatDashboardWlanNumber($mtu)));
                                        renderDashboardWlanInfoRow('MAC Address', htmlspecialchars($strHWAddress));
                                    ?>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <div class="well well-sm system-summary-card">
                                    <h4>Interface Statistics</h4>
                                    <?php
                                        renderDashboardWlanInfoRow('Received Packets', htmlspecialchars((string) formatDashboardWlanNumber($strRxPackets)));
                                        renderDashboardWlanInfoRow('Received Bytes', htmlspecialchars((string) formatDashboardWlanByteValue($strRxBytes)));
                                        renderDashboardWlanInfoRow('Transferred Packets', htmlspecialchars((string) formatDashboardWlanNumber($strTxPackets)));
                                        renderDashboardWlanInfoRow('Transferred Bytes', htmlspecialchars((string) formatDashboardWlanByteValue($strTxBytes)));
                                    ?>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <div class="well well-sm system-summary-card wireless">
                                    <h4>Wireless Information</h4>
                                    <?php
                                        renderDashboardWlanInfoRow('Connected To', htmlspecialchars($strSSID));
                                        renderDashboardWlanInfoRow('AP MAC Address', htmlspecialchars($strBSSID));
                                        renderDashboardWlanInfoRow('Bitrate', htmlspecialchars($strBitrate));
                                        renderDashboardWlanInfoRow('Signal Level', htmlspecialchars($strSignalLevel));
                                        renderDashboardWlanInfoRow('Transmit Power', htmlspecialchars($strTxPower));
                                        renderDashboardWlanInfoRow('Channel', htmlspecialchars($channel));
                                        renderDashboardWlanInfoRow('Band', htmlspecialchars($band));
                                        renderDashboardWlanInfoRow('Frequency', htmlspecialchars($strFrequency));
                                        renderDashboardWlanInfoRow('Regulatory Domain', htmlspecialchars($regulatoryDomain));

                                        if ($strLinkQualityPercent === $notSetMsg) {
                                            renderDashboardWlanInfoRow('Link Quality', htmlspecialchars($notSetMsg));
                                        } else {
                                            ob_start();
                                            ?>
                                            <div class="progress">
                                                <div class="progress-bar progress-bar-<?php echo $strLinkQualityStatus ?>"
                                                    role="progressbar"
                                                    aria-valuenow="<?php echo $strLinkQualityPercent ?>"
                                                    aria-valuemin="0" aria-valuemax="100"
                                                    style="width: <?php echo $strLinkQualityPercent ?>%;">
                                                    <?php echo htmlspecialchars($strLinkQualityPercent . '% (' . $strLinkQualityAbsolute . ' / ' . $strLinkQualityMax . ')'); ?>
                                                </div>
                                            </div>
                                            <?php
                                            renderDashboardWlanProgressRow('Link Quality', ob_get_clean());
                                        }
                                    ?>
                                </div>
                            </div>
                        </div>
					</div>
				</div>
			</div>
<?php
}
?>
