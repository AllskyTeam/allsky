import sys
import os
import json
import argparse
import importlib

class CONFIGMANAGER:
    _args = None
    _priorPath = None
    _configPath = None
    _configFiles = None
    
    def __init__(self, args):
        self._args = args
        self._validateArgs()
    
        '''
        Get the locations of the modules and scripts and add them to the path.
        '''
        try:
            allSkyModules = os.environ["ALLSKY_MODULE_LOCATION"]
        except KeyError:
            print("ERROR: $ALLSKY_MODULE_LOCATION not found - Aborting")
            sys.exit(1)
        allSkyModulesLocation = os.path.join(allSkyModules, "modules")

        try:
            allSkyScripts = os.environ["ALLSKY_SCRIPTS"]
        except KeyError:
            print("ERROR: $ALLSKY_SCRIPTS not found - Aborting")
            sys.exit(1)
        allSkyModulesPath = os.path.join(allSkyScripts, "modules")

        valid_module_paths = [allSkyModulesLocation, allSkyModulesPath]

        for vmp in valid_module_paths:
            sys.path.append(os.path.abspath(vmp))

    def _loadModule(self, module):
        moduleName = module.replace('.py','')
        method = moduleName.replace('.py','').replace('allsky_','')
        
        _temp = importlib.import_module(moduleName)
        return _temp
          
    def _validateArgs(self):
        if "prior" not in self._args:
            print(f"Missing prior installation folder")
            sys.exit(1)

        self._priorPath = self._args.prior
        if (self._priorPath is not None) and not os.path.isdir(self._priorPath):
            print(f"Given old installation directory {self._priorPath} does not exist")
            sys.exit(1)

        if "config" not in self._args:
            print(f"Missing config folder")
            sys.exit(1)        
        
        self._configPath = self._args.config
        if (self._configPath is not None) and not os.path.isdir(self._configPath):
            print(f"Given config directory {self._configPath} does not exist")
            sys.exit(1)    

    def _getFiles(self, directory):
        self._configFiles = os.listdir(directory)
    
    def _loadJsonFile(self, path):
        data = None
        
        try:
            with open(path) as f:
                data = json.load(f)
        except:
            data = None
        
        return data

    def _saveJsonFile(self,fileName, data):
        with open(fileName, 'w') as f:
            json.dump(data, f, indent=4)
        
    def _copyModules(self, oldJson, currentJson):
        flow = {}
        
        for module in oldJson:
            flow[module] = oldJson[module].copy()

        for module in currentJson:
            if "force" in currentJson[module]:
                flow[module] = currentJson[module].copy()
                
        return flow
    
    def _updateParams(self, oldJson, currentJson):
        for module in currentJson:
            try:
                modObject = self._loadModule(currentJson[module]["module"])
                currentJson[module]["metadata"] = getattr(modObject,"metaData")
                
                if "arguments" in oldJson[module]["metadata"]:
                    for argument in oldJson[module]["metadata"]["arguments"]:
                        if argument in currentJson[module]["metadata"]["arguments"]:
                            currentJson[module]["metadata"]["arguments"][argument] = oldJson[module]["metadata"]["arguments"][argument]
            except Exception as e:
                eType, eObject, eTraceback = sys.exc_info()
                print(f"ERROR: _updateParams failed on line {eTraceback.tb_lineno} - {e}")
                
        return currentJson
    
    def _processFile(self, file):
        oldFilePath = os.path.join(self._priorPath, "modules", file)
        currentFilePath = os.path.join(self._configPath, "modules", file)
        
        oldJson = self._loadJsonFile(oldFilePath)
        if oldJson is not None:
            currentJson = self._loadJsonFile(currentFilePath)
                        
            currentJson = self._copyModules(oldJson, currentJson)
            currentJson = self._updateParams(oldJson, currentJson)

            self._saveJsonFile(currentFilePath, currentJson)
    
    def _mergeModuleSettings(self, file):
        oldFilePath = os.path.join(self._priorPath, "modules", file)
        currentFilePath = os.path.join(self._configPath, "modules", file)        
                
        oldSettings = self._loadJsonFile(oldFilePath)
        currentSettings = self._loadJsonFile(currentFilePath)
        
        for setting in currentSettings:
            if setting in oldSettings:
                currentSettings[setting] = oldSettings[setting]
                
        self._saveJsonFile(currentFilePath, currentSettings)
                
    def mergeConfigs(self):
        currentConfigPath = os.path.join(self._configPath, "modules")
        self._configFiles = os.listdir(currentConfigPath)
        for file in self._configFiles:
            if file.startswith("postprocessing_"):
                self._processFile(file)
            elif file == "module-settings.json":
                self._mergeModuleSettings(file)

argParser = argparse.ArgumentParser()
argParser.add_argument("-d", "--debug", help="Debug mode")
parser = argparse.ArgumentParser()
required = parser.add_argument_group('required arguments')
optional = parser.add_argument_group('optional arguments')
required.add_argument("--prior", required=True, help="Prior folder containing configs")
required.add_argument("--config", required=True, help="Allsky config folder")
optional.add_argument("-d", "--debug", help="Debug mode")

args = {}
args = parser.parse_args()

configManager = CONFIGMANAGER(args)
configManager.mergeConfigs()
