<!DOCTYPE html>
<html lang="en">
<head>
<?php
	$vSDir = "viewSettings";
	echo "<link rel='stylesheet' type='text/css' href='$vSDir/custom.css'>";
	$settingsScript = "$vSDir/allskySettings.php";
	if (! file_exists($settingsScript)) {
		echo "<div class='errorMsgBox errorMsgBig'>";
		echo "This Allsky Website is not fully configured so its settings cannot be displayed.";
		echo "<br>It is missing the '$settingsScript' file.";
		echo "<br><br>";
		echo "To fix: make sure the Website is enabled in the <b>Websites and Remote Server Settings</b>";
		echo "section of the WebUI's <b>Allsky Settings</b> page.";
		echo "</div>";
		exit(1);
	}

	// This gets the web page settings.
	include_once('functions.php');		// Sets $webSettings_array

	function getSettingsFile() { global $vSDir; return "$vSDir/settings.json"; }
	// Define simplified functions from the WebUI's includes/functions.php file.
	function readSettingsFile() {
		$settings_file = getSettingsFile();
		$errorMsg = "ERROR: Unable to process settings file '$settings_file'.";
		$contents = get_decoded_json_file($settings_file, true, $errorMsg);
		if ($contents === null) {
			exit(1);
		}
		return($contents);
	}
	function getOptionsFile() { global $vSDir; return "$vSDir/options.json"; }
	function getVariableOrDefault($a, $v, $d) { return v($v, $d, $a); }
	function check_if_configured($page, $calledFrom) { return true; }
	function CSRFToken() { return true; }
	function toBool($x) { if ($x == "true" || $x == "1" || $x == 1) return true; else return false; }

	$formReadonly = true;
	$endSetting = "XX_END_XX";
	include_once($settingsScript);

	// Get home page options
	$homePage = v("homePage", null, $webSettings_array);
	$title = v("title", "Website", $homePage);
	$favicon = v("favicon", "allsky-favicon.png", $homePage);
	$ext = pathinfo($favicon, PATHINFO_EXTENSION); if ($ext === "jpg") $ext = "jpeg";
	$faviconType = "image/$ext";
	$backgroundImage = v("backgroundImage", "", $homePage);
	if ($backgroundImage !== "") {
		$backgroundImage_url = v("url", "", $backgroundImage);
		if ($backgroundImage_url !== "") 
			$backgroundImage_style = v("style", "", $backgroundImage);
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


	<style>
		body { background-color: white; color: black; }
<?php
		if ($backgroundImage_url !== "") {
			echo "		body { background-image: url('$backgroundImage_url');";
			if ($backgroundImage_style !== "")
				echo " $backgroundImage_style";
			echo " }";
		}
?>
		.switch-field label:hover { cursor: default; }
		.panel-primary>.panel-heading {
			color: white;
			padding: 5px 0 5px 5px;
		}
	</style>
</head>

<body id="body">
<?php
	DisplayAllskyConfig();
?>
</body>
</html>
