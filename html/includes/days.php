<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function ListDays()
{

	// TODO: We're not sure if we like the font awesome icons or thumbnails of
	// the video/startrails/keograms so for now, disable it.
	$useThumbnailsIfExist = false;

	global $page;
	global $pageHeaderTitle, $pageIcon;
	global $fa_size, $fa_size_px;
	global $useMeteors;

	if (! is_dir(ALLSKY_IMAGES)) {
		echo "<br><div class='errorMsgBig'>";
		echo "ERROR: '" . ALLSKY_IMAGES . "' directory is missing!";
		echo "</div>";
		return;
	}

	$date = getVariableOrDefault($_POST, 'delete_directory', null);
	if ($date !== null) {
		$msg = delete_directory(ALLSKY_IMAGES . "/$date");
		if ($msg == "") {
			echo "<div class='alert alert-success'>Deleted directory $date</div>";
		} else {
			echo "<div class='alert alert-danger'><b>Unable to delete directory for $date</b>: $msg</div>";
		}
	}

	// Get list of directories.
	$days = getValidImageDirectories();
	if (count($days) > 0) arsort($days);
?>

<style>
	table th {
		text-align:center;
		padding: 0 10px;
	}
	table tr td {
		padding: 0 10px;
	}
</style>
<div class="row">
	<div class="col-lg-12">
	<div class="panel panel-allsky">
	<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
	<div class="panel-body">
	<div class="row">
	<form action="?page=<?php echo $page ?>" method="POST"
		onsubmit="return confirm('Are you sure you want to delete ALL images for that day?');">
	<table style='margin-top: 15px; text-align:center'>
	  <thead>
			<tr style="border-bottom: 1px solid #888">
				<th style="text-align:center">Day</th>
				<th style="text-align:center">Images</th>
				<th style="text-align:center">Timelapse</th>
				<th style="text-align:center">Keogram</th>
				<th style="text-align:center">Startrails</th>
<?php if ($useMeteors) { ?>
				<th style="text-align:center">Meteors</th>
<?php } ?>
			</tr>
	  </thead>
	  <tbody>
		<tr>
			<td style='font-weight:bold'>All</td>
			<td><span title="There are too many total images to view on one page.">-</span></td>
			<td><?php insertHref("list_videos", "All"); ?></td>
			<td><?php insertHref("list_keograms", "All"); ?></td>
			<td><?php insertHref("list_startrails", "All"); ?></td>
<?php if ($useMeteors) { ?>
			<td><?php insertHref("list_meteors", "All"); ?></td>
<?php } ?>

			<!-- don't allow deleting All directories - too risky -->
			<td style='padding: 22px 0'><span title="You cannot delete All files at once.">-</span></td>
		</tr>
<?php

foreach ($days as $day) {
	// See if this day has ANY valid images or videos.
	$i = getValidImageNames(ALLSKY_IMAGES . "/$day", true);	// true == stop after 1
	$has_images = (count($i) > 0);

	$has_timelapse = (glob(ALLSKY_IMAGES . "/$day/*.mp4") != false);

	// For keograms and startrails assume if the directory exists a file does too.
	$has_keogram = is_dir(ALLSKY_IMAGES . "/$day/keogram");
	$has_startrails = is_dir(ALLSKY_IMAGES . "/$day/startrails");

	// It's very possible there will be no meteor files
	$has_meteors = is_dir(ALLSKY_IMAGES . "/$day/meteors");
	if ($has_meteors) {
		$i = getValidImageNames(ALLSKY_IMAGES . "/$day/meteors", true);	// true == stop after 1
		$has_meteors = (count($i) > 0);
	}

	if (! $has_images && ! $has_timelapse && ! $has_keogram && ! $has_startrails && ! $has_meteors) {
		echo "<script>console.log('Directory \"$day\" has no images, timelapse, et.al.; ignoring.');</script>";
		continue;
	}

	echo "\t\t<tr>\n";
	echo "\t\t\t<td style='font-weight:bold'>$day</td>\n";

	echo "\t\t\t<td>";
	if ($has_images) {
		$icon = "<i class='fa fa-image fa-{$fa_size} fa-fw'></i>";
		echo "<a href='index.php?page=list_images&day=$day' title='Images'>$icon</a>";
	} else {
		echo "none";
	}
	echo "</td>\n";

	echo "\t\t\t<td>";
	if ($has_timelapse) {
		$icon = "";
		if ($useThumbnailsIfExist) {
			$t = ALLSKY_IMAGES . "/$day/thumbnail-$day.{jpg,png}";
			$thumb = glob($t, GLOB_BRACE);
			if ($thumb !== false) {
				// "/images" is an alias in the web server for ALLSKY_IMAGES
				$images_dir = "/images";
				$thumb = str_replace(ALLSKY_IMAGES, "/images", $thumb[0]);
				// 22px is roughly the width of a "fa-lg fa-fw" icon.
				$icon = "<img src='$thumb' width='{$fa_size_px}px'>";
			}
		}
		insertHref("list_videos", $day, false, $icon);
	} else {
		echo "none";
	}
	echo "</td>\n";

	echo "\t\t\t<td>";
	if ($has_keogram) {
# TODO: create and use keogram thumbnails (they should probably be about 400px high because
# a "regular" thumbnail is only 100 px wide so you can't see any details.
		insertHref("list_keograms", $day);
	} else {
		echo "none";
	}
	echo "</td>\n";

	echo "\t\t\t<td>";
	if ($has_startrails) {
# TODO: create and use startrails thumbnails.
		insertHref("list_startrails", $day);
	} else {
		echo "none";
	}
	echo "</td>\n";

if ($useMeteors) {
	echo "\t\t\t<td>";
	if ($has_meteors) {
# TODO: create and use meteors thumbnails.
		insertHref("list_meteors", $day);
	} else {
		echo "none";
	}
	echo "</td>\n";
}

	echo "\t\t\t<td style='padding: 5px'>
				<button type='submit' data-toggle='confirmation'
					class='btn btn-delete' name='delete_directory' value='$day'>
					<i class='fa fa-trash'></i> <span class='hidden-xs'>Delete</span>
				</button>
			</td>
		</tr>";
}
?>
	  </tbody>
	</table>
	</form>
	</div><!-- /.row -->
	</div><!-- /.panel-body -->
	</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}

// Helper functions
function delete_directory($directory_name)
{
	global $page;

	// First make sure this is a valid directory.
	if (! is_valid_directory($directory_name)) {
		return "Invalid directory name.";
	}

	// If there is any output it's from an error message.
	$output = null;
	$retval = null;
	exec("sudo rm -r '$directory_name' 2>&1", $output, $retval);
	if ($output == null) {
		if ($retval != 0)
			$output = "Unknown error, retval=$retval.";
		else
			$output = "";
	} else {
		$output = $output[0];	// exec() return output as an array
	}
	return $output;
}
?>
