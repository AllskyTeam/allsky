'''
allsky_saveintermediateimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will save an image for use by the allsky-sensor server

Expected parameters:
None
'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os 
import cv2
import pathlib


class ALLSKYSAVECLEANIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Save a Clean Image",
		"description": "Save the current image for use with allsky-sensors",
		"module": "allsky_savecleanimage",
		"group": "Allsky Core",      
		"events": [
			"day",
			"night"
		],
		"arguments":{
			"imagename": "image.jpg"
		},
		"argumentdetails": {
			"imagename" : {
				"required": "true",
				"description": "Image Path",
				"help": "The name of the image, the will be saved in the current images folder."
			}
		}      
	}

 
	def _write_image(self, image, path, quality):
		file_extension = pathlib.Path(path).suffix

		result = True
		try:
			if file_extension == '.jpg':
				cv2.imwrite(path, image, [allsky_shared.int(cv2.IMWRITE_JPEG_QUALITY), quality])
			else:
				cv2.imwrite(path, image, [allsky_shared.int(cv2.IMWRITE_PNG_COMPRESSION), quality]) 
		except:
			result = False

		return result

	def run(self):
		quality = allsky_shared.getSetting('quality')
		if quality is not None:
			quality = allsky_shared.int(quality)
			image_name = self.get_param('imagename', '', str)
			base_dir = allsky_shared.get_environment_variable("ALLSKY_CURRENT_DIR")
			path = f"{base_dir}/{image_name}"
			if path is not None:         
				if not self._write_image(allsky_shared.image, path, quality):
					result = f'Failed to save image {path}'
					self.log(0, f'ERROR: {result}')
				else:
					result = f'Image {path} Saved'
					self.log(1, f'INFO: {result}')
			else:
				result = f'Invalid path {save_path}'
				self.log(0, f'ERROR: {result}')
		else:
			result = 'Cannot determine the image quality. Intermediate image NOT saved.'
			self.log(0, f'ERROR: {result}')

		return result

def savecleanimage(params, event):
	allsky_save_clean_image = ALLSKYSAVECLEANIMAGE(params, event)
	result = allsky_save_clean_image.run()

	return result 
