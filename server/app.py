# app.py
import json
import logging
import os
import threading
from pathlib import Path
from typing import Dict

home = os.environ.get("ALLSKY_HOME")
if not home:
    raise RuntimeError("ALLSKY_HOME is not set")

path = Path(home) / 'variables.json'
if not path.is_file():
    raise FileNotFoundError(f"Variables file not found: {path}")

with path.open("r", encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, dict):
    raise ValueError("variables.json must contain a flat JSON object")

applied: Dict[str, str] = {}
for key, value in data.items():
    if key in os.environ:
        continue
    os.environ[key] = "" if value is None else str(value)

log_levels = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}
log_level_override = os.environ.get("ALLSKY_SERVER_LOG_LEVEL", "").strip().upper()
log_level_source = "ALLSKY_SERVER_LOG_LEVEL"
log_level_error = None
debug_level = None
settings_path = None
settings_mtime_ns = None

def level_for_debug(debug_level: int) -> int:
    return logging.ERROR if debug_level == 0 else logging.DEBUG if debug_level >= 3 else logging.INFO

def read_debug_level(settings_path: Path) -> int:
    with settings_path.open("r", encoding="utf-8") as settings_file:
        value = int(json.load(settings_file).get("debuglevel", 1))
    if not 0 <= value <= 5:
        raise ValueError(f"Invalid Allsky Debug Level: {value}")
    return value

if log_level_override:
    log_level = log_levels.get(log_level_override, logging.INFO)
    if log_level_override not in log_levels:
        log_level_error = f"Invalid ALLSKY_SERVER_LOG_LEVEL={log_level_override!r}; using INFO"
else:
    log_level_source = "Allsky Debug Level"
    settings_path = Path(os.environ.get("ALLSKY_SETTINGS_FILE") or Path(home) / "config/settings.json")
    try:
        debug_level = read_debug_level(settings_path)
        settings_mtime_ns = settings_path.stat().st_mtime_ns
        log_level = level_for_debug(debug_level)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        log_level = logging.INFO
        log_level_error = f"Could not read Allsky Debug Level from {settings_path}: {exc}; using INFO"

# Gunicorn's stderr is captured by the allskyserver systemd journal.
standard_log_format = "%(asctime)s %(levelname)s %(name)s: %(message)s"
debug_log_format = "%(asctime)s %(levelname)s %(name)s %(pathname)s:%(lineno)d: %(message)s"
logging.basicConfig(
    level=log_level,
    format=debug_log_format if log_level == logging.DEBUG else standard_log_format,
)
logging.getLogger().setLevel(log_level)
logger = logging.getLogger(__name__)
if log_level_error:
    logger.warning("%s", log_level_error)
logger.info("Allsky API logging level: %s (from %s)", logging.getLevelName(log_level), log_level_source)

from flask import Flask, request
from flask_jwt_extended import JWTManager
from flask_login import LoginManager
from modules.gpio import gpio_bp
from modules.onewire import onewire_bp
from modules.i2c import i2c_bp
from modules.serial import serial_bp
from modules.system import system_bp
from modules.allsky import allsky_bp
from modules.lightning import lightning_bp, restore_lightning_monitor
from modules.auth import auth_bp
from modules.dashboard import dashboard_bp
from modules.webauth import webauth_bp, SimpleUser
from modules.auth_utils import init_auth_db
#from modules.focuser import focuser_bp

secret = init_auth_db()

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='assets',
    static_url_path='/assets'
)

settings_lock = threading.Lock()

@app.before_request
def refresh_api_log_level():
    global debug_level, settings_mtime_ns
    if settings_path is None:
        return
    try:
        mtime_ns = settings_path.stat().st_mtime_ns
    except OSError:
        return
    if mtime_ns == settings_mtime_ns:
        return
    with settings_lock:
        if mtime_ns == settings_mtime_ns:
            return
        try:
            new_debug_level = read_debug_level(settings_path)
        except (OSError, ValueError, TypeError, AttributeError):
            logger.warning("Could not read Allsky Debug Level from %s", settings_path, exc_info=True)
            settings_mtime_ns = mtime_ns
            return
        settings_mtime_ns = mtime_ns
        if new_debug_level == debug_level:
            return
        debug_level = new_debug_level
        new_log_level = level_for_debug(debug_level)
        root_logger = logging.getLogger()
        root_logger.setLevel(new_log_level)
        for handler in root_logger.handlers:
            if handler.formatter and handler.formatter._fmt in (standard_log_format, debug_log_format):
                handler.setFormatter(logging.Formatter(
                    debug_log_format if new_log_level == logging.DEBUG else standard_log_format
                ))
        logger.warning("Allsky API logging changed to %s (Allsky Debug Level %s)",
                       logging.getLevelName(new_log_level), debug_level)

@app.after_request
def log_api_request(response):
    if debug_level is not None and debug_level >= 4:
        logger.debug("HTTP %s %s -> %s", request.method, request.path, response.status_code)
    elif debug_level is not None and debug_level >= 2 and response.status_code >= 400:
        logger.info("HTTP %s %s -> %s", request.method, request.path, response.status_code)
    return response

app.json.sort_keys = False 

app.config['JWT_SECRET_KEY'] = secret
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 1800
app.secret_key = secret

login_manager = LoginManager(app)
login_manager.login_view = 'webauth.login'

@login_manager.user_loader
def load_user(user_id: str):
    return SimpleUser(id=user_id, username=user_id)

jwt = JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(webauth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(gpio_bp, url_prefix='/gpio')
app.register_blueprint(onewire_bp, url_prefix='/onewire')
app.register_blueprint(i2c_bp, url_prefix='/i2c')
app.register_blueprint(serial_bp, url_prefix='/serial')
app.register_blueprint(allsky_bp, url_prefix='/allsky')
app.register_blueprint(system_bp, url_prefix='/system')
app.register_blueprint(lightning_bp, url_prefix='/lightning')
#app.register_blueprint(focuser_bp, url_prefix="/focuser")

restore_lightning_monitor()


def env_flag(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8090, debug=env_flag('ALLSKY_DEV_SERVER_DEBUG'))
