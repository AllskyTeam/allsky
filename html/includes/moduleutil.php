<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();		// sets some variables
include_once('authenticate.php');
include_once('utilbase.php');

class MODULEUTIL extends UTILBASE {
    protected function getRoutes(): array
    {
        return [
            'AllskyVariables' => ['get'],
            'CheckModuleDependencies' => ['post'],
            'GetExtraDataFile' => ['post'],
            'HassSensors' => ['post'],
            'ModuleBaseData' => ['get'],
            'Modules' => ['delete', 'get', 'post'],
            'ModulesSettings' => ['get', 'post'],
            'Onewire' => ['get'],
            'Reset' => ['get'],
            'Restore' => ['get'],
            'SerialPorts' => ['get'],
            'Template' => ['get'],
            'TemplateList' => ['get'],
            'TestModule' => ['post'],
            'UrlCheck' => ['get'],
            'ValidateMask' => ['post'],
            'VariableList' => ['get'],
            'WatchdogManageService' => ['get'],
            'WatchdogStatus' => ['get'],
        ];
    }

    protected $allskyModules;
    protected $userModules;
	protected $myFiles;
    protected $myFilesData;
    protected $allsky_config = null;
    protected $extra_data = null;
    protected $extra_legacy_data = null;
    protected $allskySettings = null;
    protected $allsky_home = null;
    protected $allsky_scripts = null;
    protected $allskyMyFiles = null;
    protected $myFilesBase = null;
    protected $services = ['allsky', 'allskyperiodic', 'allskyserver'];

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

    public function readModuleData($moduleDirectory, $type, $event) {
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
        $result = json_encode($result);
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
									$secretKey = strtoupper($data->metadata->module) . '_' . strtoupper($argument);
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
                        $secretKey = strtoupper($moduleConfig->metadata->module) . '_' . strtoupper($argument);
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

	private function addSecretsToFlow($configData) {
		$configDataJson = json_decode($configData);
		$envData = null;
		foreach ($configDataJson as $module=>&$moduleConfig) {
			foreach ($moduleConfig->metadata->argumentdetails as $argument=>$argumentSettings) {
				if (isset($argumentSettings->secret)) {
					if ($envData === null) {
						$envData = json_decode(file_get_contents(ALLSKY_ENV));
					}
					$secretKey = strtoupper($moduleConfig->metadata->module) . '_' . strtoupper($argument);
					if (isset($envData->$secretKey)) {
						$moduleConfig->metadata->arguments->$argument = $envData->$secretKey;
					} 
				}
			}
		}
		$configData = json_encode($configDataJson, JSON_PRETTY_PRINT);
		return $configData;
	}

    public function postTestModule(): void
    {
        // Read and sanitize inputs
        $module   = trim((string)filter_input(INPUT_POST, 'module', FILTER_UNSAFE_RAW));
        $dayNight = trim((string)filter_input(INPUT_POST, 'dayNight', FILTER_UNSAFE_RAW));
        $flow     = (string)($_POST['flow'] ?? '');

        // Inject any required secrets into the flow
        $flow = $this->addSecretsToFlow($flow);

        // Save the flow definition to a temp JSON file
        $fileName = ALLSKY_MODULES . '/test_flow.json';
        if (file_put_contents($fileName, $flow) === false) {
            $this->send500('Failed to write test_flow.json');
        }

        // Build the command arguments safely for runProcess()
        $argv = [
            '/usr/bin/sudo',
            $this->allsky_scripts . '/test_flow.sh',
            '--allsky_home',    $this->allsky_home,
            '--allsky_scripts', $this->allsky_scripts,
            '--day_night',      $dayNight,
        ];

        // Execute via runProcess() to capture stdout/stderr safely
        $result = $this->runProcess($argv);

        // Try to load extradata if the flow references a file
        $jsonFlow  = json_decode($flow, true);
        $extraData = '';
        $moduleKey = is_array($jsonFlow) ? array_key_first($jsonFlow) : null;

        if ($moduleKey && isset($jsonFlow[$moduleKey]['metadata']['extradatafilename'])) {
            $filePath = $this->extra_data . '/' . $jsonFlow[$moduleKey]['metadata']['extradatafilename'];
            if (is_file($filePath) && is_readable($filePath)) {
                $extraData = file_get_contents($filePath) ?: '';
            }
        }

        // Handle process result
        if ($result['error']) {
            $this->send500('Module test failed: ' . trim($result['message']));
        }

        // Bundle both script output and any extra data into the response
        $payload = [
            'message'   => trim($result['message']),
            'extradata' => json_decode($extraData ?: '{}'),
        ];

        @unlink($fileName);
        $debugFileName = ALLSKY_MODULES . '/test_flow-debug.json';
        @unlink($debugFileName);

        $this->sendResponse(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
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

// Only run if this file is the entry point (not when included)
$entry = PHP_SAPI === 'cli'
    ? realpath($_SERVER['argv'][0] ?? '')
    : realpath($_SERVER['SCRIPT_FILENAME'] ?? '');

if ($entry === __FILE__) {
    $moduleUtil = new MODULEUTIL();
    $moduleUtil->run();
}
