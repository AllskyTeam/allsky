#!/usr/bin/php
<?php

// Create a camera type/model-specific "options" file for the new camera.
// Because php scripts don't return exit codes, we'll output "XX_WORKED_XX" if it worked
// so the invoker knows.

include_once('functions.php');

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
	echo "\nUsage: " . basename($argv[0]) . " [--debug] [--help] [--settings_file file] --dir directory --cc_file file --options_file file\n\n";
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

// Create options file

// Read $cc_file
$cc_str = file_get_contents($cc_file_full, true);
$cc_array = json_decode($cc_str, true);
$cameraType = $cc_array["cameraType"];
$cameraModel = $cc_array["cameraModel"];

// Read $repo_file
$repo_str = file_get_contents($repo_file, true);
//$repo_str = file_get_contents(getOptionsFile($cameraType), true);	// xxxxxxxxxxxx
if ($repo_str == "") {
	echo "ERROR: Template options file $repo_file is empty!\n";
	exit;
}
$repo_array = json_decode($repo_str, true);
if ($repo_array === null) {
	echo "ERROR: Cannot decode $repo_file!";
	exit;
}

$options_str = "[\n";
// TODO: *** Work magic to create $options_file_full, using $cc_array and $repo_array.
$options_str .= "]\n";

// Now save the file.
$results = updateFile($options_file_full, $options_str, $options_file);
if ($results != "") {
	echo "ERROR: Unable to create $options_file_full.\n";
	exit;
}
// $options_array = $cc_array = json_decode($options_str, true);
$options_array = $repo_array;	// XXXXXX use this until the TODO above is done.

if ($settings_file !== "") {
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
	$pieces = explode(".", $settings_file);
	$cameraSettingsFileName = $pieces[0];
	$cameraSettingsFileExt = $pieces[1];
	$cameraSettingsFile = $cameraSettingsFileName . "_" . $cameraType . "_" . $cameraModel . ".$cameraSettingsFileExt";
	$fullName = "$directory/$cameraSettingsFile";

	// If there isn't a camera-specific file, create one.
	if ($force || ! file_exists($fullName)) {
		// For each item in the options file, write the name and default value.
		$contents = "{\n";
		foreach ($repo_array as $option) {
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
		// Thsi comes last so we don't worry about whether or not the items above
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
