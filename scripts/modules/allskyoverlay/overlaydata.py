#!/usr/bin/python3

import os
import sys
import subprocess

# Ensure the script is running in the correct Python environment
allsky_home = os.environ['ALLSKY_HOME']
here = os.path.dirname(os.path.abspath(__file__))
venv_dir = os.path.join(allsky_home, 'venv')
venv_python = os.path.join(venv_dir, 'bin', 'python3')
if sys.executable != venv_python:
    os.execv(venv_python, [venv_python] + sys.argv)

import json
import copy
import argparse
import subprocess
import shlex
import re
import time
import html
from pathlib import Path
from pprint import pprint


try:
	import allsky_shared as shared
	from allskyformatters import allskyformatters
	from allskyvariables.allskyvariables import ALLSKYVARIABLES
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
	settings_file = {}
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
	variable_class = None
 
 
	def __init__(self, from_command_line, values_only, debug_mode, overlay_file):
		self.from_command_line = from_command_line
		self.values_only = values_only
		self.debug_mode = debug_mode
		self.overlay_file = overlay_file
  
		self.variable_class = ALLSKYVARIABLES(debug_mode)
  
		with open(os.environ['ALLSKY_SETTINGS_FILE'], 'r') as f:
			self.settings_file = json.load(f)

	def _debug(self, message):
		if self.debug_mode:
			print(message)
   
	def _log(self, level, text, prevent_newline = False, exit_code=None, send_to_allsky=False):
		if self.from_command_line:
			if self.debug_mode:
				shared.log(level, text, prevent_newline, exit_code, sendToAllsky=send_to_allsky)
		else:
			shared.log(level, text, prevent_newline, exit_code, sendToAllsky=send_to_allsky)

	def _set_environment_variable(self, name, value):
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
				self._set_environment_variable(key, value)
			except Exception:
				pass
		proc.communicate()
   
	def _remove_expired_fields(self):
		pass
	
	def _parse_extra_data_field(self, raw_field_data):
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
			else:
				if not isinstance(raw_field_data, dict):
					field_data['value'] = raw_field_data
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			self._log(0, f'ERROR: _parse_extra_data_field failed on line {eTraceback.tb_lineno} - {e}')

		return field_data

	def _read_json_file(self, file_name):
		if shared.isFileReadable(file_name):
			file_modified_time = int(os.path.getmtime(file_name))
			try:
				with open(file_name) as file:
					json_data = json.load(file)
					for (field_name, field_data) in json_data.items():
						self.extra_fields[field_name] = self._parse_extra_data_field(field_data)
			except:
				self._log(0, f'WARNING: Data File {os.path.basename(file_name)} is invalid - IGNORING.')
		else:
			self._log(0, f'ERROR: Data File {os.path.basename(file_name)} is not accessible - IGNORING.')
 
	def _read_text_file(self, file_name):
		entry = Path(file_name).name     
		stem = Path(entry).stem
		with open(file_name, 'r') as f:
			data = {}
			for line in f:
				line = line.strip()
				if not line or '=' not in line:
					continue
				key, value = line.split('=', 1)
				key = key.strip()
				value = value.strip()
				out_key = key.upper()
				type = 'string'
				try:
					value = int(value)
					type = 'number'
				except ValueError:
					try:
						value = float(value)
						type = 'number'
					except ValueError:
						value = value
						type = 'string'

				data = {
					"name": "${" + key + "}",
					"format": "",
					"sample": "",
					"group": "User",
					"description": "Allsky variable " + key,
					"type": type,
					"source": stem,
					"value": value
				}
				self.extra_fields[out_key] = data

	def _read_data(self, file_name):
		file_extension = Path(file_name).suffix
		if file_extension == '.json':
			self._read_json_file(file_name)
		else:
			if file_extension == '.txt':
				self._read_text_file(file_name)
			else:
				self._log(4, f'INFO: Unknown file {os.path.basename(file_name)}')

		self._remove_expired_fields()
    
	def _add_core_allsky_variables(self):
		debug_variables = self.variable_class.get_debug_variables()
   
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
		
	def load(self, extra_expiry_time, extra_folder, extra_legacy_folder):
		self.extra_expiry_time = extra_expiry_time
		self.extra_folder = extra_folder
		self.extra_legacy_folder = extra_legacy_folder
  
		for (dirPath, dirNames, file_names) in os.walk(self.extra_folder):
			for file_name in file_names:
				extra_data_file_name = os.path.join(self.extra_folder, file_name)
				self._debug(f'INFO: Loading Data File {extra_data_file_name}')
				self._read_data(extra_data_file_name)

		for (dirPath, dirNames, file_names) in os.walk(self.extra_legacy_folder):
			for file_name in file_names:
				extra_data_file_name = os.path.join(self.extra_legacy_folder, file_name)
				self._debug(f'INFO: Loading Legacy Data File {extra_data_file_name}')
				self._read_data(extra_data_file_name)
    
		self._add_core_allsky_variables()

		return self.format()

	def _format_field(self, field_data):
		variable_regex =  r"\$\{.*?\}"
		field_label = field_data['label']
		variable_matches = re.findall(variable_regex, field_label)   
		
		self._debug(f'INFO: Found the following variables {variable_matches}')
		format_matches = None
		if 'format' in field_data:
			format_regex = r"\{(.*?)\}"
			formats = field_data['format']
			if formats is not None:
				format_matches = re.findall(format_regex, formats)
			self._debug(f'INFO: Found the following formats {format_matches}')
		else:
			self._debug(f'INFO: No formats found')

		for variable_pos, raw_variable in enumerate(variable_matches):
			variable = 'AS_' + raw_variable.replace('${','').replace('}', '')
			value = ''
			if variable in self.extra_fields:
				value = self.extra_fields[variable]['value']
			else:
				variable = raw_variable.replace('${','').replace('}', '')
				if variable in self.extra_fields:
					value = self.extra_fields[variable]['value']
				else:
					#
     			# Cant find variable assume it doesnt have an AS_ prefix so ignore
					# prefix and just try and find a match
					#
					for var_name in self.extra_fields:
						if '_' in var_name:
							check_var = var_name.split("_", 1)[1]
							variable = raw_variable.replace('${','').replace('}', '')
							if check_var == variable:
								value = self.extra_fields[var_name]['value']
								break
      
			self._debug(f'INFO: Using Value "{value}"')
			pre_formatted_value = value

			variable_definition = self.variable_class.get_variable(self.variables, variable)
			if variable_definition is not None:
				if isinstance(variable_definition['value'] , dict):
					for (def_key, def_value) in variable_definition['value'].items():
						if def_key != 'value':
							field_data[def_key] = def_value

			if format_matches:
				if variable_pos < len(format_matches):
					formats = format_matches[variable_pos]
				else:
					formats = ""
    
				if variable in self.extra_fields:

					variable_group = 'text'
					if variable_definition is not None:
						variable_group = variable_definition['type']

					if 'type' in field_data:
						variable_group = field_data['type']
          
					#self._debug(f'INFO: Formatting variable {variable}, value {self.extra_fields[variable]["value"]}, using format "{formats}"')
     
     
					format = formats
					if format in self.settings_file:
						old_format = format
						format = self.settings_file[format]
						self._debug(f'INFO: swapped format {old_format} for {format}')     

					format_function = 'as_' + variable_group.lower()
					if hasattr(allskyformatters.allsky_formatters, format_function):
						self._debug(f'INFO: Formatter "{format_function}" found for variable "{variable}". Value = "{value}", format = "{format}"')        
						try:
							if variable == 'DATE' or variable == 'AS_DATE' or variable == 'AS_TIME' or variable == 'TIME':
								value = time.time()
				
							value = getattr(allskyformatters.allsky_formatters, format_function)(value, variable, format, '', self.debug_mode)
						except AllskyFormatError as e:
							self._log(e.log_level, e.message, send_to_allsky=e.send_to_allsky)
					else:
						self._log(4, f'Formatter {format_function} NOT found')	     
	
     
     
     
					'''
					format_list = formats.split('|')
					for index, format in enumerate(format_list):
						if index > 0:
							#variable_group = 'number'
							variable_group = format
       
						if format in self.settings_file:
							old_format = format
							format = self.settings_file[format]
							self._debug(f'INFO: swapped format {old_format} for {format}')

						format_function = 'as_' + variable_group.lower()
						if hasattr(allskyformatters.allsky_formatters, format_function):
							self._debug(f'INFO: Formatter "{format_function}" found for variable "{variable}". Value = "{value}", format = "{format}"')        
							try:
								if variable == 'DATE' or variable == 'AS_DATE' or variable == 'AS_TIME' or variable == 'TIME':
									value = time.time()
					
								value = getattr(allskyformatters.allsky_formatters, format_function)(value, variable, format, '')
							except AllskyFormatError as e:
								self._log(e.log_level, e.message, send_to_allsky=e.send_to_allsky)
						else:
							self._log(4, f'Formatter {format_function} NOT found')	
					'''
				else:
					self._debug(f'ERROR: Variable {variable} not found in extra fields')
        
			self._debug(f'INFO: pre formatted value = "{pre_formatted_value}", value after formatting = "{value}"')

			if not value:
				if 'empty' in field_data:
					if field_data['empty']:
						value = field_data['empty']
						self._debug(f'INFO: Field value is empty and default value "{field_data["empty"]}" provided')
					else:
						self._debug('INFO: Field value is empty but no empty value provided')
				else:
					self._debug('INFO: Field value is empty but no empty value provided')
    
			field_label = field_label.replace(raw_variable, str(value), 1)

		field_data['label'] = field_label

		self._debug(f'INFO: Final formatted label "{field_label}"')
		self._debug('')

		field_label = html.unescape(field_label)

		return field_label

	def format(self):
		if self.overlay_file != '':     
			self._debug(f'INFO: Using overlay "{self.overlay_file}"')
			if shared.isFileReadable(self.overlay_file):
				#try:
				with open(self.overlay_file) as file:
					json_overlay = json.load(file)
					self.variables = self.variable_class.get_variables()
					for index,field_data in enumerate(json_overlay['fields']):
						self._debug(f"INFO: Formatting field {field_data['label']}")
						field_data['label'] = self._format_field(field_data)

				#except:
				#	self._log(0, f'WARNING: Data File {self.overlay_file} is invalid - IGNORING.')
				result = json_overlay['fields']
			else:
				self._log(0, f'ERROR: Data File {self.overlay_file} is not accessible - IGNORING.')
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
		
	try:
		allsky_my_files_folder = os.environ["ALLSKY_MYFILES_DIR"]
	except KeyError:
		print("ERROR: $ALLSKY_MYFILES_DIR not found - Aborting.")
		sys.exit(1)
                 
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

	valid_module_paths = [allsky_my_files_folder, allsky_modules_location, allsky_modules_path]
            
	for valid_module_path in valid_module_paths:
		sys.path.append(os.path.abspath(valid_module_path))

	import allsky_shared as shared
	from allskyformatters import allskyformatters
	from allskyvariables.allskyvariables import ALLSKYVARIABLES
	from allskyexceptions import AllskyFormatError

	allsky_data = ALLSKYOVERLAYDATA(True, args.valuesonly, args.debug, args.overlay)
	allsky_data.setup_for_command_line(args.allskyhome)
 
	try:
		shared.LOGLEVEL = int(os.environ['ALLSKY_DEBUG_LEVEL'])
	except KeyError:
		shared.LOGLEVEL = 0
  
	extra_folder = allsky_data.get_environment_variable('ALLSKY_EXTRA')
	extra_legacy_folder = allsky_data.get_environment_variable('ALLSKY_EXTRA_LEGACY')
 
	result = allsky_data.load(10000, extra_folder, extra_legacy_folder)

	if args.print:
		print(json.dumps(result))
  
	if args.prettyprint:
		print(json.dumps(result, indent=4))
