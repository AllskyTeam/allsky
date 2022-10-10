<?php

function DisplayLiveView($image_name, $delay, $daydelay, $nightdelay, $darkframe) {
	// Note: if liveview is left open during a day/night transition the delay will become wrong.
	// For example, if liveview is started during the day we use "daydelay" but then
	// at night we're still using "daydelay" but should be using "nightdelay".
	// The user can fix this by reloading the web page.

	$status = new StatusMessages();

	if ($darkframe === '1') {
		$status->addMessage('Currently capturing dark frames. You can turn this off on the camera settings page.');
	} else {
		$status->addMessage("Daytime images updated every " . number_format($daydelay) . " seconds, nighttime every " . number_format($nightdelay) ." seconds", "message", true);
	}
  ?>
	<script>
	setInterval(function () {
		getImage();
	}, <?php echo $delay ?>);
	</script>

	<div class="row">
		<div class="panel panel-primary">
			<div class="panel-heading"><i class="fa fa-code fa-eye"></i> Live View</div>
			<div class="panel-body">
				<p><?php $status->showMessages(); ?></p>
				<div id="live_container" style="background-color: black; margin-bottom: 15px;">
					<img id="current" class="current" src="<?php echo $image_name ?>" style="width:100%">
				</div>
			</div>
		</div>
	</div>
<?php 
}
?>
