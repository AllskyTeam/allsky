import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from allskyvariables import ALLSKYVARIABLES


class VariableLookupTests(unittest.TestCase):
    def setUp(self):
        self.variables = ALLSKYVARIABLES()
        self.space_weather = {
            'name': '${KPDATA}',
            'variable': 'SWX_KPDATA',
            'value': {'value': 1.33, 'fill': '#10e310', 'expires': 0},
        }
        self.date = {'name': '${DATE}', 'variable': 'AS_DATE', 'value': '2026-10-27'}

    def test_finds_variable_by_identifier_or_display_name(self):
        variables = [self.space_weather, self.date]
        for search, expected in [
            ('SWX_KPDATA', self.space_weather),
            ('KPDATA', self.space_weather),
            ('AS_DATE', self.date),
            ('DATE', self.date),
        ]:
            with self.subTest(search=search):
                self.assertIs(self.variables.get_variable(variables, search), expected)

    def test_identifier_takes_precedence_over_another_display_name(self):
        other = {'name': '${SWX_KPDATA}', 'variable': 'USER_KPDATA', 'value': 7}
        self.assertIs(
            self.variables.get_variable([other, self.space_weather], 'SWX_KPDATA'),
            self.space_weather,
        )

    def test_legacy_names_without_identifiers_still_work(self):
        legacy = {'name': '${EXPOSURE}', 'value': 1000}
        for search in ['EXPOSURE', 'AS_EXPOSURE']:
            with self.subTest(search=search):
                self.assertIs(self.variables.get_variable([legacy], search), legacy)

    def test_unknown_variable_returns_none(self):
        self.assertIsNone(self.variables.get_variable([self.space_weather], 'UNKNOWN'))


if __name__ == '__main__':
    unittest.main()
