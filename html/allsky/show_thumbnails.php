<?php
	$configFilePrefix = "../";
	include_once('functions.php'); disableBuffering();	 // must be first line
	// Settings are now in $webSettings_array.

	if (! isset($dir) || ! isset($prefix) || ! isset($title)) {
		echo "<p>INTERNAL ERROR: incomplete arguments given to view thumbnails.</p>";
		echo "dir, prefix, and/or title missing.";
		exit;
	}
	$homePage = v("homePage", null, $webSettings_array);
	$includeGoogleAnalytics = v("includeGoogleAnalytics", false, $homePage);
	$thumbnailsortorder = v("thumbnailsortorder", "ascending", $homePage);
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta http-equiv="Content-Type" content="text/html" />
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="shortcut icon" type="image/png" href="../allsky-favicon.png">
		<title><?php echo $title; ?></title>

<?php	if ($includeGoogleAnalytics && file_exists("../js/analyticsTracking.js")) {
			echo "<script src='../js/analyticsTracking.js'></script>";
		}
		// TODO: Don't think Jquery is needed:  <script src="../js/jquery.min.js"></script>
?>
		<link href="../font-awesome/css/all.min.css" rel="stylesheet">
		<link href="../css/allsky.css" rel="stylesheet">
	</head>
	<body>
		<?php display_thumbnails($dir, $prefix, $title); ?>
	</body>
</html>
