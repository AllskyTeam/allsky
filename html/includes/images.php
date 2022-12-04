<?php

function ListImages(){

$images = array();
$chosen_day = $_GET['day'];
$num = 0;	// Keep track of count so we can tell user when no files exist.
$dir = ALLSKY_IMAGES . "/$chosen_day";

if ($handle = opendir($dir)) {
    while (false !== ($image = readdir($handle))) {
	$ext = explode(".",$image);
		// Allow "image-YYYYMMDDHHMMSS.jpg" and "image-resized-YYYYMMDDHHMMSS.jpg"
        if (preg_match('/^\w+-.*\d{14}[.](jpe?g|png)$/i', $image)){
            $images[] = $image;
	    $num += 1;
        }
    }
    closedir($handle);
}

if ($num > 0) asort($images);

?>

<link  href="documentation/css/viewer.min.css" rel="stylesheet">
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
	var year = timeStamp.substring(0, 4);
	var month = timeStamp.substring(4, 6);
	var day = timeStamp.substring(6, 8);
	var hour = timeStamp.substring(8, 10);
	var minute = timeStamp.substring(10, 12);
	var seconds = timeStamp.substring(12, 14);
	var date = new Date(year, month-1, day, hour, minute, seconds, 0);
	return date.toDateString() + " @ " + hour + ":"+minute + ":"+seconds;
}
</script>
<h2><?php echo $chosen_day ?></h2>
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
