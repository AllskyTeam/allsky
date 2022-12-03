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
 * @link       https://github.com/thomasjacquin/allsky-portal
 */

// functions.php sets a bunch of constants and variables.
// It needs to be at the top of this file since code below uses the items it sets.
include_once('includes/functions.php');
initialize_variables();		// sets some variables

// Constants for configuration file paths.
// These are typical for default RPi installs. Modify if needed.
define('RASPI_ADMIN_DETAILS', RASPI_CONFIG . '/raspap.auth');
define('RASPI_DNSMASQ_CONFIG', '/etc/dnsmasq.conf');
define('RASPI_DNSMASQ_LEASES', '/var/lib/misc/dnsmasq.leases');
define('RASPI_HOSTAPD_CONFIG', '/etc/hostapd/hostapd.conf');
define('RASPI_WPA_SUPPLICANT_CONFIG', '/etc/wpa_supplicant/wpa_supplicant.conf');
define('RASPI_HOSTAPD_CTRL_INTERFACE', '/var/run/hostapd');
define('RASPI_WPA_CTRL_INTERFACE', '/var/run/wpa_supplicant');
define('RASPI_OPENVPN_CLIENT_CONFIG', '/etc/openvpn/client.conf');
define('RASPI_OPENVPN_SERVER_CONFIG', '/etc/openvpn/server.conf');
define('RASPI_TORPROXY_CONFIG', '/etc/tor/torrc');

// Optional services, set to true to enable.
define('RASPI_OPENVPN_ENABLED', false);
define('RASPI_TORPROXY_ENABLED', false);

include_once('includes/raspap.php');
include_once('includes/dashboard_WLAN.php');
include_once('includes/dashboard_LAN.php');
include_once('includes/liveview.php');
include_once('includes/authenticate.php');
include_once('includes/admin.php');
include_once('includes/dhcp.php');
include_once('includes/hostapd.php');
include_once('includes/system.php');
include_once('includes/configureWiFi.php');
include_once('includes/allskySettings.php');
include_once('includes/days.php');
include_once('includes/images.php');
include_once('includes/editor.php');
include_once('includes/overlay.php');
include_once('includes/module.php');

$output = $return = 0;
if (isset($_GET['page']))
	$page = $_GET['page'];
else
	$page = "";

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

// Get the version of the Allsky Website on the Pi, if it exists.
// TODO: if a remote website exists, get it's version as well.
$websiteFile = ALLSKY_WEBSITE . "/version";
if (file_exists($websiteFile)) {
	$localWebsiteVersion = file_get_contents($websiteFile);
} else {
	$localWebsiteVersion = "";
}
// Ditto for a remote website
$remoteWebsiteVersion = "";
if (file_exists(ALLSKY_WEBSITE_REMOTE_CONFIG)) {
	$a_str = file_get_contents(ALLSKY_WEBSITE_REMOTE_CONFIG, true);
	$a_array = json_decode($a_str, true);
	$config = getVariableOrDefault($a_array, 'config', '');
	$remoteWebsiteVersion = getVariableOrDefault($config, 'AllskyWebsiteVersion', '<span class="errorMsg">[unknown]</span>');
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

	<title>AllSky WebUI</title>

	<!-- Bootstrap Core CSS -->
	<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">

	<!-- MetisMenu CSS -->
	<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">

	<!-- Timeline CSS -->
	<link href="documentation/css/timeline.css" rel="stylesheet">

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
		function getImage() {
			var img = $("<img />").attr('src', '<?php echo $image_name ?>?_ts=' + new Date().getTime())
				.attr("id", "current")
				.attr("class", "current")
				.css("width", "100%")
				.on('load', function () {
					if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
						console.log('broken image!');
						setTimeout(function () {
							getImage();
						}, 500);
					} else {
						$("#live_container").empty().append(img);
					}
				});
		}

		// Inititalize theme to light
		if (!localStorage.getItem("theme")) {
			localStorage.setItem("theme", "light")
		}

	</script>

	<!-- Custom Theme JavaScript -->
	<script src="documentation/js/sb-admin-2.js"></script>

	<!-- Code Mirror editor -->
	<link rel="stylesheet" href="lib/codeMirror/codemirror.css">
	<link rel="stylesheet" href="lib/codeMirror/monokai.min.css">
	<script type="text/javascript" src="lib/codeMirror/codemirror.js"> </script>
	<script type="text/javascript" src="lib/codeMirror/shell.js"> </script>
<?php if ($localWebsiteVersion !== "" || $remoteWebsiteVersion !== "") { ?>
	<script type="text/javascript" src="lib/codeMirror/json.js"> </script>
<?php } ?>
</head>
<body>

<div id="wrapper">
	<!-- Navigation -->
	<nav class="navbar navbar-default navbar-static-top" role="navigation" style="margin-bottom: 0">
		<div class="navbar-header">
			<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</button>
			<div class="navbar-brand valign-center">
				<a class="navbar-brand valign-center" href="index.php">
					<img src="documentation/img/allsky-logo.png" title="Allsky logo">
					<div class="navbar-title">Web User Interface (WebUI)</div>
				</a>
				<div class="version-title version-title-color">
					<span class="nowrap">Version: <?php echo ALLSKY_VERSION; ?></span>
					&nbsp; &nbsp;
<?php if ($localWebsiteVersion !== "") {
					echo "<span class='nowrap'>";
					echo "<a class='version-title-color' href='allsky/index.php' target='_blank' title='Click to go to local Website'>";
					echo "Local Website: $localWebsiteVersion";
					echo "</a></span>";
} ?>
					&nbsp; &nbsp;
<?php if ($remoteWebsiteVersion !== "") {
					echo "<span class='nowrap'>";
					// TODO: if we knew the URL we could link to it
					echo "Remote Website: $remoteWebsiteVersion";
					echo "</span>";
} ?>
				</div>
		</div> <!-- /.navbar-header -->

		<!-- Navigation -->
		<div class="navbar-default sidebar" role="navigation">
			<div class="sidebar-nav navbar-collapse">
				<ul class="nav" id="side-menu">
					<li>
						<a href="index.php?page=live_view"><i class="fa fa-eye fa-fw"></i> Live View</a>
					</li>
					<li>
						<a href="index.php?page=list_days"><i class="fa fa-image fa-fw"></i> Images</a>
					</li>
					<li>
						<a href="index.php?page=allsky_conf"><i class="fa fa-camera fa-fw"></i> Allsky Settings</a>
					</li>
					<li>
						<a href="index.php?page=editor"><i class="fa fa-code fa-fw"></i> Editor</a>
					</li>
					<li>
						<a href="index.php?page=overlay"><i class="fa fa-edit fa-fw"></i> Overlay Editor</a>
					</li>
					<li>
						<a href="index.php?page=module"><i class="fa fa-bars fa-fw"></i> Module Editor</a>
					</li>						
					<li>
						<a href="index.php?page=LAN_info"><i class="fa fa-network-wired fa-fw"></i> <b>LAN</b> Dashboard</a>
					</li>
					<li>
						<a href="index.php?page=WLAN_info"><i class="fa fa-tachometer-alt fa-fw"></i> <b>WLAN</b> Dashboard</a>
					</li>
					<li>
						<a href="index.php?page=wpa_conf"><i class="fa fa-wifi fa-fw"></i> Configure Wifi</a>
					</li>
					<?php if (RASPI_OPENVPN_ENABLED) : ?>
						<li>
							<a href="index.php?page=openvpn_conf"><i class="fa fa-lock fa-fw"></i> Configure OpenVPN</a>
						</li>
					<?php endif; ?>
					<?php if (RASPI_TORPROXY_ENABLED) : ?>
						<li>
							<a href="index.php?page=torproxy_conf"><i class="fa fa-eye-slash fa-fw"></i> Configure TOR
								proxy</a>
						</li>
					<?php endif; ?>
					<li>
						<a href="index.php?page=auth_conf"><i class="fa fa-lock fa-fw"></i> Change Password</a>
					</li>
					<li>
						<a href="index.php?page=system_info"><i class="fa fa-cube fa-fw"></i> System</a>
					</li>
					<li>
						<a href="/documentation" target="_blank" title="Opens in new window"><i class="fa fa-book fa-fw"></i> Allsky Documentation <i class="fa fa-external-link-alt fa-fw"></i></a>
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
				$status = new StatusMessages();
				if (isset($_GET['clear'])) {
					exec("sudo rm -f " . ALLSKY_MESSAGES, $result, $retcode);
					if ($retcode === 0) {
						// Reload the page, but without 'clear' so we don't get into a loop.
						echo "<script>document.location.href=document.location.href.replace('&clear=true', '');</script>";
						exit;
					} else {
						$status->addMessage("Unable to clear messages: " . $result[0], 'danger', true);
						$status->showMessages();
					}
				} else if (file_exists(ALLSKY_MESSAGES) && filesize(ALLSKY_MESSAGES) > 0) {
					$contents_array = file(ALLSKY_MESSAGES, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
					echo "<div class='row'>";
					echo "<div class='system-message'>";
						echo "<div class='title'>System Messages</div>";
						foreach ($contents_array as $line) {
							// The first part is the class, the second is the message
							$l = explode("\t", $line);
							$status->addMessage($l[1], $l[0], false);
						}
						$status->showMessages();
						echo "<div class='message-button'>";
							echo "<form action='?page=$page&clear=true' method='POST'>";
							echo "<input type='submit' class='btn btn-primary' value='Clear all messages' />";
							echo "</form>";
						echo "</div>";
					echo "</div>";
					echo "</div>";
				}

				switch ($page) {
					case "WLAN_info":
						DisplayDashboard_WLAN("wlan0");
						break;
					case "LAN_info":
						DisplayDashboard_LAN("eth0");
						break;
					case "allsky_conf":
						DisplayAllskyConfig();
						break;
					case "wpa_conf":
						DisplayWPAConfig();
						break;
					case "auth_conf":
						DisplayAuthConfig($config['admin_user'], $config['admin_pass']);
						break;
					case "system_info":
						DisplaySystem();
						break;
					case "list_days":
						ListDays();
						break;
					case "list_images":
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
						DisplayEditor();
						break;
                    			case "overlay":
                        			DisplayOverlay("$image_name");
                        			break;
                    			case "module":
                        			DisplayModule();
                        			break;						
					case "live_view":
					default:
						DisplayLiveView("$image_name", $delay, $daydelay, $nightdelay, $darkframe);
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
</script>

</body>
</html>
