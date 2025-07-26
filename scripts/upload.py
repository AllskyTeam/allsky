import os
import subprocess
import shlex
import sys
import argparse
import json
import io
import importlib
import importlib.util

class ALLSKYUPLOAD:
	_results = []
	_module = None
	_ERROR = 'Error'
	_WARNING = 'Warning'
	_INFO = 'Info'
	_OK = 'OK'
	_debug = False
  
	def __init__(self, allsky_home, debug=False):
		self._debug = debug
		self._setup_for_command_line(allsky_home)
		self._setup_imports()
		self._load_settings_files()

	def _load_settings_files(self):
		#TODO: Add error handling for files missing
		config_folder = os.environ['ALLSKY_CONFIG']
		allsky_folder = os.environ['ALLSKY_HOME']
		self._options_file = os.path.join(config_folder, 'options.json')
		with open(self._options_file, 'r', encoding='utf-8') as file:
			self._options = json.load(file)  
		
		self._settings_file = os.path.join(config_folder, 'settings.json')
		with open(self._settings_file, 'r', encoding='utf-8') as file:
			self._settings = json.load(file)  

		self._env_file = os.path.join(allsky_folder, 'env.json')
		with open(self._env_file, 'r', encoding='utf-8') as file:
			self._env = json.load(file) 
	
	def _get_settings_value(self, setting):
		result = None
		for option in self._options:
			if option['name'] == setting:
				if 'source' in option:
					source = option['source']
					if source == '${ALLSKY_ENV}':
						if setting in self._env:
							result = self._env[setting]          
						else:
							print(f'ERROR: Setting {setting} could not be located in the env.json file')
							sys.exit(0)          
				else:
					if setting in self._settings:
						result = self._settings[setting]
					else:
						print(f'ERROR: Setting {setting} could not be located in the settings.json file')
						sys.exit(0)
				break

		return result
  
	def _setup_imports(self):
		try:
			allsky_modules = os.environ['ALLSKY_MODULE_LOCATION']
		except KeyError:
			print('ERROR: $ALLSKY_MODULE_LOCATION not found - Aborting.')
			sys.exit(1)
		allsky_modules_location = os.path.join(allsky_modules, 'modules')

		try:
			allsky_scripts = os.environ["ALLSKY_SCRIPTS"]
		except KeyError:
			print('ERROR: $ALLSKY_SCRIPTS not found - Aborting')
			sys.exit(1)
		allsky_modules_path = os.path.join(allsky_scripts, 'modules')

		uploader_paths = os.path.join(allsky_scripts, 'allskyupload')
		valid_module_paths = [uploader_paths, allsky_modules_location, allsky_modules_path]
            
		for valid_module_path in valid_module_paths:
			sys.path.append(os.path.abspath(valid_module_path))

	def _setup_for_command_line(self, allsky_path):
		command = shlex.split("bash -c 'export ALLSKY_HOME=" + allsky_path + "; source " + allsky_path + "/variables.sh && env'")
		proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		for line in proc.stdout:
			line = line.decode(encoding='UTF-8')
			line = line.strip("\n")
			line = line.strip("\r")
			try:
				(key, _, value) = line.partition("=")
				self._set_environment_variable(key, value)
			except Exception:
				pass
		proc.communicate()
  
	def _set_environment_variable(self, name, value):
		result = True

		try:
			os.environ[name] = value
		except:
			pass

		return result

	def _add_result(self, message, type, code=0):
		result = {
			'message': message,
			'type': type,
			'code': code
		}
		self._results.append(result)

	def get_results(self):
		if self._module is not None:
			results = self._module.get_results() + self._results
		else:
			results = self._results
   
		for result in results:
			message = result['message']
			type = result['type']
			type = f'{type}:'
			print(f'{type:<10} {message}')

	def _debug_message(self, message):
		if self._debug:
			print(message)

	def _get_uploader_module_instance(self, protocol):
		result = False
		try:
			module_name = f'allskyupload{protocol}'
			module_class = f'ALLSKYUPLOAD{protocol.upper()}'
			upload_module_location = f'/home/pi/allsky/scripts/allskyupload/allskyupload{protocol}.py'
			spec = importlib.util.spec_from_file_location(module_name, upload_module_location)
			module = importlib.util.module_from_spec(spec)
			spec.loader.exec_module(module)
			class_attr = getattr(module, module_class)
			self._module = class_attr(self._options, self._settings, self._env, self._debug)
			self._debug_message(f'Using uploader {module_class}')
			result = True
		except Exception as e:
			print(e)

		return result

	def test(self):
		result = ''
		remote_enabled = self._get_settings_value('useremotewebsite')
		self._debug_message('Checking Remote website enabled')
		if not remote_enabled:
			result = 'Remote website upload is not enabled in the Allsky settings'
			self._add_result(result, self._WARNING, 100)
   
		protocol = self._get_settings_value('remotewebsiteprotocol')

		self._debug_message('Getting uploader module')
		if self._get_uploader_module_instance(protocol):
			self._debug_message('Testing uploader module')
			if hasattr(self._module, 'test'):
				if self._module.test():
					result = f'The configured ftp settings are working correctly'
					self._add_result(result, self._OK, 100)
			else:
				result = f'Test method for protocol "{protocol}" not found. Please contact the allsky team through Github'
				self._add_result(result, self._ERROR, 110)
		else:
			result = f'Module for protocol "{protocol}" not found. Please contact the allsky team through Github'
			self._add_result(result, self._ERROR, 110)

		return result

if __name__ == '__main__':

	parser = argparse.ArgumentParser(description='Allsky upload meneger')

	parser.add_argument("--debug", action="store_true", help="Display debug info")
	parser.add_argument('--test', choices=['website', 'server'], help='Test upload settings')

	args = parser.parse_args()

	try:
		allsky_home = os.environ['ALLSKY_HOME']
	except KeyError:
		print('ERROR: $ALLSKY_HOME not found - Aborting.')
		sys.exit(1)
       
	allsky_upload = ALLSKYUPLOAD(allsky_home, args.debug)
	import allsky_shared as allsky_shared
 
	if args.test is not None:
		result = allsky_upload.test()
  
	allsky_upload.get_results()