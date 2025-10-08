'''
allsky_saveimafe.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module will save the final image after all modules have run

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import pathlib

class ALLSKYSAVEIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Save an image",
		"description": "Save the modified image.",
		"module": "allsky_saveimage",
		"ignorewatchdog": "True",
		"group": "Allsky Core",       
		"events": [
			"day",
			"night"
		] 
	}
    
	def _write_image(self, image, path, quality):
		fileExtension = pathlib.Path(path).suffix

		result = True
		try:
			if fileExtension == '.jpg':
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
			result = f'Image {allsky_shared.CURRENTIMAGEPATH} Saved, quality {quality}'

			if not self._write_image(allsky_shared.image, allsky_shared.CURRENTIMAGEPATH, quality):
				result = f'Failed to save {allsky_shared.CURRENTIMAGEPATH}'
				self.log(0, f'ERROR: {result}', exitCode=1)
			else:
				self.log(4, f'INFO: {result}')
		else:
			result = 'Cannot determine the image quality. Image NOT saved'
			self.log(0, f'ERROR: {result}')

		return result

def saveimage(params, event):
	allsky_save_image = ALLSKYSAVEIMAGE(params, event)
	result = allsky_save_image.run()

	return result  
