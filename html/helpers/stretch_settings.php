<style>
	label { margin-top: 20px; font-size: 125%; }
	.label_description { padding-left: 25px; padding-bottom: 5px; }
</style>
<?php

function stretchSettings() {

$settings_array = readSettingsFile();

// Defaults.  Ideally should match what's in compareStretches.sh.
$image = ALLSKY_TMP . "/" . getVariableOrDefault($settings_array, 'filename', "");
$amounts = "5  10  15  20";
$midpoints = "10  30  50";
/*
$count_amount = 4;
$count_midpoint = 4;	// The total number of stretches is $count_amount * $count_midpoint.
$start_amount = 3;
$step_amount = 10;
$start_midpoint = 5;
$step_midpoint = 10;
*/
$verbose = "false";

$stretch_amount_daytime = getVariableOrDefault($settings_array, 'imagestretchamountdaytime', 0);
$stretch_amount_nighttime = getVariableOrDefault($settings_array, 'imagestretchamountnighttime', 0);

$cmd = "AM_ALLSKY_CONFIG compare_stretches --html";

?>
<div class="row">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-code fa-star"></i>
			Help Determine <strong>Image Stretch Settings</strong>
		</div>
		<div class="panel-body">
<?php
			if ($stretch_amount_daytime > 0 || $stretch_amount_nighttime > 0) {
				echo "<div class='markdown-body'>";		// need to get blockquote formatted
				echo "<blockquote style='max-width: 100%'>";
				echo "You appear to already be stretching images.";
				echo "<br>Those settings will NOT be used while running these tests.";
				echo "</blockquote>";
				echo "</div>";
				echo "<br>";
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

			<form role="form" action="execute.php" method="POST" onsubmit="return add_args()">
<script>
function add_args() {
	ID = document.getElementById('ID').value;

	image = document.getElementById('image').value;
	if (image != "") ID += " --image " + image;

	amounts = document.getElementById('amounts').value;
	if (amounts != "") ID += " --amounts " + amounts.replace(/ /g, "_");

	midpoints = document.getElementById('midpoints').value;
	if (midpoints != "") ID += " --midpoints " + midpoints.replace(/ /g, "_");
/*
	count_amount = document.getElementById('count_amount').value;
	if (count_amount != "") ID += " --count-amount " + count_amount;

	count_midpoint = document.getElementById('count_midpoint').value;
	if (count_midpoint != "") ID += " --count-midpoint " + count_midpoint;

	start_amount = document.getElementById('start_amount').value;
	if (start_amount != "") ID += " --start-amount " + start_amount;

	step_amount = document.getElementById('step_amount').value;
	if (step_amount != "") ID += " --step-amount " + step_amount;

	start_midpoint = document.getElementById('start_midpoint').value;
	if (start_midpoint != "") ID += " --start-midpoint " + start_midpoint;

	step_midpoint = document.getElementById('step_midpoint').value;
	if (step_midpoint != "") ID += " --step-midpoint " + step_midpoint;
*/

	document.getElementById('ID').value = ID;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="ID" id="ID" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_stretches">

				<div class="row">
					<div class="form-group col-md-8">
						<label for="image">Image to stretch</label>
						<div class="label_description">
						Pick a typical image on the Pi.
						<!--
						The default is the current image in
						<span class="fileName"><?php echo $image ?></span>.
						-->
						<br>
						If you are stretching nighttime images and running the test
						during the day, pick a different image.
						</div>
						<input type="text" class="form-control" name="image"
							id="image" value="<?php echo $image; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="amounts">
							<span class="WebUISetting">Stretch Amount</span>s to use</label>
						<div class="label_description">
						Enter one or more space-seprated
						<span class="WebUISetting">Stretch Amount</span>s.
						The more values you have the longer it will take to process.
						<br>
						<code>20</code> is a lot.
						Higher numbers lighten the image more.
						</div>
						<input type="text" class="form-control" name="amounts"
							id="amounts" value="<?php echo $amounts; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="midpoints">
							<span class="WebUISetting">Stretch Mid Point</span>s to use</label>
						<div class="label_description">
						Enter one or more space-seprated
						<span class="WebUISetting">Stretch Mid Point</span>s.
						The more values you have the longer it will take to process.
						<br>
						<code>0</code> lightens black items,
						<code>50</code> lightens middle-gray items, and
						<code>100</code> lightens white items.
						</div>
						<input type="text" class="form-control" name="midpoints"
							id="midpoints" value="<?php echo $midpoints; ?>"/>
					</div>
				</div>
<!-- OLD WAY:
				<div class="row">
					<div class="form-group col-md-8">
						<label for="start_amount">Initial
							<span class="WebUISetting">Stretch Amount</span></label>
						<div class="label_description">
						Enter the initial amount to stretch.
						<br>
						<code>3</code> is typical and <code>20</code> is a lot.
						Higher numbers lighten the image more.
						</div>
						<input type="text" class="form-control" name="start_amount"
							id="start_amount" value="<?php echo $start_amount; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="count_amount">Number of times to vary the
						<span class="WebUISetting">Stretch Amount</span></label>
						<div class="label_description">
						The total number of stretches to perform will be
						this number times the Mid Point count below,
						so keep the number fairly small.
						</div>
						<input type="text" class="form-control" name="count_amount"
							id="count_amount" value="<?php echo $count_amount; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="step_amount">
							<span class="WebUISetting">Stretch Amount</span> step size</label>
						<div class="label_description">
						Enter the how much to increase the Stretch Amount each time.
						</div>
						<input type="text" class="form-control" name="step_amount"
							id="step_amount" value="<?php echo $step_amount; ?>"/>
					</div>
				</div>

				<div class="row">
					<div class="form-group col-md-8">
						<label for="start_midpoint">Initial
							<span class="WebUISetting">Stretch Mid Point</span></label>
						<div class="label_description">
						Enter the inital mid point.
						</div>
						<input type="text" class="form-control" name="start_midpoint"
							id="start_midpoint" value="<?php echo $start_midpoint; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="count_midpoint">Number of times to vary the
						<span class="WebUISetting">Stretch Mid Point</span></label>
						<div class="label_description">
						The total number of stretches to perform will be
						this number times the Amount count above,
						so keep the number fairly small.
						</div>
						<input type="text" class="form-control" name="count_midpoint"
							id="count_midpoint" value="<?php echo $count_midpoint; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="step_midpoint">
							<span class="WebUISetting">Stretch Mid Point</span> step size</label>
						<div class="label_description">
						Enter the how much to increase the Stretch Mid Point each time.
						</div>
						<input type="text" class="form-control" name="step_midpoint"
							id="step_midpoint" value="<?php echo $step_midpoint; ?>"/>
					</div>
				</div>
-->

				<br>
				<input type="submit" class="btn btn-primary" name="stretches"
							value="Create Stretched Images" />
			</form>
		</div>
	</div>
</div>

<?php 
}
?>
