<?php
define('ALLSKY_HOME', 'XX_ALLSKY_HOME_XX');			// value updated during installation
define('ALLSKY_SCRIPTS', 'XX_ALLSKY_SCRIPTS_XX');	// value updated during installation
define('ALLSKY_WEBSITE', 'XX_ALLSKY_WEBSITE_XX');	// value updated during installation
define('ALLSKY_OWNER', 'XX_ALLSKY_OWNER_XX');		// value updated during installation
define('ALLSKY_GROUP', 'XX_ALLSKY_GROUP_XX');		// value updated during installation

$content = "";
$path = "";
$isRemote = false;

// On error, return a string.  On success, return nothing.

if (isset($_POST['content'])) {
	$content = $_POST['content'];
}

if (isset($_POST['path'])) {
	$path = $_POST['path'];
}
if ($path == "") {
	echo "save_file.php: Path to save to is null";
	exit;
}
if (isset($_POST['isRemote'])) {
	$isRemote = $_POST['isRemote'];
}

// "current" is a web alias to ALLSKY_HOME.
// "website" is a web alias to ALLSKY_WEBSITE.
// $path is the web address to the file; we need the physical path ($file) to move.
if (substr($path, 0, 7) === "current")
	$file = str_replace('current', ALLSKY_HOME, $path);
else	// website
	$file = str_replace('website', ALLSKY_WEBSITE, $path);
if (! file_exists($file)) {
	echo "save_file.php: file to save '$file' does not exist!";
	exit;
}

$tempFile = "/tmp/save_file-temp.txt";		// web server must have write permissions here
if (file_put_contents($tempFile, $content) == false) {
	echo error_get_last()['message'];
	exit;
} else {
	// shell_exec() doesn't return anything unless there is an error.
	$msg = shell_exec("x=\$(sudo mv '$tempFile' '$file' 2>&1) || echo 'Unable to mv [$tempFile] to [$file]': \${x}");
	if ($msg == "") {
		shell_exec("sudo chown " . ALLSKY_OWNER . ":" . ALLSKY_GROUP . " '$file'; sudo chmod 664 '$file'");
// TODO: if isRemote, then upload the file to the remote server
// echo ALLSKY_SCRIPTS . "/upload.sh";
	} else {
		//header("HTTP/1.0 400 Bad Request");
		echo "save_file.php: $msg";
		exit;
	}
}
?>
