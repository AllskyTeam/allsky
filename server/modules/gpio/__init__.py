from flask import Blueprint, request, jsonify, Response
import threading
from modules.auth_utils import api_auth_required
from modules.gpio.backends import GPIOBackendUnavailable, select_gpio_backend

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

gpio_bp = Blueprint("gpio", __name__)

# Thread-safety + in-memory pin registry
gpio_lock = threading.Lock()
digital_pins = {}
pwm_pins = {}
pin_names = {}
gpio_backend = None
gpio_backend_error = None

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def get_gpio_backend():
    """
    Lazily select a GPIO backend.
    """
    global gpio_backend, gpio_backend_error

    if gpio_backend is not None:
        return gpio_backend

    try:
        gpio_backend = select_gpio_backend()
        return gpio_backend
    except GPIOBackendUnavailable as exc:
        gpio_backend_error = str(exc)
        raise


def get_gpio_count():
    """
    Return the number of GPIO lines exposed by the active backend.
    """
    return get_gpio_backend().get_gpio_count()


def normalise_pin(gpio_str):
    """
    Validate and normalise a GPIO pin number.

    Args:
        gpio_str (str | int): Pin number, e.g. "18".

    Returns:
        tuple[str, int]: String form and integer form of the GPIO number.
    """
    pin = str(gpio_str).strip()

    try:
        pin_num = int(pin)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid GPIO pin {gpio_str}")

    if pin_num < 0 or pin_num >= get_gpio_count():
        raise ValueError(f"Invalid GPIO pin {gpio_str}")

    return pin, pin_num


def _release_digital_pin(pin):
    if pin in digital_pins:
        get_gpio_backend().free(int(pin))
        del digital_pins[pin]


def _release_pwm_pin(pin):
    if pin in pwm_pins:
        backend = get_gpio_backend()
        backend.stop_pwm(int(pin))
        backend.free(int(pin))
        del pwm_pins[pin]


def _claim_input(pin_num):
    get_gpio_backend().claim_input(pin_num)


def _claim_output(pin_num, level=0):
    get_gpio_backend().claim_output(pin_num, level=level)


def _read_pin_value(pin_num):
    return get_gpio_backend().read(pin_num)


def _write_pin_value(pin_num, level):
    get_gpio_backend().write(pin_num, level)


def _set_pwm_value(pin_num, frequency, duty):
    get_gpio_backend().pwm(pin_num, frequency, duty)


def get_gpio_status() -> dict:
    """
    Inspect all available GPIO lines and return their current usage.

    Returns:
        dict: Status for each Dxx pin on the board.
    """
    all_status = {}
    gpio_count = get_gpio_count()

    for pin_num in range(gpio_count):
        pin = str(pin_num)
        status = {"mode": "unused"}

        if pin in digital_pins:
            info = digital_pins[pin]
            direction = info["direction"]
            status["mode"] = f"digital-{direction}"
            status["value"] = "on" if _read_pin_value(pin_num) else "off"
        elif pin in pwm_pins:
            pwm = pwm_pins[pin]
            status["mode"] = "pwm"
            status["frequency"] = pwm["frequency"]
            status["duty"] = pwm["duty"]

        all_status[f"D{pin_num}"] = status

    return all_status


def gpio_backend_unavailable_response(exc):
    return (
        jsonify({
            "error": "GPIO backend unavailable",
            "type": type(exc).__name__,
            "message": str(exc),
        }),
        503,
    )


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@gpio_bp.route("/all", methods=["GET"])
@api_auth_required("gpio", "update")
def all_gpio_status() -> Response:
    try:
        with gpio_lock:
            all_status = get_gpio_status()

        return jsonify(all_status)

    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve all GPIO status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/digital/<pin>", methods=["GET"])
@api_auth_required("gpio", "update")
def read_digital(pin) -> Response:
    try:
        pin, pin_num = normalise_pin(pin)

        with gpio_lock:
            if pin in pwm_pins:
                return jsonify({"error": f"GPIO pin {pin} is currently configured for PWM"}), 409

            if pin not in digital_pins:
                _claim_input(pin_num)
                digital_pins[pin] = {"direction": "input"}

            value = _read_pin_value(pin_num)
            pin_name = pin_names.get(pin, "")

        return jsonify({"pin": pin, "value": "on" if value else "off", "name": pin_name})

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to read digital pin",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/digital", methods=["POST"])
@api_auth_required("gpio", "update")
def set_digital() -> Response:
    try:
        pin, pin_num = normalise_pin(request.json.get("pin"))
        state = str(request.json.get("state", "off")).lower() == "on"
        name = str(request.json.get("name", "")).strip()

        if name:
            pin_names[pin] = name

        with gpio_lock:
            _release_pwm_pin(pin)
            _release_digital_pin(pin)
            _claim_output(pin_num, 1 if state else 0)
            digital_pins[pin] = {"direction": "output"}
            _write_pin_value(pin_num, state)

        return jsonify({"pin": pin, "state": "on" if state else "off"})

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to set digital pin",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/pwm", methods=["POST"])
@api_auth_required("gpio", "update")
def set_pwm() -> Response:
    try:
        pin, pin_num = normalise_pin(request.json.get("pin"))
        frequency = int(request.json.get("frequency", 1000))
        duty = int(request.json.get("duty", 0))
        name = str(request.json.get("name", "")).strip()

        if name:
            pin_names[pin] = name

        if frequency <= 0:
            return jsonify({"error": "Frequency must be greater than 0"}), 400

        if not (0 <= duty <= 65535):
            return jsonify({"error": "Duty must be between 0 and 65535"}), 400

        with gpio_lock:
            _release_digital_pin(pin)

            if pin not in pwm_pins:
                _claim_output(pin_num, 0)

            _set_pwm_value(pin_num, frequency, duty)
            pwm_pins[pin] = {"frequency": frequency, "duty": duty}

        return jsonify({
            "pin": pin,
            "frequency": frequency,
            "duty": duty,
            "duty_percent": round((duty / 65535) * 100, 2),
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to set PWM",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/status", defaults={"format": "json"}, methods=["GET"])
@gpio_bp.route("/status/<format>", methods=["GET"])
@api_auth_required("gpio", "update")
def status(format) -> Response:
    try:
        with gpio_lock:
            digital_status = {
                pin: "on" if _read_pin_value(int(pin)) else "off"
                for pin in digital_pins
            }
            pwm_status = {
                pin: {"frequency": info["frequency"], "duty": info["duty"]}
                for pin, info in pwm_pins.items()
            }

        if format == "json":
            return jsonify({"digital": digital_status, "pwm": pwm_status})

        if not digital_status and not pwm_status:
            html = """
                <div class="panel panel-default">
                    <div class="panel-body">
                        <div class="text-center">
                            <i class="fa-solid fa-ghost fa-4x"></i>
                            <h3><strong>No active GPIO pins.</strong></h3>
                        </div>
                    </div>
                </div>
            """
            return Response(html, mimetype="text/html")

        html = """
        <div class="row">
            <div class="col-xs-2"><strong>Pin</strong></div>
            <div class="col-xs-2"><strong>Type</strong></div>
            <div class="col-xs-2"><strong>State</strong></div>
            <div class="col-xs-3"><strong>Duty Cycle</strong></div>
            <div class="col-xs-3"><strong>Frequency</strong></div>
        </div>
        """

        for pin, state in digital_status.items():
            display_pin = f"{pin} ({pin_names[pin]})" if pin in pin_names else pin
            html += f"""
            <div class="row">
                <div class="col-xs-2">D{display_pin}</div>
                <div class="col-xs-2">Digital</div>
                <div class="col-xs-2">{state.upper()}</div>
                <div class="col-xs-3">N/A</div>
                <div class="col-xs-3">N/A</div>
            </div>
            """

        for pin, info in pwm_status.items():
            display_pin = f"{pin} ({pin_names[pin]})" if pin in pin_names else pin
            duty_percent = round((info["duty"] / 65535) * 100, 2)
            html += f"""
            <div class="row">
                <div class="col-xs-2">D{display_pin}</div>
                <div class="col-xs-2">PWM</div>
                <div class="col-xs-2">N/A</div>
                <div class="col-xs-3">{duty_percent}%</div>
                <div class="col-xs-3">{info['frequency']} Hz</div>
            </div>
            """

        return Response(html, mimetype="text/html")

    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )
