#!/usr/bin/php
<?php

// Create a camera type/model-specific "options" file for the new camera.
// Because php scripts don't return exit codes, we'll output "XX_WORKED_XX" if it worked
// so the invoker knows.

include_once('functions.php');

$rest_index;
$longopts = array(
	"dir:",
	"cc_file:",
	"options_file:",
	"settings_file:",
	"debug::",		// no arguments
	"help::",		// no arguments
);
$options = getopt("", $longopts, $rest_index);

$debug = true;		// XXXXXXXX true during testing
$help = false;
$directory = "";	// All the files will go in $directory.
$cc_file = "";
$options_file = "";
$settings_file = "";

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
}

if ($help || $directory === "" || $cc_file === "" || $options_file === "") {
	echo "\nUsage: " . basename($argv[0]) . " [--debug] [--help] [--settings_file file] --dir directory --cc_file file --options_file file\n\n";
	exit;
}

$cc_file_full = "$directory/$cc_file";
if (! file_exists($cc_file_full)) {
	echo "ERROR: Camera capabilities file $cc_file_full does not exist!";
	echo "Run 'install.sh --update' to create it.";
	exit;
}
$options_file_full = "$directory/$options_file";
$settings_file_full = "$directory/$settings_file";
$repo_file = ALLSKY_REPO . "/" . $options_file . ".repo";

// Create options file

// Read $cc_file
$str = file_get_contents($cc_file_full, true);
$cc_array = json_decode($str, true);
$cameraType = $cc_array["cameraType"];
$cameraModel = $cc_array["cameraModel"];

// Read $repo_file
$str = file_get_contents($repo_file, true);
$repo_array = json_decode($str, true);

// TODO: *** Work magic to create $options_file_full, using $cc_array and $repo_array.

// XXXXXXXXXX TODO: check for errors opening, creating, and linking files.

if ($settings_file !== "") {
	// If the file exists, it's a generic link to a camera-specific named file.
	// Remove the link because it points to a prior camera.
	if (file_exists($settings_file_full)) {
		if ($debug) echo "Unlinking $settings_file_full.\n";
		unlink($settings_file_full);
	}

	// Determine the name of the camera type/model-specific file.
	$pieces = explode(".", $settings_file);
	$cameraSettingsFileName = $pieces[0];
	$cameraSettingsFileExt = $pieces[1];
	$cameraSettingsFile = $cameraSettingsFileName . "_" . $cameraType . "_" . $cameraModel . ".$cameraSettingsFileExt";
	$fullName = "$directory/$cameraSettingsFile";

	// If there isn't a camera-specific file, create one.
	if (! file_exists($fullName)) {

		// TODO: *** Work magic to create $contents in json format.
$contents = "this is a test.  Camera = $cameraType $cameraModel.\n";

		if ($debug) echo "Creating settings file: $fullName.\n";
		$results = updateFile($fullName, $contents, $cameraSettingsFile);
	} else if ($debug) {
		// There IS a camera-specific file for the new camera type so we
		// don't need to do anything special.
		// The generic name will be linked to the specific name below.
		echo "Using existing $fullName.\n";
	}

	if ($debug) echo "Linking $settings_file_full to $fullName.\n";
	link($fullName, $settings_file_full);

	echo "XX_WORKED_XX\n";
}

?>
