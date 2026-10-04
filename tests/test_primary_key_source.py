"""Check the configured database key lookup without database or Pi I/O."""
import ast
import builtins
from pathlib import Path
from types import SimpleNamespace
import unittest


class PrimaryKeyTests(unittest.TestCase):
    def test_configured_key(self):
        source = Path(__file__).resolve().parents[1] / 'scripts/modules/allsky_shared.py'
        tree = ast.parse(source.read_text())
        function = next(node for node in tree.body
                        if isinstance(node, ast.FunctionDef) and node.name == 'get_primary_key_value')
        for env_value, debug_value, expected in [('42', '43', '42'), (None, '43', '43'),
                                                 (0, None, 0), (None, None, '100')]:
            with self.subTest(env=env_value, debug=debug_value):
                environment = {'AS_TIMESTAMP': '100', 'CUSTOM_KEY': env_value}
                namespace = {'get_environment_variable': environment.get,
                             'get_value_from_debug_data': lambda key: debug_value if key == 'CUSTOM_KEY' else None,
                             'builtins': builtins, 'time': SimpleNamespace(time=lambda: 200)}
                exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), 'exec'), namespace)
                self.assertEqual(namespace['get_primary_key_value'](
                    {'database': {'pk_source': 'CUSTOM_KEY'}}), expected)

    def test_timestamp_fallback(self):
        source = Path(__file__).resolve().parents[1] / 'scripts/modules/allsky_shared.py'
        tree = ast.parse(source.read_text())
        function = next(node for node in tree.body
                        if isinstance(node, ast.FunctionDef) and node.name == 'get_primary_key_value')
        for structure in ({}, {'database': {}}, {'database': {'pk_source': 'image_timestamp'}}):
            for timestamp, expected in [('101', '101'), (None, 200)]:
                with self.subTest(structure=structure, timestamp=timestamp):
                    namespace = {'get_environment_variable': lambda key: None,
                                 'get_value_from_debug_data': lambda key: timestamp if key == 'AS_TIMESTAMP' else None,
                                 'builtins': builtins, 'time': SimpleNamespace(time=lambda: 200)}
                    exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), 'exec'), namespace)
                    self.assertEqual(namespace['get_primary_key_value'](structure), expected)


if __name__ == '__main__':
    unittest.main()
