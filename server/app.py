from flask import Flask
from modules.gpio import gpio_bp
from modules.allsky import allsky_bp

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='assets',
    static_url_path='/assets'
)

app.register_blueprint(gpio_bp, url_prefix='/gpio')
app.register_blueprint(allsky_bp, url_prefix='/allsky')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)