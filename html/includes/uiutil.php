<?php

include_once('functions.php');
initialize_variables();

include_once('authenticate.php');

class UIUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $returnValues = False;

    function __construct() {
        $this->allskyHome = ALLSKY_HOME;
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


    private function sendResponse($response = 'ok', $isJson = false) {

        if ($isJson) {
            header('Content-Type: application/json');
            echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            header('Content-Type: text/html; charset=UTF-8');
            echo $response;
        }

        die();
    }

    private function runRequest()
    {
        $action = $this->method . $this->request;
        if (is_callable(array('UIUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

    private function displayProgress($x, $data, $min, $current, $max, $danger, $warning, $status_override)
    {
        if ($status_override !== "") {
            $myStatus = $status_override;
        } else if ($current >= $danger) {
            $myStatus = "danger";
        } elseif ($current >= $warning) {
            $myStatus = "warning";
        } else {
            $myStatus = "success";
        }

        if ($current < $min) {
            $current = $min;
        } else if ($current > $max) {
            $current = $max;
        }
        $width = (($current - $min) / ($max - $min)) * 100;

        $result =  "<div class='progress-bar progress-bar-$myStatus'";
        $result .= "    role='progressbar'";
        $result .= "    title='current: $current, min: $min, max: $max'";
        $result .= "    aria-valuenow='$current' aria-valuemin='$min' aria-valuemax='$max'";
        $result .= "    style='width: $width%;'>$data";
        $result .= "</div>";

        return $result;
    }

    public function getAllskyStatus() 
    {
        $result = output_allsky_status();
        $this->sendResponse($result);
    }

    public function getCPULoad() 
    {
        $cpuLoad = getCPULoad(1);

        $cpuBar = $this->displayProgress("", $cpuLoad . "%", 0, $cpuLoad, 100, 90, 75, ""); 

        if ($this->returnValues) {
            return $cpuBar;
        }
        $this->sendResponse($cpuBar);
    }

    public function getCPUTemp() 
    {
        $cpuTempData = getCPUTemp();

        $temperature = $cpuTempData['temperature'];
		$display_temperature = $cpuTempData['display_temperature'];
		$temperature_status = $cpuTempData['temperature_status'];

        $cpuTemp =$this->displayProgress("", $display_temperature, 0, $temperature, 100, 70, 60, $temperature_status);

        if ($this->returnValues) {
            return $cpuTemp;
        }
        $this->sendResponse($cpuTemp);   
    }

    public function getMemoryUsed()
    {
        $memoryUsed = getMemoryUsed();

        $memoryBar = $this->displayProgress("", $memoryUsed . "%", 0, $memoryUsed, 100, 90, 75, "");

        if ($this->returnValues) {
            return $memoryBar;
        }
        $this->sendResponse($memoryBar);
    }

    public function getThrottleStatus() 
    {
        $throttleStatusData = getThrottleStatus();

	    $throttle_status = $throttleStatusData['throttle_status'];
	    $throttle = $throttleStatusData['throttle']; 

		$throttleBar = $this->displayProgress("", $throttle, 0, 100, 100, -1, -1, $throttle_status);

        $this->sendResponse($throttleBar);

    }

    public function getUptime()
    {
        $uptime = getUptime();

        if ($this->returnValues) {
            return $uptime;
        }
        $this->sendResponse($uptime);
    }

    public function postMultiple() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $this->returnValues = true;
        $result = [];

        foreach ($data as $key => $value) {
            $method = "get" . $value["data"];
            if (method_exists($this, $method)) {
                $result[$value["data"]] = call_user_func(array($this, $method));
            } else {
                $result[$value["data"]] = "Method $value does not exist.";
            }
        }
        $this->sendResponse($result, true);
    }
}   


$uiUtil = new UIUTIL();
$uiUtil->run();