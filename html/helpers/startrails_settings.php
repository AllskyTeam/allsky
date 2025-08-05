<?php

function startrailsSettings() {

// defaults
$cmd = "AM_ALLSKY_CONFIG compare_startrails --html";

// TODO: on form submittal, use javascript to append to 'id' the form fields:
//	--count c
//	--thresholds t		(replacing spaces with "_")
// then delete these lines:
$count = 5;
$input_directory = ALLSKY_IMAGES . "/from_allsky";
$thresholds = "0.50   0.55";
$cmd .= " --input from_allsky";
$cmd .= " --num-images $count";
$cmd .= " --thresholds " . str_replace(" ", "_", $thresholds);

?>
<div class="row">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-code fa-star"></i>
			Help Determine <strong>Startrails Settings</strong>
		</div>
		<div class="panel-body">
			<form role="form" action="execute.php" method="POST" onsubmit="return add_args()">
<script>
function add_args() {
	id = document.getElementById('id').value;

	input_directory = document.getElementById('input_directory').value;
	if (input_directory != "") id += " --input " + input_directory;

	count = document.getElementById('count').value;
	if (count != "") id += " --num-images " + count;

	thresholds = document.getElementById('thresholds').value;
	if (thresholds != "") id += " --thresholds " + thresholds.replace(/ /g, "_");

	document.getElementById('id').value = id;

	return true;
}
</script>
				<?php CSRFToken() ?>
				<input type="hidden" name="id" id="id" value="<?php echo $cmd ?>">
				<input type="hidden" name="day" value="test_startrails">

				<div class="row">
					<div class="form-group col-md-4">
						<label for="input_directory">Use images from</label>
						<input type="text" class="form-control" name="input_directory"
							id="input_directory" value="<?php echo $input_directory; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-4">
						<label for="count">Number of images to include in each startrail</label>
						<input type="text" class="form-control" name="count"
							id="count" value="<?php echo $count; ?>"/>
					</div>
				</div>
				<div class="row">
					<div class="form-group col-md-4">
						<label for="thresholds">Thresholds to use</label>
						<br>Enter one or more space-separated Brightness Thresholds.
						<input type="text" class="form-control" name="thresholds"
							id="thresholds" value="<?php echo $thresholds; ?>"/>
					</div>
				</div>

				<input type="submit" class="btn btn-primary" name="startrails"
							value="Create Startrails" />
			</form>
		</div>
	</div>
</div>

<?php 
}
?>
