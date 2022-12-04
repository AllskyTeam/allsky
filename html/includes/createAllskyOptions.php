#!/usr/bin/php
<?php

// Create a camera type/model-specific "options" file for the new camera.
// Because php scripts don't return exit codes, we'll output "XX_WORKED_XX" if it worked
// so the invoker knows.

include_once('functions.php');

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

// Get a camera control.  Return true if it exists, false if it doesn't.
// If it exists, set the min, max, and default.
function get_control($array, $setting, &$min, &$max, &$default) {
	$i = 0;
//x echo "Looking for control [$setting]: ";
	foreach ($array as $cc) {
		$i++;
		if ($cc["argumentName"] === $setting) {
//x echo "match at number $i\n";
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
function add_non_null_field($a, $f, $setting) {	// array, field, name_of_setting
	$value = getVariableOrDefault($a, $f, null);
	if ($value === null) return;

	if ($f === "options")
		add_options_field($f, $value, $setting);
	else
		add_field($f, $value, $setting);
}

// Update $options_str with $v if it's not a string, and optionally if $return_string is set.
// Return true if we updated $options_str.
// This is needed because we never need to look in non-string values for "_min", "_max", etc.
function add_value($v, $return_string) {
	global $q;
	global $options_str;

	if ($v === true || $v === false || $v === null || is_numeric($v)) {
		$options_str .= $v;
		return true;
	} else if ($return_string) {
		$options_str .= "$q$v$q";
		return true;
	}
	return false;
}

// Add a field to the options string.
// Adding the field name is simple.
// For the value, we first need to check if it's a placeholder value,
// and if so, replace the placeholder with the actual value from the camera capabilities file.
// If it's not a placeholder value we just add it.
function add_field($f, $v, $setting) {	// field, value, name_of_setting
	global $q;
	global $debug;
	global $cc_controls;
	global $options_str;
	$options_str .= "$q$f$q : ";				// field name

	// Do not add value if a string since we need to check if it needs to be replaced
	if (! add_value($v, false)) {
		// If the setting is a day/night one, e.g., "daybin", get just the "bin" portion.
		$setting = get_generic_name($setting);
	
		// Check if the value is a placeholder, like "bin_min" for the "bin" setting.
		// These are the only fields that have placeholders.
		// The "options" field is handles in add_options_field() since it's value is an array.
		// The "display" field was handled earlier.
if ($debug > 1) echo "Setting '$setting', field '$f', v='$v'\n";

		if (get_control($cc_controls, $setting, $min, $max, $default)) {
if ($debug > 1) echo "   >>> found in controls list\n";
			if ($f === "minimum") {
				if ($v === $setting . "_min") {
					$v = $min;
				}
			} else if ($f === "maximum") {
				if ($v === $setting . "_max") {
					$v = $max;
				}
			} else if ($f === "default") {
				if ($v === $setting . "_default") {
if ($debug > 1) echo "     >>>>> Setting '$setting', field '$f' _default=[$default]\n";
					$v = $default;
				}
			}
		}
		$options_str .= "$q$v$q";
	}

	// The "advanced" field comes last in a setting, so don't append a comma to it.
	if ($f !== "advanced") $options_str .= ",";
	$options_str .= "\n";
}

// Add the options for the specified field to the options string.
// The cc_array entry for these fields are all at the top level.
// The camera capabilities already has the list in json format.
function handle_options($f) {
	global $q;
	global $options_str;
	global $cc_array;

	if ($f === "bin")
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
			$options_str .= "\t" . '{';
			$num = count($opt);
			foreach ($opt as $f => $v) {
				$options_str .= "$q$f$q : ";		// must split this line from next
				add_value($v, true);	// output if string or not
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
			$options_str .= "\t" . '{';
			$num = count($opt);
			foreach ($opt as $f => $v) {
				$options_str .= "$q$f$q : ";		// must split this line from next
				add_value($v, true);	// output if string or not
				$num--;
				if ($num > 0)
					$options_str .= ", ";
			}
			$options_str .= '}';
			$num_options--;
			if ($num_options > 0) $options_str .= ",";
			$options_str .= "\n";

		} else {	// single value - check it for _values, etc.
			if ($opt === $setting . "_values") {
				handle_options($setting);
			}
		}
	}
	$options_str .= "],\n";
}

$rest_index;
$longopts = array(
	"debug::",		// no arguments
	"debug2::",		// no arguments
	"help::",		// no arguments
	"cc_file:",
	"options_file:",
	"settings_file:",
	"force::",		// no arguments
);
$options = getopt("", $longopts, $rest_index);

$debug = 0;			// Can be specified mutliple time
$help = false;
$cc_file = "";
$options_file = "";
$settings_file = "";
$force = false;		// force creation of settings file even if it already exists?

foreach ($options as $opt => $val) {
	if ($debug > 0) echo "   Argument $opt = $val\n";

	if ($opt === "debug")
		$debug++;
	else if ($opt === "debug2")
		$debug = 2;
	else if ($opt === "help")
		$help = true;
	else if ($opt === "cc_file")
		$cc_file = $val;
	else if ($opt === "options_file")
		$options_file = $val;
	else if ($opt === "settings_file")
		$settings_file = $val;
	else if ($opt === "force")
		$force = true;
	else
		echo "WARNING: Ignoring unknown argument: $opt\n";
}

if ($help || $cc_file === "" || $options_file === "") {
	echo "\nUsage: " . basename($argv[0]) . " [--debug] [--debug2] [--help] [--settings_file file] --cc_file file --options_file file\n";
	exit;
}

if (! file_exists($cc_file)) {
	echo "ERROR: Camera capabilities file $cc_file does not exist!\n";
	echo "Run 'install.sh --update' to create it.\n";
	exit;
}
$repo_file = ALLSKY_REPO . "/" . basename($options_file) . ".repo";
if (! file_exists($repo_file)) {
	echo "ERROR: Template options file $repo_file does not exist!\n";
	exit;
}

// Read $cc_file
$cc_str = file_get_contents($cc_file, true);
$cc_array = json_decode($cc_str, true);
$cc_controls = $cc_array["controls"];
$cameraType = $cc_array["cameraType"];
$cameraModel = $cc_array["cameraModel"];
if ($debug > 0) echo "cameraType=$cameraType, cameraModel=$cameraModel\n";

// Read $repo_file
$repo_str = file_get_contents($repo_file, true);
if ($repo_str == "") {
	echo "ERROR: Template options file $repo_file is empty!\n";
	exit;
}
$repo_array = json_decode($repo_str, true);
if ($repo_array === null) {
	echo "ERROR: Cannot decode $repo_file!\n";
	exit;
}

// All entries except the last "XX_END_XX" name have a "type". 
// All entries but type=="header" have a "name".
// Out of convention, the order of the fields is (a setting may not have all fields):
	// name				[string]
	// minimum			[number]
	// maximum			[number]
	// default			[string, but usually a number]
	// description		[string]
	// label			[string]
	// type				[string - header, number, text, checkbox, select, readonly]
	// options			[array with 1 or more entries] (only if "type" == "select")
	// display			[0/1]
	// checkchanges		[0/1]
	// optional			[0/1]
	// nullOK			[0/1]
	// advanced 		[0/1]	(last, so no comma after it)


// Create options file

$options_str = "[\n";
foreach ($repo_array as $repo) {
	global $debug;
	global $cc_controls;

	$type = getVariableOrDefault($repo, "type", null);
	$name = getVariableOrDefault($repo, "name", null);
	if ($type === null && $name === "XX_END_XX") {
		$options_str .= "{\n";
		$options_str .= "$q" . "name$q : $q$name$q,\n";
		$options_str .= "$q" . "display$q : 0\n";
		$options_str .= "}\n";
		break;		// hit the end
	}

	if ($debug > 1) echo "Processing setting [$name]: ";

	// Before adding the setting, make sure the "display field says we can.
	// Typically the value will be 1 (can display) or a placeholder.
	// It should normally not be missing, but check anyhow.
	$display = getVariableOrDefault($repo, "display", null);
	if ($display === null) {
		if ($debug > 1) echo "display field=null\n";
		continue;
	}
	if ($display !== 1) {
		// should be a placeholder
		$n = get_generic_name($name);
		if ($display === $n . "_display") {
			if ($debug > 1) echo "display=$display.";
			if (! get_control($cc_controls, $n, $min, $max, $default)) {
				if ($debug > 1) echo "     <<<<< NOT SUPPORTED >>>>>\n";
				// Not an error - just means this isn't supported.
				continue;
			}
			if ($debug > 1) echo "\n";
			$repo["display"] = 1;	// a control exists for it, so display the setting.
		}
	} elseif ($debug > 1) {
		echo "standard setting.\n";
	}

	// Have to handle camera type and model differently because the defaults
	// might not be what we want.
	if ($name === "cameraType")
			$repo["default"] = $cameraType;
	elseif ($name === "cameraModel")
			$repo["default"] = $cameraModel;

	$options_str .= "{\n";
		add_non_null_field($repo, "name", $name);
		add_non_null_field($repo, "minimum", $name);
		add_non_null_field($repo, "maximum", $name);
		add_non_null_field($repo, "default", $name);
		add_non_null_field($repo, "description", $name);
		add_non_null_field($repo, "label", $name);
		add_non_null_field($repo, "type", $name);
		add_non_null_field($repo, "options", $name);
		add_non_null_field($repo, "display", $name);
		add_non_null_field($repo, "checkchanges", $name);
		add_non_null_field($repo, "optional", $name);
		add_non_null_field($repo, "nullOK", $name);
		add_non_null_field($repo, "advanced", $name);
	$options_str .= "},\n";
}
$options_str .= "]\n\n";

// Save the options file.
$results = updateFile($options_file, $options_str, "options", true);
if ($results != "") {
	echo "ERROR: Unable to create $options_file.\n";
	exit;
}

// Optionally create a basic "settings" file with the default for this camera type/model.

if ($settings_file !== "") {
	$options_array = json_decode($options_str, true);

	// If the file exists, it's a generic link to a camera-specific named file.
	// Remove the link because it points to a prior camera.
	if (file_exists($settings_file)) {
		if ($debug > 0) echo "Removing $settings_file.\n";
		if (! unlink($settings_file)) {
			echo "ERROR: Unable to delete $settings_file.\n";
			exit;
		}
	}

	// Determine the name of the camera type/model-specific file.
	$pieces = explode(".", basename($settings_file));		// e.g., "settings.json"
	$FileName = $pieces[0];		// e.g., "settings"
	$FileExt = $pieces[1];		// e.g., "json"
	// e.g., "settings_ZWO_ASI123.json"
	$cameraSpecificSettingsFile = $FileName . "_$cameraType" . "_$cameraModel.$FileExt";
	$fullName = dirname($settings_file) . "/$cameraSpecificSettingsFile";

	// If there isn't a camera-specific file, create one.
	if ($force || ! file_exists($fullName)) {
		// For each item in the options file, write the name and default value.
		$contents = "{\n";
		foreach ($options_array as $option) {
			$type = getVariableOrDefault($option, 'type', "");
			if ($type == "header") continue;	// don't put in settings file
			$display = getVariableOrDefault($option, 'display', 0);
			if ($display === 0) continue;

			$name = $option['name'];
			$default = getVariableOrDefault($option, 'default', "");
			if ($debug > 1) echo ">> $name = [$default]\n";

			// Don't worry about whether or not the default is a string, number, etc.
			$contents .= "\t\"$name\" : \"$default\",\n";
		}
		// This comes last so we don't worry about whether or not the items above
		// need a trailing comma.
		$contents .= "\t\"XX_END_XX\" : 1\n";
		$contents .= "}\n";

		if ($debug > 0) echo "Creating settings file: $fullName.\n";
		$results = updateFile($fullName, $contents, $cameraSpecificSettingsFile, true);
		if ($results != "") {
			echo "ERROR: Unable to create $fullName.\n";
			exit;
		}

	} else if ($debug > 0) {
		// There IS a camera-specific file for the new camera type so we
		// don't need to do anything special.
		// The generic name will be linked to the specific name below.
		echo "Using existing $fullName.\n";
	}

	if ($debug > 0) echo "Linking $settings_file to $fullName.\n";
	if (! link($fullName, $settings_file)) {
		echo "ERROR: Unable to link $settings_file to $fullName.\n";
		exit;
	}
}

echo "XX_WORKED_XX\n";

?>
