import board

def get_board_pin(gpio_str):
    try:
        return getattr(board, f"D{int(gpio_str)}")
    except (AttributeError, ValueError):
        return None