import sqlite3
import os
import secrets
import bcrypt
import json
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify, request

def validate_user(user_name, password):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT password, permissions FROM users WHERE username = ?', (user_name,))
    row = cur.fetchone()
    conn.close()
             
    if not row:
        return False

    stored_hash, role = row

    if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
        return False
    
    return json.loads(row[1])
                            

def permission_required(module, action):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            print(request.remote_addr )
            if request.remote_addr in ('127.0.0.1', '::1'):
                return fn(*args, **kwargs)

            try:
                verify_jwt_in_request()
            except Exception:
                return jsonify({"error": "Authentication required"}), 401

            identity = get_jwt_identity()
            if not identity:
                return jsonify({"error": "Authentication failed"}), 401

            claims = get_jwt()
            perms = claims.get("permissions", {})
            allowed = perms.get(module, [])

            if action not in allowed and "*" not in allowed:
                return jsonify({"error": f"Access denied for {action} on {module}"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_db_path():
    base_path = os.environ.get("ALLSKY_HOME")
    if not base_path:
        raise EnvironmentError("ALLSKY_HOME environment variable is not set")

    db_path = os.path.join(base_path, "config", "myFiles", "secrets.db")

    return db_path


def init_auth_db():

    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS jwt_secret (
            id INTEGER PRIMARY KEY,
            secret TEXT NOT NULL
        )
    """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            permissions TEXT NOT NULL
        );
    """
    )

    cur.execute("SELECT secret FROM jwt_secret WHERE id = 1")
    row = cur.fetchone()
    if row:
        secret = row[0]
    else:
        secret = secrets.token_urlsafe(64)
        cur.execute("INSERT INTO jwt_secret (id, secret) VALUES (1, ?)", (secret,))

    cur.execute("SELECT username FROM users WHERE username = ?", ("local",))
    if not cur.fetchone():
        hashed_pw = bcrypt.hashpw("local".encode(), bcrypt.gensalt()).decode()
        full_perms = {
            "gpio": ["create", "read", "update", "delete"],
            "allsky": ["create", "read", "update", "delete"],
        }
        cur.execute(
            """
            INSERT INTO users (username, password, permissions)
            VALUES (?, ?, ?)
        """,
            ("local", hashed_pw, json.dumps(full_perms)),
        )

    conn.commit()
    conn.close()
    return secret
