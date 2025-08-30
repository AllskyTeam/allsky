<?php

/**
 * AllSky Web User Interface (WebUI)
 *
 * Enables use of simple web interface rather than SSH to control a ZWO camera on the Raspberry Pi.
 * Uses code from RaspAP by Lawrence Yau <sirlagz@gmail.com> and Bill Zimmerman <billzimmerman@gmail.com>
 *
 * @author     Lawrence Yau <sirlagz@gmail.comm>
 * @author     Bill Zimmerman <billzimmerman@gmail.com>
 * @author     Thomas Jacquin <jacquin.thomas@gmail.com>
 * @author     Eric Claeys (AstroEric) https://github.com/AllskyTeam
 * @author     Alex Greenland (alex-developer) https://github.com/AllskyTeam
 * @license    GNU General Public License, version 3 (GPL-3.0)
 * @version    0.0.1
 */

// Globals
$lastChangedName = "lastchanged";	// json setting name
$formReadonly = false;				// The WebUI isn't readonly
$ME = htmlspecialchars($_SERVER["PHP_SELF"]);

// functions.php sets a bunch of constants and variables.
// It needs to be at the top of this file since code below uses the items it sets.
include_once('includes/functions.php');
include_once('includes/status_messages.php');
$status = new StatusMessages();
initialize_variables();		// sets some variables

// Constants for configuration file paths.
// These are typical for default RPi installs. Modify if needed.
include_once('includes/authenticate.php');
define('RASPI_WPA_SUPPLICANT_CONFIG', '/etc/wpa_supplicant/wpa_supplicant.conf');
define('RASPI_WPA_CTRL_INTERFACE', '/var/run/wpa_supplicant');

define('DHCP_ENABLED', true);

if (DHCP_ENABLED) {
	define('RASPI_DNSMASQ_CONFIG', '/etc/dnsmasq.conf');
	define('RASPI_DNSMASQ_LEASES', '/var/lib/misc/dnsmasq.leases');
} else {
	function DisplayDHCPConfig() {}
}

function useLogin() {
	global $useLogin;

	$csrf_token = '';
	if ($useLogin) {
		session_start();
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

function getRemoteWebsiteVersion() {
	global $useRemoteWebsite, $status;

	// Get the version of the remote Allsky Website, if it exists.
	$remoteWebsiteVersion = "";
	if ($useRemoteWebsite) {
		$f = getRemoteWebsiteConfigFile(); 
		$errorMsg = "WARNING: ";
		$retMsg = "";
		$a_array = get_decoded_json_file($f, true, $errorMsg, $retMsg);
		if ($a_array === null) {
			$status->addMessage($retMsg, 'warning');
		} else {
			$c = getVariableOrDefault($a_array, 'config', '');
			if ($c !== "") {
				$remoteWebsiteVersion = getVariableOrDefault($c, 'AllskyVersion', null);
				if ($remoteWebsiteVersion === null) {
					$remoteWebsiteVersion = '<span class="errorMsg">[version unknown]</span>';
				} else if ($remoteWebsiteVersion == ALLSKY_VERSION) {
					$remoteWebsiteVersion = "";		// don't display if same version as Allsky
				} else {
					$remoteWebsiteVersion = "&nbsp; (version $remoteWebsiteVersion)";
				}
			}
		}
	}

	return $remoteWebsiteVersion;

}

function getPageTitle($page, $day) {
	$titles = [
		"WLAN_info"          => "WLAN Dashboard",
		"LAN_info"           => "LAN Dashboard",
		"configuration"      => "Allsky Settings",
		"wifi"               => "Configure Wi-Fi",
		"dhcp_conf"          => "Configure DHCP",
		"auth_conf"          => "Change Password",
		"system"             => "System",
		"list_days"          => "Images",
		"list_images"        => "Images$day",
		"list_videos"        => "Timelapse$day",
		"list_keograms"      => "Keogram$day",
		"list_startrails"    => "Startrails$day",
		"editor"             => "Editor",
		"overlay"            => "Overlay Editor",
		"module"             => "Module Manager",
		"live_view"          => "Live View",
		"support"            => "Getting Support",
		"startrails_settings"=> "Startrails Settings",
		"stretch_settings"   => "Image Stretch Settings"
	];

	$pageTitle = $titles[$page] ?? "Allsky WebUI";
	return $pageTitle;
}

function insertPage($page) {
	global $image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe;

	switch ($page) {
		case "WLAN_info":
			include_once('includes/dashboard_WLAN.php');
			DisplayDashboard_WLAN();
			break;
		case "LAN_info":
			include_once('includes/dashboard_LAN.php');
			DisplayDashboard_LAN();
			break;
		case "configuration":
			include_once('includes/allskySettings.php');
			DisplayAllskyConfig();
			break;
		case "wifi":
			include_once('includes/configureWiFi.php');
			DisplayWPAConfig();
			break;
		case "dhcp_conf":
			include_once('includes/dhcp.php');
			DisplayDHCPConfig();
			break;
		case "auth_conf":
			include_once('includes/admin.php');
			break;
		case "system":
			include_once('includes/system.php');
			DisplaySystem();
			break;
		case "list_days":
			include_once('includes/days.php');
			ListDays();
			break;
		case "list_images":
			include_once('includes/images.php');
			ListImages();
			break;
		case "list_videos":
			// directory, file name prefix, formal name, type of file
			ListFileType("", "allsky", "Timelapse", "video");
			break;
		case "list_keograms":
			// directory, file name prefix, formal name, type of file
			ListFileType("keogram/", "keogram", "Keogram", "picture");
			break;
		case "list_startrails":
			// directory, file name prefix, formal name, type of file
			ListFileType("startrails/", "startrails", "Startrails", "picture");
			break;
		case "editor":
			include_once('includes/editor.php');
			DisplayEditor();
			break;
		case "overlay":
			include_once('includes/overlay.php');
			DisplayOverlay($image_name);
			break;
		case "module":
			include_once('includes/module.php');
			DisplayModule();
			break;
		case "startrails_settings":
			include_once("helpers/$page.php");
			startrailsSettings();
			break;
		case "timelapse_settings":
			include_once("helpers/$page.php");
			// TODO: add function name						
			break;
		case "constellation_overlay":
			include_once("helpers/$page.php");
			// TODO: add function name
			break;
		case "bad_images_settings":
			include_once("helpers/$page.php");
			// TODO: add function name 
			break;
		case "stretch_settings":
			include_once("helpers/$page.php");
			stretchSettings();
			break;
		case "support":
			include_once('includes/support.php');
			break;
		case "charts":
			include_once('includes/charts.php');
			DisplayCharts();
			break;
			
		case "live_view":
		default:
			include_once('includes/liveview.php');
			DisplayLiveView($image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe);
	}

}

function insertVersions() {
	global $useLocalWebsite, $useRemoteWebsite, $hostname, $remoteWebsiteURL, $remoteWebsiteVersion;

	$versionInfo = getNewestAllskyVersion($changed);
	if ($versionInfo !== null) {
		$newestVersion = $versionInfo['version'];
	} else {
		$newestVersion = null;
	}
	if ($newestVersion !== null && $newestVersion > ALLSKY_VERSION) {
		$note = getVariableOrDefault($versionInfo, "versionNote", "");
		$more = "title='New Version $newestVersion Available";
		if ($note !== "") {
			$more .= ", $note";
		}
		$more .= "' style='background-color: red; color: white;'";

		if ($changed) {
			$x = "<br>&nbsp; &nbsp;";
			$msg = "$x<strong>";
			$msg .= "A new release of Allsky is available: $newestVersion";
			$msg .= "</strong>";
			if ($note !== "") {
				$msg .= "$x$note";
			}
			$msg .= "<br><br>";
			$cmd = ALLSKY_SCRIPTS . "/addMessage.sh";
			$cmd .= " --no-date --type success --msg '${msg}'";
			runCommand($cmd, "", "");
		}
	} else {
		$more = "";
	}
	echo "<span class='nowrap'>";
		echo "<span $more>Version: " . ALLSKY_VERSION . "</span>";
		echo "&nbsp; on &nbsp;";
		echo "<span style='font-weight: bold'>$hostname</span>";
	echo "</span>";
	if ($useLocalWebsite) {
		echo "<br>";
		echo "<span class='nowrap'>";
		echo "<a external='true' class='version-title-color' href='allsky/index.php'>";
		echo "Local Website</a>";
		echo "</span>";
	}
	if ($useRemoteWebsite) {
		echo "&nbsp;&nbsp;&nbsp;&nbsp; ";
		echo "<span class='nowrap'>";
		echo "<a external='true' class='version-title-color' href='$remoteWebsiteURL'>";
		echo "Remote Website $remoteWebsiteVersion</a>";
		echo "</span>";
	}
}

function displayStatusMessages($page) {
	global $status, $ME;

	check_if_configured($page, "main");	// It calls addMessage() on error.

	if (isset($_POST['clear'])) {
		$t = @filemtime(ALLSKY_MESSAGES);
		// if it fails it's probably because something else deleted the file,
		// in which case we don't care.
		if ($t != false) {
			$newT = getVariableOrDefault($_POST, "filetime", 0);
			if ($t == $newT) {
				$cmd = "sudo rm -f " . ALLSKY_MESSAGES;
				echo "<script>console.log('Executing [$cmd]');</script>";
				exec($cmd, $result, $retcode);
				if ($retcode !== 0) {
					if (count($result) > 0)
						$result = $result[0];
					else
						$result = "[unknown reason]";
					echo "<script>console.log('[$cmd] failed: $result');</script>";
					$status->addMessage("Unable to clear messages: $result", 'danger');
					$status->showMessages();
				}
			} else {
				// If the messages changed after the user viewed the last page
				// and before they clicked the "Clear" button,
				// we'll have the old time in $filetime, but the timestamp of the file
				// won't match so we'll get here, and then display the messages below.
				$status->addMessage("System Messages changed.  New content is:", "warning");
			}
		}
	}
	clearstatcache();
	$size = @filesize(ALLSKY_MESSAGES);
	if ($size !== false && $size > 0) {
		$contents_array = file(ALLSKY_MESSAGES, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
?>
		<div class="panel panel-danger" id="system-messages">
			<div class="panel-heading">
				<i class="fa-solid fa-message"></i> System Messages
<!-- Closing the message(s) doesn't make them go away.
				<button type="button" class="close pull-right" aria-label="Close" id="closePanel">
					<span aria-hidden="true">&times;</span>
				</button>
-->
			</div>

			<div class="panel-body">
			<div class='row'><div class='system-message'>
<?php
			foreach ($contents_array as $line) {
				// Format: id, cmd_txt, level (i.e., CSS class), date, count, message [, url]
				//         0   1        2                        3     4      5          6
				$cmd = "";
				$message_array = explode("\t", $line);
				$message = getVariableOrDefault($message_array, 5, null);
				if ($message !== null) {
					$id = getVariableOrDefault($message_array, 0, "");
					$cmd_txt = getVariableOrDefault($message_array, 1, "");
					$level = $message_array[2];
					$date = $message_array[3];
					$count = $message_array[4];
					$url = getVariableOrDefault($message_array, 6, "");
					if ($url !== "") {
						$m1 = "<a href='$url' title='Click for more information' target='_messages'>";
						$m2 = "<i class='fa fa-external-link-alt fa-fw'></i>";
						$m2 = "<span class='externalSmall'>$m2</span>";
						$message = "${m1}${message}${m2}</a>";
					}

					if ($id !== "") {
						$m1 = "<br><a href='/execute.php?ID=" . urlencode($id) . "'";
						$m1 .= " class='executeAction' title='Click to perform action' target='_actions'>";
						$message .= "${m1}${cmd_txt}</a>";
					}

					if ($count == 1) {
						if ($date !== "")
							$message .= " &nbsp; ($date)";
					} else {
						$message .= " &nbsp; ($count occurrences";
						if ($date !== "")
							$message .= ", last on $date";
						$message .= ")";
					}
				} else {
					$level = "error";	// badly formed message
					$message = "INTERNAL ERROR: Poorly formatted message: $line";
				}
				$status->addMessage($message, $level);
				if ($cmd !== "") {
					$status->addMessage($cmd, $level);
				}
			}
			$status->showMessages();
			echo "<div class='message-button'>";
				$ts = time();
				echo "<form action='$ME?_ts=$ts' method='POST'>";
				echo "<input type='hidden' name='page' value='$page'>";
				echo "<input type='hidden' name='clear' value='true'>";
				$t = @filemtime(ALLSKY_MESSAGES);
				echo "<input type='hidden' name='filetime' value='$t'>";
				echo "<input type='submit' class='btn btn-primary btn-sm' value='Clear messages' />";
				echo "</form>";
			echo "</div>";
		echo "</div>"; echo "</div>";// /.system-message and /.row

		echo '</div></div>'; // panel 
	}

}

function insertEditorCode($page) {

	if ($page === "editor") {

		echo '
			<link rel="stylesheet" href="lib/codeMirror/codemirror.css">
			<link rel="stylesheet" href="lib/codeMirror/monokai.min.css">
			<link rel="stylesheet" href="lib/codeMirror/lint.css">
			<script type="text/javascript" src="lib/codeMirror/codemirror.js"> </script>
			<script type="text/javascript" src="lib/codeMirror/json.js"> </script>
			<script type="text/javascript" src="lib/codeMirror/jsonlint.js"> </script>
			<script type="text/javascript" src="lib/codeMirror/lint.js"> </script>
			<script type="text/javascript" src="lib/codeMirror/json-lint.js"> </script>

			<script src="lib/codeMirror/matchesonscrollbar.js"></script>
			<script src="lib/codeMirror/searchcursor.js"></script>
			<script src="lib/codeMirror/match-highlighter.js"></script>

			<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=' . ALLSKY_VERSION . '></script>
			<script src="/js/bootbox/bootbox.all.js?c=' . ALLSKY_VERSION . '"></script>
			<script src="/js/bootbox/bootbox.locales.min.js?c=' . ALLSKY_VERSION . '"></script>
		';

	}

}

$page = getVariableOrDefault($_REQUEST, 'page', "");
$day = getVariableOrDefault($_REQUEST, 'day', "");	if ($day !== "") $day = " - $day";
$csrf_token = useLogin();
$remoteWebsiteVersion = getRemoteWebsiteVersion();
$Title = getPageTitle($page, $day);
$allskyStatus = output_allsky_status();

?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<title><?php echo "$Title - WebUI"; ?></title>	
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="Web User Interface (WebUI) for Allsky">
		<meta name="author" content="Thomas Jacquin">

		<script src="documentation/js/documentation.js" type="application/javascript"></script>
		<link href="documentation/css/light.css" rel="stylesheet">
		<link href="documentation/css/documentation.css" rel="stylesheet">
		<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
		<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">
		<link href="documentation/css/sb-admin-2.css" rel="stylesheet">
		<script defer src="documentation/js/all.min.js"></script>
		<link href="documentation/css/custom.css" rel="stylesheet">
		<link rel="shortcut icon" type="image/png" href="documentation/img/allsky-favicon.png">
		<script src="documentation/js/functions.js"></script>
		<script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>
		<script src="documentation/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
		<script src="documentation/bower_components/metisMenu/dist/metisMenu.min.js"></script>
		<script src="js/bigscreen.min.js"></script>
		<script src="js/allsky.js"></script>
		<script src="documentation/js/sb-admin-2.js"></script>
		<link rel='stylesheet' href='/css/checkbox.css?c=<?php echo ALLSKY_VERSION; ?>' />

		<!-- Code Mirror editor -->
		<?php insertEditorCode($page); ?>

		<script> var allskyPage='<?php echo $page ?>';  </script>		
	</head>
	<body>

		<!-- Header -->
		<div class="header">
			<div class="navbar-brand valign-center">
				<button id="toggleNav" class="btn btn-default btn-xs" title="Toggle menu">
					<i class="fa-solid fa-bars"></i>
				</button>				
				<a id="index" class="navbar-brand valign-center" href="index.php">
					<img src="documentation/img/allsky-logo.png" title="Allsky logo">
					<div class="navbar-title nowrap">Web User Interface (WebUI)</div>
				</a>
				<div class="version-title version-title-color">
					<span id="allskyStatus"><?php echo $allskyStatus; ?></span>
					<?php insertVersions(); ?>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<div class="sidebar" id="sidebar">
			<ul class="nav nav-pills nav-stacked">
				<li>
					<a id="live_view" href="index.php?page=live_view"><i class="fa fa-eye fa-fw"></i><span class="menu-text"> Live View</span></a>
				</li>
				<li>
					<a id="list_days" href="index.php?page=list_days"><i class="fa fa-image fa-fw"></i><span class="menu-text"> Images</span></a>
				</li>
				<li class="sidebar-dropdown has-flyout">
					<a href="index.php?page=configuration" class="submenu-toggle"><i class="fa-solid fa-gears"></i><span class="menu-text"> Settings</span></a>
					<ul class="dropdown-menu">
						<li>
							<a id="configuration" href="index.php?page=configuration"><i class="fa fa-camera fa-fw"></i> Allsky Settings</a>
						</li>
						<li>
							<a id="editor" href="index.php?page=editor"><i class="fa fa-code fa-fw"></i> Editor</a>
						</li>
					</ul>
				</li>
				<li>
					<a id="overlay" href="index.php?page=overlay"><i class="fa fa-edit fa-fw"></i><span class="menu-text"> Overlay Editor</span></a>
				</li>
				<li>
					<a id="module" href="index.php?page=module"><i class="fa fa-bars fa-fw"></i><span class="menu-text"> Module Manager</span></a>
				</li>
				<li>
					<a id="charts" href="index.php?page=charts"><i class="fa-solid fa-chart-line"></i><span class="menu-text"> Charts</span></a>
				</li>
				<li class="sidebar-dropdown has-flyout">
					<a href="#" class="submenu-toggle"><i class="fa-solid fa-network-wired"></i><span class="menu-text"> Networking</span></a>
					<ul class="dropdown-menu">
						<li>
							<a id="LAN" href="index.php?page=LAN_info"><i class="fa fa-network-wired fa-fw"></i> <b>LAN</b> Dashboard</a>
						</li>
						<li>
							<a id="WLAN" href="index.php?page=WLAN_info"><i class="fa fa-tachometer-alt fa-fw"></i> <b>WLAN</b> Dashboard</a>
						</li>
						<li>
							<a id="wifi" href="index.php?page=wifi"><i class="fa fa-wifi fa-fw"></i> Configure Wi-Fi</a>
						</li>
						<li>
							<a id="vpn" href="index.php?page=dhcp_conf"><i class="fa fa-exchange fa-fw"></i> Configure DHCP</a>
						</li>
					</ul>
				</li>
				<li class="sidebar-dropdown has-flyout">
					<a href="index.php?page=system" class="submenu-toggle"><i class="fa-brands fa-ubuntu"></i><span class="menu-text"> System</span></a>
					<ul class="dropdown-menu">
						<li>
							<a id="system" href="index.php?page=system"><i class="fa fa-cube fa-fw"></i><span class="menu-text"> System</a>
						</li>
						<li>
							<a id="auth_conf" href="index.php?page=auth_conf"><i class="fa fa-lock fa-fw"></i><span class="menu-text"> Change Password</a>
						</li>
					</ul>
				</li>
				<li>
					<a href="index.php?page=support"><i class="fa fa-question fa-fw"></i><span class="menu-text"> Getting Support</span></a>
				</li>
				<li class="sidebar-dropdown has-flyout">
					<a href="#" class="submenu-toggle"><i class="fa-solid fa-hammer"></i><span class="menu-text"> Helper Tools</span></a>
					<ul class="dropdown-menu">
						<li>
							<a id="startrails_settings" href="index.php?page=startrails_settings" data-toggle="popover" data-placement="top" data-trigger="hover" title="Startrails Helper" data-content="Test multiple startrails settings."><i class="fa fa-star fa-fw"></i> Startrails</a>
						</li>
						<li>
							<a id="stretch_settings" href="index.php?page=stretch_settings"> <i class="fa fa-arrows-left-right fa-fw"></i> Image Stretch</a>
						</li>
						<!-- TODO: uncomment when scripts are created
						<li>
							<a id="timelapse_settings" href="helpers.php?page=timelapse_settings"> <i class="fa fa-play-circle fa-fw"></i> Timelapse</a>
						</li>
						<li>
							<a id="bad_images_settings" href="helpers.php?page=bad_images_settings"> <i class="fa fa-image fa-fw"></i> Bad Images</a>
						</li>
						<li>
							<a id="constellation_overlay" href="helpers.php?page=constellation_overlay"> <i class="fa allsky-constellation fa-fw"></i> Constellation Overlay</a>
						</li>
						-->
					</ul>
				</li>	
				<li>
					<a href="/documentation" external="true"><i class="fa fa-book fa-fw"></i><span class="menu-text"> Allsky Documentation</span></a>
				</li>
				<li>
					<span id="as-switch-theme">
						<i class="fa fa-moon fa-fw"></i>
						<span class="menu-text"> Light/Dark mode</span>
					</span>	
				</li>
			</ul>
		</div>

		<!-- Main content -->
		<div class="content">
			<?php
				displayStatusMessages($page);
				insertPage($page);
			?>
		</div>
	</body>
</html>
