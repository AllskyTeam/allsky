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
			$this->send404("Directory '" . $this->issueDir . "' not found!");
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
		header('HTTP/1.0 404');
		if ($msg !== null) {
			header('Content-Type: application/json');
			echo json_encode([
				'error' => $msg,
				'code' => 404
			]);
		}
		die();
	}

	private function send500($msg = null)
	{
		header('HTTP/1.0 500 Internal Server Error');
		if ($msg !== null) {
			header('Content-Type: application/json');
			echo json_encode([
				'error' => $msg,
				'code' => 500
			]);
		}
		die();
	}

	private function sendResponse($response = 'ok')
	{
		http_response_code(200);
		header('Content-Type: application/json');
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

	private function humanReadableFileSize($bytes, $decimals = 2)
	{
		$sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		$factor = floor((strlen($bytes) - 1) / 3);
		if ($factor == 0) {
			$s = "%d";		// Bytes need no decimal
		} else {
			$s = "%.{$decimals}f";
		}
		return sprintf($s, $bytes / pow(1024, $factor)) . ' ' . $sizes[$factor];
	}

	public function postDownloadLog()
	{
		$logId = $_POST['logId'];		// filename
		$logId = basename($logId);
		$fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;

		if ( ! is_readable($fromFile)) {
			$this->send500("'$fromFle' does not exist or is not readable.");
		} else {
			header('Content-Description: File Transfer');
			header('Content-Type: application/octet-stream');
			header('Content-Disposition: attachment; filename="' . basename($fromFile) . '"');
			header('Content-Transfer-Encoding: binary');
			header('Expires: 0');
			header('Cache-Control: must-revalidate');
			header('Pragma: public');
			header('Content-Length: ' . filesize($fromFile));
			if ( ! readfile($fromFile)) {
				$this->send500("Unable to read from '$fromFle'.");
			}
		}
		exit;
	}

	private function parseFilename($filename) {
		// File name format:
		//		support-REPO-PROBLEM_TYPE-PROBLEM_ID-YYYYMMDDHHMMSS.zip
		//      0       1      2            3          4
		// Where:
		//	REPO is "repo", "AS", or "ASM".
		//	PROBLEM_TYPE is "type", "discussion", or "issue"
		//	PROBLEM_ID is "none" or a numeric GitHub ID.
		$ok = true;
		$name = explode("-", $filename);
		$num = count($name);
		if ($num !== 5) {
			$ok = false;
		} else {
			$support = $name[0];
			$repo = $name[1];
			$type = $name[2];
			$id = $name[3];
			$timestamp = $name[4];
			if ($support !== "support") {
				$ok = false;
			} else {
				$t = explode(".", $timestamp);
				$timestamp = $t[0];
				$ext = $t[1];
// error_log("support=$support, repo=$repo, id=$id, timestamp=$timestamp, ext=$ext");
				return [
					'repo'		=> $repo,
					'type'		=> $type,
					'id'		=> $id,
					'timestamp' => $timestamp,
					'ext'	   => $ext
				];
			}
		}
		if (! $ok) {
			error_log("Support log file '$filename' is not a valid file name - ignoring.");
			return null;
		}
	}

	public function postChangeGithubId()
	{
		$logId = $_POST['logId'];		// filename
		$logId = basename($logId);

		$fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
		if ( ! is_readable($fromFile)) {
			$this->send500("'$fromFile' does not exist or is not readable.");
		}

		$newRepo = $_POST['repo'];			// user-entered repository name
		$newId  = $_POST['newId'];		// user-entered number
		$fileParts = $this->parseFilename($logId);
		if ($fileParts === null) {
			$this->send500("Bad file name: '$logId'");
		}

// TODO: Look in GitHub to see if the newId is an existing Discussion or Issue.
// Tell the user to re-enter the number if not in GitHub.
// BE CAREFUL: if you look in {[issues|discussions} for an item and it's in the other one,
// GitHub returns HTM code 302 and then returns the page in the other location assuming it exists.
// Need to treat HTML 404 and 302 as both "not found".
$newType = "discussion"; // For now assume Discussion.

		$timestamp = $fileParts['timestamp'];		// reuse existing value
		$ext = $fileParts['ext'];
		$newFile = $this->issueDir . DIRECTORY_SEPARATOR;
		$newFile .= "support-$newRepo-$newType-$newId-$timestamp.$ext";
		$ret = @rename($fromFile, $newFile);
		if ($ret === false) {
			// Assume if failed due to permissions.
			$cmd = "sudo chgrp " . WEBSERVER_GROUP . " '$fromFile' " . ALLSKY_SUPPORT_DIR;
			$cmd .= " && sudo chmod g+w '$fromFile' " . ALLSKY_SUPPORT_DIR;
			$return = null;
			$ret = exec("( $cmd ) 2>&1", $return, $retval);
			if (gettype($return) === "array")
				$c = count($return);
			else
				$c = 0;
			if ($ret === false || $c > 0 || $retval !== 0) {
				$msg = "ERROR: '$cmd' returned code $retval: ";
				if ($c > 0) {
					$msg .= implode("\n", $return);
				} else {
					$msg .= error_get_last()['message'];
				}
				error_log($msg);
				$this->send500("cmd '$cmd' failed");
			}
			$ret = @rename($fromFile, $newFile);
			if ($ret === false) {
				$msg = "ERROR: '$cmd' failed: ";
				$msg .= error_get_last()['message'];
				error_log($msg);
				$this->send500("Could not rename($fromFile, $newFile)");
			}
		}

		$this->sendResponse(json_encode("ok"));
	}

	public function postDeleteLog()
	{
		$logId = $_POST['logId'];		// filename
		$logId = basename($logId);

		$fileToDelete = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
		if (@unlink($fileToDelete)) {
			$this->sendResponse(json_encode("ok"));
		} else {
			$this->send500("Could not unlink($fileToDelete)");
		}
	}

	public function getSupportFilesList()
	{
		$data = array();

		if ( ! is_dir($this->issueDir)) {
			$sg = "Directory '" . $this->issueDir . "' does not exist.";
			$this->send500($msg);
			return;
		}

		$files = @scandir($this->issueDir);
		if ($files === false) {
			$msg = "scandir({$this->issueDir}) failed.";
			$data[] = [
				"filename" => "",
				"repo" => "",
				"type" => "",
				"ID" => "",
				"sortfield" => "",
				"date" => "<br><p class='errorMsgBox errorMsg'>$msg</p>",
				"size" => "",
				"actions" => ""
			];
		} else {
			foreach ($files as $file) {
				if (strpos($file, '.') === 0) {		// ignore "." and ".."
					continue;
				}
				$fileParts = $this->parseFilename(($file));
				if ($fileParts === null) {
					continue;
				}

				$repo = $fileParts['repo'];
				$problemType = $fileParts['type'];
				$GitHubID = $fileParts['id'];
				$date = $fileParts['timestamp'];
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
					"repo" => $repo,
					"type" => $problemType,
					"ID" => $GitHubID,
					"sortfield" => $year.$month.$day.$hour.$minute.$second,
					"date" => $formattedDate,
					"size" => $hrSize,
					"actions" => ""
				];
			}
		}
		$this->sendResponse(json_encode($data));
	}

	public function getGenerateLog()
	{
		$command = 'export ALLSKY_HOME=' . ALLSKY_HOME . '; export SUDO_OK="true"; ';
		$command .= ALLSKY_HOME . '/support.sh --auto 2>&1';
		exec($command, $output, $exitCode);
		if ($exitCode === 0) {
			$this->sendResponse(json_encode("ok"));
		} else {
			$this->send500("[$cmd] failed: " . implode(" ", $output));
		}
	}

}


$supportUtil = new SUPPORTUTIL();
$supportUtil->run();
