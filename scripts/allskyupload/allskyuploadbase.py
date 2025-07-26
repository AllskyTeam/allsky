import sys
import allsky_shared as allsky_shared

class ALLSKYUPLOADBASE:
	__options = None
	__settings = None
	__env = None
	__results = []
 
	_ERROR = 'Error'
	_WARNING = 'Warning'
	_INFO = 'Info'
	_OK = 'OK'
 
	def __init__(self, options, settings, env, debug):
		self.__options = options
		self.__settings = settings
		self.__env = env
		self.__debug = debug
	
	def _in_debug_mode(self):
		return self.__debug

	def _debug_message(self, message):
		if self.__debug:
			print(message)
   
	def _get_settings_value(self, setting):
		result = None
		for option in self.__options:
			if option['name'] == setting:
				if 'source' in option:
					source = option['source']
					if source == '${ALLSKY_ENV}':
						if setting in self.__env:
							result = self.__env[setting]          
						else:
							print(f'ERROR: Setting {setting} could not be located in the env.json file')
							sys.exit(0)          
				else:
					if setting in self.__settings:
						result = self.__settings[setting]
					else:
						print(f'ERROR: Setting {setting} could not be located in the settings.json file')
						sys.exit(0)
				break

		return result

	def _add_result(self, message, type, code=0):
		result = {
			'message': message,
			'type': type,
			'code': code
		}
		self.__results.append(result)

	def get_results(self):
		return self.__results
   
	def _check_list_of_settings(self, settings_to_check):
		result = True
		default_code = 0
		if 'options' in settings_to_check:
			if 'code' in settings_to_check['options']:
				default_code = settings_to_check['options']['code']

		for setting_name, setting_options in settings_to_check['settings'].items():
			setting_value = self._get_settings_value(setting_name)
			display_value = setting_value
			if isinstance(setting_value, str) and 'password' in setting_name.lower():
				display_value = setting_value[:2] + '*' * (len(setting_value) - 2)

			self._debug_message(f'Checking ftp setting {setting_name}, value is "{display_value}"')
			if not setting_value:
				if type(setting_options) is dict:
					message = setting_options['message']
					if 'code' in setting_options:
						code = setting_options['code']
					else:
						code = default_code
      
					if 'type' in setting_options:
						error_type = setting_options['type']
					else:
						error_type = self._ERROR     
				else:
					message = setting_options
					error_type = self._ERROR
					code = default_code

				result = False

				self.__add_result(message, error_type, code)
		return result

	def _check_ftp_settings(self):
		settings_to_check = {
			'options': {
				'code': 200
			},
			'settings': {
				'REMOTEWEBSITE_HOST': 'You have not set the remote website host (Server Name). Please set this in the main Allsky settings',
				'remotewebsiteurl': 'You have not set the remote website url (Website URL). Please set this in the main Allsky settings',
				'remotewebsiteimagedir': 'You have not set the remote website image folder (Image Directory). Please set this in the main Allsky settings',
				'REMOTEWEBSITE_USER': 'You have not set the ftp username (User Name). Please set this in the main Allsky settings',
				'REMOTEWEBSITE_PASSWORD': {
					'message': 'You have not set the ftp password (Password). Please set this in the main Allsky settings',
					'code': 205
				}
			}
		}
		return self._check_list_of_settings(settings_to_check)   