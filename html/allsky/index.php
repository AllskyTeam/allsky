<?php
	if (isset($_GET["check"])) {
		// Check sanity of website and make necessary directories.
		if (isset($_GET["debug"]))
			$debug = true;
		else
			$debug = false;

		$ok = true;
		$dirs = array("videos", "keograms", "startrails");
		foreach ($dirs as $dir) {
			$thumb_dir = "$dir/thumbnails";
			if ($debug) echo "\nChecking $thumb_dir.";
			if (! is_dir($thumb_dir)) {
				if ($debug) echo "  > Making";
				if (! mkdir($thumb_dir, 0775, true)) {		// true == recursive
					$ok = false;
					$last_error = error_get_last();
					echo "\nUnable to make '$thumb_dir' directory: " . $last_error["message"];
				}
			}
		}

		// TODO: add other checks here

		if (! $ok) exit;

		if ($debug) echo "\n";	// ends any lines already output
		echo "SUCCESS\n";
		exit;
	}
?><!DOCTYPE html>
<html prefix="og: http://ogp.me/ns#" ng-app="allsky" ng-controller="AppCtrl" lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<?php
		// This gets the settings.
		// Some settings impact this page, some impact the constellation overlay.
		include_once('functions.php');		// Sets $settings_array

		// Get home page options
		$homePage = v("homePage", null, $settings_array);
			// TODO: replace double quotes with &quot; in any variable that can be in an HTML attribute,
			// which is many of them.
			$backgroundImage = v("backgroundImage", "", $homePage);
			if ($backgroundImage != null) {
				$backgroundImage_url = v("url", "", $backgroundImage);
				if ($backgroundImage_url == "") $backgroundImage = null;
				else $backgroundImage_style = v("style", "", $backgroundImage);
			}
			$loadingImage = v("loadingImage", "loading.jpg", $homePage);
			$title = v("title", "Website", $homePage);
			$og_description = v("og_description", "", $homePage);
			$og_type = v("og_type", "website", $homePage);
			$og_url = v("og_url", "http://www.thomasjacquin/allsky/", $homePage);
			$og_image = v("og_image", "image.jpg", $homePage);
			$ext = pathinfo($og_image, PATHINFO_EXTENSION); if ($ext === "jpg") $ext = "jpeg";
			$og_image_type = "image/$ext";
			$favicon = v("favicon", "allsky-favicon.png", $homePage);
			$ext = pathinfo($favicon, PATHINFO_EXTENSION); if ($ext === "jpg") $ext = "jpeg";
			$faviconType = "image/$ext";
			$includeGoogleAnalytics = v("includeGoogleAnalytics", "", $homePage);
				if ($includeGoogleAnalytics == "") $includeGoogleAnalytics = 0;		// boolean
			$imageBorder = v("imageBorder", false, $homePage);
			$includeLinkToMakeOwn = v("includeLinkToMakeOwn", true, $homePage);
				if ($includeLinkToMakeOwn == "") $includeLinkToMakeOwn = 0;		// boolean
			$showOverlayIcon = v("showOverlayIcon", false, $homePage);
				if ($showOverlayIcon == "") $showOverlayIcon = 0;		// boolean
			$leftSidebar = v("leftSidebar", null, $homePage);
			$leftSidebarStyle = v("leftSidebarStyle", null, $homePage);
			$popoutIcons = v("popoutIcons", null, $homePage);
			$personalLink_style = "";
			$personalLink = v("personalLink", null, $homePage);
			if ($personalLink != null) {
				$personalLink_url = v("url", "", $personalLink);
				if ($personalLink_url == "") {
					$personalLink = null;
				} else {
					$personalLink_prelink = v("prelink", "", $personalLink);
					$personalLink_message = v("message", "", $personalLink);
					$personalLink_title = v("title", "", $personalLink);
					$personalLink_style = v("style", "", $personalLink);
				}
			}

		// Get javascript config variable options.
		// To avoid changing too much code, the "config" javascript variable is created
		// here to replace the old config.js file that contained that variable.
		$config = v("config", null, $settings_array);
		$imageWidth = v("imageWidth", null, $config);
			echo "<script>config = {\n";
			foreach ($config as $var => $val) {	// ok to have comma after last entry
				echo "\t\t$var: ";
				if ($val === true || $val === false || $val === null || is_numeric($val)) {
					echo var_export($val, true) . ",\n";
				} else if (is_array($val)) {
					echo '"[array]",' . "\n";
				} else {
					echo '"' . str_replace('"', '\"', $val) . '",' . "\n";
				}
			}
			// Add additional variable(s) from $homePage that are needed in controller.js.
			echo "\t\timageBorder: $imageBorder,\n";
			echo "\t\ttitle: " . '"' . $title . '",' . "\n";
			echo "\t\tloadingImage: " . '"' . $loadingImage . '"';

			echo "\n\t}";
			echo "\n\t</script>\n";
	?>

	<title><?php echo $title ?></title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta property="og:title" content="All Sky Camera" />
	<meta property="og:description" content="<?php echo $og_description ?>" />
	<meta property="og:type" content="<?php echo $og_type ?>" />
	<meta property="og:url" content="<?php echo $og_url ?>" />
	<meta property="og:image" content="<?php echo $og_image ?>" />
	<meta property="og:image:type" content="<?php echo $og_image_type ?>" />
	<link rel="shortcut icon" type="<?php echo $faviconType ?>" href="<?php echo $favicon ?>">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css"
		rel="stylesheet"
		integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx"
		crossorigin="anonymous">

	<link href='https://fonts.googleapis.com/css?family=Ubuntu:400,300' rel='stylesheet' type='text/css'>
	<link rel="stylesheet" type="text/css" href="animate.min.css">
	<link rel="stylesheet" type="text/css" href="allsky.css">
	<link rel="stylesheet" type="text/css" href="allsky-font.css">

	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
		integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa"
		crossorigin="anonymous"></script>
  </body>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular.min.js"></script>
	<script src="moment.js"></script>
	<script src="virtualsky/stuquery.js"></script>
	<script src="virtualsky/virtualsky.js"></script>
	<script src="ng-lodash.min.js"></script>
	<script src="controller.js"></script>

	<style>
		.clear { clear: both; }
		<?php
			if ($backgroundImage !== null) {
				echo "		.backgroundImage { background-image: url('$backgroundImage_url');";
				if ($backgroundImage_style !== "")
					echo " $backgroundImage_style";
				echo " }";
			}
			if ($leftSidebarStyle !== null)
				echo "		#leftSidebar { $leftSidebarStyle }";
			if ($personalLink_style !== "")		// adds to what's in custom.css
				echo "		.personalLink { $personalLink_style }";
		?>
	</style>
</head>
<body id="body" <?php if ($backgroundImage !== null) echo "class='.backgroundImage'"; ?>>
	<div class="header">
		<div class=title><?php echo $title; ?></div>
		<div ng-show="auroraForecast === true && forecast" class="forecast float-end">
			<span>Aurora activity: </span>
			<span class="forecast-day" ng-repeat="(key,val) in forecast">{{key}}:
				<span ng-class="getScale(val)" title="{{val}}/9">{{getScale(val)}}</span>
			</span>
		</div>
		<div class="clear"></div>
<?php	// display an optional link to the user's website
	if ($personalLink != null) {
		echo "\t\t<div class='personalLink'>";
		if ($personalLink_prelink !== "") echo "$personalLink_prelink";
		echo "<a href='$personalLink_url' title='$personalLink_title' target='_blank'>$personalLink_message</a>";
		echo "</div>";
	}
?>

	</div>
<?php
	if (count($popoutIcons) > 0) {
		echo "\t<div class='info animated slideInRight' ng-show='showInfo==true'>\n";
			echo "\t\t<ul>\n";
				foreach ($popoutIcons as $popout) {
					$display = v("display", false, $popout);
					if (! $display) continue;

					$label = v("label", "", $popout);
					$icon = v("icon", "", $popout);
					$js_variable = v("variable", "", $popout);
					$value = v("value", "", $popout);
					$style = v("style", "", $popout);
					if ($style != "") $style = "style='$style'";
					echo "\t\t\t<li><i class='$icon' $style></i>&nbsp; $label:&nbsp; <span>";
					if ($js_variable != "")
						echo "{{ $js_variable }}";
					else
						echo "$value";
					echo "</span></li>\n";
				}
			echo "\t\t</ul>\n";
		echo "\t</div>\n";
	}
?>
	<span class="notification" compile="notification"></span>

	<ul id="leftSidebar" class="animated slideInLeft">
<?php
	if (count($leftSidebar) > 0) {
		foreach ($leftSidebar as $side) {
			$display = v("display", false, $side);
			if (! $display) continue;

			$url = v("url", "", $side);
			$js_variable = v("variable", "", $side);
			if ($js_variable !== "")
				$url = "{{ $js_variable }}";
			$title = v("title", "", $side);
			$icon = v("icon", "", $side);
			$style = v("style", "", $side);
			$other = v("other", "", $side);
			if ($style != "") $style = "style='$style'";
			if ($url === "") {
				echo "\t\t<li><i class='$icon' title='$title' $other $style></i></li>\n";
			} else {
				echo "\t\t<li><a href='$url' title='$title' $other><i class='$icon' $style></i></a></li>\n";
			}
		}
	}
?>
	</ul>

	<div id="imageContainer" <?php if ($imageBorder) echo "class='imageContainer'"; ?> style="max-width: <?php echo $imageWidth ?>px">
		<div id="starmap_container" ng-show="showOverlay==true">
			<div id="starmap"></div>
		</div>
		<div id="live_container">
			<img title="allsky image" alt="allsky image" id="current" class="current" src="<?php echo $loadingImage ?>">
		</div>
	</div>
	
<?php
	if ($includeLinkToMakeOwn) {
		echo "<div class='diy'>";
		echo "<i class='fa fa-tools'></i><a href='http://thomasjacquin.com/make-your-own-allsky-camera' title='A guide to build you own allsky camera' target='_blank'>Build your own</a>";
		echo "</div>";
	}

	if ($includeGoogleAnalytics && file_exists("analyticsTracking.js")) {
		echo "<script src='analyticsTracking.js'></script>";
	}
?>
</body>
</html>
