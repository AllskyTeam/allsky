<?php
function renderlist_days($twig) {

	$statusMessages = new StatusMessages();

	if (! is_dir(ALLSKY_IMAGES)) {
		return $twig->render('errors/images_missing.twig');
	} else {

		$date = getVariableOrDefault($_POST, 'delete_directory', null);
		if ($date !== null) {
			$msg = delete_directory(ALLSKY_IMAGES . "/$date");
			if ($msg == "") {
				$statusMessages->addMessage("Deleted directory $date", "success", true, "fa-solid fa-circle-info");
			} else {
				$statusMessages->addMessage("Unable to delete directory for $date: $msg", "danger", true, "fa-solid fa-circle-info");
			}
		}

		if ($handle = opendir(ALLSKY_IMAGES)) {
			while (false !== ($day = readdir($handle))) {
				if (is_valid_directory($day)) {
					$haveTimelapse = false;
					if (glob(ALLSKY_IMAGES . "/$day/*.mp4") != false) {
						$haveTimelapse = true;
					}

					$haveKeogram = false;
					if (is_dir(ALLSKY_IMAGES . "/$day/keogram")) {
						$haveKeogram = true;
					}
					
					$haveStarTrails = false;
					if (is_dir(ALLSKY_IMAGES . "/$day/startrails")) {
						$haveStarTrails = true;		
					}

					$days[$day] = array(
						"day" => $day,
						"haveTimelapse" => $haveTimelapse,
						"haveKeogram" => $haveKeogram,
						"haveStarTrails" => $haveStarTrails
					);
				}
			}
			closedir($handle);
		}
		arsort($days);

		$messages = "";
		if ($statusMessages->isMessage()) {
			$messages = $statusMessages->getMessages();
		}

		return $twig->render('pages/images/days.twig', [
			"days" => $days,
			"messages" => $messages
		]);
	}
}

function renderlist_images($twig) {
	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		return $twig->render('errors/generic.twig', [
			"message" => 'No day specified. Please click <a href="index.php?page=list_days">here</a> to return to the image overview page'
		]);
	} else {

		$images = array();
		$dir = ALLSKY_IMAGES . "/$chosen_day";
		if ($handle = opendir($dir)) {
			while (false !== ($image = readdir($handle))) {
				// Name format: "image-YYYYMMDDHHMMSS.jpg" or .jpe or .png
				if (preg_match('/^\w+-.*\d{14}[.](jpe?g|png)$/i', $image)){
					$images[] = array(
						"thumbnail" => "/images/$chosen_day/thumbnails/$image",
						"full" => "/images/$chosen_day/$image"
					);
				}
			}
			closedir($handle);
		}

		return $twig->render('pages/images/images.twig', [
			"images" => $images
		]);

	}	
}

function getVideos($day, &$videos) {
	$videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv'];

	$dir = ALLSKY_IMAGES . "/$day";
	if ($handle = opendir($dir)) {
		while (false !== ($file = readdir($handle))) {
			$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

			if (in_array($ext, $videoExtensions)) {


				$command = "ffprobe -v quiet -print_format json -show_format -show_streams " . escapeshellarg(ALLSKY_HOME . "/images/$day/$file");
				$output = shell_exec($command);
				$info = json_decode($output, true);

				if ($info) {
					$duration = $info['format']['duration'];
					$width = $info['streams'][0]['width'] ?? null;
					$height = $info['streams'][0]['height'] ?? null;
					$codec = $info['streams'][0]['codec_name'] ?? null;
				} else {
					$duration = 0;
					$width = 0;
					$height = 0;
					$codec = '';
				}


				$videos[] = array(
					"full" => "/images/$day/$file",
					"name" => $file,
					"duration" => $duration,
					"width" => $width,
					"height" => $height,
					"codec" => $codec,
					"day" => $day
				);
			}
		}
		closedir($handle);
	}
}
function renderlist_timelapse($twig) {

	$showAll = getVariableOrDefault($_GET, 'all', false);
	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		return $twig->render('errors/generic.twig', [
			"message" => 'No day specified. Please clike <a href="index.php?page=list_days">here</a> to return to the image overview page'
		]);
	} else {
		$videos = array();

		if ($showAll === "false") {	
			getVideos($chosen_day, $videos);
		} else {
			if ($handle = opendir(ALLSKY_IMAGES)) {
				while (false !== ($day = readdir($handle))) {
					if (is_valid_directory($day)) {
						getVideos($day, $videos);
					}
				}
				closedir($handle);
			}
		}
		return $twig->render('pages/images/videos.twig', [
			"videos" => $videos
		]);
	}	
}

function getKeograms($day, &$keograms) {
	$keogramExtensions = ['jpg', 'png'];

	$dir = ALLSKY_IMAGES . "/$day/keogram";
	if ($handle = opendir($dir)) {
		while (false !== ($file = readdir($handle))) {
			$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

			if (in_array($ext, $keogramExtensions)) {
				$keograms[] = array(
					"full" => "/images/$day/keogram/$file",
					"name" => $file,
					"day" => $day
				);
			}
		}
		closedir($handle);
	}
}

function renderlist_keogram($twig) {
	$showAll = getVariableOrDefault($_GET, 'all', false);
	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		return $twig->render('errors/generic.twig', [
			"message" => 'No day specified. Please clike <a href="index.php?page=list_days">here</a> to return to the image overview page'
		]);
	} else {
		$keograms = array();

		if ($showAll === "false") {
			getKeograms($chosen_day, $keograms);
		} else {
			if ($handle = opendir(ALLSKY_IMAGES)) {
				while (false !== ($day = readdir($handle))) {
					if (is_dir(ALLSKY_IMAGES . '/' . $day . '/keogram')) {
						getKeograms($day, $keograms);
					}
				}
				closedir($handle);
			}
		}	

		return $twig->render('pages/images/keograms.twig', [
			"keograms" => $keograms
		]);
	}	
}

function getStartrails($day, &$startrails) {
	$startrailsExtensions = ['jpg', 'png'];

	$dir = ALLSKY_IMAGES . "/$day/startrails";
	if ($handle = opendir($dir)) {
		while (false !== ($file = readdir($handle))) {
			$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
			if (in_array($ext, $startrailsExtensions)) {
				$startrails[] = array(
					"full" => "/images/$day/startrails/$file",
					"name" => $file,
					"day" => $day

				);
			}
		}
		closedir($handle);
	}
}

function renderlist_startrail($twig) {
	$showAll = getVariableOrDefault($_GET, 'all', false);
	$chosen_day = getVariableOrDefault($_GET, 'day', null);
	if ($chosen_day === null) {
		return $twig->render('errors/generic.twig', [
			"message" => 'No day specified. Please clike <a href="index.php?page=list_days">here</a> to return to the image overview page'
		]);
	} else {
		$startrails = array();

		if ($showAll === "false") {
			getStartrails($chosen_day, $startrails);
		} else {
			if ($handle = opendir(ALLSKY_IMAGES)) {
				while (false !== ($day = readdir($handle))) {
					if (is_dir(ALLSKY_IMAGES . '/' . $day . '/startrails')) {
						getStartrails($day, $startrails);
					}
				}
				closedir($handle);
			}
		}	

		return $twig->render('pages/images/startrails.twig', [
			"startrails" => $startrails
		]);
	}	
}