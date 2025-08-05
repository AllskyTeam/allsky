import os
import json
import sys
import subprocess
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from modules.auth_utils import permission_required
from services.allsky import get_allsky_status

allsky_bp = Blueprint('allsky', __name__)

@allsky_bp.route('/status', methods=['GET'])
@jwt_required(optional=True)
@permission_required("allsky", "read")
def allsky_status():
    return get_allsky_status()

@allsky_bp.route('/stopall', methods=['GET'])
@jwt_required(optional=True)
@permission_required("allsky", "update")
def stop_allsky_all():
    subprocess.run(['sudo', 'systemctl', 'stop', 'allsky'])

    return jsonify({'status': 'Allsky stopped'})

@allsky_bp.route('/stopallsky', methods=['GET'])
@jwt_required(optional=True)
@permission_required("allsky", "update")
def stop_allsky():
    subprocess.run(['sudo', 'systemctl', 'stop', 'allsky'])
    subprocess.run(['sudo', 'systemctl', 'start', 'allskyserver'])

    return jsonify({'status': 'Allsky stopped'})

@allsky_bp.route('/start', methods=['GET'])
@jwt_required(optional=True)
@permission_required("allsky", "update")
def start_allsky():
    subprocess.run(['sudo', 'systemctl', 'start', 'allsky'])

    return jsonify({'status': 'Allsky started'})

@allsky_bp.route('/restart', methods=['GET'])
@jwt_required(optional=True)
@permission_required("allsky", "update")
def restart_allsky():
    subprocess.run(['sudo', 'systemctl', 'restart', 'allsky'])

    return jsonify({'status': 'Allsky started'})