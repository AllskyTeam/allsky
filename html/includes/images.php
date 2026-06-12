<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayImageError($title, $message) {
  global $fa_size;

	?>
		<div class="panel panel-allsky">
			<div class="panel-heading"><i class="fa fa-image"></i> <?php echo htmlspecialchars($title); ?></div>
			<div class="panel-body">
				<div class="functions-listfiletype-back">
					<a href="javascript:history.back()" class="btn btn-default">
						<i class="fa fa-arrow-left"></i> Back
					</a>
				</div>
				<div class="as-wifi-placeholder as-wifi-placeholder-error functions-listfiletype-error">
					<div class="as-wifi-placeholder-icon"><i class="fa fa-triangle-exclamation"></i></div>
					<div class="as-wifi-placeholder-title"><?php echo htmlspecialchars($title); ?></div>
					<div class="as-wifi-placeholder-text"><?php echo $message; ?></div>
				</div>
			</div>
		</div>
	<?php
}

function ListImages() {
	global $imagesSortOrder, $settings_array, $pageHeaderTitle, $pageIcon, $pageHelp;


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
		return;
	}

	$width = getVariableOrDefault($settings_array, 'thumbnailsizex', 100);
	$height = getVariableOrDefault($settings_array, 'thumbnailsizey', 100);
	$displayDate = $chosen_day;
	$dateObject = DateTimeImmutable::createFromFormat('Ymd', $chosen_day);
	if ($dateObject !== false) {
		$displayDate = $dateObject->format('j M Y');
	}
	$imageItems = [];

	echo "<div class='panel panel-allsky'>";
	echo "<div class='panel-heading clearfix'>";
	echo "  <span><i class='{$pageIcon}'></i> Images for {$chosen_day} - {$displayDate}</span>";
	if (!empty($pageHelp)) {
		echo "  <a class='pull-right' href='{$pageHelp}' target='_blank' rel='noopener noreferrer' data-toggle='tooltip' data-container='body' data-placement='left' title='Help'>";
		echo "      <i class='fa-solid fa-circle-question'></i> Help";
		echo "  </a>";
	}
	echo "</div>";
	echo "<div class='panel-body'>";
	echo "  <div class='functions-listfiletype-back'>";
	echo "      <a href='javascript:history.back()' class='btn btn-default'>";
	echo "          <i class='fa fa-arrow-left'></i> Back";
	echo "      </a>";
	echo "  </div>";
	echo "  <div class='well well-sm system-summary-card images-summary-card'>";
	echo "      <div class='images-summary-header'>";
	if ($sortOrder !== "") {
		echo "      <p>{$sortOrder}</p>";
	}
	echo "      </div>";
		foreach ($images as $image) {
			$imageTimestampIso = '';
			$imagePath = $dir . '/' . $image;
			if (preg_match('/(\d{14})/', $image, $matches)) {
				$timestamp = $matches[1];
				$imageTimestampIso =
					substr($timestamp, 0, 4) . '-' .
					substr($timestamp, 4, 2) . '-' .
					substr($timestamp, 6, 2) . 'T' .
					substr($timestamp, 8, 2) . ':' .
					substr($timestamp, 10, 2) . ':' .
					substr($timestamp, 12, 2);
			}
			$imageItems[] = [
				'name' => $image,
				'timestamp' => $imageTimestampIso,
				'lgSize' => getLightboxSizeAttribute($imagePath),
			];
		}
	echo "      <div class='images-grid' id='lightgallery'></div>";
	echo "      <div class='images-grid-loading' id='images-grid-loading'>Loading images...</div>";
	echo "      <div class='images-grid-sentinel' id='images-grid-sentinel' aria-hidden='true'></div>";
	echo "  </div>";
	echo "</div>";
	echo "</div>";

	$imageItemsJson = json_encode($imageItems, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

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
  const imageItems = <?php echo $imageItemsJson !== false ? $imageItemsJson : '[]'; ?>;
  const chosenDay = <?php echo json_encode($chosen_day, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
  const thumbWidth = <?php echo (int) $width; ?>;
  const thumbHeight = <?php echo (int) $height; ?>;
  const batchSize = 60;
	  const galleryElement = document.getElementById('lightgallery');
	  const loadingElement = document.getElementById('images-grid-loading');
	  const sentinelElement = document.getElementById('images-grid-sentinel');
	  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	  let renderedCount = 0;

	  function escapeHtml(value) {
	    return String(value)
	      .replace(/&/g, '&amp;')
	      .replace(/</g, '&lt;')
	      .replace(/>/g, '&gt;')
	      .replace(/"/g, '&quot;')
	      .replace(/'/g, '&#39;');
	  }

	  function formatImageTimestamp(value) {
	    const matches = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
	    if (!matches) {
	      return '';
	    }

	    const year = parseInt(matches[1], 10);
	    const month = parseInt(matches[2], 10);
	    const day = parseInt(matches[3], 10);
	    if (
	      year < 1000 ||
	      month < 1 ||
	      month > 12 ||
	      day < 1 ||
	      day > 31
	    ) {
	      return '';
	    }

	    return day + ' ' + monthNames[month - 1] + ' ' + year + ' at ' + matches[4] + ':' + matches[5] + ':' + matches[6];
	  }

	  function buildImageItem(item) {
	    const safeName = escapeHtml(item.name || '');
	    const imagePath = '/images/' + encodeURIComponent(chosenDay) + '/' + encodeURIComponent(item.name || '');
	    const thumbPath = '/images/' + encodeURIComponent(chosenDay) + '/thumbnails/' + encodeURIComponent(item.name || '');
	    const lightboxSize = escapeHtml(item.lgSize || '1600-2400');
	    let dateHtml = '';

	    if (item.timestamp) {
	      const displayTimestamp = formatImageTimestamp(item.timestamp);
	      if (displayTimestamp) {
	        dateHtml = '<span class="images-grid-date">' + escapeHtml(displayTimestamp) + '</span>';
	      }
	    }

	    return (
	      '<a class="images-grid-item" href="' + imagePath + '" data-lg-size="' + lightboxSize + '">' +
	        '<img alt="' + safeName + '" width="' + thumbWidth + '" height="' + thumbHeight + '" src="' + thumbPath + '" loading="lazy" decoding="async" fetchpriority="low" />' +
	        '<span class="images-grid-name">' + safeName + '</span>' +
	        dateHtml +
      '</a>'
    );
  }

  function renderNextBatch() {
    if (renderedCount >= imageItems.length) {
      loadingElement.textContent = 'All images loaded';
      sentinelElement.classList.add('hidden');
      return;
    }

    const nextItems = imageItems.slice(renderedCount, renderedCount + batchSize);
    galleryElement.insertAdjacentHTML('beforeend', nextItems.map(buildImageItem).join(''));
    renderedCount += nextItems.length;
    gallery.refresh();

    if (renderedCount >= imageItems.length) {
      loadingElement.textContent = 'All images loaded';
      sentinelElement.classList.add('hidden');
    } else {
      loadingElement.textContent = 'Loaded ' + renderedCount + ' of ' + imageItems.length + ' images';
    }
  }

  const gallery = lightGallery(galleryElement, {
		cssEasing: 'cubic-bezier(0.680, -0.550, 0.265, 1.550)',
    selector: 'a',
    plugins: [lgZoom, lgThumbnail],
		mode: 'lg-slide-circular',
    speed: 0,
    download: false,
    thumbnail: true
  });

  renderNextBatch();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          renderNextBatch();
        }
      });
    }, {
      rootMargin: '400px 0px'
    });

    observer.observe(sentinelElement);
  } else {
    loadingElement.textContent = 'Scroll down to load more images';
    window.addEventListener('scroll', () => {
      if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 400)) {
        renderNextBatch();
      }
    });
  }
});
</script>
<?php

}

?>
