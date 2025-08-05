<?php

function stretchSettings() {

$settings_array = readSettingsFile();

// Defaults.  Ideally should match what's in compareStretches.sh.
$image = ALLSKY_TMP . "/" . getVariableOrDefault($settings_array, 'filename', "");
$count_amount = 4;
$count_midpoint = 4;	// The total number of stretches is $count_amount * $count_midpoint.
$start_amount = 5;
$step_amount = 10;
$start_midpoint = 5;
$step_midpoint = 10;
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
				echo "<blockquote style='color: var(--color-danger-fg);";
				echo " background-color: var(--color-danger-subtle);";
				echo "border-left: 1.0em solid var(--color-danger-emphasis);";
				echo "'>";
				echo "WARNING: You appear to already be stretching images.";
				echo "<br>Please set the daytime and/or nighttime ";
				echo "<span class='WebUISetting'>Stretch Amount</span> ";
				echo "to 0 to disable stretching while running these tests.";
				echo "</blockquote>";
			}
?>
			<p>
			This page helps you determine how to stretch an image
			to bring out the details you want.
			<br>
			Multiple images will be created using the stretch settings you enter
			and you can then compare them to find the best image.
			</p>
			<p>
			See the
			<a external="true" allsky="true" href="/documentation/explanations/exposureGainSaturation.html#stretch">stretch settings</a>
			for an explanation of the settings.
			</p><br><br>

			<form role="form" action="execute.php" method="POST" onsubmit="return add_args()">
<script>
function add_args() {
	id = document.getElementById('id').value;

	image = document.getElementById('image').value;
	if (image != "") id += " --input " + image;

	count_amount = document.getElementById('count_amount').value;
	if (count_amount != "") id += " --count-amount " + count_amount;

	count_midpoint = document.getElementById('count_midpoint').value;
	if (count_midpoint != "") id += " --count-midpoint " + count_midpoint;

	start_amount = document.getElementById('start_amount').value;
	if (start_amount != "") id += " --start-amount " + start_amount;

	step_amount = document.getElementById('step_amount').value;
	if (step_amount != "") id += " --step-amount " + step_amount;

	start_midpoint = document.getElementById('start_midpoint').value;
	if (start_midpoint != "") id += " --start-midpoint " + start_midpoint;

	step_midpoint = document.getElementById('step_midpoint').value;
	if (step_midpoint != "") id += " --step-midpoint " + step_midpoint;

	document.getElementById('id').value = id;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="id" id="id" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_stretches">

				<div class="row">
					<div class="form-group col-md-8">
						<label for="image">Image to stretch</label>
						<br>Pick a typical image.  It will be stretched
						multiple times using different settings.
						<input type="text" class="form-control" name="image"
							id="image" value="<?php echo $image; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="count_amount">Number of times to vary the Amount</label>
						<br>The total number of stretches to perform will be the Amount count times the Mid Point count, so keep the number fairly small.
						<input type="text" class="form-control" name="count_amount"
							id="count_amount" value="<?php echo $count_amount; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="count_midpoint">Number of times to vary the Mid Point</label>
						<br>The total number of stretches to perform will be the Amount count times the Mid Point count, so keep the number fairly small.
						<input type="text" class="form-control" name="count_midpoint"
							id="count_midpoint" value="<?php echo $count_midpoint; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="min_amount">Initial
							<span class="WebUISetting">Stretch Amount</span> to use</label>
						<br>Enter the initial amount to stretch.
						<input type="text" class="form-control" name="min_amount"
							id="min_amount" value="<?php echo $min_amount; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="step_amount">
							<span class="WebUISetting">Stretch Amount</span> step size</label>
						<br>Enter the how much to increase the Stretch Amount each time.
						<input type="text" class="form-control" name="step_amount"
							id="step_amount" value="<?php echo $step_amount; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="min_midpoint">Initial
							<span class="WebUISetting">Stretch Mid Point</span> to use</label>
						<br>Enter the inital mid point.
						<input type="text" class="form-control" name="min_midpoint"
							id="min_midpoint" value="<?php echo $min_midpoint; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="min_midpoint">
							<span class="WebUISetting">Stretch Mid Point</span> step size</label>
						<br>Enter the how much to increase the Stretch Mid Point each time.
						<input type="text" class="form-control" name="step_midpoint"
							id="step_midpoint" value="<?php echo $step_midpoint; ?>"/>
					</div>
				</div>

				<input type="submit" class="btn btn-primary" name="stretches"
							value="Create Stretched Images" />
			</form>
		</div>
	</div>
</div>

<?php 
}
?>
