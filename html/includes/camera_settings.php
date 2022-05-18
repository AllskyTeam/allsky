<?php
include_once( 'includes/status_messages.php' );

function DisplayCameraConfig(){
	$options_str = file_get_contents(RASPI_CAMERA_OPTIONS, true);
	$options_array = json_decode($options_str, true);

	global $status;
	$status = new StatusMessages();

	if (isset($_POST['save_settings'])) {
		if (CSRFValidate()) {
			$checkChanges = array();	// holds all settings where "checkchanges" is on
			foreach ($options_array as $option){
				if (isset($option['checkchanges']) && $option['checkchanges'])
					$checkChanges[$option['name']] = $option['checkchanges'];
			}
			$settings = array();
			$changes = "";
			$somethingChanged = false;
	 		foreach ($_POST as $key => $value){
				// We look into POST data to only select settings
				// Instead of trying to escape single and double quotes, which I never figured out how to do,
				// convert them to HTML codes.
				$isOLD = substr($key, 0, 4) === "OLD_";
				if (!in_array($key, ["csrf_token", "save_settings", "reset_settings", "restart"]) && ! $isOLD) {
					$settings[$key] = str_replace("'", "&#x27", str_replace('"', '&quot;', $value));
					$value = str_replace("'", "&#x27;", $value);
				} else if ($isOLD) {
					$originalName = substr($key, 4);		// everything after "OLD_"
					$oldValue = str_replace("'", "&#x27", str_replace('"', '&quot;', $value));
					$newValue = $settings[$originalName];
					if ($oldValue !== $newValue) {
						$somethingChanged = true;
						// echo "<br>$key: old [$oldValue] !== new [$newValue]";
						$checkchanges = false;
						foreach ($options_array as $option){
							if ($option['name'] === $originalName) {
								$checkchanges = isset($option['checkchanges']) && $option['checkchanges'];
								break;
							}
						}
						if ($checkchanges)
							$changes .= "  '$originalName' '$oldValue' '$newValue'";
					}
				}
			}
			if ($somethingChanged) {
				if ($settings_file = fopen(RASPI_CAMERA_SETTINGS, 'w')) {
					$msg = "Settings saved";
					fwrite($settings_file, json_encode($settings, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
					fclose($settings_file);
				} else {
					$status->addMessage('Failed to save settings', 'danger');
				}
			} else {
				$msg = "No settings changed (file not updated)";
			}

			if (isset($_POST['restart'])) {
				$msg .= " and service restarted";
				// runCommand displays $msg.
				runCommand("sudo /bin/systemctl reload-or-restart allsky.service", $msg, "success");
			} else {
				$msg .= " and service NOT restarted";
				$status->addMessage($msg, 'info');
			}

			if ($changes !== "" && file_exists(ALLSKY_SCRIPTS . "/makeChanges.sh")) {
				$CMD = ALLSKY_SCRIPTS . "/makeChanges.sh $changes";
				# Let makeChanges.sh display any output
				runCommand($CMD, "-", "success");
			}
		} else {
			$status->addMessage('Unable to save settings - session timeout', 'danger');
		}
	}

	if (isset($_POST['reset_settings'])) {
		if (CSRFValidate()) {
			if ($settings_file = fopen(RASPI_CAMERA_SETTINGS, 'w')) {
				$settings = array();
				foreach ($options_array as $option){
					$key = $option['name'];
					$value = $option['default'];
					$settings[$key] = $value;
				}
				fwrite($settings_file, json_encode($settings,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK));
				fclose($settings_file);
				$status->addMessage('Settings reset to default');
			} else {
				$status->addMessage('Failed to reset settings', 'danger');
			}
		} else {
			$status->addMessage('Unable to reset settings - session timeout', 'danger');
		}
	}

	$settings_str = file_get_contents(RASPI_CAMERA_SETTINGS, true);
	$settings_array = json_decode($settings_str, true);

	// Determine if the advanced settings should always be shown.
	$initial_display = $settings_array['alwaysshowadvanced'] == 1 ? "table-row" : "none";
?>
<script language="javascript">
function toggle_advanced()
{
	var adv = document.getElementsByClassName("advanced");
	var newMode = "";
	for (var i=0; i<adv.length; i++) {
		// Don't hide the button!
		if (adv[i].id != "advButton") {
			var s = adv[i].style;
			if (s.display == "none") {
				newMode = "table-row";
			} else {
				newMode = "none";
			}
			s.display = newMode;
		}
	}

	var b = document.getElementById("advButton");
	if (newMode == "none") {
		// advanced options are now hidden, change button text
		b.innerHTML = "Show advanced options...";
	} else {
		b.innerHTML = "Hide advanced options";
	}

	// Show/hide the default values.
	var def = document.getElementsByClassName("default");
	var newMode = "";
	for (var i=0; i<def.length; i++) {
		var s = def[i].style;
		if (s.display == "none") {
			newMode = "inline";
		} else {
			newMode = "none";
		}
		s.display = newMode;
	}
}
</script>
  <div class="row">
    <div class="col-lg-12" style="padding: 0px 5px;">
      <div class="panel panel-primary">
      <div class="panel-heading"><i class="fa fa-camera fa-fw"></i> Configure Settings <?php echo "&nbsp; &nbsp; &nbsp; - &nbsp; &nbsp; &nbsp; " . RASPI_CAMERA_OPTIONS; ?></div>
        <!-- /.panel-heading -->
        <div class="panel-body" style="padding: 5px;">
          <p><?php $status->showMessages(); ?></p>

          <form method="POST" action="?page=camera_conf" name="conf_form">
            <?php CSRFToken()?>

             <?php
		// Allow for "advanced" options that aren't displayed by default to avoid
		// confusing novice users.
		$numAdvanced = 0;
		echo "<table border='0'>";
			foreach($options_array as $option) {
				// Should this setting be displayed?
				if (isset($option['display']) && ! $option['display']) continue;

				if (isset($option['minimum']))
					$minimum = $option['minimum'];
				else
					$minimum = "";
				if (isset($option['maximum']))
					$maximum = $option['maximum'];
				else
					$maximum = "";
				$advanced = $option['advanced'];
				if ($advanced == 1) {
					$numAdvanced++;
					$advClass = "advanced";
					$advStyle = "display: $initial_display";
				} else {
					$advClass = "";
					$advStyle = "";
				}
				$label = $option['label'];
				$name = $option['name'];
				if (isset($option['default']))
					$default = $option['default'];
				else
					$default = "";
				$type = $option['type'];
				if ($type == "header") {
					$value = "";
				} else {
					if (isset($settings_array[$name]))
						$value = $settings_array[$name] != null ? $settings_array[$name] : $default;
					else
						$value = $default;
					// Allow single quotes in values (for string values).
					// &apos; isn't supported by all browsers so use &#x27.
					$value = str_replace("'", "&#x27;", $value);
					$default = str_replace("'", "&#x27;", $default);
				}
				$description = $option['description'];
				// "widetext" should have the label spanning 2 rows,
				// a wide input box on the top row spanning the 2nd and 3rd columns,
				// and the description on the bottom row in the 3rd column.
				// This way, all descriptions are in the 3rd column.
				if ($type !== "widetext" && $type != "header") $class = "rowSeparator";
				else $class="";
				echo "\n";	// to make it easier to read web source when debugging

				// Put some space before and after headers.  This next line is the "before":
				if ($type == "header") echo "<tr style='height: 10px'><td colspan='3'></td></tr>";

				echo "<tr class='form-group $advClass $class' style='margin-bottom: 0px; $advStyle'>";
				if ($type === "header"){
					echo "<td colspan='3' style='padding: 8px 0px;' class='settingsHeader'>$description</td>";
				} else {
					// Show the default in a popup
					if ($type == "checkbox") {
						if ($default == "0") $default = "No";
						else $default = "Yes";
					} elseif ($type == "select") {
						foreach($option['options'] as $opt) {
							$val = $opt['value'];
							if ($val != $default) continue;
							$default = $opt['label'];
							break;
						}
					} elseif ($default == "") {
						$default = "[empty]";
					}
					$popup = "Default=$default";
					if ($minimum !== "") $popup .= "\nMinimum=$minimum";
					if ($maximum !== "") $popup .= "\nMaximum=$maximum";

					if ($type == "widetext") $span="rowspan='2'";
					else $span="";
					echo "<td $span valign='middle' style='padding: 2px 0px'>";
					echo "<label style='padding-right: 3px;'>$label</label>";
					echo "</td>";

					if ($type == "widetext") $span="colspan='2'";
					else $span="";
					echo "<td $span style='padding: 5px 0px;'>";
					// The popup gets in the way of seeing the value a little.
					// May want to consider having a symbol next to the field
					// that has the popup.
					echo "<span title='$popup'>";
					if ($type == "text" || $type == "number"){
						echo "<input class='form-control boxShadow' type='$type'" .
							" name='$name' value='$value'" .
							" style='padding: 0px 3px 0px 0px; text-align: right; width: 120px;'>";
					} else if ($type == "widetext"){
						echo "<input class='form-control boxShadow' type='text'" .
							" name='$name' value='$value'" .
						   	" style='padding: 6px 5px;'>";
					} else if ($type == "select"){
						// text-align for <select> works on Firefox but not Chrome or Edge
						echo "<select class='form-control boxShadow' name='$name'" .
						   	" style='width: 120px; margin-right: 20px; text-align: right; padding: 0px 3px 0px 0px;'>";
						foreach($option['options'] as $opt){
							$val = $opt['value'];
							$lab = $opt['label'];
							if ($value == $val){
								echo "<option value='$val' selected>$lab</option>";
							} else {
								echo "<option value='$val'>$lab</option>";
							}
						}
						echo "</select>";
					} else if ($type == "checkbox"){
						echo "<div class='switch-field boxShadow' style='margin-bottom: -3px; border-radius: 4px;'>";
							echo "<input id='switch_no_".$name."' class='form-control' type='radio' ".
								"name='$name' value='0' ".
								($value == 0 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_no_".$name."'>No</label>";
							echo "<input id='switch_yes_".$name."' class='form-control' type='radio' ".
								"name='$name' value='1' ".
								($value == 1 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_yes_".$name."'>Yes</label>";
						echo "</div>";
					}
					echo "</span>";

					// Track current values so we can determine what changed.
					echo "<input type='hidden' name='OLD_$name' value='$value'>";

					echo "</td>";
					if ($type == "widetext")
						echo "</tr><tr class='rowSeparator'><td></td>";
					echo "<td>$description</td>";
				}
				echo "</tr>";
				if ($type == "header") echo "<tr class='rowSeparator' style='height: 10px;'><td colspan='3'></td></tr>";

			 }
		echo "</table>";
	?>

	<div style="margin-top: 20px">
		<input type="submit" class="btn btn-outline btn-primary" name="save_settings" value="Save changes">
		<input type="submit" class="btn btn-warning" name="reset_settings" value="Reset to default values" onclick="return confirm('Really RESET ALL VALUES TO DEFAULT??');">
		<button type="button" class="btn advanced" id="advButton" onclick="toggle_advanced();"><?php if ($initial_display == "none") echo "Show advanced options"; else echo "Hide advanced options"; ?></button>
		<div title="UNcheck to only save settings without restarting Allsky" style="line-height: 0.3em;"><br><input type="checkbox" name="restart" checked> Restart Allsky after saving changes?<br><br>&nbsp;</div>
	</div>
	</form>
</div><!-- ./ Panel body -->
</div><!-- /.panel-primary -->
</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}
?>
