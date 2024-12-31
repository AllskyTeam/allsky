<?php

include_once('functions.php');
initialize_variables();

include_once('authenticate.php');

class SUPPORTUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $issueDir;

    function __construct() {
        $this->issueDir = ALLSKY_WEBUI . "/support";
		if (! is_dir($this->issueDir)) {
			$this->send500("Directory '" . $this->issueDir . "' not found!\n");
		}
    }

    public function run()
    {
        $this->checkXHRRequest();
        $this->sanitizeRequest();
        $this->runRequest();
    }

    private function checkXHRRequest()
    {
        $var = "HTTP_X_REQUESTED_WITH";
		$val = "";
        if (empty($_SERVER[$var])) {
            $this->send404("$var not set");
		} else {
			$val = strtolower($_SERVER[$var]);
			$v = "xmlhttprequest";
			if ($val != $v) {
            	$this->send404("$var ($val) != $v");
			}
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

    private function send404($msg = null)
    {
        header('HTTP/1.0 404 Not Found');
		if ($msg !== null) {
// TODO: Is this the correct way to pass it back?
			echo $msg;
		}
        die();
    }

    private function send500($msg = null)
    {
        header('HTTP/1.0 500 Internal Server Error');
		if ($msg !== null) {
// TODO: Is this the correct way to pass it back?
			echo $msg;
		}
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
        if (is_callable(array('SUPPORTUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404("SUPPORTUTIL is not callable.");
        }
    }

    private function humanReadableFileSize($bytes, $decimals = 2) {
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . ' ' . $sizes[$factor];
    }

    public function postDownloadLog() {
        $logId = $_POST['logId'];
        $logId = basename($logId);
        $fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($fromFile) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fromFile));
        readfile($fromFile);
// TODO: handle error in readfile()
        exit;
    }

    public function postChangeGithubId() {
        $logId = $_POST['logId'];
        $logId = basename($logId);

        $githubId = $_POST['githubid'];

        $nameParts = explode('-', $logId);
        $newLogId = $nameParts[0] . '-' . $githubId . '-' . $nameParts[2];

        $fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
        $newFile = $this->issueDir . DIRECTORY_SEPARATOR . $newLogId;

        rename($fromFile, $newFile);
// TODO: handle failure
        $this->sendResponse(json_encode("ok"));
    }

    public function postDeleteLog() {
        $logId = $_POST['logId'];
        $logId = basename($logId);
        
        $fileToDelete = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
        unlink($fileToDelete);
// TODO: handle failure in unlink()
        $this->sendResponse(json_encode("ok"));
    }

    public function getSupportFilesList() {

        $data=array();
        
        $files = scandir($this->issueDir);
// TODO: handle error in scandir()
        foreach ($files as $file) {
            if (strpos($file, '.') !== 0) {

                $fileBits = explode("-", $file);
                $issue = $fileBits[1];
                $date = explode(".", $fileBits[2])[0];
                $year = substr($date, 0, 4);
                $month = substr($date, 4, 2);
                $day = substr($date, 6, 2);
                $hour = substr($date, 8, 2);
                $minute = substr($date, 10, 2);
                $second = substr($date, 12, 2);

                $timestamp = mktime($hour, $minute, $second, $month, $day, $year);
                $formattedDate = strftime("%A %d %B %Y, %H:%M", $timestamp);

                $size = filesize($this->issueDir . DIRECTORY_SEPARATOR . $file);
                $hrSize = $this->humanReadableFileSize($size);

                $data[] = [
                    "filename" => $file,
                    "sortfield" => $year.$month.$day.$hour.$minute.$second,
                    "date" => $formattedDate,
                    "issue" => $issue,
                    "size" => $hrSize,
                    "actions" => ""                    
                ];
            }
        }
        $this->sendResponse(json_encode($data));
    }

    public function getGenerateLog() {
        $command = 'export ALLSKY_HOME=' . ALLSKY_HOME . '; export SUDO_OK="true"; ';
		$command .= ALLSKY_HOME . '/support.sh --auto';
        $output = shell_exec($command);
// TODO: handle errors from shell_exec

        $this->sendResponse(json_encode("ok"));        
    }

}


$supportUtil = new SUPPORTUTIL();
$supportUtil->run();
