<?php

function DisplayWPAConfig(){
	global $page;
	$status = new StatusMessages();
	$debug = true;

	// Find currently configured networks
	exec(' sudo cat ' . RASPI_WPA_SUPPLICANT_CONFIG, $known_return);

	$thisNetwork = null;
	$ssid = null;

	// Process the already-configured networks.
	foreach($known_return as $line) {
		if (preg_match('/network\s*=/', $line)) {
			$thisNetwork = array('visible' => false, 'configured' => true, 'connected' => false);
		} elseif ($thisNetwork !== null) {
			if (preg_match('/^\s*}\s*$/', $line)) {		// end of info for this Network
				$networks[$ssid] = $thisNetwork;
				$thisNetwork = null;
				$ssid = null;
			} elseif ($lineArr = preg_split('/\s*=\s*/', trim($line))) {
				$key = strtolower($lineArr[0]);
				$value = trim($lineArr[1], '"');
				switch($key) {
					case 'ssid':
						$ssid = $value;
						break;
					case 'psk':
						// This may be a plain-text value or a 64-character encrypted value.
						if (array_key_exists('passphrase', $thisNetwork)) {
							break;
						}
					case '#psk':
						if ($key === '#psk')
							$thisNetwork['#psk'] = $value;	// usually plain-text passphrase
						$thisNetwork['protocol'] = 'WPA';
					case 'wep_key0': // Untested
						$thisNetwork['passphrase'] = $value;
						break;
					case 'key_mgmt':
						if (! array_key_exists('passphrase', $thisNetwork) && $value === 'NONE') {
							$thisNetwork['protocol'] = 'Open';
						}
						break;
				}
			}
		}
	}

	if ( isset($_POST['client_settings']) && CSRFValidate() ) {
		$tmp_networks = $networks;
		if ($wpa_file = fopen('/tmp/wifidata', 'w')) {
			// Re-create whole configuration file - don't try to only update the changed SSID.
			fwrite($wpa_file, 'ctrl_interface=DIR=' . RASPI_WPA_CTRL_INTERFACE . ' GROUP=netdev' . PHP_EOL);
			fwrite($wpa_file, 'update_config=1' . PHP_EOL);

if ($debug) { echo "<br><pre><b>POST</b>=\n"; print_r($_POST); echo "</pre>"; }

			// Look for items to delete or update.
			// This assumes the "delete" and "update" lines come last for each ssid.
			foreach(array_keys($_POST) as $post) {
				if (preg_match('/delete(\d+)/', $post, $post_match)) {
					$num = $post_match[1];
					$s = $_POST["ssid$num"];
					unset($tmp_networks[$s]);
				} elseif (preg_match('/update(\d+)/', $post, $post_match)) {
					// NB, at the moment, the value of protocol from the form may
					// contain HTML line breaks
					$num = $post_match[1];
					$s = $_POST["ssid$num"];
					$tmp_networks[$s] = array(
						'protocol' => ( $_POST["protocol$num"] === 'Open' ? 'Open' : 'WPA' ),
						'passphrase' => $_POST["passphrase$num"],
						'configured' => true
						);
if ($debug) { echo "<br><pre><b>tmp_networks[$s]</b>=\n"; print_r($tmp_networks[$s]); echo "</pre>"; }
				}
			}

			$ok = true;
if ($debug) { echo "<br><pre><b>tmp_networks=</b>\n"; print_r($tmp_networks); echo "</pre>"; }
			foreach($tmp_networks as $ssid => $network) {
				if ($network['protocol'] === 'Open') {
					fwrite($wpa_file, "network={".PHP_EOL);
					fwrite($wpa_file, "\tssid=\"$ssid\"".PHP_EOL);
					fwrite($wpa_file, "\tkey_mgmt=NONE".PHP_EOL);
					fwrite($wpa_file, "}".PHP_EOL);
				} else {
					$pound_psk = getVariableOrDefault($network, '#psk', "");
					if ($pound_psk !== "")
						$passphrase = $pound_psk;
					else
						$passphrase = $network['passphrase'];
					$len = strlen($passphrase);
					if ($len >=8 && $len <= 63) {
						// un-encrypted passphrase - get encrypted version.
						unset($wpa_passphrase);
						unset($line);
						$cmd = 'wpa_passphrase ' . escapeshellarg($ssid);
						$cmd .= ' ' . escapeshellarg($passphrase);
						exec($cmd, $wpa_passphrase );

						// This writes a complete "network={ ... }" block with #psk.
						foreach($wpa_passphrase as $line) {
							fwrite($wpa_file, $line.PHP_EOL);
						}
					} else if ($len == 64) {	// 64 means it's already encrypted
						fwrite($wpa_file, "network={".PHP_EOL);
						fwrite($wpa_file, "\tssid=\"$ssid\"".PHP_EOL);
						if ($pound_psk !== "")
							fwrite($wpa_file, "\t#psk=\"$pound_psk\"".PHP_EOL);
						if ($passphrase !== "")
							fwrite($wpa_file, "\tpsk=\"$passphrase\"".PHP_EOL);
						fwrite($wpa_file, "}".PHP_EOL);
					} else {
						$status->addMessage("WPA passphrase for $ssid must be between 8 and 63 characters (it is $len)", "danger");
						$ok = false;
					}
				}
			}
			fclose($wpa_file);

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
	exec( 'sudo wpa_cli scan_results', $scan_return );
	for( $shift = 0; $shift < 2; $shift++ ) {
		// Skip first two header lines
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
					$networks[$ssid]['channel'] = $channel;
					$networks[$ssid]['times'] = 1;
				} else {
					$have_multiple = true;
					// $networks[$ssid]['channel'] .= "<br>$channel";
					$networks[$ssid]['times']++;
				}
			} else {
				// New SSID
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

<div class="row"> <div class="col-lg-12">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-wifi fa-fw"></i> Configure Wi-Fi</div>
		<!-- /.panel-heading -->
		<div class="panel-body">
			<?php if ($status->isMessage()) echo "<p>" . $status->showMessages() . "</p>"; ?>
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
			if ($num_networks != 0) {
				echo "<tr>";
					echo "<td colspan='6' class='errorMsgBig'>";
						echo "No networks found";
					echo "</td>";
				echo "</tr>";
			} else foreach ($networks as $ssid => $network) {
					$configured = getVariableOrDefault($network, 'configured', false);
					$connected = getVariableOrDefault($network, 'connected', false);
					$visible = getVariableOrDefault($network, 'visible', false);
					$channel = getVariableOrDefault($network, 'channel', "");
					$times = getVariableOrDefault($network, 'times', 1);
					$protocol = getVariableOrDefault($network, 'protocol', "");
					$passphrase = getVariableOrDefault($network, 'passphrase', "");
					$fullPassphrase = $passphrase;

					echo "<tr>";

					echo "\n\t<td>";
					if ($configured)
						echo '<i class="fa fa-check-circle fa-fw" title="configured"></i>';
					if ($connected)
						echo '<i class="fa fa-exchange-alt fa-fw" title="connected"></i>';
					echo "</td>";

					echo "\n\t<td>";
					echo "<input type='hidden' name='ssid$index' value='" . htmlentities($ssid) . "' />";
					echo $ssid;
					echo "</td>";

					echo "\n\t<td>";
					if ($visible) {
						echo $channel;
						if ($times > 1) echo "<br>$note $times times";
					} else {
						echo '<span class="label label-warning" title="SSID not visible">X</span>';
					}
					echo "</td>";

					echo "\n\t<td><input type='hidden' name='protocol$index' value='$protocol' />$protocol</td>";

					if ($protocol === 'Open')
						echo "\n\t<td><input type='hidden' name='passphrase$index' value='' />---</td>";
					else
						echo "\n\t<td><input type='password' class='form-control' style='width: 7em; font-size: 80%; padding-left: 2px; padding-right: 2px;' name='passphrase$index' title='$fullPassphrase' value='$passphrase' onKeyUp='CheckPSK(this, " . '"' . "update$index" . '"' .")'></td>";
					echo "\n\t<td>";
					echo '<div class="btn-group btn-block nowrap">';
					$buttonStyle = "style='padding-left: 3px; padding-right: 3px; width: 4em; pointer-events: auto;'";
					$d = ($protocol === 'Open') ? ' disabled title="Cannot add Open SSIDs" ' : '';
					$d="";		// TODO: Any reason NOT to allow adding Open SSIDs ?
					if ($configured) {
						echo "<input type='submit' class='btn btn-warning' $buttonStyle value='Update' ";
						if ($protocol === 'Open')
							echo "disabled title='Cannot update Open SSIDs' />";
						else
							echo "id='update$index' name='update$index' $d />";
					} else {
						echo "<input type='submit' class='btn btn-info' $buttonStyle value='Add' id='update$index' name='update$index' $d />";
					}
					$d = $configured ? '' : ' disabled title="SSID not configured"';
					echo "<input type='submit' class='btn btn-danger' $buttonStyle value='Delete' name='delete$index' $d />";
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
</div><!-- /.col-lg-12 --> </div><!-- /.row -->
<?php
}
?>
