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

function renderSystemInfoRow($label, $value, $valueId = '', $rowClass = '', $labelColClass = 'col-sm-4', $valueColClass = 'col-sm-8')
{
	$id = $valueId !== '' ? " id='$valueId'" : '';
	$classAttr = $rowClass !== '' ? " $rowClass" : '';
	echo "<div class='row system-info-row$classAttr'>";
	echo "<div class='$labelColClass system-info-label'><strong>$label</strong></div>";
	echo "<div class='$valueColClass system-info-value'$id>$value</div>";
	echo "</div>\n";
}

function renderSystemInfoStackedRow($label, $value, $valueId = '', $rowClass = '')
{
	$id = $valueId !== '' ? " id='$valueId'" : '';
	$classAttr = $rowClass !== '' ? " $rowClass" : '';
	echo "<div class='row system-info-row$classAttr'>";
	echo "<div class='col-sm-12 system-info-label'><strong>$label</strong></div>";
	echo "<div class='col-sm-12 system-info-value'$id>$value</div>";
	echo "</div>\n";
}

function getSystemIPAddresses()
{
	$output = trim((string)exec('hostname -I 2>/dev/null'));
	if ($output === '') {
		return 'Unavailable';
	}

	$addresses = preg_split('/\s+/', $output) ?: [];
	$addresses = array_values(array_filter($addresses, static function ($ip) {
		return trim((string)$ip) !== '';
	}));

	if (count($addresses) === 0) {
		return 'Unavailable';
	}

	return implode('<br>', array_map('htmlspecialchars', $addresses));
}

function getAllskyUptimeText()
{
	$retMsg = '';
	$statusData = get_decoded_json_file(ALLSKY_STATUS, true, '', $retMsg);
	if (!is_array($statusData)) {
		return 'Unavailable';
	}

	$timestamp = getVariableOrDefault($statusData, 'timestamp', '');
	if ($timestamp === '') {
		return 'Unavailable';
	}

	try {
		$timezoneName = trim((string) @file_get_contents('/etc/timezone'));
		if ($timezoneName === '') {
			$timezoneName = date_default_timezone_get();
		}

		$timezone = new DateTimeZone($timezoneName);
		$started = DateTimeImmutable::createFromFormat(DATE_TIME_FORMAT, (string)$timestamp, $timezone);
		if ($started === false) {
			return 'Unavailable';
		}

		$now = new DateTimeImmutable('now', $timezone);
		if ($now < $started) {
			return 'Unavailable';
		}

		$seconds = $now->getTimestamp() - $started->getTimestamp();
		return formatDurationForUptime($seconds);
	} catch (Throwable $e) {
		return 'Unavailable';
	}
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
function displayProgress($x, $label, $data, $min, $current, $max, $danger, $warning, $status_override, $elId="", $tempText="", $labelColClass='col-sm-3', $valueColClass='col-sm-9')
{
	ob_start();

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

	echo "<div class='row system-progress-row'>\n";
	echo "  <div class='$labelColClass system-info-label'><strong>$label</strong></div>\n";
	echo "  <div class='$valueColClass system-progress-value'>\n";
	echo "    <div class='progress'$id>";
	if ($tempText !== "") {
		echo "      <div class='text-center'>$tempText</div>";
	} else {
		echo "      <div class='progress-bar progress-bar-animated progress-bar-$myStatus'\n";
		echo "      role='progressbar'\n";

		echo "      title='current: $current, min: $min, max: $max'";
		if ($current < $min) $current = $min;
		else if ($current > $max) $current = $max;
		echo "      aria-valuenow='$current' aria-valuemin='$min' aria-valuemax='$max'\n";
		$width = (($current - $min) / ($max - $min)) * 100;
		echo "      style='width: $width%;'><span class='nowrap'>$data</span>\n";
		echo "      </div>";
	}
	echo "    </div>\n";
	echo "  </div>\n";
	echo "</div>\n";

	return ob_get_clean();
}

/* Display user data in "file". */
$num_buttons = 0;
$num_calls = 0;
function displayUserData($file, $displayType, $labelColClass = 'col-sm-4', $valueColClass = 'col-sm-8')
{
	global $num_buttons;
	global $num_calls;

	$num_calls++;

	if (! file_exists($file)) {
		if ($num_calls === 1)
			$eMsg = "<p class='errorMsg'>WARNING: data file '<strong>$file</strong>' does not exist.</p>";
		else
			$eMsg = "";
		return(['html' => '', 'error' => $eMsg]);
	}

	$eMsg = "";		// returned error message, if any
	$buttonIndex = -1;
	ob_start();
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
		$data = preg_split('/\t+|\s{2,}/', $line);
		$num = count($data);
		if ($num === 0) {
			$eMsg = "<p class='errorMsg errorMsgBox'>WARNING: Line $i in '<strong>$file</strong>' contains only tab(s)!";
			fclose($handle);
			ob_end_clean();
			return(['html' => '', 'error' => $eMsg]);
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
					renderSystemInfoRow("$label (EXPIRED)", $data, '', '', $labelColClass, $valueColClass);
				else
					renderSystemInfoRow($label, $data, '', '', $labelColClass, $valueColClass);
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
				echo displayProgress($x, $label, $data, $min, $current, $max, $danger, $warning, "", "", "", $labelColClass, $valueColClass);
			}
		} else if ($type === "button" && substr($displayType, 0, 7) === "button-") {
			if ($num >= 6) {
				$type = $data[0];
				$message = $data[1];
				$action = $data[2];
				$btn_color = $data[3];
				$fa_icon = $data[4];
				$btn_label = implode(' ', array_slice($data, 5));
				$buttonIndex++;
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
					$escapedFile = htmlspecialchars($file, ENT_QUOTES);
					echo "<button type='button' class='btn btn-$btn_color as-system-user-button' data-file='$escapedFile' data-button-index='$buttonIndex'>$fa_icon $btn_label</button>\n";
				}
			} else {
				checkNumFields(6, $num, $type, $i, $line, $file);
			}
		}
	}
	fclose($handle);
	$num_buttons = 0;
	$html = ob_get_clean();
	return(['html' => $html, 'error' => $eMsg]);
}

/**
 *
 *
 */
function DisplaySystem()
{
	global $temptype, $page, $settings_array, $status, $hostname, $useLocalWebsite, $useRemoteWebsite;
	global $pageHeaderTitle, $pageIcon, $pageHelp;

	$uptime = getUptime();
	$allskyUptime = getAllskyUptimeText();
	$ipAddresses = getSystemIPAddresses();

	$memused = getMemoryUsed();
	$localWebsiteStatus = $useLocalWebsite ? 'Enabled' : 'Disabled';
	$localWebsiteStatusClass = $useLocalWebsite ? 'label label-success' : 'label label-default';
	$localWebsiteVersion = $useLocalWebsite ? ALLSKY_VERSION : '-';
	$remoteWebsiteStatus = $useRemoteWebsite ? 'Enabled' : 'Disabled';
	$remoteWebsiteStatusClass = $useRemoteWebsite ? 'label label-success' : 'label label-default';
	$remoteWebsiteVersion = '-';
	if ($useRemoteWebsite) {
		$remoteVersionText = trim(strip_tags((string)getRemoteWebsiteVersion()));
		if ($remoteVersionText === '') {
			$remoteWebsiteVersion = ALLSKY_VERSION;
		} else {
			$remoteWebsiteVersion = trim(str_replace(['(version', ')'], '', $remoteVersionText));
		}
	}

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
			<div class="panel-heading clearfix">
                <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
				<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
            </div>
			<div class="panel-body">

				<?php
				$s = false;		// Update interval for Allsky Status ?

				$systemAction = null;
				foreach ([
					'system_reboot' => 'reboot',
					'system_shutdown' => 'shutdown',
					'service_start' => 'start',
					'service_stop' => 'stop',
				] as $postField => $action) {
					if (isset($_POST[$postField])) {
						$systemAction = $action;
						break;
					}
				}

				if ($systemAction !== null) {
					if (! CSRFValidate()) {
						$status->addMessage("Session expired. Refresh the page and try again.", "danger", true);
					} else if ($systemAction === 'reboot') {
						$status->addMessage("System Rebooting Now!", "warning", true);
						$result = shell_exec("sudo /sbin/reboot");
					} else if ($systemAction === 'shutdown') {
						$status->addMessage("System Shutting Down Now!", "warning", true);
						$result = shell_exec("sudo /sbin/shutdown -h now");
					} else if ($systemAction === 'start') {
						// Sleep to let Allsky status get updated.
						// Starting Allsky takes longer to update status.
						runCommand("sudo /bin/systemctl start allsky && sleep 4", "Allsky started", "success");
						$s = true;
					} else if ($systemAction === 'stop') {
						runCommand("sudo /bin/systemctl stop allsky && sleep 3", "Allsky stopped", "success");
						$s = true;
					}
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
					$result = displayUserData($user_data_files[$i], "button-action");
					$e .= $result['error'];
					echo $result['html'];
				}

				if ($status->isMessage()) echo "<p>" . $status->showMessages() . "</p>";
				?>

				<ul class="nav nav-tabs">
					<li class="active"><a href="#as-system-system" data-toggle="tab">System</a></li>
					<li><a href="#as-system-watchdog" data-toggle="tab">Watchdogs</a></li>
					<li><a href="#as-system-logs" data-toggle="tab">Logs</a></li>
					<li><a href="#as-system-backups" data-toggle="tab">Backups</a></li>
				</ul>

				<div class="tab-content" style="margin-top:15px;">
					<div id="as-system-system" class="tab-pane fade in active">
						<form action="?page=<?php echo $page ?>" method="POST">
							<?php CSRFToken(); ?>
							<nav class="navbar navbar-default system-action-navbar">
								<div class="container-fluid">
									<div class="navbar-left system-action-toolbar" role="toolbar">
										<div class="navbar-btn">
											<div class="btn-group" role="group">
												<button type="button" class="btn btn-success as-system-allsky-action" data-action="start" title="Start Allsky" aria-label="Start Allsky">
													<i class="fa fa-play fa-fw"></i>
												</button>
												<button type="button" class="btn btn-danger as-system-allsky-action" data-action="stop" title="Stop Allsky" aria-label="Stop Allsky">
													<i class="fa fa-stop fa-fw"></i>
												</button>
											</div>
										</div>
										<div class="navbar-btn">
											<div class="btn-group" role="group">
												<button type="button" class="btn btn-warning as-system-power-action" data-action="reboot" title="Reboot Pi" aria-label="Reboot Pi">
													<i class="fa fa-power-off fa-fw"></i>
												</button>
												<button type="button" class="btn btn-danger as-system-power-action" data-action="shutdown" title="Shutdown Pi" aria-label="Shutdown Pi">
													<i class="fa fa-plug fa-fw"></i>
												</button>
											</div>
										</div>
										<div class="navbar-btn">
											<div class="btn-group" role="group">
												<button type="button" class="btn btn-info" id="as-system-buttons-editor-open" title="Edit Additions" aria-label="Edit Additions">
													<i class="fa fa-pen-to-square fa-fw"></i>
												</button>
											</div>
										</div>
									</div>
								</div>
							</nav>

						<div class="row">
							<div class="panel panel-success">
								<div class="panel-body">
									<?php if ($e !== "") echo "$e"; // display any error msg ?>

									<div class="row">
										<div class="col-md-6">
											<div class="well well-sm system-summary-card">
											<?php
												renderSystemInfoRow('Hostname', $hostname);
												renderSystemInfoRow('IP Addresses', $ipAddresses);
												renderSystemInfoRow('Pi Model', RPiModel());
												renderSystemInfoRow('Pi Uptime', $uptime, 'as-uptime');
											?>
											</div>
										</div>
										<div class="col-md-6">
											<div class="well well-sm system-summary-card">
											<?php
												renderSystemInfoRow('Allsky Version', ALLSKY_VERSION);
												renderSystemInfoRow('Local Website', "<span class='system-info-nowrap-value'><span class=\"$localWebsiteStatusClass\">$localWebsiteStatus</span>" . ($localWebsiteVersion !== '-' ? " (" . htmlspecialchars($localWebsiteVersion) . ")" : '') . "</span>", '', 'system-info-row-nowrap');
												renderSystemInfoRow('Remote Website', "<span class='system-info-nowrap-value'><span class=\"$remoteWebsiteStatusClass\">$remoteWebsiteStatus</span>" . ($remoteWebsiteVersion !== '-' ? " (" . htmlspecialchars($remoteWebsiteVersion) . ")" : '') . "</span>", '', 'system-info-row-nowrap');
												renderSystemInfoRow('Allsky Uptime', $allskyUptime);
											?>
											</div>
										</div>
									</div>
									<div class="row">
										<div class="col-md-12">
											<div class="well well-sm system-summary-card">
												<?php echo displayProgress("", "Throttle Status", $throttle, 0, 100, 100, -1, -1, $throttle_status, "as-throttle", "", "col-sm-2", "col-sm-10"); ?>
												<?php echo displayProgress("", "Memory Used", "$memused%", 0, $memused, 100, 90, 75, "", "as-memory", "", "col-sm-2", "col-sm-10"); ?>
												<?php echo displayProgress("", "CPU Load", "$cpuLoad%", 0, $cpuLoad, 100, 90, 75, "", "as-cpuload", "Calculating", "col-sm-2", "col-sm-10"); ?>
												<?php echo displayProgress("", "CPU Temperature", $display_temperature, 0, $temperature, 100, 70, 60, $temperature_status, "as-cputemp", "", "col-sm-2", "col-sm-10"); ?>
												<?php 
													$label = "Disk Usage";
													if ($dp === -1) {
														renderSystemInfoRow($label, $dp_msg, '', '', 'col-sm-2', 'col-sm-10');
													} else {
														echo displayProgress("", $label, $dp_msg, 0, $dp, 100, 90, 70, "", "", "", "col-sm-2", "col-sm-10");
													}
												?>
												<?php 
													$label = str_replace(ALLSKY_HOME, "~/allsky", $tmp_dir) . " Usage";
													if ($tdp === -1) {
														renderSystemInfoRow($label, $tdp_msg, '', '', 'col-sm-2', 'col-sm-10');
													} else {
														echo displayProgress("", $label, $tdp_msg, 0, $tdp, 100, 90, 70, "", "", "", "col-sm-2", "col-sm-10");
													}

													// Optional user-specified progress bars.
													$e = "";
													for ($i=0; $i < $user_data_files_count; $i++) {
														$result = displayUserData($user_data_files[$i], "progress", "col-sm-2", "col-sm-10");
														$e .= $result['error'] . $result['html'];
													}
													if ($e !== "") echo "$e";

													// Optional user-specified data rows after progress bars.
													$e = "";
													for ($i=0; $i < $user_data_files_count; $i++) {
														$result = displayUserData($user_data_files[$i], "data", "col-sm-2", "col-sm-10");
														$e .= $result['error'] . $result['html'];
													}
													if ($e !== "") echo "$e";
												?>
											</div>
										</div>
									</div>

									<?php
										$userButtons = "";
										$userButtonErrors = "";
										for ($i=0; $i < $user_data_files_count; $i++) {
											$result = displayUserData($user_data_files[$i], "button-button");
											$userButtons .= $result['html'];
											$userButtonErrors .= $result['error'];
										}
										if ($userButtonErrors !== "") echo $userButtonErrors;
										if ($userButtons !== "") {
											echo "<div class='row'>";
											echo "<div class='col-md-12'>";
											echo "<div class='well well-sm system-summary-card system-user-actions-body'>";
											echo $userButtons;
											echo "</div>";
											echo "</div>";
											echo "</div>";
										}
									?>
								</div><!-- /.panel-body -->
							</div><!-- /.panel-default -->
						</div><!-- /.row -->
						</form>
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
					<div id="as-system-logs" class="tab-pane fade">
						<div class="row" style="margin-bottom:10px;">
							<div class="col-xs-12 col-sm-6">
								<label for="as-system-log-select">Select Log</label>
								<select id="as-system-log-select" class="form-control"></select>
							</div>
							<div class="col-xs-12 col-sm-6 text-right" style="margin-top:25px;">
								<div style="display:inline-flex; align-items:center; gap:8px; margin:0;">
									<span>Follow</span>
									<label class="el-switch el-switch-sm el-switch-green" style="margin:0;">
										<input id="as-system-log-follow" type="checkbox" name="switch" checked>
										<span class="el-switch-style"></span>
									</label>
								</div>
							</div>
						</div>
						<div class="row">
							<div class="col-xs-12">
								<div id="as-system-log-warning" class="alert alert-warning" style="display:none; margin-bottom:10px;"></div>
								<div id="as-system-log-meta" class="text-muted" style="margin-bottom:6px;"></div>
								<style>
									.log-error { color: #ff6b6b; font-weight: 600; }
									.log-warn { color: #ffd166; font-weight: 600; }
									.log-info { color: #8fd3ff; }
								</style>
								<pre id="as-system-log-output" class="allow-select" style="height: 420px; overflow-y: auto; background:#111; color:#e6e6e6; padding:10px; border-radius:4px;"></pre>
							</div>
						</div>
					</div>
					<div id="as-system-backups" class="tab-pane fade">
						<div id="as-config-backup-alert" style="display:none;"></div>
						<div class="alert alert-danger" role="alert" style="margin-bottom:14px; padding:14px 16px;">
							<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
								<i class="fa fa-exclamation-triangle" aria-hidden="true" style="font-size:18px;"></i>
								<strong style="font-size:17px; line-height:1.2;">Read The <a href="/docs/allsky_guide/backup_restore/overview.html" external="true">Documentation</a> Before You Continue</strong>
							</div>
							<div style="font-size:15px; line-height:1.45;">
								The backup and restore system should only be used after reviewing the <a href="/docs/allsky_guide/backup_restore/overview.html" external="true">documentation</a> in full.
								It explains what is included in each backup type, prerequisites for restore, and the correct workflow to avoid data loss.
							</div>
						</div>
							<style>
								#as-config-backup-table-wrapper {
									border-collapse: separate;
									border-spacing: 0 6px;
									margin-bottom: 14px !important;
								}
								#as-config-backup-table-container {
									position: relative;
									min-height: 240px;
									padding-bottom: 10px;
								}
								#as-config-backup-table-wrapper_wrapper > .row:last-child {
									margin-top: 12px;
								}
								#as-config-backup-table-wrapper_wrapper .dataTables_info,
								#as-config-backup-table-wrapper_wrapper .dataTables_paginate {
									padding-top: 4px;
								}
								#as-config-backup-table-wrapper_wrapper .as-backups-table-gap {
									height: 12px;
								}
							</style>

						<div class="panel panel-default">
							<div class="panel-heading">
								<h3>Allsky Backups
									<div class="pull-right">
										<input type="file" id="as-config-backup-upload-input" accept=".tar.gz" style="display:none;">
										<button type="button" class="btn btn-default" id="as-config-backup-upload" style="margin-right:6px;">
											<i class="fa fa-upload"></i> Upload Backup
										</button>
										<button type="button" class="btn btn-primary" id="as-config-backup-create">
											<i class="fa fa-download"></i> Create Backup
										</button>
									</div>
								</h3>
							</div>
							<div class="panel-body">
								<div id="as-config-backup-table-container" class="table-responsive">
									<table id="as-config-backup-table-wrapper" class="display" style="width:100%">
										<thead><tr><th class="text-left">Backup Date/Time</th><th>Type</th><th>Version</th><th>Camera Type</th><th>Camera Model</th><th class="text-right">Size</th><th class="text-right">Actions</th></tr></thead>
										<tbody id="as-config-backup-table">
											<tr><td colspan="7">Loading backup list...</td></tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div class="modal fade" id="as-config-backup-restore-modal" tabindex="-1" role="dialog" aria-labelledby="as-config-backup-restore-title">
							<div class="modal-dialog modal-lg" role="document" style="width:90%; max-width:1200px;">
								<div class="modal-content">
									<div class="modal-header">
										<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
										<h4 class="modal-title" id="as-config-backup-restore-title">Restore Backup</h4>
									</div>
									<div class="modal-body" style="min-height:560px;">
										<div id="as-config-backup-restore-details"></div>
									</div>
									<div class="modal-footer">
										<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
										<button type="button" class="btn btn-warning" id="as-config-backup-restore-confirm">Confirm Restore</button>
									</div>
								</div>
							</div>
						</div>

						<div class="modal fade" id="as-system-user-button-result-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-user-button-result-title">
							<div class="modal-dialog" role="document">
								<div class="modal-content">
									<div class="modal-header">
										<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
										<h4 class="modal-title" id="as-system-user-button-result-title">Action Result</h4>
									</div>
									<div class="modal-body">
										<div class="alert" id="as-system-user-button-result-status"></div>
										<div class="panel panel-default" style="margin-bottom: 0;">
											<div id="as-system-user-button-result-message" class="panel-body allow-select" style="white-space: pre-wrap; word-break: break-word;"></div>
										</div>
									</div>
									<div class="modal-footer">
										<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
									</div>
								</div>
							</div>
						</div>

						<div class="modal fade" id="as-system-confirm-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-confirm-title">
							<div class="modal-dialog" role="document">
								<div class="modal-content">
									<div class="modal-header">
										<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
										<h4 class="modal-title" id="as-system-confirm-title">Confirm Action</h4>
									</div>
									<div class="modal-body">
										<div class="alert alert-warning" style="margin-bottom: 0;">
											<div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Are you sure?</div>
											<div id="as-system-confirm-message"></div>
										</div>
									</div>
									<div class="modal-footer">
										<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
										<button type="button" class="btn btn-danger" id="as-system-confirm-accept">Continue</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div><!-- /.panel-body -->
		</div><!-- /.panel-primary -->

<?php
    echo addAsset([
			'/js/jquery-loading-overlay/dist/loadingoverlay.min.js',
			'js/watchdog.js',
			'js/system-logs.js',
			'js/system-backups.js',
			'js/jquery-filebrowser/jquery-filebrowser.js',
			'js/jquery-systempagebuttons/jquery-systempagebuttons.js',
			'js/system.js'
		]);
}
?>
