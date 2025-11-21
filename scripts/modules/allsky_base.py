import allsky_shared as allsky_shared
import os
import json
import time
from functools import wraps


class ALLSKYMODULEBASE:
	"""
	Base class for Allsky processing modules.

	This class provides a common interface and helper methods that Allsky
	modules can inherit from. It handles:

	- Storing the raw `params` dictionary passed in from the flow.
	- Storing the `event` that triggered the module (e.g. postcapture, periodic).
	- A simple debug mode that prints directly to stdout instead of using the
	  shared logger.
	- Unified parameter retrieval via :meth:`get_param`, including support for
	  "secret" parameters stored in ``env.json`` (rather than in plain text
	  module configuration).
	- A small compatibility layer around the historical ``metaData`` global,
	  via the ``meta_data`` instance attribute.
	"""

	params = []
	event = ''

	def __init__(self, params, event):
		"""
		Initialize the module base with parameters and the triggering event.

		Args:
			params (dict):
				Dictionary of parameters passed to the module from the flow
				configuration. Typically this comes from the JSON module config.
			event (str):
				Name of the event that triggered this module (for example,
				``"postcapture"``, ``"daynight"``, ``"periodic"`` etc.).

		Side Effects:
			- Sets ``self.params`` and ``self.event`` from the arguments.
			- Sets ``self.debugmode`` / ``self.debug_mode`` based on the
			  ``ALLSKYTESTMODE`` parameter. When True, messages are printed
			  directly rather than sent to the Allsky logger.
			- Provides a compatibility bridge from the legacy global
			  ``metaData`` to the instance attribute ``meta_data`` if the
			  latter has not been set on the subclass.

		Notes:
			Subclasses are expected to define a ``meta_data`` attribute that
			describes the module (arguments, defaults, secrets etc.). If that
			is not present, this initializer will attempt to fall back to an
			older global variable named ``metaData`` if it exists.
		"""
		self.params = params
		self.event = event
		self.debugmode = self.get_param('ALLSKYTESTMODE', False, bool)
		self.debug_mode = self.debugmode

		'''
		Originally metaData was a global variable but has since been replaced by meta_data as 
		a class variable. This code will set hte class variable if its not been defined from
		the global variable if it is defined.
		'''
		if not hasattr(self, 'meta_data'):
			if 'metaData' in globals():
				self.meta_data = globals('metaData')

	def get_param(self, param, default, target_type=str, use_default_if_blank=False):
		"""
		Retrieve a module parameter with optional type conversion and secret handling.

		This method is the preferred way for modules to read configuration
		values. It looks up the parameter in ``self.params``, optionally
		overrides it from ``env.json`` if the parameter is marked as a secret,
		and then attempts to cast it to the requested type.

		Args:
			param (str):
				The parameter name to look up.
			default (Any):
				Default value to return if the parameter is missing or cannot
				be cast to ``target_type``.
			target_type (type, optional):
				Type to cast the parameter value to (for example ``str``,
				``int``, ``float``, ``bool``). Defaults to ``str``.
			use_default_if_blank (bool, optional):
				If True and the target type is ``str``, an empty string will
				be treated as "no value" and the default will be returned
				instead. Defaults to False.

		Secret handling:
			If the module defines ``self.meta_data`` and it contains an
			``"argumentdetails"`` section, any parameter marked with
			``"secret": true`` will be read from Allsky's ``env.json`` using
			the key ``<MODULE>_<PARAM>`` (both upper-cased). If the key is not
			found in the env file, an error is logged via ``allsky_shared.log``.

		Returns:
			Any:
				The parameter value converted to ``target_type`` if possible,
				or the supplied ``default`` if the lookup fails, casting
				fails, or the value is considered blank and
				``use_default_if_blank`` is True.

		Notes:
			- No exception is raised if casting fails; the default is silently
			  used instead.
			- This helper is designed to be resilient and safe to call from
			  within modules without needing try/except at every call site.
		"""
		result = default

		try:
			result = self.params[param]
		except (ValueError, KeyError):
			pass

		if hasattr(self, 'meta_data'):
			if 'argumentdetails' in self.meta_data:
				if param in self.meta_data['argumentdetails']:
					if 'secret' in self.meta_data['argumentdetails'][param]:
						env_file = os.path.join(allsky_shared.ALLSKYPATH, 'env.json')
						with open(env_file, 'r', encoding='utf-8') as file:
							env_data = json.load(file)
							env_key = f"{self.meta_data['module'].upper()}_{param.upper()}"
							if env_key in env_data:
								result = env_data[env_key]
							else:
								allsky_shared.log(0, f'ERROR: Variable {param} not found in env file. Tried key {env_key}')

		try:
			result = target_type(result)
		except (ValueError, TypeError):
			#have_debug_mode = hasattr(allsky_shared, 'LOGLEVEL')
			#if have_debug_mode and allsky_shared.LOGLEVEL == 4:
			#	allsky_shared.log(4, f'INFO: Cannot cast "{param}" to {target_type.__name__}, value [{result}]. Using default "{default}"')
			result = default
	
		if target_type == str and use_default_if_blank:
			if result == '':
				result = default

		return result

	def log(self, level, message, preventNewline = False, exitCode=None, sendToAllsky=False):
		"""
		Log a message via the shared Allsky logger or print in debug mode.

		This is a thin wrapper around :func:`allsky_shared.log` that respects
		the module's debug mode:

		- If ``self.debug_mode`` is True, the message is printed directly to
		  stdout.
		- Otherwise, the call is forwarded to ``allsky_shared.log`` with the
		  same arguments.

		Args:
			level (int):
				Log level as used by the Allsky logging system (for example,
				0 for errors, higher numbers for more verbose output).
			message (str):
				The message to log.
			preventNewline (bool, optional):
				If True, do not end the log line with a newline. Defaults to False.
			exitCode (int | None, optional):
				If not None, the underlying logger may terminate the process
				with this exit code. Defaults to None.
			sendToAllsky (bool, optional):
				When True, forwards the message into Allsky's Web UI message
				system as well as standard output, depending on logging level.
				Defaults to False.

		Returns:
			None
		"""
		if self.debug_mode:
			print(message)
		else:
			allsky_shared.log(level, message, preventNewline = preventNewline, exitCode=exitCode, sendToAllsky=sendToAllsky)
  
	def debug_log(self, message):
		"""
		Write a debug message only when debug mode is enabled.

		This helper is intended for very chatty or development-only messages
		that should never reach the normal Allsky logging system. It simply
		prints the message to stdout if ``self.debug_mode`` is True.

		Args:
			message (str):
				Message to print when debug mode is active.

		Returns:
			None
		"""
		if self.debug_mode:
			print(message)

	def get_database_config(self):
		"""
		Return the resolved database configuration for the current Allsky setup.

		This is a convenience wrapper around
		:func:`allsky_shared.get_database_config`, which merges secrets from
		``env.json`` with settings from the Allsky configuration file.

		Returns:
			dict:
				A dictionary containing at least:

				- ``databasehost`` (str)
				- ``databaseuser`` (str)
				- ``databasepassword`` (str)
				- ``databasedatabase`` (str)
				- ``databasetype`` (str) - e.g. ``"mysql"`` or ``"sqlite"``
				- ``databaseenabled`` (bool or truthy value)

		Notes:
			This method does not open any connections itself; it only reads
			configuration that can be passed on to the database manager.
		"""
		database_config = allsky_shared.get_database_config()
  
		return database_config