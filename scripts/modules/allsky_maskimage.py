""" allsky_maskimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will apply a permenant mask to the captured image
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import numpy as np
import cv2
import os

class ALLSKYMASKIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Mask Image",
		"description": "Masks an Image",
		"events": [
			"day",
			"night"
		],
		"arguments":{
			"mask": ""
		},    
		"argumentdetails": {
			"mask" : {
				"required": "true",
				"description": "Mask Path",
				"help": "The name of the image mask",
				"type": {
					"fieldtype": "image"
				}                
			} 
		}         
	}


	def load_mask(self, mask_path, target_shape):
		mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
		if mask is not None:
			if (mask.shape[0] != target_shape[0]) or (mask.shape[1] != target_shape[1]):
				mask = cv2.resize(mask, (target_shape[1], target_shape[0]))
			mask = mask.astype(np.float32) / 255.0
  
		return mask


	def run(self):
		try:
			mask_file_name = self.get_param('mask', '', str, True)
			if (mask_file_name is not None) and (mask_file_name != ""):
				mask_path = os.path.join(allsky_shared.ALLSKY_OVERLAY, 'images', mask_file_name)
				image = allsky_shared.image

				mask = self.load_mask(mask_path, image.shape[:2])
				if mask is not None:
					if len(image.shape) == 2:
						image = image.astype(np.float32)
						output = image * mask
					else:
						image = image.astype(np.float32)
						if mask.ndim == 2:
							mask = mask[..., np.newaxis]
						output = image * mask

					allsky_shared.image =  np.clip(output, 0, 255).astype(np.uint8)
					result = f'Mask {mask_path} applied to image'
					allsky_shared.log(4, f'INFO: {result}')
				else:
					result = f'Mask {mask_path} not found'
					allsky_shared.log(0, f'ERROR: {result}')
			else:
				result = 'No mask defined'
				allsky_shared.log(0, f'ERROR: {result}')

		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Module mask image failed on line {eTraceback.tb_lineno} - {e}'
			allsky_shared.log(0, f'ERROR: {result}')
           
		return result

def maskimage(params, event):
	allsky_mask_image = ALLSKYMASKIMAGE(params, event)
	result = allsky_mask_image.run()

	return result