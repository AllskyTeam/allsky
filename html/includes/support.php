<?php

function rendersupport($twig) {

	if (! is_dir(ALLSKY_SUPPORT_DIR)) {
		$cmd = "{ sudo mkdir " .  ALLSKY_SUPPORT_DIR . " &&";
		$cmd .= " sudo chown " . ALLSKY_OWNER . ":" . WEBSERVER_GROUP . " " . ALLSKY_SUPPORT_DIR . " &&";
		$cmd .= " sudo chmod 775 " . ALLSKY_SUPPORT_DIR . "; } 2>&1";
		echo "<script>console.log('Excuting: $cmd');</script>";
		$x = exec($cmd, $result, $ret_value);
		if ($x === false || $ret_value !== 0) {
			echo "<p class='errorMsg'>Failed running $cmd: " . implode("<br>", $result) . ".</p>";
		}
	}

	$template = $twig->render('pages/support/page.twig', [
		"GITHUB_ROOT" => GITHUB_ROOT,
		"ALLSKY_REPO_URL" => GITHUB_ROOT . "/" . GITHUB_ALLSKY_REPO,
		"ALLSKY_MODULES_REPO_URL" => GITHUB_ROOT . "/" . GITHUB_ALLSKY_MODULES_REPO,
		"discussionurl" => GITHUB_ROOT . "/" . GITHUB_ALLSKY_REPO . "/discussions"
	]);

	return array(
		"template" => $template,
		"extracss" => array(
			"/js/datatables/datatables.min.css",
			"https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css"
		),
		"extrajs" => array(
			"/js/allsky-support/allsky-support.js",
			"/js/datatables/datatables.js",
			"/js/jquery-loading-overlay/dist/loadingoverlay.min.js",
			"/js/bootbox/bootbox.all.js",
			"/js/bootbox/bootbox.locales.min.js"
		)
	);
}