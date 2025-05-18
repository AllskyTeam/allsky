import os
import json
import cv2
import numpy as np
import time

import allsky_shared as allsky_shared
from allsky_base import ALLSKYMODULEBASE

from datetime import datetime, timedelta, date
from PIL import ImageFont
from PIL import ImageDraw
from PIL import Image
from PIL import ImageColor

from math import radians
from math import degrees

from datetime import date, datetime, timedelta
from pytz import timezone


from allskyformatters import allskyformatters
from allskyvariables.allskyvariables import ALLSKYVARIABLES
from allskyexceptions import AllskyFormatError
from allskyoverlay.overlaydata import ALLSKYOVERLAYDATA

formatErrorPlaceholder = "??"
missingTypePlaceholder = "???"

class ALLSKYOVERLAY(ALLSKYMODULEBASE):
    
	meta_data = {
		"name": "Overlays data on the image",
		"description": "Overlays data fields on the image",
		"module": "allsky_overlay",
		"events": [
			"day",
			"night"
		],
		"arguments":{
			"formaterrortext": "??",
			"suntimeformat": "",
			"nonighttext": ""
		},
		"argumentdetails": {
				"formaterrortext" : {
				"required": "false",
				"tab": "Overlays",
				"description": "Format Error Text",
				"help": "Value to place in a variable when the provided format is invalid. defaults to ??"
			}
		}
	}
    
	_OVERLAYCONFIGFILE = 'overlay.json'
	_OVERLAYOECONFIG = 'oe-config.json'
	_OVERLAYTMPFOLDER = ''
	_overlay_config_file = None
	_overlay_config = None
	_image = None
	_fonts = {}
	_font_msgs = {}
	_fields = {}
	_extraData = {}
	_start_time = 0
	_last_timer = None
	_image_date = None
	_debug = False
	_not_enabled = ""
	_variables = None
	_errors = ''
	_overlay_editor_config = None
	
	def __init__(self, params, event, formaterrortext):
		super().__init__(params, event)
		config_folder = os.path.join(allsky_shared.ALLSKY_OVERLAY, 'config')
		self._overlay_config_file = os.path.join(config_folder, self._OVERLAYCONFIGFILE)
		self._load_overlay()

		tmpFolder = os.path.join(config_folder, 'tmp')
		self._createTempDir(tmpFolder)
		self._OVERLAYTMP = os.path.join(tmpFolder, 'overlay')
		self._createTempDir(self._OVERLAYTMP)
		self._OVERLAYTLEFOLDER = os.path.join(self._OVERLAYTMP , 'tle')
		self._createTempDir(self._OVERLAYTLEFOLDER)

		self._variables = ALLSKYVARIABLES()
		self._fields = self._variables.get_variables()
 
		allsky_shared.log(4, f"INFO: Config file set to '{self._overlay_config_file}'.")

		self._set_date_and_time()
		self._debug = True
		
		try:
			oeConfigFile = os.path.join(os.environ['ALLSKY_OVERLAY'], 'config', self._OVERLAYOECONFIG)
			with open(oeConfigFile) as file:
				self._overlay_editor_config = json.load(file)
				
				if 'overlayErrors' not in self._overlay_editor_config:
					self._overlay_editor_config['overlayErrors'] = True
				if 'overlayErrorsText' not in self._overlay_editor_config:
					self._overlay_editor_config['overlayErrorsText'] = 'Error found; see the WebU'
					
		except Exception as e:
			allsky_shared.log(0,f'ERROR: Unable to read the overlay config file {oeConfigFile}')
	        
	def _log(self, level, text, preventNewline = False, exitCode=None, sendToAllsky=False, addErrorToOverlay=False):
		allsky_shared.log(level=level, text=text, preventNewline=preventNewline,exitCode=exitCode, sendToAllsky=sendToAllsky)
		if sendToAllsky:
			if self._overlay_editor_config is not None:
				if self._overlay_editor_config['overlayErrors']:
					self._errors = self._overlay_editor_config['overlayErrorsText']

	def _load_overlay(self):
		dayORNight = os.environ['DAY_OR_NIGHT']
		if dayORNight == 'DAY':
			overlayName = allsky_shared.getSetting('daytimeoverlay')
		else:
			overlayName = allsky_shared.getSetting('nighttimeoverlay')

		userPath = os.path.join(os.environ['ALLSKY_OVERLAY'], 'myTemplates', overlayName)
		if os.path.isfile(userPath):
			self._overlay_config_file = userPath
			self._log(4, f'INFO: Time of day is {dayORNight} using overlay {overlayName}')
		else:
			corePath = os.path.join(os.environ['ALLSKY_OVERLAY'], 'config', overlayName)
			if os.path.isfile(corePath):
				self._overlay_config_file = corePath
				self._log(4, f'INFO: Time of day is {dayORNight} using overlay {overlayName}')
			else:
				self._log(0, f'ERROR: Unable to locate an overlay file: TOD {dayORNight}, overlay "{overlayName}"', sendToAllsky=True)
				
	def _dump_debug_data(self):
		debugFilePath = os.path.join(allsky_shared.ALLSKY_TMP, 'overlaydebug.txt')
		env = {}
		for var in os.environ:
			varValue = allsky_shared.getEnvironmentVariable(var, fatal=True)
			varValue = varValue.replace('\n', '')
			varValue = varValue.replace('\r', '')
			var = var.ljust(50, ' ')
			env[var] = varValue

		with open(debugFilePath, 'w') as debugFile:
			for var in sorted(env):
				varValue = env[var]
				debugFile.write(var + varValue + os.linesep)

		allsky_shared.log(4, f"INFO: Debug information written to {debugFilePath}")

	def _createTempDir(self, path):
		if not os.path.isdir(path):
			umask = os.umask(0o000)
			os.makedirs(path, mode=0o777)
			os.umask(umask)

	def _set_date_and_time(self):
		osDate = allsky_shared.getEnvironmentVariable('AS_DATE', fatal=True)
		osTime = allsky_shared.getEnvironmentVariable('AS_TIME', fatal=True)
		if osDate.startswith('20'):
			self._image_date = time.mktime(datetime.strptime(osDate + ' ' + osTime,"%Y%m%d %H%M%S").timetuple())
		else:
			self._image_date = time.time()

	def _load_config_file(self):
		result = True
		if allsky_shared.isFileReadable(self._overlay_config_file):
			with open(self._overlay_config_file) as file:
				self._overlay_config = json.load(file)

			allsky_data_class = ALLSKYOVERLAYDATA(True, False, False, self._overlay_config_file)
			extra_folder = os.path.join(allsky_shared.ALLSKY_OVERLAY, 'extra')
			self._overlay_fields = allsky_data_class.load(10000, extra_folder)

			#if len(self._overlay_config["fields"]) == 0 and len(self._overlay_config["images"]) == 0:
			#	allsky_shared.log(1, f"WARNING: Config file '{self._overlay_config_file}' is empty.")
			#	result = True
		else:
			self._log(0, f"ERROR: Config File '{self._overlay_config_file}' not accessible.", sendToAllsky=True)
			result = False

		return result

	def _load_image_file(self):
		""" Loads the image file to annotate. If no image is specified on the command line
			then this method will attempt to use the image specified in the all sky camera
			config
		"""
		result = True

		self._image = allsky_shared.image
		if self._not_enabled != "":
			allsky_shared.log(4, f'INFO: Not enabled: {self._not_enabled}')
		return result

	def _save_image_file(self):
		""" Saves the final image """
		allsky_shared.image = self._image

	def _timer(self, text, showIntermediate=True, showMessage=True):
		""" Method to display the elapsed time between function calls and the total script execution time """
		if allsky_shared.LOGLEVEL and showMessage:
			now = datetime.now()
			if self._last_timer is None:
				elapsedSinceLastTime = now - self._start_time
			else:
				elapsedSinceLastTime = now - self._last_timer

			self._last_timer = now

			elapsedTime = now - self._start_time
			# Need .6f  or else really small numbers have scientific notation
			if showIntermediate:
				lastText = elapsedSinceLastTime.total_seconds()
				allsky_shared.log(4, f"INFO: {text} took {lastText:.6f} seconds. Elapsed time {elapsedTime.total_seconds():.6f} seconds")
			else:
				allsky_shared.log(4, f"INFO: {text} Elapsed time {elapsedTime.total_seconds():.6f} seconds")

	def _get_font(self, font, fontSize):
		
		tt = os.path.join(allsky_shared.ALLSKY_OVERLAY, 'system_fonts')
		systemFontMapCased = {
			'Arial':           {'fontpath': f'{tt}/Arial.ttf'},
			'Arial Black':     {'fontpath': f'{tt}/Arial_Black.ttf'},
			'Times New Roman': {'fontpath': f'{tt}/Times_New_Roman.ttf'},
			'Courier New':     {'fontpath': f'{tt}/cour.ttf'},
			'Verdana':         {'fontpath': f'{tt}/Verdana.ttf'},
			'Trebuchet MS':    {'fontpath': f'{tt}/trebuc.ttf'},
			'Impact':          {'fontpath': f'{tt}/Impact.ttf'},
			'Georgia':         {'fontpath': f'{tt}/Georgia.ttf'},
			'Comic Sans MS':   {'fontpath': f'{tt}/comic.ttf'},
		}

		systemFontMap = {
			'arial':           {'fontpath': f'{tt}/Arial.ttf'},
			'arial black':     {'fontpath': f'{tt}/Arial_Black.ttf'},
			'times new roman': {'fontpath': f'{tt}/Times_New_Roman.ttf'},
			'courier new':     {'fontpath': f'{tt}/cour.ttf'},
			'verdana':         {'fontpath': f'{tt}/Verdana.ttf'},
			'trebuchet ms':    {'fontpath': f'{tt}/trebuc.ttf'},
			'impact':          {'fontpath': f'{tt}/Impact.ttf'},
			'georgia':         {'fontpath': f'{tt}/Georgia.ttf'},
			'comic sans ms':   {'fontpath': f'{tt}/comic.ttf'},
		}

		preMsg = f"Loading '{font}' font, size {fontSize} pixels"
		fontPath = None

		font = font.lower()
		if font in self._overlay_config['fonts']:
			fontData = self._overlay_config['fonts'][font]
			fontConfigPath = fontData['fontPath']
			if fontConfigPath.startswith('/'):
				fontConfigPath = fontConfigPath[1:]
			C = allsky_shared.getEnvironmentVariable('ALLSKY_CONFIG', fatal=True)
			fontPath = os.path.join(C, 'overlay', fontConfigPath)
		else:
			if font in systemFontMap:
				fontPath = systemFontMap[font]['fontpath']
			else:
				self._log(0, f"ERROR: System font '{font}' not found in internal map.", sendToAllsky=True)

		if fontPath is not None:
			if fontSize is None:
				if fontSize in fontData:
					fontSize = fontData['fontSize']
				else:
					fontSize = self._overlay_config['settings']['defaultfontsize']

			fontKey = font + '_' + str(fontSize)
			if fontKey in self._fonts:
				font = self._fonts[fontKey]
				# Only display this message once per font/size
				if fontKey not in self._font_msgs:
					self._font_msgs[fontKey] = True
					allsky_shared.log(4, f'INFO: {preMsg} from cache.')
			else:
				try:
					fontSize = allsky_shared.int(fontSize)
					self._fonts[fontKey] = ImageFont.truetype(fontPath, fontSize)
					font = self._fonts[fontKey]
					allsky_shared.log(4, f'INFO: {preMsg} from disk.')
				except OSError as err:
					self._log(0, f"ERROR: Could not load font '{fontPath}' from disk.", sendToAllsky=True)
					font = None
		else:
			font = None

		return font

	def _add_rect(self):
		for index, rectData in enumerate(self._overlay_config['rects']):
			top_left = (int(rectData['x']), int(rectData['y']))
			bottom_right = (int(rectData['x'] + rectData['width']), int(rectData['y'] + rectData['height']))
   
			print(top_left, bottom_right)
   
			fill_color = (0, 0, 0)
			fill_opacity = 0.5
			stroke_color = (0, 0, 255)

			overlay = self._image.copy()

			cv2.rectangle(overlay, top_left, bottom_right, fill_color, thickness=cv2.FILLED)
			cv2.addWeighted(overlay, fill_opacity, self._image, 1 - fill_opacity, 0, self._image)
			cv2.rectangle(self._image, top_left, bottom_right, stroke_color, thickness=10)

	def _add_text(self):
		pil_image = Image.fromarray(self._image)
		for field_data in self._overlay_fields:

			field_label = field_data['label']

			if 'font' in field_data:
				font_name = field_data['font']
			else:
				if 'defaultfont' in self._overlay_config['settings']:
					font_name = self._overlay_config['settings']['defaultfont']
				else:
					font_name = 'Arial'

			if 'fontsize' in field_data:
				font_size = field_data['fontsize']
			else:
				if 'defaultfontsize' in self._overlay_config['settings']:
					font_size = self._overlay_config['settings']['defaultfontsize']
				else:
					font_size = 52

			if 'rotate' in field_data:
				rotation = int(field_data['rotate'])
			else:
				if 'defaulttextrotation' in self._overlay_config['settings']:
					rotation = self._overlay_config['settings']['defaulttextrotation']
				else:
					rotation = 0

			if 'opacity' in field_data:
				opacity = field_data['opacity']
			else:
				if 'defaultfontopacity' in self._overlay_config['settings']:
					opacity = self._overlay_config['settings']['defaultfontopacity']
				else:
					opacity = 1
				
			if 'fill' in field_data:
				field_colour = field_data['fill']
			else:
				if 'defaultfontcolour' in self._overlay_config['settings']:
					field_colour = self._overlay_config['settings']['defaultfontcolour']
				else:
					field_colour = 'white'     

			if 'strokewidth' in field_data:
				strokeWidth = int(field_data['strokewidth'])
			else:
				strokeWidth = 0

			if 'stroke' in field_data:
				stroke = field_data['stroke']
			else:
				if 'defaultstrokecolour' in self._overlay_config['settings']:
					stroke = self._overlay_config['settings']['defaultstrokecolour']
				else:
					stroke = '#ffffff'

			if stroke != None:
				stroke_r, stroke_g, stroke_b = self._convert_colour(stroke)
			else:
				stroke_r = None
				stroke_g = None
				stroke_b = None

			if 'tlx' in field_data:
				field_x = allsky_shared.int(field_data['tlx'])
			else:
				field_x = allsky_shared.int(field_data['x'])

			if 'tly' in field_data:
				field_y = allsky_shared.int(field_data['tly'])
			else:
				field_y = allsky_shared.int(field_data['y'])
				
			r, g, b = self._convert_colour(field_colour)
								
			if field_label is not None:
				font = self._get_font(font_name, font_size)
				if font is None:
					cv2.putText(self._image, field_label, (field_x, field_y), cv2.FONT_HERSHEY_SIMPLEX, 1, (b,g,r), 1, cv2.LINE_AA)
				else:
					fill = (b, g, r, 0)

					if stroke_r == None or stroke_g == None or stroke_b == None:
						strokeFill = None
						strokeWidth = 0
					else:
						strokeFill = (stroke_b, stroke_g, stroke_r, 0)

					if len(allsky_shared.image.shape) == 2:
						fill = 255

					self._check_text_bounds(field_label, field_x, field_y)

					if rotation == 0 and opacity == 1:
						draw = ImageDraw.Draw(pil_image)
						draw.text((field_x, field_y), field_label, font = font, fill = fill, stroke_width=strokeWidth, stroke_fill=strokeFill)
					else:
						pil_image = self._draw_rotated_text(pil_image,-rotation,(field_x, field_y), field_label, fill = field_colour, font = font, opacity = opacity, strokeWidth=strokeWidth, strokeFill=stroke)

				self._timer("Adding text field '" + field_label + ' (' + field_data["label"] + ")'")
			else:
				self._timer("Adding text field " + field_data['label'] + " failed no variable data available")

		self._image = np.array(pil_image)

	def _convert_colour(self, color_str):
		try:
			color_str = color_str.strip()

			# Handle "R,G,B" format
			if "," in color_str and all(part.strip().isdigit() for part in color_str.split(",")):
				parts = list(map(int, color_str.split(",")))
				if len(parts) == 3 and all(0 <= val <= 255 for val in parts):
					return parts[0], parts[1], parts[2]
				else:
					return 255, 255, 255

			# Fallback to ImageColor for named colors and hex codes
			r, g, b = ImageColor.getcolor(color_str, "RGB")
			return r, g, b

		except Exception:
			return 255, 255, 255
    
	def _convert_colour_old(self, value):
		try:
			r,g,b = ImageColor.getcolor(value, "RGB")
		except:
			r = 255
			g = 255
			b = 255

		return r,g,b

	def _check_text_bounds(self, fieldLabel, x, y):
		try:
			h, w, c = self._image.shape

			outOfBounds = False
			if (x < 0):
				outOfBounds = True
			if (y < 0):
				outOfBounds = True
			if (x > w):
				outOfBounds = True
			if (y > h):
				outOfBounds = True

			if outOfBounds:
				self._log(0, f"ERROR: Field '{fieldLabel}' is outside of the image", sendToAllsky=True)
		except:
			pass

	def _get_text_dimensions(self, text_string, font):
		ascent, descent = font.getmetrics()

		text_width = font.getmask(text_string).getbbox()[2]
		text_height = font.getmask(text_string).getbbox()[3] + descent

		return (text_width, text_height)
    
	def _convert_RGB_to_BGR(self, colour, opacity):
		r,g,b = ImageColor.getrgb(colour)
		#colour =  '#{:02x}{:02x}{:02x}'.format(b,g,r)

		opacity = int((255/100) * (float(opacity)*100))
		colour = (b,g,r,opacity)
		return colour

	def _draw_rotated_text(self, image, angle, xy, text, fill, font, opacity, strokeWidth, strokeFill):
		fill = self._convert_RGB_to_BGR(fill, opacity)
		if strokeFill != "":
			strokeFill = self._convert_RGB_to_BGR(strokeFill,1)
		else:
			strokeFill = None

		im_txt = Image.new('RGBA', image.size, (0, 0, 0, 0))
		draw = ImageDraw.Draw(im_txt)
		draw.text(xy, text, fill=fill, embedded_color=False, font=font, stroke_width=strokeWidth, stroke_fill=strokeFill)

		im_txt = im_txt.rotate(angle, center=xy)

		image.paste(im_txt, mask=im_txt)
		return image

	def _add_images(self):
		for index, imageData in enumerate(self._overlay_config["images"]):
			self._do_add_image(imageData)

		for index, extraFieldName in enumerate(self._extraData):
			if self._extraData[extraFieldName]['image'] is not None:
				imageData = {
					'x': self._extraData[extraFieldName]['x'],
					'y': self._extraData[extraFieldName]['y'],
					'image': self._extraData[extraFieldName]['image'],
					'scale': self._extraData[extraFieldName]['scale'],
					'rotate': self._extraData[extraFieldName]['rotate']
				}
				self._do_add_image(imageData)

	def _do_add_image(self, imageData):
		imageName = imageData["image"]
		if imageName != 'missing':
			imageX = int(imageData["x"])
			imageY = int(imageData["y"])
			image = None

			imagePath = os.path.join(allsky_shared.ALLSKY_OVERLAY, "images", imageName)

			if allsky_shared.isFileReadable(imagePath):
				image = cv2.imread(imagePath, cv2.IMREAD_UNCHANGED)
			if image is not None:
				if "scale" in imageData:
					if imageData["scale"] is not None:
						scale = allsky_shared.asfloat(imageData["scale"])
						image = cv2.resize(image, (0, 0), fx=scale, fy=scale)

				if "rotate" in imageData:
					if imageData["rotate"] is not None:
						image = self._rotate_image(image, int(imageData["rotate"]))

				height = image.shape[0]
				width = image.shape[1]

				imageX = imageX - int(width / 2)
				imageY = imageY - int(height / 2)

				self._image = self._overlay_transparent(imageName, self._image, image, imageX, imageY, imageData)
				allsky_shared.log(4, f"INFO: Adding image field {imageName}")
			else:
				self._log(1, f"WARNING: image '{imageName}' missing; ignoring.", sendToAllsky=True)
		else:
			allsky_shared.log(1, "WARNING: Image not set so ignoring.")

	def _overlay_transparent(self, imageName, background, overlay, x, y, imageData):
		background_height, background_width = background.shape[0], background.shape[1]
		h, w = overlay.shape[0], overlay.shape[1]

		if (h + y < background_height) and (w + x < background_width and x >= 0 and y >= 0):
			if x >= background_width or y >= background_height:
				return background

			if x + w > background_width:
				w = background_width - x
				overlay = overlay[:, :w]

			if y + h > background_height:
				h = background_height - y
				overlay = overlay[:h]

			if overlay.shape[2] < 4:
				overlay = np.concatenate(
					[
						overlay,
						np.ones((overlay.shape[0], overlay.shape[1], 1), dtype = overlay.dtype) * 255
					],
					axis = 2,
				)

			overlay_image = overlay[..., :3]
			mask = overlay[..., 3:] / 255.0

			opacityMultiplier = 1
			if "opacity" in imageData:
				try:
					opacity = imageData["opacity"]
					opacityMultiplier = float(opacity)
				except:
					pass

			if opacityMultiplier != 1:
				mask = mask * opacityMultiplier

			background[y:y+h, x:x+w] = (1.0 - mask) * background[y:y+h, x:x+w] + mask * overlay_image
		else:
			self._log(0, f"ERROR: Image '{imageName}' is outside the bounds of the main image.", sendToAllsky=True)

		return background

	def _rotate_image(self, image, angle):
		image_center = tuple(np.array(image.shape[1::-1]) / 2)

		image_center=tuple(np.array(image.shape[0:2])/2)

		rot_mat = cv2.getRotationMatrix2D(image_center, -int(angle), 1.0)
		result = cv2.warpAffine(image, rot_mat, image.shape[1::-1], flags=cv2.INTER_LINEAR)
		return result

	def _addErrors(self):
		print(f'Errors = "{self._errors}"')
		if self._errors != '':
			h, w, c = self._image.shape
			fontSize = int(h * 0.015)
			font = self._get_font('Arial', fontSize)
			textWidth, textHeight = self._get_text_dimensions(self._errors, font)
			fieldX = (w - textWidth) // 2
			fieldY = 1
			pilImage = Image.fromarray(self._image)        
			draw = ImageDraw.Draw(pilImage)
			print(fieldX, fieldY, textWidth, textHeight, w, h, c)
			draw.text((fieldX, fieldY), self._errors, font = font, fill = (0,0,255))
			self._image = np.array(pilImage)
		
	def annotate(self):
		self._start_time = datetime.now()
		if self._load_config_file():
			self._timer("Loading Image")
			if self._load_image_file():
				self._timer("Loading Extra Data")
				self._add_rect()
				self._timer("Adding All Rectangles")
				self._add_text()
				self._timer("Adding All Text Fields")
				self._add_images()
				self._timer("Adding All Image Fields")
				self._save_image_file()
				self._timer("Saving Final Image")
				if self._debug:
					self._timer("Writing debug data")
				self._dump_debug_data()

		self._timer("Annotation Complete", showIntermediate=False)

def overlay(params, event):
	global formatErrorPlaceholder

	enabled = allsky_shared.int(allsky_shared.getEnvironmentVariable("AS_eOVERLAY"))
	if enabled == 1:
		if "formaterrortext" in params:
			formaterrortext = params["formaterrortext"]
		else:
			formaterrortext = formatErrorPlaceholder
		annotater = ALLSKYOVERLAY(params, event, formaterrortext)
		annotater.annotate()
		result = ""
	else:
		result = "Module Overlay Method Disabled"
		allsky_shared.log(4, f"INFO: {result}.")

	return result
