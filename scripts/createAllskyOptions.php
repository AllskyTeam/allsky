#!/usr/bin/php
<?php

// Create a camera type/model-specific "options" file for the new camera.

if (! include_once('functions.php')) {
	echo "\nERROR during 'include_once(functions.php)\n";
	exit(1);
}

$q = '"';	// This make it easier than escaping all the quotes in output.

// Get the "generic" name for a setting that has either "day" or "night" in the name.
// Camera capabilities don't care if it's day or night so there's only one value.
function get_generic_name($s) {
	if ($s === null) return $s;

	if (substr($s, 0, 3) === "day")
		return substr($s, 3);
	if (substr($s, 0, 5) === "night")
		return substr($s, 5);
	return $s;
}
// These values need to be looked up in the CC file using their generic name.
function is_generic_value($v) {
	if ($v === null) return false;

	if (substr($v, 0, 1) === "_")
		return true;

	return false;
}
// These values need to be looked up in the CC file using their full name.
function is_specific_value($v) {
	if ($v === null) return false;

	if (substr($v, 0, 4) === "day_" || substr($v, 0, 6) === "night_")
		return true;

	return false;
}

// Get a camera control.  Return true if it exists, false if it doesn't.
// If it exists, set the min, max, and default.
function get_control($array, $setting, &$min, &$max, &$default) {
	foreach ($array as $cc) {
		if ($cc["argumentName"] === $setting) {
			$min = getVariableOrDefault($cc, "MinValue", null);
			$max = getVariableOrDefault($cc, "MaxValue", null);
			$default = getVariableOrDefault($cc, "DefaultValue", null);
			return true;
		}
	}
	return false;
}

// If a field is null that means it wasn't in the repo file,
// so don't add it to the options string.
// We need this because we look for all fields in a setting.
function add_non_null_field($a, $f, $setting, $type=null) {	// array, field name, setting_name, type
	global $options_str;
	global $num_fields_this_setting;

	$value = getVariableOrDefault($a, $f, null);
	if ($value === null) return;

	// Add command and newline to prior line starting with 2nd field.
	if ($num_fields_this_setting++ > 0) {
		$options_str .= ",\n";
	}

	if ($f === "options")
		add_options_field($f, $value, $setting);
	else
		add_field($f, $value, $setting, $type);
}

// Format the given argument with or without quotes, depending on the argument type.
// If a type is specified, use it.
function quote_value($v, $type=null) {
	global $q;

	if ($type === null)
		$type = gettype($v);

	if ($type == "boolean") {
		if ($v === 0 || $v === "0" || $v === "false" || $v === false || ! $v)
			return("false");
		else
			return("true");
	} else if (is_numeric($v)) {
		return($v);
	} else {
		return("$q$v$q");
	}
}


// Return $v if it's not a string, and optionally if $return_string is set.
// This is needed because we never need to look in non-string values for "_min", "_max", etc.
function add_value($v, $return_string, $type=null) {
	$newV = quote_value($v, $type);
	if (! $return_string && substr($newV, 0, 1) == '"')
		return(null);		// Is a string so dont' return it.
	else
		return($newV);
}

// Add a field to the options string.
// Adding the field name is simple.
// For the value, we first need to check if it's a placeholder value,
// and if so, replace the placeholder with the actual value from the camera capabilities file.
// If it's not a placeholder value we just add it.
function add_field($f, $v, $setting, $type=null) {	// field, value, setting_name, type
	global $q;
	global $debug;
	global $cc_controls;
	global $options_str;
	$options_str .= "$q$f$q : ";				// field name

	// Do not add value if it's a string since we need to check if it needs to be replaced
	$newV = add_value($v, false, $type);
	if ($newV !== null) {
		$options_str .= $newV;
		return;
	}

	if ($debug > 1 && $f !== "name") {
		// The "name" was already displayed.
		// It's hard to read the output with really long strings.
		if (strlen($v) > 50) $vv = substr($v, 0, 50) . "...";
		else $vv = $v;
		echo "    $f: $vv";
	}

	// Check if the value is a generic placeholder, like "_min".
	// The "options" field is handled in add_options_field() since it's value is an array.
	// The "display" field was handled earlier.
	if (is_generic_value($v) || is_specific_value($v)) {
		$searchCC = true;
	} else {
		$searchCC = false;
	}

	if ($searchCC) {
		// For generic values, if the setting is a day/night one, e.g., "dayexposure",
		// get just the "exposure" portion.
		// For specific values e.g., "daymean" : "day_default",
		// need to look up "daymean" in the CC file,
		// not "mean" like we do for generic values

		if (is_generic_value($v)) {
			$setting = get_generic_name($setting);
		}
		if (get_control($cc_controls, $setting, $min, $max, $default)) {
			$vReset = false;
			if ($f === "minimum") {
				$v = $min;
				$vReset = true;
			} else if ($f === "maximum") {
				$v = $max;
				$vReset = true;
			} else if ($f === "default") {
				$v = $default;
				$vReset = true;
			}
			if ($debug > 1) {
				if ($vReset) echo ", RESET v='$v'";
			}
		}
	}
	if ($debug > 1 && $f !== "name") echo "\n";
	$options_str .= quote_value($v, null);
}

// Add the options for the specified field to the options string.
// The cc_array entry for these fields are all at the top level.
// The camera capabilities already has the list in json format.
function handle_options($f) {
	global $q;
	global $options_str;
	global $cc_array;

	if ($f === "cameratype")
		$cc_field = "cameraTypes";
	elseif ($f === "cameramodel")
		$cc_field = "cameraModels";
	elseif ($f === "bin")
		$cc_field = "supportedBins";
	elseif ($f === "type")
		$cc_field = "supportedImageFormats";
	elseif ($f === "rotation")
		$cc_field = "supportedRotations";
	else {
		echo "ERROR: '$f' does not have an 'options' field\n";
		return;
	}
	$cc_options = getVariableOrDefault($cc_array, $cc_field, null);
	if ($cc_options === null) {
		echo "ERROR: Could not find '$cc_field' for field '$f'.\n";
		return false;
	}

	$num_options = count($cc_options);
	foreach ($cc_options as $opt) {
		if (is_array($opt)) {
			$options_str .= "\t{";
			$num = count($opt);
			foreach ($opt as $f => $v) {
				// output if string or not
				$options_str .= "$q$f$q : " . add_value($v, true, null);
				$num--;
				if ($num > 0)
					$options_str .= ", ";
			}
			$options_str .= '}';
			$num_options--;
			if ($num_options > 0) $options_str .= ",";
			$options_str .= "\n";
		} else {
			echo "ERROR: Field '$f': '$cc_field' not an array, is '$opt'.";
		}
	}
}

// This is the 'options' field in a setting, which is an array.
// Add it to the options string.
function add_options_field($field, $options, $setting) {
	global $q;
	global $options_str;

	$options_str .= "$q$field$q : [\n";		// field name

	$setting = get_generic_name($setting);

	// Loop through each entry of the array looking for values to replace.
	$num_options = count($options);
	foreach ($options as $opt) {
		if (is_array($opt)) {
			$options_str .= "\t{";
			$num = count($opt);
			foreach ($opt as $f => $v) {
				// output if string or not
				$options_str .= "$q$f$q : " . add_value($v, true, null);
				$num--;
				if ($num > 0)
					$options_str .= ", ";
			}
			$options_str .= '}';
			$num_options--;
			if ($num_options > 0) $options_str .= ",";
			$options_str .= "\n";

		} else {	// single value - check it for _values, etc.
			if ($opt === "{$setting}_values") {
				handle_options($setting);
			}
		}
	}
	$options_str .= "]";
}

$rest_index;
$longopts = array(
	"debug",		// no arguments
	"debug2",		// no arguments
	"help",			// no arguments
	"cc-file:",
	"options-file:",
	"settings-file:",
	"force",		// no arguments
);
$options = getopt("", $longopts, $rest_index);

$debug = 0;			// Can be specified mutliple time
$help = false;
$cc_file = "";
$options_file = "";
$settings_file = "";
$force = false;		// force creation of settings file even if it already exists?

foreach ($options as $opt => $val) {
	// if ($debug > 1 || $opt === "debug" || $opt === "debug2") echo "   Argument $opt $val\n";
	if ($debug > 1) echo "   Argument $opt $val\n";

	if ($opt === "debug")
		$debug++;
	else if ($opt === "debug2")
		$debug = 2;
	else if ($opt === "help")
		$help = true;
	else if ($opt === "cc-file")
		$cc_file = $val;
	else if ($opt === "options-file")
		$options_file = $val;
	else if ($opt === "settings-file")
		$settings_file = $val;
	else if ($opt === "force")
		$force = true;
	else
		echo "WARNING: Ignoring unknown argument: $opt\n";
}

if ($help || $cc_file === "" || $options_file === "") {
	echo "\nUsage: " . basename($argv[0]) . " [--debug] [--debug2] [--help] [--settings-file file] --cc-file file --options-file file\n";
	exit(1);
}

if (! file_exists($cc_file)) {
	echo "ERROR: Camera capabilities file $cc_file does not exist!\n";
	echo "Run 'install.sh --update' to create it.\n";
	exit(2);
}
$repo_file = ALLSKY_REPO . "/" . basename($options_file) . ".repo";
if (! file_exists($repo_file)) {
	echo "ERROR: Template options file $repo_file does not exist!\n";
	exit(3);
}

// Read $cc_file
$errorMsg = "ERROR: Unable to process cc file '$cc_file'.";
$cc_array = get_decoded_json_file($cc_file, true, $errorMsg);
if ($cc_array === null) {
	exit(4);
}
$cc_controls = $cc_array["controls"];
$ok = true;
$cameraType = getVariableOrDefault($cc_array, "cameraType", "");
if ($cameraType === "") {
	echo "ERROR: cameraType empty in cc_array!\n";
	$ok = false;
}
$cameraModel = getVariableOrDefault($cc_array, "cameraModel", "");
if ($cameraModel === "") {
	echo "ERROR: cameraModel empty in cc_array!\n";
	$ok = false;
}
$cameraNumber = getVariableOrDefault($cc_array, "cameraNumber", "");
if ($cameraNumber === "") {
	echo "ERROR: cameraNumber empty in cc_array!\n";
	$ok = false;
}
if (! $ok) exit(5);

if ($debug > 0) echo "cameraType=$cameraType, cameraModel=$cameraModel\n";

// Read $repo_file
$errorMsg = "ERROR: Unable to process template options file '$repo_file'.";
$repo_array = get_decoded_json_file($repo_file, true, $errorMsg);
if ($repo_array === null) {
	exit(5);
}

// All entries except the last "$endSetting" name have a "type". 
// All entries but type=="header*" have a "name".
// Out of convention, the order of the fields is (a setting may not have all fields):
	// name					[string]
	// display				[boolean]	# must be 2nd if present
	// settingsonly			[boolean]	# must be 3rd if present
	// minimum				[number]
	// maximum				[number]
	// default				[string, but usually a number]
	// description			[string]
	// label				[string]
	// label_prefix			[string]
	// type					[string]
	// usage				[string]
	// carryforward			[boolean]
	// options				[array with 1 or more entries] (only if "type" == "select_*")
	// checkchanges			[boolean]
	// source				[string]
	// booldependson		[string]	("name" of other setting)
	// booldependsoff		[string]	("name" of other setting)
	// popup-yesno			[string]
	// popup-yesno-value	[number or string]
	// optional				[boolean]
	// action				[string]


// ==================   Create options file

// A "generic" value is one that's the same for day and night, e.g., the minimum value
// for the "dayexposure" and "nightexposure".
// These are often specified by the camera and have an "argumentName" in the CC
// file without the "day" or "night", e.g., "exposure".

// Field values that begin with "_", e.g., "_default" are generic placeholders; their
// actual values need to be determined by looking in the CC file for the generic name.
// The repo options file will typically have "_" followed by the field name,
// e.g., "_default" for the "default" field, but we only check if the first char is "_".

// Field values that being with "day_" or "night_", e.g., "day_default" have
// different values for day and night in the CC file, e.g., default value for day
// and night exposure.

// How many fields for this setting have we output?
// Used to add commas to all but the last field.
$num_fields_this_setting = 0;

$options_str = "[\n";
foreach ($repo_array as $repo) {
	global $debug;
	global $cc_controls;
	global $endSetting;
	global $num_fields_this_setting;
	$num_fields_this_setting = 0;

	$name = getVariableOrDefault($repo, "name", null);
	$type = getVariableOrDefault($repo, "type", null);
	if ($name === $endSetting) {
		$options_str .= "{\n";
		$options_str .= "{$q}name{$q} : {$q}$name{$q},\n";
		$options_str .= "{$q}type{$q} : {$q}$type{$q},\n";
		$options_str .= "{$q}display{$q} : false\n";
		$options_str .= "}\n";
		break;		// hit the end
	}

	if ($debug > 1) echo "Processing setting [$name]: ";

	// Before adding the setting, make sure the "display" field says we can.
	// The value will be true (can display) or false (don't display), or a placeholder.

	$display = getVariableOrDefault($repo, "display", null);
	if ($display === null) {
		$display = "true";		// default
	} else if ($display === "false") {
		if ($debug > 1) echo "    'display' field is false; skipping\n";
		continue;
	}

	if (is_generic_value($display)) {
		// Is a placeholder - need to check if the setting is in the CC file.
		// If not, don't output this setting.
		if (! get_control($cc_controls, get_generic_name($name), $min, $max, $default)) {
			if ($debug > 1) {
				echo "\n$name: <<<<< NOT SUPPORTED >>>>>\n";
			}
			// Not an error - just means this isn't supported.
			continue;
		}
	}
	if ($debug > 1) echo "\n";

	// Have to handle camera type and model differently because the defaults
	// might not be what we want.
	if ($name === "cameratype") {
			$repo["default"] = $cameraType;
	} elseif ($name === "cameramodel") {
			$repo["default"] = $cameraModel;
	} elseif ($name === "cameranumber") {
			$repo["default"] = "$cameraNumber";
	} elseif ($name === "camera") {
			$repo["default"] = "$cameraType $cameraModel";
	}

	$options_str .= "{\n";
		add_non_null_field($repo, "name", $name);

		// Only get here if display is true so no need to add "display" field.

		if (getVariableOrDefault($repo, "settingsonly", "false") === "true") {
			add_non_null_field($repo, "settingsonly", $name, "boolean");
			add_non_null_field($repo, "label", $name);
			add_non_null_field($repo, "label_prefix", $name);
			add_non_null_field($repo, "default", $name, $type);
			add_non_null_field($repo, "type", $name);
		} else {
			add_non_null_field($repo, "minimum", $name);
			add_non_null_field($repo, "maximum", $name);
			add_non_null_field($repo, "default", $name, $type);
			add_non_null_field($repo, "description", $name);
			add_non_null_field($repo, "label", $name);
			add_non_null_field($repo, "label_prefix", $name);
			add_non_null_field($repo, "type", $name);
			add_non_null_field($repo, "usage", $name);
			add_non_null_field($repo, "carryforward", $name, "boolean");
			add_non_null_field($repo, "options", $name);
			add_non_null_field($repo, "checkchanges", $name, "boolean");
			add_non_null_field($repo, "optional", $name, "boolean");
			add_non_null_field($repo, "source", $name);
			add_non_null_field($repo, "action", $name);
		}
	$options_str .= "\n},\n";
}
$options_str .= "]\n\n";

// Save the options file.
$results = updateFile($options_file, $options_str, "options", true);
if ($results != "") {
	echo "ERROR: Unable to create $options_file.\n";
	exit(6);
}


// ==================   Create settings file

// If a $settings_file was passed in, create a "settings" file.
// If this camera type/model is already known, use that file,
// otherwise create a "settings" file with defaults for this camera.
// However, if there's an old settings file port its generic fields to the new file.

if ($settings_file !== "") {
	// Determine the name of the camera type/model-specific file.
	$pieces = explode(".", basename($settings_file));		// e.g., "settings.json"
	if (count($pieces) !== 2) {
		echo "ERROR: invalid name: '$settings_file'\n";
		exit(7);
	}
	$FileName = $pieces[0];		// e.g., "settings"
	$FileExt = $pieces[1];		// e.g., "json"

	// The camera model may have spaces which is a hassle in file names,
	// so convert to underscores.
	$cameraModel = str_replace(" ", "_", $cameraModel);

	// e.g., "settings_ZWO_ASI123.json"
	$cameraSpecificSettingsName = "{$FileName}_{$cameraType}_{$cameraModel}.{$FileExt}";

	$fullSpecificFileName = dirname($settings_file) . "/$cameraSpecificSettingsName";
	$specificFileExists =  file_exists($fullSpecificFileName);
	if ($debug > 0) {
		$e =  $specificFileExists ? "yes" : "no";
		if ($debug > 1) echo "\n";
		echo "Camera-specific settings file exists ($e): $fullSpecificFileName.\n";
	}

	// If the settings file exists, it's a generic link to a camera-specific named file.
	// Remove the link because it points to a prior camera.
	$settings_array = null;
	if (file_exists($settings_file)) {
		if ($specificFileExists) {
			$errorMsg = "ERROR: Unable to process prior settings file '$settings_file'.";
			$settings_array = get_decoded_json_file($settings_file, true, $errorMsg);
		}

		if ($debug > 0) echo "Removing $settings_file.\n";
		if (! unlink($settings_file)) {
			echo "ERROR: Unable to delete $settings_file.\n";
			exit(8);
		}
	}

	// If there isn't a camera-specific file, create one.
	if ($force || ! $specificFileExists) {
		// For each item in the options file, write the name and a value.
		$new_settings = Array();
		$options_array = json_decode($options_str, true);
		foreach ($options_array as $option) {
			$type = getVariableOrDefault($option, 'type', "");

			if (substr($type, 0, 6) == "header" ||
					getVariableOrDefault($option, 'source', null) !== null ||
					getVariableOrDefault($option, 'display', "true") == "false") {
				continue;	// don't put in settings file
			}

			$name = $option['name'];

			// If there's a previous value, use it, else use the default.
			if ($settings_array !== null) {
				$val = getVariableOrDefault($settings_array, $name, null);
			} else {
				$val = getVariableOrDefault($option, 'default', "");
			}
			if ($type == "boolean") {
				if ($val == "true") $val = true;
				else $val = false;
			}
			$new_settings[$name] = $val;
		}
		$new_settings[$endSetting] = true;

		$mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;
		$contents = json_encode($new_settings, $mode);

		if ($debug > 0) echo "Creating camera-specific settings file: $fullSpecificFileName.\n";
		$results = updateFile($fullSpecificFileName, $contents, $cameraSpecificSettingsName, true);
		if ($results != "") {
			echo "ERROR: Unable to create $fullSpecificFileName.\n";
			exit(9);
		}

	} else if ($debug > 0) {
		// There IS a camera-specific file for the new camera type so we
		// don't need to do anything special.
		// The generic name will be linked to the specific name below.
		echo "Using existing $fullSpecificFileName.\n";
	}

	if ($debug > 0) echo "Linking $fullSpecificFileName to $settings_file.\n";
	if (! link($fullSpecificFileName, $settings_file)) {
		echo "ERROR: Unable to link $fullSpecificFileName to $settings_file.\n";
		exit(10);
	}
}

exit(0);
?>
