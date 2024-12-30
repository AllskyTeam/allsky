<?php

include_once('functions.php');
initialize_variables();

include_once('authenticate.php');

class ADMINUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $adminUser;
    private $adminPassword;

    function __construct() {
        session_start();

        $privateVars = get_decoded_json_file(ALLSKY_ENV, true, '');
        $this->adminUser = $privateVars['WEBUI_USERNAME'];
        $this->adminPassword = $privateVars['WEBUI_PASSWORD'];
    }

    public function run()
    {
        $this->checkXHRRequest();
        $this->sanitizeRequest();
        $this->runRequest();
    }

    private function checkXHRRequest()
    {
        if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest') {
            $this->send404();
        }
    }

    private function sanitizeRequest()
    {
        $this->request = $_GET['request'];
        $this->method = strtolower($_SERVER['REQUEST_METHOD']);

        $accepts = $_SERVER['HTTP_ACCEPT'];
        if (stripos($accepts, 'application/json') !== false) {
            $this->jsonResponse = true;
        }
    }

    private function send400($message="Unknown Error")
    {
        header('HTTP/1.0 400 Unauthorized');
        die($message);
    }

    private function send401()
    {
        header('HTTP/1.0 401 Unauthorized');
        die();
    }

    private function send404()
    {
        header('HTTP/1.0 404 Not Found');
        die();
    }

    private function send500()
    {
        header('HTTP/1.0 500 Internal Server Error');
        die();
    }

    private function sendResponse($response = 'ok')
    {
        echo ($response);
        die();
    }

    private function runRequest()
    {
        $action = $this->method . $this->request;
        if (is_callable(array('ADMINUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

	private function validatePassword($secure, $password) {
		$result = [
			'error' => true,
			'message' => 'Error running password validation'
		];
		$useSecure = '--nosecure';
		if ($secure == 'on') {
			$useSecure = '';
		}
		$command = ALLSKY_UTILITIES . '/validatePassword.sh ' . $useSecure . ' --password ' . $password;

		return $this->runShellCommand($command);
	}

	private function runShellCommand($command) {
		$descriptors = [
			1 => ['pipe', 'w'],
			2 => ['pipe', 'w'],
		];
		$process = proc_open($command, $descriptors, $pipes);
		
		if (is_resource($process)) {
			$stdout = stream_get_contents($pipes[1]);
			$stderr = stream_get_contents($pipes[2]);
			fclose($pipes[1]);
			fclose($pipes[2]);
		
			$returnCode = proc_close($process);
			if ($returnCode > 0) {
				$result = [
					'error' => true,
					'message' => ($stdout !== '') ? $stdout : $stderr					
				];
			} else {
				$result = [
					'error' => false,
					'message' => $stdout					
				];				
			}
		}

		return $result;
	}

	public function postPasswordFormat() {
		$useonline=filter_input(INPUT_POST, 'useonline', FILTER_VALIDATE_BOOLEAN);
		$useSecure = ($useonline) ? '' : '--nosecure';
		$command = ALLSKY_UTILITIES . '/validatePassword.sh --getformat ' . $useSecure;
		$result = $this->runShellCommand($command);

		if ($result['error']) {
			$this->send400('Unable to get password format');
		} else {
			$this->sendResponse($result['message']);
		}
	}

    public function postValidate() 
    {
		if (CSRFValidate()) {
            $new_username=trim(filter_input(INPUT_POST, 'username', FILTER_SANITIZE_STRING));
            $old=trim(filter_input(INPUT_POST, 'oldpass', FILTER_SANITIZE_STRING));
            $new1=trim(filter_input(INPUT_POST, 'newpass', FILTER_SANITIZE_STRING));
            $new2=trim(filter_input(INPUT_POST, 'newpassagain', FILTER_SANITIZE_STRING));
            $useWebUILogin=filter_input(INPUT_POST, 'as-enable-webui-login', FILTER_VALIDATE_BOOLEAN);
            $useonline=filter_input(INPUT_POST, 'as-use-online', FILTER_VALIDATE_BOOLEAN);

			if ($new_username == '') {
                $this->send400('You must enter the username.');
			}
			if ($old == "" || $new1 == "" || $new2 == "") {
                $this->send400('You must enter the old (current) password, and the new password twice.');
			} else if (password_verify($old, $this->adminPassword)) {
				if ($new1 != $new2) {
                    $this->send400('New passwords do not match.');
				} else if ($new_username == '') {
                    $this->send400('Username must not be empty.');
				} else {

					$result = $this->validatePassword($useonline, $new1);
					if ($result['error']) {
						$this->send400($result['message']);
					} else {
						$privateVars = get_decoded_json_file(ALLSKY_ENV, true, "");
						$privateVars['WEBUI_USERNAME'] = $new_username;
						$privateVars['WEBUI_PASSWORD'] = password_hash($new1, PASSWORD_BCRYPT);

						$ret = file_put_contents(ALLSKY_ENV, json_encode($privateVars, JSON_PRETTY_PRINT));
						if ($ret !== false) {
							$content = readSettingsFile();
							if ($useWebUILogin) {
								if ($content['uselogin'] !== $useWebUILogin) {
									$content['uselogin'] = $useWebUILogin;
									$settings_file = getSettingsFile();
									$mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
									$content = json_encode($content, $mode);
									$msg = updateFile($settings_file, $content, "settings", false);
								}
							}							
							$username = $new_username;
							$this->sendResponse("$new_username password updated.");
						} else {
							$this->send400('Failed to update password saving to file failed.');
						}
					}
				}
			} else {
                $this->send400('The old password is incorrect.');
			}
		} else {
            $this->send401();
		}
    }
}

$supportUtil = new ADMINUTIL();
$supportUtil->run();