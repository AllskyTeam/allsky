"""Validate shared exports without loading hardware-dependent imports."""
import ast
from pathlib import Path
import unittest


class SharedExportsTests(unittest.TestCase):
    def test_exports_resolve(self):
        source = Path(__file__).resolve().parents[1] / 'scripts/modules/allsky_shared.py'
        tree = ast.parse(source.read_text())
        assignment = next(node for node in tree.body if isinstance(node, ast.Assign)
                          and any(isinstance(target, ast.Name) and target.id == '__all__'
                                  for target in node.targets))
        exports = ast.literal_eval(assignment.value)
        namespace = {node.name: object() for node in tree.body if isinstance(node, ast.FunctionDef)}
        namespace['__all__'] = exports
        for name in exports:
            self.assertIn(name, namespace)
        self.assertIn('detect_meteors', exports)
        self.assertIn('draw_detections', exports)


if __name__ == '__main__':
    unittest.main()
