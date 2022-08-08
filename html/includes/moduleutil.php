<?php

include_once('../includes/functions.php');
include_once(RASPI_CONFIG . '/raspap.php');
include_once('../includes/authenticate.php');
 
class MODULEUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $allskyModules;
    private $userModules;

    function __construct() {
        $this->allskyModules = ALLSKY_SCRIPTS . '/modules';
        $this->userModules = '/etc/allsky/modules';
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

    private function send500($error = "Internal Server Error")
    {
        header('HTTP/1.0 500 ' . $error);
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

        if (is_callable(array('MODULEUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

    private function readModuleData($moduleDirectory, $type) {
        $arrFiles = array();
        $handle = opendir($moduleDirectory);
 
        if ($handle) {
            while (($entry = readdir($handle)) !== FALSE) {
                if (preg_match('/^allsky_/', $entry)) {
                    if ($entry !== 'allsky_shared.py') {
                        $fileName = $moduleDirectory . '/' . $entry;
                        $fileContents = file($fileName);
                        $metaData = "";
                        $found = False;

                        foreach ($fileContents as $sourceLine) {
                            $line = str_replace(" ", "", $sourceLine);
                            $line = str_replace("\n", "", $line);
                            $line = str_replace("\r", "", $line);                            
                            $line = strtolower($line);
                            if ($line == "metadata={") {
                                $found = true;
                                $sourceLine = str_ireplace("metadata","", $sourceLine);
                                $sourceLine = str_ireplace("=","", $sourceLine);
                                $sourceLine = str_ireplace(" ","", $sourceLine);                                
                            }

                            if ($found) {
                                $metaData .= $sourceLine;
                            }

                            if (substr($sourceLine,0,1) == "}" && $found) {;
                                break;
                            }
                        }

                        $arrFiles[$entry] = [
                            'module' => $entry,
                            'metadata' => json_decode($metaData),
                            'type' => $type
                        ];
                    }
                }
            }
        }

        closedir($handle);

        return $arrFiles;
    }

    public function getModulesSettings() {
        $configFileName = ALLSKY_CONFIG . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);

        $this->sendResponse($rawConfigData);
    }

    public function postModulesSettings() {
        $configFileName = ALLSKY_CONFIG . '/module-settings.json';        
        $settings = $_POST['settings'];
        $formattedJSON = json_encode(json_decode($settings), JSON_PRETTY_PRINT);

        $result = file_put_contents($configFileName, $formattedJSON);
        if ($result) {
            $this->sendResponse();
        } else {
            $this->send500('Cannot write to module settings flile');
        }
    }

    public function getModuleBaseData() {
        $cam_type = getCameraType();
        $settings_file = getSettingsFile($cam_type);
        $camera_settings_str = file_get_contents($settings_file, true);
        $camera_settings_array = json_decode($camera_settings_str, true);
        $angle = $camera_settings_array['angle'];
        $lat = $camera_settings_array['latitude'];
        $lon = $camera_settings_array['longitude'];

        $result['lat'] = $lat;
        $result['lon'] = $lon;

        exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
        if ($retval == 2) {
            $result['tod'] = 'day';
        } else if ($retval == 3) {
            $result['tod'] = 'night';
        } else {
            $result['tod'] = '';
        }

        $formattedJSON = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($formattedJSON);
    }

    public function getModules() {
        $config = $_GET['config'];
        $configFileName = ALLSKY_CONFIG . '/' . 'postprocessing_' . strtolower($config) . '.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $coreModules = $this->readModuleData($this->allskyModules, "system");
        $userModules = $this->readModuleData($this->userModules, "user");
        $allModules = array_merge($coreModules, $userModules);

        $availableModules = array();
        foreach($configData as $configModule) {
            foreach($allModules as $moduleName) {
                $module = str_replace('allsky_', '', $moduleName);
                $module = str_replace('.py', '', $module);
                if ($configModule->module == $module['module']) {
                    $configModule->name = $module['metadata']->name;
                    $configModule->description = $module['metadata']->description;
                    $configModule->argumentdetails = $module['metadata']->argumentdetails;
                    $configModule->type = $module['type'];

                    foreach($module['metadata']->arguments as $argument=>$value) {
                        if(!isset($configModule->arguments->$argument)) {
                            $configModule->arguments->{$argument} = $value;
                        }
                    }
                    $found = true;
                    break;                    
                }
            }
        }

        foreach($allModules as $moduleName) {
            $module = str_replace('allsky_', '', $moduleName);
            $module = str_replace('.py', '', $module);
            if ($module !== 'shared') {
                $found = false;
                foreach($configData as $configModule) {
                    if ($configModule->module == $module['module']) {
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $obj = (object) [
                        'name' => $module['metadata']->name,
                        'module' => $module['module'],
                        'type' => $module['type'],
                        'description' => $module['metadata']->description,
                        'arguments' => $module['metadata']->arguments,
                        'argumentdetails' => $module['metadata']->argumentdetails,
                        'enabled' => $module['metadata']->enabled,
                    ];
                    array_push($availableModules, $obj);                    
                }
            }
        }

        $result = [
            'available' => $availableModules,
            'selected'=> $configData
        ];
        $result = json_encode($result);
        $this->sendResponse($result);      
    }

    public function postModules() {
        $config = $_POST['config'];
        $configData = $_POST['configData'];
        $configFileName = ALLSKY_CONFIG . '/' . 'postprocessing_' . strtolower($config) . '.json';

        $result = file_put_contents($configFileName, $configData);
        if ($result !== false) {
            $this->sendResponse();
        } else {
            $this->send500();
        }
    }

    public function deleteModules() {
        $module = $_GET['module'];

        $targetPath = $this->userModules . '/allsky_' . $module . '.py' ;
        $result = unlink($targetPath);

        if ($result) {
            $this->sendResponse();
        } else {
            $this->send500('Failed to delete module ' . $module);
        }
    }

    public function postUpload() {
        $data = $_FILES['module-file'];
        $sourcePath = $_FILES['module-file']['tmp_name'];
        $scriptName = str_replace("zip","py",$_FILES['module-file']['name']);

        $targetPath = $this->userModules . '/' . $scriptName ;

        $zipArchive = new ZipArchive();
        $zipArchive->open($sourcePath);
        for ($i = 0; $i < $zipArchive->numFiles; $i++) {
            $stat = $zipArchive->statIndex($i);
  
            $nameInArchive = $stat['name'];

            if ($scriptName == $nameInArchive) {
                $fp = $zipArchive->getStream($nameInArchive);
                if (!$fp) {
                    $this->send500('Unable to extract module from zip file');
                }
    
                $contents = '';
                while (!feof($fp)) {
                  $contents .= fread($fp, 1024);
                }
                fclose($fp);

                $file = fopen($targetPath, 'wb');
                fwrite($file, $contents);
                fclose($file);
                $this->sendResponse();
                break;
            }
        }
        $this->send500('Unable to locate module in zip file');
    }
}

$overlayUtil = new MODULEUTIL();
$overlayUtil->run();
