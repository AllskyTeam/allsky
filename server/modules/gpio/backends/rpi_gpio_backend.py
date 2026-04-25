class RPiGPIOBackend:
    name = "RPi.GPIO"
    gpio_count = 28

    def __init__(self):
        import RPi.GPIO as GPIO

        self.GPIO = GPIO
        self.pwm_objects = {}
        self.GPIO.setwarnings(False)
        self.GPIO.setmode(self.GPIO.BCM)

    def get_gpio_count(self):
        return self.gpio_count

    def free(self, pin_num):
        pwm = self.pwm_objects.pop(pin_num, None)

        if pwm is not None:
            pwm.stop()

        self.GPIO.cleanup(pin_num)

    def stop_pwm(self, pin_num):
        pwm = self.pwm_objects.pop(pin_num, None)

        if pwm is not None:
            pwm.stop()

    def claim_input(self, pin_num):
        self.GPIO.setup(pin_num, self.GPIO.IN)

    def claim_output(self, pin_num, level=0):
        self.GPIO.setup(pin_num, self.GPIO.OUT, initial=self.GPIO.HIGH if level else self.GPIO.LOW)

    def read(self, pin_num):
        return bool(self.GPIO.input(pin_num))

    def write(self, pin_num, level):
        self.GPIO.output(pin_num, self.GPIO.HIGH if level else self.GPIO.LOW)

    def pwm(self, pin_num, frequency, duty):
        duty_percent = (float(duty) / 65535.0) * 100.0
        pwm = self.pwm_objects.get(pin_num)

        if pwm is None:
            self.claim_output(pin_num, 0)
            pwm = self.GPIO.PWM(pin_num, int(frequency))
            self.pwm_objects[pin_num] = pwm
            pwm.start(duty_percent)
            return

        pwm.ChangeFrequency(int(frequency))
        pwm.ChangeDutyCycle(duty_percent)
