import logging
import subprocess

from flask import Blueprint, jsonify, render_template

from modules.auth_utils import api_auth_required, web_login_required_or_local

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint("dashboard", __name__)
LOG_LINES = 300
LOG_MAX_CHARS = 200_000

@dashboard_bp.route('/', methods=['GET'])
#@jwt_required(optional=True)
#@permission_required("allsky", "read")

@web_login_required_or_local
def allsky_dashboard():
    from modules.gpio import get_gpio_status
    from services.allsky import get_allsky_status
    
    allsky_status = get_allsky_status()
    gpio_status = get_gpio_status()
    
    return render_template(
        'dashboard/home.html',
        title='Allsky Dashboard',
        allsky_status=allsky_status,
        gpio_status=gpio_status
    )


@dashboard_bp.route('/logs', methods=['GET'])
@web_login_required_or_local
def server_logs():
    return render_template('dashboard/logs.html', title='Server Logs')


@dashboard_bp.route('/logs/data', methods=['GET'])
@api_auth_required('system', 'read')
def server_logs_data():
    try:
        result = subprocess.run(
            [
                'journalctl', '--quiet', '--no-pager', '--boot',
                '--unit=allskyserver.service', f'--lines={LOG_LINES}',
                '--output=short-iso', '--no-hostname',
            ],
            capture_output=True, text=True, timeout=5, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        logger.exception('Could not read allskyserver journal')
        return jsonify({'error': 'Unable to read the server journal'}), 503

    if result.returncode != 0:
        logger.error('journalctl failed: %s', result.stderr.strip())
        return jsonify({'error': 'Unable to read the server journal'}), 503

    response = jsonify({'lines': result.stdout[-LOG_MAX_CHARS:]})
    response.headers['Cache-Control'] = 'no-store'
    return response
