<?php
/**
 *
 * Find the version of the Raspberry Pi
 * Currently only used for the system information page but may useful elsewhere
 *
 */

function RPiVersion()
{
	// Lookup table from https://www.raspberrypi.org/documentation/hardware/raspberrypi/revision-codes/README.md
	// Last updated december 2020
	$revisions = array(
	'0002' => 'Model B Revision 1.0',
	'0003' => 'Model B Revision 1.0 + ECN0001',
	'0004' => 'Model B Revision 2.0 (256 MB)',
	'0005' => 'Model B Revision 2.0 (256 MB)',
	'0006' => 'Model B Revision 2.0 (256 MB)',
	'0007' => 'Model A',
	'0008' => 'Model A',
	'0009' => 'Model A',
	'000d' => 'Model B Revision 2.0 (512 MB)',
	'000e' => 'Model B Revision 2.0 (512 MB)',
	'000f' => 'Model B Revision 2.0 (512 MB)',
	'0010' => 'Model B+',
	'0013' => 'Model B+',
	'0011' => 'Compute Module',
	'0012' => 'Model A+',
	'a01040' => 'Pi 2 Model B Revision 1.0 (1 GB)',
	'a01041' => 'Pi 2 Model B Revision 1.1 (1 GB)',
	'a02042' => 'Pi 2 Model B (with BCM2837) Revision 1.2 (1 GB)',
	'a21041' => 'Pi 2 Model B Revision 1.1 (1 GB)',
	'a22042' => 'Pi 2 Model B (with BCM2837) Revision 1.2 (1 GB)',
	'a020a0' => 'Compute Module 3 Revision 1.0 (1 GB)',
	'a220a0' => 'Compute Module 3 Revision 1.0 (1 GB)',
	'a02100' => 'Compute Module 3+',
	'900021' => 'Model A+ Revision 1.1 (512 MB)',
	'900032' => 'Model B+ Revision 1.2 (512 MB)',
	'900062' => 'Compute Module Revision 1.1 (512 MB)',
	'900092' => 'PiZero 1.2 (512 MB)',
	'900093' => 'PiZero 1.3 (512 MB)',
	'9000c1' => 'PiZero W 1.1 (512 MB)',
	'920092' => 'PiZero Revision 1.2 (512 MB)',
	'920093' => 'PiZero Revision 1.3 (512 MB)',
	'9020e0' => 'Pi 3 Model A+ Revision 1.0 (512 MB)',
	'a02082' => 'Pi 3 Model B Revision 1.2 (1 GB)',
	'a22082' => 'Pi 3 Model B Revision 1.2 (1 GB)',
	'a32082' => 'Pi 3 Model B Revision 1.2 (1 GB)',
	'a52082' => 'Pi 3 Model B Revision 1.2 (1 GB)',
	'a22083' => 'Pi 3 Model B Revision 1.3 (1 GB)',
	'a020d3' => 'Pi 3 Model B+ Revision 1.3 (1 GB)',
	'a03111' => 'Model 4B Revision 1.1 (1 GB)',
	'b03111' => 'Model 4B Revision 1.1 (2 GB)',
	'c03111' => 'Model 4B Revision 1.1 (4 GB)',
	'b03112' => 'Model 4B Revision 1.2 (2 GB)',
	'c03112' => 'Model 4B Revision 1.2 (4 GB)',
	'b03114' => 'Model 4B Revision 1.4 (2 GB)',
	'c03114' => 'Model 4B Revision 1.4 (4 GB)',
	'd03114' => 'Model 4B Revision 1.4 (8 GB)',
	'c03130' => 'Pi 400 Revision 1.0 (4 GB)'
	);

	$cpuinfo_array = '';
	exec('grep "^Revision" /proc/cpuinfo', $cpuinfo_array);
	// We need to split this into two pieces to avoid a PHP Notice message
	$x = explode(':', array_pop($cpuinfo_array));
	$rev = trim(array_pop($x));
	if (array_key_exists($rev, $revisions)) {
		return $revisions[$rev];
	} else {
		exec('cat /proc/device-tree/model', $model);
		if (isset($model[0])) {
			return $model[0];
		} else {
			return 'Unknown Pi, rev=' . $rev;
		}
	}
}

function formatSize($bytes)
{
	$types = array('B', 'KB', 'MB', 'GB', 'TB');
	for ($i = 0; $bytes >= 1024 && $i < (count($types) - 1); $bytes /= 1024, $i++) ;
	return (round($bytes, 2) . " " . $types[$i]);
}

/* Check if the data in $file has expired, using the last modified time of the file.
 * Assume all data in the file was generated at the same time.
 * Return true if expired, else false.
*/
$now = 0;
function dataExpired($file, $seconds)
{
	global $now;
	$seconds += 0;	// convert to number
	if ($seconds === 0) return(false);

	if ($now === 0)		// only get once per invocation
		$now = strtotime("now") + 0;
	$expire = filemtime($file) + $seconds;
	if ($expire < $now)
		return(true);
	else
		return(false);
}

/* Check for correct number of fields and display error message if not correct. */
function checkNumFields($num_required, $num_have, $type, $line_num, $line, $file)
{
	if ($num_required !== $num_have) {
		echo "<p style='color: red; border: 1px solid red;'>WARNING: Line $line_num in data file '$file' is invalid:";
		echo "<br>&nbsp; &nbsp; $line";
		echo "<br>'$type' lines should have $num_required fields total but there were $num_have fields.";
		if ($num_have < $num_required) {
			if ($num_have === 2)
				// checkNumFields() is only called once we know the first field ($type),
				// so we know there is at least one TAB on the line.
				// If there are only 2 fields, that means everthing after $type is missing a tab.
				echo "<br>There are NO tabs on the line after '$type' - all fields must be TAB-separated.";
			else
				echo "<br>Make sure all fields are TAB-separated.";
		} else {
			echo "<br>There are too many fields on the line.";
		}
		echo "</p>";
		return(false);
	}
	return(true);
}

/* Display a "progress" bar. */
function displayProgress($x, $label, $data, $min, $current, $max, $danger, $warning, $status_override)
{
	if ($status_override !== "") {
		$status = $status_override;
	} else if ($current >= $danger) {
		$status = "danger";
	} elseif ($current >= $warning) {
		$status = "warning";
	} else {
		$status = "success";
	}
	echo "<tr><td colspan='2' style='height: 5px'></td></tr>\n";
	echo "<tr><td $x>$label</td>\n";
	echo "    <td style='width: 100%' class='progress'><div class='progress-bar progress-bar-$status'\n";
	echo "    role='progressbar'\n";

	echo "    title='current: $current, min: $min, max: $max'";
	if ($current < $min) $current = $min;
	else if ($current > $max) $current = $max;
   	echo "    aria-valuenow='$current' aria-valuemin='$min' aria-valuemax='$max'\n";

	// The width of the bar should be the percent that $current is in the
	// range of ($max-$min).
	// In the typical case where $max=100 and $min=0, if $current is 21,
	// then width=(21/(100-0)*100) = 21.
	// If $max=50, $min=0, and $current=21, then width=(21/(50-0))*100 = 42.
	$width = (($current - $min) / ($max - $min)) * 100;
	echo "    style='width: $width%;'>$data\n";
	echo "    </div></td></tr>\n";
}

/* Display user data in "file". */
$num_buttons = 0;
$num_calls = 0;
function displayUserData($file, $displayType)
{
	global $num_buttons;
	global $num_calls;

	$num_calls++;

	if (! file_exists($file)) {
		if ($num_calls === 1)
			echo "<p style='color: red'>WARNING: data file '$file' does not exist.</p>";
		return(false);
	}
	$handle = fopen($file, "r");
	for ($i=1; ; $i++) {		// for each line in $file
		$line = fgets($handle);
		if (! $line)
			break;
		$line = trim($line);
		// Skip blank and comment lines
		if ($line === "" || substr($line, 0, 1) === "#") continue;

		$data = explode('	', $line);		// tab-separated
		$num = count($data);
		if ($num === 0) {
			return(false);
		}
		$type = $data[0];
		if ($type !== "data" && $type !== "progress" && $type !== "button") {
			if ($num_calls === 1) {
				echo "<p style='color: red; border: 1px solid red;'>WARNING: Line $i in '$file' is invalid:";
				echo "<br>&nbsp; &nbsp; $line";
				echo "<br>The first field should be 'data', 'progress', or 'button'.";
				if (! strstr($type, " "))
					echo "<br><br>Make sure the fields are TAB-separated.";
				else
					echo "<br><br>The fields don't appear to be TAB-separated.";
				echo "</p>";
			}
		} else if ($type === "data" && $displayType === $type) {
			if (checkNumFields(4, $num, $type, $i, $line, $file)) {
				list($type, $timeout_s, $label, $data) = $data;
				if (dataExpired($file, $timeout_s))
					echo "<tr class='x' style='color: red; font-weight: bold;'><td>$label (EXPIRED)</td><td>$data</td></tr>\n";
				else
					echo "<tr class='x'><td>$label</td><td>$data</td></tr>\n";
			}
		} else if ($type === "progress" && $displayType === $type) {
			if (checkNumFields(9, $num, $type, $i, $line, $file)) {
				list($type, $timeout_s, $label, $data, $min, $current, $max, $danger, $warning) = $data;
				if (dataExpired($file, $timeout_s)) {
					$label = $label . " (EXPIRED)";
					$x = "style='color: red; font-weight: bold;'";
				} else {
					$x = "";
				}
				displayProgress($x, $label, $data, $min, $current, $max, $danger, $warning, "");
			}
		} else if ($type === "button" && substr($displayType, 0, 7) === "button-") {
			if (checkNumFields(6, $num, $type, $i, $line, $file)) {
				list($type, $message, $action, $btn_color, $fa_icon, $btn_label) = $data;
				// timeout_s doesn't apply to buttons
				// We output two types of button data: the action block and the button block.
				$num_buttons++;
				if ($displayType === "button-action") {
					$u = "user_$num_buttons";
					if (isset($_POST[$u]))
						runCommand($action, $message, "success");
				} else {	// "button-button"
					if ($fa_icon !== "-") $fa_icon = "<i class='fa fa-$fa_icon'></i>";
					echo "<button type='submit' class='btn btn-$btn_color' name='user_$num_buttons'/>$fa_icon $btn_label</button>\n";
				}
			}
		}
	}
	fclose($handle);
	$num_buttons = 0;
	return(true);
}

/**
 *
 *
 */
function DisplaySystem()
{
	global $status;
	$status = new StatusMessages();

	$top_dir = dirname(ALLSKY_WEBSITE, 1);
	$camera_settings_str = file_get_contents(RASPI_CAMERA_SETTINGS, true);
	$camera_settings_array = json_decode($camera_settings_str, true);
	if (isset($camera_settings_array['temptype'])) {
		$temp_type = $camera_settings_array['temptype'];
		if ($temp_type == "") $temp_type = "C";
	} else {
		$temp_type = "C";
	}

	// hostname
	exec("hostname -f", $hostarray);
	$hostname = $hostarray[0];

	// uptime
	$uparray = explode(" ", exec("cat /proc/uptime"));
	$seconds = round($uparray[0], 0);
	$minutes = $seconds / 60;
	$hours = $minutes / 60;
	$days = floor($hours / 24);
	$hours = floor($hours - ($days * 24));
	$minutes = floor($minutes - ($days * 24 * 60) - ($hours * 60));
	$uptime = '';
	if ($days != 0) {
		$uptime .= $days . ' day' . (($days > 1) ? 's ' : ' ');
	}
	if ($hours != 0) {
		$uptime .= $hours . ' hour' . (($hours > 1) ? 's ' : ' ');
	}
	if ($minutes != 0) {
		$uptime .= $minutes . ' minute' . (($minutes > 1) ? 's ' : ' ');
	}

	// mem used
	exec("free -m | awk '/Mem:/ { total=$2 } /buffers\/cache/ { used=$3 } END { print used/total*100}'", $memarray);
	$memused = floor($memarray[0]);
	// check for memused being unreasonably low, if so repeat expecting modern output of "free" command
	if ($memused < 0.1) {
		unset($memarray);
		exec("free -m | awk '/Mem:/ { total=$2 } /Mem:/ { used=$3 } END { print used/total*100}'", $memarray);
		$memused = floor($memarray[0]);
	}


	// Disk usage
	// File Usage
	/* get disk space free (in bytes) */
	$df = @disk_free_space($top_dir);
	if ($df === false) {
		$dp = -1;	// signals an error
	} else {
		/* and get disk space total (in bytes)  */
		$dt = disk_total_space($top_dir);
		/* now we calculate the disk space used (in bytes) */
		$du = $dt - $df;
		/* percentage of disk used - this will be used to also set the width % of the progress bar */
		$dp = sprintf('%d', ($du / $dt) * 100);

		/* and we format the size from bytes to MB, GB, etc. */
		$df = formatSize($df);
		$du = formatSize($du);
		$dt = formatSize($dt);
	}

	// Throttle / undervoltage status
	$x = exec("sudo vcgencmd get_throttled 2>&1");	// Output: throttled=0x12345...
	if (preg_match("/^throttled=/", $x) == false) {
			$throttle_status = "danger";
			$throttle = "Not able to get throttle status:<br>$x";
			$throttle .= "<br><span style='font-size: 150%'>Run 'sudo ~/allsky/gui/install.sh --update' to try and resolve.</style>";
	} else {
		$x = explode("x", $x);	// Output: throttled=0x12345...
//FOR TESTING: $x[1] = "50001";
		if ($x[1] == "0") {
				$throttle_status = "success";
				$throttle = "No throttling";
		} else {
			$bits = base_convert($x[1], 16, 2);	// convert hex to bits
			// See https://www.raspberrypi.com/documentation/computers/os.html#vcgencmd
			$messages = array(
				0 => 'Currently under-voltage',
				1 => 'ARM frequency currently capped',
				2 => 'Currently throttled',
				3 => 'Soft temperature limit currently active',

				16 => 'Under-voltage has occurred since last reboot.',
				17 => 'Throttling has occurred since last reboot.',
				18 => 'ARM frequency capped has occurred since last reboot.',
				19 => 'Soft temperature limit has occurred'
			);
			$l = strlen($bits);
			$throttle_status = "warning";
			$throttle = "";
			// bit 0 is the rightmost bit
			for ($pos=0; $pos<$l; $pos++) {
				$i = $l - $pos - 1;
				$bit = $bits[$i];
				if ($bit == 0) continue;
				if (array_key_exists($pos, $messages)) {
					if ($throttle == "") {
						$throttle = $messages[$pos];
					} else {
						$throttle .= "<br>" . $messages[$pos];
					}
					// current issues are a danger; prior issues are a warning
					if ($pos <= 3) $throttle_status = "danger";
				}
			}
		}
	}

	// cpu load
	$secs = 2; $q = '"';
	$cpuload = exec("(grep -m 1 'cpu ' /proc/stat; sleep $secs; grep -m 1 'cpu ' /proc/stat) | awk '{u=$2+$4; t=$2+$4+$5; if (NR==1){u1=u; t1=t;} else printf($q%.0f$q, (($2+$4-u1) * 100 / (t-t1))); }'");
	if ($cpuload < 0 || $cpuload > 100) echo "<p style='color: red; font-size: 125%;'>Invalid cpuload value: $cpuload</p>";

	// temperature
	$temperature = round(exec("awk '{print $1/1000}' /sys/class/thermal/thermal_zone0/temp"), 2);
	// additional checks for temperature
	if ($temperature < 0) {
		$temperature_status = "danger";
	} elseif ($temperature < 10) {
		$temperature_status = "warning";
	} else {
		$temperature_status = "";
	}
	$display_temperature = "";
	if ($temp_type == "C" || $temp_type == "B")
		$display_temperature = number_format($temperature, 1, '.', '') . "&deg;C";
	if ($temp_type == "F" || $temp_type == "B")
		$display_temperature = $display_temperature . "&nbsp; &nbsp;" . number_format((($temperature * 1.8) + 32), 1, '.', '') . "&deg;F";

	// Optional user-specified data.
	// TODO: read each file once and populate arrays for "data", "progress", and "button".
	$udf = get_variable(ALLSKY_CONFIG .'/config.sh', 'WEBUI_DATA_FILES=', '');
	if ($udf !== "") {
		$user_data_files = explode(':', $udf);
		$user_data_files_count = count($user_data_files);
	} else {
		$user_data_files = "";
		$user_data_files_count = 0;
	}
	?>
	<div class="row">
		<div class="col-lg-12">
			<div class="panel panel-primary">
				<div class="panel-heading"><i class="fa fa-cube fa-fw"></i> System</div>
				<div class="panel-body">

					<?php
					if (isset($_POST['system_reboot'])) {
						$status->addMessage("System Rebooting Now!", "warning", true);
						$result = shell_exec("sudo /sbin/reboot");
					}
					if (isset($_POST['system_shutdown'])) {
						$status->addMessage("System Shutting Down Now!", "warning", true);
						$result = shell_exec("sudo /sbin/shutdown -h now");
					}
					if (isset($_POST['service_start'])) {
						runCommand("sudo /bin/systemctl start allsky", "allsky service started", "success");
					}
					if (isset($_POST['service_stop'])) {
						runCommand("sudo /bin/systemctl stop allsky", "allsky service stopped", "success");
					}
					// Optional user-specified data.
					for ($i=0; $i < $user_data_files_count; $i++) {
						displayUserData($user_data_files[$i], "button-action");
					}
					?>
					<p><?php $status->showMessages(); ?></p>

					<div class="row">
						<div xxxclass="col-md-6">
							<div class="panel panel-default">
								<div class="panel-body">
									<h4>System Information</h4>
									<table>
									<!-- <colgroup> doesn't seem to support "width", so set on 1st line -->
									<tr class="x"><td style="padding-right: 90px;">Hostname</td><td><?php echo $hostname ?></td></tr>
									<tr class="x"><td>Pi Revision</td><td><?php echo RPiVersion() ?></td></tr>
									<tr class="x"><td>Uptime</td><td><?php echo $uptime ?></td></tr>
									<?php if ($dp === -1) $x = "<span class='errorMsg'>ERROR: unable to read '$top_dir' to get data.</span>";
										  else $x = "$dt ($df free)";
									?>
									<tr class="x"><td>SD Card</td><td><?php echo "$x" ?></td></tr>
									<?php // Optional user-specified data.
										for ($i=0; $i < $user_data_files_count; $i++) {
											displayUserData($user_data_files[$i], "data");
										}
									?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<!-- Treat Throttle Status like a full-width progress bar -->
									<?php displayProgress("", "Throttle Status", $throttle, 0, 100, 100, -1, -1, $throttle_status); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "Memory Used", "$memused%", 0, $memused, 100, 90, 75, ""); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "CPU Load", "$cpuload%", 0, $cpuload, 100, 90, 75, ""); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "CPU Temperature", $display_temperature, 0, $temperature, 100, 70, 60, $temperature_status); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php 
										if ($dp === -1) {
											echo "<tr><td>Disk Usage</td><td><span class='errorMsg'>ERROR: unable to read '$top_dir' to get disk usage.</span></td></tr>";
										} else {
											displayProgress("", "Disk Usage", "$dp%", 0, $dp, 100, 90, 70, "");
											// Optional user-specified data.
											for ($i=0; $i < $user_data_files_count; $i++) {
												displayUserData($user_data_files[$i], "progress");
											}
										}
									?>
									</table>
								</div><!-- /.panel-body -->
							</div><!-- /.panel-default -->
						</div><!-- /.col-md-6 -->
					</div><!-- /.row -->

					<form action="?page=system_info" method="POST">
					<div style="margin-bottom: 15px">
						<button type="button" class="btn btn-primary" onclick="document.location.reload(true)"><i class="fa fa-sync-alt"></i> Refresh</button>
					</div>
					<div style="margin-bottom: 15px">
						<button type="submit" class="btn btn-success" name="service_start"/><i class="fa fa-play"></i> Start allsky</button>
						<button type="submit" class="btn btn-danger" name="service_stop"/><i class="fa fa-stop"></i> Stop allsky</button>
					</div>
					<div style="margin-bottom: 15px">
						<button type="submit" class="btn btn-warning" name="system_reboot"/><i class="fa fa-power-off"></i> Reboot Raspberry Pi</button>
						<button type="submit" class="btn btn-warning" name="system_shutdown"/><i class="fa fa-plug"></i> Shutdown Raspberry Pi</button>
					</div>
					<?php // Optional user-specified data.
						for ($i=0; $i < $user_data_files_count; $i++) {
							displayUserData($user_data_files[$i], "button-button");
						}
					?>
					</form>

				</div><!-- /.panel-body -->
			</div><!-- /.panel-primary -->
		</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
	<?php
}
?>
