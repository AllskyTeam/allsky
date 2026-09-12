from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, UserMixin, current_user
from dataclasses import dataclass
from typing import Optional
from modules.auth_utils import validate_user, is_local_request
from modules.auth_utils import web_login_required_or_local

webauth_bp = Blueprint("webauth", __name__, template_folder="../../templates")

@dataclass
class SimpleUser(UserMixin):
    id: str
    username: str
    def get_id(self):
        return self.id

# Session login page (HTML form)
@webauth_bp.route("/auth/login", methods=["GET", "POST"])
def login():
    # Local machine never needs to login
    if is_local_request():
        return redirect(request.args.get("next") or url_for("dashboard.allsky_dashboard"))
    if request.method == "POST":
        username = request.form.get("username","").strip()
        password = request.form.get("password","")
        perms = validate_user(username, password)
        if perms:
            # For session, we just need a user object; id = username
            user = SimpleUser(id=username, username=username)
            login_user(user, remember=("remember" in request.form))
            return redirect(request.args.get("next") or url_for("dashboard.allsky_dashboard"))
        flash("Invalid credentials", "danger")
    return render_template("auth/login.html")



@webauth_bp.route("/auth/logout", methods=["GET"])
@web_login_required_or_local
def logout():
    logout_user()
    return redirect(url_for("webauth.login"))
