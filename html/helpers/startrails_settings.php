<style>
	label { margin-top: 20px; font-size: 125%; }
	.label_description { padding-left: 25px; padding-bottom: 5px; }
</style>
<?php

function startrailsSettings() {

// Defaults.  Ideally should match what's in compareStartrails.sh.
$num_images = 20;
$input_directory = "";
$thresholds = "0.10  0.15  0.20  0.25  0.30  0.35  0.40  0.45  0.50";
$verbose = "false";

$cmd = "AM_ALLSKY_CONFIG compare_startrails --html";

?>

	<div class="panel panel-success">
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
			<p>
			See the
			<a external="true" allsky="true" href="/documentation/explanations/startrails.html#brightnessthreshold">startrails settings</a>
			for an explanation of the startrails settings.
			</p><br><br>

			<form role="form" action="execute.php" method="POST" onsubmit="return add_args()">
<script>
function add_args() {
	ID = document.getElementById('ID').value;

	input_directory = document.getElementById('input_directory').value;
	if (input_directory != "") ID += " --input " + input_directory;

	num_images = document.getElementById('num_images').value;
	if (num_images != "") ID += " --num-images " + num_images;

	thresholds = document.getElementById('thresholds').value;
	if (thresholds != "") ID += " --thresholds " + thresholds.replace(/ /g, "_");

	verbose = document.getElementById('verbose').value;
	if (verbose != "") ID += " --verbose " + verbose;

	document.getElementById('ID').value = ID;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="ID" id="ID" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_startrails">

				<div class="row">
					<div class="form-group col-md-8">
						<label for="input_directory">Use images from</label>
						<div class="label_description">
						Enter the directory on the Pi where the source images reside,
						typically in
						<span class="fileName"><?php echo ALLSKY_IMAGES ?></span>.
						<br>If you don't enter anything, then yesterday's images are used.
						</div>
						<input type="text" class="form-control" name="input_directory"
							id="input_directory" value="<?php echo $input_directory; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="num_images">Number of images to include in each startrail</label>
						<div class="label_description">
						More images take more time to process but produce longer trailed stars.
						</div>
						<input type="text" class="form-control" name="num_images"
							id="num_images" value="<?php echo $num_images; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="thresholds"><span class="WebUISetting">Brightness Threshold</span>s to use</label>
						<div class="label_description">
						Enter one or more space-separated
						<span class="WebUISetting">Brightness Threshold</span>s.
						<br>The more values you have the longer it will take to process.
						</div>
						<input type="text" class="form-control" name="thresholds"
							id="thresholds" value="<?php echo $thresholds; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-8">
						<label for="verbose">Verbose Output?</label>
						<div class="label_description">
						Check the box to output summary information for each startrails created.
						</div>
						<input type="checkbox" class="form-control" name="verbose"
						<br><input type="checkbox" class="form-control" name="verbose"
							id="verbose" value="<?php echo $verbose; ?>"
							<?php if ($verbose == "true") echo "checked"; ?>
							style="width: 10%" />
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
