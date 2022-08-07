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
//x echo "\nLooking for control [$setting]\n";
	foreach ($array as $cc) {
//x echo "   [" . $cc["argumentName"] . "]\n";
		$i++;
		if ($cc["argumentName"] === $setting) {
//x echo "$setting match at number $i\n";
			$min = getVariableOrDefault($cc, "MinValue", null);
			$max = getVariableOrDefault($cc, "MaxValue", null);
			$default = getVariableOrDefault($cc, "Defaultvalue", null);
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
if ($debug) echo "Setting '$setting', field '$f', v='$v'\n";

		if (get_control($cc_controls, $setting, $min, $max, $default)) {
if ($debug) echo "   >>> found in controls list\n";
			if ($f === "minimum") {
				if ($v === $setting . "_min") {
if ($debug) echo "     >>>>> found _min\n";
					$v = $min;
				}
			} else if ($f === "maximum") {
				if ($v === $setting . "_max") {
					$v = $max;
				}
			} else if ($f === "default") {
				if ($v === $setting . "_default") {
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
	"help::",		// no arguments
	"dir:",
	"cc_file:",
	"options_file:",
	"settings_file:",
	"force::",		// no arguments
);
$options = getopt("", $longopts, $rest_index);

$debug = false;
$help = false;
$directory = "";	// All the files will go in $directory.
$cc_file = "";
$options_file = "";
$settings_file = "";
$force = false;		// force creation of settings file even if it already exists?

foreach ($options as $opt => $val) {
	if ($debug) echo "Argument $opt = $val\n";

	if ($opt === "debug")
		$debug = $val === "true" ? true : false;
	else if ($opt === "help")
		$help = true;
	else if ($opt === "dir")
		$directory = $val;
	else if ($opt === "cc_file")
		$cc_file = $val;
	else if ($opt === "options_file")
		$options_file = $val;
	else if ($opt === "settings_file")
		$settings_file = $val;
	else if ($opt === "force")
		$force = true;
}

if ($help || $directory === "" || $cc_file === "" || $options_file === "") {
	echo "\nUsage: " . basename($argv[0]) . " [--debug] [--help] [--settings_file file] --dir directory --cc_file file --options_file file\n";
	echo "'directory' is where the files are\n\n";
	exit;
}

$cc_file_full = "$directory/$cc_file";
if (! file_exists($cc_file_full)) {
	echo "ERROR: Camera capabilities file $cc_file_full does not exist!\n";
	echo "Run 'install.sh --update' to create it.";
	exit;
}
$repo_file = ALLSKY_REPO . "/" . $options_file . ".repo";
if (! file_exists($repo_file)) {
	echo "ERROR: Template options file $repo_file does not exist!\n";
	exit;
}

$options_file_full = "$directory/$options_file";
$settings_file_full = "$directory/$settings_file";

// Read $cc_file
$cc_str = file_get_contents($cc_file_full, true);
$cc_array = json_decode($cc_str, true);
$cc_controls = $cc_array["controls"];
$cameraType = $cc_array["cameraType"];
$cameraModel = $cc_array["cameraModel"];

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
	// type				[string - header, number, text, checkbox, select]
	// options			[array with 1 or more entries] (only if "type" == "select")
	// display			[0/1]
	// checkchanges		[true/false]
	// advanced 		[0/1]	(last, so no comma after it)


// Create options file

$options_str = "[\n";
foreach ($repo_array as $repo) {
	global $cc_controls;

	$type = getVariableOrDefault($repo, "type", null);
	$name = getVariableOrDefault($repo, "name", null);
	if ($type === null && $name === "XX_END_XX") {
		$options_str .= "{\n$q" . "name$q : $q$name$q\n}\n";
		break;		// hit the end
	}

	// Before adding the setting, make sure the "display field says we can.
	// Typically the value will be 1 (can display) or a placeholder.
	// It should normally not be 0 or missing, but check anyhow.
	$display = getVariableOrDefault($repo, "display", null);
	if ($display === null || $display === 0) continue;
	if ($display !== 1) {
		// should be a placeholder
		$n = get_generic_name($name);
		if ($display === $n . "_display") {
			if (! get_control($cc_controls, $n, $min, $max, $default)) {
				continue;
			}
			$repo["display"] = 2;
		}
	}

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
		add_non_null_field($repo, "advanced", $name);
	$options_str .= "},\n";
}
$options_str .= "]\n\n";

// Save the options file.
$results = updateFile($options_file_full, $options_str, $options_file);
if ($results != "") {
	echo "ERROR: Unable to create $options_file_full.\n";
	exit;
}

// Optionally create a basic "settings" file with the default for this camera type/model.

if ($settings_file !== "") {
	$options_array = json_decode($options_str, true);

	// If the file exists, it's a generic link to a camera-specific named file.
	// Remove the link because it points to a prior camera.
	if (file_exists($settings_file_full)) {
		if ($debug) echo "Unlinking $settings_file_full.\n";
		if (! unlink($settings_file_full)) {
			echo "ERROR: Unable to delete $settings_file_full.\n";
			exit;
		}
	}

	// Determine the name of the camera type/model-specific file.
	$pieces = explode(".", $settings_file);		// e.g., "settings.json"
	$cameraSettingsFileName = $pieces[0];		// e.g., "settings"
	$cameraSettingsFileExt = $pieces[1];		// e.g., "json"
	// e.g., "settings_ZWO_ASI123.json"
	$cameraSettingsFile = $cameraSettingsFileName . "_$cameraType" . "_$cameraModel.$cameraSettingsFileExt";
	$fullName = "$directory/$cameraSettingsFile";

	// If there isn't a camera-specific file, create one.
	if ($force || ! file_exists($fullName)) {
		// For each item in the options file, write the name and default value.
		$contents = "{\n";
		foreach ($options_array as $option) {
			$type = getVariableOrDefault($option, 'type', "");
			if ($type == "header") continue;
			$display = getVariableOrDefault($option, 'display', 0);
			if ($display === 0) continue;

			$name = $option['name'];
			$default = getVariableOrDefault($option, 'default', "");
			if ($debug) echo ">> $name = [$default]\n";

			// Don't worry about whether or not the default is a string, number, etc.
			$contents .= "\t\"$name\" : \"$default\",\n";
		}
		// This comes last so we don't worry about whether or not the items above
		// need a trailing comma.
		$contents .= "\t\"cameraModel\" : \"$cameraModel\"\n";
		$contents .= "}\n";

		if ($debug) echo "Creating settings file: $fullName.\n";
		$results = updateFile($fullName, $contents, $cameraSettingsFile);
		if ($results != "") {
			echo "ERROR: Unable to create $fullName.\n";
			exit;
		}

	} else if ($debug) {
		// There IS a camera-specific file for the new camera type so we
		// don't need to do anything special.
		// The generic name will be linked to the specific name below.
		echo "Using existing $fullName.\n";
	}

	if ($debug) echo "Linking $settings_file_full to $fullName.\n";
	if (! link($fullName, $settings_file_full)) {
		echo "ERROR: Unable to link $settings_file_full to $fullName.\n";
		exit;
	}
}

echo "XX_WORKED_XX\n";

?>
