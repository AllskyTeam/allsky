import logging 

class LgpioBackend:
    name = "lgpio"

    def __init__(self):
        import lgpio

        self.lgpio = lgpio
        self.handle = None
        self.chip_info = None

    def _handle(self):
        """
        Open the gpiochip that provides the Raspberry Pi GPIO header.

        gpiochip numbers are not stable across Raspberry Pi models or kernel
        versions, so identify the controller by its kernel label instead.

        Known labels:
            pinctrl-bcm2835  - Pi Zero / Pi 1 / Pi 2 / Pi 3
            pinctrl-bcm2711  - Pi 4
            pinctrl-rp1      - Pi 5
        """

        if self.handle is not None:
            return self.handle

        import glob
        import os

        gpio_labels = {
            "pinctrl-bcm2835",
            "pinctrl-bcm2711",
            "pinctrl-rp1",
        }

        found = []
        last_error = None

        for device in glob.glob("/dev/gpiochip*"):

            # Ignore aliases such as /dev/gpiochip4 -> gpiochip0
            if os.path.islink(device):
                continue

            name = os.path.basename(device)

            try:
                chip = int(name.removeprefix("gpiochip"))
            except ValueError:
                continue

            handle = None

            try:
                handle = self.lgpio.gpiochip_open(chip)
                info = self.lgpio.gpio_get_chip_info(handle)

                # lgpio returns:
                # [status, lines, name, label]
                lines = info[1]
                label = info[3]

                found.append((chip, label))

                if label in gpio_labels:
                    self.handle = handle
                    self.chip_info = info

                    logging.info(
                        "Using /dev/gpiochip%d (%s, %d lines) for Raspberry Pi GPIO",
                        chip,
                        label,
                        lines,
                    )

                    return self.handle

            except Exception as exc:
                last_error = exc

            finally:
                # Close any chip that wasn't selected.
                if handle is not None and handle != self.handle:
                    try:
                        self.lgpio.gpiochip_close(handle)
                    except Exception:
                        pass

        found_text = ", ".join(
            f"gpiochip{chip}={label}"
            for chip, label in found
        )

        raise RuntimeError(
            "Unable to find Raspberry Pi GPIO controller. "
            f"Found: {found_text or 'none'}. "
            f"Last error: {last_error}"
        )

    def get_gpio_count(self):
        self._handle()

        if self.chip_info is None:
            return 0

        return int(self.chip_info[1])

    def free(self, pin_num):
        self.lgpio.gpio_free(self._handle(), pin_num)

    def stop_pwm(self, pin_num):
        self.lgpio.tx_pwm(self._handle(), pin_num, 0, 0)

    def _line_flags(self, pull=None):
        if pull == "up":
            return self.lgpio.SET_PULL_UP
        if pull == "down":
            return self.lgpio.SET_PULL_DOWN
        if pull == "none":
            return self.lgpio.SET_PULL_NONE
        return 0

    def _edge_flags(self, edge):
        if edge == "rising":
            return self.lgpio.RISING_EDGE
        if edge == "falling":
            return self.lgpio.FALLING_EDGE
        if edge == "both":
            return self.lgpio.BOTH_EDGES
        raise ValueError(f"Unsupported edge '{edge}'")

    def claim_input(self, pin_num, pull=None):
        self.lgpio.gpio_claim_input(self._handle(), pin_num, self._line_flags(pull))

    def add_edge_detect(self, pin_num, edge="falling", callback=None, pull=None, debounce_ms=None):
        edge_flags = self._edge_flags(edge)
        self.lgpio.gpio_claim_alert(self._handle(), pin_num, edge_flags, self._line_flags(pull))

        if debounce_ms is not None and int(debounce_ms) > 0:
            self.lgpio.gpio_set_debounce_micros(self._handle(), pin_num, int(debounce_ms) * 1000)

        def _callback(chip, gpio, level, timestamp):
            if callback is not None:
                callback(gpio)

        return self.lgpio.callback(self._handle(), pin_num, edge_flags, _callback)

    def remove_edge_detect(self, callback_ref):
        callback_ref.cancel()

    def claim_output(self, pin_num, level=0):
        self.lgpio.gpio_claim_output(self._handle(), pin_num, level=level)

    def read(self, pin_num):
        return bool(self.lgpio.gpio_read(self._handle(), pin_num))

    def write(self, pin_num, level):
        self.lgpio.gpio_write(self._handle(), pin_num, 1 if level else 0)

    def pwm(self, pin_num, frequency, duty):
        duty_percent = (float(duty) / 65535.0) * 100.0
        self.lgpio.tx_pwm(self._handle(), pin_num, int(frequency), duty_percent)
