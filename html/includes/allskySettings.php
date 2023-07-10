<?php

function DisplayAllskyConfig(){
	global $formReadonly, $settings_array;

	$cameraTypeName = "cameratype";		// json setting name
	$cameraModelName = "cameramodel";	// json setting name
	$cameraNumberName = "cameranumber";	// json setting name
	$debugLevelName = "debuglevel";		// json setting name
	$debugArg = "";

	global $lastChangedName;			// name of json setting
	global $lastChanged;
	global $page;
	global $ME;
	global $status;

	$settings_file = getSettingsFile();
	$options_file = getOptionsFile();

	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit;
	}

	if (isset($_POST['save_settings'])) {
		// If the user changed the camera type and anything else,
		// warn them and don't do anything.
		// If we went ahead and made the changes, we would be making them to the NEW
		// camera's settings file, but using values from the OLD file.
		if (CSRFValidate()) {
			$settings = array();
			$optional_array = array();
			$sources = array();
			$sourceFiles = array();
			$sourcesOLD = array();
			$changes = "";
			$otherChanges = "";

			$refreshingCameraType = false;
			$newCameraType = "";
			$newCameraModel = "";
			$newCameraNumber = "";

			$ok = true;

			// Keep track of optional settings and which settings are from a different source.
			foreach ($options_array as $option) {
				$n = $option['name'];
				$optional_array[$n] = getVariableOrDefault($option, 'optional', false);
				$s = getVariableOrDefault($option, 'source', null);
				$sourceFiles[$n] = ($s === null ? null : getFileName($s));
			}

	 		foreach ($_POST as $key => $newValue) {
				// Anything that's sent "hidden" in a form that isn't a settings needs to go here.
				if (in_array($key, ["csrf_token", "save_settings", "reset_settings", "restart", "page", "_ts", "XX_END_XX"]))
					continue;

				// We look into POST data to only select settings.
				// Because we are passing the changes enclosed in single quotes below,
				// we need to escape the single quotes, but I never figured out how to do that,
				// so convert them to HTML codes instead.
				$s = $sourceFiles[$key];
				if ($s !== null) {
					$oldValue = get_variable(getFileName($s), $key, "");
					$sourcesOLD[$key] = $oldValue;
				} else {
					$oldValue = getVariableOrDefault($settings_array, $key, "");
				}
				if ($oldValue !== "")
					$oldValue = str_replace("'", "&#x27", $oldValue);

				$thisChanged = false;
				if ($oldValue !== $newValue) {
echo "<br>$key: oldValue=$oldValue, new=<b>$newValue</b>" . ($s === null ? "" : " in $s");
					if ($key === $cameraTypeName) {
						if ($newValue === "Refresh") {
							// Refresh the same Camera Type
							$refreshingCameraType = true;
							$newCameraType = $oldValue;
							$newValue = $oldValue;
						} else {
							$newCameraType = $newValue;
						}
					} elseif ($key === $cameraModelName) {
						$newCameraModel = $newValue;
					} elseif ($key === $cameraNumberName) {
						$newCameraNumber = $newValue;
					} else {
						// want to know changes other than camera
						$thisChanged = true;
					}

					$checkchanges = false;
					foreach ($options_array as $option){
						if ($option['name'] === $key) {
							$optional = $optional_array[$key];
							if ($newValue !== "" || $optional) {
								$checkchanges = getVariableOrDefault($option, 'checkchanges', false);
								$label = getVariableOrDefault($option, 'label', "");
							}
							break;
						}
					}

					if ($checkchanges) {		// Changes for makeChanges.sh to check
						$changes .= "  '$key' '$label' '$oldValue' '$newValue'";
					}

					if ($thisChanged) {
						if ($otherChanges === "")
							$otherChanges = "[$label]";
						else
							$otherChanges .= ", $label";
					}
				}

				// Check for empty non-optional settings and valid numbers.
				$span = "span class='WebUISetting'";
				$spanValue = "span class='WebUIValue'";
				foreach ($options_array as $option) {
					if ($option['name'] === $key) {
						$type = getVariableOrDefault($option, 'type', null);
						$lab = $option['label'];

						if ($newValue == "" && ! $optional_array[$key]) {
							$msg = "<$span>$lab</span> is empty";
							$status->addMessage($msg, 'danger', false);
							$ok = false;

						} else if ($type !== null && $newValue != "") {
							$msg = "";
							// $newValue will be of type string, even if it's actually a number,
							// and only is_numeric() accounts for types of string.
							if ($type === "integer" || $type == "percent") {
								if (! is_numeric($newValue) || ! is_int($newValue + 0))
									$msg = "without a fraction";
							} else if ($type === "float") {
								if (! is_numeric($newValue) || ! is_float($newValue + 0.0))
									$msg = "with, or without, a fraction";
							}
							if ($msg !== "") {
								$msg2 = "<$span>$lab</span> must be a number $msg.";
								$msg2 .= " You entered: <$spanValue>$newValue</span>";
								$status->addMessage($msg2, 'danger', false);
								$ok = false;
							}
						}
					}
				}

				if ($ok) {
					$n = str_replace("'", "&#x27", $newValue);
					if ($sourceFiles[$key] !== null) {
						$sources[$key] = $n;
					} else {
						$settings[$key] = $n;
					}

					if ($key === $debugLevelName && $newValue >= 4) {
						$debugArg = "--debug";
					}
				}
			}

			$msg = "";
			if ($ok) {
				if ($otherChanges !== "" || $lastChanged === "") {
					if ($newCameraType !== "" || $newCameraModel !== "" || $newCameraNumber != "") {
						$msg = "If you change <b>Camera Type</b>, <b>Camera Model</b>,";
						$msg .= " or <b>Camera Number</b>  you cannot change anything else.";
						$msg .= "<br>You also changed: $otherChanges.";
						$status->addMessage($msg, 'danger', false);
						$ok = false;
					} else {
						// Keep track of the last time the file changed.
						// If we end up not updating the file this will be ignored.
						$lastChanged = date('Y-m-d H:i:s');
						$settings[$lastChangedName] = $lastChanged;
						$content = json_encode($settings, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
						// updateFile() only returns error messages.
						$msg = updateFile($settings_file, $content, "settings", true);
						if ($msg === "") {
							$msg = "Settings saved";

							// Now save the settings from the source files that changed.
							foreach ($sources as $key => $newValue) {
								$oldValue = $sourcesOLD[$key];
								if ($oldValue == $newValue) continue;
								set_variable($sourceFiles[$key], $key, $newValue, $oldValue);
							}
						} else {
							$ok = false;
						}

					}
				} else {
					if ($newCameraType !== "") {
						if ($refreshingCameraType)
							$msg .= "<b>Camera Type</b> $newCameraType refreshed";
						else
							$msg .= "<b>Camera Type</b> changed to <b>$newCameraType</b>";
					}
					if ($newCameraModel !== "") {
						if ($msg !== "") $msg = "<br>$msg";
						$msg .= "<b>Camera Model</b> changed to <b>$newCameraModel</b>";
					}
					if ($newCameraNumber !== "") {
						if ($msg !== "") $msg = "<br>$msg";
						$msg .= "<b>Camera Number</b> changed to <b>$newCameraNumber</b>";
					}

					if ($msg === "")
						$msg = "No settings changed (but timestamp updated)";
				}
			}

			if ($ok) {
				// 'restart' is a checkbox: if check, it returns 'on', otherwise nothing.
				$doingRestart = getVariableOrDefault($_POST, 'restart', false);
				if ($doingRestart === "on") $doingRestart = true;

				if ($changes !== "") {
					// This must run with different permissions so makeChanges.sh can
					// write to the allsky directory.
					$moreArgs = "";
					if ($doingRestart)
						$moreArgs .= " --restarting";
					if ($newCameraType !== "") {
						$moreArgs .= " --cameraTypeOnly";
					}

					$CMD = "sudo --user=" . ALLSKY_OWNER;
					$CMD .= " " . ALLSKY_SCRIPTS . "/makeChanges.sh $debugArg $moreArgs $changes";
					# Let makeChanges.sh display any output
					echo '<script>console.log("Running: ' . $CMD . '");</script>';
					// false = don't add anything to the message
					$ok = runCommand($CMD, "", "success", false);
				}

				if ($ok) {
					if ($doingRestart) {
						$msg .= " and Allsky restarted.";
						// runCommand displays $msg.
						runCommand("sudo /bin/systemctl reload-or-restart allsky.service", $msg, "success");
					} else {
						$msg .= "; Allsky NOT restarted.";
						$status->addMessage($msg, 'info');
					}
				}

			} else {	// not $ok
				$status->addMessage("Settings NOT saved due to errors above.", 'info', false);
			}
		} else {
			$status->addMessage('Unable to save settings - session timeout.', 'danger');
		}
	}

	if (isset($_POST['reset_settings'])) {
		if (CSRFValidate()) {
			$settings = array();
			$sources = array();
			$sourceFiles = array();
			foreach ($options_array as $option){
				$key = $option['name'];
				$newValue = getVariableOrDefault($option, 'default', null);
				if ($newValue !== null) {
					$s = getVariableOrDefault($option, 'source', "");
					if ($s !== "") {
						$sourceFiles[$n] = getFileName($s);
						$sources[$n] = $newValue;
					} else {
						$settings[$key] = $newValue;
					}
				}
			}
			$content = json_encode($settings, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK);
			$msg = updateFile($settings_file, $content, "settings", true);
			if ($msg === "") {
				$status->addMessage("Settings reset to default", 'info');

				foreach($sources as $key => $newValue) {
					$file = $sourceFiles[$key];
					$oldValue = get_variable(getFileName($file), $key, "");
					set_variable($file, $key, $newValue, $oldValue);
				}
			} else {
				$status->addMessage("Failed to reset settings: $msg", 'danger');
			}
		} else {
			$status->addMessage('Unable to reset settings - session timeout', 'danger');
		}
	}

	// If the settings file changed above, re-read the file.
	if (isset($_POST['save_settings']) || isset($_POST['reset_settings'])) {
		$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
		$settings_array = get_decoded_json_file($settings_file, true, $errorMsg);
		if ($settings_array === null) {
			exit;
		}
	}

	$cameraType = getVariableOrDefault($settings_array, $cameraTypeName, "");
	$cameraModel = getVariableOrDefault($settings_array, $cameraModelName, "");
	// Determine if the advanced settings should always be shown.
	$alwaysShowAdvanced = getVariableOrDefault($settings_array, 'alwaysshowadvanced', 0);
	$initial_display = $alwaysShowAdvanced == 1 ? "table-row" : "none";

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

		<form method="POST" action="<?php echo "$ME?_ts=" . time(); ?>" name="conf_form">

<?php
if ($formReadonly != "readonly") { ?>
	<div class="sticky">
		<input type="submit" class="btn btn-primary" name="save_settings" value="Save changes">
		<input type="submit" class="btn btn-warning" name="reset_settings"
			value="Reset to default values"
			onclick="return confirm('Really RESET ALL VALUES TO DEFAULT??');">
		<button type="button" class="btn advanced btn-advanced" id="advButton"
			onclick="toggle_advanced();">
			<?php if ($initial_display == "none") echo "Show advanced options"; else echo "Hide advanced options"; ?>
		</button>
		<div title="UNcheck to only save settings without restarting Allsky" style="line-height: 0.3em;">
			<br>
			<input type="checkbox" name="restart" checked> Restart Allsky after saving changes?
			<br><br>&nbsp;
		</div>
	</div>
	<button onclick="topFunction(); return false;" id="backToTopBtn" title="Go to top of page">Top</button>
<?php } ?>

		<input type="hidden" name="page" value="<?php echo "$page"; ?>">
		<?php CSRFToken();

		if ($formReadonly == "readonly") {
			$readonlyForm = "readonly disabled";	// covers both bases
		} else {
			$readonlyForm = "";
		}

		// Allow for "advanced" options that aren't displayed by default to avoid
		// confusing novice users.
		$numAdvanced = 0;
		$numMissing = 0;
		$numMissingHasDefault = 0;
		$missingSettingsHasDefault = "";
		$missingSettings = "";
		echo "<table border='0'>";
			foreach($options_array as $option) {
				$name = $option['name'];
				$type = getVariableOrDefault($option, 'type', "");	// should be a type

				$isHeader = substr($type, 0, 6) === "header";
				if ($isHeader) {
					$value = "";
					$OLDvalue = "";
					$default = "";
				} else {
					$default = getVariableOrDefault($option, 'default', "");
					if ($default !== "")
						$default = str_replace("'", "&#x27;", $default);

					$s = getVariableOrDefault($option, 'source', "");
					if ($s !== "") {
						$value = get_variable(getFileName($s), $name, $default);
					} else {
						$value = getVariableOrDefault($settings_array, $name, $default);
					}

					// Allow single quotes in values (for string values).
					// &apos; isn't supported by all browsers so use &#x27.
					$value = str_replace("'", "&#x27;", $value);
					$OLDvalue = $value;
				}

				// Should this setting be displayed?
				$display = getVariableOrDefault($option, 'display', true);
				if (! $display && ! $isHeader) {
					if ($formReadonly != "readonly") {
						// Don't display it, but if it has a value, pass it on.
						echo "\n\t<!-- NOT DISPLAYED -->";
						echo "<input type='hidden' name='$name' value='$value'>";
					}
					continue;
				}

				$minimum = getVariableOrDefault($option, 'minimum', "");
				$maximum = getVariableOrDefault($option, 'maximum', "");
				$advanced = getVariableOrDefault($option, 'advanced', 0);
				if ($advanced == 1) {
					$numAdvanced++;
					$advClass = "advanced";
					$advStyle = "display: $initial_display;";
				} else {
					$advClass = "";
					$advStyle = "";
				}

				$label = getVariableOrDefault($option, 'label', "");

				if (! $isHeader) {
					$optional = getVariableOrDefault($option, 'optional', false);
					if ($value === "" && ! $optional) {
						if ($default === "") {
							$numMissing++;
							if ($missingSettings == "") {
								$missingSettings = "$label";
							} else {
								$missingSettings .= ", $label";
							}
							$warning_class = "alert-danger";
							$warning_msg = "<span style='color: red'>This field cannot be empty.</span><br>";
						} else {
							// Use the default but let the user know.
							$value = $default;
							$numMissingHasDefault++;
							if ($missingSettingsHasDefault == "") {
								$missingSettingsHasDefault = "$label";
							} else {
								$missingSettingsHasDefault .= ", $label";
							}
							$warning_class = "alert-danger";
							$warning_msg = "<span style='color: red'>This field was empty but set to default.</span><br>";
						}
					} else {
						$warning_class = "";
						$warning_msg = "";
					}
				}

				$description = getVariableOrDefault($option, 'description', "");

				// "widetext" should have the label spanning 2 rows,
				// a wide input box on the top row spanning the 2nd and 3rd columns,
				// and the description on the bottom row in the 3rd column.
				// This way, all descriptions are in the 3rd column.
				if ($type !== "widetext" && ! $isHeader) $class = "rowSeparator";
				else $class="";
				echo "\n";	// to make it easier to read web source when debugging

				// Put some space before and after headers.  This next line is the "before":
				if ($type == "header-tab") {
// TODO
					echo "<tr class='$advClass advanced-nocolor' style='$advStyle height: 10px; color: red; font-size: 125%'>";
						echo "<td colspan='3' align='center'>[[[ <b>$label</b> tab goes here ]]]</td>";
					echo "</tr>";
					continue;

				} else if ($type == "header") {
					// Not sure how to display the header with a background color with 10px
					// of white above and below it using only one <tr>.
					echo "<tr class='$advClass advanced-nocolor' style='$advStyle height: 10px;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					echo "\n\t<tr class='$advClass advanced-nocolor rowSeparator' style='$advStyle'>";
						echo "<td colspan='3' class='settingsHeader'>$label</td>";
					echo "</tr>";
					echo "\n\t<tr class='$advClass advanced-nocolor rowSeparator' style='$advStyle height: 10px;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					continue;

				} else if ($type == "header-sub") {
					echo "<tr class='$advClass advanced-nocolor' style='$advStyle height: 5x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					echo "\n\t<tr class='$advClass advanced-nocolor style='$advStyle'>";
						echo "<td colspan='3' class='subSettingsHeader'><div>$label</div></td>";
					echo "</tr>";
					echo "\n\t<tr class='$advClass advanced-nocolor rowSeparator' style='$advStyle height: 5x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					continue;

				} else if ($type == "header-column") {
					echo "<tr  style='height: 10x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					echo "<tr class='columnHeader'>";
						$columns = explode(",", $label);
						foreach ($columns as $col) {
							echo "<td style='margin: 0;'>$col</td>";
						}
					echo "</tr>";
					echo "<tr class='rowSeparator' style='height: 10x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					continue;

				} else {
					echo "<tr class='form-group $advClass $class $warning_class' style='margin-bottom: 0px; $advStyle'>";
					// Show the default in a popup
					if ($type == "boolean") {
						if ($default == "0") $default = "No";
						else $default = "Yes";

					} elseif ($type == "select") {
						foreach($option['options'] as $opt) {
							$val = getVariableOrDefault($opt, 'value', "?");
							if ($val != $default) continue;
							$default = $opt['label'];
							break;
						}
					}
					$popup = "";
					if ($default !== "") $popup .= "Default=$default";
					if ($minimum !== "") $popup .= "\nMinimum=$minimum";
					if ($maximum !== "") $popup .= "\nMaximum=$maximum";

					$rspan="";
					$cspan="";

					if ($type == "integer" || $type == "percent") {
						$popup .= "\nWhole numbers only";
					} else if ($type == "float") {
						$popup .= "\nFractions allowed";
					} else if ($type == "widetext") {
						$rspan="rowspan='2'";
						$cspan="colspan='2'";
					}
					echo "\n\t<td $rspan valign='middle' style='padding: 2px 0px'>";
						echo "<label class='WebUISetting' style='padding-right: 3px;'>$label</label>";
					echo "</td>";

					if ($type == "widetext") {
						$style="padding: 5px 3px 7px 8px;";
					} else {
						// Less on top side to even out with drop-shadow on bottom.
						// Ditto for left side with shadow on right.
						$style="padding: 5px 5px 7px 8px;";
					}

					echo "\n\t<td $cspan valign='middle' style='$style' align='center'>";
					// The popup gets in the way of seeing the value a little.
					// May want to consider having a symbol next to the field
					// that has the popup.
					echo "<span title='$popup'>";
// TODO: add percent sign for "percent"
					if (in_array($type, ["text", "password", "integer", "float", "percent", "readonly"])) {
						if ($type == "readonly") {
							$readonly = "readonly";
							$t = "text";

						} else {
							$readonly = "";
							// Browsers put the up/down arrows for numbers which moves the
							// numbers to the left, and they don't line up with text.
							// Plus, they don't accept decimal points in "float".
							if ($type == "integer" || $type == "float" || $type == "percent")
								$type = "text";
							$t = $type;
						}
						echo "\n\t\t<input $readonly class='form-control boxShadow settingInput ' type='$t'" .
							" $readonlyForm name='$name' value='$value'" .
							" style='padding: 0px 3px 0px 0px; text-align: right;' >";

					} else if ($type == "widetext"){
						echo "\n\t\t<input class='form-control boxShadow' type='text'" .
							" $readonlyForm name='$name' value='$value'" .
						   	" style='padding: 6px 5px;'>";

					} else if ($type == "select"){
						echo "\n\t\t<select class='form-control boxShadow settingInput'" .
							" $readonlyForm name='$name' title='Select an item'" .
						   	" style='padding: 0px 3px 0px 0px; text-align: right;'>";
						foreach($option['options'] as $opt){
							$val = getVariableOrDefault($opt, 'value', "?");
							$lab = getVariableOrDefault($opt, 'label', "?");
							if ($value == $val){
								echo "<option value='$val' selected>$lab</option>";
							} else {
								echo "<option value='$val'>$lab</option>";
							}
						}
						echo "</select>";

					} else if ($type == "boolean"){
						echo "\n\t\t<div class='switch-field boxShadow settingInput' style='margin-bottom: -3px; border-radius: 4px;'>";
							echo "\n\t\t<input id='switch_no_".$name."' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='0' ".
								($value == 0 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_no_".$name."'>No</label>";
							echo "\n\t\t<input id='switch_yes_".$name."' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='1' ".
								($value == 1 ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_yes_".$name."'>Yes</label>";
						echo "</div>";
					}
					echo "</span>";
					echo "\n\t</td>";

					if ($type == "widetext") {
						echo "\n</tr>";
						echo "\n<tr class='rowSeparator $advClass' style='$advStyle'>";
							echo "\n\t<td></td>";
					}
$popupYesNo = getVariableOrDefault($option, 'popup-yesno', "");
if ($popupYesNo !== "") {
	$popupYesNoValue = getVariableOrDefault($option, 'popup-yesno-value', "");
	$description .= "<br><span style='color: red;'>If value changes to '$popupYesNoValue' then ask '$popupYesNo'</span>";
}
					echo "\n\t<td style='padding-left: 10px;'>$warning_msg$description</td>";

					echo "\n</tr>";
				}
			 }
		echo "</table>";

		$needToShowMessages = false;
		if ($numMissing > 0 && $formReadonly != "readonly") {
			$needToShowMessages = true;
			$msg = "ERROR: $numMissing required field" . ($numMissing === 1 ? " is" : "s are");
			$msg .= " missing (<strong>$missingSettings</strong>) - see highlighted entries below.";
			$status->addMessage($msg, 'danger');
		}
		if ($numMissingHasDefault > 0 && $formReadonly != "readonly") {
			$needToShowMessages = true;
			$msg = "WARNING: $numMissingHasDefault required field" . ($numMissingHasDefault === 1 ? " is" : "s are");
			$msg .= " missing (<strong>$missingSettingsHasDefault</strong>) but replaced by the default - see highlighted entries below. You MUST click the 'Save changes' button below.";
			$status->addMessage($msg, 'danger');
		}
		if ($needToShowMessages) {
		?>
			<script>
				var messages = document.getElementById("messages");
				// Call showMessages() with the 2nd (escape) argument of true so it escapes single quotes.
				// We then have to restore them so the html is correct.
				messages.innerHTML += '<?php $status->showMessages(true, true); ?>'.replace(/&apos;/g, "'");
			</script>
		<?php
		} 
		?>

	</form>
</div><!-- ./ Panel body -->
</div><!-- /.panel-primary -->
</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}
?>
