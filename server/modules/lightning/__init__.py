from __future__ import annotations

"""
Server-side AS3935 lightning monitor.

The normal Allsky processing modules are run by ``flow-runner.py`` and are
short-lived. That is a poor fit for a hardware interrupt, because any GPIO edge
callback registered by a flow module disappears when that Python process exits.

This module keeps the live hardware ownership inside the Flask server instead.
The server process is expected to remain resident, so it can register the GPIO
interrupt once, wait for AS3935 events, and keep a small in-memory record of the
latest lightning state. The ``allsky_lightning`` flow module then acts as a
client: it sends the desired configuration here and reads the latest status for
publication to Allsky extra data.

The AS3935 Python driver is intentionally imported lazily. The package is
installed as part of the optional ``allsky_lightning`` module, so a top-level
``import sparkfun_qwiicas3935`` would make the whole web server fail to start on
systems where the module has not been installed.
"""

import json
import os
import queue
import threading
import time

from flask import Blueprint, jsonify, request

from modules.auth_utils import api_auth_required


lightning_bp = Blueprint("lightning", __name__)


class LightningMonitor:
    """
    Own the AS3935 sensor, GPIO interrupt, and lightning event state.

    A single instance of this class is created at module import time and used by
    the Flask endpoints below. The monitor has three responsibilities:

    - Apply the configuration supplied by the flow module.
    - Register and maintain a GPIO rising-edge callback for the AS3935 interrupt
      pin.
    - Convert queued interrupt events into readable status by querying the
      AS3935 interrupt register and any associated strike data.

    The class uses an ``RLock`` for all shared state and sensor access. GPIO
    callback threads and Flask request threads may both touch the monitor, so
    state updates need to be serialised. The actual GPIO callback only queues a
    lightweight event; I2C communication is handled by the worker thread.
    """

    base_path = os.environ.get("ALLSKY_HOME")
    if not base_path:
        raise EnvironmentError("ALLSKY_HOME environment variable is not set")
        
    CONFIG_FILE = os.path.join(base_path, "config", "myFiles", "lightning-monitor.json")
 
    def __init__(self):
        """
        Initialise monitor state and start the interrupt processing worker.

        No hardware is touched here. This keeps server start-up safe when the
        lightning module or its optional Python driver is not installed. Hardware
        setup only happens when a valid ``PUT /lightning/config`` request is
        received, or when a previously saved configuration is restored.
        """
        self._lock = threading.RLock()
        self._events = queue.Queue()
        self._worker = threading.Thread(target=self._event_worker, daemon=True)
        self._worker.start()

        self._config = None
        self._driver = None
        self._board = None
        self._sensor = None
        self._irq = None
        self._irq_pin = None
        self._irq_backend = None
        self._lgpio = None
        self._lgpio_handle = None
        self._rpi_gpio = None

        self._state = self._default_state()

    def _default_state(self):
        """
        Return a fresh status dictionary for the public API.

        ``available`` starts as ``None`` because the optional driver has not yet
        been imported. It becomes ``True`` after a successful lazy import, or
        ``False`` if the driver is missing.
        """
        return {
            "available": None,
            "configured": False,
            "running": False,
            "error": None,
            "active_config": None,
            "strike_count": 0,
            "noise_count": 0,
            "disturber_count": 0,
            "event_count": 0,
            "last_event": None,
            "last_interrupt": None,
            "last_interrupt_type": None,
            "last_strike": None,
            "distance": 0,
            "energy": 0,
        }

    def _load_driver(self):
        """
        Lazily import the AS3935 and board libraries.

        The SparkFun AS3935 package is installed by the optional lightning
        module, not by the core server. Importing it here, on demand, lets the
        server run normally even when the hardware module has not been installed.

        Returns:
            bool: ``True`` when the driver imports successfully, otherwise
            ``False`` with a user-facing error stored in the monitor state.
        """
        try:
            import board
            import sparkfun_qwiicas3935
        except ImportError as exc:
            self._state["available"] = False
            self._state["error"] = (
                "sparkfun_qwiicas3935 is not installed. "
                "Install the allsky_lightning module first."
            )
            return False

        self._board = board
        self._driver = sparkfun_qwiicas3935
        self._state["available"] = True
        return True

    def _normalise_config(self, data):
        """
        Validate and normalise a configuration payload.

        The flow module sends values read from module settings. Those values may
        arrive as strings, booleans, or numbers depending on how the module was
        configured, so this method converts them into a stable internal shape.

        Args:
            data (dict): JSON payload from ``PUT /lightning/config``.

        Returns:
            dict: Normalised configuration suitable for comparison and storage.

        Raises:
            ValueError: If the interrupt pin is missing/invalid or the I2C
            address is not a valid hexadecimal value.
        """
        interrupt_pin = str(data.get("interruptpin", "")).strip()
        if not interrupt_pin:
            raise ValueError("interruptpin is required")

        try:
            interrupt_pin_num = int(interrupt_pin)
        except ValueError:
            raise ValueError(f"Invalid interruptpin {interrupt_pin}")

        i2c_address = str(data.get("i2caddress", "")).strip()
        if i2c_address:
            try:
                int(i2c_address, 16)
            except ValueError:
                raise ValueError(f"Invalid i2caddress {i2c_address}")

        return {
            "interruptpin": str(interrupt_pin_num),
            "i2caddress": i2c_address,
            "maskdisturbers": self._to_bool(data.get("maskdisturbers", True)),
            "noiselevel": int(data.get("noiselevel", 2)),
            "watchdogthreshold": int(data.get("watchdogthreshold", 2)),
            "spikerejection": int(data.get("spikerejection", 2)),
            "lightningthreshold": int(data.get("lightningthreshold", 1)),
        }

    def _to_bool(self, value):
        """
        Convert common web/config truthy values to a real boolean.

        This accepts the forms commonly produced by Allsky module settings and
        simple REST clients, for example ``true``, ``"true"``, ``"1"``, and
        ``"on"``.
        """
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ("1", "true", "yes", "on")

    def configure(self, data):
        """
        Ensure the monitor is configured exactly as requested.

        This method is intentionally idempotent. The periodic flow module can
        safely call ``PUT /lightning/config`` every time it runs. If the requested
        configuration already matches the active configuration and the monitor is
        running, no GPIO or I2C resources are disturbed.

        If the configuration changes, any existing interrupt registration is
        released before the AS3935 and interrupt pin are configured again. The
        configuration is only written to disk after the sensor and GPIO setup
        both succeed; the file therefore represents the last known good server
        configuration, not merely the last requested one.

        Args:
            data (dict): Raw JSON configuration from the client.

        Returns:
            dict: API status plus a ``changed`` flag.
        """
        with self._lock:
            config = self._normalise_config(data or {})
            if self._config == config and self._state["running"]:
                return {"changed": False, **self.status()}

            self._stop_locked()

            if not self._load_driver():
                self._state["configured"] = False
                self._state["running"] = False
                self._state["active_config"] = config
                return {"changed": False, **self.status()}

            try:
                self._configure_sensor_locked(config)
                self._register_irq_locked(int(config["interruptpin"]))
                self._config = config
                self._state["configured"] = True
                self._state["running"] = True
                self._state["error"] = None
                self._state["active_config"] = config
                self._save_config_locked(config)
                return {"changed": True, **self.status()}
            except Exception as exc:
                self._stop_locked()
                self._state["configured"] = False
                self._state["running"] = False
                self._state["active_config"] = config
                self._state["error"] = str(exc)
                return {"changed": False, **self.status()}

    def _configure_sensor_locked(self, config):
        """
        Create and configure the SparkFun AS3935 I2C object.

        The caller must hold ``self._lock``. The resulting sensor instance is
        retained by the monitor so the interrupt worker can read the interrupt
        register and associated strike data later.
        """
        i2c = self._board.I2C()
        if config["i2caddress"]:
            self._sensor = self._driver.Sparkfun_QwiicAS3935_I2C(i2c, int(config["i2caddress"], 16))
        else:
            self._sensor = self._driver.Sparkfun_QwiicAS3935_I2C(i2c)

        if not self._sensor.connected:
            raise RuntimeError("Lightning Detector does not appear to be connected. Please check wiring.")

        self._sensor.mask_disturber = config["maskdisturbers"]
        self._sensor.noise_level = config["noiselevel"]
        self._sensor.watchdog_threshold = config["watchdogthreshold"]
        self._sensor.spike_rejection = config["spikerejection"]
        self._sensor.lightning_threshold = config["lightningthreshold"]

    def _register_irq_locked(self, pin_num):
        """
        Register a rising-edge callback for the AS3935 interrupt pin.

        The monitor prefers ``lgpio`` because it is the modern GPIO interface on
        newer Raspberry Pi OS releases. If that path fails, it falls back to
        ``RPi.GPIO`` for compatibility with older installations.

        The callback registered here does not talk to the AS3935. It only queues
        the pin event so the worker thread can perform the I2C read outside the
        GPIO callback context.
        """
        try:
            import lgpio

            handle = None
            last_error = None
            for chip in range(8):
                try:
                    handle = lgpio.gpiochip_open(chip)
                    break
                except Exception as exc:
                    last_error = exc

            if handle is None:
                raise RuntimeError(f"Unable to open a gpiochip: {last_error}")

            lgpio.gpio_claim_alert(handle, pin_num, lgpio.RISING_EDGE, lgpio.SET_PULL_DOWN)
            self._irq = lgpio.callback(handle, pin_num, lgpio.RISING_EDGE, self._queue_lgpio_event)
            self._irq_pin = pin_num
            self._irq_backend = "lgpio"
            self._lgpio = lgpio
            self._lgpio_handle = handle
            return
        except Exception:
            self._release_lgpio_locked()

        import RPi.GPIO as GPIO

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(pin_num, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        GPIO.add_event_detect(pin_num, GPIO.RISING, callback=self._queue_rpi_gpio_event, bouncetime=200)
        self._irq_backend = "RPi.GPIO"
        self._irq = pin_num
        self._irq_pin = pin_num
        self._rpi_gpio = GPIO

    def _queue_lgpio_event(self, chip, gpio, level, timestamp):
        """
        ``lgpio`` callback entry point.

        ``lgpio`` can report both levels depending on how a line is configured;
        the AS3935 interrupt is handled on the rising edge, so only level ``1``
        is queued.
        """
        if level == 1:
            self._queue_interrupt(gpio)

    def _queue_rpi_gpio_event(self, channel):
        """``RPi.GPIO`` callback entry point for the configured interrupt pin."""
        self._queue_interrupt(channel)

    def _queue_interrupt(self, pin):
        """
        Queue an interrupt event for the worker thread.

        This method is deliberately tiny because it may be called from a GPIO
        callback thread. Keeping it small avoids blocking edge handling and keeps
        I2C access in one controlled place.
        """
        self._events.put({"pin": str(pin), "time": int(time.time())})

    def _event_worker(self):
        """
        Background worker that serialises AS3935 interrupt processing.

        GPIO libraries call callbacks from their own threads. Rather than doing
        sensor I/O there, this worker consumes queued events one at a time and
        updates the monitor state under the shared lock.
        """
        while True:
            event = self._events.get()
            try:
                self._handle_interrupt(event)
            finally:
                self._events.task_done()

    def _handle_interrupt(self, event):
        """
        Read the AS3935 interrupt register and update public state.

        The AS3935 interrupt register tells us whether the event was noise, a
        disturber, lightning, or an unknown code. For real lightning events, the
        distance and energy registers are also read and stored.

        Args:
            event (dict): Queued event metadata produced by the GPIO callback.
        """
        time.sleep(0.002)
        with self._lock:
            if self._sensor is None or not self._state["running"]:
                return

            interrupt_value = self._sensor.read_interrupt_register()
            now = int(time.time())
            self._state["event_count"] += 1
            self._state["last_event"] = now
            self._state["last_interrupt"] = event

            if interrupt_value == self._sensor.NOISE:
                self._state["noise_count"] += 1
                self._state["last_interrupt_type"] = "noise"
            elif interrupt_value == self._sensor.DISTURBER:
                self._state["disturber_count"] += 1
                self._state["last_interrupt_type"] = "disturber"
            elif interrupt_value == self._sensor.LIGHTNING:
                self._state["strike_count"] += 1
                self._state["last_interrupt_type"] = "lightning"
                self._state["last_strike"] = now
                self._state["distance"] = self._sensor.distance_to_storm
                self._state["energy"] = self._sensor.lightning_energy
            else:
                self._state["last_interrupt_type"] = "unknown"

    def reset(self):
        """
        Reset counters and last-event values without releasing hardware.

        The active configuration, availability, running state, and current error
        are preserved. This is used by the flow module when its ``expirestrikes``
        interval has elapsed, and is also available as a REST endpoint.

        Returns:
            dict: Current monitor status after the reset.
        """
        with self._lock:
            active_config = self._state["active_config"]
            available = self._state["available"]
            configured = self._state["configured"]
            running = self._state["running"]
            error = self._state["error"]
            self._state = self._default_state()
            self._state["active_config"] = active_config
            self._state["available"] = available
            self._state["configured"] = configured
            self._state["running"] = running
            self._state["error"] = error
            return self.status()

    def status(self):
        """
        Return a snapshot of the monitor state for REST clients.

        A shallow copy is returned so callers cannot mutate the internal state
        dictionary directly.
        """
        with self._lock:
            return dict(self._state)

    def restore(self):
        """
        Restore the last successfully applied configuration from disk.

        This is called during Flask application start-up. It lets the server
        re-register the GPIO interrupt after a restart before the next periodic
        flow run occurs. Missing files are normal and are silently ignored. A
        malformed file is reported in the monitor status.
        """
        try:
            with open(self.CONFIG_FILE, "r", encoding="utf-8") as config_file:
                config = json.load(config_file)
        except OSError:
            return
        except json.JSONDecodeError as exc:
            with self._lock:
                self._state["error"] = f"Failed to read saved lightning monitor config: {exc}"
            return

        self.configure(config)

    def _save_config_locked(self, config):
        """
        Persist the last successfully applied monitor configuration.

        The caller must hold ``self._lock``. The file is intentionally updated
        only after hardware setup succeeds, so restart restore does not keep
        retrying a configuration that has never worked.
        """
        os.makedirs(os.path.dirname(self.CONFIG_FILE), exist_ok=True)
        with open(self.CONFIG_FILE, "w", encoding="utf-8") as config_file:
            json.dump(config, config_file, indent=4)

    def _stop_locked(self):
        """
        Release any active GPIO callback and sensor object.

        This is used before reconfiguration and after failed setup attempts. The
        caller must hold ``self._lock``.
        """
        if self._irq_backend == "lgpio":
            self._release_lgpio_locked()
        elif self._irq_backend == "RPi.GPIO" and self._rpi_gpio is not None and self._irq is not None:
            try:
                self._rpi_gpio.remove_event_detect(int(self._irq))
                self._rpi_gpio.cleanup(int(self._irq))
            except Exception:
                pass

        self._irq = None
        self._irq_pin = None
        self._irq_backend = None
        self._rpi_gpio = None
        self._sensor = None
        self._state["running"] = False

    def _release_lgpio_locked(self):
        """
        Release resources claimed through ``lgpio``.

        ``lgpio`` keeps both a callback object and a gpiochip handle. Both must
        be released when the monitor is stopped or reconfigured.
        """
        if self._irq is not None:
            try:
                self._irq.cancel()
            except Exception:
                pass

        if self._lgpio is not None and self._lgpio_handle is not None:
            try:
                if self._irq_pin is not None:
                    self._lgpio.gpio_free(self._lgpio_handle, int(self._irq_pin))
            except Exception:
                pass
            try:
                self._lgpio.gpiochip_close(self._lgpio_handle)
            except Exception:
                pass

        self._lgpio = None
        self._lgpio_handle = None


monitor = LightningMonitor()


@lightning_bp.route("/config", methods=["PUT"])
@api_auth_required("lightning", "update")
def configure_lightning():
    """
    Configure or reconfigure the resident lightning monitor.

    Expected JSON body:

    ``interruptpin``
        BCM GPIO number connected to the AS3935 interrupt pin.

    ``i2caddress``
        Optional hexadecimal I2C address override, for example ``"0x03"``.

    ``maskdisturbers``, ``noiselevel``, ``watchdogthreshold``,
    ``spikerejection``, ``lightningthreshold``
        AS3935 tuning values passed through from the Allsky module settings.

    A successful response includes the full monitor status and a ``changed``
    flag. If the monitor cannot start because the optional AS3935 driver or
    hardware is unavailable, the endpoint returns ``503`` with the status/error
    payload.
    """
    try:
        result = monitor.configure(request.get_json(silent=True) or {})
        status_code = 200 if result.get("running") else 503
        return jsonify(result), status_code
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@lightning_bp.route("/status", methods=["GET"])
@api_auth_required("lightning", "read")
def lightning_status():
    """
    Return the current lightning monitor status.

    This endpoint is read-only and does not touch the hardware. It reports
    whether the monitor is available/configured/running, the active
    configuration, strike/noise/disturber counters, and the latest strike
    distance and energy.
    """
    return jsonify(monitor.status())


@lightning_bp.route("/reset", methods=["POST"])
@api_auth_required("lightning", "update")
def reset_lightning():
    """
    Clear lightning counters while keeping the current monitor configuration.

    This is primarily used by ``allsky_lightning.py`` to expire old strike data
    from overlays after the configured timeout.
    """
    return jsonify(monitor.reset())


def restore_lightning_monitor():
    """
    Restore the resident monitor from the saved configuration file.

    ``server/app.py`` calls this after registering the blueprint. Keeping the
    call outside module import makes the start-up behaviour explicit while still
    allowing the monitor to recover automatically after server restarts.
    """
    monitor.restore()
