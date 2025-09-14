class AllskyError(Exception):
    def __init__(self, message: str = "An error occurred"):
        super().__init__(message)
        self.message = message

    def __str__(self) -> str:
        return self.message

class ModuleError(AllskyError):
    def __init__(self, messages: str):
        message = f"{messages}"
        super().__init__(message)
        
class NoSourceError(AllskyError):
    def __init__(self, messages: str = "ERROR: No installation location defined"):
        message = f"{messages}"
        super().__init__(message)
        
class NoVersionError(AllskyError):
    def __init__(self, messages: str = "ERROR: cannot locate version"):
        message = f"{messages}"
        super().__init__(message)
        
class ConfigError(AllskyError):
    def __init__(self, messages: str = "ERROR: Cannot run"):
        message = f"{messages}"
        super().__init__(message)