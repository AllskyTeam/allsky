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
		$this->issueDir = ALLSKY_SUPPORT_DIR;
		if (! is_dir($this->issueDir)) {
			$msg = "Directory '" . $this->issueDir . "' not found!";
			$this->send404($msg);
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
		if ($msg !== null) {
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
			die();
		}
		header('HTTP/1.0 404 Not Found');
		if ($msg !== null) {
			header("Content-Description: $msg");
		}
		die();
	}

	private function send500($msg = null)
	{
		header('HTTP/1.0 500 Internal Server Error');
		if ($msg !== null) {
			header("Content-Description: $msg");
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
			$this->send404($this->request . " is not callable.");
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
// TODO: check if $fromFile exists
		header('Content-Description: File Transfer');
		header('Content-Type: application/octet-stream');
		header('Content-Disposition: attachment; filename="' . basename($fromFile) . '"');
		header('Content-Transfer-Encoding: binary');
		header('Expires: 0');
		header('Cache-Control: must-revalidate');
		header('Pragma: public');
		header('Content-Length: ' . filesize($fromFile));
		if ( ! readfile($fromFile)) {
			echo "ERROR: Unable to read '$fromFile'";
		}
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

		if ( ! file_exists($fromFile)) {
			$msg = "'$fromFile' does not exist.";
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
		} else if (rename($fromFile, $newFile)) {
			$this->sendResponse(json_encode(array("status"=>"ok")));
		} else {
			$msg = "Could not rename($fromFile, $newFile)";
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
		}
	}

	public function postDeleteLog() {
		$logId = $_POST['logId'];
		$logId = basename($logId);

		$fileToDelete = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
		if (@unlink($fileToDelete)) {
			$this->sendResponse(json_encode(array("status"=>"ok")));
		} else {
			$msg = "Could not unlink($fileToDelete)";
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
		}
	}

	public function getSupportFilesList() {

		$data = array();

		if ( ! is_dir($this->issueDir)) {
			$sg = "Directory '" . $this->issueDir . "' does not exist.";
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
			return;
		}
		$files = scandir($this->issueDir . "x");
		if ($files === false) {
			$msg = "scandir({$this->issueDir}) failed.";
			// TODO  $data = array("status"=>"ERROR", "message"=>"$msg");
			$data[] = [
				"filename" => "",
				"sortfield" => "",
				"date" => "<br><p class='errorMsgBox errorMsg'>$msg</p>",
				"ID" => "",
				"size" => "",
				"actions" => ""
			];
		} else {
			// file format:  support-none-20250612160748.zip
			foreach ($files as $file) {
				if (strpos($file, '.') === 0) {
					continue;
				}
				$fileBits = explode("-", $file);
				$problemType = $fileBits[0];
				if ($problemType !== "support" && $problemType !== "Discussion" && $problemType !== "Issue") {
					continue;
				}

				$GitHubID = $fileBits[1];					// GitHub ID
				$date = explode(".", $fileBits[2])[0];	// date
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
				   	"ID" => $GitHubID,
				   	"size" => $hrSize,
				   	"actions" => ""
			   	];
			}
		}
		$this->sendResponse(json_encode($data));
	}

	public function getGenerateLog() {
		$command = 'export ALLSKY_HOME=' . ALLSKY_HOME . '; export SUDO_OK="true"; ';
		$command .= ALLSKY_HOME . '/support.sh --auto 2>&1';
		exec($command, $result, $ret_code);
		if ($ret_code === 0) {
			$this->sendResponse(json_encode(array("status"=>"ok")));
		} else {
			$msg = "[$cmd] failed: " . implode(" ", $result);
			$this->sendResponse(json_encode(array("status"=>"ERROR", "message"=>"$msg")));
		}
	}

}


$supportUtil = new SUPPORTUTIL();
$supportUtil->run();
