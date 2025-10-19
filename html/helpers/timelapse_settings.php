<?php

function timelapseSettings()
{
	global $settings_array;
	global $pageHeaderTitle, $pageIcon;

	// Defaults.  Ideally should match what's in compareTimelapse.sh.
	$num_images = 100;
	$bitrates = getVariableOrDefault($settings_array, 'timelapsebitrate', "");
	$fps = getVariableOrDefault($settings_array, 'timelapsefps', "");

	// Determine yesterday for the default input directory.
	$datetime = new DateTime('now');
	$datetime->modify('-12 hours');
	$input_directory = $datetime->format('Ymd');
	if (is_dir($input_directory)) {
		$when = "yesterday";
	} else {
		// Use the most recent directory.
		$cmd = "ls -d " . ALLSKY_IMAGES . "/20* 2>/dev/null | tail -1";
		exec($cmd, $result, $return_val);
		if ($result != null) {
			$input_directory = $result[0];
			$when = "the most recent day with images";
		} else {
			$input_directory = "";
			$when = "";
		}
	}
	if ($when !== "") $when = "<br>The default is $when."; 

	$verbose = "false";
	$cmd = "AM_ALLSKY_CONFIG compare_timelapse --html";
?>
	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
		<div class="panel-body">
			<p>
			This page helps you determine what timelapse settings to use
			to obtain the quality and video length you prefer.
			<br>
			The images in the directory you select below will be used to
			create multiple timelapse videos using different settings.
			You can then compare the videos to find the best one.
			<br>
			You may then want to run the test again but with finer granularity.
			</p>
			<p class="morePadding">
			You can change these settings:
			<ol>
				<li><span class="WebUISetting">Bitrate</span>
					- This determines what Bitrate settings to use.
				<li><span class="WebUISetting">FPS</span>
					- This determines what FPS settings to use.
			</ol>
			See the
			<a external="true"
				href="/documentation/settings/allsky.html#dailytimelapse">timelapse</a>
			page for an explanation of these settings.
			</p>
			<p>
			Your current settings for timelapse width and height, vcodec, and pixel format
			will be used.
			</p>


			<br>
			<form role="form" action="execute.php" method="POST" class="form-horizontal" onsubmit="return add_args()">
<script>
function add_args() {
	ID = document.getElementById('ID').value;

	input_directory = document.getElementById('input_directory').value;
	if (input_directory != "") ID += " --input " + input_directory;

	num_images = document.getElementById('num_images').value;
	if (num_images != "") ID += " --num-images " + num_images;

	bitrates = document.getElementById('bitrates').value;
	if (bitrates != "") ID += " --bitrates " + bitrates.replace(/ /g, "_");

	fps = document.getElementById('fps').value;
	if (fps != "") ID += " --fps " + fps.replace(/ /g, "_");

	document.getElementById('ID').value = ID;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="ID" id="ID" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_timelapses">

				<div class="form-group" id="input_directory-wrapper">
					<label for="input_directory" class="control-label col-xs-3">
						Use images from
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-10">
							<input type="text" class="form-control" name="input_directory"
								id="input_directory" value="<?php echo $input_directory; ?>"/>
						</div>
						<p class="help-block">
							Enter the directory on the Pi where the source images reside,
							typically in
							<span class="fileName"><?php echo ALLSKY_IMAGES ?></span>.
							<?php echo $when ?>
						</p>
					</div>
				</div>

				<div class="form-group" id="num_images-wrapper">
					<label for="num_images" class="control-label col-xs-3">
						Number of images to include in the videos
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="num_images"
								id="num_images" value="<?php echo $num_images; ?>"/>
						</div>
						<p class="help-block">
							Picking a lot of images will produce longer videos
							but will take longer to process.
							The default is a good starting point.
						</p>
					</div>
				</div>

				<div class="form-group" id="bitrates-wrapper">
					<label for="bitrates" class="control-label col-xs-3">
						<span class="WebUISetting">Bitrate</span> values to use
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="bitrates"
								id="bitrates" value="<?php echo $bitrates; ?>"/>
						</div>
						<p class="help-block">
							Enter one or more space-seprated
							<span class="WebUISetting">Bitrate</span> values.
							The more values you have the longer it will take to process.
							<br>
							Higher numbers will produce high-quality videos.
						</p>
					</div>
				</div>

				<div class="form-group" id="fps-wrapper">
					<label for="fps" class="control-label col-xs-3">
						<span class="WebUISetting">FPS</span> values to use
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="fps"
								id="fps" value="<?php echo $fps; ?>"/>
						</div>
						<p class="help-block">
							Enter one or more space-seprated
							<span class="WebUISetting">FPS</span> values.
							The more values you have the longer it will take to process.
							<br>
							Higher numbers will produce shorter, smoother videos.
						</p>
					</div>
				</div>

				<p>
				The length of each video in seconds is roughly the
				number of images divided by the <span class="WebUISetting">FPS</span> value.
				</p>

				<br>
				<input type="submit" class="btn btn-primary" name="timelapses"
					value="Create Timelapse Videos" />
				&nbsp; &nbsp; &nbsp;
				WARNING: It may be a minute or more the results appear.
			</form>
		</div>
	</div>

<?php 
}
?>
