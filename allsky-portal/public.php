<?php

// functions.php sets a bunch of constants and variables,
// including $image_name and $delay.
// It needs to be at the top of this file since code below uses the items it sets.
include_once('includes/functions.php');
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
	<title>AllSky Public Page</title>
</head>
<body>

<div class="row">
	<div id="live_container" style="background-color: black;">
		<img id="current" class="current" src="<?php echo $image_name ?>" style="width:100%">
	</div>
</div>

<script src="bower_components/jquery/dist/jquery.min.js"></script>

<script type="text/javascript">
	function getImage(){
		var img = $("<img />").attr('src', '<?php echo $image_name ?>?_ts=' + new Date().getTime())
			.attr("id", "current")
			.attr("class", "current")
			.css("width", "100%")
			.on('load', function() {
				if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
					console.log('broken image!');
					setTimeout(function(){
						getImage();
					}, 500);
				} else {
					$("#live_container").empty().append(img);
				}
			});
	}

	setInterval(function(){
		getImage();
	}, <?php echo $delay ?>);
</script>
</body>
</html>
