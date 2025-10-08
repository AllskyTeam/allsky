'''
allsky_saveintermediateimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will save the image at any point during the module workflow

Expected parameters:
None
'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os 
import cv2
import pathlib


class ALLSKYSAVEINTERMMEDIATEIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Save an Intermediate Image",
		"description": "Save the current version of an image in a specified location.",
		"module": "allsky_saveintermediateimage",
		"group": "Allsky Core",      
		"events": [
			"day",
			"night"
		],
		"arguments":{
			"imagefolder": "${ALLSKY_IMAGES}/${DATE}-clean"
		},
		"argumentdetails": {
			"imagefolder" : {
				"required": "true",
				"description": "Image folder",
				"help": "The folder to save the image in. The folder will be created if it does not exist. You can use Allsky variables in the folder name."
			}
		}      
	}

 
	def __write_image(self, image, path, quality):
		file_extension = pathlib.Path(path).suffix

		result = True
		try:
			allsky_shared.checkAndCreatePath(path)

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
			save_path = self.get_param('imagefolder', '', str)   
			path = allsky_shared.convertPath(save_path)
			if path is not None:
				path = os.path.join(path, os.path.basename(allsky_shared.CURRENTIMAGEPATH))
				if not self.__write_image(allsky_shared.image, path, quality):
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

def saveintermediateimage(params, event):
	allsky_save_intermmediate_image = ALLSKYSAVEINTERMMEDIATEIMAGE(params, event)
	result = allsky_save_intermmediate_image.run()

	return result 
