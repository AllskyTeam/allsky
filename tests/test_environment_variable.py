"""Check the shared accessor without loading Raspberry Pi hardware modules."""
import ast
import json
import os
from pathlib import Path
import unittest
from unittest.mock import mock_open, patch


class EnvironmentVariableTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).resolve().parents[1] / 'scripts/modules/allsky_shared.py'
        tree = ast.parse(source.read_text())
        names = {'get_environment_variable', 'getEnvironmentVariable', 'read_environment_variable'}
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        self.namespace = {'os': os, 'json': json, 'ALLSKYPATH': '/allsky',
                          'get_value_from_debug_data': lambda name: 'debug value'}
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), self.namespace)
        self.addCleanup(patch.stopall)
        patch.dict(os.environ, {}, clear=True).start()

    def test_debug_file_fallback(self):
        with patch('builtins.open', side_effect=AssertionError('variables.json should not be read')):
            self.assertEqual(self.namespace['get_environment_variable'](
                'TEST_VALUE', try_allsky_debug_file=True), 'debug value')

    def test_default_variables_file_fallback(self):
        with patch('builtins.open', mock_open(read_data='{"TEST_VALUE": "file value"}')):
            self.assertEqual(self.namespace['get_environment_variable']('TEST_VALUE'), 'file value')

    def test_environment_takes_precedence(self):
        os.environ['TEST_VALUE'] = 'environment value'
        self.assertEqual(self.namespace['get_environment_variable'](
            'TEST_VALUE', try_allsky_debug_file=True), 'environment value')


if __name__ == '__main__':
    unittest.main()
