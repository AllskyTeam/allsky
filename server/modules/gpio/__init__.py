from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import board
import digitalio
import pwmio
import threading
from modules.auth_utils import permission_required

gpio_bp = Blueprint("gpio", __name__)

gpio_lock = threading.Lock()
digital_pins = {}
pwm_pins = {}


def get_board_pin(gpio_str):
    try:
        return getattr(board, f"D{int(gpio_str)}")
    except (AttributeError, ValueError):
        return None


@gpio_bp.route("/all", methods=["GET"])
@jwt_required(optional=True)
@permission_required("gpio", "update")
def all_gpio_status():
    try:
        with gpio_lock:
            all_status = {}
            for attr in dir(board):
                if not attr.startswith("D"):
                    continue
                pin = attr[1:]  # 'D18' → '18'
                board_pin = getattr(board, attr)

                status = {"mode": "unused"}

                if pin in digital_pins:
                    dio = digital_pins[pin]
                    direction = (
                        "output"
                        if dio.direction == digitalio.Direction.OUTPUT
                        else "input"
                    )
                    status["mode"] = f"digital-{direction}"
                    status["value"] = "on" if dio.value else "off"

                elif pin in pwm_pins:
                    pwm = pwm_pins[pin]
                    status["mode"] = "pwm"
                    status["frequency"] = pwm.frequency
                    status["duty"] = pwm.duty_cycle

                all_status[pin] = status

        return jsonify(all_status)

    except Exception as e:
        return (
            jsonify(
                {
                    "error": "Failed to retrieve all GPIO status",
                    "type": type(e).__name__,
                    "message": str(e),
                }
            ),
            500,
        )


@gpio_bp.route("/digital/<pin>", methods=["GET"])
def read_digital(pin):
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
            jsonify(
                {
                    "error": "Failed to read digital pin",
                    "type": type(e).__name__,
                    "message": str(e),
                }
            ),
            500,
        )


@gpio_bp.route("/digital", methods=["POST"])
def set_digital():
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

        return jsonify(
            {"pin": pin, "state": "on" if digital_pins[pin].value else "off"}
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "error": "Failed to set digital pin",
                    "type": type(e).__name__,
                    "message": str(e),
                }
            ),
            500,
        )


@gpio_bp.route("/pwm", methods=["POST"])
def set_pwm():
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

        return jsonify({"pin": pin, "frequency": frequency, "duty": duty})

    except Exception as e:
        return (
            jsonify(
                {
                    "error": "Failed to set PWM",
                    "type": type(e).__name__,
                    "message": str(e),
                }
            ),
            500,
        )


@gpio_bp.route("/status", methods=["GET"])
def status():
    try:
        with gpio_lock:
            digital_status = {
                pin: "on" if dio.value else "off" for pin, dio in digital_pins.items()
            }
            pwm_status = {
                pin: {"frequency": pwm.frequency, "duty": pwm.duty_cycle}
                for pin, pwm in pwm_pins.items()
            }
        return jsonify({"digital": digital_status, "pwm": pwm_status})
    except Exception as e:
        return (
            jsonify(
                {
                    "error": "Failed to retrieve status",
                    "type": type(e).__name__,
                    "message": str(e),
                }
            ),
            500,
        )
