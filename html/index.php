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

// Optional services, set to true to enable.
define('DHCP_ENABLED', true);
define('APD_ENABLED', false);
define('RASPI_OPENVPN_ENABLED', false);
define('RASPI_TORPROXY_ENABLED', false);

if (DHCP_ENABLED) {
	define('RASPI_DNSMASQ_CONFIG', '/etc/dnsmasq.conf');
	define('RASPI_DNSMASQ_LEASES', '/var/lib/misc/dnsmasq.leases');
} else {
	function DisplayDHCPConfig() {}
}
if (APD_ENABLED) {
	define('RASPI_HOSTAPD_CONFIG', '/etc/hostapd/hostapd.conf');
	define('RASPI_HOSTAPD_CTRL_INTERFACE', '/var/run/hostapd');
} else {
	function DisplayHostAPDConfig() {}
}
if (RASPI_OPENVPN_ENABLED || RASPI_TORPROXY_ENABLED) {
	include_once('includes/torAndVPN.php');
	define('RASPI_OPENVPN_CLIENT_CONFIG', '/etc/openvpn/client.conf');
	define('RASPI_OPENVPN_SERVER_CONFIG', '/etc/openvpn/server.conf');
	define('RASPI_TORPROXY_CONFIG', '/etc/tor/torrc');
} else {
	function SaveTORAndVPNConfig() {}
	function DisplayOpenVPNConfig() {}
	function DisplayTorProxyConfig() {}
}

$output = $return = 0;
if (isset($_POST['page']))
	$page = $_POST['page'];
else if (isset($_GET['page']))
	$page = $_GET['page'];
else
	$page = "";
if (isset($_GET['day']))
	$day = " - " . $_GET['day'];
else
	$day = "";

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
?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="Web User Interface (WebUI) for Allsky">
	<meta name="author" content="Thomas Jacquin">

<?php	// Give each page its own <title> so they are easy to distinguish in the browser.
	switch ($page) {
		case "WLAN_info":			$Title = "WLAN Dashboard";		break;
		case "LAN_info":			$Title = "LAN Dashboard";		break;
		case "configuration":		$Title = "Allsky Settings";		break;
		case "wifi":				$Title = "Configure Wi-Fi";		break;
		case "dhcp_conf":			$Title = "Configure DHCP";		break;
		case "hostapd_conf":		$Title = "Configure Hotspot";	break;
		case "openvpn_conf":		$Title = "Configure OpenVPN";	break;
		case "torproxy_conf":		$Title = "Configure TOR proxy";	break;
		case "auth_conf":			$Title = "Change password";		break;
		case "system":				$Title = "System";				break;
		case "list_days":			$Title = "Images";				break;
		case "list_images":			$Title = "Images$day";			break;
		case "list_videos":			$Title = "Timelapse$day";		break;
		case "list_keograms":		$Title = "Keogram$day";			break;
		case "list_startrails":		$Title = "Startrails$day";		break;
		case "editor":				$Title = "Editor";				break;
		case "overlay":				$Title = "Overlay Editor";		break;
		case "module":				$Title = "Module Manager";		break;
		case "live_view":			$Title = "Liveview";			break;
		case "support": 			$Title = "Getting Support";		break;
		default:					$Title = "Allsky WebUI";		break;
	}
?>
	</script>	<!-- allows <a external="true" ...> -->
	<script src="documentation/js/documentation.js" type="application/javascript"></script>

	<title><?php echo "$Title - WebUI"; ?></title>

	<!-- Bootstrap Core CSS -->
	<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">

	<!-- MetisMenu CSS -->
	<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">

	<!-- Custom CSS -->
	<link href="documentation/css/sb-admin-2.css" rel="stylesheet">

	<!-- Font Awesome -->
	<script defer src="documentation/js/all.min.js"></script>

	<!-- Custom CSS -->
	<link href="documentation/css/custom.css" rel="stylesheet">

	<link rel="shortcut icon" type="image/png" href="documentation/img/allsky-favicon.png">

	<!-- RaspAP JavaScript -->
	<script src="documentation/js/functions.js"></script>

	<!-- jQuery -->
	<script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>

	<!-- Bootstrap Core JavaScript -->
	<script src="documentation/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>

	<!-- Metis Menu Plugin JavaScript -->
	<script src="documentation/bower_components/metisMenu/dist/metisMenu.min.js"></script>

	<script src="js/bigscreen.min.js"></script>

	<script type="text/javascript">
		// Inititalize theme to light
		if (!localStorage.getItem("theme")) {
			localStorage.setItem("theme", "light")
		}

	</script>

	<!-- Custom Theme JavaScript -->
	<script src="documentation/js/sb-admin-2.js"></script>

	<!-- Code Mirror editor -->
<?php if ($page === "editor") { ?>
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

	<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
	<script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
	<script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<?php } ?>
</head>
<body>
<div id="wrapper">
	<!-- Navigation -->
	<nav class="navbar navbar-default navbar-static-top" role="navigation" style="margin-bottom: 0">
		<div class="navbar-header">
			<button type="button" class="navbar-toggle as-nav-toggle" data-toggle="collapse" data-target=".navbar-collapse">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</button>
			<div class="navbar-brand valign-center">
				<a id="index" class="navbar-brand valign-center" href="index.php">
					<img src="documentation/img/allsky-logo.png" title="Allsky logo">
					<div class="navbar-title">Web User Interface (WebUI)</div>
				</a>
				<div class="version-title version-title-color">
					<span class="nowrap">Version: <?php echo ALLSKY_VERSION; ?></span>
					&nbsp; &nbsp;
<?php if ($useLocalWebsite) {
					echo "<span class='nowrap'>";
					echo "<a external='true' class='version-title-color' href='allsky/index.php'>";
					echo "Local Website</a></span>";
} ?>
					&nbsp; &nbsp;
<?php if ($useRemoteWebsite) {
					echo "<span class='nowrap'>";
					echo "<a external='true' class='version-title-color' href='$remoteWebsiteURL'>";
					echo "Remote Website $remoteWebsiteVersion</a></span>";
} ?>
				</div>
		</div> <!-- /.navbar-header -->

		<!-- Navigation.  Add "id" to any page that needs to be refreshed. -->
		<div class="navbar-default sidebar" role="navigation">
			<div class="sidebar-nav navbar-collapse">
				<ul class="nav" id="side-menu">
					<li>
						<a id="live_view" href="index.php?page=live_view"><i class="fa fa-eye fa-fw"></i> Live View</a>
					</li>
					<li>
						<a id="list_days" href="index.php?page=list_days"><i class="fa fa-image fa-fw"></i> Images</a>
					</li>
					<li>
						<a id="configuration" href="index.php?page=configuration"><i class="fa fa-camera fa-fw"></i> Allsky Settings</a>
					</li>
					<li>
						<a id="editor" href="index.php?page=editor"><i class="fa fa-code fa-fw"></i> Editor</a>
					</li>
					<li>
						<a id="overlay" href="index.php?page=overlay"><i class="fa fa-edit fa-fw"></i> Overlay Editor</a>
					</li>
					<li>
						<a id="module" href="index.php?page=module"><i class="fa fa-bars fa-fw"></i> Module Manager</a>
					</li>
					<li>
						<a id="LAN" href="index.php?page=LAN_info"><i class="fa fa-network-wired fa-fw"></i> <b>LAN</b> Dashboard</a>
					</li>
					<li>
						<a id="WLAN" href="index.php?page=WLAN_info"><i class="fa fa-tachometer-alt fa-fw"></i> <b>WLAN</b> Dashboard</a>
					</li>
					<li>
						<a id="wifi" href="index.php?page=wifi"><i class="fa fa-wifi fa-fw"></i> Configure Wifi</a>
					</li>
					<?php if (DHCP_ENABLED) : ?>
						<li>
							<a id="vpn" href="index.php?page=dhcp_conf"><i class="fa fa-exchange fa-fw"></i> Configure DHCP</a>
						</li>
					<?php endif; ?>
					<?php if (APD_ENABLED) : ?>
						<li>
							<a id="vpn" href="index.php?page=hostapd_conf"><i class="fa fa-dot-circle fa-fw"></i> Configure Hotspot</a>
						</li>
					<?php endif; ?>
					<?php if (RASPI_OPENVPN_ENABLED) : ?>
						<li>
							<a id="vpn" href="index.php?page=openvpn_conf"><i class="fa fa-lock fa-fw"></i> Configure OpenVPN</a>
						</li>
					<?php endif; ?>
					<?php if (RASPI_TORPROXY_ENABLED) : ?>
						<li>
							<a id="tor" href="index.php?page=torproxy_conf"><i class="fa fa-eye-slash fa-fw"></i> Configure TOR proxy</a>
						</li>
					<?php endif; ?>
					<li>
						<a id="auth_conf" href="index.php?page=auth_conf"><i class="fa fa-lock fa-fw"></i> Change Password</a>
					</li>
					<li>
						<a id="system" href="index.php?page=system"><i class="fa fa-cube fa-fw"></i> System</a>
					</li>
					<li>
						<a external="true" href="/documentation"><i class="fa fa-book fa-fw"></i> Allsky Documentation </a>
					</li>
					<li>
						<a href="index.php?page=support"><i class="fa fa-question fa-fw"></i> Getting Support</a>
					</li>                    
					<li>
						<span onclick="switchTheme()"><i class="fa fa-moon fa-fw"></i> Light/Dark mode</span>
					</li>

				</ul>
			</div><!-- /.navbar-collapse -->
		</div><!-- /.navbar-default -->
	</nav>

	<div id="page-wrapper">
		<div class="row right-panel">
			<div class="col-lg-12">
				<?php
				check_if_configured($page, "main");	// It calls addMessage() on error.

				if (isset($_POST['clear'])) {
					$t = @filemtime(ALLSKY_MESSAGES);
					// if it fails it's probably because something else deleted the file,
					// in which case we don't care.
					if ($t != false) {
						$newT = getVariableOrDefault($_POST, "filetime", 0);
						if ($t == $newT) {
							exec("sudo rm -f " . ALLSKY_MESSAGES, $result, $retcode);
							if ($retcode !== 0) {
								$status->addMessage("Unable to clear messages: " . $result[0], 'danger');
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
					echo "<div class='row'>"; echo "<div class='system-message'>";
						echo "<div class='title'>System Messages</div>";
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
									$m1 = "<br><a href='/execute.php?cmd=" . urlencode($id) . "'";
									$m1 .= " class='executeAction' title='Click to perform action' target='_actions'>";
									$message .= "${m1}${cmd_txt}</a>";
								}

								if ($count == 1)
									$message .= " &nbsp; ($date)";
								else
									$message .= " &nbsp; ($count occurrences, last on $date)";
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
						echo "<br><div class='message-button'>";
							$ts = time();
							echo "<form action='$ME?_ts=$ts' method='POST'>";
							echo "<input type='hidden' name='page' value='$page'>";
							echo "<input type='hidden' name='clear' value='true'>";
							$t = @filemtime(ALLSKY_MESSAGES);
							echo "<input type='hidden' name='filetime' value='$t'>";
							echo "<input type='submit' class='btn btn-primary' value='Clear messages' />";
							echo "</form>";
						echo "</div>";
					echo "</div>"; echo "</div>";// /.system-message and /.row
				}

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
					case "hostapd_conf":
						include_once('includes/hostapd.php');
						DisplayHostAPDConfig();
						break;
					case "openvpn_conf":
						include_once('includes/torAndVPN.php');
						DisplayTorProxyConfig();
						DisplayOpenVPNConfig();
						break;
					case "torproxy_conf":
						include_once('includes/torAndVPN.php');
						DisplayTorProxyConfig();
						break;
					case "save_hostapd_conf":
						SaveTORAndVPNConfig();
						break;
					case "auth_conf":
						include_once('includes/admin.php');
						DisplayAuthConfig($adminUser, $adminPassword);
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
                    case "support":
						include_once('includes/support.php');
						break;

					case "live_view":
					default:
						include_once('includes/liveview.php');
						DisplayLiveView($image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe);
				}
				?>
			</div>
		</div>
	</div><!-- /#page-wrapper -->
</div><!-- /#wrapper -->

<script type="text/javascript">
	$("body").attr("class", localStorage.getItem("theme"));

	function switchTheme() {
		if (localStorage.getItem("theme") === "light") {
			localStorage.setItem("theme", "dark");
		} else {
			localStorage.setItem("theme", "light");
		}
		$("body").attr("class", localStorage.getItem("theme"));
	}

	$("#live_container").click(function () {
			if (BigScreen.enabled) {
				BigScreen.toggle(this, null, null, null);
			} else {
				console.log("Not Supported");
			}
		});

	// Add timestamps to href's that need it.
	function addTimestamp(id) {
		var x = document.getElementById(id);
		if (! x) console.log("No id for " + id);
		else x.href += "&_ts=" + new Date().getTime();
	}
	addTimestamp("live_view");
	addTimestamp("list_days");
	addTimestamp("configuration");
	addTimestamp("editor");
	addTimestamp("overlay");
	addTimestamp("module");
	addTimestamp("LAN");
	addTimestamp("WLAN");
	addTimestamp("wifi");
	addTimestamp("auth_conf");
	addTimestamp("system");
</script>
</body>
</html>
<script> includeHTML(); </script>
