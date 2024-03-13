<?php

// Save a file that was just modified by the user,
// and if needed, copy it to a local or remote Website.

$status = null;
include_once('functions.php');
initialize_variables(true);		// "true" to only get website stuff

$debug = false;
$Success = "S"; $Warning = "W"; $Error = "E";

// On success, return a string that starts with "S\t" (for Success)
// or "W\t" (for Warning);
// On failure, return a string that starts with "E\t" (for Error).

$path = getVariableOrDefault($_POST, 'path', null);
if ($path === null) {
	message_and_exit($Error, "No file name specified to save!");
}

$content = getVariableOrDefault($_POST, 'content', "");

// "current" is a web alias to ALLSKY_HOME.
// "website" is a web alias to ALLSKY_WEBSITE.
// $path is the web address to the file; we need the physical path ($file) to move.
if (substr($path, 0, 7) === "current")
	$file = str_replace('current/', ALLSKY_HOME . "/", $path);
else if (substr($path, 0, 6) === "config")
	$file = str_replace('config/', ALLSKY_CONFIG . "/", $path);
else	// website
	$file = str_replace('website/', ALLSKY_WEBSITE . "/", $path);
if (! file_exists($file)) {
	message_and_exit($Error, "File to save '$file' does not exist (path=$path)!");
}

$isRemote = toBool(getVariableOrDefault($_POST, 'isRemote', "false"));
if ($debug) {
	message_and_exit($Success, "file=$file, isRemote=" . ($isRemote ? "REMOTE" : "LOCAL"));
}

// The file resides locally so update it, even if it's a "remote" file
// which means ALSO send it to a remote site.

$msg = updateFile($file, $content, "save_file", false);
if ($msg != "") {
	message_and_exit($Error, "Failed to save '$file': $msg");
}

$f = basename($file);		// easier to see just filename than long path
if (! $isRemote) {
	// Local file - we updated it a few lines above.
	message_and_exit($Success, "$f saved");
}

if ($useRemoteWebsite) {
	// Do NOT send to remote SERVER since it doesn't have configuration files.

	// Remote files may have "remote_" prepended to their names; if so, set the remote
	// name to NOT include that string.
	$remoteName = str_replace("remote_", "", $f);

	$U1 = ALLSKY_SCRIPTS . "/upload.sh --silent --remote-web";
	$U2 = "'$file' '$imageDir' '$remoteName' 'remote_file'";
	$cmd = "$U1 $U2";
	exec("echo sudo -u " . ALLSKY_OWNER . " $cmd 2>&1", $output, $return_val);
	if ($return_val == 0) {
		$msg = "$f saved and sent to remote Website as $remoteName.";
	} else {
		$msg = implode("\n", $output);
		$msg = "$f saved but unable to send to $remoteHost: <pre>$msg</pre>";
		$msg .= "Executed $cmd";
		message_and_exit($Error, $msg);
	}
} else {
	$msg = "$f saved but NOT sent to remote Website since there isn't one defined.";
	message_and_exit($Warning, $msg);
}


function message_and_exit($status, $message)
{
	// Tab after status
	echo "${status}	$message";
	exit;
}
?>
