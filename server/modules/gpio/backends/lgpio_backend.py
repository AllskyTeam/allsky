class LgpioBackend:
    name = "lgpio"

    def __init__(self):
        import lgpio

        self.lgpio = lgpio
        self.handle = None
        self.chip_info = None

    def _handle(self):
        if self.handle is not None:
            return self.handle

        last_error = None
        for chip in range(8):
            try:
                handle = self.lgpio.gpiochip_open(chip)
                self.chip_info = self.lgpio.gpio_get_chip_info(handle)
                self.handle = handle
                return self.handle
            except Exception as exc:
                last_error = exc

        raise RuntimeError(f"Unable to open a gpiochip: {last_error}")

    def get_gpio_count(self):
        self._handle()

        if self.chip_info is None:
            return 0

        return int(self.chip_info[1])

    def free(self, pin_num):
        self.lgpio.gpio_free(self._handle(), pin_num)

    def stop_pwm(self, pin_num):
        self.lgpio.tx_pwm(self._handle(), pin_num, 0, 0)

    def claim_input(self, pin_num):
        self.lgpio.gpio_claim_input(self._handle(), pin_num)

    def claim_output(self, pin_num, level=0):
        self.lgpio.gpio_claim_output(self._handle(), pin_num, level=level)

    def read(self, pin_num):
        return bool(self.lgpio.gpio_read(self._handle(), pin_num))

    def write(self, pin_num, level):
        self.lgpio.gpio_write(self._handle(), pin_num, 1 if level else 0)

    def pwm(self, pin_num, frequency, duty):
        duty_percent = (float(duty) / 65535.0) * 100.0
        self.lgpio.tx_pwm(self._handle(), pin_num, int(frequency), duty_percent)
