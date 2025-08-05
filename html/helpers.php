<?php

/**
 * AllSky Web User Interface (WebUI) "helper" page.
 */

// functions.php sets a bunch of constants and variables.
// It needs to be at the top of this file since code below uses the items it sets.
include_once('includes/functions.php');
initialize_variables();		// sets some variables

if (isset($_REQUEST['page']))
	$page = $_POST['page'];
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
?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="WebUI 'helper' page">

<?php	// Give each page its own <title> so they are easy to distinguish in the browser.
	switch ($page) {
		case "startrails_settings":		$Title = "Startrails Settings";				break;
		case "timelapse_settings":		$Title = "Timelapse Settings";				break;
		case "constellation_overlay":	$Title = "Website Constellation Overlay";	break;
		case "bad_images_settings":		$Title = "Remove Bad Images Settings";		break;
		case "stretch_settings":		$Title = "Image Stretch Settings";			break;
		default:						$Title = "Allsky WebUI Helper";				break;
	}
?>
	<!-- allows <a external="true" ...> -->
	<script src="documentation/js/documentation.js" type="application/javascript"></script>

	<title><?php echo "$Title - WebUI Helper"; ?></title>

	<!-- Bootstrap Core CSS -->
	<link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">

	<!-- MetisMenu CSS -->
	<link href="documentation/bower_components/metisMenu/dist/metisMenu.min.css" rel="stylesheet">

	<link href="documentation/css/sb-admin-2.css" rel="stylesheet">

	<!-- for Website constellation icon -->
	<link href="allsky/css/allsky.css" rel="stylesheet">
<!-- not needed?
	<link href="allsky/font-awesome/css/all.min.css" rel="stylesheet" type="text/css">
-->

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

<!-- not needed?
	<script src="js/bigscreen.min.js"></script>

	<script src="js/allsky.js"></script>
	<script> var allskyPage='<?php echo $page ?>';  </script>
-->

	<!-- Custom Theme JavaScript -->
	<script src="documentation/js/sb-admin-2.js"></script>

	<style> body { color: black; } </style>
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
					<div class="navbar-title nowrap">WebUI Helper Pages</div>
				</a>
			</div>
		</div> <!-- /.navbar-header -->

		<!-- Navigation.  Add "id" to any page that needs to be refreshed. -->
		<div class="navbar-default sidebar" role="navigation">
			<div class="sidebar-nav navbar-collapse">
				<ul class="nav" id="side-menu">
					Help Determine:
					<li>
						<a id="startrails_settings" href="helpers.php?page=startrails_settings">
							<i class="fa fa-star fa-fw"></i>
							<strong>Startrails Settings</strong></a>
					</li>
					<li>
						<a id="timelapse_settings" href="helpers.php?page=timelapse_settings">
							<i class="fa fa-play-circle fa-fw"></i>
							<strong>Timelapse Settings</strong></a>
					</li>
					<li>
						<a id="bad_images_settings" href="helpers.php?page=bad_images_settings">
							<i class="fa fa-image fa-fw"></i>
							<strong>Bad Images Settings</strong></a>
					</li>
					<li>
						<a id="stretch_settings" href="helpers.php?page=stretch_settings">
<!-- TODO: update icon -->
							<i class="fa fa-edit fa-fw"></i>
							<strong>Image Stretch Settings</strong></a>
					</li>

					Other:
					<li>
						<a id="constellation_overlay" href="helpers.php?page=constellation_overlay">
							<i class="fa allsky-constellation fa-fw"></i>
							Help Place the
							<br> &nbsp; &nbsp; &nbsp; <strong>Allsky Website
							<br> &nbsp; &nbsp; &nbsp; Constellation Overlay</strong></a>
					</li>
				</ul>
			</div><!-- /.navbar-collapse -->
		</div><!-- /.navbar-default -->
	</nav>

	<div id="page-wrapper">
		<div class="row right-panel">
			<div class="col-lg-12">
				<?php
				clearstatcache();
				switch ($page) {
					case "startrails_settings":
						include_once("helpers/${page}.php");
						startrailsSettings();
						break;
					case "timelapse_settings":
						include_once("helpers/${page}.php");
// TODO: add function name
						break;
					case "constellation_overlay":
						include_once("helpers/${page}.php");
// TODO: add function name
						break;
					case "bad_images_settings":
						include_once("helpers/${page}.php");
// TODO: add function name
						break;
					case "stretch_settings":
						include_once("helpers/${page}.php");
// TODO: add function name
						break;
				}
				?>
			</div>
		</div>
	</div><!-- /#page-wrapper -->
</div><!-- /#wrapper -->

</body>
</html>
