<?php

function DisplayWPAConfig(){
	global $page, $status;
	$debug = false;

	// Find currently configured networks
	$dataFile = RASPI_WPA_SUPPLICANT_CONFIG;
	$cmd = "sudo cat '$dataFile'";
	if ($debug) echo "<br>Executing $cmd";
	exec($cmd, $known_out);

	$thisNetwork = null;
	$ssid = null;

	// Process the already-configured networks.
	$onLine = 0;
	$inNetwork = false;
	$numNetworks = 0;
	foreach($known_out as $line) {
		$onLine++;
		if ($debug) echo "<br>Line $onLine: $line";
		if (preg_match('/network\s*=/', $line)) {
		if ($debug) echo "<br>&nbsp; &nbsp; new network";
			$inNetwork = true;
			$numNetworks++;
			$thisNetwork = array('visible' => false, 'configured' => true, 'connected' => false);
		} elseif ($thisNetwork !== null) {
			if (preg_match('/^\s*}\s*$/', $line)) {		// end of info for this Network
			if ($debug) echo "<br>&nbsp; &nbsp; end of network $ssid";
				$networks[$ssid] = $thisNetwork;
				$thisNetwork = null;
				$ssid = null;
				$inNetwork = false;
			} elseif ($lineArr = preg_split('/\s*=\s*/', trim($line))) {
				// The ssid and #psk keys have double quotes around the values.
				// The psk key does not (at least when it's an encrypted value).
				// The psk key may be a plain-text value or a 64-character encrypted value.

				$key = strtolower($lineArr[0]);
				$value = trim($lineArr[1], '"');
				if ($debug) echo "<br>&nbsp; &nbsp; data line, key=${key}";
				switch($key) {
					case 'ssid':
						$ssid = $value;
						break;
					case 'psk':
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

					default:
						// Except debugging, don't display this since there
						// are likely other keys than the ones above.
//						echo "<br> &nbsp; &nbsp; *** Line $onLine: Unknown key: [$key]";
						break;
				}
			} else {
				// All the lines within a network entry should be   key=value
				$msg = "Line $onLine in $dataFile may be invalid: $line";
				$status->addMessage($msg, "warning");
			}
		} else if ($numNetworks > 0) {
			// The first couple lines in the file may be configuration lines,
			// so ignore.
			// Any other line inbetween network entries is invalid
			// and will likely cause a failure.
			$msg = "Line $onLine in $dataFile is out of place: $line";
			$status->addMessage($msg, "danger");
		}
	}

	if ( isset($_POST['client_settings']) && CSRFValidate() ) {
		$tmp_networks = $networks;
		$tmp_file = "/tmp/wifidata";
		if ($wpa_file = fopen($tmp_file, 'w')) {
			// Re-create whole configuration file - don't try to only update the changed SSID.
			fwrite($wpa_file, 'ctrl_interface=DIR=' . RASPI_WPA_CTRL_INTERFACE);
			fwrite($wpa_file, ' GROUP=netdev' . PHP_EOL);
			fwrite($wpa_file, 'update_config=1' . PHP_EOL);

if ($debug) { echo "<br>POST=<pre>"; print_r($_POST); echo "</pre>"; }

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
if ($debug) { echo "<br>tmp_networks[$s]=<pre>"; print_r($tmp_networks[$s]); echo "</pre>"; }
				}
			}

			$ok = true;
if ($debug) { echo "<br>tmp_networks=<pre>"; print_r($tmp_networks); echo "</pre>"; }
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
						unset($wpa_passphrase_out);
						unset($line);
						$cmd = 'wpa_passphrase '. escapeshellarg($ssid);
						$cmd .= ' ' . escapeshellarg($passphrase);
						exec($cmd, $wpa_passphrase_out, $wpa_passphrase_return);

						if ($wpa_passphrase_return == 0) {
							# This writes a complete "network={ ... }" block with #psk.
							foreach($wpa_passphrase_out as $line) {
								fwrite($wpa_file, $line.PHP_EOL);
							}
						} else {
							$msg = "'$cmd' failed";
							$status->addMessage($msg, 'danger');
							$ok = false;
						}
					} else if ($len == 64) {	// 64 means it's already encrypted
						fwrite($wpa_file, "network={".PHP_EOL);
						fwrite($wpa_file, "\tssid=\"$ssid\"".PHP_EOL);
						if ($pound_psk !== "")
							fwrite($wpa_file, "\t#psk=\"$pound_psk\"".PHP_EOL);
						if ($passphrase !== "")
							fwrite($wpa_file, "\tpsk=$passphrase".PHP_EOL);
						fwrite($wpa_file, "}".PHP_EOL);
					} else {
						$msg = "WPA passphrase for $ssid ($passphrase)";
						$msg = "  is $len characters but must be between 8 and 63.";
						$status->addMessage($msg, "danger");
						$ok = false;
					}
				}
			}
			fclose($wpa_file);

			if ($ok) {
				system( "sudo cp '$tmp_file' '$dataFile'", $returnval );
				if( $returnval == 0 ) {
					exec('sudo wpa_cli reconfigure', $reconfigure_out, $reconfigure_return );
					if ($reconfigure_return == 0) {
						$status->addMessage('Wifi settings updated successfully', 'success');
						$networks = $tmp_networks;
					} else {
						$msg = 'Wifi settings updated but cannot restart';
						$msg .= ' (cannot execute "wpa_cli reconfigure")';
						$status->addMessage($msg, 'danger');
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
	$cmd = 'sudo wpa_cli scan_results';
	exec( $cmd, $scan_return );
if ($debug) { echo "<br><pre>wpa_cli scan_results:<br>"; print_r($scan_return); echo "</pre>"; }
	for( $shift = 0; $shift < 2; $shift++ ) {
		// Skip first two header lines
		array_shift($scan_return);
	}
	// display output
	$have_multiple = false;
	static $note = " <span style='color: red; font-weight: bold'>*</span>";
	// $networks contains the prior-configured SSID(s).
	// New SSIDs are added to $networks.
	if (! isset($networks)) $networks = [];	// eliminates warning messages in log file

	// Walk through each scanned network.
	$numScannedNetworks = 0;
	foreach( $scan_return as $network ) {
		$arrNetwork = preg_split("/[\t]+/",$network);
		// fields:		bssid,   frequency, signal level, flags,    ssid 
		// fields:		         channel                  protocol
		// field #:		0        1          2             3         4
		$ssid = getVariableOrDefault($arrNetwork, 4, null);
		if ($ssid !== null) {
			$numScannedNetworks += 1;
			$channel = ConvertToChannel($arrNetwork[1]);
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
		} else {
			// TODO: Is this ok?
			$status->addMessage("'$cmd' returned line without SSID in field 4: $network", 'warning');
		}
	}
	if ($numScannedNetworks == 0) {
		$status->addMessage("No scanned networks found", 'warning');
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
			<?php if ($status->isMessage()) $status->showMessages(); ?>
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

			<?php
				$index = 0;
				foreach ($networks as $ssid => $network) {
					$configured = toBool(getVariableOrDefault($network, 'configured', "false"));
					$connected = toBool(getVariableOrDefault($network, 'connected', "false"));
					$visible = toBool(getVariableOrDefault($network, 'visible', "false"));
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
						if ($protocol === 'TODO: why not?   Open')
							echo "disabled title='Cannot update Open SSIDs' />";
						else
							echo "id='update$index' name='update$index' $d />";
					} else {
						echo "<input type='submit' class='btn btn-info' $buttonStyle value='Add' id='update$index' name='update$index' $d />";
					}
					if ($configured)
						echo "<input type='submit' class='btn btn-danger' $buttonStyle value='Delete' name='delete$index'/>";
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
