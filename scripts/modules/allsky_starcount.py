'''
allsky_starcount.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module attempts to count the number of stars in an image

Expected parameters:
None
'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import os
import sys

class ALLSKYSTARCOUNT(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Star Count",
		"description": "Counts stars in an image",
		"events": [
			"night"
		],
		"experimental": "true",
		"module": "allsky_starcount",
		"version": "v1.0.2",
		"testable": "false",
		"testableresult": "images",
		"centersettings": "false",
		"extradatafilename": "allsky_starcount.json",
		"group": "Image Analysis",  
        "graphs": {
            "chart1": {
				"icon": "fa-solid fa-chart-line",
				"title": "Stars",
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
						"text": "Stars"
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
								"text": "Count"
							},
							"min": 0
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
					"count": {
						"name": "Star Count",
						"yAxis": 0,
						"variable": "AS_STARCOUNT|AS_STARIMAGEURL"                 
					}            
				}
			}
		}, 
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_stars"
			}, 
			"values": {
				"AS_STARIMAGE": {
					"name": "${STARIMAGE}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with stars",
					"type": "string"
				},
				"AS_STARIMAGEPATH": {
					"name": "${STARIMAGEPATH}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with stars Path",
					"type": "string"
				},
				"AS_STARIMAGEURL": {
					"name": "${STARIMAGEURL}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "Image with stars URL",
					"type": "string"
				},
				"AS_STARCOUNT": {
					"name": "${STARCOUNT}",
					"format": "",
					"sample": "",                
					"group": "Image Data",
					"description": "STAR COUNT",
					"type": "number"
				}
			}
		},     
		"arguments":{
			"annotate": "false",
			"scalefactor": "0.5",
			"mask": "",
			"debugimage": "",
			"useclearsky": "False"
		},
		"argumentdetails": {    
			"mask" : {
				"required": "false",
				"description": "Mask Path",
				"help": "The name of the image mask. This mask is applied when counting stars but not visible in the final image. <span class=\"text-danger\">NOTE: It is highly recommened you create a mask to improve the detection performance</span>",
				"type": {
					"fieldtype": "image"
				}                
			},
			"scalefactor" : {
				"required": "false",
				"description": "Scale Factor",
				"help": "Amount to scale the captured image by before attempting meteor detection",
				"type": {
					"fieldtype": "spinner",
					"min": ".25",
					"max": "1",
					"step": "0.05"
				}     
			}, 
			"useclearsky" : {
				"required": "false",
				"description": "Use Clear Sky",
				"help": "If available, use the results of the Clear Sky Alarm module. If the sky is not clear star detection will be skipped",         
				"type": {
					"fieldtype": "checkbox"
				}          
			},              
			"annotate" : {
				"required": "false",
				"description": "Annotate Stars",
				"help": "If selected, the identified stars in the image will be highlighted",
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
			},
			"graph": {
				"required": "false",
				"tab": "History",
				"type": {
					"fieldtype": "graph"
				}
			}                 
		},
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

	def _resize_image(self, image, scale=0.5):
		height, width = image.shape[:2]
		new_size = (int(width * scale), int(height * scale))
		resized = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)

		return resized

	def run(self):
		
		try:
			result = ''

			annotate_image = self.get_param('annotate', False, bool)
			mask_file_name = self.get_param('mask', '', str)
			scale = self.get_param('scalefactor', 0.5, float)

			source_image = allsky_shared.image
			image = self._resize_image(source_image, scale)

			sources, image = allsky_shared.count_starts_in_image(image, mask_file_name)

			if sources is not None:
				result = f"Number of stars detected: {len(sources)}"
				self.log(f'INFO: {result}')

				if sources is not None and annotate_image:
					for i, row in enumerate(sources):
						x = round(float(row['xcentroid']))
						y = round(float(row['ycentroid']))

						cv2.circle(source_image, (x, y), 20, (0, 0, 255), 2)
					allsky_shared.image = source_image
			
				extra_data = {}
				filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
				date = filename[6:14]
				url = f'/images/{date}/thumbnails/{filename}'
			
				extra_data = {}
				extra_data['AS_STARIMAGE'] = filename
				extra_data['AS_STARIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
				extra_data['AS_STARIMAGEURL'] = url
				extra_data['AS_STARCOUNT'] = len(sources)
				allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])
			else:
				allsky_shared.delete_extra_data(self.meta_data['extradatafilename'])
				result = 'No stars detected.'
				self.log(f'INFO: {result}')

		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Module Star Count failed on line {eTraceback.tb_lineno} - {e}'
			allsky_shared.log(0,f'ERROR: {result}')

		return result


def starcount(params, event):
	allsky_starcount = ALLSKYSTARCOUNT(params, event)
	result = allsky_starcount.run()

	return result     
         
def starcount_cleanup():
	module_data = {
	    "metaData": ALLSKYSTARCOUNT.meta_data,
	    "cleanup": {
			"files": {
				ALLSKYSTARCOUNT.meta_data["extradatafilename"]
			}
	    }
	}
	allsky_shared.cleanupModule(module_data)
