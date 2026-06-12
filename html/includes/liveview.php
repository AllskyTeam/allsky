<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayLiveView($image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe) {
	global $showUpdatedMessage;
	global $liveViewMode;
	global $pageHeaderTitle, $pageIcon, $pageHelp;

	$myStatus = new StatusMessages();
	$liveViewMode = in_array($liveViewMode, ["fullwidth", "scaled"], true) ? $liveViewMode : "fullwidth";

	// Note: if liveview is left open during a day/night transition the delay will become wrong.
	// For example, if liveview is started during the day we use "daydelay" but then
	// at night we're still using "daydelay" but should be using "nightdelay".
	// The user can fix this by reloading the web page.
	// TODO: Should we automatically reload the page every so often (we already reload the image)?

	if ($darkframe) {
		$myStatus->addMessage('Currently capturing dark frames. You can turn this off in the Allsky Settings page.');
	} else if ($showUpdatedMessage) {
		$s =  number_format($daydelay);
		$msg =  "Daytime images updated every $s seconds$daydelay_postMsg,";
		$s =  number_format($nightdelay);
		$msg .= " nighttime every $s seconds$nightdelay_postMsg";
		$myStatus->addMessage("$msg", "message", false);
	}

	$hasMiniTimelapse = file_exists(ALLSKY_MINITIMELAPSE_FILE);
	$miniTimelapsePlayerUrl = null;
	if ($hasMiniTimelapse) {
		$miniTimelapsePlayerUrl = getListFileTypeVideoPlayerUrl(
			ALLSKY_MINITIMELAPSE_URL,
			getListFileTypeVideoMimeType(basename(ALLSKY_MINITIMELAPSE_URL))
		);
	}
	$currentImageFile = ALLSKY_CURRENT_DIR . '/' . basename((string) parse_url($image_name, PHP_URL_PATH));
	$currentImageLightboxSize = getLightboxSizeAttribute($currentImageFile);

	echo addAsset([
		'/js/lightgallery/css/lightgallery-bundle.min.css',
		'/js/lightgallery/css/lg-transitions.css',
		'/js/lightgallery/lightgallery.min.js',
		'/js/lightgallery/plugins/zoom/lg-zoom.min.js',
		'/js/lightgallery/plugins/thumbnail/lg-thumbnail.min.js',
		'/js/lightgallery/plugins/video/lg-video.min.js',
		'/js/liveview.js'
	]);

?>

	<div
		class="panel panel-allsky liveview-mode-<?php echo htmlspecialchars($liveViewMode, ENT_QUOTES); ?>"
		id="liveview-root"
		data-image-name="<?php echo htmlspecialchars($image_name, ENT_QUOTES); ?>"
		data-refresh-delay="<?php echo (int) $delay; ?>"
		data-live-view-mode="<?php echo htmlspecialchars($liveViewMode, ENT_QUOTES); ?>"
	>
		<div class="panel-heading clearfix">
            <span class="pull-left"><i class="<?php echo htmlspecialchars($pageIcon, ENT_QUOTES); ?>"></i> <?php echo htmlspecialchars($pageHeaderTitle, ENT_QUOTES); ?>
<?php
		if ($hasMiniTimelapse) {
?>

			<span class='nowrap'>&nbsp; &nbsp;
			<a id="mini_timelapse_lightbox" class="liveview-lightgallery-item" href="<?php echo htmlspecialchars($miniTimelapsePlayerUrl ?? ALLSKY_MINITIMELAPSE_URL, ENT_QUOTES); ?>" data-iframe="true" data-download-url="<?php echo htmlspecialchars(ALLSKY_MINITIMELAPSE_URL, ENT_QUOTES); ?>" title="View Mini-Timelapse">
				<i class="fa fa-file-video fa-fw"></i> View Mini-Timelapse
			</a></span>
<?php
		}
?>
            </span>
			<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
			<button type="button" id="liveview-fullscreen-button" class="btn btn-default btn-xs pull-right liveview-fullscreen-button" aria-label="Show image full screen" title="Show image full screen">
				<i class="fa-solid fa-expand"></i>
			</button>
			<div class="pull-right liveview-mode-switcher">
				<span class="liveview-mode-switcher-label hidden-xs">Mode</span>
				<div class="btn-group btn-group-xs">
					<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="Preview mode">
						<span id="liveview-mode-label"><?php echo $liveViewMode === "scaled" ? "Fit Image" : "Full width"; ?></span>
						<span class="caret"></span>
					</button>
					<ul class="dropdown-menu dropdown-menu-right">
						<li<?php if ($liveViewMode === "fullwidth") echo ' class="active"'; ?>>
							<a href="#" data-liveview-mode-option="fullwidth">Full width</a>
						</li>
						<li<?php if ($liveViewMode === "scaled") echo ' class="active"'; ?>>
							<a href="#" data-liveview-mode-option="scaled">Fit Image</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<div class="panel-body">
			<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>
			<div id="live_container" class="cursorPointer live_container" title="Click to open image viewer">
				<a id="current_lightbox" class="liveview-lightgallery-item" href="<?php echo htmlspecialchars($image_name, ENT_QUOTES); ?>" data-lg-size="<?php echo htmlspecialchars($currentImageLightboxSize, ENT_QUOTES); ?>">
					<img id="current" class="current" src="<?php echo htmlspecialchars($image_name, ENT_QUOTES); ?>">
				</a>
			</div>
		</div>
	</div>
<?php 
}
?>
