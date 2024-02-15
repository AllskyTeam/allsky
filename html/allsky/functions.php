<?php

// Globals
// If the caller needs to do additional work after initialize() fails
// they will set this to "false":

if (! isset($exitOnInitializationError)) {
	$exitOnInitializationError = true;		// Invoker optionally disables this.
}
$initializeErrorMessage = null;				// Invoker can check this.

$webSettings_array = null;
if (! isset($configFilePrefix)) $configFilePrefix = "";

function initialize() {
	global $webSettings_array;
	global $configFilePrefix;

	$needToUpdateString = "XX_NEED_TO_UPDATE_XX";
	$configurationFileName = "configuration.json";
	$retMsg = "";

	// Read the website configuration file.
	// Some settings impact this page, some impact the constellation overlay.
	$configuration_file = "$configFilePrefix$configurationFileName";
	if (! file_exists($configuration_file)) {
		$retMsg .= "<p class='error-msg'>";
			$retMsg .= "ERROR: Missing configuration file '$configuration_file'.";
			$retMsg .= "<br>Cannot continue.";
		$retMsg .= "</p>";
		return($retMsg);
	}
	$webSettings_str = file_get_contents($configuration_file, true);
	if (strpos($webSettings_str, $needToUpdateString) !== false) {
		$retMsg .= "<p class='warning-msg'>";
			$retMsg .= "The '$configurationFileName' file needs to be updated via";
			$retMsg .= " the 'Editor' page in the WebUI.";
			$retMsg .= "<br><br>Update fields with '$needToUpdateString'";
			$retMsg .= " and check all other entries.";
			$retMsg .= "<br><br>This Allsky Website will not work until updated.";
		$retMsg .= "</p>";
		return($retMsg);
	}

	$webSettings_array = json_decode($webSettings_str, true);
	if ($webSettings_array == null) {
		$retMsg .= "<p class='error-msg'>";
			$retMsg .= "ERROR: Bad configuration file '$configurationFileName'.";
			$retMsg .= "<br>Cannot continue.";
			$retMsg .= "<br>Check for missing quotes or commas at the end of every line except the last one.";
		$retMsg .= "</p>";
		$retMsg .= "<pre>$webSettings_str</pre>";
		return($retMsg);
	}

	return("");
}
$initializeErrorMessage = initialize();
if ($initializeErrorMessage !== "" && $exitOnInitializationError) {
	echo "$initializeErrorMessage";
	exit(1);
}


/*
 * Look for $var in the $a array and return its value.
 * If not found, return $default.
 * If the value is a boolean and is false, an empty string is given to us so return 0;
 * IMHO this isn't very friendly json or PHP - they should give us false.
 * A true boolean value returns 1.
*/
function v($var, $default, $a) {
	if (isset($a[$var])) {
		$value = $a[$var];
		if (gettype($value) === "boolean" && $value == "")
			return(0);
		else
			return($value);
	} else if (gettype($default) === "boolean" && $default == "") {
		return(0);
	} else {
		return($default);
	}
}

/*
 * Does the exec() function work?  It's needed to make thumbnails from video files.
*/
$yes_no = null;
function can_make_video_thumbnails() {
    global $yes_no;
    if ($yes_no !== null) return($yes_no);

    $disabled = explode(',', ini_get('disable_functions'));
    // On some servers the disabled array contains leading spaces, so check both ways.
    $exec_disabled = in_array('exec', $disabled) || in_array(' exec', $disabled);

	if ($exec_disabled) {
		echo "<script>console.log('exec() disabled');</script>";
		$yes_no = false;
	} else {
		// See if ffmpeg exists.
		@exec("which ffmpeg 2> /dev/null", $ret, $retvalue);
		if ($retvalue == 0) {
			$yes_no = true;
		} else {
			echo "<script>console.log('ffmpeg not found');</script>";
	    	$yes_no = false;
		}
	}
	return($yes_no);
}

/*
 * Disable buffering.
*/
function disableBuffering() {
	ini_set('output_buffering', false);
	ini_set('implicit_flush', true);
	ob_implicit_flush(true);
	for ($i = 0; $i < ob_get_level(); $i++)
		ob_end_clean();
}

/**
*
* Get a variable from a file and return its value; if not there, return the default.
* NOTE: The variable's value is anything after the equal sign, so there shouldn't be a comment on the line.
* NOTE: There may be something before $searchfor, e.g., "export X=1", where "X" is $searchfor.
*/
function get_variable($file, $searchfor, $default)
{
	// get the file contents
	if (! file_exists($file)) return($default);

	$contents = file_get_contents($file);
	if ("$contents" == "") return($default);	// file not readable

	// escape special characters in the query
	$pattern = preg_quote($searchfor, '/');
	// finalise the regular expression, matching the whole line
	$pattern = "/^.*$pattern.*\$/m";

	// search, and store all matching occurences in $matches, but only return the last one
	$num_matches = preg_match_all($pattern, $contents, $matches);
	if ($num_matches) {
		$double_quote = '"';

		// Format: [stuff]$searchfor=$value   or   [stuff]$searchfor="$value"
		// Need to delete  [stuff]$searchfor=  and optional double quotes
		$last = $matches[0][$num_matches - 1];		// get the last one
		$both = explode( '=', $last);
		if (isset($both[1])) {
			$last = $both[1];						// everything after equal sign
			$last = str_replace($double_quote, "", $last);
		} else {
			return($default);		// nothing after "="
		}
		return($last);
	} else {
		return($default);
	}
}

$displayed_thumbnail_error_message = false;
function make_thumb($src, $dest, $desired_width)
{
	if (! file_exists($src)) {
		echo "<br><p class='thumbnailError'>Unable to make thumbnail: '$src' does not exist!</p>";
		return(false);
	}
	if (filesize($src) === 0) {
		echo "<br><p class='thumbnailError'>Unable to make thumbnail: '$src' is empty!  Removed it.</p>";
		unlink($src);
		return(false);
	}

 	/* Make sure the imagecreatefromjpeg() function is in PHP. */
	global $displayed_thumbnail_error_message;
	if ( preg_match("/\.(jpg|jpeg)$/", $src ) ) {
		$funcext='jpeg';
	} elseif ( preg_match("/\.png$/", $src ) ) {
		$funcext='png';
	}
	if (function_exists("imagecreatefrom${funcext}") == false)
	{
		if ($displayed_thumbnail_error_message == false)
		{
			echo "<br><p class='thumbnailError'>Unable to make thumbnail(s); imagecreatefrom{$funcext}() does not exist.<br>If you do NOT have the file '/etc/php/7.3/mods-available/gd.ini' you need to download the latest PHP.</p>";
			$displayed_thumbnail_error_message = true;
		}
		return(false);
	}

	/* read the source image */
	$funcname="imagecreatefrom{$funcext}";
	$source_image = $funcname($src);
	$width = imagesx($source_image);
	$height = imagesy($source_image);

	/* find the "desired height" of this thumbnail, relative to the desired width  */
	if ($desired_width > $width)
		$desired_width = $width;	// This might create a very tall thumbnail...
	$desired_height = floor($height * ($desired_width / $width));

	/* create a new, "virtual" image */
	$virtual_image = imagecreatetruecolor($desired_width, $desired_height);

	/* copy source image at a resized size */
	imagecopyresampled($virtual_image, $source_image, 0, 0, 0, 0, $desired_width, $desired_height, $width, $height);

	/* create the physical thumbnail image to its destination */
 	@imagejpeg($virtual_image, $dest);

	// flush so user sees thumbnails as they are created, instead of waiting for them all.
	flush();	// flush even if we couldn't make the thumbnail so the user sees this file immediately.
	if (file_exists($dest)) {
		if (filesize($dest) === 0) {
			echo "<br><p class='thumbnailError'>Unable to make thumbnail for '$src': thumbnail was empty!  Using full-size image for thumbnail.</p>";
			unlink($dest);
			return(false);
		}
		return(true);
	} else {
		echo "<p class='thumbnailError'>Unable to create thumbnail for '$src': <b>" . error_get_last()['message'] . "</b></p>";
		return(false);
	}
}

// Did creation of last thumbnail work?
// If not, don't try to create any more since they likely won't work either.
$last_thumbnail_worked = true;

// Similar to make_thumb() but using a video for the input file.
function make_thumb_from_video($src, $dest, $desired_width, $attempts)
{
	global $last_thumbnail_worked;
	if (! $last_thumbnail_worked) {
		return(false);
	}

	if (! can_make_video_thumbnails()) {
		return(false);
	}

	if (! file_exists($src)) {
		echo "<br><p class='thumbnailError'>Unable to make thumbnail: '$src' does not exist!</p>";
		return(false);
	}
	if (filesize($src) === 0) {
		echo "<br><p class='thumbnailError'>Unable to make thumbnail: '$src' is empty!  Removed it.</p>";
		unlink($src);
		return(false);
	}

	// Start 5 seconds in to skip any auto-exposure changes at the beginning.
	// This of course assumes the video is at least 5 sec long.  If it's not, we won't be able
	// to create a thumbnail, so call ourselfs a second time using 1 second.
	// If the file is less than 1 second long, well, too bad.
	// "-1" scales the height to the original aspect ratio.
	if ($attempts === 1)
		$sec = "05";
	else
		$sec = "00";
	$command = "ffmpeg -loglevel warning -ss 00:00:$sec -i '$src' -filter:v scale='$desired_width:-1' -frames:v 1 '$dest' 2>&1";
	$output = array();
	exec($command, $output);
	if (file_exists($dest)) {
		if (filesize($dest) === 0) {
			echo "<br><p class='thumbnailError'>Unable to make thumbnail for '$src': thumbnail was empty!  Using full-size image for thumbnail.</p>";
			unlink($dest);
			return(false);
		}
		return(true);
	}

//echo "<br>Attempt $attempts: Failed to make thumbnail for $src using $sec seconds:<br>$command";
	if ($attempts >= 2) {
		echo "<br>Failed to make thumbnail for $src after $attempts attempts.<br>";
		echo "Last command: $command";
		echo "<br>Output from command: <b>" . $output[0] . "</b>";
		$last_thumbnail_worked = false;
		return(false);
	}

	return make_thumb_from_video($src, $dest, $desired_width, $attempts+1);
}

// Display thumbnails with links to the full-size files
// for startrails, keograms, and videos.
// The function to make thumbnails for videos is different
$back_button = "<a class='back-button' href='../index.php'>";
$back_button .= "<i class='fa fa-chevron-left'></i>&nbsp; Back to Live View</a>";

function display_thumbnails($dir, $file_prefix, $title)
{
	global $back_button, $webSettings_array;

	if ($file_prefix === "allsky") {
		$ext = "/\.(mp4|webm)$/";
	} else {
		$ext = "/\.(jpg|jpeg|png)$/";
	}
	$file_prefix_len = strlen($file_prefix);
		

	$num_files = 0;
	$files = array();
	if ($handle = opendir($dir)) {
		while (false !== ($entry = readdir($handle))) {
			if ( preg_match( $ext, $entry ) ) {
				$files[] = $entry;
				$num_files++;
			}
		}
		closedir($handle);
	}
	if ($num_files == 0) {
		echo "<p>$back_button</p>";
		echo "<div class='noImages'>No $title</div>";
		return;
	}

	asort($files);
	
	$thumb_dir = "$dir/thumbnails";
	if (! is_dir($thumb_dir)) {
		if (! mkdir($thumb_dir, 0775))
			echo "<p>Unable to make '$thumb_dir' directory. You will need to create it manually.</p>";
			print_r(error_get_last());
	}

	echo "<table class='imagesHeader'><tr>";
		echo "<td class='headerButton'>$back_button</td>";
		echo "<td class='headerTitle'>$title</td>";
	echo "</tr></table>";
	echo "<div class='archived-files'>\n";

	$thumbnailSizeX = v("thumbnailsizex", 100, $webSettings_array['homePage']);
	foreach ($files as $file) {
		// The thumbnail should be a .jpg.
		$thumbnail = preg_replace($ext, ".jpg", "$dir/thumbnails/$file");
		if (! file_exists($thumbnail)) {
			if ($file_prefix == "allsky") {
				if (! make_thumb_from_video("$dir/$file", $thumbnail, $thumbnailSizeX, 1)) {
					// We can't use the video file as a thumbnail
					$thumbnail = "../NoThumbnail.png";
				}
			} else {
				if (! make_thumb("$dir/$file", $thumbnail, $thumbnailSizeX)) {
					// Using the full-sized file as a thumbnail is overkill,
					// but it's better than no thumbnail.
					$thumbnail = "$dir/$file";
				}
			}
			// flush so user sees thumbnails as they are created, instead of waiting for them all.
			//echo "<br>flushing after $file:";
			flush();
		}
		$year = substr($file, $file_prefix_len + 1, 4);
		$month = substr($file, $file_prefix_len + 5, 2);
		$day = substr($file, $file_prefix_len + 7, 2);
		$date = $year.$month.$day;
		echo "<a href='$dir/$file'><div class='day-container'><div class='img-text'>";
			echo "<div class='image-container'>";
				echo "<img id='$date' src='$thumbnail' title='$file_prefix-$year-$month-$day'/>";
			echo "</div>";
			echo "<div class='day-text'>$year-$month-$day</div>";
		echo "</div></div></a>\n";
	}
	echo "</div>";	// archived-files
	echo "<div class='archived-files-end'></div>";	// clears "float" from archived-files
	echo "<div class='archived-files'><hr></div>";
}

// Read and decode a json file, returning the decoded results or null.
// On error, display the specified error message
function get_decoded_json_file($file, $associative, $errorMsg) {
	if (! file_exists($file)) {
		echo "<div style='color: red; font-size: 200%;'>";
		echo "$errorMsg:";
		echo "<br>File '$file' missing!";
		echo "</div>";
		return null;
	}

	$str = file_get_contents($file, true);
	if ($str === "") {
		echo "<div style='color: red; font-size: 200%;'>";
		echo "$errorMsg:";
		echo "<br>File '$file' is empty!";
		echo "</div>";
		return null;
	}

	$str_array = json_decode($str, $associative);
	if ($str_array == null) {
		echo "<div style='color: red; font-size: 200%;'>";
		echo "$errorMsg:";
		echo "<br>" . json_last_error_msg();
		$cmd = "json_pp < $file 2>&1";
		exec($cmd, $output);
		echo "<br>" . implode("<br>", $output);
		echo "</div>";
		return null;
	}
	return $str_array;
}

?>
