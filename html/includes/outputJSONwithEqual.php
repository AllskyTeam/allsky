#!/usr/bin/php
<?php

// Output the names and values of each setting in the specified file.

// Optionally limit output to only variables used by the capture_* program
// which will have a: "capture" : true      field in the options file.

include_once("functions.php");

$debug = false;
$settings_file = null;
$capture_only = false;

$rest_index;
$longopts = array(
	"debug::",			// no arguments
	"settings-file:",
	"capture-only:",
);
$options = getopt("", $longopts, $rest_index);
$ok=true;
foreach ($options as $opt => $val) {
	if ($debug || $opt === "debug") echo "===== Argument $opt $val\n";

	if ($opt === "debug") {
		$debug = true;
	} else if ($opt === "settings-file") {
		$settings_file = $val;
		if (! file_exists($settings_file)) {
			echo "ERROR: settings file '$settings_file' not found!\n";
			$ok = false;
		}
	} else if ($opt === "capture-only") {
		$capture_only = true;
		$options_file = $val;
		if (! file_exists($options_file)) {
			echo "ERROR: options file '$options_file' not found!\n";
			$ok = false;
		}
	}
}

if ($settings_file === null) {
	// use default
	$settings_file = getSettingsFile();
}

$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
$settings_array = get_decoded_json_file($settings_file, true, $errorMsg);
if ($settings_array === null) {
	exit(1);
}

if ($capture_only) {
	$errorMsg = "ERROR: Unable to process options file '$options_file'.\n";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit(1);
	}

	foreach ($options_array as $option) {
		$type = getVariableOrDefault($option, 'type', "");
		if (substr($type, 0, 6) == "header" || $type == "")
			continue;

		$usage = getVariableOrDefault($option, 'usage', "");
		if ($usage == "capture") {
			$name = $option['name'];
			$val = getVariableOrDefault($settings_array, $name, null);
			if ($val !== null)
				echo "$name=$val\n";
		}
	}
} else {
	foreach ($settings_array as $name => $val) {
		echo "$name=$val\n";
	}
}

exit(0);
?>
