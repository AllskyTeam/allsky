import sqlite3
import os
import secrets
import bcrypt
import json
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify, request

def is_local_request():
    # Honour X-Forwarded-For if present (take first IP)
    xff = request.headers.get("X-Forwarded-For", "")
    client_ip = (xff.split(",")[0].strip() if xff else request.remote_addr) or ""
    return client_ip in ("127.0.0.1", "::1")

def web_login_required_or_local(fn):
    from flask_login import current_user
    from functools import wraps as _wraps
    @_wraps(fn)
    def _w(*a, **kw):
        if is_local_request():
            return fn(*a, **kw)
        if current_user.is_authenticated:
            return fn(*a, **kw)
        from flask import redirect, url_for, request as _req
        return redirect(url_for("webauth.login", next=_req.path))
    return _w

def api_auth_required(module: str, action: str):
    """
    Allow if:
      - Local request, OR
      - Logged-in Flask-Login session, OR
      - Valid JWT with required permission.
    Otherwise: return JSON 401/403 (no redirects).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # 1) Local bypass
            if is_local_request():
                return fn(*args, **kwargs)

            # 2) Session (dashboard)
            try:
                from flask_login import current_user
            except ImportError:
                current_user = None

            if current_user:
                try:
                    if getattr(current_user, "is_authenticated", False):
                        return fn(*args, **kwargs)
                except RuntimeError:
                    # e.g., called outside an app/request context
                    pass

            # 3) JWT
            try:
                verify_jwt_in_request()
            except Exception:
                return jsonify({"error": "Authentication required"}), 401

            if not get_jwt_identity():
                return jsonify({"error": "Authentication failed"}), 401

            claims = get_jwt()
            perms = claims.get("permissions", {})
            allowed = perms.get(module, []) or perms.get("*", [])
            if action not in allowed and "*" not in allowed:
                return jsonify({"error": f"Access denied for {action} on {module}"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def load_env_credentials():
    """Try to load username/password from env.json.
    Search order:
      - ENV_JSON_PATH env var (full path)
      - $ALLSKY_HOME/config/env.json
    Accept keys: username/password or WEB_USERNAME/WEB_PASSWORD.
    Returns tuple (username, password) or (None, None) if not found.
    """
    import json, os
    candidates = []
    if os.environ.get("ENV_JSON_PATH"):
        candidates.append(os.environ["ENV_JSON_PATH"])
    if os.environ.get("ALLSKY_HOME"):
        candidates.append(os.path.join(os.environ["ALLSKY_HOME"], "env.json"))
    for path in candidates:
        try:
            with open(path, "r") as f:
                data = json.load(f)
            u = data.get("username") or data.get("WEBUI_USERNAME")
            p = data.get("password") or data.get("WEBUI_PASSWORD")
            if u and p:
                return u, p
        except Exception:
            continue
    return None, None

def validate_user(user_name, password):
    """
    Validate user credentials against either:
    - env.json (hashed or plain bcrypt-compatible password)
    - SQLite secrets.db fallback
    """
    env_u, env_p = load_env_credentials()

    # --- 1. ENV-based credentials (take priority) ---
    if env_u and env_p:
        if user_name == env_u:
            try:
                # Check if env_p looks like a bcrypt hash (starts with $2y$ or $2b$)
                if env_p.startswith("$2y$") or env_p.startswith("$2b$"):
                    if bcrypt.checkpw(password.encode(), env_p.encode()):
                        return {"*": ["*"]}  # grant all perms
                else:
                    # fallback if plain text stored
                    if password == env_p:
                        return {"*": ["*"]}
            except Exception as e:
                print(f"Env password validation error: {e}")
        # if username doesn't match env user, fall through to DB

    # --- 2. SQLite user DB fallback ---
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT password, permissions FROM users WHERE username = ?', (user_name,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return False

    stored_hash, perms = row
    try:
        if bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return json.loads(perms)
    except Exception as e:
        print(f"DB password validation error: {e}")

    return False
                            

def permission_required(module, action):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            print(request.remote_addr )
            if is_local_request():
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
            allowed = perms.get(module, []) or perms.get("*", [])

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
