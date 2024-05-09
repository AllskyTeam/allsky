#!/usr/bin/php
<?php

// Generic JSON modifying scripts needed because bash doesn't natively handle JSON.
// Output the names and values of each setting.

// --settings-file SETTINGS_FILE
//		Optional name of the settings file.  If not specified use the standard file.

// --options-file OPTIONS_FILE
//		Optional name of the options file.  If not specified use the standard file.

// --delimiter D
//		Use "D" as the delimiter between the field name and its value.  Default is "=".

// --type T
//		Output setting names of the specified type T.

// --capture-only
//		Limit output to only settings used by the capture_* programs.
//		which will have this field in the options file:		"capture" : true
//		Without this option ALL settings/values in the settings file are output.

// --carryforward
//		Limit output to only settings whose "carryforward" is true.
//		Output the setting name and setting type.

// --convert
//		Convert the field names to all lower case,
//		boolean values to    true   or   false,
//		and remove any quotes around numbers and booleans.
//		Output a complete json file.
//		Cannot be used with --capture-only.  Ignores --delimiter.

// --order
//		Order the output settings to be the same as what's in the options file.
//		Any setting NOT in the options file (e.g., "lastchanged") is added to the end.

// --prefix P
//		Prepend "P" to the name of each setting.
//		Useful to ensure setting names don't conflict with bash names.

// --shell
//		Output so it can be used in "eval":
//			- Quote values as needed, e.g., strings.
//			- Create variable with name of setting.

include_once("functions.php");

$debug = false;
$settings_file = null;
$capture_only = false;
$carryforward = false;
$delimiter = "=";
$convert = false;
$order = false;
$prefix = "";
$shell = false;
$type_to_output = "";
$options_file = null;
$include_not_in_options = false;
$options_array = null;
$only_in_settings_file = false;	// use only settings that are in settings file?

$rest_index;
$longopts = array(
	"settings-file:",
	"options-file:",
	"delimiter:",
	"prefix:",
	"type:",

	// no arguments:
	"settings-only",
	"capture-only",
	"carryforward",
	"include-not-in-options",
	"convert",
	"order",
	"shell",
	"debug",
);
$options = getopt("", $longopts, $rest_index);
$ok=true;
foreach ($options as $opt => $val) {
	if ($debug || $opt === "debug") fwrite(STDERR, "===== Argument $opt $val\n");

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

	} else if ($opt === "carryforward") {
		$carryforward = true;

	} else if ($opt === "type") {
		$type_to_output = $val;

	} else if ($opt === "include-not-in-options") {
		$include_not_in_options = true;

	} else if ($opt === "settings-only") {
		$only_in_settings_file = true;

	} else if ($opt === "convert") {
		$convert = true;

	} else if ($opt === "order") {
		$order = true;

	} else if ($opt === "delimiter") {
		$delimiter = $val;

	} else if ($opt === "shell") {
		$shell = true;

	} else if ($opt === "prefix") {
		$prefix = $val;

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

if ($convert) $shell = false;		// "convert" displays json; the shell needs shell format

$type_array = Array();
if ($capture_only || $carryforward || $convert || $include_not_in_options || $order ||
		$shell || $type_to_output !== "") {

	if ($options_file === null) {
		$options_file = getOptionsFile(); // use default
	}

	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);
	if ($options_array === null) {
		exit(3);
	}
	if ($shell) $label_array = Array();
	foreach ($options_array as $option) {
		$type = getVariableOrDefault($option, 'type', "");
		if ($type_to_output !== "" && $type_to_output !== $type) {
			continue;
		}

		$name = $option['name'];
		if ($carryforward && getVariableOrDefault($option, 'carryforward', "false") === "true") {
			echo "$prefix$name\t$type\n";
			continue;
		}

		$type_array[$name] = $type;
		if ($shell) {
			$p = getVariableOrDefault($option, 'label_prefix', "");
			if ($p !== "") {
				$p .= " ";
			}
			$label_array[$name] = $p . getVariableOrDefault($option, 'label', "");
		}
	}
}
if ($carryforward) {
	exit(0);
}

if ($type_to_output !== "") {
	foreach ($type_array as $name => $type) {
		echo "$prefix$name\n";
	}
	exit(0);
}

function quoteIt($string, $type)
{
	if ($string === "" ||
			$type === "boolean" || $type === "float" ||
			$type === "integer" || $type === "percent") {
		return($string);
	}

	// Quote using single quotes so the shell doesn't expand anything.
	// There's no way to quote a single quote so change:
	//		how's
	//	to
	//		'how'"'"'s'
	return("'" . str_replace("'", "'\"'\"'", $string) . "'");
}

// =============================== main part of program =====================

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
				if ($shell) {
					$val = quoteIt($val, $type);
					$label = getVariableOrDefault($label_array, $name, "");
					$val .= "; $prefix${name}_label=" . quoteIt($label, "text");
				}
				echo "$prefix$name$delimiter$val\n";
			}
		}
	}
	exit(0);
}


if ($convert || $order) {
	$mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;

	// Current settings my have uppercase so convert to lowercase so the
	// getVariableOrDefault() below finds the setting.

	if ($convert) {
		$a = Array();
		foreach ($settings_array as $setting => $value) {
			if ($setting !== $endSetting)
				$setting = strtolower($setting);
			$a[$setting] = $value;
		}
	} else {
		$a = $settings_array;
	}

	$new_settings_array = Array();
	foreach ($options_array as $option) {
		$name = $option['name'];

		// If needed, skip any option not in the settings file.
		if ($only_in_settings_file &&
				getVariableOrDefault($a, $name, null) === null) {
			continue;
		}

		$type = getVariableOrDefault($option, 'type', "");
		if ($type === "boolean") {
			$val = toBool(getVariableOrDefault($a, $name, "false"));
		} else {
			$val = getVariableOrDefault($a, $name, null);
			if ($val === null) {
				$val = getVariableOrDefault($option, 'default', "");
			}
		}
		// $mode handles no quotes around numbers.

		if ($debug) { fwrite(STDERR, "$name: type=$type, val=$val\n"); }

		$new_settings_array[$name] = $val;
	}

	if ($include_not_in_options) {
		// Process any setting not in the options array,
		// which means it's not in $new_settings_array.
		// This will catch old settings.
		foreach ($a as $setting => $value) {
			if (getVariableOrDefault($new_settings_array, $setting, null) === null) {
				$new_settings_array[$setting] = $a[$setting];
			}
		}
	}

	if ($order) {
		// Put the output in the same order as the options file.
		$sort_array = Array();
		foreach ($options_array as $option) {
			$name = $option['name'];
	
			// Skip any setting not in settings array (e.g., for other camera type).
			$v = getVariableOrDefault($a, $name, null);
			if ($v === null) {
				continue;
			}

			$sort_array[$name] = $v;
		}

		$new_settings_array = $sort_array;
	}

	echo json_encode($new_settings_array, $mode);

} else {
	// Booleans are either 1 for true, or "" for false, so convert to "true" and "false".
	foreach ($settings_array as $name => $val) {
		if ($name === $endSetting) continue;

		$type = getVariableOrDefault($type_array, strtolower($name), "");
		if ($type == "boolean") {
			// use "==" to catch numbers and booleans
			if ($val == 1)
				$val = "true";
			else if ($val == 0)
				$val = "false";
		}
		if ($shell) {
			$val = quoteIt($val, $type);
			$label = getVariableOrDefault($label_array, $name, "");
			$val .= "; $prefix${name}_label=" . quoteIt($label, "text");
		}
		echo "$prefix$name$delimiter$val\n";
	}
}

exit(0);
?>
