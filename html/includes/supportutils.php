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
        header('HTTP/1.0 404 ');
        if ($msg !== null) {
            header('Content-Type: application/json');
            echo json_encode([
                'error' => $msg,
                'code' => 404
            ]);
        }
        die();
    }

    private function send500()
    {
        header('HTTP/1.0 500 Internal Server Error');
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
            $this->send404("SUPPORTUTIL is not callable.");
        }
    }

    private function humanReadableFileSize($bytes, $decimals = 2) 
    {
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . ' ' . $sizes[$factor];
    }

    public function postDownloadLog() 
    {
        $logId = $_POST['logId'];
        $logId = basename($logId);
        $fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;

        if (!file_exists($fromFile) || !is_readable($fromFile)) {
            $this->send500();
        } else {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($fromFile) . '"');
            header('Content-Transfer-Encoding: binary');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($fromFile));
            readfile($fromFile);
        }
        exit;
    }

    private function parseFilename($filename) {
        $pattern = '/^support(?:-([a-zA-Z0-9]+))?(?:-(\d+))?-(\d{14})\.zip$/';

        if (preg_match($pattern, $filename, $matches)) {
            return [
                'source'    => isset($matches[1]) ? $matches[1] : 'AS',
                'id'        => isset($matches[2]) ? $matches[2] : null,
                'timestamp' => $matches[3],
                'ext'       => 'zip'
            ];
        } else {
            return null;
        }
    }

    public function postChangeGithubId() 
    {
        $logId = $_POST['logId'];
        $source = $_POST['source'];
        $logId = basename($logId);
        $githubId = $_POST['githubid'];

        $fromFile = $this->issueDir . DIRECTORY_SEPARATOR . $logId;

        if (file_exists($fromFile) && is_readable($fromFile)) {
            $fileParts = $this->parseFilename($logId);
            if ($fileParts !== null) {
            
                $newFile = $this->issueDir . DIRECTORY_SEPARATOR . 'support-' . $source . '-' . $githubId . '-' . $fileParts['timestamp'] . '.' . $fileParts['ext'];
                $result = rename($fromFile, $newFile);

                if ($result) {
                    $this->sendResponse(json_encode("ok"));
                } else {
                    $this->send500();
                }
            } else {
                $this->send500();
            }
        } else {
            $this->send500();

        }
    }

    public function postDeleteLog() 
    {
        $logId = $_POST['logId'];
        $logId = basename($logId);
        
        $fileToDelete = $this->issueDir . DIRECTORY_SEPARATOR . $logId;
        $result = unlink($fileToDelete);

        if ($result) {
            $this->sendResponse(json_encode("ok"));
        } else {
            $this->send500();
        }        
    }

    public function getSupportFilesList() 
    {

        $data=array();
        
        if (is_dir($this->issueDir)) {
            $files = scandir($this->issueDir);
            foreach ($files as $file) {
                if (strpos($file, '.') !== 0) {
                    
                    $fileParts = $this->parseFilename(($file));
                    $issue = $fileParts['id'];
                    $source = $fileParts['source'];
                    $date = $fileParts['timestamp'];

                    $year = (int)substr($date, 0, 4);
                    $month = (int)substr($date, 4, 2);
                    $day = (int)substr($date, 6, 2);
                    $hour = (int)substr($date, 8, 2);
                    $minute = (int)substr($date, 10, 2);
                    $second = (int)substr($date, 12, 2);

                    $timestamp = mktime($hour, $minute, $second, $month, $day, $year);
                    $formattedDate = strftime("%A %d %B %Y, %H:%M", $timestamp);

                    $size = filesize($this->issueDir . DIRECTORY_SEPARATOR . $file);
                    $hrSize = $this->humanReadableFileSize($size);

                    $data[] = [
                        "filename" => $file,
                        "sortfield" => $year.$month.$day.$hour.$minute.$second,
                        "date" => $formattedDate,
                        "issue" => $issue,
                        "source" => $source,
                        "size" => $hrSize,
                        "actions" => ""                    
                    ];
                }
            }
        }
        $this->sendResponse(json_encode($data));
    }

    public function getGenerateLog() 
    {
        $command = 'export ALLSKY_HOME=' . ALLSKY_HOME . '; export SUDO_OK="true"; ';
		$command .= ALLSKY_HOME . '/support.sh --auto';
        exec($command, $output, $exitCode);

        if ($exitCode == 2) {
            $this->send500();
        } else {
            $this->sendResponse(json_encode("ok"));
        }
    }

}


$supportUtil = new SUPPORTUTIL();
$supportUtil->run();
