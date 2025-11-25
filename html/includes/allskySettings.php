<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

$debug = false;

// Get the json for the given file if we haven't already and return a pointer to the data.
// Most of the time there will only be one source file, so check if we're getting the
// same file as last time.
function &getSourceArray($file) {
	global $status, $debug;

	static $filesContents = array();
	static $lastFile = null;

	$fileName = getFileName($file);
	if ($fileName == "") {
		$errorMsg = "Unable to get file name for '$file'. Some settings will not work.";
		$status->addMessage($msg, 'danger');
		return ("");
	}

	if ($fileName === $lastFile) return($filesContents[$fileName]);

	$lastFile = $fileName;

	if (! isset($filesContents[$fileName])) {
		$errorMsg = "Unable to read source file from $file.";
		$retMsg = "";
		$filesContents[$fileName] = get_decoded_json_file($fileName, true, $errorMsg, $retMsg);
		if ($filesContents[$fileName] === null || $retMsg !== "") {
			$status->addMessage($retMsg, 'danger');
		}
	}
//x echo "<br><pre>return fileName=$fileName: "; var_dump($filesContents); echo "</pre>";
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
function formatSettingName($name, $prefix="") {
	if ($prefix !== "") $name = "$prefix $name";
	return("<span class='WebUISetting'>$name</span>");
}
function formatSettingValue($value) {
	return("<span class='WebUIValue'>$value</span>");
}

// Determine the logical type based on the actual type.
function getLogicalType($type) {
	if (strpos($type, "text") !== false || $type == "password") {
		return("text");
	} else if (strpos($type, "integer") !== false) {
		return("integer");
	} else if ($type == "float" || $type === "percent") {
		return("float");
	} else {
		return($type);
	}
}


// Check the value for the correct type.
// Return "" on success and some string on error.
function checkType($fieldName, $value, $old, $label, $label_prefix, $type, &$shortened=null) {

	if ($type === null || $type === "text" || $value === "") {
		return("");
	}

	$msg = "";

	// $value may be of type string, even if it's actually a number
	// or a boolean, and only is_numeric() accounts for types of string.
	if ($type === "integer") {
		if (! is_numeric($value) || ! is_int($value + 0))
			$msg = "must be a number without a fraction";
		else
			$value += 0;
	} else if ($type === "float") {
		if (! is_numeric($value) || ! is_float($value + 0.0))
			$msg = "must be a number with, or without, a fraction";
		else
			$value += 0.0;
	} else if ($type === "color" && substr($value, 0, 1) === "#") {
		$l = strlen($value);
		if ($l != 4 && $l !== 7) {
			$msg = "must contain either 3 or 6 characters after the '#'";
		}
	}
	if ($msg === "") {
		return("");
	}

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

	return(formatSettingName($label, $label_prefix) . " $msg");
}

// Return $value as type $type.
// This eliminates the need for JSON_NUMERIC_CHECK, which converts some
// strings we want as strings to numbers, e.g., "longitude = +105.0" should stay as a string.
function setValue($name, $value, $type) {
# TODO: May 2025:  Is it ok to return "" for empty numbers?
	if ($value === "") return "";

	if ($type === "integer") {
		return (int) $value;
	} else if ($type === "float") {
		return (float) $value;
	} else {
		return $value;
	}
}

// Return the file name after accounting for any ${} shell variables.
// Since there will often only be one file used by multiple settings,
// as an optimization save the last name.
$lastFileName = null;
function getFileName($file) {
	global $lastFileName;

	if ($lastFileName === $file) return $lastFileName;

	if (strpos('${HOME}', $file) !== false) {
		$lastFileName = str_replace('${HOME}', HOME, $file);
	} else if (strpos('${ALLSKY_ENV}', $file) !== false) {
		$lastFileName = str_replace('${ALLSKY_ENV}', ALLSKY_ENV, $file);
	} else if (strpos('${ALLSKY_HOME}', $file) !== false) {
		$lastFileName = str_replace('${ALLSKY_HOME}', ALLSKY_HOME, $lastFileName);
	}
	return $lastFileName;
}


// ============================================= The main function.
function DisplayAllskyConfig() {
	global $formReadonly, $settings_array;
	global $useLocalWebsite, $useRemoteWebsite;
	global $debug;
	global $lastChangedName;				// name of json setting
	global $lastChanged;
	global $page;
	global $ME;
	global $status;
	global $allsky_status;
	global $endSetting;
	global $saveChangesLabel;
	global $forceRestart;
	global $pageHeaderTitle, $pageIcon;

	$cameraTypeName = "cameratype";			// json setting name
	$cameraModelName = "cameramodel";		// json setting name
	$cameraNumberName = "cameranumber";		// json setting name
	$debugLevelName = "debuglevel";			// json setting name
	$debugArg = "";
	$cmdDebugArg = "";		// set to --debug for runCommand() debugging
	$hideHeaderBodies = true;
	$numErrors = 0;
	$fromConfiguration = false;
	$bullet = "<div class='bullet'>*</div>";
	$showIcon = "<i class='fa fa-chevron-down fa-fw'></i>";
	$hideIcon = "<i class='fa fa-chevron-up fa-fw'></i>";
	$saveChangesIcon = "<i class='fa-solid fa-floppy-disk'></i>";

	$mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
	$settings_file = getSettingsFile();
	$options_file = getOptionsFile();

	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit(1);
	}

	// If there's no last changed date, they haven't configured Allsky,
	// which sets $lastChanged.
	$needsConfiguration = ($lastChanged === "");
	if ($needsConfiguration || $formReadonly) {
		$hideHeaderBodies = false;		// show all the settings
	}

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
		$t = getVariableOrDefault($option, 'type', "");
		$type_array[$name] = $t;
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
			$restartRequired = false;
			$stopRequired = false;
			$reReadSettings = false;
			$cameraChanged = false;
			$refreshingCameraType = false;
			$newCameraType = "";
			$newCameraModel = "";
			$newCameraNumber = "";
			$twilightDataChanged = false;

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
			$nonCameraChanges = "";
			$changesMade = false;

	 		foreach ($_POST as $name => $newValue) {
				// Anything that's sent "hidden" in a form that isn't a settings needs to go here.
				if (in_array($name, ["csrf_token", "save_settings", "reset_settings",
						"restart", "page", "_ts", $endSetting, "fromConfiguration"])) {
					if ($name === "fromConfiguration") {
						// If set, the prior screen said "you must configure Allsky ..." so
						// it's ok if nothing changed, but we need to update $lastChanged.
						$fromConfiguration = $newValue;
					}
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

				// Check for empty non-optional settings and valid numbers, and
				// get some info about the setting we'll need if it changed.
				// Do this for ALL settings, not just changed ones so we can
				// let the user know if there's a problem with an existing value.
				$checkchanges = false;
				$label = "??";
				$found = false;
				$type = "";
				$logicalType = "";
				foreach ($options_array as $option) {
					if ($option['name'] !== $name) continue;

					$label = getVariableOrDefault($option, 'label', "");
					$label_prefix = getVariableOrDefault($option, 'label_prefix', "");
					$found = true;
					$shortMsg = "";
					$type = $type_array[$name];
					$logicalType = getLogicalType($type);
					$newValue = setValue($name, $newValue, $logicalType);
					$oldValue = setValue($name, $oldValue, $logicalType);
					$e = checkType($name,
							$newValue,
							$oldValue,
							$label, $label_prefix,
							$logicalType,
							$shortMsg);
					if ($e != "") {
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

					$optional = $optional_array[$name];
					if ($newValue !== "" || $optional) {
						$checkchanges = toBool(getVariableOrDefault($option, 'checkchanges', "false"));
					}
					$action = getVariableOrDefault($option, 'action', "none");
					break;
				}

				if (! $found) {
					$msg = "Setting '$name' not in options file.";
					$status->addMessage($msg, 'danger');
					$ok = false;
				} else {
					if (toBool(getVariableOrDefault($option, 'settingsonly', "false"))) {
						// "settingsonly" settings aren't changed in the WebUI
						$settings_array[$name] = setValue($name, $oldValue, $logicalType);
						continue;
					}

					if ($logicalType === "text") {
						if ($oldValue !== "")
							$oldValue = str_replace("'", "&#x27", $oldValue);
						if ($newValue !== "")
							$newValue = str_replace("'", "&#x27", $newValue);
					}

					if ($oldValue === $newValue) {
						continue;
					}

					if ($isSettingsField) $numSettingsChanges++;
					else $numSourceChanges++;

					if ($name === $cameraTypeName) {
						if ($newValue === "Refresh") {
							if ($cameraChanged) {
								$msg = "If you selected <b>Refresh</b> for <b>$label</b>";
								$msg .= " you cannot change anything else.";
								$msg .= "<br>You also changed: ";
								if ($newCameraModel !== "") $msg .= " <b>Camera Model</b>";
								if ($newCameraNumber !== "") $msg .= " <b>Camera Number</b>";
								$status->addMessage($msg, 'danger');
								$ok = false;
							} else {
								// Refresh the same Camera Type
								$refreshingCameraType = true;
								$newCameraType = $oldValue;
								$newValue = $oldValue;
							}
						} else {
							$newCameraType = $newValue;
						}
						$cameraChanged = true;

					} elseif ($name === $cameraModelName || $name === $cameraNumberName) {
						if ($refreshingCameraType) {
							$msg = "If you selected <b>Refresh</b> for <b>Camera Type</b>";
							$msg .= " you cannot change anything else.";
							$msg .= "<br>You also changed: <b>$label</b>";
							$status->addMessage($msg, 'danger');
							$ok = false;
						} else {
							$cameraChanged = true;
							if ($name === $cameraModelName)
								$newCameraModel = $newValue;
							else
								$newCameraNumber = $newValue;
						}

					} else {
						// want to know changes other than camera
						if ($nonCameraChanges === "")
							$nonCameraChanges = "<b>$label</b>";
						else
							$nonCameraChanges .= ", <b>$label</b>";
						$nonCameraChanges .= " (from '$oldValue' to '$newValue')";
						if ($name === "latitude" ||
							  $name === "longitude" ||
							  $name === "angle" ||
							  $name === "takedaytimeimages" ||
							  $name === "takenighttimeimages") {
							$twilightDataChanged = true;
						}
					}

					if ($action == "restart" || $action == "reload") {
						$restartRequired = true;
					} else if ($action == "stop") {
						$stopRequired = true;
					}

					if ($checkchanges) {		// Changes for makeChanges.sh to check
						$changes .= "  '$name' '$label' '$oldValue' '$newValue'";
					}
				}

				$changesMade = ($numSettingsChanges > 0 || $numSourceChanges > 0);
				if ($ok && $changesMade) {
					// Update the appropriate array with the new value.
					if ($newValue === "true") {
						$newValue = true;
						$s_newValue = "true";
					} else if ($newValue === "false") {
						$newValue = false;
						$s_newValue = "false";
					} else {
						// Don't do unless needed:
						//	str_replace() changes non-strings like numbers to strings.
						if ($logicalType === "text")
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
						$settings_array[$name] = setValue($name, $newValue, $logicalType);
					}

					if ($name === $debugLevelName && $newValue >= 4) {
						$debugArg = "--debug";
					}
				}
			}

			if ( $ok && ($changesMade || $fromConfiguration) ) {
				if ($nonCameraChanges !== "" || $fromConfiguration) {
					if ($cameraChanged && $nonCameraChanges !== "") {
						$msg = "If you change <b>Camera Type</b> or <b>Camera Model</b>";
						$msg .= " you cannot change anything else.";
						$msg .= "<br>You also changed: $nonCameraChanges.";
						$status->addMessage($msg, 'danger');
						$ok = false;
					} else {
						if ($numSettingsChanges > 0 || $fromConfiguration) {
							// Keep track of the last time the file changed.
							// If we end up not updating the file this will be ignored.
							$lastChanged = date(DATE_TIME_FORMAT);
							$settings_array[$lastChangedName] = $lastChanged;
							if ($fromConfiguration) {
								$restartRequired = true;
								unset($settings_array[$endSetting]);
							}
$remove0 = false;
if ($remove0) {
	# TODO: Unfortunately this remove .0 from Computer, e.g., "Rev 1.0,"
	# I think it's ok to not do this.
							$content = str_replace(".0,", ",", json_encode($settings_array, $mode));
} else {
							$content = json_encode($settings_array, $mode);
}
if ($debug) {
	echo "<br><br>Updating $settings_file, numSettingsChanges = $numSettingsChanges";
	echo "<pre>settings_array: "; var_dump($settings_array); echo "</pre>";
if ($remove0) {
	echo "<pre>content: "; var_dump($content); echo "</pre>";
}
}
							// updateFile() only returns error messages.
							$msg = updateFile($settings_file, $content, "settings", true);
							echo "<script>console.log(`Updated '$settings_file'";
							if ($msg !== "") echo " msg=$msg";
							echo "`);</script>";
							if ($msg === "") {
								if ($numSettingsChanges > 0) {
									$msg = "$numSettingsChanges setting";
									if ($numSettingsChanges > 1)
										$msg .= "s";
									$msg .= " changed.";
								} else {	# configuration needed and no changes made.
									$msg = "Settings saved and timestamp updated.";
								}
								$needsConfiguration = false;
								$reReadSettings = true;
							} else {
								$msg = "Failed to update settings in '$settings_file': $msg";
								$status->addMessage($msg, 'danger');
								$ok = false;
							}
						}
						if ($ok && $numSourceChanges > 0) {
							// Now save the settings from the source files that changed.
							foreach($sourceFilesChanged as $fileName) {
								$content = json_encode(getSourceArray($fileName), $mode);
if ($debug) {
	echo "<br>Updating $fileName, numSourceChanges = $numSourceChanges";
	echo "<pre>"; var_dump($content); echo "</pre>";
}
								$msg = updateFile($fileName, $content, "source_settings", true);
// echo "<script>console.log('Updated $fileName');</script>";
								if ($msg === "") {
									$msg = "Settings in $fileName saved.";
									$status->addMessage($msg, 'info');
								} else {
									$msg = "Failed to update settings in '$fileName': $msg";
									$status->addMessage($msg, 'danger');
									$ok = false;
								}
							}
						}
					}
				} else {
					$msg = "";
					if ($newCameraType !== "") {
						if ($msg !== "") $msg = "<br>$msg";
						if ($refreshingCameraType)
							$msg .= "<b>Camera Type</b> $newCameraType refreshed.";
						else
							$msg .= "<b>Camera Type</b> changed to <b>$newCameraType</b>.";
					}
					if ($newCameraModel !== "") {
						if ($msg !== "") $msg = "<br>$msg";
						$msg .= "<b>Camera Model</b> changed to <b>$newCameraModel</b>.";
					}
					if ($newCameraNumber !== "") {
						if ($msg !== "") $msg = "<br>$msg";
						$msg .= "<b>Camera Number</b> changed to <b>$newCameraNumber</b>.";
					}

					if ($msg !== "")
						$status->addMessage($msg, 'info');
				}
			}

			if ($ok) {
				if ($fromConfiguration) {
					// If we restart Allsky this tells it it's ok to start.
					update_allsky_status(ALLSKY_STATUS_NOT_RUNNING);
				}

				if (! $changesMade && ! $fromConfiguration) {
					$msg = "<div class='noChanges'>No settings changed.  Nothing updated.</div>";
					$status->addMessage($msg, 'message', true);
					$msg = "";
				} else if ($changes !== "") {
					$moreArgs = "";
					if ($newCameraType !== "") {
						$moreArgs .= " --cameraTypeOnly";
					}

					// This must run with different permissions so makeChanges.sh can
					// write to the allsky directory.
					$CMD = "sudo --user=" . ALLSKY_OWNER . " ";
					$CMD .= ALLSKY_SCRIPTS . "/makeChanges.sh --from WebUI $cmdDebugArg $moreArgs $changes";

					# Let makeChanges.sh display any output.
					// false = don't add anything to the message.
					$ok = runCommand($CMD, "", "success", false, "", $return_val);

					$msg = "";
					// EXIT_PARTIAL_OK means there were problem(s) and nothing changed.
					if ($return_val === EXIT_PARTIAL_OK) {
						$ok = false;
					} else {
						// If Allsky needs to be configured again, e.g., a new camera type/model,
						// stop Allsky, don't restart it.
						$settings_array = readSettingsFile();
						$reReadSettings = false;	// just re-read it, so don't need to read again
						if (getVariableOrDefault($settings_array, $lastChangedName, null) === null) {
							$msg .= "Allsky needs to be re-configured.<br>";
							$restartRequired = false;
							$stopRequired = true;
						}
					}
				}

				if ($ok) {
					// The "restart" field is a checkbox.  If not checked it returns nothing.
					if ($restartRequired && getVariableOrDefault($_POST, 'restart', "") != "") {
						# Allsky status will change so check often.
						echo "<script>allskystatus_interval = 2 * 1000;</script>";

						if ($msg !== "")
							$msg .= " &nbsp;";
						$msg .= "Allsky restarted.";
						// runCommand() displays $msg on success.
						$CMD = "sudo /bin/systemctl reload-or-restart allsky.service";
						if (! runCommand($CMD, $msg, "success")) {	// displays $msg on success.
							$status->addMessage("Unable to restart Allsky.", 'warning');
						}

					} else if ($stopRequired) {
						# Allsky status will change so check often.
						echo "<script>allskystatus_interval = 2 * 1000;</script>";

						if ($msg !== "")
							$msg .= " &nbsp;";

						$msg .= "<strong>Allsky stopped waiting for a manual restart</strong>.";
						$CMD = "sudo /bin/systemctl stop allsky.service";
						if (! runCommand($CMD, $msg, "success")) {	// displays $msg on success.
							$status->addMessage("Unable to stop Allsky.", 'warning');
						}

					} else {
						if ($msg !== "") {
							$status->addMessage($msg, 'info');
						}

						if ($changesMade || $fromConfiguration) {
							// Don't show the user this message - it can confuse them.
							$consoleMsg = "Allsky NOT restarted";
							if (! $restartRequired && $changesMade) {
								$consoleMsg .= " - no changes required it";
							}
							echo "<script>console.log(`$consoleMsg`);</script>";
						}

						if ($restartRequired) {
							$msg = "Allsky needs to be restarted for your changes to take affect.";
							$status->addMessage($msg, 'warning');
						}
					}

					// If there's a website let it know of the changes.
					// Because postData.sh can take a while to upload files,
					// and it's called at end of night and uploads the settings file,
					// only call it here for major changes.
					if (($twilightDataChanged || $cameraChanged || $fromConfiguration) &&
							($useLocalWebsite || $useRemoteWebsite)) {
						$CMD = "sudo --user=" . ALLSKY_OWNER . " " . ALLSKY_SCRIPTS;

						$moreArgs = "";
						if (! $twilightDataChanged)
							$moreArgs .= " --settingsOnly";
						if ($cameraChanged)
							$moreArgs .= " --allFiles";

						// postData.sh will output necessary messages.
						$cmd = "{$CMD}/postData.sh --from WebUI $cmdDebugArg $moreArgs";
						$worked = runCommand($cmd, "", "success", false);

						if ($fromConfiguration) {
							$cmd = "{$CMD}/checkAllsky.sh --fromWebUI";
							echo '<script>console.log(`Running: ' . $cmd . '`);</script>';
							exec("$cmd 2>&1", $result, $return_val);
							// Only 1 line is just an "ok" line so don't record.
							if ($result != null && count($result) > 1) {
								$result = implode("<br>", $result);
								// Not worth checking if the update worked.
								updateFile(ALLSKY_CHECK_LOG, $result, "checkAllsky", true);
	
								$msg = "<div class='errorMsgBig errorMsgBox center-div center-text'>";
								$msg .= "Suggested changes to your settings<br>";
								$msg .= "</div>";
								$msg .= $result;
								$status->addMessage($msg, 'warning');
							}
						}
					}
				}
			}
			if (! $ok) {
				$status->addMessage("Settings NOT saved due to errors above.", 'info');
			}

			if ($reReadSettings) {
				$settings_array = readSettingsFile();
			}
		} else {
			$status->addMessage('Unable to save settings - session timeout.', 'danger');
		}

	} else if (isset($_POST['reset_settings'])) {
		if (CSRFValidate()) {
			$settings_array = array();
			$sourceFilesChanged = array();
			$sourceFilesContents = array();
			foreach ($options_array as $option){
				$name = $option['name'];
				$default = getVariableOrDefault($option, 'default', null);
				if ($default !== null) {
					$logicalType = getLogicalType(getVariableOrDefault($option, 'type', "text"));
					$default = setValue($name, $default, $logicalType);

					$s = getVariableOrDefault($option, 'source', null);
					if ($s !== null) {
						$fileName = getFileName($s);
						$sourceFilesChanged[$fileName] = $fileName;
						// Multiple settings will likely have the same source file.
						$sourceFilesContents[$fileName] = &getSourceArray($fileName);
						$sourceFilesContents[$fileName][$name] = $default;
					} else {
						$settings_array[$name] = $default;
					}
				}
			}

			// Update the settings file then any source files.
			$content = json_encode($settings_array, $mode);
			$msg = updateFile($settings_file, $content, "settings", true);
			if ($msg === "") {
				$status->addMessage("Settings reset to default", 'info');

				foreach($sourceFilesChanged as $fileName) {
					$content = json_encode($sourceFilesContents[$fileName], $mode);
					$msg = updateFile($fileName, $content, "source_settings", true);
					if ($msg !== "") {
						$status->addMessage("Failed to reset settings in '$fileName': $msg", 'danger');
					}
				}

				// The settings file changed so re-read it.
				$settings_array = readSettingsFile();
			} else {
				$status->addMessage("Failed to reset settings: $msg", 'danger');
			}
		} else {
			$status->addMessage('Unable to reset settings - session timeout', 'danger');
		}
	} else {
		# The Allsky status isn't likely to change so increase the interval.
		echo "<script>allskystatus_interval = 20 * 1000;</script>";
	}

	// If $settings_array is null it means we're being called from the Allsky Website,
	// so read the file.
	if ($settings_array === null) {
		$settings_array = readSettingsFile();
	}

	$cameraType = getVariableOrDefault($settings_array, $cameraTypeName, "");
	$cameraModel = getVariableOrDefault($settings_array, $cameraModelName, "");

	check_if_configured($page, "settings");	// Calls addMessage() on error

	if ($formReadonly != "readonly") $settingsDescription = "";
?>

<div class="panel panel-allsky" id="settingsPanel">
<?php
	if ($formReadonly == "readonly") {
		$x = "(READ ONLY) &nbsp; &nbsp; ";
	} else {
		$x = "<i class='$pageIcon'></i> ";
	}
	echo "<div class='panel-heading'>$x $pageHeaderTitle for &nbsp;<b>$cameraType $cameraModel</b></div>";
	echo "<div class='panel-body' style='padding: 5px;'>";
	if ($formReadonly != "readonly") {
		echo "<div id='messages'>";
			$status->showMessages();
		echo "</div>";
		$t = time();
		echo "<form method='POST' action='{$ME}?_ts={$t}' name='conf_form'>";
?>
		<div class="sticky settings-nav">
			<div class="settings-buttons container-fluid">
				<div class="row">
					<div class="col-md-11 col-sm-11 col-xs-11 nowrap buttons">
						<button type="submit" class="btn btn-primary"
								id="save_settings" name="save_settings"
								title="Save changes">
							<?php echo "$saveChangesIcon $saveChangesLabel"; ?>
						</button>
						<button type="submit" class="btn ml-3 btn-warning"
								id="settings-reset" name="reset_settings"
								title="Reset to default values">
							<i class="fa-solid fa-rotate-left"></i> Reset to default values
						</button>
					</div>
					
					<div class="col-md-1 col-sm-1 col-xs-1 expand-collapse-button">
						<button type="button" class="<?php if (!$hideHeaderBodies) { echo("hidden ") ;}?>btn btn-primary ml-5 settings-expand pull-right"
								id="settings-all-control" title="Expand/Collapse all settings">
							<?php echo $showIcon ?>
						</button>
					</div>
				</div>
				<div class="row">
					<div class="col-md-12 save-settings-text">
						<div title="Uncheck to only save settings without restarting Allsky" class="mt-4">
							<input type="checkbox" name="restart" value="true" checked>
							<span class="ml-2">Restart Allsky after saving changes, if needed?</span>
						</div>						
					</div>
				</div>
			</div>
		</div>
		<button id="backToTopBtn" type="button" title="Go to top of page">Top</button>
<?php
	}

CSRFToken();
		echo "<input type='hidden' name='page' value='$page'>\n";

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

			if ($hideHeaderBodies) {
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
				</script>
<?php
			}

			foreach($options_array as $option) {
				$name = $option['name'];
if ($debug) { echo "<br>Option <b>$name</b>"; }
				if ($name === $endSetting) continue;

				$type = getVariableOrDefault($option, 'type', null);
				if ($type === null) {
					$msg = "INTERNAL ERROR: Field '$name' has no type; ignoring";
					$status->addMessage($msg, 'danger');
					continue;
				}

				if (substr($type, 0, 7) === "select_") {
					$type = "select";
				}

				// Should this setting be displayed?
				$display = toBool(getVariableOrDefault($option, 'display', "true"));
				if (toBool(getVariableOrDefault($option, 'settingsonly', "false"))) {
					$display = false;
				}
				$logicalType = getLogicalType($type);
				$isHeader = substr($logicalType, 0, 6) === "header";
				if (! $display && ! $isHeader) {
					if ($formReadonly != "readonly") {
						$value = getVariableOrDefault($settings_array, $name, "");
						// Don't display it, but if it has a value, pass it on.
						echo "\n\t<!-- NOT DISPLAYED -->";
						echo "<input type='hidden' name='$name' value='$value'>";
					}
					continue;
				}

				if ($isHeader) {
					$value = "";
					$default = "";
if ($debug) { echo "&nbsp; (<span style='color: blue;'>$logicalType</span>)"; }
				} else {
					$default = getVariableOrDefault($option, 'default', "");
					if ($default !== "" && $logicalType === "text")
						$default = str_replace("'", "&#x27;", $default);

					$s = getVariableOrDefault($option, 'source', null);
					if ($s !== null) {
						if ($formReadonly) {
							// Don't show variables in other files since they
							// may contain private information.
							continue;
						}

						$fileName = getFileName($s);
						$source_array = &getSourceArray($fileName);
if ($debug) { echo ": &nbsp; from $fileName"; }
						if ($source_array === null) {
							continue;
						}
						$value = getVariableOrDefault($source_array, $name, null);
					} else {
if ($debug) { echo ": &nbsp; from settings file"; }
						$value = getVariableOrDefault($settings_array, $name, null);
					}
if ($debug) { echo ": &nbsp; value=$value"; }

					// In read-only mode, getVariableOrDefault() returns booleans differently.
					// A 0 or 1 is returned.
					if ($logicalType === "boolean" && $formReadonly == "readonly") {
						if ($value === null || $value == 0) {
							$value = "false";
						} else {
							$value = "true";
						}
					}

					if ($value === null) {
						$value = "";
					} else if ($logicalType === "text") {
						// Allow single quotes in values (for string values).
						// &apos; isn't supported by all browsers so use &#x27.
						$value = str_replace("'", "&#x27;", $value);
					}
				}

				$label = getVariableOrDefault($option, 'label', "");

				if (! $isHeader) {
					// Do error checking of values in settings file
					// except for any settings already checked.

					$label = getVariableOrDefault($option, 'label', "");
					$label_prefix = getVariableOrDefault($option, 'label_prefix', "");
					$optional = toBool(getVariableOrDefault($option, 'optional', "false"));
					$minimum = getVariableOrDefault($option, 'minimum', "");
					$maximum = getVariableOrDefault($option, 'maximum', "");
					$shortMsg = getVariableOrDefault($error_array_short, $name, "");

					if ($shortMsg == "" && $value !== "") {
//x echo "<br>=== Checking $name: value=$value, type={$type_array[$name]}";
						$e = checkType($name,
								$value,
								$value,
								$label, $label_prefix,
								$type,
								$shortMsg);
						if ($e != "") {
//x echo "<br>&nbsp; &nbsp; &nbsp; e=$e, shortMsg=$shortMsg";
							$numErrors++;
							$error_array[$name] = $e;
							$error_array_short[$name] = $shortMsg;
							// All these errors are in the settings file
							$error_array_source[$name] = "db";
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
							$missingSettings .= formatSettingName($label, $label_prefix);
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
							$missingSettingsHasDefault .= formatSettingName($label, $label_prefix);
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
// TODO: placeholder for code to create a new tab
					continue;

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
						echo "<span id='h$onHeader' class='setting-header-toggle' data-settinggroup='$onHeader'>$showIcon</span>";
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
						echo "<tbody style='display: none' id='header$onHeader' class='settings-header'>";

					continue;

				} else if ($type == "header-sub") {
					echo "<tr style='height: 5x;'>";
						echo "<td colspan='3'></td>";
					echo "</tr>";
					echo "\n\t<tr>";
						echo "<td colspan='3'><div class='subSettingsHeader'>$label</div></td>";
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
					if ($action == "restart") {
						$popupExtraMsg = "RESTART REQUIRED";
					} else if ($action == "reload") {
// TODO: when "reload" is implemented change RESTART to RELOAD.  Or, always say RESTART?  Will the user know the difference?
						$popupExtraMsg = "RESTART REQUIRED";
					} else if ($action == "stop") {
						$popupExtraMsg = "ALLSKY WILL STOP AFTER\nCHANGING THIS SETTING";
					} else {
						$popupExtraMsg = "";
					}

					// Show the default in a popup
					if ($logicalType == "boolean") {
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
					if ($default == "") $popup="No default";
					else $popup = "Default=$default";
					if ($minimum !== "") $popup .= "\nMinimum=$minimum";
					if ($maximum !== "") {
						if ($maximum === "none") $popup .= "\nNo maximum";
						else $popup .= "\nMaximum=$maximum";
					}

					$rspan="";
					$cspan="";

					if ($logicalType == "integer") {
						$popup .= "\nWhole numbers only";
					} else if ($logicalType == "float") {
						$popup .= "\nFractions allowed";
					} else if ($type == "widetext") {		// check $type, not $logicalType
						$rspan="rowspan='2'";
						$cspan="colspan='2'";
					}
					if ($popupExtraMsg !== "") $popup .= "\n**********\n$popupExtraMsg";

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

					if (toBool(getVariableOrDefault($option, 'readonly', "false")))
						$readonly = "readonly";
					else
						$readonly = "";
					
					echo "\n\t<td $cspan valign='middle' style='$style' align='center'>";
					// TODO: The popup can get in the way of seeing the value a little.
					// May want to consider having a symbol next to the field that has the popup.
					echo "<span title='$popup'>";
// TODO: add percent sign for "percent"
					if (in_array($type, ["text", "password", "color", "integer",
								"float", "percent"])) {
						// Browsers put the up/down arrows for numbers which moves the
						// numbers to the left, and they don't line up with text.
						// Plus, they don't accept decimal points in "float".
						// So, display numbers as text.
						if ($type == "color" || $type == "integer" ||
							$type == "float" || $type == "percent") {
								$type = "text";
						}
						echo "\n\t\t<input class='form-control boxShadow settingInput settingInputTextNumber'" .
							" type='$type' $readonly $readonlyForm name='$name' value='$value' >";

					} else if ($type == "widetext"){
						echo "\n\t\t<input class='form-control boxShadow settingInputWidetext'" .
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
					echo "\n\t<td style='padding-left: 10px;'>$warning_msg$description</td>";

					echo "\n</tr>";
				}
			}
			if ($inHeader) echo "</tbody>";
		echo "</table>";

		if ($numMissingHasDefault > 0) {
			$needsConfiguration = true;
			if ($lastChanged !== "") {
				$lastChanged = "";
				$allsky_status = ALLSKY_STATUS_NEEDS_REVIEW;
				check_if_configured($page, "settings");
?>
				<script>
					var s = document.getElementById('save_settings');
					s.innerHTML = "<?php echo "$saveChangesIcon $saveChangesLabel" ?>";
				</script>
<?php
			}
		}

		if ($needsConfiguration) {
			echo "<input type='hidden' name='fromConfiguration' value='true'>\n";
		}

		if ($fromConfiguration) {
			// Hide the message about "Allsky must be configured..."
?>
			<script>
			var m = document.getElementById('mustConfigure');
			if (m != null) {
				var p = m.parentElement;
				var gp = p.parentElement;
				if (gp != null) p = gp;
				p.style.display = 'none';
			}
			</script>
<?php
		}

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
				if ($numErrors > 0) {
					$msg .= "<br>";
				}
				$msg .= "<strong>$missingSettings</strong> is missing";
			}
			if ($msg != "") {
				// Combine invalid and missing fields since they are both errors.
				$status->addMessage($msg, 'danger');
			}

			if ($numMissingHasDefault > 0) {
				$msg = "<strong>";
				$msg .= "Required field" . ($numMissingHasDefault === 1 ? " is" : "s are");
				$msg .= " missing but replaced by the default:";
				$msg .= "</strong>";
				$msg .= "<br><strong>$missingSettingsHasDefault</strong>";
				$status->addMessage($msg, 'warning');
			}

			if ($status->isMessage()) {
				$status->addMessage("<strong>See the highlighted entries below.</strong>", 'info');
			}

			//$status->reset();

?>

			<script>
				var messages = $("#messages");
				var messageHTML = messages.html();
				// Call showMessages() with the 2nd (escape) argument of "true" so
				// it escapes single quotes and deletes newlines.
				// We then have to restore them so the html is correct.
				messageHTML += `<?php $status->showMessages(true, true); ?>`
					.replace(/&apos;/g, "'")
					.replace(/&#10/g, "\n");
				messages.html(messageHTML);

				if ($('#messages div.noChanges').length !== 1) {
					if ($('#messages > div').length > 1) {
						$('#settingsPanel').removeClass('panel-success');
						$('#settingsPanel').addClass('panel-danger');
					}
				}

			</script>
<?php	} ?>

	</form>
</div><!-- ./ Panel body -->
</div><!-- /.panel-primary -->


<?php
	if (! $formReadonly)
		echo '<script src="js/settings.js"></script>';

}
?>
