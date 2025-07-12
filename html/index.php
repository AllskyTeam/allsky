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


require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/Twig/MenuExtension.php';
require_once __DIR__ . '/Twig/DateFormatterExtension.php';
require_once __DIR__ . '/Twig/NoCacheUrlExtension.php';

$loader = new \Twig\Loader\FilesystemLoader(__DIR__ . '/templates');
$twig = new \Twig\Environment($loader, [
	"cache" => false
]);

$twig->addExtension(new \MenuExtension());
$twig->addExtension(new \DateFormatterExtension());
$twig->addExtension(new \NoCacheUrlExtension());

$status = new StatusMessages();
initialize_variables();		// sets some variables

// Constants for configuration file paths.
// These are typical for default RPi installs. Modify if needed.
include_once('includes/authenticate.php');
define('RASPI_WPA_SUPPLICANT_CONFIG', '/etc/wpa_supplicant/wpa_supplicant.conf');
define('RASPI_WPA_CTRL_INTERFACE', '/var/run/wpa_supplicant');

// Optional services, set to true to enable.
define('', true);
define('DHCP_ENABLED', false);
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

session_start();
if ($useLogin) {
	if (empty($_SESSION['csrf_token'])) {
		if (function_exists('mcrypt_create_iv')) {
			$_SESSION['csrf_token'] = bin2hex(mcrypt_create_iv(32, MCRYPT_DEV_URANDOM));
		} else {
			$_SESSION['csrf_token'] = bin2hex(openssl_random_pseudo_bytes(32));
		}
	}
	$csrf_token = $_SESSION['csrf_token'];
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

$routes = getRoutes($page);

$includeCode = $routes["include"];

include_once("includes/$includeCode");
$renderCode = "render$page";
$pageHTML = $renderCode($twig);

$html = $pageHTML;
$extaCSS = array();
$extraJS = array();
$messages = "";
if (is_array($pageHTML)) {
	if (isset($pageHTML["template"])) {
		$html = $pageHTML["template"];
	}
	if (isset($pageHTML["extracss"])) {
		$extaCSS = $pageHTML["extracss"];
	}
	if (isset($pageHTML["extrajs"])) {
		$extraJS = $pageHTML["extrajs"];
	}
	if (isset($pageHTML["messages"])) {
		$messages = $pageHTML["messages"];
	}		
}

if (isset($_SESSION['flash'])) {
	$messages .= $_SESSION['flash'];
	unset($_SESSION['flash']);
}
echo $twig->render('layout.twig', [
	"nocache" => ALLSKY_VERSION,
    'menuData' => getRoutes(),
	"pageInfo" => getRoutes($page),
	'allskyPage' => $page,
	"allskyStatus" => output_allsky_status(),
	"pageHTML" => $html,
	"extracss" => $extaCSS,
	"extrajs" => $extraJS,
	"messages" => $messages
]);



die();

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
	$pageInfo = getPageInfo($page);
	if (is_array($pageInfo)) {
		$Title = $pageInfo["title"];
	} else {
		$Title = $pageInfo;
	}

?>
	<!-- allows <a external="true" ...> -->
	<script src="documentation/js/documentation.js" type="application/javascript"></script>

	<title><?php echo "$Title - WebUI"; ?></title>
<!--
	<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
	<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">
	<link href="documentation/css/sb-admin-2.css" rel="stylesheet">
	<script defer src="documentation/js/all.min.js"></script>
	<link href="documentation/css/custom.css" rel="stylesheet">
-->
	<link rel="shortcut icon" type="image/png" href="documentation/img/allsky-favicon.png">

	<!-- RaspAP JavaScript -->
	<script src="documentation/js/functions.js"></script>

	<!-- jQuery -->
	<script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>

	<!-- Bootstrap Core JavaScript -->
<!--	
	<script src="documentation/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
-->
	<!-- Metis Menu Plugin JavaScript -->
<!--
	<script src="documentation/bower_components/metisMenu/dist/metisMenu.min.js"></script>
	<script src="js/bigscreen.min.js"></script>
-->

	<script src="js/allsky.js"></script>
	<script> var allskyPage='<?php echo $page ?>';  </script>

	<!-- Custom Theme JavaScript -->
<!--
	<script src="documentation/js/sb-admin-2.js"></script>
-->

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


  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">

  <style>
    html, body {
      height: 100%;
      margin: 0;
    }

    .header {
      height: 60px;
      background-color: #343a40;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15px;
    }

    .content-wrapper {
      display: flex;
      height: calc(100% - 60px);
    }

    .sidebar {
      width: 250px;
	  min-width: 250px;
      transition: width 0.3s;
      overflow-x: hidden;
    }

    .sidebar.collapsed {
      width: 60px;
    }

    .sidebar .nav-link {
      display: flex;
      align-items: center;
      padding: 7px 12px;
      white-space: nowrap;
    }

    .sidebar .nav-link i {
      font-size: 18px;
      width: 1.5em;
      text-align: center;
      margin-right: 10px;
    }

    .sidebar.collapsed .nav-link {
      justify-content: center;
      padding-left: 0;
      padding-right: 0;
    }

    .sidebar.collapsed .nav-link i {
      margin-right: 0;
    }

    .sidebar.collapsed .nav-link span {
      display: none;
    }

    .main {
      flex-grow: 1;
      padding: 15px;
      overflow: auto;
    }

    #toggleSidebar {
      margin-bottom: 1rem;
      width: 100%;
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 60px;
      }

      .sidebar .nav-link {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }

      .sidebar .nav-link span {
        display: none;
      }

      .sidebar .nav-link i {
        margin-right: 0;
      }
    }
	.logo {
	max-height: 40px;  /* Fit within header */
	height: auto;
	width: auto;
	}	


	.current {
		width: 100%;
	}
	</style>

  <!-- Header -->
  	<div class="header">
    	<div class="d-flex align-items-center">
      		<img src="documentation/img/allsky-logo.png" class="me-2 logo" alt="Allsky Logo">
      		<span class="fw-semibold">Allsky Web UI</span>
    	</div>
    	<div>
			<?php echo output_allsky_status(); ?>
    	</div>
  	</div>

	<!-- Sidebar + Main -->
	<div class="content-wrapper">
    	<div id="sidebar" class="sidebar border-end p-2">
      		<button id="toggleSidebar" class="btn btn-sm btn-outline-secondary">☰</button>

			<div id="as-switch-theme" class="form-check form-switch mt-1">
				<input class="form-check-input" type="checkbox" id="theme-toggle">
				<label class="form-check-label" for="theme-toggle">Dark Mode</label>
			</div>

      		<nav class="nav flex-column mt-2">
				<a id="live_view" class="nav-link" href="index.php?page=live_view"><i class="fa fa-eye fa-fw"></i> <span>Live View</span></a>
				<a id="list_days" class="nav-link" href="index.php?page=list_days"><i class="fa fa-image fa-fw"></i> <span>Images</span></a>
				<a id="configuration" class="nav-link" href="index.php?page=configuration"><i class="fa fa-camera fa-fw"></i> <span>Settings</span></a>
				<a id="editor" class="nav-link" href="index.php?page=editor"><i class="fa fa-code fa-fw"></i> <span>Editor</span></a>
				<a id="overlay" class="nav-link" href="index.php?page=overlay"><i class="fa fa-edit fa-fw"></i> <span>Overlay Editor</span></a>
				<?php if (haveDatabase()) { ?>
					<a id="charts" class="nav-link" href="index.php?page=charts"><i class="fa-solid fa-chart-line"></i> <span>Charts</span></a>
				<?php } ?>
				<a id="module" class="nav-link" href="index.php?page=module"><i class="fa fa-bars fa-fw"></i> <span>Module Manager</span></a>
				<a id="LAN" class="nav-link" href="index.php?page=LAN_info"><i class="fa fa-network-wired fa-fw"></i> <span><b>LAN</b> Dashboard</span></a>
				<a id="WLAN" class="nav-link" href="index.php?page=WLAN_info"><i class="fa fa-tachometer-alt fa-fw"></i> <span><b>WLAN</b> Dashboard</span></a>
				<a id="wifi" class="nav-link" href="index.php?page=wifi"><i class="fa fa-wifi fa-fw"></i> <span>Configure Wi-Fi</span></a>
				<?php if (DHCP_ENABLED) : ?>
					<a id="dhcp" class="nav-link" href="index.php?page=dhcp_conf"><i class="fa fa-exchange fa-fw"></i> <span>Configure DHCP</span></a>
				<?php endif; ?>
				<?php if (APD_ENABLED) : ?>
					<a id="adp" class="nav-link" href="index.php?page=hostapd_conf"><i class="fa fa-dot-circle fa-fw"></i> <span>Configure Hotspot</span></a>
				<?php endif; ?>
				<?php if (RASPI_OPENVPN_ENABLED) : ?>
					<a id="vpn" class="nav-link" href="index.php?page=openvpn_conf"><i class="fa fa-lock fa-fw"></i> <span>Configure OpenVPN</span></a>
				<?php endif; ?>
				<?php if (RASPI_TORPROXY_ENABLED) : ?>
					<a id="tor" class="nav-link" href="index.php?page=torproxy_conf"><i class="fa fa-eye-slash fa-fw"></i> <span>Configure TOR proxy</span></a>
				<?php endif; ?>
				<a id="auth_conf" class="nav-link" href="index.php?page=auth_conf"><i class="fa fa-lock fa-fw"></i> <span>Change Password</span></a>
				<a id="system" class="nav-link" href="index.php?page=system"><i class="fa fa-cube fa-fw"></i> <span>System</span></a>
				<a id="documendocumentationtatio" class="nav-link" href="/documentation"><i class="fa fa-book fa-fw"></i> <span>Allsky Documentation</span></a>
				<a id="support" class="nav-link" href="index.php?page=support"><i class="a fa-question fa-fw"></i> <span>Getting Support</span></a>
				<a id="theme-toggle" class="nav-link" href="#"><i class="fa fa-moon fa-fw"></i> <span>Light/Dark mode</span></a>			
			</nav>
    	</div>
    	<div class="main">
			<div class="card mb-3">
  				<div class="card-header"><?php echo getPageTitleHtml($page); ?></div>
  				<div class="card-body">
					<?php
						includePage($page);
					?>
  				</div>
			</div>
		</div>
	</div>


  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Collapse toggle -->
  <script>
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  </script>




<div id="wrapper">
	<!-- Navigation -->
	<nav class="navbar navbar-default navbar-static-top" role="navigation" style="margin-bottom: 0" id="main-header">
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
					<div class="navbar-title nowrap">Web User Interface (WebUI)</div>
				</a>
				<div class="version-title version-title-color">
					<span id="allskyStatus"><?php echo output_allsky_status(); ?></span>
					<?php
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
                    <?php if (haveDatabase()) { ?>
                    <li>
                        <a id="charts" href="index.php?page=charts"><i class="fa-solid fa-chart-line"></i> Charts</a>
                    </li>
                    <?php } ?>
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
						<a id="wifi" href="index.php?page=wifi"><i class="fa fa-wifi fa-fw"></i> Configure Wi-Fi</a>
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
						<span id="as-switch-theme"><i class="fa fa-moon fa-fw"></i> Light/Dark mode</span>
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
									$m1 = "<br><a href='/execute.php?id=" . urlencode($id) . "'";
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
						DisplayAuthConfig($config['admin_user'], $config['admin_pass']);
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
                    case "charts":
                        include_once('includes/charts.php');
                        DisplayCharts();
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

</body>
</html>
