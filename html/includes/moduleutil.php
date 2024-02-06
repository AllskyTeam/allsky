<?php

include_once('functions.php');
initialize_variables();		// sets some variables

define('RASPI_ADMIN_DETAILS', RASPI_CONFIG . '/raspap.auth');

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
        $this->userModules = ALLSKY_MODULE_LOCATION . '/modules';
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

    private function runRequest() {
        $action = $this->method . $this->request;

        if (is_callable(array('MODULEUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

    private function readModuleData($moduleDirectory, $type, $event) {
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

        closedir($handle);

        return $arrFiles;
    }

    private function startsWith ($string, $startString) {
        $len = strlen($startString);
        return (substr($string, 0, $len) === $startString);
    }

    private function endsWith($string, $endString) {
        $len = strlen($endString);
        if ($len == 0) {
            return true;
        }
        return (substr($string, -$len) === $endString);
    }

    private function changeOwner($filename) {
        $user = get_current_user();
        exec("sudo chown " . $user . " " . $filename);
    }

    public function getModulesSettings() {
        $configFileName = ALLSKY_MODULES . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);

        $this->sendResponse($rawConfigData);
    }

    public function getRestore() {
        $flow = $_GET['flow'];

        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($flow) . '.json';
        $backupConfigFileName = $configFileName . '-last';
        copy($backupConfigFileName, $configFileName);
        $this->changeOwner($configFileName);
        $this->sendResponse();
    }

    public function postModulesSettings() {
        $configFileName = ALLSKY_MODULES . '/module-settings.json';
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
        global $settings_array;		// defined in initialize_variables()
        $angle = $settings_array['angle'];
        $lat = $settings_array['latitude'];
        $lon = $settings_array['longitude'];

        $result['lat'] = $lat;
        $result['lon'] = $lon;
        $imageDir = get_variable(ALLSKY_HOME . '/variables.sh', "IMG_DIR=", 'current/tmp');
        $result['filename'] = $imageDir . '/' . $settings_array['filename'];

        exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
        if ($retval == 2) {
            $result['tod'] = 'day';
        } else if ($retval == 3) {
            $result['tod'] = 'night';
        } else {
            $result['tod'] = '';
        }

        $result['version'] = ALLSKY_VERSION;

        $configFileName = ALLSKY_MODULES . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $result['settings'] = $configData;
        $formattedJSON = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($formattedJSON);
    }

    public function getModules() {
        $result = $this->readModules();
        $result = json_encode($result, JSON_FORCE_OBJECT);
        $this->sendResponse($result);
    }

    private function readModules() {
        $configFileName = ALLSKY_MODULES . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);
        $moduleConfig = json_decode($rawConfigData);

        $event = $_GET['event'];
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($event) . '.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $corrupted = false;
        if ($configData == null) {
            $corrupted = true;
            $configData = array();
        }

        $coreModules = $this->readModuleData($this->allskyModules, "system", $event);
        $userModules = $this->readModuleData($this->userModules, "user", $event);
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
                if (isset($moduleData['metadata']->arguments)) {
                    foreach ((array)$moduleData['metadata']->arguments as $argument=>$value) {
                        if (!isset($data->metadata->arguments->$argument)){
                            $data->metadata->arguments->$argument = $value;
                        }
                    }
                }
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

            $selectedResult[$selectedName] = $moduleData;
        };

        $restore = false;
        if (file_exists($configFileName . '-last')) {
            $restore = true;
        }
        $result = [
            'available' => $availableResult,
            'selected'=> $selectedResult,
            'corrupted' => $corrupted,
            'restore' => $restore
        ];

        return $result;
    }

    public function postModules() {
        $config = $_POST['config'];
        $configData = $_POST['configData'];
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($config) . '.json';

        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($config) . '.json';
        $rawConfigData = file_get_contents($configFileName);
        $oldModules = json_decode($rawConfigData);

        $result = file_put_contents($configFileName, $configData);
        $this->changeOwner($configFileName);
        $backupFilename = $configFileName . '-last';
        copy($configFileName, $backupFilename);
        $this->changeOwner($backupFilename);
        if ($result !== false) {
            $newModules = json_decode($configData);
            $this->CheckForDisabledModules($newModules, $oldModules);
            $this->sendResponse();
        } else {
            $this->send500();
        }
    }

    private function CheckForDisabledModules($newModules, $oldModules) {
        $moduleList = [];

        foreach ($oldModules as $key=>$module) {
            $moduleList[$key] = $module->module;
        }

        foreach ($newModules as $key=>$module) {
            if (isset($moduleList[$key])) {
                if ($oldModules->{$key}->enabled == $module->enabled) {
                    unset($moduleList[$key]);
                } else {
                    if ($oldModules->{$key}->enabled == false && $module->enabled == true) {
                        unset($moduleList[$key]);
                    }
                }
            }
        }

        $disableFile = ALLSKY_TMP . '/disable';
        if (count($moduleList) > 0) {
            if (file_exists($disableFile)) {
                $oldDisableData = file_get_contents($disableFile);
                $oldDisableData = json_decode($oldDisableData, true);
                $moduleList = array_merge($moduleList, $oldDisableData);
            }
            $disableData = json_encode($moduleList);
            $result = file_put_contents($disableFile, $disableData);
        }

    }

    public function deleteModules() {
        $result = False;
        $module = $_GET['module'];

        if ($this->startswith($module, "allsky_") && $this->endswith($module, ".py")) {
            $targetPath = $this->userModules . '/' . $module;
            if (file_exists($targetPath)) {
                $result = unlink($targetPath);
            }
        }

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

        $sourceConfigFileName = ALLSKY_REPO . '/modules/postprocessing_' . strtolower($flow) . '.json';
        $rawConfigData = file_get_contents($sourceConfigFileName);
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($flow) . '.json';
        file_put_contents($configFileName, $rawConfigData);
        $this->changeOwner($configFileName);

        $this->sendResponse();
    }
}

$overlayUtil = new MODULEUTIL();
$overlayUtil->run();
