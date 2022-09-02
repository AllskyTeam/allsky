<?php

include_once('functions.php');

// On success, return a string that starts with "S\t" (for Success).
// On failure, return a string that starts with "E\t" (for Error).

if (isset($_POST['content']))
	$content = $_POST['content'];
else
	$content = "";

$path = "";
if (isset($_POST['path']))
	$path = $_POST['path'];
if ($path == "") {
	echo "E	No file name specified to save!";
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
	echo "E	File to save '$file' does not exist!";
	exit;
}

$ok = true;
$msg = updateFile($file, $content, "save_file");
if ($msg == "") {
	if ($isRemote) {
		$imageDir = get_variable(ALLSKY_CONFIG .'/config.sh', 'IMAGE_DIR=', '');
		$remoteHost = get_variable(ALLSKY_CONFIG .'/ftp-settings.sh', 'REMOTE_HOST=', '');
		$cmd = ALLSKY_SCRIPTS . "/upload.sh --silent '$file' '$imageDir' " . basename($file) . " 'remote_file'";
		exec("$cmd 2>&1", $output, $return_val);
		if ($return_val == 0) {
			$msg = "File saved and sent to $remoteHost.";
		} else {
			$ok = false;
			$msg = implode("\n", $output);
			$msg = "File saved but unable to send to $remoteHost: <pre>$msg</pre>";
			$msg .= "Executed $cmd";
		}
	} else {
		$msg = "File saved";
	}
} else {
	$ok = false;
	$msg = "Failed to save '$file': $msg";
}

if ($ok)
	echo "S	";
else
	echo "E	";
echo $msg;

?>
