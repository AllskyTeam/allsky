from os import path
import sqlite3
import os
import secrets
import bcrypt
import json
from datetime import datetime, timezone
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from flask import jsonify, request

DEFAULT_AUTH_USERNAME = "local"
INITIAL_PASSWORD_FILENAME = "allsky_server_initial_password.txt"

def is_local_request():
    client_ip = request.remote_addr or ""
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
      - ALLSKY_ENV env var (full path)
      - $ALLSKY_HOME/env.json
      - $ALLSKY_HOME/config/env.json
    Accept keys: username/password or WEB_USERNAME/WEB_PASSWORD.
    Returns tuple (username, password) or (None, None) if not found.
    """
    import json, os
    candidates = []
    if os.environ.get("ENV_JSON_PATH"):
        candidates.append(os.environ["ENV_JSON_PATH"])
    if os.environ.get("ALLSKY_ENV"):
        candidates.append(os.environ["ALLSKY_ENV"])
    if os.environ.get("ALLSKY_HOME"):
        candidates.append(os.path.join(os.environ["ALLSKY_HOME"], "env.json"))
        candidates.append(os.path.join(os.environ["ALLSKY_HOME"], "config", "env.json"))
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


def check_bcrypt_password(password, stored_hash):
    """Match PHP password_hash(..., PASSWORD_BCRYPT) verification semantics."""
    if not isinstance(password, str) or not isinstance(stored_hash, str):
        return False

    if not stored_hash.startswith(("$2a$", "$2b$", "$2y$")):
        return False

    password_bytes = password.encode()[:72]
    hash_candidates = [stored_hash]
    if stored_hash.startswith("$2y$"):
        hash_candidates.append("$2b$" + stored_hash[4:])

    seen = set()
    for candidate in hash_candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        try:
            if bcrypt.checkpw(password_bytes, candidate.encode()):
                return True
        except ValueError:
            continue
    return False


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
                if check_bcrypt_password(password, env_p):
                    return {"*": ["*"]}  # grant all perms
                if not env_p.startswith("$2"):
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
        if check_bcrypt_password(password, stored_hash):
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


def get_myfiles_path():
    myfiles_path = os.environ.get("ALLSKY_MYFILES_DIR")
    if myfiles_path:
        return myfiles_path

    base_path = os.environ.get("ALLSKY_HOME")
    if not base_path:
        raise EnvironmentError("ALLSKY_MYFILES_DIR or ALLSKY_HOME environment variable is not set")

    return os.path.join(base_path, "config", "myFiles")


def get_db_path():
    return os.path.join(get_myfiles_path(), "secrets.db")


def get_initial_password_path():
    return os.path.join(get_myfiles_path(), INITIAL_PASSWORD_FILENAME)


def write_initial_password_file(username, password):
    password_path = get_initial_password_path()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    contents = (
        "Allsky Server initial API login\n"
        f"Generated: {now}\n"
        f"Username: {username}\n"
        f"Password: {password}\n\n"
    )

    with open(password_path, "w", encoding="utf-8") as f:
        f.write(contents)
    os.chmod(password_path, 0o600)


def get_full_permissions():
    return {
        "gpio": ["create", "read", "update", "delete"],
        "allsky": ["create", "read", "update", "delete"],
        "lightning": ["create", "read", "update", "delete"],
    }


def create_or_rotate_bootstrap_user(cur):
    cur.execute("SELECT password FROM users WHERE username = ?", (DEFAULT_AUTH_USERNAME,))
    row = cur.fetchone()

    if row:
        try:
            has_static_default = bcrypt.checkpw("local".encode(), row[0].encode())
        except Exception:
            has_static_default = False

        if not has_static_default:
            return
    else:
        has_static_default = False

    password = secrets.token_urlsafe(24)
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    permissions = json.dumps(get_full_permissions())

    if has_static_default:
        cur.execute(
            """
            UPDATE users
            SET password = ?, permissions = ?
            WHERE username = ?
            """,
            (hashed_pw, permissions, DEFAULT_AUTH_USERNAME),
        )
    else:
        cur.execute(
            """
            INSERT INTO users (username, password, permissions)
            VALUES (?, ?, ?)
            """,
            (DEFAULT_AUTH_USERNAME, hashed_pw, permissions),
        )

    write_initial_password_file(DEFAULT_AUTH_USERNAME, password)


def init_auth_db():

    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    old_umask = os.umask(0o177)
    try:
        conn = sqlite3.connect(db_path)
    finally:
        os.umask(old_umask)
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

    create_or_rotate_bootstrap_user(cur)

    conn.commit()
    conn.close()
    return secret
