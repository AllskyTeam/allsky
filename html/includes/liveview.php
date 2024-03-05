<?php

function DisplayLiveView($image_name, $delay, $daydelay, $nightdelay, $darkframe) {
	global $showUpdatedMessage;
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
		$msg =  "Daytime images updated every $s seconds,";
		$s =  number_format($nightdelay);
		$msg .= " nighttime every $s seconds";
		$myStatus->addMessage("$msg", "message", true);
	}
?>

<script>
		function getImage() {
			var newImg = new Image();
			newImg.src = '<?php echo $image_name ?>?_ts=' + new Date().getTime();
			newImg.id = "current";
			newImg.style = "width: 100%";
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

<div class="row">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-code fa-eye"></i> Liveview</div>
		<div class="panel-body">
			<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>
			<div id="live_container" class="cursorPointer live_container" title="Click to make full-screen">
				<img id="current" class="current" src="<?php echo $image_name ?>">
			</div>
		</div>
	</div>
</div>

<?php 
}
?>
