from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from modules.auth_utils import api_auth_required
import os
import json

onewire_bp = Blueprint("onewire", __name__)


def load_family_codes():
    base_path = os.getenv('ALLSKY_HOME')
    path = os.path.join(base_path, "config/", "onewire.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}


@onewire_bp.route("/devices", defaults={"format": "json"}, methods=["GET"])
@onewire_bp.route("/devices/<format>", methods=["GET"])
@api_auth_required("onewire", "update")
def onewire_devices(format) -> Response:
    family_codes = load_family_codes()
    base_path = "/sys/bus/w1/devices"
    devices = []
    if os.path.exists(base_path):
        for entry in os.listdir(base_path):
            if "-" in entry:
                family = entry.split("-")[0].upper()
                family_info = family_codes.get(family, {})
                description = family_info.get("description", "Unknown type")
                device_list = family_info.get("devices", [])
                devices.append({
                    "id": entry,
                    "type": description,
                    "devices": device_list
                })

    if format == "json":
        return jsonify(devices)
    else:
        html = ""
        for d in devices:
            device_type = d.get("type", "Unknown")
            id = d.get("id", "???")
            devices = d.get("devices", [])
            icon = '<i class="fa-solid fa-question fa-4x"></i>'
            if "temperature" in device_type.lower():
                icon = '<i class="fa-solid fa-thermometer-half fa-4x"></i>'
            html += f"""
            <div class="panel panel-default panel-shadow">
                <div class="panel-heading">{id}
                </div>
                <div class="panel-body">
                    <div class="dm-ow-wrapper">
                        <div class="dm-ow-row">
                            <div class="dm-ow-left">
                                {icon}
                            </div>
                            <div class="dm-ow-right">
                                <div class="dm-ow-top-bar">
                                    <h2><strong>{device_type}</strong></h2>
                                </div>
                                <div class="dm-ow-main-content">
                                    <h3><small>{' (' + ', '.join(devices) + ')' if devices else ''}</small></h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>"""

        return html, 200, {"Content-Type": "text/html"}
