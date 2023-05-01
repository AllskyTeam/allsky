<?php
$user = getVariableOrDefault($_SERVER, "PHP_AUTH_USER", "");
$pass = getVariableOrDefault($_SERVER, "PHP_AUTH_PW", "");

if ($useLogin) {
	$validated = ($user == $config['admin_user']) && password_verify($pass, $config['admin_pass']);

	if (! $validated) {
	  	header('WWW-Authenticate: Basic realm="Allsky Camera"');
	  	header('HTTP/1.0 401 Unauthorized');
	  	die ("Not authorized");
	}
}

?>
