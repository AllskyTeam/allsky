# app.py
import os, json
from pathlib import Path
from typing import Dict
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_login import LoginManager
from modules.gpio import gpio_bp
from modules.onewire import onewire_bp
from modules.i2c import i2c_bp
from modules.serial import serial_bp
from modules.system import system_bp
from modules.allsky import allsky_bp
from modules.auth import auth_bp
from modules.dashboard import dashboard_bp
from modules.webauth import webauth_bp, SimpleUser
from modules.auth_utils import init_auth_db
#from modules.focuser import focuser_bp

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

secret = init_auth_db()

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='assets',
    static_url_path='/assets'
)

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
#app.register_blueprint(focuser_bp, url_prefix="/focuser")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8090, debug=True)
