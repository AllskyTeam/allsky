import allsky_shared as allsky_shared
import os
import json


class ALLSKYMODULEBASE:

	params = []
	event = ''

	def __init__(self, params, event):
		self.params = params
		self.event = event
		self.debugmode = self.get_param('ALLSKYTESTMODE', False, bool)
		self.debug_mode = self.debugmode

		'''
		Originally metaData was a global variable but has since been replaced by meta_data as 
		a class variable. This code will set hte class variable if its not been defined from
		the global variable if it is defined.
		'''
		if not hasattr(self, 'meta_data'):
			if 'metaData' in globals():
				self.meta_data = globals('metaData')

	def get_param(self, param, default, target_type=str, use_default_if_blank=False):
		result = default

		try:
			result = self.params[param]
		except (ValueError, KeyError):
			pass

#		if self.meta_data is not None:
		if hasattr(self, 'meta_data'):
			if 'argumentdetails' in self.meta_data:
				if param in self.meta_data['argumentdetails']:
					if 'secret' in self.meta_data['argumentdetails'][param]:
						env_file = os.path.join(allsky_shared.ALLSKYPATH, 'env.json')
						with open(env_file, 'r', encoding='utf-8') as file:
							env_data = json.load(file)
							env_key = f"{self.meta_data['module'].upper()}.{param.upper()}"
							if env_key in env_data:
								result = env_data[env_key]
							else:
								allsky_shared.log(0, f'ERROR: Variable {param} not found in env file. Tried key {env_key}')

		try:
			result = target_type(result)
		except (ValueError, TypeError):
			#have_debug_mode = hasattr(allsky_shared, 'LOGLEVEL')
			#if have_debug_mode and allsky_shared.LOGLEVEL == 4:
			#	allsky_shared.log(4, f'INFO: Cannot cast "{param}" to {target_type.__name__}, value [{result}]. Using default "{default}"')
			result = default
	
		if target_type == str and use_default_if_blank:
			if result == '':
				result = default

		return result

	def debug_log(self, message):
		if self._debugmode:
			print(message)