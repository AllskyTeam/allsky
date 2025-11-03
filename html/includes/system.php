<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

/**
 *
 * Find the version of the Raspberry Pi
 * Currently only used for the system information page but may useful elsewhere
 *
 */

function RPiModel()
{
	global $settings_array;

	$model = getVariableOrDefault($settings_array, 'computer', "Unknown");
	return(str_replace("RPi", "Raspberry Pi", $model));
}

function formatSize($bytes)
{
	$types = array('B', 'KB', 'MB', 'GB', 'TB');
	for ($i = 0; $bytes >= 1024 && $i < (count($types) - 1); $bytes /= 1024, $i++) ;
	return (round($bytes, 1) . " " . $types[$i]);
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
function displayProgress($x, $label, $data, $min, $current, $max, $danger, $warning, $status_override, $elId="", $tempText="")
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

        if ($elId !== "") {
                $id = " id='$elId'";
        } else {
                $id = "";
        }

        echo "<tr><td colspan='2' style='height: 5px'></td></tr>\n";
        echo "<tr><td $x>$label</td>\n";
        echo "    <td style='width: 100%' class='progress' $id>";
        if ($tempText !== "") {
                echo "    <div class='text-center'>$tempText</div>";
                echo "    </td></tr>\n";
        } else {
                echo "    <div class='progress-bar progress-bar-animated progress-bar-$myStatus'\n";
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
                echo "    style='width: $width%;'><span class='nowrap'>$data</span>\n";
                echo "    </div></td></tr>\n";
        }
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
					if (isset($_POST[$u])) {
						echo "<script>console.log(`Running $action`);</script>\n";
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
	global $temptype, $page, $settings_array, $status, $hostname;
	global $pageHeaderTitle, $pageIcon;

	$uptime = getUptime();

	$memused = getMemoryUsed();

	// Disk and File usage.

	// Filesystem Allsky is on.
	$top_dir = ALLSKY_WEBUI;
	$df = @disk_free_space($top_dir);		// returns bytes
	if ($df === false) {
		$dp = -1;	// signals an error
		$dp_msg = "<span class='errorMsg'>Unable to read '$top_dir'.</span>";
	} else {
		// and get disk space total (in bytes)
		$dt = disk_total_space($top_dir);
		// now we calculate the disk space used (in bytes)
		$du = $dt - $df;
		// percentage of disk used - this will be used to also set the width % of the progress bar
		$dp = sprintf('%d', ($du / $dt) * 100);

		/* and we format the size from bytes to MB, GB, etc. */
		$df = formatSize($df);
		$du = formatSize($du);
		$dt = formatSize($dt);
		$dp_msg = "$dp% &nbsp; &nbsp; - &nbsp; &nbsp; $dt ($df free)";
	}
	// Allsky tmp filesystem
	$tmp_dir = ALLSKY_TMP;
	$tdf = @disk_free_space($tmp_dir);
	if ($tdf === false) {
		$tdp = -1;
		$tdp_msg = "<span class='errorMsg'>Unable to read '$tmp_dir'.</span>";
	} else {
		$tdt = disk_total_space($tmp_dir);
		$tdu = $tdt - $tdf;
		$tdp = sprintf('%d', ($tdu / $tdt) * 100);
		$tdf = formatSize($tdf);
		$tdu = formatSize($tdu);
		$tdt = formatSize($tdt);
		$tdp_msg = "$tdp% &nbsp; &nbsp; - &nbsp; &nbsp; $tdt ($tdf free)";
	}

	// Throttle / undervoltage status
	$throttle_data = getThrottleStatus();
	$throttle_status = $throttle_data['throttle_status'];
	$throttle = $throttle_data['throttle']; 


	// cpu load - calculated over several seconds
	$cpuLoad = 0;

	// cpu temperature
	$cpuTempData = getCPUTemp();

	$temperature = $cpuTempData['temperature'];
	$display_temperature = $cpuTempData['display_temperature'];
	$temperature_status = $cpuTempData['temperature_status'];

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
		<div class="panel panel-allsky">
			<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
			<div class="panel-body">

				<?php
				$s = false;		// Update interval for Allsky Status ?

				if (isset($_POST['system_reboot'])) {
					$status->addMessage("System Rebooting Now!", "warning", true);
					$result = shell_exec("sudo /sbin/reboot");
				} else if (isset($_POST['system_shutdown'])) {
					$status->addMessage("System Shutting Down Now!", "warning", true);
					$result = shell_exec("sudo /sbin/shutdown -h now");
				} else if (isset($_POST['service_start'])) {
					// Sleep to let Allsky status get updated.
					// Starting Allsky takes longer to update status.
					runCommand("sudo /bin/systemctl start allsky && sleep 4", "Allsky started", "success");
					$s = true;
				} else if (isset($_POST['service_stop'])) {
					runCommand("sudo /bin/systemctl stop allsky && sleep 3", "Allsky stopped", "success");
					$s = true;
				}
				if ($s) {
					# Allsky status will change so check often.
					echo "<script>allskystatus_interval = 2 * 1000;</script>";
				}

				$e = "";
				// Execute optional user-specified button actions.
				// This needs to be done here in case the command(s) return a status message
				// which is displayed below.
				for ($i=0; $i < $user_data_files_count; $i++) {
					$e .= displayUserData($user_data_files[$i], "button-action");
				}

				if ($status->isMessage()) echo "<p>" . $status->showMessages() . "</p>";
				?>

				<ul class="nav nav-tabs">
					<li class="active"><a href="#as-system-system" data-toggle="tab">System</a></li>
					<li><a href="#as-system-watchdog" data-toggle="tab">Watchdogs</a></li>
				</ul>

				<div class="tab-content" style="margin-top:15px;">
					<div id="as-system-system" class="tab-pane fade in active">


						<div class="row">
							<div class="panel panel-success">
								<div class="panel-body">
									<h4>System Information</h4>
									<?php if ($e !== "") echo "$e"; // display any error msg ?>

									<table>
									<!-- <colgroup> doesn't seem to support "width", so set on 1st line -->
									<tr><td style="padding-right: 90px;">Hostname</td><td><?php echo $hostname ?></td></tr>
									<tr><td>Pi Model</td><td><?php echo RPiModel() ?></td></tr>
									<tr><td>Uptime</td><td id="as-uptime"><?php echo $uptime ?></td></tr>
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
									<?php displayProgress("", "Throttle Status", $throttle, 0, 100, 100, -1, -1, $throttle_status, "as-throttle"); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "Memory Used", "$memused%", 0, $memused, 100, 90, 75, "", "as-memory"); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "CPU Load", "$cpuLoad%", 0, $cpuLoad, 100, 90, 75, "", "as-cpuload", "Calculating"); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php displayProgress("", "CPU Temperature", $display_temperature, 0, $temperature, 100, 70, 60, $temperature_status, "as-cputemp"); ?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php 
										$label = "Disk Usage";
										if ($dp === -1) {
											echo "<tr>";
											echo "<td>$label</td>";
											echo "<td>$dp_msg</td>";
											echo "</tr>";
										} else {
											displayProgress("", $label, $dp_msg, 0, $dp, 100, 90, 70, "");
										}
									?>
									<tr><td colspan="2" style="height: 5px"></td></tr>
									<?php 
										$label = str_replace(ALLSKY_HOME, "~/allsky", $tmp_dir) . " Usage";
										if ($tdp === -1) {
											echo "<tr>";
											echo "<td>$label</td>";
											echo "<td>$tdp_msg</td>";
											echo "</tr>";
										} else {
											displayProgress("", $label, $tdp_msg, 0, $tdp, 100, 90, 70, "");
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
							<button type="submit" class="btn btn-success" name="service_start"/>
								<i class="fa fa-play"></i> Start Allsky</button>
							&nbsp;
							<button type="submit" class="btn btn-danger" name="service_stop"/>
								<i class="fa fa-stop"></i> Stop Allsky</button>
						</div>
						<div style="line-height: 40px">
							<button type="submit" class="btn btn-warning" name="system_reboot"/>
								<i class="fa fa-power-off"></i> Reboot Raspberry Pi</button>
							&nbsp;
							<button type="submit" class="btn btn-warning" name="system_shutdown"/>
								<i class="fa fa-plug"></i> Shutdown Raspberry Pi</button>
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
					</div>
					<div id="as-system-watchdog" class="tab-pane fade">
						<div class="row">
							<div class="col-xs-3 watchdogHeader">Service</div>
							<div class="col-xs-3 watchdogHeader">Status</div>
							<div class="col-xs-2 watchdogHeader">PID</div>
							<div class="col-xs-4 watchdogHeader">Actions</div>
						</div>
						<div id="as-system-watchdog-results">
						</div>
					</div>
				</div>
			</div><!-- /.panel-body -->
		</div><!-- /.panel-primary -->

    	<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>		
		<script src="js/watchdog.js"></script>
	<?php
}
?>
