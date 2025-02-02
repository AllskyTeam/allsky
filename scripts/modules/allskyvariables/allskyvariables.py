#!/usr/bin/python3

import shlex
import subprocess
import os
import json
import sys
import argparse

def get_json_file(file_path):
	data = {}
	with open(file_path, 'r', encoding='utf-8') as file:	
		data = json.load(file)
  
	return data
	
def setEnvironmentVariable(name, value):
	result = True

	try:
		os.environ[name] = value
	except:
		pass

	return result

def getEnvironmentVariable(name):
	result = None

	try:
		result = os.environ[name]
	except KeyError:
		pass

	return result

def setupForCommandLine(allsky_path):
	command = shlex.split("bash -c 'export ALLSKY_HOME=" + allsky_path + "; source " + allsky_path + "/variables.sh && env'")
	proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
	for line in proc.stdout:
		line = line.decode(encoding='UTF-8')
		line = line.strip("\n")
		line = line.strip("\r")
		try:
			(key, _, value) = line.partition("=")
			setEnvironmentVariable(key, value)
		except Exception:
			pass
	proc.communicate()

def get_debug_variables():
	result = {}
	
	ALLSKY_TMP = getEnvironmentVariable('ALLSKY_TMP')
	file_name = ALLSKY_TMP + '/overlaydebug.txt'

	if os.path.exists(file_name):
		with open(file_name, 'r', encoding='utf-8') as file:
			fields = file.readlines()

		for field in fields:
			field_split = field.split(" ", 1)
			if len(field_split) > 1:
				value = field_split[1].strip()
				#value = value.encode('ISO-8859-1', 'ignore').decode('UTF-8')
				if field_split[0].startswith("AS_"):
					result[field_split[0]] = value

	return result

def get_meta_data_from_file(file_name):
	with open(file_name, 'r') as file:
		file_contents = file.readlines()
	meta_data = ""
	found = False

	for source_line in file_contents:
		line = source_line.replace(" ", "").replace("\n", "").replace("\r", "").lower()
		if line == "metadata={":
			found = True
			source_line = source_line.replace("metaData", "").replace("=", "").replace(" ", "")
		if found:
			meta_data += source_line
		if line.startswith("}") and found:
			break

	return meta_data

def get_module_variable_list(folder, module='', isExtra=False):
	variables = {}

	for entry in os.listdir(folder):
		if isExtra:
			if entry not in ['.', '..']:
				file_name = os.path.join(folder, entry)
				with open(file_name, 'r') as f:
					data = json.load(f)
				variables.update(data)
		else:
			if entry.startswith('allsky_') and entry != 'allsky_shared.py' and entry != 'allsky_base.py':
				include = True
				if module:
					include = False
					if module == entry:
						include = True
				if include:
					file_name = os.path.join(folder, entry)
					meta_data = get_meta_data_from_file(file_name)
					decoded = json.loads(meta_data)

					if 'extradata' in decoded:
						extra_vars = decoded['extradata']['values']
						for key, value in extra_vars.items():
							extra_vars[key]['source'] = decoded['module']
						variables.update(extra_vars)

	return variables

def get_variable(variables, search_variable):
	variable = None

	for raw_variable_data in variables:
		variable_label = raw_variable_data['name']
		variable_label = variable_label.replace('${', '').replace('}', '')
		if variable_label == search_variable:
			variable = raw_variable_data
			break

	if variable is None:
		for raw_variable_data in variables:
			variable_label = raw_variable_data['name']
			variable_label = 'AS_' + variable_label.replace('${', '').replace('}', '')
			if variable_label == search_variable:
				variable = raw_variable_data
				break

	return variable

def get_variables(show_empty=True, module='', indexed=False):
	ALLSKY_CONFIG = getEnvironmentVariable('ALLSKY_CONFIG')
	ALLSKY_SCRIPTS = getEnvironmentVariable('ALLSKY_SCRIPTS')
	ALLSKY_OVERLAY = getEnvironmentVariable('ALLSKY_OVERLAY')
	ALLSKY_MODULE_LOCATION = getEnvironmentVariable('ALLSKY_MODULE_LOCATION')
	
	base_allsky_variable_list = os.path.join(ALLSKY_CONFIG, 'variables.json')
	core_module_directory = os.path.join(ALLSKY_SCRIPTS, 'modules')
	extra_module_directory = os.path.join(ALLSKY_MODULE_LOCATION, 'modules')
	extra_files = os.path.join(ALLSKY_OVERLAY, 'extra')

	valid_module_paths = [extra_module_directory, core_module_directory]

	for valid_module_path in valid_module_paths:
		sys.path.append(os.path.abspath(valid_module_path))
  
	temp_variable_list = {}
	if module == '':
		temp_variable_list = get_json_file(base_allsky_variable_list)
	
	debug_variables = get_debug_variables()
	
	variables = get_module_variable_list(core_module_directory, module)
	temp_variable_list = temp_variable_list | variables
 
	variables = get_module_variable_list(extra_module_directory, module)
	temp_variable_list = temp_variable_list | variables
 
	if module == '':
		variables = get_module_variable_list(extra_files, '', True)
		temp_variable_list = temp_variable_list | variables

	variableList = {}

	for variable, config in temp_variable_list.items():
		if module == '':
			add = True
			if '${COUNT}' in variable:
				matchString = variable.replace('${COUNT}', '')
				for tempVariable, tempConfig in temp_variable_list.items():
					if tempVariable.rstrip('0123456789') == matchString:
						add = False
						break
			if add:
				variableList[variable] = config
		else:
			variableList[variable] = config

	result = []
	for variable, config in variableList.items():
		if isinstance(config, dict):
			value = config.get('value', '')

			if config.get('group') == 'Allsky' and variable in debug_variables:
				value = debug_variables[variable]

			add = True
			if show_empty == False and module == '':
				if not value:
					if not isinstance(value, bool):
						add = False

			if add:
				result.append({
					'name': config.get('name', '${' + variable.replace('AS_', '') + '}'),
					'format': config.get('format', ''),
					'sample': config.get('sample', ''),
					'variable': variable,
					'group': config.get('group', 'Unknown'),
					'description': config.get('description', ''),
					'value': value,
					'type': config.get('type', 'Unknown'),
					'source': config.get('source', 'Unknown')
				})
		else:
			result.append({
				'name' : '${' + variable.replace('AS_', '') + '}',
				'format': 'string',
				'sample': '',
				'variable': variable,
				'group': 'user',
				'description': '',
				'value': config,
				'type': 'string',
				'source': 'user'		
			})

	#result = sorted(result, key=lambda item: item['group'])
	if indexed:
		new_result = {}
		for variable_data in result:
			raw_var_name = variable_data['name']
			var_name = raw_var_name.replace('${', '').replace('}', '')
			if var_name.startswith('AS_'):
				var_name = var_name[3:]
    
			new_result[var_name] = variable_data
   
		result = new_result
  
	return result

if __name__ == "__main__":

	parser = argparse.ArgumentParser(description="Return all available Allsky variables")

	parser.add_argument("--empty", action="store_true", help="Show all Variables (default: yes)")
	parser.add_argument("--allskyhome", type=str, default="/home/pi/allsky", help="Allsky home directory")
	parser.add_argument("--module", type=str, default="", help="Only return variables for a specific module")
	parser.add_argument("--print", action="store_true", help="Print the results to stdout")
	parser.add_argument("--prettyprint", action="store_true", help="Pretty Print the results to stdout")
	parser.add_argument("--indexed", action="store_true", help="Return idata indexed by variable name")
 
	args = parser.parse_args()
 
	setupForCommandLine(args.allskyhome)
	variables = get_variables(args.empty, args.module, args.indexed)

	if args.print:
		print(json.dumps(variables))
  
	if args.prettyprint:
		print(json.dumps(variables, indent=4))
  