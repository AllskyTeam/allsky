#TODO: Fix events
""" allsky_meteor.py

Part of allsky postprocess.py modules.
https://github.com/AllskyTeam/allsky

This module attempts to locate meteors in a captured image.
"""
import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE
import os
import cv2
import numpy as np
from scipy.spatial import distance as dist
from astropy.io import fits
from scipy.ndimage import zoom
from astride import Streak

class ALLSKYMETEOR(ALLSKYMODULEBASE):
	_module_debug = False
	_annotate_image = False
	_fits_data = None
	_fits_file = '/tmp/meteors.fits'

	meta_data = {
		"name": "Meteor Detection",
		"description": "Detect meteors (i.e., streaks) in images.",
		"events": [
			"night",
			"day"
		],
		"experimental": "true",
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
    			"pk_type": "int"
			},
			"values": {
				"AS_METEORIMAGE": {
					"name": "${METEORIMAGE}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with meteors",
					"type": "string"
				},
				"AS_METEORIMAGEPATH": {
					"name": "${METEORIMAGEPATH}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with meteors Path",
					"type": "string"
				},
				"AS_METEORIMAGEURL": {
					"name": "${METEORIMAGEURL}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "Image with meteors URL",
					"type": "string"
				},
				"AS_METEORCOUNT": {
					"name": "${METEORCOUNT}",
					"format": "",
					"sample": "",
					"group": "Image Data",
					"description": "METEOR COUNT",
					"type": "number"
				}
			}
		},
		"arguments": {
			"mask": "",
			"scalefactor": "0.5",
			"annotate": "false",
			"debug": "false",
			"useclearsky": "false",
			"background": "Constant",
			"backgroundboxsize": "50",
			"contourthreshold": "2.0",
			"minpoints": "15",
			"shapecut": "0.2",
			"areacut": "20",
			"radiusdevcut": "0.5",
			"connectivityangle": "3.0",
			"fullyconnected": "high",
			"fitsfilepath": "~/allsky/tmp/meteors.fits"
		},
		"argumentdetails": {
			"mask": {
				"required": "false",
				"description": "Mask Path",
				"tab": "General",
				"help": "The name of the image mask used to 'hide' non-sky parts of the image (trees, etc.). This mask is not visible in the final image.",
				"type": {
					"fieldtype": "mask"
				}
			},
			"scalefactor" : {
				"required": "false",
				"description": "Scale Factor",
				"help": "Amount to scale the image by before attempting meteor detection.",
				"tab": "General",
				"type": {
					"fieldtype": "spinner",
					"min": ".25",
					"max": "1",
					"step": "0.05"
				}
			},
			"useclearsky": {
				"required": "false",
				"description": "Use Clear Sky Indicator Module",
				"tab": "General",
				"help": "If installed use the results of the <b>Clear Sky Indicator</b> module. Meteor detections is skipped if the sky is not clear.",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"background" : {
				"required": "false",
				"description": "Backround Type",
				"help": "The method used to remove the background.",
				"tab": "Settings",
				"type": {
					"fieldtype": "select",
					"values": "Constant,Map",
					"default": "Constant"
				}
			},
			"backgroundboxsize" : {
				"required": "false",
				"description": "Box Size",
				"help": "<b>Constant</b> Background Type: the size of tiles used to estimate a single average background.<br><b>Map</b> Background Type: the grid size for building a 2D background map (more adaptive).",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "256",
					"step": "0.05"
				}
			},
			"contourthreshold" : {
				"required": "false",
				"description": "Contour Threshold",
				"help": "1.0 - 2.0 Very sensitive: May detect noise.<br>2.0 - 3.5 Balanced (<strong>recommended starting point</strong>).<br>4.0 - 6.0+ Strict: Only very bright streaks are detected.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "6",
					"step": "0.05"
				}
			},
			"minpoints" : {
				"required": "false",
				"description": "Min Pixels",
				"help": "The minimum number of pixels long a streak candidate must be to be considered a real streak.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "100",
					"step": "15"
				}
			},
			"shapecut" : {
				"required": "false",
				"description": "Shape Cut",
				"help": "0.0 - 0.2 Very strict: Only highly elongated shapes.<br>0.2 - 0.4 Balanced: Good for typical meteor streaks.<br>0.5 - 0.8 Loose: Accepts short/fat streaks or blobs.<br>1.0 No shape filtering (almost everything passes).",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "1",
					"step": "0.1"
				}
			},
			"areacut" : {
				"required": "false",
				"description": "Area Cut",
				"help": "0 - 10 Very permissive: Catches all small objects. Use with caution (many false hits).<br>10 - 30 Balanced: Filters tiny blobs & hot pixels. <strong>Recommended default range</strong>.<br>50 - 100 Strict: Only large/bright/long streaks; good for noisy images or urban skies.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0",
					"max": "100",
					"step": "1"
				}
			},
			"radiusdevcut" : {
				"required": "false",
				"description": "Radius Dev Cut",
				"help": "0.1 - 0.4 Very strict: only highly linear or symmetric shapes.<br>0.4 - 0.7 Balanced filtering (<strong>default/recommended</strong>).<br>0.8 - 1.0+ Loose: allows more irregular shapes (more false positives).",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "0.1",
					"max": "10",
					"step": "0.1"
				}
			},
			"connectivityangle" : {
				"required": "false",
				"description": "Connectivity Angle",
				"help": "1 - 2 Very strict: only near-perfectly straight streaks.<br>2 - 5 Balanced: allows small bends, realistic.<br>6 - 10+ Loose: may connect unrelated noise contours.",
				"tab": "Settings",
				"type": {
					"fieldtype": "spinner",
					"min": "1",
					"max": "100",
					"step": "1"
				}
			},
			"fullyconnected" : {
				"required": "false",
				"description": "Fully Connected",
				"help": "<b>Low</b> - Stricter: uses 4-connected neighborhood (orthogonal only).<br><b>High</b> - Looser: uses 8-connected neighborhood (diagonal allowed).",
				"tab": "Settings",
				"type": {
					"fieldtype": "select",
					"values": "Low,High",
					"default": "Constant"
				}
			},
			"fitsfilepath": {
				"required": "false",
				"description": "Fits Path",
				"tab": "Settings",
				"help": "The filename path for the intermediate fits file. ONLY change this if you have issues with space in the allsky/tmp filesystem."
			},
			"annotate": {
				"required": "false",
				"description": "Annotate Meteors",
				"help": "If selected the identified meteors in the image will be highlighted.",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
				}
			},
			"debug": {
				"required": "false",
				"description": "Enable debug mode",
				"help": "If selected each stage of the detection will generate images in the allsky/tmp/debug folder.",
				"tab": "Debug",
				"type": {
					"fieldtype": "checkbox"
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

	def _to_grayscale_if_rgb(self, arr):
		if arr.ndim == 3 and arr.shape[2] == 3:
			if self._module_debug:
				print('Convert Image - converting color to grayscale')
			rgb = arr[..., ::-1]
			return np.dot(rgb, [0.2989, 0.5870, 0.1140]).astype(np.float32)
		elif arr.ndim == 2:
			if self._module_debug:
				print('Convert Image - already grayscale')
			return arr.astype(np.float32)
		else:
			raise ValueError(f"Unexpected image shape: {arr.shape}")

	def _resize_image(self, image, scale=0.5):
		height, width = image.shape[:2]
		new_size = (int(width * scale), int(height * scale))
		resized = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
		if self._module_debug:
			print(f'Resize Image to: {resized.shape}')
		return resized

	def _save_fits_from_array(self, data):
		hdu = fits.PrimaryHDU(data)
		hdu.writeto(self._fits_file, overwrite=True)
		if self._module_debug:
			print(f'Saved FITS: {self._fits_file}')

	def _delete_fits_file(self):
		try:
			if os.path.exists(self._fits_file):
				os.remove(self._fits_file)
				if self._module_debug:
					print(f'Deleted FITS file: {self._fits_file}')
			else:
				if self._module_debug:
					print(f'FITS file does not exist: {self._fits_file}')
		except Exception as e:
			print(f"Error deleting FITS file: {e}")

	def _run_streak_detection(self):		
		background = self.get_param('background', 'constant', str, True).lower()
		background_box_size = self.get_param('backgroundboxsize', 50, float)
		contour_threshold = self.get_param('contourthreshold', 2, float)
		min_points = self.get_param('minpoints', 15, int)
		shape_cut = self.get_param('shapecut', 0.2, float)
		area_cut = self.get_param('areacut', 20, int)
		radius_dev_cut = self.get_param('radiusdevcut', 0.5, float)
		connectivity_angle = self.get_param('connectivityangle', 3.0, float)
		fully_connected = self.get_param('fullyconnected', 'high', str, True).lower()

		# Gets around an error in astride where its using 'is' rather than == for comparisons
		if background == 'constant':
			streak = Streak(self._fits_file,
					remove_bkg='constant',
					bkg_box_size=background_box_size,
					contour_threshold=contour_threshold,
					min_points=min_points,
					shape_cut=shape_cut,
					area_cut=area_cut,
					radius_dev_cut=radius_dev_cut,
					connectivity_angle=connectivity_angle,
					fully_connected=fully_connected,
					output_path=None)
		else:
			streak = Streak(self._fits_file,
					remove_bkg='map',
					bkg_box_size=background_box_size,
					contour_threshold=contour_threshold,
					min_points=min_points,
					shape_cut=shape_cut,
					area_cut=area_cut,
					radius_dev_cut=radius_dev_cut,
					connectivity_angle=connectivity_angle,
					fully_connected=fully_connected,
					output_path=None)

		streak.detect()

		count = len(streak.streaks)
		if self._module_debug:
			print(f'Total streaks detected: {count}')
			for i, streak_data in enumerate(streak.streaks):
				x_center = streak_data['x_center']
				y_center = streak_data['y_center']
				print(f'Streak {i+1}: center at (x={x_center:.1f}, y={y_center:.1f})')

		return streak.streaks

	def _draw_streaks_on_image(self, streaks, scale_factor):
		print('Annotating image')
		for i, s in enumerate(streaks):
			x = np.array(s['x']) / scale_factor
			y = np.array(s['y']) / scale_factor

			points = np.vstack((x, y)).T.astype(np.int32)
			points = points.reshape((-1, 1, 2))
			cv2.polylines(allsky_shared.image, [points], isClosed=False, color=(0, 255, 0), thickness=1)

			x_min, x_max = int(np.min(x)), int(np.max(x))
			y_min, y_max = int(np.min(y)), int(np.max(y))
			cv2.rectangle(allsky_shared.image, (x_min, y_min), (x_max, y_max), color=(255, 0, 0), thickness=1)

	def _find_meteors(self):
		scale = self.get_param('scalefactor', 0.5, float)
		image = allsky_shared.image
		gray = self._to_grayscale_if_rgb(image)
		resized = self._resize_image(gray, scale=0.5)
		self._save_fits_from_array(resized)
		streaks = self._run_streak_detection()
		if self._annotate_image:
			self._draw_streaks_on_image(streaks, scale_factor=scale)
		self._delete_fits_file()

		return streaks

	def run(self):
		self._module_debug = self.get_param('debug', False, bool)
		self._annotate_image = self.get_param('annotate', False, bool)
		self._fits_file = self.get_param('fitsfilepath', '/tmp/meteors.fits', str, True)

		streaks = self._find_meteors()

		if len(streaks) > 0:
			extra_data = {}
			filename = os.path.basename(allsky_shared.CURRENTIMAGEPATH)
			date = filename[6:14]
			url = f'/images/{date}/thumbnails/{filename}'
		
			extra_data = {}
			extra_data['AS_METEORIMAGE'] = filename
			extra_data['AS_METEORIMAGEPATH'] = allsky_shared.CURRENTIMAGEPATH
			extra_data['AS_METEORIMAGEURL'] = url
			extra_data['AS_METEORCOUNT'] = len(streaks)
			allsky_shared.saveExtraData(self.meta_data["extradatafilename"], extra_data, self.meta_data['module'], self.meta_data['extradata'], event=self.event)

		else:
			allsky_shared.delete_extra_data(self.meta_data['extradatafilename'])

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
