#!/home/pi/allsky/venv/bin/python

import os
import pathlib
import json
import copy
import argparse
import subprocess
import shlex
import sys
import re
import time

try:
	import allsky_shared as shared
	from allskyformatters import allskyformatters
	from allskyvariables import allskyvariables
	from allskyexceptions import AllskyFormatError 
except:
	pass

class ALLSKYOVERLAYDATA:
    
	extra_expiry_time = 0
	extra_folder = ''
	from_command_line = False
	values_only = False
	raw_only = False
	debug_mode = False
	overlay_file = ''
	variables = {}
	extra_fields = {}
	extra_field_definition = {
		'value': None,
		'x': None,
		'y': None,
		'tlx': None,
		'tly': None,
		'format': None,  
		'fill': None,
		'font': None,
		'fontsize': None,
		'result': True,
		'image': None,
		'rotate': None,
		'scale': None,
		'opacity': None,
		'stroke': None,
		'strokewidth': None,
	}
 
	def __init__(self, from_command_line, values_only, debug_mode, overlay_file):
		self.from_command_line = from_command_line
		self.values_only = values_only
		self.debug_mode = debug_mode
		self.overlay_file = overlay_file

	def __debug(self, message):
		if self.debug_mode:
			print(message)
   
	def __log(self, level, text, prevent_newline = False, exit_code=None, send_to_allsky=False):
		if self.from_command_line:
			if self.debug_mode:
				shared.log(level, text, prevent_newline, exit_code, sendToAllsky=send_to_allsky)
		else:
			shared.log(level, text, prevent_newline, exit_code, sendToAllsky=send_to_allsky)

	def __set_environment_variable(self, name, value):
		result = True

		try:
			os.environ[name] = value
		except:
			pass

		return result

	def get_environment_variable(self, name):
		result = None

		try:
			result = os.environ[name]
		except KeyError:
			pass

		return result

	def setup_for_command_line(self, allsky_path):
		command = shlex.split("bash -c 'export ALLSKY_HOME=" + allsky_path + "; source " + allsky_path + "/variables.sh && env'")
		proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
		for line in proc.stdout:
			line = line.decode(encoding='UTF-8')
			line = line.strip("\n")
			line = line.strip("\r")
			try:
				(key, _, value) = line.partition("=")
				self.__set_environment_variable(key, value)
			except Exception:
				pass
		proc.communicate()
 
	def __remove_expired_fields(self):
		pass
	
	def __parse_extra_data_field(self, raw_field_data):
		if self.values_only:
			field_data = {
				'value': ''
			}
		else:
			field_data = copy.copy(self.extra_field_definition)

		try:
			for field_key, field_value in field_data.items():
				if field_key in raw_field_data:
					field_data[field_key] = raw_field_data[field_key]

			if isinstance(field_data['value'] , dict):
				for field_key, field_value in field_data['value'].items():
					if field_key in field_data:
						if field_key != 'value':
							field_data[field_key] = field_data['value'][field_key]

				if 'value' in field_data['value']:
					field_data['value'] = field_data['value']['value']
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			self.__log(0, f'ERROR: __parse_extra_data_field failed on line {eTraceback.tb_lineno} - {e}')

		return field_data

	def __read_json_file(self, file_name):
		if shared.isFileReadable(file_name):
			file_modified_time = int(os.path.getmtime(file_name))
			try:
				with open(file_name) as file:
					json_data = json.load(file)
					for (field_name, field_data) in json_data.items():
						self.extra_fields[field_name] = self.__parse_extra_data_field(field_data)
			except:
				self.__log(0, f'WARNING: Data File {os.path.basename(file_name)} is invalid - IGNORING.')
		else:
			self.__log(0, f'ERROR: Data File {os.path.basename(file_name)} is not accessible - IGNORING.')
 
	def __read_text_file(self, file_name):
		pass

	def __read_data(self, file_name):
		file_extension = pathlib.Path(file_name).suffix
		if file_extension == '.json':
			self.__read_json_file(file_name)
		else:
			if file_extension == '.txt':
				self.__read_text_file(file_name)
			else:
				self.__log(4, f'INFO: Unknown file {os.path.basename(file_name)}')

		self.__remove_expired_fields()
    
	def __add_core_allsky_variables(self):
		debug_variables = allskyvariables.get_debug_variables()
   
		for debug_variable in debug_variables:
			if not debug_variable in self.extra_fields:
				if self.values_only:
					field_data = {
						'value': ''
					}
				else:
					field_data = copy.copy(self.extra_field_definition)
				field_data['value'] = debug_variables[debug_variable]
				self.extra_fields[debug_variable] = field_data
		
	def load(self, extra_expiry_time, extra_folder):
		self.extra_expiry_time = extra_expiry_time
		self.extra_folder = extra_folder

		for (dirPath, dirNames, file_names) in os.walk(self.extra_folder):
			for file_name in file_names:
				extra_data_file_name = os.path.join(self.extra_folder, file_name)
				self.__debug(f'INFO: Loading Data File {extra_data_file_name}')
				self.__read_data(extra_data_file_name)

		self.__add_core_allsky_variables()

		return self.format()

	def __format_field(self, field_data):
		variable_regex =  r"\$\{.*?\}"
		field_label = field_data['label']
		variable_matches = re.findall(variable_regex, field_label)   
		
		self.__debug(f'INFO: Found the following variables {variable_matches}')
		format_matches = None
		if 'format' in field_data:
			format_regex = r"\{(.*?)\}"
			formats = field_data['format']    
			format_matches = re.findall(format_regex, formats)
			self.__debug(f'INFO: Found the following formats {format_matches}')
		else:
			self.__debug(f'INFO: No formats found')

		for variable_pos, raw_variable in enumerate(variable_matches):
			variable = 'AS_' + raw_variable.replace('${','').replace('}', '')
			value = ''
			if variable in self.extra_fields:
				value = self.extra_fields[variable]['value']
			pre_formatted_value = value
		
			variable_definition = allskyvariables.get_variable(self.variables, variable)
			if variable_definition is not None:
				if isinstance(variable_definition['value'] , dict):
					for (def_key, def_value) in variable_definition['value'].items():
						if def_key != 'value':
							field_data[def_key] = def_value

			if format_matches is not None:
				formats = format_matches[variable_pos]
    
				if variable in self.extra_fields:

					variable_group = 'text'
					if variable_definition is not None:
						variable_group = variable_definition['type']

					if 'type' in field_data:
						variable_group = field_data['type']
          
					self.__debug(f'INFO: Formatting variable {variable}, value {self.extra_fields[variable]["value"]}, using format "{formats}"')
					format_list = formats.split('|')
					for index, format in enumerate(format_list):
						if index > 0:
							variable_group = 'number'
						format_function = 'as_' + variable_group.lower()
						if hasattr(allskyformatters.allsky_formatters, format_function):
							self.__debug(f'INFO: Formatter "{format_function}" found for variable "{variable}". Value = "{value}", format = "{format}"')        
							try:
								if variable == 'DATE' or variable == 'AS_DATE' or variable == 'AS_TIME' or variable == 'TIME':
									value = time.time()
					
								value = getattr(allskyformatters.allsky_formatters, format_function)(value, variable, format, '')
							except AllskyFormatError as e:
								self.__log(e.log_level, e.message, e.send_to_allsky)
							#except Exception as e:
							#	print(e)
							#	pass
						else:
							self.__log(4, f'Formatter {format_function} NOT found')	
					else:
						self.__debug(f'ERROR: No variable defintion found for {variable}')
				else:
					self.__debug(f'ERROR: Variable {variable} not found in extra fields')
        
			self.__debug(f'INFO: pre formatted value = "{pre_formatted_value}", value after formatting = "{value}"')

			if not value:
				if 'empty' in field_data:
					if field_data['empty']:
						value = field_data['empty']
						self.__debug(f'INFO: Field value is empty and default value "{field_data["empty"]}" provided')
					else:
						self.__debug('INFO: Field value is empty but no empty value provided')
				else:
					self.__debug('INFO: Field value is empty but no empty value provided')

			if value:
				field_label = field_label.replace('&deg;', '\u00B0')
			else:
				field_label = field_label.replace('&deg;', '')
    
			field_label = field_label.replace(raw_variable, str(value))

		field_data['label'] = field_label

		self.__debug(f'INFO: Final formatted label "{field_label}"')
		self.__debug('')

		return field_label

	def format(self):
		if self.overlay_file != '':     
			self.__debug(f'INFO: Using overlay "{self.overlay_file}"')
			if shared.isFileReadable(self.overlay_file):
				#try:
				with open(self.overlay_file) as file:
					json_overlay = json.load(file)
					self.variables = allskyvariables.get_variables()
					for index,field_data in enumerate(json_overlay['fields']):
						self.__debug(f"INFO: Formatting field {field_data['label']}")
						field_data['label'] = self.__format_field(field_data)

				#except:
				#	self._log(0, f'WARNING: Data File {overlay_file} is invalid - IGNORING.', sendToAllsky=True)
				result = json_overlay['fields']
			else:
				self.__log(0, f'ERROR: Data File {self.overlay_file} is not accessible - IGNORING.', send_to_allsky=False)
		else:
			result = self.extra_fields
   
		return result

if __name__ == '__main__':
    
	parser = argparse.ArgumentParser(description="Return all data for an overlay")

	parser.add_argument("--allskyhome", type=str, default="/home/pi/allsky", help="Allsky home directory")
	parser.add_argument("--overlay", type=str, default="", help="Get data for a specific overlay")
	parser.add_argument("--valuesonly", action="store_true", help="Only return values")
	parser.add_argument("--print", action="store_true", help="Print the results to stdout")
	parser.add_argument("--prettyprint", action="store_true", help="Pretty Print the results to stdout")
	parser.add_argument("--debug", action="store_true", help="Display debug info")

	args = parser.parse_args()
    
	if args.overlay == '':
		args.valuesonly = True
		
	allsky_data = ALLSKYOVERLAYDATA(True, args.valuesonly, args.debug, args.overlay)
	allsky_data.setup_for_command_line(args.allskyhome)
             
	try:
		allsky_modules = os.environ['ALLSKY_MODULE_LOCATION']
	except KeyError:
		print('ERROR: $ALLSKY_MODULE_LOCATION not found - Aborting.')
		sys.exit(1)
	allsky_modules_location = os.path.join(allsky_modules, "modules")

	try:
		allsky_scripts = os.environ["ALLSKY_SCRIPTS"]
	except KeyError:
		print('ERROR: $ALLSKY_SCRIPTS not found - Aborting')
		sys.exit(1)
	allsky_modules_path = os.path.join(allsky_scripts, 'modules')

	valid_module_paths = [allsky_modules_location, allsky_modules_path]
            
	for valid_module_path in valid_module_paths:
		sys.path.append(os.path.abspath(valid_module_path))

	import allsky_shared as shared
	from allskyformatters import allskyformatters
	from allskyvariables import allskyvariables
	from allskyexceptions import AllskyFormatError

	try:
		shared.LOGLEVEL = int(os.environ['ALLSKY_DEBUG_LEVEL'])
	except KeyError:
		shared.LOGLEVEL = 0
  
	extra_folder = allsky_data.get_environment_variable('ALLSKY_EXTRA')
 
	result = allsky_data.load(10000, extra_folder)
	
	if args.print:
		print(json.dumps(result))
  
	if args.prettyprint:
		print(json.dumps(result, indent=4))