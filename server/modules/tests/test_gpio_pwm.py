"""Run with: venv/bin/python -m unittest discover -s server/tests -v"""

from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from flask import Flask

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from modules import gpio
from modules.gpio.backends import LgpioBackend, RPiGPIOBackend


class LgpioError(Exception):
    def __init__(self, value):
        super().__init__(value)
        self.value = value


def make_backend():
    # Exercise the real backend and routes without accessing any GPIO hardware.
    backend = LgpioBackend.__new__(LgpioBackend)
    backend.handle = 17
    backend.chip_info = [0, 54, "gpiochip3", "pinctrl-bcm2711"]
    backend.lgpio = SimpleNamespace(
        error=LgpioError,
        GPIO_BUSY=-79,
        error_text=lambda code: "GPIO busy" if code == -79 else "hardware error",
        gpio_get_mode=Mock(return_value=0),
        gpio_claim_output=Mock(return_value=0),
        gpio_free=Mock(return_value=0),
        tx_pwm=Mock(return_value=0),
    )
    return backend


class GPIOPWMTests(unittest.TestCase):
    def setUp(self):
        self.backend = make_backend()
        registry_patch = patch.multiple(
            gpio, gpio_backend=self.backend, digital_pins={}, pwm_pins={},
            tacho_monitors={}, pin_names={}
        )
        registry_patch.start()
        self.addCleanup(registry_patch.stop)
        pinctrl_patch = patch(
            "modules.gpio.backends.lgpio_backend.subprocess.run",
            return_value=subprocess.CompletedProcess(
                ["pinctrl", "get", "18"], 0, "18: ip pd | lo // GPIO18 = input\n", ""
            ),
        )
        self.pinctrl = pinctrl_patch.start()
        self.addCleanup(pinctrl_patch.stop)
        app = Flask(__name__)
        app.testing = True
        app.register_blueprint(gpio.gpio_bp, url_prefix="/gpio")
        self.client = app.test_client()

    def set_pwm(self, **overrides):
        data = {"pin": "18", "frequency": 1000, "duty": 32768, "name": "heater"}
        data.update(overrides)
        return self.client.post("/gpio/pwm", json=data)

    def assert_not_claimed(self):
        self.backend.lgpio.gpio_claim_output.assert_not_called()
        self.backend.lgpio.tx_pwm.assert_not_called()
        self.backend.lgpio.gpio_free.assert_not_called()
        self.assertEqual(gpio.pwm_pins, {})
        self.assertEqual(gpio.pin_names, {})

    def test_kernel_claim_returns_conflict_without_touching_pin(self):
        self.backend.lgpio.gpio_get_mode.return_value = 1
        response = self.set_pwm()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["pin"], "18")
        self.assertEqual(response.json["reason"], "GPIO line is claimed")
        self.pinctrl.assert_not_called()
        self.assert_not_claimed()

    def test_alternate_function_returns_conflict_without_touching_pin(self):
        self.pinctrl.return_value.stdout = "\n 18: a5    pn | lo // GPIO18 = PWM0\n"
        response = self.set_pwm()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["reason"], "GPIO configured for alternate function (a5)")
        self.assert_not_claimed()

    def test_available_pin_uses_selected_chip_and_starts_pwm(self):
        # Output and pull-down flags are not ownership flags. Using GPIO_BUSY
        # as a bit mask incorrectly treats these available lines as reserved.
        self.backend.lgpio.gpio_get_mode.return_value = 2 | 64
        response = self.set_pwm()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["duty_percent"], 50.0)
        self.backend.lgpio.gpio_get_mode.assert_called_once_with(17, 18)
        self.backend.lgpio.gpio_claim_output.assert_called_once_with(17, 18, level=0)
        self.backend.lgpio.tx_pwm.assert_called_once_with(17, 18, 1000, (32768 / 65535) * 100)
        self.assertEqual(gpio.pwm_pins, {"18": {"frequency": 1000, "duty": 32768}})
        self.assertEqual(gpio.pin_names, {"18": "heater"})

    def test_owned_pwm_can_be_updated_and_stopped(self):
        gpio.pwm_pins["18"] = {"frequency": 1000, "duty": 10000}
        self.backend.lgpio.gpio_get_mode.return_value = 1
        response = self.set_pwm(frequency=500)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(gpio.pwm_pins["18"]["frequency"], 500)
        self.backend.lgpio.gpio_get_mode.assert_not_called()
        self.backend.lgpio.gpio_claim_output.assert_not_called()
        self.pinctrl.assert_not_called()

        response = self.set_pwm(duty=0)
        self.assertEqual(response.status_code, 200)
        self.backend.lgpio.tx_pwm.assert_called_with(17, 18, 0, 0)
        self.backend.lgpio.gpio_free.assert_called_once_with(17, 18)
        self.assertEqual(gpio.pwm_pins, {})

    def test_owned_digital_pin_can_be_changed_to_pwm(self):
        gpio.digital_pins["18"] = {"direction": "output"}
        self.backend.lgpio.gpio_get_mode.return_value = 1
        response = self.set_pwm()
        self.assertEqual(response.status_code, 200)
        self.backend.lgpio.gpio_free.assert_called_once_with(17, 18)
        self.backend.lgpio.gpio_claim_output.assert_called_once_with(17, 18, level=0)
        self.backend.lgpio.gpio_get_mode.assert_not_called()
        self.assertEqual(gpio.digital_pins, {})
        self.assertIn("18", gpio.pwm_pins)

    def test_zero_duty_on_unowned_pin_does_not_touch_hardware(self):
        self.backend.lgpio.gpio_get_mode.return_value = 1
        response = self.set_pwm(duty=0, name="")
        self.assertEqual(response.status_code, 200)
        self.backend.lgpio.gpio_get_mode.assert_not_called()
        self.pinctrl.assert_not_called()
        self.assert_not_claimed()

    def test_owned_tacho_pin_can_be_changed_to_pwm(self):
        monitor = gpio.TachoMonitor("fan", "18", 18, "fan", 2, 10, 5, 0)
        callback = Mock()
        monitor._callback_ref = callback
        monitor._running = True
        gpio.tacho_monitors["fan"] = monitor
        self.backend.lgpio.gpio_get_mode.return_value = 1

        response = self.set_pwm()

        self.assertEqual(response.status_code, 200)
        callback.cancel.assert_called_once_with()
        self.assertFalse(monitor.running)
        self.assertEqual(gpio.tacho_monitors, {})
        self.backend.lgpio.gpio_free.assert_called_once_with(17, 18)
        self.backend.lgpio.gpio_claim_output.assert_called_once_with(17, 18, level=0)
        self.backend.lgpio.gpio_get_mode.assert_not_called()
        self.pinctrl.assert_not_called()
        self.assertIn("18", gpio.pwm_pins)

    def test_reserved_pin_does_not_stop_other_tacho_monitors(self):
        monitor = SimpleNamespace(pin="19", stop=Mock())
        gpio.tacho_monitors["fan"] = monitor
        self.backend.lgpio.gpio_get_mode.return_value = 1

        response = self.set_pwm()

        self.assertEqual(response.status_code, 409)
        monitor.stop.assert_not_called()
        self.assertEqual(gpio.tacho_monitors, {"fan": monitor})
        self.assert_not_claimed()

    def test_zero_duty_preserves_tacho_release_behaviour(self):
        monitor = gpio.TachoMonitor("fan", "18", 18, "fan", 2, 10, 5, 0)
        gpio.tacho_monitors["fan"] = monitor

        response = self.set_pwm(duty=0)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(gpio.tacho_monitors, {})
        self.backend.lgpio.gpio_free.assert_called_once_with(17, 18)
        self.backend.lgpio.gpio_claim_output.assert_not_called()
        self.backend.lgpio.gpio_get_mode.assert_not_called()
        self.backend.lgpio.tx_pwm.assert_not_called()

    def test_rpi_gpio_alternate_function_returns_conflict(self):
        backend = RPiGPIOBackend.__new__(RPiGPIOBackend)
        backend.GPIO = SimpleNamespace(IN=1, OUT=0, gpio_function=Mock(return_value=43), setup=Mock())
        with patch.object(gpio, "gpio_backend", backend):
            response = self.set_pwm()

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["reason"], "GPIO configured for alternate function")
        backend.GPIO.setup.assert_not_called()
        self.assert_not_claimed()

    def test_failed_ownership_check_returns_service_unavailable(self):
        self.backend.lgpio.gpio_get_mode.side_effect = LgpioError("hardware error")
        response = self.set_pwm()
        self.assertEqual(response.status_code, 503)
        self.assertIn("Unable to determine GPIO 18 ownership", response.json["message"])
        self.pinctrl.assert_not_called()
        self.assert_not_claimed()

    def test_negative_ownership_result_is_not_treated_as_flags(self):
        self.backend.lgpio.gpio_get_mode.return_value = -5
        response = self.set_pwm()
        self.assertEqual(response.status_code, 503)
        self.pinctrl.assert_not_called()
        self.assert_not_claimed()

    def test_failed_pinctrl_check_returns_service_unavailable(self):
        failures = [
            FileNotFoundError("pinctrl unavailable"),
            PermissionError("permission denied"),
            subprocess.TimeoutExpired(["pinctrl", "get", "18"], 2),
            subprocess.CalledProcessError(
                1, ["pinctrl", "get", "18"], stderr="Unable to open /dev/gpiomem"
            ),
        ]
        for failure in failures:
            with self.subTest(failure=type(failure).__name__):
                self.pinctrl.side_effect = failure
                response = self.set_pwm()
                self.assertEqual(response.status_code, 503)
                self.assertIn("Unable to determine GPIO 18 function", response.json["message"])
                self.assert_not_claimed()

    def test_unrecognised_pinctrl_output_returns_service_unavailable(self):
        for output in ("", "19: ip pd | lo\n", "18: unknown pd | lo\n"):
            with self.subTest(output=output):
                self.pinctrl.return_value.stdout = output
                response = self.set_pwm()
                self.assertEqual(response.status_code, 503)
                self.assert_not_claimed()

    def test_claim_race_returns_conflict(self):
        for result in (LgpioError("GPIO busy"), -79):
            with self.subTest(result=result):
                if isinstance(result, Exception):
                    self.backend.lgpio.gpio_claim_output.side_effect = result
                else:
                    self.backend.lgpio.gpio_claim_output.side_effect = None
                    self.backend.lgpio.gpio_claim_output.return_value = result
                response = self.set_pwm()
                self.assertEqual(response.status_code, 409)
                self.backend.lgpio.tx_pwm.assert_not_called()
                self.backend.lgpio.gpio_free.assert_not_called()
                self.assertEqual(gpio.pwm_pins, {})
                self.assertEqual(gpio.pin_names, {})

    def test_unrelated_claim_failure_remains_server_error(self):
        self.backend.lgpio.gpio_claim_output.side_effect = LgpioError("hardware error")
        response = self.set_pwm()
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json["error"], "Failed to set PWM")
        self.backend.lgpio.tx_pwm.assert_not_called()

    def test_failed_pwm_setup_releases_new_claim_so_retry_can_succeed(self):
        self.backend.lgpio.tx_pwm.side_effect = LgpioError("hardware error")
        response = self.set_pwm()
        self.assertEqual(response.status_code, 500)
        self.backend.lgpio.gpio_free.assert_called_once_with(17, 18)
        self.assertEqual(gpio.pwm_pins, {})
        self.assertEqual(gpio.pin_names, {})

        self.backend.lgpio.tx_pwm.side_effect = None
        response = self.set_pwm()
        self.assertEqual(response.status_code, 200)


class BackendReservationTests(unittest.TestCase):
    def test_lgpio_allows_unclaimed_gpio_functions(self):
        backend = make_backend()
        with patch("modules.gpio.backends.lgpio_backend.subprocess.run") as pinctrl:
            for function in ("ip", "op", "no"):
                with self.subTest(function=function):
                    pinctrl.return_value.stdout = f"18: {function} pd | lo\n"
                    self.assertEqual(backend.gpio_is_reserved(18), (False, "GPIO available"))

    def test_rpi_gpio_detects_alternate_functions(self):
        backend = RPiGPIOBackend.__new__(RPiGPIOBackend)
        backend.GPIO = SimpleNamespace(IN=1, OUT=0, gpio_function=Mock())
        for function, reserved in ((1, False), (0, False), (43, True)):
            with self.subTest(function=function):
                backend.GPIO.gpio_function.return_value = function
                self.assertEqual(backend.gpio_is_reserved(18)[0], reserved)


if __name__ == "__main__":
    unittest.main()
