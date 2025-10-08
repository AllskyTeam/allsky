""" allsky_export.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will export all of the Allsky variables to a json file. 
The default json path is ${ALLSKY_TMP}/allskydata.json but this can be changed in the module settings
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
from allskyvariables import allskyvariables
import os 
import json
import re

class ALLSKYEXPORT(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Export Allsky Data",
		"description": "Export data created by Allsky to a file for use by other programs.",
		"module": "allsky_export",
		"testable": "true",
		"centersettings": "false",
    	"group": "Data Export",
		"events": [
			"day",
			"night"
		],
		"arguments":{
			"filelocation": "${ALLSKY_TMP}/allskydata.json",
			"extradata": "CAMERA_TYPE,DAY_OR_NIGHT,CURRENT_IMAGE,ALLSKY_FULL_FILENAME,ALLSKY_VERSION"
		},
		"argumentdetails": {
			"filelocation" : {
				"required": "true",
				"description": "File Location",
				"help": "The location to save the json file."
			},
			"extradata" : {
				"required": "false",
				"description": "Extra data to export",
				"help": "Comma-separated list of additional variables to export."
			}        
		}          
	}

	def run(self):
		""" Generates the json file and saves it 
		"""    
		export_data = {}

		save_path_raw = self.get_param('filelocation', '', str)
		extra_vars = self.get_param('extradata', '', str)
		save_path = allsky_shared.convertPath(save_path_raw)

		if save_path is not None:
			variables = allskyvariables.get_variables(True, '', True)
			if len(extra_vars) > 0 :
				extra_entries = extra_vars.split(',')
				for variable_name in extra_entries:
					if variable_name.startswith('AS_'):
						variable_name = variable_name[3:]

					if variable_name in variables:
						export_data[variable_name] = variables[variable_name]['value']
					else:
						export_data[variable_name] = allsky_shared.getEnvironmentVariable(variable_name)
      			
				with open(save_path, 'w', encoding='utf-8') as out_file:
					json.dump(export_data, out_file, indent=4)
     
				result = f'Data exported to {save_path}'
				self.log(4, f'INFO: {result}')
			else:
				result = f'No extra variables defined for export'
				self.log(0, f'ERROR: {result}')
		else:
			result = f'Invalid save path {save_path_raw}'
			self.log(0, f'ERROR: {result}')
          
		return result


def export(params, event):
	allsky_export = ALLSKYEXPORT(params, event)
	result = allsky_export.run()

	return result 
