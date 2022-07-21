<?php

include_once('functions.php');

// TODO: when editor.php understands that what we return is a $status message,
// change the "echo"s below to $status->AddMessage().

// On error, return a string.

if (isset($_POST['content']))
	$content = $_POST['content'];
else
	$content = "";

$path = "";
if (isset($_POST['path']))
	$path = $_POST['path'];
if ($path == "") {
	echo "No file name specified to save!";
	exit;
}

if (isset($_POST['isRemote']))
	$isRemote = $_POST['isRemote'] == "true" ? true : false;
else
	$isRemote = false;

// "current" is a web alias to ALLSKY_HOME.
// "website" is a web alias to ALLSKY_WEBSITE.
// $path is the web address to the file; we need the physical path ($file) to move.
if (substr($path, 0, 7) === "current")
	$file = str_replace('current', ALLSKY_HOME, $path);
else	// website
	$file = str_replace('website', ALLSKY_WEBSITE, $path);
if (! file_exists($file)) {
	echo "File to save '$file' does not exist!";
	exit;
}

$ok = true;
$msg = updateFile($file, $content, "save_file");
if ($msg == "") {
	if ($isRemote) {
		$imageDir = get_variable(ALLSKY_CONFIG .'/config.sh', 'IMAGE_DIR=', '');
		$cmd = ALLSKY_SCRIPTS . "/upload.sh --silent '$file' '$imageDir' " . basename($file) . " 'remote_file'";
		$msg = shell_exec("$cmd > /dev/null");	# Ignore non-error output from the command
		if ($msg == "") {
			$msg = "File saved and sent to remote host.";
		} else {
			$ok = false;
			$msg = "File saved but unable to send to remote host: $msg";
		}
	} else {
		// $msg = "File saved";
		exit;
	}
} else {
	//header("HTTP/1.0 400 Bad Request");
	$ok = false;
	$msg = "Failed to save '$file': $msg";
}
echo $msg;

?>
