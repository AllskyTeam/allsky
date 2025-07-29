import time
import locale
import re
import allsky_shared as allsky_shared
from datetime import date, datetime
from allskyexceptions import AllskyFormatError

allsky_locale = allsky_shared.getSetting('locale')
try:
	if allsky_locale is not None:
		locale.setlocale(locale.LC_ALL, allsky_locale)
	else:
		locale.setlocale(locale.LC_ALL, '')
except:
    pass

class AllskyFormatters:
    
	debug_mode = False

	def __init__(self):
		pass

	def _debug(self, message):
		if self.debug_mode:
			print(message)
   
	def _isUnixTimestamp(self, value):
		isUnixTimestamp = False
		isFloat = False
		sanityCheckDate = time.mktime((date(2023, 1, 1)).timetuple())

		try:
			value = int(value)
			isInt = True
		except:
			isInt = False
			try:
				value = float(value)
				isFloat = True
			except:
				pass

		if isInt or isFloat:
			if value > sanityCheckDate:
				try:
					temp = datetime.fromtimestamp(value)
					isUnixTimestamp = True
				except:
					pass

		return isUnixTimestamp, value

	def _format_size(self, size_bytes, unit=None, add_units=False):
		"""
		Convert a file size in bytes to a human-readable format.
		
		Parameters:
		- size_bytes (int): File size in bytes.
		- unit (str, optional): Unit to return ('GB', 'MB', 'KB', 'AUTO'). Defaults to 'AUTO'.

		Returns:
		- str: Human-readable file size.
		"""
		units = ['B', 'KB', 'MB', 'GB', 'TB']
		factor = 1024

		if unit:
			unit = unit.upper()
			if unit not in units + ['AUTO']:
				raise ValueError(f"Invalid unit '{unit}'. Choose from {units[1:]} or 'AUTO'.")
			if unit != 'AUTO':
				idx = units.index(unit)
				if add_units:
					unit_text = unit
				else:
					unit_text = ''
				return f"{size_bytes / (factor ** idx):.2f} {unit_text}"
		
		unit_text = ''
		for u in units:
			if size_bytes < factor:
				if add_units:
					unit_text = u
				return f"{size_bytes:.2f} {unit_text}"
			size_bytes /= factor

		return f"{size_bytes:.2f}"

	def _string_to_boolean(self, value):
		"""
		Convert a string to a boolean.

		Parameters:
		- value (str): Input string.

		Returns:
		- bool: Converted boolean value.
		"""
		return str(value).strip().lower() in ('true', '1', 'yes', 'y', 'on')

	def _split_format(self, format):
		formats = format.split('|')
		return formats

	def _parse_dp(self, formats):
		"""
		If string starts with 'dp' and ends with an integer, return the integer.
		Otherwise, return False.
		"""
		for index, format in enumerate(formats):  
			if format.startswith('dp'):
				num_part = format[2:]
				if num_part.isdigit():
					return int(num_part)

		return False

	def _format_number(self, value, dp, use_locale):
		if use_locale:
			if dp is False:
				self._debug(f'INFO: Formatting {value} as integer with locale')
				value = locale.format_string('%d', value, grouping=True)
			else:
				self._debug(f'INFO: Formatting {value} as float with locale')
				value = locale.format_string(f'%.{dp}f', value, grouping=True) 
		else:
			if dp is False:
				self._debug(f'INFO: Formatting {value} as integer without locale')
				value = f'{value:d}'
			else:
				self._debug(f'INFO: Formatting {value} as float without locale')
				value = f'{value:.{dp}f}'
    
		return value

	def as_bool(self, value, variable_name, format, variable_type, debug=False):
		
		if format == '%yes' or format == 'yesno':
			if type(value) is bool:
				if value:
					value = 'Yes'
				else:
					value = 'No'        
		
		if format == '%on' or format == 'onoff':
			if type(value) is bool:
				if value:
					value = 'On'
				else:
					value = 'Off'        

		if format == '%true' or format == 'truefalse':
			if type(value) is bool:
				if value:
					value = 'True'
				else:
					value = 'False'

		if format == '%1' or format == 'num':
			if type(value) is bool:
				if value:
					value = '1'
				else:
					value = '0'
                
		return value

	def as_timestamp(self, value, variable_name, format, variable_type, debug=False):
		try:
			internalFormat = allsky_shared.getSetting('timeformat')
			if variable_name == 'DATE' or variable_name == 'AS_DATE':
				timeStamp = datetime.fromtimestamp(value)
				value = timeStamp.strftime(internalFormat)
			else:
				isUnixTimestamp, value = self._isUnixTimestamp(value)
				if isUnixTimestamp:
					timeStamp = datetime.fromtimestamp(value)
					value = timeStamp.strftime(internalFormat)

			tempDate = datetime.strptime(value, internalFormat)
			if format is not None:
				try:
					value = tempDate.strftime(format)
				except Exception:
					pass
		except Exception as e:
			error =  f"ERROR: Cannot use format '{internalFormat}' from Allsky settings. Please check the date/time format in the main Allsky Settings"
			raise AllskyFormatError(error, 0, True)
		
		return value

	def as_date(self, value, variable_name, format, variable_type, debug=False):
		try:
			internalFormat = allsky_shared.getSetting('timeformat')
			if variable_name == 'DATE' or variable_name == 'AS_DATE':
				timeStamp = datetime.fromtimestamp(value)
				value = timeStamp.strftime(internalFormat)
			else:
				isUnixTimestamp, value = self._isUnixTimestamp(value)
				if isUnixTimestamp:
					timeStamp = datetime.fromtimestamp(value)
					value = timeStamp.strftime(internalFormat)

			tempDate = datetime.strptime(value, internalFormat)
			if format is not None:
				try:
					value = tempDate.strftime(format)
				except Exception:
					pass
		except Exception as e:
			error =  f"ERROR: Cannot use format '{internalFormat}' from Allsky settings. Please check the date/time format in the main Allsky Settings"
			raise AllskyFormatError(error, 0, True)
		
		return value

	def as_time(self, value, variable_name, format, variable_type, debug=False):
		timeStamp = time.localtime(value)
		if format is None:
			value = time.strftime('%H:%M:%S', timeStamp)
		else:
			# TODO: Check for bad format?
			value = time.strftime(format, timeStamp)     
		
		return value

	def as_number(self, value, variable_name, format, variable_type, debug=False):

		processed = False
		self.debug_mode = debug
  
		formats = self._split_format(format)

		if 'int' in formats:
			dp = 0
			processed = True    
   
		if 'float' in formats:
			dp = 2
			processed = True    

		use_locale = False
		if 'locale' in formats:
			use_locale = True
			processed = True      
	
		match = re.search(r'\bdp(\d+)\b', format)
		if match:
			dp = self._parse_dp(formats)
			processed = True
   
		if processed:
			value = self._format_number(value, dp, use_locale)
   
		if 'per' in formats:
			value = f'{value}%'
			processed = True
   
		if 'deg' in formats:
			value = f'{value}°'
			processed = True    
        
        # If we havn't processed the value yet, we will try to format it using the lgeacy formats
		if not processed:
			if format is not None and format != "":
				original_format = format
				if format.startswith(':'):
					format = "{" + format + "}"
				convertValue = value
				try:
					if '.' in str(value):
						convertValue = float(value)
					else:
						convertValue = int(value)

					#try:
					#	convertValue = int(value)
					#except ValueError:
					#	convertValue = float(value)
					
					try:
						if format.startswith('{'):
							value = format.format(convertValue)
						else:
							if format.startswith('%'):
								value = locale.format_string(format, convertValue, grouping=True)
							else:
								value = convertValue
					except Exception as err:
						error =  f"ERROR: Cannot use format '{original_format}' on Number variable (value={value}). Error is {err}"
						raise AllskyFormatError(error, 0, False)        
				except ValueError as err:
						error =  f"ERROR: Cannot use format '{original_format}' on Number variable (value={value}). Error is {err}"
						raise AllskyFormatError(error, 0, False)          

		value = str(value)
  
		return value

	def as_int(self, value, variable_name, format, variable_type, debug=False):
		""" Formats a number as an integer

		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): the number as an integer
		"""		
		return str(int(value))

	def as_temperature(self, value, variable_name, format, variable_type, debug=False):
		""" Formats a value in temperature units
			Not using match is deliberate
   
			Formatters
   
			deg			- Formats the passed value to 2 decimal places
			degint		- Formats the passed value to an integer
			degctof		- Converts C to F then formats to 2 decimal places
			degctofint	- Converts C to F then formats as an integer
			degftoc		- Converts F to C then formats to 2 decimal places
			degftocint	- Converts F to C then formats as an integer
   
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object
      
		Returns:
			(string): The formatted value
		"""
		try:
			formats = self._split_format(format)
			temp_units = allsky_shared.getSetting('temptype')
      
			value = float(value)
			if 'degctof' in formats:
				value = value * 9 / 5 + 32
				value = round(value, 2) 

			if 'degftoc' in formats:
				value = (value - 32) * 5 / 9
				value = round(value, 2) 

			if 'allsky' in formats:
				if temp_units == 'C':
					value = round(value, 2)
				elif temp_units == 'F':
					value_c = value
					value = round((value * (9/5)) + 32, 2)
					self._debug(f'INFO: Converting temperature to F to match Allsky settings. ({value_c}C -> {value}F)')
			else:
				temp_units = 'C'
				
			match = re.search(r'\bdp(\d+)\b', format)
			dp = 0
			if match:
				dp = self._parse_dp(formats)
			
			value = self._format_number(value, dp, False)
         
			if 'deg' in formats:
				value = f'{value}°'
	
			if 'unit' in formats:
				value = f'{value} {temp_units}'

			value = str(value)
		except ValueError:
			# TODO : raise some kind of exception
			pass

   
		return value

	def as_filesize(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a file size in bytes to a human readable format

			Formatters
   
			auto		- Auto convert the value

		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
  
		float_value = float(value)
		formats = self._split_format(format)

		add_unit = False
		if 'fsunit' in formats:
			add_unit = True

		match = next((item for item in formats if item.upper() in ['AUTO', 'B', 'KB', 'MB', 'GB', 'TB']), None)
		if match:
			value = self._format_size(float_value, match.upper(), add_unit)
		
		return value

	def as_azimuth(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a value to various Azimuth formats

			Formatters
   
			int			- Formats the passed value to an integer
			intd		- Formats the passed value to an integer with a deegrees symbol  
			1dp			- Formats the passed value to 1 decimal places
			2dp			- Formats the passed value to 2 decimal places
			dms			- Formats the value to Degrees, Minutes and Seconds
   
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
		float_value = float(value)
		
		formats = self._split_format(format)

		if 'dms' in formats:
			degrees = int(float_value)
			minutes_decimal = abs(float_value - degrees) * 60
			minutes = int(minutes_decimal)
			seconds = round((minutes_decimal - minutes) * 60, 2)
			value = f"{degrees}° {minutes}' {seconds}\""
		else:
			match = re.search(r'\bdp(\d+)\b', format)
			dp = 0
			if match:
				dp = self._parse_dp(formats)
			
			value = self._format_number(float_value, dp, False)
			
			if 'deg' in formats:
				value = f'{value}°'

		value = str(value)

		return value

	def as_elevation(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a value to various elevation formats

			Formatters
   
			int			- Formats the passed value to an integer
			intd		- Formats the passed value to an integer with a deegrees symbol     
			1dp			- Formats the passed value to 1 decimal places
			2dp			- Formats the passed value to 2 decimal places
   
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
		float_value = float(value)
		
		formats = self._split_format(format)

		match = re.search(r'\bdp(\d+)\b', format)
		dp = 0
		if match:
			dp = self._parse_dp(formats)
		
		value = self._format_number(float_value, dp, False)
		
		if 'deg' in formats:
			value = f'{value}°'
    
		value = str(value)

		return value

	def as_gpio(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a value to various elevation formats

			Formatters
   
			onoff		- Shows On or Off
			yesno		- Shows Yes or No
			bool		- Shows True or False
   
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
		value = self._string_to_boolean(value)

		return self.as_bool(value, variable_name, format, variable_type)

	def as_string(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a string to various formats

			Formatters
   
			none		- No changes 
			lower		- Lowercase the string
			upper		- Uppercase the string
			camel		- Camelcase the string
			sentence	- Camelcase the string
			capitalize	- Capitalize the string
      
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""     

		if format == 'capitalize':
			value = value.capitalize()
      
		if format == 'lower':
			value = value.lower()
   
		if format == 'upper':
			value = value.upper()

		if format == 'camel':
			words = ''.join(c if c.isalnum() else ' ' for c in value).split()
			value = words[0].lower() + ' '.join(word.capitalize() for word in words[1:])

		if format == 'sentence':
			value = value.strip().capitalize()

		return value

	def as_altitude(self, value, variable_name, format, variable_type, debug=False):
		''' Converts an altitude in meters to a flight level
		'''
		
		if format == 'flightlevel':
			value = int(value)
			if value < 1000:
				value = f'{value}ft'
			else: 
				value = f'FL{int(value / 100):03}'
			
		return value

	def as_flip(self, value, variable_name, format, variable_type, debug=False):
		''' Converts an altitude in meters to a flight level
		'''
		
		if format == 'flip':
			value = value.capitalize()
			
		return value

	def as_deg(self, value, variable_name, format, variable_type, debug=False):
		""" Adds a degrees symbol
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
		value = f'{str(value)}°'


		return value

	def as_per(self, value, variable_name, format, variable_type, debug=False):
		""" Adds a percent symbol
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""
		value = f'{str(value)}%'


		return value

	def as_distance(self, value, variable_name, format, variable_type, debug=False):
		""" Converts a distance to various units
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""

		value = int(value)
  
		if format == 'allsky':
			pass

		if format == 'mtok':
			value = int(value * 1.60934)

		if format == 'ktom':
			value = int(value * 0.621371)
           
		return value

allsky_formatters = AllskyFormatters()

