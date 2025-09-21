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

    function __construct() {
        $this->allskyModules = ALLSKY_SCRIPTS . '/modules';
        $this->userModules = ALLSKY_MODULE_LOCATION . '/modules';
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
     * Start Graph Code
     */
    private function make_pdo(): PDO {
        // TODO: sudo apt-get install -y php-mysql
        $secretData = getDatabaseConfig();

        if ($secretData['databasetype'] === 'mysql') {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $secretData['databasehost'], (int)($secretData['databaseport'] ?? 3306), $secretData['databasedatabase']);
            return new PDO($dsn, $secretData['databaseuser'], $secretData['databasepassword'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
        if ($secretData['databasetype'] === 'sqlite') {
            $dsn = 'sqlite:' . ALLSKY_DATABASES;
            $pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            // Enable WAL: $pdo->exec('PRAGMA journal_mode = WAL;');
            return $pdo;
        }
        throw new RuntimeException('Unsupported datasource type');
    }

    private function parse_variables($v): array {
        if ($v === null) return [];
        $s = is_string($v) ? $v : strval($v);
        $parts = array_map('trim', explode('|', $s));
        return array_values(array_filter($parts, fn($x) => $x !== ''));
    }

    private function fetch_time_series(PDO $pdo, array $entities, string $table='allsky_camera'): array {
        if (!$entities) return [];   
        $in  = implode(',', array_fill(0, count($entities), '?'));
        $sql = "SELECT `timestamp`,`entity`,`value` FROM `$table` WHERE `entity` IN ($in) ORDER BY `timestamp` ASC";
        $st = $pdo->prepare($sql);
        $st->execute($entities);

        $byEntity = [];
        while ($r = $st->fetch()) {
            $ts = (int)$r['timestamp'];
            $en = (string)$r['entity'];
            $val = $r['value'];
            $byEntity[$en][$ts] = $val;
        }
        if (count($entities) === 1) {
            $out = [];
            foreach ($byEntity[$entities[0]] ?? [] as $ts => $val) {
                if (is_numeric($val)) $out[] = [ $ts * 1000, (float)$val ];
            }
            return $out;
        }

        [$primary, $aux] = $entities;
        $out = [];
        foreach ($byEntity[$primary] ?? [] as $ts => $val) {
            if (!is_numeric($val)) continue;
            $pt = ['x' => $ts * 1000, 'y' => (float)$val];
            if (isset($byEntity[$aux][$ts])) $pt['url'] = $byEntity[$aux][$ts];
            $out[] = $pt;
        }
    
        return $out;
    }

    private function fetch_gauge_value(PDO $pdo, string $entity, string $table='allsky_camera'): array {
        $st = $pdo->prepare("SELECT `value` FROM `$table` WHERE `entity` = ? ORDER BY `timestamp` DESC LIMIT 1");
        $st->execute([$entity]);
        $v = $st->fetchColumn();
        return is_numeric($v) ? [ (float)$v ] : [];
    }

    /* string "true"/"false" -> bool */
    private function to_boolish($v) {
        if ($v === true || $v === false) return $v;
        if (is_string($v)) {
            $s = strtolower(trim($v));
            if ($s === 'true')  return true;
            if ($s === 'false') return false;
        }
        return $v;
    }

    /* deep convert any "true"/"false" strings */
    private function deep_boolify($node) {
        if (is_array($node)) {
            foreach ($node as $k => $v) $node[$k] = $this->deep_boolify($v);
            return $node;
        }
        if (is_object($node)) {
            foreach (get_object_vars($node) as $k => $v) $node->$k = $this->deep_boolify($v);
            return $node;
        }
        return $this->to_boolish($node);
    }

    /* convert series stdClass map -> array */
    function series_object_to_array($series) {
        if (is_array($series)) return $series;
        if (is_object($series)) return array_values(get_object_vars($series));
        return [];
    }












    public function postGraphData() {
        $chartData = null;
        $module = $_POST["module"];
        $chartKey = $_POST["chartkey"];
        if (substr($module, -3) !== '.py') {
            $module .= '.py';
        }

        $metaData = $this->getModuleMetaData($module);

        if ($metaData !== "") {
            $metaData = json_decode($metaData);

            if (isset($metaData->graphs)) {
                if (isset($metaData->extradata)) {
                    if (isset($metaData->extradata->database)) {
                        if (isset($metaData->extradata->database->table)) {
                            $table = $metaData->extradata->database->table;
                            $graphs = $metaData->graphs;
                            foreach($graphs as $key=>$chart) {
                                if ($key === $chartKey) {
                                    $pdo = $this->make_pdo();


                                    // Ensure booleans are real
                                    $chart = $this->deep_boolify($chart);

                                    // Determine chart type
                                    $type = 'line';
                                    if (isset($chart->config->chart->type)) {
                                        $type = strtolower((string)$chart->config->chart->type);
                                    }

                                    // Ensure series exists
                                    if (!isset($chart->series)) {
                                        $chart->series = new stdClass();
                                    }

                                    // If series is an object (exposure, gain, ...), iterate its properties
                                    if (is_object($chart->series)) {
                                        foreach (get_object_vars($chart->series) as $sName => $sObj) {
                                            if (!is_object($sObj)) continue;
                                            $vars = isset($sObj->variable) ? $this->parse_variables($sObj->variable) : [];

                                            if ($type === 'gauge') {
                                                $sObj->data = $vars ? $this->fetch_gauge_value($pdo, $vars[0], $table) : [];
                                            } else {
                                                $sObj->data = $this->fetch_time_series($pdo, $vars, $table);
                                                if ($sObj->data && is_array($sObj->data[0]) && array_key_exists('url', $sObj->data[0])) {
                                                    $sObj->hasUrl = true;
                                                }
                                            }
                                        }
                                    } elseif (is_array($chart->series)) {
                                        // already an array of series (rare in your case)
                                        foreach ($chart->series as &$sObj) {
                                            if (!is_object($sObj)) continue;
                                            $vars = isset($sObj->variable) ? $this->parse_variables($sObj->variable) : [];
                                            if ($type === 'gauge') {
                                                $sObj->data = $vars ? $this->fetch_gauge_value($pdo, $vars[0]) : [];
                                            } else {
                                                $sObj->data = $this->fetch_time_series($pdo, $vars);
                                            }
                                        }
                                        unset($sObj);
                                    }

                                    // series must be an ARRAY
                                    $seriesArr = $this->series_object_to_array($chart->series);

                                    // options = {...config, series: [...]}
                                    $options = [];
                                    if (isset($chart->config) && is_object($chart->config)) {
                                        $options = json_decode(json_encode($chart->config), true); // stdClass -> array
                                    }
                                    $options['series'] = $seriesArr;

                                    // clean edge cases
                                    if (isset($options['tooltip']) && $options['tooltip'] === true) {
                                        // let Highcharts use default tooltip
                                        unset($options['tooltip']);
                                    }
                                    if (!empty($options['yAxis']) && is_array($options['yAxis'])) {
                                        foreach ($options['yAxis'] as &$ax) {
                                            if (isset($ax['opposite'])) $ax['opposite'] = $this->to_boolish($ax['opposite']);
                                        }
                                        unset($ax);
                                    }
                                    if (isset($options['plotOptions']['series']['animation'])) {
                                        $options['plotOptions']['series']['animation'] =
                                            $this->to_boolish($options['plotOptions']['series']['animation']);
                                    }

                                    $this->sendResponse(json_encode($options));
                                    die();    

                                }
                            }
                        }
                    }
                }
            }
        }
        $this->sendResponse(json_encode(""));
    }

    public function getAvailableGraphs() {
        $graphList = [];
        $coreModules = $this->readModuleData($this->allskyModules, "system", null);
        $userModules = $this->readModuleData($this->userModules, "user", null);
        $myModules = $this->readModuleData($this->myFiles, "user", null);        

        $allModules = array_merge($coreModules, $userModules, $myModules);
        foreach ($allModules as $key=>$moduleData) {
            if (isset($moduleData['metadata'])) {
                if (isset($moduleData['metadata']->graphs)) {
                    foreach ($moduleData['metadata']->graphs as $graphKey=>$graphData) {
                        $icon = 'fa-chart-line';
                        if (isset($graphData->icon)) {
                            $icon = $graphData->icon;
                        }
                        $title = ucfirst(str_replace('allsky_', '', $moduleData['metadata']->module));
                        if (isset($graphData->title)) {
                            $title = $graphData->title;
                        }
                        
                        $module = $moduleData['metadata']->module;
                        if (isset($graphData->group)) {
                            $key = $graphData->group;
                        } else {
                            $key = 'Unknown';
                        }
                        if (!isset($graphList[$key])) {
                            $graphList[$key] = [];
                        }
                        $graphList[$key][] = [
                            'module'=>$module,
                            'key'=>$graphKey,
                            'icon'=>$icon,
                            'title'=>$title,
                            'table'=>$moduleData['metadata']->extradata->database->table,
                            'config'=>$graphData->config
                        ];
                    }
                }
            }
        }
        asort($graphList);
        $this->sendResponse(json_encode($graphList));
    }

    /**
     * End Graph Code
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
				echo "<script>console.log(`moduleutil.php: path '$path' does not exist.`);</script>";
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
}

$moduleUtil = new MODULEUTIL();
$moduleUtil->run();
