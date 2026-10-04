"""Check capture flags without image or Raspberry Pi hardware I/O."""
import ast
import os
from pathlib import Path
from types import SimpleNamespace
import unittest


class LoadImageFlagTests(unittest.TestCase):
    def test_capture_flags(self):
        root = Path(__file__).resolve().parents[1]
        shared_tree = ast.parse((root / 'scripts/modules/allsky_shared.py').read_text())
        to_bool = [node for node in shared_tree.body
                   if isinstance(node, ast.FunctionDef) and node.name == 'to_bool'][-1]
        helpers = {}
        exec(compile(ast.Module(body=[to_bool], type_ignores=[]), '<shared>', 'exec'), helpers)
        tree = ast.parse((root / 'scripts/modules/allsky_loadimage.py').read_text())
        cls = next(node for node in tree.body if isinstance(node, ast.ClassDef))
        run = next(node for node in cls.body if isinstance(node, ast.FunctionDef) and node.name == 'run')
        values = {'AS_RESOLUTION_X': '640', 'AS_RESOLUTION_Y': '480',
                  'AS_EXPOSURE_US': '1000000', 'AS_MEAN': '0.5'}
        captured = {}
        shared = SimpleNamespace(CURRENTIMAGEPATH='/image.jpg', to_bool=helpers['to_bool'],
            get_environment_variable=lambda key: values.get(key), get_camera_gain=lambda: 1.0,
            get_sensor_temperature=lambda: 20.0,
            save_extra_data=lambda name, data, *args, **kwargs: captured.update(data))
        namespace = {'allsky_shared': shared, 'os': os,
                     'cv2': SimpleNamespace(imread=lambda _: object())}
        exec(compile(ast.Module(body=[run], type_ignores=[]), '<loadimage>', 'exec'), namespace)
        instance = SimpleNamespace(meta_data={'extradatafilename': 'camera.json', 'module': 'loadimage',
                                             'extradata': {}}, event='night',
            _cleanup_module_data=lambda: None, _dump_debug_data=lambda: None,
            update_allsky_sensor_server=lambda: None, log=lambda *args, **kwargs: None)
        for exposure, gain in [('0', '1'), ('1', '0'), ('0', '0'), ('1', '1'), (None, None)]:
            with self.subTest(exposure=exposure, gain=gain):
                values['AS_AUTOEXPOSURE'] = exposure
                values['AS_AUTOGAIN'] = gain
                namespace['run'](instance)
                self.assertIs(captured['AS_AUTOEXPOSURE'], exposure == '1')
                self.assertIs(captured['AS_AUTOGAIN'], gain == '1')


if __name__ == '__main__':
    unittest.main()
