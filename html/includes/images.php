<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayImageError($title, $message) {
	?>
		<div class="container" style="max-width:780px;margin-top:20px;">
			<div class="alert alert-danger alert-dismissible fade in as-error" role="alert">
				<div class="as-error-header">
					<h2><strong>Error</strong> <?php echo $title; ?></h2>
				</div>
				<div class="as-error-body">
					<h3>
						<?php echo $message; ?>
					</h3>
				</div>
			</div>
		</div>
	<?php
}

function ListImages() {
	global $imagesSortOrder, $settings_array;


	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		DisplayImageError("Displaying images", "ERROR: No 'day' specified in URL.");
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

	if (count($images) == 0) {
		DisplayImageError("Displaying images", "There are no images for $chosen_day");		
	}

	$width = getVariableOrDefault($settings_array, 'thumbnailsizex', 100);
	$height = getVariableOrDefault($settings_array, 'thumbnailsizey', 100);

	echo '<div id="lightgallery">';
	foreach ($images as $image) {

    echo "<a href='/images/$chosen_day/$image' data-lg-size='1600-2400'>";
    echo "    <img alt='$image' width=$width height=$height src='/images/$chosen_day/thumbnails/$image' loading='lazy' decoding='async' fetchpriority='low' />";
    echo '</a>';

	}
	echo '</div>';

?>
<link type="text/css" rel="stylesheet" href="js/lightgallery/css/lightgallery-bundle.min.css" />
<link type="text/css" rel="stylesheet" href="js/lightgallery/css/lg-transitions.css" />
<script src="js/lightgallery/lightgallery.min.js"></script>
<script src="js/lightgallery/plugins/zoom/lg-zoom.min.js"></script>
<script src="js/lightgallery/plugins/thumbnail/lg-thumbnail.min.js"></script>
<script>
$(document).ready(function () {
  const galleryElement = document.getElementById('lightgallery');
  lightGallery(galleryElement, {
		cssEasing: 'cubic-bezier(0.680, -0.550, 0.265, 1.550)',
    selector: 'a',
    plugins: [lgZoom, lgThumbnail],
		mode: 'lg-slide-circular',
    speed: 400,
    download: false,
    thumbnail: true
  });
});
</script>
<?php

}

?>