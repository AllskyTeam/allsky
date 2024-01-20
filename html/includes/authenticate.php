<?php
// Default admin username and password:
$config = array(
  'admin_user' => 'admin',
  'admin_pass' => '$2y$10$YKIyWAmnQLtiJAy6QgHQ.eCpY4m.HCEbiHaTgN6.acNC6bDElzt.i'
);

// Can be overridden by what's in this file, if it exists:
if(file_exists(RASPI_ADMIN_DETAILS)) {
    if ( $auth_details = fopen(RASPI_ADMIN_DETAILS, 'r') ) {
      $config['admin_user'] = trim(fgets($auth_details));
      $config['admin_pass'] = trim(fgets($auth_details));
      fclose($auth_details);
    }
}


// Check login if needed.
if ($useLogin) {
	$user = getVariableOrDefault($_SERVER, "PHP_AUTH_USER", "");
	$pass = getVariableOrDefault($_SERVER, "PHP_AUTH_PW", "");
	$validated = ($user == $config['admin_user']) && password_verify($pass, $config['admin_pass']);

	if (! $validated) {
	  	header('WWW-Authenticate: Basic realm="Allsky Camera"');
	  	header('HTTP/1.0 401 Unauthorized');
	  	die ("Not authorized");
	}
}
?>
