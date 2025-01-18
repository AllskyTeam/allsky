<?php
$privateVars = get_decoded_json_file(ALLSKY_ENV, true, "");

if ($privateVars !== null) {
	$adminUser = $privateVars["WEBUI_USERNAME"];
	$adminPassword = $privateVars["WEBUI_PASSWORD"];

	if ($useLogin) {		
		$user = getVariableOrDefault($_SERVER, "PHP_AUTH_USER", "");
		$pass = getVariableOrDefault($_SERVER, "PHP_AUTH_PW", "");
		$validated = ($user == $adminUser) && password_verify($pass, $adminPassword);

		if (! $validated) {
			header('WWW-Authenticate: Basic realm="Allsky Camera"');
			header('HTTP/1.0 401 Unauthorized');
			die ("Not authorized");
		}
	}
} else {
	die ("Missing " . basename(ALLSKY_ENV));
}

?>
