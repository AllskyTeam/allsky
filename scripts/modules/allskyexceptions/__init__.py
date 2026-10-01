class AllskyFormatError(Exception):
    def __init__(self, message, log_level, send_to_allsky):
        self.message = message
        self.send_to_allsky = send_to_allsky
        self.log_level = log_level
        super().__init__(self.message)