<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function ListImages() {
	global $imagesSortOrder;

	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		echo "<br><br><br>";
		echo "<h2 class='alert-danger'>ERROR: No 'day' specified in URL.</h2>";
		return;
	}

	$dir = ALLSKY_IMAGES . "/$chosen_day";
	$images = getValidImageNames($dir, false);	// false == get whole list
	if (count($images) > 0) {
		if ($imagesSortOrder === "descending") {
			arsort($images);
			$sortOrder = "Sorted newest to oldest (descending)";
		} else {
			asort($images);
			$sortOrder = "Sorted oldest to newest (ascending)";
		}
		$sortOrder = "<span class='imagesSortOrder'>$sortOrder</span>";
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
	if (count($images) == 0) {
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
			echo "<img src='/images/$chosen_day$t/$image' title='$image' class='thumb thumbBorder'/ loading='lazy'>";
			echo "</div>\n";
		}
	}
?>
	</div>
</div>
<?php 
}
?>
