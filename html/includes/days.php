<?php

function delete_directory($directory_name) {
	global $page;

	// First make sure this is a valid directory.
	if (! is_valid_directory($directory_name)) {
		return "Invalid directory name.";
	}

	// If there is any output it's from an error message.
	$output = null;
	$retval = null;
	exec("sudo rm -r '$directory_name' 2>&1", $output, $retval);
	if ($output == null) {
		if ($retval != 0)
			$output = "Unknown error, retval=$retval.";
		else
			$output = "";
	} else {
		$output = $output[0];	// exec() return output as an array
	}
	return $output;
}

function ListDays(){
	global $page;
	$days = array();

	$date = getVariableOrDefault($_POST, 'delete_directory', null);
	if ($date !== null) {
		$msg = delete_directory(ALLSKY_IMAGES . "/$date");
		if ($msg == "") {
			echo "<div class='alert alert-success'>Deleted directory $date</div>";
		} else {
			echo "<div class='alert alert-danger'><b>Unable to delete directory for $date</b>: $msg</div>";
		}
	}

	if ($handle = opendir(ALLSKY_IMAGES)) {
		while (false !== ($day = readdir($handle))) {
			if (is_valid_directory($day)) {
				$days[] = $day;
			}
		}
		closedir($handle);
	}

	arsort($days);

?>
<style>
	table th {
		text-align:center;
		padding: 0 10px;
	}
	table tr td {
		padding: 0 10px;
	}
</style>
<div class="row">
	<div class="col-lg-12">
	<div class="panel panel-primary">
	<div class="panel-heading"><i class="fa fa-image fa-fw" style="margin-right: 10px"></i>Images</div>
	<div class="panel-body">
	<div class="row">
	<form action="?page=<?php echo $page ?>" method="POST" onsubmit="return confirm('Are you sure you want to delete ALL images for that day?');">
	<table style='margin-top: 15px; text-align:center'>
	  <thead>
			<tr style="border-bottom: 1px solid #888">
				<th style="text-align:center">Day</th>
				<th style="text-align:center">Images</th>
				<th style="text-align:center">Timelapse</th>
				<th style="text-align:center">Keogram</th>
				<th style="text-align:center">Startrails</th>
			</tr>
	  </thead>
	  <tbody>
		<tr>
			<td style='font-weight:bold'>All</td>
			<td>-</td>
			<td><a href='index.php?page=list_videos&day=All' title='All Timelapse (CAN BE SLOW TO LOAD)'><i class='fa fa-film fa-lg fa-fw'></i></a></td>
			<td><a href='index.php?page=list_keograms&day=All' title='All Keograms'><i class='fa fa-barcode fa-lg fa-fw'></i></a></td>
			<td><a href='index.php?page=list_startrails&day=All' title='All Startrails'><i class='fa fa-star fa-lg fa-fw'></i></a></td>
			<td style='padding: 22px 0'></td>
		</tr>
<?php
foreach ($days as $day) {
	echo "\t\t<tr>\n";
	echo "\t\t\t<td style='font-weight:bold'>$day</td>\n";

	echo "\t\t\t<td>";
	echo "<a href='index.php?page=list_images&day=$day' title='Images'><i class='fa fa-image fa-lg fa-fw'></i></a>";
	echo "</td>\n";

	echo "\t\t\t<td>";
	if (glob(ALLSKY_IMAGES . "/$day/*.mp4") != false) {
		echo "<a href='index.php?page=list_videos&day=$day' title='Timelapse'><i class='fa fa-film fa-lg fa-fw'></i></a>";
	} else {
		echo "none";
	}
	echo "</td>\n";

	// For keograms and startrails assume if the directory exists a file does too.
	echo "\t\t\t<td>";
	$d = ALLSKY_IMAGES . "/$day/keogram";
	if (is_dir($d)) {
		echo "<a href='index.php?page=list_keograms&day=$day' title='Keogram'><i class='fa fa-barcode fa-lg fa-fw'></i></a>";
	} else {
		echo "none";
	}
	echo "</td>\n";

	echo "\t\t\t<td>";
	$d = ALLSKY_IMAGES . "/$day/startrails";
	if (is_dir($d)) {
		echo "<a href='index.php?page=list_startrails&day=$day' title='Startrails'><i class='fa fa-star fa-lg fa-fw'></i></a>";
	} else {
		echo "none";
	}
	echo "</td>\n";

	echo "\t\t\t<td style='padding: 5px'>
				<button type='submit' data-toggle='confirmation'
					class='btn btn-delete' name='delete_directory' value='$day'>
					<i class='fa fa-trash'></i> <span class='hidden-xs'>Delete</span>
				</button>
			</td>
		</tr>";
}
?>
	  </tbody>
	</table>
	</form>
	</div><!-- /.row -->
	</div><!-- /.panel-body -->
	</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php
}
?>
