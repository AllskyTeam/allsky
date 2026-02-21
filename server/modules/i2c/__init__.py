from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from modules.auth_utils import api_auth_required
import os
import json

try:
    from smbus2 import SMBus
    SMBUS_AVAILABLE = True
except ImportError:
    SMBUS_AVAILABLE = False

i2c_bp = Blueprint("i2c", __name__)


def scan_i2c_bus(bus_num):
    found = []
    if not SMBUS_AVAILABLE:
        return None
    try:
        with SMBus(bus_num) as bus:
            for addr in range(0x03, 0x78):
                try:
                    bus.write_quick(addr)
                    found.append(hex(addr))
                except OSError:
                    continue
        return found
    except FileNotFoundError:
        return None


def normalise_i2c_key(addr):
    return "0x" + addr[2:].upper()


def load_i2c_metadata():
    base_path = os.getenv('ALLSKY_HOME')
    path = os.path.join(base_path, "config/", "i2c.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}


@i2c_bp.route("/devices", defaults={"format": "json"}, methods=["GET"])
@i2c_bp.route("/devices/<format>", methods=["GET"])
@api_auth_required("onewire", "update")
def i2c_devices(format) -> Response:

    if not SMBUS_AVAILABLE:
        return jsonify({}) if format == "json" else Response("", mimetype="text/html")

    i2c_metadata = load_i2c_metadata()

    devices_by_bus = {}

    for bus_num in [1, 2, 3, 4, 5, 6]:
        addresses = scan_i2c_bus(bus_num)
        if not addresses:
            continue

        # Ensure list exists for this bus
        devices_by_bus.setdefault(bus_num, [])

        for addr in addresses:
            entry = {
                "address": addr,
                "addressname": F"Address {addr}",
                "bus": f"i2c-{bus_num}",
                "busname": f"Bus {bus_num}",
                "devices": i2c_metadata.get(normalise_i2c_key(addr), [])
            }
            devices_by_bus[bus_num].append(entry)

    if format == "json":
        return jsonify(devices_by_bus)
    else:

        html = ""
        for bus in sorted(devices_by_bus.keys()):
            for device in devices_by_bus[bus]:
                html += f"""<div class="panel panel-default panel-shadow">
              <div class="panel-heading">
                  <h4>{device.get('busname', 'Unknown bus')} {device.get('addressname', 'Unknown address')}</h4>
              </div>
              <div class="panel-body">"""

                if device.get("devices"):

                    devices_types = device.get("devices", [])
                    if isinstance(devices_types, list) and len(devices_types) > 0:
                        # for dev in devices_types:

                        mid = (len(devices_types) + 1) // 2
                        col1 = devices_types[:mid]
                        col2 = devices_types[mid:]

                        html += '<div class="row">'

                        for col in (col1, col2):
                            html += '<div class="i2c-device-col">'

                            for dev in col:
                                dev_name = dev.get(
                                    "device") or "Unnamed device"

                                if dev.get("url"):
                                    url = f'<a href="{dev["url"]}" target="_blank">{dev_name}</a>'
                                else:
                                    url = dev_name

                                range_text = f' <small>({dev.get("addresses","")})</small>'

                                html += f'• {url}{range_text}<br>'

                            html += '</div>'

                        html += '</div>'

                    else:
                        html += '<div class="i2c-device text-muted">• No known devices</div>'
                else:
                    html += '<div class="i2c-device text-muted">The i2c database is missing. Please build the database</div>'
                                                
                html += '</div>'
                html += '</div>'

        return html, 200, {"Content-Type": "text/html"}
