<?php

// functions.php sets a bunch of constants and variables,
// including $image_name and $delay.
// It needs to be at the top of this file since code below uses the items it sets.
include_once('includes/functions.php');
initialize_variables();		// sets some variables
?>

<!DOCTYPE html>
<html lang="en">
<head>
	<style> body { margin: 0; } </style>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="">
	<meta name="author" content="Thomas Jacquin">
	<link href="documentation/css/custom.css" rel="stylesheet">
	<title>AllSky Public Page</title>
</head>
<body>

<div class="row">
	<div id="live_container" class="live_container">
		<img id="current" class="current" src="<?php echo $image_name ?>">
	</div>
</div>

<script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>

<script type="text/javascript">
	function getImage() {
		var newImg = new Image();
		newImg.src = '<?php echo $image_name ?>?_ts=' + new Date().getTime();
		newImg.id = "current";
		newImg.class = "current";

		newImg.decode().then(() => {
			$("#current").attr('src', newImg.src)
				.attr("id", "current")
				.attr("class", "current")
				.on('load', function () {
					if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
						console.log('broken image!');
					} else {
						$("#live_container").empty().append(newImg);
					}
				});
		}).finally(() => {
			// Use tail recursion to trigger the next invocation after `$delay` milliseconds
			setTimeout(function () { getImage(); }, <?php echo $delay ?>);
		});
	}

	getImage();
</script>
</body>
</html>
