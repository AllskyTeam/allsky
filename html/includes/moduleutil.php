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
            'AllskyKameraStatus' => ['get'],
            'CheckModuleDependencies' => ['post'],
            'GetExtraDataFile' => ['post'],
            'HassSensors' => ['post'],
            'ModuleBaseData' => ['get'],
            'ModuleTool' => ['post'],
            'ModuleToolOutput' => ['get'],
            'ModuleToolStart' => ['post'],
            'Modules' => ['delete', 'get', 'post'],
            'ModulesSettings' => ['get', 'post'],
            'Onewire' => ['get'],
            'Reset' => ['get'],
            'Restore' => ['get'],
            'SerialPorts' => ['get'],
            'SuggestedModules' => ['get'],
            'SunData' => ['get'],
            'Template' => ['get'],
            'TemplateList' => ['get'],
            'TestModule' => ['post'],
            'UrlCheck' => ['get'],
            'ValidateMask' => ['post'],
            'VariableList' => ['get'],
            'WatchdogManageService' => ['get'],
            'WatchdogStatus' => ['get'],
            'ProxyLocalApi' => ['get'],
            'ModuleFile' => ['get']            
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

	private function stringContains(string $value, string $needle): bool {
		return $needle === '' || strpos($value, $needle) !== false;
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
        
                if (rtrim($source_line) !== '' && $this->endsWith(rtrim($source_line), '{')) {
                    $level++;
                }
            
                if (ltrim($source_line) !== '' && $this->startsWith(ltrim($source_line), '}')) {
                    $level--;
                }
            
                if (ltrim($source_line) !== '' && $this->startsWith(ltrim($source_line), $metaName)) {
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
                        if ($decoded !== null) {
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
                        } else {
                            $decoded = new stdClass();
                            $decoded->name = "Module " . $entry . " is currupted";
                            $decoded->description = "The metadata in the module file is invalid. Please contact Allsky support.";
                            $decoded->events = ["day", "night", "periodic", "daynight", "nightday"];
                            $arrFiles[$entry] = [
                                'module' => $entry,
                                'metadata' => $decoded,
                                'type' => $type
                            ];                         
                        }
                    }
                }
            }
        }

        closedir($handle);

        return $arrFiles;
    }

    private function isSafeExtraDataFilename(string $fileName): bool
    {
        return basename($fileName) === $fileName
            && preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/', $fileName) === 1;
    }

    private function getKnownExtraDataFilenames(): array
    {
        $fileNames = [];

        foreach ([$this->allskyModules, $this->userModules, $this->myFiles] as $moduleDirectory) {
            foreach ($this->readModuleData($moduleDirectory, 'metadata', null) as $moduleData) {
                if (!is_array($moduleData) || !isset($moduleData['metadata'])) {
                    continue;
                }

                if (!isset($moduleData['metadata']->extradatafilename)) {
                    continue;
                }

                $fileName = (string)$moduleData['metadata']->extradatafilename;
                if ($this->isSafeExtraDataFilename($fileName)) {
                    $fileNames[$fileName] = true;
                }
            }
        }

        return array_keys($fileNames);
    }

    private function getAuthorisedExtraDataPath(string $fileName): ?string
    {
        $fileName = trim($fileName);
        if (!$this->isSafeExtraDataFilename($fileName)) {
            return null;
        }

        if (!in_array($fileName, $this->getKnownExtraDataFilenames(), true)) {
            return null;
        }

        return rtrim($this->extra_data, '/') . '/' . $fileName;
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

        $result = array();
        $result['lat'] = $lat;
        $result['lon'] = $lon;
        $result['filename'] = ALLSKY_IMG_DIR . '/' . $settings_array['filename'];
        $result['fieldhelpdelay'] = getVariableOrDefault($settings_array, 'fieldhelpdelay', 500);

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

        $configFileName = ALLSKY_CONFIG . '/devicemanager.json';
        if (file_exists($configFileName)) {
            $rawDeviceManagerData = @file_get_contents($configFileName);
            $deviceManagerData = json_decode($rawDeviceManagerData);
            $result['devicemanager'] = $deviceManagerData;
        } else {
            $result['devicemanager'] = null;
        }

        $result['haveDatabase'] = haveDatabase();
                
        $formattedJSON = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($formattedJSON);
    }

    public function getAllskyKameraStatus() {
        $owner = getenv('ALLSKY_OWNER');
        if ($owner === false || $owner === '') {
            $owner = get_current_user();
        }

        $homeDir = '';
        if (function_exists('posix_getpwnam')) {
            $userInfo = @posix_getpwnam($owner);
            if ($userInfo !== false && isset($userInfo['dir'])) {
                $homeDir = $userInfo['dir'];
            }
        }

        if ($homeDir === '') {
            $homeDir = rtrim((string)getenv('HOME'), '/');
        }

        if ($homeDir === '') {
            $homeDir = '/home/' . $owner;
        }

        $secretFile = $homeDir . '/AllSkyKamera/askutils/ASKsecret.py';
        $installed = file_exists($secretFile);

        $result = [
            'installed' => $installed,
            'configured' => $installed,
            'path' => $secretFile
        ];

        $this->sendResponse(json_encode($result, JSON_PRETTY_PRINT));
    }

    public function getSunData() {
        global $settings_array;

        $angle = (string)$settings_array['angle'];
        $lat = (string)$settings_array['latitude'];
        $lon = (string)$settings_array['longitude'];
        $result = [
            'angle' => $angle,
            'lat' => $lat,
            'lon' => $lon,
            'sunrise' => '',
            'sunset' => '',
            'tod' => ''
        ];

        $listOutput = [];
        $pollOutput = [];
        $retval = 0;
        $angleArg = escapeshellarg($angle);
        $latArg = escapeshellarg($lat);
        $lonArg = escapeshellarg($lon);

        exec("sunwait list angle $angleArg $latArg $lonArg", $listOutput);
        if (isset($listOutput[0])) {
            $parts = array_map('trim', explode(',', $listOutput[0], 2));
            if (isset($parts[0])) {
                $result['sunrise'] = $parts[0];
            }
            if (isset($parts[1])) {
                $result['sunset'] = $parts[1];
            }
        }

        exec("sunwait poll exit set angle $angleArg $latArg $lonArg", $pollOutput, $retval);
        if ($retval == 2) {
            $result['tod'] = 'day';
        } else if ($retval == 3) {
            $result['tod'] = 'night';
        }

        $this->sendResponse(json_encode($result, JSON_PRETTY_PRINT));
    }

    public function getModules() {
        $result = $this->readModules();
        $result = json_encode($result);
        $this->sendResponse($result);
    }

    public function getSuggestedModules(): void
    {
        $fileName = rtrim($this->allsky_config, '/') . '/suggested_modules.json';
        if (!is_file($fileName) || !is_readable($fileName)) {
            $this->send404('The suggested module list could not be loaded.');
        }

        $contents = file_get_contents($fileName);
        if ($contents === false || trim($contents) === '') {
            $this->send500('The suggested module list is empty or unreadable.');
        }

        json_decode($contents);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send500('The suggested module list does not contain valid JSON.');
        }

        $this->sendResponse($contents);
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
            if (!isset($allModules[$moduleName])) {
                continue;
            }
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

    public function getModuleFile() {
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

        $this->sendHTMLResponse($fileContents);
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
}

$overlayUtil = new MODULEUTIL();
$overlayUtil->run();

