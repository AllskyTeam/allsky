'''
allsky_clearsky.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import sys
from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder

class ALLSKYCLEARSKY(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Clear Sky Alarm",
		"description": "Clear Sky Alarm",
		"module": "allsky_clearsky",
		"version": "v1.0.2",
		"extradatafilename": "allsky_clearsky.json",
		"events": [
			"day",
			"night"
		],
		"experimental": "true",
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Sky State",
				"group": "Analysis",
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
						"text": "Sky State"
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
								"text": "Sky State"
							} 
						},
						{ 
							"title": {
								"text": "Star Count"
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
					"state": {
						"name": "Sky State",
						"yAxis": 0,
						"variable": "AS_CLEARSKYSTATEFLAG"                 
					},
					"state": {
						"name": "Star Count",
						"yAxis": 1,
						"variable": "AS_CLEARSKYSTATESTARS"                 
					}          
				}
			}
		}, 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_clearsky"
			}, 
			"values": {
				"AS_CLEARSKYSTATE": {
					"name": "${CLEARSKYSTATE}",
					"format": "",
					"sample": "",
					"group": "Environment",
					"description": "Sky State",
					"type": "string"
				},
				"AS_CLEARSKYSTATEFLAG": {
					"name": "${CLEARSKYSTATEFLAG}",
					"format": "",
					"sample": "",
					"group": "Environment",
					"description": "Sky State Boolean, 0=Cloudy, 1=Clear",
					"type": "bool"
				},
				"AS_CLEARSKYSTATESTARS": {
					"name": "${CLEARSKYSTATESTARS}",
					"format": "",
					"sample": "",                
					"group": "Environment",
					"description": "Sky State Star Count",
					"type": "number"
				}
			}
		}, 
		"arguments":{
			"annotate": "false",
			"clearvalue": 10,
			"roi": "",
			"roifallback": 5,
			"debugimage": ""
		},
		"argumentdetails": {
			"roi": {
				"required": "false",
				"description": "Region of Interest",
				"help": "The area of the image to check for clear skies. Format is x1,y1,x2,y2",
				"type": {
					"fieldtype": "roi"
				}
			},
			"roifallback" : {
				"required": "true",
				"description": "Fallback %",
				"help": "If no ROI is set then this % of the image, from the center will be used",
				"type": {
					"fieldtype": "spinner",
					"min": 1,
					"max": 100,
					"step": 1
				}
			},
			"clearvalue" : {
				"required": "true",
				"description": "Clear Sky",
				"help": "If more than this number of stars are found the sky will be considered clear",
				"type": {
					"fieldtype": "spinner",
					"min": 1,
					"max": 1000,
					"step": 1
				}
			},
			"annotate" : {
				"required": "false",
				"description": "Annotate Stars",
				"help": "If selected the identified stars in the image will be highlighted",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"debugimage" : {
				"required": "false",
				"description": "Debug Image",
				"help": "Image to use for debugging. DO NOT set this unless you know what you are doing",
				"tab": "Debug"
			}
		},
		"enabled": "false",
		"changelog": {
			"v1.0.0" : [
				{
					"author": "Alex Greenland",
					"authorurl": "https://github.com/allskyteam",
					"changes": "Initial Release"
				}
			],
			"v1.0.2" : [
				{
					"author": "Alex Greenland",
					"authorurl": "https://github.com/allskyteam",
					"changes": [
						"Updates for the new module manager structure"
					]
				}
			]                                                          
		}
	}
    
	def run(self):
		try:
			roi_str = self.get_param('roi', '', str, True)
			roi_percent = self.get_param('roifallback', 10, int) / 100
			annotate_image = self.get_param('annotate', False, bool)
			clear_value = self.get_param('clearvalue', 10, int)

			found_stars = 0
			sky_state = 'Not Clear'
	
			image = allsky_shared.image
			height, width = image.shape[:2]

			if roi_str.strip():
				roi_x, roi_y, roi_w, roi_h = map(int, roi_str.split(','))
				self.log(f'INFO: Using roi of {roi_x},{roi_y},{roi_w},{roi_h}')
			else:
				roi_w = int(width * roi_percent)
				roi_h = int(height * roi_percent)
				roi_x = (width - roi_w) // 2
				roi_y = (height - roi_h) // 2
				self.log(f'INFO: Using roi % of {roi_percent} and roi of {roi_x},{roi_y},{roi_w},{roi_h}')

			if image.ndim == 3:
				gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
				self.log('INFO: Converted image to grayscale')
			else:
				gray = image

			roi_image = gray[roi_y:roi_y + roi_h, roi_x:roi_x + roi_w]
			image_data = roi_image.astype(float)

			sources, image = allsky_shared.count_starts_in_image(image_data, annotate_image)

			if sources is not None:
				found_stars = len(sources)
				self.log(f'INFO: Number of stars detected in ROI: {len(sources)}')

				if annotate_image:
					for i, row in enumerate(sources):
						x = int(row['xcentroid'] + roi_x)
						y = int(row['ycentroid'] + roi_y)

						self.log(f'INFO: star {i}, x={x}, y={y}')

						cv2.circle(allsky_shared.image, (x, y), 20, (0, 0, 255), 2)
			else:
				self.log(f'INFO: No stars detected in ROI')

			if annotate_image:
				cv2.rectangle(allsky_shared.image, (roi_x, roi_y), (roi_x + roi_w, roi_y + roi_h), (255, 255, 0), 2)

			if found_stars > clear_value:
				sky_state = 'Clear'

			extra_data = {}
			extra_data['AS_CLEARSKYSTATE'] = sky_state
			extra_data['AS_CLEARSKYSTATESTARS'] = found_stars
			extra_data['AS_CLEARSKYSTATEFLAG'] = 1 if sky_state.strip().lower() == "clear" else 0
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])

			result = f'Sky is {sky_state} with {found_stars} stars detected in the ROI'
			self.log(f'INFO: {result}')
		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Module allsky_clearsky failed on line {eTraceback.tb_lineno} - {e}'
			allsky_shared.log(0,f'ERROR: {result}')
   
		return result

def clearsky(params, event):
	allsky_clear_sky = ALLSKYCLEARSKY(params, event)
	result = allsky_clear_sky.run()

	return result

def clearsky_cleanup():
	module_data = {
	    "metaData": ALLSKYCLEARSKY.meta_data,
	    "cleanup": {
			"files": {
				ALLSKYCLEARSKY.meta_data["extradatafilename"]
			}
	    }
	}
	allsky_shared.cleanupModule(module_data)
