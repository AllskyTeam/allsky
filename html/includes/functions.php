<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

/**
 *
 * This code is executed outside of a function and is needed by index.php and public.php.
 * It's centralized in this file to make it easier to maintain.
 *
*/

// Read in all bash variables and create "define()" statements for them.
$variablesJsonOk = false;
$allskyHome = getenv('ALLSKY_HOME');
if ($allskyHome !== false) {
	$variablesJsonfile = $allskyHome . DIRECTORY_SEPARATOR . 'variables.json';
	if (file_exists($variablesJsonfile)) {
		$data = json_decode(file_get_contents($variablesJsonfile), true);
		if (json_last_error() === JSON_ERROR_NONE) {
			$variablesJsonOk = true;
			foreach ($data as $key => $value) {
				if (!defined($key)) {
					define($key, $value);
				}
			}
		}
	}
}

if ($variablesJsonOk === false) {
	$from_install = (isset($from_install) && $from_install === true);
	if ($from_install) {
		// Called from the installation program, so don't use HTML or any quotes.
		echo "File $variablesJsonfile not found or corrupted.";
		die(1);
	}

	echo "<br><div style='font-size: 200%; color: red;'>";
	echo "The installation of Allsky is incomplete.<br>";
	echo "File '$variablesJsonfile' not found or corrupted.<br>";
	echo "</div>";

	echo "<br><br>";
	echo "<div style='font-size: 125%;'>";
	echo "If you have NOT installed Allsky please install it by running:";
	echo "<br>";
	echo "<pre>   cd ~/allsky; ./install.sh</pre>";
	echo "The WebUI will not work until Allsky is installed.";

	echo "<br><br><br>";
	echo "If you HAVE successfully installed Allsky please contact the Allsky team on Github<br><br>";
	echo 'Create a discussion <a href="https://github.com/AllskyTeam/allsky">here</a>';
	echo "</div>";
	die(1);
}

// Read and decode a json file, returning the decoded results or null.
// On error, display the specified error message.
// If we're being run by the user it's likely on a tty so don't use html.
function get_decoded_json_file($file, $associative, $errorMsg, &$returnedMsg=null) {
	$retMsg = "";
	$html = (get_current_user() == ALLSKY_WEBSERVER_OWNER);
	if ($html) {
		$div = "<div class='errorMsgBig'>";
		$end = "</div>";
		$br = "<br>";
		$sep = "<br>";
	} else {
		$div = "";
		$end = "\n";
		$br = "\n";
		$sep = "\n";
	}

	if ($file == "" || ! file_exists($file)) {
		$retMsg .= $div;
		$retMsg .= $errorMsg;
		if ($file == "")
			$retMsg .= " File not specified!";
		else
			$retMsg .= " File <b>$file</b> not found!";
		$retMsg .= $end;
		if ($returnedMsg === null) echo "$retMsg";
		else $returnedMsg = $retMsg;
		return null;
	}

	$str = file_get_contents($file, true);
	if ($str === "" || $str === false) {
		$retMsg .= $div;
		$retMsg .= $errorMsg;
		if ($str === "")
			$retMsg .= " File <b>$file</b> is empty!";
		else
			$retMsg .= " Error reading <b>$file</b>!";
		$retMsg .= $end;
		if ($returnedMsg === null) echo "$retMsg";
		else $returnedMsg = $retMsg;
		return null;
	}

	$str_array = json_decode($str, $associative);
	if ($str_array == null) {
		$retMsg .= $div;
		$retMsg .= "$errorMsg ";
		$retMsg .= json_last_error_msg();
# TODO: json_pp gives a generic "on line 59" message.
		$cmd = "json_pp < $file 2>&1";
		exec($cmd, $output);
		$retMsg .= $br;
		$retMsg .= implode($sep, $output);
		$retMsg .= $end;
		if ($returnedMsg === null) echo "$retMsg";
		else $returnedMsg = $retMsg;
		return null;
	}
	return $str_array;
}

// The opposite of toString().  Given a string version of a boolean, return true or false.
function toBool($s) {
	if ($s == "true" || $s == "Yes" || $s == "yes" || $s == "1")
		return true;
	return false;
}

function verifyNumber($num) {
	if ($num == "" || ! is_numeric($num)) {
		return false;
	}
	return true;
}

// Globals
define('DATE_TIME_FORMAT', 'Y-m-d H:i:s');
$image_name = null;
$showUpdatedMessage = true; $delay=null; $daydelay=null; $daydelay_postMsg=""; $nightdelay=null; $nightdelay_postMsg="";
$imagesSortOrder = null;
$darkframe = null;
$useLogin = null;
$temptype = null;
$lastChanged = null;
$remoteWebsiteURL = null;
$settings_array = null;
$useLocalWebsite = false;
$useRemoteWebsite = false;
$hasLocalWebsite = false;
$hasRemoteWebsite = false;
$endSetting = "XX_END_XX";
$saveChangesLabel = "Save changes";		// May be overwritten
$forceRestart = false;					// Restart even if no changes?
$hostname = null;

$test_directory = "test";	// directories that start with this are "non-standard"

// Regular expressions for preg_match().
	// A directory in ${ALLSKY_IMAGES}.
	// Either: 2YYYMMDD  or  $test_directory (which is used for non-standard images)
	// Start with "2" for the 2000's.
$re_image_directory = "/^(2\d{7}|{$test_directory}\w*)$/";
	// An image:  "image-YYYYMMDDHHMMSS.jpg" or .jpe or .png
$re_image_name = '/^\w+-.*\d{14}[.](jpe?g|png)$/i';
	// An image in a "test*" directory:  "*.jpg" or .jpe or .png
$re_test_image_name = '/^.*[.](jpe?g|png)$/';

function readSettingsFile() {
	$settings_file = getSettingsFile();
	$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
	$contents = get_decoded_json_file($settings_file, true, $errorMsg);
	if ($contents === null) {
		exit(1);
	}
	return($contents);
}

function readOptionsFile() {
	$options_file = getOptionsFile();
	$errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$contents = get_decoded_json_file($options_file, true, $errorMsg);
	if ($contents === null) {
		exit(1);
	}
	return($contents);
}

$allsky_status = null;
$allsky_status_timestamp = null;

function update_allsky_status($newStatus) {
	global $status, $allsky_status;

	$s = array();
	$s["status"] = $newStatus;
	$s['timestamp'] = date(DATE_TIME_FORMAT);

	$msg = updateFile(ALLSKY_STATUS, json_encode($s, JSON_PRETTY_PRINT), "Allsky status", true);
	if ($msg !== "") {
		$status->addMessage("Failed to update Allsky status: $msg", 'danger');
	} else {
		$allsky_status = $newStatus;
	}
}

function output_allsky_status() {
	global $allsky_status, $allsky_status_timestamp;

	$retMsg = "";
	$s = get_decoded_json_file(ALLSKY_STATUS, true, "", $retMsg);
	if ($s === null) {
		$allsky_status = "Unknown";
		$allsky_status_timestamp = $retMsg;
	} else {
		$allsky_status = getVariableOrDefault($s, 'status', "Unknown");
		$allsky_status_timestamp = getVariableOrDefault($s, 'timestamp', null);
	}

	if ($allsky_status_timestamp === null) {
		$title = "";
		$class = "";
	} else if ($allsky_status == "Unknown") {
		$allsky_status_timestamp = str_replace("<b>", "", $allsky_status_timestamp);
		$allsky_status_timestamp = str_replace("</b>","", $allsky_status_timestamp);
		$title = " title='$allsky_status_timestamp'";
		$class = "alert-danger";
	} else {
		$title = "title='Since $allsky_status_timestamp'";
		if ($allsky_status == ALLSKY_STATUS_RUNNING) {
			$class = "alert-success";
		} else {
			$class = "alert-warning";
		}
	}
	return("<span class='nowrap $class' $title>Status: $allsky_status</span><br>");
}

function initialize_variables($website_only=false) {
	global $status;
	global $image_name;
	global $showUpdatedMessage, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg;
	global $imagesSortOrder;
	global $darkframe, $useLogin, $temptype, $lastChanged, $lastChangedName;
	global $remoteWebsiteURL;
	global $settings_array;
	global $useLocalWebsite, $useRemoteWebsite;
	global $hasLocalWebsite, $hasRemoteWebsite;
	global $hostname;

	$settings_array = readSettingsFile();

	// See if there are any Website configuration files.
	// The "has" variables just mean the associated configuration file exists,
	// and in the case of a remote Website, that it also has a URL.
	// The "use" variables means we're actually using the Website.
	if (file_exists(getLocalWebsiteConfigFile())) {
		$hasLocalWebsite = true;
		$useLocalWebsite = toBool(getVariableOrDefault($settings_array, 'uselocalwebsite', "false"));
	}
	if (file_exists(getRemoteWebsiteConfigFile()) && getVariableOrDefault($settings_array, "remotewebsiteurl", "") !== "") {
		$hasRemoteWebsite = true;
		$useRemoteWebsite = toBool(getVariableOrDefault($settings_array, 'useremotewebsite', "false"));
	}

	if ($website_only) return;

	// ALLSKY_IMG_DIR is an alias in the web server's config that points to where the current image is.
	// It's the same as ${ALLSKY_CURRENT_DIR} which is the physical path name on the server.
	$f = getVariableOrDefault($settings_array, 'filename', "image.jpg");
	$image_name = ALLSKY_IMG_DIR . "/$f";
	$darkframe = toBool(getVariableOrDefault($settings_array, 'takedarkframes', "false"));
	$imagesSortOrder = getVariableOrDefault($settings_array, 'imagessortorder', "ascending");
	$useLogin = toBool(getVariableOrDefault($settings_array, 'uselogin', "true"));
	$temptype = getVariableOrDefault($settings_array, 'temptype', "C");
	$lastChanged = getVariableOrDefault($settings_array, $lastChangedName, "");
	$remoteWebsiteURL = getVariableOrDefault($settings_array, 'remotewebsiteurl', "");

	$ms_per_sec = 1000;		// to make the code easier to read

	////////////////// Determine delay between refreshes of the image.
	$daydelay = getVariableOrDefault($settings_array, 'daydelay', 30 * $ms_per_sec);
	$nightdelay = getVariableOrDefault($settings_array, 'nightdelay', 30 * $ms_per_sec);
	$showUpdatedMessage = toBool(getVariableOrDefault($settings_array, 'showupdatedmessage', "true"));

	$dayexposure = getVariableOrDefault($settings_array, 'dayexposure', 500);
	$daymaxautoexposure = getVariableOrDefault($settings_array, 'daymaxautoexposure', 100);
	$nightexposure = getVariableOrDefault($settings_array, 'nightexposure', 10 * $ms_per_sec);
	$nightmaxautoexposure = getVariableOrDefault($settings_array, 'nightmaxautoexposure', 10 * $ms_per_sec);

	$ok = true;
	// These are all required settings so if they are blank don't display a
	// message since the WebUI will.
	$delay = 0;
	if (! verifyNumber($daydelay)) $ok = false; else $delay += $daydelay;
	if (! verifyNumber($daymaxautoexposure)) $ok = false;
	if (! verifyNumber($dayexposure)) $ok = false;
	if (! verifyNumber($nightdelay)) $ok = false; else $delay += $nightdelay;
	if (! verifyNumber($nightmaxautoexposure)) $ok = false;
	if (! verifyNumber($nightexposure)) $ok = false;

	if (! $ok) {
		$showUpdatedMessage = false;
		if ($delay === 0) $delay = 20 * $ms_per_sec;	// a reasonable default
		return;
	}

	$dayautoexposure = toBool(getVariableOrDefault($settings_array, 'dayautoexposure', "true"));
	$nightautoexposure = toBool(getVariableOrDefault($settings_array, 'nightautoexposure', "true"));
	$consistentDelays = toBool(getVariableOrDefault($settings_array, 'consistentdelays', "true"));

	if ($consistentDelays) {
		$daydelay += $dayautoexposure ?  $daymaxautoexposure : $dayexposure;
		$daydelay_postMsg = "";
		$nightdelay += $nightautoexposure ?   $nightmaxautoexposure : $nightexposure;
		$nightdelay_postMsg = "";
	} else {
		// Using $daymaxautoexposure and $nightmaxautoexposure isn't
		// accurate since they are fixed numbers.
		// If the ACTUAL exposure was, e.g., 1 us, then the actual delay is effectively just the delay,
		// but if $dayexposure was 10 seconds, we'd set the delay to $delay + 10 seconds.
		// Daytime exposure are normally under a second, so use 1 second for the auto-exposure amount.
		// Daytime exposure are normally at least 10 seconds so use that.
		$daydelay += $dayautoexposure ?  (1 * $ms_per_sec) : $dayexposure;
		$daydelay_postMsg = " minimum";
		$nightdelay += $nightautoexposure ?   (10 * $ms_per_sec) : $nightexposure;
		$nightdelay_postMsg = " minimum";
	}

	// Determine if it's day or night so we know which delay to use.
	$angle = getVariableOrDefault($settings_array, 'angle', -6);
	$lat = getVariableOrDefault($settings_array, 'latitude', "");
	$lon = getVariableOrDefault($settings_array, 'longitude', "");
	if ($lat != "" && $lon != "") {
		exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
		if ($retval == 2) {
			$delay = $daydelay;
		} else if ($retval == 3) {
			$delay = $nightdelay;
		} else {
			$msg = "<code>sunwait</code> returned $retval; don't know if it's day or night.";
			$status->addMessage($msg, 'danger');
			$delay = ($daydelay + $nightdelay) / 2;		// Use the average delay
		}

		// Convert to seconds for display on the LiveView page.
		// These variables are now only used for the display.
		$daydelay /= $ms_per_sec;
		$nightdelay /= $ms_per_sec;
	} else {
		// Error message will be displayed by WebUI.
		$showUpdatedMessage = false;
		// Not showing delay so just use average
		$delay = ($daydelay + $nightdelay) / 2;		// Use the average delay
	}

	// Lessen the delay between a new picture and when we check.
	$delay /= 5;
	$delay = max($delay, 2 * $ms_per_sec);

	exec("hostname -f", $hostarray);
	$hostname = $hostarray[0];
}

// Check if the settings have been configured.
function check_if_configured($page, $calledFrom) {
	global $lastChanged, $status, $allsky_status, $saveChangesLabel;

	static $will_display_configured_message = false;

	if ($will_display_configured_message) {
		return(true);
	}

	if ($lastChanged === "") {
		// The settings either need reviewing or aren't fully configured which
		// usually happens right after an installation or upgrade.
		if ($allsky_status == ALLSKY_STATUS_NEEDS_REVIEW) {
			$msg = "Please review the Allsky settings to make sure they look correct.<br>";
			$saveChangesLabel = "Review done; start Allsky";
			$forceRestart = true;
		} else {
			// Should be ALLSKY_STATUS_NEEDS_CONFIGURATION, but if something else,
			// do the same the same thing.
			$msg = "Please configure the Allsky settings.<br>";
			$saveChangesLabel = "Configuration done; start Allsky";
			$forceRestart = true;
		}

		$msg2 = "When done, click on the";
		$msg2 .= " <span class='btn-primary btn-fake'>{$saveChangesLabel}</span> button.";

		if ($page === "configuration")
			$msg .= $msg2;
		else
			$msg .= "Go to the 'Allsky Settings' page to do so.";
		$status->addMessage("<div id='mustConfigure' class='important'>$msg</div>", 'danger');
		$will_display_configured_message = true;
		return(false);
	}

	return(true);
}
/**
*
* We need to make sure we're only trying to display and delete image directories, not ones like /etc.
* In this case "valid" means it's an image directory.
*
*/
function is_valid_directory($directory_name) {
	global $re_image_directory;

	return preg_match($re_image_directory, basename($directory_name));
}

/**
*
* Add CSRF Token to form
*
*/
function CSRFToken() {
	global $useLogin;
	if (! $useLogin) return;
?>
<input type="hidden" name="csrf_token" id="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>" />
<?php
}

/**
*
* Validate CSRF Token
*
*/
function CSRFValidate(): bool {
  	global $useLogin;

  	if (! $useLogin) return true;

    if (session_status() !== PHP_SESSION_ACTIVE) { 
			@session_start(); 
		}

    $session = $_SESSION['csrf_token'] ?? '';
    $header  = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $field   = $_POST['csrf_token'] ?? '';

    $provided = $header ?: $field;
    return is_string($session) && is_string($provided) && hash_equals($session, $provided);
}

/**
*
* Functions to get the status output of an interface determine if it's up or down and
* to parse "ifconfig" output and return results.
*/
function get_interface_status($cmd) {
	exec($cmd, $return );
	return(preg_replace('/\s\s+/', ' ', implode(" ", $return)));
}

function is_interface_up($interface_status) {
	return(strpos($interface_status, "UP") !== false ? true : false);
}

function is_interface_running($interface_status) {
	return(strpos($interface_status, "RUNNING") !== false ? true : false);
}

function parse_ifconfig($input, &$strHWAddress, &$strIPAddress, &$strNetMask, &$strRxPackets, &$strTxPackets, &$strRxBytes, &$strTxBytes) {
	preg_match( '/ether ([0-9a-f:]+)/i', $input, $result );
	$strHWAddress = getVariableOrDefault($result, 1, "[not set]");
	preg_match( '/inet ([0-9.]+)/i', $input, $result );
	$strIPAddress = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/netmask ([0-9.]+)/i', $input, $result );
	$strNetMask = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/RX packets (\d+)/', $input, $result );
	$strRxPackets = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/TX packets (\d+)/', $input, $result );
	$strTxPackets = getVariableOrDefault($result, 1, "[not set]");

	preg_match_all( '/bytes (\d+ \(\d+.\d+ [K|M|G]iB\))/i', $input, $result );
	if (isset($result[1][0])) {
		$strRxBytes = $result[1][0];
		$strTxBytes = $result[1][1];
	} else {
		$strRxBytes = 0;
		$strTxBytes = 0;
	}
}

function handle_interface_POST_and_status($interface, $input, &$myStatus) {
	$interface_up = false;
	if( isset($_POST['turn_down']) ) {
		// We should only get here if the interface is up,
		// but just in case, check if it's already down.
		// If the interface is down it's also not running.
		$s = get_interface_status("ifconfig $interface");
		if (! is_interface_up($s)) {
			$myStatus->addMessage("Interface $interface was already down", 'warning', false);
		} else {
			exec( "sudo ifconfig $interface down 2>&1", $output );	// stop
			// Check that it actually stopped
			$s = get_interface_status("ifconfig $interface");
			if (! is_interface_up($s)) {
				$myStatus->addMessage("Interface $interface stopped", 'success', false);
			} else {
				if ($output == "")
					$output = "Unknown reason";
				else
					$output = implode(" ", $output);
				$myStatus->addMessage("Unable to stop interface $interface<br>$output" , 'danger', false);
				$interface_up = true;
			}
		}

	} elseif( isset($_POST['turn_up']) ) {
		// We should only get here if the interface is down,
		// but just in case, check if it's already up.
		if (is_interface_up(get_interface_status("ifconfig $interface"))) {
			$myStatus->addMessage("Interface $interface was already up", 'warning', false);
			$interface_up = true;
		} else {
			exec( "sudo ifconfig $interface up 2>&1", $output );	// start
			// Check that it actually started
			$s = get_interface_status("ifconfig $interface");
			if (! is_interface_up($s)) {
				$myStatus->addMessage("Unable to start interface $interface", 'danger', false);
			} else {
				if (is_interface_running($s))
					$myStatus->addMessage("Interface $interface started", 'success', false);
				else
					$myStatus->addMessage("Interface $interface started but nothing connected to it", 'warning', false);
				$interface_up = true;
			}
		}

	} elseif (is_interface_up($input)) {
		// The interface can be up but nothing connected to it (i.e., not RUNNING).
		if (is_interface_running($input))
			$myStatus->addMessage("Interface $interface is up", 'success', false);
		else
			$myStatus->addMessage("Interface $interface is up but nothing connected to it", 'warning', false);
		$interface_up = true;

	} else {
		$myStatus->addMessage("Interface $interface is down", 'danger', false);
	}

	return($interface_up);
}

/**
* Get a list of valid image directories.
*/
function getValidImageDirectories() {
	$days = array();

	if ($handle = opendir(ALLSKY_IMAGES)) {
	    while (false !== ($day = readdir($handle))) {
			if (is_valid_directory($day)) {
				$days[] = $day;
			}
	    }
	    closedir($handle);
	}
	return $days;
}

/**
* Get a list of valid image names
*/
function getValidImageNames($dir, $stopAfterOne=false) {
	global $re_image_name, $re_test_image_name, $test_directory;

	$images = array();

	if (substr(basename($dir), 0, 4) === $test_directory) {
		// Images in a "test" directory have different naming conventions.
		$re = $re_test_image_name;
	} else {
		$re = $re_image_name;
	}
	
	if ($handle = opendir($dir)) {
	    while (false !== ($image = readdir($handle))) {
			if (preg_match($re, $image)){
				$images[] = $image;
				if ($stopAfterOne) break;
			}
	    }
	    closedir($handle);
	}
	return $images;
}

/**
* List a type of file - either "All" (case sensitive) for all days,
* or only for the specified day.
* If $dir is not null, it ends in "/".
*/
function ListFileType($dir, $imageFileName, $formalImageTypeName, $type, $listNames=false) {
	// "/images" is an alias in the web server for ALLSKY_IMAGES
	$images_dir = "/images";
	$chosen_day = getVariableOrDefault($_REQUEST, 'day', null);
	if ($chosen_day === null) {
		echo "<br><br><br>";
		echo "<h2 class='alert-danger'>ERROR: No 'day' specified in URL.</h2>";
		return;
	}

	if (! is_dir(ALLSKY_IMAGES)) {
		echo "<br><div class='errorMsgBig'>";
		echo "ERROR: '" . ALLSKY_IMAGES . "' directory is missing!";
		echo "</div>";
		return;
	}

	echo "<h2>$formalImageTypeName - $chosen_day</h2>\n";
	echo "<div class='row'>\n";
	if ($chosen_day === 'All'){
		$days = getValidImageDirectories();
		if (count($days) == 0) {
			// This could indicate an error, or the user just installed allsky
			echo "<span class='alert-warning'>There are no image directories.</span>";
		} else {
			rsort($days);
			$num = 0;
			foreach ($days as $day) {
				$imageTypes = array();
				foreach (glob(ALLSKY_IMAGES . "/$day/$dir$imageFileName-$day.*") as $imageType) {
					$imageTypes[] = $imageType;
					$num += 1;
					echo "<br>&nbsp;"; // to separate images
					foreach ($imageTypes as $imageType) {
						$imageType_name = basename($imageType);
						$fullFilename = "$images_dir/$day/$dir$imageType_name";
						if ($type == "picture") {
							echo "<a href='$fullFilename'>";
							echo "<div class='functionsListFileType'>";
							echo "<label>$day</label>";
							echo "<img src='$fullFilename' class='functionsListTypeImg' />";
							echo "</div></a>\n";
						} else {	// is video
							// TODO: Show a thumbnail since loading videos is bandwidth intensive?
							echo "<a href='$fullFilename'>";
							echo "<div class='functionsListFileType'>";
							echo "<label class='middleVerticalAlign'>$day &nbsp; &nbsp;</label>";
							echo "<video width='85%' height='85%' controls class='middleVerticalAlign'>";
							echo "<source src='$fullFilename' type='video/mp4'>";
							echo "Your browser does not support the video tag.";
							echo "</video>";
							echo "</div></a>\n";
						}
			  		}
				}
			}
			if ($num == 0) {
				echo "<span class='alert-warning'>There are no $formalImageTypeName.</span>";
			}
		}
	} else {
		$expr = ALLSKY_IMAGES . "/{$chosen_day}/{$dir}";
		if (substr($imageFileName, 0, 1) == "X") {
			// If the file name begins with a "X" the look for files whose names
			// begin with the filename (without the "X").
			// This allows non-standard image names.
			// These are often "test" images that may be recreated with the same
			// file names, so force the browser to read them.
			$expr .= substr($imageFileName, 1) . "*";
			$ts = "?_ts=" . time();
		} else {
			$expr .= "{$imageFileName}-{$chosen_day}*";
			$ts = "";
		}
		$imageTypes = array();
		foreach (glob($expr) as $imageType) {
			$imageTypes[] = $imageType;
		}
		if (count($imageTypes) == 0) {
			echo "<span class='alert-warning'>There are no $formalImageTypeName for this day.</span>";
		} else {
			foreach ($imageTypes as $imageType) {
				$imageType_name = basename($imageType);
				$fullFilename = "$images_dir/$chosen_day/$dir$imageType_name";
				if ($listNames) {
					$class = "left center-text";
					$name = "<br><span style='font-size: 125%;'>";
					$name .= basename($fullFilename);
					$name .= "</span>";
				} else {
					$class = "left";
					$name = "";
				}
				if ($type == "picture") {
					$style = "max-width: 100%; max-height: 400px;";
					if ($listNames) {
						echo "<div class='$class' style='padding: 10px 10px 20px 10px;'>";
						echo "<a href='$fullFilename'>
						<img src='$fullFilename$ts' style='$style'/>
						</a>";
						echo $name;
						echo "</div>";
					} else {
						echo "<a href='$fullFilename'>";
						echo "<div class='$class'>";
						echo "<img src='$fullFilename$ts' style='$style'/>";
						echo "</div></a>";
					}
					echo "\n";
				} else {	//video
				    echo "<a href='$fullFilename'>";
				    echo "<div class='$class' style='width: 100%'>";
					echo "<video width='85%' height='85%' controls>
						<source src='$fullFilename$ts' type='video/mp4'>
						Your browser does not support the video tag.
					</video>
					</div></a>";
					if ($listNames) {
						echo $name;
					}
					echo "\n";
				}
			}
		}
	}
	echo "</div>";
}

// Run a command and display the appropriate status message.
// If $addMsg is false, then don't add our own message.
function runCommand($cmd, $onSuccessMessage, $messageColor, $addMsg=true, $onFailureMessage="", &$return_val=null)
{
	global $status;

	$result = null;
	exec("$cmd 2>&1", $result, $return_val);
	$script = "";
	echo "<script>";
		echo "console.log(`[$cmd] returned $return_val";
		if ($result === null) {
			$modifiedResult = $result;
		} else {
			$modifiedResult = array();
			$on_line = 0;
			foreach ($result as $res) {
				$on_line++;

				if (substr($res, 0, 8) == "<script>") {
					$script .= $res;
				} else {
					if ($on_line === 1) {
						echo ", result=";
					}
					$modifiedResult[] = $res;
					echo "   ";
				}
			}
		}
		echo "`);";
	echo "</script>\n";
	if ($script !== "") {
		echo "\n<!-- from $cmd -->$script\n";
	}
	if ($return_val > 0 && $return_val !== EXIT_PARTIAL_OK) {
		$r = "";
		if ($modifiedResult !== null) {
			$r = implode("<br>", $modifiedResult);
		}

		if ($return_val === 255) {
			// This is only a warning so only display the caller's message, if any.
			$msg = $r;
			if ($msg !== "") {
				$status->addMessage($msg, "warning", false);
			}
			return false;
		}

		// Display a failure message, plus the caller's message, if any.
		if ($addMsg) {
			$msg = "'$cmd' failed";
			if ($r != null) $msg .= ":<br>$r";
		} else {
			$msg = $r;
		}
		// Display the caller's "on success" onSuccessMessage, if any.
		if ($onFailureMessage !== "") {
			$status->addMessage($onFailureMessage, "danger", false);
		}
		if ($msg !== "") {
			$status->addMessage($msg, "danger", false);
		}
		return false;
	}

	// Display the caller's "on success" onSuccessMessage, if any.
	if ($onSuccessMessage !== "")
		$status->addMessage($onSuccessMessage, $messageColor, false);

	// Display any output from the command.
	// If there are any lines that begin with:  ERROR  or  WARNING
	// then display them in the appropriate format.
	if ($modifiedResult != null) {
		$msg = "";
		$sev = "";
  		foreach ($modifiedResult as $line) {
			if ($msg !== "") $msg .= "<br>";

			if (strpos($line, "ERROR::") !== false) {
				$msg .= str_replace("ERROR:", "<strong>ERROR</strong>", $line);
				if ($sev === "") $sev = "danger";
			} else if (strpos($line, "ERROR:") !== false) {
				$msg .= str_replace("ERROR", "<strong>ERROR</strong>", $line);
				if ($sev === "") $sev = "danger";

			} else if (strpos($line, "WARNING::") !== false) {
				$msg .= str_replace("WARNING:", "<strong>WARNING</strong>", $line);
				if ($sev === "") $sev = "warning";
			} else if (strpos($line, "WARNING:") !== false) {
				$msg .= str_replace("WARNING", "<strong>WARNING</strong>", $line);
				if ($sev === "") $sev = "warning";

			} else if (strpos($line, "SUCCESS::") !== false) {
				$msg .= str_replace("SUCCESS::", "", $line);
				if ($sev === "") $sev = "success";

			} else if (strpos($line, "INFO::") !== false) {
				$msg .= str_replace("INFO::", "", $line);
				if ($sev === "") $sev = "info";

			} else if (strpos($line, "DEBUG:") !== false) {
				$msg .= str_replace("DEBUG:", "", $line);
				if ($sev === "") $sev = "debug";

			} else {
				$msg .= $line;
				if ($sev === "") $sev = "message";
			}
		}
		$status->addMessage("$msg<br>", $sev, false);
	}

	return true;
}

// Update a file.
// Files should be writable by the web server, but if they aren't, use a temporary file.
// Return any error message.
function updateFile($file, $contents, $fileName, $toConsole, $silent=false) {
	if (@file_put_contents($file, $contents) == false) {
		$e = error_get_last()['message'];

		if (! $silent) {
			// $toConsole tells us whether or not to use console.log() or just echo.
			if ($toConsole) {
				$cl1 = '<script>console.log(`';
				$cl2 = '`);</script>';
			} else {
				$cl1 = "<br>";
				$cl2 = "";
			}
			echo "{$cl1}Note: Unable to update $file 1st time: {$e}{$cl2}\n";
		}

		// Assumed it failed due to lack of permissions,
		// usually because the file isn't grouped to the web server group.
		// Set the permissions and try again.

		$cmd = "sudo touch '$file' && sudo chgrp " . ALLSKY_WEBSERVER_GROUP . " '$file' &&";
		$cmd .= " sudo chmod g+w '$file'";
		$return = null;
		$ret = exec("( $cmd ) 2>&1", $return, $retval);
		if (gettype($return) === "array")
			$c = count($return);
		else
			$c = 0;
		if ($ret === false || $c > 0 || $retval !== 0) {
			$err = implode("\n", $return);
			return "Unable to update '$file': $err";
		}

		if (@file_put_contents($file, $contents) == false) {
			if (! $silent) {
				$e = error_get_last()['message'];
				$err = "Failed to save '$file': $e";
				echo "{$cl1}Unable to update file for 2nd time: {$e}{$cl2}";
				$x = str_replace("\n", "", shell_exec("ls -l '$file'"));
				echo "{$cl1}ls -l returned: {$x}{$cl2}";
			}

			// Save a temporary copy of the file in a place the webserver can write to,
			// then use sudo to "cp" the file to the final place.
			// Use "cp" instead of "mv" because the destination file may be a hard link
			// and we need to keep the link.
			$tempFile = "/tmp/$fileName-temp.txt";

			if (@file_put_contents($tempFile, $contents) == false) {
				$err = "Failed to create temporary file: " . error_get_last()['message'];
				return $err;
			}

			$cmd = "x=\$(sudo cp '$tempFile' '$file' 2>&1) || echo 'Unable to copy [$tempFile] to [$file]': \${x}";
			$err = str_replace("\n", "", shell_exec($cmd));
			if ($err !== "") echo "{$cl1}cp returned: [$err]{$cl2}";
			return $err;
		}
	}
	return "";
}

// Return the settings file for the current camera.
function getSettingsFile() {
	return ALLSKY_SETTINGS_FILE;
}

// Return the options file for the current camera.
function getOptionsFile() {
	return ALLSKY_OPTIONS_FILE;
}

// Return the full path name of the local Website configuration file.
function getLocalWebsiteConfigFile() {
	return ALLSKY_WEBSITE_CONFIGURATION_FILE;
}

// Return the full path name of the remote Website configuration file.
function getRemoteWebsiteConfigFile() {
	return ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE;
}

// Check if the specified variable is in the specified array.
// If so, return it; if not, return default value;
// This is used to make the code easier to read.
function getVariableOrDefault($a, $v, $d) {
	if (isset($a[$v])) {
		$value = $a[$v];
		if (gettype($value) === "boolean") {
			if ($value || $value == "true") {
				return "true";
			} else {
				return "false";
			}
		}
		return $value;
	} else if (gettype($d) === "boolean" && $d == "") {
		return "false";
	} else if (gettype($d) === "null") {
		return null;
	}

	return($d);
}

function getSecret($secret=false) {

    $rawData = file_get_contents(ALLSKY_ENV, true);
    $secretData = json_decode($rawData, true);

    if ($secret !== false) {
    	$result = getVariableOrDefault($secretData, $secret, null);
    } else {
        $result = $secretData;
    }

    return $result;
}


function getDatabaseConfig() {
    $secretData = getSecret();
    $settings = readSettingsFile();
    $secretData['databasetype'] = $settings['databasetype'];

    return $secretData;
}

function haveDatabase() {

    $secretData = getDatabaseConfig();
    $databaseType = 'none';
    if (isset($secretData['databasetype'])) {
        $databaseType = $secretData['databasetype'];
    }
    switch ($databaseType) {
        case 'sqlite':
            return haveSQLite($secretData);
        case 'mysql':
            return haveMySQL($secretData);
        default:
            return false;
    }
}

function haveSQLite() {
    $result = true;

	try {
    	$db = new SQLite3(ALLSKY_DATABASES);
	} catch (Exception $e) {
		$db = false;
	}

    if (!$db) {
        $result = false;
    }
    return $result;
}

function haveMySQL($secretData) {
    $result = false;
    try {
        if (in_array('mysql', PDO::getAvailableDrivers())) {

            $host = $secretData['databasehost'];
            $db   = $secretData['databasedatabase'];
            $user = $secretData['databaseuser'];
            $pass = $secretData['databasepassword'];
            $charset = 'utf8mb4';
            
            $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];      
            $pdo = new PDO($dsn, $user, $pass, $options);
            $result = true;
        }   
    } catch (PDOException $e) {
    } catch (Exception $e) {
    }
    
    return $result;
}

function getTOD() {
	global $settings_array;

	$angle = getVariableOrDefault($settings_array, 'angle', -6);
	$lat = getVariableOrDefault($settings_array, 'latitude', "");
	$lon = getVariableOrDefault($settings_array, 'longitude', "");
	$tod = 'Unknown';

	if ($lat != "" && $lon != "") {
		exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
		if ($retval == 2) {
			$tod = 'day';
		} else if ($retval == 3) {
			$tod = 'night';
		}
	}
	
	return $tod;
}

// Get the newest Allsky version string.
// For efficiency, only check every other day.
function getNewestAllskyVersion(&$changed=null)
{
	$versionFile = ALLSKY_CONFIG . "/newestversion.json";
	$version_array = null;
	$priorVersion = null;
	$changed = false;
	$date = date_create("now");
	$compareDate = date_timestamp_get($date) - (24 * 60 * 60 * 2);		// 2 days
	$exists = file_exists($versionFile);

	if ($exists) {
		$str = file_get_contents($versionFile, true);
		$err = "";
		if ($str === false) {
			$err = "Error reading $versionFile.";
		} else if ($str === "") {
			$err = "$versionFile is empty.";
		} else {
			$version_array = json_decode($str, true);
			if ($version_array === null) {
				$err = "$versionFile has no json.";
			} else {
				$priorVersion = getVariableOrDefault($version_array, 'version', null);
			}
		}
		if ($err !== "") {
			// TODO: should these errors set addMessage() ?
			unlink($versionFile);
			$exists = false;
		}
	}

	if ($version_array === null || ($exists && filemtime($versionFile) < $compareDate)) {
		// Need to (re)get the data.

		$cmd = ALLSKY_UTILITIES . "/getNewestAllskyVersion.sh";
		exec("$cmd 2>&1", $newestVersion, $return_val);

		// 90 == newestVersion is newer than current.
		if (($return_val !== 0 && $return_val !== 90) || $newestVersion === null) {
			// some error
			if ($exists) unlink($versionFile);
			return($version_array);		// may be null...
		}

		$version_array = array();
		$version_array['version'] = getVariableOrDefault($newestVersion, 0, "");
		$version_array['versionNote'] = getVariableOrDefault($newestVersion, 1, "");
		$version_array['timestamp'] = date(DATE_TIME_FORMAT);

		// Has the version changed?
		if ($priorVersion === null || $priorVersion !== $version_array['version']) {
			$changed = true;
		}

		$msg = "[$cmd] returned $return_val, version_array=" . json_encode($newestVersion) . ", changed=$changed";
		echo "<script>console.log(`$msg`);</script>";

		// Save new info.
		@file_put_contents($versionFile, json_encode($version_array, JSON_PRETTY_PRINT));
		@chmod($versionFile, 0664);		// so the user can remove it if desired
	}

	return($version_array);
}

function getUptime() {
	$uparray = explode(" ", exec("cat /proc/uptime"));
	$seconds = round($uparray[0], 0);
	$minutes = $seconds / 60;
	$hours = $minutes / 60;
	$days = floor($hours / 24);
	$hours = floor($hours - ($days * 24));
	$minutes = floor($minutes - ($days * 24 * 60) - ($hours * 60));
	$uptime = '';
	if ($days != 0) {
		$uptime .= $days . ' day' . (($days > 1) ? 's ' : ' ');
	}
	if ($hours != 0) {
		$uptime .= $hours . ' hour' . (($hours > 1) ? 's ' : ' ');
	}
	if ($minutes != 0) {
		$uptime .= $minutes . ' minute' . (($minutes > 1) ? 's ' : ' ');
	}

	return $uptime;
}

function getCPULoad($secs=2) 
{
	$q = '"';
	$cmd = "(grep -m 1 'cpu ' /proc/stat; sleep $secs; grep -m 1 'cpu ' /proc/stat)";
	$cmd .= " | gawk '{u=$2+$4; t=$2+$4+$5; if (NR==1){u1=u; t1=t;} else printf($q%.0f$q, (($2+$4-u1) * 100 / (t-t1))); }'";
	$cpuload = exec($cmd);
	if ($cpuload < 0 || $cpuload > 100) echo "<p class='errorMsgBig'>Invalid cpuload value: $cpuload</p>";

	return $cpuload;
}

function getCPUTemp()
{
	global $temptype;
	
	$temperature = file_get_contents("/sys/class/thermal/thermal_zone0/temp");
	$temperature = round($temperature / 1000, 2);
	if ($temperature < 0) {
		$temperature_status = "danger";
	} elseif ($temperature < 10) {
		$temperature_status = "warning";
	} else {
		$temperature_status = "";
	}

	$C = number_format($temperature, 1, '.', '');
	$display_temperature =  "$C&deg; C";
	$F = (($temperature * 1.8) + 32);
	$F = number_format($F, 1, '.', '');
	$display_temperature .= "&nbsp; &nbsp; $F&deg; F";

	return array(
		'temperature' => $temperature,
		'display_temperature' => $display_temperature,
		'temperature_status' => $temperature_status
	);

}

function getMemoryUsed() 
{
	exec("free -m | gawk '/Mem:/ { total=$2 } /buffers\/cache/ { used=$3 } END { print used/total*100}'", $memarray);
	$memused = floor($memarray[0]);
	// check if memused is unreasonably low, if so repeat
	if ($memused < 0.1) {
		unset($memarray);
		exec("free -m | gawk '/Mem:/ { total=$2 } /Mem:/ { used=$3 } END { print used/total*100}'", $memarray);
		$memused = floor($memarray[0]);
	}
	
	return $memused;
}

function getThrottleStatus() 
{
	$x = exec("sudo vcgencmd get_throttled 2>&1");	// Output: throttled=0x12345...
	if (preg_match("/^throttled=/", $x) == false) {
			$throttle_status = "danger";
			$throttle = "<span class='errorMsgBig'>";
			$throttle .= "Not able to get throttle status:<br>$x";
			$throttle .= "</span>";
	} else {
		$x = explode("x", $x);	// Output: throttled=0x12345...
		if ($x[1] == "0") {
				$throttle_status = "success";
				$throttle = "No throttling";
		} else {
			$bits = base_convert($x[1], 16, 2);	// convert hex to bits
			// See https://www.raspberrypi.com/documentation/computers/os.html#vcgencmd
			$messages = array(
				0 => 'Currently under-voltage',
				1 => 'ARM frequency currently capped',
				2 => 'Currently throttled',
				3 => 'Soft temperature limit currently active',

				16 => 'Under-voltage has occurred since last reboot.',
				17 => 'Throttling has occurred since last reboot.',
				18 => 'ARM frequency capped has occurred since last reboot.',
				19 => 'Soft temperature limit has occurred'
			);
			$l = strlen($bits);
			$throttle_status = "warning";
			$throttle = "";
			// bit 0 is the rightmost bit
			for ($pos=0; $pos<$l; $pos++) {
				$i = $l - $pos - 1;
				$bit = $bits[$i];
				if ($bit == 0) continue;
				if (array_key_exists($pos, $messages)) {
					if ($throttle == "") {
						$throttle = $messages[$pos];
					} else {
						$throttle .= "<br>" . $messages[$pos];
					}
					// current issues are a danger; prior issues are a warning
					if ($pos <= 3) $throttle_status = "danger";
				}
			}
		}
	}

	return array(
		'throttle_status' => $throttle_status,
		'throttle' => $throttle
	);
}

function getHTTPResponseCodeString($responseCode)
{
	$httpStatusCodes = [
		// 1xx Informational
		100 => 'Continue',
		101 => 'Switching Protocols',
		102 => 'Processing',
		103 => 'Early Hints',

		// 2xx Success
		200 => 'OK',
		201 => 'Created',
		202 => 'Accepted',
		203 => 'Non-Authoritative Information',
		204 => 'No Content',
		205 => 'Reset Content',
		206 => 'Partial Content',
		207 => 'Multi-Status',
		208 => 'Already Reported',
		226 => 'IM Used',

		// 3xx Redirection
		300 => 'Multiple Choices',
		301 => 'Moved Permanently',
		302 => 'Found',
		303 => 'See Other',
		304 => 'Not Modified',
		305 => 'Use Proxy',
		307 => 'Temporary Redirect',
		308 => 'Permanent Redirect',

		// 4xx Client Errors
		400 => 'Bad Request',
		401 => 'Unauthorized',
		402 => 'Payment Required',
		403 => 'Forbidden',
		404 => 'Not Found',
		405 => 'Method Not Allowed',
		406 => 'Not Acceptable',
		407 => 'Proxy Authentication Required',
		408 => 'Request Timeout',
		409 => 'Conflict',
		410 => 'Gone',
		411 => 'Length Required',
		412 => 'Precondition Failed',
		413 => 'Payload Too Large',
		414 => 'URI Too Long',
		415 => 'Unsupported Media Type',
		416 => 'Range Not Satisfiable',
		417 => 'Expectation Failed',
		418 => 'I\'m a teapot',
		421 => 'Misdirected Request',
		422 => 'Unprocessable Entity',
		423 => 'Locked',
		424 => 'Failed Dependency',
		425 => 'Too Early',
		426 => 'Upgrade Required',
		428 => 'Precondition Required',
		429 => 'Too Many Requests',
		431 => 'Request Header Fields Too Large',
		451 => 'Unavailable For Legal Reasons',

		// 5xx Server Errors
		500 => 'Internal Server Error',
		501 => 'Not Implemented',
		502 => 'Bad Gateway',
		503 => 'Service Unavailable',
		504 => 'Gateway Timeout',
		505 => 'HTTP Version Not Supported',
		506 => 'Variant Also Negotiates',
		507 => 'Insufficient Storage',
		508 => 'Loop Detected',
		510 => 'Not Extended',
		511 => 'Network Authentication Required',
	];

    if (array_key_exists($responseCode, $httpStatusCodes)) {
        $result = "HTTP/1.1 $responseCode {$httpStatusCodes[$responseCode]}";
    } else {
        $result = "HTTP/1.1 500 Internal Server Error";
    }
	return $result;
}


/**
 * Determine if the current HTTP request should be treated as an AJAX/API call.
 *
 * Heuristics used (in order):
 *  1) X-Requested-With header set to "XMLHttpRequest" (classic jQuery convention)
 *  2) Accept header indicates JSON is acceptable (typical for API/fetch clients)
 *  3) Explicit query/body flag `ajax=1` (manual override/fallback)
 *
 * @return bool True if the request should be considered AJAX-like; otherwise false.
 */
function is_ajax_request(): bool
{
    // 1) jQuery and some libraries send this header automatically.
    if (
        !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest'
    ) {
        return true;
    }

    // 2) If the client explicitly accepts JSON, we treat it as an API/AJAX intent.
    //    Using stripos(...) !== false so it's case-insensitive and matches anywhere.
    if (
        !empty($_SERVER['HTTP_ACCEPT']) &&
        stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false
    ) {
        return true;
    }

    // 3) Manual override: allow callers to force AJAX handling by passing ajax=1.
    //    Works for both GET and POST because we check $_REQUEST.
    if (isset($_REQUEST['ajax']) && $_REQUEST['ajax'] === '1') {
        return true;
    }

    // None of the heuristics matched; treat as a normal (non-AJAX) request.
    return false;
}

/**
 * Redirect helper that is "AJAX-aware".
 *
 * Behavior:
 * - Normal browser request: send a 302 Location redirect.
 * - AJAX-like request (per is_ajax_request()):
 *     a) If $useJsonForAjax === true: return HTTP 200 JSON {redirect, message}.
 *     b) Else: return custom HTTP status 278 with Location header (clients can act on it).
 *
 * If a flash message is provided, it is stored in session for retrieval after navigation.
 *
 * @param string      $url             Absolute or relative URL to redirect to.
 * @param string|null $flashMessage    Optional flash message to store in session.
 * @param bool        $useJsonForAjax  If true, respond with JSON payload for AJAX calls; otherwise use 278 + Location.
 * @return void
 */
function redirect(string $url, ?string $flashMessage = null, bool $useJsonForAjax = false): void
{
    // Stash an optional flash message so the next page can display it.
    if ($flashMessage) {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            @session_start(); // Suppress notice if headers already started; adjust to your logging policy.
        }
        $_SESSION['flash'] = $flashMessage;
    }

    // AJAX-aware branch
    if (is_ajax_request()) {
        if ($useJsonForAjax) {
            // JSON mode: clients parse and redirect themselves.
            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'redirect' => $url,
                'message'  => $flashMessage,
            ]);
        } else {
            // Header mode: emit a Location header with a non-standard status so browsers do NOT auto-follow in XHR.
            header('Location: ' . $url);
            http_response_code(278); // Custom code; client-side JS should check for this and redirect.
        }
        exit; // Always stop execution after emitting a redirect response.
    }

    // Standard browser redirect (non-AJAX): 302 Found
    header('Location: ' . $url, true, 302);
    exit;
}


/** Is the user logged in? */
function is_logged_in(): bool {
    return !empty($_SESSION['auth']) && $_SESSION['auth'] === true;
}


function useLogin() {
	global $useLogin;

	$csrf_token = '';
	if ($useLogin) {
		if (session_status() === PHP_SESSION_NONE) {
			session_start();
		}
		if (empty($_SESSION['csrf_token'])) {
			if (function_exists('mcrypt_create_iv')) {
				$_SESSION['csrf_token'] = bin2hex(mcrypt_create_iv(32, MCRYPT_DEV_URANDOM));
			} else {
				$_SESSION['csrf_token'] = bin2hex(openssl_random_pseudo_bytes(32));
			}
		}
		$csrf_token = $_SESSION['csrf_token'];
	}
	return $csrf_token;
}

?>
