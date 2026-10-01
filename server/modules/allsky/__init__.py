import os
import json
import sys
import subprocess
from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required
from modules.auth_utils import permission_required
from services.allsky import get_allsky_status
from modules.auth_utils import api_auth_required

# ---------------------------------------------------------------------------
# Allsky Management API
# ---------------------------------------------------------------------------
# This module exposes endpoints for controlling and querying the Allsky system.
# It provides:
#   • System status retrieval
#   • Starting, stopping, and restarting the Allsky service
#
# All endpoints require appropriate permissions via @api_auth_required.
# ---------------------------------------------------------------------------

allsky_bp = Blueprint('allsky', __name__)


@allsky_bp.route('/status', methods=['GET'])
@api_auth_required("allsky", "read")
def allsky_status():
    """
    GET /allsky/status

    Retrieve the current Allsky system status.

    This endpoint queries backend logic (get_allsky_status) and returns a full
    status dictionary, plus a rendered HTML fragment used by the web frontend.

    Authentication:
        Requires: ``api_auth_required("allsky", "read")``

    Returns:
        dict: A JSON object containing:
            - All fields provided by ``get_allsky_status()``
            - ``status_html``: Rendered HTML snippet for UI display
    """
    status = get_allsky_status()
    status_html = render_template("_partials/_allskyStatus.html", status=status)
    status['status_html'] = status_html
    return status


@allsky_bp.route('/stopall', methods=['GET'])
@api_auth_required("allsky", "update")
def stop_allsky_all():
    """
    GET /allsky/stopall

    Stop the Allsky service.

    This fully stops the "allsky" systemd service.

    Authentication:
        Requires: ``api_auth_required("allsky", "update")``

    Returns:
        JSON: ``{"status": "Allsky stopped"}``
    """
    subprocess.run(['sudo', 'systemctl', 'stop', 'allsky'])
    return jsonify({'status': 'Allsky stopped'})


@allsky_bp.route('/stopallsky', methods=['GET'])
@api_auth_required("allsky", "update")
def stop_allsky():
    """
    GET /allsky/stopallsky

    Stop the Allsky service and immediately start the AllskyServer service.

    This is commonly used during debugging or maintenance when the capture
    component needs to be restarted but the web interface should remain active.

    Authentication:
        Requires: ``api_auth_required("allsky", "update")``

    Returns:
        JSON: ``{"status": "Allsky stopped"}``
    """
    subprocess.run(['sudo', 'systemctl', 'stop', 'allsky'])
    subprocess.run(['sudo', 'systemctl', 'start', 'allskyserver'])
    return jsonify({'status': 'Allsky stopped'})


@allsky_bp.route('/start', methods=['GET'])
@api_auth_required("allsky", "update")
def start_allsky():
    """
    GET /allsky/start

    Start the Allsky service.

    Authentication:
        Requires: ``api_auth_required("allsky", "update")``

    Returns:
        JSON: ``{"status": "Allsky started"}``
    """
    subprocess.run(['sudo', 'systemctl', 'start', 'allsky'])
    return jsonify({'status': 'Allsky started'})


@allsky_bp.route('/restart', methods=['GET'])
@api_auth_required("allsky", "update")
def restart_allsky():
    """
    GET /allsky/restart

    Restart the Allsky service.

    Authentication:
        Requires: ``api_auth_required("allsky", "update")``

    Returns:
        JSON: ``{"status": "Allsky started"}``
    """
    subprocess.run(['sudo', 'systemctl', 'restart', 'allsky'])
    return jsonify({'status': 'Allsky started'})