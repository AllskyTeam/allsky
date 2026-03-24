from flask import Blueprint, request, jsonify, Response
import lgpio
import threading
from modules.auth_utils import api_auth_required

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

gpio_bp = Blueprint("gpio", __name__)

# Thread-safety + in-memory pin registry
gpio_lock = threading.Lock()
digital_pins = {}
pwm_pins = {}
pin_names = {}
gpiochip_handle = None
gpiochip_info = None

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def get_gpiochip_handle():
    """
    Lazily open the first available gpiochip.

    Returns:
        int: lgpio handle for the active gpiochip.
    """
    global gpiochip_handle, gpiochip_info

    if gpiochip_handle is not None:
        return gpiochip_handle

    last_error = None
    for chip in range(8):
        try:
            handle = lgpio.gpiochip_open(chip)
            info = lgpio.gpio_get_chip_info(handle)
            gpiochip_handle = handle
            gpiochip_info = info
            return gpiochip_handle
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Unable to open a gpiochip: {last_error}")


def get_gpio_count():
    """
    Return the number of GPIO lines exposed by the active chip.
    """
    handle = get_gpiochip_handle()
    del handle  # handle is only used to ensure the chip is opened

    if gpiochip_info is None:
        return 0

    return int(gpiochip_info[1])


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
        handle = get_gpiochip_handle()
        lgpio.gpio_free(handle, int(pin))
        del digital_pins[pin]


def _release_pwm_pin(pin):
    if pin in pwm_pins:
        handle = get_gpiochip_handle()
        lgpio.tx_pwm(handle, int(pin), 0, 0)
        lgpio.gpio_free(handle, int(pin))
        del pwm_pins[pin]


def _claim_input(pin_num):
    handle = get_gpiochip_handle()
    lgpio.gpio_claim_input(handle, pin_num)


def _claim_output(pin_num, level=0):
    handle = get_gpiochip_handle()
    lgpio.gpio_claim_output(handle, pin_num, level=level)


def _read_pin_value(pin_num):
    handle = get_gpiochip_handle()
    return bool(lgpio.gpio_read(handle, pin_num))


def _write_pin_value(pin_num, level):
    handle = get_gpiochip_handle()
    lgpio.gpio_write(handle, pin_num, 1 if level else 0)


def _set_pwm_value(pin_num, frequency, duty):
    handle = get_gpiochip_handle()
    duty_percent = (float(duty) / 65535.0) * 100.0
    lgpio.tx_pwm(handle, pin_num, int(frequency), duty_percent)


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

    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )
