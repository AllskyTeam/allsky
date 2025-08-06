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
				"table": "allsky_camera"
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
				"AS_CAMERAIMAGEPATH": {
					"name": "${CAMERAIMAGEPATH}",
					"format": "",
					"sample": "",                
					"group": "Camera",
					"description": "Current Image Path",
					"type": "string"
				},
				"AS_CAMERAIMAGEURL": {
					"name": "${CAMERAIMAGEURL}",
					"format": "",
					"sample": "",                
					"group": "Camera",
					"description": "Current Image URL",
					"type": "string"
				},
				"AS_CAMERAEXPOSURE": {
					"name": "${CAMERAEXPOSURE}",
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

			allsky_shared.log(4, f"INFO: Debug information written to {debug_filename}")
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			allsky_shared.log(0, f'ERROR: Unable to access {debug_filename}. {eTraceback.tb_lineno} - {e}')     
     
	def run(self):
		result = f'Image {allsky_shared.CURRENTIMAGEPATH} Loaded'
			
		try:
			allsky_shared.image = cv2.imread(allsky_shared.CURRENTIMAGEPATH)
			if allsky_shared.image is None:
				allsky_shared.log(0, f'ERROR: Cannot read {allsky_shared.CURRENTIMAGEPATH}...', exitCode=1)
		except Exception as e:
			allsky_shared.log(0, f'ERROR: Cannot load {allsky_shared.CURRENTIMAGEPATH}: {e}', exitCode=1)

		filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
		date = filename[6:14]
		url = f'/images/{date}/thumbnails/{filename}'
    
		extra_data = {}
		extra_data['AS_CAMERAIMAGE'] = filename
		extra_data['AS_CAMERAIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
		extra_data['AS_CAMERAIMAGEURL'] = url
		extra_data['AS_CAMERAEXPOSURE'] = int(allsky_shared.get_environment_variable('AS_EXPOSURE_US'))
		extra_data['AS_CAMERAGAIN'] = allsky_shared.get_camera_gain()
		extra_data['AS_CAMERATEMPERATURE'] = allsky_shared.get_sensor_temperature()

		allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'])

		try:
			self._cleanup_module_data()
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Cannot cleanup extra module data {eTraceback.tb_lineno} - {e}'
			allsky_shared.log(0,f'ERROR: {result}')  

		self._dump_debug_data()
  
		allsky_shared.log(4, f'INFO: {result}')
		return result        

def loadimage(params, event):
	allsky_load_image = ALLSKYLOADIMAGE(params, event)
	result = allsky_load_image.run()

	return result  