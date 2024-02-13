<?php
/**
 *
 * Find the version of the Raspberry Pi
 * Currently only used for the system information page but may useful elsewhere
 *
 */

function RPiVersion()
{
	exec('cat /proc/device-tree/model', $model);
	$RPI = getVariableOrDefault($model, 0, null);
	if ($RPI !== null) {
		exec('sudo vcgencmd get_config total_mem | cut -d= -f2', $mem);		// in KB
		$mem = getVariableOrDefault($mem, 0, null);
		if ($mem !== null) {
			$mem = formatSize($mem * 1024 * 1024);
			$RPI = "$RPI ($mem)";
		}
		return($RPI);
	}

	// Lookup table from https://www.raspberrypi.org/documentation/hardware/raspberrypi/revision-codes/README.md
	// Last updated December 2023 with Pi 5
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
	'c03130' => 'Pi 400 Revision 1.0 (4 GB)',
	'c04170' => 'Raspberry Pi 5 Model B Rev 1.0 (4 GB)',
	'd04170' => 'Raspberry Pi 5 Model B Rev 1.0 (8 GB)'
	);

	$cpuinfo_array = '';
	exec('grep "^Revision" /proc/cpuinfo', $cpuinfo_array);
	// We need to split this into two pieces to avoid a PHP Notice message
	$x = explode(':', array_pop($cpuinfo_array));
	$rev = trim(array_pop($x));
	if (array_key_exists($rev, $revisions)) {
		return $revisions[$rev];
	} else {
		return 'Unknown Pi, rev=' . $rev;
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
		echo "<p class='errorMsg errorMsgBox'>WARNING: Line $line_num in data file '<strong>$file</strong>' is invalid:";
		echo "<br>&nbsp; &nbsp; <code>$line</code>";
		echo "<br><br><span class='systemPageAdditionsLineType'>$type</span>";
		echo " lines should have $num_required fields total but there were only $num_have fields.";
		if ($num_have < $num_required) {
			if ($num_have === 2) {
				// checkNumFields() is only called once we know the first field ($type),
				// so we know there is at least one TAB on the line.
				// If there are only 2 fields, that means everthing after $type is missing a tab.
				echo "<br>There are NO tabs on the line after";
				echo " <span class='systemPageAdditionsLineType>$type</span>";
				echo " - all fields must be TAB-separated.";
			} else {
				echo "<br>Make sure all fields are TAB-separated.";
			}
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
		$myStatus = $status_override;
	} else if ($current >= $danger) {
		$myStatus = "danger";
	} elseif ($current >= $warning) {
		$myStatus = "warning";
	} else {
		$myStatus = "success";
	}
	echo "<tr><td colspan='2' style='height: 5px'></td></tr>\n";
	echo "<tr><td $x>$label</td>\n";
	echo "    <td style='width: 100%' class='progress'><div class='progress-bar progress-bar-$myStatus'\n";
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
			$eMsg = "<p class='errorMsg'>WARNING: data file '<strong>$file</strong>' does not exist.</p>";
		else
			$eMsg = "";
		return($eMsg);
	}

	$eMsg = "";		// returned error message, if any
	$handle = fopen($file, "r");
	for ($i=1; ; $i++) {		// for each line in $file
		$line = fgets($handle);
		if (! $line)
			break;				// EOF

		// Skip blank and comment lines
		$line = trim($line);
		if ($line === "" || $line === "\n" || substr($line, 0, 1) === "#") continue;

		// Allow fields to be separated by multiple tabs to make them easier to read,
		// so replace all multiple tabs with one tab.
		$tab = "	";	// contains a tab
		$line = preg_replace("/[\t][\t]+/", $tab, $line);
		$data = explode($tab, $line);
		$num = count($data);
		if ($num === 0) {
			$eMsg = "<p class='errorMsg errorMsgBox'>WARNING: Line $i in '<strong>$file</strong>' contains only tab(s)!";
			return($eMsg);
		}

		$type = $data[0];
		if ($type !== "data" && $type !== "progress" && $type !== "button") {
			if ($num_calls === 1) {
				$eMsg .= "<p class='errorMsg errorMsgBox'>WARNING: Line $i in '<strong>$file</strong>' is invalid:";
				$eMsg .= "<br>&nbsp; &nbsp; <code>$line</code>";
				$eMsg .= "<br><br>";
				if (strstr($line, $tab) === false) {
					$eMsg .= "The fields are not TAB-separated.";
				} else {
					$eMsg .= "The first field is <span class='systemPageAdditionsLineType'>$type</span>";
					$eMsg .= " but should be <span class='systemPageAdditionsLineType'>data</span>,";
					$eMsg .= " <span class='systemPageAdditionsLineType'>progress</span>,";
					$eMsg .= " or <span class='systemPageAdditionsLineType'>button</span>.";
				}
				$eMsg .= "</p>";
			}
		} else if ($type === "data" && $displayType === $type) {
			if (checkNumFields(4, $num, $type, $i, $line, $file)) {
				list($type, $timeout_s, $label, $data) = $data;
				if (dataExpired($file, $timeout_s))
					echo "<tr class='x EXPIRED'><td>$label (EXPIRED)</td><td>$data</td></tr>\n";
				else
					echo "<tr class='x'><td>$label</td><td>$data</td></tr>\n";
			}
		} else if ($type === "progress" && $displayType === $type) {
			if (checkNumFields(9, $num, $type, $i, $line, $file)) {
				list($type, $timeout_s, $label, $data, $min, $current, $max, $danger, $warning) = $data;
				if (dataExpired($file, $timeout_s)) {
					$label = $label . " (EXPIRED)";
					$x = "class='EXPIRED'";
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
// TODO: does runCommand need to be run as ALLSKY_OWNER ?
					if (isset($_POST[$u])) {
						echo "<script>console.log('Running $action');</script>\n";
						runCommand($action, $message, "success");
					}
				} else {	// "button-button"
					if ($fa_icon !== "-") $fa_icon = "<i class='fa fa-$fa_icon'></i>";
					echo "<button type='submit' class='btn btn-$btn_color' name='user_$num_buttons'/>$fa_icon $btn_label</button>\n";
				}
			}
		}
	}
	fclose($handle);
	$num_buttons = 0;
	return($eMsg);
}

/**
 *
 *
 */
function DisplaySystem()
{
	global $temptype, $page, $settings_array;
	$myStatus = new StatusMessages();

	$top_dir = dirname(ALLSKY_WEBSITE, 1);

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
			$throttle .= "<br><span style='font-size: 150%'>Run '~/allsky/install.sh --update' to try and resolve.</style>";
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
	if ($cpuload < 0 || $cpuload > 100) echo "<p class='errorMsgBig'>Invalid cpuload value: $cpuload</p>";

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
	if ($temptype == "C" || $temptype == "B")
		$display_temperature = number_format($temperature, 1, '.', '') . "&deg;C";
	if ($temptype == "F" || $temptype == "B")
		$display_temperature = $display_temperature . "&nbsp; &nbsp;" . number_format((($temperature * 1.8) + 32), 1, '.', '') . "&deg;F";

	// Optional user-specified data.
	// TODO: read each file once and populate arrays for "data", "progress", and "button".
	$udf = getVariableOrDefault($settings_array, 'webuidatafiles', '');
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
						$myStatus->addMessage("System Rebooting Now!", "warning", true);
						$result = shell_exec("sudo /sbin/reboot");
					}
					if (isset($_POST['system_shutdown'])) {
						$myStatus->addMessage("System Shutting Down Now!", "warning", true);
						$result = shell_exec("sudo /sbin/shutdown -h now");
					}
					if (isset($_POST['service_start'])) {
						runCommand("sudo /bin/systemctl start allsky", "Allsky started", "success");
					}
					if (isset($_POST['service_stop'])) {
						runCommand("sudo /bin/systemctl stop allsky", "Allsky stopped", "success");
					}

					$e = "";
					// Execute optional user-specified button actions.
					// This needs to be done here in case the command(s) return a status message
					// which is displayed below.
					for ($i=0; $i < $user_data_files_count; $i++) {
						$e .= displayUserData($user_data_files[$i], "button-action");
					}

					if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>";
					?>

					<div class="row">
						<div class="panel panel-default">
							<div class="panel-body">
								<h4>System Information</h4>
								<?php if ($e !== "") echo "$e"; // display any error msg ?>

								<table>
								<!-- <colgroup> doesn't seem to support "width", so set on 1st line -->
								<tr><td style="padding-right: 90px;">Hostname</td><td><?php echo $hostname ?></td></tr>
								<tr><td>Pi Revision</td><td><?php echo RPiVersion() ?></td></tr>
								<tr><td>Uptime</td><td><?php echo $uptime ?></td></tr>
								<?php if ($dp === -1) $x = "<span class='errorMsg'>ERROR: unable to read '$top_dir' to get data.</span>";
									  else $x = "$dt ($df free)";
								?>
								<tr ><td>SD Card</td><td><?php echo "$x" ?></td></tr>
								<?php
									// Optional user-specified progress bars.
									$e = "";
									for ($i=0; $i < $user_data_files_count; $i++) {
										$e .= displayUserData($user_data_files[$i], "data");
									}
									if ($e !== "") echo "$e";
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
										echo "<tr>";
										echo "<td>Disk Usage</td>";
										echo "<td><span class='errorMsg'>ERROR: unable to read '<strong>$top_dir</strong>' to get disk usage.</span></td>";
										echo "</tr>";
									} else {
										displayProgress("", "Disk Usage", "$dp%", 0, $dp, 100, 90, 70, "");
									}

									// Optional user-specified progress bars.
									$e = "";
									for ($i=0; $i < $user_data_files_count; $i++) {
										$e .= displayUserData($user_data_files[$i], "progress");
									}
									if ($e !== "") echo "$e";
								?>
								</table>
							</div><!-- /.panel-body -->
						</div><!-- /.panel-default -->
					</div><!-- /.row -->

					<div class="row">
					<form action="?page=<?php echo $page ?>" method="POST">
					<div style="margin-bottom: 15px">
						<button type="button" class="btn btn-primary" onclick="document.location.reload(true)"><i class="fa fa-sync-alt"></i> Refresh</button>
					</div>
					<div style="margin-bottom: 15px">
						<button type="submit" class="btn btn-success" name="service_start"/><i class="fa fa-play"></i> Start Allsky</button>
						<button type="submit" class="btn btn-danger" name="service_stop"/><i class="fa fa-stop"></i> Stop Allsky</button>
					</div>
					<div style="margin-bottom: 15px">
						<button type="submit" class="btn btn-warning" name="system_reboot"/><i class="fa fa-power-off"></i> Reboot Raspberry Pi</button>
						<button type="submit" class="btn btn-warning" name="system_shutdown"/><i class="fa fa-plug"></i> Shutdown Raspberry Pi</button>
					</div>
					<?php // Optional user-specified data.
						$e = "";
						for ($i=0; $i < $user_data_files_count; $i++) {
							$e .= displayUserData($user_data_files[$i], "button-button");
						}
						if ($e !== "") echo "$e";
					?>
					</form>
					</div><!-- /.row -->

				</div><!-- /.panel-body -->
			</div><!-- /.panel-primary -->
		</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
	<?php
}
?>
