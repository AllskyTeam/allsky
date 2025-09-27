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
import numpy as np
from typing import Literal

class ALLSKYSTARCOUNT(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Star Count",
		"description": "Counts stars in an image",
		"events": [
			"day",
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
					"type": "number",
					"database": {
						"include" : "true"
					}     
				}
			}
		},     
		"arguments":{
			"annotate": "false",
			"scalefactor": "0.5",
			"mask": "",
			"debugimage": "",
			"useclearsky": "False",
			"minsize": "6",
			"method": "Fast"
		},
		"argumentdetails": {    
			"useclearsky" : {
				"required": "false",
				"description": "Use Clear Sky",
				"help": "If available, use the results of the Clear Sky Alarm module. If the sky is not clear star detection will be skipped",         
				"type": {
					"fieldtype": "checkbox"
				}          
			},
   
			"method" : {
				"required": "false",
				"description": "Detection Method",
				"help": "The detection method, Fast is quicker but may miss some stars, Slow is more accurate but takes longer",
				"tab": "Method",
				"type": {
					"fieldtype": "select",
					"values": "Fast,Slow",
					"default": "Fast"
				}
			},
			"mask" : {
				"required": "false",
				"description": "Mask Path",
				"help": "The name of the image mask. <span class=\"text-danger\">NOTE: It is highly recommened you create a mask to improve the detection performance</span>",
				"tab": "Method",
				"type": {
					"fieldtype": "image"
				}                
			},
			"scalefactor" : {
				"required": "false",
				"description": "Scale Factor",
				"help": "Amount to scale the captured image by before attempting meteor detection",
				"tab": "Method",    
				"type": {
					"fieldtype": "spinner",
					"min": ".25",
					"max": "1",
					"step": "0.05"
				},
				"filters": {
					"filter": "method",
					"filtertype": "show",
					"values": [
						"Fast"
					]
				}    
			}, 
			"minsize" : {
				"required": "false",
				"description": "Min star size (px)",
				"help": "The mnimum size of a star in pixels. Smaller stars will be ignored",
				"tab": "Method",    
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "10",
					"step": "1"
				},
				"filters": {
					"filter": "method",
					"filtertype": "show",
					"values": [
						"Fast"
					]
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

	def _process_image(
    	self, image: np.ndarray | None, 
      	is_debug_image: bool = False
    ) -> np.ndarray | None:
     
		detection_method = self.get_param('method', 'Fast', str)
		mask_file_name = self.get_param('mask', '', str)
		annotate_image = self.get_param('annotate', False, bool)
		scale = self.get_param('scalefactor', 0.5, float)
                 
		image_copy = image.copy()
     
		if mask_file_name:
			image_copy = allsky_shared.mask_image(image_copy, mask_file_name)

		if detection_method == "Fast":
			min_size = self.get_param('minsize', 6, int)

			self.log(f'INFO: Using fast detection method')
			sources = allsky_shared.fast_star_count(
				image_copy,
				min_d_px = min_size,    # ~star core diameter in pixels (5–8)
				scale = scale,          # downscale for speed (0.5 good for 1080p)
				corr_thresh = 0.78,     # template match threshold (0..1)
				min_peak_contrast = 12, # center minus local ring (uint8)
				anisotropy_min = 0.45,  # 0..1 (λ_min/λ_max) – low => edge-like
				mask_bottom_frac = 0.12 # ignore lowest X% (horizon glow)
			)
		else:
			self.log(f'INFO: Using slow detection method')
			sources, _ = allsky_shared.count_starts_in_image(image_copy)

		if annotate_image:
			if sources is not None:
				for i, row in enumerate(sources):
					x = round(float(row[0])) * 1
					y = round(float(row[1])) * 1
					cv2.circle(image, (x, y), 10, (0, 0, 255), 1)

			if is_debug_image:
				save_name = allsky_shared.get_environment_variable("ALLSKY_CURRENT_DIR")
				save_name = f"{save_name}/debug_starcount.png"
				cv2.imwrite(save_name, image)  
   
		return image, sources

	def run(self):
		
		try:
			result = ''
			debug_image_path = self.get_param('debugimage', None, str)

			if debug_image_path is not None and debug_image_path != '':
				if allsky_shared.is_file_readable(debug_image_path):
					self.log(f'INFO: Using debug image {debug_image_path}')
					debug_image = cv2.imread(debug_image_path)
					debug_image, sources = self._process_image(debug_image, True)
			else:
				source_image = allsky_shared.image
				source_image, sources = self._process_image(source_image, False)
    
			if sources is not None:
				result = f"Number of stars detected: {len(sources)}"
				self.log(f'INFO: {result}')

				if not debug_image_path:
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
			self.log(0,f'ERROR: {result}')

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
