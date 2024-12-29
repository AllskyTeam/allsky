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
	include_once('includes/functions.php');

	$cmd = getVariableOrDefault($_POST, 'cmd', getVariableOrDefault($_GET, 'cmd', null));
	if ($cmd === null) {
		echo "<p class='errorMsgBig>No 'cmd' specified!</p>";
		exit(1);
	}

	$CMD = "sudo --user=" . ALLSKY_OWNER . " " . ALLSKY_UTILITIES . "/execute.sh '$cmd'";
	exec("$CMD 2>&1", $result, $return_val);
	$dq = '"';
	echo "<script>console.log(${dq}[$CMD] returned $return_val, result=" . implode(" ", $result) . "${dq});</script>";

	if ($return_val > 0) {
		echo "<p class='errorMsgBig>Unable to execute '$CMD'</p>";
	}
	if ($result != null) {
		echo implode("<br>", $result);
	}

?>
</body>
</html>
