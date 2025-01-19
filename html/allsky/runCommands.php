#!/usr/bin/php
<?php		// Make 2nd line in file or else output includes blank lines.

// Run pre-defined "commands".
// These commands allow us to check sanity of the Website, create missing directories,
// remove "old" files, and other tasks.

// This file is normally accessed via curl, not a web page,
// so only use html in output when invoked from a web page.
// The list of "commands" to run are in $commandFile, one per line,
// with optional tab-separated arguments.

$checksumsFile = "checksums.txt";
$commandFile = "commands.txt";
$delete_commands = true;

$TAB = "\t";
$NL = "\n";
$on64 = (PHP_INT_MAX !== 2147483647);	// are we using 64-bit?

if (isset($_SERVER['HTTP_USER_AGENT']) &&
		strpos($_SERVER['HTTP_USER_AGENT'], "curl") === false) {
	$NL = "<br>";
}

if (isset($_GET["debug"])) {
	$debug = true;
} else {
	$debug = false;
}
$debug2 = false;

if (! file_exists($commandFile)) {
	$delete_commands = false;	// don't try to delete a non-existant file
	do_error("", "Command file '$commandFile' not found.");
	exit(1);
}
$lines = file($commandFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
if ($lines === false) {
	$last_error = error_get_last();
	do_error("", "Unable to read '$commandFile': ${last_error["message"]}.");
	exit(1);
}
// echo "<pre>"; var_dump($lines);echo "</pre>";

$ok = true;

// Each line is:
//	command [ TAB arg1 [ TAB arg2] ...]
foreach ($lines AS $line) {
	if ($debug2) do_debug("read line", "[$line]");
	$args = explode("\t", $line);
	if (count($args) === 0) {
		do_warning("", "Line '$line' has no arguments.");
		continue;
	}
	$command = $args[0];

	if (substr($command, 0, 1) === "#")
		continue;

	// Delete command from array.
	array_splice($args, 0, 1);
	$numArgs = count($args);

	switch ($command) {

		case "mkdir":
			// The arguments are the directories to create.
			if ($numArgs === 0) {
				do_error($command, "No arguments given; expected at least one.");
				break;
			}

			$dirsCreated = "";
			$c = 0;
			foreach ($args as $dir) {
				if (is_dir($dir)) {
					if ($debug) do_debug($command, "'$dir' already exists.");

				} else {
					if ($debug) do_debug($command, "Making $dir.");
					if (mkdir($dir, 0775, true)) {		// "true" == recursive
						$c++;
						if ($dirsCreated !== "") $dirsCreated .= ", ";
						$dirsCreated .= $dir;
					} else {
						$last_error = error_get_last();
						$err = $last_error["message"];
						do_error($command, "Unable to make '$dir' directory: $err.");
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
			if ($numArgs === 0) {
				do_error($command, "No arguments given; expected at least one.");
				break;
			}

			foreach ($args as $filetype) {
				$numFiles = count_files($filetype);
				do_return($command, array($filetype), $numFiles);
			}
			break;


		case "do_daystokeep":		// filetype TAB number
			// Only keep up to $daystokeep images/videos
			if ($numArgs !== 2) {
				do_error($command, "Expected 2 arguments.");
				break;
			}

			$filetype = $args[0];
			$parent = basename(dirname($filetype));
			$daystokeep = $args[1];

			$c = count_files($filetype);
			$numToDelete = $c - $daystokeep;
			if ($numToDelete > 0) {
				// "true" to also delete the thumbnail.
				delete_files($filetype, $numToDelete, $command, $args, true);
			} else {
				do_return($command, $args, "No '$parent' files deleted - $c left.");
			}
			break;


		case "check_checksums":
			// Check the checksums of all the files in the checksum file.
			if (! file_exists($checksumsFile)) {
				do_error($command, "Checksums file '$checksumsFile' not found.");
				break;
			}
			$files = file($checksumsFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
			$numSame = 0;
			$numDifferent = 0;
			$allErrors = "";
			foreach ($files AS $info) {
				$i = explode("\t", $info);
				// false == don't output result; we'll do a summary below.
				if (compareChecksum($command, $i, count($i), false, $error)) {
					$numSame++;
				} else {
					$numDifferent++;
					if ($allErrors !== "") $allErrors .= ", ";
					$allErrors .= $error;
				}
			}
			$msg = "Same:${TAB}$numSame${TAB}Different:${TAB}$numDifferent";
			if ($numDifferent > 0) $msg .= " ${TAB}$allErrors";
			do_return($command, "", $msg);
			break;

		case "check_checksum":		// file  TAB  checksum
			// Check the checksum of the specified file.  true == output result
			compareChecksum($command, $args, $numArgs, true, $not_used);
			break;


		case "delete_prior_files":
			// Delete files left over from prior Allsky releases.
			$files = array("version", "README.md", "config.js");
			foreach ($files AS $file) {
				if (file_exists($file)) {
					if (unlink($file))
						do_return($command, "", "Deleted: $file");
					else
						do_error($command, "Unable to delete '$file'.");
				}
			}

			$dirs = array(".git");
			foreach ($dirs AS $dir) {
				if (is_dir($dir) && deleteDirectory($dir)) {	// recursively deletes
					do_return($command, "", "Deleted: $dir/");
				}
			}
			break;


		case "info":
			// TODO: add more info going forward
			$info = "In directory " . getcwd();
			do_return($command, "", $info);
			break;


		// These are directives that tell us how to behave.

		case "set":
			// Set a variable to something.

			if ($numArgs != 2) {
				do_error($command, "Expected 2 arguments.");
				break;
			}
			$variable = $args[0];
			$value = $args[1];

			switch ($variable) {
				case "debug":
					$debug = intval($value);
					break;

				case "debug2":
					$debug2 = intval($value);
					break;

				case "delete-commands":
					$delete_commands = intval($value);
					break;

				case "html":
					if (intval($value)) {
						// Output as html
						$TAB = "&nbsp;&nbsp;&nbsp;&nbsp;";
						$NL = "<br>";
					} else {
						// Output as normal text
						$TAB = "\t";
						$NL = "\n";
					}
					break;

				default:
					do_warning($command, " variable '$variable' unknown; ignoring.");
					break;
			}
			break;


		case "xxx":
// TODO: add other checks here
			break;


		default:
			do_warning($command, "Ignoring unknown command '$command'.");
			break;

		}
}

if (! $ok) exit(1);


// Helper functions.
function do_return($cmd, $a, $msg, $severity="RETURN", $exit=false)
{
	global $NL, $TAB;
	static $deleted = false;

	echo "${severity}${TAB}${cmd}";

	if (gettype($a) === "array") {
		echo $TAB . implode($TAB, $a);
	} else if ($a !== "") {
		echo "${TAB}$a";
	}

	echo "${TAB}${msg}${NL}";

	if (! $deleted && $severity !== "DEBUG") {
		delete_commands_file($cmd);
		$deleted = true;
	}
	if ($exit)
		exit;
}

function do_error($cmd, $msg, $exit=false)		{ do_return($cmd, "", $msg, "ERROR", $exit); }
function do_warning($cmd, $msg, $exit=false)	{ do_return($cmd, "", $msg, "WARNING", $exit); }
function do_info($cmd, $msg, $exit=false)		{ do_return($cmd, "", $msg, "INFO", $exit); }
function do_debug($cmd, $msg, $exit=false)		{ do_return($cmd, "", $msg, "DEBUG", $exit); }

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
		$msg = "";

		if ($debug) {
			do_info($cmd, "NOT deleted due to debug: '$file'.");
		} else {
			if (! unlink($file)) {
				$last_error = error_get_last();
				do_warning("Unable to remove '$file': ${last_error["message"]}.");
			} else {
				$c++;
				$msg = "'$file'";

				if ($filesDeleted !== "") $filesDeleted .= ", ";
				$filesDeleted .= $file;
			}

			if ($delete_thumbnail) {
				// Now delete the thumbnail
				$parent = dirname($file);
				$fileName = basename($file);
				$thumb = "$parent/thumbnails/$fileName";
				if (file_exists($thumb)) {
					$msg .= " and its thumbnail";
					@unlink($thumb);
				}
			}

			if ($debug && $msg !== "")
				do_debug($cmd, "Deleted: $msg.");
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

// Optionally delete the commands file.
// Except for testing, the file should be deleted.
function delete_commands_file($cmd)
{
	global $delete_commands, $commandFile;

	if ($delete_commands) {
		if (! @unlink($commandFile)) {
			$delete_commands = false;	// to keep from going in infinate loop
			$last_error = error_get_last();
			$err = $last_error["message"];
			do_warning($cmd, $err, true);
		}
	}
}

function compareChecksum($cmd, $a, $num, $outputResult, &$error)
{
	global $debug, $debug2, $TAB, $on64;

	if ($num != 2) {
		// checksum, file
		do_error($command, "Expected 2 arguments.");
		return(false);
	}

	// Checksums in the file came from the Pi which could be 32- or 64-bit.
	// If 32-bit, some checksums will be negative numbers.
	// The machine this code is running on may be 32- or 64-bit.
	// Convert all numbers to unsigned.

// TODO: I may have complicated this more than it needs to be...

	$checksum = $a[0];		// a string, may represent a negative number
	$isNegative = (substr($checksum, 0, 1) === "-");
	if ($isNegative) {
# echo "BEFORE checksum= $checksum";
		if ($on64) {
			// checksum created on 32-bit machine.  Converting to 64-bit hex
			// prepends too many "ffffffff".
			$checksum = str_replace("ffffffff", "", dechex($checksum));
		} else {
			$checksum = sprintf("%u", $checksum);	// convert to unsigned string
		}
# echo ", AFTER  $checksum  <br>\n";
	}

	$file = $a[1];
	if (! file_exists($file)) {
		do_warning($cmd, "Missing:${TAB}$file");
		return(false);
	}

	$c = crc32($file);			// may be a negative number
# echo "BEFORE c= $c";
	$c = sprintf("%u", $c);		// convert to unsigned as a string
# echo ", AFTER  $c";
	if ($on64 && $isNegative) {
		$c_ = dechex($c);			// convert to hex number
	} else {
		$c_ = $c;
	}
# echo ", c_=  $c_  <br>\n";
	if ($c_ !== $checksum) {
		$msg = "Different${TAB}size=" . filesize($file) . ", c=$c, c_=$c_, checksum=$checksum";
		$ret = false;
		$error = $file;
	} else {
		$msg = "Same";
		$ret = true;
	}
	if ($outputResult) {
		do_return($cmd, $file, $msg);
	} else {
		if ($debug2) do_debug($cmd, $msg);
	}

	return($ret);
}

?>
