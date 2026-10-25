import logging
import board

logger = logging.getLogger(__name__)

def get_board_pin(gpio_str):
    try:
        return getattr(board, f"D{int(gpio_str)}")
    except (AttributeError, ValueError):
        logger.debug("Invalid board GPIO pin: %r", gpio_str, exc_info=True)
        return None
