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
class ALLSKYLOADIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Loads the latest image",
		"description": "Loads the last captured image",
		"module": "allsky_loadimage",
		"ignorewatchdog": "True",
		"extradatafilename": "allsky_camera.json",  
		"events": [
			"day",
			"night"
		],
        "graphs": {
            "chart1": {
				"icon": "fas fa-camera",
				"title": "Camera",
				"group": "Camera",
				"main": "true",
				"config": {
					"title": {
						"text": "Camera"
					},
					"tooltip": {
						"trigger": "axis",
						"axisPointer": {
							"type": "cross"
						}
					},
					"legend": {
						"show": "true"
					},
					"xAxis": {
						"type": "time"
					},
					"yAxis": [
						{
							"name": "Exposure",
							"type": "value",
							"alignTicks": "true",
							"splitLine": {
								"show": "true",
								"lineStyle": {
									"width": 1,
									"color": "#444",
									"type": "dashed"
								}
							}
						},
						{
							"name": "Gain",
							"type": "value",
							"alignTicks": "true",
							"splitLine": {
								"show": "true",
								"lineStyle": {
									"width": 1,
									"color": "#444",
									"type": "dashed"
								}
							}
						}
					],
					"animation": "false"
				},
				"series": {
					"exposure": {
						"name": "Exposure",
						"yAxisIndex": 0,
						"type": "line",
                        "smooth": "true",
                        "connectNulls": "false",
						"variable": "AS_CAMERAEXPOSURE"                 
					},
					"gain": {
						"name": "Gain",
						"yAxisIndex": 1,
						"type": "line",
                        "smooth": "true",
                        "connectNulls": "false",                     
						"variable": "AS_CAMERAGAIN"                 
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
				}  
			}                         
		}          
	}    

	def run(self):
		result = f'Image {allsky_shared.CURRENTIMAGEPATH} Loaded'
			
		try:
			allsky_shared.image = cv2.imread(allsky_shared.CURRENTIMAGEPATH)
			if allsky_shared.image is None:
				allsky_shared.log(0, f'ERROR: Cannot read {allsky_shared.CURRENTIMAGEPATH}...', exitCode=1)
		except Exception as e:
			allsky_shared.log(0, f'ERROR: Cannot load {allsky_shared.CURRENTIMAGEPATH}: {e}', exitCode=1)


		filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
		extra_data = {}
		extra_data['AS_CAMERAIMAGE'] = filename
		extra_data['AS_CAMERAEXPOSURE'] = int(allsky_shared.get_environment_variable('AS_EXPOSURE_US'))
		extra_data['AS_CAMERAGAIN'] = 0

		allsky_shared.save_extra_data(self.meta_data['extradatafilename'], extra_data, self.meta_data['module'], self.meta_data['extradata'])


		allsky_shared.log(4, f'INFO: {result}')
		return result        

def loadimage(params, event):
	allsky_load_image = ALLSKYLOADIMAGE(params, event)
	result = allsky_load_image.run()

	return result  