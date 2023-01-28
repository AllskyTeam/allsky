<?php

/**
*
*
*/
function DisplayWPAConfig(){
	global $page;
	$status = new StatusMessages();

	// Find currently configured networks
	exec(' sudo cat ' . RASPI_WPA_SUPPLICANT_CONFIG, $known_return);

	$network = null;
	$ssid = null;

	// Process the already-configured networks.
	foreach($known_return as $line) {
		if (preg_match('/network\s*=/', $line)) {
			$network = array('visible' => false, 'configured' => true, 'connected' => false);
		} elseif ($network !== null) {
			if (preg_match('/^\s*}\s*$/', $line)) {
				$networks[$ssid] = $network;
				$network = null;
				$ssid = null;
			} elseif ($lineArr = preg_split('/\s*=\s*/', trim($line))) {
				switch(strtolower($lineArr[0])) {
					case 'ssid':
						$ssid = trim($lineArr[1], '"');
						break;
					case 'psk':
						if (array_key_exists('passphrase', $network)) {
							break;
						}
					case '#psk':
						$network['protocol'] = 'WPA';
					case 'wep_key0': // Untested
						$network['passphrase'] = trim($lineArr[1], '"');
						break;
					case 'key_mgmt':
						if (! array_key_exists('passphrase', $network) && $lineArr[1] === 'NONE') {
							$network['protocol'] = 'Open';
						}
						break;
				}
			}
		}
	}

	if ( isset($_POST['client_settings']) && CSRFValidate() ) {
		$tmp_networks = $networks;
		if ($wpa_file = fopen('/tmp/wifidata', 'w')) {
			fwrite($wpa_file, 'ctrl_interface=DIR=' . RASPI_WPA_CTRL_INTERFACE . ' GROUP=netdev' . PHP_EOL);
			fwrite($wpa_file, 'update_config=1' . PHP_EOL);

			foreach(array_keys($_POST) as $post) {
				if (preg_match('/delete(\d+)/', $post, $post_match)) {
					unset($tmp_networks[$_POST['ssid' . $post_match[1]]]);
				} elseif (preg_match('/update(\d+)/', $post, $post_match)) {
					// NB, at the moment, the value of protocol from the form may
					// contain HTML line breaks
					$tmp_networks[$_POST['ssid' . $post_match[1]]] = array(
					'protocol' => ( $_POST['protocol' . $post_match[1]] === 'Open' ? 'Open' : 'WPA' ),
					'passphrase' => $_POST['passphrase' . $post_match[1]],
					'configured' => true
					);
				}
			}

			$ok = true;
			foreach($tmp_networks as $ssid => $network) {
				if ($network['protocol'] === 'Open') {
					fwrite($wpa_file, "network={".PHP_EOL);
					fwrite($wpa_file, "\tssid=\"$ssid\"".PHP_EOL);
					fwrite($wpa_file, "\tkey_mgmt=NONE".PHP_EOL);
					fwrite($wpa_file, "}".PHP_EOL);
				} else {
					$passphrase = $network['passphrase'];
					if (strlen($passphrase) >=8 && strlen($passphrase) <= 63) {
						unset($wpa_passphrase);
						unset($line);
						exec( 'wpa_passphrase '.escapeshellarg($ssid). ' ' . escapeshellarg($passphrase),$wpa_passphrase );
						foreach($wpa_passphrase as $line) {
							fwrite($wpa_file, $line.PHP_EOL);
						}
					} else {
						$status->addMessage('WPA passphrase must be between 8 and 63 characters', 'danger');
						$ok = false;
					}
				}
			}

			if ($ok) {
				system( 'sudo cp /tmp/wifidata ' . RASPI_WPA_SUPPLICANT_CONFIG, $returnval );
				if( $returnval == 0 ) {
					exec('sudo wpa_cli reconfigure', $reconfigure_out, $reconfigure_return );
					if ($reconfigure_return == 0) {
						$status->addMessage('Wifi settings updated successfully', 'success');
						$networks = $tmp_networks;
					} else {
						$status->addMessage('Wifi settings updated but cannot restart (cannot execute "wpa_cli reconfigure")', 'danger');
					}
				} else {
					$status->addMessage('Wifi settings failed to be updated', 'danger');
				}
			}
		} else {
			$status->addMessage('Failed to updated wifi settings', 'danger');
		}
	}

	// Scan for all networks.
	exec( 'sudo wpa_cli scan' );
	sleep(3);
	exec( 'sudo wpa_cli scan_results',$scan_return );
	for( $shift = 0; $shift < 2; $shift++ ) {
		array_shift($scan_return);
	}
	// display output
	$have_multiple = false;
	static $note = " <span style='color: red; font-weight: bold'>*</span>";
	// $networks contains the prior-configured SSID(s).
	// New SSIDs are added to $networks.
	$num_networks = 0;
	if (! isset($networks)) $networks = [];	// eliminates warning messages in log file

	// Walk through each scanned SSID.
	foreach( $scan_return as $network ) {
		$arrNetwork = preg_split("/[\t]+/",$network);
		// fields: bssid,   frequency, signal level, flags,    ssid 
		// fields:          channel                  protocol  ssid
		// fields: 0        1          2             3         4
		if (isset($arrNetwork[4])) {
			$channel = ConvertToChannel($arrNetwork[1]);
			$ssid = $arrNetwork[4];
			if (substr($ssid, 0, 4) == "\\x00") $ssid = "Unknown (\\x00)";
			if (array_key_exists($ssid, $networks)) {
				// Already configured SSID.
				$is_new = false;
				$networks[$ssid]['visible'] = true;

				// Some SSIDs may be on multiple channels in multiple bands
				if (! isset($networks[$ssid]['channel'])) {
					// This is the SSID that's in use.
// echo "<br>Existing SSD $ssid, in use";
					$networks[$ssid]['channel'] = $channel;
					$networks[$ssid]['times'] = 1;
				} else {
					$have_multiple = true;
					// $networks[$ssid]['channel'] .= "<br>$channel";
					$networks[$ssid]['times']++;
// echo "<br>Existing SSD $ssid, Occurence: " . $networks[$ssid]['times'] . ", channel=$channel";
				}
			} else {
				// New SSID
// echo "<br>New SSID $ssid, channel=$channel";
				$num_networks += 1;
				$networks[$ssid] = array(
					'configured' => false,
					'protocol' => ConvertToSecurity($arrNetwork[3]),
					'channel' => $channel,
					'times' => 1,
					'passphrase' => '',
					'visible' => true,
					'connected' => false
				);
			}
		}
	}

	exec( 'iwconfig wlan0', $iwconfig_return );
	foreach ($iwconfig_return as $line) {
		if (preg_match( '/ESSID:\"([^"]+)\"/i',$line,$iwconfig_ssid )) {
			$networks[$iwconfig_ssid[1]]['connected'] = true;
		}
	}
?>

	<div class="row"><!-- don't indent all <div> - there are too many of them -->
	<div class="col-lg-12">
		<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-wifi fa-fw"></i> Configure Wi-Fi</div>
		<!-- /.panel-heading -->
		<div class="panel-body">
			<p><?php $status->showMessages(); ?></p>
			<h4>Wi-Fi SSIDs</h4>

			<form method="POST" action="?page=<?php echo $page ?>" name="wpa_conf_form">
			<?php CSRFToken() ?>
			<input type="hidden" name="client_settings">
			<table class="table table-responsive table-striped">
				<thead>
				<tr>
				<th></th>
				<th>SSID</th>
				<th>Channel&nbsp;/&nbsp;Band</th>
				<th>Security</th>
				<th>Passphrase</th>
				<th></th>
				</tr>
				</thead>
				<tbody>
			<?php $index = 0;
			if ($num_networks == 0) {
				echo "<p style='font-size: 150%; color: red;'>No networks found</p>";
			} else foreach ($networks as $ssid => $network) {
					$configured = getVariableOrDefault($network, 'configured', false);
					$connected = getVariableOrDefault($network, 'connected', false);
					$visible = getVariableOrDefault($network, 'visible', false);
					$channel = getVariableOrDefault($network, 'channel', "");
					$times = getVariableOrDefault($network, 'times', 1);
					$protocol = getVariableOrDefault($network, 'protocol', "");
					$passphrase = getVariableOrDefault($network, 'passphrase', "");
					// If the passphrase is long, shorten it so it doesn't take up too much space.
					if (strlen($passphrase) > 10) $passphrase = substr($passphrase, 1, 10);

					echo "<tr>";

					echo "<td>";
					if ($configured)
						echo '<i class="fa fa-check-circle fa-fw" title="configured"></i>';
					if ($connected)
						echo '<i class="fa fa-exchange-alt fa-fw" title="connected"></i>';
					echo "</td>";

					echo "<td>";
					echo "<input type='hidden' name='ssid$index' value='" . htmlentities($ssid) . "' />";
					echo $ssid;
					echo "</td>";

					echo "<td>";
					if ($visible) {
						echo $channel;
						if ($times > 1) echo "<br>$note $times times";
					} else {
						echo '<span class="label label-warning">X</span>';
					}
					echo "</td>";

					echo "<td><input type='hidden' name='protocol$index' value='$protocol' />$protocol</td>";

					if ($protocol === 'Open')
						echo "<td><input type='hidden' name='passphrase$index' value='' />---</td>";
					else
						echo "<td><input type='password' class='form-control' style='width: 7em; font-size: 80%; padding-left: 2px; padding-right: 2px;' name='passphrase$index' value='$passphrase' onKeyUp='CheckPSK(this, " . '"' . "update$index" . '"' .")'></td>";
					echo "<td>";
					echo '<div class="btn-group btn-block">';
					echo '<span style="white-space: nowrap">';
					$buttonStyle = "style='padding-left: 3px; padding-right: 3px; width: 4em;'";
					if ($configured) {
						echo "<input type='submit' class='btn btn-warning' $buttonStyle value='Update' id='update$index' name='update$index'";
						echo ($protocol === 'Open') ? ' disabled' : '' . "/>";
					} else {
						echo "<input type='submit' class='btn btn-info' $buttonStyle value='Add' id='update$index' name='update$index'";
						echo ($protocol === 'Open') ? ' disabled' : '' . "/>";
					}
					echo "<input type='submit' class='btn btn-danger' $buttonStyle value='Delete' name='delete$index'";
					echo $configured ? '' : ' disabled' . " />";
					echo "</span>";
					echo "</div>";
					echo "</td>";
					echo "</tr>\n";
					$index += 1;
			}
		?>
			</tbody>
			</table>
			</form>
		</div><!-- ./ Panel body -->
		<div class="panel-footer">
			<?php if ($have_multiple)
				echo "$note SSID is in multiple channels and/or bands; only the first is listed above.<br>";
			?>
			<strong>Note,</strong>
			WEP access points appear as 'Open'.
			Allsky does not currently support connecting to WEP.
		</div>
		</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
<?php
}
?>
