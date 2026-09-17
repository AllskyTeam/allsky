<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function ListMeteors($aDay = null)
{
	global $pageIcon, $pageHelp, $useMeteorsMarked;

	$day = $aDay === null ? (string) getVariableOrDefault($_REQUEST, 'day', '') : (string) $aDay;
	if (!preg_match('/^\d{8}$/', $day)) {
		echo "<div class='panel panel-allsky'><div class='panel-heading'>Displaying meteors</div><div class='panel-body'>";
		echo "<div class='alert alert-danger'>ERROR: Invalid or missing 'day' parameter.</div></div></div>";
		return;
	}

	$meteorDirectory = ALLSKY_IMAGES . "/$day/meteors";
	$thumbnailDirectory = $meteorDirectory . "/thumbnails";
	$deleteMessage = '';
	$deleteType = 'success';
	$deleteName = (string) getVariableOrDefault($_POST, 'delete_meteor', '');
	if ($deleteName !== '') {
		if (!CSRFValidate()) {
			$deleteMessage = 'Unable to delete meteor: invalid CSRF token.';
			$deleteType = 'danger';
		} else if (!preg_match('/^meteors-' . $day . '\d{6}\.(jpg|png)$/i', $deleteName)) {
			$deleteMessage = 'Unable to delete meteor: invalid file name.';
			$deleteType = 'danger';
		} else {
			$baseName = pathinfo($deleteName, PATHINFO_FILENAME);
			$extension = pathinfo($deleteName, PATHINFO_EXTENSION);
			$markedName = $baseName . '-marked.' . $extension;
			$filesToDelete = [
				$meteorDirectory . '/' . $deleteName,
				$thumbnailDirectory . '/' . $deleteName,
				$meteorDirectory . '/' . $markedName,
				$thumbnailDirectory . '/' . $markedName,
				$meteorDirectory . '/' . $baseName . '.json',
			];
			$existingFiles = array_filter($filesToDelete, 'is_file');
			if (count($existingFiles) === 0) {
				$deleteMessage = "Meteor $deleteName was not found in $meteorDirectory.";
				$deleteType = 'warning';
			} else {
				$command = 'sudo rm -f ' . implode(' ', array_map('escapeshellarg', $existingFiles));
				$output = [];
				$returnCode = 0;
				exec($command . ' 2>&1', $output, $returnCode);
				if ($returnCode === 0) {
					$deleteMessage = "Deleted meteor $deleteName.";
				} else {
					$deleteMessage = 'Unable to delete meteor: ' . implode(' ', $output);
					$deleteType = 'danger';
				}
			}
		}
	}

	$meteorFiles = [];
	if (is_dir($meteorDirectory)) {
		$files = scandir($meteorDirectory);
		if ($files !== false) {
			foreach ($files as $file) {
				if (preg_match('/^meteors-' . $day . '(\d{6})\.(jpg|png)$/i', $file, $matches)) {
					$meteorFiles[] = [
						'name' => $file,
						'time' => $matches[1],
					];
				}
			}
		}
	}

	usort($meteorFiles, function ($left, $right) {
		return strcmp($left['name'], $right['name']);
	});

	$dateObject = DateTimeImmutable::createFromFormat('!Ymd', $day);
	$displayDate = $dateObject !== false ? $dateObject->format('d-M-Y') : $day;
	$title = "Meteors for $displayDate";

	echo "<div class='panel panel-allsky'>";
	echo "<div class='panel-heading clearfix'>";
	echo "<span><i class='" . htmlspecialchars($pageIcon, ENT_QUOTES) . "'></i> " . htmlspecialchars($title) . "</span>";
	if (!empty($pageHelp)) {
		echo "<a class='pull-right' href='" . htmlspecialchars($pageHelp, ENT_QUOTES) . "' target='_blank' rel='noopener noreferrer' data-toggle='tooltip' data-container='body' data-placement='left' title='Help'>";
		echo "<i class='fa-solid fa-circle-question'></i> Help</a>";
	}
	echo "</div><div class='panel-body'>";
	echo "<div class='functions-listfiletype-back'><a href='javascript:history.back()' class='btn btn-default'><i class='fa fa-arrow-left'></i> Back</a></div>";
	if ($deleteMessage !== '') {
		echo "<div class='alert alert-" . htmlspecialchars($deleteType, ENT_QUOTES) . "'>" . htmlspecialchars($deleteMessage, ENT_QUOTES) . "</div>";
	}

	if (count($meteorFiles) === 0) {
		echo "<div class='as-wifi-placeholder as-wifi-placeholder-error functions-listfiletype-error'>";
		echo "<div class='as-wifi-placeholder-icon'><i class='fa fa-triangle-exclamation'></i></div>";
		echo "<div class='as-wifi-placeholder-title'>No meteors found</div>";
		echo "<div class='as-wifi-placeholder-text'>There are no meteor images for " . htmlspecialchars($day, ENT_QUOTES) . ".</div></div>";
		echo "</div></div>";
		return;
	}

	echo "<div class='table-responsive'><table class='table table-striped table-hover'><thead><tr>";
	echo "<th>Day</th><th>Time</th><th>Thumbnail</th>";
	if ($useMeteorsMarked) {
		echo "<th>Marked</th>";
	}
	echo "<th>Delete</th>";
	echo "</tr></thead><tbody>";
	foreach ($meteorFiles as $meteor) {
		$name = $meteor['name'];
		$baseName = pathinfo($name, PATHINFO_FILENAME);
		$extension = pathinfo($name, PATHINFO_EXTENSION);
		$markedName = $baseName . '-marked.' . $extension;
		$imageUrl = '/images/' . rawurlencode($day) . '/meteors/' . rawurlencode($name);
		$thumbnailUrl = '/images/' . rawurlencode($day) . '/meteors/thumbnails/' . rawurlencode($name);
		$markedImagePath = $meteorDirectory . '/' . $markedName;
		$markedExists = is_file($markedImagePath);
		$markedImageUrl = '/images/' . rawurlencode($day) . '/meteors/' . rawurlencode($markedName);
		$markedThumbnailUrl = '/images/' . rawurlencode($day) . '/meteors/thumbnails/' . rawurlencode($markedName);
		$lightboxSize = getLightboxSizeAttribute($meteorDirectory . '/' . $name);

		echo '<tr>';
		echo '<td>' . htmlspecialchars($day, ENT_QUOTES) . '</td>';
		echo '<td>' . htmlspecialchars(substr($meteor['time'], 0, 2) . ':' . substr($meteor['time'], 2, 2) . ':' . substr($meteor['time'], 4, 2), ENT_QUOTES) . '</td>';
		echo '<td><a href="' . htmlspecialchars($imageUrl, ENT_QUOTES) . '" data-lg-size="' . htmlspecialchars($lightboxSize, ENT_QUOTES) . '">';
		echo '<img src="' . htmlspecialchars($thumbnailUrl, ENT_QUOTES) . '" alt="' . htmlspecialchars($name, ENT_QUOTES) . '" loading="lazy" width="100" height="100">';
		echo '</a></td>';
		if ($useMeteorsMarked) {
			echo '<td>';
			if ($markedExists) {
				echo '<a href="' . htmlspecialchars($markedImageUrl, ENT_QUOTES) . '" data-lg-size="' . htmlspecialchars(getLightboxSizeAttribute($markedImagePath), ENT_QUOTES) . '">';
				echo '<img src="' . htmlspecialchars($markedThumbnailUrl, ENT_QUOTES) . '" alt="' . htmlspecialchars($markedName, ENT_QUOTES) . '" loading="lazy" width="100" height="100">';
				echo '</a>';
			} else {
				echo '-';
			}
			echo '</td>';
		}
		echo '<td><form method="post" action="index.php?page=list_meteors&amp;day=' . rawurlencode($day) . '" onsubmit="return confirm(\'Delete this meteor and its related files?\');">';
		echo '<input type="hidden" name="delete_meteor" value="' . htmlspecialchars($name, ENT_QUOTES) . '">';
		CSRFToken();
		echo '<button type="submit" class="btn btn-danger btn-sm" title="Delete meteor"><i class="fa fa-trash"></i></button></form></td></tr>';
	}
	echo '</tbody></table></div></div></div>';

	echo addAsset([
		'/js/lightgallery/css/lightgallery-bundle.min.css',
		'/js/lightgallery/css/lg-transitions.css',
		'/js/lightgallery/lightgallery.min.js',
		'/js/lightgallery/plugins/zoom/lg-zoom.min.js',
		'/js/lightgallery/plugins/thumbnail/lg-thumbnail.min.js'
	]);
?>
<script>
$(document).ready(function () {
  const galleryElement = document.querySelector('.table tbody');
  if (!galleryElement) {
    return;
  }

  lightGallery(galleryElement, {
    selector: 'a[data-lg-size]',
    plugins: [lgZoom, lgThumbnail],
    mode: 'lg-slide-circular',
    speed: 0,
    download: false,
    thumbnail: true
  });
});
</script>
<?php
}

?>
