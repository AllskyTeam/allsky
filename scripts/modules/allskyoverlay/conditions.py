"""
Conditional styles for overlay text fields.

A text field whose label holds a single variable can have "conditions": rules that
change its style (colour, stroke, opacity, font, size) depending on the variable's
value.  They are applied after a module's own colour ("fill"), so they can override it.

The conditions are stored in the field, either inline or as the name of a rule set
that is stored in the same overlay file under "conditionsets":

	"conditions": {"set": "On/Off"}

	"conditions": {
		"type": "number",
		"rules": [
			{"when": [{"op": "<", "value": 0}], "style": {"fill": "#4da6ff"}},
			{"when": [{"op": ">", "value": 11}, {"op": "<=", "value": 12}], "style": {"fill": "#ff4d4d"}}
		]
	}

Types:
	boolean		"true" and "false" styles; a truthy value gets "true", a falsy one "false".
	number		rules with one or more conditions (all must hold); the first matching rule wins.
	text		rules with "equals", "contains" or "startswith", always case-insensitive;
				the first matching rule wins.

A missing or empty value, or a value that doesn't fit the type, matches nothing.
"""

# "text" isn't a style: it replaces the shown value, e.g. "DANGER" for a temperature above 90.
# Only the overlay shows it; the variable itself keeps its value.
STYLE_KEYS = ('fill', 'stroke', 'strokewidth', 'opacity', 'font', 'fontsize', 'text')

NUMBER_OPERATORS = {
	'<':  lambda a, b: a < b,
	'<=': lambda a, b: a <= b,
	'>':  lambda a, b: a > b,
	'>=': lambda a, b: a >= b,
	'=':  lambda a, b: a == b,
}

TEXT_OPERATORS = {
	'equals':     lambda a, b: a == b,
	'contains':   lambda a, b: b in a,
	'startswith': lambda a, b: a.startswith(b),
}

TRUTHY = ('true', 'yes', 'on', '1')
FALSY = ('false', 'no', 'off', '0')


def _is_empty(value):
	return value is None or (isinstance(value, str) and value.strip() == '')


def _to_bool(value):
	""" True, False, or None if the value is neither truthy nor falsy. """
	if isinstance(value, bool):
		return value
	if isinstance(value, (int, float)):
		return value != 0
	text = str(value).strip().lower()
	if text in TRUTHY:
		return True
	if text in FALSY:
		return False
	try:
		return float(text) != 0
	except ValueError:
		return None


def _to_number(value):
	if isinstance(value, bool):
		return None
	try:
		return float(value)
	except (TypeError, ValueError):
		return None


def _clean_style(style):
	""" Only the style properties the renderer knows, and only those that are set. """
	if not isinstance(style, dict):
		return None
	result = {key: style[key] for key in STYLE_KEYS if key in style and style[key] not in (None, '')}
	return result or None


def resolve(conditions, condition_sets=None):
	""" The conditions themselves, or the named set they refer to (None if missing). """
	if not isinstance(conditions, dict):
		return None
	name = conditions.get('set')
	if name:
		sets = condition_sets if isinstance(condition_sets, dict) else {}
		return sets.get(name)
	return conditions


def evaluate(conditions, value, condition_sets=None):
	"""
	Return the style (a dict with some of STYLE_KEYS) for this value, or None if
	no rule matches.  Never raises.
	"""
	try:
		conditions = resolve(conditions, condition_sets)
		if isinstance(value, dict):		# extra data can store {"value": ..., "expires": ...}
			value = value.get('value')
		if not conditions or _is_empty(value):
			return None

		kind = str(conditions.get('type', '')).lower()

		if kind == 'boolean':
			state = _to_bool(value)
			if state is None:
				return None
			return _clean_style(conditions.get('true' if state else 'false'))

		if kind == 'number':
			number = _to_number(value)
			if number is None:
				return None
			for rule in conditions.get('rules', []):
				if not isinstance(rule, dict):
					continue
				tests = rule.get('when', [])
				if not tests:
					continue
				matched = True
				for test in tests:
					operator = NUMBER_OPERATORS.get(test.get('op'))
					limit = _to_number(test.get('value'))
					if operator is None or limit is None or not operator(number, limit):
						matched = False
						break
				if matched:
					return _clean_style(rule.get('style'))
			return None

		if kind == 'text':
			text = str(value).strip().lower()
			for rule in conditions.get('rules', []):
				if not isinstance(rule, dict):
					continue
				operator = TEXT_OPERATORS.get(rule.get('op'))
				target = rule.get('value')
				if operator is None or _is_empty(target):
					continue
				if operator(text, str(target).strip().lower()):
					return _clean_style(rule.get('style'))
			return None

		return None
	except Exception:
		return None
