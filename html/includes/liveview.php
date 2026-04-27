<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayLiveView($image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe) {
	global $showUpdatedMessage;
	global $pageHeaderTitle, $pageIcon, $pageHelp;

	$myStatus = new StatusMessages();

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

	$miniTimelapsePlayerUrl = null;
	if (file_exists(ALLSKY_MINITIMELAPSE_FILE)) {
		$miniTimelapsePlayerUrl = getListFileTypeVideoPlayerUrl(
			ALLSKY_MINITIMELAPSE_URL,
			getListFileTypeVideoMimeType(basename(ALLSKY_MINITIMELAPSE_URL))
		);
	}
?>

<link type="text/css" rel="stylesheet" href="/js/lightgallery/css/lightgallery-bundle.min.css" />
<link type="text/css" rel="stylesheet" href="/js/lightgallery/css/lg-transitions.css" />
<script src="/js/lightgallery/lightgallery.min.js"></script>
<script src="/js/lightgallery/plugins/zoom/lg-zoom.min.js"></script>
<script src="/js/lightgallery/plugins/thumbnail/lg-thumbnail.min.js"></script>
<script src="/js/liveview.js?c=<?php echo filemtime(__DIR__ . '/../js/liveview.js'); ?>"></script>
<script>document.body.classList.add('liveview-page');</script>

	<div
		class="panel panel-allsky"
		id="liveview-root"
		data-image-name="<?php echo htmlspecialchars($image_name, ENT_QUOTES); ?>"
		data-refresh-delay="<?php echo (int) $delay; ?>"
		data-mini-player-url="<?php echo htmlspecialchars((string) ($miniTimelapsePlayerUrl ?? ''), ENT_QUOTES); ?>"
	>
		<div class="panel-heading clearfix">
            <span class="pull-left"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?>
<?php
		if (file_exists(ALLSKY_MINITIMELAPSE_FILE)) {
?>

			<span class='nowrap'>&nbsp; &nbsp;&nbsp; &nbsp;
			<a id="mini_timelapse_lightbox" href="<?php echo htmlspecialchars($miniTimelapsePlayerUrl ?? ALLSKY_MINITIMELAPSE_URL, ENT_QUOTES); ?>" title="View Mini-Timelapse">
				<i class="fa fa-file-video fa-fw"></i> View Mini-Timelapse
			</a></span>
<?php
		}
?>
            </span>
			<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
		</div>
		<div class="panel-body">
			<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>
			<div id="live_container" class="cursorPointer live_container" title="Click to make full-screen">
				<img id="current" class="current" src="<?php echo $image_name ?>">
			</div>
		</div>
	</div>
<?php 
}
?>
