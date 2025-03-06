<?php
	include_once('includes/functions.php');

	// Execute a command specified in "cmd" (with html output) or "CMD" (with just text).
	$use_TEXT = false;
	$cmd = getVariableOrDefault($_POST, 'cmd', getVariableOrDefault($_GET, 'cmd', null));
	if ($cmd === null) {
		$cmd = getVariableOrDefault($_POST, 'CMD', getVariableOrDefault($_GET, 'CMD', null));
		if ($cmd !== null) {
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
	if ($cmd === null) {
		echo "${eS}No 'cmd' specified!${eE}";
		exit(1);
	}

	$CMD = "sudo --user=" . ALLSKY_OWNER . " " . ALLSKY_UTILITIES . "/execute.sh $cmd";
	exec("$CMD 2>&1", $result, $return_val);
	if (! $use_TEXT) {
		$dq = '"';
		echo "<script>console.log(";
		echo "${dq}[$CMD] returned $return_val, result=" . implode(" ", $result) . "${dq}";
		echo ");</script>\n";
	}

	if ($return_val > 0) {
		echo "${eS}Unable to execute '$CMD'${eE}";
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
