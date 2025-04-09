'''
allsky_clearsky.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

'''
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import cv2
import os
from astropy.stats import sigma_clipped_stats
from photutils.detection import DAOStarFinder

class ALLSKYCLEARSKY(ALLSKYMODULEBASE):
	_module_debug = False

	meta_data = {
		"name": "Clear Sky Alarm",
		"description": "Clear Sky Alarm",
		"module": "allsky_clearsky",
		"version": "v1.0.1",
		"extradatafilename": "allsky_clearsky.json",
		"events": [
			"day",
			"night"
		],
		"experimental": "true",
		"extradata": {
			"database": {
				"enabled": "True",
				"table": "allsky_clearsky"
			}, 
			"values": {
				"AS_CLEARSKYSTATE": {
					"name": "${CLEARSKYSTATE}",
					"format": "",
					"sample": "",
					"group": "Environment",
					"description": "Sky State",
					"type": "string"
				},
				"AS_CLEARSKYSTATEFLAG": {
					"name": "${CLEARSKYSTATEFLAG}",
					"format": "",
					"sample": "",
					"group": "Environment",
					"description": "Sky State Boolean",
					"type": "bool"
				},
				"AS_CLEARSKYSTATESTARS": {
					"name": "${CLEARSKYSTATESTARS}",
					"format": "",
					"sample": "",                
					"group": "Environment",
					"description": "Sky State Star Count",
					"type": "number"
				}
			}
		}, 
		"arguments":{
			"annotate": "false",
			"debug": "false",
			"clearvalue": 10,
			"roi": "",
			"roifallback": 5,
			"debugimage": ""
		},
		"argumentdetails": {
			"roi": {
				"required": "false",
				"description": "Region of Interest",
				"help": "The area of the image to check for clear skies. Format is x1,y1,x2,y2",
				"type": {
					"fieldtype": "roi"
				}
			},
			"roifallback" : {
				"required": "true",
				"description": "Fallback %",
				"help": "If no ROI is set then this % of the image, from the center will be used",
				"type": {
					"fieldtype": "spinner",
					"min": 1,
					"max": 100,
					"step": 1
				}
			},
			"clearvalue" : {
				"required": "true",
				"description": "Clear Sky",
				"help": "If more than this number of stars are found the sky will be considered clear",
				"type": {
					"fieldtype": "spinner",
					"min": 1,
					"max": 1000,
					"step": 1
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
		},
		"enabled": "false"
	}
    
	def run(self):
     
		roi_str = self.get_param('roi', '', str, True)
		roi_percent = self.get_param('roifallback', 10, int) / 100
		self._module_debug = self.get_param('debug', False, bool)
		annotate_image = self.get_param('annotate', False, bool)
		clear_value = self.get_param('clearvalue', 10, int)

		found_stars = 0
		sky_state = 'Not Clear'
  
		image = allsky_shared.image
		height, width = image.shape[:2]

		if roi_str.strip():
			roi_x, roi_y, roi_w, roi_h = map(int, roi_str.split(','))
			self.log(f'INFO: Using roi of {roi_x},{roi_y},{roi_w},{roi_h}', self._module_debug)
		else:
			roi_w = int(width * roi_percent)
			roi_h = int(height * roi_percent)
			roi_x = (width - roi_w) // 2
			roi_y = (height - roi_h) // 2
			self.log(f'INFO: Using roi % of {roi_percent} and roi of {roi_x},{roi_y},{roi_w},{roi_h}', self._module_debug)

		if image.ndim == 3:
			gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
			self.log('INFO: Converted image to grayscale', self._module_debug)
		else:
			gray = image

		roi_image = gray[roi_y:roi_y + roi_h, roi_x:roi_x + roi_w]

		image_data = roi_image.astype(float)

		mean, median, std = sigma_clipped_stats(image_data, sigma=3.0)

		self.log(f'INFO: Background info mean={mean}, median={median}, std={std}', self._module_debug)

		daofind = DAOStarFinder(fwhm=3.0, threshold=5.0 * std)
		sources = daofind(image_data - median)

		if sources is not None:
			found_stars = len(sources)
			self.log(f'INFO: Number of stars detected in ROI: {len(sources)}', self._module_debug)

			if annotate_image:
				for i, row in enumerate(sources):
					# Convert ROI-local coordinates to full image coordinates
					x = int(row['xcentroid'] + roi_x)
					y = int(row['ycentroid'] + roi_y)

					self.log(f'INFO: star {i}, x={x}, y={y}', self._module_debug)

					cv2.circle(allsky_shared.image, (x, y), 20, (0, 0, 255), 2)
					cv2.putText(allsky_shared.image, str(i + 1), (x + 7, y - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)
					cv2.rectangle(allsky_shared.image, (roi_x, roi_y), (roi_x + roi_w, roi_y + roi_h), (255, 255, 0), 2)
		else:
			self.log(f'INFO: No stars detected in ROI', self._module_debug)

		if found_stars > clear_value:
			sky_state = 'Clear'

		extra_data = {}
		extra_data['AS_CLEARSKYSTATE'] = sky_state
		extra_data['AS_CLEARSKYSTATESTARS'] = found_stars
		extra_data['AS_CLEARSKYSTATEFLAG'] = 1 if sky_state.strip().lower() == "clear" else 0
		allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'])

def clearsky(params, event):
	allsky_clear_sky = ALLSKYCLEARSKY(params, event)
	result = allsky_clear_sky.run()

	return result

def clearsky_cleanup():
	moduleData = {
	    "metaData": ALLSKYCLEARSKY.meta_data,
	    "cleanup": {
			"files": {
				ALLSKYCLEARSKY.meta_data["extradatafilename"]
			}
	    }
	}
	allsky_shared.cleanupModule(moduleData)
