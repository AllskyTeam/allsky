<?php
$configFilePrefix = "../";
include_once('../functions.php'); 
disableBuffering();

// Settings are now in $webSettings_array.
$homePage = v("homePage", null, $webSettings_array);
$includeGoogleAnalytics = v("includeGoogleAnalytics", false, $homePage);
$thumbnailsortorder = v("thumbnailsortorder", "descending", $homePage);
$thumbnailSizeX = v("thumbnailsizex", 100, $homePage);

// Get date from URL or use today
$selected_date = isset($_GET['date']) ? $_GET['date'] : date('Ymd');
if (!preg_match('/^\d{8}$/', $selected_date)) {
	$selected_date = date('Ymd');
}

$title = "Archived Images";
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html" />
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="shortcut icon" type="image/png" href="../allsky-favicon.png">
	<title><?php echo $title; ?></title>

<?php 
	if ($includeGoogleAnalytics && file_exists("../js/analyticsTracking.js")) {
		echo "<script src='../js/analyticsTracking.js'></script>";
	}
?>
	<link href="../font-awesome/css/all.min.css" rel="stylesheet">
	<link href="../css/allsky.css" rel="stylesheet">
	<style>
		.date-controls {
			margin: 20px 0;
			padding: 15px;
			background: #222;
			border-radius: 5px;
			display: flex;
			gap: 10px;
			align-items: center;
			flex-wrap: wrap;
		}
		.date-input {
			background: #333;
			border: 1px solid #555;
			color: #e0e0e0;
			padding: 8px 12px;
			border-radius: 4px;
			font-size: 14px;
		}
		.btn-date {
			background: #7777ff;
			color: white;
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 14px;
		}
		.btn-date:hover {
			background: #6666ee;
		}
		.date-info {
			color: #7777ff;
			font-weight: bold;
		}
	</style>
</head>
<body>

<?php
// Calculate dates for navigation
$date_obj = DateTime::createFromFormat('Ymd', $selected_date);
$prev_date = clone $date_obj;
$prev_date->modify('-1 day');
$next_date = clone $date_obj;
$next_date->modify('+1 day');

$year = substr($selected_date, 0, 4);
$month = substr($selected_date, 4, 2);
$day = substr($selected_date, 6, 2);
$formatted_date = "$year-$month-$day ({$date_obj->format('l')})";

// Build directory path
$dir = "./$year/$selected_date";

// Get list of images
$images = array();
if (is_dir($dir)) {
	$files = glob("$dir/*.{jpg,JPG,jpeg,JPEG}", GLOB_BRACE);
	foreach ($files as $file) {
		$images[] = basename($file);
	}
	
	if ($thumbnailsortorder === "descending") {
		arsort($images);
	} else {
		asort($images);
	}
}

$num_images = count($images);
?>

	<div class="date-controls">
		<button class="btn-date" onclick="navigateToDate('<?php echo $prev_date->format('Ymd'); ?>')">
			<i class="fas fa-chevron-left"></i> Previous
		</button>
		
		<input type="date" 
			   class="date-input" 
			   value="<?php echo $date_obj->format('Y-m-d'); ?>"
			   onchange="navigateToDate(this.value.replace(/-/g, ''))">
		
		<button class="btn-date" onclick="navigateToDate('<?php echo $next_date->format('Ymd'); ?>')">
			Next <i class="fas fa-chevron-right"></i>
		</button>
		
		<button class="btn-date" onclick="navigateToDate('<?php echo date('Ymd'); ?>')">
			<i class="fas fa-calendar-day"></i> Today
		</button>
		
		<span class="date-info"><?php echo $formatted_date; ?> (<?php echo $num_images; ?> images)</span>
	</div>

<?php
if ($num_images == 0) {
	echo "<p>$back_button</p>";
	echo "<div class='noImages'>No images for $formatted_date</div>";
} else {
	echo "<table class='imagesHeader'>";
		echo "<tr>";
			echo "<td class='headerButton'>$back_button</td>";
			echo "<td class='headerTitle'>$title - $formatted_date</td>";
		echo "</tr>";
		echo "<tr>";
			echo "<td colspan='2'><div class='imagesSortOrder'>$num_images images - ";
			echo ($thumbnailsortorder === "descending") ? "Sorted newest to oldest" : "Sorted oldest to newest";
			echo "</div></td>";
		echo "</tr>";
	echo "</table>";
	
	// Try to create thumbnails directory
	$thumb_dir = "$dir/thumbnails";
	$can_create_thumbs = false;
	if (is_dir($thumb_dir)) {
		$can_create_thumbs = true;
	} else {
		// Try to create with recursive flag
		if (@mkdir($thumb_dir, 0775, true)) {
			$can_create_thumbs = true;
		}
	}
	
	echo "<div class='archived-files'>\n";
	
	foreach ($images as $image) {
		$image_path = "$dir/$image";
		$thumbnail = "$thumb_dir/$image";
		
		// Use thumbnail if exists, otherwise try to create it, or use full image
		if (file_exists($thumbnail)) {
			$display_image = $thumbnail;
		} else if ($can_create_thumbs && make_thumb($image_path, $thumbnail, $thumbnailSizeX)) {
			$display_image = $thumbnail;
			flush();
		} else {
			// Can't create thumbnail, use full image
			$display_image = $image_path;
		}
		
		// Extract time from filename (YYYYMMDD_HHMMSS.jpg)
		$time = '';
		if (preg_match('/\d{8}_(\d{2})(\d{2})(\d{2})/', $image, $matches)) {
			$time = $matches[1] . ':' . $matches[2] . ':' . $matches[3];
		}
		
		echo "<a href='$image_path'><div class='day-container'><div class='img-text'>";
			echo "<div class='image-container'>";
				echo "<img src='$display_image' title='$image'/>";
			echo "</div>";
			echo "<div class='day-text'>$time</div>";
		echo "</div></div></a>\n";
	}
	
	echo "</div>"; // archived-files
	echo "<div class='archived-files-end'></div>";
	echo "<div class='archived-files'><hr></div>";
}
?>

<script>
function navigateToDate(date) {
	window.location.href = '?date=' + date;
}
</script>

</body>
</html>
