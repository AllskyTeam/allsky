<?php
include_once('includes/functions.php');
initialize_variables();
include_once('includes/authenticate.php');

// Cause a command specified by "ID" (with html output) or "ID" (with just text)
// to be executed.
$use_TEXT = false;
$ID = getVariableOrDefault($_POST, 'ID', getVariableOrDefault($_GET, 'ID', null));
if ($ID === null) {
	$ID = getVariableOrDefault($_POST, 'ID', getVariableOrDefault($_GET, 'ID', null));
	if ($ID !== null) {
		$use_TEXT = true;
	}
}
if ($use_TEXT) {
	$eS = "";
	$eE = "";
} else {
	$eS = "<p class='errorMsgBig'>";
	$eE = "</p>";

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link href="documentation/css/custom.css" rel="stylesheet">
	<link rel="shortcut icon" type="image/png" href="documentation/img/allsky-favicon.png">
	<title>Execute a command</title>
</head>
<body>
<?php
}

if ($id === null) {
	echo "${eS}No 'id' specified!${eE}";
	exit(1);
}

$CMD = "sudo --user=" . ALLSKY_OWNER . " " . ALLSKY_UTILITIES . "/execute.sh $id";
$CMD = escapeshellcmd($CMD);
exec("$CMD 2>&1", $result, $return_val);
if (! $use_TEXT) {
	// Writing to the console aids in debugging.
	$dq = '"';
	echo "<script>console.log(";
	echo "${dq}[$CMD] returned $return_val, result=" . implode(" ", $result) . "${dq}";
	echo ");</script>\n";
}

if ($return_val !== 0) {
	error_log("ERROR: Unable to execute '$CMD'");
}
if ($result != null) {
	if ($use_TEXT) {
		echo implode("\n", $result);
	} else {
		echo "<pre>";
		echo implode("<br>", $result);
		echo "</pre>";
	}
}

if (! $use_TEXT) {
	echo "\n</body>\n</html>\n";
}

?>
