<?php

include_once('functions.php');
initialize_variables();		// sets some variables

define('RASPI_ADMIN_DETAILS', RASPI_CONFIG . '/raspap.auth');

include_once('raspap.php');
include_once('authenticate.php');

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

    private function readModuleData($moduleDirectory, $type, $event, $showexperimental) {
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

                        $decoded = json_decode($metaData);
                        if (in_array($event, $decoded->events)) {
                            if (isset($decoded->experimental)) {
                                $experimental = strtolower($decoded->experimental) == "true"? true: false;
                            } else {
                                $experimental = false;
                            }
                            if (!$showexperimental && $experimental) {
                                $addModule  = false;
                            } else {
                                $addModule = true;
                            }
                            if ($addModule) {
                                $arrFiles[$entry] = [
                                    'module' => $entry,
                                    'metadata' => $decoded,
                                    'type' => $type
                                ];
                                $arrFiles[$entry]['metadata']->experimental = $experimental;
                            }
                        }
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

        $result['version'] = ALLSKY_VERSION;
        
        $configFileName = ALLSKY_CONFIG . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $result['settings'] = $configData;
        $formattedJSON = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($formattedJSON);
    }

    public function getModules() {
        $configFileName = ALLSKY_CONFIG . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);
        $moduleConfig = json_decode($rawConfigData);

        $showexperimental = false;
        if (isset($moduleConfig->showexperimental) && $moduleConfig->showexperimental) {
            $showexperimental = true;
        }

        $event = $_GET['event'];
        $configFileName = ALLSKY_CONFIG . '/' . 'postprocessing_' . strtolower($event) . '.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $corrupted = false;
        if ($configData == null) {
            $corrupted = true;
            $configData = array();
        }

        $coreModules = $this->readModuleData($this->allskyModules, "system", $event, $showexperimental);
        $userModules = $this->readModuleData($this->userModules, "user", $event, $showexperimental);
        $allModules = array_merge($coreModules, $userModules);

        $availableResult = [];
        foreach ($allModules as $moduleData) {
            $module = str_replace('allsky_', '', $moduleData["module"]);
            $module = str_replace('.py', '', $module);
            
            if (!isset($configData->{$module})) {
                $moduleData["enabled"] = false;
                $availableResult[$module] = $moduleData;
            }
        }

        $selectedResult = [];
        foreach($configData as $selectedName=>$data) {
            $moduleName = "allsky_" . $selectedName . ".py";
            $moduleData = $allModules[$moduleName];

            if (isset($data->metadata->arguments)) {
                $moduleData["metadata"]->arguments = $data->metadata->arguments;
            } else {
                $moduleData["metadata"]->arguments = [];
            }
            if (isset($data->enabled)) {
                $moduleData["enabled"] = $data->enabled;
            } else {
                $moduleData["enabled"] = false;
            }
            if ($selectedName == 'loadimage') {
                $moduleData['position'] = 'first';
            }
            if ($selectedName == 'saveimage') {
                $moduleData['position'] = 'last';
            }

            if (isset($data->lastexecutiontime)) {
                $moduleData['lastexecutiontime'] = $data->lastexecutiontime;
            } else {
                $moduleData['lastexecutiontime'] = '0';                
            }
            if (isset($data->lastexecutionresult)) {
                $moduleData['lastexecutionresult'] = $data->lastexecutionresult;
            } else {
                $moduleData['lastexecutionresult'] = '';                
            }

            if (isset($data->metadata->experimental)) {
                $experimental = strtolower($data->metadata->experimental) == "true"? true: false;
            } else {
                $experimental = false;
            }

            if (!$showexperimental && $experimental) {
                $addModule  = false;
            } else {
                $addModule = true;
            }

            if ($addModule) {
                $selectedResult[$selectedName] = $moduleData;
            }
        };

        $result = [
            'available' => $availableResult,
            'selected'=> $selectedResult,
            'corrupted' => $corrupted
        ];
        $result = json_encode($result, JSON_FORCE_OBJECT);     
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

    public function getReset() {
        $flow = $_GET['flow'];

        
        $sourceConfigFileName = ALLSKY_REPO . '/' . 'postprocessing_' . strtolower($flow) . '.json.repo';
        $rawConfigData = file_get_contents($sourceConfigFileName);
        $configFileName = ALLSKY_CONFIG . '/' . 'postprocessing_' . strtolower($flow) . '.json';
        file_put_contents($configFileName, $rawConfigData);

        $this->sendResponse();
    }
}

$overlayUtil = new MODULEUTIL();
$overlayUtil->run();
