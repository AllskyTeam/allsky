from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from modules.auth_utils import api_auth_required
import serial.tools.list_ports

serial_bp = Blueprint("serial", __name__)

def try_serial_probe(port, baudrates=[9600, 19200, 38400, 57600, 115200]):
    for baud in baudrates:
        try:
            with serial.Serial(port.device, baudrate=baud, timeout=0.25) as ser:
                lines = []
                for _ in range(10):
                    line = ser.readline()
                    if line:
                        try:
                            lines.append(line.decode(errors='replace').strip())
                        except UnicodeDecodeError:
                            lines.append("<unreadable>")
                    else:
                        break
                if lines:
                    return {
                        "device": port.device,
                        "baud": baud,
                        "data": "\n".join(lines)
                    }
        except (serial.SerialException, OSError):
            continue
    return {
        "device": port.device,
        "baud": None,
        "data": ""
    }

@serial_bp.route("/sample", defaults={"format": "json"}, methods=["GET"])
@serial_bp.route("/sample/<format>", methods=["GET"])
@api_auth_required("serial", "read")  
def get_serial_port_sample(format) -> Response:
    ports = serial.tools.list_ports.comports()
    result = [try_serial_probe(port) for port in ports]
    
    if format == "json":
        return jsonify(list(result))
    else:
        html = ""
        for item in result:
            html += f"<h4>{item['device']} @ {item['baud'] or 'Unknown baud'}</h4>"
            html += f"<pre>{item['data']}</pre>"
        return Response(html, mimetype="text/html")
  