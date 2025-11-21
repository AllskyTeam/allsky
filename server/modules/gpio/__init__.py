from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
import board
import digitalio
import pwmio
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


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def get_board_pin(gpio_str):
    """
    Convert a GPIO pin number into a board-specific pin object.

    Args:
        gpio_str (str | int): Pin number, e.g. "18".

    Returns:
        object | None: board.Dxx pin object, or None if invalid.
    """
    try:
        return getattr(board, f"D{int(gpio_str)}")
    except (AttributeError, ValueError):
        return None


def get_gpio_status() -> dict:
    """
    Inspect all available board pins and return their current usage.

    This includes:
      - Unused pins
      - Digital pins (input/output, on/off)
      - PWM pins (frequency, duty cycle)

    Returns:
        dict: Status for each Dxx pin on the board.
    """
    all_status = {}
    for attr in dir(board):
        if not attr.startswith("D"):
            continue

        hr_pin = attr        # e.g. "D18"
        pin_num = hr_pin[1:] # e.g. "18"
        board_pin = getattr(board, attr)

        status = {"mode": "unused"}

        if pin_num in digital_pins:
            dio = digital_pins[pin_num]
            direction = (
                "output" if dio.direction == digitalio.Direction.OUTPUT else "input"
            )
            status["mode"] = f"digital-{direction}"
            status["value"] = "on" if dio.value else "off"

        elif pin_num in pwm_pins:
            pwm = pwm_pins[pin_num]
            status["mode"] = "pwm"
            status["frequency"] = pwm.frequency
            status["duty"] = pwm.duty_cycle

        all_status[hr_pin] = status

    return all_status


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@gpio_bp.route("/all", methods=["GET"])
@api_auth_required("gpio", "update")
def all_gpio_status() -> Response:
    """
    GET /gpio/all

    Return the status of every board GPIO pin.

    Authentication:
        Requires @api_auth_required("gpio", "update")

    Returns:
        JSON: A dictionary of all pins (D0, D1, D2...) with details on
              whether they are unused, digital I/O, or PWM.
    """
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
    """
    GET /gpio/digital/<pin>

    Read a digital GPIO pin.

    If the pin has not previously been configured, the API automatically
    initialises it as a digital input.

    Args:
        pin (str): Pin number, e.g. "18".

    Authentication:
        Requires @api_auth_required("gpio", "update")

    Returns:
        JSON: { "pin": "<number>", "value": "on" | "off" }
    """
    pin = str(pin).strip()
    board_pin = get_board_pin(pin)

    if board_pin is None:
        return jsonify({"error": f"Invalid GPIO pin {pin}"}), 400

    try:
        with gpio_lock:
            if pin in digital_pins:
                digital_io = digital_pins[pin]
            else:
                digital_io = digitalio.DigitalInOut(board_pin)
                digital_io.direction = digitalio.Direction.INPUT
                digital_pins[pin] = digital_io

            value = digital_io.value

        return jsonify({"pin": pin, "value": "on" if value else "off"})

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
    """
    POST /gpio/digital

    Set a digital GPIO pin ON or OFF.

    JSON Body:
        pin   (str/int): GPIO pin number.
        state (str):     "on" or "off". Defaults to "off".

    Behaviour:
        • If the pin is currently configured for PWM, PWM is deinitialised.
        • Pin is configured as a digital output if not already.

    Authentication:
        Requires @api_auth_required("gpio", "update")

    Returns:
        JSON: { "pin": <pin>, "state": "on" | "off" }
    """
    try:
        pin = str(request.json.get("pin")).strip()
        state = str(request.json.get("state", "off")).lower()

        board_pin = get_board_pin(pin)
        if board_pin is None:
            return jsonify({"error": f"Invalid GPIO pin {pin}"}), 400

        with gpio_lock:
            if pin in pwm_pins:
                pwm_pins[pin].deinit()
                del pwm_pins[pin]

            if pin not in digital_pins:
                digital_io = digitalio.DigitalInOut(board_pin)
                digital_io.direction = digitalio.Direction.OUTPUT
                digital_pins[pin] = digital_io

            digital_pins[pin].value = state == "on"

        return jsonify({"pin": pin, "state": "on" if digital_pins[pin].value else "off"})

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
    """
    POST /gpio/pwm

    Configure or update PWM on a GPIO pin.

    JSON Body:
        pin        (str/int): GPIO number.
        frequency  (int):     PWM frequency in Hz. Defaults to 1000.
        duty       (int):     Duty cycle 0–65535. Defaults to 0.

    Behaviour:
        • If the pin was digital, digital mode is removed.
        • Creates PWMOut if necessary, otherwise updates existing PWMOut.

    Authentication:
        Requires @api_auth_required("gpio", "update")

    Returns:
        JSON: {
            "pin": <pin>,
            "frequency": <hz>,
            "duty": <value>,
            "duty_percent": <0-100>,
        }
    """
    try:
        pin = str(request.json.get("pin")).strip()
        frequency = int(request.json.get("frequency", 1000))
        duty = int(request.json.get("duty", 0))

        if not (0 <= duty <= 65535):
            return jsonify({"error": "Duty must be between 0 and 65535"}), 400

        board_pin = get_board_pin(pin)
        if board_pin is None:
            return jsonify({"error": f"Invalid GPIO pin {pin}"}), 400

        with gpio_lock:
            if pin in digital_pins:
                digital_pins[pin].deinit()
                del digital_pins[pin]

            if pin not in pwm_pins:
                pwm = pwmio.PWMOut(board_pin, frequency=frequency, duty_cycle=duty)
                pwm_pins[pin] = pwm
            else:
                pwm = pwm_pins[pin]
                pwm.frequency = frequency
                pwm.duty_cycle = duty

        return jsonify({
            "pin": pin,
            "frequency": frequency,
            "duty": duty,
            "duty_percent": round((duty / 65535) * 100, 2),
        })

    except Exception as e:
        return (
            jsonify({
                "error": "Failed to set PWM",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/status", methods=["GET"])
@api_auth_required("gpio", "update")
def status() -> Response:
    """
    GET /gpio/status

    Return a compact summary of active digital and PWM pins.

    Unlike `/gpio/all`, this endpoint only reports pins currently in use.

    Authentication:
        Requires @api_auth_required("gpio", "update")

    Returns:
        JSON: {
            "digital": { pin: "on" | "off" },
            "pwm": { pin: { frequency, duty } }
        }
    """
    try:
        with gpio_lock:
            digital_status = {
                pin: "on" if dio.value else "off"
                for pin, dio in digital_pins.items()
            }
            pwm_status = {
                pin: {"frequency": pwm.frequency, "duty": pwm.duty_cycle}
                for pin, pwm in pwm_pins.items()
            }

        return jsonify({"digital": digital_status, "pwm": pwm_status})

    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )