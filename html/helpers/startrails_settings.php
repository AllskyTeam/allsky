<?php

function startrailsSettings() {

// Defaults.  Ideally should match what's in compareStartrails.sh.
$num_images = 20;
$input_directory = "";
$thresholds = "0.10  0.15  0.20  0.25  0.30  0.35  0.40  0.45  0.50";
$verbose = "false";

$cmd = "AM_ALLSKY_CONFIG compare_startrails --html";

?>

	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="fa fa-code fa-star"></i>
			Help Determine <strong>Startrails Settings</strong>
		</div>
		<div class="panel-body">
			<p>
			If your startrails don't have trailed stars,
			it means you need to adjust the
			<span class="WebUISetting">Brightness Threshold</span> setting.
			<br>
			See the
			<a external="true"
				href="/documentation/explanations/startrails.html#brightnessthreshold">startrails settings</a>
			for an explanation of this setting.
			</p>

			<p>
			This page helps you determine what setting to use
			to get the most number of images included in your startrails
			and hence the longest trails possible.
			<br>
			Multiple startrails images will be created using the settings you enter
			and you can then compare them to find the best image.
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

	thresholds = document.getElementById('thresholds').value;
	if (thresholds != "") ID += " --thresholds " + thresholds.replace(/ /g, "_");

	verbose = document.getElementById('verbose').checked;
	if (verbose) ID += " --verbose "

	document.getElementById('ID').value = ID;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="ID" id="ID" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_startrails">

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
							<br>If you don't enter anything, then yesterday's images are used.
						</p>
					</div>
				</div>

				<div class="form-group" id="num_images-wrapper">
					<label for="num_images" class="control-label col-xs-3">
						Number of images to include in each startrail
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-2">
							<input type="number" class="form-control"
								id="num_images" name="num_images"
								min="1" step="1"
								data-description="Number of images to include in each startrail"
								value="<?php echo $num_images; ?>"/>
						</div>
						<p class="help-block">
							More images take more time to process but produce
							longer trailed stars.
						</p>
					</div>
				</div>

				<div class="form-group" id="thresholds-wrapper">
					<label for="thresholds" class="control-label col-xs-3">
						<span class="WebUISetting"> Brightness Threshold</span>s to use
					</label>
					<div class="col-xs-8">
						<div class="input-group col-xs-10">
							<input type="text" class="form-control col-xs-8" name="thresholds"
								id="thresholds" value="<?php echo $thresholds; ?>"/>
						</div>
						<p class="help-block">
							Enter one or more space-separated
							<span class="WebUISetting">Brightness Threshold</span>s.
							<br>The more values you have the longer it will take to process.
						</p>
					</div>
				</div>

				<div class="form-group" id="verbose-wrapper">
					<label for="verbose" class="control-label col-xs-3">
						Verbose Output?
					</label>
					<div class="col-xs-8">
						<div class="input-group">
							<label class="el-switch el-switch-sm el-switch-green">
								<input type="checkbox" class="form-control col-xs-8"
									id="verbose" name="verbose" value="true"
									<?php if ($verbose == "true") echo "checked"; ?> />
								<span class="el-switch-style"></span>
							</label>
						</div>
						<p class="help-block">
							Check the box to output summary information for
							each startrails created.
						</p>
					</div>
				</div>


				<input type="submit" class="btn btn-primary" name="startrails"
					value="Create Startrails" />
			</form>
		</div>
	</div>


<?php 
}
?>
