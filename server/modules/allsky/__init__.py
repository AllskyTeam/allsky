import os
import json
from flask import Blueprint, request, jsonify

allsky_bp = Blueprint('allsky', __name__)

@allsky_bp.route('/status', methods=['GET'])
def allsky_status():
    base_path = os.getenv('ALLSKY_HOME')
    if not base_path:
        raise EnvironmentError("ALLSKY_HOME environment variable is not set.")

    file_path = os.path.join(base_path, 'config', 'status.json')

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"status.json not found at: {file_path}")

    with open(file_path, 'r') as f:
        return json.load(f)
