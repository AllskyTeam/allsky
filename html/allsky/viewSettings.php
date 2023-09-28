<!DOCTYPE html>
<html lang="en">
<head>
<?php
	$vSDir = "viewSettings";
	$settingsScript = "allskySettings.php";
	$fullMode = false;
	if (file_exists("$vSDir/$settingsScript")) {
		$fullMode = true;
	}

	// This gets the web page settings.
	include_once('functions.php');		// Sets $settings_array

	function getSettingsFile() { global $vSDir; return "$vSDir/settings.json"; }
	if ($fullMode) {
		// Define simplified functions from the WebUI's includes/functions.php file.
		function getOptionsFile() { global $vSDir; return "$vSDir/options.json"; }
		function getVariableOrDefault($a, $v, $d) { return v($v, $d, $a); }
		function check_if_configured($page, $calledFrom) { return true; }
		function CSRFToken() { return true; }

		$formReadonly = true;
		include_once("$vSDir/$settingsScript");
	} else {
		function doBool($b) { if ($b == true) return("Yes"); else return("No"); }
	}

	// Get home page options
	$homePage = v("homePage", null, $settings_array);
	$title = v("title", "Website", $homePage);
	$favicon = v("favicon", "allsky-favicon.png", $homePage);
	$ext = pathinfo($favicon, PATHINFO_EXTENSION); if ($ext === "jpg") $ext = "jpeg";
	$faviconType = "image/$ext";
	$backgroundImage = v("backgroundImage", "", $homePage);
	if ($backgroundImage != null) {
		$backgroundImage_url = v("url", "", $backgroundImage);
		if ($backgroundImage_url == "") $backgroundImage = null;
		else $backgroundImage_style = v("style", "", $backgroundImage);
	}
?>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>Allsky Settings</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<link rel="shortcut icon" type="<?php echo $faviconType ?>" href="<?php echo $favicon ?>">
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css"
		rel="stylesheet"
		integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx"
		crossorigin="anonymous">

<?php
	if ($fullMode) {
		echo "<link rel='stylesheet' type='text/css' href='$vSDir/custom.css'>";
	} else {
		echo "<link rel='stylesheet' type='text/css' href='allsky.css'>";
	}
?>

	<style>
<?php
		if ($fullMode) {
			echo "body { background-color: white; color: black; }";
		} else {
			echo ".clear { clear: both; }";
			echo ".title { box-sizing: border-box; }";
			echo ".errorMsg { color: red; font-size: 200%; }";
			echo ".tableHeader { background-color: silver; color: black; }";
		}
		if ($backgroundImage !== null) {
			echo "		.backgroundImage { background-image: url('$backgroundImage_url');";
			if ($backgroundImage_style !== "")
				echo " $backgroundImage_style";
			echo " }";
		}
?>
		.panel-primary>.panel-heading {
			color: white;
			padding: 5px 0 5px 5px;
		}
	</style>
</head>
<body id="body" <?php if ($backgroundImage !== null) echo "class='.backgroundImage'"; ?>>
<?php
	if ($fullMode) {
		DisplayAllskyConfig();
		echo "</body>";
		echo "</html>";
		exit;
	}
?>
	<div class="header">
		<div class=title><?php echo $title; ?></div>
		<div class="clear"></div>
	</div>
	<h1 align="center">Image Settings</h1>
	<br>
	<?php
		$settings_file_name = getSettingsFile();
		if (! file_exists($settings_file_name)) {
			echo "<p class='errorMsg'>";
			echo "ERROR: Image settings file '$settings_file_name' not found!  Cannot continue.";
			echo "</p>";
			exit;
		}
		$image_settings_str = file_get_contents($settings_file_name, true);
		$settings = json_decode($image_settings_str, true);
		if ($settings == null) {
			echo "<p class='errorMsg'>";
			echo "ERROR: Bad image settings file '$settings_file_name'.  Cannot continue.";
			echo "<br>Check for missing quotes or commas at the end of every line (except the last one).";
			echo "</p>";
			echo "<pre>$image_settings_str</pre>";
			exit;
		}
	?>
	<table border="1" align="center">
	<thead>
		<tr class="tableHeader"> <th>Setting</th> <th>Value</th> </tr>
	</thead>
	<tbody>
		<?php		// Only display certain settings.
			$cameraType = v("cameraType", "", $settings);
			echo "<tr> <td>Camera Type</td><td>$cameraType</td> </tr>";
			$cameraModel = v("cameraModel", "", $settings);
			echo "<tr> <td>Camera Model</td><td>$cameraModel</td> </tr>";
			$lens = v("lens", "", $settings);
			if ($lens !== "") echo "<tr> <td>Lens</td><td>$lens</td> </tr>";

			// daytime
			$dayAutoExposure = v("dayautoexposure", false, $settings);
			$value = doBool($dayAutoExposure);
			echo "<tr> <td>Daytime Auto-Exposure</td><td>$value</td> </tr>";
			$dayExposure = v("dayexposure", "", $settings);
			echo "<tr> <td>Daytime Manual Exposure</td><td>$dayExposure</td> </tr>";

			$dayBrightness = v("daybrightness", "?", $settings);
			echo "<tr> <td>Daytime Brightness</td><td>$dayBrightness</td> </tr>";

			$dayAutoGain = v("dayautogain", false, $settings);
			$value = doBool($dayAutoGain);
			echo "<tr> <td>Daytime Auto-Gain</td><td>$value</td> </tr>";
			$dayGain = v("daygain", "", $settings);
			echo "<tr> <td>Daytime Manual Gain</td><td>$dayGain</td> </tr>";

			$dayAWB = v("dayawb", "", $settings);
			if ($dayAWB !== "") {
				$value = doBool($dayAWB);
				echo "<tr> <td>Daytime AWB</td><td>$value</td> </tr>";
			}
			$dayWBR = v("daywbr", "", $settings);
			if ($dayWBR !== "") echo "<tr> <td>Daytime Red Balance</td><td>$dayWBR</td> </tr>";
			$dayWBB = v("daywbb", "", $settings);
			if ($dayWBB !== "") echo "<tr> <td>Daytime Blue Balance</td><td>$dayWBB</td> </tr>";

			$dayBin = v("daybin", false, $settings);
			echo "<tr> <td>Daytime Bin</td><td>$dayBin</td> </tr>";

			$dayMean = v("daymean", "", $settings);
			if ($dayMean !== "") echo "<tr> <td>Daytime Mean Target</td><td>$dayMean</td> </tr>";

			// nighttime
			$nightAutoExposure = v("nightautoexposure", false, $settings);
			$value = doBool($nightAutoExposure);
			echo "<tr> <td>Nighttime Auto-Exposure</td><td>$value</td> </tr>";
			$nightExposure = v("nightexposure", "", $settings);
			echo "<tr> <td>Nighttime Manual Exposure</td><td>$nightExposure</td> </tr>";

			$nightBrightness = v("nightbrightness", "?", $settings);
			echo "<tr> <td>Nighttime Brightness</td><td>$nightBrightness</td> </tr>";

			$nightAutoGain = v("nightautogain", false, $settings);
			$value = doBool($nightAutoGain);
			echo "<tr> <td>Nighttime Auto-Gain</td><td>$value</td> </tr>";
			$nightGain = v("nightgain", "", $settings);
			echo "<tr> <td>Nighttime Manual Gain</td><td>$nightGain</td> </tr>";

			$nightAWB = v("nightawb", "", $settings);
			if ($nightAWB !== "") {
				$value = doBool($nightAWB);
				echo "<tr> <td>Nighttime AWB</td><td>$value</td> </tr>";
			}
			$nightwbr = v("nightwbr", "", $settings);
			if ($nightwbr !== "") echo "<tr> <td>Nighttime Red Balance</td><td>$nightwbr</td> </tr>";
			$nightWBB = v("nightwbb", "", $settings);
			if ($nightWBB !== "") echo "<tr> <td>Nighttime Blue Balance</td><td>$nightWBB</td> </tr>";


			$nightBin = v("nightbin", false, $settings);
			echo "<tr> <td>Nighttime Bin</td><td>$nightBin</td> </tr>";

			$nightMean = v("nightmean", "", $settings);
			if ($nightMean !== "") echo "<tr> <td>Nighttime Mean Target</td><td>$nightMean</td> </tr>";

			// both day and night
			$offset = v("offset", "", $settings);
			if ($offset !== "") echo "<tr> <td>Offset</td><td>$offset</td> </tr>";

			$saturation = v("saturation", "", $settings);
			if ($saturation !== "") echo "<tr> <td>Saturation</td><td>$saturation</td> </tr>";

			$contrast = v("contrast", "", $settings);
			if ($contrast !== "") echo "<tr> <td>Contrast</td><td>$contrast</td> </tr>";

			$sharpness = v("sharpness", "", $settings);
			if ($sharpness !== "") echo "<tr> <td>Sharpness</td><td>$sharpness</td> </tr>";

		?>
	</tbody>
</body>
</html>
