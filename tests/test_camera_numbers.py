"""Exercise camera numeric conversion without Pi hardware or image I/O."""
import ast
import locale
import os
from pathlib import Path
from types import SimpleNamespace
import unittest


class CameraNumberTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1]
        source = self.root / 'scripts/modules/allsky_shared.py'
        tree = ast.parse(source.read_text())
        names = {'asfloat', 'get_sensor_temperature', 'get_camera_gain'}
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        self.camera = 'rpi'
        self.value = None
        self.namespace = {'locale': locale, 'get_camera_type': lambda: self.camera,
                          'get_rpi_meta_value': lambda key: self.value,
                          'get_environment_variable': lambda key: self.value}
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), self.namespace)

    def test_camera_measurements(self):
        for self.camera in ('rpi', 'zwo'):
            for self.value, expected in [('36,2', 36.2), ('-2,5', -2.5), ('1,000', 1.0),
                                         ('0,000', 0.0), ('36.2', 36.2), (36.2, 36.2),
                                         (1.23456789012345, 1.23456789012345), (None, 0.0)]:
                for name in ('get_sensor_temperature', 'get_camera_gain'):
                    with self.subTest(camera=self.camera, value=self.value, helper=name):
                        self.assertEqual(self.namespace[name](), expected)

    def test_image_mean(self):
        source = self.root / 'scripts/modules/allsky_loadimage.py'
        tree = ast.parse(source.read_text())
        cls = next(node for node in tree.body if isinstance(node, ast.ClassDef))
        method = next(node for node in cls.body if isinstance(node, ast.FunctionDef) and node.name == 'run')
        values = {'AS_RESOLUTION_X': '640', 'AS_RESOLUTION_Y': '480', 'AS_EXPOSURE_US': '1000000'}
        captured = {}
        shared = SimpleNamespace(CURRENTIMAGEPATH='/image.jpg',
            get_environment_variable=lambda key: values.get(key, ''),
            get_camera_gain=lambda: 1.0, get_sensor_temperature=lambda: 0.0,
            asfloat=self.namespace['asfloat'],
            save_extra_data=lambda name, data, *args, **kwargs: captured.update(data))
        namespace = {'allsky_shared': shared, 'os': os,
                     'cv2': SimpleNamespace(imread=lambda path: object())}
        exec(compile(ast.Module(body=[method], type_ignores=[]), str(source), 'exec'), namespace)
        instance = SimpleNamespace(meta_data={'extradatafilename': 'camera.json', 'module': 'loadimage',
                                             'extradata': {}}, event='night',
            _cleanup_module_data=lambda: None, _dump_debug_data=lambda: None,
            update_allsky_sensor_server=lambda: None, log=lambda *args, **kwargs: None)
        for value in ('0,28161', '0.28161'):
            with self.subTest(mean=value):
                values['AS_MEAN'] = value
                namespace['run'](instance)
                self.assertEqual(captured['AS_MEAN'], 0.28161)


if __name__ == '__main__':
    unittest.main()
