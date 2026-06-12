from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from modules.auth_utils import api_auth_required
import psutil
import time

system_bp = Blueprint("system", __name__)

@system_bp.route("/top", methods=["GET"])
@api_auth_required("system", "read")
def system_top() -> Response:
  
    print(f"CPU: {psutil.cpu_percent()}%")
    print(f"Memory: {psutil.virtual_memory().percent}%\n")

    html = """
    <div class="row">
        <div class="col-xs-2"><strong>PID</strong></div>
        <div class="col-xs-2"><strong>CPU%</strong></div>
        <div class="col-xs-2"><strong>MEM%</strong></div>
        <div class="col-xs-6"><strong>Name</strong></div>
    </div>
    """
                

    for proc in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']),
                       key=lambda p: p.info['cpu_percent'],
                       reverse=True)[:20]:
      
        html += f"""
        <div class="row">
            <div class="col-xs-2"><strong>{proc.info['pid']}</strong></div>
            <div class="col-xs-2"><strong>{proc.info['cpu_percent']:.1f}</strong></div>
            <div class="col-xs-2"><strong>{proc.info['memory_percent']:.1f}</strong></div>
            <div class="col-xs-6"><strong>{proc.info['name']}</strong></div>
        </div>
        """      

    return Response(html, mimetype="text/html")