from .base import GPIOBackendUnavailable
from .lgpio_backend import LgpioBackend
from .rpi_gpio_backend import RPiGPIOBackend


def select_gpio_backend():
    errors = []

    for backend_class in (LgpioBackend, RPiGPIOBackend):
        try:
            return backend_class()
        except Exception as exc:
            errors.append(f"{backend_class.name}: {exc}")

    raise GPIOBackendUnavailable(f"No usable GPIO backend found: {'; '.join(errors)}")
