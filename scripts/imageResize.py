
import math
import re
from dataclasses import dataclass
from typing import Optional, Tuple
from PIL import Image	

_MARKER_RE = re.compile(r"[HhWwxX%]")		# Regex to find valid resize scaling markers
_DIGIT_SPACE_RE = re.compile(r"^[\d\s]*$")	# Regex to ensure only digits and spaces are present

def validate_scale(s: str) -> Tuple[bool, str, Optional[Tuple[str, ...]]]:
	'''
	Return (is_valid,kind, values) where
	 	is_valid is True or False
		str which is either the kind of resizing (H,W,X,%) or an error message
		values which holds resize target as a tuple of (Width, Height) 
	values is a tuple of numbers (floats).
	'''	
	'''Can be called just to check input for resize scaling 
	Scaling factor must contain only numbers followed by one of: W w H h %
	OR
	A fixed dimension with X or x between numbers (e.g. 640x480 or 1000 X 1000)
	Whitespace is ignored unless between digits.
	All numeric values must be even, except for %.

	Valid examples:	 	640w, 480h, 640x480, 640 x 480, 640W, 480 h , 640x 480, 75 %, 
	Invalid examples: 	641w, 479x480, 45 0h, 640w x 480h, +50, -20, 150%
	'''

	# Helper to check if a cleaned string is an even number
	def is_even_number(value: str) -> bool:
		value = value.replace(" ", "")
		return value.isdigit() and int(value) % 2 == 0
	
	scale_err=""
	# Check input type and if empty
	if not isinstance(s, str):
		scale_err="No input value"
		return False,scale_err,None
	s = s.strip()
	if not s:
		scale_err="Input value is only space(s)"
		return False,scale_err,None
	if s=="0":
		scale_err= "Zero not allowed, enter 100% or leave blank for no resizing"
		return False,scale_err,None	
	
	# Check for valid scaling marker in the string
	markers = _MARKER_RE.findall(s)
	if len(markers) != 1:
		scale_err="Scaling marker not found (H W X %)"
		return False,scale_err,None
	marker = markers[0]

	# Split the string into parts around the marker
	val1, sep, val2 = s.partition(marker)

	# Validate HhWw% markers are at the end of string
	if marker in "WwHh%":
		if val2.strip():  # Nothing should follow the marker
			scale_err="Characters not allowed after h,w,%"
			return False,scale_err,None
		if not _DIGIT_SPACE_RE.fullmatch(val1):  # Only digits and spaces allowed
			scale_err="Invalid character entered"
			return False,scale_err,None
		if not re.search(r"\d", val1):  # Must contain at least one digit
			scale_err="No number entered"
			return False,scale_err,None
		if re.search(r"\d\s+\d", val1):  # Digits separated by spaces are invalid
			scale_err="Spaces found between digits"
			return False,scale_err,None
		
		# Made it this far, now check if even number for h or w
		val1 = re.sub(r"\s+", "", (val1 or ""))
				 
		if marker in "WwHh" and not is_even_number(val1):
			scale_err="Number is not even"
			return False,scale_err,None
		
		# Percentages must be <= 100
		'''if marker == "%":
			match = re.search(r"\d+", val1)
			if match:
				percent_value = int(match.group())
				if percent_value >= 100:
					return False, "Percentage must be <= 100%",None
		target = (val1,)'''
		target = (val1,)


	# Validation for xX markers (must have digits on both sides)
	if marker in "xX":
		if not (_DIGIT_SPACE_RE.fullmatch(val1) and _DIGIT_SPACE_RE.fullmatch(val2)):
			scale_err="Missing or invalid number before or after 'x'"
			return False,scale_err,None
		if re.search(r"\d\s+\d", val1) or re.search(r"\d\s+\d", val2):
			scale_err="Numbers cannot contain spaces between digits."
			return False,scale_err,None
		
		val1 = re.sub(r"\s+", "", (val1 or ""))
		val2 = re.sub(r"\s+", "", (val2 or ""))

		if val1 == "0" or val2 =="0":
			scale_err="Both dimensions must be greater than 0"
			return False,scale_err,None
		if not (re.search(r"\d", val1) and re.search(r"\d", val2)):
			scale_err="Both sides of 'x' must contain at least one digit."
			return False,scale_err,None
		if not is_even_number(val1) or not is_even_number(val2):
			return False, "Both dimensions must be even numbers",None
		target = (val1,val2)

	# All okay

	factor = sep.upper()
	
	#return True, factor, value to use (1000,) or (640,480), 
	return True,factor,target
	
def resize(input_path: str,						# if passing old size dimensions can be placeholder textresize"
				 resize_target: str,			# target value for resizing basis
				 *,
				 start_size=None,				# Optional (w, h): compute plan only, no file I/O
				 resample=None,					# Defaults to LANCZOS (set val2 import)
				 return_image: bool = True):	# return an image file or not
	""" Allsky Image resizer with even-dimension rounding for output files.

	Behavior:
		- Resize targets can be in several formats:
			* '50%'				-> percent scale reduction
			* '1000W' / '1000w'	-> target width
			* '720H' / '720h'	-> target height
			* '1280x720'		-> fixed target width x height (WxH)
			* Zero-like: '0', '0%', '0H', '0W', '0x720', '1280x0' => will not be processed 

		- NEW dimensions will be rounded up to even after calculating if required.
	  
	Returns:
		(image, plan)
	
	The 'image' is:
		- The resized Image when a resize occurs (and return_image=True),
		- A COPY of  original image if no-op (and return_image=True),
		- None if return_image=False.
	- If 'start_size' is provided, this tells the function to only compute new resized dimensions.
		- image file is not opened or processed (can just be placeholder text)
		- function returns (None or image depending on return_image) and with 'plan' computed from start_size dimensions provided.

	The 'plan' is a dataclass-like object with attributes:
		- start_size: (original width, original height)
		- kind: one of 'height' | 'width' | 'fixed' | 'percent' | 'noop'
		- target_values: tuple of floats (depending on kind)
		- scale_factor: float or None (for single-side & percent)
		- new_size_unrounded: (w_float, h_float) before even rounding
		- new_size: (W, H) after even rounding
		- will_resize: bool
	"""	
	#sys.path.append("/home/RazAdmin/allsky/scripts/modules")			
	import allsky_shared as allsky_shared

	# ************ Helper functions ************
	# Round up Integers
	def _ceil_even(x):
		'''Round up to the next even integer (keeps even integers unchanged).'''
		n = int(math.ceil(float(x)))
		return n if n % 2 == 0 else n + 1

	# Calculate Resize Dimensions 
	@dataclass(frozen=True)
	class RESIZEPLAN:
		start_size: tuple
		kind: str
		target_values: tuple
		scale_factor: Optional[float]
		new_size_unrounded: tuple
		new_size: tuple
		will_resize: bool

	def _calculate_resize(start_size_tuple, rt: str) -> RESIZEPLAN:
		'''
		Compute target dimensions from original size, final new dimensions are rounded up to even.
		'''
		ow, oh = start_size_tuple
		if ow <= 0 or oh <= 0:
			raise ValueError("Original image dimensions must be > 0")

		#kind, target_values = _parse_resize_target(rt)
		do_resize, scale_by, target_values = validate_scale(rt)

		if do_resize == False:
			# this means ther was an error and text is in scale_by
			# message logged by validate_scale	
			pass
		
		# Defaults (same values if no scaling required)
		new_w_unrounded = float(ow)
		new_h_unrounded = float(oh)
		scale_factor = None

		if scale_by == "X":
			kind = "Fixed"
			target_w_raw, target_h_raw = target_values  # (w, h)
			new_w_unrounded = float(target_w_raw)
			new_h_unrounded = float(target_h_raw)

		elif scale_by == "W":
			kind = "Width"
			(target_w_raw,) = target_values
			scale_factor = float(target_w_raw) / float(ow)
			new_w_unrounded = float(target_w_raw)
			new_h_unrounded = float(oh) * scale_factor

		elif scale_by == "H":
			kind = "Height"
			(target_h_raw,) = target_values
			scale_factor = float(target_h_raw) / float(oh)
			new_h_unrounded = float(target_h_raw)
			new_w_unrounded = float(ow) * scale_factor
		
		elif scale_by == "%":
			kind = "Percent"
			(pct,) = target_values
			scale_factor = float(pct) / 100.0
			new_w_unrounded = float(ow) * scale_factor
			new_h_unrounded = float(oh) * scale_factor

		else:
			kind = f"Error: {scale_by}"	# no scaling will be done


		# Round final result up to even
		proposed_nw = _ceil_even(new_w_unrounded)
		proposed_nh = _ceil_even(new_h_unrounded)

		#check final to compare new and old sizes
		final_new_size = (proposed_nw, proposed_nh)
		will_resize = final_new_size != (ow, oh)		# True if new dimensions <> old dimensions

		return RESIZEPLAN(
			start_size=(ow, oh),
			kind=kind,
			target_values=target_values,
			scale_factor=scale_factor,
			new_size_unrounded=(new_w_unrounded, new_h_unrounded),
			new_size=final_new_size,
			will_resize=will_resize,
		)
 
	# ********** Main Function **********
	#first validate the scaling factor
	good_scale,kind,target1 = validate_scale(resize_target)
	if not good_scale:
		# log scaling error and return
		allsky_shared.log(1, f"WARNING: Image will not be resized. Invalid parameter: {resize_target} - {kind}")
	
	# Only calculate output dimensions
	if start_size is not None:
		# dimesions were passed, which means to just calcluate a new_Size.  (no image operations)
		plan = _calculate_resize(start_size, resize_target)
		if not plan.will_resize or not return_image:
			return (None, plan)
		# If asked for an image, they didn't give us pixels; return None + plan
		return (None, plan)				# <----------  THIS MIGHT BE REDUNDANT????

	# Open image, determine new dimensions, and resize
	with Image.open(input_path) as original_image:
		orig_width, orig_height = original_image.size
		plan = _calculate_resize((orig_width, orig_height), resize_target)

		if not plan.will_resize:
			return (original_image.copy() if return_image else None, plan)			# no resizing so return image and plan

		if resample is None:
			try:
				resample = Image.Resampling.LANCZOS
			except AttributeError:
				resample = Image.LANCZOS  # older Pillow support

		resized_image = original_image.resize(plan.new_size, resample=resample)		# resize image
		return (resized_image if return_image else None, plan)
	

if __name__ == "__main__":
	import argparse

	parser = argparse.ArgumentParser(
		description="""
		Validate a resize target string or calculate resized dimensions of an image.

		Functions:
		  - validate: Check if a resize target string is valid (e.g. '640x480', '720h', '50%')
		  - resize: Calculate new dimensions based on input Width x Height or an image file
		    (optionally resize and return an image)

		Examples:
		  python3 imageResize_test.py validate -t "640x480"
		  python3 imageResize_test.py resize -t "640x480" -s 1920 1080
		""",
		formatter_class=argparse.RawTextHelpFormatter
	)
	parser.add_argument("function", choices=["resize", "validate"], help="Function to run. 'validate ' to check a resize parameter, 'resize' to calculate resized dimensions")
	parser.add_argument("-t", "--resize_target", required=True, help="Resize target string. (e.g. '640x480', '720h', '50%%')")
	parser.add_argument("-i", "--input_path", required=False, help="Path to input image file. (Dimensions read from file)")
	parser.add_argument("-s", "--start_size", nargs=2, type=int, help="Image dimensions as width and height.  (eg -s 1920 1080)")
	parser.add_argument("-r", "--return_image", action="store_true", help="Return image object (when resizing an image file)")
	# -r wont work with bash

	args = parser.parse_args()

	if args.function == "validate":
		result = validate_scale(args.resize_target)
		print(result)

	elif args.function == "resize":
		if args.start_size:
			start_size = tuple(args.start_size)
		else:
			start_size = None

		result = resize(
			input_path=args.input_path,
			resize_target=args.resize_target,
			start_size=start_size,
			return_image=args.return_image
		)
		print(result)
