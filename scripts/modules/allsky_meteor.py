#TODO: Fix events
""" allsky_meteor.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module attempts to locate meteors in a captured image.
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os

class ALLSKYMETEOR(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Meteor Detection",
		"description": "Detect and report on meteors (i.e., streaks) in an image.",
		"events": [
			"night"
		],
		"module": "allsky_meteor",
		"centersettings": "false",
		"extradatafilename": "allsky_meteor.json",
		"group": "Image Analysis",
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_meteors",
    			"pk": "id",
    			"pk_source": "image_timestamp",
    			"pk_type": "int",
           		"include_all": "false"       
			},
			"values": {
				"AS_METEORIMAGE": {
					"name": "${METEORIMAGE}",
					"format": "",
					"sample": "",
					"group": "Added Image Data",
					"description": "Image with meteors",
					"type": "string",
					"database": {
						"include" : "true"
					}     
				},
				"AS_METEORIMAGEPATH": {
					"name": "${METEORIMAGEPATH}",
					"format": "",
					"sample": "",
					"group": "Added Image Data",
					"description": "Image with meteors Path",
					"type": "string"
				},
				"AS_METEORIMAGEURL": {
					"name": "${METEORIMAGEURL}",
					"format": "",
					"sample": "",
					"group": "Added Image Data",
					"description": "Image with meteors URL",
					"type": "string"
				},
				"AS_METEORCOUNT": {
					"name": "${METEORCOUNT}",
					"format": "",
					"sample": "",
					"group": "Added Image Data",
					"description": "METEOR COUNT",
					"type": "number",
					"database": {
						"include" : "true"
					}     
				}
			}
		},
		"arguments": {
			"mask": "",
			"annotatemain": "false",
			"enabledebug": "false",
			"useclearsky": "false",
			"minlength": "100"
		},
		"argumentdetails": {
			"useclearsky": {
				"required": "false",
				"description": "Use Clear Sky",
				"tab": "General",
				"help": "If installed use the results of the <b>Clear Sky Indicator</b> module. Meteor detections is skipped if the sky is not clear.",
				"type": {
					"fieldtype": "checkbox"
				}
			},      
			"mask": {
				"required": "false",
				"description": "Mask Path",
				"tab": "General",
				"help": "The name of the image mask used to 'hide' non-sky parts of the image (trees, etc.). This mask is not visible in the final image.",
				"type": {
					"fieldtype": "mask"
				}
			},
			"minlength" : {
				"required": "false",
				"description": "Min Length",
				"help": "Minimum length for a meteor",
				"tab": "General",           
				"type": {
					"fieldtype": "spinner",
					"min": 10,
					"max": 5000,
					"step": 1
				}
			},   
			"enabledebug": {
				"required": "false",
				"description": "Enable debug mode",
				"help": "Enables various options to assist in debugging meteor detection.",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"annotatemain": {
				"description": "Annotate Main",
				"help": "Annotate the main captured image",
				"tab": "Debug",    
				"type": {
					"fieldtype": "checkbox"             
				},
				"filters": {
					"filter": "enabledebug",
					"filtertype": "show",
					"values": [
						"enabledebug"
					]
				}                 
			},    
			"graph": {
				"required": "false",
				"tab": "History",
				"type": {
					"fieldtype": "graph"
				}
			}
		}
	}

	def run(self):
		debug_mode = self.get_param('enabledebug', False, bool)
		annotate_image = self.get_param('annotatemain', False, bool)
		mask_file_name = self.get_param('mask', '', str)
		min_length = self.get_param('minlength', 100, int)

		source_image = allsky_shared.image
		if mask_file_name:
			image_copy = allsky_shared.mask_image(source_image, mask_file_name)
			self.log(4, f"INFO: Applied mask {mask_file_name} to captured image")
		else:
			image_copy = source_image
			self.log(4, "INFO: Using full captured image")
   
		source_image = allsky_shared.image
		detections = allsky_shared.detect_meteors(image_copy, min_len_px=min_length)

		if len(detections) > 0:
			if debug_mode and annotate_image:
				allsky_shared.image = allsky_shared.draw_detections(allsky_shared.image, detections)
			extra_data = {}
			filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
			date = filename[6:14]
			url = f'/images/{date}/thumbnails/{filename}'
		
			extra_data = {}
			extra_data['AS_METEORIMAGE'] = filename
			extra_data['AS_METEORIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
			extra_data['AS_METEORIMAGEURL'] = url
			extra_data['AS_METEORCOUNT'] = len(detections)
			result = f"{len(detections)} Meteors detected"
			self.log(4, f"INFO: {result}")
		else:
			extra_data = {}
			extra_data['AS_METEORIMAGE'] = ''
			extra_data['AS_METEORIMAGEPATH'] = ''
			extra_data['AS_METEORIMAGEURL'] = ''
			extra_data['AS_METEORCOUNT'] = 0
			result = "No Meteors detected"
			self.log(4, "INFO: {result}")
      		
		allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'], event=self.event)

		return result

def meteor(params, event):
	allsky_meteor = ALLSKYMETEOR(params, event)
	result = allsky_meteor.run()

	return result

def meteor_cleanup():
	moduleData = {
		"metaData": ALLSKYMETEOR.meta_data,
		"cleanup": {
			"files": {
				ALLSKYMETEOR.meta_data['extradatafilename']
			},
			"env": {}
		}
	}
	allsky_shared.cleanupModule(moduleData)
