<?php
if ($formReadonly != "readonly") {
	include_once( 'includes/status_messages.php' );
}

function DisplayAllskyConfig(){
	global $formReadonly;

	$cameraTypeName = "cameraType";		// json setting name
	$cameraModelName = "cameraModel";	// json setting name
	global $lastChangedName;			// json setting name
	global $lastChanged;
	global $page;
	global $ME;

	$settings_file = getSettingsFile();
	$options_file = getOptionsFile();

	$options_str = file_get_contents($options_file, true);
	$options_array = json_decode($options_str, true);

	if ($formReadonly != "readonly") {
		global $status;
		$status = new StatusMessages();
	}

	if (isset($_POST['save_settings'])) {
		// If the user changed the camera type and anything else,
		// warn them and don't do anything.
		// If we went ahead and made the changes, we would be making them to the NEW
		// camera's settings file, but using values from the OLD file.
		if (CSRFValidate()) {
			$settings = array();
			$optional_array = array();
			$changes = "";
			$somethingChanged = false;
			$numErrors = 0;
			$newCameraType = "";
			$ok = true;
			$msg = "";

			// Keep track of optional settings
			foreach ($options_array as $option){
				$n = $option['name'];
				$optional_array[$n] = getVariableOrDefault($option, 'optional', false);
			}

	 		foreach ($_POST as $key => $value){
				if (in_array($key, ["csrf_token", "save_settings", "reset_settings", "restart"]))
					continue;

				// We look into POST data to only select settings.
				// Because we are passing the changes enclosed in single quotes below,
				// we need to escape the single quotes, but I never figured out how to do that,
				// so convert them to HTML codes instead.
				$isOLD = substr($key, 0, 4) === "OLD_";
				if (! $isOLD) {
					// Check for empty non-optional settings.
					foreach ($options_array as $option){
						if ($option['name'] === $key) {
							if ($value == "" && ! $optional_array[$key]) {
								$numErrors++;
								$ok = false;
							}
						}
					}

					// Add the key/value pair to the array so we can see if it changed.
					$settings[$key] = str_replace("'", "&#x27", $value);

				} else if ($isOLD) {
					$originalName = substr($key, 4);		// everything after "OLD_"
					$oldValue = str_replace("'", "&#x27", $value);
					$newValue = getVariableOrDefault($settings, $originalName, "");
					if ($oldValue !== $newValue) {
						if ($originalName === $cameraTypeName)
							$newCameraType = $newValue;
						else
							$somethingChanged = true;	// want to know about other changes

						$checkchanges = false;
						foreach ($options_array as $option){
							if ($option['name'] === $originalName) {
								$optional = $optional_array[$originalName];
								if ($newValue !== "" || $optional) {
									$checkchanges = getVariableOrDefault($option, 'checkchanges', false);
									$label = getVariableOrDefault($option, 'label', "");
								}
								break;
							}
						}
						if ($checkchanges)
							$changes .= "  '$originalName' '$label' '$newValue'";
					}
				}
			}

// TODO: should we update the settings file first, or run makeChanges.sh ?
// It's probably more likely makeChange.sh would fail than updating the settings file,
// so it should probably go first.
			if ($ok) {
				if ($somethingChanged || $lastChanged === null) {
					if ($newCameraType !== "") {
						$msg = "If you change <b>Camera Type</b> you cannot change anything else.  No changes made.";
						$ok = false;
					} else {
						// Keep track of the last time the file changed.
						// If we end up not updating the file this will be ignored.
						$lastChanged = date('Y-m-d H:i:s');
						$settings[$lastChangedName] = $lastChanged;
						$content = json_encode($settings, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
						// updateFile() only returns error messages.
						$msg = updateFile($settings_file, $content, "settings", true);
						if ($msg === "")
							$msg = "Settings saved";
						else
							$ok = false;
					}
				} else if ($newCameraType !== "") {
					$msg = "<b>Camera Type</b> changed to <b>$newCameraType</b>";
				} else {
					$msg = "No settings changed (file not updated)";
				}
			}

			// 'restart' is a checkbox: if check, it returns 'on', otherwise nothing.
			$doingRestart = getVariableOrDefault($_POST, 'restart', false);
			if ($doingRestart === "on") $doingRestart = true;

			if ($ok) {
				if ($changes !== "") {
					// This must run with different permissions so makeChanges.sh can
					// write to the allsky directory.
					if ($doingRestart)
						$restarting = "--restarting";
					else
						$restarting = "";
					$CMD = "sudo --user=" . ALLSKY_OWNER;
					$CMD .= " " . ALLSKY_SCRIPTS . "/makeChanges.sh $restarting $changes";
					# Let makeChanges.sh display any output
					echo '<script>console.log("Running: ' . $CMD . '");</script>';
					runCommand($CMD, "", "success");
				}

				if ($doingRestart) {
					$msg .= " and Allsky restarted.";
					// runCommand displays $msg.
					runCommand("sudo /bin/systemctl reload-or-restart allsky.service", $msg, "success");
				} else {
					$msg .= " but Allsky NOT restarted.";
					$status->addMessage($msg, 'info');
				}

			} else {	// not $ok
				if ($doingRestart)
					$msg = ", and Allsky NOT restarted.";
				if ($numErrors > 0) {
					$msg = "Settings NOT saved due to $numErrors errors$msg";
				}
				$status->addMessage($msg, 'danger');
			}
		} else {
			$status->addMessage('Unable to save settings - session timeout.', 'danger');
		}
	}

	if (isset($_POST['reset_settings'])) {
		if (CSRFValidate()) {
			$settings = array();
			foreach ($options_array as $option){
				$key = $option['name'];
				$value = getVariableOrDefault($option, 'default', null);
				if ($value !== null) $settings[$key] = $value;
			}
			$content = json_encode($settings, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK);
			$msg = updateFile($settings_file, $content, "settings", true);
			if ($msg === "")
				$status->addMessage("Settings reset to default", 'info');
			else
				$status->addMessage("Failed to reset settings: $msg", 'danger');
		} else {
			$status->addMessage('Unable to reset settings - session timeout', 'danger');
		}
	}

	// Determine if the advanced settings should always be shown.
	$settings_str = file_get_contents($settings_file, true);
	$settings_array = json_decode($settings_str, true);
	$cameraType = getVariableOrDefault($settings_array, $cameraTypeName, "");
	$cameraModel = getVariableOrDefault($settings_array, $cameraModelName, "");
	$initial_display = $settings_array['alwaysshowadvanced'] == 1 ? "table-row" : "none";

	check_if_configured($page, "settings");

if ($formReadonly != "readonly") {
	$settingsDescription = "";
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
<?php
}
?>
</script>
  <div class="row">
	<div class="col-lg-12">
		<div class="panel panel-primary">
<?php
	if ($formReadonly == "readonly") {
		$x = "(READ ONLY) &nbsp; &nbsp; ";
	} else {
		$x = "<i class='fa fa-camera fa-fw'></i>";
	}
?>
		<div class="panel-heading"><?php echo $x; ?> Allsky Settings for &nbsp; <b><?php echo "$cameraType $cameraModel"; ?></b></div>

		<div class="panel-body" style="padding: 5px;">
<?php if ($formReadonly != "readonly")
			echo "<p id='messages'>" . $status->showMessages() . "</p>";
?>

		<form method="POST" action="<?php echo $ME; ?>" name="conf_form">
		<input type="hidden" name="page" value="<?php echo "$page"; ?>">
		<input type="hidden" name="_ts" value="<?php echo time(); ?>">
		<?php CSRFToken();

		// Allow for "advanced" options that aren't displayed by default to avoid
		// confusing novice users.
		$numAdvanced = 0;
		$numMissing = 0;
		if ($formReadonly == "readonly") {
			$readonlyForm = "readonly disabled";	// covers both bases
		} else {
			$readonlyForm = "";
		}
		echo "<table border='0'>";
			foreach($options_array as $option) {
				// Should this setting be displayed?
				$display = getVariableOrDefault($option, 'display', true);
				if (! $display) continue;

				$minimum = getVariableOrDefault($option, 'minimum', "");
				$maximum = getVariableOrDefault($option, 'maximum', "");
				$advanced = getVariableOrDefault($option, 'advanced', 0);
				if ($advanced == 1) {
					$numAdvanced++;
					$advClass = "advanced";
					$advStyle = "display: $initial_display";
				} else {
					$advClass = "";
					$advStyle = "";
				}
				$label = getVariableOrDefault($option, 'label', "");
				$name = $option['name'];
				$default = getVariableOrDefault($option, 'default', "");
				$type = getVariableOrDefault($option, 'type', "");	// should be a type
				if ($type == "header") {
					$value = "";
				} else {
					$value = getVariableOrDefault($settings_array, $name, $default);
					$optional = getVariableOrDefault($option, 'optional', false);
					if ($value === "" && ! $optional) {
						$numMissing++;
						$optional_bg = "background-color: red";
						$optional_msg = "<span style='color: red'>This field cannot be empty.</span><br>";
					} else {
						$optional_bg = "";
						$optional_msg = "";
					}

					// Allow single quotes in values (for string values).
					// &apos; isn't supported by all browsers so use &#x27.
					$value = str_replace("'", "&#x27;", $value);
					$default = str_replace("'", "&#x27;", $default);
				}
				$description = getVariableOrDefault($option, 'description', "");
				// "widetext" should have the label spanning 2 rows,
				// a wide input box on the top row spanning the 2nd and 3rd columns,
				// and the description on the bottom row in the 3rd column.
				// This way, all descriptions are in the 3rd column.
				if ($type !== "widetext" && $type != "header") $class = "rowSeparator";
				else $class="";
				echo "\n";	// to make it easier to read web source when debugging

				// Put some space before and after headers.  This next line is the "before":
				if ($type == "header") {
					echo "<tr style='height: 10px'><td colspan='3'></td></tr>";
					echo "<td colspan='3' style='padding: 8px 0px;' class='settingsHeader'>$description</td>";
					echo "<tr class='rowSeparator' style='height: 10px'><td colspan='3'></td></tr>";
				} else {
					echo "<tr class='form-group $advClass $class' style='margin-bottom: 0px; $advStyle'>";
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
					}
					if ($default !== "")
						$popup = "Default=$default";
					else
						$popup = "";
					if ($minimum !== "") $popup .= "\nMinimum=$minimum";
					if ($maximum !== "") $popup .= "\nMaximum=$maximum";

					if ($type == "widetext") $span="rowspan='2'";
					else $span="";
					echo "<td $span valign='middle' style='padding: 2px 0px'>";
					echo "<label class='WebUISetting' style='padding-right: 3px;'>$label</label>";
					echo "</td>";

					if ($type == "widetext") {
						$span="colspan='2'";
						$style="padding: 5px 3px 7px 8px;";
					} else {
						$span="";
						// Less on top side to even out with drop-shadow on bottom.
						// Ditto for left side with shadow on right.
						$style="padding: 5px 5px 7px 8px;";
					}
					echo "<td $span valign='middle' style='$style' align='center'>";
					// The popup gets in the way of seeing the value a little.
					// May want to consider having a symbol next to the field
					// that has the popup.
					echo "<span title='$popup'>";
					if ($type == "text" || $type == "number" || $type == "readonly"){
						if ($type == "readonly") {
							$readonly = "readonly";
							$t = "text";
						} else {
							$readonly = "";
							// Browsers put the up/down arrows for numbers which moves the
							// numbers to the left, and they don't line up with text.
							// Plus, they don't accept decimal points in "number".
							if ($type == "number") $type = "text";
							$t = $type;
						}
						echo "<input $readonly class='form-control boxShadow settingInput' type='$t'" .
							" $readonlyForm name='$name' value='$value'" .
							" style='padding: 0px 3px 0px 0px; text-align: right; $optional_bg'>";
					} else if ($type == "widetext"){
						echo "<input class='form-control boxShadow' type='text'" .
							" $readonlyForm name='$name' value='$value'" .
						   	" style='padding: 6px 5px; $optional_bg'>";
					} else if ($type == "select"){
						echo "<select class='form-control boxShadow settingInput' name='$name' title='Select an item'" .
						   	" $readonlyForm style='text-align: right; padding: 0px 3px 0px 0px;'>";
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
						echo "<div class='switch-field boxShadow settingInput' style='margin-bottom: -3px; border-radius: 4px;'>";
							echo "<input id='switch_no_".$name."' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='0' ".
								($value == 0 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_no_".$name."'>No</label>";
							echo "<input id='switch_yes_".$name."' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='1' ".
								($value == 1 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_yes_".$name."'>Yes</label>";
						echo "</div>";
					}
					echo "</span>";

					// Track current values so we can determine what changed.
					if ($formReadonly != "readonly")
						echo "<input type='hidden' name='OLD_$name' value='$value'>";

					echo "</td>";
					if ($type == "widetext")
						echo "</tr><tr class='rowSeparator $advClass' style='$advStyle'><td></td>";
					echo "<td style='padding-left: 10px;'>$optional_msg$description</td>";
				}
				echo "</tr>";
			 }
		echo "</table>";

		if ($numMissing > 0 && $formReadonly != "readonly") {
			$msg = "ERROR: $numMissing required field" . ($numMissing === 1 ? " is" : "s are");
			$msg .= " missing - see highlighted fields below.";
			$status->addMessage($msg, 'danger');
		?>
			<script>
				var messages = document.getElementById("messages");
				// Call showMessages() with the 2nd (escape) argument of true so it escapes single quotes.
				// We then have to restore them so the html is correct.
				messages.innerHTML += '<?php $status->showMessages(true, true); ?>'.replace(/&apos;/g, "'");
			</script>
		<?php
		}

if ($formReadonly != "readonly") { ?>
	<div style="margin-top: 20px">
		<input type="submit" class="btn btn-primary" name="save_settings" value="Save changes">
		<input type="submit" class="btn btn-warning" name="reset_settings" value="Reset to default values" onclick="return confirm('Really RESET ALL VALUES TO DEFAULT??');">
		<button type="button" class="btn advanced btn-advanced" id="advButton" onclick="toggle_advanced();"><?php if ($initial_display == "none") echo "Show advanced options"; else echo "Hide advanced options"; ?></button>
		<div title="UNcheck to only save settings without restarting Allsky" style="line-height: 0.3em;"><br><input type="checkbox" name="restart" checked> Restart Allsky after saving changes?<br><br>&nbsp;</div>
	</div>
<?php } ?>
	</form>
</div><!-- ./ Panel body -->
</div><!-- /.panel-primary -->
</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}
?>
