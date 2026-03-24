import threading
import sqlite3
import bcrypt
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from modules.auth_utils import validate_user

DB_PATH = 'config/secrets.db'

auth_bp = Blueprint('auth', __name__)
auth_lock = threading.Lock()

@auth_bp.route('/login', methods=['POST'])
def login():
    try: 
        with auth_lock:
            username = request.json.get('username')
            password = request.json.get('password')

            if not username or not password:
                return jsonify({'error': 'Username and password required'}), 400

            result = validate_user(username, password)
            if result is False:
                return jsonify({'error': 'Invalid credentials'}), 401

            token = create_access_token(identity=username, additional_claims={"permissions": result})
        return jsonify(access_token=token)

    except Exception as e:
        return jsonify({'error': 'Login failed', 'type': type(e).__name__, 'message': str(e)}), 500