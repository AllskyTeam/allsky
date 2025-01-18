<?php

include_once('functions.php');
initialize_variables();

include_once('authenticate.php');

class I2CUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $issueDir;

    function __construct() {
        $this->issueDir = ALLSKY_WEBUI . "/support";
    }

    public function run()
    {
        //$this->checkXHRRequest();
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
        if (is_callable(array('I2CUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
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

    public function getDevices() {
		$command = 'sudo ' . ALLSKY_SCRIPTS . "/i2cbus.py";
		$result = $this->runShellCommand($command);
        $this->sendResponse($result['message']);
	}

	public function getData() {
		$filename = ALLSKY_CONFIG . '/i2c.json';
		$data = file_get_contents($filename);
        $this->sendResponse($data);		
	}

}


$i2cUtil = new I2CUTIL();
$i2cUtil->run();