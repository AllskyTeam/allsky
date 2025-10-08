""" allsky_maskimage.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module applies a permanent mask to the captured image.
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import sys

class ALLSKYMASKIMAGE(ALLSKYMODULEBASE):

	meta_data = {
		"name": "Apply a Mask to an Image",
		"description": "Apply a mask to an image, often used to ensure a black background for overlay text.",
		"version": "v1.0.2",
		"centersettings": "false",
		"testable": "false",
		"group": "Image Adjustments",
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
				"help": "The filename of the image mask.",
				"type": {
					"fieldtype": "image"
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

	def run(self):
		try:
			mask_file_name = self.get_param('mask', '', str, True)

			if (mask_file_name is not None) and (mask_file_name != ""):
				image = allsky_shared.image
				masked_image = allsky_shared.mask_image(image, mask_file_name)
				if masked_image is not None:
					allsky_shared.image = masked_image

				result = 'Mask applied'
			else:
				result = 'No mask defined'
				self.log(0, f'ERROR: {result}')

		except Exception as e:
			eType, eObject, eTraceback = sys.exc_info()
			result = f'Module Mask Image failed on line {eTraceback.tb_lineno} - {e}'
			self.log(0, f'ERROR: {result}')

		return result

def maskimage(params, event):
	allsky_mask_image = ALLSKYMASKIMAGE(params, event)
	result = allsky_mask_image.run()

	return result
