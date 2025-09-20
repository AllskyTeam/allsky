#!/usr/bin/python3

import shlex
import subprocess
import os
import json
import sys
import argparse
import re
from pathlib import Path

class ALLSKYVARIABLES:
    _debug_mode = False
    
    def __init__(self, debug_mode=False):
        self._debug_mode = debug_mode

    def _debug(self, message):
        if self._debug_mode:
            print(message)
        
    def _get_json_file(self, file_path):
        data = {}
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        return data

    def _set_environment_variable(self, name, value):
        result = True

        try:
            os.environ[name] = value
        except:
            pass

        return result

    def _get_environment_variable(self, name):
        result = None

        try:
            result = os.environ[name]
        except KeyError:
            pass

        return result

    def setup_for_command_line(self, allsky_path):
        json_variables = f"{allsky_path}/variables.json"
        with open(json_variables, 'r') as file:
            json_data = json.load(file)

        for key, value in json_data.items():
            self._set_environment_variable(str(key), str(value))

    def get_debug_variables(self):
        result = {}

        ALLSKY_TMP = self._get_environment_variable('ALLSKY_TMP')
        file_name = ALLSKY_TMP + '/overlaydebug.txt'

        if os.path.exists(file_name):
            with open(file_name, 'r', encoding='utf-8') as file:
                fields = file.readlines()

            for field in fields:
                field_split = field.split(" ", 1)
                if len(field_split) > 1:
                    value = field_split[1].strip()
                    #value = value.encode('ISO-8859-1', 'ignore').decode('UTF-8')
                    #if field_split[0].startswith("AS_"):
                    result[field_split[0]] = value

        return result

    #TODO: Fix to ensure formatting of metadata parses i.e. spaces and tabs

    def _get_meta_data_from_file(self, file_name):
        meta_data = self._get_meta_data_from_file_by_name(file_name, 'meta_data')
        if not meta_data:
            meta_data = self._get_meta_data_from_file_by_name(file_name, 'metaData')

        return meta_data

    def _get_meta_data_from_file_by_name(self, file_name, meta_variable_name):
        with open(file_name, 'r', encoding='utf-8') as file:
            file_contents = file.readlines()
        meta_data = ''
        found = False
        level = 0

        for source_line in file_contents:

            if source_line.rstrip().endswith('{'):
                level += 1

            if source_line.lstrip().startswith('}'):
                level -= 1

            if source_line.lstrip().startswith(meta_variable_name):
                found = True
                source_line = source_line.replace(f"{meta_variable_name}", "").replace("=", "").replace(" ", "")
            if found:
                meta_data += source_line
            if source_line.lstrip().rstrip() == '}' and found and level == 0:
                break

        return meta_data

    def _get_module_variable_list(self, folder, module='', isExtra=False):
        variables = {}

        if os.path.isdir(folder):
            for entry in os.listdir(folder):
                if isExtra:
                    if entry not in ['.', '..']:
                        file_name = os.path.join(folder, entry)
                        ext = Path(entry).suffix.lower()
                        if ext == '.json':
                            with open(file_name, 'r') as f:
                                data = json.load(f)
                            variables.update(data)
                        if ext == '.txt':
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
                                    out_key = "AS_" + key.upper()
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

                                    data[out_key] = {
                                        "name": "${" + key + "}",
                                        "format": "",
                                        "sample": "",
                                        "group": "User",
                                        "description": "Allsky variable " + key,
                                        "type": type,
                                        "source": stem,
                                        "value": value
                                    }
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
                            meta_data = self._get_meta_data_from_file(file_name)
                            meta_data = meta_data.replace("\t", "").strip()
                            try:
                                decoded = json.loads(meta_data)

                                if 'extradata' in decoded:
                                    extra_vars = decoded['extradata']['values']
                                    for key, value in extra_vars.items():
                                        extra_vars[key]['source'] = decoded['module']
                                    variables.update(extra_vars)
                            except:
                                pass

        return variables

    def get_variable(self, variables, search_variable):
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

    def get_variables(self, show_empty=True, module='', indexed=False, raw_index=False):
        ALLSKY_CONFIG = self._get_environment_variable('ALLSKY_CONFIG')
        ALLSKY_EXTRA = self._get_environment_variable('ALLSKY_EXTRA')
        ALLSKY_EXTRA_LEGACY = self._get_environment_variable('ALLSKY_EXTRA_LEGACY')        
        ALLSKY_SCRIPTS = self._get_environment_variable('ALLSKY_SCRIPTS')
        ALLSKY_MODULE_LOCATION = self._get_environment_variable('ALLSKY_MODULE_LOCATION')
        ALLSKY_MY_FILES_FOLDER = self._get_environment_variable('ALLSKY_MYFILES_DIR')

        base_allsky_variable_list = os.path.join(ALLSKY_CONFIG, 'allskyvariables.json')
        core_module_directory = os.path.join(ALLSKY_SCRIPTS, 'modules')
        extra_module_directory = os.path.join(ALLSKY_MODULE_LOCATION, 'modules')
        extra_files = ALLSKY_EXTRA
        extra_legacy_files = ALLSKY_EXTRA_LEGACY
        my_files_path = os.path.join(ALLSKY_MY_FILES_FOLDER, 'modules')

        valid_module_paths = [my_files_path, extra_module_directory, core_module_directory]

        for valid_module_path in valid_module_paths:
            sys.path.append(os.path.abspath(valid_module_path))

        temp_variable_list = {}
        if module == '':
            temp_variable_list = self._get_json_file(base_allsky_variable_list)

        debug_variables = self.get_debug_variables()

        variables = self._get_module_variable_list(my_files_path, module)
        temp_variable_list = temp_variable_list | variables
        
        variables = self._get_module_variable_list(core_module_directory, module)
        temp_variable_list = temp_variable_list | variables

        variables = self._get_module_variable_list(extra_module_directory, module)
        temp_variable_list = temp_variable_list | variables

        if module == '':
            variables = self._get_module_variable_list(extra_files, '', True)
            temp_variable_list = temp_variable_list | variables

            variables = self._get_module_variable_list(extra_legacy_files, '', True)
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

                if config.get('group') == 'Allsky':
                    if variable in debug_variables:
                        value = debug_variables[variable]
                    else:
                        variable_tmp = re.sub(r'^AS_', '', variable)
                        if variable_tmp in debug_variables:
                            value = debug_variables[variable_tmp]
                        else:
                            self._debug(f'WARNING: {variable} not found, looked for {variable_tmp} as well.')

                add = True
                if show_empty is False and module == '':
                    if value != 0:
                        if not value:
                            if not isinstance(value, bool):
                                add = False

                if add:
                    result.append({
                        'name': config.get('name', '${' + variable.replace('AS_', '') + '}'),
                        'format': config.get('format', ''),
                        'sample': config.get('sample', ''),
                        'variable': variable,
                        'group': config.get('group', 'user'),
                        'description': config.get('description', ''),
                        'value': value,
                        'type': config.get('type', 'user'),
                        'source': config.get('source', 'user')
                    })
            else:
                result.append({
                    'name': '${' + variable.replace('AS_', '') + '}',
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
                raw_var_name = variable_data['variable']
                var_name = raw_var_name.replace('${', '').replace('}', '')
                if not raw_index:
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
    parser.add_argument("--indexed", action="store_true", help="Return data indexed by variable name")
    parser.add_argument("--raw", action="store_true", help="Do not strip AS_ from indexed data")
    parser.add_argument("--debug", action="store_true", help="Display debug info")

    args = parser.parse_args()

    variable_engine = ALLSKYVARIABLES(args.debug)
    variable_engine.setup_for_command_line(args.allskyhome)
    variables = variable_engine.get_variables(args.empty, args.module, args.indexed, args.raw)

    if args.print:
        print(json.dumps(variables))

    if args.prettyprint:
        print(json.dumps(variables, indent=4))
