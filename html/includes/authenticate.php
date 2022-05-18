<?php
if (isset($_SERVER['PHP_AUTH_USER']))
	  $user = $_SERVER['PHP_AUTH_USER'];
else
	  $user = "";
if (isset($_SERVER['PHP_AUTH_PW']))
	  $pass = $_SERVER['PHP_AUTH_PW'];
else
	  $pass = "";

$validated = ($user == $config['admin_user']) && password_verify($pass, $config['admin_pass']);

if (!$validated) {
	  header('WWW-Authenticate: Basic realm="Allsky Camera"');
	  header('HTTP/1.0 401 Unauthorized');
	  die ("Not authorized");
}

?>
