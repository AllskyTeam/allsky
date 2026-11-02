import logging

from .base import GPIOBackendUnavailable
from .lgpio_backend import LgpioBackend
from .rpi_gpio_backend import RPiGPIOBackend

logger = logging.getLogger(__name__)


def select_gpio_backend():
    errors = []

    for backend_class in (LgpioBackend, RPiGPIOBackend):
        try:
            return backend_class()
        except Exception as exc:
            logger.debug("GPIO backend %s unavailable", backend_class.name, exc_info=True)
            errors.append(f"{backend_class.name}: {exc}")

    raise GPIOBackendUnavailable(f"No usable GPIO backend found: {'; '.join(errors)}")
