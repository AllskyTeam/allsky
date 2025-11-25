<?php

include_once('includes/functions.php');
initialize_variables();
include_once('includes/authenticate.php');

// Cause a command specified by "ID" (with html output) or "id" (with just text)
// to be executed.
$use_TEXT = false;
$ID = getVariableOrDefault($_REQUEST, 'ID', null);
if ($ID === null) {
	$ID = getVariableOrDefault($_REQUEST, 'id', null);
	if ($ID !== null) {
		$use_TEXT = true;
	}
}

// If there's a space in ID, the actual ID is everything before the space,
// and the ARGS are everything after the space.
$space = strpos($ID, " ");
if ($space === false) {
	$ARGS = "";
} else {
	$ARGS = substr($ID, $space + 1);
	$ID = substr($ID, 0, $space);
}
# echo "ID=[$ID], ARGS=[$ARGS]<br>";

if ($use_TEXT) {
	$eS = "";
	$eE = "\n";
	$sep = "\n";
} else {
	$eS = "<p class='errorMsgBig'>";
	$eE = "</p>";
	$sep = "<br>";

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
	<meta http-equiv="Pragma" content="no-cache" />
	<meta http-equiv="Expires" content="0" />

	<link href="documentation/css/custom.css" rel="stylesheet">
	<link href="documentation/css/light.css" rel="stylesheet">
	<link href="documentation/css/documentation.css" rel="stylesheet">
	<link rel="shortcut icon" type="image/png" href="documentation/img/allsky-favicon.png">
	<title>Execute <?php echo "$ID"; ?></title>
</head>
<body>
<?php
}

if ($ID === null) {
	echo "{$eS}No 'id' specified!{$eE}";
	exit(1);
}

switch ($ID) {
	case "AM_RM_PRIOR":		// Remove prior version of Allsky.
		rm_object(ALLSKY_PRIOR_DIR, "Prior Allsky directory '" . ALLSKY_PRIOR_DIR . "' removed.");
		rm_object(ALLSKY_OLD_REMINDER);

		rm_msg($ID);
		break;

	case "AM_RM_CHECK":		// Remove log from checkAllsky.sh.
		rm_object(ALLSKY_CHECK_LOG, "Changes recorded.");

		rm_msg($ID);
		break;

	case "AM_RM_POST":		// Remove log of post-installation actions.
		rm_object(ALLSKY_POST_INSTALL_ACTIONS, "Deleted list of actions to perform.");

		rm_msg($ID);
		break;

	case "AM_RM_ABORTS":	// Remove the specified "have been aborted" file
		$file = ALLSKY_ABORTS_DIR . "/$ARGS";
		rm_object($file, "File removed.");
		rm_msg($ID);
		break;

	case "AM_NOT_SUPPORTED":		# Not supported camera
		if ($ARGS === "") {
			echo "{$eS}ERROR: Argument not given to command ID: '{$ID}'.{$eE}";
			exit(1);
		}
		$CMD = ALLSKY_SCRIPTS . "/allsky-config show_supported_cameras";
		execute($CMD, $ARGS);

		rm_msg($ID);
		break;

	case "AM_ALLSKY_CONFIG":
	case "allsky-config":
		if ($ARGS === "") {
			echo "{$eS}ERROR: Argument not given to command ID: '{$ID}'.{$eE}";
			exit(1);
		}
		$CMD = ALLSKY_SCRIPTS . "/allsky-config";
		execute($CMD, $ARGS);
		break;

	default:
		echo "{$eS}ERROR: Unknown command ID: '{$ID}'.{$eE}";
		break;
}

if (! $use_TEXT) {
	echo "\n</body>\n</html>\n";
}
exit;

// =============================== functions

// Check the return code from the last exec() and display any output.
function checkRet($cmd, $return_code, $return_string)
{
	global $use_TEXT, $eS, $eE, $sep;

	if ($return_code !== 0) {
		echo "{$eS}ERROR while executing:{$sep}{$cmd}{$eE}";
	}
	if ($return_string != null) {
		if ($use_TEXT) {
			echo $return_string;
		} else {
			echo "<pre style='font-size: 115%'>";
			echo $return_string;
			echo "</pre>";
		}
	}

	return($return_code);
}

// Execute a command.  On error, return the error message.
function execute($cmd, $args="", $outputToConsole=false)
{
	global $use_TEXT, $sep;

	// Do NOT quote $args since there may be multiple arguments.
	$cmd = "$cmd $args";
	$full_cmd = escapeshellcmd("sudo --user=" . ALLSKY_OWNER . " $cmd");
	$result = null;
	exec("$full_cmd 2>&1", $result, $return_val);

	if ($result !== null) {
		$result = implode($sep, $result);
	}
	if (! $use_TEXT && $outputToConsole) {
		// Writing to the console aids in debugging.
		echo "<script>console.log(";
		echo "`[$full_cmd] returned $return_val, result=$result`";
		echo ");</script>\n";
	}

	if (checkRet($cmd, $return_val, $result)) {
		return "";
	} else {
		return($result);
	}
}

// Remove a message from the messages DB.
// Don't display any output.
function rm_msg($ID)
{
	$cmd = ALLSKY_SCRIPTS .  "/addMessage.sh";
	$args = "--id '{$ID}' --delete";
	execute($cmd, $args, false);
}

// Remove a file or directory.
function rm_object($item, $successMsg=null)
{
	global $use_TEXT, $eS, $eE;

	$cmd = "rm";
	$args = "-fr '$item'";		// -r in case it's a directory
	$ret = execute($cmd, $args, true);
	if ($ret === "") {
		if ($successMsg === null) {
			$msg = "Removed '{$item}'";
		} else {
			$msg = $successMsg;
		}
		if ($use_TEXT) {
			$msg .= "\n\n";
		} else {
			$msg .= "<br><br>";
		}
		$msg .= "Return to the WebUI and refresh the window.";
	} else {
		$msg = "{$eS}Unable to remove '{$item}': {$ret}{$eE}";
	}

	if ($use_TEXT) {
		echo "$msg";
	} else {
		echo "<span style='font-size: 200%'>$msg</span>";
	}
}

?>
