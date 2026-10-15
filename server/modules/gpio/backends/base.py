class GPIOBackendUnavailable(RuntimeError):
    pass


class GPIOPinReserved(RuntimeError):
    def __init__(self, pin_num, reason):
        self.pin_num = pin_num
        self.reason = reason
        super().__init__(f"GPIO pin {pin_num} is reserved: {reason}")
