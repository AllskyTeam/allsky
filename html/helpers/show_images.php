<?php

// Web page to display "special" images in a directory.
// These are images that aren't produced by the Allsky "capture" programs.

include_once('../includes/functions.php');

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="WebUI 'helper' page to display images or videos">
	<title>Display Images/Videos</title>

	<link href="../documentation/css/custom.css" rel="stylesheet">
	<link href="../documentation/css/documentation.css" rel="stylesheet">
	<link rel="shortcut icon" type="image/ico" href="../favicon.ico">
</head>
<body>

<?php
$day = getVariableOrDefault($_REQUEST, 'day', "");
$pre = getVariableOrDefault($_REQUEST, 'pre', "");
$type = getVariableOrDefault($_REQUEST, 'type', "");
$filetype = getVariableOrDefault($_REQUEST, 'filetype', "picture");

// Prepend "X" to the file name prefix so ListFileType() looks for files whose
// names are "${pre}.*", rather than "${pre}-YYYYMMDD.*".
// true == list the file names
ListFileType("", "X${pre}", $type, $filetype, true); 
?>

</body>
</html>
