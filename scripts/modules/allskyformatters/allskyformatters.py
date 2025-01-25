import time
import locale
import allsky_shared as allsky_shared

from datetime import date, datetime

from allskyexceptions import AllskyFormatError

class AllskyFormatters:
	def __init__(self):
		pass

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

	def _format_size(self, size_bytes, unit=None):
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
				#return f"{size_bytes / (factor ** idx):.2f} {unit}"
				return f"{size_bytes / (factor ** idx):.2f}"
		
		# Automatic scaling
		for u in units:
			if size_bytes < factor:
				#return f"{size_bytes:.2f} {u}"
				return f"{size_bytes:.2f}"
			size_bytes /= factor

		#return f"{size_bytes:.2f} {units[-1]}"
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

	def as_bool(self, value, variable_name, format, variable_type):
		
		if format == '%yes':
			if type(value) is bool:
				if value:
					value = 'Yes'
				else:
					value = 'No'        
		
		if format == '%on':
			if type(value) is bool:
				if value:
					value = 'On'
				else:
					value = 'Off'        
          
		return value

	def as_string(self, value, variable_name, format, variable_type):
		return value

	def as_timestamp(self, value, variable_name, format, variable_type):
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

	def as_date(self, value, variable_name, format, variable_type):
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

	def as_time(self, value, variable_name, format, variable_type):
		timeStamp = time.localtime(value)
		if format is None:
			value = time.strftime('%H:%M:%S', timeStamp)
		else:
# TODO: Check for bad format?
			value = time.strftime(format, timeStamp)     
		
		return value

	def as_number(self, value, variable_name, format, variable_type):

		if format is not None and format != "":
			original_format = format
			if format.startswith(':'):
				format = "{" + format + "}"
			convertValue = 0
			try:
				try:
					convertValue = int(value)
				except ValueError:
					convertValue = float(value)
				try:
					if format.startswith('{'):
						value = format.format(convertValue)
					else:
						if format.startswith('%'):
							value = locale.format_string(format, convertValue, grouping=True)
						else:
							value = convertValue
				except Exception as err:
					error =  f"ERROR: Cannot use format '{original_format}' on Number variables like {variable_type.variable} (value={value})."
					raise AllskyFormatError(error, 0, True)        
			except ValueError as err:
					error =  f"ERROR: Cannot use format '{original_format}' on Number variables like {variable_type.variable} (value={value})."
					raise AllskyFormatError(error, 0, True)          

		return value

	def as_int(self, value, variable_name, format, variable_type):
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

	def as_temperature(self, value, variable_name, format, variable_type):
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
			float_value = float(value)

			if format == 'deg':
				value = f'{float_value:.2f}'

			if format == 'degint':
				value = int(float_value)
    
			if format == 'degctof':
				value = value * 9 / 5 + 32
				value = f'{float_value:.2f}'

			if format == 'degctofint':
				value = value * 9 / 5 + 32
				value = int(value)
    
			if format == 'degftoc':
				value = (value - 32) * 5 / 9
				value = f'{float_value:.2f}'
    
			if format == 'degftocint':
				value = int(value)

			value = str(value)
		except ValueError:
			# TODO : raise some kind of exception
			pass

   
		return value

	def as_filesize(self, value, variable_name, format, variable_type):
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
     
		value = self._format_size(float_value, format.upper())
      
		return value

	def as_azimuth(self, value, variable_name, format, variable_type):
		""" Converts a value to various Azimuth formats

			Formatters
   
			int			- Formats the passed value to an integer
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
		
		if format == 'int':
			value = int(float_value)

		if format == '1dp':
			value = f'{float_value:.1f}'

		if format == '2dp':
			value = f'{float_value:.2f}'

		if format == 'dms':
			degrees = int(float_value)
			minutes_decimal = abs(float_value - degrees) * 60
			minutes = int(minutes_decimal)
			seconds = round((minutes_decimal - minutes) * 60, 2)
			value = f"{degrees}° {minutes}' {seconds}\""

		value = str(value)

		return value

	def as_elevation(self, value, variable_name, format, variable_type):
		""" Converts a value to various elevation formats

			Formatters
   
			int			- Formats the passed value to an integer
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
		
		if format == 'int':
			value = int(float_value)

		if format == '1dp':
			value = f'{float_value:.1f}'

		if format == '2dp':
			value = f'{float_value:.2f}'

		value = str(value)

		return value

	def as_gpio(self, value, variable_name, format, variable_type):
		""" Converts a value to various elevation formats

			Formatters
   
			onoff		- Shows On or Off 
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

		if format == 'onoff':
			if value:
				value = 'On'
			else:
				value = 'Off'

		if format == 'bool':
			if value:
				value = 'True'
			else:
				value = 'False'
    

		return value

	def as_string(self, value, variable_name, format, variable_type):
		""" Converts a string to various formats

			Formatters
   
			none		- No changes 
			lower		- Lowercase the string
			upper		- Uppercase the string
			camel		- Camelcase the string
			sentence	- Camelcase the string
   
		Args:
			value (any): The input value 
			variable_name 	(string):	The name of the variable
			format 			(string):	The format to be applied
			variable_type 	(object):	The variable type object

		Returns:
			(string): The formatted value
		"""     

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

	def as_altitude(self, value, variable_name, format, variable_type):
		''' Converts an altitude in meters to a flight level
		'''
		
		if format == 'flightlevel':
			value = int(value)
			if value < 1000:
				value = f'{value}ft'
			else: 
				value = f'FL{int(value / 100):03}'
			
		return value
     
allsky_formatters = AllskyFormatters()