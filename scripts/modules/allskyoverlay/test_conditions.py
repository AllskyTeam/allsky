#!/usr/bin/env python3
"""
Tests for conditions.py.  Run with:  python3 test_conditions.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import conditions as c

RED = {'fill': '#ff0000'}
AMBER = {'fill': '#ffbf00'}
GREEN = {'fill': '#00ff00'}

TRAFFIC = {
	'type': 'number',
	'rules': [
		{'when': [{'op': '<', 'value': 0}], 'style': RED},
		{'when': [{'op': '>=', 'value': 0}, {'op': '<=', 'value': 10}], 'style': AMBER},
		{'when': [{'op': '>', 'value': 10}], 'style': GREEN},
	]
}
ONOFF = {'type': 'boolean', 'true': GREEN, 'false': RED}
WEATHER = {
	'type': 'text',
	'rules': [
		{'op': 'contains', 'value': 'thunder', 'style': RED},
		{'op': 'startswith', 'value': 'rain', 'style': AMBER},
		{'op': 'equals', 'value': 'Clear', 'style': GREEN},
	]
}


class TestNumber(unittest.TestCase):
	def test_ranges_and_bounds(self):
		self.assertEqual(c.evaluate(TRAFFIC, -0.5), RED)
		self.assertEqual(c.evaluate(TRAFFIC, 0), AMBER)		# both ends included
		self.assertEqual(c.evaluate(TRAFFIC, 10), AMBER)
		self.assertEqual(c.evaluate(TRAFFIC, 10.01), GREEN)

	def test_numeric_strings(self):
		self.assertEqual(c.evaluate(TRAFFIC, '12.5'), GREEN)
		self.assertEqual(c.evaluate(TRAFFIC, ' -3 '), RED)

	def test_first_match_wins(self):
		rules = {'type': 'number', 'rules': [
			{'when': [{'op': '>', 'value': 5}], 'style': RED},
			{'when': [{'op': '>', 'value': 1}], 'style': GREEN},
		]}
		self.assertEqual(c.evaluate(rules, 7), RED)
		self.assertEqual(c.evaluate(rules, 3), GREEN)
		self.assertIsNone(c.evaluate(rules, 0))

	def test_two_conditions_exclusive(self):
		rules = {'type': 'number', 'rules': [
			{'when': [{'op': '>', 'value': 11}, {'op': '<=', 'value': 12}], 'style': RED}]}
		self.assertIsNone(c.evaluate(rules, 11))
		self.assertEqual(c.evaluate(rules, 11.5), RED)
		self.assertEqual(c.evaluate(rules, 12), RED)
		self.assertIsNone(c.evaluate(rules, 12.1))

	def test_equal(self):
		rules = {'type': 'number', 'rules': [{'when': [{'op': '=', 'value': 3}], 'style': RED}]}
		self.assertEqual(c.evaluate(rules, '3.0'), RED)

	def test_not_a_number(self):
		self.assertIsNone(c.evaluate(TRAFFIC, 'Mostly clear'))
		self.assertIsNone(c.evaluate(TRAFFIC, True))

	def test_bad_rules_are_ignored(self):
		rules = {'type': 'number', 'rules': [
			{'when': [{'op': '~', 'value': 1}], 'style': RED},
			{'when': [{'op': '>', 'value': 'x'}], 'style': RED},
			{'when': [], 'style': RED},
			{'when': [{'op': '>', 'value': 0}], 'style': GREEN},
		]}
		self.assertEqual(c.evaluate(rules, 5), GREEN)


class TestBoolean(unittest.TestCase):
	def test_truthy(self):
		for value in (True, 'true', 'Yes', 'ON', '1', 1, 2.5, 'On '):
			self.assertEqual(c.evaluate(ONOFF, value), GREEN, value)

	def test_falsy(self):
		for value in (False, 'false', 'No', 'off', '0', 0, 0.0):
			self.assertEqual(c.evaluate(ONOFF, value), RED, value)

	def test_neither(self):
		self.assertIsNone(c.evaluate(ONOFF, 'Disabled'))

	def test_only_one_style(self):
		self.assertIsNone(c.evaluate({'type': 'boolean', 'true': GREEN}, 'off'))


class TestText(unittest.TestCase):
	def test_operators_case_insensitive(self):
		self.assertEqual(c.evaluate(WEATHER, 'Light THUNDERstorm'), RED)
		self.assertEqual(c.evaluate(WEATHER, 'Rain showers'), AMBER)
		self.assertEqual(c.evaluate(WEATHER, ' clear '), GREEN)
		self.assertIsNone(c.evaluate(WEATHER, 'Mostly clear'))		# equals, not contains
		self.assertIsNone(c.evaluate(WEATHER, 'Fog'))

	def test_numbers_as_text(self):
		rules = {'type': 'text', 'rules': [{'op': 'equals', 'value': '1', 'style': RED}]}
		self.assertEqual(c.evaluate(rules, 1), RED)


class TestGeneral(unittest.TestCase):
	def test_empty_values(self):
		for conditions in (TRAFFIC, ONOFF, WEATHER):
			self.assertIsNone(c.evaluate(conditions, None))
			self.assertIsNone(c.evaluate(conditions, ''))
			self.assertIsNone(c.evaluate(conditions, '   '))

	def test_named_sets(self):
		sets = {'On/Off': ONOFF}
		self.assertEqual(c.evaluate({'set': 'On/Off'}, 'on', sets), GREEN)
		self.assertIsNone(c.evaluate({'set': 'Missing'}, 'on', sets))
		self.assertIsNone(c.evaluate({'set': 'On/Off'}, 'on', None))

	def test_style_is_cleaned(self):
		rules = {'type': 'boolean', 'true': {'fill': '#fff', 'stroke': '', 'opacity': 0.5, 'x': 10, 'font': None}}
		self.assertEqual(c.evaluate(rules, 'yes'), {'fill': '#fff', 'opacity': 0.5})
		self.assertIsNone(c.evaluate({'type': 'boolean', 'true': {'x': 1}}, 'yes'))

	def test_wrapped_value(self):
		self.assertEqual(c.evaluate(TRAFFIC, {'value': 11.83, 'expires': 240}), GREEN)

	def test_broken_rule_is_skipped(self):
		rules = {'type': 'number', 'rules': [None, 'x', {'when': [{'op': '>', 'value': 0}], 'style': GREEN}]}
		self.assertEqual(c.evaluate(rules, 5), GREEN)

	def test_garbage_never_raises(self):
		for conditions in (None, 'x', [], {}, {'type': 'unknown'}, {'type': 'number', 'rules': 'x'},
						   {'type': 'number', 'rules': [None]}, {'type': 'text', 'rules': [{'op': 'contains'}]}):
			self.assertIsNone(c.evaluate(conditions, '5'))


if __name__ == '__main__':
	unittest.main(verbosity=1)
