<?php

function ListImages() {
	global $imagesSortOrder;

	$images = array();
	$chosen_day = $_GET['day'];
	$num = 0;	// Keep track of count so we can tell user when no files exist.
	$dir = ALLSKY_IMAGES . "/$chosen_day";

	if ($handle = opendir($dir)) {
		while (false !== ($image = readdir($handle))) {
			// Name format: "image-YYYYMMDDHHMMSS.jpg" or .jpe or .png
			if (preg_match('/^\w+-.*\d{14}[.](jpe?g|png)$/i', $image)){
				$images[] = $image;
				$num += 1;
			}
		}
		closedir($handle);
	}

	if ($num > 0) {
		if ($imagesSortOrder === "descending") {
			arsort($images);
			$sortOrder = "Sorted newest to oldest (descending)";
		} else {
			asort($images);
			$sortOrder = "Sorted oldest to newest (ascending)";
		}
		$sortOrder = "<span style='font-size: 80%;'>$sortOrder</span>";
	} else {
		$sortOrder = "";
	}
?>

<link href="documentation/css/viewer.min.css" rel="stylesheet">
<script src="js/viewer.min.js"></script>
<script src="js/jquery-viewer.min.js"></script>

<script>
$( document ).ready(function() {
	$('#images').viewer({
		url(image) {
			return image.src.replace('/thumbnails', '');
		},
		transition: false
	});
	$('.thumb').each(function(){		
		this.title += "\n" + getTimeStamp(this.src) + "\n" + "Click for full resolution image.";
	});
});

function getTimeStamp(url)
{
	var filename = url.substring(url.lastIndexOf('/')+1);			// everything after the last "/"
	var timeStamp = filename.substr(filename.lastIndexOf('-')+1);	// everything after the last "-"
	// YYYY MM DD HH MM SS
	// 0123 45 67 89 01 23
	var year = timeStamp.substr(0, 4);
	var month = timeStamp.substr(4, 2);
	var day = timeStamp.substr(6, 2);
	var hour = timeStamp.substr(8, 2);
	var minute = timeStamp.substr(10, 2);
	var second = timeStamp.substr(12, 2);
	var date = new Date(year, month-1, day, hour, minute, second, 0);
	return date.toDateString() + " @ " + hour + ":" + minute + ":" + second;
}
</script>
<h2><?php echo "$chosen_day &nbsp; &nbsp; $sortOrder"; ?></h2>
<div class='row'>
	<div id='images'>
<?php
	if ($num == 0) {
		echo "<span class='alert-warning'>There are no images for this day.</span>";
		echo "<br>Check <b>$dir</b>";
	} else {
		foreach ($images as $image) {
			echo "\t\t<div class='left'>";
			if(file_exists("$dir/thumbnails/$image"))
				// "/images" is an alias for ALLSKY_IMAGES in lighttpd
				$t = "/thumbnails";
			else
				$t = "";
			echo "<img src='/images/$chosen_day$t/$image' title='$image' class='thumb thumbBorder'/>";
			echo "</div>\n";
		}
	}
?>
	</div>
</div>
<?php 
}
?>
