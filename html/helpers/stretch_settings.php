<?php

function stretchSettings()
{
	global $settings_array;
	global $pageHeaderTitle, $pageIcon;

	// Defaults.  Ideally should match what's in compareStretches.sh.
	$filename = getVariableOrDefault($settings_array, 'filename', "");
	$image = ALLSKY_CURRENT_DIR . "/$filename";
	$amounts = "5  10  15  20";
	$midpoints = "10  30  50";

	$stretch_amount_daytime = getVariableOrDefault($settings_array, 'imagestretchamountdaytime', 0);
	$stretch_amount_nighttime = getVariableOrDefault($settings_array, 'imagestretchamountnighttime', 0);

	$cmd = "AM_ALLSKY_CONFIG compare_stretches --html";
?>
	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
		<div class="panel-body">
<?php
			if ($stretch_amount_daytime > 0 || $stretch_amount_nighttime > 0) {
				echo "<div class='markdown-body'>";		// need to get blockquote formatted
				echo "<blockquote style='max-width: 100%'>";
				echo "You appear to already be stretching images.";
				echo "<br>Those settings will NOT be used while running these tests.";
				echo "<br>";
				echo "<strong>";
				echo "Do NOT use the current '$filename' image since it's already stretched";
				echo "</strong>";
				echo "</blockquote>";
				echo "</div>";
				echo "<br>";
				$image = "";
			}
?>
			<p>
			Stretching an image is typically done to lighten parts of an image,
			such as the stars, while keeping the rest of the image (mostly) unchanged.
			There are two settings to stretch an image:
			<ol>
				<li><span class="WebUISetting">Stretch Amount</span>
					- This determines how much stretch to apply.
				<li><span class="WebUISetting">Stretch Mid Point</span>
					- This determines what parts of the image are stretched
					(dark parts, middle-grey parts, light parts, etc.).
			</ol>
			See the
			<a external="true"
				href="/documentation/explanations/exposureGainSaturation.html#stretch">stretch settings</a>
			page for an explanation of these settings.
			</p>

			<p class="morePadding">
			This page helps you determine what stretch settings to use
			to bring out the details you want.
			<br>
			The image you select below will be stretched multiple times
			using different settings.
			You can then compare the images to find the best one.
			<br>
			You may then want to run the test again but with finer granularity.
			</p>

			<br>
			<form role="form" action="execute.php" method="POST" class="form-horizontal" onsubmit="return add_args()">
<script>
function add_args() {
	ID = document.getElementById('ID').value;

	image = document.getElementById('image').value;
	if (image != "") ID += " --image " + image;

	amounts = document.getElementById('amounts').value;
	if (amounts != "") ID += " --amounts " + amounts.replace(/ /g, "_");

	midpoints = document.getElementById('midpoints').value;
	if (midpoints != "") ID += " --midpoints " + midpoints.replace(/ /g, "_");

	document.getElementById('ID').value = ID;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="ID" id="ID" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_stretches">

				<div class="form-group" id="image-wrapper">
					<label for="image" class="control-label col-xs-3">
						Image to stretch
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="image"
								id="image" value="<?php echo $image; ?>"/>
						</div>
						<p class="help-block">
							Pick a typical image on the Pi.
							<br>
							If you are stretching nighttime images and running the test
							during the day, pick a different image.
						</p>
					</div>
				</div>

				<div class="form-group" id="amounts-wrapper">
					<label for="amounts" class="control-label col-xs-3">
						<span class="WebUISetting">Stretch Amount</span> values to use
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="amounts"
								id="amounts" value="<?php echo $amounts; ?>"/>
						</div>
						<p class="help-block">
							Enter one or more space-seprated
							<span class="WebUISetting">Stretch Amount</span> values.
							The more values you have the longer it will take to process.
							<br>
							<code>20</code> is a lot.
							Higher numbers lighten the image more.
						</p>
					</div>
				</div>

				<div class="form-group" id="midpoints-wrapper">
					<label for="midpoints" class="control-label col-xs-3">
						<span class="WebUISetting">Stretch Mid Point</span> values to use
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-8">
							<input type="text" class="form-control" name="midpoints"
								id="midpoints" value="<?php echo $midpoints; ?>"/>
						</div>
						<p class="help-block">
							Enter one or more space-seprated
							<span class="WebUISetting">Stretch Mid Point</span> values.
							The more values you have the longer it will take to process.
							<br>
							<code>0</code> lightens black items,
							<code>50</code> lightens middle-gray items, and
							<code>100</code> lightens white items.
						</p>
					</div>
				</div>

				<br>
				<input type="submit" class="btn btn-primary" name="stretches"
							value="Create Stretched Images" />
			</form>
		</div>
	</div>

<?php 
}
?>
