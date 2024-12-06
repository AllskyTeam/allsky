#!/usr/bin/php
<?php
/*
// Get a list of all files, not including the ones the user creates
{
	echo loading.jpg
	echo allsky-logo.png
	echo NoThumbnail.png
	echo allsky-favicon.png
	# echo image.jpg
	find . -type f '!' '(' -name '*.jpg' -or -name '*.png' -or -name '*.mp4' ')' |
		sed 's;^./;;' |
		grep -E -v "myFiles/|configuration.json"
} > files.txt
*/

$commandFile = "commands.txt";

// Check sanity of Website and make necessary directories.
// This file is normally accessed via curl, not a web page,
// so only use html in output when invoked from a web page.
// The list of "commands" to run are in $commandFile, one command per line,
// with optional tab-separated arguments.

$TAB = "\t";
$NL = "\n";

if (isset($_SERVER['HTTP_USER_AGENT']) &&
		strpos($_SERVER['HTTP_USER_AGENT'], "curl") === false) {
	$NL = "<br>";
}

if (isset($_GET["debug"])) {
	$debug = true;
} else {
	$debug = false;
}

if (! file_exists($commandFile)) {
	do_error("Command file '$commandFile' not found.");
	exit(1);
}
$lines = file($commandFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
//x	unlink($commandFile);

if ($lines === false) {
	$last_error = error_get_last();
	do_error("Unable to read '$commandFile': ${last_error["message"]}.");
	exit(1);
}

$startrails_glob = "startrails-*.jpg";
$keogram_glob = "keogram-*.jpg";
$timelapse_glob = "allsky-*.mp4";

$ok = true;

foreach ($lines AS $line) {
	$command = strtok($line, $TAB);
	if (substr($command, 0, 1) === "#")
		continue;

	switch ($command) {
		case "set":
			if (($args = get_args(2, $command)) === null)
				break;

			$variable = $args[0];
			if ($variable === "debug") {
				$debug = $args[1];
			} else {
				do_warning("'$command' variable '$variable' unknown; ignoring.");
			}
			break;


		case "mkdir":
			// The arguments are the directories to create.
			if (($args = get_args(-1, $command)) === null)
				break;

			$dirsCreated = "";
			$c = 0;
			foreach ($args as $dir) {
				if (is_dir($dir)) {
					if ($debug) do_debug("'$dir' already exists.");

				} else {
					if ($debug) do_debug("Making $dir.");
					if (mkdir($dir, 0775, true)) {		// "true" == recursive
						$c++;
						if ($dirsCreated !== "") $dirsCreated .= ", ";
						$dirsCreated .= $dir;
					} else {
						$last_error = error_get_last();
						$err = $last_error["message"];
						do_error("Unable to make '$dir' directory: $err.");
					}
				}
			}

			if ($c === 0)
				$msg = "success";
			else
				$msg = "Created: $dirsCreated";
			do_return($command, $args, $msg);
			break;


		case "get_numfiles":
			// Return the number of files of the given type.
			if (($args = get_args(-1, $command)) === null)
				break;

			foreach ($args as $filetype) {
				$numFiles = count_files($filetype);
				do_return($command, array($filetype), $numFiles);
			}
			break;


		case "do_daystokeep":		// filetype TAB number
			// Only keep up to $daystokeep images/videos
			if (($args = get_args(2, $command)) === null)
				break;

			$filetype = $args[0];
				$parent = basename(dirname($filetype));
			$daystokeep = $args[1];

			$c = count_files($filetype);
			$numToDelete = $c - $daystokeep;
			if ($numToDelete > 0) {
				// "true" to also delete the thumbnail.
				$deleted = delete_files($filetype, $numToDelete, $command, $args, true);
				if ($deleted > 0) {
//x this is redundant with displaying individual file names that were deleted.
//x					do_return($command, $args, "Deleted $deleted old '$parent' files.");
				}
			} else if ($debug) do_debug("Only $c '$parent' files - not deleting any.");
			break;


		case "checksum":
			// Check the checksum of the specified file.
			if (($args = get_args(2, $command)) === null)
				break;

			$file = $args[0];
			$checksum = $args[1] + 0;
			if (! file_exists($file)) {
				do_return($command, $args, "'$file' is missing.");
				break;
			}
			if (crc32($file) !== $checksum) {
				do_return($command, $args, "'$file' is different.");
			} else if ($debug) do_debug("'$file' is same.");
			break;


		case "delete_prior_files":
			// Delete files left over from prior Allsky releases.
			$files = array("version", "README.md", "config.js");
			foreach ($files AS $file) {
				if (file_exists($file)) {
					if (unlink($file))
						do_return($command, "", "Deleted: $file");
					else
						do_error("Unable to delete '$file'.");
				}
			}

			$dirs = array(".git");
			foreach ($dirs AS $dir) {
				if (is_dir($dir) && deleteDirectory($dir)) {	// recursively deletes
					do_return($command, "", "Deleted: $dir/");
				}
			}
			break;


		case "xxx":
// TODO: add other checks here
			break;


		default:
			do_warning("Ignoring unknown command '$command'.");
			break;

		}
}

if (! $ok) exit(1);


// Helper functions.
function do_error($msg) { global $NL, $TAB; echo "ERROR${TAB}${msg}${NL}"; }
function do_warning($msg) { global $NL, $TAB; echo "WARNING${TAB}${msg}${NL}"; }
function do_debug($msg) { global $NL, $TAB; echo "DEBUG${TAB}${msg}${NL}"; }
function do_return($cmd, $a, $msg) {
	global $NL, $TAB;
	echo "RETURN${TAB}${cmd}";
	if (gettype($a) === "array") echo " " . implode(" ", $a);
	echo "${TAB}${msg}${NL}";
}

// Get all the arguments and put in an array.
// Make sure there is at least $num arguments:
//	0 means arguments are optional
//	negative numbers means AT LEAST that many arguments

$args = null;
function get_args($num, $cmd) {
	global $TAB, $NL, $args;

	if ($args !== null)
		unset($args);	// clear old array

	$args = array();

	$arg = strtok($TAB);
	$found = 0;
	while ($arg !== false) {
		$found++;
		$args[] = $arg;
		$arg = strtok($TAB);
	}

	if ($found < abs($num)) {
		if ($num < 0)
			$x = "at least";
		else
			$x = "exactly";
		
		do_error("'$cmd' requires $x $num arguments; $found were given.");
		return(null);
	}
	return($args);
}

// Return the number of file of the specified type.
function count_files($filetype) {
	$filelist = glob($filetype);
	return(count($filelist));
}

// Delete the oldest $deleteNum files in $filesToDelete.
// Also delete the associated thumbnail.
function delete_files($filesToDelete, $deleteNum, $cmd, $a, $delete_thumbnail) {
	global $debug;

	// Have to do with two commands, not one.
	$files = array_diff(glob($filesToDelete), array('.','..'));

	// The files have the date in their name, so sort the list descending to
	// know which to delete.
	rsort($files);
	$filesDeleted = "";
	$c = 0;
	while ($deleteNum > 0) {
		$file = $files[$deleteNum -1];		// -1 for 0 index offset
		$deleteNum--;

		if ($debug) {
			do_return($cmd, $a, "'$file' NOT deleted due to debug");
		} else {
			if (! unlink($file)) {
				$last_error = error_get_last();
				do_warning("Unable to remove '$file': ${last_error["message"]}.");
			} else {
				$c++;
				do_return($cmd, $a, "'$file' deleted.");

				if ($filesDeleted !== "") $filesDeleted .= ", ";
				$filesDeleted .= $file;
			}

			if ($delete_thumbnail) {
				// Now delete the thumbnail
				$parent = dirname($file);
				$fileName = basename($file);
				$thumb = "$parent/thumbnails/$fileName";
				if (file_exists($thumb)) unlink($thumb);
			}
		}
	}

	if ($c > 0) do_return($cmd, $a, "Deleted: $filesDeleted");
	return($c);
}

// Delete the specified directory and all its contents.
function deleteDirectory($dir) {
	if (! is_dir($dir))
		return(false);

	$files = @scandir($dir);
	if ($files === false) {
		$last_error = error_get_last();
		$err = $last_error["message"];
		do_error("Unable to scandir($dir): $err.");
		return(false);
	}

	$files = array_diff($files, array(".", ".."));
	foreach ($files as $file) {
		$filePath = $dir . '/' . $file;
		if (is_dir($filePath)) {
			deleteDirectory($filePath);
		} else {
			if (! @unlink($filePath)) {
				$last_error = error_get_last();
				$err = $last_error["message"];
				do_error($err);
			}
		}
	}

	$ret = @rmdir($dir);
	if (! $ret) {
		$last_error = error_get_last();
		$err = $last_error["message"];
		do_error($err);
	}

	return($ret);
}

?>
