'''
allsky_loadimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will load the last captured image into the shared module
allowing it to be passed between modules.

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import os
import sys

class ALLSKYLOADIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Load the Current Image",
		"description": "Load the last captured image.",
		"module": "allsky_loadimage",
		"ignorewatchdog": "True",
		"extradatafilename": "allsky_camera.json",
		"group": "Allsky Core",
		"events": [
			"day",
			"night"
		],
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_image",
    			"pk": "id",
    			"pk_source": "image_timestamp",
    			"pk_type": "int",
    			"include_all": "true"
			},
			"values": {
				"AS_CAMERAIMAGE": {
					"name": "${CAMERAIMAGE}",
					"format": "",
					"sample": "",
					"group": "Allsky",
					"description": "Current Image",
					"type": "string"
				},
				"AS_DATE_NAME": {
					"name": "${DATE_NAME}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Folder in allsky/images where image is",
					"type": "string"
				},
				"AS_DAY_OR_NIGHT": {
					"name": "${DAY_OR_NIGHT}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "DAY / NIGHT flag",
					"type": "string",
     				"dbtype": "varchar(10)"
				},
				"AS_AUTOEXPOSURE": {
					"name": "${AUTOEXPOSURE}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Autoexposure enabled?",
					"type": "bool"
				},
				"AS_AUTOGAIN": {
					"name": "${AUTOGAIN}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Autogain enabled?",
					"type": "bool"
				},
				"AS_RESOLUTION_X": {
					"name": "${RESOLUTION_X}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Width of image in pixels",
					"type": "int"
				},
				"AS_RESOLUTION_Y": {
					"name": "${RESOLUTION_Y}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Height of image in pixels",
					"type": "int"
				},
				"AS_EXPOSURE_US": {
					"name": "${EXPOSURE_US}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Exposure",
					"type": "number"
				},
				"AS_GAIN": {
					"name": "${GAIN}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Gain",
					"type": "number"
				},
				"AS_TEMPERATURE_C": {
					"name": "${TEMPERATURE_C}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Sensor Temperature",
					"type": "temperature"
				},
				"AS_MEAN": {
					"name": "${MEAN}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Current Mean Pixel Value",
					"type": "number"
				}  
			}                         
		}          
	}

	def _cleanup_module_data(arg):
		allsky_shared.log(4,'INFO: Cleanup module data')
		allsky_shared.cleanup_extra_data()

	def _dump_debug_data(self):
		debug_filename = os.path.join(allsky_shared.ALLSKY_TMP, 'overlaydebug.txt')

		allsky_shared.create_file_web_server_access(debug_filename)
		env = {}
		for var in os.environ:
			varValue = allsky_shared.getEnvironmentVariable(var, fatal=True)
			varValue = varValue.replace('\n', '')
			varValue = varValue.replace('\r', '')
			var = var.ljust(50, ' ')
			env[var] = varValue

		try:
			with open(debug_filename, 'w') as debug_file:
				for var in sorted(env):
					varValue = env[var]
					debug_file.write(var + varValue + os.linesep)

			self.log(4, f"INFO: Debug information written to {debug_filename}")
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			self.log(0, f'ERROR: Unable to access {debug_filename} in allsky_loadimage.py on line {eTraceback.tb_lineno} - {e}')     

	def run(self):
		result = f'Image {allsky_shared.CURRENTIMAGEPATH} Loaded'
			
		try:
			allsky_shared.image = cv2.imread(allsky_shared.CURRENTIMAGEPATH)
			if allsky_shared.image is None:
				self.log(0, f'ERROR: Cannot read {allsky_shared.CURRENTIMAGEPATH}...', exitCode=1)
		except Exception as e:
			self.log(0, f'ERROR: Cannot load {allsky_shared.CURRENTIMAGEPATH}: {e}', exitCode=1)

		filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
		date = allsky_shared.get_environment_variable('DATE_NAME')

		extra_data = {}
		extra_data['AS_CAMERAIMAGE'] = filename
		extra_data['AS_DATE_NAME'] = allsky_shared.get_environment_variable('AS_DATE_NAME')
		extra_data['AS_DAY_OR_NIGHT'] = allsky_shared.get_environment_variable('AS_DAY_OR_NIGHT')
		extra_data['AS_AUTOEXPOSURE'] = bool(allsky_shared.get_environment_variable('AS_AUTOEXPOSURE'))
		extra_data['AS_AUTOGAIN'] = bool(allsky_shared.get_environment_variable('AS_AUTOGAIN'))
		extra_data['AS_RESOLUTION_X'] = int(allsky_shared.get_environment_variable('AS_RESOLUTION_X'))
		extra_data['AS_RESOLUTION_Y'] = int(allsky_shared.get_environment_variable('AS_RESOLUTION_Y'))
		extra_data['AS_EXPOSURE_US'] = int(allsky_shared.get_environment_variable('AS_EXPOSURE_US'))
		extra_data['AS_GAIN'] = allsky_shared.get_camera_gain()
		extra_data['AS_TEMPERATURE_C'] = allsky_shared.get_sensor_temperature()
		extra_data['AS_MEAN'] = float(allsky_shared.get_environment_variable('AS_MEAN'))

		allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'], event=self.event)

		try:
			self._cleanup_module_data()
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Cannot cleanup extra module data in allsky_loadimage.py on line {eTraceback.tb_lineno} - {e}'
			self.log(0,f'ERROR: {result}')  

		self._dump_debug_data()
  
		self.log(4, f'INFO: {result}')
		return result        

def loadimage(params, event):
	allsky_load_image = ALLSKYLOADIMAGE(params, event)
	result = allsky_load_image.run()

	return result
