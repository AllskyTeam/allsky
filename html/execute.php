<?php

include_once('includes/functions.php');
initialize_variables();
include_once('includes/authenticate.php');

// Cause a command specified by "id" (with html output) or "ID" (with just text)
// to be executed.
$use_TEXT = false;
$ID = getVariableOrDefault($_REQUEST, 'id', null);
if ($ID === null) {
	$ID = getVariableOrDefault($_REQUEST, 'ID', null);
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
	<title>Execute <?php echo "$ID"; ?></title>
</head>
<body>
<?php
}

if ($ID === null) {
	echo "${eS}No 'id' specified!${eE}";
	exit(1);
}

switch ($ID) {
	case "AM_RM_PRIOR":		// Remove prior version of Allsky.
		rm_object(ALLSKY_PRIOR_DIR, "Prior Allsky removed.");
		rm_object(ALLSKY_OLD_REMINDER);

		rm_msg($ID);
		break;

	case "AM_RM_CHECK":		// Remove log from checkAllsky.sh.
		rm_object(ALLSKY_CHECK_LOG, "Changes recorded.");

		rm_msg($ID);
		break;

	case "AM_RM_POST":		// Remove log of post-installation actions.
		rm_object(ALLSKY_POST_INSTALL_ACTIONS, "Action recorded.");

		rm_msg($ID);
		break;

	case "AM_RM_ABORTS":	// Remove the specified "have been aborted" file
		rm_object(ALLSKY_ABORTS_DIR . "/$ARGS", "File removed.");

		rm_msg($ID);
		break;

	case "AM_NOT_SUPPORTED":		# Not supported camera
		if ($ARGS === "") {
			echo "${eS}ERROR: Argument not given to command ID: '${ID}'.${eE}";
			exit(1);
		}
		$CMD = ALLSKY_SCRIPTS . "/allsky-config show_supported_cameras";
		execute($CMD, $ARGS);

		rm_msg($ID);
		break;

	case "allsky-config":
		if ($ARGS === "") {
			echo "${eS}ERROR: Argument not given to command ID: '${ID}'.${eE}";
			exit(1);
		}
		$CMD = ALLSKY_SCRIPTS . "/$ID";
		execute($CMD, $ARGS);
		break;

	default:
		echo "${eS}ERROR: Unknown command ID: '${ID}'.${eE}";
		break;
}

if (! $use_TEXT) {
	echo "\n</body>\n</html>\n";
}
exit;

// =============================== functions

function checkRet($CMD, $return_code, $return_string)
{
	global $use_TEXT, $eS, $eE;

	if ($return_code !== 0) {
		echo "${eS}ERROR: Unable to execute '$CMD'.${eE}";
	}
	if ($return_string != null) {
		if ($use_TEXT) {
			echo implode("\n", $return_string);
		} else {
			echo "<pre>";
			echo implode("<br>", $return_string);
			echo "</pre>";
		}
	}

	return($return_code);
}

// Execute a command.
function execute($CMD, $ARGS="")
{
	global $use_TEXT;

	$CMD = escapeshellcmd("sudo --user=" . ALLSKY_OWNER . " $CMD ${ARGS}");
	exec("$CMD 2>&1", $result, $return_val);

	if (! $use_TEXT) {
		// Writing to the console aids in debugging.
		$dq = "'";
		echo "<script>console.log(";
		echo "${dq}[$CMD] returned $return_val, result=" . implode(" ", $result) . "${dq}";
		echo ");</script>\n";
	}

	if (checkRet($CMD, $return_val, $result)) {
		return "";
	} else {
		return($result);
	}
}

// Remove a message from the messages DB.
// Don't display any output.
function rm_msg($ID)
{
	$CMD = ALLSKY_SCRIPTS .  "/addMessage.sh";
	$ARGS = "--id '${ID}' --delete";
	execute($CMD, $ARGS);
}

// Remove a file or directory.
function rm_object($item, $msg=null)
{
	global $use_TEXT, $eS, $eE;

	$CMD = "rm";
	$ARGS = "-fr '$item'";		// -r in case it's a directory
	$ret = execute($CMD, $ARGS);
	if ($msg === null) {
		return;
	}

	$msg = "";
	if ($ret === "") {
		$msg .= "Removed '${item}'";
	} else {
		$msg .= "${eS}Unable to remove '${item}': ${ret}${eE}";
	}

	if ($use_TEXT) {
		echo "$msg";
	} else {
		echo "<span style='font-size: 200%'>$msg</span>";
	}
}
?>
