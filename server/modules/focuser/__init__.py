import time
import json
import os
from pathlib import Path
from flask import Blueprint, render_template,  request, jsonify
from modules.auth_utils import web_login_required_or_local
from modules.auth_utils import api_auth_required
from services.allsky import get_allsky_status
from services.motor import motor_action
from services.camera import get_pi_image, get_zwo_image, get_available_cameras
from services.helpers import get_camera_image_details, load_module_config, save_module_config

focuser_bp = Blueprint("focuser", __name__)

@focuser_bp.route("/focuser", methods=["GET"])
@web_login_required_or_local
def focuser_page():
    
    cameras = get_available_cameras()
    allsky_status = get_allsky_status()
    image_path, image_url = get_camera_image_details()
      
    return render_template(
        "focuser/home.html",
        title="Focuser Control",
        extra_js=[
            "app/js/konva.min.js",
            "app/js/ajaxpoll.js",            
            "app/js/blowup.js",            
            "app/js/focuser.js",
            "app/js/jquery-gpio.js",
            "app/js/chart.umd.js"
        ],
        status=allsky_status,
        cameras=cameras,
        image_url=image_url,
        time=time.time()
    )
    

#
# Camera control endpoint
#
@focuser_bp.route("/getimage", methods=["POST"])
@api_auth_required("focuser", "update")
def get_image():
    data = request.get_json(silent=True) or {}
    exposure = int(data.get("exposure", 0))
    gain = int(data.get("gain", 0))
    camera = data.get("camera", None)

    camera_details = camera.split('*')
    camera_type = camera_details[0]
    camera_pos = int(camera_details[1])
    camera_name = camera_details[2]
    
    if camera_type == 'zwo':
        result, image_url, exif_data, focus_fwhm, focus_score = get_zwo_image(camera_pos, exposure, gain, camera_name)

    if camera_type == 'pi':
        result, image_url, exif_data, focus_fwhm, focus_score = get_pi_image(exposure, gain, camera_name)

    if result:
        response = jsonify({'status': 'OK', 'url': str(image_url), 'exif': exif_data, 'focus_score': focus_score})
    else:        
        response = jsonify({'status': 'FAILED'})
    
    return response
    
#
# End Camera control endpoint
# 

#
# Motor control endpoint
#    
@focuser_bp.route("/move", methods=["POST"])
@api_auth_required("focuser", "update")
def focuser_move():
    data = request.get_json(silent=True) or {}
    direction = str(data.get("direction", "in")).lower()
    steps = int(data.get("steps", 0))
    speed = data.get("speed", "slow")
    
    motor_action('a4988', 'move', direction, steps, speed)
    return jsonify('ok')

@focuser_bp.route("/enable", methods=["GET"])
@api_auth_required("focuser", "update")
def focuser_enable():
    motor_action('a4988', 'enable')    
    return jsonify('ok')

@focuser_bp.route("/disable", methods=["GET"])
@api_auth_required("focuser", "update")
def focuser_disable():
    motor_action('a4988', 'disable')
    return jsonify('ok')

@focuser_bp.route("/settings", methods=["GET", "POST"])
@api_auth_required("focuser", "update")
def focuser_settings():
    FOCUSER_SETTINGS_FILE = Path(os.environ.get('ALLSKY_CONFIG', '~')) / 'server.json'
    try:
        if request.method == 'GET':
            config = load_module_config('focuser')
            return jsonify({"ok": True, "settings": config})

        elif request.method == 'POST':
            data = request.get_json(silent=True)
            if not data:
                return jsonify({"ok": False, "error": "No JSON body provided"}), 400

            # Basic validation
            if "type" not in data or "pins" not in data:
                return jsonify({"ok": False, "error": "Invalid format"}), 400

            save_module_config('focuser', data)
            return jsonify({"ok": True, "saved": True})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


#
# End Motor control endpoint
# 