<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayLiveView($image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe) {
	global $showUpdatedMessage;
	global $pageHeaderTitle, $pageIcon;

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
?>

<script>
		function getImage() {
			var newImg = new Image();
			newImg.src = '<?php echo $image_name ?>?_ts=' + new Date().getTime();
			newImg.id = "current";
			newImg.className = "current";
			newImg.decode().then(() => {
				$("#live_container").empty().append(newImg);
			}).catch((err) => {
				if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
					console.log('broken image: ', err);
				}
			}).finally(() => {
				// Use tail recursion to trigger the next invocation after `$delay` milliseconds
				setTimeout(function () { getImage(); }, <?php echo $delay ?>);
			});
		};

		getImage();
</script>

	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?>
<?php
		if (file_exists(ALLSKY_MINITIMELAPSE_FILE)) {
?>

			<span class='nowrap'>&nbsp; &nbsp;&nbsp; &nbsp;
			<?php echo insertHref("mini_timelapse", "", true); ?></span>
<?php
		}
?>
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
