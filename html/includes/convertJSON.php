#!/usr/bin/php
<?php

// Generic JSON modifying scripts needed because bash doesn't natively handle JSON.
// Output the names and values of each setting.

// --settings-file SETTINGS_FILE
//		Optional name of the settings file.
//		If not specified use the standard file.

// --delimiter D
//		Use "D" as the delimiter between the field name and its value.  Default is "=".

// --capture-only OPTIONS_FILE
//		Limit output to only settings used by the capture_* programs.
//		which will have this field in the options file:		"capture" : true
//		Without this option ALL settings/values in the settings file are output.

// --convert
//		Convert the field names to all lower case,
//		boolean values to    true   or   false,
//		and remove any quotes around numbers and booleans.
//		Output a complete settings file.
//		Cannot be used with --capture-only.  Ignores --delimiter.



include_once("functions.php");

$debug = false;
$settings_file = null;
$capture_only = false;
$delimiter = "=";
$convert = false;
$options_file = null;
$options_array = null;

$rest_index;
$longopts = array(
	"settings-file:",
	"options-file:",
	"delimiter:",

	// no arguments:
	"capture-only",
	"convert",
	"debug",
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
	} else if ($opt === "options-file") {
		$options_file = $val;
		if (! file_exists($options_file)) {
			echo "ERROR: options file '$options_file' not found!\n";
			$ok = false;
		}
	} else if ($opt === "capture-only") {
		$capture_only = true;
		$options_file = $val;
		if (! file_exists($options_file)) {
			echo "ERROR: options file '$options_file' not found!\n";
			$ok = false;
		}
	} else if ($opt === "convert") {
		$convert = true;
	} else if ($opt === "delimiter") {
		$delimiter = $val;
	} // else: getopt() doesn't return a bad argument
}

if (! $ok || ($convert && $capture_only))
	exit(1);

if ($settings_file === null) {
	// use default
	$settings_file = getSettingsFile();
}
$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
$settings_array = get_decoded_json_file($settings_file, true, $errorMsg);
if ($settings_array === null) {
	exit(2);
}

if ($options_file === null) {
	// use default
	$options_file = getOptionsFile();
}
if ($capture_only || $convert) {
	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit(3);
	}
}

if ($capture_only) {
	foreach ($options_array as $option) {
		$type = getVariableOrDefault($option, 'type', "");

		// These aren't stored in the settings file.
		if (substr($type, 0, 6) == "header" || $type == "")
			continue;

		if (getVariableOrDefault($option, 'usage', "") == "capture") {
			$name = $option['name'];
			$val = getVariableOrDefault($settings_array, $name, null);
			if ($val !== null) {
				echo "$name$delimiter$val\n";
			}
		}
	}

} else if ($convert) {
	$mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;

	// We want all lines in the settings file so create an options array
	// indexed by the name.
	$new_options = Array();
	foreach ($options_array as $option) {
		$name = $option['name'];
		$new_options[$name] = $option;
	}

	$new_array = Array();
	foreach ($settings_array as $name => $val) {
		$name = strtolower($name);
		$n = getVariableOrDefault($new_options, $name, null);
		// If $n is null let's hope it's not a boolean.

		if ($n !== null) {
			$type = getVariableOrDefault($n, 'type', "");

			// $mode handles quotes around numbers.
			// We just need to convert bools to true and false without quotes.
			if ($type == "boolean") {
				if ($val == 1 || $val == "1" || $val == "true")
					$val = true;
				else
					$val = false;
			}
		}
		$new_array[$name] = $val;
	}

	echo json_encode($new_array, $mode);


} else {
	foreach ($settings_array as $name => $val) {
		echo "$name$delimiter$val\n";
	}
}

exit(0);
?>

