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

// TODO: Implement
$useMeteors = false;

// functions.php sets a bunch of constants and variables.
include_once('includes/functions.php');
initialize_variables();		// sets some variables
$csrf_token = useLogin();
$page = getVariableOrDefault($_REQUEST, 'page', "live_view");
include_once('includes/authenticate.php');
include_once('includes/status_messages.php');
$status = new StatusMessages();

// TODO in major release after v2025.xx.xx:
// We want to remove the "DHCP" page from Allsky but aren't sure if anyone's using it.
// To be save, leave all the DHCP code but don't display the link to the page.
// If no one complains we can remove everything DHCP related.
define('DHCP_ENABLED', false);


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

// What size Font Awesome icon to use on "list_days" page?
$fa_size = "2x";	// "lg" or "2x"
if ($fa_size == "lg") {
	$fa_size_px = 22;	// the rough width of the font awesome icon
} else {
	$fa_size_px = 35;
}

$pageInfo = [
	"login" => [
		"title" => "Login",
		"icon" => "fa fa-right-to-bracketfa-fw"
	],	
	"live_view" => [
		"title" => "Live View",
		"icon" => "fa fa-eye fa-fw",
	],
	"list_days" => [
		"title" => "Images",
		"icon" => "fa fa-image fa-fw",
	],
	"list_images" => [
		"title" => "Images",
		"icon" => "",
	],
	"list_videos" => [
		"title" => "Timelapse",
		"icon" => "fa fa-video fa-{$fa_size} fa-fw",
		"AllTitle" => "All Timelapse (CAN BE SLOW TO LOAD)",
	],
	"list_keograms" => [
		"title" => "Keogram",
		"icon" => "fa fa-barcode fa-{$fa_size} fa-fw",
		"AllTitle" => "All Keograms",
	],
	"list_startrails" => [
		"title" => "Startrails",
		"icon" => "fa fa-star fa-{$fa_size} fa-fw",
		"AllTitle" => "All Startrails",
	],
	"list_meteors" => [
		"title" => "Meteors",
		"icon" => "fa fa-meteor fa-{$fa_size} fa-fw",
		"AllTitle" => "All Meteors",
	],
	"configuration" => [
		"title" => "Allsky Settings",
		"icon" => "fa fa-camera fa-fw",
	],
	"editor" => [
		"title" => "Editor",
		"icon" => "fa fa-code fa-fw",
	],
	"overlay" => [
		"title" => "Overlay Editor",
		"icon" => "fa fa-edit fa-fw",
	],
	"module" => [
		"title" => "Module Manager",
		"icon" => "fa fa-bars fa-fw",
	],
	"charts" => [
		"title" => "Chart Manager",
		"icon" => "fa-solid fa-chart-line",
	],
	"LAN_info" => [
		"title" => "<b>LAN</b> Dashboard",
		"icon" => "fa fa-network-wired fa-fw",
	],
	"WLAN_info" => [
		"title" => "<b>WLAN</b> Dashboard",
		"icon" => "fa fa-tachometer-alt fa-fw",
	],
	"wifi" => [
		"title" => "Configure Wi-Fi",
		"icon" => "fa fa-wifi fa-fw",
	],
	"dhcp_conf" => [
		"title" => "Configure DHCP",
		"icon" => "fa fa-exchange fa-fw",
	],
	"system" => [
		"title" => "System",
		"icon" => "fa fa-cube fa-fw",
	],
	"auth_conf" => [
		"title" => "Change Password",
		"icon" => "fa fa-lock fa-fw",
		"headerTitle" => "Update WebUI User / Password",
	],
	"support" => [
		"title" => "Getting Support",
		"icon" => "fa fa-question fa-fw",
	],
	"check_allsky" => [
		"title" => "Check Allsky",
		"icon" => "fa fa-check fa-fw",
		"headerTitle" => "Check Allsky Settings For Issues",
	],
	"startrails_settings" => [
		"title" => "Startrails Settings",
		"icon" => "fa fa-star fa-fw",
		"headerTitle" => "Help Determine Startrails Settings",
	],
	"stretch_settings" => [
		"title" => "Image Stretch Settings",
		"icon" => "fa fa-arrows-left-right fa-fw",
		"headerTitle" => "Help Determine Image Stretch Settings",
	],
	"timelapse_settings" => [
		"title" => "Timelapse Settings",
		"icon" => "fa fa-video fa-fw",
		"headerTitle" => "Help Determine Timelapse Settings",
	],
	"bad_images_settings" => [
		"title" => "Bad Images",
		"icon" => "fa fa-image fa-fw",
		"headerTitle" => "Help Determine Bad Images Settings",
	],
	"constellation_overlay" => [
		"title" => "Constellation Overlay",
		"icon" => "fa allsky-constellation fa-fw",
		"headerTitle" => "Help Configure Constellation Overlay",
	],
	"documentation" => [
		"title" => "Allsky Documentation",
		"icon" => "fa fa-book fa-fw",
		"href" => "/documentation' external='true",
	],
	"mini_timelapse" => [
		"title" => "View Mini-Timelapse",
		"icon" => "fa fa-file-video fa-fw",
		"href" => ALLSKY_MINITIMELAPSE_URL . "' external='true'",
	],
	"notFound" => [
		"headerTitle" => "Unknown page - contact Allsky support",
		"title" => "Unknown page",
		"icon" => "",
		"href" => "",
	],
];

function getPageTitle($p, $day) {
	global $pageInfo;

	$t = getVariableOrDefault($pageInfo, $p, null);
	if ($t === null) {
		return null;
	}
	$title = $t['title'] ?? "Allsky";

	if ($day !== "") $title .= $day;

	return str_replace("<b>", "", str_replace("</b>", "", $title));
}
function getPageHeaderTitle($p) {
	global $pageInfo;
	global $pageTitle;

	$t = getVariableOrDefault($pageInfo, $p, null);
	if ($t === null) {
		return null;
	}
	return $t['headerTitle'] ?? getPageTitle($p, "");
}
function getPageIcon($p) {
	global $pageInfo;

	return $pageInfo[$p]['icon'] ?? "";
}

// Insert just an "<a href=''..>" with an icon.
function insertHref($p, $day, $displayTitle=false, $iconImage="") {
	global $pageInfo;

	$t = getVariableOrDefault($pageInfo, $p, null);
	if ($t === null) {
		$p = "notFound";
		$t = getVariableOrDefault($pageInfo, $p, null);
	}

	$title = getPageHeaderTitle($p, "");
	if ($day == "All") {
		$AllTitle = getVariableOrDefault($t, "AllTitle", null);
		if ($AllTitle !== null)
			$title = $AllTitle;
	}
	$href = getVariableOrDefault($t, "href", "index.php?page=$p");
	if ($day !== "") $href .= "&day=$day";
	if ($iconImage === "") {
		$icon = getPageIcon($p);
	} else {
		$icon = $iconImage;
	}
	if ($icon === "") {
		echo "<span style='color: red' title='$title'>???</span>";
	} else {
		echo "<a id='$p' href='$href' title='$title'>";
		if ($iconImage === "") {
			echo "<i class='$icon'></i>";
		} else {
			echo $iconImage;
		}
		if ($displayTitle) echo " $title";
		echo "</a>";
	}
}

function insertMenuItem($p, $day, $type="", $href_only=false) {
	global $pageInfo;

	$t = getVariableOrDefault($pageInfo, $p, null);
	if ($t === null) {
		$p = "notFound";
		$t = getVariableOrDefault($pageInfo, $p, null);
	}

	$title = getPageTitle($p, $day);
	$icon = getPageIcon($p);
	$href = getVariableOrDefault($t, "href", "index.php?page=$p");

	echo "<li>";
	echo "<a id='$p' href='$href'><i class='$icon'></i>";
	if ($type !== "dropdown") echo "<span class='menu-text'>";
	echo " $title";
	if ($type !== "dropdown") echo "</span>";
	echo "</a>";
	echo "</li>\n";
}

function insertPage($p) {
	global $image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe;

	switch ($p) {		
		case "list_days":
			include_once("includes/days.php");
			ListDays();
			break;
		case "list_images":
			include_once("includes/images.php");
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
		case "list_meteors":
			// directory, file name prefix, formal name, type of file
			ListFileType("meteors/", "meteors", "Meteors", "picture");
			break;
		case "configuration":
			include_once("includes/allskySettings.php");
			DisplayAllskyConfig();
			break;
		case "editor":
			include_once("includes/$p.php");
			DisplayEditor();
			break;
		case "overlay":
			include_once("includes/$p.php");
			DisplayOverlay($image_name);
			break;
		case "module":
			include_once("includes/$p.php");
			DisplayModule();
			break;
		case "charts":
			include_once("includes/$p.php");
			DisplayCharts();
			break;
		case "LAN_info":
			include_once("includes/dashboard_LAN.php");
			DisplayDashboard_LAN();
			break;
		case "WLAN_info":
			include_once("includes/dashboard_WLAN.php");
			DisplayDashboard_WLAN();
			break;
		case "wifi":
			include_once("includes/configureWiFi.php");
			DisplayWPAConfig();
			break;
		case "dhcp_conf":
			include_once("includes/dhcp.php");
			DisplayDHCPConfig();
			break;
		case "system":
			include_once("includes/$p.php");
			DisplaySystem();
			break;
		case "auth_conf":
			include_once("includes/admin.php");
			break;
		case "support":
			include_once("includes/$p.php");
			break;
		case "check_allsky":
			include_once("helpers/allsky_config.php");
			runAllskyConfig("check_allsky", "--fromWebUI");
			break;
		case "startrails_settings":
			include_once("helpers/$p.php");
			startrailsSettings();
			break;
		case "stretch_settings":
			include_once("helpers/$p.php");
			stretchSettings();
			break;
		case "timelapse_settings":
			include_once("helpers/$p.php");
			// TODO: add function name						
			break;
		case "constellation_overlay":
			include_once("helpers/$p.php");
			timelapseSettings();
			break;
		case "bad_images_settings":
			include_once("helpers/$p.php");
			// TODO: add function name 
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
			$cmd .= " --no-date --type success --msg '{$msg}'";
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

function displayStatusMessages($p) {
	global $status, $ME;

	check_if_configured($p, "main");	// It calls addMessage() on error.

	if (isset($_POST['clear'])) {
		$t = @filemtime(ALLSKY_MESSAGES);
		// if it fails it's probably because something else deleted the file,
		// in which case we don't care.
		if ($t != false) {
			$newT = getVariableOrDefault($_POST, "filetime", 0);
			if ($t == $newT) {
				$cmd = "sudo rm -f " . ALLSKY_MESSAGES;
				echo "<script>console.log(`Executing [$cmd]`);</script>";
				exec($cmd, $result, $retcode);
				if ($retcode !== 0) {
					if (count($result) > 0)
						$result = $result[0];
					else
						$result = "[unknown reason]";
					echo "<script>console.log(`[$cmd] failed: $result`);</script>";
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
						$message = "{$m1}{$message}{$m2}</a>";
					}

					if ($id !== "") {
						$m1 = "<br><a href='/execute.php?ID=" . urlencode($id) . "'";
						$m1 .= " class='executeAction' title='Click to perform action' target='_actions'>";
						$message .= "{$m1}{$cmd_txt}</a>";
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
				echo "<input type='hidden' name='page' value='$p'>";
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

function insertEditorCode($p) {

	if ($p === "editor") {
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

			<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=' . ALLSKY_VERSION . '"></script>
			<script src="/js/bootbox/bootbox.all.js?c=' . ALLSKY_VERSION . '"></script>
			<script src="/js/bootbox/bootbox.locales.min.js?c=' . ALLSKY_VERSION . '"></script>
		';
	}
}


$day = getVariableOrDefault($_REQUEST, 'day', "");	if ($day !== "") $day = " - $day";
$remoteWebsiteVersion = getRemoteWebsiteVersion();
$pageTitle = getPageTitle($page, $day);
$pageHeaderTitle = getPageHeaderTitle($page, $day);
$pageIcon = getPageIcon($page);
$allskyStatus = output_allsky_status();

if ($page=="login") {
		include_once("includes/login.php");
		DisplayLoginPage();
		die();
}
if ($page=="logout") {
	$_SESSION['auth'] = false;
  $_SESSION['user'] = "";
	redirect("index.php?page=login");
}
?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<title><?php echo "$pageTitle - WebUI"; ?></title>	
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="Web User Interface (WebUI) for Allsky">
		<meta name="author" content="Thomas Jacquin">
		<meta name="csrf-token" content="<?= htmlspecialchars($csrf_token, ENT_QUOTES) ?>">

		<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="shortcut icon" href="/favicon.ico" />
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
		<link rel="manifest" href="/site.webmanifest" />

		<script src="documentation/js/documentation.js?c=<?php echo ALLSKY_VERSION; ?>" type="application/javascript"></script>
		<link href="documentation/css/light.css?c=<?php echo ALLSKY_VERSION; ?>" rel="stylesheet">
		<link href="documentation/css/documentation.css?c=<?php echo ALLSKY_VERSION; ?>" rel="stylesheet">
		<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
		<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">
		<link href="documentation/css/sb-admin-2.css" rel="stylesheet">
		<link rel="stylesheet" href="allsky/font-awesome/css/all.min.css" type="text/css">
		<!-- OLD: <script defer src="documentation/js/all.min.js"></script> -->
		<link href="documentation/css/custom.css?c=<?php echo ALLSKY_VERSION; ?>" rel="stylesheet">
		<script src="documentation/js/functions.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
		<script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>
		<script src="documentation/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
		<script src="documentation/bower_components/metisMenu/dist/metisMenu.min.js"></script>
		<script src="js/bigscreen.min.js"></script>
		<script src="js/allsky.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
		<script src="documentation/js/sb-admin-2.js"></script>
		<link rel='stylesheet' href='/css/checkbox.css?c=<?php echo ALLSKY_VERSION; ?>' />

		<script>
			window.csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
		</script>

		<!-- Code Mirror editor -->
		<?php insertEditorCode($page); ?>

		<script> var allskyPage='<?php echo $page ?>';  </script>		
	</head>
	<body>

		<!-- Header -->
		<div class="header">
			<div class="navbar-brand valign-center">
					<img id="toggleNav" src="documentation/img/logo.png" title="Click to minimize/maximize menu bar">
				<div class="version-title version-title-color">
					<span id="allskyStatus"><?php echo $allskyStatus; ?></span>
					<?php insertVersions(); ?>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<div class="sidebar" id="sidebar">
			<ul class="nav nav-pills nav-stacked">
<?php
				insertMenuItem('live_view', "");
				insertMenuItem('list_days', "");
?>
				<li class="sidebar-dropdown has-flyout">
					<a href="index.php?page=configuration" class="submenu-toggle"><i class="fa-solid fa-gears"></i><span class="menu-text"> Settings</span></a>
					<ul class="dropdown-menu">
<?php
						insertMenuItem('configuration', "", "dropdown");
						insertMenuItem('editor', "", "dropdown");
?>
					</ul>
				</li>
<?php
				insertMenuItem('overlay', "");
				insertMenuItem('module', "");
				insertMenuItem('charts', "");
?>
				<li class="sidebar-dropdown has-flyout">
					<a href="#" class="submenu-toggle"><i class="fa-solid fa-network-wired"></i><span class="menu-text"> Networking</span></a>
					<ul class="dropdown-menu">
<?php
						insertMenuItem('LAN_info', "", "dropdown");
						insertMenuItem('WLAN_info', "", "dropdown");
						insertMenuItem('wifi', "", "dropdown");
if (DHCP_ENABLED) {
						insertMenuItem('dhcp_conf', "", "dropdown");
}
?>
					</ul>
				</li>
				<li class="sidebar-dropdown has-flyout">
					<a href="index.php?page=system" class="submenu-toggle"><i class="fa-brands fa-ubuntu"></i><span class="menu-text"> System</span></a>
					<ul class="dropdown-menu">
<?php
						insertMenuItem('system', "", "dropdown");
						insertMenuItem('auth_conf', "", "dropdown");
?>
					</ul>
				</li>
<?php
				insertMenuItem('support', "");
?>
				<li class="sidebar-dropdown has-flyout">
					<a href="#" class="submenu-toggle"><i class="fa-solid fa-hammer"></i><span class="menu-text"> Helper Tools</span></a>
					<ul class="dropdown-menu">
<?php
						insertMenuItem('check_allsky', "", "dropdown");
						insertMenuItem('startrails_settings', "", "dropdown");
						insertMenuItem('stretch_settings', "", "dropdown");
						insertMenuItem('timelapse_settings', "", "dropdown");
						// TODO: uncomment when scripts are created
						// insertMenuItem('bad_images_settings', "", "dropdown");
						// insertMenuItem('constellation_overlay', "", "dropdown");
?>
					</ul>
				</li>	
<?php
				insertMenuItem('documentation', "");
?>
				<li>
					<span id="as-switch-theme">
						<i class="fa fa-moon fa-fw"></i>
						<span class="menu-text"> Light/Dark mode</span>
					</span>	
				</li>
<?php
	if ($useLogin) {
?>
				<li>
					<a id="logout" href="index.php?page=logout">
						<i class="fa fa-right-from-bracket fa-fw"></i>
						<span class="menu-text"> Logout</span>
					</a>
				</li>
<?php
	}
?>
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
