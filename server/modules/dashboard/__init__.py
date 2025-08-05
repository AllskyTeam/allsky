from flask import Flask, Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required
from modules.auth_utils import permission_required
from pprint import pprint

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
#@jwt_required(optional=True)
#@permission_required("allsky", "read")
def allsky_dashboard():
    from modules.gpio import get_gpio_status
    from services.allsky import get_allsky_status
    
    allsky_status = get_allsky_status()
    gpio_status = get_gpio_status()
    
    pprint(gpio_status)
    return render_template(
        'dashboard/home.html',
        title='Allsky Dashboard',
        allsky_status=allsky_status,
        gpio_status=gpio_status
    )