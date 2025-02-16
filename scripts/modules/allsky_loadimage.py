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

class ALLSKYLOADIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Loads the latest image",
		"description": "Loads the last captured image",
		"module": "allsky_loadimage",
		"ignorewatchdog": "True", 
		"events": [
			"day",
			"night"
		]   
	}    

	def run(self):
		result = f'Image {allsky_shared.CURRENTIMAGEPATH} Loaded'
			
		try:
			allsky_shared.image = cv2.imread(allsky_shared.CURRENTIMAGEPATH)
			if allsky_shared.image is None:
				allsky_shared.log(0, f'ERROR: Cannot read {allsky_shared.CURRENTIMAGEPATH}...', exitCode=1)
		except Exception as e:
			allsky_shared.log(0, f'ERROR: Cannot load {allsky_shared.CURRENTIMAGEPATH}: {e}', exitCode=1)

		allsky_shared.log(4, f'INFO: {result}')
		return result        

def loadimage(params, event):
	allsky_load_image = ALLSKYLOADIMAGE(params, event)
	result = allsky_load_image.run()

	return result  