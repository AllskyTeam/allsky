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
	global $pageHeaderTitle, $pageIcon, $pageHelp;
	global $fa_size, $fa_size_px;

	if (! is_dir(ALLSKY_IMAGES)) {
		echo "<br><div class='errorMsgBig'>";
		echo "ERROR: '" . ALLSKY_IMAGES . "' directory is missing!";
		echo "</div>";
		return;
	}

	$date = getVariableOrDefault($_POST, 'delete_directory', null);
	if ($date !== null) {
		if (CSRFValidate()) {
			$msg = delete_directory($date);
			$displayDate = htmlspecialchars(is_scalar($date) ? (string) $date : "", ENT_QUOTES);
			$displayMsg = htmlspecialchars((string) $msg, ENT_QUOTES);
			if ($msg == "") {
				echo "<div class='alert alert-success'>Deleted directory $displayDate</div>";
			} else {
				echo "<div class='alert alert-danger'><b>Unable to delete directory for $displayDate</b>: $displayMsg</div>";
			}
		}
	}

	// Get list of directories.
	$days = getValidImageDirectories();
	if (count($days) > 0) arsort($days);

	$timezoneName = trim((string) @file_get_contents('/etc/timezone'));
	if ($timezoneName === '') {
		$timezoneName = date_default_timezone_get();
	}
	$displayTimezone = new DateTimeZone($timezoneName);
?>
<div class="row">
	<div class="col-lg-12">
	<div class="panel panel-allsky">
	<div class="panel-heading clearfix">
        <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
		<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
    </div>
	<div class="panel-body">
	<div class="row">
		<div class="col-md-12">
		<div class="well well-sm system-summary-card days-summary-card">
	<form action="?page=<?php echo $page ?>" method="POST"
		onsubmit="return confirm('Are you sure you want to delete ALL images for that day?');">
		<div class="days-summary-header">
			<h4>Available Days</h4>
		</div>
		<div class="days-grid">
		<div class="days-grid-card days-grid-header">
			<div class="row days-grid-row">
				<div class="col-sm-2 days-day-col">
					<button type="button" class="btn btn-link days-sort-toggle" data-sort="day" aria-label="Sort by day">
						<span class="days-grid-label">Day</span>
						<span class="days-sort-icons" aria-hidden="true">
							<i class="fa fa-caret-up days-sort-up"></i>
							<i class="fa fa-caret-down days-sort-down"></i>
						</span>
					</button>
				</div>
				<div class="col-sm-2 hidden-xs hidden-sm">
					<span class="days-grid-label">Date</span>
				</div>
				<div class="col-sm-8 days-actions-col">
					<div class="row days-grid-actions">
						<div class="col-xs-3 text-center days-action-col"><span class="days-grid-label">Images</span></div>
						<div class="col-xs-3 text-center days-action-col"><span class="days-grid-label">Timelapse</span></div>
						<div class="col-xs-2 text-center days-action-col"><span class="days-grid-label">Keogram</span></div>
						<div class="col-xs-2 text-center days-action-col"><span class="days-grid-label">Startrails</span></div>
						<div class="col-xs-2 text-right hidden-xs"></div>
					</div>
				</div>
			</div>
		</div>
		<div class="days-grid-list">
			<div class="row days-grid-row days-grid-row-static" data-sort-day="99999999">
				<div class="col-sm-2 days-day-col">
					<span class="days-grid-value days-table-day">All</span>
				</div>
				<div class="col-sm-2 hidden-xs hidden-sm"><span class="days-grid-value">-</span></div>
				<div class="col-sm-8 days-actions-col">
					<div class="row days-grid-actions">
						<div class="col-xs-3 text-center days-action-col"><span class="days-grid-value"><span title="There are too many total images to view on one page.">-</span></span></div>
						<div class="col-xs-3 text-center days-action-col"><span class="days-grid-value"><?php insertHref("list_videos", "All"); ?></span></div>
						<div class="col-xs-2 text-center days-action-col"><span class="days-grid-value"><?php insertHref("list_keograms", "All"); ?></span></div>
						<div class="col-xs-2 text-center days-action-col"><span class="days-grid-value"><?php insertHref("list_startrails", "All"); ?></span></div>
						<div class="col-xs-2 text-right hidden-xs"><span class="days-grid-value"><span title="You cannot delete All files at once.">-</span></span></div>
					</div>
				</div>
			</div>
<?php

foreach ($days as $day) {
	// See if this day has ANY valid images or videos.
	$i = getValidImageNames(ALLSKY_IMAGES . "/$day", true);	// true == stop after 1
	$has_images = (count($i) > 0);

	$has_timelapse = (glob(ALLSKY_IMAGES . "/$day/*.mp4") != false);

	// For keograms and startrails assume if the directory exists a file does too.
	$has_keogram = is_dir(ALLSKY_IMAGES . "/$day/keogram");
	$has_startrails = is_dir(ALLSKY_IMAGES . "/$day/startrails");

	if (! $has_images && ! $has_timelapse && ! $has_keogram && ! $has_startrails) {
		echo "<script>console.log('Directory \"$day\" has no images, timelapse, et.al.; ignoring.');</script>";
		continue;
	}

	$displayDate = $day;
	$dateObject = DateTimeImmutable::createFromFormat('Ymd', $day, $displayTimezone);
	if ($dateObject !== false) {
		$displayDate = $dateObject->format('j M Y');
	}

	ob_start();
	if ($has_images) {
		$icon = "<i class='fa fa-image fa-fw fa-{$fa_size}'></i>";
		echo "<a href='index.php?page=list_images&day=$day' title='Images'>$icon</a>";
	} else {
		echo "none";
	}
	$imagesHtml = ob_get_clean();

	ob_start();
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
	$timelapseHtml = ob_get_clean();

	ob_start();
	if ($has_keogram) {
# TODO: create and use keogram thumbnails (they should probably be about 400px high because
# a "regular" thumbnail is only 100 px wide so you can't see any details.
		insertHref("list_keograms", $day);
	} else {
		echo "none";
	}
	$keogramHtml = ob_get_clean();

	ob_start();
	if ($has_startrails) {
# TODO: create and use startrails thumbnails.
		insertHref("list_startrails", $day);
	} else {
		echo "none";
	}
	$startrailsHtml = ob_get_clean();

	$deleteHtml = "
				<button type='submit' data-toggle='confirmation'
					class='btn btn-danger btn-sm' name='delete_directory' value='$day'>
					<i class='fa fa-trash'></i> <span class='hidden-xs'>Delete</span>
				</button>
			";

	echo "  <div class='row days-grid-row' data-sort-day='" . htmlspecialchars($day, ENT_QUOTES) . "'>\n";
	echo "    <div class='col-sm-2 days-day-col'><span class='days-grid-value days-table-day'>$day</span></div>\n";
	echo "    <div class='col-sm-2 hidden-xs hidden-sm'><span class='days-grid-value'>" . htmlspecialchars($displayDate) . "</span></div>\n";
	echo "    <div class='col-sm-8 days-actions-col'>\n";
	echo "      <div class='row days-grid-actions'>\n";
	echo "        <div class='col-xs-3 text-center days-action-col'><span class='days-grid-value'>$imagesHtml</span></div>\n";
	echo "        <div class='col-xs-3 text-center days-action-col'><span class='days-grid-value'>$timelapseHtml</span></div>\n";
	echo "        <div class='col-xs-2 text-center days-action-col'><span class='days-grid-value'>$keogramHtml</span></div>\n";
	echo "        <div class='col-xs-2 text-center days-action-col'><span class='days-grid-value'>$startrailsHtml</span></div>\n";
	echo "        <div class='col-xs-2 text-right hidden-xs'><span class='days-grid-value'>$deleteHtml</span></div>\n";
	echo "      </div>\n";
	echo "    </div>\n";
	echo "  </div>\n";
}
?>
	</div>
	</div>
<?php
	CSRFToken();
?>
	</form>
	</div><!-- /.days-summary-card -->
	</div><!-- /.col-md-12 -->
	</div><!-- /.row -->
	</div><!-- /.panel-body -->
	</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}

// Helper functions
function delete_directory($date)
{
	global $page;

	// First make sure this is a valid directory.
	if (! is_valid_directory($date)) {
		return "Invalid directory name.";
	}

	$baseDirectory = realpath(ALLSKY_IMAGES);
	$directory_name = ALLSKY_IMAGES . "/$date";
	$targetDirectory = realpath($directory_name);

	if ($baseDirectory === false || $targetDirectory === false) {
		return "Invalid directory path.";
	}

	$baseDirectoryPrefix = rtrim($baseDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
	if (strpos($targetDirectory, $baseDirectoryPrefix) !== 0) {
		return "Invalid directory path.";
	}

	// If there is any output it's from an error message.
	$output = null;
	$retval = null;
	exec("sudo rm -r " . escapeshellarg($targetDirectory) . " 2>&1", $output, $retval);
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
