<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

define('RASPI_DNSMASQ_CONFIG', '/etc/dnsmasq.conf');
define('RASPI_DNSMASQ_LEASES', '/var/lib/misc/dnsmasq.leases');

/**
* Manage DHCP configuration
*/

// Main function
function DisplayDHCPConfig()
{
	global $page;
	global $pageHeaderTitle, $pageIcon;

	$myStatus = new StatusMessages();

	$interface = null;
	$RangeStart = "";
	$RangeEnd = "";
	$RangeLeaseTime = "";
	$hselected = ""; $mselected = ""; $dselected = "";
	$infinite = "Infinite";

	if( isset( $_POST['savedhcpdsettings'] ) ) {
		if (CSRFValidate()) {
			$ok = true;
			$interface = getVariableOrDefault($_POST, 'interface', "");
			if ($interface === "") {
				$myStatus->addMessage('<strong>Interface</strong> not specified', 'danger');
				$ok = false;
			}
			$RangeStart = getVariableOrDefault($_POST, 'RangeStart', "");
			if ($RangeStart === "") {
				$myStatus->addMessage('<strong>Starting IP Address</strong> not specified', 'danger');
				$ok = false;
			}
			$RangeEnd = getVariableOrDefault($_POST, 'RangeEnd', "");
			if ($RangeEnd === "") {
				$myStatus->addMessage('<strong>Ending IP Address</strong> not specified', 'danger');
				$ok = false;
			}
			$RangeLeaseTime = getVariableOrDefault($_POST, 'RangeLeaseTime', "");
			if ($RangeLeaseTime !== "") {
				// $RangeLeaseTime is optional, but if given, the units must also be given.
				$RangeLeaseTimeUnits = getVariableOrDefault($_POST, 'RangeLeaseTimeUnits', "");
				if ($RangeLeaseTimeUnits === "") {
					$myStatus->addMessage('<strong>Interval</strong> not specified', 'danger');
					$ok = false;
				} else if ($RangeLeaseTimeUnits === $infinite) {
					$msg = "Can not specify a <strong>Lease Time</strong> with an ";
					$msg .= "<strong>Interval</strong> of <strong>$infinite</strong>";
					$myStatus->addMessage($msg, 'danger');
					$ok = false;
				}
			}

			if ($ok) {
				$config = "interface=$interface" . PHP_EOL;
				$config .= "dhcp-range=$RangeStart,$RangeEnd,255.255.255.0";
				if ($RangeLeaseTime !== "")
					$config .= ",$RangeLeaseTime$RangeLeaseTimeUnits";
				exec( "echo '$config' > /tmp/dhcpddata",$temp );
				system( 'sudo cp /tmp/dhcpddata '. RASPI_DNSMASQ_CONFIG, $return );

				if( $return == 0 ) {
					$myStatus->addMessage('dnsmasq configuration updated successfully', 'success');
				} else {
					$myStatus->addMessage('dnsmasq configuration failed to be updated', 'danger');
				}
			} else {
				$myStatus->addMessage('No changes made', 'danger');
			}
		} else {
			error_log('CSRF violation');
		}
	}

	exec( 'pidof dnsmasq > /dev/null', $ignored, $return );
	$dnsmasq_state = ($return == 0);

	if( isset( $_POST['startdhcpd'] ) ) {
		if (CSRFValidate()) {
			if ($dnsmasq_state) {
				$myStatus->addMessage('dnsmasq already running', 'info');
			} else {
				exec('sudo /etc/init.d/dnsmasq start 2>&1', $dnsmasq, $return);
				if ($return == 0) {
					$myStatus->addMessage('Successfully started dnsmasq', 'success');
					$dnsmasq_state = true;
				} else {
					$myStatus->addMessage('Failed to start dnsmasq: ' . implode('<br>', $dnsmasq), 'danger');
				}
			}
		} else {
			error_log('CSRF violation');
		}

	} elseif( isset($_POST['stopdhcpd'] ) ) {
		if (CSRFValidate()) {
			if ($dnsmasq_state) {
				exec('sudo /etc/init.d/dnsmasq stop 2>&1', $dnsmasq, $return);
				if ($return == 0) {
					$myStatus->addMessage('Successfully stopped dnsmasq', 'success');
					$dnsmasq_state = false;
				} else {
					$myStatus->addMessage('Failed to stop dnsmasq: ' . implode('<br>', $dnsmasq), 'danger');
				}
			} else {
				$myStatus->addMessage('dnsmasq already stopped', 'info');
			}
		} else {
			error_log('CSRF violation');
		}

	} else if( $dnsmasq_state ) {
		$myStatus->addMessage('dnsmasq is running', 'success');
	} else {
		$myStatus->addMessage('dnsmasq is not running', 'warning');
	}

	exec( 'cat ' . RASPI_DNSMASQ_CONFIG, $return );
	if ($return !== null) {
		if (count($return) == 0) {
			$return = null;
			$myStatus->addMessage(RASPI_DNSMASQ_CONFIG . ' appears empty', 'warning');
		} else {
			$conf = ParseConfig($return);
			$interface = getVariableOrDefault($conf, 'interface', null);
			$range = getVariableOrDefault($conf, 'dhcp-range', null);
			$msg = "";
			if ($interface === null) {
				$msg = RASPI_DNSMASQ_CONFIG . ' has no interface';
			}
			if ($range === null) {
				if ($msg !== "") $msg .= "<br>";
				$msg .= RASPI_DNSMASQ_CONFIG . ' has no dhcp-range';
			}
			if ($msg !== "") {
				$return = null;
				$myStatus->addMessage($msg, 'warning');
			}

			if ($return !== null) {
				// $range:	start_ip, end_ip, mask [, lease]
				// index:	0				 1			 2				3
				// count:	1				 2			 3				4
				$arrRange = explode( ",", $range );
				if (count($arrRange) < 3) {
					$myStatus->addMessage("dhcp-range in '" . RASPI_DNSMASQ_CONFIG . " missing fields: $range", "danger");
				} else {
					$RangeStart = $arrRange[0];
					$RangeEnd = $arrRange[1];
					$RangeMask = $arrRange[2];
					if (count($arrRange) == 4) {
						preg_match( '/([0-9]*)([a-z])/i', $arrRange[3], $arrRangeLeaseTime );
						$RangeLeaseTime = $arrRangeLeaseTime[1];
						switch( $arrRangeLeaseTime[2] ) {
						case "h":
							$hselected = " selected";
							break;
						case "m":
							$mselected = " selected";
							break;
						case "d":
							$dselected = " selected";
							break;
						}
					}
				}
			}
		}
	}
	$interval = "$mselected$hselected$dselected";
?>

<div class="panel panel-success">
	<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
	<div class="panel-body">
		<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>

		<!-- Nav tabs -->
			<ul class="nav nav-tabs">
				<li class="active"><a href="#server-settings" data-toggle="tab">DHCP server settings</a></li>
				<li><a href="#client-list" data-toggle="tab">Client list</a></li>
			</ul>

		<!-- Tab panes -->
		<div class="tab-content">

			<div class="tab-pane fade in active" id="server-settings">
				<form method="POST" action="?page=<?php echo $page ?>">
				<?php CSRFToken() ?>
				<div class="row">
					<div class="form-group col-md-4">
						<label for="code">Interface</label>
						<select class="form-control" name="interface">
							<?php 
							exec("ip -o link show | awk -F': ' '{print $2}'", $interfaces);
							$found = false;
							foreach( $interfaces as $int ) {
								if( $int == $interface ) {
									$select = " selected";
									$found = true;
								} else {
									$select = '';
								}
								echo "<option value='$int' $select>$int</option>";
							}
							if (! $found)
								echo "<option value='' selected>[PICK ONE]</option>";
							?>
						</select>
					</div><!-- ./ form-group col-md-4 -->
				</div><!-- ./ row -->

				<div class="row">
					<div class="form-group col-md-4">
						<label for="code">Starting IP Address</label>
						<input type="text" class="form-control"name="RangeStart" value="<?php echo $RangeStart; ?>" />
					</div>
				</div><!-- ./ row -->

				<div class="row">
					<div class="form-group col-md-4">
						<label for="code">Ending IP Address</label>
						<input type="text" class="form-control" name="RangeEnd" value="<?php echo $RangeEnd; ?>" />
					</div>
				</div><!-- ./ row -->

				<div class="row">
					<div class="form-group col-xs-2 col-sm-2">
						<label for="code">Lease Time &nbsp; (optional)</label>
						<input type="text" class="form-control" name="RangeLeaseTime" value="<?php echo $RangeLeaseTime; ?>" />
					</div>
					<div class="col-xs-2 col-sm-2">
						<label for="code">Interval</label>
						<select name="RangeLeaseTimeUnits" class="form-control" >
							<option value="m" <?php echo $mselected; ?>>Minute(s)</option>
							<option value="h" <?php echo $hselected; ?>>Hour(s)</option>
							<option value="d" <?php echo $dselected; ?>>Day(s)</option>
							<?php
							echo "<option value='$infinite'";
							if ($interval === "") echo " selected";
							echo ">$infinite</option>";
							?>
						</select> 
					</div>
				</div><!-- ./ row -->

				<input type="submit" class="btn btn-primary" value="Save settings" name="savedhcpdsettings" />
				<?php
				if ( $dnsmasq_state )
					echo '<input type="submit" class="btn btn-warning" value="Stop dnsmasq"	name="stopdhcpd" />';
				else
					echo '<input type="submit" class="btn btn-success" value="Start dnsmasq" name="startdhcpd" />';
				?>
				</form>
			</div><!-- /.tab-pane -->

			<div class="tab-pane fade in" id="client-list">
				<div class="col-lg-12">
					<div class="panel panel-default">
						<div class="panel-heading">Active DHCP leases</div>
						<div class="panel-body">
							<div class="table-responsive">
								<table class="table table-hover">
									<thead>
										<tr>
											<th>Expire time</th>
											<th>MAC Address</th>
											<th>IP Address</th>
											<th>Host name</th>
											<th>Client ID</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<?php
											exec( 'cat ' . RASPI_DNSMASQ_LEASES, $leases );
											foreach( $leases as $lease ) {
												$lease_items = explode(' ', $lease);
												foreach( $lease_items as $lease_item ) {
													echo '<td>' . $lease_item . '</td>';
												}
												echo '</tr>';
											};
											?>
										</tr>
									</tbody>
								</table>
							</div><!-- /.table-responsive -->
						</div><!-- /.panel-body -->
					</div><!-- /.panel -->
				</div><!-- /.col-lg-12 -->
			</div><!-- /.tab-pane -->
		</div><!-- /.tab-content -->
	</div><!-- ./ Panel body -->
</div><!-- /.panel-primary -->
<?php
}

function ParseConfig( $arrConfig ) {
	$config = array();
	foreach( $arrConfig as $line ) {
		$line = trim($line);
		if( $line != "" && $line[0] != "#" ) {
			$arrLine = explode( "=", $line );
			$config[$arrLine[0]] = ( count($arrLine) > 1 ? $arrLine[1] : true );
		}
	}
	return $config;
}

?>
