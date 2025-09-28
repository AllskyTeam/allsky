'''
allsky_loadimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will load the last captured image into the shared module
allowing it to be passed between modules

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import os
import sys

class ALLSKYLOADIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Loads the latest image",
		"description": "Loads the last captured image",
		"module": "allsky_loadimage",
		"ignorewatchdog": "True",
		"extradatafilename": "allsky_camera.json",
		"group": "Allsky Core",
		"events": [
			"day",
			"night"
		],
        "graphs": {
			"chart1": {
				"icon": "fas fa-chart-line",
				"title": "Camera",
				"group": "Camera",
				"main": "true",
				"config": {
					"tooltip": "true",
					"chart": {
						"type": "spline",
						"zooming": {
							"type": "x"
						}
					},
					"title": {
						"text": "Camera"
					},
					"plotOptions": {
						"series": {
							"animation": "false"
						}
					},
					"xAxis": {
						"type": "datetime",
						"dateTimeLabelFormats": {
							"day": "%Y-%m-%d",
							"hour": "%H:%M"
						}
					},
					"yAxis": [
						{
							"title": {
								"text": "Exposure"
							}
						},
						{
							"title": {
								"text": "Gain"
							},
							"opposite": "true"
						}
					],
					"lang": {
						"noData": "No data available"
					},
					"noData": {
						"style": {
							"fontWeight": "bold",
							"fontSize": "16px",
							"color": "#666"
						}
					}
				},
				"series": {
					"exposure": {
						"name": "Exposure",
						"yAxis": 0,
						"variable": "AS_CAMERAEXPOSURE|AS_CAMERAIMAGEURL"
					},
					"gain": {
						"name": "Gain",
						"yAxis": 1,
						"variable": "AS_CAMERAGAIN"
					}
				}
			},
			"temp": {
				"icon": "fas fa-chart-line",
				"title": "Camera Temperature",
				"group": "Camera",
				"main": "true",
				"config": {
					"tooltip": "true",
					"chart": {
						"type": "spline",
						"zooming": {
							"type": "x"
						}
					},
					"title": {
						"text": "Camera Temperature"
					},
					"plotOptions": {
						"series": {
							"animation": "false"
						}
					},
					"xAxis": {
						"type": "datetime",
						"dateTimeLabelFormats": {
							"day": "%Y-%m-%d",
							"hour": "%H:%M"
						}
					},
					"yAxis": [
						{
							"title": {
								"text": "Temperature"
							}
						}
					],
					"lang": {
						"noData": "No data available"
					},
					"noData": {
						"style": {
							"fontWeight": "bold",
							"fontSize": "16px",
							"color": "#666"
						}
					}
				},
				"series": {
					"exposure": {
						"name": "Temperature",
						"yAxis": 0,
						"variable": "AS_CAMERATEMPERATURE|AS_CAMERAIMAGEURL"
					}
				}
			}
        },
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_camera",
				"row_type": "int",
    			"include_all": "true",
       			"time_of_day_save": {
					"day": "enabled",
					"night": "enabled",
					"nightday": "never",
					"daynight": "never",
					"periodic": "never"
				}
			},
			"values": {
				"AS_CAMERAIMAGE": {
					"name": "${CAMERAIMAGE}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Current Image",
					"type": "string"
				},
				"AS_DAY_NIGHT": {
					"name": "${DAY_OR_NIGHT}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Day / night flag",
					"type": "string"
				},
				"AS_AUTOEXPOSURE": {
					"name": "${AUTOEXPOSURE}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Autoexposure enabled?",
					"type": "bool"
				},
				"AS_AUTOGAIN": {
					"name": "${AUTOGAIN}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Autogain enabled?",
					"type": "bool"
				},
				"AS_RESOLUTION_X": {
					"name": "${RESOLUTION_X}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Width of image in pixels",
					"type": "int"
				},
				"AS_RESOLUTION_Y": {
					"name": "${RESOLUTION_Y}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Height of image in pixels",
					"type": "int"
				},
				"AS_CAMERAIMAGEURL": {
					"name": "${CAMERAIMAGEURL}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Current Image URL",
					"type": "string"
				},
				"AS_CAMERAEXPOSURE_US": {
					"name": "${CAMERAEXPOSURE_US}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Exposure",
					"type": "number"
				},
				"AS_CAMERAGAIN": {
					"name": "${CAMERAGAIN}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Exposure",
					"type": "number"
				},
				"AS_CAMERATEMPERATURE": {
					"name": "${CAMERATEMPERATURE}",
					"format": "",
					"sample": "",
					"group": "Camera",
					"description": "Exposure",
					"type": "temperature"
				},
				"AS_MEAN": {
					"name": "${MEAN}",
					"format": "",
					"sample": "",                
					"group": "Camera",
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
		date = filename[6:14]
		url = f'/images/{date}/thumbnails/{filename}'

		extra_data = {}
		extra_data['AS_CAMERAIMAGE'] = filename
		extra_data['AS_DAY_NIGHT'] = allsky_shared.get_environment_variable('DAY_OR_NIGHT')
		extra_data['AS_MEAN'] = float(allsky_shared.get_environment_variable('AS_MEAN'))
		extra_data['AS_AUTOEXPOSURE'] = bool(allsky_shared.get_environment_variable('AS_AUTOEXPOSURE'))
		extra_data['AS_AUTOGAIN'] = bool(allsky_shared.get_environment_variable('AS_AUTOGAIN'))
		extra_data['AS_RESOLUTION_X'] = int(allsky_shared.get_environment_variable('AS_RESOLUTION_X'))
		extra_data['AS_RESOLUTION_Y'] = int(allsky_shared.get_environment_variable('AS_RESOLUTION_Y'))
		extra_data['AS_CAMERAIMAGEURL'] = url
		extra_data['AS_CAMERAEXPOSURE_US'] = int(allsky_shared.get_environment_variable('AS_EXPOSURE_US'))
		extra_data['AS_CAMERAGAIN'] = allsky_shared.get_camera_gain()
		extra_data['AS_CAMERATEMPERATURE'] = allsky_shared.get_sensor_temperature()
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
