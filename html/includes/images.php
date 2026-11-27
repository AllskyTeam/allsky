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
	echo "  <div class='functions-listfiletype-back images-toolbar'>";
	echo "      <a href='javascript:history.back()' class='btn btn-default'>";
	echo "          <i class='fa fa-arrow-left'></i> Back";
	echo "      </a>";
	echo "      <div class='images-toolbar-actions'>";
	echo "          <button type='button' class='btn btn-default' id='images-sort-toggle' title='Change the sort order'>";
	echo "              <i class='fa'></i> <span></span>";
	echo "          </button>";
	echo "          <button type='button' class='btn btn-default' id='images-select-toggle' aria-pressed='false' title='Select images to delete. Click an image to select it, Shift+click to select a range.'>";
	echo "              <i class='fa fa-square-check'></i> Select";
	echo "          </button>";
	echo "          <button type='button' class='btn btn-danger hidden' id='images-delete-selected' disabled>";
	echo "              <i class='fa fa-trash'></i> <span>Delete 0</span>";
	echo "          </button>";
	echo "      </div>";
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
  const defaultSortOrder = <?php echo json_encode($imagesSortOrder === "descending" ? "descending" : "ascending"); ?>;
  const thumbWidth = <?php echo (int) $width; ?>;
  const thumbHeight = <?php echo (int) $height; ?>;
  const batchSize = 60;
	  const galleryElement = document.getElementById('lightgallery');
	  const loadingElement = document.getElementById('images-grid-loading');
	  const sentinelElement = document.getElementById('images-grid-sentinel');
	  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	  let renderedCount = 0;
	  let sortOrder = defaultSortOrder;	// the order imageItems is in
	  const selectedNames = new Set();
	  let selecting = false;
	  let lastSelectedIndex = -1;	// start of a Shift+click range
	  let deleting = false;	// a delete request is running
	  let lightboxClosing = false;

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
	      '<a class="images-grid-item' + (selectedNames.has(item.name) ? ' images-selected' : '') + '" href="' + imagePath + '" data-name="' + safeName + '" data-lg-size="' + lightboxSize + '">' +
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

  // Sort order. The Allsky setting is the default; a choice made here is remembered by the browser.
  const sortOrderKey = 'allsky.images.sortOrder';
  const sortToggle = document.getElementById('images-sort-toggle');
  const sortOrderText = document.querySelector('.imagesSortOrder');

  function setSortOrder(order) {
    if (order !== sortOrder) {
      imageItems.reverse();
      sortOrder = order;
      lastSelectedIndex = -1;
    }
    const descending = (sortOrder === 'descending');
    sortToggle.querySelector('i').className = 'fa ' + (descending ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-short-wide');
    sortToggle.querySelector('span').textContent = descending ? 'Newest first' : 'Oldest first';
    if (sortOrderText) {
      sortOrderText.textContent = descending ? 'Sorted newest to oldest (descending)' : 'Sorted oldest to newest (ascending)';
    }
  }

  sortToggle.addEventListener('click', function () {
    setSortOrder(sortOrder === 'descending' ? 'ascending' : 'descending');
    try {
      window.localStorage.setItem(sortOrderKey, sortOrder);
    } catch (e) {
      // Not remembered, but the new order still applies to this page.
    }
    galleryElement.innerHTML = '';
    renderedCount = 0;
    sentinelElement.classList.remove('hidden');
    renderNextBatch();
  });

  let storedSortOrder = null;
  try {
    storedSortOrder = window.localStorage.getItem(sortOrderKey);
  } catch (e) {
    // Use the default.
  }
  setSortOrder(storedSortOrder === 'ascending' || storedSortOrder === 'descending' ? storedSortOrder : defaultSortOrder);

  // Selection mode. Clicking a thumbnail selects it instead of opening it.
  const selectToggle = document.getElementById('images-select-toggle');
  const deleteSelectedButton = document.getElementById('images-delete-selected');

  function updateSelection() {
    galleryElement.classList.toggle('images-selecting', selecting);
    selectToggle.classList.toggle('active', selecting);
    selectToggle.setAttribute('aria-pressed', selecting ? 'true' : 'false');
    deleteSelectedButton.classList.toggle('hidden', !selecting);
    deleteSelectedButton.disabled = (deleting || selectedNames.size === 0);
    deleteSelectedButton.querySelector('span').textContent = 'Delete ' + selectedNames.size;
    galleryElement.querySelectorAll('a.images-grid-item').forEach(function (a) {
      a.classList.toggle('images-selected', selectedNames.has(a.dataset.name));
    });
  }

  selectToggle.addEventListener('click', function () {
    if (deleting) {
      return;
    }
    selecting = !selecting;
    selectedNames.clear();
    lastSelectedIndex = -1;
    updateSelection();
  });

  // Use the capture phase so this runs before lightGallery's click handler on the thumbnail.
  galleryElement.addEventListener('click', function (event) {
    if (!selecting) {
      return;
    }
    const anchor = event.target.closest('a.images-grid-item');
    if (!anchor) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const index = imageItems.findIndex(function (item) { return item.name === anchor.dataset.name; });
    if (deleting || index < 0) {
      return;
    }
    const select = !selectedNames.has(anchor.dataset.name);
    const range = (event.shiftKey && lastSelectedIndex >= 0);
    const from = range ? Math.min(index, lastSelectedIndex) : index;
    const to = range ? Math.max(index, lastSelectedIndex) : index;
    for (let i = from; i <= to; i++) {
      if (select) {
        selectedNames.add(imageItems[i].name);
      } else {
        selectedNames.delete(imageItems[i].name);
      }
    }
    lastSelectedIndex = index;
    updateSelection();
  }, true);

  // Delete the named images, then remove the ones that were deleted from the page.
  function deleteImages(names, onDeleted) {
    deleting = true;
    updateSelection();
    return $.ajax({
      url: 'includes/imagesutil.php?request=DeleteImage',
      method: 'POST',
      dataType: 'json',
      data: { day: chosenDay, images: JSON.stringify(names) }
    }).done(function (result) {
      const deleted = new Set(result.deleted || []);
      const failed = result.failed || [];
      const messages = [];

      galleryElement.querySelectorAll('a.images-grid-item').forEach(function (a) {
        if (deleted.has(a.dataset.name)) {
          a.remove();
        }
      });
      for (let i = imageItems.length - 1; i >= 0; i--) {
        if (deleted.has(imageItems[i].name)) {
          imageItems.splice(i, 1);
          if (i < renderedCount) {
            renderedCount--;
          }
        }
      }
      deleted.forEach(function (name) { selectedNames.delete(name); });
      lastSelectedIndex = -1;

      if (failed.length > 0) {
        messages.push(failed.length + (failed.length === 1 ? ' image' : ' images') + ' could not be deleted.' +
          (result.message ? '\n' + result.message : ''));
      }
      if (deleted.size > 0 && result.dbRows === -1) {
        messages.push('The images were deleted but the database was not updated.');
      }
      if (messages.length > 0) {
        window.alert(messages.join('\n\n'));
      }
      if (deleted.size > 0) {
        onDeleted();
      }
    }).fail(function (xhr) {
      window.alert((xhr.responseJSON && xhr.responseJSON.message) || 'Unable to delete.');
    }).always(function () {
      deleting = false;
      updateSelection();
    });
  }

  // Bring the grid and the lightbox up to date after images were removed.
  function refreshGrid() {
    gallery.refresh();
    if (imageItems.length === 0) {
      loadingElement.textContent = 'No images left for this day';
      sentinelElement.classList.add('hidden');
    } else if (renderedCount >= imageItems.length ||
        sentinelElement.getBoundingClientRect().top < window.innerHeight + 400) {
      // The sentinel may already be in view, in which case it will not trigger again.
      renderNextBatch();
    } else {
      loadingElement.textContent = 'Loaded ' + renderedCount + ' of ' + imageItems.length + ' images';
    }
  }

  deleteSelectedButton.addEventListener('click', function () {
    const names = Array.from(selectedNames);
    const what = names.length + ' selected ' + (names.length === 1 ? 'image' : 'images');
    if (names.length === 0 || !window.confirm('Are you sure you want to permanently delete ' + what + '?')) {
      return;
    }
    deleteImages(names, refreshGrid);
  });

  galleryElement.addEventListener('lgBeforeClose', function () { lightboxClosing = true; });
  galleryElement.addEventListener('lgAfterClose', function () { lightboxClosing = false; });

  function deleteCurrentImage(button) {
    // Use lightGallery's own list so the name is always that of the image being shown.
    const index = gallery.index;
    const anchor = gallery.items[index];
    const name = anchor && anchor.dataset.name;
    if (deleting || !name || !window.confirm('Are you sure you want to permanently delete ' + name + '?')) {
      return;
    }
    button.disabled = true;
    deleteImages([name], function () {
      // The lightbox may have been closed while the request was running.
      if (!gallery.lgOpened) {
        refreshGrid();
        return;
      }
      // lightGallery only sees the changed list once it is closed, so close it,
      // then open it again on the image that took the place of the deleted one.
      // If it is already closing, wait for that to finish and leave it closed.
      const reopen = !lightboxClosing;
      galleryElement.addEventListener('lgAfterClose', function () {
        refreshGrid();
        if (reopen && renderedCount > 0) {
          window.setTimeout(function () {
            gallery.openGallery(Math.min(index, renderedCount - 1));
          }, 0);
        }
      }, { once: true });
      if (reopen) {
        gallery.closeGallery();
      }
    }).always(function () {
      button.disabled = false;
    });
  }

  // Add a delete button to the lightbox toolbar.
  galleryElement.addEventListener('lgAfterOpen', function () {
    const toolbar = document.querySelector('.lg-container .lg-toolbar');
    if (!toolbar || toolbar.querySelector('.lg-delete')) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lg-icon lg-delete';
    button.title = 'Delete this image';
    button.setAttribute('aria-label', 'Delete this image');
    button.innerHTML = '<i class="fa fa-trash"></i>';
    button.addEventListener('click', function () { deleteCurrentImage(button); });
    toolbar.appendChild(button);
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
