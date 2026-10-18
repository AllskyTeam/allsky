from flask import Blueprint, request, jsonify, Response
from collections import deque
import threading
import time
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
tacho_monitors = {}
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


def _release_tacho_monitor(tacho_id):
    monitor = tacho_monitors.pop(tacho_id, None)
    if monitor is not None:
        monitor.stop()


def _release_tacho_pin(pin):
    tacho_ids = [
        tacho_id
        for tacho_id, monitor in tacho_monitors.items()
        if monitor.pin == pin
    ]

    for tacho_id in tacho_ids:
        _release_tacho_monitor(tacho_id)


def _claim_input(pin_num, pull=None):
    get_gpio_backend().claim_input(pin_num, pull=pull)


def _claim_output(pin_num, level=0):
    get_gpio_backend().claim_output(pin_num, level=level)


def _read_pin_value(pin_num):
    return get_gpio_backend().read(pin_num)


def _write_pin_value(pin_num, level):
    get_gpio_backend().write(pin_num, level)


def _set_pwm_value(pin_num, frequency, duty):
    get_gpio_backend().pwm(pin_num, frequency, duty)


def _to_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _normalise_tacho_id(value):
    tacho_id = str(value or "").strip()
    if not tacho_id:
        raise ValueError("tacho_id is required")

    return tacho_id


class TachoMonitor:
    """
    Count tachometer pulses for one GPIO input.

    The GPIO line is claimed with the internal pull-up enabled. Fan tacho wires
    are normally open-collector outputs, so the falling edge is counted by
    default.
    """

    def __init__(
        self,
        tacho_id,
        pin,
        pin_num,
        name,
        pulses_per_revolution,
        sample_seconds,
        stale_seconds,
        debounce_ms,
    ):
        self.tacho_id = tacho_id
        self.pin = pin
        self.pin_num = pin_num
        self.name = name
        self.pulses_per_revolution = pulses_per_revolution
        self.sample_seconds = sample_seconds
        self.stale_seconds = stale_seconds
        self.debounce_ms = debounce_ms

        self._lock = threading.Lock()
        self._pulse_times = deque()
        self._callback_ref = None
        self._running = False
        self._started_at = time.time()
        self._last_pulse = None
        self._last_rpm = 0.0
        self._total_pulses = 0

    @property
    def config(self):
        return {
            "tacho_id": self.tacho_id,
            "pin": self.pin,
            "name": self.name,
            "pulses_per_revolution": self.pulses_per_revolution,
            "sample_seconds": self.sample_seconds,
            "stale_seconds": self.stale_seconds,
            "debounce_ms": self.debounce_ms,
        }

    @property
    def running(self):
        with self._lock:
            return self._running

    def start(self):
        try:
            self._callback_ref = get_gpio_backend().add_edge_detect(
                self.pin_num,
                edge="falling",
                callback=self._record_pulse,
                pull="up",
                debounce_ms=self.debounce_ms,
            )
            with self._lock:
                self._running = True
        except Exception as exc:
            try:
                get_gpio_backend().free(self.pin_num)
            except Exception:
                pass
            raise RuntimeError(f"Unable to claim GPIO pin {self.pin} for tacho input: {exc}")

    def stop(self):
        with self._lock:
            self._running = False
            callback_ref = self._callback_ref
            self._callback_ref = None

        if callback_ref is not None:
            try:
                get_gpio_backend().remove_edge_detect(callback_ref)
            except Exception:
                pass

        try:
            get_gpio_backend().free(self.pin_num)
        except Exception:
            pass

    def _record_pulse(self, pin_num):
        now = time.monotonic()

        with self._lock:
            if not self._running:
                return

            self._pulse_times.append(now)
            self._last_pulse = time.time()
            self._total_pulses += 1
            self._prune_locked(now)

    def _prune_locked(self, now):
        cutoff = now - self.sample_seconds
        while self._pulse_times and self._pulse_times[0] < cutoff:
            self._pulse_times.popleft()

    def _rpm_locked(self, now):
        self._prune_locked(now)

        if self._last_pulse is None or (time.time() - self._last_pulse) > self.stale_seconds:
            self._last_rpm = 0.0
            return self._last_rpm

        if len(self._pulse_times) >= 2:
            elapsed = self._pulse_times[-1] - self._pulse_times[0]
            pulses = len(self._pulse_times) - 1

            if elapsed > 0:
                self._last_rpm = (pulses / self.pulses_per_revolution) * (60.0 / elapsed)

        return self._last_rpm

    def status(self):
        now = time.monotonic()

        with self._lock:
            rpm = self._rpm_locked(now)
            return {
                "tacho_id": self.tacho_id,
                "pin": self.pin,
                "name": self.name,
                "running": self._running,
                "rpm": round(rpm, 2),
                "pulses_per_revolution": self.pulses_per_revolution,
                "sample_seconds": self.sample_seconds,
                "stale_seconds": self.stale_seconds,
                "debounce_ms": self.debounce_ms,
                "pulse_count": len(self._pulse_times),
                "total_pulses": self._total_pulses,
                "last_pulse": int(self._last_pulse) if self._last_pulse is not None else None,
                "pull": "up",
                "edge": "falling",
            }


def _tacho_monitor_for_pin(pin):
    for monitor in tacho_monitors.values():
        if monitor.pin == pin:
            return monitor

    return None


def _normalise_tacho_config(data):
    tacho_id = _normalise_tacho_id(data.get("tacho_id") or data.get("id") or data.get("name"))
    pin, pin_num = normalise_pin(data.get("pin"))
    name = str(data.get("name", "")).strip()
    pulses_per_revolution = float(data.get("pulses_per_revolution", data.get("ppr", 2)))
    sample_seconds = float(data.get("sample_seconds", 10))
    stale_seconds = float(data.get("stale_seconds", 5))
    debounce_ms = int(data.get("debounce_ms", 0))

    if pulses_per_revolution <= 0:
        raise ValueError("pulses_per_revolution must be greater than 0")

    if sample_seconds <= 0:
        raise ValueError("sample_seconds must be greater than 0")

    if stale_seconds <= 0:
        raise ValueError("stale_seconds must be greater than 0")

    if debounce_ms < 0:
        raise ValueError("debounce_ms must be 0 or greater")

    return {
        "tacho_id": tacho_id,
        "pin": pin,
        "pin_num": pin_num,
        "name": name,
        "pulses_per_revolution": pulses_per_revolution,
        "sample_seconds": sample_seconds,
        "stale_seconds": stale_seconds,
        "debounce_ms": debounce_ms,
    }


def _configure_tacho_locked(config):
    tacho_id = config["tacho_id"]
    pin = config["pin"]
    existing = tacho_monitors.get(tacho_id)
    requested_config = {
        "tacho_id": tacho_id,
        "pin": pin,
        "name": config["name"],
        "pulses_per_revolution": config["pulses_per_revolution"],
        "sample_seconds": config["sample_seconds"],
        "stale_seconds": config["stale_seconds"],
        "debounce_ms": config["debounce_ms"],
    }

    if existing is not None and existing.running and existing.config == requested_config:
        return {"changed": False, **existing.status()}

    for other_tacho_id, monitor in tacho_monitors.items():
        if other_tacho_id != tacho_id and monitor.pin == pin:
            raise RuntimeError(f"GPIO pin {pin} is already used by tacho {other_tacho_id}")

    if pin in pwm_pins:
        raise RuntimeError(f"GPIO pin {pin} is currently configured for PWM")

    if pin in digital_pins and digital_pins[pin]["direction"] != "input":
        raise RuntimeError(f"GPIO pin {pin} is currently configured as a digital output")

    if existing is not None:
        _release_tacho_monitor(tacho_id)

    if pin in digital_pins:
        _release_digital_pin(pin)

    if config["name"]:
        pin_names[pin] = config["name"]

    try:
        get_gpio_backend().free(config["pin_num"])
    except Exception:
        pass

    monitor = TachoMonitor(
        tacho_id=tacho_id,
        pin=pin,
        pin_num=config["pin_num"],
        name=config["name"],
        pulses_per_revolution=config["pulses_per_revolution"],
        sample_seconds=config["sample_seconds"],
        stale_seconds=config["stale_seconds"],
        debounce_ms=config["debounce_ms"],
    )
    monitor.start()
    tacho_monitors[tacho_id] = monitor

    return {"changed": True, **monitor.status()}


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
        else:
            tacho_monitor = _tacho_monitor_for_pin(pin)
            if tacho_monitor is not None:
                tacho_status = tacho_monitor.status()
                status["mode"] = "tacho"
                status["tacho_id"] = tacho_status["tacho_id"]
                status["rpm"] = tacho_status["rpm"]
                status["pull"] = "up"
                status["edge"] = "falling"

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
            if _tacho_monitor_for_pin(pin) is not None:
                return jsonify({"error": f"GPIO pin {pin} is currently configured for tacho input"}), 409

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
        state_value = request.json.get("state", "off")
        state = state_value is True or str(state_value).strip().lower() in ("on", "true", "1", "high")
        name = str(request.json.get("name", "")).strip()

        if name:
            pin_names[pin] = name

        with gpio_lock:
            _release_tacho_pin(pin)

            if pin in pwm_pins:
                _release_pwm_pin(pin)
                digital_pins.pop(pin, None)
                _claim_output(pin_num, 1 if state else 0)
            elif pin not in digital_pins:
                _claim_output(pin_num, 1 if state else 0)
            elif digital_pins[pin]["direction"] != "output":
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
            _release_tacho_pin(pin)

            if duty == 0:
                if pin in pwm_pins:
                    _release_pwm_pin(pin)

                return jsonify({
                    "pin": pin,
                    "frequency": frequency,
                    "duty": duty,
                    "duty_percent": 0,
                })

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


@gpio_bp.route("/tacho", methods=["GET"])
@api_auth_required("gpio", "read")
def all_tacho_status() -> Response:
    try:
        with gpio_lock:
            status = {
                tacho_id: monitor.status()
                for tacho_id, monitor in tacho_monitors.items()
            }

        return jsonify(status)

    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve tacho status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/tacho/<tacho_id>", methods=["GET"])
@api_auth_required("gpio", "read")
def tacho_status(tacho_id) -> Response:
    try:
        tacho_id = _normalise_tacho_id(tacho_id)

        with gpio_lock:
            monitor = tacho_monitors.get(tacho_id)
            if monitor is None:
                return jsonify({"tacho_id": tacho_id, "running": False, "rpm": 0}), 404

            return jsonify(monitor.status())

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to retrieve tacho status",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/tacho", methods=["PUT"])
@api_auth_required("gpio", "update")
def configure_tacho() -> Response:
    try:
        data = request.get_json(silent=True) or {}
        tacho_id = _normalise_tacho_id(data.get("tacho_id") or data.get("id") or data.get("name"))

        if not _to_bool(data.get("enabled", True), default=True):
            with gpio_lock:
                changed = tacho_id in tacho_monitors
                _release_tacho_monitor(tacho_id)

            return jsonify({"tacho_id": tacho_id, "running": False, "rpm": 0, "changed": changed})

        config = _normalise_tacho_config(data)

        with gpio_lock:
            result = _configure_tacho_locked(config)

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 409
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to configure tacho",
                "type": type(e).__name__,
                "message": str(e),
            }),
            500,
        )


@gpio_bp.route("/tacho/<tacho_id>", methods=["DELETE"])
@api_auth_required("gpio", "delete")
def delete_tacho(tacho_id) -> Response:
    try:
        tacho_id = _normalise_tacho_id(tacho_id)

        with gpio_lock:
            changed = tacho_id in tacho_monitors
            _release_tacho_monitor(tacho_id)

        return jsonify({"tacho_id": tacho_id, "running": False, "rpm": 0, "changed": changed})

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except GPIOBackendUnavailable as e:
        return gpio_backend_unavailable_response(e)
    except Exception as e:
        return (
            jsonify({
                "error": "Failed to delete tacho",
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
            tacho_statuses = {
                tacho_id: monitor.status()
                for tacho_id, monitor in tacho_monitors.items()
            }

        if format == "json":
            return jsonify({"digital": digital_status, "pwm": pwm_status, "tacho": tacho_statuses})

        if not digital_status and not pwm_status and not tacho_statuses:
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

        for tacho_id, info in tacho_statuses.items():
            display_pin = f"{info['pin']} ({pin_names[info['pin']]})" if info["pin"] in pin_names else info["pin"]
            html += f"""
            <div class="row">
                <div class="col-xs-2">D{display_pin}</div>
                <div class="col-xs-2">Tacho {tacho_id}</div>
                <div class="col-xs-2">{info['rpm']} RPM</div>
                <div class="col-xs-3">N/A</div>
                <div class="col-xs-3">N/A</div>
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
