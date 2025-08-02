from flask import Flask
from flask_jwt_extended import JWTManager
from modules.gpio import gpio_bp
from modules.allsky import allsky_bp
from modules.auth import auth_bp
from modules.auth_utils import init_auth_db

secret = init_auth_db()

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='assets',
    static_url_path='/assets'
)

app.config['JWT_SECRET_KEY'] = secret
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 1800

jwt = JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(gpio_bp, url_prefix='/gpio')
app.register_blueprint(allsky_bp, url_prefix='/allsky')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)