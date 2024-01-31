<?php

// Get the json for the given file "f" if we haven't already and return a pointer to the data.
function &getSourceArray($f) {
	global $status;
	static $filesContents = array();

	$fileName = getFileName($f);
	if ($fileName == "") {
		$errorMsg = "Unable to get file name for '$f'. Some settings will not work.";
		$status->addMessage($msg, 'danger', false);
		return ("");
	}
	if (! isset($filesContents[$fileName])) {
		$errorMsg = "Unable to read source file '$fileName'";
		$filesContents[$fileName] = get_decoded_json_file($fileName, true, $errorMsg);
		if ($filesContents[$fileName] === null) {
			$msg = "Unable to get json contents of '$fileName' ($f).";
			$status->addMessage($msg, 'danger', false);
		}
	}
	return $filesContents[$fileName];
}

// Return "true" or "false" if $b is a boolean, depending on the value.
// This is used when outputing a boolean.
function toString($b) {
	if (gettype($b) == "boolean") {
		if ($b) return("true");
		return("false");
	}
	return($b);
}

// Error checking functions.
function formatSettingName($name) {
	return("<span class='WebUISetting'>$name</span>");
}
function formatSettingValue($value) {
	return("<span class='WebUIValue'>$value</span>");
}

function checkType($fieldName, $value, $old, $label, $type, &$shortened=null) {
	global $status;

	if ($type === null || $value == "") {
		return("");
	}

	$msg = "";

	// $value will be of type string, even if it's actually a number
	// or a boolean, and only is_numeric() accounts for types of string.
	if ($type === "integer" || $type === "percent") {
		if (! is_numeric($value) || ! is_int($value + 0))
			$msg = "without a fraction";
		else
			$value += 0;
	} else if ($type === "float") {
		if (! is_numeric($value) || ! is_float($value + 0.0))
			$msg = "with, or without, a fraction";
		else
			$value += 0.0;
	}
	if ($msg !== "") {
		$msg = "must be a number $msg.";
		$shortened .= "It $msg";
		if ($value === $old) {
			$msg .= " The saved value is: ";
			$msg .= formatSettingValue($value);
		} else {
			$msg .= " You entered: ";
			$msg .= formatSettingValue($value);
		}

		if (substr($fieldName, 0, 3) === "day") $label = "Daytime $label";
		else if (substr($fieldName, 0, 5) == "night") $label = "Nighttime $label";
		return(formatSettingName($label) . " $msg");
	}

	return("");
}

// ============================================= The main function.
function DisplayAllskyConfig() {
	global $formReadonly, $settings_array;

	$END = "XX_END_XX";
	$debug = false;
	$cameraTypeName = "cameratype";			// json setting name
	$cameraModelName = "cameramodel";		// json setting name
	$cameraNumberName = "cameranumber";		// json setting name
	$debugLevelName = "debuglevel";			// json setting name
	$debugArg = "";
	$hideHeaderBodies = true;
	$numErrors = 0;
	$updatedSettings = false;
	$bullet = "<div class='bullet'>*</div>";
	$showIcon = "<i class='fa fa-chevron-down fa-fw'></i>";
	$hideIcon = "<i class='fa fa-chevron-up fa-fw'></i>";

	global $lastChangedName;				// name of json setting
	global $lastChanged;
	global $page;
	global $ME;
	global $status;

	$settings_file = getSettingsFile();
	$options_file = getOptionsFile();
	$mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;

	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit;
	}

	// If there's no last changed date, they haven't configured Allsky,
	// which sets $lastChanged.
	$needsConfiguration = ($lastChanged == "");
	if ($needsConfiguration)
		$hideHeaderBodies = false;		// show all the settings

	$error_array = array();
	$error_array_short = array();
	$error_array_source = array();

	// Keep track of required settings and the type of every setting.
	// This will be used to check for errors.
	$optional_array = array();
	$type_array = array();
	foreach ($options_array as $option) {
		$name = $option['name'];
		$optional_array[$name] = toBool(getVariableOrDefault($option, 'optional', "false"));
		$type_array[$name] = getVariableOrDefault($option, 'type', "");
	}

	if (isset($_POST['save_settings'])) {
		// If the user changed the camera type and anything else,
		// warn them and don't do anything.
		// If we went ahead and made the changes, we would be making them to the NEW
		// camera's settings file, but using values from the OLD file.
		if (CSRFValidate()) {
			$sourceFiles = array();			// list of files in the "source" field
			$sourceFilesContents = array();	// contents of each sourceFiles file
			$changes = "";
			$nonCameraChanges = "";
			$restartRequired = false;
			$cameraChanged = false;
			$refreshingCameraType = false;
			$newCameraType = "";
			$newCameraModel = "";
			$newCameraNumber = "";
			$twilightDataChanged = false;

			// If set, the prior screen said "you must configure Allsky ..." so it's
			// ok if nothing changed, but we need to update $lastChanged.
			$fromConfiguration = isset($_POST['fromConfiguration']);

			$ok = true;

			// Keep track of which settings are from a different source.
			foreach ($options_array as $option) {
				$name = $option['name'];
				$s = getVariableOrDefault($option, 'source', null);
				if ($s !== null) {
					$fileName = getFileName($s);
					$sourceFiles[$name] = $fileName;
					$sourceFilesContents[$name] = &getSourceArray($fileName);
				}
			}

			$numSettingsChanges = 0;
			$numSourceChanges = 0;
			$nonCameraChangesExist = false;

	 		foreach ($_POST as $name => $newValue) {
				// Anything that's sent "hidden" in a form that isn't a settings needs to go here.
				if (in_array($name, ["csrf_token", "save_settings", "reset_settings", "restart", "page", "_ts", $END, "fromConfiguration"])) {
					continue;
				}

				// We look into POST data to only select settings.
				// Because we are passing the changes enclosed in single quotes below,
				// we need to escape the single quotes, but I never figured out how to do that,
				// so convert them to HTML codes instead.
				$source_array = getVariableOrDefault($sourceFilesContents, $name, null);
				if ($source_array !== null) {
					$oldValue = getVariableOrDefault($source_array, $name, "");
					$isSettingsField = false;
				} else {
					$oldValue = getVariableOrDefault($settings_array, $name, "");
					$isSettingsField = true;		// this field is in the settings file.
				}

				// Check for empty non-optional settings and valid numbers.
				foreach ($options_array as $option) {
					if ($option['name'] === $name) {
						$shortMsg = "";
//x echo "<br>=== Checking $name: oldValue=$oldValue, newValue=$newValue, type=${type_array[$name]}";
						$e = checkType($name,
								$newValue,
								$oldValue,
								$option['label'],
								$type_array[$name],
								$shortMsg);
						if ($e != "") {
//x echo "<br>&nbsp; &nbsp; &nbsp; e=$e, shortMsg=$shortMsg";
							$ok = false;
							$numErrors++;
							$error_array[$name] = $e;
							$error_array_short[$name] = $shortMsg;
							if ($oldValue === $newValue)		// where did the error come from?
								$error_array_source[$name] = "db";
							else
								$error_array_source[$name] = "user";

							if ($oldValue !== $newValue) {
								// Set to $newValue so the user sees the bad value.
								$settings_array[$name] = $newValue;
							}
						}
					}
				}

				if ($oldValue !== "")
					$oldValue = str_replace("'", "&#x27", $oldValue);
				if ($newValue !== "")
					$newValue = str_replace("'", "&#x27", $newValue);

				if ($oldValue !== $newValue) {
					$nonCameraChangesExist = false;
					if ($isSettingsField) $numSettingsChanges++;
					else $numSourceChanges++;

					if ($name === $cameraTypeName) {
						$cameraChanged = true;
						if ($newValue === "Refresh") {
							// Refresh the same Camera Type
							$refreshingCameraType = true;
							$newCameraType = $oldValue;
							$newValue = $oldValue;
						} else {
							$newCameraType = $newValue;
						}
					} elseif ($name === $cameraModelName) {
						$cameraChanged = true;
						$newCameraModel = $newValue;
					} elseif ($name === $cameraNumberName) {
						$cameraChanged = true;
						$newCameraNumber = $newValue;
					} elseif ($name === "latitude" ||
							  $name === "longitude" ||
							  $name === "angle" ||
							  $name === "takedaytimeimages") {
						$twilightDataChanged = $newValue;
					} else {
						// want to know changes other than camera
						$nonCameraChangesExist = true;
					}

					$checkchanges = false;
					$label = "??";
					foreach ($options_array as $option){
						if ($option['name'] === $name) {
							$optional = $optional_array[$name];
							if ($newValue !== "" || $optional) {
								$checkchanges = toBool(getVariableOrDefault($option, 'checkchanges', "false"));
								$label = getVariableOrDefault($option, 'label', "");
							}
							break;
						}
					}

					if ($checkchanges) {		// Changes for makeChanges.sh to check
						$changes .= "  '$name' '$label' '$oldValue' '$newValue'";
					}

					if ($nonCameraChangesExist) {
						if ($nonCameraChanges === "")
							$nonCameraChanges = "<b>$label</b>";
						else
							$nonCameraChanges .= ", <b>$label</b>";
						$nonCameraChanges .= " (from '$oldValue' to '$newValue')";
					}
				}

				if ($ok && ($numSettingsChanges > 0 || $numSourceChanges > 0)) {
					// Update the appropriate array with the new value.
					if ($newValue === "true") {
						$newValue = true;
						$s_newValue = "true";
					} else if ($newValue === "false") {
						$newValue = false;
						$s_newValue = "false";
					} else {
						// Don't do unless needed - str_replace() changes non-strings like numbers to strings.
						if (strpos($newValue, "'") !== false)
							$newValue = str_replace("'", "&#x27", $newValue);
						$s_newValue = $newValue;
					}

					if (isset($sourceFilesContents[$name])) {
if ($debug) {
	$s = toString($sourceFileContents[$name][$name]);
	echo "<br>sourceFilesContent[$name][$name] = $s, newValue=$s_newValue";
}
						$sourceFilesContents[$name][$name] = $newValue;
						$fileName = $sourceFiles[$name];
						$sourceFilesChanged[$fileName] = $fileName;
					} else {
if ($debug) {
	$s = toString($settings_array[$name]);
	if ($s != $s_newValue) { echo "<br><br>settings_array[$name] = $s, newValue=$s_newValue"; }
}

						$settings_array[$name] = $newValue;

if ($debug && $s != $s_newValue) {
	echo "<br><pre>====== settings_array['height'] now:<br>";
	var_dump($settings_array['height']);
	echo "</pre>";
}
					}

					if ($name === $debugLevelName && $newValue >= 4) {
						$debugArg = "--debug";
					}
				}
			}

			$msg = "";
			if ( $ok && ($numSettingsChanges > 0 || $numSourceChanges > 0 || $fromConfiguration) ) {
				if ($nonCameraChangesExist || $fromConfiguration) {
					if ($newCameraType !== "" || $newCameraModel !== "" || $newCameraNumber != "") {
						$msg = "If you change <b>Camera Type</b>, <b>Camera Model</b>,";
						$msg .= " or <b>Camera Number</b>  you cannot change anything else.";
						$msg .= "<br>You also changed: $nonCameraChanges.";
						$status->addMessage($msg, 'danger', false);
						$ok = false;
					} else {
						if ($numSettingsChanges > 0 || $fromConfiguration) {
							// Keep track of the last time the file changed.
							// If we end up not updating the file this will be ignored.
							$lastChanged = date('Y-m-d H:i:s');
							$settings_array[$lastChangedName] = $lastChanged;
							if ($fromConfiguration)
								unset($settings_array[$END]);
							$content = json_encode($settings_array, $mode);
if ($debug) {
	echo "<br><br>Updating settings_file $settings_file, # changes = $numSettingsChanges";
	echo "<pre>"; var_dump($content); echo "</pre>";
	$msg = "";
}
							// updateFile() only returns error messages.
							$msg = updateFile($settings_file, $content, "settings", true);
							if ($msg === "") {
								if ($numSettingsChanges > 0 || $numSourceChanges > 0)
									$msg = "Settings saved";
								else	# configuration needed and not changes made.
									$msg = "Configuration saved and timestamp updated";
								$needsConfiguration = false;
								$updatedSettings = true;
							} else {
								$status->addMessage("Failed to update settings in '$settings_file': $msg", 'danger');
								$ok = false;
							}
						}
						if ($ok && $numSourceChanges > 0) {
							// Now save the settings from the source files that changed.
							foreach($sourceFilesChanged as $fileName) {
								$content = json_encode(getSourceArray($fileName), $mode);
if ($debug) { echo "<br>Updating fileName $fileName, # changes=$numSourceChanges"; }
if ($debug) { echo "<pre>"; var_dump($content); echo "</pre>"; }
								$msg = updateFile($fileName, $content, "source_settings", true);
								if ($msg === "") {
									$msg = "Settings saved";
								} else {
									$status->addMessage("Failed to update settings in '$fileName': $msg", 'danger');
									$ok = false;
								}
							}
						}
					}
				} else {
					if ($newCameraType !== "") {
						if ($msg !== "") $msg = "<br>$msg";
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
				// See if we need to restart Allsky.
// TODO: allow some way to force a restart?
				if ($restartRequired) {
					// The "restart" field is a checkbox.
					// If checked, it returns 'on', otherwise nothing.
					$doingRestart = toBool(getVariableOrDefault($_POST, 'restart', "false"));
					if ($doingRestart === "on") $doingRestart = true;
				} else {
					$doingRestart = false;
				}

				if ($numSettingsChanges == 0 && $numSourceChanges == 0 && ! $fromConfiguration) {
					$msg = "No settings changed";
				} else if ($changes !== "") {
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
					} else if (! $restartRequired) {
						$msg .= "; Allsky NOT restarted - no changes required it.";
						$status->addMessage($msg, 'info');
					} else {
						$msg .= "; Allsky NOT restarted.";
						$status->addMessage($msg, 'info');
					}

					// If there's a website let it know of the changes.
// TODO: run only if there's a local or remote website
					if (true) {
						$moreArgs = "";
						if (! $twilightDataChanged)
							$moreArgs .= " --settingsOnly";
						if (! $cameraChanged)
							$moreArgs .= " --allFiles";
						$CMD = ALLSKY_SCRIPTS . "/postData.sh $debugArg $moreArgs";
						echo '<script>console.log("Running: ' . $CMD . '");</script>';
//						$worked = runCommand($CMD, "", "success", false);
						// postData.sh will output necessary messages.
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
			$settings_array = array();
			$sourceFilesChanged = array();
			$sourceFilesContents = array();
			foreach ($options_array as $option){
				$name = $option['name'];
				$newValue = getVariableOrDefault($option, 'default', null);
				if ($newValue !== null) {
					$s = getVariableOrDefault($option, 'source', null);
					if ($s !== null) {
						$fileName = getFileName($s);
						$sourceFilesChanged[$fileName] = $fileName;
						$sourceFilesContents[$name] = &getSourceArray($fileName);
						$sourceFilesContents[$name][$name] = $newValue;
					} else {
						$settings_array[$name] = $newValue;
					}
				}
			}
			$content = json_encode($settings_array, $mode);
			$msg = updateFile($settings_file, $content, "settings", true);
			if ($msg === "") {
				$status->addMessage("Settings reset to default", 'info');
				$updatedSettings = true;

				foreach($sourceFilesChanged as $fileName) {
					$content = json_encode(getSourceArray($fileName), $mode);
					$msg = updateFile($fileName, $content, "source_settings", true);
					if ($msg !== "") {
						$status->addMessage("Failed to reset settings in '$fileName': $msg", 'danger');
					}
				}
			} else {
				$status->addMessage("Failed to reset settings: $msg", 'danger');
			}
		} else {
			$status->addMessage('Unable to reset settings - session timeout', 'danger');
		}
	}

	// If the settings file changed above, re-read the file.
	// Also, if $settings_array is null it means we're being called from the Allsky Website,
	// so read the file.
	if ($updatedSettings || $settings_array === null) {
		$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
		$settings_array = get_decoded_json_file($settings_file, true, $errorMsg);
		if ($settings_array === null) {
			exit;
		}
	}

	$cameraType = getVariableOrDefault($settings_array, $cameraTypeName, "");
	$cameraModel = getVariableOrDefault($settings_array, $cameraModelName, "");

	if (! check_if_configured($page, "settings")) $needToDisplayMessages = true;

if ($formReadonly != "readonly") {
	$settingsDescription = "";
}
?>

<div class="row"> <div class="col-lg-12"> <div class="panel panel-primary">
<?php
	if ($formReadonly == "readonly") {
		$x = "(READ ONLY) &nbsp; &nbsp; ";
	} else {
		$x = "<i class='fa fa-camera fa-fw'></i> ";
	}
	echo "<div class='panel-heading'>$x Allsky Settings for &nbsp; <b>$cameraType $cameraModel</b></div>";
	echo "<div class='panel-body' style='padding: 5px;'>";
		if ($formReadonly != "readonly")
			echo "<p id='messages'>";
				if ($status->isMessage()) echo $status->showMessages();
			echo "</p>";
		echo "<form method='POST' action='$ME?_ts=" . time() . " name='conf_form'>";
if ($formReadonly != "readonly") { ?>
		<div class="sticky">
			<input type="submit" class="btn btn-primary" name="save_settings" value="Save changes">
			<input type="submit" class="btn btn-warning" name="reset_settings"
				value="Reset to default values"
				onclick="return confirm('Really RESET ALL VALUES TO DEFAULT??');">
			<div title="UNcheck to only save settings without restarting Allsky" style="line-height: 0.3em;">
				<br>
				<input type="checkbox" name="restart" value="true" checked> Restart Allsky after saving changes, if needed?
				<br><br>&nbsp;
			</div>
		</div>
		<button onclick="topFunction(); return false;" id="backToTopBtn" title="Go to top of page">Top</button>
<?php }

CSRFToken();
		echo "<input type='hidden' name='page' value='$page'>\n";
		if ($needsConfiguration)
			echo "<input type='hidden' name='fromConfiguration' value='true'>\n";

		if ($formReadonly == "readonly") {
			$readonlyForm = "readonly disabled";	// covers both bases
		} else {
			$readonlyForm = "";
		}

		$numMissing = 0;
		$numMissingHasDefault = 0;
		$missingSettingsHasDefault = "";
		$missingSettings = "";
		$sourceFiles = array();
		$sourceFilesContents = array();
		echo "<table border='0' width='100%'>";
			$inHeader = false;
			$onHeader = 0;
?>
<script lang="javascript">
function showHeader(headerNum) {
	var header = document.getElementById('header' + headerNum);
	var h = document.getElementById('h' + headerNum);
	show(headerNum, header, h);
}
function show(headerNum, header, h) {
	header.style.display = "table-row";
	h.title = "Click to hide";
	h.innerHTML = "<?php echo "$hideIcon" ?>";
}
function toggle(headerNum) {
	var header = document.getElementById('header' + headerNum);
	var h = document.getElementById('h' + headerNum);
	if (header.style.display == "none") {
		show(headerNum, header, h);
	} else {
		header.style.display = "none";
		h.title = "Click to expand";
		h.innerHTML = "<?php echo "$showIcon" ?>";
	}
}
</script>
<?php
			foreach($options_array as $option) {
				$name = $option['name'];
				if ($name === $END) continue;

				// Should this setting be displayed?
				$display = toBool(getVariableOrDefault($option, 'display', "true"));
				if (! $display && ! $isHeader) {
					if ($formReadonly != "readonly") {
						// Don't display it, but if it has a value, pass it on.
						echo "\n\t<!-- NOT DISPLAYED -->";
						echo "<input type='hidden' name='$name' value='$value'>";
					}
					continue;
				}

				$type = getVariableOrDefault($option, 'type', null);	// There should be a type.
				if ($type === null) {
					$msg = "INTERNAL ERROR: Field '$name' has no type; ignoring";
					$status->addMessage($msg, 'danger');
					continue;
				}

				$isHeader = substr($type, 0, 6) === "header";
				if ($isHeader) {
					$value = "";
					$default = "";
				} else {
					$default = getVariableOrDefault($option, 'default', "");
					if ($default !== "")
						$default = str_replace("'", "&#x27;", $default);

					$s = getVariableOrDefault($option, 'source', null);
					if ($s !== null) {
						$fileName = getFileName($s);
						$source_array = &getSourceArray($fileName);
						if ($source_array === null)
							continue;
						$value = getVariableOrDefault($source_array, $name, null);
					} else {
						$value = getVariableOrDefault($settings_array, $name, null);
					}
					if ($value === null) {
						$value = "";
					} else {
						// Allow single quotes in values (for string values).
						// &apos; isn't supported by all browsers so use &#x27.
						$value = str_replace("'", "&#x27;", $value);
					}
				}

				$label = getVariableOrDefault($option, 'label', "");

				if (! $isHeader) {
					// Do error checking of values in settings file
					// except for any settings already checked.

					$optional = toBool(getVariableOrDefault($option, 'optional', "false"));
					$minimum = getVariableOrDefault($option, 'minimum', "");
					$maximum = getVariableOrDefault($option, 'maximum', "");
					$shortMsg = getVariableOrDefault($error_array_short, $name, "");

					if ($shortMsg == "" && $value !== "") {
//x echo "<br>=== Checking $name: value=$value, type=${type_array[$name]}";
						$e = checkType($name,
								$value,
								$value,
								$option['label'],
								$type_array[$name],
								$shortMsg);
						if ($e != "") {
//x echo "<br>&nbsp; &nbsp; &nbsp; e=$e, shortMsg=$shortMsg";
							$numErrors++;
							$error_array[$name] = $e;
							$error_array_short[$name] = $shortMsg;
							$error_array_source[$name] = "db";	// All these errors are in the settings file
						}
					}

					if ($shortMsg !== "" || ($value === "" && ! $optional)) {

						if ($shortMsg !== "") {
							$warning_class = "alert-danger";
							$warning_msg = "<span class='errorMsg'>";
							$whereFrom = getVariableOrDefault($error_array_source, $name, "");
							if ($whereFrom === "user")
								$warning_msg .= "You entered an invalid entry: ";
							else
								$warning_msg .= "This field is invalid: ";
							$warning_msg .= "$shortMsg</span><br>";

						} else if ($default === "") {
							$numMissing++;
							if ($missingSettings == "") {
								$missingSettings = "&nbsp; &nbsp; $bullet ";
							} else {
								$missingSettings .= "<br>&nbsp; &nbsp; $bullet ";
							}
							$missingSettings .= formatSettingName($label);
							$warning_class = "alert-danger";
							$warning_msg = "<span class='errorMsg'>This field cannot be empty.</span><br>";

						} else {
							// Use the default but let the user know.
							$value = $default;
							$numMissingHasDefault++;
							if ($missingSettingsHasDefault == "") {
								$missingSettingsHasDefault = "&nbsp; &nbsp; $bullet ";
							} else {
								$missingSettingsHasDefault .= "<br>&nbsp; &nbsp; $bullet ";
							}
							$missingSettingsHasDefault .= formatSettingName($label);
							$warning_class = "alert-warning";
							$warning_msg = "<span class='errorMsg'>This field was empty but set to the default.</span><br>";
						}
						if ($onHeader > 0) {
							// Make sure the missing setting's section is displayed.
							echo "<script>showHeader($onHeader);</script>";
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
/* TODO: This will be put in an actual tab in the new WebUI.
					echo "<tr style='height: 10px; font-size: 125%'>";
						echo "<td colspan='3' align='center'>[[[ <b>$label</b> tab goes here ]]]</td>";
					echo "</tr>";
					continue;
*/

				} else if ($type == "header") {
					// Not sure how to display the header with a background color with 10px
					// of white above and below it using only one <tr>.
					if ($hideHeaderBodies) {
						if ($inHeader) echo "</tbody>";
						else $inHeader = true;
					}

					echo "\n\t<tr class='headingRow'>";
					if ($hideHeaderBodies) {
						$onHeader++;
						echo "<td colspan='3'>";
						echo "<table border=0 class='settingsHeader'>";
						echo "<tbody class='headingRowPadding'>";
						echo "<tr>";
						echo "<td class='headingToggle' title='Click to expand'>";
						echo "<span id='h$onHeader' onClick='toggle($onHeader);'>$showIcon</span>";
						echo "</td>";
						echo "<td class='headingTitle'>$label</td>";
						echo "</tr>";
						echo "</tbody>";
						echo "</table>";
						echo "</td>";
					} else {
						echo "<td colspan='3' class='settingsHeader headingRowPadding'>";
						echo "$label";
						echo "</td>";
					}
					echo "</tr>";

					if ($hideHeaderBodies)
						echo "<tbody style='display: none' id='header$onHeader'>";

					continue;

				} else if ($type == "header-sub") {
					echo "<tr style='height: 5x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					echo "\n\t<tr>";
						echo "<td colspan='3' class='subSettingsHeader'><div>$label</div></td>";
					echo "</tr>";
					echo "\n\t<tr class='rowSeparator' style='height: 5x;'>";
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
					echo "<tr class='form-group $class $warning_class' style='margin-bottom: 0px;'>";
					$action = getVariableOrDefault($option, 'action', "none");
// TODO: when "reload" is implemented remove it from this check:
					if ($action == "restart" || $action == "reload") {
						$restartRequiredMsg = true;
						$restartRequired = true;
					} else {
						$restartRequiredMsg = false;
					}

					// Show the default in a popup
					if ($type == "boolean") {
						// Boolean values are strings: "true" or "false".
						if ($default == "true") $default = "Yes";
						else $default = "No";

					} elseif ($type == "select") {
						foreach($option['options'] as $opt) {
							$val = getVariableOrDefault($opt, 'value', "?");
							if ($val != $default) continue;
							$default = $opt['label'];
							break;
						}
					}
					$popup = "";
					if ($default == "") $default="[blank]";
					$popup .= "Default=$default";
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
					if ($restartRequiredMsg) $popup .= "\nRESTART REQUIRED";

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
					// TODO: The popup can get in the way of seeing the value a little.
					// May want to consider having a symbol next to the field that has the popup.
					echo "<span title='$popup'>";
// TODO: add percent sign for "percent"
					if (in_array($type, ["text", "password", "integer", "float", "color", "percent", "readonly"])) {
						if ($type == "readonly") {
							$readonly = "readonly";
							$t = "text";

						} else {
							$readonly = "";
							// Browsers put the up/down arrows for numbers which moves the
							// numbers to the left, and they don't line up with text.
							// Plus, they don't accept decimal points in "float".
							// So, display numbers as text.
							if ($type == "integer" || $type == "float" || $type == "percent" || $type == "color")
								$type = "text";
							$t = $type;
						}
						echo "\n\t\t<input class='form-control boxShadow settingInput settingInputTextNumber'" .
							" type='$t' $readonly $readonlyForm name='$name' value='$value' >";

					} else if ($type == "widetext"){
						echo "\n\t\t<input class='form-control boxShadow settingInputWeidetext'" .
							" type='text' $readonlyForm name='$name' value='$value'>";

					} else if ($type == "select"){
						echo "\n\t\t<select class='form-control boxShadow settingInput settingInputSelect'" .
							" $readonlyForm name='$name'>";
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
						echo "\n\t\t<div class='switch-field boxShadow settingInput settingInputBoolean'>";
							echo "\n\t\t<input id='switch_no_$name' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='false' ".
								($value == "false" ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_no_$name'>No</label>";
							echo "\n\t\t<input id='switch_yes_$name' class='form-control' type='radio' ".
								"$readonlyForm name='$name' value='true' ".
								($value == "true" ? " checked " : "").  ">";
							echo "<label style='margin-bottom: 0px;' for='switch_yes_$name'>Yes</label>";
						echo "</div>";
					}
					echo "</span>";
					echo "\n\t</td>";

					if ($type == "widetext") {
						echo "\n</tr>";
						echo "\n<tr class='rowSeparator'>";
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
			if ($inHeader) echo "</tbody>";
		echo "</table>";

		if ($formReadonly != "readonly") {
			$msg = "";
			if ($numErrors > 0) {
				$msg .= "<strong>";
				$msg .= "ERROR: invalid/missing field" . ($numErrors+$numMissing > 1 ? "s" : "") . ":";
				$msg .= "</strong>";
				foreach ($error_array as $errorName => $errorMsg) {
					$msg .= "<br>&nbsp; &nbsp; $bullet $errorMsg";
				}
			}
			if ($numMissing > 0) {
				$msg .= "<br><strong>$missingSettings</strong> is missing";
			}
			if ($msg != "") {
				// Combine invalid and missing fields since they are both errors.
				$status->addMessage($msg, 'danger', false);
			}

			if ($numMissingHasDefault > 0) {
				$msg = "<strong>";
				$msg .= "WARNING: required field" . ($numMissingHasDefault === 1 ? " is" : "s are");
				$msg .= " missing but replaced by the default:";
				$msg .= "</strong>";
				$msg .= "<br><strong>$missingSettingsHasDefault</strong>";
				$status->addMessage($msg, 'warning', false);
			}
		}
		if ($status->isMessage()) {
			$status->addMessage("<strong>See the highlighted entries below.</strong>", 'info', false);
?>
			<script>
				var messages = document.getElementById("messages");
				var inner = messages.innerHTML;
				// Call showMessages() with the 2nd (escape) argument of "true" so
				// it escapes single quotes and deletes newlines.
				// We then have to restore them so the html is correct.
				messages.innerHTML += '<?php $status->showMessages(true, true, true); ?>'
					.replace(/&apos;/g, "'")
					.replace(/&#10/g, "\n");
			</script>
<?php } ?>

	</form>
</div><!-- ./ Panel body -->
</div><!-- /.panel-primary --> </div><!-- /.col-lg-12 --> </div><!-- /.row -->
<?php
}
?>
