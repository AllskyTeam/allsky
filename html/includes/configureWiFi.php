<?php

/**
*
*
*/
function DisplayWPAConfig(){
	$status = new StatusMessages();

	// Find currently configured networks
	exec(' sudo cat ' . RASPI_WPA_SUPPLICANT_CONFIG, $known_return);

	$network = null;
	$ssid = null;

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
					fwrite($wpa_file, "\tssid=\"".$ssid."\"".PHP_EOL);
					fwrite($wpa_file, "\tkey_mgmt=NONE".PHP_EOL);
					fwrite($wpa_file, "}".PHP_EOL);
				} else {
					if (strlen($network['passphrase']) >=8 && strlen($network['passphrase']) <= 63) {
						unset($wpa_passphrase);
						unset($line);
						exec( 'wpa_passphrase '.escapeshellarg($ssid). ' ' . escapeshellarg($network['passphrase']),$wpa_passphrase );
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
						$status->addMessage('Wifi settings updated but cannot restart (cannon execute "wpa_cli reconfigure")', 'danger');
					}
				} else {
					$status->addMessage('Wifi settings failed to be updated', 'danger');
				}
			}
		} else {
			$status->addMessage('Failed to updated wifi settings', 'danger');
		}
	}

	exec( 'sudo wpa_cli scan' );
	sleep(3);
	exec( 'sudo wpa_cli scan_results',$scan_return );
//echo "<br>scan_return before=<pre>"; echo print_r($scan_return) . "</pre>";
	for( $shift = 0; $shift < 2; $shift++ ) {
		array_shift($scan_return);
	}
	// display output
	$have_multiple = false;
	$note = " <span style='color: red; font-weight: bold'>*</span>";
	$num_networks = 0;
	if (! isset($networks)) $networks = [];	// eliminates warning messages in log file
	foreach( $scan_return as $network ) {
		$arrNetwork = preg_split("/[\t]+/",$network);
		// fields: bssid,   frequency, signal level, flags,    ssid 
		// fields:          channel                  protocol  ssid
		// fields: 0        1          2             3         4
		if (isset($arrNetwork[4])) {
			$ssid = $arrNetwork[4];
			if (substr($ssid, 0, 4) == "\\x00") $ssid = "Unknown (\\x00)";
			if (array_key_exists($ssid, $networks)) {
				$is_new = false;
				$networks[$ssid]['visible'] = true;
				// Some SSIDs may be on multiple channels in multiple bands
				if (! isset($networks[$ssid]['channel'])) {
					$networks[$ssid]['channel'] = ConvertToChannel($arrNetwork[1]);
				} else {
					$have_multiple = true;
					$networks[$ssid]['channel'] = $networks[$ssid]['channel'] . $note;
				}
				// TODO What if the security has changed?
			} else {
				$num_networks += 1;
				$networks[$ssid] = array(
					'configured' => false,
					'protocol' => ConvertToSecurity($arrNetwork[3]),
					'channel' => ConvertToChannel($arrNetwork[1]),
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

			<form method="POST" action="?page=wpa_conf" name="wpa_conf_form">
			<?php CSRFToken() ?>
			<input type="hidden" name="client_settings" ?>
			<table class="table table-responsive table-striped">
				<tr>
				<th></th>
				<th>SSID</th>
				<th>Channel&nbsp;/&nbsp;Band</th>
				<th>Security</th>
				<th>Passphrase</th>
				<th></th>
				</tr>
			<?php $index = 0; ?>
			<?php if ($num_networks > 0) { foreach ($networks as $ssid => $network) { ?>
				<tr>
				<td>
					<?php if ($network['configured']) { ?>
					<i class="fa fa-check-circle fa-fw" title="configured"></i>
					<?php } ?>
					<?php if ($network['connected']) { ?>
					<i class="fa fa-exchange-alt fa-fw" title="connected"></i>
					<?php } ?>
				</td>
				<td>
					<input type="hidden" name="ssid<?php echo $index ?>" value="<?php echo htmlentities($ssid) ?>" />
					<?php echo $ssid ?>
				</td>
				<td>
				<?php if ($network['visible']) { ?>
				<?php echo $network['channel'] ?>
				<?php } else { ?>
				<span class="label label-warning">X</span>
				<?php } ?>
				</td>
				<td><input type="hidden" name="protocol<?php echo $index ?>" value="<?php echo $network['protocol'] ?>" /><?php echo $network['protocol'] ?></td>
				<?php if ($network['protocol'] === 'Open') { ?>
				<td><input type="hidden" name="passphrase<?php echo $index ?>" value="" />---</td>
				<?php } else { ?>
				<td><input type="password" class="form-control" name="passphrase<?php echo $index ?>" value="<?php echo $network['passphrase'] ?>" onKeyUp="CheckPSK(this, 'update<?php echo $index?>')" />
				<?php } ?>
				<td>
					<div class="btn-group btn-block">
					<?php if ($network['configured']) { ?>
					<input type="submit" class="btn btn-warning" value="Update" id="update<?php echo $index ?>" name="update<?php echo $index ?>"<?php echo ($network['protocol'] === 'Open' ? ' disabled' : '')?> />
					<?php } else { ?>
					<input type="submit" class="btn btn-info" value="Add" id="update<?php echo $index ?>" name="update<?php echo $index ?>" <?php echo ($network['protocol'] === 'Open' ? '' : ' disabled')?> />
					<?php } ?>
					<input type="submit" class="btn btn-danger" value="Delete" name="delete<?php echo $index ?>"<?php echo ($network['configured'] ? '' : ' disabled')?> />
					</div>
				</td>
				</tr>
				<?php $index += 1; ?>
			<?php } } else { echo "<p style='font-size: 150%; color: red;'>No networks found</p>"; } ?>
			</table>
			</form>
		</div><!-- ./ Panel body -->
		<div class="panel-footer">
			<?php if ($have_multiple)
			echo "$note SSID is in multiple channels and/or bands; only the first is listed above.";
			echo "<br>";
			?>
			<strong>Note,</strong> WEP access points appear as 'Open'. The Allsky portal does not currently support connecting to WEP.
		</div>
		</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
<?php
}
?>
