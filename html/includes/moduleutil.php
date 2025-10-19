<?php

include_once('functions.php');
initialize_variables();		// sets some variables

include_once('authenticate.php');

class MODULEUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $allskyModules;
    private $userModules;
	private $myFiles;
    private $myFilesData;
    private $allsky_config = null;
    private $extra_data = null;
    private $extra_legacy_data = null;
    private $allskySettings = null;
    private $allsky_home = null;
    private $allsky_scripts = null;
    private $allskyMyFiles = null;
    private $myFilesBase = null;
    private $services = ['allsky', 'allskyperiodic', 'allskyserver'];

    function __construct() {
        $this->allskyModules = ALLSKY_SCRIPTS . '/modules';
        $this->userModules = ALLSKY_MODULE_LOCATION . '/modules';
		$this->allskyMyFiles = ALLSKY_MYFILES_DIR;        
		$this->myFilesBase = ALLSKY_MYFILES_DIR;
        $this->myFiles = ALLSKY_MYFILES_DIR . '/modules';
		$this->myFilesData = ALLSKY_MYFILES_DIR . '/modules/moduledata';        
        $this->allsky_home = ALLSKY_HOME;
        $this->allsky_scripts = ALLSKY_SCRIPTS;
        $this->allsky_config = ALLSKY_CONFIG;
        $this->extra_data = ALLSKY_EXTRA;
        $this->extra_legacy_data = ALLSKY_EXTRA_LEGACY;
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

    private function getMetaDataFromFile($fileName) {
		$metaData = $this->getMetaDataFromFileByName($fileName, 'meta_data');
		if ($metaData === "") {
			$metaData = $this->getMetaDataFromFileByName($fileName, 'metaData');
		}

		return $metaData;
	}

    private function getMetaDataFromFileByName($fileName, $metaName) {
		$metaData = "";

        if (file_exists($fileName)) {
            $fileContents = file($fileName);
            $found = False;

            $level = 0;
            foreach ($fileContents as $source_line) {
        
                if (rtrim($source_line) !== '' && str_ends_with(rtrim($source_line), '{')) {
                    $level++;
                }
            
                if (ltrim($source_line) !== '' && str_starts_with(ltrim($source_line), '}')) {
                    $level--;
                }
            
                if (ltrim($source_line) !== '' && str_starts_with(ltrim($source_line), $metaName)) {
                    $found = true;
                    $source_line = str_replace([$metaName, "=", " "], "", $source_line);
                }
            
                if ($found) {
                    $metaData .= $source_line;
                }
            
                if (trim($source_line) === '}' && $found && $level === 0) {
                    break;
                }
            }
        }
		

        return $metaData;
    }

    private function getMetaDataFromFileByName1($fileName, $metaName) {
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

        return $metaData;
    }

    private function getModuleMetaData($modulelName) {
        $fileName = $this->myFiles . '/' . $modulelName;

        $metaData = $this->getMetaDataFromFile($fileName);
        if ($metaData == "") {
            $fileName = $this->userModules . '/' . $modulelName;
            $metaData = $this->getMetaDataFromFile($fileName);
            if ($metaData == "") {
                $fileName = $this->allskyModules . '/' . $modulelName;
                $metaData = $this->getMetaDataFromFile($fileName);
                
            }                
        }
        return $metaData;
    }

    private function readModuleData($moduleDirectory, $type, $event) {
        $arrFiles = array();

        if (is_dir($moduleDirectory)) {
            $handle = opendir($moduleDirectory);
            if ($handle) {
                while (($entry = readdir($handle)) !== FALSE) {
                    if (preg_match('/^allsky_/', $entry)) {
                        if ($entry !== 'allsky_shared.py' && $entry !== 'allsky_base.py') {
                            $fileName = $moduleDirectory . '/' . $entry;
                            $metaData = $this->getMetaDataFromFile($fileName);
                            $decoded = json_decode($metaData, false);		
                            if ($decoded !== Null) {
                                if (in_array($event, $decoded->events) || $event == null) {
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
                            } else {
                                $arrFiles[$entry] = [
                                    'module' => $entry,
                                    'metadata' => (object)[],
                                    'type' => $type
                                ];
                                $arrFiles[$entry] = null;
                            }
                        }
                    }
                }
            }
            closedir($handle);
        }
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
        # File are created 644 which means the web server can't change them after
        # they are created.  To get around this, remove backupFilename before copy over it.
        @unlink($configFileName);
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
        $result['filename'] = ALLSKY_IMG_DIR . '/' . $settings_array['filename'];

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

        $result['haveDatabase'] = haveDatabase();
                
        $formattedJSON = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($formattedJSON);
    }

    public function getModules() {
        $result = $this->readModules();
        $result = json_encode($result, false);
        $this->sendResponse($result);
    }

    private function readModules() {
        $configFileName = ALLSKY_MODULES . '/module-settings.json';
        $rawConfigData = file_get_contents($configFileName);
        $moduleConfig = json_decode($rawConfigData);

		$secrets = json_decode(file_get_contents(ALLSKY_ENV));

        $event = $_GET['event'];
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($event) . '.json';
        $debugFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($event) . '-debug.json';
        $rawConfigData = file_get_contents($configFileName);
        $configData = json_decode($rawConfigData);

        $corrupted = false;
        if ($configData == null) {
            $corrupted = true;
            $configData = array();
        }

        $coreModules = $this->readModuleData($this->allskyModules, "system", $event);
        $userModules = $this->readModuleData($this->userModules, "user", $event);
        $myModules = $this->readModuleData($this->myFiles, "user", $event);

        $allModules = array_merge($coreModules, $userModules, $myModules);

        $availableResult = [];
        foreach ($allModules as $key=>$moduleData) {
			if (isset($moduleData["module"])) {
				$moduleName = $moduleData["module"];
			} else {
				$moduleName = $key;
			}
            $module = str_replace('allsky_', '', $moduleName);
            $module = str_replace('.py', '', $module);
			
            if (!isset($configData->{$module})) {
				if ($moduleData === null) { // Corrupt module metaData
					$moduleData = [
						"metadata" => [
							"name" => "Reads Pi Status",
							"description" => "Reads Pi Data",
							"module" => "allsky_pistatus",    
							"version" => "v1.0.0",							
							"arguments" => []
						],
						"corrupt" => true
					];
				}
                $availableResult[$module] = $moduleData;
            }
        }

		$selectedResult = [];
        foreach($configData as $selectedName=>$data) {
            $moduleName = "allsky_" . $selectedName . ".py";
            // TODO: check if  $allModules[$moduleName]  exists.
            $moduleData = $allModules[$moduleName];

			if ($moduleData === null) { // Corrupt module metaData
				$moduleData = (array)$configData->$selectedName;
				$moduleData["corrupt"] = true;
			}

			if (isset($data->metadata->arguments)) {
				if (isset($moduleData['metadata']->arguments)) {
					foreach ((array)$moduleData['metadata']->arguments as $argument=>$value) {

						if (!isset($data->metadata->arguments->$argument)) {
							$data->metadata->arguments->$argument = $value;
						}
						
						# If field is a 'secret' field then get the value from the env file
						if (isset($moduleData["metadata"]->argumentdetails->$argument->secret)) {
							if ($moduleData["metadata"]->argumentdetails->$argument->secret !== null) {
								if ($moduleData["metadata"]->argumentdetails->$argument->secret === 'true') {
									$secretKey = strtoupper($data->metadata->module) . '.' . strtoupper($argument);
									if (isset($secrets->$secretKey)) {
										$data->metadata->arguments->$argument = $secrets->$secretKey;
									}
								}
							}
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

        $debugInfo = null;
        if (file_exists($debugFileName)) {
            $debugInfo = file_get_contents($debugFileName);
            $debugInfo = json_decode($debugInfo);
        }

        $result = [
            'available' => $availableResult,
            'selected'=> $selectedResult,
            'corrupted' => $corrupted,
            'restore' => $restore,
            'debug' => $debugInfo
        ];

        return $result;
    }

    private function getModuleHelpFromFolder($folder): array {
        $result = array();
        $types = ['txt', 'html', 'md'];
        if (file_exists($folder)) {
            $handle = opendir($folder);
            if ($handle) {
                while (($entry = readdir($handle)) !== FALSE) {
                    if ($entry !== '.' && $entry !== '..') {
                        //TODO: Add HTML help or markdown
                        foreach ($types as $key=>$type) {
                            $fileName = $folder . '/' . $entry . '/readme.' . $type;
                            if (file_exists($fileName)) {
                                $text = file_get_contents($fileName);
                                $module = str_replace('allsky_', '', $entry);
                                $module = str_replace('.py', '', $module);
                                if (!isset($result[$module])) {
                                    $result[$module] = [];
                                }
                                if ($type == 'txt') {
                                    $text = nl2br($text);
                                }
                                $result[$module][$type] = $text;
                            }
                        }
                    }
                }
            }
        }

        return $result;
    }

    private function getModuleFile() {
        $rawFilename = $_GET['file'] ?? '';
        $filename = basename($rawFilename);

        $rawModuleame = $_GET['module'] ?? '';
        $modulename = basename($rawModuleame);

        $filePath = $this->myFiles . '/moduledata/data/' . $modulename . '/' . $filename;

        if (file_exists($filePath)) {
            $fileContents = file_get_contents($filePath);
        } else {
            $fileContents = 'File ' . $filename . ' Not found';
        }

        $this->sendResponse($fileContents);
    }

    private function getModuleHelp() {
        //TODO: Not sure about this location
        $coreHelpFolder = ALLSKY_SCRIPTS . '/modules/info';
        $extraHelpFolder = ALLSKY_MODULE_LOCATION . '/modules/info';

        $help = $this->getModuleHelpFromFolder($coreHelpFolder);
        $extraHelp = $this->getModuleHelpFromFolder($extraHelpFolder);

        $help = array_merge($help, $extraHelp);
        return '';
        return $help;
    }

    public function postModules() {
        $config = $_POST['config'];
        $configData = $_POST['configData'];
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($config) . '.json';
        $rawConfigData = file_get_contents($configFileName);
        $oldModules = json_decode($rawConfigData);

		$configDataJson = json_decode($configData);
		$envData = null;
		foreach ($configDataJson as $module=>&$moduleConfig) {
            if (isset($moduleConfig->metadata->argumentdetails)) {
                foreach ($moduleConfig->metadata->argumentdetails as $argument=>$argumentSettings) {
                    if (isset($argumentSettings->secret)) {
                        if ($envData === null) {
                            $envData = json_decode(file_get_contents(ALLSKY_ENV));
                        }
                        $secretKey = strtoupper($moduleConfig->metadata->module) . '.' . strtoupper($argument);
                        $envData->$secretKey = $moduleConfig->metadata->arguments->$argument;
                        $moduleConfig->metadata->arguments->$argument = '';
                    }
                }
            }
		}
		$configData = json_encode($configDataJson, JSON_PRETTY_PRINT);
		if ($envData !== null) {
			file_put_contents(ALLSKY_ENV, json_encode($envData, JSON_PRETTY_PRINT));
		}
		
        $result = file_put_contents($configFileName, $configData);
        $this->changeOwner($configFileName);
        $backupFilename = $configFileName . '-last';
        @unlink($backupFilename);
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

    public function getReset() {
        $flow = $_GET['flow'];

        $sourceConfigFileName = ALLSKY_REPO . '/modules/postprocessing_' . strtolower($flow) . '.json';
        $rawConfigData = file_get_contents($sourceConfigFileName);
        $configFileName = ALLSKY_MODULES . '/' . 'postprocessing_' . strtolower($flow) . '.json';
        file_put_contents($configFileName, $rawConfigData);
        $this->changeOwner($configFileName);

        $this->sendResponse();
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
					'message' =>  $stdout . $stderr					
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

	private function addSecretsToFlow($configData) {
		$configDataJson = json_decode($configData);
		$envData = null;
		foreach ($configDataJson as $module=>&$moduleConfig) {
			foreach ($moduleConfig->metadata->argumentdetails as $argument=>$argumentSettings) {
				if (isset($argumentSettings->secret)) {
					if ($envData === null) {
						$envData = json_decode(file_get_contents(ALLSKY_ENV));
					}
					$secretKey = strtoupper($moduleConfig->metadata->module) . '.' . strtoupper($argument);
					if (isset($envData->$secretKey)) {
						$moduleConfig->metadata->arguments->$argument = $envData->$secretKey;
					} 
				}
			}
		}
		$configData = json_encode($configDataJson, JSON_PRETTY_PRINT);
		return $configData;
	}

	public function postTestModule() {
        $module=trim(filter_input(INPUT_POST, 'module', FILTER_SANITIZE_STRING));
        $dayNight=trim(filter_input(INPUT_POST, 'dayNight', FILTER_SANITIZE_STRING));        
        $flow = $_POST['flow'];

		$flow = $this->addSecretsToFlow($flow);

        $fileName = ALLSKY_MODULES . '/test_flow.json';
        file_put_contents($fileName,  $flow);

        $command = 'sudo ' . $this->allsky_scripts  . '/test_flow.sh --allsky_home ' . $this->allsky_home  . ' --allsky_scripts ' . $this->allsky_scripts  . ' --day_night ' . $dayNight;
        $result = $this->runShellCommand($command);

		$jsonFlow = json_decode($flow, true);
		
		$extraData = '';
		$moduleKey = array_key_first($jsonFlow);
		if (isset($jsonFlow[$moduleKey]['metadata']['extradatafilename'])) {
			$filePath = $this->extra_data . '/' . $jsonFlow[$moduleKey]['metadata']['extradatafilename'];
			if (file_exists($filePath)) {
				$extraData = file_get_contents($filePath);
			}			
		}

        if ($result['error']) {
            die($result['message']);
            $this->send500();
        } else {
			$result = [
				'message' => $result['message'],
				'extradata' => json_decode($extraData)
			];
            $this->sendResponse(json_encode($result));
        }
	}

    public function getAllskyVariables($return=false) {
        $sourceDir = ALLSKY_OVERLAY . '/extra';
        $variables = [];

        $handle = opendir($sourceDir);

        if ($handle) {
            while (($entry = readdir($handle)) !== FALSE) {
                if ($entry !== '.' && $entry !== '..') {
                    $fileName = $sourceDir . '/' . $entry;
                    $data = file_get_contents($fileName);

                    $extension = pathinfo($entry, PATHINFO_EXTENSION);

                    if ($extension == 'json') {
                        $jsonData = json_decode($data);
                        foreach ($jsonData as $key => $value) {
                            $variables[] = [
                                'variable' => $key,
                                'lastvalue' => $value
                            ];
                        }
                    }
                    if ($extension == 'txt') {
                        #TODO - Add code !
                    }
                }
            }
        }

        if ($return) {
            return $variables;
        } else {
            $this->sendResponse(json_encode($variables));
        }
    }
	
    private function getAllskyVariable($variable="AS_CPUTEMP") {

        $variables = $this->getAllskyVariables(true);

        $value = null;
        foreach ($variables as $variableData) {
            if ($variableData["variable"] == $variable) {
                $value = $variableData["lastvalue"]->value;
                break;
            }
        }

        return $value;
    }

    public function getVariableList() {
        $showEmpty=trim(filter_input(INPUT_GET, 'showempty', FILTER_SANITIZE_STRING));
        if (empty($showEmpty)) {
            $showEmpty = 'no';
        }
        $module=trim(filter_input(INPUT_GET, 'module', FILTER_SANITIZE_STRING));

		//TODO: remove hard coding
		$params = '--empty';
		if ($showEmpty == 'no') {
			$params = '';
		}

		if ($module !== '') {
			$params .= ' --module ' . $module;
		}
		$pythonScript = ALLSKY_HOME . '/scripts/modules/allskyvariables/allskyvariables.py --print ' . $params . ' --allskyhome ' . ALLSKY_HOME;
		$output = [];
		$returnValue = 0;
		exec("python3 $pythonScript 2>&1", $output, $returnValue);

		//$string = implode('', $output);

		$jsonString = json_encode($output[0], JSON_UNESCAPED_SLASHES);
		$data = json_encode($jsonString);

        $this->sendResponse($output[0]);

    }

    public function postValidateMask() {
        $error = false;
        $message='';
        $filename=trim(filter_input(INPUT_POST, 'filename', FILTER_SANITIZE_STRING));
        $validFileTypes = array('png', 'jpg', 'jpeg');
        $extension = pathinfo($filename, PATHINFO_EXTENSION);

        if (in_array($extension, $validFileTypes)) {

            $settings_array = readSettingsFile();
            $captureImageFilename = ALLSKY_TMP . '/' . getVariableOrDefault($settings_array, 'filename', 'image.jpg');

            $imageThumbnailFolder = ALLSKY_OVERLAY . '/imagethumbnails';
            $filePath = ALLSKY_OVERLAY . '/images/' . $filename;
            $imageInfo = getimagesize($filePath);
            if ($imageInfo) {
                $maskWidth = $imageInfo[0];
                $maskHeight = $imageInfo[1];

                $imageInfo = getimagesize($captureImageFilename);
                if ($imageInfo) {
                    $capturedWidth = $imageInfo[0];
                    $capturedHeight = $imageInfo[1];
                    
                    if (($capturedWidth !== $maskWidth) && ($capturedHeight !== $maskHeight)) {
                        $error = true;
                        $message = "The mask does not match the captured images. Captured image is {$capturedWidth}x{$capturedHeight} but the mask is {$maskWidth}x{$maskHeight}";
                    } else {
                        $message = "The mask matches the captured images. Captured image is {$capturedWidth}x{$capturedHeight} but the mask is {$maskWidth}x{$maskHeight}";

                    }
                } else {
                    $error = false;
                    $message = "Unable to locate a captured image";                    
                }
            } else {
                $error = true;
                $message = "Unable to read the image file - {$filePath}";
            }            

        } else {
            $error = true;
            $message = "The filename {$filename} has an invalid extension";
        }

        $result = [
            'error'=>$error,
            'message'=>$message
        ];

        $this->sendResponse(json_encode($result));        
    }

	private function findModule($module) {
		//TODO: add enabled status to result and warn in module manager if module is not enabled
		$metaData = null;
        $coreModuleDir = ALLSKY_SCRIPTS . '/modules';
        $extraModulesDir = '/opt/allsky/modules';

		$found = false;
		$checkPath = $coreModuleDir . '/' . $module;      
		if (file_exists($checkPath)) {
			$found = true;
		} else {
			$checkPath = $this->myFiles . '/' . $module;
			if (file_exists($checkPath)) {
				$found = true;
			} else {
                $checkPath = $extraModulesDir . '/' . $module;
                if (file_exists($checkPath)) {
                    $found = true;
                }
            }
		}

		if ($found) {
			$metaData = $this->getMetaDataFromFile($checkPath);
			$metaData = json_decode($metaData, false);
		}

		return $metaData;
	}

	private function isModuleInAnyFlow($flows, $module) {
		$result = false;

		foreach ($flows as $flowName=>$flowData) {
			foreach ($flowData as $flowModule=>$flowModuleData) {
				if ($flowModule == $module) {
					$result = true;
					break 2;
				}
			}
		}

		return $result;
	}

	public function postCheckModuleDependencies() {
		$results = array();
		$check = $_POST['check'];
		$checkFlow = trim(filter_input(INPUT_POST, 'flow', FILTER_SANITIZE_STRING));

		$flows = array('day', 'night', 'periodic', 'daynight', 'nightday');

		$flowInfo = array();
		foreach($flows as $flow) {
			$flowInfo[$flow] = array();
			if ($flow == $checkFlow) {
				$flowKeys = $check;
			} else {
				$flowFileName = ALLSKY_MODULES . "/postprocessing_$flow.json";
				$flowData = file_get_contents($flowFileName);
				$flowData = json_decode($flowData);
				$flowKeys = array_keys(get_object_vars($flowData));
				foreach($flowKeys as &$flowKey) {
					$flowKey = "allsky_$flowKey.py";
				}
			}

			foreach ($flowKeys as $moduleFile) {
				$moduleMetaData = $this->findModule($moduleFile);
				$flowInfo[$flow][$moduleFile] = $moduleMetaData;
			}
		}

		foreach ($flowInfo as $flowName=>$flowData) {
			foreach ($flowData as $flowModule=>$flowModuleData) {
				if (isset($flowModuleData->dependency)) {
					$result = $this->isModuleInAnyFlow($flowInfo, $flowModuleData->dependency);
					if ($result === false) {
						$moduleMetaData = $this->findModule($flowModuleData->dependency);

						if ($moduleMetaData === null) {
							$message = 'The "' . $flowModuleData->dependency . '" module is required by the "' . $flowModuleData->name . '" module ';
							$message .= "This module is NOT installed. Please install the extra modules.";
						} else {
							$message = 'The "' . $moduleMetaData->name . '" module is required by the "' . $flowModuleData->name . '" module ';
							$message .= "Please add this module to the relevant flow and configure it.";
						}
						$results[$flowModule][$flowName] = $message;
					}
					
				}
			}
		}
		$this->sendResponse(json_encode($results));
	}

	public function getOnewire() {
		$folderPath = '/sys/bus/w1/devices/';
		$files = glob($folderPath . '[0-9a-fA-F]*-*');

		$results = array();
		$results['results'] = array();
		foreach ($files as $file) {
			$results['results'][] = [
				'id' => basename($file),
				'text' => basename($file)
			];
		}
		
		$this->sendResponse(json_encode($results));
	}

	public function getSerialPorts() {
		$files = glob('/dev/serial*');

		$results = array();
		$results['results'] = array();
		foreach ($files as $file) {
			$results['results'][] = [
				'id' => basename($file),
				'text' => basename($file)
			];
		}
		
		$this->sendResponse(json_encode($results));
	}

	public function postGetExtraDataFile() {
		$extraDataFilename = basename($_POST['extradatafilename']);
		$filePath = $this->extra_data . '/' . $extraDataFilename;
		$result = [];
		if (file_exists($filePath)) {
			$result = file_get_contents($filePath);
		}

		$this->sendResponse(json_encode($result));		
	}

	public function getUrlCheck() {
        $url=trim(filter_input(INPUT_GET, 'url', FILTER_SANITIZE_STRING));
		$headers = @get_headers($url);
		if(strpos($headers[0], '200') !== false) {
			$result = true;
		} else {
			$result = false;
		}
		$this->sendResponse(json_encode($result));
	}

    /**
     * Start Chart Code
     */

    /**
     * Database helper: create PDO connection
     *
     * This function reads the database configuration (from getDatabaseConfig()),
     * determines the database type (MySQL or SQLite), and returns an initialized
     * PDO connection ready for queries.
     *
     * @return PDO|bool  Returns a PDO object on success, or false if the SQLite file is missing.
     * @throws RuntimeException If the database type is unsupported.
     */
    private function makePdo(): PDO|bool
    {
        // Retrieve connection details from a helper that loads secure config (e.g. from variables.json or .env)
        $secretData = getDatabaseConfig();

        // --- MySQL connection ---
        if ($secretData['databasetype'] === 'mysql') {
            // Build DSN string for MySQL, including host, port, and database name
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $secretData['databasehost'],
                (int)($secretData['databaseport'] ?? 3306), // default port 3306
                $secretData['databasedatabase']
            );

            // Create and return a PDO instance with strict error mode and associative fetch mode
            return new PDO($dsn, $secretData['databaseuser'], $secretData['databasepassword'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // Throw exceptions on SQL errors
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // Return rows as associative arrays
            ]);
        }

        // --- SQLite connection ---
        if ($secretData['databasetype'] === 'sqlite') {
            // Ensure the SQLite database file exists before attempting connection
            if (file_exists(ALLSKY_DATABASES)) {
                $dsn = 'sqlite:' . ALLSKY_DATABASES;

                // Create and configure a new PDO instance for SQLite
                $pdo = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // Throw exceptions on errors
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // Fetch as associative arrays
                ]);

                // Optional: enable Write-Ahead Logging (WAL) mode for better concurrency
                // $pdo->exec('PRAGMA journal_mode = WAL;');

                return $pdo;
            } else {
                // SQLite database file not found — return false instead of throwing
                return false;
            }
        }

        // If neither MySQL nor SQLite is specified, throw an exception
        throw new RuntimeException('Unsupported datasource type');
    }

    /**
     * Convert a database timestamp (integer or string) into a JavaScript-compatible
     * millisecond epoch value.
     *
     * This helper ensures that timestamps stored in the database — which may be in
     * integer (UNIX seconds) or string (date/time) format — are consistently
     * converted to JavaScript’s expected format (milliseconds since the UNIX epoch).
     *
     * @param int|string $dbTs  The database timestamp.
     *                          - If numeric (e.g., 1739912345), it is assumed to be a UNIX timestamp in seconds.
     *                          - If a string (e.g., "2025-10-19 22:10:00"), it will be parsed using strtotime().
     *
     * @return int  The timestamp converted to milliseconds (e.g., 1739912345000),
     *              or 0 if conversion fails (invalid date).
     */
    private function toMsTimestamp($dbTs): int
    {
        // JavaScript timestamps use milliseconds since epoch, not seconds
        $unit = 1000;

        // If the input is numeric (already a UNIX timestamp in seconds)
        // multiply by 1000 to convert seconds → milliseconds
        if (is_numeric($dbTs)) {
            return (int)$dbTs * $unit;
        }

        // If the input is a string, try converting it to a UNIX timestamp using strtotime()
        $t = strtotime((string)$dbTs);

        // If successful, multiply by 1000 to get milliseconds; otherwise, return 0 for invalid date
        return $t !== false ? $t * $unit : 0;
    }

    /**
     * Fetch a complete time series of values for one or more variables from the specified database table.
     *
     * This method queries the given table for all rows within a timestamp range (if provided),
     * and extracts the requested variables as numeric series suitable for charting.
     *
     * Each returned variable contains an array of timestamped points in the format:
     *     [
     *       'VAR_NAME' => [
     *           ['x' => <ms epoch>, 'y' => <numeric value>],
     *           ...
     *       ],
     *       ...
     *     ]
     *
     * If a variable is defined in the `$tooltips` list, a "custom" field may also be included
     * in each point, containing an optional thumbnail URL for chart tooltips.
     *
     * @param PDO    $pdo        Active PDO connection (MySQL or SQLite)
     * @param string $table      Name of the database table to query
     * @param array  $variables  List of variable column names to fetch (e.g. ['AS_TEMP','AS_HUMIDITY'])
     * @param array  $tooltips   List of variables that should include tooltip image paths
     * @param int    $from       Start timestamp (UNIX seconds) — if false, full history is returned
     * @param int    $to         End timestamp (UNIX seconds)
     *
     * @return array  Associative array of variable → [ [x,y,custom?], ... ] pairs
     *
     * @throws PDOException       On SQL errors (except for missing tables, which return empty array)
     */
    private function fetchSeriesData(PDO $pdo, string $table, array $variables, array $tooltips, int $from, int $to): array
    {
        // If no variables were requested, there is nothing to fetch
        if (!$variables) return [];

        // The column containing timestamps or row identifiers
        $tsCol = 'id';

        try {
            // Build optional WHERE clause for timestamp range filtering
            $extra = "";
            if ($from !== false and $to !== false) {
                $extra = "WHERE timestamp BETWEEN {$from} AND {$to}";
            }

            // Prepare and execute query
            $sql = "SELECT * FROM {$table} {$extra} ORDER BY {$tsCol}";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

        } catch (PDOException $e) {
            // Gracefully handle missing table errors (e.g., first-run case)
            if ($this->isMissingTable($e, $pdo)) {
                error_log("Missing table '{$table}' on driver " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
                return [];
            }
            // Re-throw all other PDO exceptions
            throw $e;
        }

        $out = [];

        // Iterate over all rows in the result set
        while ($row = $stmt->fetch()) {
            // For each requested variable column
            foreach ($variables as $variable) {
                if (isset($row[$variable])) {

                    // Apply special unit adjustment for exposure time (convert µs → ms)
                    if ($variable == "AS_EXPOSURE_US") {
                        $value = $row[$variable] / 1000;
                    } else {
                        // Format numeric values to 2 decimal places (ensures float consistency)
                        $value = number_format($row[$variable], 2) + 0;
                    }

                    // Convert database timestamp (usually 'id') to JavaScript millisecond epoch
                    $timeStamp = $this->toMsTimestamp($row['id']);

                    // If the variable has tooltip support, optionally attach an image thumbnail
                    if (isset($tooltips[$variable])) {
                        $tooltip = '';

                        // Attempt to build thumbnail path if image info is available in the row
                        if (isset($row['AS_CAMERAIMAGE']) && isset($row['AS_DATE_NAME'])) {
                            $i = $row['AS_CAMERAIMAGE'];
                            $d = $row['AS_DATE_NAME'];
                            $thumb = "/$d/thumbnails/$i";

                            // If a local image file exists, build a public /images URL
                            if (file_exists(ALLSKY_IMAGES . $thumb)) {
                                $tooltip = "/images/$thumb";
                            }
                        }

                        // Append data point with tooltip reference
                        $out[$variable][] = [
                            'x' => $timeStamp,
                            'y' => $value,
                            'custom' => $tooltip
                        ];
                    } else {
                        // Append standard data point (no tooltip)
                        $out[$variable][] = [
                            'x' => $timeStamp,
                            'y' => $value
                        ];
                    }
                }
            }
        }

        // Return full dataset: one array per variable
        return $out;
    }

    /**
     * Fetch the most recent (latest) record for a given set of variables from a database table.
     *
     * This method queries the specified table for the latest row (based on descending order of the
     * timestamp column, usually `id`), and extracts the most recent values for each requested variable.
     *
     * Each variable is returned in the format:
     *     [
     *       'VAR_NAME' => [
     *           'ts_ms' => <timestamp in milliseconds>,
     *           'value' => <numeric or string value>
     *       ],
     *       ...
     *     ]
     *
     * The method gracefully handles missing tables by returning an empty array instead of throwing,
     * allowing front-end dashboards to remain functional even if a module table hasn’t yet been created.
     *
     * @param PDO    $pdo        Active PDO connection (MySQL or SQLite)
     * @param string $table      Name of the database table to query (e.g. 'allsky_temp')
     * @param array  $variables  List of variable column names to retrieve (e.g. ['AS_TEMP','AS_HUMIDITY'])
     *
     * @return array  Associative array where each variable name maps to ['ts_ms' => int, 'value' => float|string]
     *
     * @throws PDOException       On SQL errors (other than missing tables)
     */
    private function fetchLatestValues(PDO $pdo, string $table, array $variables): array
    {
        // If no variables were requested, return an empty array early
        if (!$variables) return [];

        // The column used for ordering (typically the timestamp or primary key)
        $tsCol = 'id';

        // Enforce strict error mode on PDO to ensure exceptions are thrown on SQL errors
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        try {
            // Build SQL query to get the most recent row (latest timestamp)
            $sql = "SELECT * FROM {$table} ORDER BY {$tsCol} DESC LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

        } catch (PDOException $e) {
            // If the table doesn’t exist yet, log the issue but don’t interrupt execution
            if ($this->isMissingTable($e, $pdo)) {
                error_log("Missing table '{$table}' on driver " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
                return [];
            }
            // Re-throw all other SQL errors
            throw $e;
        }

        $out = [];

        // Fetch the single most recent row (or null if none exists)
        $row = $stmt->fetch();

        // Iterate through each requested variable to extract and format its value
        foreach ($variables as $variable) {
            $value = 0;

            if (isset($row[$variable])) {
                $value = $row[$variable];

                // Format numeric values to two decimal places for consistency
                if (is_numeric($value)) {
                    $value = number_format($value, 2) + 0; // Ensure numeric type, not string
                }
            }

            // Convert the timestamp column to JavaScript milliseconds
            $out[$variable] = [
                'ts_ms' => $this->toMsTimestamp($row[$tsCol]),
                'value' => $value
            ];
        }

        // Return all variable values from the latest row, indexed by variable name
        return $out;
    }

    /**
     * Determine whether a PDOException corresponds to a "table not found" error,
     * compatible with both MySQL/MariaDB and SQLite database drivers.
     *
     * This helper is used to safely detect when a query fails because the target table
     * does not exist — a common case during first-run or after database resets.
     *
     * Different database engines report missing-table errors using different SQLSTATE
     * codes or message formats, so this function normalizes detection across drivers.
     *
     * @param PDOException $e    The caught PDOException from a failed SQL query.
     * @param PDO          $pdo  The PDO connection that raised the exception (used to identify driver type).
     *
     * @return bool  True if the exception represents a "table not found" condition, false otherwise.
     *
     */
    private function isMissingTable(PDOException $e, PDO $pdo): bool
    {
        // Identify the database driver in use (e.g., mysql, sqlite)
        $driver = strtolower((string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));

        // Extract error code and message text for analysis
        $code = (string) $e->getCode();
        $msg  = strtolower($e->getMessage());

        switch ($driver) {
            case 'mysql':  // Applies to both MySQL and MariaDB under PDO
                // MySQL and MariaDB use SQLSTATE '42S02' for "Base table or view not found"
                // Example message: "SQLSTATE[42S02]: Base table or view not found: 1146 Table 'foo.bar' doesn't exist"
                return $code === '42S02' || strpos($msg, 'base table or view not found') !== false;

            case 'sqlite':
            case 'sqlite2':
            case 'sqlite3':
                // SQLite typically reports missing tables with SQLSTATE 'HY000'
                // Example message: "SQLSTATE[HY000]: General error: 1 no such table: my_table"
                return strpos($msg, 'no such table') !== false;

            default:
                // Fallback for any other unknown drivers
                // Check for generic error phrases that indicate missing tables
                return strpos($msg, 'no such table') !== false
                    || strpos($msg, 'table does not exist') !== false;
        }
    }

    /**
     * Determine whether a given table exists in the connected database.
     *
     * This method performs a database-specific check for table existence,
     * compatible with MySQL, MariaDB, and SQLite (and includes a SQL-standard fallback).
     *
     * It safely executes lightweight metadata queries, returning `true` if the
     * table exists and `false` otherwise — without throwing exceptions.
     *
     * @param PDO    $pdo        Active PDO connection to the target database.
     * @param string $tableName  Name of the table to check for existence.
     *
     * @return bool  True if the table exists, false if it does not exist or on error.
     *
     */
    private function tableExists(PDO $pdo, string $tableName): bool
    {
        try {
            // Detect the database driver currently in use (mysql, sqlite, etc.)
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            $exists = false;

            switch ($driver) {
                case 'sqlite':
                    // === SQLite ===
                    // SQLite keeps a catalog of database objects in the sqlite_master table.
                    // We can check for the existence of a table by querying that system table.
                    $stmt = $pdo->prepare("
                        SELECT name
                        FROM sqlite_master
                        WHERE type = 'table'
                          AND name = :table
                    ");
                    $stmt->execute([':table' => $tableName]);
                    // fetchColumn() returns false if no rows → cast to bool for true/false
                    $exists = (bool)$stmt->fetchColumn();
                    break;

                case 'mysql':
                case 'mariadb':
                    // === MySQL / MariaDB ===
                    // SHOW TABLES LIKE works with pattern matching; returns one row if found
                    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
                    $stmt->execute([':table' => $tableName]);
                    $exists = (bool)$stmt->fetchColumn();
                    break;

                default:
                    // === Fallback for other SQL engines ===
                    // Query the INFORMATION_SCHEMA metadata tables, used by most SQL databases
                    $stmt = $pdo->prepare("
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_name = :table
                        LIMIT 1
                    ");
                    $stmt->execute([':table' => $tableName]);
                    $exists = (bool)$stmt->fetchColumn();
            }

            // Return true if at least one row was found, false otherwise
            return $exists;

        } catch (Exception $e) {
            // Catch-all safeguard: any PDO or query failure is logged and treated as "table not found"
            error_log("tableExists() error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Handle AJAX request to locate the "main" chart configuration JSON for a specific module.
     *
     * This method searches for the requested module's chart definition across multiple
     * known chart directories. When it finds a JSON file with `"main": true`, it immediately
     * returns the file’s path and name as a JSON response.
     *
     * ---
     * **Search logic:**
     * 1. Look under `$this->myFilesBase . '/charts'`
     * 2. Then under `$this->allsky_config . '/modules/charts'`
     * 3. Finally under `$this->myFilesData . '/charts'`
     *
     * Each of these directories may contain subdirectories named after modules.
     * The function looks for the one matching the requested module name (`$_POST['module']`),
     * scans its JSON files, and selects the one where `"main": true`.
     *
     * ---
     * **Response format (if found):**
     * ```json
     * {
     *   "path": "/full/path/to/module",
     *   "filename": "chart.json"
     * }
     * ```
     *
     * **Response format (if not found):**
     * ```json
     * {}
     * ```
     *
     * ---
     * **Notes:**
     * - This function is typically triggered via an AJAX POST call.
     * - It sends a JSON response via `$this->sendResponse()` and does not return a value.
     * - It silently skips unreadable or invalid JSON files.
     * - Uses `DirectoryIterator` and `glob()` to efficiently traverse directories.
     * - Declares no explicit return type (should ideally be `void`).
     */
    function postModuleGraphData()
    {
        // List of potential chart directories to search (in priority order)
        $chartDirs = [];
        $requestedModule = $_POST['module'];

        $chartDirs[] = $this->myFilesBase . '/charts';
        $chartDirs[] = $this->allsky_config . '/modules/charts';
        $chartDirs[] = $this->myFilesData . '/charts';

        // Iterate over all chart directories
        foreach ($chartDirs as $chartDir) {
            if (is_dir($chartDir)) {
                // Iterate through each subdirectory inside the chart directory
                $dir = new DirectoryIterator($chartDir);
                foreach ($dir as $entry) {
                    // Skip "." and ".." and ignore non-directory entries
                    if ($entry->isDot() || !$entry->isDir()) {
                        continue;
                    }

                    $module     = $entry->getFilename();   // e.g., "allsky_temp"
                    $modulePath = $entry->getPathname();   // Full path to that module directory

                    // Check only the directory that matches the requested module
                    if ($module == $requestedModule) {
                        // Scan all JSON files in this module directory
                        foreach (glob($modulePath . '/*.json') as $jsonFile) {
                            // Read file contents; suppress warnings if unreadable
                            $raw = @file_get_contents($jsonFile);
                            if ($raw === false) {
                                continue;
                            }

                            // Decode JSON content into an associative array
                            $data = json_decode($raw, true);
                            if (!is_array($data)) {
                                continue; // Skip invalid JSON
                            }

                            // If this JSON marks itself as the "main" chart, respond and exit
                            if (isset($data['main']) && $data['main'] == true) {
                                $this->sendResponse(json_encode([
                                    'path'     => $modulePath,
                                    'filename' => basename($jsonFile)
                                ]));
                            }
                        }
                    }
                }
            }
        }

        // If no matching chart was found, respond with an empty JSON object
        $this->sendResponse(json_encode([]));
    }

    /**
     * Read a chart config (inline or from file), fetch data from DB, and respond with a JSON chart model.
     *
     * Request body (JSON):
     * - EITHER: { "filename": "<absolute/path/to/config.json>", "range": { "from": <ts>, "to": <ts> } }
     * - OR:     { "chartConfig": { ... full config ... },         "range": { "from": <ts>, "to": <ts> } }
     *
     * Range notes:
     * - "from"/"to" may be in seconds or milliseconds since epoch.
     *   The function normalizes values > 2e12 down to seconds (÷1000),
     *   and also normalizes values > 2e9 down to seconds (÷1000) as a second safeguard.
     * - If "to" is missing/<=0 → uses current time.
     * - If "from" is missing/<=0 → defaults to 24 hours before "to".
     * - If "from" > "to" → swapped.
     *
     * Chart types:
     * - Gauge / Yes-No ("gauge","guage","yesno"): fetches only the latest values for each variable (single-point arrays).
     * - Others (e.g. "line"): fetches full time series for each variable in the requested range.
     *
     * Output:
     * - Responds via $this->sendResponse(<json>) with the chart config enriched with "data" arrays.
     * - Each series entry will have "data" populated and the original "variable" key removed.
     *
     * Side effects:
     * - Sends cache-control headers and JSON content-type headers.
     * - Opens a PDO connection via $this->makePdo().
     *
     * @return array Declared as array, but this method sends an HTTP response and does not actually return data.
     *               Consider changing the signature to : void for correctness.
     *
     * @throws InvalidArgumentException on bad JSON body or missing/invalid config.
     * @throws RuntimeException on unreadable config file or invalid file JSON.
     * @throws PDOException bubble-up from downstream DB calls (except where handled).
     */
    public function postGraphData(): array
    {
        // --- Response headers: JSON body, disable caching ---
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');

        // Open DB connection (MySQL/SQLite). Returns PDO or false (for missing SQLite file).
        $pdo = $this->makePdo();

        // --- Parse JSON request body ---
        $raw = file_get_contents('php://input') ?: '';
        $req = json_decode($raw, true);
        if (!is_array($req)) {
            throw new InvalidArgumentException('Invalid JSON body: ' . json_last_error_msg());
        }

        // --- Load chart config ---
        // Either "chartConfig" (inline object) OR "filename" (path to JSON config file)
        if (isset($req['chartConfig']) && is_array($req['chartConfig'])) {
            $config = $req['chartConfig'];
        } elseif (!empty($req['filename']) && is_string($req['filename'])) {
            $configPath = $req['filename'];
            if (!is_file($configPath) || !is_readable($configPath)) {
                throw new RuntimeException("Config file not found or unreadable: {$configPath}");
            }
            $fileRaw = file_get_contents($configPath);
            $config  = json_decode($fileRaw, true);
            if (!is_array($config)) {
                throw new RuntimeException("Invalid JSON in {$configPath}: " . json_last_error_msg());
            }
        } else {
            throw new InvalidArgumentException('Provide either "filename" or "chartConfig" in the request body.');
        }

        // --- Validate "series" array presence ---
        $series = $config['series'] ?? null;
        if (!is_array($series) || !count($series)) {
            throw new InvalidArgumentException('Config must include non-empty "series".');
        }

        // --- Determine chart type → gauge/yesno uses latest-only, others use full series ---
        $type = strtolower(trim((string)($config['type'] ?? 'line')));
        $isGaugeOrYesNo = in_array($type, ['gauge', 'guage', 'yesno'], true);

        // --- Parse and normalize time range (seconds vs milliseconds) ---
        $from = null; $to = null;
        if (isset($req['range']) && is_array($req['range'])) {
            $from = $req['range']['from'] ?? null;
            $to   = $req['range']['to']   ?? null;
        }
        $from = is_numeric($from) ? (int)$from : 0;
        $to   = is_numeric($to)   ? (int)$to   : 0;

        // Normalize millisecond epochs down to seconds (guard both >2e12 and >2e9)
        if ($from > 2000000000000) $from = (int)floor($from / 1000);
        if ($to   > 2000000000000) $to   = (int)floor($to   / 1000);
        if ($from > 2000000000)    $from = (int)floor($from / 1000);
        if ($to   > 2000000000)    $to   = (int)floor($to   / 1000);

        // Fill defaults and enforce ordering
        $now = time();
        if ($to <= 0)   $to   = $now;
        if ($from <= 0) $from = $to - 24 * 3600;  // default to last 24h
        if ($from > $to) { $tmp = $from; $from = $to; $to = $tmp; }

        // --- Utility to parse "variable" spec with optional '|thumb' flag ---
        // e.g. "AS_TEMP|true" → ['var' => 'AS_TEMP', 'thumb' => true]
        $parseVar = function (string $raw): array {
            $thumb = false;
            $var = $raw;
            if (strpos($raw, '|') !== false) {
                [$base, $flag] = array_pad(explode('|', $raw, 2), 2, null);
                $var = (string)$base;
                if ($flag !== null) {
                    $f = strtolower(trim($flag));
                    $thumb = in_array($f, ['1','true','yes','y','on'], true);
                }
            }
            return ['var' => $var, 'thumb' => $thumb];
        };

        // Default table may be defined at top level; series may override per-entry.
        $defaultTable = (string)($config['table'] ?? '');

        // Buckets keyed by table → { vars:[], thumbs:{var=>bool}, seriesMap:{seriesIndex=>var} }
        $byTable = [];
        // Optional per-series metadata (not used further here but can be handy for debugging)
        $seriesIdxMeta = [];

        // --- Partition series by table, collect requested variables, and track tooltip (thumb) wants ---
        foreach ($series as $idx => $def) {
            if (!is_array($def) || !isset($def['variable'])) continue;

            $rawVar = (string)$def['variable'];
            $tbl = isset($def['table']) && $def['table'] !== '' ? (string)$def['table'] : $defaultTable;

            if ($tbl === '') {
                throw new InvalidArgumentException("Series index {$idx} has no table and no default table is set.");
            }

            $pv  = $parseVar($rawVar);
            $var = $pv['var'];
            $thumb = $pv['thumb'];

            if (!isset($byTable[$tbl])) {
                $byTable[$tbl] = ['vars' => [], 'thumbs' => [], 'seriesMap' => []];
            }
            if (!in_array($var, $byTable[$tbl]['vars'], true)) {
                $byTable[$tbl]['vars'][] = $var;
            }
            // If any series requests thumb for this var, remember true
            $byTable[$tbl]['thumbs'][$var] = ($byTable[$tbl]['thumbs'][$var] ?? false) || $thumb;
            // Map series index → var (so we can fill back later)
            $byTable[$tbl]['seriesMap'][$idx] = $var;

            $seriesIdxMeta[$idx] = ['var' => $var, 'table' => $tbl];
        }

        // --- Fetch data ---
        if ($pdo !== false) {

            if ($isGaugeOrYesNo) {
                // Latest-only path: fetch the most recent values per var, per table
                foreach ($byTable as $table => $bucket) {
                    $vars = $bucket['vars'];
                    if (!$vars) continue;

                    $latestByVar = $this->fetchLatestValues($pdo, $table, $vars);

                    // Fill results back into the original series (remove "variable", set single-point "data")
                    foreach ($bucket['seriesMap'] as $idx => $var) {
                        unset($config['series'][$idx]['variable']);

                        $latest = $latestByVar[$var] ?? null;
                        $num = null;
                        if (is_array($latest) && array_key_exists('value', $latest)) {
                            $num = $latest['value'];
                        } elseif (is_numeric($latest)) {
                            // Defensive: if fetchLatestValues() shape changes or driver returns raw
                            $num = $latest + 0;
                        }
                        $config['series'][$idx]['data'] = ($num !== null) ? [ $num ] : [];
                    }
                }

            } else {
                // Full time-series path: fetch ranges per table, then populate series
                foreach ($byTable as $table => $bucket) {
                    $vars = $bucket['vars'];
                    if (!$vars) continue;

                    // thumb flags per var (used to decide whether to attempt tooltip thumbnail lookup)
                    $tooltips = $bucket['thumbs'];

                    // Fetch time series for the grouped variables within the range
                    $dataByVar = $this->fetchSeriesData($pdo, $table, $vars, $tooltips, (int)$from, (int)$to);

                    // Fill results back into the original series (remove "variable", set "data")
                    foreach ($bucket['seriesMap'] as $idx => $var) {
                        unset($config['series'][$idx]['variable']);
                        $config['series'][$idx]['data'] = $dataByVar[$var] ?? [];
                    }
                }
            }

        } else {
            // No DB connection available → return empty datasets for all series
            foreach (array_keys($series) as $idx) {
                unset($config['series'][$idx]['variable']);
                $config['series'][$idx]['data'] = [];
            }
        }

        // --- Emit final JSON payload (with series data inlined) ---
        $json = json_encode($config, JSON_UNESCAPED_SLASHES);
        $this->sendResponse($json);
    }

    /**
     * Parse a chart configuration JSON file and append its metadata to the chart list.
     *
     * This helper reads a single chart JSON file, validates it, and (if valid) appends
     * a standardized entry to the `$chartList` array under the chart’s `"group"` name.
     *
     * Each valid chart entry contributes an associative array with the following keys:
     * ```php
     * [
     *   'module'   => string,   // Module folder name the chart belongs to
     *   'filename' => string,   // Full path to the JSON file
     *   'icon'     => ?string,  // Optional icon name or path
     *   'title'    => string,   // Chart display title
     *   'enabled'  => bool,     // Whether the chart should be shown (usually true)
     *   'custom'   => bool      // True if the chart came from a user-defined/custom directory
     * ]
     * ```
     *
     * ---
     * **Behavior Summary**
     * - Safely reads and parses the JSON file (skips unreadable or invalid JSON).
     * - Requires `"group"` in the JSON to determine grouping category.
     * - Optionally extracts `"table"`, `"icon"`, and `"title"` fields.
     * - Default title falls back to the JSON filename (without extension).
     * - Currently always marks charts as `"enabled"`, but the commented logic
     *   shows intent to check database table existence for dynamic enablement.
     *
     * ---
     * **Example Input File (JSON)**
     * ```json
     * {
     *   "group": "Environment",
     *   "table": "allsky_temp",
     *   "icon": "fa-thermometer-half",
     *   "title": "Temperature Overview"
     * }
     * ```
     *
     * **Resulting Output**
     * ```php
     * $chartList['Environment'][] = [
     *     'module'   => 'allsky_temp',
     *     'filename' => '/.../charts/allsky_temp/temp_chart.json',
     *     'icon'     => 'fa-thermometer-half',
     *     'title'    => 'Temperature Overview',
     *     'enabled'  => true,
     *     'custom'   => false
     * ];
     * ```
     *
     * @param PDO    $pdo        Active PDO connection (used to check table existence if enabled)
     * @param array  $chartList  Accumulated chart list, grouped by chart "group"
     * @param string $jsonFile   Full path to the chart JSON file
     * @param string $module     Module folder the chart originates from
     * @param bool   $custom     True if this chart was found in a custom (user) directory
     *
     * @return array Updated $chartList with new chart metadata (if valid)
     */
    private function buildChartListFromFile(PDO $pdo, array $chartList, string $jsonFile, string $module, bool $custom = false): array 
    {
        // Safely read the JSON file contents; suppress warnings and skip on failure.
        $raw = @file_get_contents($jsonFile);

        if ($raw !== false) {
            // Decode JSON as associative array; skip if invalid or empty.
            $data = json_decode($raw, true);
            if (is_array($data)) {

                // The "group" key determines which section this chart belongs to.
                $group = $data['group'] ?? null;
                if ($group) {
                    // Optional chart metadata
                    $table = $data['table'] ?? null;
                    $icon  = $data['icon']  ?? null;

                    // Whether chart is enabled (placeholder logic, always true for now)
                    $enabled = true;

                    // Uncomment to enable runtime table existence checking:
                    /*
                    if ($table !== null) {
                        if ($this->tableExists($pdo, $table)) {
                            $enabled = true;
                        } else {
                            $enabled = false;
                        }
                    }
                    */

                    // Prefer 'title' in JSON, fallback to filename (without .json extension)
                    $title = $data['title'] ?? basename($jsonFile, '.json');

                    // Append chart metadata entry under its "group"
                    $chartList[$group][] = [
                        'module'   => $module,                                 // Module folder name
                        'filename' => $jsonFile,                               // Full file path
                        'icon'     => $icon !== null ? (string)$icon : null,   // Optional icon name
                        'title'    => (string)$title,                          // Display title
                        'enabled'  => $enabled,                                // Always true (for now)
                        'custom'   => $custom                                  // Custom flag (user charts)
                    ];
                }
            }
        }

        // Return the updated chart list (possibly unchanged if invalid file)
        return $chartList;
    }

    /**
     * Recursively scan a base charts directory and build a grouped chart list.
     *
     * This function traverses a given base directory to discover chart configuration
     * files (`*.json`) stored either directly under the directory (for custom charts)
     * or inside subdirectories representing individual modules.
     *
     * Each valid JSON file is parsed and normalized into a consistent metadata structure
     * using `buildChartListFromFile()`. The resulting chart entries are grouped by their
     * `"group"` field from the JSON definition.
     *
     * ---
     * **Behavior Summary**
     * - If `$custom` is `true`, charts are assumed to reside directly under `$baseDir`
     *   (no module subfolders). All such files are tagged with module `"Custom"`.
     * - If `$custom` is `false`, charts are expected to be located inside subfolders
     *   (each subfolder representing a module name, e.g. `allsky_temp`).
     * - For every `.json` chart file found, this method calls
     *   `buildChartListFromFile()` to parse and append normalized entries.
     *
     * ---
     * **Example Directory Layout**
     * ```
     * /charts/
     * ├── allsky_temp/
     * │   ├── temp_chart.json
     * │   └── humidity_chart.json
     * ├── allsky_meteor/
     * │   └── streak_count.json
     * └── custom/
     *     └── night_summary.json
     * ```
     *
     * ---
     * **Output Structure**
     * ```php
     * [
     *   "Environment" => [
     *     [ "module" => "allsky_temp", "filename" => ".../temp_chart.json", ... ],
     *     [ "module" => "allsky_temp", "filename" => ".../humidity_chart.json", ... ]
     *   ],
     *   "Meteors" => [
     *     [ "module" => "allsky_meteor", "filename" => ".../streak_count.json", ... ]
     *   ]
     * ]
     * ```
     *
     * @param PDO    $pdo        Active PDO connection (passed to downstream checks).
     * @param array  $chartList  Current grouped chart list (accumulated across directories).
     * @param string $baseDir    Path to the root charts directory being scanned.
     * @param bool   $custom     True if scanning a user-defined/custom charts directory.
     *
     * @return array Updated `$chartList` grouped by chart "group" name.
     */
    private function buildChartList(PDO $pdo, array $chartList, string $baseDir, bool $custom = false): array
    {
        // If base directory doesn't exist, skip and return the unmodified list.
        if (!is_dir($baseDir)) {
            return $chartList;
        }

        if ($custom) {
            // === CUSTOM CHART MODE ===
            // Custom charts are stored directly as JSON files (no module subfolders).
            $module = 'Custom';

            // Find all JSON chart definitions in the base directory.
            foreach (glob($baseDir . '/*.json') as $jsonFile) {
                // Parse and append each file to the chart list under "Custom" module.
                $chartList = $this->buildChartListFromFile($pdo, $chartList, $jsonFile, $module, $custom);
            }

        } else {
            // === MODULE CHART MODE ===
            // Iterate through subdirectories (each representing a module).
            $dir = new DirectoryIterator($baseDir);

            foreach ($dir as $entry) {
                // Skip "." and ".." and ignore non-directory entries.
                if ($entry->isDot() || !$entry->isDir()) {
                    continue;
                }

                // Derive module name and absolute path.
                $module     = $entry->getFilename();  // e.g. "allsky_temp"
                $modulePath = $entry->getPathname();  // e.g. "/.../charts/allsky_temp"

                // Search for JSON files directly within the module folder.
                foreach (glob($modulePath . '/*.json') as $jsonFile) {
                    // Process each JSON file and append to the chart list.
                    $chartList = $this->buildChartListFromFile($pdo, $chartList, $jsonFile, $module, $custom);
                }
            }
        }

        // Return the updated grouped chart list.
        return $chartList;
    }

    /**
     * Build and return a grouped list of all available chart definitions (core + user + custom).
     *
     * This method scans multiple chart directories — including system-provided and
     * user-defined locations — to gather all valid chart JSON definitions.
     *
     * It merges charts from the following sources:
     * 1. **Core modules:**    `$this->allsky_config . '/modules/charts'`
     * 2. **User modules:**    `$this->myFilesData . '/charts'`
     * 3. **Custom charts:**   `$this->myFilesBase . '/charts'` (marked as `custom=true`)
     *
     * For each directory, it calls `buildChartList()` to recursively discover and normalize
     * chart metadata grouped by their `"group"` field (as defined in each JSON file).
     *
     * The resulting structure is then serialized as JSON and returned to the frontend.
     *
     * ---
     * **Output Example (JSON):**
     * ```json
     * {
     *   "Environment": [
     *     { "module": "allsky_temp", "title": "Temperature", "filename": ".../temp_chart.json", "enabled": true, "custom": false },
     *     { "module": "allsky_temp", "title": "Humidity", "filename": ".../humidity_chart.json", "enabled": true, "custom": false }
     *   ],
     *   "System": [
     *     { "module": "allsky_hardware", "title": "CPU Temp", "filename": ".../hardware_chart.json", "enabled": true, "custom": false }
     *   ],
     *   "Custom": [
     *     { "module": "Custom", "title": "Night Summary", "filename": ".../night_summary.json", "enabled": true, "custom": true }
     *   ]
     * }
     * ```
     *
     * ---
     * **Notes:**
     * - Relies on a valid PDO connection from `$this->makePdo()`.
     * - If no database connection is available (`false` returned), the chart list will remain empty.
     * - The grouped `$chartList` is sorted alphabetically by group name before being sent.
     * - Sends the JSON response immediately using `$this->sendResponse()`.
     *
     * @return void  Outputs JSON response directly and does not return a value.
     */
    public function getAvailableGraphs()
    {
        // Initialize an empty chart list, grouped by "group" field later on
        $chartList = [];

        // Define chart source directories
        $coreModules  = $this->allsky_config . '/modules/charts';  // Core system charts
        $userModules  = $this->myFilesData   . '/charts';          // User-specific module charts
        $customCharts = $this->myFilesBase   . '/charts';          // Custom/freeform charts (flat structure)

        // Attempt to create a PDO connection for potential DB-dependent checks
        $pdo = $this->makePdo();

        if ($pdo !== false) {
            // Scan and append charts from each source location

            // 1. Core module charts (e.g., allsky_temp, allsky_meteor)
            $chartList = $this->buildChartList($pdo, $chartList, $coreModules);

            // 2. User module charts (user-overridden or additional modules)
            $chartList = $this->buildChartList($pdo, $chartList, $userModules);

            // 3. Custom charts (directly under /charts, flagged as custom=true)
            $chartList = $this->buildChartList($pdo, $chartList, $customCharts, true);

            // Sort groups alphabetically for consistent UI display
            asort($chartList);
        }

        // Output grouped chart metadata as a JSON response
        $this->sendResponse(json_encode($chartList));
    }

    /**
     * Handle POST request to save the current chart layout/state configuration.
     *
     * This endpoint accepts a JSON payload via HTTP POST (from `php://input`)
     * containing the user’s chart layout, positions, or other dashboard state data.
     *
     * The payload is parsed and written to a `state.json` file under the user’s
     * `$this->allskyMyFiles` directory. If parsing or saving fails, the method
     * returns a 500 HTTP error response.
     *
     * ---
     * **Expected Request:**
     * - Content-Type: application/json
     * - Body: a valid JSON object representing chart state, for example:
     * ```json
     * {
     *   "charts": [
     *     { "id": "chart1", "x": 0, "y": 0, "width": 400, "height": 300 },
     *     { "id": "chart2", "x": 400, "y": 0, "width": 400, "height": 300 }
     *   ],
     *   "lastModified": 1739912345
     * }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads raw POST body from `php://input`.
     * 2. Decodes the JSON payload into a PHP array.
     * 3. On decode failure → sends HTTP 500 via `$this->send500()`.
     * 4. Saves the formatted JSON to `<allskyMyFiles>/state.json`.
     * 5. On file write failure → sends HTTP 500 with an error message.
     * 6. On success → sends an empty 200 OK response.
     *
     * ---
     * **Response Codes:**
     * - `200 OK` — Chart state successfully saved.
     * - `500 Internal Server Error` — JSON decode or file write failed.
     *
     * @return void  Sends an HTTP response directly; does not return data.
     */
    public function postSaveCharts() 
    {
        // Read raw POST body from input stream
        $jsonData = file_get_contents("php://input");

        // Decode the JSON payload into an associative array
        $data = json_decode($jsonData, true);

        // If JSON decoding failed, send a 500 error response
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send500();
        }

        // Target file path for storing chart state
        $stateFile = $this->allskyMyFiles . '/state.json';

        // Attempt to save the JSON data to disk with pretty formatting
        $result = file_put_contents(
            $stateFile,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // If saving failed, send a 500 error response with message
        if ($result === false) {
            $this->send500('Failed to save JSON');
        }

        // On success, send an empty OK response
        $this->sendResponse('');
    }

    /**
     * Handle GET request to retrieve the saved chart layout or dashboard state.
     *
     * This endpoint reads the previously saved chart configuration file
     * (`state.json`) from the user's `$this->allskyMyFiles` directory and
     * returns it as a validated JSON response.
     *
     * ---
     * **Behavior Summary:**
     * 1. Attempts to read `<allskyMyFiles>/state.json`.
     * 2. If the file is missing or unreadable, returns an empty array (`[]`).
     * 3. Decodes the JSON to validate it.
     * 4. If the file contains invalid JSON, returns HTTP 500.
     * 5. Re-encodes the validated JSON to ensure proper formatting before sending.
     *
     * ---
     * **Response Examples:**
     * ```json
     * [
     *   { "id": "chart1", "x": 0, "y": 0, "width": 400, "height": 300 },
     *   { "id": "chart2", "x": 400, "y": 0, "width": 400, "height": 300 }
     * ]
     * ```
     *
     * If the file does not exist:
     * ```json
     * []
     * ```
     *
     * ---
     * **Error Handling:**
     * - Sends HTTP 500 (`send500('Invalid JSON')`) if `state.json` is corrupt or contains invalid JSON.
     *
     * @return void  Outputs JSON directly via `sendResponse()` and does not return a value.
     */
    public function getSaveCharts()
    {
        // Path to the saved chart layout file
        $stateFile = $this->allskyMyFiles . '/state.json';

        // Attempt to read the file contents; suppress warnings if missing/unreadable
        $jsonString = @file_get_contents($stateFile);

        // If the file is missing or unreadable, default to an empty JSON array
        if ($jsonString === false) {
            $jsonString = "[]";
        }

        // Decode JSON for validation and consistency
        $data = json_decode($jsonString, true);

        // If the file contained invalid JSON, return a 500 error
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send500('Invalid JSON');
        }

        // Re-encode to ensure valid and properly formatted JSON output
        $this->sendResponse(json_encode($data));
    }

    /* Chart builder code */


    /**
     * Handle POST request to load a specific custom chart configuration file.
     *
     * This endpoint expects a JSON body containing the absolute or relative
     * path to a chart configuration file. It reads and parses that JSON file,
     * and returns its decoded contents wrapped in a response object.
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * { "name": "/path/to/custom/chart.json" }
     * ```
     *
     * ---
     * **Response Examples:**
     *
     * Successful load:
     * ```json
     * {
     *   "ok": true,
     *   "config": {
     *     "title": "Custom Temperature Chart",
     *     "table": "allsky_temp",
     *     "series": [ ... ]
     *   }
     * }
     * ```
     *
     * Error responses:
     * ```json
     * { "ok": false, "error": "Invalid JSON payload." }
     * { "ok": false, "error": "Missing chart name." }
     * { "ok": false, "error": "Chart not found." }
     * { "ok": false, "error": "Server error: <details>" }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads POST body (`php://input`) and attempts to decode it as JSON.
     * 2. Validates that a `"name"` field is provided and non-empty.
     * 3. Checks that the referenced chart file exists.
     * 4. Reads and decodes the chart JSON configuration file.
     * 5. Returns the decoded chart configuration under `"config"`.
     * 6. If any step fails, returns `"ok": false` with an `"error"` message.
     *
     * ---
     * **Error Handling:**
     * - Gracefully returns a structured JSON error object for:
     *   - Invalid input JSON.
     *   - Missing `"name"` field.
     *   - File not found.
     *   - File read/parse errors.
     * - Catches any unhandled exceptions (`Throwable`) and reports a generic `"Server error"` message.
     *
     * @return void  Sends a JSON response directly; does not return a value.
     */
    public function postLoadCustomChart()
    {
        // Default response structure
        $result = ['ok' => false];

        try {
            // Read raw request body
            $raw = file_get_contents('php://input');

            // Attempt to decode the JSON payload
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                $result['error'] = 'Invalid JSON payload.';
                return $this->sendResponse(json_encode($result));
            }

            // Extract and validate the "name" field (chart file path)
            $name = isset($data['name']) ? trim($data['name']) : '';
            if ($name === '') {
                $result['error'] = 'Missing chart name.';
                return $this->sendResponse(json_encode($result));
            }

            // Check if the requested file actually exists
            if (!file_exists($name)) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Read the contents of the chart JSON file
            $fileRaw = file_get_contents($name);

            // Decode the JSON chart configuration
            $config = json_decode($fileRaw, true);

            // Attach the decoded chart config to the result
            $result['config'] = $config;
            $result['ok'] = true;

            // Return the successful response
            return $this->sendResponse(json_encode($result));

        } catch (\Throwable $e) {
            // Catch all unexpected errors (I/O, JSON decode, etc.)
            $result['error'] = 'Server error: ' . $e->getMessage();
            return $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to delete a custom chart configuration file.
     *
     * This endpoint accepts a JSON payload specifying a chart configuration file path
     * and deletes it from the filesystem, provided the path is within a permitted
     * charts directory (core, user, or custom).
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * { "name": "/path/to/custom/chart.json" }
     * ```
     *
     * ---
     * **Response Examples:**
     *
     * Successful deletion:
     * ```json
     * { "ok": true, "name": "/path/to/custom/chart.json" }
     * ```
     *
     * Error responses:
     * ```json
     * { "ok": false, "error": "Invalid JSON payload." }
     * { "ok": false, "error": "Missing chart name." }
     * { "ok": false, "error": "Unauthorized path." }
     * { "ok": false, "error": "Chart not found." }
     * { "ok": false, "error": "Failed to delete chart file." }
     * { "ok": false, "error": "Server error: <details>" }
     * ```
     *
     * ---
     * **Security Measures:**
     * - Prevents directory traversal by validating the resolved (`realpath`) location.
     * - Only files inside the following directories may be deleted:
     *   - `$this->myFilesBase . '/charts'`
     *   - `$this->myFilesData . '/charts'`
     *   - `$this->allsky_config . '/modules/charts'`
     *
     * Any file outside these directories is rejected as `"Unauthorized path."`
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads POST body (`php://input`) and decodes JSON.
     * 2. Validates `"name"` parameter.
     * 3. Resolves the file path and ensures it lies within allowed chart directories.
     * 4. Checks for file existence.
     * 5. Attempts to delete the file using `unlink()`.
     * 6. Returns JSON response indicating success or failure.
     *
     * @return void  Sends a JSON response directly via `sendResponse()`; no return value.
     */
    public function postDeleteCustomChart()
    {
        $result = ['ok' => false];

        try {
            // Read raw POST input
            $raw = file_get_contents('php://input');

            // Decode JSON payload
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                $result['error'] = 'Invalid JSON payload.';
                return $this->sendResponse(json_encode($result));
            }

            // Extract and validate "name"
            $name = isset($data['name']) ? trim($data['name']) : '';
            if ($name === '') {
                $result['error'] = 'Missing chart name.';
                return $this->sendResponse(json_encode($result));
            }

            // Resolve absolute, canonical path to eliminate ../ or symlinks
            $realPath = realpath($name);
            if ($realPath === false) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Define allowed base directories for deletion
            $allowedDirs = [
                realpath($this->myFilesBase . '/charts'),
                realpath($this->myFilesData . '/charts'),
                realpath($this->allsky_config . '/modules/charts')
            ];

            // Check if file is within any allowed directory
            $isAllowed = false;
            foreach ($allowedDirs as $dir) {
                if ($dir !== false && str_starts_with($realPath, $dir)) {
                    $isAllowed = true;
                    break;
                }
            }

            // Reject unauthorized or unsafe paths
            if (!$isAllowed) {
                $result['error'] = 'Unauthorized path.';
                return $this->sendResponse(json_encode($result));
            }

            // Ensure the file actually exists
            if (!file_exists($realPath)) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Attempt to delete the chart file
            if (!@unlink($realPath)) {
                $result['error'] = 'Failed to delete chart file.';
                return $this->sendResponse(json_encode($result));
            }

            // Success response
            $result['ok'] = true;
            $result['name'] = $realPath;
            return $this->sendResponse(json_encode($result));

        } catch (\Throwable $e) {
            // Handle unexpected exceptions safely
            $result['error'] = 'Server error: ' . $e->getMessage();
            return $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to save a custom chart configuration to disk.
     *
     * This endpoint allows users to create or update their own chart definitions
     * by sending a JSON payload containing a chart title, optional group, and chart
     * configuration data. The chart configuration is written as a `.json` file
     * under the user's custom charts directory (`$this->myFilesBase/charts`).
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * {
     *   "title": "Temperature Overview",
     *   "group": "Environment",
     *   "config": {
     *     "title": "Temperature Overview",
     *     "table": "allsky_temp",
     *     "series": [
     *       { "variable": "AS_TEMP", "color": "#ff0000" }
     *     ]
     *   }
     * }
     * ```
     *
     * ---
     * **Successful Response:**
     * ```json
     * {
     *   "ok": true,
     *   "file": "temperature_overview.json",
     *   "path": "/var/www/allsky/myfiles/charts/temperature_overview.json",
     *   "message": "Chart 'Temperature Overview' saved successfully."
     * }
     * ```
     *
     * **Error Response:**
     * ```json
     * {
     *   "ok": false,
     *   "error": "Chart title is required."
     * }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads the raw POST body (`php://input`) and decodes it from JSON.
     * 2. Validates that:
     *    - The input is valid JSON.
     *    - A `"title"` is provided.
     *    - A `"config"` object exists and is an array.
     * 3. Sanitizes the title to form a safe filename (`a-z0-9_-` only).
     * 4. Ensures the `charts` directory exists, creating it if needed.
     * 5. Writes the JSON configuration to `<myFilesBase>/charts/{title}.json`.
     * 6. Returns a JSON response with success or error details.
     *
     * ---
     * **File Naming Rules:**
     * - Non-alphanumeric characters in the chart title are replaced with underscores (`_`).
     * - All letters are converted to lowercase.
     * - Example: `"Temperature Overview"` → `temperature_overview.json`
     *
     * ---
     * **Exceptions & Error Handling:**
     * - Throws `RuntimeException` for I/O or encoding issues.
     * - Throws `InvalidArgumentException` for missing/invalid fields.
     * - All exceptions are caught, and a JSON error response is returned with `ok=false`.
     *
     * @return void  Sends a JSON response directly via `$this->sendResponse()`.
     */
    public function postSaveCustomChart(): void
    {
        try {
            // === Step 1: Read raw JSON input ===
            $raw = file_get_contents('php://input');
            if (!$raw) {
                throw new RuntimeException('No input received.');
            }

            // === Step 2: Decode JSON payload ===
            $input = json_decode($raw, true);
            if (!is_array($input)) {
                throw new RuntimeException('Invalid JSON input: ' . json_last_error_msg());
            }

            // === Step 3: Extract and validate required fields ===
            $title  = trim($input['title'] ?? '');
            $group  = trim($input['group'] ?? 'Custom'); // Currently unused, reserved for grouping
            $config = $input['config'] ?? null;

            if ($title === '') {
                throw new InvalidArgumentException('Chart title is required.');
            }
            if (!is_array($config)) {
                throw new InvalidArgumentException('Chart configuration is missing or invalid.');
            }

            // === Step 4: Sanitize title to create a safe filename ===
            $safeTitle = preg_replace('/[^A-Za-z0-9_\-]/', '_', strtolower($title));
            $fileName  = $safeTitle . '.json';

            // === Step 5: Ensure target save directory exists ===
            $saveDir = rtrim($this->myFilesBase, '/') . '/charts';
            if (!is_dir($saveDir)) {
                if (!mkdir($saveDir, 0775, true) && !is_dir($saveDir)) {
                    throw new RuntimeException("Failed to create directory: {$saveDir}");
                }
            }

            // === Step 6: Write chart configuration to file ===
            $savePath = "{$saveDir}/{$fileName}";
            $encoded  = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (file_put_contents($savePath, $encoded) === false) {
                throw new RuntimeException("Failed to write chart file: {$fileName}");
            }

            // === Step 7: Respond with success ===
            $result = [
                'ok'      => true,
                'file'    => $fileName,
                'path'    => $savePath,
                'message' => "Chart '{$title}' saved successfully."
            ];

            $this->sendResponse(json_encode($result));

        } catch (Throwable $e) {
            // === Step 8: Error handling ===
            $result = [
                'ok'    => false,
                'error' => $e->getMessage(),
            ];
            $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to fetch series data for variables, supporting cartesian, gauge, and yes/no charts.
     *
     * **Accepted chart types**
     * - Cartesian:  line, spline, area, column, bar, column3d, area3d  → returns time-series arrays.
     * - Gauge:      gauge                                              → returns latest single value.
     * - Binary:     yesno                                              → returns latest single value.
     *
     * **Request body (JSON)**
     * ```json
     * {
     *   "type": "line" | "gauge" | "yesno",
     *   "xField": "id",                 // optional, informational
     *   "xIsDatetime": true,            // optional, informational (client-side use)
     *   "range": { "from": 1710000000, "to": 1710010000 }, // epoch seconds; optional for cartesian
     *   "yLeft":  [ {"variable":"AS_TEMP|true","table":"allsky_temp"} , "AS_HUMIDITY:allsky_temp" ],
     *   "yRight": [ {"variable":"AS_DEW","table":"allsky_temp"} ],
     *   "valueField": {"variable":"AS_TEMP","table":"allsky_temp"}      // required for gauge/yesno
     * }
     * ```
     * Notes:
     * - Variables may be specified as objects `{variable, table}` **or** as strings `"VAR:TABLE"`.
     * - A variable may include a thumbnail flag suffix `"|true"` to request tooltip thumbnails.
     * - For cartesian charts, if `range` is omitted, a default window (last 6h) is used.
     * - For gauge/yesno, only the latest value is fetched.
     *
     * **Response (cartesian)**
     * ```json
     * {
     *   "ok": true,
     *   "type": "line",
     *   "xField": "id",
     *   "series": [
     *     { "id":"AS_TEMP", "name":"AS_TEMP", "data":[{"x":1710000010000,"y":12.3}, ...] },
     *     { "id":"AS_HUMIDITY", "name":"AS_HUMIDITY", "data":[{"x":1710000010000,"y":75.2}, ...] }
     *   ]
     * }
     * ```
     *
     * **Response (gauge/yesno)**
     * ```json
     * { "ok":true, "type":"gauge", "valueField":"AS_TEMP", "table":"allsky_temp", "value": { "ts_ms":..., "value":... } }
     * ```
     *
     * Error responses use: `{ "ok": false, "error": "message" }`.
     *
     * @return void Sends JSON via `$this->sendResponse(...)`; on some early validation failures returns array.
     */
    public function postVariableSeriesData() 
    {
        // ----- 1) Read and decode request -----

        // Read raw JSON body; if empty (e.g., ad-hoc GET test), fall back to $_GET encoded as JSON.
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            $raw = json_encode($_GET, JSON_UNESCAPED_SLASHES);
        }

        $req = json_decode($raw, true);
        if (!is_array($req)) {
            // Early return using consistent error shape (not sent via sendResponse here by design).
            return ['ok' => false, 'error' => 'Invalid JSON body'];
        }

        // Basic request fields
        $type        = isset($req['type']) ? strtolower(trim((string)$req['type'])) : '';
        $xField      = isset($req['xField']) ? trim((string)$req['xField']) : null;  // informational
        $xIsDatetime = !empty($req['xIsDatetime']);                                   // informational
        $rangeFrom   = isset($req['range']['from']) ? (int)$req['range']['from'] : null;
        $rangeTo     = isset($req['range']['to'])   ? (int)$req['range']['to']   : null;

        // Supported chart categories
        $cartesianTypes = ['line','spline','area','column','bar','column3d','area3d'];
        $isCartesian = in_array($type, $cartesianTypes, true);
        $isGauge     = ($type === 'gauge');
        $isYesNo     = ($type === 'yesno');

        if (!$isCartesian && !$isGauge && !$isYesNo) {
            return ['ok' => false, 'error' => "Unsupported chart type '{$type}'"];
        }

        // ----- 2) Helpers to normalize entries -----
        // Accept {variable, table[, thumbnail]} or "VAR:TABLE". Supports "|true" thumbnail suffix on variable.
        $normalizeVarEntry = function ($entry): ?array {
            $var = ''; $table = ''; $thumb = false;

            if (is_array($entry)) {
                $var   = isset($entry['variable']) ? (string)$entry['variable'] : '';
                $table = isset($entry['table'])    ? (string)$entry['table']    : '';
                if (isset($entry['thumbnail']))    $thumb = (bool)$entry['thumbnail'];
            } elseif (is_string($entry)) {
                $parts = explode(':', $entry, 2);
                $var   = trim($parts[0] ?? '');
                $table = trim($parts[1] ?? '');
            } else {
                return null;
            }
            if ($var === '') return null;

            // Detect and strip "|flag" suffix; set thumbnail flag if truthy.
            if (strpos($var, '|') !== false) {
                [$base, $flag] = array_pad(explode('|', $var, 2), 2, null);
                $var = $base;
                if ($flag !== null) {
                    $flagLc = strtolower(trim($flag));
                    $thumb = $thumb || in_array($flagLc, ['1','true','yes','y','on'], true);
                }
            }

            return ['variable' => $var, 'table' => $table, 'thumbnail' => $thumb];
        };

        $normalizeVarArray = function ($arr) use ($normalizeVarEntry): array {
            $out = [];
            if (!is_array($arr)) return $out;
            foreach ($arr as $i) {
                $n = $normalizeVarEntry($i);
                if ($n) $out[] = $n;
            }
            return $out;
        };

        // ----- 3) Branch by chart type and build queries -----
        try {
            $pdo = $this->makePdo();
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => 'DB connection failed: '.$e->getMessage()];
        }

        // If cartesian and no range specified → default to last 6 hours
        if ($isCartesian) {
            if ($rangeFrom === null || $rangeTo === null) {
                $rangeTo   = $rangeTo   ?? time();
                $rangeFrom = $rangeFrom ?? ($rangeTo - 6 * 3600);
            }
        }

        // Gauge/YesNo: must provide a single valueField with {variable, table}
        if ($isGauge || $isYesNo) {
            $vf = $normalizeVarEntry($req['valueField'] ?? null);
            if (!$vf || $vf['variable'] === '') {
                return ['ok' => false, 'error' => "For {$type} charts, valueField {variable, table} is required."];
            }
            $table = $vf['table'] ?? '';
            if ($table === '') {
                return ['ok' => false, 'error' => 'Missing table for valueField'];
            }

            try {
                // Expected shape from fetchLatestValues: ['VAR' => ['ts_ms'=>..., 'value'=>...]]
                $latestMap = $this->fetchLatestValues($pdo, $table, [$vf['variable']]);
            } catch (Throwable $e) {
                return ['ok' => false, 'error' => 'fetchLatestValues failed: '.$e->getMessage()];
            }

            $value = $latestMap[$vf['variable']] ?? null;

            $result =  [
                'ok'         => true,
                'type'       => $type,
                'valueField' => $vf['variable'],
                'table'      => $table,
                'value'      => $value
            ];

            // For gauge/yesno we send the response immediately and return.
            $this->sendResponse(json_encode($result));
        }

        // ----- Cartesian series path -----

        // Normalize left/right axis selections; at least one required.
        $left  = $normalizeVarArray($req['yLeft']  ?? []);
        $right = $normalizeVarArray($req['yRight'] ?? []);
        if (!$left && !$right) {
            return ['ok' => false, 'error' => 'For cartesian charts, provide at least one variable in yLeft or yRight.'];
        }

        // ----- 4) Group by table and call fetchSeriesData() per table -----
        // Build a per-table request:
        //   $byTable[table] = [
        //     'vars'   => ['VAR1','VAR2',...],
        //     'thumbs' => ['VAR1'=>true, 'VAR2'=>false, ...]
        //   ]
        $byTable = [];

        $addToBuckets = function (array $items) use (&$byTable) {
            foreach ($items as $item) {
                $tbl = (string)($item['table'] ?? '');
                $var = (string)$item['variable'];
                $thu = (bool)($item['thumbnail'] ?? false);
                if ($tbl === '' || $var === '') continue;

                if (!isset($byTable[$tbl])) {
                    $byTable[$tbl] = ['vars' => [], 'thumbs' => []];
                }
                if (!in_array($var, $byTable[$tbl]['vars'], true)) {
                    $byTable[$tbl]['vars'][] = $var;
                }
                // Accumulate thumbnail flag per variable.
                $byTable[$tbl]['thumbs'][$var] = ($byTable[$tbl]['thumbs'][$var] ?? false) || $thu;
            }
        };

        $addToBuckets($left);
        $addToBuckets($right);

        // Call fetchSeriesData() for each table, then normalize to outgoing shape.
        $seriesOut = []; // array of { id, name, data }
        foreach ($byTable as $table => $pack) {
            $vars = $pack['vars'];
            if (!$vars) continue;

            $tooltips = $pack['thumbs']; // ['VAR'=>bool] expected by fetchSeriesData()

            try {
                // Expected return (by your earlier implementation):
                // ['VAR' => [ ['x'=>ms,'y'=>val,'custom'?], ... ], ...]
                $tableResult = $this->fetchSeriesData($pdo, $table, $vars, $tooltips, (int)$rangeFrom, (int)$rangeTo);
            } catch (Throwable $e) {
                return ['ok' => false, 'error' => "fetchSeriesData failed for table '{$table}': ".$e->getMessage()];
            }

            // Normalize to a consistent series list for the client
            if (isset($tableResult[0]) && is_array($tableResult[0]) && array_key_exists('data', $tableResult[0])) {
                // Already a list of series objects {id?, name?, data?}
                foreach ($tableResult as $s) {
                    if (!isset($s['id']) && isset($s['variable'])) $s['id'] = $s['variable'];
                    if (!isset($s['name'])) $s['name'] = $s['id'] ?? '';
                    if (!isset($s['data'])) $s['data'] = [];
                    $seriesOut[] = [
                        'id'   => (string)($s['id'] ?? ''),
                        'name' => (string)($s['name'] ?? ''),
                        'data' => (array)($s['data'] ?? [])
                    ];
                }
            } elseif (is_array($tableResult)) {
                // Associative map style: ['VAR' => [points...]]
                foreach ($vars as $v) {
                    $pts = $tableResult[$v] ?? [];
                    $seriesOut[] = [
                        'id'   => $v,
                        'name' => $v,
                        'data' => is_array($pts) ? array_values($pts) : []
                    ];
                }
            }
        }

        // Final payload; client decides axis (left/right) mapping based on its selections.
        $result =  [
            'ok'     => true,
            'type'   => $type,
            'xField' => $xField,
            'series' => $seriesOut
        ];

        $this->sendResponse(json_encode($result));
    }

    /**
     * Convert a mixed input value into a strict boolean (`true` or `false`).
     *
     * This utility normalizes different common truthy/falsy representations
     * into a proper PHP boolean, making it safe to handle user input, JSON values,
     * environment variables, or database strings where truthy values may vary.
     *
     * ---
     * **Conversion Rules:**
     *
     * | Input Type | Truthy Examples | Falsy Examples | Notes |
     * |-------------|----------------|----------------|-------|
     * | `bool`      | `true`         | `false`        | Returned as-is |
     * | `int`       | `1`, `42`, etc.| `0`            | Any non-zero integer is `true` |
     * | `string`    | `"1"`, `"true"`, `"yes"`, `"y"`, `"on"` | anything else (`"0"`, `"no"`, `"false"`, empty, etc.) | Case-insensitive |
     * | Other types | —              | —              | Always `false` |
     *
     * ---
     * **Examples:**
     * ```php
     * $this->to_bool(true);       // true
     * $this->to_bool(1);          // true
     * $this->to_bool("yes");      // true
     * $this->to_bool("No");       // false
     * $this->to_bool(0);          // false
     * $this->to_bool(null);       // false
     * ```
     *
     * @param mixed $v  Input value of any type (bool, int, string, etc.)
     * @return bool     Returns `true` if the input is recognized as truthy, otherwise `false`.
     */
    private function to_bool($v): bool
    {
        // Already a boolean → return directly.
        if (is_bool($v)) return $v;

        // Integer → treat 0 as false, any non-zero as true.
        if (is_int($v))  return $v !== 0;

        // String → check for common truthy keywords, case-insensitive.
        if (is_string($v)) {
            return in_array(strtolower(trim($v)), ['1', 'true', 'yes', 'y', 'on'], true);
        }

        // All other types (null, float, array, object, etc.) → false by default.
        return false;
    }

    /**
     * Recursively convert an object (or nested objects) into an associative array.
     *
     * This helper is used to normalize mixed data structures where PHP objects may be
     * returned from `json_decode()`, API responses, or other dynamic sources that can
     * contain nested objects.  
     *  
     * It ensures that the final output is always composed entirely of arrays, 
     * recursively traversing all levels of the structure.
     *
     * ---
     * **Behavior Summary:**
     * 1. If the input `$v` is an **object**, it converts it into an associative array
     *    using `get_object_vars()`.
     * 2. If the input `$v` is an **array**, it recursively applies itself to each element
     *    (allowing deep object-to-array conversion).
     * 3. All other data types (`string`, `int`, `float`, `bool`, `null`, etc.)
     *    are returned **unchanged**.
     *
     * ---
     * **Examples:**
     * ```php
     * $obj = (object)[
     *   'name' => 'Allsky',
     *   'meta' => (object)[
     *       'version' => '1.0',
     *       'enabled' => true
     *   ]
     * ];
     *
     * $arr = $this->to_array($obj);
     *
     * // Result:
     * // [
     * //   'name' => 'Allsky',
     * //   'meta' => [
     * //       'version' => '1.0',
     * //       'enabled' => true
     * //   ]
     * // ]
     * ```
     *
     * ---
     * **Use Cases:**
     * - Ensuring uniform array-based data for JSON encoding.
     * - Converting decoded JSON objects to arrays (`json_decode($json, false)` case).
     * - Simplifying handling of complex or mixed-type data structures.
     *
     * @param mixed $v  Any variable (object, array, or scalar)
     * @return mixed    Returns a recursively converted array if applicable,
     *                  otherwise returns the input value unchanged.
     */
    private function to_array($v)
    {
        // If value is an object → convert to associative array.
        if (is_object($v)) {
            $v = get_object_vars($v);
        }

        // If value is an array → recursively convert its elements.
        if (is_array($v)) {
            foreach ($v as $k => $vv) {
                $v[$k] = $this->to_array($vv);
            }
        }

        // Return the converted structure (or unchanged scalar).
        return $v;
    }

    /**
     * Build and return a grouped list of all available database variables
     * from every installed Allsky module (core, user, and custom).
     *
     * This method scans all module definitions, extracts their metadata,
     * and returns a JSON structure describing which variables are available
     * for charting or analytics, grouped by their logical module group name.
     *
     * ---
     * **Behavior Summary:**
     * 1. Loads module metadata from three locations:
     *    - `$this->allskyModules` → core system modules.
     *    - `$this->userModules`   → user-installed modules.
     *    - `$this->myFiles`       → locally stored custom modules.
     *
     * 2. Merges all modules into a unified list.
     *
     * 3. For each module:
     *    - Reads `metadata.extradata.database` to determine:
     *        - Database table name (`table`)
     *        - Whether all variables should be included (`include_all`)
     *    - Reads `metadata.extradata.values` to find defined variables.
     *    - Includes variables if:
     *        - `include_all` is true, **or**
     *        - The variable’s own `database.include` flag is true.
     *
     * 4. Produces an associative array structured as:
     *
     * ```json
     * {
     *   "Environment": {
     *     "AS_TEMP": {
     *       "description": "Temperature from Allsky",
     *       "table": "allsky_temp"
     *     },
     *     "AS_HUMIDITY": {
     *       "description": "Humidity from Allsky",
     *       "table": "allsky_temp"
     *     }
     *   },
     *   "Meteor Detection": {
     *     "AS_METEORCOUNT": {
     *       "description": "Number of meteors detected",
     *       "table": "allsky_meteors"
     *     }
     *   }
     * }
     * ```
     *
     * 5. Sends this structure as a JSON response to the client.
     *
     * ---
     * **Use Cases:**
     * - Chart Designer variable selection dropdowns.
     * - API responses for available telemetry variables.
     * - Dynamic UI builders referencing live module metadata.
     *
     * ---
     * **Dependencies:**
     * - `readModuleData()` — Reads and parses module metadata JSON files.
     * - `to_array()` — Converts nested objects to arrays.
     * - `to_bool()` — Safely converts truthy strings/ints to booleans.
     * - `sendResponse()` — Outputs JSON to the client.
     *
     * ---
     * **Example Output:**
     * ```json
     * {
     *   "ADSB": { "AS_COUNT": { "table": "allsky_adsb", "description": "Total Aircraft" } },
     *   "Environment": {
     *     "AS_TEMP": { "description": "Temperature", "table": "allsky_temp" },
     *     "AS_DEW":  { "description": "Dewpoint",    "table": "allsky_temp" }
     *   }
     * }
     * ```
     *
     * @return void  Sends a JSON-encoded associative array of available variables grouped by module.
     */
    public function getAvailableVariables() 
    {
        // --- Step 1: Load modules from all known sources ---
        $coreModules = $this->readModuleData($this->allskyModules, "system", null);
        $userModules = $this->readModuleData($this->userModules, "user", null);
        $myModules   = $this->readModuleData($this->myFiles, "user", null);

        // Merge into one flat array of modules
        $allModules = array_merge($coreModules, $userModules, $myModules);

        $result = [];

        // --- Step 2: Iterate over all modules ---
        foreach ($allModules as $moduleFile => $mod) {
            // Safely normalize nested metadata structures
            $meta   = $this->to_array($mod['metadata'] ?? []);
            $extra  = $this->to_array($meta['extradata'] ?? []);
            $dbConf = $this->to_array($extra['database'] ?? []);
            $values = $this->to_array($extra['values'] ?? []);

            // Skip if the module lacks metadata or value definitions
            if (empty($meta) || empty($dbConf) || empty($values)) {
                continue;
            }

            // Extract key configuration details
            $groupName  = $meta['module'] ?? null;                      // Internal module key
            $includeAll = $this->to_bool($dbConf['include_all'] ?? false); // Global include flag
            $tableName  = $dbConf['table'] ?? null;                     // Database table name

            if (!$groupName || !$tableName) continue;

            // --- Step 3: Process all defined variables for this module ---
            foreach ($values as $varKey => $vmetaRaw) {
                $vmeta = $this->to_array($vmetaRaw);

                // Determine inclusion rule
                $include = $includeAll || $this->to_bool($vmeta['database']['include'] ?? false);
                if (!$include) continue;

                // Extract description and display group
                $desc          = $vmeta['description'] ?? '';
                $groupDisplay  = $meta['group'] ?? 'Unknown';

                // --- Step 4: Add entry to grouped result ---
                $result[$groupDisplay][$varKey] = [
                    'description' => $desc,
                    'table'       => $tableName
                ];
            }
        }

        // --- Step 5: Return the aggregated result as JSON ---
        $this->sendResponse(json_encode($result));
    }
    /* End Chart Builder Code */

    /**
     * End Chart Code
     */

    public function postHassSensors() {
        $hassUrl = $_POST['hassurl'];
        $token = $_POST['hassltt'];
        $result = [[
            'id'=> '',
            'name' => "Error retreiving sensors"
        ]];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "$hassUrl/api/states");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer $token",
            "Content-Type: application/json"
        ]);

        $response = curl_exec($ch);

        if (!curl_errno($ch)) {
            curl_close($ch);

            $data = json_decode($response, true);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if ($httpCode == 200) {
                $sensors = array_values(array_filter($data, function ($entity) {
                    return strpos($entity['entity_id'], 'sensor.') === 0;
                }));

                $result = array_map(function ($sensor) {
                    return [
                        'id' => $sensor['entity_id'],
                        'state' => $sensor['state'],
                        'unit' => $sensor['attributes']['unit_of_measurement'] ?? null,
                        'name' => $sensor['attributes']['friendly_name'] ?? $sensor['entity_id']
                    ];
                }, $sensors);
            } else {
                if ($httpCode == 401) {
                    $result[0]['name'] = 'Unauthorised. Please check the HA token';
                }
            }
        }

        $this->sendResponse(json_encode($result));
    }

    public function getTemplateList() {
        $result = array();        
        $basePath = $this->myFilesData . DIRECTORY_SEPARATOR . 'blocks';
        $corePath = $this->allsky_config . '/overlay/config/blocks';

        $paths = [$corePath, $basePath];

        foreach($paths as $path) {
			// Make sure $path exists, ignore if not.
			if (! is_dir($path)) {
				continue;
			}
            $outer = new DirectoryIterator($path);

            foreach ($outer as $folder) {
                if ($folder->isDot() || !$folder->isDir()) {
                    continue;
                }

                $innerPath = $folder->getPathname();
                $inner = new DirectoryIterator($innerPath);

                foreach ($inner as $file) {
                    if ($file->isDot() || !$file->isFile()) {
                        continue;
                    }

                    if ($file->getExtension() === 'json') {
                        $json = file_get_contents($file->getPathname());
                        $parsed = json_decode($json, true);

                        if (json_last_error() === JSON_ERROR_NONE) {
                            foreach ($parsed as $blockKey => $data) {
                                $result[] = [
                                    'name'        => $data['name'] ?? 'Unknown',
                                    'group'       => $folder->getFilename(),
                                    'blockname'   => $blockKey,
                                    'filename'    => $file->getFilename(),
                                    'description' => $data['description'] ?? '',
                                ];
                            }
                        } else {
                            // TODO: Log error
                        }
                    }
                }
            }
        }
        
        $this->sendResponse(json_encode($result));        
    }

    
    private function getAllskySetting($setting) {
        if ($this->allskySettings == null) {
            $file = $this->allsky_config . '/settings.json';
            $rawConfigData = file_get_contents($file);
            $this->allskySettings = json_decode($rawConfigData, true);
        }
        $result = $setting;
        if (isset($this->allskySettings[$setting])) {
            $result = $this->allskySettings[$setting];
        }

        return $result;
    }

    private function findVariableInExtraDataFiles($files, $variable) {
        foreach ($files as $file) {
            $json = file_get_contents($file);
            $data = json_decode($json, true);

            if (!is_array($data)) {
                continue; 
            }

            if (array_key_exists($variable, $data)) {
                return $data[$variable];
            }
        }

        return null;         
    }

    private function findVariableInExtraData($variable) {
        $result = null;

        $files = glob(rtrim($this->extra_data, '/') . '/*.json');
        $result = $this->findVariableInExtraDataFiles($files, $variable);

        if ($result === null) {
            $files = glob(rtrim($this->extra_legacy_data, '/') .  '/*.json');
            $result = $this->findVariableInExtraDataFiles($files, $variable);
        }

        return $result;
    }

    public function getTemplate() {
        $fileName = $_GET['filename'];
        $block = $_GET['block'];
        $group = $_GET['group'];
        
        $blockFilename = $this->allsky_config . '/overlay/config/blocks/' . $group . "/" . $fileName;
        $rawBlockData = @file_get_contents($blockFilename);
        if ($rawBlockData === false) {
            $blockFilename = $this->myFilesData . DIRECTORY_SEPARATOR . 'blocks' . DIRECTORY_SEPARATOR . $group . DIRECTORY_SEPARATOR . $fileName;
            $rawBlockData = file_get_contents($blockFilename);
        }

        $result = json_decode($rawBlockData, true);
        $result = $result[$block];

        $moduleData = $this->findModule($group . '.py');
        foreach ($result['fields'] as &$row) {
            foreach ($row as &$rowData) {
                if (isset($rowData["text"])) {
                    $format = "";
                    $font = "";                    
                    if (preg_match('/\$\{([^}]+)\}/', $rowData["text"], $matches)) {
                        $variable = $matches[1];
                        if (isset($moduleData->extradata)) {
                            if (isset($moduleData->extradata->values)) {
                                $found = false;
                                foreach ($moduleData->extradata->values as $key=>$value) {
                                    $clean = preg_replace('/\d+$/', '', $variable);
                                    if ($key == $clean || $key == $clean . "\${COUNT}" ) {
                                        if (isset($value->format)) {
                                            $format = $value->format;
                                        }
                                        if (isset($value->font)) {
                                            $font = $value->font;
                                        }
                                        $found = true;
                                        break;                                     
                                    }
                                }
                                if (!$found) {
                                    $extra_data = $this->findVariableInExtraData($variable);
                                    if ($extra_data !== null) {
                                        if (isset($extra_data["format"])) {
                                            $format = $extra_data["format"];
                                        }
                                        if (isset($extra_data["font"])) {
                                            $font = $extra_data["font"];
                                        }
                                    }
                                }
                            }
                        }
                    }
                    //$format = $this->getAllskySetting($format);
                    $rowData['format'] = $format;
                    $rowData['font'] = $font;                    
                } else {                   
                    foreach ($rowData as &$colData) {
                        if (isset($colData["text"])) {
                            $format = "";
                            $font = "";                                              
                            if (preg_match('/\$\{([^}]+)\}/', $colData["text"], $matches)) {
                                $variable = $matches[1];
                                if (isset($moduleData->extradata)) {
                                    if (isset($moduleData->extradata->values)) {
                                        foreach ($moduleData->extradata->values as $key=>$value) {
                                            if ($key == $variable || $key == $variable . "\${COUNT}") {
                                                if (isset($value->format)) {
                                                    $format = $value->format;
                                                }
                                                if (isset($value->font)) {
                                                    $font = $value->font;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            //$format = $this->getAllskySetting($format);                            
                            $colData['format'] = $format;
                            $colData['font'] = $font;
                        }                        
                    }
                }
            }
        }

        //var_dump($result["fields"]); die();
        $this->sendResponse(json_encode($result));          

    }  
    
    public function getWatchdogStatus() {
        $results = [];

        foreach ($this->services as $service) {
            $active = trim(shell_exec("systemctl is-active $service 2>/dev/null"));
            $failed = trim(shell_exec("systemctl is-failed $service 2>/dev/null"));

            // Extract PID from `systemctl show`
            $pid = trim(shell_exec("systemctl show -p MainPID --value $service 2>/dev/null"));
            if ($pid === '' || $pid === '0') {
                $pid = null;
            } else {
                $pid = (int)$pid;
            }

            $results[] = [
                'service' => $service,
                'active'  => $active ?: 'unknown',
                'failed'  => $failed ?: 'unknown',
                'pid'     => $pid,
            ];
        }
        $this->sendResponse(json_encode($results));  
    }

    public function getWatchdogManageService() {

        $action        = isset($_REQUEST['action']) ? strtolower((string)$_REQUEST['action']) : 'status';
        $serviceInput  = isset($_REQUEST['service']) ? trim((string)$_REQUEST['service']) : '';
        $timeoutSec    = isset($_REQUEST['timeout']) ? max(1, (int)$_REQUEST['timeout']) : 12;
        $journalLines  = isset($_REQUEST['journal_lines']) ? max(1, (int)$_REQUEST['journal_lines']) : 100;
        $stabilitySec  = isset($_REQUEST['stability']) ? max(1, (int)$_REQUEST['stability']) : 4;

        $res = ['ok' => false, 'action' => $action, 'service' => $serviceInput];

        try {
            if (!is_array($this->services)) {
                throw new RuntimeException('$this->services must be an array of allowed systemd units (without ".service").');
            }
            if ($serviceInput === '' || !preg_match('/^[a-zA-Z0-9@._-]+$/', $serviceInput)) {
                throw new RuntimeException('Invalid service name.');
            }

            $normalized = (substr($serviceInput, -8) === '.service') ? substr($serviceInput, 0, -8) : $serviceInput;

            $allowed = array_fill_keys($this->services, true);
            if (!isset($allowed[$normalized])) {
                throw new RuntimeException('Service not allowed.');
            }

            $unit = $normalized . '.service';
            $SYSTEMCTL = 'sudo /bin/systemctl'; 


            $exec_cmd = function (string $cmd): array {
                $out = []; $code = 0;
                exec($cmd . ' 2>&1', $out, $code);
                return [$code, implode("\n", $out)];
            };

            $is_active = function (string $unit) use ($SYSTEMCTL, $exec_cmd): string {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' is-active ' . escapeshellarg($unit));
                $s = trim($out);
                return ($s !== '') ? $s : (($code === 0) ? 'active' : 'unknown');
            };

            $is_failed = function (string $unit) use ($SYSTEMCTL, $exec_cmd): string {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' is-failed ' . escapeshellarg($unit));
                $s = trim($out);
                return ($s !== '') ? $s : (($code === 0) ? 'inactive' : 'unknown');
            };

            $get_pid = function (string $unit) use ($SYSTEMCTL, $exec_cmd): ?int {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' show -p MainPID --value ' . escapeshellarg($unit));
                $pid = (int)trim($out);
                return ($code === 0 && $pid > 0) ? $pid : null;
            };

            $get_props = function (string $unit) use ($exec_cmd): array {
                $props = [
                    'ActiveState','SubState','Result',
                    'ExecMainPID','ExecMainCode','ExecMainStatus',
                    'MainPID','Restart','RestartSec','RestartUSec',
                    'FragmentPath','ExecStart','ExecStartPre','ExecStartPost'
                ];
                [$code, $out] = $exec_cmd('sudo /bin/systemctl show ' . escapeshellarg($unit)
                    . ' --no-pager --property=' . implode(',', $props));
                $ret = ['exit' => $code];
                foreach (explode("\n", trim($out)) as $line) {
                    if ($line === '' || strpos($line, '=') === false) continue;
                    [$k, $v] = explode('=', $line, 2);
                    $ret[$k] = $v;
                }
                return $ret;
            };

            $collect_diag = function (string $unit, int $journalLines) use ($exec_cmd, $get_props): array {
                [$sc_code, $sc_out] = $exec_cmd('sudo /bin/systemctl status --no-pager --full ' . escapeshellarg($unit));
                [$jl_code, $jl_out] = $exec_cmd('sudo journalctl -q -u ' . escapeshellarg($unit)
                    . ' -b -n ' . (int)$journalLines . ' --no-pager --no-hostname --output=short-monotonic');
                $trim = function (string $s, int $max = 20000): string {
                    return (strlen($s) > $max) ? (substr($s, 0, $max) . "\n…(truncated)…") : $s;
                };
                return [
                    'properties'             => $get_props($unit),
                    'systemctl_status_exit'  => $sc_code,
                    'systemctl_status'       => $trim($sc_out),
                    'journal_exit'           => $jl_code,
                    'journal'                => $trim($jl_out),
                ];
            };

            $get_state = function (string $unit) use ($get_props, $get_pid): array {
                $props = $get_props($unit);
                return [
                    'ActiveState'   => $props['ActiveState']   ?? 'unknown',
                    'SubState'      => $props['SubState']      ?? 'unknown',
                    'Result'        => $props['Result']        ?? '',
                    'ExecMainCode'  => $props['ExecMainCode']  ?? '',
                    'ExecMainStatus'=> $props['ExecMainStatus']?? '',
                    'MainPID'       => $props['MainPID']       ?? '',
                    'pid'           => $get_pid($unit),
                ];
            };

            $wait_for = function (string $unit, array $targets, float $timeoutSec, int $stepMs = 250) use ($is_active): string {
                $deadline = microtime(true) + $timeoutSec;
                do {
                    $state = $is_active($unit);
                    if (in_array($state, $targets, true)) return $state;
                    usleep($stepMs * 1000);
                } while (microtime(true) < $deadline);
                return $is_active($unit);
            };

            $ensure_stable_active = function (string $unit, int $stabilitySec) use ($is_active, $get_state): bool {
                $deadline = microtime(true) + $stabilitySec;
                do {
                    $act = $is_active($unit);
                    if ($act !== 'active') {
                        return false; 
                    }
                    $st = $get_state($unit);
                    if (isset($st['SubState']) && stripos((string)$st['SubState'], 'auto-restart') !== false) {
                        return false;
                    }
                    usleep(250 * 1000);
                } while (microtime(true) < $deadline);
                return true;
            };

            $final = null;
            $failedAction = null;
            $execOutput = null;

            if ($action === 'start') {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' start ' . escapeshellarg($unit));
                if ($code !== 0) {
                    $failedAction = 'start';
                    $execOutput = $out;
                } else {
                    $final = $wait_for($unit, ['active'], (float)$timeoutSec);
                    if ($final === 'active') {
                        if (!$ensure_stable_active($unit, $stabilitySec)) {
                            $failedAction = 'start';
                        }
                    } else {
                        $failedAction = 'start';
                    }
                }
            } elseif ($action === 'stop') {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' stop ' . escapeshellarg($unit));
                if ($code !== 0) {
                    $failedAction = 'stop';
                    $execOutput = $out;
                } else {
                    $final = $wait_for($unit, ['inactive', 'failed'], (float)$timeoutSec);
                    if ($final !== 'inactive' && $final !== 'failed') {
                        $failedAction = 'stop';
                    }
                }
            } elseif ($action === 'restart') {
                [$code, $out] = $exec_cmd($SYSTEMCTL . ' restart ' . escapeshellarg($unit));
                if ($code !== 0) {
                    $failedAction = 'restart';
                    $execOutput = $out;
                } else {
                    $final = $wait_for($unit, ['active'], (float)$timeoutSec);
                    if ($final === 'active') {
                        if (!$ensure_stable_active($unit, $stabilitySec)) {
                            $failedAction = 'restart';
                        }
                    } else {
                        $failedAction = 'restart';
                    }
                }
            } elseif ($action === 'status') {
                $final = $is_active($unit);
            } else {
                throw new RuntimeException('Unknown action.');
            }

            if ($failedAction !== null) {
                $res['ok']     = false;
                $res['error']  = "Action '$failedAction' failed or timed out";
                if ($execOutput) $res['exec_output'] = $execOutput;
                $res['active'] = $is_active($unit);
                $res['failed'] = $is_failed($unit);
                $res['pid']    = $get_pid($unit);
                $res['diagnostics'] = $collect_diag($unit, $journalLines);
                echo json_encode($res, JSON_PRETTY_PRINT);
                exit;
            }

            $res['ok']     = true;
            $res['active'] = $final ?? $is_active($unit);
            $res['failed'] = $is_failed($unit);
            $res['pid']    = $get_pid($unit);
            echo json_encode($res, JSON_PRETTY_PRINT);
            exit;

        } catch (Throwable $e) {
            http_response_code(400);
            $res['error'] = $e->getMessage();
            echo json_encode($res, JSON_PRETTY_PRINT);
            exit;
        }

    }    
}

$moduleUtil = new MODULEUTIL();
$moduleUtil->run();