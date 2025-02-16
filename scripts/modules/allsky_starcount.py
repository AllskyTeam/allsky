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
import os
import math
import cv2
import json
import numpy as np
from math import sqrt


class ALLSKYSTARCOUNT(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Star Count",
		"description": "Counts stars in an image",
		"events": [
			"night"
		],
		"experimental": "true",
		"module": "allsky_starcount",
		"testable": "true",
		"testableresult": "images",
		"centersettings": "false",
		"extradatafilename": "allsky_starcount.json",  
		"extradata": {
			"values": {
				"AS_STARCOUNT": {
					"name": "${STARCOUNT}",
					"format": "",
					"sample": "",                
					"group": "Stars",
					"description": "Number of stars",
					"type": "Number"
				}
			}
		},     
		"arguments":{
			"detectionThreshold": 0.55,
			"distanceThreshold": 20,
			"annotate": "false",
			"template1": 6,
			"mask": "",
			"debug": "false",
			"debugimage": "",
			"useclearsky": "False"
		},
		"argumentdetails": {
			"detectionThreshold" : {
				"required": "true",
				"description": "Detection Threshold",
				"help": "The limit at which stars will be detected",
				"type": {
					"fieldtype": "spinner",
					"min": 0.05,
					"max": 1,
					"step": 0.01
				}
			},
			"distanceThreshold" : {
				"required": "true",
				"description": "Distance Threshold",
				"help": "Stars within this number of pixels of another star will not be counted. Helps to reduce errors in the count",
				"type": {
					"fieldtype": "spinner",
					"min": 0,
					"max": 100,
					"step": 1
				}          
			},
			"template1" : {
				"required": "true",
				"description": "Star Template size",
				"help": "Size in pixels of the first star template",
				"type": {
					"fieldtype": "spinner",
					"min": 0,
					"max": 100,
					"step": 1
				}          
			},          
			"mask" : {
				"required": "false",
				"description": "Mask Path",
				"help": "The name of the image mask. This mask is applied when counting stars bit not visible in the final image. <span class=\"text-danger\">NOTE: It is highly recommened you create a mask to improve the detection performance</span>",
				"type": {
					"fieldtype": "image"
				}                
			},
			"useclearsky" : {
				"required": "false",
				"description": "Use Clear Sky",
				"help": "If available use the results of the clear sky module. If the sky is not clear meteor detection will be skipped",         
				"type": {
					"fieldtype": "checkbox"
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
			"debug" : {
				"required": "false",
				"description": "Enable debug mode",
				"help": "If selected each stage of the detection will generate images in the allsky tmp debug folder",
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
		}          
	}

 
	def __create_star_template(self, star_size, debug):
		star_template_size = star_size * 4
		if (star_template_size % 2) != 0:
			star_template_size += 1

		starTemplate = np.zeros([star_template_size, star_template_size], dtype=np.uint8)
		cv2.circle(
			img=starTemplate,
			center=(allsky_shared.int(star_template_size/2), allsky_shared.int(star_template_size/2)),
			radius=allsky_shared.int(star_size/2),
			color=(255, 255, 255),
			thickness=cv2.FILLED,
		)

		starTemplate = cv2.blur(
			src=starTemplate,
			ksize=(3, 3)
		)

		if debug:
			allsky_shared.writeDebugImage(metaData['module'], f'star-template-{star_size}.png', starTemplate)

		return starTemplate

	def run(self):
		star_count = 0
       
		raining, rain_flag = allsky_shared.raining()
		sky_state, sky_clear = allsky_shared.skyClear()

		use_clear_sky = self.get_param('useclearsky', False, bool)
		if not use_clear_sky:
			sky_clear = True

		if not rain_flag:
			if sky_clear:        
				detection_threshold = self.get_param('detectionThreshold', 0, float)
				distance_threshold = self.get_param('distanceThreshold', 0, float)
				mask = self.get_param('mask', '', str)
				annotate = self.get_param('annotate', 0, bool)
				star_template_1_size = self.get_param('template1', 0, int)
				debug = self.get_param('debug', 0, bool)
				debug_image = self.get_param('debugimage', '', str)
                      
				using_debug_image = False
				if debug_image != "":
					image = cv2.imread(debug_image)
					if image is None:
						image = allsky_shared.image
						allsky_shared.log(4, f'WARNING: Debug image set to {debug_image} but cannot be found, using latest allsky image')
					else:
						using_debug_image = True
						allsky_shared.log(4, f'WARNING: Using debug image {debug_image}')
				else:
					image = allsky_shared.image

				if debug:
					allsky_shared.startModuleDebug(metaData['module'])

				if len(image) == 2:
					gray_image = image
				else:
					gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
				
				if debug:
					allsky_shared.writeDebugImage(metaData['module'], 'a-greyscale-image.png', gray_image)

				image_mask = None
				if mask != "":
					mask_path = os.path.join(allsky_shared.ALLSKY_OVERLAY, 'images', mask)
					image_mask = cv2.imread(mask_path,cv2.IMREAD_GRAYSCALE)
					if debug:
						allsky_shared.writeDebugImage(metaData['module'], 'b-image-mask.png', image_mask) 


				star_template = self.__create_star_template(star_template_1_size, debug)

				if image_mask is not None:
					if gray_image.shape == image_mask.shape:
						gray_image = cv2.bitwise_and(src1=gray_image, src2=image_mask)
						if debug:
							allsky_shared.writeDebugImage(metaData['module'], 'h-masked-image.png', gray_image)                   
					else:
						allsky_shared.log(0, 'ERROR: Source image and mask dimensions do not match.')
						imageLoaded = False

				detected_image_clean = gray_image.copy()
				source_image_copy = gray_image.copy()
				
				star_list = list()

				template_width, template_height = star_template.shape[::-1]

				try:
					result = cv2.matchTemplate(source_image_copy, star_template, cv2.TM_CCOEFF_NORMED)
				except:
					allsky_shared.log(0, 'ERROR: Star template match failed')
				else:
					loc = np.where(result >= detection_threshold)

					for pt in zip(*loc[::-1]):
						for star in star_list:
							distance = sqrt(((pt[0] - star[0]) ** 2) + ((pt[1] - star[1]) ** 2))
							if (distance < distance_threshold):
								break
						else:
							star_list.append(pt)

					wOffset = allsky_shared.int(template_width/2)
					hOffset = allsky_shared.int(template_height/2)

					if annotate:
						for star in star_list:
							if using_debug_image:
								allsky_shared.log(4, f'{star[0] + wOffset}, {star[1] + hOffset}')
								cv2.circle(image, (star[0] + wOffset, star[1] + hOffset), 10, (0, 0, 255), 5)
							else:
								cv2.circle(allsky_shared.image, (star[0] + wOffset, star[1] + hOffset), 10, (0, 0, 255), 5)

				if debug:
					allsky_shared.writeDebugImage(metaData['module'], 'final.png', image)

				star_count = len(star_list)

				result = f'Total stars found {star_count}'
				allsky_shared.log(4, f'INFO: {result}')
			else:
				result = 'Sky is not clear so ignoring starcount.'
				allsky_shared.log(4, f'INFO: {result}')
		else:
			result = 'Its raining so ignorning starcount.'
			allsky_shared.log(4, f'INFO: {result}')

		extra_data = {}
		extra_data['AS_STARCOUNT'] = star_count
		allsky_shared.saveExtraData(metaData["extradatafilename"], extra_data, metaData['module'], metaData['extradata'])
       
		return result

def starcount(params, event):
	allsky_starcount = ALLSKYSTARCOUNT(params, event)
	result = allsky_starcount.run()

	return result     
         
def starcount_cleanup():
	moduleData = {
	    "metaData": metaData,
	    "cleanup": {
			"files": {
				metaData["extradatafilename"]
			}
	    }
	}
	allsky_shared.cleanupModule(moduleData)
